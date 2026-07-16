import { createMiddleware } from "@tanstack/react-start";
import { getFreshAccessToken } from "@/lib/auth-session";

export const attachFreshSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token = await getFreshAccessToken({ redirectOnFailure: true }).catch(() => undefined);

    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);