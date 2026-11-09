import { http, HttpResponse } from "msw";
import { withDelay } from "../createHandler";

/**
 * Mirrors the real `nhg-manabi-api` auth contract: bare JSON (no
 * `{code,data,message}` wrapper), single bearer token, `GET /api/me` restore.
 */

const MOCK_SESSION_USER = {
  id: 1,
  username: "admin",
  display_name: "Admin",
  current_level: "N3",
  is_admin: true,
};

export const authHandlers = [
  http.post("/api/auth/login", async ({ request }) => {
    await withDelay(300);
    const body = (await request.json()) as {
      username: string;
      password: string;
    };
    if (body.username === "admin" && body.password === "admin") {
      return HttpResponse.json({
        token: "mock-session-token",
        expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        user: MOCK_SESSION_USER,
      });
    }
    return HttpResponse.json({ detail: "Invalid username or password" }, { status: 401 });
  }),

  http.post("/api/auth/logout", async () => {
    await withDelay(100);
    return HttpResponse.json({ detail: "Logged out" });
  }),

  http.get("/api/me", () => HttpResponse.json(MOCK_SESSION_USER)),
];
