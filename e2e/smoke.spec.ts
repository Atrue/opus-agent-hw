import { expect, test } from 'playwright/test'
import { mkdirSync, rmSync } from 'node:fs'
import { formatKey } from '../src/format/numbers'
import { ETALON_SAMPLE_1 } from '../tests/tensor/etalon-constants'

/**
 * Полная e2e фаз 01.1–01.2 (R3, план 01.1-03; тест 6 — 01.2-02) — 6 проверок
 * живого цикла:
 * (1) первый «Шаг»: числа движка в панели (эталон-константы сэмпла 1),
 *     индикатор «Эпоха 1 · пример 1 · шаг 2»;
 * (2) полная эпоха 1 пошагово (4 сэмпла × 13 оп): DOM без NaN/Infinity/
 *     undefined, в конце — экран завершения эпохи (L до/после, точность);
 * (3) эквивалентность: после reset «Запустить эпоху» даёт экран эпохи с теми
 *     же числами, что и пошаговый проход (сравнение текста экрана);
 * (4) «Следующая эпоха» → «Эпоха 2 · пример 1 · шаг 1», обучение продолжается;
 * (5) честный reload: индикатор на первой операции, URL несёт только сценарий;
 * (6) история звена (01.2-02): FF двух эпох → выбор W1 → link-history ≥ 9
 *     значений (2×4 сэмпла + стартовые), график лосса не пуст; выбор L —
 *     история лосса; после reset история звена и разделители сохраняются.
 *
 * Скриншот-self-check (новый baseline 28): перед записью директория
 * очищается; сохраняются скриншоты каждой операции сэмпла 1 (13) и экрана
 * завершения эпохи (1) в режимах default и .lecture. Эталон-значения —
 * импортом констант из tests/tensor/etalon-constants.ts (plain-TS, общий
 * для vitest и playwright — без чтения JSON и без vitest-зависимости).
 *
 * R5 (план 01.1-04): ВСЕ тесты идут под emulateMedia({ reducedMotion:
 * 'reduce' }) — единый рычаг детерминизма скриншотов (финальный кадр,
 * флаков ноль) и одновременно живая проверка того, что reduced-motion-путь
 * реально работает: computed animation-name активного .diag-flow === 'none'.
 * Направление потока по фазе: data-flow корня svg (forward → backward →
 * отсутствует на update-опе).
 */

// Baseline скриншотов регенерируем: pnpm e2e пересоздаёт весь набор (28)
rmSync('e2e/screenshots', { recursive: true, force: true })
mkdirSync('e2e/screenshots', { recursive: true })

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

/** Текст экрана эпохи пошагового прохода — носитель для проверки (3). */
let stepwiseEpochText: string | null = null

const etalonOutput = (op: number): number => (ETALON_SAMPLE_1[op]!.outputs as number[])[0]!

test('1) первый «Шаг» исполняет операцию движка: z1[0] = −0.9229', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('step-indicator')).toHaveText('Эпоха 1 · пример 1 · шаг 1')
  await expect(page.getByTestId('architecture-diagram'), 'до первого шага потока нет').not.toHaveAttribute('data-flow')
  await page.getByTestId('btn-next').click()
  await expect(page.getByTestId('step-indicator')).toHaveText('Эпоха 1 · пример 1 · шаг 2')
  const panel = await page.getByTestId('step-panel').textContent()
  expect(panel, 'в панели — контрольное число движка (display-минус U+2212)').toContain(formatKey(etalonOutput(0)))
  expect(panel).not.toContain('NaN')
  await expect(page.getByTestId('architecture-diagram'), 'forward-фаза — поток к выходу').toHaveAttribute(
    'data-flow',
    'forward',
  )
  const flowAnimation = await page
    .locator('.diag-edge-g.active .diag-flow')
    .first()
    .evaluate((el) => getComputedStyle(el).animationName)
  expect(flowAnimation, 'reduced-motion: бегущий пунктир погашен (animation-name === none)').toBe('none')

  // R5 (01.1-04): tier-1 тултип — hover на первое число панели: значение +
  // фрагмент формулы с подстановкой + aria-describedby; Escape закрывает;
  // клик после тултипа по-прежнему открывает полный NumberDrilldown (tier 2)
  const firstNumber = page.getByTestId('step-panel').locator('.value-btn').first()
  await firstNumber.hover()
  const hint = page.getByTestId('number-hint')
  await expect(hint).toBeVisible()
  await expect(hint).toContainText(formatKey(etalonOutput(0)))
  await expect(hint, 'формула с подстановкой из экспандеров').toContainText('W1[0,0]')
  const describedBy = await firstNumber.getAttribute('aria-describedby')
  expect(describedBy, 'a11y: якорь связан с тултипом aria-describedby').toBeTruthy()
  await page.keyboard.press('Escape')
  await expect(hint).toBeHidden()
  await firstNumber.click()
  await expect(page.getByTestId('drill-panel')).toBeVisible()
})

