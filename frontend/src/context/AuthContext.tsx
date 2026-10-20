import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  type UserMeResponse,
  type RegisterPayload,
  type JoinWorkspacePayload,
  apiGetMe,
  apiLogin,
  apiRegister,
  apiJoinWorkspace,
  apiLogout,
  clearStoredToken,
} from '../api/client'

interface AuthContextType {
  user: UserMeResponse | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  joinWorkspace: (payload: JoinWorkspacePayload) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserMeResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const refreshUser = async () => {
    try {
      const me = await apiGetMe()
      setUser(me)
      setError(null)
    } catch {
      setUser(null)
    }
  }

  useEffect(() => {
    const initAuth = async () => {
      try {
        const me = await apiGetMe()
        setUser(me)
      } catch {
        setUser(null)
      }
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const login = async (email: string, password: string) => {
    setError(null)
    const cleanEmail = email.trim().toLowerCase()

    // Development convenience: resolve single-word role aliases to demo accounts
    const isDemoMode = import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE !== 'false'
    let submitEmail = cleanEmail
    let submitPassword = password

    if (isDemoMode) {
      if (cleanEmail === 'admin' || cleanEmail === 'admin@querytrust.local') {
        submitEmail = 'admin@querytrust.local'
        if (!submitPassword || submitPassword === 'admin' || submitPassword === 'admin123') {
          submitPassword = 'AdminPass123!'
        }
      } else if (cleanEmail === 'analyst' || cleanEmail === 'analyst@querytrust.local') {
        submitEmail = 'analyst@querytrust.local'
        if (!submitPassword || submitPassword === 'analyst' || submitPassword === 'analyst123') {
          submitPassword = 'AnalystPass123!'
        }
      } else if (cleanEmail === 'viewer' || cleanEmail === 'viewer@querytrust.local') {
        submitEmail = 'viewer@querytrust.local'
        if (!submitPassword || submitPassword === 'viewer' || submitPassword === 'viewer123') {
          submitPassword = 'ViewerPass123!'
        }
      }
    }

    try {
      await apiLogin(submitEmail, submitPassword)
      const me = await apiGetMe()
      setUser(me)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      setError(msg)
      throw err
    }
  }

  const register = async (payload: RegisterPayload) => {
    setError(null)
    try {
      await apiRegister(payload)
      const me = await apiGetMe()
      setUser(me)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
      setError(msg)
      throw err
    }
  }

  const joinWorkspace = async (payload: JoinWorkspacePayload) => {
    setError(null)
    try {
      await apiJoinWorkspace(payload)
      const me = await apiGetMe()
      setUser(me)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Joining workspace failed'
      setError(msg)
      throw err
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      clearStoredToken()
      await apiLogout()
    } finally {
      setUser(null)
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        register,
        joinWorkspace,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
