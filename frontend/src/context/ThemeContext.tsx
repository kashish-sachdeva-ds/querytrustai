import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'
export type ViewMode = 'simple' | 'expert'

export interface ThemeContextType {
  theme: ResolvedTheme
  themePreference: ThemePreference
  mode: ViewMode
  setThemePreference: (pref: ThemePreference) => void
  toggleTheme: () => void
  toggleMode: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => {
    try {
      const stored = localStorage.getItem('qt-theme-preference')
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored
      }
      const legacy = localStorage.getItem('qt-theme')
      if (legacy === 'light' || legacy === 'dark') {
        return legacy
      }
    } catch {
      /* restricted storage */
    }
    return 'system'
  })

  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      setSystemDark(e.matches)
    }
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [])

  const resolvedTheme: ResolvedTheme =
    themePreference === 'system' ? (systemDark ? 'dark' : 'light') : themePreference

  const [mode, setMode] = useState<ViewMode>(() => {
    try {
      const stored = localStorage.getItem('qt-mode')
      if (stored === 'expert') return 'expert'
    } catch {
      /* restricted storage */
    }
    return 'simple'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme)
    try {
      localStorage.setItem('qt-theme-preference', themePreference)
      localStorage.setItem('qt-theme', resolvedTheme)
    } catch {
      /* noop */
    }
  }, [resolvedTheme, themePreference])

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', mode)
    try {
      localStorage.setItem('qt-mode', mode)
    } catch {
      /* noop */
    }
  }, [mode])

  const setThemePreference = useCallback((pref: ThemePreference) => {
    setThemePreferenceState(pref)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemePreferenceState((prev) => {
      if (prev === 'light') return 'dark'
      if (prev === 'dark') return 'system'
      return 'light'
    })
  }, [])

  const toggleMode = useCallback(() => setMode((m) => (m === 'simple' ? 'expert' : 'simple')), [])

  return (
    <ThemeContext.Provider
      value={{
        theme: resolvedTheme,
        themePreference,
        mode,
        setThemePreference,
        toggleTheme,
        toggleMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
