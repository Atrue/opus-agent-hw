# R4 — Реактивность для ООП-доменной модели

```
Фаза:      01-validatsiya-h2-h3-klikabelnyy-prototip (ревью архитектуры)
Дата:      2026-11-03
Вопрос:    «ООП нативно не работает с React — рассмотреть варианты реактивности (mobx, solidjs/svelte, …)»
Статус:    Рекомендация — остаться на React 19 + useSyncExternalStore (вариант a); библиотеку не добавлять
Читано:    src/player/store.ts, src/ui/App.tsx, src/ui/StepPanel.tsx,
           .planning/research/STACK.md, .planning/research/ARCHITECTURE.md,
           .planning/phases/01-…/01-01-SUMMARY.md (standing rule: store-библиотеки — только после вопроса; этот документ и есть ответ)
```

---

## 1. Проверка посылки: что именно «не работает»

Посылка «ООП нативно не работает с React» верна ровно наполовину, и важно отсечь больную половину от здоровой:

- **Больная половина:** React не отслеживает мутации. Если `model.step()` меняет `this.w1[2]` «молча», React об этом не узнает — экран протухнет. Это свойство любого VDOM-фреймворка, не вина ООП.
- **Здоровая половина:** React прекрасно сосуществует с ООП-моделью, если модель оповещает о изменениях (`useSyncExternalStore`) и не мутирует во время рендера. Это не экзотика — так работают CodeMirror 6 + React, Lexical, ProseMirror, three.js + react-three-fiber: императивное ООП-ядро + тонкий реактивный фасад. Наш масштаб на 3–4 порядка меньше.

