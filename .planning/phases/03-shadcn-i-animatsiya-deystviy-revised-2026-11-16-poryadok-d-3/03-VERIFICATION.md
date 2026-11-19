---
phase: 03-shadcn-i-animatsiya-deystviy-revised-2026-11-16-poryadok-d-3
verified: 2026-11-19T18:20:00Z
status: passed
score: 8/8 must-haves verified
covered_files: [".planning/PROJECT.md", ".planning/phases/03-shadcn-i-animatsiya-deystviy-revised-2026-11-16-poryadok-d-3/03-01-PLAN.md", ".planning/phases/03-shadcn-i-animatsiya-deystviy-revised-2026-11-16-poryadok-d-3/03-01-SUMMARY.md", ".planning/phases/03-shadcn-i-animatsiya-deystviy-revised-2026-11-16-poryadok-d-3/03-02-PLAN.md", ".planning/phases/03-shadcn-i-animatsiya-deystviy-revised-2026-11-16-poryadok-d-3/03-02-SUMMARY.md", ".planning/phases/03-shadcn-i-animatsiya-deystviy-revised-2026-11-16-poryadok-d-3/03-03-PLAN.md", ".planning/phases/03-shadcn-i-animatsiya-deystviy-revised-2026-11-16-poryadok-d-3/03-03-SUMMARY.md", ".planning/phases/03-shadcn-i-animatsiya-deystviy-revised-2026-11-16-poryadok-d-3/03-04-PLAN.md", ".planning/phases/03-shadcn-i-animatsiya-deystviy-revised-2026-11-16-poryadok-d-3/03-04-SUMMARY.md", ".planning/phases/03-shadcn-i-animatsiya-deystviy-revised-2026-11-16-poryadok-d-3/03-05-PLAN.md", ".planning/phases/03-shadcn-i-animatsiya-deystviy-revised-2026-11-16-poryadok-d-3/03-05-SUMMARY.md", "DECISIONS.md", "DESIGN.md", "components.json", "e2e/smoke.spec.ts", "package.json", "pnpm-lock.yaml", "src/index.css", "src/ui/app/App.tsx", "src/ui/chain/LinkHistory.tsx", "src/ui/chain/LinkPanel.tsx", "src/ui/dataset/ExamplesPanel.tsx", "src/ui/dataset/ResultPanel.tsx", "src/ui/epoch/EpochSummary.tsx", "src/ui/graph/ComputationGraph.tsx", "src/ui/kit/README.md", "src/ui/kit/button.tsx", "src/ui/kit/card.tsx", "src/ui/kit/collapsible.tsx", "src/ui/kit/index.ts", "src/ui/kit/kbd.tsx", "src/ui/kit/token-bridge.test.ts", "src/ui/kit/tooltip.tsx", "src/ui/kit/utils.ts", "src/ui/numbers/NumberDrilldown.tsx", "src/ui/numbers/NumberHint.tsx", "src/ui/operation/OperationPanel.tsx", "src/ui/stepper/StepControls.tsx", "src/ui/stepper/StepperBand.tsx", "tsconfig.app.json", "tsconfig.json", "vite.config.ts"]
covered_digest: "v4:sha256:c8a28ee1af3911778c32aadccfb7f7543d65ee14ab2bb089d76368ce7d9a607b"
behavior_unverified: 0
overrides_applied: 1
overrides:
  - must_have: "MUST NOT анимировать transform зум-обёртки графа и подменять --diag-scale (Pitfall 6) — запрет плана 03-04"
    reason: "Владелец сам затребовал анимацию зума в ревью 03-05 Task 3 («добавить анимацию на зум», 4 живые итерации, итог approved): переход transform+габариты на .graph-zoom-layer/.graph-canvas — отдельный CSS-канал на других узлах, не конфликтует с motion-группами коллапса; --diag-scale по-прежнему суммируется, не подменяется (ComputationGraph.tsx:215) — интент Pitfall 6 сохранён, запрет снят самим его автором"
    accepted_by: "anton.trusov (владелец, ревью 03-05 Task 3)"
    accepted_at: "2026-11-19T18:45:00Z"
