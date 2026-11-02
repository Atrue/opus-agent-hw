import { defineConfig } from 'playwright/test'

/**
 * E2E конфиг прототипа (RESEARCH §6.2): 5 проверок-смок против production-сборки
 * (vite preview). CI в Phase 1 не настраивается — e2e не блокирует деплой
 * (STACK.md); запуск локально: pnpm e2e.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1280, height: 800 }, // десктоп ≥1024px — осознанный тир (A-6)
  },
  webServer: {
    command: 'pnpm build && pnpm preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
})
