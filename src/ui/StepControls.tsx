import { useEffect } from 'react'
import { player } from '../player/store'

/**
 * Контролы навигации (Interaction Contract): «К началу» / «Назад» / «Шаг»
 * (primary CTA — рамка 2px #E69F00, фон белый). Disabled-границы: «Шаг» на
 * шаге 14 (opacity 50%, cursor not-allowed), «Назад» на шаге 1. Клавиатура:
 * → / Space / PgDn → next, ← / PgUp → prev, Esc → закрыть drill. Смена шага
 * мгновенная, без анимаций (A-8). Focus-ring 2px #0072B2 offset 2px — в CSS.
 */
export default function StepControls({ isFirst, isLast }: { isFirst: boolean; isLast: boolean }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      // Space на сфокусированной кнопке обрабатывает нативный click — не дублируем
      if (event.key === ' ' && event.target instanceof HTMLElement && event.target.tagName === 'BUTTON') return
      switch (event.key) {
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          event.preventDefault()
          player.next()
          break
        case 'ArrowLeft':
        case 'PageUp':
          event.preventDefault()
          player.prev()
          break
        case 'Escape':
          player.closeDrill()
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Навигация по шагам">
      <button
        type="button"
        data-testid="btn-reset"
        className="btn btn-secondary ui-label"
        onClick={() => player.jumpTo(0)}
      >
        К началу
      </button>
      <button
        type="button"
        data-testid="btn-prev"
        className="btn btn-secondary ui-label"
        onClick={player.prev}
        disabled={isFirst}
      >
        Назад
      </button>
      <button
        type="button"
        data-testid="btn-next"
        className="btn btn-primary ui-label"
        onClick={player.next}
        disabled={isLast}
      >
        Шаг
      </button>
    </div>
  )
}
