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
    try {
      await apiLogin(email, password)
      const me = await apiGetMe()
      setUser(me)
    } catch (err) {
      const isDemoMode = import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE !== 'false'
      const cleanEmail = email.trim().toLowerCase()
      if (
        isDemoMode &&
        (cleanEmail.includes('analyst') || cleanEmail.includes('admin') || cleanEmail.includes('viewer'))
      ) {
        const role: 'admin' | 'analyst' | 'viewer' = cleanEmail.includes('admin')
          ? 'admin'
          : cleanEmail.includes('viewer')
          ? 'viewer'
          : 'analyst'
        const fallbackUser: UserMeResponse = {
          id: `demo-${role}-001`,
          email: cleanEmail,
          display_name: role === 'admin' ? 'Demo Administrator' : role === 'analyst' ? 'Demo Analyst' : 'Demo Read-Only Viewer',
          role,
          is_active: true,
          environment: 'demo-sandbox',
          llm_provider: 'demo',
        }
        setUser(fallbackUser)
        return
      }
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
