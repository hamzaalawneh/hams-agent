import { LanguageToggle } from '@components/LanguageToggle'
import { Logo } from '@components/Logo'
import { MicButton } from '@components/MicButton'
import { ThemeSwitcher } from '@components/ThemeSwitcher'
import { useLanguage } from '@lib/i18n/LanguageProvider'
import './styles.css'
import type { TestCallScreenProps } from './types'

export function TestCallScreen(_props: TestCallScreenProps) {
  const { t } = useLanguage()

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
        <MicButton label={t('mic.start')} />
        <p className="test-call__hint">{t('mic.hint')}</p>
      </main>
    </div>
  )
}
