import { run, useRunSlice } from '../run/runState'
import type { StepRecord } from '../tensor'
import { formatKey } from '../format/numbers'
import { WEIGHT_ROWS } from '../run/history'
import { geometryOf, type PlateId, type SegmentGeometry } from './chainLinks'
import NumberHint from './NumberHint'
import { buildHintData } from './hintData'

/**
 * SVG-диаграмма сети 2-3-1 (Interaction Contract): слои слева-направо
 * x (2 узла) → скрытый (3) → ŷ (1); рёбра = живые веса прогона W1 (6) и
 * W2 (3). Цвет ребра — знак веса (neg/pos SVG-токены), толщина 1.5–4px
 * линейно ∝ |w| — пересчитывается после update-оп; числовая подпись ребра
 * видна на активной op, по hover и при выборе звена (анти-«стена цифр»).
 * Активная op записи: обводка tertiary (амбер) 3px + тинт 12% + glow только
 * на активном узле (DESIGN.md §10). Клик по узлу/ребру → openDrill(ref).
 * Layout детерминированный, hand-rolled. Подписка на version — веса
 * мутируются в Float64Array на месте (R4 §6.2). Поток вычислений (R5):
 * активные рёбра несут слой .diag-flow («бегущий пунктир»), направление по
 * фазе шага задаёт data-flow этого svg-корня.
 *
 * 01.2-01 «формула-хребет»: на диаграмме есть все буквы формулы — вход-чипы
 * значений x, биас-квадраты b1[0..2]/b2[0] со значениями, плашки активаций
 * tanh (скрытый слой) и σ (выход), выходной блок y·L справа от ŷ. Клик по
 * новым элементам открывает drill (x[i], b1[i], y) или выбирает звено
 * (tanh → a1, σ → yhat, L → L). Выбранное звено подсвечивается primary
 * (selectionGeometry из chainLinks.geometryOf): мятный внешний кейсинг
 * рёбер, ринг узлов, обводка плашек/биасов/чипов + тинт 10% — отличимо от
 * амбера активной op и сосуществует с ним (D-25). data-selection на корне —
 * e2e-хук (01.2-03). Display-нотация рёбер — матричная W1[j,i]/W2[0,j]
 * (аудит нотации, пункт 7 ТЗ; drill-ref остаются flat — внутренние).
 */

const VIEW_W = 640
const VIEW_H = 400
const R = 30 // радиус узла

const X_CX = 100
const H_CX = 320
const Y_CX = 540

const X_CY = [140, 280]
const H_CY = [90, 200, 310]
const Y_CY = 200

// Геометрия новых элементов (01.2-01) — в существующем viewBox
const CHIP_X = 12 // вход-чип значения x (слева от узла)
const CHIP_W = 48
const BIAS_DY = 44 // биас-квадрат: смещение вниз-влево от центра узла
const BIAS_S = 14 // сторона квадрата биаса
const TANH_PLATE = { x: 374, y: 70, w: 36, h: 260, rx: 12 } // между скрытым слоем и рёбрами W2
const SIGM_PLATE = { x: 450, y: 182, w: 36, h: 36, rx: 10 } // у выхода, перед ŷ
const OUT_X = 630 // выходной блок y/L (справа от ŷ, textAnchor=end)

interface NodeDef {
  id: string // ref для drill: x[0], a1[1], ŷ
  label: string // ASCII-подпись (план Б: цифра после буквы → <tspan>-сабскрипт)
  cx: number
  cy: number
}

const X_NODES: NodeDef[] = X_CY.map((cy, i) => ({ id: `x[${i}]`, label: `x[${i}]`, cx: X_CX, cy }))
const H_NODES: NodeDef[] = H_CY.map((cy, j) => ({ id: `a1[${j}]`, label: `a1[${j}]`, cx: H_CX, cy }))
const Y_NODE: NodeDef = { id: 'ŷ', label: 'ŷ', cx: Y_CX, cy: Y_CY }

/** Все id сущностей диаграммы (контракт подсветки звеньев, 01.2-01):
 *  узлы (x×2, a1×3, ŷ, y, L) · рёбра (W1×6, W2×3) · плашки (tanh, σ) ·
 *  биасы (b1×3, b2). Сверяется с geometryOf юнит-тестом. */
export const GEOMETRY_IDS = {
  nodes: [...X_NODES.map((n) => n.id), ...H_NODES.map((n) => n.id), Y_NODE.id, 'y', 'L'],
  edges: [...Array.from({ length: 6 }, (_, k) => `W1[${k}]`), ...Array.from({ length: 3 }, (_, k) => `W2[${k}]`)],
  plates: ['tanh', 'σ'] as const,
  biases: ['b1[0]', 'b1[1]', 'b1[2]', 'b2[0]'],
}

