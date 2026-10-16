import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

type Theme = 'light' | 'dark'
type ViewMode = 'simple' | 'expert'

interface ThemeContextType {
  theme: Theme
  mode: ViewMode
  toggleTheme: () => void
  toggleMode: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem('qt-theme')
      if (stored === 'dark' || stored === 'light') return stored
    } catch { /* restricted storage */ }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  const [mode, setMode] = useState<ViewMode>(() => {
    try {
      const stored = localStorage.getItem('qt-mode')
      if (stored === 'expert') return 'expert'
    } catch { /* restricted storage */ }
    return 'simple'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('qt-theme', theme) } catch { /* noop */ }
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', mode)
    try { localStorage.setItem('qt-mode', mode) } catch { /* noop */ }
  }, [mode])

  const toggleTheme = useCallback(() => setTheme(t => t === 'light' ? 'dark' : 'light'), [])
  const toggleMode = useCallback(() => setMode(m => m === 'simple' ? 'expert' : 'simple'), [])

  return (
    <ThemeContext.Provider value={{ theme, mode, toggleTheme, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
