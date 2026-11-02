/**
 * Локальное объявление типов для d3-format 3.1.2 (пакет не поставляет свои types).
 * Используется только format(specifier) — обёртка и полный формат-слой приходят
 * в плане 01-02 (src/format/numbers.ts). Отдельный @types/d3-format не ставился,
 * чтобы не выходить за утверждённый на checkpoint 01-01 список пакетов.
 */
declare module 'd3-format' {
  export function format(specifier: string): (value: number) => string
}
