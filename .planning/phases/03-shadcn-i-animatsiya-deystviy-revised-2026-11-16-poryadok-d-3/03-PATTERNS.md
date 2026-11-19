# Phase 3: shadcn и анимация действий — Pattern Map

**Mapped:** 2026-11-19
**Files analyzed:** 24 сущности (~31 физический файл: 11 новых, ~20 модифицируемых)
**Analogs found:** 18 / 24 (6 без аналога — вендорные shadcn-файлы и новая инфраструктура алиасов; для них паттерн — RESEARCH.md §1.1–1.5 + канонические файлы CLI)

> Важная поправка к допущению контекста: домен-папки `src/ui/*` **не имеют** собственных баррелов `index.ts` и README — импорты в ui-дереве прямые (`from '../typography/SubscriptText'`, NumberHint.tsx:16). Баррелы + README существуют в `src/format/`, `src/tensor/`, `src/run/*` — они и есть аналоги для `src/ui/kit/`. `kit/` станет ПЕРВЫЙ папкой в ui-дереве с баррелом (D-43 «домены импортируют из ui/kit как из библиотеки»).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `components.json` (новый, корень) | config | — | `vite.config.ts` + `playwright.config.ts` (конвенция корневых конфигов с док-комментарием) | role-match (контент — RESEARCH §1.2) |
| `src/ui/kit/index.ts` (новый) | utility (баррел) | — | `src/format/index.ts` (1–7) | exact |
| `src/ui/kit/README.md` (новый) | config (doc) | — | `src/format/README.md` + `src/ui/README.md` | exact |
| `src/ui/kit/utils.ts` (новый, `cn`) | utility | transform | — | **no analog** |
| `src/ui/kit/button.tsx` (новый, вендор) | component (vendor) | event-driven | — (cva-мультиэкспорт; гейт-совместимость = `src/structure.test.ts` R1) | **no analog** |
| `src/ui/kit/card.tsx` (новый, вендор) | component (vendor) | — | — | **no analog** |
| `src/ui/kit/tooltip.tsx` (новый, radix) | component (vendor) | event-driven | контракт `src/ui/numbers/NumberHint.tsx` (пилот D-40) | partial (контракт, не реализация) |
| `src/ui/kit/kbd.tsx` (новый, вендор) | component (vendor) | — | `.kbd` CSS `src/index.css:532-542` | partial (стилевой контракт) |
| `src/ui/kit/collapsible.tsx` (новый, radix) | component (vendor) | event-driven | `<details>` в `src/ui/chain/LinkHistory.tsx:150-179` (пилот) | partial (контракт disclosure) |
| `src/ui/kit/tabs.tsx`, `slider.tsx` (условные, D-42) | component (vendor) | event-driven | — | **no analog** (только при точке замены) |
| `src/index.css` (модиф.) | config (styles) | transform | собственный `@theme`-блок `src/index.css:29-82` + гейты `841-854` | exact (расширение себя) |
| `package.json` + `pnpm-lock.yaml` (модиф.) | config | — | `.planning/phases/01.1-.../01.1-04-PLAN.md` Task 2 (sanctioned-установка) | role-match |
| `tsconfig.app.json` (+ корневой `tsconfig.json`) (модиф.) | config | — | — (paths/alias в проекте отсутствуют) | **no analog** |
| `vite.config.ts` (модиф.) | config | — | — (`resolve.alias` отсутствует) | **no analog** |
| `src/ui/numbers/NumberHint.tsx` (модиф., пилот D-40) | component | event-driven | сам файл — контракт (testid/контент/портал) | exact (self) |
| `src/ui/chain/LinkHistory.tsx` (модиф., пилот) | component | event-driven | сам файл + e2e `smoke.spec.ts:280-298` | exact (self) |
| `src/ui/stepper/StepControls.tsx` (модиф.) | component | event-driven | сам файл + `.btn`-семейство `index.css:220-264` | exact (self) |
| `src/ui/app/App.tsx` (модиф.) | component | event-driven | сам файл (toggle-lecture 82-90, kbd 179-183, card 110-142) | exact (self) |
| `src/ui/graph/ComputationGraph.tsx` (модиф.) | component | event-driven | сам файл (коллапс 142-163/375-407) + `.g-tip`-переход 1001-1025 | exact (self) |
| `src/ui/stepper/StepperBand.tsx` (модиф.) | component | event-driven | сам файл + `.step-pill-active::after` `index.css:353-363` | exact (self) |
| Потребители `.card` ×6: `operation/OperationPanel.tsx`, `numbers/NumberDrilldown.tsx`, `epoch/EpochSummary.tsx`, `dataset/ExamplesPanel.tsx`, `dataset/ResultPanel.tsx`, `chain/LinkPanel.tsx` (модиф.) | component | — | `.card`-семейство `index.css:163-195` + вёрстка `App.tsx:110-142` | exact (self) |
| `e2e/smoke.spec.ts` (модиф.) | test | request-response (page) | сам файл: reducedMotion 63-65, animation-ассерт 94-98, тултип 100-114, коллапс 477-515 | exact (self) |
| `.planning/PROJECT.md` (модиф.) | config (doc) | — | собственный раздел «Глоссарий» (PROJECT.md:78+) | exact (self) |
| `DECISIONS.md` (модиф.) | config (doc) | — | формат записи D-37 (DECISIONS.md:192-196) | exact (self) |

