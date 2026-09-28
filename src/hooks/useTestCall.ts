import { useRef, useState } from 'react'
import type { MicActivity } from '@components/MicButton/types'
import { useAudioLevel } from '@hooks/useAudioLevel'
import { useCall } from '@hooks/useCall'
import { useLanguage } from '@hooks/useLanguage'
import { useMicrophone } from '@hooks/useMicrophone'

/** Everything the test-call screen needs, so the screen itself is just layout. */
export function useTestCall() {
  const { t, lang } = useLanguage()
  const mic = useMicrophone()
  const call = useCall(mic.stream)

  // The mic button is also the visualiser: both voices feed CSS variables on it.
  const micButtonRef = useRef<HTMLButtonElement>(null)
  const userTalking = useAudioLevel(mic.stream, micButtonRef, '--user-level')
  useAudioLevel(call.agentStream, micButtonRef, '--agent-level')

  const inCall =
    call.state === 'connecting' || call.state === 'connected' || call.state === 'reconnecting'

  // "You're muted" appears the first time you talk while muted, and stays until you unmute.
  const [talkedWhileMuted, setTalkedWhileMuted] = useState(false)
  if (call.muted && userTalking && !talkedWhileMuted) setTalkedWhileMuted(true)

  async function startCall() {
    const stream = await mic.connect() // shows the browser's permission prompt the first time
    if (stream) call.start(stream, lang)
  }

  function endCall() {
    call.hangUp()
    mic.release() // the mic indicator goes off
  }

  function toggleMute() {
    setTalkedWhileMuted(false) // each mute starts fresh
    call.toggleMute()
  }

  return {
    mic,
    call,
    inCall,
    micButtonRef,
    activity: micActivity(call, inCall, userTalking),
    pillText: pillText(call, t),
    statusText: statusText(call, t),
    showMutedWarning: call.muted && talkedWhileMuted,
    startCall,
    endCall,
    toggleMute,
  }
}

type Call = ReturnType<typeof useCall>
type Translate = ReturnType<typeof useLanguage>['t']

/** What the mic button shows. */
function micActivity(call: Call, inCall: boolean, userTalking: boolean): MicActivity {
  if (!inCall) return 'idle'
  if (call.state !== 'connected') return 'waiting'
  if (call.agentState === 'speaking') return 'agent'
  if (call.agentState === 'thinking') return 'thinking'
  if (call.muted) return 'muted'
  return userTalking ? 'user' : 'listening'
}

/** The pill: call state, plus calm wording when the connection isn't great. */
function pillText(call: Call, t: Translate): string {
  if (call.state === 'idle') return ''
  if (call.state !== 'connected') return t(`call.state.${call.state}`)
  if (call.reconnected) return t('network.reconnected')
  if (call.quality !== 'good')
    return `${t('call.state.connected')} · ${t(`network.${call.quality}`)}`
  return t('call.state.connected')
}

/** The line under the mic button: what the agent is doing. */
function statusText(call: Call, t: Translate): string {
  if (call.state === 'reconnecting') return t('network.reconnectingHint')
  if (call.state !== 'connected') return ''

  // You talked over the agent: it's listening, but its last line isn't finished yet.
  const last = call.captions.at(-1)
  const paused = call.agentState === 'listening' && last?.speaker === 'agent' && !last.final
  return paused ? t('agent.state.paused') : t(`agent.state.${call.agentState}`)
}
