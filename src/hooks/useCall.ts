import { useCallback, useEffect, useState } from 'react'
import type { Lang } from '@lib/i18n/context'
import {
  createFakeVoiceSession,
  type FakeVoiceSession,
  type NetworkCondition,
} from '@lib/voiceSession/FakeVoiceSession'
import type { AgentState, Caption, CallState, Metrics } from '@lib/voiceSession/types'
import { rateNetwork, type NetworkQuality } from '@utils/network'

type ActiveCall = { session: FakeVoiceSession; mic: MediaStream }

const STEADY_SECONDS = 3 // the quality shown only changes after this many seconds agree
const RECONNECTED_MS = 3000 // how long "Reconnected" stays up after a drop

/** A partial replaces the previous partial from the same speaker ("updates in place"). */
function addCaption(captions: Caption[], caption: Caption): Caption[] {
  const last = captions.at(-1)
  const replacesLast = last && !last.final && last.speaker === caption.speaker
  return replacesLast ? [...captions.slice(0, -1), caption] : [...captions, caption]
}

export function useCall(mic: MediaStream | null) {
  const [call, setCall] = useState<ActiveCall | null>(null)
  const [state, setState] = useState<CallState | 'idle'>('idle')
  const [agentState, setAgentState] = useState<AgentState>('listening')
  const [agentStream, setAgentStream] = useState<MediaStream | null>(null)
  const [captions, setCaptions] = useState<Caption[]>([])
  const [muted, setMuted] = useState(false)
  const [quality, setQuality] = useState<NetworkQuality>('good')
  const [reconnected, setReconnected] = useState(false)
  const [network, setNetworkState] = useState<NetworkCondition>('good')

  const start = useCallback((micStream: MediaStream, lang: Lang) => {
    setCaptions([])
    setMuted(false)
    setAgentState('listening')
    setQuality('good')
    setReconnected(false)
    setNetworkState('good')
    setCall({ session: createFakeVoiceSession(lang), mic: micStream })
  }, [])

  const hangUp = useCallback(() => setCall(null), [])

  const toggleMute = useCallback(() => {
    const next = !muted
    call?.session.setMuted(next)
    setMuted(next)
  }, [call, muted])

  // Demo controls for the fake network.
  const setNetwork = useCallback(
    (condition: NetworkCondition) => {
      call?.session.setNetwork(condition)
      setNetworkState(condition)
    },
    [call],
  )
  const dropConnection = useCallback(() => call?.session.dropConnection(), [call])

  // The call's whole life: subscribe and connect when it starts; hang up when it ends.
  // The cleanup runs on hang-up AND when the panel is closed mid-call, so nothing leaks either way.
  useEffect(() => {
    if (!call) return
    const { session } = call

    let previousState: CallState | null = null
    let reconnectedTimer = 0
    const onState = (next: CallState) => {
      // Back from a drop: say so briefly, then return to normal.
      if (previousState === 'reconnecting' && next === 'connected') {
        setReconnected(true)
        reconnectedTimer = window.setTimeout(() => setReconnected(false), RECONNECTED_MS)
      }
      previousState = next
      setState(next)
    }

    // Don't react to a single bad second: change what's shown only when 3 in a row agree.
    let recent: NetworkQuality[] = []
    const onMetrics = (metrics: Metrics) => {
      recent = [...recent, rateNetwork(metrics)].slice(-STEADY_SECONDS)
      const steady = recent.length === STEADY_SECONDS && recent.every((q) => q === recent[0])
      if (steady) setQuality(recent[0])
    }

    const unsubscribe = [
      session.on('state', onState),
      session.on('agentState', setAgentState),
      session.on('agentAudio', (track) => setAgentStream(new MediaStream([track]))),
      session.on('transcript', (caption) => setCaptions((list) => addCaption(list, caption))),
      session.on('metrics', onMetrics),
    ]
    void session.connect({ agentId: 'demo-agent', mic: call.mic })

    return () => {
      session.hangUp() // emits 'ended' before we unsubscribe below
      unsubscribe.forEach((off) => off())
      clearTimeout(reconnectedTimer)
      setAgentStream(null)
      setReconnected(false)
    }
  }, [call])

  // Headset plugged in or out mid-call: give the session the new mic.
  useEffect(() => {
    if (call && mic && mic !== call.mic) void call.session.replaceMic(mic)
  }, [call, mic])

  // Play the agent's voice.
  useEffect(() => {
    if (!agentStream) return
    const speaker = new Audio()
    speaker.srcObject = agentStream
    void speaker.play()
    return () => {
      speaker.pause()
      speaker.srcObject = null
    }
  }, [agentStream])

  return {
    state,
    agentState,
    agentStream,
    captions,
    muted,
    quality,
    reconnected,
    network,
    start,
    hangUp,
    toggleMute,
    setNetwork,
    dropConnection,
  }
}
