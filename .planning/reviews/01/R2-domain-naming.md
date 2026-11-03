# R2 — Доменная модель и словарь нейминга (ревью фазы 01)

**Дата:** 2026-11-03
**Тип:** архитектурное ревью (ресёрч, без кода)
**Вход:** направление пользователя — «player/плеер не подходит для обучения, используй другие названия и разбивай на смысловые блоки: тензор, операция, функции потерь, градиент, модель, и состояние текущего прогона: эпоха, шаг и прочее»
**Объект:** `src/player/` (PlayerState/PlayerAction/transition/urlState), UI (StepPanel/StepControls/…), данные (MockTrace/TraceStep), тесты/e2e.

---

## 1. Диагноз: где живёт «плеер» и где его нет

Фактический аудит встречаемости (rg по `player|Player|плеер`):

| Слой | Статус | Детали |
|---|---|---|
| UI-строки (RU-копирайт) | **чисто** | Ни одной строки с «плеер»: «Шаг», «Назад», «К началу», «Шаг N из 14», «Лекционный режим», «сводка», «← к шагу» |
| e2e-селекторы (data-testid, data-ref) | **чисто** | `step-indicator`, `step-panel`, `step-formula`, `btn-next/prev/reset`, `phase-badge`, `toggle-lecture`, `drill-*`; data-ref — символьные (`∂L/∂W2[0]`) |
| JSON-трейс (`xor-trace.json`) | **чисто** | Поля: `schemaVersion, scenario, seed, network{loss,lr,…}, steps[].op/phase/…, final, gradCheck` |
| Код | **загрязнено** | `src/player/` — 3 файла; `PlayerState/PlayerAction/player/usePlayer` ≈ 45 вхождений в 10 файлах |
| Док-комментарии и `.planning/` | **загрязнено** | Заголовки в store.ts, UI-SPEC («UI-плеер»), ARCHITECTURE.md («pure player»), SUMMARY/RESEARCH |

**Вывод 1.** Грех «плеера» — кодовый и документационный, не продуктовый. Пользовательский интерфейс переименовывать не нужно: слово «Шаг» — это не плеерная метафора, а единица исполнения из DOCS-01 («пользователь нажимает „Шаг“», «шаг N из M»). Позиция в маршруте = слово студента.

**Вывод 2.** Плеерная метафора лжёт дважды: (а) пассивное воспроизведение против активного исполнения («пользователь сам исполняет шаги обучения», VP); (б) `player` как объект-агент вообще не нужен — в рантайме ничего не исполняется, состояние = чистая функция над `(trace, stepIndex)` (Pattern 1). Исполнитель шагов — человек; коду агент не положен.

---

## 2. Критерии оценки (из направления)

1. **Словарь студента** — как в курсах DL: epoch / step / forward / backward / loss / grad / lr; op-уровень как в micrograd/CS231n.
2. **Absence of "player"** — полное исчезновение из кода; в доках — по возможности.
3. **Минимизация хрома в UI** — 0 новых интерфейсных слов; никаких «Сессия», «Прогон», «Эксперимент» на экране.
4. **Ложь-минимум** — имя не обещает того, чего нет: не «Trainer» (никто не обучает автоматически), не «Experiment» (нет свободы параметров), не «Execution» (пользователь не исполнитель машинный), не `epoch` в состоянии прототипа с одним проходом.

Дополнительный критерий (архитектурный): **преемственность к Phase 2** — переименование должно снять, а не создать работу на фазу 2 (структура `engine/trace/…` из ARCHITECTURE.md).

---

## 3. Целевая доменная модель (семантические блоки)

Разбиение по направлению пользователя — шесть блоков, каждый со своим словом:

| Блок | Понятие | Где данные сейчас | Куда движется (Phase 2) |
|---|---|---|---|
| **Тензор** | значения + форма + символ | `TensorValues`, `TensorRef`, `StepIO` в player/types.ts | `engine/tensor.ts` (живые тензоры движка) |
| **Операция** | op-узел графа: matvec/add/tanh/sigmoid/bce/sgd (+`-grad`) | строка `step.op` (11 фактических значений JSON) | `engine/ops.ts`, `model/mlp.ts` |
| **Функция потерь** | bce → ce | `network.loss: 'bce'`, фаза `loss` | `engine/loss.ts` |
| **Градиент** | ∂L/∂· | `step.grads: Record<sym, TensorValues>` | `engine/grad.ts` (backward-замыкания) |
| **Модель** | MLP 2-3-1, слои, веса | `trace.network`, `trace.weights` | `model/mlp.ts` + `scenarios/*.json` |
| **Состояние прогона** | курсор: шаг, (эпоха), фаза, drill, режим | `PlayerState` | `run/store.ts`: `RunState` + селекторы |

