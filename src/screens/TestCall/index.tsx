import { Captions } from '@components/Captions'
import { HangUpButton } from '@components/HangUpButton'
import { LanguageToggle } from '@components/LanguageToggle'
import { Logo } from '@components/Logo'
import { MicButton } from '@components/MicButton'
import { MicStatusMessage } from '@components/MicStatusMessage'
import { NetworkSimulator } from '@components/NetworkSimulator'
import { ThemeSwitcher } from '@components/ThemeSwitcher'
import { useLanguage } from '@hooks/useLanguage'
import { useTestCall } from '@hooks/useTestCall'
import './styles.css'

export function TestCallScreen() {
  const { t } = useLanguage()
  const {
    mic,
    call,
    inCall,
    micButtonRef,
    activity,
    pillText,
    statusText,
    showMutedWarning,
    soundBlocked,
    startCall,
    endCall,
    toggleMute,
  } = useTestCall()

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

        {/* Slots keep their size whether or not there's anything in them, so nothing
            on the screen moves when a call starts or ends. */}
        <div className="test-call__pill-slot">
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
        </div>

        {/* The mic stays centred; Hang up hangs off its side instead of pushing it over. */}
        <div className="test-call__buttons">
          <MicButton
            ref={micButtonRef}
            activity={activity}
            label={inCall ? t(call.muted ? 'controls.unmute' : 'controls.mute') : t('mic.start')}
            pressed={inCall ? call.muted : undefined}
            onClick={inCall ? toggleMute : startCall}
          />
          {inCall && (
            <div className="test-call__hang-up">
              <HangUpButton label={t('controls.hangUp')} onClick={endCall} />
            </div>
          )}
        </div>

        <div className="test-call__message-slot">
          {inCall ? (
            <div className="test-call__status" role="status">
              {statusText && <p className="test-call__agent-state">{statusText}</p>}
              {/* The invisible copy always holds the warning's space, so nothing jumps when it shows. */}
              <div className="test-call__warning-slot">
                <p className="test-call__warning" data-placeholder aria-hidden="true">
                  {t('call.mutedTalking')}
                </p>
                {showMutedWarning && <p className="test-call__warning">{t('call.mutedTalking')}</p>}
              </div>
            </div>
          ) : (
            <MicStatusMessage status={mic.status} deviceLabel={mic.micLabel} onRetry={startCall} />
          )}
        </div>

        {/* Phones sometimes hold our audio back; one tap starts it again.
            An alert is announced by screen readers as soon as it appears. */}
        {soundBlocked && (
          <div role="alert">
            <button type="button" className="sound-blocked" onClick={call.resumeSound}>
              {t('call.soundBlocked')}
            </button>
          </div>
        )}

        <Captions captions={call.captions} />

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
