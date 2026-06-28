import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authMe, authLogin, authRegister, authLogout } from './api.js'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try { setUser(await authMe()) } catch { setUser(null) } finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const login = useCallback(async (username, password) => {
    await authLogin(username, password)
    setUser(await authMe())
  }, [])

  const register = useCallback(async (username, email, password) => {
    await authRegister(username, email, password)
    setUser(await authMe())
  }, [])

  const logout = useCallback(async () => {
    try { await authLogout() } catch { /* clear locally regardless */ }
    setUser(null)
  }, [])

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  )
}