/** Display-нотация ребра — матричная (аудит нотации, пункт 7): W1[j,i] /
 *  W2[0,j] как в WEIGHT_ROWS и тултипах экспандеров; drill-ref (W1[0])
 *  остаются внутренними — display-only. */
function displayRef(ref: string): string {
  const m = /^(W[12])\[(\d+)\]$/.exec(ref)
  if (m === null) return ref
  const k = Number(m[2])
  return WEIGHT_ROWS[m[1] === 'W1' ? k : 9 + k] ?? ref
}

/** Активная топология операции (op + layer): какие узлы/рёбра подсвечивать. */
function activeGeometry(record: StepRecord): { nodes: Set<string>; edges: Set<string> } {
  const xIds = X_NODES.map((n) => n.id)
  const hIds = H_NODES.map((n) => n.id)
  const w1Refs = ['W1[0]', 'W1[1]', 'W1[2]', 'W1[3]', 'W1[4]', 'W1[5]']
  const w2Refs = ['W2[0]', 'W2[1]', 'W2[2]']
  const nodes = new Set<string>()
  const edges = new Set<string>()
  const L = record.layer
  switch (record.op) {
    case 'matvec':
      if (L === 1) {
        w1Refs.forEach((r) => edges.add(r))
        xIds.forEach((id) => nodes.add(id))
        hIds.forEach((id) => nodes.add(id))
      } else {
        w2Refs.forEach((r) => edges.add(r))
        hIds.forEach((id) => nodes.add(id))
        nodes.add(Y_NODE.id)
      }
      break
    case 'add':
      if (L === 1) hIds.forEach((id) => nodes.add(id))
      else nodes.add(Y_NODE.id)
      break
    case 'tanh':
    case 'tanh-grad':
      hIds.forEach((id) => nodes.add(id))
      break
    case 'sigmoid':
    case 'bce':
    case 'bce-grad':
    case 'sigmoid-grad':
      nodes.add(Y_NODE.id)
      break
    case 'matvec-grad':
      if (L === 2) {
        w2Refs.forEach((r) => edges.add(r))
        hIds.forEach((id) => nodes.add(id))
        nodes.add(Y_NODE.id)
      } else {
        w1Refs.forEach((r) => edges.add(r))
        xIds.forEach((id) => nodes.add(id))
        hIds.forEach((id) => nodes.add(id))
      }
      break
    case 'sgd':
      w1Refs.forEach((r) => edges.add(r))
      w2Refs.forEach((r) => edges.add(r))
      break
    default:
      break
  }
  return { nodes, edges }
}

const NO_GEOMETRY: SegmentGeometry = { nodes: new Set(), edges: new Set(), plates: new Set(), biases: new Set() }

/** Подпись узла/числа с <tspan>-сабскриптом (план Б §5.5: a1 → a₁). */
function SvgSubLabel({ text, x, y, className }: { text: string; x: number; y: number; className: string }) {
  const m = /^([A-Za-zŷη])(\d+)(.*)$/.exec(text)
  if (!m) {
    return (
      <text x={x} y={y} textAnchor="middle" className={className}>
        {text}
      </text>
    )
  }
  return (
    <text x={x} y={y} textAnchor="middle" className={className}>
      {m[1]}
      <tspan dy="4" fontSize="70%">
        {m[2]}
      </tspan>
      <tspan dy="-4">{m[3]}</tspan>
    </text>
  )
}

function onActivate(open: () => void): (event: React.KeyboardEvent) => void {
  return (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      open()
    }
  }
}

