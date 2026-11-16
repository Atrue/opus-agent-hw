import { expect, test } from 'playwright/test'
import { mkdirSync, rmSync } from 'node:fs'
import { formatKey } from '../src/format'
import { ETALON_NEURON_SAMPLE_1, ETALON_SAMPLE_1 } from '../src/run/etalon-constants'

/**
 * Полная e2e фаз 01.1–01.2 + 02 на сценарии «один нейрон» (D-31 — дефолтный
 * носитель MVP R1, план 02-05) — 16 проверок живого цикла:
 * (1) первый «Шаг»: числа движка в панели, пин эталон-константы
 *     ETALON_NEURON_SAMPLE_1 (сэмпл 1 AND [1,1]→1, z = 0.8·1 + 0.8·1 = 1.6;
 *     план 02-09), индикатор «Эпоха 1 · пример 1 · шаг 2»;
 * (2) полная эпоха 1 пошагово (4 сэмпла × 8 оп): DOM без NaN/Infinity/
 *     undefined, backward-поток с 5-го клика (op 4 = bce-grad), в конце —
 *     экран завершения эпохи (L до/после, точность);
 * (3) эквивалентность: после reset «Запустить эпоху» даёт экран эпохи с теми
 *     же числами, что и пошаговый проход (сравнение текста экрана);
 * (4) «Следующая эпоха» → «Эпоха 2 · пример 1 · шаг 1», обучение продолжается;
 * (5) честный reload: дефолт neuron, URL несёт только #scenario=neuron;
 * (6) #scenario=xor всё ещё загружает XOR: первый шаг по эталон-константам
 *     (XOR-эталон — регрессия движка, OQ5);
 * (7–9) UX-02 клавиатура: → / Space / PgDn исполняют шаг вперёд — каждая
 *     клавиша отдельной проверкой с числом шага до/после;
 * (10) UX-02 «назад» отсутствует by design (ревью R3): ← / Backspace / PgUp
 *     не меняют позицию — каждая клавиша отдельной проверкой;
 * (11) формула-хребет: все 5 звеньев цепи x→z→ŷ→L→W выбираются кликом по
 *     символу формулы (data-selection + панель звена); повторный клик снимает;
 * (12) история звена W (D-26): FF двух эпох → символ η → 3 ряда (W[0,0],
 *     W[0,1], b[0]) × (2×4 сэмпла + стартовые) = 27 значений; выбор L —
 *     история лосса; после reset история звена и разделители сохраняются;
 * (13) граф: σ-символ подсвечивает группу звена ŷ (.diag-selected); клик по
 *     биас-узлу b[0] → drill; после bce все станции несут числа; звено L
 *     выбирается символом формулы и подсвечивает ŷ (D-32: loss-узла на графе
 *     нет — геометрия звена L переопределена на ŷ);
 * (14) граф: градиенты ∂L/∂· под звеньями после backward, hover рёбер —
 *     fwd/bwd-тултип, 8-й шаг sgd — update-станция активна, веса обновились;
 * (15) samples-panel: колонки-переменные, 4 AND-примера, текущий помечен;
 *     FF → 4 вердикта ✓/✗; reset → карточка сброшена, история жива;
 * (16) result-zone: все входы AND-сэмпла + метка y, ŷ/L после 4 операций,
 *     LR = η = 0.5; LOSS/LR ушли из футера (пункт 8 UAT).
 *
 * Скриншот-self-check (baseline 18): перед записью директория очищается;
 * сохраняются скриншоты каждой операции сэмпла 1 (8) и экрана завершения
 * эпохи (1) в режимах default и .lecture — (8 + 1) × 2 = 18. Эталон-значения
 * XOR — импортом констант из src/run/etalon-constants.ts (plain-TS, общий
 * для vitest и playwright — без чтения JSON и без vitest-зависимости).
 *
 * R5 (план 01.1-04): ВСЕ тесты идут под emulateMedia({ reducedMotion:
 * 'reduce' }) — единый рычаг детерминизма скриншотов (финальный кадр,
 * флаков ноль) и одновременно живая проверка того, что reduced-motion-путь
 * реально работает: computed animation-name активного .diag-flow === 'none'.
 * Направление потока по фазе: data-flow корня svg (forward → backward →
 * отсутствует на update-опе). Двойной прогон бит-идентичен (DPR2 — 01.1-04).
 */

/** Параметры носителя neuron (спека: 8 оп/сэмпл, 4 AND-примера в эпохе). */
const OPS = 8
const SAMPLES = 4

