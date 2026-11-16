# src/ui — walkthrough-экран

Экран тренажёра: React 19 + SVG (без графовых/анимационных библиотек).
Компоненты — именованные экспорты (D-28б), селекторы e2e (`data-testid`) и
RU-строки UI описывают содержимое экрана и не зависят от имён компонентов (R2).
Структура — подпапки сущностей экрана (D-34, 02-11): домен = папка,
сущность = файл; корень `src/ui/` — только этот README.

## Навигационное ядро (D-26)

- **Формула-строка** (`formula/FormulaStrip.tsx`) — полная формула сети
  сверху; клик по символу выбирает звено цепи x→z1→a1→z2→ŷ→L→W.
- **Вычислительный граф** (`graph/`) — подсветка активной op и выбранного
  звена (linked-highlighting).
- **Панель звена** (`chain/`) — ключевые числа звена и его per-sample
  история.
- **Лента шагов** (`stepper/`) — горизонтально вверх, автоскролл.

## Состав (подпапки сущностей)

| Подпапка | Файлы | Ответственность |
|---|---|---|
| `app/` | `App.tsx` | каркас workbench, экраны walkthrough/epoch-end |
| `stepper/` | `StepperBand.tsx`, `StepControls.tsx` | лента шагов и контролы прогона (Шаг/FF/reset) |
| `formula/` | `FormulaStrip.tsx` | формула-хребет (интерактивные символы → звено) |
| `graph/` | `ComputationGraph.tsx`, `geometry.ts`, `inventory.ts`, `compGraph.test.ts` | вычислительный граф: раскладка (pitch/координаты) + инвентарь (узлы/рёбра/группы) |
| `chain/` | `LinkPanel.tsx`, `LinkHistory.tsx`, `liveValues.ts`, `links.ts`, `symbols.ts`, `geometry.ts`, `chainLinks.test.ts` | звено цепи: панель, per-sample история, живые значения, модель звеньев/символов/подсветки |
| `operation/` | `OperationPanel.tsx`, `operationRows.ts` | панель текущей операции (формула, входы/выходы/градиенты) |
| `numbers/` | `NumberDrilldown.tsx`, `NumberHint.tsx`, `resolve.ts`, `hint.ts` | drill-down числа и подсказка: resolveRef + контент тултипа |
| `dataset/` | `ExamplesPanel.tsx`, `ResultPanel.tsx` | примеры выборки и результат |
| `epoch/` | `EpochSummary.tsx`, `LossChart.tsx` | экран эпохи и график лосса |
| `typography/` | `SubscriptText.tsx`, `NarrativeLine.tsx` | типографика (ASCII-индексы → sub-рендер) |

## Дизайн-контракт

DESIGN.md + токены `src/index.css @theme` (D-25): тёмная «приборная» тема,
Space Grotesk / Geist / JetBrains Mono (tabular-nums), Okake-Ito для знака
числа. UI-слой не лезет вглубь движка — только `src/tensor/index.ts` и
публичная поверхность `src/run`.
