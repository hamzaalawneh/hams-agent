import { useLanguage } from '@lib/i18n/LanguageProvider'
import './styles.css'

export function LanguageToggle() {
  const { lang, t, setLang } = useLanguage()
  const target = lang === 'en' ? 'ar' : 'en'

  return (
    <button
      type="button"
      className="language-toggle"
      lang={target}
      aria-label={t('lang.switchLabel')}
      onClick={() => setLang(target)}
    >
      {t('lang.switchTo')}
    </button>
  )
}