---

# Phase 3: shadcn и анимация действий — Verification Report

**Phase Goal:** UI-платформа продукта: shadcn/ui подключён (все зависимости — через sanctioned-чекпойнт AGENTS.md №2); анимация действий спроектирована по итогам ресёрча (GSAP / motion / Spline) и применена в выбранных точках; анимации — презентационный слой, никогда не гейтят числа; reduced-motion/print-гейты и e2e-детерминизм сохраняются
**Verified:** 2026-11-19T18:20:00Z
**Status:** passed
**Re-verification:** No — initial verification (предыдущих VERIFICATION.md нет, Step 0)

**Метод.** Goal-backward: из трёх Success Criteria ROADMAP (3.1/3.2/3.3) + must_haves пяти планов собрано 8 наблюдаемых истин, 16 артефактов, ключевые связи; каждая проверена по уровням exists → substantive → wired → поведение. Базовая линия git-диффа — `d185251` (родитель первого кодового коммита фазы `2f14e14`). Гейты этой сессии (2026-11-19): `pnpm test` 16 файлов / 144 теста — pass; независимо перепроверено код-ревьюером: test 144/144, `pnpm lint` exit 0, `tsc -b` exit 0, `pnpm e2e` 20/20, нулевой diff по `src/tensor`, `.oxlintrc.json`, `src/structure.test.ts` — cite as evidence; верификатором лично прогнан один точечный тест (token-bridge, 4/4) и выполнены grep/структурные проверки всех срезов ниже.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | shadcn/ui собран в проект локально (CLI-генерации в `src/ui/kit/`, без runtime-CDR/CDN) — ROADMAP-3.1 | ✓ VERIFIED | Кит: `button/card/kbd/tooltip/collapsible.tsx` + `utils.ts` + баррел + README (9 файлов, `ls src/ui/kit/`); `components.json` — style new-york, все aliases (`ui/utils/components/lib/hooks`) замкнуты в `@/ui/kit`; README фиксирует протокол генерации (CLI 4.23.0 через публичный реестр — корп-зеркало карантинит депу CLI) и правила вендорной зоны D-44 |
| 2 | Зависимости прошли sanctioned-чекпойнт: состав точно соответствует апрувам владельца (D-42 approve-exact-list + D-50 approve-motion; D-40 remove-floating) | ✓ VERIFIED | `package.json`: ровно `cva@0.7.1, clsx@2.1.1, tailwind-merge@3.7.0, tw-animate-css@1.4.0, @radix-ui/react-tooltip@1.4.1, @radix-ui/react-collapsible@1.2.1, motion@14.14.0` — точные версии без caret; `@floating-ui/react` отсутствует (вердикт D-40 исполнен); нет `cn`, монопакета `radix-ui`, `lucide-react`, условных radix-tabs/-slider. Чекпойнты владельца журналированы: D-42/D-50 в DECISIONS.md + 03-CONTEXT, resume-сигналы в SUMMARY (approve-exact-list / delay-200-remove-floating / motion+approve-motion); 03-RESEARCH §Домен 2 — таблица легитимности (владельцы, лицензии, вес, postinstall — none) |
| 3 | Дизайн-токены DESIGN.md сохранены (тёмная «приборная» тема D-25 — канон): токен-мост D-39 без hex-дублей | ✓ VERIFIED | `src/index.css:98–138`: `:root`-алиасы (`--card/--popover/--muted/… + *-foreground` → `--color-surface-container-*`) + `@theme inline`-реэкспорт + `--radius: 4px` со шкалой 2/4/8/12; коллизионные слоты primary/secondary/accent НЕ реэкспортируются (проектная мята `#4edea3` жива в `@theme`); юнит-контракты моста — верификатор лично прогнал `npx vitest run src/ui/kit/token-bridge.test.ts` → **4/4 pass** (алиас-цепочки, утилиты, запрет коллизий, шкала радиусов) |
| 4 | «Агрессивная замена» D-38 завершена: все пересобираемые примитивы на ките, мёртвый CSS удалён, контракты экрана живы | ✓ VERIFIED | `rg 'className="(btn|card|kbd)' src/ui --glob '!src/ui/kit/**'` → NONE; `rg '^\.btn|^\.card|^\.kbd' src/index.css` → NONE; 11 домен-файлов импортируют `'../kit'` (App, StepControls, ComputationGraph, OperationPanel, NumberDrilldown, NumberHint, EpochSummary, ExamplesPanel, ResultPanel, LinkPanel, LinkHistory); спец-компоненты (граф-геометрия, LossChart и пр.) НЕ мигрированы (D-38 — проверено: LossChart без kit-импорта; StepperBand — собственный оверлей гало, не кит-примитив); `data-testid` btn-reset/btn-epoch/btn-epoch-next/btn-next/toggle-lecture/graph-zoom-* на месте; RU-лейблы живы; e2e-спека: дифф к baseline = только шапка-комментарий + 188 добавленных строк (тесты 18–20), тесты 1–17 не правились |
| 5 | Решение по анимационному движку журнализировано (ROADMAP-3.2): частичная супрессия D-23 новой записью DECISIONS.md | ✓ VERIFIED | `DECISIONS.md` `### D-50` (полный формат Когда/Почему/Супрессии/Отброшено): motion 14.14.0 — выбор владельца; GSAP отклонён лицензионно («Standard 'no charge'» не OSI — field-of-use + терминация); Spline — отказ (282 KB gz + WASM, D-45); супрессия D-23 зафиксирована явно |
| 6 | Точки применения анимаций реализованы (ROADMAP-3.3): коллапс (т.2), travel-гало (т.1), каскад волны (т.3) + дополнения владельца (зум, «Примеры», якорное кольцо) | ✓ VERIFIED | Т.2: `ComputationGraph.tsx` — `AnimatePresence` + `motion.g`, 250 мс ease-in-out, интерполяция translate+opacity из детерминированной геометрии (frames.ts/geometry.ts — 0 diff к baseline); `MotionConfig reducedMotion="user"` на корне App (App.tsx:72). Т.1: `.step-halo` (index.css:308) + StepperBand (haloRef/bandRef, `useLayoutEffect`, `offsetLeft/offsetWidth` — функция структуры). Т.3: `animation-delay: calc(var(--flow-i) × 60ms)` (index.css:710) — индексы из структуры. Дополнения: `.samples-row-halo`, `.g-step-halo`, transition на `.graph-zoom-layer/.graph-canvas` (owner-directed, см. override). Поведение машинно доказано e2e: тест 19 (interrupt тройным dblclick, конечные состояния, живые station-value), тест 20 (гало = активная пилюля x/width ≤ 1px, `--flow-i` 0..k-1 подряд, кольцо центрировано ≤ 2px), тест 18 (дождь/края/touch/open-зеркало) |
| 7 | NFR-01/NFR-02 не затронуты: движок нетронут, инварианты зелёные, числа в DOM синхронно | ✓ VERIFIED | `git diff d185251..HEAD -- src/tensor .oxlintrc.json src/structure.test.ts` → пусто (движок и замороженные конфиги — 0 diff); инварианты живы: `src/run/invariants.test.ts` («пошагово = fast-forward» бит-в-бит, детерминизм, запись не возмущает числа), `src/tensor/expanders.test.ts` («drill-down = движок» per-op, forward+backward describe-блоки); `pnpm test` 144/144 (сессия); анимации — презентационный слой: значения приходят в DOM синхронно (e2e тест 19: station-value живые сразу после interact, ввод не блокировался) |
| 8 | Гейты финализированы: reduced-motion глобальный не менялся, print покрывает все новые анимации, e2e-детерминизм под emulateMedia reducedMotion | ✓ VERIFIED | Глобальный блок `@media (prefers-reduced-motion: reduce) { *, … animation: none !important; transition: none !important }` (index.css:871–877) — правила бит-идентичны baseline (дифф коснулся только комментария-докаса и print-блока); точечный оверрайд `.g-tip` (1090) — пре-существующий (в baseline:1021). Print-блок (879–905) расширен: `[data-slot='tooltip-content']/[data-slot='collapsible-content']/.step-halo/.value-changed/.graph-zoom-layer/.samples-row-halo/.sample-arrive/.sample-verdict-*/.g-step-halo` + пинн `.g-frame-block { opacity: 1 }` — покрывает ВСЕ новые анимации фазы; `.lecture` поток не выключает (докс-комментарий гейтов). e2e: все 20 тестов под `page.emulateMedia({ reducedMotion: 'reduce' })` (beforeEach :75); `animation-name === 'none'` ассерты :109 (тест 1), :535 (тест 18 — kit enter/exit), каскад :688–690 (тест 20); двойной прогон бит-идентичен (SUMMARY + гейты сессии, e2e 20/20) |

