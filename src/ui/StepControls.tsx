import { useEffect } from 'react'
import { run } from '../run/runState'

/**
 * Контролы прогона (R3, forward-only): [Сброс] (детерминированный старт,
 * без подтверждения — состояние полностью восстанавливается прогоном) и
 * [Шаг →] (primary CTA — рамка 2px #E69F00): каждое нажатие ИСПОЛНЯЕТ
 * следующую операцию живого движка. Перехода назад нет ни кнопкой, ни
 * клавиатурой. Клавиатура: → / Space / PgDn → следующая операция,
 * Esc → закрыть drill. Focus-ring 2px #0072B2 offset 2px — в CSS.
 */
export default function StepControls() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      // Space на сфокусированной кнопке обрабатывает нативный click — не дублируем
      if (event.key === ' ' && event.target instanceof HTMLElement && event.target.tagName === 'BUTTON') return
      switch (event.key) {
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          event.preventDefault()
          run.advance()
          break
        case 'Escape':
          run.closeDrill()
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Управление прогоном">
      <button
        type="button"
        data-testid="btn-reset"
        className="btn btn-secondary ui-label"
        onClick={() => run.reset()}
      >
        Сброс
      </button>
      <button
        type="button"
        data-testid="btn-next"
        className="btn btn-primary ui-label"
        onClick={() => run.advance()}
      >
        Шаг →
      </button>
    </div>
  )
}
