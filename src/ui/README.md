# src/ui — walkthrough-экран

Экран тренажёра: React 19 + SVG (без графовых/анимационных библиотек).
Компоненты — именованные экспорты (D-28б), селекторы e2e (`data-testid`) и
RU-строки UI описывают содержимое экрана и не зависят от имён компонентов (R2).

## Навигационное ядро (D-26)

- **Формула-строка** (`FormulaStrip.tsx`) — полная формула сети сверху; клик
  по символу выбирает звено цепи x→z1→a1→z2→ŷ→L→W.
- **Вычислительный граф** (`ComputationGraph.tsx`, геометрия `compGraph.ts`) —
  подсветка активной op и выбранного звена (linked-highlighting).
- **Панель звена** (`LinkPanel.tsx` + `LinkHistory.tsx`) — ключевые числа
  звена и его per-sample история.
- **Лента шагов** (`StepperBand.tsx`) — горизонтально вверх, автоскролл.

## Состав (основное)

| Файл | Ответственность |
|---|---|
| `App.tsx` | каркас workbench, экраны walkthrough/epoch-end |
| `OperationPanel.tsx` | панель текущей операции (формула, входы/выходы/градиенты) |
| `NumberDrilldown.tsx`, `NumberHint.tsx` | drill-down числа и подсказка |
| `ExamplesPanel.tsx`, `ResultPanel.tsx` | примеры выборки и результат |
| `EpochSummary.tsx`, `LossChart.tsx` | экран эпохи и график лосса |
| `StepControls.tsx` | контролы прогона (Шаг/FF/reset) |
| `chainLinks.ts`, `compGraph.ts`, `operationRows.ts`, `hintData.ts` | чистые модели вида (юнит-тестируемые) |
| `SubscriptText.tsx`, `NarrativeLine.tsx` | типографика (ASCII-индексы → sub-рендер) |

## Дизайн-контракт

DESIGN.md + токены `src/index.css @theme` (D-25): тёмная «приборная» тема,
Space Grotesk / Geist / JetBrains Mono (tabular-nums), Okake-Ito для знака
числа. UI-слой не лезет вглубь движка — только `src/tensor/index.ts` и
публичная поверхность `src/run`.