Ключевое правило модели: **состояние — это курсор; всё остальное — производные**. `epoch`, `stepInEpoch`, `phase`, позиция «N из M» никогда не хранятся, а выводятся селекторами из `(RunTrace, stepIndex)`. Это уже философия текущего store.ts («производные значения не хранятся в сторе») и ARCHITECTURE §4 («Derived, never stored»). Хранить эпоху в стейте — дублировать источник истины и создать риск рассинхрона.

---

## 4. Варианты нейминга

### Вариант A. Учебно-тренировочная метафора: `TrainingSession / Trainer / Run`

**Структура:**
```
src/engine/tensor.ts, src/engine/ops.ts, src/engine/loss.ts, src/model/mlp.ts   # домен
src/training/session.ts   # TrainingSessionState {epoch, stepInEpoch, totalSteps, phase}
src/training/trainer.ts   # Trainer: next/prev/jumpTo (исполнитель шагов)
src/training/urlState.ts
src/trace/run-trace.ts    # TrainingRun (запись прогона)
```
**Ключевые типы:** `TrainingSessionState { epoch, stepInEpoch, totalSteps, phase, drill, mode }`; `Trainer.next()`.
**Переименования:** player → trainer; MockTrace → TrainingRun; StepPanel → TrainingStepPanel.
**RU-подписи:** «Эпоха N из M · Шаг K из L» сразу в хедере; CTA «Шаг» остаётся.

**Оценка.** Словарь студента — «полный попадание» (epoch/step). Но агентные имена проваливают ложь-минимум: **Trainer лжёт** — тренажёр не обучает сеть, шаги исполняет пользователь; **learner тем более** — в DL «learner» читается как обучаемая система, а не роль пользователя. «TrainingSession» скрещивает два понятия (сессия пользователя и training run) и обещает живой цикл обучения, которого в Phase 1 нет. Если убрать агентов и оставить `Run/SessionState` — вариант A вырождается в вариант D. **Частично принять:** словарь epoch/step, слово `Run`.

### Вариант B. Лабораторная метафора: `Lab / Experiment / Session`

**Структура:**
```
src/lab/experiment.ts   # ExperimentState {epoch, step, phase}
src/lab/session.ts      # LabSession (курсор)
src/lab/cursor.ts, src/lab/url.ts
src/trace/experiment-log.ts  # ExperimentLog (вместо RunTrace)
```
**Ключевые типы:** `ExperimentState`, `LabSession`; селектор `selectExperimentPosition`.
**Переименования:** player → lab/session; MockTrace → ExperimentLog; StepPanel → ObservationPanel?
**RU-подписи:** «Эксперимент N», «Далее» вместо «Шаг», заголовок «Лаборатория: XOR».

**Оценка.** Максимальная ложь: «Experiment» обещает свободное экспериментирование — крутить lr, сравнивать прогоны, перезапускать — это R2+ (конструктор), в v1 сценарии детерминированы и зафиксированы. «Lab» — хром, не домен. Терминологический конфликт: «лабораторные сценарии» уже заняты в стратегии как B2B2C-канал (методический формат встраивания в курсы), а не как архитектурный блок. Словарь студента-механика (grad/step/backward) растворяется в «научной атмосфере». UI получает +3 новых слова (нарушение критерия 3). **Отвергнуть.**

### Вариант C. Вычислительно-графовая: `Run / Execution / TraceCursor`

**Структура:**
```
src/trace/run-trace.ts    # RunTrace, TraceStep (как в ARCHITECTURE.md)
src/run/cursor.ts         # TraceCursor {index}, ExecutionReader
src/run/execution.ts      # переходы executionNext/executionPrev
```
**Ключевые типы:** `TraceCursor { stepIndex }`, `RunTrace`, `ExecutionFrame`.
**Переименования:** player → cursor; MockTrace → RunTrace; StepControls → CursorControls.
**RU-подписи:** «Шаг N из 14» остаётся (курсор в UI не показываем).