## Pattern Assignments

### `components.json` (новый, корень) — config

**Analog (конвенция):** `vite.config.ts:1-14`, `playwright.config.ts:1-31` — корневые конфиги открываются док-комментарием «зачем», без runtime-кода. Контент — НЕ из аналога, а из RESEARCH §1.2 (таблица полей: `tailwind.config: ""`, `tailwind.css: "src/index.css"`, `aliases.ui: "@/ui/kit"`, `aliases.utils: "@/ui/kit/utils"`, `style: "new-york"`, `rsc: false`, `cssVariables: true`).

**Конвенция корневого конфига** (`playwright.config.ts:1-7`):
```ts
/**
 * E2E конфиг прототипа (RESEARCH §6.2): 5 проверок-смок против production-сборки
 * (vite preview). …
 */
```

---

### `src/ui/kit/index.ts` — баррел вендорной зоны

**Analog:** `src/format/index.ts` (весь файл, 7 строк) — док-комментарий «едининая публичная точка» + реэкспорты:

```ts
/**
 * Баррел форматирования чисел (D-34, ревью 02-11): единственная публичная
 * точка формата — потребители импортируют '../format' (numbers.ts удалён).
 */
export { MINUS, toDisplayMinus } from './minus'
export { formatKey } from './formatKey'
export { exactRepr } from './exactRepr'
```

Второй образец крупного баррела — `src/tensor/index.ts:1-10` (заголовок «ЕДИНСТВЕННАЯ публичная точка входа…» + именованные экспорты типов через `type`). Кит повторяет формулу: `export { Button, buttonVariants } from './button'` … Домены импортируют `../kit` (относительный путь — в ui-дереве алиас `@/` для доменов не вводится, см. § tsconfig).

---

### `src/ui/kit/README.md` — README вендорной зоны

**Analog:** `src/format/README.md` — заголовок «src/format — …», абзац роли, таблица/список «файл → ответственность», явное указание публичного входа. Плюс `src/ui/README.md:1-7` — фиксация правил структуры домена.

Здесь README обязан зафиксировать D-44: «кит = вендорная зона гранулометрии: канонические shadcn-файлы (мультиэкспорт Button + buttonVariants, cva) легальны ТОЛЬКО внутри kit/; домены сохраняют D-34 (1 субъект/файл)» + D-41 (lucide-импорты вычищаются, иконки — Material Symbols) + инструкцию обновления через `shadcn add` (diff-merge).

