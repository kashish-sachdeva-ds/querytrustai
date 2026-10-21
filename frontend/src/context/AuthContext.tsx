import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
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
  PROBE_TIMEOUT_MS,
} from '../api/client'
import { demoUser, demoAdminUser, demoViewerUser } from '../fixtures/demoFixtures'

export type ConnectionState = 'connected' | 'waking_backend' | 'offline_demo'

interface AuthContextType {
  user: UserMeResponse | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  connectionState: ConnectionState
  retryCountdown: number
  login: (email: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  joinWorkspace: (payload: JoinWorkspacePayload) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  enterDemoMode: (role?: 'admin' | 'analyst' | 'viewer') => void
  exitDemoMode: () => Promise<void>
  retryConnection: () => Promise<void>
  isWakingBackend: boolean
  isOfflineDemo: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const CACHED_USER_KEY = 'qt_cached_user'
const DEMO_MODE_FLAG = 'qt_offline_demo'

function getInitialCachedUser(): UserMeResponse | null {
  try {
    if (localStorage.getItem(DEMO_MODE_FLAG) === 'true') {
      return demoUser
    }
    const raw = localStorage.getItem(CACHED_USER_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed.email === 'string' && typeof parsed.role === 'string') {
        return parsed as UserMeResponse
      }
    }
  } catch {
    /* ignore storage errors */
  }
  return null
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserMeResponse | null>(getInitialCachedUser)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>(() => {
    try {
      if (localStorage.getItem(DEMO_MODE_FLAG) === 'true') return 'offline_demo'
    } catch {}
    return 'connected'
  })
  const [retryCountdown, setRetryCountdown] = useState<number>(10)
  const retryTimerRef = useRef<number | null>(null)

  const verifySession = useCallback(async (isInitial = false): Promise<void> => {
    try {
      const me = await apiGetMe(PROBE_TIMEOUT_MS)
      setUser(me)
      setConnectionState('connected')
      setError(null)
      try {
        localStorage.setItem(CACHED_USER_KEY, JSON.stringify(me))
        localStorage.removeItem(DEMO_MODE_FLAG)
      } catch {}
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      const isTimeoutOrNetwork =
        errorMsg.includes('timed out') ||
        errorMsg.includes('Failed to fetch') ||
        errorMsg.includes('NetworkError') ||
        errorMsg.includes('502') ||
        errorMsg.includes('503') ||
        errorMsg.includes('504')

      if (isTimeoutOrNetwork) {
        setConnectionState((prev) => (prev === 'offline_demo' ? 'offline_demo' : 'waking_backend'))
      } else {
        // Explicit 401 or auth failure
        if (!isInitial) {
          setUser(null)
          try {
            localStorage.removeItem(CACHED_USER_KEY)
          } catch {}
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Auto retry countdown when in waking_backend state
  useEffect(() => {
    if (connectionState !== 'waking_backend') {
      if (retryTimerRef.current) {
        window.clearInterval(retryTimerRef.current)
        retryTimerRef.current = null
      }
      return
    }

    setRetryCountdown(10)
    retryTimerRef.current = window.setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev <= 1) {
          verifySession()
          return 10
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (retryTimerRef.current) {
        window.clearInterval(retryTimerRef.current)
        retryTimerRef.current = null
      }
    }
  }, [connectionState, verifySession])

  // Non-blocking initial session verification
  useEffect(() => {
    verifySession(true)
  }, [verifySession])

  const refreshUser = async () => {
    await verifySession(false)
  }

  const enterDemoMode = useCallback((role: 'admin' | 'analyst' | 'viewer' = 'analyst') => {
    let selectedDemoUser = demoUser
    if (role === 'admin') selectedDemoUser = demoAdminUser
    if (role === 'viewer') selectedDemoUser = demoViewerUser

    setUser(selectedDemoUser)
    setConnectionState('offline_demo')
    setError(null)
    try {
      localStorage.setItem(DEMO_MODE_FLAG, 'true')
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(selectedDemoUser))
    } catch {}
  }, [])

  const exitDemoMode = useCallback(async () => {
    try {
      localStorage.removeItem(DEMO_MODE_FLAG)
      localStorage.removeItem(CACHED_USER_KEY)
    } catch {}
    setUser(null)
    setConnectionState('connected')
    await verifySession(false)
  }, [verifySession])

  const retryConnection = useCallback(async () => {
    setRetryCountdown(10)
    await verifySession(false)
  }, [verifySession])

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
      const me = await apiGetMe(PROBE_TIMEOUT_MS)
      setUser(me)
      setConnectionState('connected')
      try {
        localStorage.setItem(CACHED_USER_KEY, JSON.stringify(me))
        localStorage.removeItem(DEMO_MODE_FLAG)
      } catch {}
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      // If server is unreachable during login, allow quick demo fallback
      if (msg.includes('timed out') || msg.includes('Failed to fetch') || msg.includes('502') || msg.includes('503')) {
        setConnectionState('waking_backend')
      }
      setError(msg)
      throw err
    }
  }

  const register = async (payload: RegisterPayload) => {
    setError(null)
    try {
      await apiRegister(payload)
      const me = await apiGetMe(PROBE_TIMEOUT_MS)
      setUser(me)
      setConnectionState('connected')
      try {
        localStorage.setItem(CACHED_USER_KEY, JSON.stringify(me))
      } catch {}
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
      const me = await apiGetMe(PROBE_TIMEOUT_MS)
      setUser(me)
      setConnectionState('connected')
      try {
        localStorage.setItem(CACHED_USER_KEY, JSON.stringify(me))
      } catch {}
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
      try {
        localStorage.removeItem(CACHED_USER_KEY)
        localStorage.removeItem(DEMO_MODE_FLAG)
      } catch {}
      await apiLogout()
    } finally {
      setUser(null)
      setConnectionState('connected')
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
        connectionState,
        retryCountdown,
        login,
        register,
        joinWorkspace,
        logout,
        refreshUser,
        enterDemoMode,
        exitDemoMode,
        retryConnection,
        isWakingBackend: connectionState === 'waking_backend',
        isOfflineDemo: connectionState === 'offline_demo',
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
