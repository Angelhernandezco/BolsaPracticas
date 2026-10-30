import { defineConfig } from "@playwright/test"
export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  fullyParallel: false,
  timeout: 45000,
  expect: { timeout: 8000 },
  reporter: "list",
  use: {
    baseURL: "http://localhost:8444",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node --env-file=backend/.env.test backend/tests/e2e-server.js",
      url: "http://127.0.0.1:3002/api/health",
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: "npm --prefix frontend run dev -- --port 8444",
      url: "http://localhost:8444",
      env: {
        PORT: "8444",
        BACKEND_URL: "http://127.0.0.1:3002",
        VITE_API_URL: "/api",
        VITE_USE_MOCKS: "false",
      },
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
})
