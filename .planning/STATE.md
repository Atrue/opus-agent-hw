---
gsd_state_version: "1.0"
current_phase: 2
current_phase_name: Движок и MVP-walkthrough на XOR
status: executing
stopped_at: Phase 01 complete, ready to verify Phase 01.1
last_updated: "2026-11-05T06:15:35.692Z"
last_activity: 2026-11-05
last_activity_desc: Phase 2 execution started
state_head: 2beedcfed0edaad89121ea188f0f2f7125ad2cae
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 9
  completed_plans: 9
  percent: 40
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-11-03)

**Core value:** Пользователь сам пошагово исполняет forward/backward-pass готового сценария и видит каждый градиент числом — в браузере, без регистрации, по одной ссылке (первый шаг < 1 мин).
**Current focus:** Phase 2 — Движок и MVP-walkthrough на XOR

## Current Position

Phase: 2 (Движок и MVP-walkthrough на XOR) — EXECUTING
Plan: 1 of ?
Status: Executing Phase 2
Last activity: 2026-11-05 — Phase 2 execution started

Progress: [████░░░░░░] 40%

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: -
- Total execution time: -

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01.1 | 5 | - | - |
| 01 | 4 | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P01 | 11 min | 2 tasks | 21 files |
| Phase 01 P02 | 19 min | 2 tasks | 13 files |
| Phase 01 P03 | 14 min | 2 tasks | 11 files |
| Phase 01.1 P01 | 35 min | 2 tasks | 30 files |
| Phase 01.1 P02 | 171 min | 2 tasks | 9 files |
| Phase 01.1 P03 | 13 min | 3 tasks | 11 files |
| Phase 01.1 P04 | 25 min | 2 tasks | 11 files |
| Phase 01.1 P05 | 4 min | 2 tasks | 7 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- D-18: H2/H3 валидация (5 интервью преподавателей + юзабилити кликабельного прототипа) ДО кода — это Phase 1; MVP R1 = DOCS-01+02 на XOR (Phase 2). Корневой STATE.md (стратегический пакет) это фиксирует.
- ~~Архитектурный курс (research/SUMMARY): deterministic replay — собственный float64-движок на TS, UI = чистый игрок над RunTrace; шаг назад, URL-состояние и лекционная детерминированность — следствия этого решения~~ → пересмотрен ревью фазы 01 (2026-11-02, `.planning/reviews/01/DECISIONS.md`): тензорная библиотека `src/tensor/` + живой прогон `src/run/`; forward-only (эпохи, fast-forward, сброс); «шаг назад» исключён; UI пересчитывает шаги движком, а не проигрывает JSON-трейс → **применено фазой 01.1** (планы 01.1-01…05)
- ~~NFR-02 (golden-фикстуры PyTorch float64, ≤ 1e-6, gradcheck) структурно с Phase 2 — не добавляется постфактум~~ → пересмотрен: юнит-тесты эталонных констант per-op (значения сняты с xor-trace до удаления) + инварианты «drill-down = движок», «пошагово = fast-forward»; Python-конвейер (gen_mock_trace.py, xor-trace.json) удалён полностью (01.1-05)
- [Phase 01.1 — применено]: R1–R5 в коде: движок src/tensor/ (Tensor op-уровня + ленивые экспандеры, публичный вход index.ts), forward-only прогон src/run/ (эпохи/FF/история), NFR-02 = юнит-константы tests/tensor/etalon-constants.ts + инварианты, Python-конвейер удалён; единственная добавленная зависимость — @floating-ui/react 0.27.20 (R5); решения зафиксированы как D-19..D-23 (корневой DECISIONS.md), глоссарий EN↔RU — в PROJECT.md
- Таблица-стейки распределены: UX-02 → Phase 2, UX-03 → Phase 3, UX-04 → Phase 4; UX-01 удалён ревью R3; UX-05/UX-06 (история обучения) → Phase 1.1
- [Ревью 01]: R4 — реактивность: один корень + селекторы (uSES), 0 deps; @reactive-декоратор — санкционированное расширение на будущее. R5 — Floating UI + CSS-анимации (бегущий пунктир потока), фреймворки анимации не добавляются
- [Phase 01]: Store плеера — встроенные средства React (useSyncExternalStore + чистая transition), zustand исключён решением пользователя на checkpoint 01-01
- [Phase 01]: d3-format без @types: локальная декларация src/d3-format.d.ts — пакеты вне утверждённого checkpoint-списка не ставятся
- Постоянное правило (пользователь, 2026-11-02, checkpoint 01-01): store-библиотеки не вводить без явного вопроса пользователю с обоснованием (перед добавлением любой store-библиотеки в любом плане/фазе — вопрос с детальным обоснованием «зачем»)
- [Phase 01]: [01-02] План Б §5.5: глифы ₁₂/⊙/←/→ отсутствуют в JetBrains Mono/Inter → генератор на ASCII-индексы + <sub>-рендер UI; ∂ оставлен Unicode (D-06) с системным фолбэком; числа трейса бит-идентичны
- [Phase 01]: [01-02] Accent-тинт изменившегося числа = 10% (must_haves плана; Color-секция UI-SPEC говорила 20%) — зафиксировать единое значение в 01-DESIGN-TOKENS.md (01-03)
- [Phase 01]: [01-02] Чистая модель вида шага (stepRows.ts: потолки ≤7/≤30, highlight) отделена от рендера и покрыта юнит-тестами по всем 14 шагам трейса
- [Phase 01]: Активная op на диаграмме: рёбра подсвечиваются оранжевым «кейсингом» (+3px) под знаковым цветом — UI-SPEC-подсветка без потери знакового кодирования (Pitfall 6); узлы — обводка #E69F00 3px + тинт 10%
- [Phase 01]: 01-DESIGN-TOKENS.md зафиксирован (D-06, критерий 4 ROADMAP): все текстовые пары PASS WCAG AA; #E69F00 как нетекстовый акцент 2.25:1 — принятое исключение (не единственный носитель информации), пересмотр по итогам 01-04; тинт изменившегося 10% — единое значение; мобильный тир — Phase 3 numbers-first
- [Phase 01]: ∂-фолбэк подтверждён измерением: ∂ в .num рендерится системным моно (15.81px ≠ advance JBM 19.20px ≠ notdef 38.41px); document.fonts.check даёт false-positive — не доверять
- [Phase 01.1]: [01.1-01] «Шаг» = исполнение операции живого движка: SampleCursor.advance() исполняет по одной оп (backward — через runBackward-замыкания в topo-порядке); пакетный режим = тот же код без рекордера, идентичность доказана инвариант-тестом
- [Phase 01.1]: [01.1-01] Индикатор «Эпоха N · пример K · шаг M»: шаг = номер следующей операции сэмпла (1..13); после 13-й оп курсор переходит к следующему сэмплу, после 4-го — к эпохе N+1 (бесконечно); панель до первого шага — вводная, без чисел
- [Phase 01.1]: [01.1-01] Эталон-мостик NFR-02: контрольные константы 13 оп сэмпла 1 захардкожены в tests/tensor/etalon-constants.ts (plain-TS без тест-раннеров, источник не упоминается — гейт NO-JSON-REFS 01.1-05); etalon-тест сверяет через buildStepRecord — тот же путь, что рендерит UI
- [Phase 01.1]: [01.1-01] Граница src/tensor/ в oxlint: regex-паттерны без lookahead (Rust regex их не поддерживает — проверено эмпирически) — deep-импорты закрыты group-глобами с negation '!./tensor/*' для тест-хелперов, внутренняя изоляция — парой '^[^.]' и '^\.\./'
- [Phase 01.1]: [01.1-01] zeroGrad на границе сэмплов (в конструкторе SampleCursor), а не в sgd-опе: градиенты остаются живыми после update-опы — запись шага sgd читает ∂L/∂W2[0,0] честно
- [Phase 01.1]: [01.1-02] Экспандеры drill-down — view-слой над снапшотами чисел: expandScalar((операция, операнды, индекс)) строит Value-цепочку только по требованию (getter-кэш); порядок суммирования зеркалит ops.ts, инвариант «drill-down = движок» per-op в CI (допуск 1e-12)
- [Phase 01.1]: [01.1-02] value.ts — порт gen_mock_trace.py (+div для bce-grad, op-метка '-' для рендера); строки формул drill-down — только из чисел сценария (T-01.1-03), 4 значащие цифры, display-минус
- [Phase 01.1]: [01.1-02] R2: testid «step-panel» не синхронизируется с именем компонента (селектор описывает содержимое экрана); UI-строки, e2e-спека, aria-label — 0 правок при переименовании OperationPanel/operationRows
- [Phase 01.1]: [01.1-03] «Следующая эпоха» (btn-epoch-next) — primary-кнопка StepControls на экране эпохи; EpochSummary — чистый экран без дубль-кнопки: все контролы прогона в одной группе, «Шаг» никогда не disabled
- [Phase 01.1]: [01.1-03] Лосс-точки, флаги верности и снапшоты весов — replace-массивы в TrainingRun (R4): снапшот эпохи 0 = стартовые константы, столбец на границу эпохи; история — чистые построители поверх стабильных ссылок
- [Phase 01.1]: [01.1-03] График лосса на единой оси сэмплов (точки эпох на k·4, линия текущей эпохи правее); цвета — только ссылки на существующие токены, зона истории без перекраски дизайн-токенов
- [Phase 01.1]: [01.1-03] oxlint negation '!**/etalon-constants': plain-TS эталон-модуль — не deep-импорт тензорной библиотеки; требуется планом для e2e, границы движка не сужаются
- [Phase 01.1]: [01.1-04] Поток вычислений R5 — CSS-only «бегущий пунктир» с направлением по фазе (data-flow корня svg + один селектор); @floating-ui/react 0.27.20: план требовал несуществующую «1.x», установлена фактическая актуальная (та же org/API R5, +14.58 KB gz) — эмпирическая сверка реестра показала dist-tags.latest=0.27.20 — цифра «1.x» в плане была ошибкой о реестре; легитимность по T-01.1-06 (maintainers fezvrasta/atomiks, MIT, 33.7M/нед) сверена до установки
- [Phase 01.1]: [01.1-04] e2e-детерминизм — два рычага: emulateMedia reducedMotion reduce (гасит анимации) + deviceScaleFactor 2 (полупиксельные скругления кнопок footer растеризуются недетерминированно между загрузками; DPR 2 делает полупиксели целыми) — двойные прогоны бит-идентичны — плановая ручная сверка «e2e дважды» поймала дрожание AA на y=744.5 (h-[72px] border-box с border-t → контент 71px); фикс в тест-инфраструктуре, layout приложения не тронут
- [Phase 01.1]: [01.1-05] Порядок «захват → удаление» соблюдён: precondition-гейт подтвердил зелёность эталон-теста (3/3) и 0 ссылок на JSON до git rm; повторная сверка с Python после удаления невозможна by design (R3) — самосогласованность держат инварианты
- [Phase 01.1]: [01.1-05] Док-комментарии живого кода (value.ts, expanders.test.ts) переформулированы без имени удалённого генератора — must_have «ни одной ссылки на конвейер в src/tests»; глоссарий PROJECT.md сверен с фактическими идентификаторами кода (TrainingRun/StepRecord/useRunSlice)
- [Phase 01 → закрытие]: D-24 (владелец, 2026-11-05): сбор данных H2/H3 (Task 3 плана 01-04) и фиксация вердикта (Task 4) отложены до завершения разработки; H2/H3-задачи НЕ включаются в планы фаз 2–4 без явного запроса владельца — todo deferred-h2-h3-validation; до вердикта закрыты прайс и масштабный аутрич/пилоты; критерий 4 фазы (токены/нотация) верифицирован, фаза закрыта с дескоупом (01-VERIFICATION.md)