test('2) полная эпоха 1 пошагово: без NaN, в конце — экран завершения эпохи', async ({ page }) => {
  await page.goto('/')
  for (let i = 1; i <= 4 * 13; i++) {
    await page.getByTestId('btn-next').click()
    if (i === 8) {
      // 8-й клик исполнил op 7 (bce-grad) — старт backward: поток разворачивается
      await expect(page.getByTestId('architecture-diagram')).toHaveAttribute('data-flow', 'backward')
    }
    if (i === 13) {
      // op 12 (sgd) — update-фаза: потока нет
      await expect(page.getByTestId('architecture-diagram')).not.toHaveAttribute('data-flow')
    }
    if (i <= 13) {
      // baseline: операции сэмпла 1, default-режим (13 из 28)
      await page.screenshot({ path: `e2e/screenshots/op-${String(i).padStart(2, '0')}.png` })
    }
  }
  await expect(page.getByTestId('step-indicator')).toHaveText('Эпоха 1 · пример 4 · шаг 13')
  const body = await page.locator('body').textContent()
  expect(body, 'DOM-скан: нигде нет не-числовых артефактов вычислений').not.toMatch(/NaN|Infinity|undefined/)

  const summary = page.getByTestId('epoch-summary')
  await expect(summary).toBeVisible()
  await expect(summary).toContainText('Эпоха 1 завершена')
  await expect(summary, 'L до — эталонный bce первого сэмпла').toContainText(formatKey(etalonOutput(6)))
  await expect(summary).toContainText('Точность')
  await page.screenshot({ path: 'e2e/screenshots/epoch-end.png' }) // 14-й из default-набора
  stepwiseEpochText = await summary.textContent()
})

test('3) эквивалентность: «Запустить эпоху» даёт те же числа, что пошаговый проход', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('btn-epoch').click()
  await expect(page.getByTestId('epoch-summary')).toBeVisible()
  await expect(page.getByTestId('step-indicator')).toHaveText('Эпоха 1 · пример 4 · шаг 13')
  const ffText = await page.getByTestId('epoch-summary').textContent()
  expect(ffText, 'экран эпохи FF === экран эпохи пошагового прохода (инвариант R3)').toBe(stepwiseEpochText)
})

test('4) «Следующая эпоха» открывает эпоху 2 — обучение продолжается', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('btn-epoch').click()
  await page.getByTestId('btn-epoch-next').click()
  await expect(page.getByTestId('step-indicator')).toHaveText('Эпоха 2 · пример 1 · шаг 1')
  await page.getByTestId('btn-next').click()
  await expect(page.getByTestId('step-indicator')).toHaveText('Эпоха 2 · пример 1 · шаг 2')
})

