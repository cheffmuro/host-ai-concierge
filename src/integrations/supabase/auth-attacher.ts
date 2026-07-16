// Project-specific bearer attacher. Refreshes the Supabase session when the
// cached access token is expired (or about to expire) before attaching it,
// preventing "JWT has expired" errors on serverFn RPCs after long idle periods.
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
        const { data: refreshed } = await supabase.auth.refreshSession()
        session = refreshed.session ?? session
      }
      token = session?.access_token
    } catch {
      // ignore — request proceeds unauthenticated and server returns 401
    }
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  },
)