**Оценка.** Максимально честно к механизму (Pattern 1 — deterministic replay, курсор над иммутабельной лентой) и дёшево. Но это словарь программиста, не студента: «Execution», «Cursor» не встречаются в курсах DL и не описывают обучение; как продуктовая доменная модель проваливает критерий 1. **Принять внутрь:** `RunTrace` (уже термин ARCHITECTURE.md), курсорная семантика состояния. **Отвергнуть как витрину:** Execution/TraceCursor.

### Вариант D (рекомендация). «Словарь студента + прогон»: слоистый нейминг без агентов

Слои, у каждого — свой источник слов; никаких синонимов-дублей между слоями:

- **Домен и UI — словарь студента (DL-курс):** tensor, op, loss, grad, model, scenario, forward/backward/update, epoch, step, lr. Видимые пользователю термины — только отсюда.
- **Состояние прогона — «прогон» = `Run`:** `RunTrace` (запись прогона), `RunState` (курсор пользователя), `useRunState`. `Run` — стандартное слово инструментария вокруг обучения (TensorBoard/MLflow «runs»), студент встретит его в практике; при этом в UI не показывается.
- **Продуктовый уровень (доки) — «walkthrough» / «прохождение сценария»** остаётся термином требований и North Star, не кода.

**Структура (Phase 1 — засеянные файлы; Phase 2 — дорастает до ARCHITECTURE):**
```
src/
├── engine/                 # ЧИСТЫЙ домен вычислений (зависимости: никуда)
│   ├── tensor.ts           # СЕЙЧАС: TensorValues, TensorRef, StepIO (view-типы трейса)
│   ├── ops.ts              # Phase 2: op-узлы matvec/add/tanh/sigmoid (+*-grad)  [резерв]
│   ├── loss.ts             # СЕЙЧАС: LossKind = 'bce';  Phase 2: реализации
│   └── grad.ts             # СЕЙЧАС: GradMap;  Phase 2: backward-замыкания
├── model/
│   └── mlp.ts              # Phase 2: MLP + LayerSpec  [резерв; сейчас NetworkSpec в trace]
├── trace/
│   └── run-trace.ts        # RunTrace, TraceStep, Phase, NetworkSpec, validateTrace
├── run/                    # состояние текущего прогона (бывший player/)
│   ├── store.ts            # RunState, RunAction, transition, clampStepIndex,
│   │                       #   действия-функции, useRunState, селекторы
│   └── url.ts              # parseHash/toHash (#step=N&mode=lecture — контракт не меняется)
├── ui/                     # render-only
│   ├── App.tsx
│   ├── OperationPanel.tsx  # экс-StepPanel: показывает ОПЕРАЦИЮ шага (DOCS-02)
│   ├── operationRows.ts    # экс-stepRows.ts: buildOperationRows
│   ├── StepControls.tsx    # БЕЗ изменения: навигация по ШАГАМ (позиция)
│   ├── NumberDrilldown.tsx, ArchitectureDiagram.tsx, NarrativeLine.tsx, SubscriptText.tsx
├── format/numbers.ts
└── data/xor-trace.json     # Phase 2: scenarios/xor.json + живой движок
```
Файлы `[резерв]` **не создаются пустыми сейчас** (ложь-минимум applies to files too) — блок фиксируется в документации и глоссарии; засеиваются только файлы с реальными типами (tensor.ts, loss.ts, grad.ts, run-trace.ts).

**Ключевые типы:**
```ts
// run/store.ts — состояние = курсор; epoch/фаза НЕ хранятся
export interface RunState {
  stepIndex: number          // 0..M-1 по RunTrace.steps
  drill: Drill | null
  mode: Mode                 // 'default' | 'lecture'
}
export type RunAction =
  | { type: 'next' } | { type: 'prev' } | { type: 'jumpTo'; index: number }
  | { type: 'openDrill'; ref: string } | { type: 'closeDrill' } | { type: 'toggleMode' }

// Производные (селекторы), а не поля состояния:
selectStep(s): TraceStep
selectPhase(s): Phase                                   // = step.phase
selectPosition(s): string                               // «Шаг N из M»
selectEpochPosition(s): string | null                   // «Эпоха N из M» — только
                                                        // когда RunTrace объявляет epochs > 1 (Phase 2+)
// Phase 2, когда придут многo-эпоховые трейсы, — без изменения RunState:
//   epoch = floor(stepIndex / stepsPerEpoch) + 1 и т.д. — чистая функция над трейсом
```
Обоснование отклонения `SessionState {epoch, stepInEpoch, totalSteps, phase}` как *хранимой* структуры: в Phase 1 трейс = один проход по одному сэмплу — поля `epoch/totalSteps/phase` были бы мёртвым хромом в состоянии и нарушением «derived, never stored»; к моменту многo-эпоховых сценариев те же величины возвращаются селекторами, а URL-контракт (`#step=N`, глобальный индекс) не придётся ломать.

