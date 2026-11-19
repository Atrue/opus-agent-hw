---
phase: 03-shadcn-i-animatsiya-deystviy-revised-2026-11-16-poryadok-d-3
reviewed: 2026-11-19T18:12:47Z
depth: deep
files_reviewed: 28
files_reviewed_list:
  - components.json
  - package.json
  - tsconfig.json
  - tsconfig.app.json
  - vite.config.ts
  - src/index.css
  - src/ui/kit/button.tsx
  - src/ui/kit/card.tsx
  - src/ui/kit/kbd.tsx
  - src/ui/kit/tooltip.tsx
  - src/ui/kit/collapsible.tsx
  - src/ui/kit/utils.ts
  - src/ui/kit/index.ts
  - src/ui/kit/README.md
  - src/ui/kit/token-bridge.test.ts
  - src/ui/app/App.tsx
  - src/ui/stepper/StepControls.tsx
  - src/ui/stepper/StepperBand.tsx
  - src/ui/graph/ComputationGraph.tsx
  - src/ui/operation/OperationPanel.tsx
  - src/ui/numbers/NumberHint.tsx
  - src/ui/numbers/NumberDrilldown.tsx
  - src/ui/epoch/EpochSummary.tsx
  - src/ui/dataset/ExamplesPanel.tsx
  - src/ui/dataset/ResultPanel.tsx
  - src/ui/chain/LinkPanel.tsx
  - src/ui/chain/LinkHistory.tsx
  - e2e/smoke.spec.ts
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-11-19T18:12:47Z
**Depth:** deep (пер-файловый + кросс-файловый: CSS↔TSX-селекторы, контракты e2e/testid, границы модулей, конфиги сборки)
**Files Reviewed:** 28 (union key-files пяти SUMMARY; pnpm-lock.yaml — только dep-поверхность package.json)
**Status:** issues_found

## Summary

