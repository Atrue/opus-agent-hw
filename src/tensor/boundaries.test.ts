import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * CI-тест границ библиотеки src/tensor/ (R2): дублирует oxlint
 * no-restricted-imports прямым сканированием исходников — граница держится
 * и без локального линта. Правила: (1) внутри src/tensor/ — только
 * внутренние импорты, остающиеся внутри библиотеки (D-34, апрув владельца
 * 2026-11-13: '../…' из подпапок к корню tensor разрешён; выход за пределы
 * src/tensor и bare-импорты — нет; ноль импортов из приложения и react) —
 * КОЛОЦИРОВАННЫЕ тест-файлы *.test.ts exempt (D-28а: им нужен vitest и
 * прикладные модули сценариев; послабление точечное, только это правило);
 * (2) вне src/tensor/ — никаких deep-импортов мимо index.ts — сканирует
 * ВСЕ файлы, включая тесты; (3) линт-гейт настроен (.oxlintrc.json:
 * правило + override для src/tensor + carve-out тестов только на vitest).
 */

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url))
const OXLINTRC = fileURLToPath(new URL('../../.oxlintrc.json', import.meta.url))

function listTsFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      out.push(...listTsFiles(full))
    } else if (/\.tsx?$/.test(name)) {
      out.push(full)
    }
  }
  return out
}

interface ImportLine {
  file: string
  specifier: string
}

function importsOf(file: string): string[] {
  const specifiers: string[] = []
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*(?:import|export)\s[^;]*?from\s*['"]([^'"]+)['"]/.exec(line)
    if (m !== null) specifiers.push(m[1]!)
    const sideEffect = /^\s*import\s*['"]([^'"]+)['"]/.exec(line)
    if (sideEffect !== null) specifiers.push(sideEffect[1]!)
  }
  return specifiers
}

const allFiles = listTsFiles(SRC_DIR)
const tensorFiles = allFiles.filter((f) => f.includes('/tensor/'))
const outsideFiles = allFiles.filter((f) => !f.includes('/tensor/'))

const importLines: ImportLine[] = outsideFiles.concat(tensorFiles).flatMap((file) =>
  importsOf(file).map((specifier) => ({ file, specifier })),
)

/** D-34: относительный импорт нарушает границу, только если резолвится
 *  за пределы src/tensor/ (bare-импорт извне — всегда нарушение). */
function escapesTensor(file: string, specifier: string): boolean {
  if (!specifier.startsWith('.')) return true
  const rel = relative(SRC_DIR, resolve(dirname(file), specifier))
  return rel.startsWith('..') || isAbsolute(rel)
}

describe('граница src/tensor/ (R2) — сканирование исходников', () => {
  it('внутри src/tensor/ нет импортов извне библиотеки (включая react), кроме тест-файлов', () => {
    // D-28а: колоцированные *.test.ts exempt из правила (1) — тесты импортируют
    // vitest и прикладные модули (../run/scenario); правило (2) ниже продолжает
    // их сканировать, oxlint-override разрешает тестам ТОЛЬКО vitest.
    // D-34: '../…' из подпапок к корню tensor легален (резолв внутри библиотеки).
    const violations = importLines.filter(
      ({ file, specifier }) => file.includes('/tensor/') && !file.endsWith('.test.ts') && escapesTensor(file, specifier),
    )
    expect(
      violations.map((v) => `${v.file}: ${v.specifier}`),
      'внутри библиотеки только импорты, резолвящиеся в src/tensor/ (тесты exempt)',
    ).toEqual([])
  })

  it('вне src/tensor/ нет deep-импортов мимо index.ts', () => {
    const deepTensor = /(^|\/)tensor\/(?!index(\.ts)?$)/
    const violations = importLines.filter(({ file, specifier }) => !file.includes('/tensor/') && deepTensor.test(specifier))
    expect(
      violations.map((v) => `${v.file}: ${v.specifier}`),
      'приложение импортирует движок только через src/tensor/index.ts',
    ).toEqual([])
  })

  it('граница enforce дважды: oxlint no-restricted-imports настроен (patterns + override src/tensor)', () => {
    // .oxlintrc.json — jsonc (D-27): полнострочные комментарии вырезаем перед JSON.parse
    // (построчно — glob-паттерны вида **/tensor/* содержат /* и */, регекс по символам их бы съел)
    const raw = readFileSync(OXLINTRC, 'utf8')
      .split('\n')
      .filter((line) => !/^\s*\/\//.test(line))
      .join('\n')
    const config = JSON.parse(raw) as {
      rules?: Record<string, unknown>
      overrides?: { files?: string[]; rules?: Record<string, unknown> }[]
    }
    const rule = config.rules?.['no-restricted-imports']
    expect(rule, 'правило no-restricted-imports включено в .oxlintrc.json').toBeDefined()
    const patterns = Array.isArray(rule) ? (rule[1] as { patterns?: unknown[] }) : undefined
    expect(patterns?.patterns?.length, 'у правила настроены patterns (запрет deep-импортов)').toBeGreaterThan(0)
    const tensorOverride = config.overrides?.find((o) => (o.files ?? []).some((f) => f.includes('tensor')))
    expect(tensorOverride, 'override для файлов src/tensor/** (запрет внешних импортов внутри библиотеки)').toBeDefined()
    const overrideRule = tensorOverride?.rules?.['no-restricted-imports']
    expect(overrideRule, 'no-restricted-imports активен внутри src/tensor/**').toBeDefined()
    // D-28а: carve-out для колоцированных тестов — bare-импорт разрешён ТОЛЬКО vitest
    const testOverride = config.overrides?.find((o) => (o.files ?? []).some((f) => f.includes('test.ts')))
    expect(testOverride, 'override для src/tensor/**/*.test.ts (carve-out колокации)').toBeDefined()
    const testRule = testOverride?.rules?.['no-restricted-imports']
    expect(testRule, 'no-restricted-imports активен и для тест-файлов (запрет внешних импортов, кроме vitest)').toBeDefined()
    const testPatterns = Array.isArray(testRule) ? (testRule[1] as { patterns?: { group?: unknown[] }[] }) : undefined
    const testGroup = testPatterns?.patterns?.[0]?.group ?? []
    expect(
      (testGroup as string[]).includes('!vitest') && (testGroup as string[]).includes('*'),
      'carve-out тестов разрешает bare-импорт только vitest (negation !vitest при запрете *)',
    ).toBe(true)
  })
})