// Baseline скриншотов регенерируем: pnpm e2e пересоздаёт весь набор (18)
rmSync('e2e/screenshots', { recursive: true, force: true })
mkdirSync('e2e/screenshots', { recursive: true })

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

/** Текст экрана эпохи пошагового прохода — носитель для проверки (3). */
let stepwiseEpochText: string | null = null

const etalonOutput = (op: number): number => (ETALON_SAMPLE_1[op]!.outputs as number[])[0]!

/** Пиновое число neuron-сэмпла 1 (межраннеровый мостик: константы ← playwright). */
const neuronOut = (op: number): number => (ETALON_NEURON_SAMPLE_1[op]!.outputs as number[])[0]!

/** Экранирование литерала для RegExp-пина панели. */
const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

test('1) первый «Шаг» исполняет matvec движка: z = 1.6', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('step-indicator')).toHaveText('Эпоха 1 · пример 1 · шаг 1')
  await expect(page.getByTestId('architecture-diagram'), 'до первого шага потока нет').not.toHaveAttribute('data-flow')
  await page.getByTestId('btn-next').click()
  await expect(page.getByTestId('step-indicator')).toHaveText('Эпоха 1 · пример 1 · шаг 2')
  const panel = await page.getByTestId('step-panel').textContent()
  // пин эталон-константы (02-09): z сэмпла 1 = 0.8·1 + 0.8·1 = 1.6
  expect(panel, 'matvec первого шага: пин ETALON_NEURON_SAMPLE_1').toMatch(
    new RegExp(`z\\s*=\\s*${esc(formatKey(neuronOut(0)))}`),
  )
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
  await expect(hint).toContainText('1.6')
  await expect(hint, 'формула с подстановкой из экспандеров (символы нейрона)').toContainText('W[0,0]')
  const describedBy = await firstNumber.getAttribute('aria-describedby')
  expect(describedBy, 'a11y: якорь связан с тултипом aria-describedby').toBeTruthy()
  await page.keyboard.press('Escape')
  await expect(hint).toBeHidden()
  await firstNumber.click()
  await expect(page.getByTestId('drill-panel')).toBeVisible()
})

test('2) полная эпоха 1 пошагово (4 × 8 оп): без NaN, в конце — экран завершения эпохи', async ({ page }) => {
  await page.goto('/')
  for (let i = 1; i <= SAMPLES * OPS; i++) {
    await page.getByTestId('btn-next').click()
    if (i === 5) {
      // 5-й клик исполнил op 4 (bce-grad) — старт backward: поток разворачивается
      await expect(page.getByTestId('architecture-diagram')).toHaveAttribute('data-flow', 'backward')
    }
    if (i === 8) {
      // op 7 (sgd) — update-фаза: потока нет
      await expect(page.getByTestId('architecture-diagram')).not.toHaveAttribute('data-flow')
    }
    if (i <= OPS) {
      // baseline: операции сэмпла 1, default-режим (8 из 18)
      await page.screenshot({ path: `e2e/screenshots/op-${String(i).padStart(2, '0')}.png` })
    }
  }
  await expect(page.getByTestId('step-indicator')).toHaveText('Эпоха 1 · пример 4 · шаг 8')
  const body = await page.locator('body').textContent()
  expect(body, 'DOM-скан: нигде нет не-числовых артефактов вычислений').not.toMatch(/NaN|Infinity|undefined/)

  const summary = page.getByTestId('epoch-summary')
  await expect(summary).toBeVisible()
  await expect(summary).toContainText('Эпоха 1 завершена')
  await expect(summary).toContainText('Точность')
  await expect(summary.getByTestId('epoch-loss-before'), 'L до — число движка').toHaveText(/L в начале эпохи = [-−\d.]+/)
  await expect(summary.getByTestId('epoch-loss-after'), 'L после — число движка').toHaveText(/L в конце эпохи = [-−\d.]+/)
  await expect(summary.getByTestId('epoch-accuracy'), 'точность: N из 4 примеров верно').toContainText('из 4 верно')
  // 9-й из default-набора
  await page.screenshot({ path: 'e2e/screenshots/epoch-end.png' })
  stepwiseEpochText = await summary.textContent()
})

