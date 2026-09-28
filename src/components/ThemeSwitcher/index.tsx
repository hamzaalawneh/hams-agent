import { useLayoutEffect, useState } from 'react'
import { useLanguage } from '@hooks/useLanguage'
import type { TranslationKey } from '@lib/i18n/context'
import './styles.css'
import type { Theme } from './types'

const STORAGE_KEY = 'hams-agent:theme'

const OPTIONS: { value: Theme; label: TranslationKey }[] = [
  { value: 'brand', label: 'theme.brand' },
  { value: 'white-label', label: 'theme.whiteLabel' },
  { value: 'dark', label: 'theme.dark' },
]

function readInitialTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'brand' || stored === 'white-label' || stored === 'dark') return stored
  } catch {
    // blocked storage: fall through to the OS preference
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'brand'
}

export function ThemeSwitcher() {
  const { t } = useLanguage()
  const [theme, setTheme] = useState<Theme>(readInitialTheme)

  // Layout effect so the stored theme lands before first paint (no colour flash).
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // persistence is a nicety
    }
  }, [theme])

  return (
    <div className="theme-switcher" role="group" aria-label={t('theme.label')}>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className="theme-switcher__option"
          aria-pressed={theme === option.value}
          onClick={() => setTheme(option.value)}
        >
          {t(option.label)}
        </button>
      ))}
    </div>
  )
}
