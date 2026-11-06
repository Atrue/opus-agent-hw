import { useState } from 'react'
import { run, useRunSlice } from '../run/runState'
import type { StepRecord, Tensor } from '../tensor'
import { formatKey } from '../format/numbers'
import { GRAPH_EDGES, GRAPH_NODES, NODE_H, NODE_W, STEP_GROUPS, buildGraph, type GraphNode } from './compGraph'
import { geometryOf } from './chainLinks'

/**
 * Граф вычислений (01.2-06, правила владельца): диаграмма = буквальный граф
 * движка. Звено-значение — закруглённый квадрат (константа — белая рамка,
 * параметр — зелёная --color-pos, вычисленное — нейтральная), звено-операция —
 * круг (операции по-элементно); внутри звена — текущее живое значение, после
 * backward-шагов под звеном — градиент (∂L/∂·). Рёбра операнд→оп→результат
 * показывают движение значения; hover — fwd/bwd числа источника. После
 * backward — ЯВНАЯ update-станция «W ← W − η·∂L/∂W» (одна), рёбра ко всем 13
 * параметрам; на 13-м шаге станция активна, параметры обновляются.
 *
 * Значения — live-срезы прогона (инвариант «граф = drill-down = движок»):
 * узел показывает число тогда, когда его операция исполнена в текущем сэмпле,
 * до этого — «н/д». Подсветки: выбранное звено цепи — группа primary
 * (.diag-selected, data-selection), активный шаг ленты — группа амбер
 * (.active + бегущий пунктир .diag-flow, направление по фазе — data-flow
 * корня; классы диаграммных рёбер сохранены — контракт e2e 1/2). Раскладка
 * детерминирована compGraph (ранг×строка, рамки канвы); карточка даёт
 * скролл по обеим осям (канва не сжимается). Клик: параметры/входы/метка →
 * drill, операции → выбор звена цепи.
 */

const OP_LABEL_RADIUS: Record<string, number> = { tanh: 17, BCE: 16, σ: 15 }


/** Индекс шага ленты 0–12 по (op, layer) записи — для STEP_GROUPS. */
const STEP_INDEX: Record<string, number> = {
  'matvec:1': 0,
  'add:1': 1,
  'tanh:1': 2,
  'matvec:2': 3,
  'add:2': 4,
  'sigmoid:2': 5,
  'bce:2': 6,
  'bce-grad:2': 7,
  'sigmoid-grad:2': 8,
  'matvec-grad:2': 9,
  'tanh-grad:1': 10,
  'matvec-grad:1': 11,
  'sgd:0': 12,
}

function stepIndexOf(record: StepRecord | null): number | null {
  if (record === null) return null
  const key = `${record.op}:${record.layer}`
  const idx = STEP_INDEX[key]
  return idx === undefined ? null : idx
}

/** Направление потока по фазе шага (контракт e2e 1/2: data-flow корня). */
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

const tensorAt = (t: Tensor | null | undefined, i: number): number | undefined => {
  if (t === null || t === undefined) return undefined
  return t.data[i]
}

const gradAt = (t: Tensor | null | undefined, i: number): number | undefined => {
  if (t === null || t === undefined || t.grad === null) return undefined
  return t.grad[i]
}

/** Числовой индекс из id вида 'W1x[2]' / 'op:tanh[1]' → 2 / 1. */
const idx = (id: string): number => Number(id.slice(id.indexOf('[') + 1, -1))

