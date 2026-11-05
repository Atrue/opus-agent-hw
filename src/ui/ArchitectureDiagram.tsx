import { run, useRunSlice } from '../run/runState'
import type { StepRecord } from '../tensor'
import { formatKey } from '../format/numbers'
import { WEIGHT_ROWS } from '../run/history'
import { XOR_SCENARIO } from '../run/scenario'
import { geometryOf, type PlateId, type SegmentGeometry } from './chainLinks'
import NumberHint from './NumberHint'
import { buildHintData } from './hintData'

/**
 * SVG-диаграмма-цепь станций (01.2-04, модель утверждена владельцем
 * 2026-11-05): читается слева-направо строго по формуле —
 * пример(k) → x →[W1·x+b1]→ z1 →[tanh]→ a1 →[W2·a1+b2]→ z2 →[σ]→ ŷ →[BCE]→ L.
 * Каждая станция = буква + живое число: значения входов — ВНУТРИ узлов x,
 * узлы z1[0..2]/a1[0..2]/z2/ŷ несут суммы/активации, узел L — лосс текущего
 * сэмпла («н/д» до bce-опы). Источник-пример — маркер «пример k» слева;
 * короткие подводы-пунктиры ведят в узлы x (звено x подсвечивает и их).
 * Плашки tanh/σ/bce — станции-звенья НА ПУТИ цепи: tanh стоит МЕЖДУ колонками
 * z1 и a1 (читается z1 → tanh → a1), σ — между z2 и ŷ, BCE — после ŷ
 * (клик → звено L); биасы — чипы «+b₁ⱼ»/«+b₂», приклеенные к станциям сумм
 * (клик → drill). Метка y — вход оператора BCE, при BCE-станции.
 *
 * Рёбра = живые веса прогона W1 (6) и W2 (3): цвет — знак веса (neg/pos),
 * толщина 1.5–4px линейно ∝ |w|; числовая подпись ребра видна на активной
 * op, по hover и при выборе звена (анти-«стена цифр»). Активная op:
 * амбер-кейсинг/тинт на узлах, рёбрах, плашках и чипах (activeGeometry
 * покрывает все 13 оп сценария); выбранное звено — primary (ring узлов,
 * обводка плашек/чипов/подводов) — сосуществует с амбером (D-25).
 * Клик по узлу/ребру/чипу → openDrill(ref); по плашке/узлу L → выбор звена.
 * data-selection на корне — e2e-хук (01.2-03); station-value — e2e 8b.
 * Layout детерминированный, hand-rolled; подписка на version — веса
 * мутируются в Float64Array на месте (R4 §6.2). Поток вычислений (R5):
 * активные рёбра несут слой .diag-flow, направление по фазе шага задаёт
 * data-flow этого svg-корня. Display-нотация рёбер — матричная W1[j,i]/W2[0,j]
 * (аудит нотации; drill-ref остаются flat — внутренние).
 */

const VIEW_W = 880
const VIEW_H = 400
const R = 30 // радиус узла-станции

// Колонки цепи: пример → x → z1 →|tanh|→ a1 → z2 →|σ|→ ŷ →|BCE|→ L
const SAMPLE_BOX = { x: 6, y: 180, w: 64, h: 40, rx: 8 } // маркер «пример k»
const X_CX = 118
const Z1_CX = 300
const A1_CX = 452
const Z2_CX = 610
const YH_CX = 712 // ŷ
const L_CX = 828

const X_CY = [140, 280]
const H_CY = [90, 200, 310] // колонки z1 и a1 совпадают по вертикали
const OUT_CY = 200 // z2, ŷ, L

const TANH_PLATE = { x: 352, y: 62, w: 34, h: 256, rx: 12 } // МЕЖДУ колонками z1 и a1
const SIGM_PLATE = { x: 644, y: 182, w: 34, h: 36, rx: 10 } // между z2 и ŷ
const BCE_PLATE = { x: 748, y: 172, w: 48, h: 56, rx: 10 } // после ŷ, перед L
const Y_LABEL = { x: 772, y: 156 } // метка y — вход оператора BCE

