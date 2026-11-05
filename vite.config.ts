import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/ — defineConfig из vitest/config расширяет vite UserConfig
// полем test (канонический способ совмещения vite + vitest конфигов).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // e2e/smoke.spec.ts — Playwright, не vitest (5 проверок запускаются pnpm e2e);
    // .claude/** — инструменты воркспейса (скиллы), не код проекта
    exclude: ['e2e/**', 'node_modules/**', 'dist/**', '.claude/**'],
  },
})