/** Живое значение звена по id (число доступно, когда операция исполнена). */
function nodeValue(id: string): number | undefined {
  const cursor = run.activeCursor
  const t = cursor.tensors
  const done = run.sampleOpValues
  const dotW1 = (j: number): number | undefined => {
    const x0 = cursor.x.data[0]!
    const x1 = cursor.x.data[1]!
    return run.model.W1.data[j * 2]! * x0 + run.model.W1.data[j * 2 + 1]! * x1
  }
  const dotW2 = (): number | undefined => {
    if (t.a1 === null) return undefined
    let s = 0
    for (let j = 0; j < 3; j++) s += run.model.W2.data[j]! * t.a1.data[j]!
    return s
  }
  switch (id) {
    case 'x[0]':
      return cursor.x.data[0]
    case 'x[1]':
      return cursor.x.data[1]
    case 'y[0]':
      return cursor.y.data[0]
    case 'W1[0]':
    case 'W1[1]':
    case 'W1[2]':
    case 'W1[3]':
    case 'W1[4]':
    case 'W1[5]':
      return run.model.W1.data[idx(id)]
    case 'b1[0]':
    case 'b1[1]':
    case 'b1[2]':
      return run.model.b1.data[idx(id)]
    case 'W2[0]':
    case 'W2[1]':
    case 'W2[2]':
      return run.model.W2.data[idx(id)]
    case 'b2[0]':
      return run.model.b2.data[0]
    case 'W1x[0]':
    case 'W1x[1]':
    case 'W1x[2]':
      return done[0] !== undefined ? dotW1(idx(id)) : undefined
    case 'z1[0]':
    case 'z1[1]':
    case 'z1[2]':
      return done[1] !== undefined ? tensorAt(t.z1, idx(id)) : undefined
    case 'a1[0]':
    case 'a1[1]':
    case 'a1[2]':
      return done[2] !== undefined ? tensorAt(t.a1, idx(id)) : undefined
    case 'W2a1':
      return done[3] !== undefined ? dotW2() : undefined
    case 'z2':
      return done[4] !== undefined ? tensorAt(t.z2, 0) : undefined
    case 'ŷ':
      return done[5] !== undefined ? tensorAt(t.yhat, 0) : undefined
    case 'L':
      return done[6] !== undefined ? tensorAt(t.L, 0) : undefined
    // операции несут значение своего результата
    case 'op:matvec[0]':
    case 'op:matvec[1]':
    case 'op:matvec[2]':
      return nodeValue(`W1x[${idx(id)}]`)
    case 'op:add[0]':
    case 'op:add[1]':
    case 'op:add[2]':
      return nodeValue(`z1[${idx(id)}]`)
    case 'op:tanh[0]':
    case 'op:tanh[1]':
    case 'op:tanh[2]':
      return nodeValue(`a1[${idx(id)}]`)
    case 'op:matvec2':
      return nodeValue('W2a1')
    case 'op:add2':
      return nodeValue('z2')
    case 'op:sigmoid':
      return nodeValue('ŷ')
    case 'op:bce':
      return nodeValue('L')
    default:
      return undefined
  }
}

/** Градиент звена (∂L/∂·) — после соответствующей backward-опы; иначе undefined. */
function nodeGrad(id: string): number | undefined {
  const cursor = run.activeCursor
  const t = cursor.tensors
  const g1 = (k: number): number | undefined => gradAt(run.model.W1, k)
  switch (id) {
    case 'W1[0]':
    case 'W1[1]':
    case 'W1[2]':
    case 'W1[3]':
    case 'W1[4]':
    case 'W1[5]':
      return g1(idx(id))
    case 'b1[0]':
    case 'b1[1]':
    case 'b1[2]':
      return gradAt(run.model.b1, idx(id))
    case 'W2[0]':
    case 'W2[1]':
    case 'W2[2]':
      return gradAt(run.model.W2, idx(id))
    case 'b2[0]':
      return gradAt(run.model.b2, 0)
    case 'x[0]':
      return gradAt(cursor.x, 0)
    case 'x[1]':
      return gradAt(cursor.x, 1)
    case 'W1x[0]':
    case 'W1x[1]':
    case 'W1x[2]':
    case 'z1[0]':
    case 'z1[1]':
    case 'z1[2]':
      return gradAt(t.z1, Number(id.slice(id.indexOf('[') + 1, -1)))
    case 'a1[0]':
    case 'a1[1]':
    case 'a1[2]':
      return gradAt(t.a1, idx(id))
    case 'W2a1':
    case 'z2':
      return gradAt(t.z2, 0)
    case 'ŷ':
      return gradAt(t.yhat, 0)
    // операции несут градиент своего результата
    case 'op:matvec[0]':
    case 'op:matvec[1]':
    case 'op:matvec[2]':
      return nodeGrad(`W1x[${idx(id)}]`)
    case 'op:add[0]':
    case 'op:add[1]':
    case 'op:add[2]':
      return nodeGrad(`z1[${idx(id)}]`)
    case 'op:tanh[0]':
    case 'op:tanh[1]':
    case 'op:tanh[2]':
      return nodeGrad(`a1[${idx(id)}]`)
    case 'op:matvec2':
      return nodeGrad('W2a1')
    case 'op:add2':
      return nodeGrad('z2')
    case 'op:sigmoid':
      return nodeGrad('ŷ')
    case 'op:bce':
      return nodeGrad('L')
    default:
      return undefined
  }
}

