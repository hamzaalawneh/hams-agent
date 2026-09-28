import { useCallback, useEffect, useRef, useState } from 'react'
import {
  findHeadset,
  micErrorFrom,
  openBestMic,
  stopStream,
  type MicError,
} from '@utils/microphone'

export type MicStatus =
  | 'idle' // we haven't asked yet
  | 'requesting' // the browser's permission prompt is showing
  | 'ready' // mic is live
  | 'unsupported' // no mic API at all (old browser, or an http:// page)
  | MicError // 'denied' | 'no-device' | 'unavailable'

export function useMicrophone() {
  const [status, setStatus] = useState<MicStatus>('idle')
  const [stream, setStream] = useState<MediaStream | null>(null)

  const streamRef = useRef<MediaStream | null>(null) // same stream, readable outside renders
  const headsetIdRef = useRef<string | null>(null) // which headset we're on; null = system default
  const attemptRef = useRef(0) // counts connect() calls, so a slow old one can't win

  const replaceStream = useCallback((next: MediaStream | null) => {
    stopStream(streamRef.current)
    streamRef.current = next
    setStream(next)
  }, [])

  /** Opens the best mic. Resolves with the stream, or null if it failed. */
  const connect = useCallback(async (): Promise<MediaStream | null> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported')
      return null
    }

    const attempt = ++attemptRef.current
    // Only show "requesting" the first time, not when swapping to a headset mid-call.
    setStatus((current) => (current === 'ready' ? 'ready' : 'requesting'))

    try {
      const { stream: next, headsetId } = await openBestMic()
      if (attempt !== attemptRef.current) {
        stopStream(next) // a newer connect() started while we waited; it wins
        return null
      }
      replaceStream(next)
      headsetIdRef.current = headsetId
      setStatus('ready')
      return next
    } catch (error) {
      if (attempt !== attemptRef.current) return null
      replaceStream(null)
      setStatus(micErrorFrom(error))
      return null
    }
  }, [replaceStream])

  /** Stops the mic (the browser's mic indicator goes off) and goes back to idle. */
  const release = useCallback(() => {
    attemptRef.current++ // a connect() still in flight will throw its stream away
    replaceStream(null)
    headsetIdRef.current = null
    setStatus('idle')
  }, [replaceStream])

  // Headset plugged in or out: reconnect if the best mic is now a different one.
  useEffect(() => {
    if (status !== 'ready' && status !== 'no-device') return

    const onDeviceChange = async () => {
      const headset = await findHeadset()
      const bestMicChanged = (headset?.deviceId ?? null) !== headsetIdRef.current
      if (status === 'no-device' || bestMicChanged) void connect()
    }

    navigator.mediaDevices.addEventListener('devicechange', onDeviceChange)
    return () => navigator.mediaDevices.removeEventListener('devicechange', onDeviceChange)
  }, [status, connect])

  // Leaving the page: release the mic so the browser's mic indicator turns off.
  useEffect(() => release, [release])

  // The name of the mic in use, e.g. "AirPods Pro".
  const micLabel = stream?.getAudioTracks()[0]?.label || null

  return { status, stream, micLabel, connect, release }
}
