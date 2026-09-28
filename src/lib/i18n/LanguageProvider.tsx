import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import en from '@translations/En.json'
import ar from '@translations/Ar.json'

export type Lang = 'en' | 'ar'
export type TranslationKey = keyof typeof en

const DICTIONARIES: Record<Lang, Record<TranslationKey, string>> = { en, ar }
const DIRECTIONS: Record<Lang, 'ltr' | 'rtl'> = { en: 'ltr', ar: 'rtl' }
const STORAGE_KEY = 'hams-agent:lang'

type LanguageContextValue = {
  lang: Lang
  dir: 'ltr' | 'rtl'
  t: (key: TranslationKey) => string
  setLang: (lang: Lang) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function readStoredLang(): Lang {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'ar' ? 'ar' : 'en'
  } catch {
    return 'en' // private browsing / blocked storage — fall back quietly
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang)

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = DIRECTIONS[lang]
    try {
      window.localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // ignore — persistence is a nicety, not a requirement
    }
  }, [lang])

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      dir: DIRECTIONS[lang],
      t: (key) => DICTIONARIES[lang][key] ?? key,
      setLang: setLangState,
    }),
    [lang],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider')
  return ctx
}
