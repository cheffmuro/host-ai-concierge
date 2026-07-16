// Project-specific bearer attacher. Refreshes the Supabase session when the
// cached access token is expired (or near expiry) before attaching it. If the
// refresh token itself is invalid/expired, signs the user out and redirects
// to /auth so the next request can obtain a fresh session.
import { createMiddleware } from '@tanstack/react-start'
import { supabase } from './client'

const SKEW_SECONDS = 30

export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    let token: string | undefined
    try {
      const { data } = await supabase.auth.getSession()
      let session = data.session
      const nowSec = Math.floor(Date.now() / 1000)
      if (session && (session.expires_at ?? 0) - SKEW_SECONDS <= nowSec) {
        const { data: refreshed, error } = await supabase.auth.refreshSession()
        if (error || !refreshed.session) {
          await supabase.auth.signOut().catch(() => {})
          if (typeof window !== 'undefined' && window.location.pathname !== '/auth') {
            window.location.replace('/auth')
          }
          session = null
        } else {
          session = refreshed.session
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
