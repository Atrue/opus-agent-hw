import { cloneElement, useState, type ReactElement } from 'react'
import { createPortal } from 'react-dom'
import {
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from '@floating-ui/react'
import { formatKey } from '../format/numbers'
import type { HintData } from './hintData'
import SubscriptText from './SubscriptText'

/**
 * NumberHint (R5 §4.5) — tier 1 прогрессивного оголения чисел: hover/focus на
 * число/узел/ребро → значение + формула с подстановкой + градиент ∂L/∂sym при
 * наличии (контент — buildHintData из ./numberHint). Клик/Enter по-прежнему
 * открывает полный NumberDrilldown (tier 2 — супермножество); мобильный тап
 * тултип не показывает (useHover игнорирует touch-указатели — тап ведёт сразу
 * в drill, LOCKED-решение R5 §2c к3). ЕДИНАЯ обёртка над @floating-ui/react —
 * изоляция библиотеки для будущей замены (Base UI в Phase 2+): всё Floating UI
 * живёт только в этом файле. Элементы подключаются через elements-опцию (якоря
 * — в т.ч. SVG-элементы, ref-callback'и вызываются в commit, не в рендере).
 */

const GRAD_PREFIX = '∂L/∂'

export default function NumberHint({ hint, children }: { hint: HintData | null; children: ReactElement }) {
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<Element | null>(null)
  const [floatingEl, setFloatingEl] = useState<HTMLDivElement | null>(null)
  const { floatingStyles, context } = useFloating({
    open: open && hint !== null,
    onOpenChange: setOpen,
    placement: 'top',
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    elements: { reference: anchor, floating: floatingEl },
  })
  const hover = useHover(context, { restMs: 60, delay: { open: 120 } })
  const focus = useFocus(context)
  const dismiss = useDismiss(context, { escapeKey: true })
  const role = useRole(context, { role: 'tooltip' })
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role])

  // якорь = сам элемент (value-btn / SVG hit-элемент / ячейка): клонируем с
  // hover/focus-обработчиками и aria-describedby (его ставит useRole('tooltip')
  // на время открытого тултипа); собственные onClick/клавиатура якоря сохраняются
  const anchorProps = getReferenceProps({
    ...(children.props as Record<string, unknown>),
    ref: setAnchor,
  })
  const cloned = cloneElement(children, anchorProps)

  if (hint === null) return children

  return (
    <>
      {cloned}
      {open &&
        createPortal(
          <div
            ref={setFloatingEl}
            style={floatingStyles}
            data-testid="number-hint"
            className="num-hint"
            {...getFloatingProps()}
          >
            <p className="num text-neutral-900">
              <SubscriptText text={hint.sym} /> = {formatKey(hint.value)}
            </p>
            {hint.formula !== null && (
              <p data-testid="hint-formula" className="num text-neutral-900">
                <SubscriptText text={hint.formula} />
              </p>
            )}
            {hint.gradient !== null && (
              <p
                className="num"
                style={{ color: hint.gradient < 0 ? 'var(--color-neg-text)' : 'var(--color-pos-text)' }}
              >
                <SubscriptText text={`${GRAD_PREFIX}${hint.sym}`} /> = {formatKey(hint.gradient)}
              </p>
            )}
            {hint.note !== null && <p className="ui-text text-neutral-500">{hint.note}</p>}
          </div>,
          document.body,
        )}
    </>
  )
}