test('3) эквивалентность: «Запустить эпоху» даёт те же числа, что пошаговый проход', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('btn-epoch').click()
  await expect(page.getByTestId('epoch-summary')).toBeVisible()
  await expect(page.getByTestId('step-indicator')).toHaveText('Эпоха 1 · пример 4 · шаг 8')
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
  expect(page.url(), 'hash несёт только сценарий; позиция и режим из URL ушли (R3)').toMatch(/#scenario=neuron$/)
  await expect(page.getByTestId('toggle-lecture'), 'лекционный режим — toggle без URL, после reload — default').toHaveAttribute(
    'aria-pressed',
    'false',
  )
})

test('6) #scenario=xor всё ещё загружает XOR: первый шаг по эталону', async ({ page }) => {
  await page.goto('/#scenario=xor')
  await expect(page.locator('h1'), 'XOR остаётся выбираемым до фазы 3 (OQ4)').toHaveText('XOR: backprop по шагам')
  await expect(page.getByTestId('step-indicator')).toHaveText('Эпоха 1 · пример 1 · шаг 1')
  await page.getByTestId('btn-next').click()
  const panel = await page.getByTestId('step-panel').textContent()
  expect(panel, 'эталонное число XOR-движка (display-минус U+2212) — регрессия не тронута').toContain(formatKey(etalonOutput(0)))
})

test('7) UX-02: ArrowRight исполняет шаг вперёд (шаг 1 → 2)', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('step-indicator')).toHaveText('Эпоха 1 · пример 1 · шаг 1')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('step-indicator'), 'клавиша → исполняет операцию движка').toHaveText(
    'Эпоха 1 · пример 1 · шаг 2',
  )
})

test('8) UX-02: Space исполняет шаг вперёд (шаг 1 → 2)', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('step-indicator')).toHaveText('Эпоха 1 · пример 1 · шаг 1')
  await page.keyboard.press('Space')
  await expect(page.getByTestId('step-indicator'), 'Space (фокус на body) исполняет операцию движка').toHaveText(
    'Эпоха 1 · пример 1 · шаг 2',
  )
})

test('9) UX-02: PageDown исполняет шаг вперёд (шаг 1 → 2)', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('step-indicator')).toHaveText('Эпоха 1 · пример 1 · шаг 1')
  await page.keyboard.press('PageDown')
  await expect(page.getByTestId('step-indicator'), 'PgDn исполняет операцию движка').toHaveText('Эпоха 1 · пример 1 · шаг 2')
})

test('10) UX-02 «назад» отсутствует: ← / Backspace / PgUp инертны', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('step-indicator')).toHaveText('Эпоха 1 · пример 1 · шаг 1')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('step-indicator')).toHaveText('Эпоха 1 · пример 1 · шаг 2')
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByTestId('step-indicator'), 'ArrowLeft не двигает прогон назад (forward-only, ревью R3)').toHaveText(
    'Эпоха 1 · пример 1 · шаг 2',
  )
  await page.keyboard.press('Backspace')
  await expect(page.getByTestId('step-indicator'), 'Backspace инертна').toHaveText('Эпоха 1 · пример 1 · шаг 2')
  await page.keyboard.press('PageUp')
  await expect(page.getByTestId('step-indicator'), 'PgUp инертна так же, как ←/Backspace').toHaveText(
    'Эпоха 1 · пример 1 · шаг 2',
  )
})

test('11) 5 звеньев цепи x→z→ŷ→L→W: выбор по символам формулы, повторный клик снимает', async ({ page }) => {
  await page.goto('/')
  const svg = page.getByTestId('architecture-diagram')
  await expect(svg, 'до выбора атрибута data-selection нет').not.toHaveAttribute('data-selection')

  // каждый символ формулы выбирает своё звено (D-26: звено = сегмент цепи)
  const cases: readonly (readonly [string, string])[] = [
    ['x', 'x'],
    ['W', 'z'],
    ['sigma', 'yhat'],
    ['L', 'L'],
    ['eta', 'W'],
  ]
  for (const [sym, segment] of cases) {
    await page.getByTestId(`formula-sym-${sym}`).click()
    await expect(svg, `символ ${sym} выбирает звено ${segment}`).toHaveAttribute('data-selection', segment)
    await expect(page.getByTestId('link-panel')).toBeVisible()
    if (sym === 'W') {
      await expect(page.getByTestId('link-formula'), 'формула звена z — склейка matvec+add спека').toContainText('z = W·x + b')
    }
  }

  // повторный клик по выбранному символу снимает выбор (D-26)
  const eta = page.getByTestId('formula-sym-eta')
  await expect(eta, 'выбранный символ — aria-pressed').toHaveAttribute('aria-pressed', 'true')
  await eta.click()
  await expect(page.getByTestId('link-panel'), 'панель звена скрыта').toBeHidden()
  await expect(eta, 'aria-pressed снят').toHaveAttribute('aria-pressed', 'false')
  await expect(svg, 'выбор снят — атрибут удалён').not.toHaveAttribute('data-selection')
})

