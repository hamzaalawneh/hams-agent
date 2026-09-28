import { useRef, useState } from 'react'
import { Captions } from '@components/Captions'
import { LanguageToggle } from '@components/LanguageToggle'
import { Logo } from '@components/Logo'
import { MicButton } from '@components/MicButton'
import type { MicActivity } from '@components/MicButton/types'
import { MicStatusMessage } from '@components/MicStatusMessage'
import { NetworkSimulator } from '@components/NetworkSimulator'
import { ThemeSwitcher } from '@components/ThemeSwitcher'
import { useAudioLevel } from '@hooks/useAudioLevel'
import { useCall } from '@hooks/useCall'
import { useMicrophone } from '@hooks/useMicrophone'
import { useLanguage } from '@lib/i18n/LanguageProvider'
import './styles.css'
import type { TestCallScreenProps } from './types'

export function TestCallScreen(_props: TestCallScreenProps) {
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
  const showMutedWarning = call.muted && talkedWhileMuted

  function toggleMute() {
    setTalkedWhileMuted(false) // each mute starts fresh
    call.toggleMute()
  }

  async function startCall() {
    const stream = await mic.connect() // shows the browser's permission prompt the first time
    if (stream) call.start(stream, lang)
  }

  function endCall() {
    call.hangUp()
    mic.release() // the mic indicator goes off
  }

  // The pill: call state, plus calm wording when the connection isn't great.
  let pillText = ''
  if (call.state === 'connected' && call.reconnected) pillText = t('network.reconnected')
  else if (call.state === 'connected' && call.quality !== 'good')
    pillText = `${t('call.state.connected')} · ${t(`network.${call.quality}`)}`
  else if (call.state !== 'idle') pillText = t(`call.state.${call.state}`)

  // You talked over the agent: it's listening, but its last line isn't finished yet.
  const lastCaption = call.captions.at(-1)
  const agentPaused =
    call.agentState === 'listening' && lastCaption?.speaker === 'agent' && !lastCaption.final
  const agentStateText = agentPaused ? t('agent.state.paused') : t(`agent.state.${call.agentState}`)

  let activity: MicActivity = 'idle'
  if (inCall) {
    if (call.state !== 'connected') activity = 'waiting'
    else if (call.agentState === 'speaking') activity = 'agent'
    else if (call.agentState === 'thinking') activity = 'thinking'
    else if (call.muted) activity = 'muted'
    else activity = userTalking ? 'user' : 'listening'
  }

  return (
    <div className="test-call">
      <header className="test-call__header">
        <Logo />
        <div className="test-call__controls">
          <ThemeSwitcher />
          <LanguageToggle />
        </div>
      </header>

      <main className="test-call__main">
        <h1 className="test-call__title">{t('app.title')}</h1>

        {call.state !== 'idle' && (
          <p
            className="call-pill"
            data-state={call.state}
            data-quality={call.quality}
            role="status"
          >
            {pillText}
          </p>
        )}

        <MicButton
          ref={micButtonRef}
          activity={activity}
          label={inCall ? t(call.muted ? 'controls.unmute' : 'controls.mute') : t('mic.start')}
          pressed={inCall ? call.muted : undefined}
          onClick={inCall ? toggleMute : startCall}
        />

        {inCall ? (
          <div className="test-call__status" role="status">
            {call.state === 'connected' && (
              <p className="test-call__agent-state">{agentStateText}</p>
            )}
            {call.state === 'reconnecting' && (
              <p className="test-call__agent-state">{t('network.reconnectingHint')}</p>
            )}
            {/* The invisible copy always holds the warning's space, so nothing jumps when it shows. */}
            <div className="test-call__warning-slot">
              <p className="test-call__warning" data-placeholder aria-hidden="true">
                {t('call.mutedTalking')}
              </p>
              {showMutedWarning && <p className="test-call__warning">{t('call.mutedTalking')}</p>}
            </div>
          </div>
        ) : (
          <MicStatusMessage
            status={mic.status}
            deviceLabel={mic.micLabel ?? undefined}
            onRetry={startCall}
          />
        )}

        <Captions captions={call.captions} />

        {inCall && (
          <button type="button" className="hang-up" onClick={endCall}>
            {t('controls.hangUp')}
          </button>
        )}

        {inCall && (
          <NetworkSimulator
            network={call.network}
            canDrop={call.state === 'connected'}
            onNetworkChange={call.setNetwork}
            onDrop={call.dropConnection}
          />
        )}
      </main>
    </div>
  )
}