**Действия — функции, не агентный объект:** вместо `player.next()` — именованные экспорты `nextStep() / prevStep() / jumpToStep(i) / openDrill(ref) / closeDrill() / toggleLectureMode()`. Убирает последнее агентное имя; читается как «выполни шаг» (активная форма, ровно по VP).

**Переименования существующего:** `player → run/` (модуль); `MockTrace → RunTrace` (мок — свойство *источника данных* — `src/data/xor-trace.json` от Python-генератора, а не типа; имя типа, наоборот, должно совпасть с Phase 2, чтобы «мок-JSON заменяется живым RunTrace без правок UI» случился буквально без правок); `StepPanel → OperationPanel` — панель показывает уровень «операция» из иерархии DOCS-02, а «шаг» остаётся строго позицией маршрута (индикатор + CTA + StepControls). Разводит два понятия, которые сейчас слились.

**RU-подписи:**
- «Шаг» (CTA), «Назад», «К началу», «Шаг N из 14», «Лекционный режим», бейджи `forward/loss/backward/update/«сводка»`, «← к шагу», заголовок «XOR — backprop за 14 шагов» — **все остаются** (0 правок копирайта, UI-SPEC Copywriting Contract не трогается).
- «Эпоха N из M» — **появится позже**, только когда трейс реально многo-эпоховый (вероятный формат: «Эпоха 2 из 4 · Шаг 7 из 14» рядом с текущим индикатором; финальный формат — решение UI-SPEC фазы 2). В Phase 1 не показываем: прототип честно = один проход.

---

## 5. Сравнительная таблица

| Критерий | A. Training | B. Lab | C. Graph | **D. Гибрид (рек.)** |
|---|---|---|---|---|
| Словарь студента | ++ | − | − (словарь программиста) | ++ |
| Отсутствие «player» | + | + | + | + |
| Минимум UI-хрома | + | −− (новые слова на экране) | + | **++ (0 новых строк)** |
| Ложь-минимум | −− (Trainer/Learner лгут об исполнителе; TrainingSession обещает live-цикл) | −−− (Experiment = свобода, которой нет) | + код / − продукт | ++ |
| Преемственность Phase 2 (ARCHITECTURE) | + | − | ++ (RunTrace уже там) | ++ (снимает переименование Phase 2) |
| Цена переименования сейчас | средняя | высокая (+ UI-строки, + e2e-ассерты) | низкая | низкая–средняя |
| **Вердикт** | частично (словарь, Run) | отвергнуть | частично (RunTrace, курсор) | **принять** |

---

## 6. Рекомендация

**Принять вариант D.** Суть: (1) «плеер» исчезает как модуль и как слово — вместо него `run/` (состояние прогона = курсор) и `trace/` (запись прога); (2) видимый пользователю словарь не меняется вообще — он уже правильный («Шаг», фазы, ∂L/∂·); (3) агентных существительных в коде нет и не появится — исполнитель шагов это студент; (4) структура модулей заранее совпадает с Phase 2 (`engine/trace/run`), поэтому переименование снимает будущую работу: `MockTrace→RunTrace` — и замена мок-JSON на живой движок перестаёт быть переименованием.

**Тайминг:** переименовать до плана 01-04 (юзабилити-тест на людях ещё не проведён; внешних пользователей и шерых ссылок нет). e2e-скриншоты перегенерируются штатным прогоном — контент экранов не меняется.

---

## 7. Полный маппинг старое → новое (вариант D)

### Файлы

