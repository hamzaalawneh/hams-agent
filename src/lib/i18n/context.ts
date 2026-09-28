import { createContext } from 'react'
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

export const DIRECTIONS: Record<Lang, 'ltr' | 'rtl'> = { en: 'ltr', ar: 'rtl' }

/** Finds 'controls.mute' in the nested dictionary; falls back to the key itself. */
export function translate(lang: Lang, key: TranslationKey): string {
  let node: unknown = DICTIONARIES[lang]
  for (const part of key.split('.')) node = (node as Record<string, unknown>)?.[part]
  return typeof node === 'string' ? node : key
}

export type LanguageContextValue = {
  lang: Lang
  t: (key: TranslationKey) => string
  setLang: (lang: Lang) => void
}

export const LanguageContext = createContext<LanguageContextValue | null>(null)
