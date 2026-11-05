import { useEffect } from 'react'
import { run, useRunSlice } from '../run/runState'

/**
 * Контролы прогона (R3, forward-only; redesign — транспорт в шапке):
 * [Сброс] (детерминированный старт, без подтверждения — состояние полностью
 * восстанавливается прогоном), [Запустить эпоху] (fast-forward: весь остаток
 * эпохи пакетно, record:false) и primary CTA: «Шаг» в walkthrough, «Следующая эпоха» на экране эпохи —
 * эпохи бесконечны, «Шаг» никогда не disabled. Перехода назад нет ни кнопкой,
 * ни клавиатурой. Клавиатура: → / Space / PgDn → следующая операция (с экрана
 * эпохи — следующая эпоха), Esc → закрыть drill. Focus-ring — в CSS.
 */
export default function StepControls() {
  const screen = useRunSlice((r) => r.screen)

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
        className="btn ui-label"
        onClick={() => run.reset()}
      >
        Сброс
      </button>
      {screen === 'walkthrough' && (
        <button
          type="button"
          data-testid="btn-epoch"
          className="btn ui-label whitespace-nowrap"
          onClick={() => run.runEpoch()}
        >
          Запустить эпоху
        </button>
      )}
      {screen === 'epoch-end' ? (
        <button
          type="button"
          data-testid="btn-epoch-next"
          className="btn btn-primary ui-label"
          onClick={() => run.advance()}
        >
          Следующая эпоха
        </button>
      ) : (
        <button
          type="button"
          data-testid="btn-next"
          className="btn btn-primary ui-label"
          onClick={() => run.advance()}
        >
          Шаг
        </button>
      )}
    </div>
  )
}
