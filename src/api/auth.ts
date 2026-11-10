import type { LoginRequest, Session, SessionUserBase } from "./schemas";

/**
 * Real backend (`nhg-manabi-api`) admin auth endpoints.
 * Admin login is separate from the learning app: only administrators can sign in,
 * and the returned token is admin-scoped (rejected by learning-app endpoints).
 * The session is restored via `GET /api/admin/me`. There is no refresh endpoint.
 */
export const AUTH_ENDPOINTS = {
  login: "/api/admin/auth/login",
  logout: "/api/auth/logout",
  me: "/api/admin/me",
} as const;

export type { LoginRequest, Session, SessionUserBase };