/** Куда смотрит клик узла: drill-ref | выбор звена цепи | нет. */
type ClickAction = { kind: 'drill'; ref: string } | { kind: 'link'; segment: 'a1' | 'yhat' | 'L' | 'W' | 'z1' | 'z2'; symbol: string } | null

function clickOf(node: GraphNode): ClickAction {
  if (node.kind === 'op' || node.kind === 'update') {
    switch (node.id) {
      case 'op:tanh[0]':
      case 'op:tanh[1]':
      case 'op:tanh[2]':
        return { kind: 'link', segment: 'a1', symbol: 'tanh' }
      case 'op:matvec[0]':
      case 'op:matvec[1]':
      case 'op:matvec[2]':
        return { kind: 'link', segment: 'z1', symbol: 'W1' }
      case 'op:add[0]':
      case 'op:add[1]':
      case 'op:add[2]':
        return { kind: 'link', segment: 'z1', symbol: 'b1' }
      case 'op:matvec2':
        return { kind: 'link', segment: 'z2', symbol: 'W2' }
      case 'op:add2':
        return { kind: 'link', segment: 'z2', symbol: 'b2' }
      case 'op:sigmoid':
        return { kind: 'link', segment: 'yhat', symbol: 'σ' }
      case 'op:bce':
        return { kind: 'link', segment: 'L', symbol: 'L' }
      case 'op:update':
        return { kind: 'link', segment: 'W', symbol: 'η' }
      default:
        return null
    }
  }
  // drill: входы/метка/параметры и вычисленные значения с drill-рефами
  switch (node.id) {
    case 'x[0]':
    case 'x[1]':
    case 'y[0]':
    case 'W1[0]':
    case 'W1[1]':
    case 'W1[2]':
    case 'W1[3]':
    case 'W1[4]':
    case 'W1[5]':
    case 'b1[0]':
    case 'b1[1]':
    case 'b1[2]':
    case 'W2[0]':
    case 'W2[1]':
    case 'W2[2]':
    case 'b2[0]':
    case 'a1[0]':
    case 'a1[1]':
    case 'a1[2]':
    case 'ŷ':
      return { kind: 'drill', ref: node.id }
    default:
      return null
  }
}

/** aria-метка узла (контракт e2e: биасы — «Биас b1[0] = …»). */
function ariaOf(node: GraphNode, value: number | undefined): string {
  const v = value === undefined ? 'н/д' : formatKey(value)
  if (node.kind === 'update') return 'Обновление весов: W ← W − η·∂L/∂W'
  if (node.kind === 'op') return `Операция ${node.label}`
  if (node.role === 'const') return node.id === 'y[0]' ? `Метка y = ${v}` : `Вход ${node.label} = ${v}`
  if (node.role === 'param') return node.id.startsWith('b') ? `Биас ${node.id} = ${v}` : `Параметр ${node.label} = ${v}`
  return `Значение ${node.label} = ${v}`
}

/** Сабскрипт-содержимое подписи (tspan-фрагменты для вставки внутрь <text>). */
function subLabelContent(text: string): React.ReactNode {
  const m = /^([A-Za-zŷη])(\d)(.*)$/.exec(text)
  if (!m) return text
  return (
    <>
      {m[1]}
      <tspan dy="3" fontSize="72%">
        {m[2]}
      </tspan>
      <tspan dy="-3">{m[3]}</tspan>
    </>
  )
}

