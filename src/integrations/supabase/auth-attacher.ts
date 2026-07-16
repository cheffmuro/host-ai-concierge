// Project-specific bearer attacher. Always validates the JWT exp claim from
// the token itself (not just session.expires_at) and refreshes when expired
// or near expiry. If refresh fails, signs the user out and redirects to
// /login so the next request can obtain a fresh session.
import { createMiddleware } from '@tanstack/react-start'
import { supabase } from './client'

const SKEW_SECONDS = 60

function getJwtExp(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const parsed = JSON.parse(json) as { exp?: number }
    return typeof parsed.exp === 'number' ? parsed.exp : null
  } catch {
    return null
  }
}

export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    let token: string | undefined
    try {
      const { data } = await supabase.auth.getSession()
      let session = data.session
      const nowSec = Math.floor(Date.now() / 1000)
      const exp = session?.access_token ? getJwtExp(session.access_token) : null
      const expiresAt = exp ?? session?.expires_at ?? 0
      const needsRefresh = !!session && expiresAt - SKEW_SECONDS <= nowSec

      if (needsRefresh) {
        try {
          const { data: refreshed, error } = await supabase.auth.refreshSession()
          if (error || !refreshed.session) {
            await supabase.auth.signOut().catch(() => {})
            if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
              window.location.replace('/login')
            }
            session = null
          } else {
            session = refreshed.session
          }
        } catch {
          session = null
        }
      }
      token = session?.access_token
    } catch {
      // ignore — request proceeds unauthenticated
    }
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  },
)