Фаза 3 (shadcn-кит D-43/D-44, motion-анимации D-47/D-50, токен-мост D-39) разобрана adversarial-проходом по текущему состоянию каждого файла скоупа (коммиты 2f14e14..50c6df7 + follow-up'ы уже в master). Вердикт: **код качественный, критических дефектов нет** — числа движка не тронуты (`git diff 5d6ac50..HEAD -- src/tensor` пуст), анимации не гейтят ввод/числа (NFR-01: useLayoutEffect-чтения без await, CSS/compositor-каналы), XSS-поверхность чистая (dangerouslySetInnerHTML/eval/innerHTML — 0 в diff-файлах), границы модулей чистые (UI импортирует тензорную библиотеку только баррелом `../../tensor`).

Гейты перепроверены независимо в этой сессии, а не приняты на слово: `pnpm test` 144/144, `pnpm lint` exit 0 (только warnings, 0 errors), `tsc -b` exit 0, `pnpm e2e` 20/20 (15.9s); `src/structure.test.ts` и `.oxlintrc.json` фазой не менялись (diff пуст). Тесты 1–17 в e2e/smoke.spec.ts действительно не правились (удалённых строк в diff нет), 18/19/20 — содержательные ассерты, не тавтологии.

Найдено 2 Warning и 3 Info. Оба Warning — регрессии миграции 03-02/03-05: (1) гало-подсветки не переизмеряются при смене метрик шрифта (лекционный режим удваивает `--num-size` — гало строки «Примеров» теряет позицию до следующего сэмпла, а визуальную подсветку текущей строки теперь несёт только гало); (2) миграция `section → Card` уронила landmark-семантику: `aria-label` на `div` без роли невалиден и игнорируется скринридерами. Известные решения (D-50, CardTitle=h2, travel-гало, delay-каскад, `.link-close`-модификатор) не находились; три пункта 03-UI-REVIEW.md (kit Tooltip вне моста, print-гейт `.graph-canvas`, мёртвое `.samples-*`-семейство) не дублируются.

## Warnings

### WR-01: Гало-геометрия измеряется один раз и не переизмеряется при смене метрик (лекционный режим / late font swap)

**File:** `src/ui/dataset/ExamplesPanel.tsx:44-56`, `src/ui/stepper/StepperBand.tsx:64-76`
**Issue:** Оба travel-гало (`.samples-row-halo`, `.step-halo`) вычисляют позицию в `useLayoutEffect` с deps только `[sampleIndex]` / `[stepInSample, epochDone]`. Но высота строк «Примеров» зависит от `--num-size`: таблица несёт класс `.num` (`src/index.css:165-171`), а лекционный режим удваивает переменную (`.lecture { --num-size: 32px }`, `src/index.css:87-92`). Компоненты не подписаны на `mode` — переключение «Лекционный режим» в середине эпохи делает строки выше (~33px → ~54px), а `translateY/height` гало остаются от старой геометрии: подсветка текущего примера висит между строками до следующей смены сэмпла. Это пользовательски видимая неверная индикация именно в фазе 3: до неё визуальную подсветку несёл `.sample-row-current` (репейнтится CSS-каскадом сам), теперь — только гало (`src/index.css:1148-1151` — правило `.sample-row-current td` intentionally пустое, класс оставлен как e2e-контракт). Тот же класс проблемы у ленты: поздний swap моно-шрифта (fontsource грузится после первого paint) меняет `max-content`-ширину пилюль — гало ленты/`offsetLeft` устаревают до следующего шага; случай более узкий, т.к. пилюли используют фиксированные 11/12px, а не переменные. Сопутствующее: комментарий `ExamplesPanel.tsx:42-43` («offsetTop к wrap — positional-предок») фактически неверен — `offsetParent` у `<tr>` это `.samples-table` (`position: relative`, `src/index.css:1130`), совпадение координат сегодня держится на нулевых margin/padding таблицы в wrap; любой паддинг wrap молча разъедет гало со строками.
**Fix:** Переизмерять гало при изменении метрик, а не только индекса: (а) минимально — добавить в deps источник изменения кегля (в ExamplesPanel подписка `useRunSlice((r) => r.mode)` и включение в deps) и домерять после `document.fonts.ready`; (б) надёжно — `ResizeObserver` на `wrapRef`/`bandRef`, который повторяет измерение при любом изменении размеров контейнера (покрывает и lecture, и font swap, и будущие правки CSS). Заодно поправить комментарий про positional-предок на фактический (`.samples-table`).

### WR-02: Миграция `section → Card` уронила landmark-семантику: `aria-label` на `div` без роли

**File:** `src/ui/app/App.tsx:114-118`, `src/ui/dataset/ExamplesPanel.tsx:59`, `src/ui/dataset/ResultPanel.tsx:43`
**Issue:** До фазы три региона экрана были `<section aria-label="…">` (проверено по 5d6ac50: `ResultPanel.tsx:42`, `ExamplesPanel.tsx:33`, `App.tsx` «Слот графа вычислений») — именованные landmarks, навигабельные скринридерами. В 03-02 они мигрировали на kit `Card`, который рендерит `div` (`src/ui/kit/card.tsx:17-28`) без роли: `aria-label` на элементе с role=generic невалиден по ARIA (атрибут не разрешён в роли) и игнорируется большинством SR — регионы «Примеры» / «Результат» / «Слот графа» выпали из landmark-навигации. Функционально для зрячих и e2e прозрачно (testid на месте), но это регрессия a11y-контракта, внесённая именно фазой.
**Fix:** Вернуть семантику, не трогая вендорский кит — `Card` spreads props, поэтому достаточно добавить `role="region"` на тех же трёх карточках (или обернуть Card в `section aria-label`, если хочется строгого валидатора). Проверить axe-правило `aria-allowed-attr` после правки.

## Info

### IN-01: `<summary>` вне `<details>` — невалидный HTML + протечка `type="button"` от Radix Trigger

**File:** `src/ui/chain/LinkHistory.tsx:183-188`
**Issue:** Конструкция «нативного контракта» (план 03-03) вешает `<summary>` внутрь `CollapsibleTrigger asChild`, чей корень — `div` Radix Collapsible. По HTML-спеке `summary` допустим только ребёнком `details` — валидатор пометит ошибку; кроме того, Radix Trigger asChild прокидывает на ребёнка проп `type="button"` (невалидный атрибут на summary, безвреден в браузерах). Функционально работает (клавиатура/aria-expanded ставит Radix; e2e :282/:295/:613 зелёные), компромисс задокументирован в шапке файла (OQ 5д) — находка фиксирует HTML-валидность как осознанно принятый долг, а не баг.
**Fix:** Оставить как есть с комментарием (уже есть) либо, если валидность важна, заменить `summary` на `button` и обновить e2e-локаторы `'summary'` отдельным решением с владельцем (контракт тестов 11/12).

### IN-02: Мёртвое CSS-семейство станций 01.2-04 `.diag-*` (~90 строк) пережило зачистку мёртвого CSS фазы

**File:** `src/index.css:608-857` (фрагментарно)
**Issue:** Селекторы `.diag-node`, `.diag-node-label`, `.diag-node-active`, `.diag-node-value`, `.diag-node-selring`, `.diag-plate`, `.diag-plate-label`, `.diag-plate-g.active .diag-plate`, `.diag-bias-chip(-label)`, `.diag-bias-g.active .diag-bias-chip`, `.diag-sample-marker(-label)`, `.diag-feed`, `.diag-feed-g.diag-selected .diag-feed`, `.diag-out-label`, `.diag-edge-label` (+hover-правила) не имеют ни одного потребителя в TSX (grep по `src/**/*.tsx` — 0; станционная цепь 01.2-04 заменена графом 2.1-01 ещё до фазы 3). Фаза при этом продолжает их поддерживать: зачистка 03-02 не накрыла их, а правки конверта подсветки меняли duration в transition-списке, куда входят мёртвые `.diag-node`/`.diag-edge-label` (`src/index.css:677-687`). Живые соседи (`.diag-edge`, `.diag-edge-casing`, `.diag-flow`, `.diag-selected .g-node-box` и т.п.) не затронуты. Рядом — пустое правило `.sample-row-current td {}` (`src/index.css:1148-1151`), оставленное миграцией гало (дубль смежной находки 03-UI-REVIEW по `.samples-*` — здесь только пустой блок).
**Fix:** Удалить мёртвое семейство и пустое правило отдельным CSS-only коммитом (без правок TSX), предварительно прогнав `pnpm e2e` — вычистка из transition-списка мёртвых селекторов не должна менять поведение живых.

### IN-03: kit/README.md не дополнен tooltip.tsx / collapsible.tsx

**File:** `src/ui/kit/README.md:32-39`
**Issue:** Секция «Файлы» вендорной зоны перечисляет button/card/kbd/utils/index/token-bridge.test, но не `tooltip.tsx` и `collapsible.tsx`, добавленные в 03-03 (коммит 07793ef). README — канон правил D-44 и карта зоны для будущих `shadcn add`; дрейф вводит следующего агента в заблуждение о составе кита.
**Fix:** Дописать две строки в «Файлы» (tooltip — radix-обёртка с убранным Arrow; collapsible — radix + collapsible-down/up в базовом классе), заодно упомянуть, что `tooltip`/`collapsible` несут анимации tw-animate-css под глобальным reduced-motion-гейтом.

---

### Верификация (прогнано в этой сессии, не со слов SUMMARY)

- `pnpm test` — 144/144 passed (16 файлов, 311ms)
- `pnpm lint` — exit 0; только warnings (в т.ч. no-array-index-key OperationPanel:37, no-negated-condition ComputationGraph:334-337 — не блокируют, гейт «0 errors» честен)
- `tsc -b` — exit 0
- `pnpm e2e` — 20/20 passed (15.9s), включая новые 18/19/20
- `git diff 5d6ac50..HEAD --stat -- src/tensor .oxlintrc.json src/structure.test.ts` — пусто (движок и гейты структуры не тронуты)
- Безопасность: `dangerouslySetInnerHTML|innerHTML|eval(|new Function|insertAdjacentHTML` по src/e2e — 0 совпадений; секретов в diff нет; новые dep зафиксированы точными версиями (D-42)

_Reviewed: 2026-11-19T18:12:47Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