test('12) история звена W (3 веса × сэмплы): FF двух эпох; reset сохраняет историю', async ({ page }) => {
  await page.goto('/')
  // эпоха 1 — FF
  await page.getByTestId('btn-epoch').click()
  // старт эпохи 2
  await page.getByTestId('btn-epoch-next').click()
  // эпоха 2 — FF
  await page.getByTestId('btn-epoch').click()
  await expect(page.getByTestId('epoch-summary')).toContainText('Эпоха 2 завершена')

  const points = await page.getByTestId('loss-line').getAttribute('points')
  expect(points?.trim().length ?? 0, 'график лосса не пуст').toBeGreaterThan(0)
  await expect(page.getByTestId('loss-dot'), 'точки двух завершённых эпох').toHaveCount(2)

  // звено W через символ η (пункт 4 ТЗ): история обновления = все 3 веса
  await page.getByTestId('formula-sym-eta').click()
  await expect(page.getByTestId('link-panel')).toBeVisible()
  const history = page.getByTestId('link-history')
  await expect(history).toBeAttached()
  await expect(history).not.toHaveAttribute('open', '')
  await expect(history.locator('summary'), 'заголовок истории содержит символ').toContainText('η')
  await expect(history.locator('summary'), '3 ряда — три веса нейрона (W₁, W₂, b)').toContainText('3 рядов')
  // раскрыть
  await history.locator('summary').click()
  expect(
    await history.locator('[data-testid="link-value"]').count(),
    '3 ряда × (2×4 сэмпла + стартовые) = 27 значений',
  ).toBe(27)

  // выбор звена L — история лосса по сэмплам (скалярный ряд — спарклайн)
  await page.getByTestId('formula-sym-L').click()
  const lossHistory = page.getByTestId('link-history')
  if (!(await lossHistory.evaluate((el) => el.open))) await lossHistory.locator('summary').click()
  await expect(lossHistory.locator('summary')).toContainText('L')
  await expect(lossHistory.locator('[data-testid="link-sparkline"]'), 'спарклайн лосса').toBeVisible()
  expect(await lossHistory.locator('[data-testid="link-value"]').count()).toBeGreaterThanOrEqual(1)

  // reset = перезапуск прогона, не стирание сессии: разделитель прогона на
  // графике, история звена не пуста, обучение продолжается; выбор η обратно
  await page.getByTestId('formula-sym-eta').click()
  await page.getByTestId('btn-reset').click()
  await expect(page.getByTestId('step-indicator')).toHaveText('Эпоха 1 · пример 1 · шаг 1')
  await expect(page.getByTestId('run-dividers').locator('line'), 'разделитель прогона после сброса').toHaveCount(1)
  await expect(page.getByTestId('loss-dot'), 'точки эпох пережили сброс').toHaveCount(2)
  expect(
    await page.getByTestId('link-history').locator('[data-testid="link-value"]').count(),
    'история звена пережила сброс (+ стартовая точка нового прогона: 3 × 10)',
  ).toBe(30)
  // повторный клик снимает выбор
  await page.getByTestId('formula-sym-eta').click()

  // «Примеры и результат» (пункт 3 ТЗ): вся AND-выборка
  await expect(page.getByTestId('sample-row'), '4 строки выборки AND').toHaveCount(4)

  // baseline: операции сэмпла 1 и экран эпохи в .lecture (9 из 18)
  await page.getByTestId('toggle-lecture').click()
  for (let i = 1; i <= OPS; i++) {
    await page.getByTestId('btn-next').click()
    await page.screenshot({ path: `e2e/screenshots/op-${String(i).padStart(2, '0')}.lecture.png` })
  }
  await page.getByTestId('btn-epoch').click()
  await expect(page.getByTestId('epoch-summary')).toBeVisible()
  await page.screenshot({ path: 'e2e/screenshots/epoch-end.lecture.png' })
})