Второй ключевой факт — из уже принятой архитектуры (ARCHITECTURE.md, decision #1): **детерминированный replay, а не live-stepping**. Trace вычисляется целиком при загрузке, UI — чистая функция над `(trace, stepIndex)`. Live-мутирующий граф был явно отвергнут (Option A, ARCHITECTURE.md:99). Значит:

- классы `Tensor`/`Model`/`Session` живут **внутри** `buildTrace()` — в Domain layer, куда React не заходит (dependency rule: UI → Session → Domain, ARCHITECTURE.md:65);
- **реактивным обязан быть только курсор** (`stepIndex`, `drill`, `mode`) — а он уже реактивен (`store.ts`);
- «шаг меняет десятки чисел на экране» — при смене шага все числа экрана меняются **вместе и закономерно** (они из другого шага трейса), т.е. перерисовка панели целиком — не дефект гранулярности, а семантика walkthrough.

Отсюда рамка оценки всех шести вариантов: проблема, которую решают signals/MobX/Solid (тонкозернистые независимые обновления при живых мутациях), в нашей архитектуре **не существует по построению** — она существовала бы только при live-stepping, который мы отвергли.

## 2. Baseline: что уже есть и что уже доказано

| Факт | Значение |
|---|---|
| Текущий стор | `store.ts`: модульный стор + `useSyncExternalStore` + чистая `transition()` — по сути hand-rolled selector-store (тот же паттерн, что внутри zustand) |
| Бандл | **76.2 KB gz** всего JS (React 19.3.1 + app) — бюджет <300 KB, запас ×4 |
| Объём UI | 8 компонентов, ~1380 LOC (вкл. тесты и e2e) |
| Тесты | 30 юнитов (4 файла), e2e 5/5, 28 скриншотов (14 шагов × default/.lecture) — материал юзабилити-протокола 01-04 |
| Потолок чисел | ≤7 ключевых / ≤30 на экран (D-06, проверяется тестами `stepRows`) |

Полная перерисовка StepPanel (30 чисел + форматирование d3-format + SVG-тинты) при смене шага — порядка 1 мс в React 19 (замерять будем в Phase 2 perf-smoke по NFR-01, но порядок известен). Гранулярность «до изменившегося числа» не даёт измеримого выигрыша: **форматирование чисел дороже рендера**.

## 3. Разбор вариантов

### (a) React 19 без библиотек: uSES + EventTarget/observer в ООП-модели ✅

**Интеграция** — модель остаётся чистым TS, оповещения через встроенный `EventTarget`:

```ts
class Session {                       // Domain: ни одного import из React
  epoch = 0; loss = 1.0
  #bus = new EventTarget()
  nextEpoch() { this.epoch++; this.loss = step(); this.#bus.dispatchEvent(new Event('change')) }
  subscribe(fn: () => void) { this.#bus.addEventListener('change', fn)
    return () => this.#bus.removeEventListener('change', fn) }
}
// UI (тонкий хук на компонент):
export const useEpoch = (s: Session) => useSyncExternalStore(s.subscribe.bind(s), () => s.epoch)
```

**Гранулярность.** Скрытая способность `useSyncExternalStore`: React сравнивает результат `getSnapshot` через `Object.is`. Если хук возвращает примитив (`() => s.epoch`, `() => s.w1[2]`), уведомляются все подписчики, но **перерисовываются только те, чьё число изменилось**. Селективные подписки уже встроены — бесплатно, без библиотеки. Правило: `getSnapshot` возвращает примитив/стабильную ссылку (не создаёт новых объектов — иначе ререндер-шторм или, хуже, бесконечный цикл).

**Переписывание: ноль.** Это точное развитие текущего `store.ts` (он уже так устроен, только с чистой `transition()` вместо EventTarget). Phase 2 добавит `engine`-стор рядом с `player`-стором тем же паттерном.

**e2e/скриншоты: ноль риска.** DOM, testid, поведение — неизменны.

**Зависимость: 0 KB.** EventTarget — браузерный built-in.

**MNIST:** шаг = чтение из предвычисленного трейса → 1–5 мс на рендер; NFR-01 закрыт с ~20–100× запасом. Если в R2 появится live-обучение (спарклайн loss тикает) — батчинг по `requestAnimationFrame` + отдельный «канал» событий решает это в ~20 строках.

**Читаемость/магия: максимум.** Студент открывает DevTools, пишет `model.w1` — видит обычный объект/типизированный массив. Никаких Proxy, никакой компиляторной магии. Bonus: в dev-режиме можно экспонировать модель в `window.__engine` — «сейчас посмотрим на w1 в консоли» как лекционный приём. Domain-код читается как учебник (никаких `observer()`, `$state`, `.value`).

**Вердикт: рекомендую.** Закрывает все потребности фаз 2–3 по построению архитектуры.

### (b) Preact Signals (`@preact/signals-core` + `@preact/signals-react`)

**Интеграция:**

```ts
import { signal } from '@preact/signals-core'
class Session {
  epoch = signal(0); loss = signal(1.0)     // поля-сигналы
  nextEpoch() { this.epoch.value++; this.loss.value = step() }
}
```

**Гранулярность:** настоящая finest-grained (сигнал → точный подписчик), лучшая из React-совместимых. **Но**: для оптимального пропуска ре-рендеров `@preact/signals-react` требует babel/vite-трансформ (`@preact/signals-react-transform`), инжектирующего трекинг прямо в JSX-компилят. Без трансформа сигналы проходят через хук-обёртку поверх того же `useSyncExternalStore` (deps пакета это подтверждают: `use-sync-external-store`) — т.е. вы получаете примерно вариант (a) с синтаксисом `.value`.

**Переписывание:** все подписывающиеся компоненты (8 шт.) + стор; тесты селекторов. Среднее.

**e2e-риск:** низкий (DOM тот же), скриншоты переживают, но трансформ — новый фактор сборки.

**Зависимость:** ~6 KB gz (core 2.2 KB + react-биндинг ~4 KB) + build-плагин. Приятно мало.

**MNIST:** без трансформа — как (a); с трансформом — лучше на живых обновлениях, которых у нас нет.

**Читаемость/магия:** `.value` в домене — умеренная, терпимая магия; **build-трансформ JSX — нет** (студент не может мысленно предсказать, что реально исполняется). Сигналы в домене также нарушают «Domain не импортирует фреймворк-специфику» (сигналы — не React, но всё же рантайм-концепт реактивности в численном ядре).

**Вердикт: отклонить.** Технически милый вариант (и самый дешёвый из «настоящих сигналов»), но его единственное реальное преимущество перед (a) — гранулярность, которая нам не нужна, а цена — трансформ или деградация до (a). Это «90% цены за 0% выгоды» наоборот.

### (c) TC39 Signals polyfill (`signal-polyfill`, `@signal-utils/*`)

**Интеграция:**

```ts
import { Signal } from 'signal-polyfill'
class Session {
  epoch = new Signal.State(0)
  nextEpoch() { this.epoch.set(this.epoch.get() + 1) }
}
// React-биндинга нет: свой useSignal() через uSES + Watcher (не тривиально:
// корректный effect/batching — ~50 строк, и это самая хрупкая часть)
```

**Гранулярность:** как у (b) в теории. **Но** официальный React-хук отсутствует — пишем и отлаживаем сами Watcher-механику поверх `Signal.subtle.Watcher`.

**Переписывание:** как (b) + собственный биндинг.

**e2e-риск:** средний (свой биндинг = свои баги реактивности).

**Зависимость:** runtime ~5 KB gz — но README самого полифилла (0.2.2, проверено 2026-11-03) гласит: **«Do not use this in production»** — proposal in-progress, API может измениться. Стейдж ещё не финализирован.

**MNIST:** неприменимо (см. выше).

**Читаемость/магия:** `Signal.State/.get()/.set()` — читаемо; но «полифилл стандарта, которого нет» в учебном продукте — плохой сигнал (каламбур) и для студента, и для лектора.

**Вердикт: отклонить сейчас, наблюдать.** Идеологически правильное «не залочиться на вендора» уже достигнуто вариантом (a) — EventTarget/uSES тоже стандарт (WHATWG + React). Вернуться к вопросу, когда proposal дойдёт до Stage 3 и появится канонический React-биндинг.

### (d) MobX (`mobx` + `mobx-react-lite`, `makeAutoObservable`)

Честно: **самый ООП-нативный из всех** — пользователь прав. Декораторы при этом не обязательны:

```ts
import { makeAutoObservable } from 'mobx'
import { observer } from 'mobx-react-lite'
class Session {
  epoch = 0; loss = 1.0
  constructor() { makeAutoObservable(this) }        // весь класс реактивен
  nextEpoch() { this.epoch++; this.loss = step() }
}
export const LossView = observer(() => <span>{session.loss.toFixed(4)}</span>)
```

Мутации полей класса → точные обновления компонентов, читающих эти поля. Это ровно ментальная модель «живой ООП-объект».

**Но четыре удара по нашим конкретным обстоятельствам:**

1. **`Float64Array` неobservable.** MobX отслеживает property-access через Proxy на plain objects/arrays/Map/Set. Движок фаз 2–3 хранит веса MNIST в `Float64Array` (fused ops, STACK.md) — типизированные массивы MobX-реактивностью не покрываются. Значит, для тензоров всё равно понадобится version-счётчик/обёртка — библиотека решает не ту часть проблемы, которая у нас есть (скаляры XOR он бы покрыл, но именно они тривиальны).
2. **Критерий «минимум магии».** `console.log(tensor)` показывает Proxy; stack traces длиннее; в учебном коде появляется `observer()`, `makeAutoObservable`, понятие action/транзакции. Для автора — нормально; для студента, заглядывающего в DevTools, — слой непрозрачности.
3. **Dependency rule.** `makeAutoObservable` в Domain-классах тянет реактивный рантайм в численное ядро, которое сейчас чистое и golden-тестируемое как обычный TS. Обходится «оболочкой-observable над моделью» — но это уже больше кода, чем EventTarget из (a).
4. **Standing rule + масштаб.** Правило «store-библиотека — только после обоснования» сработает только если есть проблема масштаба. У нас ≤30 чисел на экране, один курсор, один источник правды. Обосновать 17 KB зависимости и новую ментальную модель нечем: version-счётчик решает то же самое в 30 строках уже написанного паттерна.

**Гранулярность:** полная, per-field. **Переписывание:** стор + все компоненты оборачиваются в `observer` (8 шт., механически). **e2e-риск:** низкий (DOM неизменен). **Зависимость:** ~17 KB gz (mobx 7.1.4 = 14.8 KB + mobx-react-lite 5.1.2 = 1.9 KB; измерено) — в бюджет влезает легко, размер НЕ аргумент против. **MNIST:** реактивность пер-эпохальных макро-шагов — ок; но типизированные массивы см. п.1.

**Вердикт: отклонить сейчас; второй выбор, если появятся живые модели.** Если в R2+ появится «train-your-own» с большим живым состоянием из plain-объектов (гиперпараметры, прогресс, UI-настройки сети) — MobX станет честным кандидатом и на тот момент это надо будет переспросить у пользователя заново (не сейчас).

### (e) SolidJS — миграция

**Интеграция:**

```ts
class Session {
  #epoch = createSignal(0)                    // [getter, setter]
  get epoch() { return this.#epoch[0]() }
  nextEpoch() { this.#epoch[1](this.#epoch[0]() + 1) }
}
// JSX: <span>{session.epoch}</span> — компонент перерисовывается точечно
```

**Гранулярность:** нативная finest-grained, без трансформов — честно сильная сторона.

**Но:** класс-нативность на самом деле хуже, чем у Svelte 5 или MobX (сигналы — функциональные пары `[get, set]`, в классах выглядят гостями; идиоматичный Solid — функции, не классы). **Переписывание: 100% UI** — все 8 компонентов, стор, все UI-тесты; e2e-спеки (data-testid) формально выживают, но 28 скриншотов перебейзлайниваются и визуальный паритет проверяется заново вручную. **Экосистема:** STACK.md выбрал React в т.ч. ради (а) эффективности AI-кодгена автора-одиночки, (б) пула примеров/контрибьюторов, (в) React Flow на случай R2 — всё теряется. Solid в STACK.md уже отвергнут («экосистема меньше — не рекомендую»), с тех пор ничего не изменилось.

**Вердикт: отклонить.** Максимальная цена (полное переписывание работающего прототипа перед юзабилити-тестом 01-04) за выгоду (гранулярность), которой некуда приложиться: NFR-01 закрыт с запасом ~100×.

### (f) Svelte 5 (runes: `$state`/`$derived`) — миграция

**Интеграция** — единственная среда, где ООП+реактивность синтаксически неразличимы:

```ts
// session.svelte.ts
class Session {
  epoch = $state(0)               // мутация поля класса трекается компилятором
  loss = $state(1.0)
  nextEpoch() { this.epoch++; this.loss = step() }
}
```

`model.step(); session.nextEpoch()` — и экран обновляется точечно. Красиво.

**Но:** (1) **полное переписывание** — см. (e), плюс руны работают только через svelte-компилятор (`.svelte.ts`), т.е. «магия» переносится на уровень сборки — студент не может воспроизвести `$state` в песочнице с чистым JS; (2) потеря React-экосистемы/AI-кодгена/найма — та же; (3) STACK.md/ARCHITECTURE.md уже рассматривали Svelte 5 как равную альтернативу **до первой строки кода** — окно закрыто прототипом; (4) выигрыш в бандле (~30–40 KB gz экономии против React) при запасе ×4 к бюджету не нужен. ARCHITECTURE.md:154 сам говорит: «любой mainstream framework works because UI is pure function» — т.е. Svelte ничего не открывает, чего требует наша архитектура.

**Вердикт: отклонить.** Лучший «если бы начинали завтра с нуля и знали, что будет много живого UI» — но мы не начинаем завтра и живого UI не планируется.

## 4. Матрица

| | Новая dep (gz, измерено) | ООП-интеграция | Гранулярность | Переписать | e2e/скрин. риск | DevTools-читаемость (гл. критерий) | Вердикт |
|---|---|---|---|---|---|---|---|
| **(a) React 19 + uSES + EventTarget** | 0 KB | модель чистая + 10-строчный хук | селективная через `getSnapshot`+`Object.is` — достаточная | **0** | **0** | **отлично**: plain-объекты | ✅ **принять** |
| (b) Preact Signals + React | ~6 KB + build-плагин | сигналы-поля (`.value`) | finest-grained, но с React — только через трансформ или деградация до (a) | 8 компонентов + стор | низкий | средняя (`.value`, трансформ) | ❌ |
| (c) TC39 signal-polyfill | ~5 KB | `Signal.State`-поля | теорет. finest-grained; React-биндинг писать самим | как (b) + свой биндинг | средний | средняя | ❌ «do not use in production» (README 0.2.2) |
| (d) MobX | ~17 KB | **лучшая** (`makeAutoObservable`) | per-field, полная | стор + `observer` на 8 компонентах | низкий | **ниже средней**: Proxy, observer() | ❌ сейчас / 2-й выбор на live-модели R2+ |
| (e) SolidJS | 0 (свой рантайм, компилятор) | слабее Svelte/MobX (сигнальные пары) | нативная finest-grained | **100% UI + UI-тесты** | перебейзлайн 28 скр. | средняя | ❌ |
| (f) Svelte 5 runes | 0 (компилятор) | **лучшая синтаксически** (`$state` в классе) | нативная finest-grained | **100% UI + UI-тесты** | перебейзлайн 28 скр. | средняя (руны = компиляторная магия) | ❌ |

Общее для всех: **MNIST-скорость не является дифференциатором** — при Pattern 1 (предвычисленный trace) рендер шага = чтение массива + d3-формат (1–5 мс) в любом варианте; NFR-01 закрыт архитектурой, а не реактивностью. Дифференцирует только: цена переписывания × читаемость × зависимость.

## 5. Рекомендация

**Остаться на React 19 + `useSyncExternalStore` (вариант a). Это и есть ответ на standing rule: библиотека не нужна.**

1. Domain-классы (`Tensor`/`Model`/`Session`) остаются чистым TS без единого реактивного импорта — dependency rule и golden-тестируемость сохраняются. Для walkthrough-архитектуры им реактивность не нужна вообще: они живут внутри `buildTrace()`, наружу выходит иммутабельный `RunTrace`.
2. Реактивен только курсор. Текущий `store.ts` уже является правильным паттерном — Phase 2 продолжит его (для живых состояний, если появятся: `engine`-стор с EventTarget-оповещениями по образцу §3a).
3. Svelte/Solid — отклонить: переписывание работающего прототипа (8 компонентов, 30 тестов, e2e 5/5, 28 скриншотов — материал юзабилити 01-04) в обмен на гранулярность, которой нечего обновлять. Signal-подход дал бы «90% выгоды за 10% цены» — если бы выгода существовала; в нашей архитектуре и (a), и сигналы дают 100% выгоды, но (a) стоит 0%.
4. MobX — отклонить сейчас (см. §3d: Float64Array, Proxy-магия, Domain-чистота, отсутствие масштаба), но **зафиксировать как второго кандидата** на случай live-режима R2+.
5. TC39 Signals — наблюдать; не в прод до Stage 3 + канонического React-биндинга.

**Триггеры пересмотра (вернуться к вопросу, если):**
- в R2+ появляется «train-your-own» / живое обучение с >3 независимыми одновременно тикающими источниками данных на одном экране;
- perf-smoke Phase 3 показывает кадр >16 мс на рендере шага (не ожидается);
- боилерплейт подписок в UI-слое превышает ~100 строк и начинает генерить баги subscribe/unsubscribe;
- TC39 Signals достигли Stage 3.

## § Сниппеты: одна сцена в шести вариантах

Дополнение по запросу пользователя (2026-11-03): «по каждому варианту приложи небольшой сниппет кода, как это выглядит». Сцена фиксирована для сравнимости:

- домен: `TrainingRun { epoch, step, loss, lossHistory, advance() }`;
- `EpochBadge` — «Эпоха 3 · Шаг 12», перерисовывается на каждый шаг;
- `LossChart` — перерисовывается только при изменении `lossHistory`;
- кнопка «Шаг» → `run.advance()`.

Сниппеты не меняют выводы §3–§5 — иллюстрируют их. API по документации библиотек на момент написания; места, требующие сверки при внедрении, помечены `[проверить при внедрении]`.

### (a) React 19 + useSyncExternalStore + EventTarget

```tsx
// run.ts — домен: EventTarget как шина (браузерный built-in, 0 зависимостей)
import { useSyncExternalStore } from 'react'

export class TrainingRun extends EventTarget {
  epoch = 0; step = 0; loss = 1.0
  readonly lossHistory: number[] = []
  advance() {                          // «Шаг»: мутация → одно событие 'change'
    this.step++
    this.loss = this.computeLoss()
    this.lossHistory.push(this.loss)
    this.dispatchEvent(new Event('change'))
  }
  subscribe = (fn: () => void) => {    // стрелка: стабильная ссылка для uSES
    this.addEventListener('change', fn)
    return () => this.removeEventListener('change', fn)
  }
}
export const run = new TrainingRun()

// ui.tsx — селекторный хук: Object.is на срезе = селективная перерисовка
const useRunSlice = <T,>(sel: (r: TrainingRun) => T): T =>
  useSyncExternalStore(run.subscribe, () => sel(run))

export function EpochBadge() {                       // перерисовка на каждый шаг
  const [e, s] = useRunSlice(r => `${r.epoch}:${r.step}`).split(':')
  return <span>Эпоха {e} · Шаг {s}</span>
}
export function LossChart() {            // только при росте lossHistory
  const n = useRunSlice(r => r.lossHistory.length)   // примитив, не свежий объект
  return <svg>{renderPolyline(run.lossHistory.slice(0, n))}</svg>
}
// App.tsx: <button onClick={() => run.advance()}>Шаг</button>
```

- **Гранулярность:** `advance()` будит всех подписчиков, но `Object.is` на срезе ререндерит только тех, чьё значение изменилось: Badge — каждый шаг, Chart — только при росте истории, остальные — никогда.
- **DevTools:** `console.log(run)` — plain-класс, все поля числами; в dev `window.__run = run` → лекционный приём «смотрим на веса в консоли».
- **Миграция: 0** — это буквальное развитие текущего `store.ts` (уже uSES, только `transition` вместо EventTarget); тесты/e2e/скриншоты не трогаются.
- **Dep:** 0 KB. **Подводные камни:** `getSnapshot` — только примитив/стабильная ссылка (свежий объект = ререндер-цикл, §6.1); StrictMode безопасен (uSES сам пары подписок).

### (b) Preact Signals (`@preact/signals-core` + `@preact/signals-react`)

```tsx
import { signal, computed } from '@preact/signals-core'
import { useSignals } from '@preact/signals-react'

export class TrainingRun {
  epoch = signal(0); step = signal(0); loss = signal(1.0)
  #history = signal<number[]>([])               // ссылка-замена, не push
  lossHistory = computed(() => this.#history.value)
  advance() {                                   // «Шаг»
    this.step.value++
    this.loss.value = this.computeLoss()
    this.#history.value = [...this.#history.value, this.loss.value]
  }
}
export const run = new TrainingRun()

export function EpochBadge() {                  // перерисовка на каждый шаг
  useSignals()                                  // runtime-трекинг без babel-плагина
  return <span>Эпоха {run.epoch.value} · Шаг {run.step.value}</span>
}
export function LossChart() {                   // только при изменении истории
  useSignals()
  return <svg>{renderPolyline(run.lossHistory.value)}</svg>
}
// App.tsx: <button onClick={() => run.advance()}>Шаг</button>
```

- **Гранулярность:** per-signal → компонент: Badge перерисуется на `step`, Chart не перерисуется на `step`. Finest-grained «до текст-узла» — только с babel-трансформом `@preact/signals-react-transform`; без него runtime-хук ≈ перерисовка компонентом целиком (механика того же uSES).
- **DevTools:** `run.epoch` — объект-сигнал, число только через `.value`; в консоли лишний слой.
- **Миграция:** стор + 8 компонентов (+`useSignals` каждому или build-плагин) + тесты селекторов; средняя.
- **Dep:** ~6 KB gz (core 2.2 + react-биндинг ~4) + плагин, если трансформ.
- **Подводные камни:** сигналы-поля тянут реактивный рантайм в Domain-слой; `effect()` вне компонента возвращает dispose — забыть = утечка; `useSignals` в каждом компоненте легко пропустить `[проверить при внедрении: версия v2 API]`.

### (c) TC39 Signals polyfill (`signal-polyfill`)

```tsx
import { Signal } from 'signal-polyfill'
import { useSyncExternalStore } from 'react'

export class TrainingRun {
  epoch = new Signal.State(0)
  step = new Signal.State(0)
  loss = new Signal.State(1.0)
  history = new Signal.State<number[]>([])
  advance() {                                   // «Шаг»
    this.step.set(this.step.get() + 1)
    this.loss.set(this.computeLoss())
    this.history.set([...this.history.get(), this.loss.get()])
  }
}
export const run = new TrainingRun()

// официального React-биндинга нет — пишем сами (самое хрупкое место)
function useSig<T>(s: Signal.State<T>): T {
  return useSyncExternalStore(
    (cb) => {                                   // [упрощено: прод-версия требует
      const w = new Signal.subtle.Watcher(cb)   //  flush-цикл queueMicrotask +
      w.watch(s)                                //  getPending→watch из README;
      return () => w.unwatch(s)                 //  проверить при внедрении]
    },
    () => s.get(),
  )
}

export function EpochBadge() {
  const e = useSig(run.epoch), s = useSig(run.step)
  return <span>Эпоха {e} · Шаг {s}</span>
}
export function LossChart() {
  return <svg>{renderPolyline(useSig(run.history))}</svg>
}
```

- **Гранулярность:** per-signal в теории; на практике определяется качеством самописного биндинга (Watcher-специфика: pending-множество, flush, untrack в snapshot).
- **DevTools:** `run.epoch.get()` — вербозно, но честно.
- **Миграция:** как (b) + ~50 LOC собственного биндинга, который надо отлаживать.
- **Dep:** ~5 KB gz; README 0.2.2: **«Do not use this in production»** — proposal in-progress.
- **Подводные камни:** API может измениться (не Stage 3); batch/flush — наша ответственность; hook в JSX-выражении (`useSig` внутри аргумента `renderPolyline`) — работает, но правила хуков в линтере надо обходить.

### (d) MobX (`mobx` + `mobx-react-lite`)

```tsx
import { makeAutoObservable } from 'mobx'
import { observer } from 'mobx-react-lite'

export class TrainingRun {
  epoch = 0; step = 0; loss = 1.0
  lossHistory: number[] = []
  constructor() { makeAutoObservable(this, {}, { autoBind: true }) }
  advance() {                              // «Шаг»: обычные мутации полей класса
    this.step++
    this.loss = this.computeLoss()
    this.lossHistory.push(this.loss)       // observable-массив: push трекается
  }
}
export const run = new TrainingRun()

export const EpochBadge = observer(() => (       // перерисовка на каждый шаг
  <span>Эпоха {run.epoch} · Шаг {run.step}</span>
))
export const LossChart = observer(() => (         // только при изменении истории
  <svg>{renderPolyline(run.lossHistory)}</svg>
))
// App.tsx: <button onClick={run.advance}>Шаг</button>  (autoBind уже привязал this)
```

- **Гранулярность:** per-field, честно точная: `advance()` ререндерит ровно читателей `step`/`loss`/`lossHistory`. Но `Float64Array` (веса MNIST, Фаза 3) не observable — главный козырь на наших данных не работает.
- **DevTools:** `console.log(run)` — Proxy/ObservableArray, служебные поля `$mobx`; stack traces длиннее. MobX-расширение DevTools существует, но уступает React DevTools в поддержке.
- **Миграция:** стор + механический `observer` на 8 компонентов + правка тестов селекторов; средняя, самая дешёвая из «настоящих» библиотек.
- **Dep:** ~17 KB gz (mobx 14.8 + mobx-react-lite 1.9; измерено) — в бюджет влезает.
- **Подводные камни:** декораторы не нужны (`makeAutoObservable` достаточно); StrictMode ок (mobx-react-lite ≥4); концепции action/транзакция — новый слой магии для студента.

### (e) SolidJS

```tsx
import { createSignal, createMemo, type Component } from 'solid-js'

export class TrainingRun {
  #epoch = createSignal(0); #step = createSignal(0)
  #history = createSignal<number[]>([])
  epoch() { return this.#epoch[0]() }        // метод, НЕ getter: компилятор Solid
  step() { return this.#step[0]() }          // видит вызов → оборачивает в memo;
  lossHistory() { return this.#history[0]() } // getter прячет реактивность
  advance() {                                // «Шаг»
    this.#step[1](this.#step[0]() + 1)
    this.#history[1]([...this.#history[0](), this.computeLoss()])
  }
}
export const run = new TrainingRun()

export const EpochBadge: Component = () => (       // тело исполняется ОДИН раз
  <span>Эпоха {run.epoch()} · Шаг {run.step()}</span>  // обновится только текст
)
export const LossChart: Component = () => {
  const pts = createMemo(() => renderPolyline(run.lossHistory()))
  return <svg>{pts()}</svg>
}
// App.tsx: <button onClick={() => run.advance()}>Шаг</button>
```

- **Гранулярность:** нативная finest-grained без трансформов: компонент не «перерисовывается» вообще — обновляются только выражения `{...}` и `pts()`.
- **DevTools:** методы читаются числами, но `console.log(run)` показывает приватные пары `[get, set]`.
- **Миграция: 100% UI** — все 8 компонентов (JSX Solid ≠ JSX React: замыкания вместо ререндера), 30 тестов (другая testing-library), e2e по testid выживает, 28 скриншотов перебейзлайн.
- **Dep:** solid ~7 KB gz, но замена React → net −40…−48 KB.
- **Подводные камни:** сигналы в классе — гости (функциональные пары, аксессоры-методы из-за компилятора); `createMemo`/эффекты требуют owner (`createRoot`) — вне — утечки; потеря React-экосистемы/AI-кодгена.

### (f) Svelte 5 runes

```svelte
<!-- training-run.svelte.ts — руны живут только через svelte-компилятор -->
export class TrainingRun {
  epoch = $state(0)
  step = $state(0)
  loss = $state(1.0)
  lossHistory = $state<number[]>([])     // deep-proxy: push трекается
  advance() {                            // «Шаг»: обычные мутации полей класса
    this.step++
    this.loss = this.computeLoss()
    this.lossHistory.push(this.loss)
  }
}
export const run = new TrainingRun()
```

```svelte
<!-- EpochBadge.svelte -->
<script lang="ts">
  import { run } from './training-run.svelte.ts'
</script>
<span>Эпоха {run.epoch} · Шаг {run.step}</span>

<!-- LossChart.svelte -->
<script lang="ts">
  import { run } from './training-run.svelte.ts'
  const pts = $derived(renderPolyline(run.lossHistory))
</script>
<svg>{pts}</svg>

<!-- App.svelte -->
<button onclick={() => run.advance()}>Шаг</button>
```

- **Гранулярность:** как у Solid (компонент не перезапускается, обновляются выражения), при этом трекинг runtime → `run.epoch` во `template` работает без хитростей.
- **DevTools:** поля класса читаются числами (лучшая инспектируемость из «магических» вариантов); `lossHistory` — proxy.
- **Миграция: 100% UI** — как (e): 8 компонентов → `.svelte`, 30 тестов, перебейзлайн 28 скриншотов.
- **Dep:** рантайм ~2–4 KB gz, замена React → net −45+ KB.
- **Подводные камни:** руны — compile-time фича (`$state` вне svelte-файлов — синтаксическая ошибка) → студент не воспроизводит это в чистом JS-песке; потеря React-экосистемы.

### Таблица по сниппетам (дополняет §4)

| | Гранулярность при `advance()` | Читаемость / DevTools | Миграция (8 комп. + стор + 30 тестов + e2e) | Dep gz | Риск |
|---|---|---|---|---|---|
| **(a) uSES + EventTarget** | срез-селектор: Badge каждый шаг, Chart по истории, остальные 0 | **отлично** — plain-объект | **0** | **0 KB** | низкий: правила `getSnapshot` |
| (b) Preact Signals | per-signal→компонент; до текст-узла — только с babel | средняя (`.value`) | средняя | ~6 KB (+плагин) | средний: трансформ/`useSignals` |
| (c) TC39 polyfill | per-signal в теории; свой биндинг = свои баги | средняя (`.get()`) | как (b) + ~50 LOC биндинга | ~5 KB | **высокий: «do not use in production»** |
| (d) MobX | **per-field, точная** (но Float64Array мимо) | ниже средней (Proxy) | средняя (observer×8) | ~17 KB | средний: MNIST-веса вне реактивности |
| (e) SolidJS | **finest**: компонент исполняется один раз | средняя | **100% UI + тесты + 28 скринов** | ~7 KB (net −48) | высокий |
| (f) Svelte 5 | finest + идеальный синтаксис ООП | средняя (compile-магия) | **100% UI + тесты + 28 скринов** | ~3 KB (net −45) | высокий |

Сцена подтверждает рекомендацию §5: (a) даёт нужную гранулярность среза (`LossChart` не дёргается на `step`) при нулевой миграции и максимальной DevTools-прозрачности; козырь (b)–(d) — per-field/per-signal точность — на MNIST-весах (`Float64Array`) всё равно вырождается в version-счётчик; (e)/(f) — цена 100% UI перед юзабилити-тестом 01-04.

## 6. Если остаёмся на React: version-счётчик vs селективные подписки

Это ложная дихотомия — на самом деле это **два уровня одной схемы**, и нужны оба:

- **Version-счётчик / EventTarget 'change' = транспорт уведомлений** (широковещательный, батчится на шаг: один `model.step()` → одно событие → один коммит React). Дёшев, идиотски прост, отсутствие рассинхрона гарантировано одним событием на мутацию.
- **Селектор в `getSnapshot` = фильтр перерисовок.** `useSyncExternalStore(sub, () => s.loss)` перерисует компонент только если `loss` изменился (`Object.is`). Т.е. «селективные подписки» не нужно строить — их нужно **правильно выбрать снимок**.

Правила, которые следует зафиксировать в Phase 2:

1. `getSnapshot` возвращает **примитив или стабильную ссылку** (кэшированный объект), никогда — свежесозданный (`() => { value: s.x }` = бесконечный цикл). Для чисел тренажёра это естественно: всё, что мы рендерим, — числа.
2. Не возвращать из `getSnapshot` мутируемый на месте массив/объект без версии — Object.is не увидит мутацию (протухший рендер). Либо ссылка-замена, либо `() => version`.
3. Один источник правды на канал: `player` (курсор) и, при появлении, `engine` (живые числа) — отдельные сторы с отдельными событиями; компонент подписывается на нужный. Это и есть гранулярность уровня «каналов» — 90% выгоды пер-полевых подписок без их lifecycle-баши.
4. Пер-полевые подписки (EventTarget на каждое число / granular keys) — **не делать**: это единственная схема, где появляется реальный бойлерплейт и риск утечек подписок, а измеримой выгоды при ≤30 числах/шаг нет. Зарезервировано как следующий шаг ТОЛЬКО по триггеру из §5.
5. Для walkthrough Pattern 1 всё ещё проще: единственный мутабельный атом — `stepIndex`; смена шага обоснованно перерисовывает экран целиком (это смена «кадра», а не «пикселя»).

## § Декораторы и мульти-объектность

Аддендум 2 (2026-11-03) по претензиям пользователя к §3a/§Сниппеты: (1) «наследование EventTarget; при нескольких объектах каждый потребитель прокидывает всё, чтобы самому подписаться; производные = лишние подписки/ререндеры»; (2) «b/c/e заставляют использовать обёртку вместо значения»; (3) запрос на декораторный вариант «расширенный (a)»; (4) «в Svelte всегда нужен `.svelte.ts`? нельзя ли фреймворк-независимые классы?». Всё проверено на тулчейне проекта: tsc 5.9.3 (target es2023; `erasableSyntaxOnly` не мешает — декораторы stage-3 и `accessor` суть runtime-синтаксис стандарт-трека, не TS-специфика), vitest 5.0.5 / vite 8.3.5 (rolldown/oxc), Svelte docs 5.x.

### П1. Мульти-объектность: паттерн «один реактивный корень + селекторы»

Претензия 1 базируется на неверном чтении сниппета (a): никто не обязан «прокидывать все объекты». Правильная форма — модульный синглтон-корень + селектор-хук:

```ts
export const run = new TrainingRun()          // ЕДИНСТВЕННЫЙ реактивный корень (модульный синглтон)
const useRunSlice = <T,>(sel: (r: TrainingRun) => T): T =>
  useSyncExternalStore(run.subscribe, () => sel(run))   // селектор = объявление среза
```

Каждое свойство паттерна — прямой ответ на подпункт претензии:

1. **Нет прокидывания.** Потребители импортируют один корень (или берут его из context один раз), а не получают «все объекты» пропсами. N потребителей = N селекторов: тултип — `useRunSlice(r => r.loss)`, svg-обёртка — `useRunSlice(r => r.lossHistory.length)`, таблица — `useRunSlice(r => r.epoch)`.
2. **Нет каскадных подписок на производные.** Потребитель, использующий «значение предыдущего», не подписывается на другой потребитель — оба берут срезы из корня, производная живёт в селекторе: `useRunSlice(r => r.lossHistory.at(-1))`. Дерево плоское (все смотрят в корень), цепочки «A слушает B, B слушает C» не возникают.
3. **Фильтрация до рендера.** Событие будит всех подписчиков шины, но `Object.is` на срезе отсекает лишние перерисовки до рендера: будильник дешёвый, рендер — единственное дорогое — делают только изменившиеся.

Потолок паттерна (честно): dep-tracking ручной — список зависимостей = то, что селектор фактически читает; автоматических производных (computed-граф с инвалидацией по топологии) нет — производная пересчитывается при каждом событии своего стора (при ≤30 числах это дешевле d3-форматирования); несколько сторов (`player` + `engine`) = несколько вызовов хука в компоненте. В нашей области потолок недостижим.

### П3. «Расширенный (a)»: собственный `@reactive` на stage-3 декораторах

Механика: `@reactive accessor step = 0` — TS 5 превращает поле в get/set-пару на прототипе с private backing store; декоратор подменяет сеттер → пер-полевые уведомления; класс фреймворк-независим (файл реактивности — ноль импортов), поля читаются/пишутся как **значения**; уведомления батчатся в microtask (один flush на `advance()`).

```ts
// src/run/reactive.ts — 0 зависимостей, 0 импортов (фреймворк-независимо; ~55 LOC)
type Listener = () => void

/** instance → (field → listeners); WeakMap — инстанс умер, подписки умерли. */
const registry = new WeakMap<object, Map<PropertyKey, Set<Listener>>>()

/** Батчер: все записи в одном tick'е → один цикл уведомлений в microtask. */
const pending = new Map<object, Set<PropertyKey>>()
let scheduled = false
function flush(): void {
  scheduled = false
  const batch = [...pending]; pending.clear()
  for (const [obj, keys] of batch)
    for (const key of keys) {
      const set = registry.get(obj)?.get(key)
      if (set) for (const fn of [...set]) fn()   // копия: fn может отписаться в колбэке
    }
}
function notify(obj: object, key: PropertyKey): void {
  let keys = pending.get(obj)
  if (!keys) pending.set(obj, (keys = new Set()))
  keys.add(key)                                   // dedupe: 2 записи поля = 1 уведомление
  if (!scheduled) { scheduled = true; queueMicrotask(flush) }
}

/** Подписка на конкретное поле: onField(run, 'step', cb) → отписка. */
export function onField(obj: object, key: PropertyKey, fn: Listener): () => void {
  let perKey = registry.get(obj)
  if (!perKey) registry.set(obj, (perKey = new Map()))
  let set = perKey.get(key)
  if (!set) perKey.set(key, (set = new Set()))
  set.add(fn)
  return () => { set.delete(fn) }
}

/** @reactive accessor step = 0 — чтение/запись как у обычного поля. */
export function reactive<C extends object, V>(
  target: ClassAccessorDecoratorTarget<C, V>,
  ctx: ClassAccessorDecoratorContext<C, V>,
): ClassAccessorDecoratorResult<C, V> {
  const key = ctx.name
  return {
    set(this: C, value: V) {
      const prev = target.get.call(this)
      target.set.call(this, value)                // запись сразу: риды в том же tick'е свежие
      if (!Object.is(prev, value)) notify(this, key)   // уведомление отложено и смёржено
    },
  }
}
```

```tsx
// src/ui/useObserved.ts — единственное место, знающее про React (~8 LOC)
import { useCallback, useSyncExternalStore } from 'react'
import { onField } from '../run/reactive'

export function useObserved<C extends object, K extends keyof C & string>(obj: C, key: K): C[K] {
  const subscribe = useCallback((cb: () => void) => onField(obj, key, cb), [obj, key])
  const getSnapshot = useCallback(() => obj[key], [obj, key])
  return useSyncExternalStore(subscribe, getSnapshot)
}
```

Сцена:

```tsx
import { reactive } from './reactive'

export class TrainingRun {                        // НЕ наследует EventTarget — plain class
  @reactive accessor epoch = 0
  @reactive accessor step = 0
  @reactive accessor loss = 1.0
  @reactive accessor lossHistory: number[] = []   // ССЫЛКА: push невидим — см. подводный камень
  advance() {                                     // «Шаг»: 3 записи → 1 microtask-flush
    this.step++
    this.loss = this.computeLoss()
    this.lossHistory = [...this.lossHistory, this.loss]   // replace, не push
  }
}
export const run = new TrainingRun()

export function EpochBadge() {                    // перерисовка на каждый шаг
  const e = useObserved(run, 'epoch'), s = useObserved(run, 'step')
  return <span>Эпоха {e} · Шаг {s}</span>         // значения, не обёртки
}
export function LossChart() {                     // только при изменении истории
  const hist = useObserved(run, 'lossHistory')
  return <svg>{renderPolyline(hist)}</svg>
}
// App.tsx: <button onClick={() => run.advance()}>Шаг</button>
```

Per-field гранулярность честная: `EpochBadge` вообще не уведомляется при изменении только `lossHistory` (в (a) он «будится, но Object.is отсекает» — результат тот же, механизм дешевле на будильник).

**Честный разбор (семантика проверена эмпирически: tsc-эмит ES2022 + node):**

- **DevTools.** `run.step` → число везде (консоль, debugger, golden-тесты) — претензия 2 снята для чтения. НО: accessor-поля — это геттеры на прототипе с private-слотом; `Object.keys(run)` и `JSON.stringify(run)` их НЕ видят (проверено: `['plain']` / `{"plain":5}` для класса с accessor+plain полями); в превью DevTools значение доступно через прототип или явным чтением. В (a) поля — own enumerable, инспекция «объекта целиком» честнее. Мелкая, но реальная цена.
- **Наследование** работает: `class B extends A` пишет через декорированный сеттер базового (проверено); redeclare поля в наследнике — обычный шэдоуинг. Мульти-инстансы независимы (registry — WeakMap per instance).
- **Инициализация** `accessor step = 0` идёт в backing store МИМО сеттера (проверено: счётчик сеттер-вызовов = 0 после конструктора) — уведомлений при конструировании нет. Бонус-факт: TS 5.9 не типизирует `initialize`-хук (в актуальной спеке он есть) — перехватывать инициализацию нельзя, нам и не нужно.
- **СБОРКА — главный практический сюрприз.** `tsc -b` принимает синтаксис (в т.ч. с `erasableSyntaxOnly`), но vitest 5 / vite 8.3.5 (rolldown/oxc) падают на `@dec` И на голом `accessor` с `SyntaxError` ИЗ КОРОБКИ; опции `rolldown.transform.decorator(s)` в этой версии не помогают (проверено). Включение = трансформ-плагин (esbuild ≥0.21 / swc / babel-плагин в `@vitejs/plugin-react`) либо отказ от `accessor` в пользу ручных `get/set` (тот же паттерн, чуть шумнее синтаксис). «0 зависимостей» сохраняется, «0 настройки сборки» — нет.

**Подводный камень: `lossHistory.push()` невидим. Разбор.**

Accessor-семантика = ссылочная семантика: сеттер срабатывает только при присваивании поля (`this.lossHistory = …`). `push/pop/splice/hist[i]=…` мутируют массив под той же ссылкой — сеттер не вызывается, `Object.is` в `getSnapshot` не видит изменения → `LossChart` протухает тихо. Это не дефект декоратора, а фундаментальное свойство «значений без Proxy»:

- то же у Preact Signals (b): `signal.set` требует новую ссылку — поэтому в сниппете (b) история пишется как `[...hist, v]`;
- то же у TC39 Signals (c): равенство по ссылке;
- глубокий трекинг `push` дают ТОЛЬКО Proxy-решения: MobX `observable.array` (d), Vue `reactive`, Svelte `$state` deep proxy (f) — т.е. ровно то, что отвергнуто претензией 2.

Выходы (оба — дешёвая дисциплина на наших данных):

1. **Replace вместо мутации** (сниппет выше): `this.lossHistory = [...this.lossHistory, v]` — O(n)-копия; история лоссов — числа, ≤10⁴ элементов, копия неощутима. Правило «коллекции пишем заменой ссылки» — один тест + ревью.
2. **Version-счётчик рядом с мутируемой коллекцией**: `@reactive accessor historyRev = 0`; `push(); this.historyRev++`; `LossChart` подписан на версию (`useObserved(run, 'historyRev')`), массив читает императивно. O(1), сохраняет `push`, но появляется правило «не забыть bump» и второе поле.
3. Deep-коллекции через Proxy-обёртку — возвращает претензию 2.

Итоговая трилемма: **{значения без обёрток; мутабельные коллекции с push; без Proxy/компилятора} — выбрать можно только два.** Ключевая смягчающая оговорка для нас: худший случай — `Float64Array`-веса Фазы 3 — не трекается ни MobX, ни Svelte `$state` (deep-proxy покрывает только plain arrays/objects), т.е. для тензоров version-счётчик неизбежен В ЛЮБОМ варианте. Трилемма не кусается именно на наших данных: скаляры (значения), история (replace), тензоры (version — везде).

**Вердикт по декораторному пути.** Свой `@reactive` осуществим, мал (~70 LOC с хуком), 0 runtime-deps, поля — значения. Но: (1) цена входа — настройка трансформа (проверено: из коробки не работает); (2) accessor-грабли (Object.keys/JSON); (3) ссылочная дисциплина коллекций та же, что в (a)/(b); (4) главное — поверх (a)+селекторов он даёт ровно одну новую возможность: **пер-полевые события для подписчиков ВНЕ React** (императивный d3/WAAPI-код получает `onField(run, 'lossHistory', redraw)` без фильтра «на всё»). В walkthrough-фазе это не нужно; для live-режима R2+ — разумное расширение. Готовых decorator-only React-совместимых библиотек не существует (см. аналоги).

### П3′. Аналоги в природе

| Библиотека | Механизм | Для React + наших классов? |
|---|---|---|
| **Ember/Glimmer `@tracked`** (`@glimmer/tracking`) | Декоратор на accessor; чтение внутри «tracking frame» потребляет tag поля (revision-счётчик, per property per instance — лениво), запись dirty-ит tag; glimmer-vm перевалидирует кадры. Не listener-сеты, а tag-граф с autotrack. | Нет — машина прочно привязана к glimmer-vm/Ember. Идею (accessor + маркер изменений) взяли; их autotrack-фреймы избыточны (нам не нужен вычислительный граф). |
| **Vue `@vue/reactivity` standalone** | `reactive(new TrainingRun())` оборачивает Proxy: поля читаются как ЗНАЧЕНИЯ (без `.value`!), массивы/Map/Set глубокие — `push` трекается; deps регистрируются в активном effect. | Единственная библиотека, где чтение синтаксически снимает претензию 2, — но по сути это та же Proxy-обёртка (`toRaw` для консоли, потеря прокси-ссылки = потеря трекинга): претензия 2 в глубокой форме возвращается. Официального React-биндинга нет и не планируется; effect-cleanup в React-жизнецикле руками. ~6 KB gz. Нет. |
| **`@lit/reactive`** (Lit 3) | Базовый `ReactiveElement` + `@property()/@state()` на аксессорах; set → `requestUpdate()` → microtask-батч → перерендер lit-html-шаблона с точечным diff. Пер-полевых подписок НЕТ — широковещательный батч + фильтрация при рендере. | Нет — требует LitElement-хост (custom elements). Ценно как внешнее подтверждение: «accessor-декоратор + microtask-батч + фильтрация при рендере» — битва-проверенная схема; это же устройство у нашего (a) (uSES + Object.is). |
| **nanostores** (+`@nanostores/react`) | Атомы: `atom(0)`, `map()`, `computed()`; класс держит атомы в полях → `.get()/.set()`; официальный хук `useStore`; ядро ~0.3 KB. | Синтаксически те же обёртки-поля (atom вместо signal) — претензия 2 возвращается; единственная выгода перед (a) — кросс-фреймворковость атомов, которая нам не нужна. Нет. |
| Прочие | Angular `signal()` — обёртка (функция-чтение + `.set()`), тянет `@angular/core`; MobX-декораторы — Proxy, см. (d); «ts-observable»/«observable-classes» — устоявшихся decorator-only React-совместимых библиотек нет (поиск 2026-11-03), ближайший стандарт — TC39 Signals, разобран в (c). | — |

Вывод: готового «@tracked для React» в природе нет — аналоги либо привязаны к своему хосту (Glimmer, Lit, Angular), либо Proxy (MobX/Vue). Декораторный путь = писать свой (~70 LOC выше) или не писать вовсе.

### П4. Svelte: руны — только через компилятор; «независимые классы» = stores = снова обёртки

Подтверждено документацией Svelte 5 (проверено 2026-11-03):

- **Руны — компиляторная фича.** Доки «.svelte.js and .svelte.ts files»: такие файлы «behave like any other `.js` or `.ts` module, except that you can use runes». `$state` валиден ТОЛЬКО в `.svelte`, `.svelte.js`, `.svelte.ts`, обрабатываемых svelte-компилятором. «Фреймворк-независимый класс с `$state`» возможен только как `.svelte.ts`-модуль, обязанный собираться svelte-тулчейном (vite-plugin-svelte) — из чистого TS/React-билда его не потребить. Независимость от Svelte при рунах невозможна по построению.
- **Runtime-альтернатива без компилятора — `svelte/store`** (`writable/readable/derived`): чистый runtime, работает в любом `.ts`. Но это снова обёртки: `.set/.update/.subscribe`, наружу торчит стор, а не значение; даже авто-подписка `$store` — компиляторный сахар, доступный только внутри `.svelte`. Класс на stores:

```ts
// training-run.ts — plain TS, компилятор не нужен
import { writable, type Readable } from 'svelte/store'

export class TrainingRun {
  #step = writable(0)
  #lossHistory = writable<number[]>([])
  advance() {
    this.#step.update(s => s + 1)
    this.#lossHistory.update(h => [...h, this.computeLoss()])  // снова ссылка-замена, не push
  }
  get step(): Readable<number> { return this.#step }      // наружу — СТОР, не значение
  get lossHistory(): Readable<number[]> { return this.#lossHistory }
}
// в .svelte: const step = run.step → в шаблоне {$step};
// в React понадобился бы uSES поверх .subscribe + get() из 'svelte/store'
```

Ответ на вопрос 4: **да** — руны всегда требуют `.svelte/.svelte.js/.svelte.ts` (компилятор); фреймворк-независимые классы на Svelte = stores, и это возвращает претензию 2 (обёртки вместо значений, `.subscribe/.set` — те же сигналы под другими именами). В React-проекте `svelte/store` как зависимость лишена смысла вдвойне.

### Обновлённая матрица и рекомендация

Критерии — из претензий: значения без обёрток (П2), фреймворк-независимость классов, зависимости, цена входа.

| | Значения без обёрток (П2) | Классы независимы | Dep gz | Цена входа | Ключевой потолок/риск |
|---|---|---|---|---|---|
| **(a) uSES + корень/селекторы** | ✅ plain-поля | ✅ реактивность классов не касается | **0** | **0** (уже есть) | ручные dep-списки (селекторы); дисциплина примитивных срезов |
| **(a+dec) `@reactive` accessor** | ✅ чтение — значения; ⚠️ Object.keys/JSON не видят accessor-поля | ✅ файл реактивности без фреймворк-импортов | **0** (свой ~70 LOC) | ⚠️ сборка: rolldown/oxc из коробки не ест `@dec`/`accessor` (проверено) — нужен трансформ-плагин или ручные get/set | `push` невидим: replace/version; трилемма |
| (b) Preact Signals | ❌ `.value` | ❌ реактивный рантайм в домене | ~6 KB + плагин | средняя | та же ссылочная дисциплина |
| (c) TC39 polyfill | ❌ `.get()/.set()` | ❌ | ~5 KB | +свой биндинг | «do not use in production» |
| (d) MobX | ✅ синтаксис, ❌ по сути Proxy | ❌ | ~17 KB | средняя | Float64Array мимо; push ок для `number[]` |
| (e) Solid | ❌ сигнальные пары | ❌ | замена React | 100% UI | — |
| (f) Svelte 5 | ✅ в классе (`$state`) | ❌ руны только через svelte-компилятор; stores-вариант = ❌ обёртки | замена React | 100% UI | — |
| — `@vue/reactivity` standalone | ✅ чтение (Proxy под капотом) | ⚠️ | ~6 KB | нет официального React-биндинга | Vue-рантайм в React-продукте |

**Рекомендация (обновлённая; критерии П2/независимость/0-dep/React — учтены):**

1. **Остаться на (a) в форме «один реактивный корень + селекторы»** (§ П1): претензия 1 снимается паттерном, претензия 2 снята по построению, классы фреймворк-независимы, 0 зависимостей и 0 настройки сборки.
2. **Декораторный «расширенный (a)» — санкционированное расширение на R2+, не текущий шаг.** Включать, когда появятся живые состояния И подписчики вне React (императивный d3/WAAPI, которым нужны пер-полевые события без фильтра «на всё»). Реализация — свой ~70-LOC `@reactive` из этого аддендума (0 deps); цена входа известна и проверена: трансформ-плагин из-за rolldown + ссылочная дисциплина коллекций (replace/version; для `Float64Array` version неизбежен в любом варианте).
3. Библиотеки — по-прежнему нет: каждая либо обёртка (b/c, nanostores, svelte/stores), либо Proxy (d, Vue — единственная с value-чтением, но без React-поддержки), либо компилятор/миграция (e/f). TC39 Signals — наблюдать до Stage 3 + канонического React-биндинга.

---

*Ревью R4 для фазы 01 + аддендумы (§ Сниппеты; § Декораторы и мульти-объектность). Рекомендация неизменна и подтверждена разбором претензий: без библиотеки — (a) «корень + селекторы»; `@reactive`-декоратор задокументирован как санкционированное расширение R2+. Триггеры пересмотра — в §5.*
