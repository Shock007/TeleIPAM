const KEY = 'ipam_token'
export const AUTH_EXPIRED = 'auth:expired'

export const getToken = () => {
  try { return localStorage.getItem(KEY) } catch { return null }
}
export const setToken = (t: string) => localStorage.setItem(KEY, t)
export const clearToken = () => localStorage.removeItem(KEY)