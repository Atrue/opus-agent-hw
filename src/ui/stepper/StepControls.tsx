import { useEffect } from 'react'
import { run } from '../../run/run'
import { useRunSlice } from '../../run/useRunSlice'
import { Button } from '../kit'

/**
 * Контролы прогона (R3, forward-only; redesign — транспорт в шапке):
 * [Сброс] (детерминированный старт, без подтверждения — состояние полностью
 * восстанавливается прогоном), [Запустить эпоху] (fast-forward: весь остаток
 * эпохи пакетно, record:false) и primary CTA: «Шаг» в walkthrough, «Следующая эпоха» на экране эпохи —
 * эпохи бесконечны, «Шаг» никогда не disabled. Перехода назад нет ни кнопкой,
 * ни клавиатурой. Клавиатура: → / Space / PgDn → следующая операция (с экрана
 * эпохи — следующая эпоха), Esc → закрыть drill. Focus-ring — в CSS.
 * Кнопки — kit Button (D-43, трейсер 03-01): variant quiet / default CTA;
 * testid, RU-лейблы и ui-label-типографика не меняются (D-38).
 */
export function StepControls() {
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
      <Button
        type="button"
        variant="quiet"
        data-testid="btn-reset"
        className="ui-label"
        onClick={() => run.reset()}
      >
        Сброс
      </Button>
      {screen === 'walkthrough' && (
        <Button
          type="button"
          variant="quiet"
          data-testid="btn-epoch"
          className="ui-label whitespace-nowrap"
          onClick={() => run.runEpoch()}
        >
          Запустить эпоху
        </Button>
      )}
      {screen === 'epoch-end' ? (
        <Button
          type="button"
          variant="default"
          data-testid="btn-epoch-next"
          className="ui-label"
          onClick={() => run.advance()}
        >
          Следующая эпоха
        </Button>
      ) : (
        <Button
          type="button"
          variant="default"
          data-testid="btn-next"
          className="ui-label"
          onClick={() => run.advance()}
        >
          Шаг
        </Button>
      )}
    </div>
  )
}
