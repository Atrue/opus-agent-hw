import { mkdirSync, readFileSync } from 'node:fs'
import { expect, test, type Page } from 'playwright/test'
import { formatKey } from '../src/format/numbers'

/**
 * E2E-смок кликабельного прототипа — ровно 5 проверок (RESEARCH §6.2):
 * (1) первый шаг, (2) полный проход + NaN-скан, (3) шаг назад (assert по
 * мок-JSON), (4) reload-restore (микропроверка DOCS-05), (5) drill-down +
 * граница графа (DOCS-02 edge case). Скриншот-self-check: каждый шаг в
 * default и .lecture (28 файлов) — материал проверки потолка ≤30 чисел и
 * лекционного литмуса (план 01-03).
 */

const SHOT_DIR = 'e2e/screenshots'
mkdirSync(SHOT_DIR, { recursive: true })

/** Мок-трейс (assert по JSON — тот же файл, что импортирует приложение). */
const trace = JSON.parse(
  readFileSync(new URL('../src/data/xor-trace.json', import.meta.url), 'utf8'),
) as { steps: { outputs: { values: number[] | number[][] } }[] }

const STEP_COUNT = trace.steps.length // 14

async function shot(page: Page, stepIndex: number, lecture: boolean): Promise<void> {
  const name = `step-${String(stepIndex + 1).padStart(2, '0')}${lecture ? '.lecture' : ''}.png`
  await page.screenshot({ path: `${SHOT_DIR}/${name}` })
}

/** Ключевые числа шага из мок-JSON в display-формате (тот же formatKey, что в UI). */
function keyNumbers(stepIndex: number): string[] {
  const step = trace.steps[stepIndex]!
  const out = step.outputs.values
  const first = Array.isArray(out[0]) ? (out as number[][])[0]![0]! : (out as number[])[0]!
  return [formatKey(first)]
}

test('1) первый шаг: клик «Шаг» → число в StepPanel + индикатор «2 / 14»', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('step-indicator')).toHaveText('Шаг 1 из 14')
  await page.getByTestId('btn-next').click()
  await expect(page.getByTestId('step-indicator')).toHaveText('Шаг 2 из 14')
  const panel = await page.getByTestId('step-panel').textContent()
  expect(panel, 'в StepPanel видно отформатированное число (не NaN/пусто)').toMatch(/−?\d/)
  expect(panel).not.toContain('NaN')
})

test('2) полный проход до сводки + скриншот-self-check 28 файлов (14 шага × 2 режима)', async ({ page }) => {
  await page.goto('/')
  await shot(page, 0, false)

  for (let i = 1; i < STEP_COUNT; i++) {
    await page.getByTestId('btn-next').click()
    await expect(page.getByTestId('step-indicator')).toHaveText(`Шаг ${i + 1} из ${STEP_COUNT}`)
    await shot(page, i, false)
  }

  // финальная сводка видима: L до -> после + ‖grad‖; «Шаг» disabled
  const panel = await page.getByTestId('step-panel').textContent()
  expect(panel).toContain('‖grad‖')
  expect(panel).toContain('->')
  await expect(page.getByTestId('btn-next')).toBeDisabled()

  // DOM-скан: нигде нет не-числовых артефактов вычислений (DOCS-01 edge case)
  const body = await page.locator('body').textContent()
  expect(body).not.toMatch(/NaN|Infinity|undefined/)

  // второй проход в лекционном режиме (литмус-материал: числа 32px)
  await page.getByTestId('btn-reset').click()
  await page.getByTestId('toggle-lecture').click()
  await expect(page.getByTestId('toggle-lecture')).toHaveAttribute('aria-pressed', 'true')
  await shot(page, 0, true)
  for (let i = 1; i < STEP_COUNT; i++) {
    await page.getByTestId('btn-next').click()
    await expect(page.getByTestId('step-indicator')).toHaveText(`Шаг ${i + 1} из ${STEP_COUNT}`)
    await shot(page, i, true)
  }
  const numSize = await page.locator('.num').first().evaluate((el) => getComputedStyle(el).fontSize)
  expect(numSize, 'лекционный режим: числа 32px').toBe('32px')
})