**Score:** 8/8 truths verified (0 present, behavior-unverified)

### Prohibitions (must-NOT)

| # | Plan | Prohibition | Status | Evidence |
|---|------|-------------|--------|----------|
| 1 | 03-01 | Пакеты вне утверждённой таблицы не ставятся; .oxlintrc.json/structure.test.ts не правятся; e2e-селекторы не меняются; diff src/tensor = 0 | ✓ VERIFIED | package.json = ровно апрувленный список (7 пакетов фазы); git diff по замороженным файлам пуст; e2e-дифф append-only |
| 2 | 03-02 | testid/RU-строки/aria не меняются; спец-компоненты не мигрируют; новых пакетов нет | ✓ VERIFIED | testids на месте (grep), LossChart без кита, dependencies в 03-02 не менялись (итоговый состав = 03-01+03-04) |
| 3 | 03-03 | Ассерты :282/:295 не правятся; testid живы; reduced-motion блок не тронут; floating удалён только по вердикту; tensor 0 | ✓ VERIFIED | e2e-дифф append-only (существующие ханки — только шапка); `number-hint`/`link-history` в коде; глобальный блок идентичен baseline; удаление floating = решение владельца delay-200-remove-floating (SUMMARY 03-03, чекпойнт Task 2) |
| 4 | 03-04 | Зум-обёртка не анимируется; геометрия/tensor не трогаются; e2e-селекторы живы; JS-пакеты только по D-50 | ✓ PASSED (override) | Геометрия 0 diff, селекторы живы, JS-пакет один (motion, D-50). Буква запрета «зум-обёртку не анимировать» снята самим владельцем в ревью 03-05 Task 3 — см. frontmatter `overrides` (канал зума отделён от motion-групп коллапса; `--diag-scale` суммируется, не подменяется) |
| 5 | 03-05 | Селекторы/testid/RU-строки/ассерт animation-name нетронуты; grid-auto-columns/зум-обёртка/tensor/конфиги не трогаются; JS-анимаций сверх D-50 нет; декоративных циклов нет | ✓ VERIFIED | `grid-auto-columns: minmax(108px, max-content)` без изменений; ассерт :109 жив; единственный JS-движок — motion; пульс пилюли (2s) — континуальный индикатор «как было», новых декоративных циклов нет (визуально подтверждено владельцем, UAT 22/22) |

