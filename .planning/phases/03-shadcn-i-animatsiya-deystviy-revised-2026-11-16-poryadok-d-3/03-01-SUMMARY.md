---
phase: 03-shadcn-i-animatsiya-deystviy-revised-2026-11-16-poryadok-d-3
plan: "01"
subsystem: ui
tags: [shadcn, tailwind4, cva, radix, token-bridge, vite-alias]

requires:
  - phase: 2.1-pravki-vizualizatsii-grafa-vychisleniy
    provides: экран-контракты (testid/aria/RU-строки), .btn/.card/.kbd-примитивы, рамка-нейрон
provides:
  - UI-кит src/ui/kit/ (вендорная зона D-43/D-44): Button (default-CTA/quiet/toggle, size default/icon-sm), локальный cn
  - Токен-мост D-39: кит питается @theme-токенами DESIGN.md через :root-алиасы + @theme inline (hex-дублей нет)
  - Инфраструктура shadcn: components.json (aliases → src/ui/kit), алиас @/* (tsconfig×2 + vite), tw-animate-css
  - Утверждённое ядро пакетов фазы: cva/clsx/tailwind-merge/tw-animate-css + radix tooltip/collapsible
affects: [03-02 (card/kbd + миграция потребителей), 03-03 (tooltip/collapsible пилоты), 03-04/03-05 (анимации на гейтах), phase 4 (экраны сценариев на ките)]

actuals:
  tokens: 48000
  tasks: 3
  commits: 2

tech-stack:
  added: [class-variance-authority@0.7.1, clsx@2.1.1, tailwind-merge@3.7.0, tw-animate-css@1.4.0, "@radix-ui/react-tooltip@1.4.1", "@radix-ui/react-collapsible@1.2.1"]
  patterns: [вендорная зона кита D-44 (мультиэкспорт только в kit/), токен-мост :root-алиасы + @theme inline, Q1-протокол вычитки генераций CLI]

key-files:
  created: [components.json, src/ui/kit/button.tsx, src/ui/kit/utils.ts, src/ui/kit/index.ts, src/ui/kit/README.md, src/ui/kit/token-bridge.test.ts]
  modified: [tsconfig.json, tsconfig.app.json, vite.config.ts, package.json, pnpm-lock.yaml, src/index.css, src/ui/stepper/StepControls.tsx, .planning/PROJECT.md]

key-decisions:
  - "Пакетный апрув владельца: approve-exact-list — 6 пакетов точными версиями; Q1-политика «а» (пакет cn не ставится, локальный cn в kit/utils)"
  - "Поколение реестра CLI 4.23.0 импортирует пакет cn и монопакет radix-ui — оба убраны из package.json, генерация правится в вендорном файле (D-44), asChild/Slot вычищен (потребителей в фазе нет)"
  - "pnpm dlx заблокирован корп-зеркалом (nexus карантинит electron-to-chromium — CLI-депа); CLI запускается npx с публичным реестром, генерация каноническая"

patterns-established:
  - "Токен-мост D-39: слоты shadcn — алиасы на @theme; коллизионные слоты (primary/secondary/accent) не реэкспортируются, kit-варианты ссылаются на проектные утилиты"
  - "Вычитка генераций после каждого shadcn add: cn-импорт локальный, lucide вычищается, git diff package.json пуст (T-3-03)"

requirements-completed: []  # ROADMAP-3.1 частично (срез трейсера); полный критерий закрывают 03-02/03-03 — shared-ID гейт держит до их SUMMARY

coverage:
  - id: D1
    description: "UI-кит src/ui/kit/ с Button (варианты CTA/quiet/toggle, size icon-sm), локальным cn, баррелом и README вендорной зоны"
    requirement: ROADMAP-3.1
    verification:
      - kind: unit
        ref: "src/ui/kit/token-bridge.test.ts#Токен-мост D-39"
        status: pass
      - kind: automated_ui
        ref: "playwright: 17/17 passed ×2 (bit-identical, 18 screenshots byte-equal)"
        status: pass
      - kind: other
        ref: "KIT-INIT / KIT-CLEAN / TENSOR-UNTOUCHED gates"
        status: pass
    human_judgment: false
  - id: D2
    description: "Токен-мост D-39 в src/index.css (:root-алиасы + @theme inline + @import tw-animate-css) с сохранением проектных токенов DESIGN.md"
    requirement: ROADMAP-3.1
    verification:
      - kind: unit
        ref: "src/ui/kit/token-bridge.test.ts#коллизионные слоты НЕ переопределяют проектные цвета"
        status: pass
    human_judgment: false
  - id: D3
    description: "StepControls мигрирован на kit Button с сохранением testid/RU-строк/ui-label/клавиатурного контракта (D-38)"
    requirement: ROADMAP-3.1
    verification:
      - kind: e2e
        ref: "e2e/smoke.spec.ts — 17 проверок без правок селекторов, двойной прогон бит-идентичен"
        status: pass
    human_judgment: false
  - id: D4
    description: "Состав dependencies точно соответствует апруву владельца (approve-exact-list): 6 пакетов, точные версии, без cn/radix-ui/lucide"
    requirement: ROADMAP-3.1
    verification:
      - kind: other
        ref: "KIT-CLEAN gate (! rg lucide-react package.json; git diff package.json = только 6 строк апрува)"
        status: pass
    human_judgment: false

duration: 47 min
completed: 2026-11-19
status: complete
---

# Phase 3 Plan 01: Трейсер кита shadcn Summary

**Сквозной срез UI-платформы: утверждённое ядро пакетов → components.json/алиасы → CLI-генерация button (Q1-вычитка) → токен-мост D-39 → первый домен-потребитель StepControls на kit Button — при бит-идентичном e2e и нетронутом движке.**

## Performance

- **Duration:** ~47 min
- **Started:** 2026-11-19T14:5x (checkpoint Task 1 в чате)
- **Completed:** 2026-11-19T15:25Z
- **Tasks:** 3 (1 checkpoint-decision + tracer + docs)
- **Files modified:** 15 (6 создано, 9 изменено)

## Accomplishments

- Пакетный апрув владельца исполнен (approve-exact-list): cva 0.7.1, clsx 2.1.1, tailwind-merge 3.7.0, tw-animate-css 1.4.0, @radix-ui/react-tooltip 1.4.1, @radix-ui/react-collapsible 1.2.1 — точные версии, без caret; легитимность сверена на реестре до установки (владельцы совпали с таблицей D-42).
- Кит живёт в src/ui/kit/ (D-43/D-44): components.json (style new-york, rsc false, aliases замкнуты в кит) кладёт генерации только туда; баррел index.ts + README фиксируют вендорную зону; гейт structure.test.ts зелёный без правок (R1 именованные экспорты, R2 подпапка).
- Q1 закрыт фактом генерации: CLI 4.23.0 пишет `import { cn } from "cn"` + `import { Slot } from "radix-ui"` и прописывает оба пакета в package.json — по апрув-политике оба сняты (pnpm remove), cn локальный в kit/utils.ts (clsx+tailwind-merge), Slot/asChild вычищен из button.tsx (потребителей в фазе нет), правки помечены заголовком вендорной зоны.
- Токен-мост D-39: :root-алиасы (--card/--popover/--muted/--destructive/--border/--input/--ring + *-foreground) на @theme-токены + @theme inline-реэкспорт; коллизионные слоты primary/secondary/accent НЕ реэкспортируются (проектная мята #4edea3 и циан живы); --radius 4px со шкалой 2/4/8/12; @import tw-animate-css; гейты 841–854 не тронуты; 4 юнит-контракта моста.
- Первая реальная замена: 4 кнопки StepControls на kit Button (quiet «Сброс»/«Запустить эпоху», CTA «Шаг»/«Следующая эпоха»); data-testid, RU-лейблы, ui-label-типографика, клавиатурный контракт (Space на сфокусированной кнопке — нативный click) не изменились; .btn-семейство CSS остаётся до последнего потребителя (03-02).
- Гейты: 144 юнит (140+4) + lint 0 errors + tsc 0 + 17 e2e ×2 бит-идентичен (18 скринов byte-equal); diff по src/tensor = 0; gz-дельта: JS 106.00→115.67 (+9.67), CSS 14.43→15.42 (+0.99) — radix tooltip/collapsible ещё не импортируются (tree-shaken), встанут в 03-03.

## Task Commits

1. **Task 1: Пакетный апрув (checkpoint:decision)** — владелец в чате: `approve-exact-list` (Q1-политика «а»)
2. **Task 2: Трейсер кита** - `2f14e14` (feat)
3. **Task 3: Доки среза** - `4ab75be` (docs)

## Files Created/Modified

- `components.json` — конфиг shadcn CLI (генерации в src/ui/kit/, CSS проекта, new-york)
- `src/ui/kit/button.tsx` — kit Button: варианты default-CTA/quiet/toggle, size default/icon-sm (контракты .btn, D-44-пометка локальных правок)
- `src/ui/kit/utils.ts` — локальный cn (clsx + tailwind-merge), замена пакета cn
- `src/ui/kit/index.ts` — баррел кита (единственная публичная точка)
- `src/ui/kit/README.md` — вендорная зона: правила D-44/D-41/D-34, протокол обновления
- `src/ui/kit/token-bridge.test.ts` — 4 контракта токен-моста D-39
- `tsconfig.json`, `tsconfig.app.json`, `vite.config.ts` — алиас @/* (CLI + сборка)
- `src/index.css` — токен-мост + @import tw-animate-css (гейты не тронуты)
- `src/ui/stepper/StepControls.tsx` — первый домен-потребитель кита
- `package.json`, `pnpm-lock.yaml` — 6 пакетов апрува
- `.planning/PROJECT.md` — глоссарий: kit (D-43)
- `03-UI-SPEC.md` — Component Inventory перечислен фактически; Checker FLAG закрыт

## Decisions Made

- Владелец утвердил состав пакетов (approve-exact-list) и Q1-политику «а» — единственный пакетный апрув фазы.
- CLI запускается через `npx -registry=https://registry.npmjs.org shadcn@4.23.0` — корп-зеркало nexus карантинит electron-to-chromium (депа browserslist CLI), `pnpm dlx` падает до запуска; генерация каноническая, протокол задокументирован в kit/README.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] CLI-генерация тянет непрошенные пакеты (cn, radix-ui)**
- **Found during:** Task 2 (первый test-add, Q1-протокол)
- **Issue:** CLI 4.23.0 (новое поколение реестра, несмотря на style new-york) импортирует `cn` из пакета и `Slot` из монопакета `radix-ui`; оба прописались в package.json — вне утверждённой таблицы (Pitfall 3 / T-3-03, предсказано RESEARCH §1.5)
- **Fix:** `pnpm remove cn radix-ui`; cn → локальный `@/ui/kit/utils` (Q1-политика «а» апрува); asChild/Slot вычищен из button.tsx (D-44, потребителей нет)
- **Files modified:** package.json, pnpm-lock.yaml, src/ui/kit/button.tsx, src/ui/kit/utils.ts
- **Verification:** git diff package.json = ровно 6 строк апрува; KIT-CLEAN; 144 юнит + 17 e2e ×2
- **Committed in:** 2f14e14

**2. [Rule 2 - Environment] pnpm dlx недоступен (корп-зеркало)**
- **Found during:** Task 2 (запуск CLI)
- **Issue:** nexus.vkteam.ru карантинит electron-to-chromium-1.5.490.tgz (депа browserslist самого CLI) — dlx-установка падает, CLI не стартует
- **Fix:** CLI запущен `npx -registry=https://registry.npmjs.org shadcn@4.23.0` — та же pinned-версия, каноническая генерация; протокол записан в kit/README
- **Files modified:** kit/README.md (протокол)
- **Verification:** add button создал ровно 1 файл в src/ui/kit/ (git status чист вне кита)
- **Committed in:** 2f14e14

---

**Total deviations:** 2 auto-fixed (1 blocking-протокол Q1, 1 environment)
**Impact on plan:** Обе — предвиденные планом ветки (flagged assumptions/Q1); состав пакетов остался ровно апрувленным. No scope creep.

## Issues Encountered

- Тест вычисленных стилей моста в jsdom невозможен (Tailwind не собирается в vitest, var()-цепочки не резолвятся) — план предвидел («если jsdom не резолвит»): контракт проверяется на источнике (token-bridge.test.ts: алиас-цепочки + запрет коллизионных реэкспортов + шкала радиусов).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Срез доказан end-to-end: пакеты → CLI → мост → домен-потребитель → зелёные гейты; 03-02 расширяет на Card/Kbd + миграцию всех потребителей (карта потребителей в PATTERNS свежим rg), 03-03 — пилоты tooltip/collapsible.
- Q1-протокол обязателен для каждого следующего `shadcn add` (card/kbd в 03-02: та же вычитка, тот же запрет пакетов).

---
*Phase: 03-shadcn-i-animatsiya-deystviy-revised-2026-11-16-poryadok-d-3*
*Completed: 2026-11-19*