---

### `src/ui/kit/utils.ts` (`cn`) — **no analog**

В репо нет clsx/tailwind-merge/cva — ничего копировать. Файл создаёт `shadcn init`/`add` по `aliases.utils: "@/ui/kit/utils"` (RESEARCH §1.2). Единственные требования проекта: именованный экспорт (`export function cn`), без `export default` (R1), импорт только внутри кита.

---

### `src/ui/kit/{button,card,kbd,collapsible,tabs,slider}.tsx` — вендорские компоненты shadcn

**No analog по реализации; два проектных контракта:**

1. **Гейт R1** (`src/structure.test.ts:65-72`) — regexp `/^\s*export\s+default\b/m` по всем `src/**`: канонические shadcn-файлы используют именованные экспорты → совместимы без правок гейта (D-44). R2 (`structure.test.ts:74-80`) требует подпапку — `kit/` ей является, корень `src/ui/` не трогается.

2. **Файловая гигиена доменного компонента** (стиль док-комментария) — `src/ui/numbers/NumberHint.tsx:18-28`: каждый файл открывается JSDoc «что это, какое решение, почему изоляция». Вендорские файлы получают КОРОТКУЮ пометку-вставку сверху («kit/, вендорная зона D-44; локальные правки помечаются»), не заменяя канонический контент (diff-merge с CLI).

**Контракты воспроизводимых стилей** (кит-варианты обязаны давать тот же рендер — D-38 «экраны визуально идентичны»):

- Button → `.btn`-семейство `src/index.css:220-264`: quiet-default (прозрачный фон, hairline-бордер `--color-outline-variant`, hover `container-high`), `.btn-primary` (241-251: `bg-primary-container` → hover `bg-primary`, active = `color-mix(... 85%, black)`), disabled (252-255: opacity 60%), toggle `aria-pressed` (256-260: мятный контур, не заливка), focus-visible (261-264: `outline: 2px solid var(--color-primary)`). Радиус 4, min-height 40, nowrap.
- Card → `.card`-семейство `src/index.css:163-195`: `container-low`, radius 2, padding 16, `--shadow-card`; `.card-head/.card-title/.card-meta/.screen`.
- Kbd → `.kbd` `src/index.css:532-542`: моно 11px, бордер с `border-bottom-width: 2px`, `container-lowest`-фон (в проекте — `container`), radius 4.
- Collapsible → поведение `<details>` `LinkHistory.tsx:150-179` (см. пилот ниже).

---

### `src/index.css` (модиф.) — токен-мост + tw-animate-css + гейты + новые анимации

**Analog 1 — механика алиаса внутри темы уже существует** (`src/index.css:62-66`):
```css
  /* Фазная семантика (D-25): fwd=мята, loss=error, bwd=амбер, upd=циан */
  --color-phase-fwd: var(--color-primary);
  --color-phase-loss: var(--color-error);
  --color-phase-bwd: var(--color-tertiary);
  --color-phase-upd: var(--color-secondary);
```
и `--font-outlier: var(--font-mono);` (:34) — var()-ссылки в `@theme` на соседние токены — рабочий прецедент; мост D-39 расширяет ту же технику (:root-алиасы + `@theme inline`-реэкспорт по RESEARCH §1.4, код-пример «Токен-мост» в RESEARCH:445-478). Вставка — рядом с блоком `@theme` (после :82), не внутрь него.

**Analog 2 — импорт CSS-пакета**: строка 9 `@import "tailwindcss";` — `@import "tw-animate-css";` добавляется в тот же блок импортов (9-13).

**Analog 3 — print-гейт (расширение списком селекторов)**, `src/index.css:849-854`:
```css
@media print {
  .diag-edge-g.active .diag-flow,
  .step-pill-active::after {
    animation: none;
  }
}
```
Новые анимации точек (travel-оверлей, коллапс, enter/exit кита) добавляются в этот селектор-список. Reduced-motion-блок 841-848 НЕ меняется (гасит всё скопом — легальная более строгая реализация D-48, RESEARCH §5.4).

