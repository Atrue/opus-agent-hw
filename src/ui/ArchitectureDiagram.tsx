import { player, trace } from '../player/store'
import type { TraceStep } from '../player/types'
import { formatKey } from '../format/numbers'

/**
 * SVG-диаграмма сети 2-3-1 (Interaction Contract): слои слева-направо
 * x (2 узла) → скрытый (3) → ŷ (1); рёбра = веса W₁ (6) и W₂ (3), биасы
 * не рисуются. Цвет ребра — знак веса (neg/pos SVG-токены), толщина
 * 1.5–4px линейно ∝ |w|; числовая подпись ребра скрыта по умолчанию,
 * видна на активной op и по hover (анти-«стена цифр»). Активная op шага:
 * обводка #E69F00 3px + тинт 10%. Клик по узлу/ребру → openDrill(ref).
 * Layout детерминированный, hand-rolled (топология фиксирована);
 * числа не вычисляются — только форматирование (Pattern 1).
 * Лекционный режим: только CSS-переменные (--edge-scale ×2, --diag-scale).
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
  ref: string // W1[k] / W2[k] — flat-индекс совпадает со stepRows (row-major)
  w: number
  from: NodeDef
  to: NodeDef
}

const W1_EDGES: EdgeDef[] = H_NODES.flatMap((h, j) =>
  X_NODES.map((x, i) => ({ ref: `W1[${j * 2 + i}]`, w: trace.weights.w1[j]![i]!, from: x, to: h })),
)
const W2_EDGES: EdgeDef[] = H_NODES.map((h, j) => ({ ref: `W2[${j}]`, w: trace.weights.w2[0]![j]!, from: h, to: Y_NODE }))
const EDGES = [...W1_EDGES, ...W2_EDGES]

/** Толщина 1.5–4px линейно ∝ |w| (максимум по всем 9 весам трейса). */
const MAX_ABS_W = Math.max(...EDGES.map((e) => Math.abs(e.w)))
const edgeWidth = (w: number): number => 1.5 + (2.5 * Math.abs(w)) / MAX_ABS_W

/** Активная топология шага (op + layer): какие узлы/рёбра подсвечивать. */
function activeGeometry(step: TraceStep): { nodes: Set<string>; edges: Set<string> } {
  const xIds = X_NODES.map((n) => n.id)
  const hIds = H_NODES.map((n) => n.id)
  const w1Refs = W1_EDGES.map((e) => e.ref)
  const w2Refs = W2_EDGES.map((e) => e.ref)
  const nodes = new Set<string>()
  const edges = new Set<string>()
  const L = step.layer
  switch (step.op) {
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
    default: // summary — ничего не активно
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

function EdgeView({ edge, active }: { edge: EdgeDef; active: boolean }) {
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
  const open = (): void => player.openDrill(ref)
  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      open()
    }
  }
  return (
    <g className={`diag-edge-g${active ? ' active' : ''}`}>
      {active && (
        <line
          x1={from.cx + R}
          y1={from.cy}
          x2={to.cx - R}
          y2={to.cy}
          className="diag-edge-casing"
          style={{ stroke: 'var(--color-attention)' }}
        />
      )}
      <line
        x1={from.cx + R}
        y1={from.cy}
        x2={to.cx - R}
        y2={to.cy}
        className="diag-edge"
        style={{ stroke: sign, ['--w' as string]: edgeWidth(w) }}
      />
      <text x={lx} y={ly} textAnchor="middle" className="diag-edge-label">
        {formatKey(w)}
      </text>
      {/* широкая прозрачная мишень клика по ребру */}
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
    </g>
  )
}

function NodeView({ node, active }: { node: NodeDef; active: boolean }) {
  const open = (): void => player.openDrill(node.id)
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
        className="diag-node"
        style={
          active
            ? { fill: 'color-mix(in srgb, var(--color-attention) 10%, white)', stroke: 'var(--color-attention)', strokeWidth: 3 }
            : { fill: '#FFFFFF', stroke: '#E5E7EB', strokeWidth: 1.5 }
        }
      />
      <SvgSubLabel text={node.label} x={node.cx} y={node.cy + 5} className="diag-node-label" />
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
    </g>
  )
}

export default function ArchitectureDiagram({ step }: { step: TraceStep }) {
  const active = activeGeometry(step)
  return (
    <svg
      data-testid="architecture-diagram"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-full w-full"
      role="img"
      aria-label="Диаграмма сети 2-3-1: входы x, скрытый слой a1, выход ŷ; рёбра — веса"
    >
      {EDGES.map((edge) => (
        <EdgeView key={edge.ref} edge={edge} active={active.edges.has(edge.ref)} />
      ))}
      {X_NODES.map((n) => (
        <NodeView key={n.id} node={n} active={active.nodes.has(n.id)} />
      ))}
      {H_NODES.map((n) => (
        <NodeView key={n.id} node={n} active={active.nodes.has(n.id)} />
      ))}
      <NodeView node={Y_NODE} active={active.nodes.has(Y_NODE.id)} />
    </svg>
  )
}
