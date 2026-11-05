import { run, useRunSlice } from '../run/runState'
import type { StepRecord } from '../tensor'
import { formatKey } from '../format/numbers'
import NumberHint from './NumberHint'
import { buildHintData } from './hintData'

/**
 * SVG-диаграмма сети 2-3-1 (Interaction Contract): слои слева-направо
 * x (2 узла) → скрытый (3) → ŷ (1); рёбра = живые веса прогона W1 (6) и
 * W2 (3), биасы не рисуются. Цвет ребра — знак веса (neg/pos SVG-токены),
 * толщина 1.5–4px линейно ∝ |w| — пересчитывается после update-оп;
 * числовая подпись ребра видна на активной op и по hover (анти-«стена
 * цифр»). Активная op записи: обводка tertiary (амбер) 3px + тинт 12% +
 * glow только на активном узле (DESIGN.md §10). Клик по
 * узлу/ребру → openDrill(ref). Layout детерминированный, hand-rolled.
 * Подписка на version — веса мутируются в Float64Array на месте (R4 §6.2).
 * Поток вычислений (R5): активные рёбра несут слой .diag-flow («бегущий
 * пунктир»), направление по фазе шага задаёт data-flow этого svg-корня.
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

interface NodeDef {
  id: string // ref для drill: x[0], a1[1], ŷ
  label: string // ASCII-подпись (план Б: цифра после буквы → <tspan>-сабскрипт)
  cx: number
  cy: number
}

const X_NODES: NodeDef[] = X_CY.map((cy, i) => ({ id: `x[${i}]`, label: `x[${i}]`, cx: X_CX, cy }))
const H_NODES: NodeDef[] = H_CY.map((cy, j) => ({ id: `a1[${j}]`, label: `a1[${j}]`, cx: H_CX, cy }))
const Y_NODE: NodeDef = { id: 'ŷ', label: 'ŷ', cx: Y_CX, cy: Y_CY }

interface EdgeDef {
  ref: string // W1[k] / W2[k] — flat-индекс совпадает со operationRows (row-major)
  w: number
  from: NodeDef
  to: NodeDef
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

function EdgeView({ edge, active, maxAbsW, record }: { edge: EdgeDef; active: boolean; maxAbsW: number; record: StepRecord | null }) {
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
  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      open()
    }
  }
  return (
    // --w на ГРУППЕ: толщину видят и ребро, и кейсинг, и слой потока (наследуется)
    <g className={`diag-edge-g${active ? ' active' : ''}`} style={{ ['--w' as string]: edgeWidth(w, maxAbsW) }}>
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
          aria-label={`Вес ${ref} = ${formatKey(w)}`}
          onClick={open}
          onKeyDown={onKeyDown}
        />
      </NumberHint>
    </g>
  )
}

function NodeView({ node, active, record }: { node: NodeDef; active: boolean; record: StepRecord | null }) {
  const open = (): void => run.openDrill(node.id)
  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      open()
    }
  }
  return (
    <g>
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
          onKeyDown={onKeyDown}
        />
      </NumberHint>
    </g>
  )
}

/** Толщина 1.5–4px линейно ∝ |w| (максимум по текущим 9 живым весам). */
function edgeWidth(w: number, maxAbsW: number): number {
  return 1.5 + (2.5 * Math.abs(w)) / maxAbsW
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
  const { edges, maxAbsW } = buildEdges()
  const active = record !== null ? activeGeometry(record) : { nodes: new Set<string>(), edges: new Set<string>() }
  return (
    <svg
      data-testid="architecture-diagram"
      data-version={version}
      data-flow={flowOf(record)}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-full w-full"
      role="img"
      aria-label="Диаграмма сети 2-3-1: входы x, скрытый слой a1, выход ŷ; рёбра — живые веса"
    >
      {edges.map((edge) => (
        <EdgeView key={edge.ref} edge={edge} active={active.edges.has(edge.ref)} maxAbsW={maxAbsW} record={record} />
      ))}
      {X_NODES.map((n) => (
        <NodeView key={n.id} node={n} active={active.nodes.has(n.id)} record={record} />
      ))}
      {H_NODES.map((n) => (
        <NodeView key={n.id} node={n} active={active.nodes.has(n.id)} record={record} />
      ))}
      <NodeView node={Y_NODE} active={active.nodes.has(Y_NODE.id)} record={record} />
    </svg>
  )
}
