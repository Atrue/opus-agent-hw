import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * CI-тест границ библиотеки src/tensor/ (R2): дублирует oxlint
 * no-restricted-imports прямым сканированием исходников — граница держится
 * и без локального линта. Правила: (1) внутри src/tensor/ — только
 * внутренние импорты './…' (ноль импортов из приложения и react);
 * (2) вне src/tensor/ — никаких deep-импортов мимо index.ts;
 * (3) линт-гейт настроен (.oxlintrc.json: правило + override для src/tensor).
 */

const SRC_DIR = fileURLToPath(new URL('../../src', import.meta.url))
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

describe('граница src/tensor/ (R2) — сканирование исходников', () => {
  it('внутри src/tensor/ нет импортов извне библиотеки (включая react)', () => {
    const violations = importLines.filter(({ file, specifier }) => file.includes('/tensor/') && !specifier.startsWith('./'))
    expect(
      violations.map((v) => `${v.file}: ${v.specifier}`),
      'только внутренние относительные импорты ./… внутри библиотеки',
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
    const config = JSON.parse(readFileSync(OXLINTRC, 'utf8')) as {
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
  })
})
