import { useCallback, useEffect, useState } from 'react'
import type { Lang } from '@lib/i18n/LanguageProvider'
import { FakeVoiceSession } from '@lib/voiceSession/FakeVoiceSession'
import type { AgentState, Caption, CallState } from '@lib/voiceSession/types'

type ActiveCall = { session: FakeVoiceSession; mic: MediaStream }

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

  const start = useCallback((micStream: MediaStream, lang: Lang) => {
    setCaptions([])
    setMuted(false)
    setAgentState('listening')
    setCall({ session: new FakeVoiceSession(lang), mic: micStream })
  }, [])

  const hangUp = useCallback(() => setCall(null), [])

  const toggleMute = useCallback(() => {
    const next = !muted
    call?.session.setMuted(next)
    setMuted(next)
  }, [call, muted])

  // The call's whole life: subscribe and connect when it starts; hang up when it ends.
  // The cleanup runs on hang-up AND when the panel is closed mid-call, so nothing leaks either way.
  useEffect(() => {
    if (!call) return
    const { session } = call

    const unsubscribe = [
      session.on('state', setState),
      session.on('agentState', setAgentState),
      session.on('agentAudio', (track) => setAgentStream(new MediaStream([track]))),
      session.on('transcript', (caption) => setCaptions((list) => addCaption(list, caption))),
    ]
    void session.connect({ agentId: 'demo-agent', mic: call.mic })

    return () => {
      session.hangUp() // emits 'ended' before we unsubscribe below
      unsubscribe.forEach((off) => off())
      setAgentStream(null)
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

  return { state, agentState, agentStream, captions, muted, start, hangUp, toggleMute }
}
