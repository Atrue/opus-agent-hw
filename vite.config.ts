/**
 * Сборка/тест Vite + vitest. Плагины: React 19 (fast refresh), Tailwind 4
 * CSS-first (@theme в src/index.css — без tailwind.config).
 *
 * Алиас '@' → ./src (фаза 3, RESEARCH §1.1): shadcn CLI пишет генерации в
 * src/ui/kit/ и импортирует их как '@/ui/kit/...' — resolve.alias обязан
 * резолвить тот же путь, что compilerOptions.paths в tsconfig*.json.
 * import.meta.dirname — ESM-эквивалент __dirname (Node ≥ 20.11).
 */
import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    // e2e/smoke.spec.ts — Playwright, не vitest (5 проверок запускаются pnpm e2e);
    // .claude/** — инструменты воркспейса (скиллы), не код проекта
    exclude: ['e2e/**', 'node_modules/**', 'dist/**', '.claude/**'],
  },
})