### Required Artifacts

gsd-tools `verify.artifacts` по 5 планам: **15/16 формальных проверок пройдено** (03-01: 4/4; 03-02: 3/3; 03-03: 3/3; 03-04: 2/3; 03-05: 3/3). Все 16 артефактов существуют, содержательные и подключённые; единственная формальная претензия разобрана ниже.

| Plan | Artifact | Expected | Status | Details |
|------|----------|----------|--------|---------|
| 03-01 | `components.json` | конфиг CLI: генерации в src/ui/kit, CSS проекта, new-york | ✓ VERIFIED | style new-york, tailwind.css src/index.css, aliases → @/ui/kit; `contains: aliases` ✓ |
| 03-01 | `src/ui/kit/index.ts` | баррел кита — единственная публичная точка | ✓ VERIFIED | экспортирует Button/Card/Kbd/Tooltip/Collapsible-семейства; `contains: button` ✓ |
| 03-01 | `src/ui/kit/README.md` | документация вендорной зоны D-44/D-41 | ✓ VERIFIED | `contains: D-44` ✓; протокол генерации через публичный реестр |
| 03-01 | `src/index.css` | токен-мост + @import tw-animate-css | ✓ VERIFIED | `--popover` ✓ (строки 98–138, @import:10); гейты 871+ не изменены по правилам |
| 03-02 | `src/ui/kit/card.tsx` | kit Card (+Header/Title/мета-слот) | ✓ VERIFIED | CardTitle → h2 (семантика заголовков сохранена — D-44-адаптация) |
| 03-02 | `src/ui/kit/kbd.tsx` | kit Kbd — контракт .kbd | ✓ VERIFIED | моно 11px exception, усиленный низ бордера |
| 03-02 | `src/index.css` | мост без изменений + удалённые мёртвые правила | ✓ VERIFIED | `tw-animate-css` ✓; `.btn/.card/.kbd`-правил нет (DEAD-CSS-GONE подтверждён grep) |
| 03-03 | `src/ui/kit/tooltip.tsx` | kit Tooltip (Radix) — z-50, sideOffset | ✓ VERIFIED | Portal+z-50, tw-animate-css enter/exit |
| 03-03 | `src/ui/kit/collapsible.tsx` | kit Collapsible — collapsible-down/up | ✓ VERIFIED | под `--radix-collapsible-content-height` |
| 03-03 | `src/ui/numbers/NumberHint.tsx` | обёртка tier-1 на kit Tooltip | ✓ VERIFIED | `number-hint` ✓; импорт из `'../kit'`; floating-импортов нет |
| 03-04 | `DECISIONS.md` | запись D-50 | ✓ VERIFIED | `contains: D-50` ✓ — полный формат с супрессией D-23 |
| 03-04 | `src/ui/graph/ComputationGraph.tsx` | переходное состояние коллапса | ✓ VERIFIED | `collapsed` ✓; AnimatePresence + motion.g (:320–:471); комментарий «мгновенно, без transition» заменён |
| 03-04 | `src/index.css` | CSS-коллапс + print-гейт | ✓ VERIFIED (ветка motion) | Артефакт существует/подключён; print-гейт расширен. `Missing pattern: transform-box` — паттерн относился к css-only ветке плана, отклонённой владельцем на чекпойнте Task 1 (D-50 = motion); сам план предусматривал motion-механику («та же точка интеграции»), реализация origin-агностична (translate из frames.ts) и transform-box не требует |
| 03-05 | `src/ui/stepper/StepperBand.tsx` | travel-гало | ✓ VERIFIED | `halo` ✓ — haloRef + useLayoutEffect, offsetLeft/offsetWidth |
| 03-05 | `src/index.css` | .step-halo + конверт .diag-* + каскад + финальный print-список | ✓ VERIFIED | `step-halo` (:308), `animation-delay` (:710), print-блок (:879–905) — всё на месте |

