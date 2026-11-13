import { useState } from 'react'
import { run } from '../run/run'
import { useRunSlice } from '../run/useRunSlice'
import { activeScenario, netShapeOf, type NodeBinding, type RenderNode } from '../run/scenario'
import type { SampleCursor, StepRecord, Tensor } from '../tensor'
import { formatKey } from '../format/numbers'
import { GRAPH_EDGES, GRAPH_NODES, NODE_H, NODE_W, STEP_GROUPS, buildGraph, type GraphNode } from './compGraph'
import { geometryOf } from './chainLinks'

/**
 * Граф вычислений (01.2-06, правила владельца): диаграмма = буквальный граф
 * движка — сеть без лосса (D-32: функция потерь не изображается на графе;
 * числа лосса живут в панели звена L, формуле-строке и экране эпохи).
 * Звено-значение — закруглённый квадрат (константа — белая рамка,
 * параметр — зелёная --color-pos, вычисленное — нейтральная), звено-операция —
 * круг (операции по-элементно); внутри звена — текущее живое значение, после
 * backward-шагов под звеном — градиент (∂L/∂·). Рёбра операнд→оп→результат
 * показывают движение значения; hover — fwd/bwd числа источника. После
 * backward — ЯВНАЯ update-станция «W ← W − η·∂L/∂W» (одна), рёбра ко всем
 * параметрам; на шаге sgd станция активна, параметры обновляются.
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

const OP_LABEL_RADIUS: Record<string, number> = { tanh: 17, σ: 15 }


/** Индекс шага ленты — index записи (walked-опа спека; для STEP_GROUPS). */
function stepIndexOf(record: StepRecord | null): number | null {
  return record === null ? null : record.index
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

/** Тензор слота сэмпла по биндингу (zPre/zPost/h по слою; L — скаляр лосса). */
function tensorOf(cursor: SampleCursor, b: NodeBinding): Tensor | null | undefined {
  if (b.kind !== 'tensor') return undefined
  return b.slot === 'L' ? cursor.tensors.L : cursor.tensors[b.slot][b.layer]
}

/** Живое значение по биндингу (гейт: число доступно, когда операция шага
 *  исполнена в текущем сэмпле — done[step] !== undefined). */
function bindingValue(b: NodeBinding): number | undefined {
  const cursor = run.activeCursor
  switch (b.kind) {
    case 'input':
      return cursor.x.data[b.index]
    case 'target':
      return cursor.y.data[0]
    case 'weight':
      return run.model.weights[b.layer]!.data[b.index]
    case 'bias':
      return run.model.biases[b.layer]!.data[b.index]
    case 'tensor': {
      if (b.step !== undefined && run.sampleOpValues[b.step] === undefined) return undefined
      const t = tensorOf(cursor, b)
      return t === null || t === undefined ? undefined : t.data[b.index]
    }
    case 'dot': {
      if (run.sampleOpValues[b.step] === undefined) return undefined
      const src: Tensor | null = b.layer === 0 ? cursor.x : cursor.tensors.h[b.layer - 1] ?? null
      if (src === null) return undefined
      const w = run.model.weights[b.layer]!
      const cols = src.data.length
      let acc = 0
      for (let i = 0; i < cols; i++) acc += w.data[b.row * cols + i]! * src.data[i]!
      return acc
    }
  }
}

/** Градиент ∂L/∂· по биндингу — после соответствующей backward-опы; иначе undefined. */
function bindingGrad(b: NodeBinding): number | undefined {
  const cursor = run.activeCursor
  const g = (t: Tensor | null | undefined, i: number): number | undefined =>
    t === null || t === undefined || t.grad === null ? undefined : t.grad[i]
  switch (b.kind) {
    case 'input':
      return g(cursor.x, b.index)
    case 'target':
      return undefined
    case 'weight':
      return g(run.model.weights[b.layer]!, b.index)
    case 'bias':
      return g(run.model.biases[b.layer]!, b.index)
    case 'tensor':
      return g(tensorOf(cursor, b), b.index)
    case 'dot':
      return g(b.layer === 0 ? cursor.tensors.zPost[0] : cursor.tensors.zPost[b.layer], b.row)
  }
}

/** Спека-узел по id графа (биндинги живых чисел и клика — данные рендера). */
const renderNodeById = new Map<string, RenderNode>(activeScenario().render.nodes.map((n) => [n.id, n]))

/** Живое значение звена (число доступно, когда операция исполнена). */
function nodeValue(id: string): number | undefined {
  const rn = renderNodeById.get(id)
  return rn?.value === undefined ? undefined : bindingValue(rn.value)
}

/** Градиент звена (∂L/∂·) — после соответствующей backward-опы; иначе undefined. */
function nodeGrad(id: string): number | undefined {
  const rn = renderNodeById.get(id)
  return rn?.grad === undefined ? undefined : bindingGrad(rn.grad)
}

/** Куда смотрит клик узла: drill-ref | выбор звена цепи | нет (данные спека). */
type ClickAction = { kind: 'drill'; ref: string } | { kind: 'link'; segment: string; symbol: string } | null

function clickOf(node: GraphNode): ClickAction {
  const click = renderNodeById.get(node.id)?.click
  if (click === undefined) return null
  if ('drill' in click) return { kind: 'drill', ref: click.drill }
  return { kind: 'link', segment: click.segment, symbol: click.symbol }
}

/** aria-метка узла (контракт e2e: биасы — «Биас b1[0] = …»; роль — по биндингу). */
function ariaOf(node: GraphNode, value: number | undefined): string {
  const v = value === undefined ? 'н/д' : formatKey(value)
  if (node.kind === 'update') return 'Обновление весов: W ← W − η·∂L/∂W'
  if (node.kind === 'op') return `Операция ${node.label}`
  const b = renderNodeById.get(node.id)?.value
  if (b?.kind === 'target') return `Метка y = ${v}`
  if (node.role === 'const') return `Вход ${node.label} = ${v}`
  if (b?.kind === 'bias') return `Биас ${node.id} = ${v}`
  if (node.role === 'param') return `Параметр ${node.label} = ${v}`
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

export function ComputationGraph({ record }: { record: StepRecord | null }) {
  // версия прогона: перерисовка на каждую операцию (параметры мутируются на месте)
  const version = useRunSlice((r) => r.version)
  const selection = useRunSlice((r) => r.selection)
  const [zoom, setZoom] = useState(1)
  const { view } = buildGraph()
  const stepIdx = stepIndexOf(record)
  const activeGroup = stepIdx === null ? null : STEP_GROUPS[stepIdx]!
  const sel = selection === null
    ? { nodes: new Set<string>(), edges: new Set<string>(), plates: new Set<string>(), biases: new Set<string>() }
    : geometryOf(selection.segment)
  const updateActive = stepIdx === STEP_GROUPS.length - 1

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
          aria-label={`Граф вычислений ${netShapeOf(activeScenario())}: константы x, параметры W и b, операции слоёв и станция обновления весов; внутри звена — живое значение, под звеном — градиент после backward`}
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
