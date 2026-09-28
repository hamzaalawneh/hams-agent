import { Captions } from '@components/Captions'
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

        <Captions captions={call.captions} />

        {inCall && (
          <>
            <button type="button" className="hang-up" onClick={endCall}>
              {t('controls.hangUp')}
            </button>
            <NetworkSimulator
              network={call.network}
              canDrop={call.state === 'connected'}
              onNetworkChange={call.setNetwork}
              onDrop={call.dropConnection}
            />
          </>
        )}
      </main>
    </div>
  )
}
