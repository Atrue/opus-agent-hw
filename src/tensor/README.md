# src/tensor — изолированная тензорная библиотека (float64)

Собственный reverse-mode autodiff на TypeScript (семантика micrograd,
операции уровня Tensor с PyTorch-именами): forward строит граф, backward
исполняет чистые функции локальных градиентов. Числа — Float64, детерминизм
бит-в-бит (NFR-01/02).

## Публичный вход — только index.ts

Приложение импортирует движок **только** из `./index.ts` (баррел — осознанное
исключение из «1 экспорт на файл»: он и есть публичный вход модуля, D-28).
Deep-импорты внутренних модулей (`tensor/…`) запрещены и enforce'ятся двумя
механизмами:

- oxlint `no-restricted-imports` (`.oxlintrc.json`, паттерны границ);
- CI-тест границ `boundaries.test.ts` (сканирует импорт-спецификаторы).

## Состав

| Файл/папка | Ответственность |
|---|---|
| `index.ts` | единственный публичный вход (баррел) |
| `tensor.ts` | класс Tensor + типы (OpName/BackwardPlan/TensorInit) |
| `backward.ts` | диспетчер обратного шага runBackwardPlan + внутренняя accumulate (D-29) |
| `ops/` | чистые ядра/градиенты ПО ОПЕРАЦИЯМ (matvec/add/tanh/sigmoid/bce — операция и её градиенты в одном файле, зеркально value-ops/; порядок суммирования фиксирован) |
| `value.ts`, `value-ops/` | скалярный Value-контейнер + backward (общий chain rule) и операции-функции с backwardFn внутри (D-34) |
| `functional.ts` | `F.bce` (лосс как план backward) |
| `optim.ts` | SGD |
| `model.ts` | MLP (обобщается до `buildModel(spec)`, D-30) |
| `trace/` | пошаговое исполнение walkthrough: types (типы записи) / walk (маршрут) / cursor (SampleCursor) / io (снапшот-хелперы) |
| `expanders.ts` | ленивые раскрытия drill-down (view над снапшотами чисел) |

Тесты лежат рядом (`*.test.ts`, D-28а); эталон-константы NFR-02 —
`src/run/etalon-constants.ts` (plain-TS, 0 импортов).