**Analog 4 — переход «приезд подсветки» уже существует**, `src/index.css:671-681`:
```css
.diag-node,
.diag-edge,
.diag-edge-casing,
.diag-flow,
.diag-edge-label {
  transition:
    stroke 180ms,
    fill 180ms,
    opacity 180ms,
    stroke-width 180ms;
}
```
Фаза приводит конверт к 150–400 мс и симметризует гашение предыдущей группы (RESEARCH §5.1) — правка этих же строк.

**Analog 5 — точечный reduced-motion-оверрайд** (прецедент локального гейта), `src/index.css:1001-1025`:
```css
.g-tip { /* hover-тултип рёбра … */
  opacity: 0;
  transition: opacity 120ms ease;
}
…
@media (prefers-reduced-motion: reduce) {
  .g-tip {
    transition: none;
  }
}
```

**Analog 6 — пульс/оверлей пилюли** (не трогается, континуальный индикатор): `.step-pill-active::after` `src/index.css:353-363` с `@keyframes step-pill-pulse` (361-363).

**Новые CSS-блоки фазы** (образцы — RESEARCH «Code Examples»: `.step-halo` transform-transition 250 мс, will-change: transform). Коллапс-анимация: transform/opacity на SVG-группах с `transform-box: fill-box` (RESEARCH §5.2); зум-обёртку (`transform: scale(...)` на svg, ComputationGraph.tsx:204) НЕ анимировать — конфликт каналов (Pitfall 6).

---

### `package.json` + `pnpm-lock.yaml` (модиф.) — пакетный апрув

**Analog (процессный):** `.planning/phases/01.1-arhitekturnyy-refaktoring-r1-r5/01.1-04-PLAN.md`, Task 2, action п.1 (строка ~117) — единственный прецедент sanctioned-установки в проекте:

> «Установка: pnpm add @floating-ui/react (точная свежая 1.x). Package-legitimacy: пакет санкционирован пользовательским решением R5…; тем не менее перед установкой сверить на npmjs.com… соответствие owner/org и версии; типы поставляются в самом пакете (отдельный @types НЕ ставить — постоянное правило проекта). GZ-размер зафиксировать в SUMMARY (vite build report…)».

Плюс маркер задачи `<-- planner-discipline-allow: floating-ui -->` (строка 107) и `<reversibility rating="costly">` с обоснованием «состав зависимостей меняется (lockfile)» (строка 108). План 03-01 повторяет каркас: таблица RESEARCH «Домен 2» = пакетный апрув владельца → `pnpm add` точных версий (tw-animate-css пиннить `1.4.0` без caret, RESEARCH §1.3) → gz-дельта в SUMMARY → при вердикте D-40 «покрыл»: `pnpm remove @floating-ui/react` (сейчас `package.json:15`, `0.27.20`).

---

### `tsconfig.app.json` + `tsconfig.json` + `vite.config.ts` (модиф.) — алиас `@/*` — **no analog**

Проверено: `paths`/`resolve.alias` в проекте **отсутствуют** (`tsconfig.app.json` — compilerOptions без paths, `include: ["src"]`; корневой `tsconfig.json` — solution-style: `files: []` + `references`; `vite.config.ts:7-14` — только plugins/test). Это новая инфраструктура, не расширение существующей. Канонический фрагмент — RESEARCH §1.1 (п.2-3): `compilerOptions.paths: { "@/*": ["./src/*"] }` в **обоих** tsconfig (CLI читает корневой, сборка — app) + `resolve: { alias: { @: path.resolve(__dirname, "./src") } }` в vite.config.ts.

