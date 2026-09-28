import { useLanguage } from '@hooks/useLanguage'
import type { TranslationKey } from '@lib/i18n/context'
import type { MicStatus } from '@hooks/useMicrophone'
import { detectBrowser } from '@utils/browser'
import './styles.css'
import type { MicStatusMessageProps } from './types'

const MESSAGES: Record<MicStatus, TranslationKey> = {
  idle: 'permission.explain',
  requesting: 'permission.requesting',
  ready: 'permission.ready',
  denied: 'permission.denied',
  'no-device': 'permission.noDevice',
  unavailable: 'permission.unavailable',
  unsupported: 'permission.unsupported',
}

const RETRYABLE: MicStatus[] = ['denied', 'no-device', 'unavailable']

export function MicStatusMessage({ status, deviceLabel, onRetry }: MicStatusMessageProps) {
  const { t } = useLanguage()
  const isProblem = RETRYABLE.includes(status) || status === 'unsupported'

  return (
    <div className="mic-status" data-problem={isProblem}>
      <div role="status">
        <p className="mic-status__message">
          {status === 'ready' && deviceLabel ? (
            <>
              {t('permission.using')} <bdi>{deviceLabel}</bdi>
            </>
          ) : (
            t(MESSAGES[status])
          )}
        </p>
        {status === 'denied' && (
          <p className="mic-status__help">{t(`permission.help.${detectBrowser()}`)}</p>
        )}
      </div>
      {RETRYABLE.includes(status) && (
        <button type="button" className="mic-status__retry" onClick={onRetry}>
          {t('permission.retry')}
        </button>
      )}
    </div>
  )
}