### Key Link Verification

Планы декларируют key_links свободным текстом (не from/to/via) — `gsd-tools verify.key-links` даёт 0/0 (парсить нечего); связи проверены вручную (grep + чтение кода):

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| components.json aliases | src/ui/kit/ | CLI кладёт генерации только в кит | ✓ WIRED | все 5 aliases → `@/ui/kit`; kit-файлы — единственное место генераций |
| `@theme` (DESIGN-токены) | утилиты кита (bg-card/ring) | :root-мост → `@theme inline` | ✓ WIRED | цепочка index.css:110–138; 4 юнит-контракта (прогон верификатора) |
| StepControls.tsx | '../kit' (Button) | первый домен-потребитель | ✓ WIRED | `import { Button } from '../kit'`; 4 testid сохранены |
| Потребители .btn/.card/.kbd | kit Button/Card/Kbd | миграция D-38 | ✓ WIRED | 0 остаточных потребителей вне кита; 11 файлов импортируют кит |
| kit/tooltip.tsx (Portal) | document.body z-50 | поверх SVG-графа | ✓ WIRED | z-50 в Content; e2e тест 18 «края» — boundingBox в viewport |
| LinkHistory | Collapsible.Root | нативный open-атрибут + DOM-свойство (эффект-зеркало) | ✓ WIRED | LinkHistory.tsx:157–171; e2e :282/:295 работают без правок (тест 12 зелёный) |
| frames.ts/geometry.ts (кадры) | ComputationGraph (motion) | интерполяция известных кадров | ✓ WIRED | dx/dy из детерминированной геометрии; frames/geometry — 0 diff |
| data-flow корня svg | селектор волны + `--flow-i` | delay-каскад | ✓ WIRED | e2e тест 20: индексы 0..k-1 по порядку структуры |
| print-блок index.css | travel/коллапс/enter-exit/каскад | единый механизм статичного кадра | ✓ WIRED | селектор-лист покрывает все 9 новых классов анимаций |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| Граф/лента/панели | station-value, step-values | живой прогон движка (`src/run`) | Да — e2e тест 1: z = 1.6 по эталону; тест 19: station-value ≠ «н/д» после interact | ✓ FLOWING |
| Travel-гало | transform: translateX | offsetLeft/offsetWidth активной пилюли (структура) | Да — e2e тест 20: координаты гало = пилюля (≤1px) на каждом шаге | ✓ FLOWING |
| Каскад волны | --flow-i | декларативный Map из порядка GRAPH_EDGES | Да — e2e тест 20: 0..k-1 без DOM-измерений | ✓ FLOWING |
| Кит-примитивы | — (presentation) | токен-мост → @theme | Да — утилиты резолвятся в проектные токены (юнит-контракт №2) | ✓ FLOWING |