function EdgeView({ edge, active, selected, maxAbsW, record }: { edge: EdgeDef; active: boolean; selected: boolean; maxAbsW: number; record: StepRecord | null }) {
  const { from, to, w, ref } = edge
  const mx = (from.cx + to.cx) / 2
  const my = (from.cy + to.cy) / 2
  // перпендикулярное смещение подписи от линии
  const dx = to.cx - from.cx
  const dy = to.cy - from.cy
  const len = Math.hypot(dx, dy)
  const lx = mx + (dy / len) * 14
  const ly = my - (dx / len) * 14
  const sign = w < 0 ? 'var(--color-neg)' : 'var(--color-pos)'
  const open = (): void => run.openDrill(ref)
  return (
    // --w на ГРУППЕ: толщину видят и ребро, и кейсинги, и слой потока (наследуется)
    <g className={`diag-edge-g${active ? ' active' : ''}${selected ? ' diag-selected' : ''}`} style={{ ['--w' as string]: edgeWidth(w, maxAbsW) }}>
      {/* 01.2-01: selection-кейсинг — мятный внешний контур выбранного звена
          (постоянный рендер, видимость классом — паттерн амбер-кейсинга R5);
          сосуществует с амбер-кейсингом активной op (+6px против +3px) */}
      <line x1={from.cx + R} y1={from.cy} x2={to.cx - R} y2={to.cy} className="diag-edge-selcasing" style={{ stroke: 'var(--color-primary)' }} />
      {/* R5: кейсинг активного ребра рендерится ПОСТОЯННО, видимость — классом
          (условный монтирование не анимируется transition'ом); амбер —
          «текущий шаг» (D-25) */}
      <line
        x1={from.cx + R}
        y1={from.cy}
        x2={to.cx - R}
        y2={to.cy}
        className="diag-edge-casing"
        style={{ stroke: 'var(--color-tertiary)' }}
      />
      <line
        x1={from.cx + R}
        y1={from.cy}
        x2={to.cx - R}
        y2={to.cy}
        className="diag-edge"
        style={{ stroke: sign }}
      />
      {/* R5: «бегущий пунктир» потока — направлением управляет data-flow корня */}
      <line x1={from.cx + R} y1={from.cy} x2={to.cx - R} y2={to.cy} className="diag-flow" />
      <text x={lx} y={ly} textAnchor="middle" className="diag-edge-label">
        {formatKey(w)}
      </text>
      {/* широкая прозрачная мишень клика по ребру (hover/focus → тултип tier 1) */}
      <NumberHint hint={buildHintData(record, ref)}>
        <line
          x1={from.cx + R}
          y1={from.cy}
          x2={to.cx - R}
          y2={to.cy}
          className="diag-hit"
          style={{ stroke: 'transparent', strokeWidth: 16 }}
          role="button"
          tabIndex={0}
          aria-label={`Вес ${displayRef(ref)} = ${formatKey(w)}`}
          onClick={open}
          onKeyDown={onActivate(open)}
        />
      </NumberHint>
    </g>
  )
}

function NodeView({ node, active, selected, record }: { node: NodeDef; active: boolean; selected: boolean; record: StepRecord | null }) {
  const open = (): void => run.openDrill(node.id)
  return (
    <g>
      {/* 01.2-01: мятный ринг выбранного звена (сосуществует с амбером op) */}
      <circle cx={node.cx} cy={node.cy} r={R + 5} className={`diag-node-selring${selected ? ' on' : ''}`} />
      <circle
        cx={node.cx}
        cy={node.cy}
        r={R}
        className={`diag-node${active ? ' diag-node-active' : ''}`}
        style={
          active
            ? {
                fill: 'color-mix(in srgb, var(--color-tertiary) 12%, var(--color-surface-container))',
                stroke: 'var(--color-tertiary)',
                strokeWidth: 3,
              }
            : { fill: 'var(--color-surface-container)', stroke: 'var(--color-outline-variant)', strokeWidth: 1.5 }
        }
      />
      <SvgSubLabel text={node.label} x={node.cx} y={node.cy + 5} className="diag-node-label" />
      {/* hit-мишень узла (hover/focus → тултип tier 1) */}
      <NumberHint hint={buildHintData(record, node.id)}>
        <circle
          cx={node.cx}
          cy={node.cy}
          r={R + 6}
          className="diag-hit diag-node-hit"
          style={{ fill: 'transparent' }}
          role="button"
          tabIndex={0}
          aria-label={`Узел ${node.label}`}
          onClick={open}
          onKeyDown={onActivate(open)}
        />
      </NumberHint>
    </g>
  )
}

/** Вход-чип: живое значение входа x[i] текущего сэмпла (моно «= 1»/«= 0»). */
function InputChip({ index, cy, value, selected, record }: { index: number; cy: number; value: number; selected: boolean; record: StepRecord | null }) {
  const ref = `x[${index}]`
  const open = (): void => run.openDrill(ref)
  return (
    <g className={selected ? 'diag-selected' : ''}>
      <rect x={CHIP_X} y={cy - 12} width={CHIP_W} height={24} rx={4} className="diag-io-chip" />
      <text x={CHIP_X + CHIP_W / 2} y={cy + 4} textAnchor="middle" className="diag-io-value">
        = {formatKey(value)}
      </text>
      <NumberHint hint={buildHintData(record, ref)}>
        <rect
          x={CHIP_X - 4}
          y={cy - 14}
          width={CHIP_W + 8}
          height={28}
          className="diag-hit"
          style={{ fill: 'transparent' }}
          role="button"
          tabIndex={0}
          aria-label={`Вход x[${index}] = ${formatKey(value)}`}
          onClick={open}
          onKeyDown={onActivate(open)}
        />
      </NumberHint>
    </g>
  )
}

