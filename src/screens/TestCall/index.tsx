import './styles.css'
import { useLanguage } from '@lib/i18n/LanguageProvider'
import type { TestCallScreenProps } from './types'

// Scaffold — call UI is implemented next. Language/RTL wiring is real already.
export function TestCallScreen(_props: TestCallScreenProps) {
  const { lang, t, setLang } = useLanguage()

  return (
    <div className="test-call-screen">
      <button
        type="button"
        className="lang-toggle"
        onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
      >
        {lang === 'en' ? 'العربية' : 'English'}
      </button>
      <h1>{t('app.title')}</h1>
      <p>{t('controls.testCall')} — screen not implemented yet</p>
    </div>
  )
}
