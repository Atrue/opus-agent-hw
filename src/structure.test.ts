import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * STRUCTURE-GATE — машинный гейт бинарных структурных регрессов (D-34, план
 * 02-12). Правила — ТОЛЬКО бинарные факты, без подсчёта экспортов/порогов/
 * списков исключений: гранулометрия («файл = одна операция или одна
 * сущность; связные группы допустимы; типы и константы свободны; баррелы
 * легальны; граб-бэги запрещены») — мягкая инструкция в AGENTS.md,
 * приёмка — ревью владельца.
 *
 *   R1: export default запрещён во всём src/** (именованные экспорты, D-28б).
 *   R2: корень src/ui/ — только README.md (подпапки сущностей, 02-11).
 *   R4: src/tensor/** (не-тестовые файлы) импортирует только внутрь
 *       библиотеки — дубль границы oxlint (R2-изоляция), страховка от
 *       регресса конфига; carve-out *.test.ts зеркалит .oxlintrc.json.
 *
 * КОНТРАКТ: изменения правил этого гейта — только с явным апрувом владельца
 * (D-34; зеркалит контракт конфига линтера D-27).
 */

const SRC_DIR = fileURLToPath(new URL('./', import.meta.url))

function listTsFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      out.push(...listTsFiles(full))
    } else if (/\.tsx?$/.test(name)) {
      out.push(full)
    }
  }
  return out
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

/** Относительный импорт нарушает границу src/tensor, только если резолвится
 *  за её пределы; bare-импорт извне библиотеки — всегда нарушение
 *  (зеркало override .oxlintrc.json, D-34). */
function escapesTensor(file: string, specifier: string): boolean {
  if (!specifier.startsWith('.')) return true
  const tensorRoot = resolve(SRC_DIR, 'tensor')
  const rel = relative(tensorRoot, resolve(dirname(file), specifier))
  return rel.startsWith('..') || isAbsolute(rel)
}

const allFiles = listTsFiles(SRC_DIR)
const tensorNonTest = allFiles.filter((f) => f.includes('/tensor/') && !f.endsWith('.test.ts'))

describe('STRUCTURE-GATE: бинарные структурные регрессы (D-34)', () => {
  it('R1: во всём src/** нет export default (именованные экспорты, D-28б)', () => {
    const violations: string[] = []
    for (const file of allFiles) {
      // якорь начала строки: реальный экспорт, не упоминание в комментарии
      if (/^\s*export\s+default\b/m.test(readFileSync(file, 'utf8'))) violations.push(file)
    }
    expect(violations, 'export default запрещён — только именованные экспорты').toEqual([])
  })

  it('R2: корень src/ui/ — только README.md и подпапки сущностей (02-11)', () => {
    const uiRoot = join(SRC_DIR, 'ui')
    const strayFiles = readdirSync(uiRoot).filter(
      (name) => name !== 'README.md' && statSync(join(uiRoot, name)).isFile(),
    )
    expect(strayFiles, 'файлы в корне src/ui/ запрещены (компоненты/модели живут в подпапках сущностей)').toEqual([])
  })

  it('R4: src/tensor/** (не-тесты) импортирует только внутрь библиотеки (дубль границы oxlint)', () => {
    const violations: string[] = []
    for (const file of tensorNonTest) {
      for (const specifier of importsOf(file)) {
        if (escapesTensor(file, specifier)) violations.push(`${file}: ${specifier}`)
      }
    }
    expect(violations, 'библиотека изолирована: bare-импорты и выход за src/tensor запрещены (тесты exempt)').toEqual([])
  })
})