/** Биас-узел: маленький квадрат с живым значением у нейрона; клик → drill. */
function BiasNode({ biasRef, cx, cy, value, selected, record }: { biasRef: string; cx: number; cy: number; value: number; selected: boolean; record: StepRecord | null }) {
  const open = (): void => run.openDrill(biasRef)
  return (
    <g className={`diag-bias-g${selected ? ' diag-selected' : ''}`}>
      <rect x={cx - BIAS_S / 2} y={cy - BIAS_S / 2} width={BIAS_S} height={BIAS_S} rx={2} className="diag-bias" />
      <text x={cx + 12} y={cy + 4} className="diag-io-value">
        {formatKey(value)}
      </text>
      <NumberHint hint={buildHintData(record, biasRef)}>
        <rect
          x={cx - 10}
          y={cy - 14}
          width={74}
          height={28}
          className="diag-hit"
          style={{ fill: 'transparent' }}
          role="button"
          tabIndex={0}
          aria-label={`Биас ${biasRef} = ${formatKey(value)}`}
          onClick={open}
          onKeyDown={onActivate(open)}
        />
      </NumberHint>
    </g>
  )
}

/** Плашка активации (tanh/σ): клик выбирает звено (a1/yhat), повторный —
 *  снимает; выбранная — primary. */
function ActivationPlate({
  plate,
  box,
  fontSize,
  selected,
  onToggle,
}: {
  plate: PlateId
  box: { x: number; y: number; w: number; h: number; rx: number }
  fontSize: number
  selected: boolean
  onToggle: () => void
}) {
  const label = plate === 'tanh' ? 'Активация tanh' : 'Активация σ'
  return (
    <g className={`diag-plate-g${selected ? ' diag-selected' : ''}`}>
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        rx={box.rx}
        className="diag-plate"
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={onToggle}
        onKeyDown={onActivate(onToggle)}
      />
      <text x={box.x + box.w / 2} y={box.y + box.h / 2 + fontSize * 0.35} textAnchor="middle" className="diag-plate-label" style={{ fontSize: `calc(${fontSize}px * var(--diag-scale))` }} aria-hidden="true">
        {plate}
      </text>
    </g>
  )
}

/** Толщина 1.5–4px линейно ∝ |w| (максимум по текущим 9 живым весам). */
function edgeWidth(w: number, maxAbsW: number): number {
  return 1.5 + (2.5 * Math.abs(w)) / maxAbsW
}

interface EdgeDef {
  ref: string // W1[k] / W2[k] — flat-индекс совпадает со operationRows (row-major)
  w: number
  from: NodeDef
  to: NodeDef
}

function buildEdges(): { edges: EdgeDef[]; maxAbsW: number } {
  const w1 = run.model.W1.data // row-major [3,2]
  const w2 = run.model.W2.data // row-major [1,3]
  const w1Edges: EdgeDef[] = H_NODES.flatMap((h, j) =>
    X_NODES.map((x, i) => ({ ref: `W1[${j * 2 + i}]`, w: w1[j * 2 + i]!, from: x, to: h })),
  )
  const w2Edges: EdgeDef[] = H_NODES.map((h, j) => ({ ref: `W2[${j}]`, w: w2[j]!, from: h, to: Y_NODE }))
  const edges = [...w1Edges, ...w2Edges]
  const maxAbsW = Math.max(...edges.map((e) => Math.abs(e.w)), 1e-12)
  return { edges, maxAbsW }
}

/** Направление потока вычислений по фазе текущего шага (R5): forward-фазы —
 *  прямое (x→h→ŷ), backward — обратное; update-фазы — без потока (undefined,
 *  атрибут не монтируется). Один data-атрибут на корне svg + один CSS-селектор. */
function flowOf(record: StepRecord | null): 'forward' | 'backward' | undefined {
  if (record === null) return undefined
  switch (record.phase) {
    case 'forward':
    case 'loss':
      return 'forward'
    case 'backward':
      return 'backward'
    default:
      return undefined
  }
}