Ограничения компилятора, которым обязаны удовлетворять генерации shadcn (`tsconfig.app.json:14-28`): `verbatimModuleSyntax`, `erasableSyntaxOnly`, `exactOptionalPropertyTypes`, `noUnusedLocals/Parameters` — план проверяет первый `shadcn add` билдом (`pnpm build` = `tsc -b && vite build`).

---

### `src/ui/numbers/NumberHint.tsx` (модиф., пилот D-40) — radix против floating

**Analog: сам файл — неизменный контракт.** Пилот обязан сохранить (RESEARCH §3.1, сверено чтением):

- Обёртка-изоляция: док-комментарий 18-28 — «ЕДИНАЯ обёртка над @floating-ui/react — изоляция библиотеки для будущей замены… всё Floating UI живёт только в этом файле» → radix-замена живёт ТОЛЬКО здесь + в `kit/tooltip.tsx`.
- Контракт поведения (36-47): `placement: 'top'`, `offset(6)+flip+shift({padding:8})`, `restMs: 60, delay: {open: 120}`, focus, Esc-dismiss, role tooltip.
- Контракт DOM (63-91): портал `createPortal(…, document.body)`, `data-testid="number-hint"`, `className="num-hint"` (z-50, index.css:882-895), контент — метка+значение / формула (`hint-formula`) / градиент (цвет по знаку через `var(--color-neg-text/pos-text)`) / note.
- Клонирование якоря (52-56): `cloneElement` + ref-callback — SVG-якоря графа работают через `elements`-опцию; radix-эквивалент — `Tooltip.Trigger asChild` (RESEARCH §3.2).
- Touch: «мобильный тап тултип не показывает… тап ведёт сразу в drill» (22-24) — обязательный пункт пилота (RESEARCH §3.3.2).
- e2e-контракт: `smoke.spec.ts:103-114` (hover → number-hint видим, содержит значение и «W[0,0]», aria-describedby, Esc, клик → drill-panel).

Риск-флаг: restMs-семантика (radix открывает по delay от входа — RESEARCH §3.3.1). Провал любого критерия → floating остаётся, radix-тултип живёт только в ките (D-40).

---

### `src/ui/chain/LinkHistory.tsx` (модиф., пилот Collapsible) — disclosure-контракт

**Analog: сам файл.** Что обязан воспроизвести radix Collapsible (150-179):

```tsx
<details data-testid="link-history" className="link-history">
  <summary className="ui-label link-history-summary">
    История по сэмплам: <SubscriptText text={symbol} />
    {series.length > 1 ? ` — ${String(series.length)} рядов` : ''}
  </summary>
  <div className="link-history-body">…</div>
</details>
```

⚠️ **Пилот-риск e2e (сильнее, чем сформулировано в OQ5):** smoke.spec.ts проверяет НЕ только testid — `await expect(history).not.toHaveAttribute('open', '')` (smoke.spec.ts:282) и `history.evaluate((el) => el.open)` (:295) — это нативный DOM-API `<details>`. Radix Collapsible рендерит div-структуру без атрибута `open` → эти два ассерта ломаются. Т.к. D-38 фиксирует «e2e-селекторы (17 проверок) не меняются», план обязан либо сохранить нативный `open`-контракт на корневом элементе (data-state + дублирующий атрибут), либо явно вынести эту микроправку на ревью как «DOM-API, не testid». Триггер-контракт: клик по summary раскрывает (286), заголовок содержит символ (283-284, 296).

Анимация раскрытия — `collapsible-down/up` из tw-animate-css (читают `--radix-collapsible-content-height`, RESEARCH §1.3).

---

### `src/ui/stepper/StepControls.tsx` (модиф.) — кнопки → kit Button