test('3) шаг назад: числа предыдущего шага восстановились точно (assert по мок-JSON)', async ({ page }) => {
  await page.goto('/')
  for (let i = 1; i < 6; i++) await page.getByTestId('btn-next').click() // шаг 6
  const step6 = await page.getByTestId('step-panel').textContent()

  await page.getByTestId('btn-next').click() // шаг 7 (loss)
  await expect(page.getByTestId('step-indicator')).toHaveText('Шаг 7 из 14')

  // кнопкой «Назад»
  await page.getByTestId('btn-prev').click()
  await expect(page.getByTestId('step-indicator')).toHaveText('Шаг 6 из 14')
  const step6back = await page.getByTestId('step-panel').textContent()
  expect(step6back, 'после «Назад» числа шага 6 восстановились байт-в-байт').toBe(step6)
  for (const num of keyNumbers(5)) expect(step6back).toContain(num)

  // стрелкой ← (шаг 7 → шаг 6)
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('step-indicator')).toHaveText('Шаг 7 из 14')
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByTestId('step-indicator')).toHaveText('Шаг 6 из 14')
  expect(await page.getByTestId('step-panel').textContent()).toBe(step6)
})

test('4) reload-restore: перезагрузка по той же ссылке восстанавливает шаг (DOCS-05)', async ({ page }) => {
  await page.goto('/')
  for (let i = 1; i < 8; i++) await page.getByTestId('btn-next').click() // шаг 8 (backward)
  await page.getByTestId('toggle-lecture').click()
  const beforeIndicator = await page.getByTestId('step-indicator').textContent()
  const beforePanel = await page.getByTestId('step-panel').textContent()
  const beforeUrl = page.url()

  await page.reload()

  await expect(page.getByTestId('step-indicator')).toHaveText(beforeIndicator ?? '')
  expect(await page.getByTestId('step-panel').textContent()).toBe(beforePanel)
  expect(page.url(), 'hash-состояние #step=N&mode=lecture пережило reload').toBe(beforeUrl)
  expect(page.url()).toMatch(/#step=7&mode=lecture$/)
})

test('5) drill-down на backward-шаге + терминальная панель границы графа (шаг 12, ∂L/∂x)', async ({ page }) => {
  await page.goto('/')
  // шаг 10 (index 9): matvec-grad, ∂L/∂W2
  for (let i = 1; i < 10; i++) await page.getByTestId('btn-next').click()
  await page.locator('button[data-ref="∂L/∂W2[0]"]').click()

  await expect(page.getByTestId('drill-panel')).toBeVisible()
  const exact = await page.getByTestId('drill-exact').textContent()
  expect(exact, 'exact-repr — полное значение из JSON без округления').toContain('0.3905376917097937')
  const formula = await page.getByTestId('drill-formula').textContent()
  expect(formula, 'формула шага в панели').toContain('W2')
  const provenance = await page.getByTestId('drill-provenance').textContent()
  expect(provenance, 'provenance из данных').toContain('шаг')
  await expect(page.getByTestId('drill-chain'), 'раскрытие цепного правила на 1 уровень').toBeVisible()

  // закрытие: Esc
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('drill-panel')).toHaveCount(0)

  // шаг 12 (index 11): drill по ∂L/∂x — терминальная панель, не пустой экран
  for (let i = 0; i < 2; i++) await page.getByTestId('btn-next').click()
  await expect(page.getByTestId('step-indicator')).toHaveText('Шаг 12 из 14')
  await page.locator('button[data-ref="∂L/∂x[0]"]').click()

  const terminal = page.getByTestId('drill-terminal')
  await expect(terminal).toBeVisible()
  const termText = await terminal.textContent()
  expect(termText, 'заголовок границы графа').toContain('входные данные')
  expect(termText, 'тело панели — старт цепного правила (Copywriting Contract)').toContain('старт цепного правила')
  expect(termText, 'точное значение ∂L/∂x тоже показано').toContain('−0.16924')
})