| Старое | Новое |
|---|---|
| `src/player/` (директория) | ликвидируется; содержимое расходится по `run/`, `trace/`, `engine/` |
| `src/player/types.ts` | split: `TensorValues/TensorRef/StepIO` → `src/engine/tensor.ts`; `Phase/TraceStep/NetworkSpec/RunTrace/validateTrace` → `src/trace/run-trace.ts`; `LossKind` → `src/engine/loss.ts`; `GradMap` → `src/engine/grad.ts` |
| `src/player/store.ts` | `src/run/store.ts` |
| `src/player/urlState.ts` | `src/run/url.ts` |
| `src/ui/StepPanel.tsx` | `src/ui/OperationPanel.tsx` |
| `src/ui/stepRows.ts` | `src/ui/operationRows.ts` |
| `src/ui/StepControls.tsx` | **без изменения** (позиционная навигация по шагам — честно) |
| `src/ui/NumberDrilldown.tsx`, `ArchitectureDiagram.tsx`, `NarrativeLine.tsx`, `SubscriptText.tsx`, `App.tsx` | без изменения (правка только импортов) |
| `tests/player.test.ts` | `tests/run/store.test.ts` |
| `tests/urlState.test.ts` | `tests/run/url.test.ts` |
| `tests/trace-sanity.test.ts` | `tests/trace/run-trace.test.ts` (правка импорта) |
| `src/data/xor-trace.json` | **без изменения** (schemaVersion 1, поля чисты; источник мока остаётся) |

### Экспорты (идентификаторы)

| Старое | Новое | Примечание |
|---|---|---|
| `MockTrace` | `RunTrace` | ≈6 вхождений; снимает переименование Phase 2 |
| `PlayerState` | `RunState` | |
| `PlayerAction` | `RunAction` | |
| `player` (объект API) | функции `nextStep/prevStep/jumpToStep/openDrill/closeDrill/toggleLectureMode` | ≈19 вызовов в 5 UI-файлах; убирает агентное имя |
| `usePlayer()` | `useRunState()` | |
| `clampIndex` | `clampStepIndex` | опционально, для ясности |
| `buildStepRows` | `buildOperationRows` | вместе с `stepRows.ts` |
| `StepPanel` (default export) | `OperationPanel` | |
| `Mode`, `Drill`, `transition`, `trace` (константа), `validateTrace`, `selectStep`, `selectPosition`, `selectIsFirst`, `selectIsLast`, `Phase`, `TraceStep`, `TensorValues`, `TensorRef`, `StepIO`, `parseHash`, `toHash`, `UrlState`, `MAX_STEP` | **без изменения** | уже честные имена |
| новое: `LossKind = 'bce'`, `GradMap = Record<string, TensorValues>`, `NetworkSpec` | типизация полей, которые сейчас `string`/инлайн | нулевое поведение, +к валидации |

### UI-строки — **0 правок**

«Шаг» / «Назад» / «К началу» / «Шаг N из 14» / «Лекционный режим» / `forward/loss/backward/update/«сводка»` / «← к шагу» / «XOR — backprop за 14 шагов» — все остаются. Copywriting Contract UI-SPEC сохраняет силу. «Эпоха N из M» — только в Phase 2+ с реальными эпохами.

### e2e-селекторы — **0 правок**

`step-indicator`, `phase-badge`, `toggle-lecture`, `diagram-slot`, `step-panel`, `step-formula`, `btn-reset`, `btn-prev`, `btn-next`, `drill-panel/back/exact/formula/provenance/chain/terminal`, `data-ref="…"` — контракт e2e стабилен: testid описывает позицию/содержимое экрана («панель текущего шага»), а не имя React-компонента. Переименование компонента ≠ переименование testid (зафиксировать в глоссарии, чтобы не «синхронизировали» случайно).

### URL/hash — **0 правок**

`#step=N&mode=lecture` — публичный контракт (DOCS-05, reload-restore, e2e-assert `#step=7&mode=lecture`). Не трогаем.

### Документация и планинг

| Место | Действие |
|---|---|
| Док-комментарии `run/store.ts` | «Плеер walkthrough» → «Состояние прогона = f(trace, stepIndex)» |
| `.planning/phases/01…/01-UI-SPEC.md` | «UI-плеера продукта» → «walkthrough-UI продукта» (1 строка) |
| `.planning/research/ARCHITECTURE.md` | терминология: `player/` → `run/` в дереве структуры; «Player reducer» → «Run reducer»; англ. паттерн «pure player» переглоссировать «pure renderer over (trace, stepIndex)» — суть Pattern 1 не меняется |
| `01-*-SUMMARY/RESEARCH/PLAN` (исторические записи фазы) | **не переписывать** — это журнал того, что делалось тогда |
| PROJECT.md / STATE.md | зафиксировать решение «нейминг: player → run/trace/engine; словарь: шаг=позиция, операция=содержание, прогон=run» |
| Глоссарий проекта (новый раздел в docs или PROJECT.md) | таблица EN↔RU из §8 ниже |

---