interface NodeDef {
  id: string // ref для drill: x[0], z1[1], a1[0], z2, ŷ, L
  label: string // ASCII-подпись (SvgSubLabel → z₁[0])
  cx: number
  cy: number
}

const X_NODES: NodeDef[] = X_CY.map((cy, i) => ({ id: `x[${i}]`, label: `x[${i}]`, cx: X_CX, cy }))
const Z1_NODES: NodeDef[] = H_CY.map((cy, j) => ({ id: `z1[${j}]`, label: `z1[${j}]`, cx: Z1_CX, cy }))
const A1_NODES: NodeDef[] = H_CY.map((cy, j) => ({ id: `a1[${j}]`, label: `a1[${j}]`, cx: A1_CX, cy }))
const Z2_NODE: NodeDef = { id: 'z2', label: 'z2', cx: Z2_CX, cy: OUT_CY }
const Y_NODE: NodeDef = { id: 'ŷ', label: 'ŷ', cx: YH_CX, cy: OUT_CY }
const L_NODE: NodeDef = { id: 'L', label: 'L', cx: L_CX, cy: OUT_CY }

/** Все id сущностей диаграммы-цепи (контракт станций, 01.2-04): узлы
 *  (x×2, z1×3, a1×3, z2, ŷ, y, L) · рёбра (W1×6, W2×3, подводы×2) ·
 *  плашки (tanh, σ, bce) · биас-чипы (b1×3, b2). Сверяется с контрактом
 *  chainLinks.CHAIN_GEOMETRY_IDS юнит-тестом. */
