import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { api, getErrorMessage, onSessionExpired } from '../services/api'
import type { User } from '../types'

interface AuthValue {
  user: User | null
  loading: boolean
  sessionError: string
  setUser: (user: User | null) => void
  logout: () => Promise<void>
  retrySession: () => void
}

const authContextKey = '__bolsaPracticasAuthContext__'
const globalContexts = globalThis as typeof globalThis & {
  [authContextKey]?: ReturnType<typeof createContext<AuthValue | null>>
}

// Keep the same context identity when Vite replaces this module during development.
// Route components retained by React Router can otherwise reference the previous instance.
const AuthContext =
  globalContexts[authContextKey] ?? createContext<AuthValue | null>(null)
globalContexts[authContextKey] = AuthContext

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionError, setSessionError] = useState('')
  const sessionVersion = useRef(0)
  // Login, verification and logout supersede any older session lookup.
  const setUser = useCallback((nextUser: User | null) => {
    sessionVersion.current++
    setCurrentUser(nextUser)
    setSessionError('')
    setLoading(false)
  }, [])
  const loadSession = () => {
    const version = ++sessionVersion.current
    setLoading(true)
    setSessionError('')
    api
      .getSession()
      .then((session) => {
        if (version === sessionVersion.current) setCurrentUser(session)
      })
      .catch((error) => {
        if (version === sessionVersion.current)
          setSessionError(
            getErrorMessage(error, 'No pudimos consultar tu sesión.'),
          )
      })
      .finally(() => {
        if (version === sessionVersion.current) setLoading(false)
      })
  }
  useEffect(() => {
    let active = true
    const version = sessionVersion.current
    api
      .getSession()
      .then((session) => {
        if (active && version === sessionVersion.current)
          setCurrentUser(session)
      })
      .catch((error) => {
        if (active && version === sessionVersion.current)
          setSessionError(
            getErrorMessage(error, 'No pudimos consultar tu sesión.'),
          )
      })
      .finally(() => {
        if (active && version === sessionVersion.current) setLoading(false)
      })
    const unsubscribe = onSessionExpired(() => {
      setUser(null)
      setSessionError('')
      setLoading(false)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])
  const logout = async () => {
    await api.logout()
    setUser(null)
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        sessionError,
        setUser,
        logout,
        retrySession: loadSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth debe utilizarse dentro de AuthProvider')
  return value
}
