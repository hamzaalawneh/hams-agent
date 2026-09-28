import { useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import { DIRECTIONS, LanguageContext, translate, type Lang, type TranslationKey } from './context'

const STORAGE_KEY = 'hams-agent:lang'

// Arabic first: English only if the visitor chose it before.
function readStoredLang(): Lang {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'ar'
  } catch {
    return 'ar' // private browsing / blocked storage
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(readStoredLang)

  // Layout effect so lang/dir land before first paint (no LTR→RTL jump on load).
  useLayoutEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = DIRECTIONS[lang]
    try {
      window.localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // persistence is a nicety, not a requirement
    }
  }, [lang])

  const value = useMemo(
    () => ({ lang, t: (key: TranslationKey) => translate(lang, key), setLang }),
    [lang],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