## 8. Глоссарий (закрепить как словарь проекта)

| EN (код) | RU (глосс/доки) | Уровень | В UI? |
|---|---|---|---|
| `tensor` | тензор | домен | символами (x, W, b, z, a) |
| `op` / `OpKind` | операция | домен | формула шага |
| `loss` / `LossKind` | функция потерь | домен | бейдж `loss`, L |
| `grad` / `GradMap` | градиент | домен | ∂L/∂W |
| `model` / `MLP` / `NetworkSpec` | модель, сеть | домен | диаграмма архитектуры |
| `RunTrace` | прогон (запись прогона) | данные | нет |
| `TraceStep` | шаг прогона | данные | «Шаг N из M» |
| `Phase` | фаза (forward/loss/backward/update/summary) | данные | бейдж фазы |
| `epoch` | эпоха | метаданные прогона | «Эпоха N из M» (Phase 2+) |
| `RunState` | состояние текущего прогона | состояние | нет |
| `step` | шаг (позиция/действие) | состояние+UI | CTA «Шаг» |
| `drill` / `Drill` | drill-down, углубление в число | состояние+UI | «← к шагу» |
| `walkthrough` | прохождение сценария | продукт (доки) | нет |
| `scenario` | сценарий | контент | заголовок (Phase 2: хаб) |

Правила словаря: (1) «шаг» — только позиция в маршруте и действие пользователя; «операция» — содержание шага; никогда не взаимозаменять. (2) Слова «плеер», «тренер», «эксперимент», «сессия» в коде и UI не используются. (3) Новое интерфейсное слово появляется только вместе с реальной сущностью, которую оно называет.

---

## 9. Объём переименования: механика vs риск

**Механическое (~90 %, всё под защитой компилятора и тестов):**
- `git mv` 3 файлов + 3 тестов (rename detection в истории сохраняется);
- переименование идентификаторов через TS language server (`MockTrace→RunTrace`, `PlayerState→RunState`, …) ≈ 50 вхождений в 13 файлах;
- правка импортов в 5 UI-файлах и 4 тестах;
- split types.ts → engine/tensor.ts + trace/run-trace.ts (+2 seed-файла по одному типу: loss.ts, grad.ts);
- обновление док-комментариев (7 заголовков).
- Верификация: `tsc` strict, `vitest` 30/30, `pnpm e2e` 5/5 (селекторы и строки не тронуты → ассерты в силе), `pnpm build`, скриншоты перегенерируются без визуального diff.
- Оценка: ~15 файлов, diff ≈ 150 строк, 1–1,5 часа.

**Рискованное (~10 %):**
1. **Терминологическая синхронизация планинга** — ARCHITECTURE.md и UI-SPEC используют «player/плеер» как термины; забыть поправить → расхождение словаря ревьюера/экзекутора фазы 2 с кодом. Исторические SUMMARY/RESEARCH не трогаем (журнал), живые контракты — правим.
2. **Соблазн «синхронизировать» testid с новым именем компонента** (`step-panel` → `op-panel`) — не делать: сломает e2e-ассерты без выгоды; testid — контракт содержимого, не имени компонента.
3. **Соблазн добавить `epoch` в UI/состояние «на будущее»** — не делать (ложь-минимум); селектор `selectEpochPosition` возвращает `null` до появления многo-эпоховых трейсов.
4. **Не трогать** `#step=N&mode=lecture`, JSON-trace и `schemaVersion` — публичные/данные-контракты.
5. Опциональное ужесточение `validateTrace` (проверка `op ∈ OpKind`, `network.loss ∈ LossKind`) — отдельным коммитом после переименования, не в одном diff.

---

## 10. Открытые вопросы (на решение в Phase 2)

1. Формат двойного индикатора «Эпоха N из M · Шаг K из L» (длина, разделитель, projector-режим) — в UI-SPEC фазы 2.
2. Куда попадает `NetworkSpec` после появления `scenarios/schema.ts` (trace vs scenarios) — следовать ARCHITECTURE (сценарий владеет архитектурой, трейс ссылается).
3. Нужен ли `model/mlp.ts` как отдельный блок или MLP живёт внутри `engine` до второго типа сети — решит экзекутор фазы 2 (сейчас `model/` — резерв в глоссарии).

---

*Ревью подготовлено по коду на state_head 63a2564; фактический словарь операций взят из `src/data/xor-trace.json` (11 значений op, 5 фаз, 14 шагов).*
