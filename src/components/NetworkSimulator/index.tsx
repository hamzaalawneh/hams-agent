import { useLanguage } from '@hooks/useLanguage'
import './styles.css'
import type { NetworkSimulatorProps } from './types'

// A demo tool, not part of the product: lets you degrade the fake network on purpose.
export function NetworkSimulator({
  network,
  canDrop,
  onNetworkChange,
  onDrop,
}: NetworkSimulatorProps) {
  const { t } = useLanguage()

  return (
    <fieldset className="network-simulator">
      <legend>{t('network.simulator.label')}</legend>
      <div className="network-simulator__options">
        {(['good', 'poor'] as const).map((condition) => (
          <button
            key={condition}
            type="button"
            aria-pressed={network === condition}
            onClick={() => onNetworkChange(condition)}
          >
            {t(`network.simulator.${condition}`)}
          </button>
        ))}
        <button type="button" disabled={!canDrop} onClick={onDrop}>
          {t('network.simulator.drop')}
        </button>
      </div>
    </fieldset>
  )
}