**Analog: сам файл + `.btn`-CSS.** Потребители сегодня (grep `"btn`): `StepControls.tsx:39-75` (`btn` ×2, `btn btn-primary` ×2), `App.tsx:82-90` (toggle-lecture `btn` + aria-pressed), `ComputationGraph.tsx:184-192` (зум ×3, с `graph-zoom .btn`-оверрайдом `index.css:1035-1038` — min-width 34, padding 2px 8px), `NumberDrilldown.tsx`, `LinkPanel.tsx` (`.link-close` — компактный крестик, `index.css:425-428`). Миграция = замена className на kit-варианты cva при сохранении: `data-testid` (`btn-reset/btn-epoch/btn-next/btn-epoch-next/toggle-lecture/graph-zoom-*`), RU-лейблов, `ui-label`-типографики, клавиатурного контракта (StepControls.tsx:17-35 — Space на кнопке не дублируется нативным click).

Образец текущего потребителя (StepControls.tsx:39-46):
```tsx
<button
  type="button"
  data-testid="btn-reset"
  className="btn ui-label"
  onClick={() => run.reset()}
>
  Сброс
</button>
```

---

### `src/ui/app/App.tsx` (модиф.) — toggle/kbd/карточки

**Analog: сам файл.** Точки: toggle-lecture 82-90 (btn + `aria-pressed={mode === 'lecture'}`), kbd в статус-баре 179-183 (`<kbd className="kbd">Space</kbd>`), карточки 110-142 (`.card` + `.card-head` + `.icon`-глиф + `.card-title` + `.card-meta` + `.screen`) — образец того, как выглядят потребители Card-кита:
```tsx
<section aria-label="Слот графа вычислений" data-testid="diagram-slot" className="card min-h-[320px] flex-1">
  <div className="card-head">
    <span className="icon" aria-hidden="true">hub</span>
    <h2 className="card-title">Граф вычислений {netShapeOf(activeScenario())}</h2>
    <span className="card-meta ui-label">живые значения и градиенты</span>
  </div>
  <div className="screen min-h-0 flex-1">…</div>
</section>
```
Иконки — глифы Material Symbols (`.icon` + ligature «hub»/«monitoring») — D-41: lucide-глифы из генераций shadcn заменяются на эти.

---

### Потребители `.card` ×6 (модиф.)

`operation/OperationPanel.tsx`, `numbers/NumberDrilldown.tsx`, `epoch/EpochSummary.tsx`, `dataset/ExamplesPanel.tsx`, `dataset/ResultPanel.tsx`, `chain/LinkPanel.tsx` (grep `className="card`). Паттерн замены — как в App.tsx (выше): классы → kit-Card, содержимое/тестиды/RU-строки нетронуты.

---

### `src/ui/graph/ComputationGraph.tsx` (модиф.) — анимация коллапса нейрона (точка 2, D-47)

**Analog 1 — машина состояний коллапса (не меняется семантикой)**, 142-163:
```tsx
// 2.1-03 (фикс 4): коллапс рамок-нейронов — локальный UI-state, по умолчанию
// все рамки раскрыты; переключение — двойной клик по рамке/блоку или
// Enter/Space на заголовке рамки (a11y); мгновенно, без transition
const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
```
Комментарий «мгновенно, без transition» — прямая точка доработки фазы 3 (D-47). Два детерминированных кадра: рендер членов (280-370, `collapsed.has → return null`) и коллапс-блок (375-407, `frame-block`); якоря рёбер переприкрепляются `anchorWithCollapse` (156-163). Геометрия — чистые функции `frames.ts` / `geometry.ts` (оба файла — «детерминизм e2e: одинаковый вход даёт бит-идентичную картину, без измерений DOM», frames.ts:2-4) — НЕ меняются; анимация = transform/opacity-интерполяция между кадрами (RESEARCH §5.2), interrupt = повторный dblclick ретаргетит transition.

**Analog 2 — переходный SVG-паттерн проекта**: `.g-tip` opacity 120 мс (index.css:1001-1009) + симметричный гасящий переход `.diag-*` (671-681). Техника: `transform-box: fill-box` на `<g>` (центрирование scale вокруг bbox группы).

