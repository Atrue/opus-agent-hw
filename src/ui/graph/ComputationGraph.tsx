import { useState } from 'react'
import { run } from '../../run/run'
import { useRunSlice } from '../../run/useRunSlice'
import { activeScenario, netShapeOf } from '../../run/scenario'
import type { StepRecord } from '../../tensor'
import { formatKey } from '../../format'
import { fitsValue } from './capacity'
import { NODE_H, NODE_W, buildGraph, type GraphNode } from './geometry'
import { GRAPH_EDGES, GRAPH_NODES, STEP_GROUPS } from './inventory'
import { type FrameBox, FRAME_TITLE_H, frameGeometry, frameOfNode } from './frames'
import { bindingGrad, bindingValue, nodeGrad, nodeHint, nodeValue, renderNodeOf } from './graphHint'
import { Button } from '../kit'
import { NumberHint } from '../numbers/NumberHint'
import { geometryOf } from '../chain/geometry'

/**
 * Граф вычислений (01.2-06, правила владельца; 2.1-01/D-35): диаграмма =
 * буквальный граф движка — сеть без лосса (D-32) и без update-узла
 * (2.1-01: SGD-шаг живёт в панели операции, звене W, формуле-строке и
 * drill-down; на графе — только звенья и операции цепи, рёбра «·» → «+»
 * без промежуточных пересадок).
 * Звено-значение — закруглённый квадрат (константа — белая рамка,
 * параметр — зелёная --color-pos, вычисленное — нейтральная), звено-операция —
 * круг (операции по-элементно); внутри звена — текущее живое значение, после
 * backward-шагов под звеном — градиент (∂L/∂·). Рёбра операнд→оп→результат
 * показывают движение значения; hover — fwd/bwd числа источника. На шаге sgd
 * амбером подсвечиваются параметры (значения обновляются живым прогоном).
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

/** Куда смотрит клик узла: drill-ref | выбор звена цепи | нет (данные спека). */
type ClickAction = { kind: 'drill'; ref: string } | { kind: 'link'; segment: string; symbol: string } | null

function clickOf(node: GraphNode): ClickAction {
  const click = renderNodeOf(node.id)?.click
  if (click === undefined) return null
  if ('drill' in click) return { kind: 'drill', ref: click.drill }
  return { kind: 'link', segment: click.segment, symbol: click.symbol }
}