Статических заглушек, mock-данных и HOLLOW-пропсов в изменённых файлах не обнаружено.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Контракты токен-моста D-39 | `npx vitest run src/ui/kit/token-bridge.test.ts` (прогнано верификатором) | 4/4 passed, 93ms | ✓ PASS |
| Полный регрессионный гейт | `pnpm test` (сессия 2026-11-19) | 16 файлов / 144 теста passed | ✓ PASS (cite) |
| lint / build | `pnpm lint`, `tsc -b` (независимо перепроверено код-ревьюером) | exit 0 / exit 0 | ✓ PASS (cite) |
| e2e-детерминизм | `pnpm e2e` (независимо перепроверено код-ревьюером) | 20/20, все под emulateMedia reducedMotion; ×2 бит-идентичен по SUMMARY-гейтам планов | ✓ PASS (cite) |
| Прерываемость коллапса / позиция гало / каскад | e2e тесты 19, 20 (код прочитан, ассерты подтверждены) | ассерты конечных состояний, interrupt, координатные сверки ≤1–2px | ✓ PASS |

### Probe Execution

SKIPPED — фаза не декларирует probe-скриптов; `scripts/` в репозитории отсутствует.

### Requirements Coverage

Планы декларируют `ROADMAP-3.1/3.2/3.3` — это must-have id фазы 03 из `.planning/ROADMAP.md` (Success Criteria), а не id из REQUIREMENTS.md. Прямых REQUIREMENTS-id у фазы нет by design (UI-платформа; DOCS-06/UX-04 бывшей фазы «Замер понимания» — parking, D-35; ROADMAP: «Requirements: нет прямых»).

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ROADMAP-3.1 | 03-01, 03-02, 03-03 | shadcn подключён, sanctioned-чекпойнт, токены DESIGN.md сохранены | ✓ SATISFIED | Истины 1–4 |
| ROADMAP-3.2 | 03-04 | Журнализированное решение владельца по движку (супрессия D-23) | ✓ SATISFIED | Истина 5 |
| ROADMAP-3.3 | 03-03, 03-04, 03-05 | Точки применены; NFR-01 не нарушен; инварианты зелёные; e2e стабилен при reducedMotion; гейты работают | ✓ SATISFIED | Истины 6–8 |
| NFR-01 (непрерывное) | — | шаг < 100 мс, анимации вне критического пути | ✓ INTACT | движок 0 diff; лента предвычислена; значения в DOM синхронно (тест 19) |
| NFR-02 (непрерывное) | — | эталоны ≤ 1e-6 + инварианты | ✓ INTACT | 144/144; invariants.test.ts + expanders.test.ts живы; src/tensor 0 diff |
| NFR-03 (непрерывное) | — | без серверов | ✓ INTACT | серверного кода не добавлено (changeset — только UI/CSS/конфиги) |

