import { defineConfig, devices } from "@playwright/test";

/** Node global when `tsconfig` does not include `@types/node` (pre-commit may lint before lockfile updates). */
declare const process: { env: { CI?: string } };

const ci = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 2 : 0,
  workers: ci ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:5181",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    /** `--host 127.0.0.1`: vite's default `localhost` binds IPv6-only on macOS, which the URL probe cannot reach. */
    command: "vp dev --host 127.0.0.1 --port 5181",
    url: "http://127.0.0.1:5181",
    reuseExistingServer: !ci,
  },
});