/** aria-метка узла (контракт e2e: биасы — «Биас b1[0] = …»; роль — по биндингу). */
function ariaOf(node: GraphNode, value: number | undefined): string {
  const v = value === undefined ? 'н/д' : formatKey(value)
  if (node.kind === 'op') return `Операция ${node.label}`
  const b = renderNodeOf(node.id)?.value
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

/** Рамки-нейроны активного сценария (топология статична — как инвентарь). */
const FRAMES: readonly FrameBox[] = frameGeometry()
const NODE_FRAME: ReadonlyMap<string, string> = frameOfNode()

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
  // 2.1-02 (фикс 2): hover/focus hit-ребра открывает его тултип в ВЕРХНЕМ
  // слое SVG (после узлов — paint order) — не перекрывается узлами/звеньями
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)
  // 2.1-03 (фикс 4): коллапс рамок-нейронов — локальный UI-state, по умолчанию
  // все рамки раскрыты; переключение — двойной клик по рамке/блоку или
  // Enter/Space на заголовке рамки (a11y); мгновенно, без transition
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const toggleFrame = (frameId: string): void => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(frameId)) next.delete(frameId)
      else next.add(frameId)
      return next
    })
  }
  const frameBoxById = new Map(FRAMES.map((f) => [f.id, f]))
  /** Якорь ребра с учётом коллапса: член свёрнутой рамки → граница блока. */
  const anchorWithCollapse = (id: string, side: 'left' | 'right'): { x: number; y: number } => {
    const frameId = NODE_FRAME.get(id)
    if (frameId !== undefined && collapsed.has(frameId)) {
      const box = frameBoxById.get(frameId)!
      return { x: side === 'right' ? box.cx + NODE_W / 2 : box.cx - NODE_W / 2, y: box.cy }
    }
    return anchor(id, side)
  }
  const { view } = buildGraph()
  const stepIdx = stepIndexOf(record)
  const activeGroup = stepIdx === null ? null : STEP_GROUPS[stepIdx]!
  const sel = selection === null
    ? { nodes: new Set<string>(), edges: new Set<string>(), plates: new Set<string>(), biases: new Set<string>() }
    : geometryOf(selection.segment)

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
        <Button type="button" size="icon-sm" data-testid="graph-zoom-out" className="ui-label" aria-label="Уменьшить масштаб" disabled={zoom <= ZOOM_MIN} onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}>
          −
        </Button>
        <Button type="button" size="icon-sm" data-testid="graph-zoom-reset" className="ui-label" aria-label="Сбросить масштаб" onClick={() => setZoom(1)}>
          {Math.round(zoom * 100)}%
        </Button>
        <Button type="button" size="icon-sm" data-testid="graph-zoom-in" className="ui-label" aria-label="Увеличить масштаб" disabled={zoom >= ZOOM_MAX} onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}>
          +
        </Button>
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
          aria-label={`Граф вычислений ${netShapeOf(activeScenario())}: константы x, параметры W и b, операции слоёв; внутри звена — живое значение, под звеном — градиент после backward`}
        >
        {/* рамки-нейроны (2.1-03): фон-контейнер ПОД рёбрами и узлами;
            двойной клик по рамке — коллапс, заголовок — кнопка (a11y) */}
        {FRAMES.map((f) => {
          const isCollapsed = collapsed.has(f.id)
          return (
            <g key={f.id} data-frame={f.id} data-collapsed={isCollapsed ? 'true' : undefined}>
              <rect
                x={f.x}
                y={f.y}
                width={f.w}
                height={f.h}
                rx={10}
                className="g-frame-box"
                onDoubleClick={() => toggleFrame(f.id)}
              />
              <rect
                x={f.x}
                y={f.y - FRAME_TITLE_H}
                width={Math.max(f.w, 96)}
                height={FRAME_TITLE_H}
                className="g-frame-title-hit"
                role="button"
                tabIndex={0}
                aria-expanded={isCollapsed ? 'true' : 'false'}
                aria-label={`${f.title}: ${isCollapsed ? 'раскрыть' : 'свернуть'} (двойной клик)`}
                onClick={() => toggleFrame(f.id)}
                onKeyDown={onActivate(() => toggleFrame(f.id))}
              />
              <text x={f.x + 6} y={f.y - 4} className="g-frame-title">
                {f.title}
              </text>
            </g>
          )
        })}
        {GRAPH_EDGES.map((e) => {
          const fromFrame = NODE_FRAME.get(e.from)
          const toFrame = NODE_FRAME.get(e.to)
          // внутренние рёбра свёрнутой рамки не рисуются (содержимое скрыто)
          if (fromFrame !== undefined && fromFrame === toFrame && collapsed.has(fromFrame)) return null
          const from = anchorWithCollapse(e.from, 'right')
          const to = anchorWithCollapse(e.to, 'left')
          const active = activeGroup?.edges.has(e.id) === true
          const selected = sel.edges.has(e.id)
          const src = nodeById.get(e.from)!
          const fwd = nodeValue(e.from)
          const mx = (from.x + to.x) / 2
          const d = `M ${from.x} ${from.y} C ${mx} ${from.y}, ${mx} ${to.y}, ${to.x} ${to.y}`
          return (
            <g
              key={e.id}
              data-edge={e.id}
              className={`diag-edge-g${active ? ' active' : ''}${selected ? ' diag-selected' : ''}`}
            >
              <path d={d} className="diag-edge-selcasing" style={{ stroke: 'var(--color-primary)' }} />
              <path d={d} className="diag-edge-casing" style={{ stroke: 'var(--color-tertiary)' }} />
              <path d={d} className="diag-edge" style={{ stroke: fwd !== undefined && fwd < 0 ? 'var(--color-neg)' : 'var(--color-pos)' }} />
              <path d={d} className="diag-flow" />
              <path
                d={d}
                className="diag-hit"
                style={{ stroke: 'transparent', strokeWidth: 14, fill: 'none' }}
                tabIndex={0}
                role="button"
                aria-label={`Ребро ${src.label} → ${nodeById.get(e.to)!.label}`}
                onMouseEnter={() => setHoveredEdge(e.id)}
                onMouseLeave={() => setHoveredEdge(null)}
                onFocus={() => setHoveredEdge(e.id)}
                onBlur={() => setHoveredEdge(null)}
              />
            </g>
          )
        })}
        {GRAPH_NODES.map((node) => {
          // члены свёрнутой рамки скрыты — вместо них коллапс-блок (ниже)
          const nodeFrame = NODE_FRAME.get(node.id)
          if (nodeFrame !== undefined && collapsed.has(nodeFrame)) return null
          const active = activeGroup?.nodes.has(node.id) === true
          const selected = sel.nodes.has(node.id)
          const value = nodeValue(node.id)
          const grad = nodeGrad(node.id)
          const action = clickOf(node)
          const clickable = action !== null
          const cls = `g-node g-node-${node.role}${selected ? ' diag-selected' : ''}${active ? ' active' : ''}`
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
              {/* квадрат 1:1 (2.1-02, фикс 5): метка сверху, значение внутри;
                  не влезло (fitsValue) — значение НАД блоком, блок не растягивается */}
              <rect x={node.x - NODE_W / 2} y={node.y - NODE_H / 2} width={NODE_W} height={NODE_H} rx={8} className="g-node-box" />
              <SvgSubLabel text={node.label} x={node.x} y={node.y - 8} className="g-node-label" />
              {value !== undefined && fitsValue(formatKey(value)) ? (
                <text x={node.x} y={node.y + 12} textAnchor="middle" data-testid="station-value" className="g-node-value">
                  {formatKey(value)}
                </text>
              ) : (
                <text
                  x={node.x}
                  y={value === undefined ? node.y + 12 : node.y - NODE_H / 2 - 8}
                  textAnchor="middle"
                  data-testid="station-value"
                  className={value === undefined ? 'g-node-value' : 'g-node-value g-node-value-over'}
                >
                  {value === undefined ? 'н/д' : formatKey(value)}
                </text>
              )}
              {grad !== undefined && (
                <text x={node.x} y={node.y + NODE_H / 2 + 14} textAnchor="middle" data-testid="node-grad" className="node-grad">
                  ∂ = {formatKey(grad)}
                </text>
              )}
              {clickable && (
                <NumberHint hint={nodeHint(node.id)}>
                  <rect
                    x={node.x - NODE_W / 2 - 3}
                    y={node.y - NODE_H / 2 - 3}
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
                </NumberHint>
              )}
            </g>
          )
        })}
        {/* коллапс-блоки свёрнутых рамок (2.1-03): квадратный блок-нейрон —
            имя + живое z (выход взвешенной суммы); последующие вычисления
            (z, σ, ŷ) остаются на графе — цепь читается x → n → z → σ → ŷ;
            клик — drill, двойной клик/заголовок — раскрытие */}
        {FRAMES.filter((f) => collapsed.has(f.id)).map((f) => {
          const frame = activeScenario().render.frames.find((fr) => fr.id === f.id)!
          const value = bindingValue(frame.output)
          const grad = bindingGrad(frame.output)
          return (
            <g key={`block:${f.id}`} data-node={f.id} data-testid="frame-block" className="g-frame-block">
              <rect x={f.cx - NODE_W / 2} y={f.cy - NODE_H / 2} width={NODE_W} height={NODE_H} rx={8} className="g-node-box" />
              <SvgSubLabel text={f.id} x={f.cx} y={f.cy - 8} className="g-node-label" />
              <text x={f.cx} y={f.cy + 12} textAnchor="middle" data-testid="station-value" className="g-node-value">
                {value === undefined ? 'н/д' : formatKey(value)}
              </text>
              {grad !== undefined && (
                <text x={f.cx} y={f.cy + NODE_H / 2 + 14} textAnchor="middle" data-testid="node-grad" className="node-grad">
                  ∂ = {formatKey(grad)}
                </text>
              )}
              <rect
                x={f.cx - NODE_W / 2 - 3}
                y={f.cy - NODE_H / 2 - 3}
                width={NODE_W + 6}
                height={NODE_H + 6}
                className="diag-hit"
                style={{ fill: 'transparent' }}
                role="button"
                tabIndex={0}
                aria-label={`${f.title} свёрнут: значение ${value === undefined ? 'н/д' : formatKey(value)}; двойной клик раскрывает`}
                onClick={() => run.openDrill(frame.drill)}
                onDoubleClick={() => toggleFrame(f.id)}
                onKeyDown={onActivate(() => toggleFrame(f.id))}
              />
            </g>
          )
        })}
        {/* 2.1-02 (фикс 2): верхний слой тултипов рёбер — ПОСЛЕ узлов
            (SVG paint order), не перекрывается узлами/звеньями; видимость —
            hoveredEdge (hover/focus hit-ребра) */}
        <g className="g-tip-layer" data-testid="g-tip-layer">
          {GRAPH_EDGES.map((e) => {
            if (hoveredEdge !== e.id) return null
            const from = anchorWithCollapse(e.from, 'right')
            const to = anchorWithCollapse(e.to, 'left')
            const src = nodeById.get(e.from)!
            const fwd = nodeValue(e.from)
            const bwd = nodeGrad(e.from)
            const mx = (from.x + to.x) / 2
            return (
              <g key={e.id} className="g-tip visible" transform={`translate(${mx}, ${(from.y + to.y) / 2 - 30})`}>
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
            )
          })}
        </g>
        </svg>
      </div>
    </div>
  )
}
