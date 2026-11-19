import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Токен-мост D-39 (фаза 3, UI-SPEC правило 2): кит питается @theme-токенами
 * DESIGN.md через :root-алиасы + @theme inline — hex-дублей нет. jsdom не
 * резолвит var()-цепочки Tailwind, поэтому контракт проверяется на источнике:
 * (1) каждый слот кита — алиас на конкретный @theme-токен (правка палитры
 * распространяется на кит автоматически); (2) коллизионные слоты не
 * переопределяют проектные цвета; (3) шкала радиусов = DESIGN §4.
 */
const css = readFileSync(fileURLToPath(new URL('../../index.css', import.meta.url)), 'utf8')

describe('Токен-мост D-39: кит ↔ DESIGN.md', () => {
  it('слоты кита — алиасы на @theme-токены (один источник правды)', () => {
    // поверхность тултипа/поповера = container-high — как текущий num-hint (D-35 фикс 2)
    expect(css).toContain('--popover: var(--color-surface-container-high)')
    expect(css).toContain('--popover-foreground: var(--color-on-surface)')
    // база карточек = container-low (was .card)
    expect(css).toContain('--card: var(--color-surface-container-low)')
    expect(css).toContain('--card-foreground: var(--color-on-surface)')
    // приглушённая поверхность/вторичный текст, error-слот впрок, ring = мята
    expect(css).toContain('--muted: var(--color-surface-container-high)')
    expect(css).toContain('--muted-foreground: var(--color-on-surface-variant)')
    expect(css).toContain('--destructive: var(--color-error)')
    expect(css).toContain('--ring: var(--color-primary)')
    expect(css).toContain('--border: var(--color-outline-variant)')
  })

  it('реэкспорт @theme inline открывает утилиты кита (bg-popover / bg-card / ring)', () => {
    expect(css).toContain('--color-popover: var(--popover)')
    expect(css).toContain('--color-card: var(--card)')
    expect(css).toContain('--color-muted: var(--muted)')
    expect(css).toContain('--color-ring: var(--ring)')
  })

  it('коллизионные слоты НЕ переопределяют проектные цвета (Pitfall 2)', () => {
    // проектная мята = forward, CTA = primary-container — обе живут в @theme как были
    expect(css).toContain('--color-primary: #4edea3')
    expect(css).toContain('--color-primary-container: #10b981')
    expect(css).toContain('--color-secondary: #4cd7f6')
    // мост не реэкспортирует primary/secondary/accent в утилити-неймспейс
    expect(css).not.toContain('--color-primary: var(--primary)')
    expect(css).not.toContain('--color-secondary: var(--secondary)')
    expect(css).not.toContain('--color-accent: var(--accent)')
  })

  it('шкала радиусов = DESIGN §4 (2/4/8/12) из одного --radius', () => {
    expect(css).toContain('--radius: 4px')
    expect(css).toContain('--radius-sm: calc(var(--radius) * 0.5)')
    expect(css).toContain('--radius-md: var(--radius)')
    expect(css).toContain('--radius-lg: calc(var(--radius) * 2)')
    expect(css).toContain('--radius-xl: calc(var(--radius) * 3)')
  })
})