/** Подпись с <tspan>-сабскриптом (план Б §5.5: z1 → z₁; портирован из диаграммы). */
function SvgSubLabel({ text, x, y, className }: { text: string; x: number; y: number; className?: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" className={className}>
      {subLabelContent(text)}
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

const nodeById = new Map(GRAPH_NODES.map((n) => [n.id, n]))

/** Точка присоединения ребра к узлу (бок по направлению). */
function anchor(id: string, side: 'left' | 'right'): { x: number; y: number } {
  const n = nodeById.get(id)!
  const isOp = n.kind === 'op'
  const halfW = isOp ? (OP_LABEL_RADIUS[n.label] ?? 14) : NODE_W / 2
  return { x: side === 'right' ? n.x + halfW : n.x - halfW, y: n.y }
}

/** Уровни зума канвы (детерминированные; 0.5–2.0, шаг 0.25). */
const ZOOM_MIN = 0.5
const ZOOM_MAX = 2
const ZOOM_STEP = 0.25

export default function ComputationGraph({ record }: { record: StepRecord | null }) {
  // версия прогона: перерисовка на каждую операцию (параметры мутируются на месте)
  const version = useRunSlice((r) => r.version)
  const selection = useRunSlice((r) => r.selection)
  const [zoom, setZoom] = useState(1)
  const { view } = buildGraph()
  const stepIdx = stepIndexOf(record)
  const activeGroup = stepIdx !== null ? STEP_GROUPS[stepIdx]! : null
  const sel = selection !== null ? geometryOf(selection.segment) : { nodes: new Set<string>(), edges: new Set<string>(), plates: new Set<string>(), biases: new Set<string>() }
  const updateActive = stepIdx === 12

  const runClick = (node: GraphNode): void => {
    const action = clickOf(node)
    if (action === null) return
    if (action.kind === 'drill') run.openDrill(action.ref)
    else run.selectLink(action.segment, action.symbol)
  }

  return (
    <div className="graph-scroll">
      {/* зум: уровни 0.5–2.0 (шаг 0.25, сброс 1); transform на внутренней
          обёртке не ломает скролл (габарит обёртки = масштаб канвы);
          лекционный --diag-scale суммируется, не подменяется */}
      <div className="graph-zoom" role="group" aria-label="Масштаб графа">
        <button type="button" data-testid="graph-zoom-out" className="btn ui-label" aria-label="Уменьшить масштаб" disabled={zoom <= ZOOM_MIN} onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}>
          −
        </button>
        <button type="button" data-testid="graph-zoom-reset" className="btn ui-label" aria-label="Сбросить масштаб" onClick={() => setZoom(1)}>
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" data-testid="graph-zoom-in" className="btn ui-label" aria-label="Увеличить масштаб" disabled={zoom >= ZOOM_MAX} onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}>
          +
        </button>
      </div>
      <div className="graph-zoom-layer" style={{ width: view.w * zoom, height: view.h * zoom }}>
        <svg
          data-testid="architecture-diagram"
          data-version={version}
          data-flow={flowOf(record)}
          data-selection={selection?.segment}
          width={view.w}
          height={view.h}
          viewBox={`0 0 ${view.w} ${view.h}`}
          className="graph-canvas"
          style={{ transform: `scale(${zoom})`, transformOrigin: '0 0' }}
          role="img"
          aria-label="Граф вычислений 2-3-1: константы x и y, параметры W1/b1/W2/b2, операции matvec, add, tanh, σ, BCE и станция обновления весов; внутри звена — живое значение, под звеном — градиент после backward"
        >
        {GRAPH_EDGES.map((e) => {
          const from = anchor(e.from, 'right')
          const to = anchor(e.to, 'left')
          const active = activeGroup?.edges.has(e.id) === true
          const selected = sel.edges.has(e.id)
          const src = nodeById.get(e.from)!
          const fwd = nodeValue(e.from)
          const bwd = nodeGrad(e.from)
          const mx = (from.x + to.x) / 2
          const d = `M ${from.x} ${from.y} C ${mx} ${from.y}, ${mx} ${to.y}, ${to.x} ${to.y}`
          return (
            <g
              key={e.id}
              data-edge={e.id}
              className={`diag-edge-g${e.kind === 'update' ? ' g-edge-update' : ''}${active ? ' active' : ''}${selected ? ' diag-selected' : ''}`}
            >
              <path d={d} className="diag-edge-selcasing" style={{ stroke: 'var(--color-primary)' }} />
              <path d={d} className="diag-edge-casing" style={{ stroke: 'var(--color-tertiary)' }} />
              <path d={d} className="diag-edge" style={{ stroke: fwd !== undefined && fwd < 0 ? 'var(--color-neg)' : 'var(--color-pos)' }} />
              <path d={d} className="diag-flow" />
              {/* hover-тултип рёбра: значения forward/backward источника */}
              <g className="g-tip" transform={`translate(${mx}, ${(from.y + to.y) / 2 - 30})`}>
                <rect x={-78} y={-14} width={156} height={bwd === undefined ? 20 : 34} rx={6} />
                <text y={0} className="g-tip-fwd">
                  {subLabelContent(src.label)} = {fwd === undefined ? 'н/д' : formatKey(fwd)}
                </text>
                {bwd !== undefined && (
                  <text y={14} className="g-tip-bwd">
                    ∂L/∂{src.label} = {formatKey(bwd)}
                  </text>
                )}
              </g>
              <path
                d={d}
                className="diag-hit"
                style={{ stroke: 'transparent', strokeWidth: 14, fill: 'none' }}
                tabIndex={0}
                role="button"
                aria-label={`Ребро ${src.label} → ${nodeById.get(e.to)!.label}`}
              />
            </g>
          )
        })}
        {GRAPH_NODES.map((node) => {
          const active = activeGroup?.nodes.has(node.id) === true
          const selected = sel.nodes.has(node.id)
          const value = nodeValue(node.id)
          const grad = nodeGrad(node.id)
          const action = clickOf(node)
          const clickable = action !== null
          const cls = `g-node g-node-${node.role}${selected ? ' diag-selected' : ''}${active ? ' active' : ''}`
          if (node.kind === 'update') {
            return (
              <g key={node.id} data-node={node.id} className={`g-update${updateActive ? ' active' : ''}${selected ? ' diag-selected' : ''}`}>
                <rect x={node.x - 78} y={node.y - 18} width={156} height={36} rx={10} data-testid="update-station" />
                <text x={node.x} y={node.y + 4} textAnchor="middle" className="g-update-label">
                  W ← W − η·∂L/∂W
                </text>
                <rect
                  x={node.x - 78}
                  y={node.y - 18}
                  width={156}
                  height={36}
                  className="diag-hit"
                  style={{ fill: 'transparent' }}
                  role="button"
                  tabIndex={0}
                  aria-label={ariaOf(node, undefined)}
                  onClick={() => runClick(node)}
                  onKeyDown={onActivate(() => runClick(node))}
                />
              </g>
            )
          }
          if (node.kind === 'op') {
            const r = OP_LABEL_RADIUS[node.label] ?? 14
            return (
              <g key={node.id} data-node={node.id} className={`g-op${selected ? ' diag-selected' : ''}${active ? ' active' : ''}`}>
                <circle cx={node.x} cy={node.y} r={r + 4} className="g-node-selring" />
                <circle cx={node.x} cy={node.y} r={r} />
                <text x={node.x} y={node.y + 3} textAnchor="middle" className="g-op-label">
                  {node.label}
                </text>
                <text x={node.x} y={node.y + r + 12} textAnchor="middle" data-testid="station-value" className="g-node-value">
                  {value === undefined ? 'н/д' : formatKey(value)}
                </text>
                {grad !== undefined && (
                  <text x={node.x} y={node.y + r + 24} textAnchor="middle" data-testid="node-grad" className="node-grad">
                    ∂ = {formatKey(grad)}
                  </text>
                )}
                {clickable && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={r + 5}
                    className="diag-hit"
                    style={{ fill: 'transparent' }}
                    role="button"
                    tabIndex={0}
                    aria-label={ariaOf(node, value)}
                    onClick={() => runClick(node)}
                    onKeyDown={onActivate(() => runClick(node))}
                  />
                )}
              </g>
            )
          }
          return (
            <g key={node.id} data-node={node.id} className={cls}>
              <rect x={node.x - NODE_W / 2} y={node.y - 6} width={NODE_W} height={NODE_H} rx={8} className="g-node-box" />
              <SvgSubLabel text={node.label} x={node.x} y={node.y + 1} className="g-node-label" />
              <text x={node.x} y={node.y + 16} textAnchor="middle" data-testid="station-value" className="g-node-value">
                {value === undefined ? 'н/д' : formatKey(value)}
              </text>
              {grad !== undefined && (
                <text x={node.x} y={node.y + NODE_H + 12} textAnchor="middle" data-testid="node-grad" className="node-grad">
                  ∂ = {formatKey(grad)}
                </text>
              )}
              {clickable && (
                <rect
                  x={node.x - NODE_W / 2 - 3}
                  y={node.y - 9}
                  width={NODE_W + 6}
                  height={NODE_H + 6}
                  className="diag-hit"
                  style={{ fill: 'transparent' }}
                  role="button"
                  tabIndex={0}
                  aria-label={ariaOf(node, value)}
                  onClick={() => runClick(node)}
                  onKeyDown={onActivate(() => runClick(node))}
                />
              )}
            </g>
          )
        })}
        </svg>
      </div>
    </div>
  )
}
