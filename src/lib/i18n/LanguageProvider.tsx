import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import en from '@translations/En.json'
import ar from '@translations/Ar.json'

export type Lang = 'en' | 'ar'

type Dictionary = typeof en

// Turns { controls: { mute: string } } into the key union 'controls.mute'.
type DotPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${DotPaths<T[K]>}`
}[keyof T & string]

export type TranslationKey = DotPaths<Dictionary>

// Typing ar as Dictionary makes the build fail if Ar.json is missing a key En.json has.
const DICTIONARIES: Record<Lang, Dictionary> = { en, ar }

function lookup(dictionary: Dictionary, key: TranslationKey): string | undefined {
  let node: unknown = dictionary
  for (const part of key.split('.')) {
    node = (node as Record<string, unknown> | undefined)?.[part]
  }
  return typeof node === 'string' ? node : undefined
}
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

  // Layout effect so dir="rtl" lands before first paint (no LTR→RTL jump on load).
  useLayoutEffect(() => {
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
      t: (key) => lookup(DICTIONARIES[lang], key) ?? key,
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
