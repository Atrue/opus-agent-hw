import { expect, test } from 'playwright/test'

/**
 * E2E на ЖИВОМ движке (R1/R3, план 01.1-01): ровно 3 проверки —
 * (1) первый «Шаг» исполняет операцию движка (z1[0] = −0.9229 — контрольное
 *     значение сэмпла 1, display-минус U+2212), индикатор «Эпоха 1 · пример 1 · шаг 2»;
 * (2) проход сэмпла 1 вперёд (13 нажатий) без NaN/undefined в DOM;
 * (3) reload = честный сброс: индикатор снова «шаг 1», URL несёт только сценарий.
 */

test('1) первый «Шаг» исполняет операцию движка: z1[0] = −0.9229', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('step-indicator')).toHaveText('Эпоха 1 · пример 1 · шаг 1')
  await page.getByTestId('btn-next').click()
  await expect(page.getByTestId('step-indicator')).toHaveText('Эпоха 1 · пример 1 · шаг 2')
  const panel = await page.getByTestId('step-panel').textContent()
  expect(panel, 'в панели — контрольное число движка (display-минус U+2212)').toContain('−0.9229')
  expect(panel).not.toContain('NaN')
})

test('2) проход сэмпла 1 вперёд (13 нажатий) без NaN/undefined', async ({ page }) => {
  await page.goto('/')
  for (let i = 0; i < 13; i++) {
    await page.getByTestId('btn-next').click()
  }
  await expect(page.getByTestId('step-indicator')).toHaveText('Эпоха 1 · пример 2 · шаг 1')
  const body = await page.locator('body').textContent()
  expect(body, 'DOM-скан: нигде нет не-числовых артефактов вычислений').not.toMatch(/NaN|Infinity|undefined/)
})

test('3) reload = честный сброс: индикатор «шаг 1», URL несёт только сценарий', async ({ page }) => {
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
