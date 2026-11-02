# Walking Skeleton — Backprop Trainer (прототип Phase 1)

**Phase:** 1
**Generated:** 2026-11-02 (планировщик; актуализируется задачей 3 плана 01-01 после сборки)

## Capability Proven End-to-End

**Статус верификации:** UNVERIFIED-DRAFT — черновик планировщика; задача 3 плана 01-01 сверяет этот раздел с фактическим прогоном собранного билда и заменяет маркер на статус верификации.

> Пользователь открывает прототип локально (pnpm build && pnpm preview), нажимает кнопку «Шаг» — stepIndex увеличивается, на экране меняются число, нарратив и индикатор «Шаг N из 14»; все числа приходят из сгенерированного offline Python-генератором мок-трейса (XOR 2-3-1, 14 шагов).

Путь задевает каждый слой фазы: генератор `tools/reference/gen_mock_trace.py` → данные `src/data/xor-trace.json` → плеер `src/player/store.ts` (Zustand, чистая функция над `(trace, stepIndex)`) → UI `src/ui/App.tsx` → production-сборка `vite build`. Публикация на статик-хостинге — ручной шаг пользователя (user_setup плана 01-04).

## Architectural Decisions

**Статус версий:** VERSIONS-UNVERIFIED — версии взяты из исследования (Standard Stack); задача 3 плана 01-01 сверяет таблицу с фактически установленными версиями и заменяет маркер на статус сверки.

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Vite 8.3.5 + React 19.3.1 + TypeScript strict (+ exactOptionalPropertyTypes) | D-01: прототип = первый срез целевого UI-плеера, дорастает до Phase 2 без переписывания; смена подхода после юзабилити-теста — costly |
| Стилизация | Tailwind 4 CSS-first (@theme в `src/index.css`), без component-библиотек | STACK.md: продукт — кастомная визуализация, нужен только utility-слой; токены — источник истины в CSS (D-06) |
| Data layer | Нет БД и сервера (NFR-03: статик, $0). «Чтение» = закоммиченный предвычисленный мок-трейс `src/data/xor-trace.json` (schemaVersion=1) | ARCHITECTURE.md deterministic-replay: UI — чистый плеер над `(trace, stepIndex)`; Phase 2 подменяет источник (мок-JSON → живой RunTrace движка) без правок UI |
| Числа | Генерируются offline: `tools/reference/gen_mock_trace.py` (Python 3.9 stdlib-only, micrograd-семантика, seed 42, санити-фильтр весов, central-difference gradcheck внутри скрипта, байт-стабильный вывод) | D-03: правдоподобные моки одним эталонным прогоном, не ручные выдумки; формат — прообраз golden-фикстур NFR-02 |
| Состояние | Zustand 5 (stepIndex / drill / mode + clamp-действия next/prev/jumpTo); персистентность шага — URL-hash `#step=N&mode=lecture` через `src/player/urlState.ts` | Шаг назад и reload-restore бесплатны (PITFALLS 7); микропроверка будущего DOCS-05 |
| Auth | Нет — 100% сессий без регистрации by design (D-05, NFR-03) | — |
| Deployment target | Статик-хостинг (CF Pages / GH Pages), публикация вручную; локально — `pnpm build && pnpm preview` | NFR-03; юзабилити-респондентам нужна стабильная ссылка (RESEARCH Open Question 3) |
| Directory layout | `src/player` (types/store/urlState), `src/ui` (компоненты), `src/data` (trace), `src/format` (numbers), `tools/reference` (генератор), `tests/`, `e2e/` | RESEARCH §4.2 — Phase-1-подмножество будущей структуры ARCHITECTURE.md; отдельная папка prototype/ = лишний переезд в Phase 2 |

## Stack Touched in Phase 1

- [x] Project scaffold (Vite 8 + React 19 + TS strict, Tailwind 4, Vitest, Playwright, ESLint из create-vite шаблона)
- [x] Routing — один экран; состояние шага в hash URL (`#step=N&mode=lecture`); react-router отложен до Phase 2/3
- [x] Database — не применяется: NFR-03 (статик без сервера); эквивалент чтения — закоммиченный trace JSON, эквивалент записи — URL-hash
- [x] UI — кнопки «Шаг»/«Назад» меняют stepIndex, число/нарратив/индикатор обновляются (план 01-01); полный walkthrough UI (экран шага и лекционный режим — план 01-02; диаграмма и drill-down — план 01-03)
- [x] Deployment — `pnpm build` проходит (production-сборка зелёная); публикация на статик-хостинг — ручной шаг пользователя (user_setup плана 01-04)

## Out of Scope (Deferred to Later Slices)

- Движок/вычисления в рантайме, golden-фикстуры PyTorch, KaTeX — Phase 2 (мок-JSON заменяется живым RunTrace; формулы — leaf-замена)
- react-router, localStorage-прогресс — Phase 2/3
- Спираль/MNIST, библиотека сценариев, PWA/offline, мобильный тир — Phase 3 (мобильный тир — решение фиксируется в 01-DESIGN-TOKENS.md)
- Аналитика (PostHog), pre/post-тест — Phase 4; в прототипе ноль событий и ноль внешних запросов

## Subsequent Slice Plan

- Phase 2: живой float64-autodiff-движок + golden-фикстуры PyTorch подменяют источник trace; UI-плеер не меняется (архитектурное обещание этого каркаса)
- Phase 3: библиотека сценариев XOR → спираль → MNIST, лекционная детерминированность DOCS-05, offline-переживание перезагрузки
- Phase 4: замер понимания (pre/post-тест) + анонимная аналитика North Star + доступность