export const GEOMETRY_IDS = {
  nodes: [...X_NODES.map((n) => n.id), ...Z1_NODES.map((n) => n.id), ...A1_NODES.map((n) => n.id), Z2_NODE.id, Y_NODE.id, 'y', L_NODE.id],
  edges: [
    ...Array.from({ length: 6 }, (_, k) => `W1[${k}]`),
    ...Array.from({ length: 3 }, (_, k) => `W2[${k}]`),
    'sample-feed[0]',
    'sample-feed[1]',
  ],
  plates: ['tanh', 'σ', 'bce'] as const,
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

/** Активная топология операции (все 13 оп сценария): станции цепи, которые
 *  несёт шаг — узлы, рёбра W, плашки и биас-чипы (амбер-подсветка). */
function activeGeometry(record: StepRecord): { nodes: Set<string>; edges: Set<string>; plates: Set<PlateId>; biases: Set<string> } {
  const xIds = X_NODES.map((n) => n.id)
  const z1Ids = Z1_NODES.map((n) => n.id)
  const a1Ids = A1_NODES.map((n) => n.id)
  const w1Refs = ['W1[0]', 'W1[1]', 'W1[2]', 'W1[3]', 'W1[4]', 'W1[5]']
  const w2Refs = ['W2[0]', 'W2[1]', 'W2[2]']
  const b1Refs = ['b1[0]', 'b1[1]', 'b1[2]']
  const nodes = new Set<string>()
  const edges = new Set<string>()
  const plates = new Set<PlateId>()
  const biases = new Set<string>()
  const L = record.layer
  switch (record.op) {
    case 'matvec':
      if (L === 1) {
        w1Refs.forEach((r) => edges.add(r))
        xIds.forEach((id) => nodes.add(id))
        z1Ids.forEach((id) => nodes.add(id))
      } else {
        w2Refs.forEach((r) => edges.add(r))
        a1Ids.forEach((id) => nodes.add(id))
        nodes.add(Z2_NODE.id)
      }
      break
    case 'add':
      if (L === 1) {
        z1Ids.forEach((id) => nodes.add(id))
        b1Refs.forEach((b) => biases.add(b))
      } else {
        nodes.add(Z2_NODE.id)
        biases.add('b2[0]')
      }
      break
    case 'tanh':
    case 'tanh-grad':
      z1Ids.forEach((id) => nodes.add(id))
      a1Ids.forEach((id) => nodes.add(id))
      plates.add('tanh')
      break
    case 'sigmoid':
    case 'sigmoid-grad':
      nodes.add(Z2_NODE.id)
      nodes.add(Y_NODE.id)
      plates.add('σ')
      break
    case 'bce':
    case 'bce-grad':
      nodes.add(Y_NODE.id)
      nodes.add('y')
      nodes.add(L_NODE.id)
      plates.add('bce')
      break
    case 'matvec-grad':
      if (L === 2) {
        w2Refs.forEach((r) => edges.add(r))
        a1Ids.forEach((id) => nodes.add(id))
        nodes.add(Y_NODE.id)
      } else {
        w1Refs.forEach((r) => edges.add(r))
        xIds.forEach((id) => nodes.add(id))
        z1Ids.forEach((id) => nodes.add(id))
      }
      break
    case 'sgd':
      w1Refs.forEach((r) => edges.add(r))
      w2Refs.forEach((r) => edges.add(r))
      break
    default:
      break
  }
  return { nodes, edges, plates, biases }
}

const NO_GEOMETRY: SegmentGeometry = { nodes: new Set(), edges: new Set(), plates: new Set(), biases: new Set() }
const NO_ACTIVE: { nodes: Set<string>; edges: Set<string>; plates: Set<PlateId>; biases: Set<string> } = {
  nodes: new Set(),
  edges: new Set(),
  plates: new Set(),
  biases: new Set(),
}

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

/** Узел-станция: буква (сверху) + живое число (снизу) внутри круга; клик —
 *  drill числа (по умолчанию) или выбор звена (узел L). `station` маркирует
 *  число testid'ом station-value (e2e 8b: z1/a1/z2/ŷ/L). */
function NodeView({
  node,
  active,
  selected,
  record,
  value,
  station,
  onOpen,
}: {
  node: NodeDef
  active: boolean
  selected: boolean
  record: StepRecord | null
  value: string | null
  station?: boolean
  onOpen?: () => void
}) {
  const open = onOpen ?? ((): void => run.openDrill(node.id))
  return (
    // .diag-selected на группе узла — e2e-контракт 01.2-03 (геометрия звена
    // единообразно маркируется классом; визуал узла — diag-node-selring)
    <g className={selected ? 'diag-selected' : ''}>
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
      <SvgSubLabel text={node.label} x={node.cx} y={node.cy - 4} className="diag-node-label" />
      {value !== null && (
        <text
          x={node.cx}
          y={node.cy + 16}
          textAnchor="middle"
          className="diag-node-value"
          data-testid={station === true ? 'station-value' : undefined}
        >
          {value}
        </text>
      )}
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

/** Чип биаса «+b₁ⱼ»/«+b₂», приклеенный к станции сумм (Gap 7): клик → drill. */
function BiasChip({
  biasRef,
  cx,
  cy,
  active,
  selected,
  record,
}: {
  biasRef: string
  cx: number
  cy: number
  active: boolean
  selected: boolean
  record: StepRecord | null
}) {
  const m = /^b([12])\[(\d+)\]$/.exec(biasRef)!
  const open = (): void => run.openDrill(biasRef)
  return (
    <g className={`diag-bias-g${active ? ' active' : ''}${selected ? ' diag-selected' : ''}`}>
      <rect x={cx - 18} y={cy - 8} width={36} height={16} rx={8} className="diag-bias-chip" />
      <text x={cx} y={cy + 3.5} textAnchor="middle" className="diag-bias-chip-label">
        +b
        <tspan dy="3" fontSize="72%">
          {m[1]}
        </tspan>
        <tspan fontSize="72%">{m[2]}</tspan>
      </text>
      <NumberHint hint={buildHintData(record, biasRef)}>
        <rect
          x={cx - 20}
          y={cy - 10}
          width={40}
          height={20}
          className="diag-hit"
          style={{ fill: 'transparent' }}
          role="button"
          tabIndex={0}
          aria-label={`Биас ${biasRef}`}
          onClick={open}
          onKeyDown={onActivate(open)}
        />
      </NumberHint>
    </g>
  )
}

/** Плашка-станция (tanh/σ/bce) на пути цепи: клик выбирает звено (a1/yhat/L),
 *  повторный — снимает; активная op — амбер, выбранная — primary. */
function ActivationPlate({
  plate,
  box,
  fontSize,
  active,
  selected,
  onToggle,
  title,
}: {
  plate: PlateId
  box: { x: number; y: number; w: number; h: number; rx: number }
  fontSize: number
  active: boolean
  selected: boolean
  onToggle: () => void
  title?: string
}) {
  const label = plate === 'tanh' ? 'Активация tanh' : plate === 'σ' ? 'Активация σ' : 'BCE — лосс (binary cross-entropy)'
  return (
    <g className={`diag-plate-g${active ? ' active' : ''}${selected ? ' diag-selected' : ''}`}>
      {title !== undefined && <title>{title}</title>}
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
      <text
        x={box.x + box.w / 2}
        y={box.y + box.h / 2 + fontSize * 0.35}
        textAnchor="middle"
        className="diag-plate-label"
        style={{ fontSize: `calc(${fontSize}px * var(--diag-scale))` }}
        aria-hidden="true"
      >
        {plate === 'bce' ? 'BCE' : plate}
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
  const w1Edges: EdgeDef[] = Z1_NODES.flatMap((z1, j) =>
    X_NODES.map((x, i) => ({ ref: `W1[${j * 2 + i}]`, w: w1[j * 2 + i]!, from: x, to: z1 })),
  )
  const w2Edges: EdgeDef[] = A1_NODES.map((a1, j) => ({ ref: `W2[${j}]`, w: w2[j]!, from: a1, to: Z2_NODE }))
  const edges = [...w1Edges, ...w2Edges]
  const maxAbsW = Math.max(...edges.map((e) => Math.abs(e.w)), 1e-12)
  return { edges, maxAbsW }
}

/** Направление потока вычислений по фазе текущего шага (R5): forward-фазы —
 *  прямое (x→…→L), backward — обратное; update-фазы — без потока (undefined,
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
  const sampleIndex = useRunSlice((r) => r.sampleIndex)
  const { edges, maxAbsW } = buildEdges()
  const active = record !== null ? activeGeometry(record) : NO_ACTIVE
  // геометрия выбранного звена — primary-подсветка (01.2-01)
  const sel = selection !== null ? geometryOf(selection.segment) : NO_GEOMETRY
  const toggleLink = (segment: 'a1' | 'yhat' | 'L', symbol: string): void => {
    if (selection !== null && selection.segment === segment && selection.symbol === symbol) run.clearLink()
    else run.selectLink(segment, symbol)
  }
  const cursor = run.activeCursor
  const xValues = Array.from(cursor.x.data)
  const yValue = cursor.y.data[0]!
  const t = cursor.tensors
  const z1 = t.z1 === null ? null : Array.from(t.z1.data)
  const a1 = t.a1 === null ? null : Array.from(t.a1.data)
  const z2 = t.z2 === null ? null : t.z2.data[0]!
  const yhat = t.yhat === null ? null : t.yhat.data[0]!
  const lossValue = sampleOpValues[6] // ключ bce-опы текущего сэмпла; до вычисления — н/д
  const station = (v: number | null | undefined): string => (v === null || v === undefined ? 'н/д' : formatKey(v))
  return (
    <svg
      data-testid="architecture-diagram"
      data-version={version}
      data-flow={flowOf(record)}
      data-selection={selection?.segment}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-full w-full"
      role="img"
      aria-label="Диаграмма-цепь сети 2-3-1 по формуле: пример → входы x → взвешенные суммы z1 с биасами b1 → tanh → активации a1 → z2 с биасом b2 → σ → прогноз ŷ → BCE → лосс L; рёбра — живые веса"
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
      {/* источник-пример «пример k» + подводы в узлы x (звено x, Gap 1) */}
      <g data-testid="sample-source">
        <rect x={SAMPLE_BOX.x} y={SAMPLE_BOX.y} width={SAMPLE_BOX.w} height={SAMPLE_BOX.h} rx={SAMPLE_BOX.rx} className="diag-sample-marker" />
        <text x={SAMPLE_BOX.x + SAMPLE_BOX.w / 2} y={SAMPLE_BOX.y + SAMPLE_BOX.h / 2 + 4} textAnchor="middle" className="diag-sample-marker-label">
          пример {sampleIndex + 1}
        </text>
      </g>
      {X_NODES.map((n, i) => (
        <g key={`feed-${i}`} className={`diag-feed-g${sel.edges.has(`sample-feed[${i}]`) ? ' diag-selected' : ''}`}>
          <line x1={SAMPLE_BOX.x + SAMPLE_BOX.w} y1={OUT_CY + (i === 0 ? -12 : 12)} x2={n.cx - R} y2={n.cy} className="diag-feed" />
        </g>
      ))}
      {/* станции-звенья на пути цепи: tanh МЕЖДУ колонками z1/a1, σ между z2/ŷ,
          BCE после ŷ (клик → звено L; тултип — формула лосса) */}
      <ActivationPlate
        plate="tanh"
        box={TANH_PLATE}
        fontSize={13}
        active={active.plates.has('tanh')}
        selected={sel.plates.has('tanh')}
        onToggle={() => toggleLink('a1', 'tanh')}
      />
      <ActivationPlate
        plate="σ"
        box={SIGM_PLATE}
        fontSize={15}
        active={active.plates.has('σ')}
        selected={sel.plates.has('σ')}
        onToggle={() => toggleLink('yhat', 'σ')}
      />
      <ActivationPlate
        plate="bce"
        box={BCE_PLATE}
        fontSize={13}
        active={active.plates.has('bce')}
        selected={sel.plates.has('bce')}
        onToggle={() => toggleLink('L', 'L')}
        title={XOR_SCENARIO.opMeta[6]!.formula}
      />
      {/* биас-чипы станций сумм: «+b₁ⱼ» при узлах z1, «+b₂» при z2 (Gap 7) */}
      {Z1_NODES.map((n, j) => (
        <BiasChip
          key={`b1-${j}`}
          biasRef={`b1[${j}]`}
          cx={Z1_CX}
          cy={n.cy + R + 10}
          active={active.biases.has(`b1[${j}]`)}
          selected={sel.biases.has(`b1[${j}]`)}
          record={record}
        />
      ))}
      <BiasChip
        biasRef="b2[0]"
        cx={Z2_CX}
        cy={OUT_CY + R + 10}
        active={active.biases.has('b2[0]')}
        selected={sel.biases.has('b2[0]')}
        record={record}
      />
      {/* метка y — вход оператора BCE (клик → drill) */}
      <g className={`diag-out-g${sel.nodes.has('y') ? ' diag-selected' : ''}`}>
        <NumberHint hint={buildHintData(record, 'y[0]')}>
          <text
            x={Y_LABEL.x}
            y={Y_LABEL.y}
            textAnchor="middle"
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
      {X_NODES.map((n, i) => (
        <NodeView key={n.id} node={n} active={active.nodes.has(n.id)} selected={sel.nodes.has(n.id)} record={record} value={formatKey(xValues[i]!)} />
      ))}
      {Z1_NODES.map((n, j) => (
        <NodeView key={n.id} node={n} active={active.nodes.has(n.id)} selected={sel.nodes.has(n.id)} record={record} value={station(z1?.[j])} station />
      ))}
      {A1_NODES.map((n, j) => (
        <NodeView key={n.id} node={n} active={active.nodes.has(n.id)} selected={sel.nodes.has(n.id)} record={record} value={station(a1?.[j])} station />
      ))}
      <NodeView node={Z2_NODE} active={active.nodes.has(Z2_NODE.id)} selected={sel.nodes.has(Z2_NODE.id)} record={record} value={station(z2)} station />
      <NodeView node={Y_NODE} active={active.nodes.has(Y_NODE.id)} selected={sel.nodes.has(Y_NODE.id)} record={record} value={station(yhat)} station />
      <NodeView node={L_NODE} active={active.nodes.has(L_NODE.id)} selected={sel.nodes.has(L_NODE.id)} record={record} value={station(lossValue)} station onOpen={() => toggleLink('L', 'L')} />
    </svg>
  )
}
