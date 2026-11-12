# src/run — политика прогона

Прогон walkthrough на живом движке (`src/tensor`): студент исполняет операции
по одной, движок считает числа, UI их рендерит.

## Политика прогона

- **Forward-only (R3):** «шаг назад» не существует; reload = честный сброс;
  URL несёт только `#scenario=`.
- **Эпохи бесконечны:** после последней операции эпохи открывается экран
  завершения эпохи; продолжение — следующая эпоха (счётчик +1).
- **Fast-forward:** `runEpoch()` исполняет остаток эпохи пакетно тем же кодом
  исполнения (`cursor.advance()`), что и пошаговый режим, — инвариант
  «пошагово = fast-forward» (бит-идентичность) держится тестами.
- **reset = перезапуск прогона (D-26):** позиция/модель/текущая эпоха — с
  чистого листа, но история сессии (`sampleHistory`, `completedEpochs`) живёт
  до reload; прогоны разделяются `runId`.

## Публичная поверхность

| Модуль | Экспорт | Назначение |
|---|---|---|
| `run.ts` | `run` | единственный синглтон прогона (реактивный корень, R4) |
| `useRunSlice.ts` | `useRunSlice` | селекторный хук поверх `useSyncExternalStore` |
| `trainingRun.ts` | `TrainingRun` | класс прогона (эпохи/FF/reset/история, Set-listeners) |
| `stepRecords.ts` | `buildStepRecord`, `currentPhase`, `firstOpValue`, `flatWeights` | снимки операций в StepRecord |
| `types.ts` | `Mode`, `LinkSelection`, `RunScreen`, `EpochSummaryData`, `Drill`, `SampleRecord`, `StartRecord`, `HistoryRecord`, `isSampleRecord` | типы и guard'ы истории сессии |
| `scenario.ts` | `XOR_SCENARIO`, `SAMPLE_COUNT` | декларативный сценарий (веса, датасет, метаданные ops) |
| `url.ts` | hash-парсер | `#scenario=` |
| `history.ts` | построители серий | график лосса, история звена цепи |
| `etalon-constants.ts` | эталонные константы | plain-TS, 0 импортов (NFR-02) |

Собственные поля `window.*` для состояния не используются (D-33) — стейт
живёт в синглтоне `run`.

## DevTools

Состояние прогона можно инспектировать из консоли dev-режима Vite динамическим
импортом модуля (REPL-строка, не runtime-код):

```js
const { run } = await import('/src/run/run.ts')
run.stepInSample // 1..13
run.model.W2.data // Float64Array живых весов
```

В продакшен-сборке путь модуля иной — используйте breakpoint на `subscribe`
или React DevTools.
