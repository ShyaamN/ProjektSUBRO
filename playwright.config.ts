import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 1, timeout: 45000,
  expect: { timeout: 12000 }, reporter: [['list']],
  use: { baseURL: process.env.BASE_URL || 'http://localhost:3000', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'msedge', viewport: { width: 1440, height: 1000 } } }],
  webServer: process.env.BASE_URL ? undefined : {
    command: 'npm run dev -- --port 3000', url: 'http://localhost:3000', reuseExistingServer: false, timeout: 120000,
    env: { GEMINI_API_KEY: '', SUPABASE_URL: '', SUPABASE_SECRET_KEY: '', DEMO_STORAGE: 'memory', NEXT_TELEMETRY_DISABLED: '1' },
  },
});