**Запрет (Pitfall 6):** зум-обёртка 194-204 (`graph-zoom-layer` + `style={{ transform: scale(zoom), transformOrigin: '0 0' }}`) — transform не трогать; лекционный `--diag-scale` тоже суммируется, не подменяется.

**e2e-контракт коллапса:** smoke.spec.ts:477-515 — `data-frame`/`data-collapsed`/`aria-expanded`/`frame-block`/члены скрыты (`toHaveCount(0)`)/z виден/значение живое. Конечные кадры бит-идентичны сегодняшним (D-38).

---

### `src/ui/stepper/StepperBand.tsx` (модиф.) — travel-подсветка (точка 1, D-47)

**Analog 1 — оверлей-паттерн:** `.step-pill-active::after` (index.css:353-360) — абсолютный оверлей `inset: 0` с `pointer-events: none`. Travel = вынос оверлея в один элемент-«гало» над `.step-band` c `transform: translateX(...)`-transition (RESEARCH Code Examples, `.step-halo`, 250 мс cubic-bezier(0,0,0.2,1), `will-change: transform`). Layout-полоса стабильна (`grid-auto-columns: minmax(108px, max-content)`, index.css:302-308 — по UI-SPEC); позиция оверлея = `offsetLeft` активной пилюли (тот же bandRef-паттерн, что автоскролл).

**Analog 2 — JS-side reduced-motion гейт** (единственный в проекте), StepperBand.tsx:41-49:
```tsx
useEffect(() => {
  const band = bandRef.current
  if (band === null || epochDone) return
  const active = band.children[stepInSample - 1]
  if (active === undefined) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  active.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduce ? 'auto' : 'smooth' })
}, [stepInSample, epochDone])
```
Любая JS-логика позиционирования гало повторяет этот матчMedia-взгляд (мгновенная установка позиции при reduce).

Точка 3 (волна backprop) — доработка `.diag-flow`-механизма в CSS (index.css:690-710: dash-паттерн, delay-каскад по рёбрам), компонент не меняется; селектор направления `[data-flow="backward"]` (702-705) — контракт e2e 1/2.

---

### `e2e/smoke.spec.ts` (модиф.) — пилот-проверки и ассерты

**Analog: собственные паттерны файла.**

1. **Детерминизм-сетап** (63-65 + playwright.config.ts:14-23):
```ts
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
})
```
`deviceScaleFactor: 2` (playwright.config.ts:22) — «полупиксели становятся целыми device-px»; двойной прогон бит-идентичен.

2. **Анимационный ассерт** (94-98) — расширяется на kit-тултип/коллапсибл (Pitfall 4):
```ts
const flowAnimation = await page
  .locator('.diag-edge-g.active .diag-flow')
  .first()
  .evaluate((el) => getComputedStyle(el).animationName)
expect(flowAnimation, 'reduced-motion: бегущий пунктир погашен (animation-name === none)').toBe('none')
```

3. **Тултип-проверка** (100-114) — шаблон пилота D-40 (hover → number-hint, контент, aria-describedby, Esc, клик → drill).

4. **Коллапс-проверка** (477-515) — шаблон анимационного теста точки 2 (data-collapsed, aria-expanded, frame-block, числа живые).

5. **Details-проверка** (280-298) — риск-зона пилота Collapsible (см. LinkHistory выше).

---

### `.planning/PROJECT.md` (модиф.) — глоссарий `kit`

**Analog:** собственный раздел `## Глоссарий` (PROJECT.md:78+) — «Технические идентификаторы — английские; пользовательские термины — словарь студента». Добавляется строка `kit` = «UI-кит проекта на shadcn, вендорная зона (src/ui/kit/, D-43/D-44)» в согласованном формате словаря.

### `DECISIONS.md` (модиф.) — вердикт D-45