test('5) честный reload: индикатор на первой операции, URL несёт только сценарий', async ({ page }) => {
  await page.goto('/')
  for (let i = 0; i < 5; i++) await page.getByTestId('btn-next').click()
  await page.getByTestId('toggle-lecture').click()
  await page.reload()
  await expect(page.getByTestId('step-indicator')).toHaveText('Эпоха 1 · пример 1 · шаг 1')
  expect(page.url(), 'hash несёт только сценарий; позиция и режим из URL ушли (R3)').toMatch(/#scenario=xor$/)
  await expect(page.getByTestId('toggle-lecture'), 'лекционный режим — toggle без URL, после reload — default').toHaveAttribute(
    'aria-pressed',
    'false',
  )
})

test('6) история звена: FF двух эпох → история W1 по сэмплам; reset сохраняет историю', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('btn-epoch').click() // эпоха 1 — FF
  await page.getByTestId('btn-epoch-next').click() // старт эпохи 2
  await page.getByTestId('btn-epoch').click() // эпоха 2 — FF
  await expect(page.getByTestId('epoch-summary')).toContainText('Эпоха 2 завершена')

  const points = await page.getByTestId('loss-line').getAttribute('points')
  expect(points?.trim().length ?? 0, 'график лосса не пуст').toBeGreaterThan(0)
  await expect(page.getByTestId('loss-dot'), 'точки двух завершённых эпох').toHaveCount(2)

  // история звена W1 (пункт 4 ТЗ): клик по символу формулы → панель звена →
  // раскрывающаяся история по сэмплам (свёрнута по умолчанию — details)
  await page.getByTestId('formula-sym-W1').click()
  await expect(page.getByTestId('link-panel')).toBeVisible()
  const history = page.getByTestId('link-history')
  await expect(history).toBeAttached()
  await expect(history).not.toHaveAttribute('open', '')
  await expect(history.locator('summary'), 'заголовок истории содержит символ').toContainText('W1')
  await history.locator('summary').click() // раскрыть
  expect(
    await history.locator('[data-testid="link-value"]').count(),
    '2×4 сэмпла + стартовые: ≥ 9 значений W1',
  ).toBeGreaterThanOrEqual(9)

  // выбор звена L — история лосса по сэмплам (скалярный ряд — спарклайн)
  await page.getByTestId('formula-sym-L').click()
  const lossHistory = page.getByTestId('link-history')
  if (!(await lossHistory.evaluate((el) => el.open))) await lossHistory.locator('summary').click()
  await expect(lossHistory.locator('summary')).toContainText('L')
  await expect(lossHistory.locator('[data-testid="link-sparkline"]'), 'спарклайн лосса').toBeVisible()
  expect(await lossHistory.locator('[data-testid="link-value"]').count()).toBeGreaterThanOrEqual(1)

  // reset = перезапуск прогона, не стирание сессии: разделитель прогона на
  // графике, история звена (уже W1… сейчас L) не пуста, обучение продолжается
  await page.getByTestId('formula-sym-W1').click() // выбор W1 обратно
  await page.getByTestId('btn-reset').click()
  await expect(page.getByTestId('step-indicator')).toHaveText('Эпоха 1 · пример 1 · шаг 1')
  await expect(page.getByTestId('run-dividers').locator('line'), 'разделитель прогона после сброса').toHaveCount(1)
  await expect(page.getByTestId('loss-dot'), 'точки эпох пережили сброс').toHaveCount(2)
  expect(
    await page.getByTestId('link-history').locator('[data-testid="link-value"]').count(),
    'история звена пережила сброс',
  ).toBeGreaterThanOrEqual(9)
  await page.getByTestId('formula-sym-W1').click() // повторный клик снимает выбор

  // «Примеры и результат» (пункт 3 ТЗ): вся выборка с входом и меткой
  await expect(page.getByTestId('sample-row'), '4 строки выборки').toHaveCount(4)

  // baseline: операции сэмпла 1 и экран эпохи в .lecture (14 из 28)
  await page.getByTestId('toggle-lecture').click()
  for (let i = 1; i <= 13; i++) {
    await page.getByTestId('btn-next').click()
    await page.screenshot({ path: `e2e/screenshots/op-${String(i).padStart(2, '0')}.lecture.png` })
  }
  await page.getByTestId('btn-epoch').click()
  await expect(page.getByTestId('epoch-summary')).toBeVisible()
  await page.screenshot({ path: 'e2e/screenshots/epoch-end.lecture.png' })
})
