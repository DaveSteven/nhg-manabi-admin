import type { LoginRequest, Session, SessionUserBase } from "./schemas";

/**
 * Real backend (`nhg-manabi-api`) auth endpoints.
 * Login returns a single bearer token (`Session`); the session is restored
 * via `GET /api/me`. There is no refresh endpoint.
 */
export const AUTH_ENDPOINTS = {
  login: "/api/auth/login",
  logout: "/api/auth/logout",
  me: "/api/me",
} as const;

export type { LoginRequest, Session, SessionUserBase };
