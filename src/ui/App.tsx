import { run, useRunSlice } from '../run/runState'
import { XOR_SCENARIO } from '../run/scenario'
import { parseHash, toHash } from '../run/url'
import type { Phase } from '../tensor'
import ArchitectureDiagram from './ArchitectureDiagram'
import EpochSummary from './EpochSummary'
import ExamplesPanel from './ExamplesPanel'
import FormulaStrip from './FormulaStrip'
import LinkPanel from './LinkPanel'
import LossChart from './LossChart'
import NumberDrilldown from './NumberDrilldown'
import OperationPanel from './OperationPanel'
import ResultPanel from './ResultPanel'
import StepControls from './StepControls'
import StepperBand from './StepperBand'

/**
 * Воркбенч walkthrough (01.2-01 «формула-хребет»): шапка-транспорт →
 * формула-строка на всю ширину (+панель звена при выборе) → горизонтальная
 * лента шагов (одна строка с автоскроллом к активной пилюле) → main — сетка
 * xl: сцена 8 (DAG + история полосой: график лосса | карточка «Примеры») |
 * правая колонка 4 («Результат» текущего примера + панель операции);
 * md — 2 колонки, mobile — одна. Статус-бар 48px: слева индикатор позиции,
 * справа hotkeys (LOSS/LR ушли в «Результат», пункт 8 UAT).
 *
 * Транспорт в шапке: primary «Шаг» всегда в зоне досягаемости (удобство,
 * redesign); панель операции — уровень иерархии DOCS-02; на границе эпохи
 * слот занимает экран завершения эпохи, при drill — NumberDrilldown.
 * Слоты фиксированы (проекторная стабильность); лекционный режим — класс
 * .lecture на корне (CSS-переменные).
 *
 * URL (R3): hash инициализируется до первого рендера и несёт только сценарий;
 * невалидное значение клампится к дефолту через history.replaceState.
 */

const PHASE_LABEL: Record<Phase, string> = {
  forward: 'forward',
  loss: 'loss',
  backward: 'backward',
  update: 'update',
}

const PHASE_COLOR_VAR: Record<Phase, string> = {
  forward: '--color-phase-fwd',
  loss: '--color-phase-loss',
  backward: '--color-phase-bwd',
  update: '--color-phase-upd',
}

// URL-state (R3): hash читается при старте — модуль исполняется раньше
// createRoot; невалидный hash нормализуется к дефолтному сценарию.
const initialScenario = parseHash(window.location.hash).scenario
if (window.location.hash !== toHash(initialScenario)) {
  window.history.replaceState(null, '', toHash(initialScenario))
}