**Analog:** формат записи D-37 (DECISIONS.md:192-196) — `### D-NN. <формулировка>` + поля **Когда / Почему / Супрессии / Отброшено**. Новая запись о выборе анимационного подхода (рекомендация CSS-only, формула — RESEARCH «Рекомендация по анимации» :369) с супрессией D-23.

## Shared Patterns

### Изоляция сторонней библиотеки одним файлом
**Source:** `src/ui/numbers/NumberHint.tsx:24-27` («ЕДИНАЯ обёртка… всё Floating UI живёт только в этом файле»)
**Apply to:** kit/radix-обёртки, пилоты D-40. Вся сторонняя механика — за фасадом одного модуля/папки кита.

### reduced-motion/print гейты
**Source:** `src/index.css:841-854` (глобальный), `:1021-1025` (локальный), `StepperBand.tsx:47-48` (JS matchMedia)
**Apply to:** все новые анимации (travel, коллапс, enter/exit кита) и любое JS-позиционирование. Новых JS-движков — нет (рекомендация D-45: CSS-only).

### Контракт экрана = testid + RU-строки + классы-селекторы e2e
**Source:** `StepControls.tsx:41` (data-testid), `App.tsx:168-177` (точный текст «Эпоха N · пример N · шаг N»), smoke.spec.ts:81/123/127 (data-flow), :282/:295 (open-атрибут details)
**Apply to:** ВСЕ миграции на кит: `data-testid`, RU-копирайт, data-flow/data-selection/data-collapsed — неприкосновенны; см. риск-флаг `open` в LinkHistory.

### Именованные экспорты + док-комментарий файла
**Source:** `src/tensor/index.ts:1-5`, `src/format/index.ts:1-3`, любой доменный файл
**Apply to:** kit/* (R1-гейт `structure.test.ts:65-72` это машинно проверяет).

### Детерминированная геометрия без измерений DOM
**Source:** `src/ui/graph/frames.ts:1-5` («чистая функция структуры… без измерений DOM»), `geometry.ts:1-7`
**Apply to:** коллапс-анимация (интерполяция между двумя известными кадрами; FLIP-измерения запрещены — RESEARCH «Don't Hand-Roll»).

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/ui/kit/utils.ts` (`cn`) | utility | transform | clsx/tailwind-merge в репо не используются |
| `src/ui/kit/button.tsx` | component (vendor) | event-driven | cva-мультиэкспорт — первый в репо; источник = shadcn CLI (style new-york) |
| `src/ui/kit/card.tsx`, `kbd.tsx` | component (vendor) | — | то же |
| `src/ui/kit/collapsible.tsx`, `tooltip.tsx` | component (vendor) | event-driven | radix в репо нет; контракт задан пилотами (NumberHint/LinkHistory), реализация = CLI |
| `src/ui/kit/tabs.tsx`, `slider.tsx` (условные) | component (vendor) | event-driven | точек замены в текущем UI нет (вкладки/слайдер появятся в фазе 4) |
| `components.json` | config | — | первый конфиг стороннего CLI; поля — RESEARCH §1.2 |
| tsconfig `paths` + vite `resolve.alias` | config | — | алиасов в проекте нет — новая инфраструктура (RESEARCH §1.1 п.2-3) |

Для всех строк этой таблицы первоисточник паттерна — 03-RESEARCH.md (§1.1–1.5, Code Examples), а не кодовая база.

## Metadata

**Analog search scope:** `src/**` (все 96 ts/tsx-файлов через git ls-files + выборочное чтение), `src/index.css`, `e2e/`, корневые конфиги, `.planning/phases/01.1-*/01.1-04-PLAN.md`, `.planning/PROJECT.md`, `DECISIONS.md`
**Tracked-source gate (#3645):** все названные аналоги проверены через `git ls-files` — tracked; gitignored-зеркал в списке нет
**Files scanned:** ~25 прочитано целиком/секциями; grep-карта потребителей `.btn`/`.card`/`kbd`/`<details>`/NumberHint
**Pattern extraction date:** 2026-11-19