**Orphaned requirements:** нет — `rg 'Phase 3|Фаза 3' REQUIREMENTS.md` → пусто (Traceability: DOCS-03/04/05 → Phase 4, DOCS-06 → parking). Каждое требование, привязанное к фазе, покрыто.

### Decision Coverage (gate #2492, non-blocking)

`check.decision-coverage-verify`: **12/12 honored, not_honored = []** — "All trackable CONTEXT.md decisions are honored by shipped artifacts."

### Test Quality Audit

| Test File | Linked Req | Active | Skipped | Circular | Assertion Level | Verdict |
|-----------|-----------|--------|---------|----------|-----------------|---------|
| src/ui/kit/token-bridge.test.ts | ROADMAP-3.1 | 4 | 0 | no | Value (исходные контракты CSS: алиасы/запреты/шкала) | OK |
| src/run/invariants.test.ts | NFR-02 | 8 | 0 | no | Value/Behavioral (бит-в-бит, идентичность прогонов) | OK |
| src/tensor/expanders.test.ts | NFR-02 | много | 0 | no | Value (rel ≤ 1e-6 против эталонных констант) | OK |
| e2e/smoke.spec.ts | ROADMAP-3.1/3.3, D-38 | 20 | 0 | no | Behavioral/Value (точные тексты, координаты, animation-name, count) | OK |

- Disabled tests: **0** (`it.skip/xit/xdescribe/.todo/.only` — NONE по src и e2e).
- Circular: **нет** — эталон-константы сняты с проверенного Python-прогона до удаления конвейера (историческая provenance VALID, NFR-02); token-bridge.test проверяет исходник CSS против контракта D-39, а не систему саму по себе.
- Дифф e2e к baseline — только добавление (тесты 18–20 + шапка): миграция не ослабила ни один существующий ассерт.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| DECISIONS.md | 32, 80 | «TBD» внутри слова **JTBD** (Jobs To Be Done) | ℹ️ Info (false positive) | Доменный термин, пре-существующий текст; не debt-маркер |
| src/ui/graph/ComputationGraph.tsx | 160 | Устаревший комментарий: «Зум-обёртка и --diag-scale НЕ анимируются (Pitfall 6)» | ℹ️ Info | Комментарий писался в скоупе 03-04 (motion-канал коллапса) и не обновлён после owner-правки 03-05 (зум анимируется CSS-каналом на других узлах). Функционально неверно только чтение буквы; кандидат в backlog вместе с WR-01/WR-02 |
| DESIGN.md | §9a | Легаси-строка «Мгновенно, без transition (анимации — фаза 3 по D-37)» | ℹ️ Info | §9a — историческая секция правил 2.1; актуальный канон моушна — §8 (синхронизирован по D-50). Косметика документации |

