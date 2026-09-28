import { useEffect, useState, type RefObject } from 'react'
import { SPEECH_LEVEL } from '@constants/audio'
import { readLevel } from '@utils/audio'

const STILL_TALKING_MS = 300 // bridge the tiny gaps between words

/**
 * Measures how loud `stream` is, every animation frame.
 *  - Writes the level (0–1) to a CSS variable on `target`, so the visualiser can animate
 *    without re-rendering React 60 times a second.
 *  - Returns whether someone is talking on this stream right now.
 */
export function useAudioLevel(
  stream: MediaStream | null,
  target: RefObject<HTMLElement | null>,
  cssVariable: string,
): boolean {
  const [talking, setTalking] = useState(false)

  useEffect(() => {
    const element = target.current
    if (!stream || !element) return

    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    const source = ctx.createMediaStreamSource(stream)
    source.connect(analyser)
    const samples = new Float32Array(analyser.fftSize)

    let frame = 0
    let lastVoiceAt = 0
    const tick = () => {
      const level = readLevel(analyser, samples)
      element.style.setProperty(cssVariable, Math.min(1, level * 5).toFixed(3))
      if (level > SPEECH_LEVEL) lastVoiceAt = performance.now()
      setTalking(performance.now() - lastVoiceAt < STILL_TALKING_MS) // React skips same-value updates
      frame = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(frame)
      source.disconnect()
      void ctx.close()
      element.style.setProperty(cssVariable, '0')
      setTalking(false)
    }
  }, [stream, target, cssVariable])

  return talking
}