test('13) граф: σ выбирает группу звена ŷ; клик по биасу b[0] → drill; станции с числами', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('formula-sym-sigma').click()
  await expect(page.getByTestId('architecture-diagram'), 'σ выбирает звено ŷ').toHaveAttribute('data-selection', 'yhat')
  expect(
    await page.locator('.diag-selected').count(),
    'группа звена ŷ: σ-операция + значение ŷ + ребро — ≥ 3',
  ).toBeGreaterThanOrEqual(3)
  await expect(page.locator('g.g-op.diag-selected'), 'операция σ несёт .diag-selected').toHaveCount(1)

  // клик по узлу параметра b[0] на графе — полный drill числа (tier 2);
  // drill-слот живёт в панели операции: до первого шага записи нет (by design),
  // поэтому один «Шаг» — и разбор числа доступен
  await page.getByTestId('btn-next').click()
  await page.getByRole('button', { name: /^Биас b\[0\]/ }).click()
  await expect(page.getByTestId('drill-panel')).toBeVisible()

  // 4 клика = операции 0–3 (matvec…bce): все значения/параметры/операции
  // несут числа, ни одного «н/д»; звено L — символом формулы (loss-узла на
  // графе нет — D-32): выбор подсвечивает ŷ (переопределённая геометрия)
  for (let i = 0; i < 3; i++) await page.getByTestId('btn-next').click()
  const stations = page.getByTestId('station-value')
  await expect(stations, 'звенья графа со значениями (x×2, W×2, b, z, ŷ + оп ×3)').toHaveCount(10)
  await expect(stations.filter({ hasText: 'н/д' }), 'после bce все звенья несут числа').toHaveCount(0)
  await expect(page.getByTestId('update-station'), 'update-узла на графе нет (2.1-01, расширение D-32)').toHaveCount(0)
  await page.getByTestId('formula-sym-L').click()
  await expect(page.getByTestId('architecture-diagram'), 'символ L выбирает звено L').toHaveAttribute('data-selection', 'L')
  await expect(page.locator('g[data-node="ŷ"]'), 'звено L подсвечивает ŷ (D-32: лосс вне графа)').toHaveClass(/diag-selected/)
  await expect(page.getByTestId('link-panel'), 'панель звена L жива (лосс — в числах панели)').toBeVisible()
  await page.getByTestId('formula-sym-L').click()
})

test('14) граф: градиенты под звеньями, hover рёбер fwd/bwd, sgd-шаг обновляет веса (update-узла нет)', async ({ page }) => {
  await page.goto('/')

  // 7 кликов = операции 0–6 (backward завершён, до sgd): под звеньями
  // появляются градиенты ∂L/∂· (параметры, промежуточные значения)
  for (let i = 0; i < 7; i++) await page.getByTestId('btn-next').click()
  const grads = page.getByTestId('node-grad')
  expect(
    await grads.count(),
    'градиенты под звеньями после backward (x×2, W×2, b, z-цепь, ŷ + оп ×3)',
  ).toBe(10)
  await expect(grads.filter({ hasText: '∂ =' }).first()).toBeVisible()

  // hover ребра → тултип с двумя значениями: forward (значение источника)
  // и backward (градиент источника ∂L/∂·)
  await page.locator('.diag-edge-g .diag-hit').first().hover()
  const tipOpacity = await page.locator('.g-tip').first().evaluate((el) => getComputedStyle(el).opacity)
  expect(tipOpacity, 'тултип ребра видим при hover (opacity → 1)').toBe('1')
  const tipText = (await page.locator('.g-tip').first().textContent()) ?? ''
  expect(tipText, 'тултип несёт forward-значение источника').toMatch(/=\s*[-−+]?[\d.]/)
  expect(tipText, 'тултип несёт backward-значение (∂L/∂ источника)').toContain('∂L/∂')

  // 8-й шаг — sgd: update-узла на графе нет (2.1-01), параметры подсвечены
  // амбером и обновились живым прогоном (W[0])
  const w0Value = page.locator('g[data-node="W[0]"] [data-testid="station-value"]')
  const before = ((await w0Value.textContent()) ?? '').trim()
  await page.getByTestId('btn-next').click()
  await expect(page.getByTestId('update-station'), 'update-узла на графе нет (2.1-01)').toHaveCount(0)
  await expect(page.locator('g[data-node="W[0]"]'), 'параметр W[0] подсвечен амбером на sgd-шаге').toHaveClass(/active/)
  const after = ((await w0Value.textContent()) ?? '').trim()
  expect(after, 'вес W[0] обновился на шаге sgd').not.toBe(before)
})

