import { type ReactElement } from 'react'
import { formatKey } from '../../format'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../kit'
import type { HintData } from './hint'
import { SubscriptText } from '../typography/SubscriptText'

/**
 * NumberHint (R5 §4.5) — tier 1 прогрессивного оголения чисел: hover/focus на
 * число/узел/ребро → значение + формула с подстановкой + градиент ∂L/∂sym при
 * наличии (контент — buildHintData из ./numberHint). Клик/Enter по-прежнему
 * открывает полный NumberDrilldown (tier 2 — супермножество); мобильный тап
 * тултип не показывает (тап ведёт сразу в drill, LOCKED-решение R5 §2c к3).
 * ЕДИНАЯ обёртка над тултип-механикой — изоляция библиотеки для будущей
 * замены: весь Radix Tooltip живёт только в этом файле и kit/tooltip
 * (вердикт D-40 исполнен 2026-11-19, план 03-03: radix покрыл контракт,
 * @floating-ui/react удалён из dependencies — владелец, delay-200;
 * откат дёшев — вернуть тело на floating отдельным решением).
 *
 * Контракт прежний (PATTERNS §NumberHint): портал в document.body, z-50
 * поверх SVG-графа (D-35 фикс 2), sideOffset 6, flip/shift у краёв
 * (avoidCollisions у radix), hover (delayDuration 200 — пилотное значение,
 * решение владельца 03-03 Task 2) + focus-visible, Esc-dismiss,
 * aria-describedby на якоре (ставит radix), контент идентичен.
 * Разница с floating принята осознанно (OQ 5): restMs-семантика (открытие
 * после ОСТАНОВКИ указателя) не воспроизводится — компенсация delayDuration.
 */

const GRAD_PREFIX = '∂L/∂'

export function NumberHint({ hint, children }: { hint: HintData | null; children: ReactElement }) {
  if (hint === null) return children

  return (
    <TooltipProvider delayDuration={200} disableHoverableContent>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          data-testid="number-hint"
          className="num-hint z-50"
          sideOffset={6}
        >
        <p className="num text-on-surface">
          <SubscriptText text={hint.sym} /> = {formatKey(hint.value)}
        </p>
        {hint.formula !== null && (
          <p data-testid="hint-formula" className="num text-on-surface">
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
        {hint.note !== null && <p className="ui-text text-on-surface-variant">{hint.note}</p>}
      </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