export default function ArchitectureDiagram({ record }: { record: StepRecord | null }) {
  // версия прогона: перерисовка на каждую операцию (веса мутируются на месте)
  const version = useRunSlice((r) => r.version)
  const selection = useRunSlice((r) => r.selection)
  const sampleOpValues = useRunSlice((r) => r.sampleOpValues)
  const { edges, maxAbsW } = buildEdges()
  const active = record !== null ? activeGeometry(record) : { nodes: new Set<string>(), edges: new Set<string>() }
  // геометрия выбранного звена — primary-подсветка (01.2-01)
  const sel = selection !== null ? geometryOf(selection.segment) : NO_GEOMETRY
  const toggleLink = (segment: 'a1' | 'yhat' | 'L', symbol: string): void => {
    if (selection !== null && selection.segment === segment && selection.symbol === symbol) run.clearLink()
    else run.selectLink(segment, symbol)
  }
  const cursor = run.activeCursor
  const xValues = Array.from(cursor.x.data)
  const yValue = cursor.y.data[0]!
  const b1Values = Array.from(run.model.b1.data)
  const b2Value = run.model.b2.data[0]!
  const lossValue = sampleOpValues[6] // ключ bce-опы текущего сэмпла; до вычисления — н/д
  return (
    <svg
      data-testid="architecture-diagram"
      data-version={version}
      data-flow={flowOf(record)}
      data-selection={selection?.segment}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-full w-full"
      role="img"
      aria-label="Диаграмма сети 2-3-1: входы x, биасы b1/b2, скрытый слой a1 с активацией tanh, выход ŷ с активацией σ, метка y и лосс L; рёбра — живые веса"
    >
      {edges.map((edge) => (
        <EdgeView
          key={edge.ref}
          edge={edge}
          active={active.edges.has(edge.ref)}
          selected={sel.edges.has(edge.ref)}
          maxAbsW={maxAbsW}
          record={record}
        />
      ))}
      {/* 01.2-01: слой новых элементов между рёбрами и узлами — плашки
          активаций, биас-узлы, вход-чипы, выходной блок */}
      <ActivationPlate
        plate="tanh"
        box={TANH_PLATE}
        fontSize={13}
        selected={sel.plates.has('tanh')}
        onToggle={() => toggleLink('a1', 'tanh')}
      />
      <ActivationPlate plate="σ" box={SIGM_PLATE} fontSize={15} selected={sel.plates.has('σ')} onToggle={() => toggleLink('yhat', 'σ')} />
      {H_NODES.map((n, j) => (
        <BiasNode key={`b1-${j}`} biasRef={`b1[${j}]`} cx={H_CX - 20} cy={n.cy + BIAS_DY} value={b1Values[j]!} selected={sel.biases.has(`b1[${j}]`)} record={record} />
      ))}
      <BiasNode biasRef="b2[0]" cx={Y_CX} cy={Y_CY + BIAS_DY} value={b2Value} selected={sel.biases.has('b2[0]')} record={record} />
      {X_NODES.map((n, i) => (
        <InputChip key={`xv-${i}`} index={i} cy={n.cy} value={xValues[i]!} selected={sel.nodes.has(n.id)} record={record} />
      ))}
      {/* выходной блок: метка y (клик → drill) и лосс L (клик → звено L) */}
      <g className={`diag-out-g${sel.nodes.has('y') ? ' diag-selected' : ''}`}>
        <NumberHint hint={buildHintData(record, 'y[0]')}>
          <text
            x={OUT_X}
            y={Y_CY - 32}
            textAnchor="end"
            className="diag-out-label"
            role="button"
            tabIndex={0}
            aria-label={`Метка y = ${formatKey(yValue)}`}
            onClick={() => run.openDrill('y[0]')}
            onKeyDown={onActivate(() => run.openDrill('y[0]'))}
          >
            y = {formatKey(yValue)}
          </text>
        </NumberHint>
      </g>
      <g className={`diag-out-g${sel.nodes.has('L') ? ' diag-selected' : ''}`}>
        <text
          x={OUT_X}
          y={Y_CY + 36}
          textAnchor="end"
          className="diag-out-label"
          role="button"
          tabIndex={0}
          aria-label={lossValue === undefined ? 'Лосс L ещё не вычислен' : `Лосс L = ${formatKey(lossValue)}`}
          onClick={() => toggleLink('L', 'L')}
          onKeyDown={onActivate(() => toggleLink('L', 'L'))}
        >
          L = {lossValue === undefined ? 'н/д' : formatKey(lossValue)}
        </text>
      </g>
      {X_NODES.map((n) => (
        <NodeView key={n.id} node={n} active={active.nodes.has(n.id)} selected={sel.nodes.has(n.id)} record={record} />
      ))}
      {H_NODES.map((n) => (
        <NodeView key={n.id} node={n} active={active.nodes.has(n.id)} selected={sel.nodes.has(n.id)} record={record} />
      ))}
      <NodeView node={Y_NODE} active={active.nodes.has(Y_NODE.id)} selected={sel.nodes.has(Y_NODE.id)} record={record} />
    </svg>
  )
}