Долговых маркеров (TBD/FIXME/XXX без ссылки на формальный follow-up) в файлах фазы: **0**. `console.log`/placeholder/empty-return — **0**.

### Human Verification Required

Открытых пунктов нет — человеческие проверки фазы выполнены и зафиксированы до верификации (03-UAT.md, эта же сессия; UAT — единственный sink для human_needed по воркфлоу):

| # | Проверка | Статус | Где зафиксировано |
|---|----------|--------|-------------------|
| 1 | Стилистика «приборной» темы сохранена при миграции на кит (D-49, скрин-диф до/после) | Discharged — владелец approved | 03-UAT.md тест 3 (pass); пары в `.planning/ui-reviews/03-02-before\|after/` (18+18 файлов на диске); 03-02-SUMMARY D3 |
| 2 | Градус моушна D-48 «сдержанный функциональный» по всем точкам (лента/коллапс/волна + зум/«Примеры»/кольцо) | Discharged — владелец approved после 4 живых итераций ревью | 03-UAT.md тест 19 и др.; 03-05-SUMMARY (итерации 1–4 с фиксами, итог approved) |
| 3 | Скринкей-поведение radix-тултипа (задержка 200 мс, отсутствие «дождя») | Discharged — владелец delay-200-remove-floating | 03-03-SUMMARY чекпойнт Task 2; машинные критерии (дождь/края/touch) — e2e тест 18 |
| 4 | Пакетные апрувы (D-42 ядро+radix; D-50 motion) | Discharged — явные resume-сигналы владельца | 03-01/03-04 SUMMARY (checkpoint:decision, gate=blocking-human); DECISIONS.md D-50 |

Итог UAT: **22/22 pass, 0 issues** (16 automated-coverage + 6 owner-confirmed).

### Advisory

Открытые находки код-ревью (03-REVIEW.md: 0 critical / 2 warning / 3 info; disposition ledger 5/5 open) — advisory, не блокируют вердикт (нет детерминистического evidence-гейта; фиксы назначаются в фазу 4 или backlog):

| # | Finding | Category | Why Advisory |
|---|---------|----------|--------------|
| 1 | WR-01: гало-геометрия измеряется один раз, не переизмеряется при смене метрик (лекционный режим / late font swap) | architectural | предупреждение ревью; e2e зелёный, владелец UAT approved; фикс — кандидат в фазу 4 |
| 2 | WR-02: миграция `section → Card` ослабила landmark-семантику (`aria-label` на `div` без роли) | architectural | предупреждение ревью; e2e-контракты живы; фикс — фаза 4/backlog |
| 3 | IN-01…IN-03 (summary вне details; type="button" от Radix Trigger; и др.) | other | info-уровень, журнал 03-REVIEW-DISPOSITION.md |

### Gaps Summary

Гэпов нет. Все три Success Criteria фазы подтверждены кодовой базой: (3.1) кит собран из CLI-генераций в вендорной зоне с токен-мостом и полным migrated-потребителем, состав зависимостей побайтово соответствует апрувам владельца; (3.2) движок анимаций журналирован записью D-50 с частичной супрессией D-23 и обоснованными отказами GSAP/Spline; (3.3) все три точки D-47 и три owner-дополнения реализованы с машинными доказательствами поведения (e2e 18/19/20), NFR-01/02 структурно не затронуты (движок 0 diff, инварианты зелёные, числа синхронны), reduced-motion/print-гейты финализированы, e2e стабилен под emulateMedia reducedMotion с двойным бит-идентичным прогоном. Единственное отклонение от буквы планов (анимация зум-обёртки из запрета 03-04) — owner-directed, оформлено override во frontmatter. Замечания уровня Info (устаревший комментарий, легаси-строка §9a) и advisory-находки ревью переданы в backlog/фазу 4.

---

_Verified: 2026-11-19T18:20:00Z_
_Verifier: Claude (gsd-verifier)_