test('15) samples-panel: колонки-переменные; текущий помечен; FF → 4 вердикта; reset сохраняет историю', async ({ page }) => {
  await page.goto('/')
  const panel = page.getByTestId('samples-panel')
  await expect(panel).toBeVisible()
  // таблица-датасет: колонки = названия переменных (01.2-07, пункт 8 цикла 2)
  await expect(panel.locator('thead th'), 'колонки = переменные x1 | x2 | y | ŷ | ✓').toHaveText(['x1', 'x2', 'y', 'ŷ', '✓'])
  await expect(panel.getByTestId('sample-row'), '4 примера AND-выборки').toHaveCount(4)
  await expect(panel.locator('.sample-row-current'), 'текущий пример помечен (до прохода — первый)').toHaveCount(1)
  await expect(panel.locator('[data-index="0"]')).toHaveClass(/sample-row-current/)
  await expect(panel.locator('.sample-verdict-ok, .sample-verdict-miss'), 'вердиктов до прохода нет').toHaveCount(0)

  // эпоха 1 — FF
  await page.getByTestId('btn-epoch').click()
  await expect(page.getByTestId('epoch-summary')).toContainText('Эпоха 1 завершена')
  await expect(
    panel.locator('.sample-verdict-ok, .sample-verdict-miss'),
    'после FF все 4 примера с вердиктами ✓/✗',
  ).toHaveCount(4)

  // reset = перезапуск прогона: samples-panel сброшен к текущему=1, но
  // история сессии (link-history, разделители прогонов) жива до reload
  await page.getByTestId('btn-reset').click()
  await expect(page.getByTestId('step-indicator')).toHaveText('Эпоха 1 · пример 1 · шаг 1')
  await expect(panel.locator('.sample-row-current'), 'после reset текущий — снова первый').toHaveCount(1)
  await expect(panel.locator('[data-index="0"]')).toHaveClass(/sample-row-current/)
  await expect(panel.locator('.sample-verdict-ok, .sample-verdict-miss'), 'вердикты новой эпохи пусты').toHaveCount(0)
  await expect(page.getByTestId('run-dividers').locator('line'), 'разделитель прогона на графике жив').toHaveCount(1)

  await page.getByTestId('formula-sym-eta').click()
  const history = page.getByTestId('link-history')
  if (!(await history.evaluate((el) => el.open))) await history.locator('summary').click()
  expect(
    await history.locator('[data-testid="link-value"]').count(),
    'история звена пережила reset (4 сэмпла + стартовые)',
  ).toBeGreaterThanOrEqual(5)
  // снимаем выбор
  await page.getByTestId('formula-sym-eta').click()
})

test('16) result-zone: входы AND-сэмпла + ŷ/L/LR; футер без LOSS/LR', async ({ page }) => {
  await page.goto('/')
  const zone = page.getByTestId('result-zone')
  await expect(zone).toBeVisible()

  // все входы текущего примера (сэмпл 1 AND: x₁ = 1, x₂ = 1) + метка y = 1 —
  // сабскрипты рендерятся x<sub>1</sub>, textContent несёт «x1 = 1»
  await expect(zone).toContainText(/x1\s*=\s*1/)
  await expect(zone).toContainText(/x2\s*=\s*1/)
  await expect(zone).toContainText(/y\s*=\s*1/)
  // ŷ/L до вычисления — «н/д» (DESIGN §6); LR = η сценария уже на месте;
  // LOSS-дубля нет — единственный лосс-показатель это L (01.2-07, пункт 9)
  await expect(zone).toContainText('н/д')
  await expect(zone).toContainText('LR')
  await expect(zone).toContainText('0.5')
  await expect(zone).not.toContainText('LOSS')

  // 4 клика = операции 0–3 (matvec…bce): ŷ и L вычислены — пины эталон-констант
  // (ŷ = σ(0.8), L = −ln(ŷ) — формат .4g как в UI)
  for (let i = 0; i < 4; i++) await page.getByTestId('btn-next').click()
  await expect(zone, 'ŷ = σ(0.8) — пин ETALON_NEURON_SAMPLE_1').toContainText(formatKey(neuronOut(2)))
  await expect(zone, 'L = −ln(ŷ) — пин ETALON_NEURON_SAMPLE_1').toContainText(formatKey(neuronOut(3)))

  // футер (пункт 8 UAT): LOSS/LR-метрик нет; слева — индикатор позиции
  const footer = page.locator('footer')
  await expect(footer).not.toContainText('LOSS')
  await expect(footer).not.toContainText('LR')
  await expect(page.locator('footer > *').first()).toHaveAttribute('data-testid', 'step-indicator')
  await expect(page.getByTestId('step-indicator')).toHaveText('Эпоха 1 · пример 1 · шаг 5')
})