export default function App() {
  const epoch = useRunSlice((r) => r.epoch)
  const sampleNumber = useRunSlice((r) => r.sampleIndex + 1)
  const stepNumber = useRunSlice((r) => r.stepInSample)
  const mode = useRunSlice((r) => r.mode)
  const screen = useRunSlice((r) => r.screen)
  const record = useRunSlice((r) => r.currentRecord)
  const drill = useRunSlice((r) => r.drill)
  const phase = record?.phase ?? XOR_SCENARIO.opMeta[0]!.phase
  const phaseVar = PHASE_COLOR_VAR[phase]

  return (
    <div className={`flex min-h-screen flex-col bg-background font-sans text-on-surface xl:h-screen${mode === 'lecture' ? ' lecture' : ''}`}>
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-outline-variant px-4 py-2 xl:h-14">
        <h1 className="app-heading mr-auto min-w-0 shrink truncate">XOR: backprop по шагам</h1>
        <span
          data-testid="phase-badge"
          className="phase-badge ui-label"
          style={{ background: `color-mix(in srgb, var(${phaseVar}) 14%, var(--color-surface-container-low))` }}
        >
          <span className="phase-dot" style={{ background: `var(${phaseVar})` }} />
          {PHASE_LABEL[phase]}
        </span>
        <StepControls />
        <button
          type="button"
          data-testid="toggle-lecture"
          className="btn ui-label whitespace-nowrap"
          aria-pressed={mode === 'lecture'}
          onClick={() => run.toggleMode()}
        >
          Лекционный режим
        </button>
      </header>

      {/* Формула-хребет (01.2-01): полная формула сети — навигационное ядро;
          клик по символу выбирает звено (подсветка на диаграмме в 01.2-02+
          панель звена под строкой) */}
      <FormulaStrip />
      <LinkPanel />

      {/* Лента шагов — одна горизонтальная строка над сценой (testid step-band
          сохранён — e2e-контракт); автоскролл к активной пилюле */}
      <nav aria-label="Лента шагов сэмпла" className="step-nav">
        <StepperBand />
      </nav>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-12">
        {/* Сцена (xl — 8 колонок): DAG 2-3-1 крупно — живые рёбра-веса,
            активная op, клик → drill; ниже — история полосой (UX-05/UX-06).
            Мобильный порядок: сцена первой — лента не закапывает диаграмму */}
        <div className="flex min-h-0 flex-col gap-4 max-xl:order-first md:col-span-1 xl:col-span-8 xl:order-none">
          <section aria-label="Слот диаграммы сети" data-testid="diagram-slot" className="card min-h-[320px] flex-1">
            <div className="card-head">
              <span className="icon" aria-hidden="true">
                hub
              </span>
              <h2 className="card-title">Сеть 2-3-1</h2>
              <span className="card-meta ui-label">живые веса</span>
            </div>
            <div className="screen min-h-0 flex-1">
              <ArchitectureDiagram record={record} />
            </div>
          </section>
          {/* История обучения (01.2-02; 01.2-05, пункт 3 UAT): полоса из двух
              карточек — график лосса на оси сэмплов сессии | «Примеры»
              (вся выборка XOR с вердиктами); таблица весов уступила место
              истории звена в панели (LinkHistory); прогоны разделены */}
          <div
            aria-label="История обучения"
            data-testid="history-zone"
            className="grid min-h-0 grid-cols-1 gap-4 xl:h-60 xl:grid-cols-2"
          >
            <div className="card min-h-[220px] xl:min-h-0">
              <div className="card-head">
                <span className="icon" aria-hidden="true">
                  monitoring
                </span>
                <h2 className="card-title">Лосс по сэмплам</h2>
                <span className="card-meta ui-label">сэмплы сессии</span>
              </div>
              <div className="screen min-h-0 flex-1">
                <LossChart />
              </div>
            </div>
            <ExamplesPanel />
          </div>
        </div>

        {/* Правая колонка (xl — 4): «Результат» — текущий пример со всеми
            входами, ŷ/L/тренд/вердикт + LOSS/LR (01.2-05, пункты 3/8 UAT) —
            над панелью операции (операция / drill-down / экран эпохи) */}
        <div className="flex min-h-0 flex-col gap-4 md:col-span-1 xl:col-span-4">
          <ResultPanel />
          <section aria-label="Панель шага" className="flex min-h-0 flex-1 flex-col">
            {screen === 'epoch-end' ? (
              <EpochSummary />
            ) : drill !== null && record !== null ? (
              <NumberDrilldown record={record} drill={drill} />
            ) : (
              <OperationPanel record={record} />
            )}
          </section>
        </div>
      </main>

      {/* Статус-бар 48px (DESIGN.md §4; 01.2-05, пункт 8 UAT): слева —
          индикатор позиции (первый элемент), справа — hotkeys; LOSS/LR
          переехали в карточку «Результат»; нарратив живёт в панели операции */}
      <footer className="status-bar flex h-12 shrink-0 flex-wrap items-center gap-x-4 gap-y-1 px-4">
        <span data-testid="step-indicator" className="ui-label whitespace-nowrap text-on-surface-variant">
          {/* «Эпоха N · пример N · шаг N» — точный текст e2e-контракта
              (smoke.spec.ts); разделитель держит один dot на литерал (63) */}
          {[
            ['Эпоха', epoch],
            ['пример', sampleNumber],
            ['шаг', stepNumber],
          ]
            .map((pair) => pair.join(' '))
            .join(' · ')}
        </span>
        <span className="ml-auto hidden items-center gap-2 whitespace-nowrap text-on-surface-variant ui-label lg:flex">
          <kbd className="kbd">Space</kbd> шаг
          <span className="meta-sep" aria-hidden="true" />
          <kbd className="kbd">Esc</kbd> к шагу
        </span>
      </footer>
    </div>
  )
}