### Pending Todos

- `.planning/todos/pending/deferred-h2-h3-validation.md` — отложенный этап H2/H3 (сбор данных + вердикт). **Активация: только явный запрос владельца, после завершения разработки; в планы фаз не включать** (D-24).

### Blockers/Concerns

None yet.

### Roadmap Evolution

- Phase 1.1 inserted after Phase 1: Архитектурный рефакторинг R1–R5 (URGENT)

## Deferred Items

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| validation | H2/H3: 5 проблем-интервью + 5–8 юзабилити-сессий, агрегаты EVIDENCE.md, go/no-go-вердикт (бывш. Tasks 3–4 плана 01-04), фиксация в STATE/DECISIONS | Отложено решением владельца (D-24); инструменты готовы, пороги зафиксированы; активация — только явный запрос, после фаз 2–4 | 2026-11-05 | post-development (до пилотов) |

(v2-требования — CONSTR-01..03, GROWTH-01, B2B-01 — трекаются в REQUIREMENTS.md § v2, вне roadmap.)

## Session Continuity

Last session: 2026-11-05T06:20:00Z
Stopped at: Phase 01 closed with H2/H3 deferral (D-24); Phase 2 (Движок и MVP-walkthrough на XOR) ready to plan — /gsd-plan-phase 2
Resume file: None
