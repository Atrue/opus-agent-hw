# Phase 2: Движок и MVP-walkthrough на одном нейроне - Research

**Researched:** 2026-11-09
**Domain:** Рефакторинг TS-autodiff-движка + lint-инфраструктура (ESLint/airbnb + oxlint) + колокация тестов + декларативный интерфейс модели + новый сценарий «один нейрон»
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Phase Boundary (контекст решений)

MVP R1 (ревизия 2026-11-09): полный walkthrough первого урока на сети из **одного нейрона** — forward/backward-pass пошагово, каждое число с drill-down, на движке с доказанной корректностью (NFR-02). Движок уже построен фазой 01.1 (`src/tensor/` + `src/run/`); фаза 2 доводит его и экранные слои до инженерных стандартов владельца (линтер, модульная структура, чистые функции градиентов, интерфейс модели) и переводит walkthrough со сценария XOR-MLP (прототип 01.1/01.2) на сценарий «один нейрон». XOR-MLP-walkthrough переносится в фазу 3 (прогрессия сценариев). Спираль/MNIST, хаб сценариев, аналитика, pre/post-тест — вне фазы. H2/H3-сбор данных — вне фазы (D-24).

### Locked Decisions (D-27..D-33 — исследуются ЭТИ, не альтернативы)

- **D-27:** Добавить строгий airbnb-линтер для TypeScript. Конфигурируется **один раз** с зафиксированным списком исключений (suppressions/overrides) под текущий проект; после фиксации **любое изменение конфига линтера или его исключений требует явного апрува владельца** — правило фиксируется в AGENTS.md как постоянное (аналогично правилу про store-библиотеки, 2026-11-02). Текущий oxlint сохраняет enforcement границ модулей (`src/tensor/index.ts`, negation-паттерны) — разделение ответственности исследовать (oxlint = границы/импорты, eslint-airbnb = стиль/корректность TS). Новые npm-пакеты (eslint, typescript-eslint, airbnb-config) проходят sanctioned-checkpoint: сверка легитимности (владелец, версия, вес) + подтверждение пользователя (постоянное правило 2 AGENTS.md). — **Reversibility:** costly — откат после того, как весь код приведён под airbnb-правила, перетрясёт стиль кодовой базы.

- **D-28:** Код делится на модули (внутренние или независимые) и по этому делению организуются папки. Правила: (а) файлы тестов лежат **рядом с тестируемым кодом**, не в отдельной папке `tests/` (миграция текущих `tests/**` к `src/**`; `tests/tensor/etalon-constants.ts` переезжает вместе с тестами, ссылки vitest/e2e/`.oxlintrc.json` обновляются); (б) в файле преимущественно **только один именованный экспорт**; исключение — файлы с типами: типы можно держать в файле с функционалом, если экспортируется 1 модуль + 1 тип, либо отдельный файл со всеми типами модуля; (в) в каждой папке модуля — **README** с кратким описанием функционала. Существующие границы (AGENTS.md: публичный вход тензорной библиотеки — только `src/tensor/index.ts`) сохраняются и переосмысляются как границы модулей.

- **D-29:** Большие файлы разбиваются на маленькие независимые функции. Конкретно `Value` (`src/tensor/value.ts`): разбить на независимый класс + независимые простые функции для каждой операции. Вместо мутирующего `backwardFn` — **чистая функция расчёта локального градиента на основе родителей**; общий метод класса умножает локальный градиент на входящий и аккумулирует. Инварианты NFR-02 (эталон-константы ≤ 1e-6, «drill-down = движок», «пошагово = fast-forward») обязаны остаться зелёными до/после рефакторинга — рефакторинг без изменения чисел (бит-идентичность прогона).

- **D-30:** Рассмотреть и ввести общий интерфейс модели: декларативный объект с полями (модель + функция потерь), часть полей вычисляется рендером. Геттер для получения параметров сети — чтобы не смешивать параметры со входами. Сеть строится из её модели на основе графа; каждым графом можно посчитать все её параметры и выставить ей **метку для рендера** (label). Это про «сценарий = декларативная модель → граф → рендер-метки», развитие `src/tensor/model.ts` / `src/run/scenario.ts`.

- **D-31:** MVP-walkthrough фазы 2 строится на сети с **одним нейроном** для визуализации (замена XOR в фазе 2; XOR-MLP-walkthrough → фаза 3, первый сценарий прогрессии). Супрессия: D-18 («MVP R1 = DOCS-01+02 на XOR») — MVP R1 теперь на сценарии «один нейрон»; DOCS-01/DOCS-02 остаются целевыми требованиями, меняется сценарий-носитель. Состав сценария (входы, датасет, активация/лосс — достаточно простые для первого урока) — предмет исследования и планирования; forward-only, эпохи, fast-forward, drill-down, клавиатура UX-02 — без изменений. Эталон-константы NFR-02 для нового сценария (источник: существующий проверенный движок + инварианты; Python-конвейер не возвращается — R3) — предмет исследования.

- **D-32:** Функция потерь исключается из **визуализации графа/диаграммы**: лосс не рисуется как узел с явными связями на вычислительном графе. В расчётах лосс остаётся полноправным (forward/backward-числа, экран эпохи, график лосса, панель звена L, формула-строка — D-26 не пересматривается; подтверждено владельцем 2026-11-09: «только граф/диаграмма»).

- **D-33:** Не использовать собственные поля `window.*` для хранения состояния — вместо этого стейт или контекст. Текущее нарушение: `window.__run = run` (`src/run/runState.ts:544`, DevTools-прозрачность) — убрать в рамках фазы; легитимные браузерные API (`window.history`, `matchMedia`, `addEventListener`) не затрагиваются.

### Standing Constraints (не пересматриваются)

- NFR-01: шаг < 100 мс; NFR-02: ≤ 1e-6 против эталонных констант + зелёные инварианты «drill-down = движок», «пошагово = fast-forward»; snapshot-матчеры чисел запрещены; NFR-03: только клиент.
- Forward-only: «шаг назад» не добавляется; reload = честный сброс; URL несёт только `#scenario=`.
- Store-библиотеки не вводить; новые npm-пакеты — только через sanctioned-checkpoint.
- Именование по глоссарию PROJECT.md; пользовательские строки RU-first в строковых модулях; dangerouslySetInnerHTML запрещён.
- Дизайн-контракт: DESIGN.md + `src/index.css @theme` (D-25); формула-хребет и история звена (D-26) — навигационное ядро экрана, не ломать.

### Claude's Discretion / Deferred Ideas

В 02-CONTEXT.md отдельных секций Claude's Discretion и Deferred Ideas нет: дискреция явно оговорена внутри D-31 (состав сценария) и D-27 (разделение ответственности oxlint/eslint); всё остальное — locked. Вне фазы (ROADMAP): спираль/MNIST, хаб сценариев, аналитика, pre/post-тест, H2/H3-сбор (D-24).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DOCS-01 | Пошаговое исполнение walkthrough с числами: «Пользователь сам исполняет каждый шаг forward- и backward-pass готового сценария и видит входы, выходы, активации и градиенты операции конкретными числами; видна позиция в прогоне (эпоха N · шаг M)»; forward-only + эпохи + fast-forward, идентичность FF пошаговому | Механика уже существует (SampleCursor.advance + TrainingRun, фазы 01.1/01.2) — фаза 2 переносит её на сценарий «один нейрон» через декларативный интерфейс модели (§ D-30/D-31) без изменения инвариантного ядра; инвариант «пошагово = FF» остаётся бит-в-бит (§ Patterns, § Pitfalls 2) |
| DOCS-02 | Drill-down: диаграмма → слой → операция → число; «С любого уровня визуализации можно углубиться до отдельного числа и понять его происхождение»; граница графа — терминальная панель, не пустой экран | Три уровня уже работают (граф → панель операции → NumberDrilldown/экспандеры). Новое: граф строится из модели и теряет loss-узел (D-32) — инвентарь затронутых мест в § D-32; экспандеры drill-down не меняются (инвариант «drill-down = движок» per-op, допуск 1e-12) |
| UX-02 | «Клавиатурная навигация: `→` / `Space` — шаг вперёд, поддержка презентерного пульта; «назад» отсутствует by design (ревью R3)» [VERIFIED: .planning/REQUIREMENTS.md:33] | Уже частично реализовано (StepControls keydown, LinkPanel onKey); фаза 2 сохраняет контракты при смене сценария; e2e-прогон клавиатурного пути остаётся в спеке |
</phase_requirements>

## Summary

Фаза 2 — это не «написать движок» (он построен фазой 01.1 и верифицирован: etalon 1e-6 + бит-в-бит инварианты), а **доведение до инженерных стандартов владельца и смена сценария-носителя**. Семь locked-решений (D-27..D-33) группируются в четыре рабочих пакета: (1) lint-инфраструктура — airbnb-линтер поверх ESLint 9 flat config с зафиксированным списком исключений, при сохранении oxlint как enforcement-а границ модулей; (2) структурный рефакторинг — колокация тестов в `src/**` (vitest подхватывает их дефолтным include без правок конфига, prod-бандл их не включает — проверено эмпирически), декомпозиция больших файлов до «1 именованный экспорт + файл типов + README на папку», чистые функции локальных градиентов вместо мутабельных `backwardFn`-замыканий при бит-идентичной семантике; (3) интерфейс модели — декларативный `ScenarioModel` (структура сети + лосс + параметры + рендер-метки), из которого строится и граф вычислений, и walkthrough-курсор; (4) сценарий «один нейрон» с эталон-константами, снятыми с текущего верифицированного движка и перекрёстно проверенными central-difference gradcheck (Python не возвращается — R3), плюс две маленькие правки: loss-узел уходит из визуализации графа (расчёты не трогаются) и `window.__run` удаляется.

Ключевой риск-баланс фазы — **бит-идентичность чисел при масштабном рефакторинге**. Страховочная сеть уже существует и должна оставаться зелёной после каждого шага: `etalon.test.ts` (13 оп, rel ≤ 1e-6), `invariants.test.ts` («пошагово = FF» бит-в-бит + детерминизм), `expanders.test.ts` («drill-down = движок», 1e-12), e2e-двойной прогон. Второй риск — lint-стек: канонические airbnb-конфиги морально устарели (airbnb-base 15.0.0 — 2021 год, eslintrc-формат; airbnb-typescript 18.0.0 пинирует typescript-eslint ^7), поэтому используется официальный мост `FlatCompat` из `@eslint/eslintrc` — это задокументированный ESLint-путём способ есть eslintrc-конфиги в flat config era.

**Primary recommendation:** Строгое следование strangler-fig порядку волн: (А) airbnb+ESLint bring-up с фиксацией исключений → (Б) колокация тестов + правки границ (oxlint override и boundaries-тест должны научиться отличать `*.test.ts`) → (В) декомпозиция файлов + чистые градиенты (D-28б/в + D-29) под зелёными инвариантами → (Г) `ScenarioModel`-интерфейс (D-30) → (Д) сценарий «один нейрон» + self-capture эталона с gradcheck (D-31) → (Е) loss-off-graph (D-32) + удаление `window.__run` (D-33). ESLint брать линии 9 (maintenance), не 10 — peer-диапазоны airbnb-стека и eslint-plugin-import cap на `^9`.

## Project Constraints (from CLAUDE.md / AGENTS.md)

Директивы проекта, обязательные для планов фазы (те же, что Standing Constraints выше, плюс операционные правила):

- GSD-воркфлоу обязателен; прямые правки вне команд — только по явному запросу.
- Тесты и линт зелёные перед завершением любой задачи: `pnpm test && pnpm lint` (e2e — `pnpm e2e`).
- NFR-01 (< 100 мс/шаг, без WASM), NFR-02 (≤ 1e-6 + инварианты; snapshot-матчеры чисел запрещены), NFR-03 (никаких серверов).
- Публичный вход тензорной библиотеки — только `src/tensor/index.ts` (enforced oxlint + CI-тест границ).
- Store-библиотеки не вводить; новые npm-пакеты — только sanctioned-checkpoint (легитимность + подтверждение пользователя). Фаза 2 добавляет dev-зависимости — все проходят через checkpoint (см. Package Legitimacy Audit).
- Пользовательские строки RU-first в строковых модулях; `dangerouslySetInnerHTML` запрещён; формулы drill-down — только из чисел сценария.
- Артефакты/скрины — в `artifacts/` по имени `YYYYMMDD-<slug>`; captures ревью — `.planning/ui-reviews/`.
- Новое постоянное правило по D-27 (задача фазы): любое изменение конфига линтера или его исключений — только с явным апрувом владельца; фиксируется в AGENTS.md рядом с правилами про store и пакеты.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Autodiff-движок (Tensor/Value, ops-ядра, экспандеры) | Client / browser (чистый TS-модуль `src/tensor`) | — | NFR-03: все вычисления на клиенте; библиотека изолирована границей index.ts (D-20), в фазе 2 только рефакторится (D-29), семантика не меняется |
| Политика прогона (эпохи, FF, reset, история сессии) | Client (`src/run`) | — | Forward-only прогон = чистый TS + Set-listeners (R4); фаза 2 декомпозирует runState.ts и убирает window.__run (D-33) |
| Декларативная модель сценария (модель + лосс + рендер-метки) | Client (`src/run` сценарий → `src/tensor` граф) | — | D-30: сценарий = данные; граф вычислений и walkthrough-курсор строятся из модели, UI не хардкодит топологию |
| Walkthrough-экран (формула-хребет, граф, панель операции, история звена) | Client (`src/ui`, React 19 + SVG) | — | D-25/D-26 дизайн- и навигационный контракты; фаза 2 меняет носителя (один нейрон) и убирает loss-узел из графа (D-32), не перекрашивая токены |
| Lint-инфраструктура (airbnb-стиль + границы модулей) | Dev-инструментинг (ESLint 9 flat + oxlint) | CI | D-27: oxlint = import-границы, ESLint-airbnb = TS-стиль/корректность; dev-only зависимости, рантайм-бандл не меняется |
| Тесты NFR-02 (эталон, инварианты, gradcheck) | Client-тесты (vitest, колоцированные в src/**) | e2e (playwright, отдельная папка) | D-28: тесты рядом с кодом; эталон-константы = plain-TS модуль без раннерных импортов (межраннеровый мостик vitest/playwright сохраняется) |

## Standard Stack

Фаза добавляет только dev-инструменты (линтинг); рантайм-стек не меняется (React 19.3.1, Vite 8.3.5, Vitest 5.0.5, oxlint 1.90.0, Playwright 1.64.1 — [VERIFIED: package.json:14-36]).

### Core (новые dev-зависимости — все через sanctioned-checkpoint)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| eslint | ^9 (maintenance-линейка; latest 9.x проверена в реестре) | Ядро линтера, flat config нативен с v9 | Официальный стандарт; линию 9 держит maintenance-dist-tag реестра, все нужные плагины декларируют peer `^9` [VERIFIED: npm registry 2026-11-09: dist-tags `{latest: 10.14.0, maintenance: 9.39.5}`] |
| eslint-config-airbnb-base | 15.0.0 | Канонический airbnb-стиль (base, без React-плагинов — они остаются в oxlint) | Это и есть «airbnb-линтер» из D-27; 6.79M загрузок/нед, репозиторий airbnb/javascript; eslintrc-формат подключается через официальный FlatCompat [VERIFIED: npm registry: published 2021-11-09, peer `eslint ^7.32.0 \|\| ^8.2.0`, `eslint-plugin-import ^2.25.2`] |
| @eslint/eslintrc | ^3.3.7 | `FlatCompat` — официальный мост eslintrc→flat config | Задокументированный в migration-guide ESLint способ потреблять eslintrc-шered-конфиги (airbnb-base) в flat era [CITED: eslint.org/docs/latest/use/configure/migration-guide] |
| typescript-eslint | ^8.72.1 | Мета-пакет parser+plugin+configs для TS; `strictTypeChecked`-пресеты | Официальный TS-инструмент ESLint-организации; peer `eslint ^8.57.0 \|\| ^9.0.0 \|\| ^10.0.0`, TS `>=4.8.4 <6.1.0` (проект 5.9.3 ✓) [VERIFIED: npm registry] |
| eslint-plugin-import | ^2.32.0 | Peer airbnb-base: import-правила стиля (`import/order`, `no-extraneous-dependencies`…) | Обязательный peer airbnb-base; 81.5M/нед; peer `… \|\| ^9` — ещё одна причина брать ESLint 9, не 10 [VERIFIED: npm registry] |
| eslint-import-resolver-typescript | latest (^3) | Резолвер TS-путей для import-правил | Стандартная пара к eslint-plugin-import в TS-проектах [VERIFIED: npm registry, OK по legitimacy-гейту] |
| globals | latest | Словари `globals.browser` для `languageOptions.globals` в flat config | Официально рекомендован migration-guide (env больше нет) [CITED: eslint.org migration-guide] |
| eslint-plugin-oxlint | latest | Отключает ESLint-правила, уже покрытые oxlint (анти-дублирование репортов) | Официальный путь сосуществования «oxlint first, затем ESLint с выключенными дублями» [CITED: oxc.rs/docs/guide/usage/linter — «Migrate incrementally»]. ⚠ peer `oxlint: ~1.92.0` при установленном 1.90.0 — обновить oxlint вместе с установкой [VERIFIED: npm registry] |

### Supporting (опционально / отвергнуто — см. Audit)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| eslint-plugin-react-hooks | 7.1.1 | Hooks-правила в ESLint | НЕ нужен: oxlint уже enforce'ит `react/rules-of-hooks`; peer до `^10` — если владелец захочет hooks в ESLint, а не в oxlint |
| eslint-config-airbnb-extended | 3.3.0 | Комьюнити-продолжение airbnb в flat-native виде | Отвергнуто как основной (одиночный мейнтейнер, не airbnb) — см. Alternatives |
| @oxlint/migrate | latest | Конвертация oxlint↔eslint конфигов | Не требуется: конфиги пишутся с нуля один раз (D-27 «конфигурируется один раз») |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| eslint-config-airbnb-base 15.0.0 (2021) + FlatCompat | eslint-config-airbnb-typescript 18.0.0 | Отвергнуто: опубликован 2024-03-02, пинирует peer `@typescript-eslint ^7.0.0` + `eslint ^8.56.0` — конфликтует с актуальным typescript-eslint 8.x [VERIFIED: npm registry] |
| airbnb-base + typescript-eslint (стек из 2 источников) | eslint-config-airbnb-extended 3.3.0 (flat-native, peer eslint ^9) | Живее airbnb-base, но это community-проект одного мейнтейнера (nishargshah), не airbnb; при правиле sanctioned-checkpoint рискованнее каноничного airbnb-base. Допустимо как запасной вариант, если владелец отвергнет FlatCompat-мост |
| ESLint 9 (maintenance) | ESLint 10.14.0 (latest) | v10 ничего не даёт airbnb-стеку, а `eslint-plugin-import` (обязательный peer airbnb-base) декларирует peer максимум `^9` [VERIFIED: npm registry]; переход на 10 — отдельное решение после фазы |
| airbnb-base (без React-правил) + oxlint/react | eslint-config-airbnb (полный, с eslint-plugin-react + jsx-a11y) | Полный airbnb тянет 3+ доп. плагина ради React-правил, которые уже покрыты oxlint (rules-of-hooks, only-export-components); base + tseslint = чистое разделение D-27 «oxlint = границы/импорты+react, eslint = TS-стиль/корректность» |

**Installation (после checkpoint-подтверждения владельцем):**
```bash
pnpm add -D eslint@^9 @eslint/eslintrc@^3 eslint-config-airbnb-base@15 eslint-plugin-import@^2 eslint-import-resolver-typescript typescript-eslint@^8 globals eslint-plugin-oxlint
# + обновление peer-пары: pnpm add -D oxlint@~1.92
```

**Version verification:** все версии сверены `npm view` 2026-11-09 (см. Audit); даты публикаций — из `time` реестра.

## Package Legitimacy Audit

Гейт `gsd-tools query package-legitimacy check --ecosystem npm` выполнен 2026-11-09; `scripts.postinstall` всех пакетов = null (шаг 3 протокола — чисто).

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| eslint | npm | latest 10.14.0: 2026-10-30 (10 дн.) | 205M/wk | github.com/eslint/eslint | SUS (`too-new`) | Approved (pin `^9` — maintenance-линейка; SUS-флаг только про свежесть релиза, не про slop) |
| eslint-config-airbnb-base | npm | 15.0.0: 2021-11-09 (5 лет) | 6.79M/wk | github.com/airbnb/javascript | OK | Approved |
| @eslint/eslintrc | npm | 3.3.7: 2026-09-01 | 151M/wk | github.com/eslint/eslintrc | OK | Approved |
| eslint-plugin-import | npm | 2.32.0: 2025-06-20 | 81.5M/wk | github.com/import-js/eslint-plugin-import | OK | Approved |
| eslint-import-resolver-typescript | npm | 2026-06-01 | 64.9M/wk | github.com/import-js/eslint-import-resolver-typescript | OK | Approved |
| typescript-eslint | npm | 8.72.1: 2026-10-26 (14 дн.) | 115M/wk | github.com/typescript-eslint/typescript-eslint | SUS (`too-new`) | Approved + checkpoint:human-verify перед установкой |
| globals | npm | 2026-11-01 (8 дн.) | 318M/wk | github.com/sindresorhus/globals | SUS (`too-new`) | Approved + checkpoint:human-verify перед установкой |
| eslint-plugin-oxlint | npm | 2026-11-06 (3 дн.) | 1.53M/wk | github.com/oxc-project/eslint-plugin-oxlint | SUS (`too-new`) | Approved + checkpoint:human-verify; peer `oxlint ~1.92.0` требует апгрейда oxlint 1.90.0 → ~1.92 |
| eslint-config-airbnb-typescript | npm | 18.0.0: 2024-03-02 | — | github.com/iamturns/eslint-config-airbnb-typescript | (проверен, отвергнут по peer-конфликту) | REJECTED (не устанавливать) |

**Packages removed due to SLOP verdict:** none.
**Packages flagged as suspicious [SUS]:** typescript-eslint, globals, eslint-plugin-oxlint (все — только recency-флаг `too-new` при официальных репозиториях имногомиллионных загрузках; slop-сигналов нет). Planner вставляет `checkpoint:human-verify` перед каждой установкой (это и есть sanctioned-checkpoint AGENTS.md п.2: список выше — заготовка сверки «владелец, версия, вес»).

*Все пакеты из таблицы подтверждены `npm view` (существование, версия, peers, postinstall) в этой сессии — тег [VERIFIED: npm registry] присвоен по правилу: и реестр, и авторитетный источник (официальные docs ESLint/typescript-eslint/oxc для ролей пакетов) сверены.*

## Разделение ответственности линтеров (D-27 — рекомендация)

- **oxlint (остаётся):** `no-restricted-imports` с group-паттернами границ `src/tensor/` (`.oxlintrc.json:7-17`), override для внутренних импортов библиотеки (`.oxlintrc.json:19-39`), `react/rules-of-hooks`, `react/only-export-components`. Скрипт `pnpm lint` прогоняет оба: `oxlint && eslint .`.
- **ESLint 9 + airbnb-base + typescript-eslint (новое):** TS-стиль и корректность (`strictTypeChecked`-пресет tseslint + airbnb-base через FlatCompat), типизированные правила (`no-floating-promises` — из STACK-requirement) на `src/**/*.{ts,tsx}`.
- **eslint-plugin-oxlint:** отключает в ESLint правила, уже реализованные oxlint (канонический путь сосуществования [CITED: oxc.rs]).
- **Фиксированный список исключений (freeze в момент bring-up, дальше — только апрув владельца):** как минимум `import/prefer-default-export: 'off'` (конфликтует с D-28б «1 именованный экспорт на файл») и `@typescript-eslint/no-non-null-assertion: 'off'` (кодовая база систематически использует `!`-нон-нуллы: `topo[k]!.backwardFn()`, `w[j*cols+i]!` — [VERIFIED: src/tensor/value.ts:116, src/tensor/ops.ts:14]; их удаление = стиль-чёрн без изменения чисел). Итоговый список фиксируется по факту первого прогона на приведённом коде.

## Architecture Patterns

### System Architecture Diagram

```
 [Сценарий = декларативная модель (D-30)]
 ScenarioModel {id, layers/структура сети, loss: 'bce', lr, samples,
                startWeights, opMeta[], render-labels (метки узлов/рёбер/звеньев)}
        │
        ▼
 buildModel(spec) ──► Model {params(): Tensor[]  ← параметры отделены от входов (геттер, D-30)
        │               forward(x): ForwardTensors}
        ▼
 [Движок src/tensor — рефакторится, семантика неизменна (D-29)]
 Tensor op-уровня (Float64Array) ── ops.ts: ЧИСТЫЕ ядра forward/backward
   • было: private backwardFn-замыкание на каждом узле
   • стало: op-дескриптор + чистые localGradient(parents) per-op;
     общий метод: grad += localGrad · incoming (аккумуляция в том же порядке)
 Value (скалярный drill-down) — та же схема для ленивых экспандеров
        │
        ▼
 [Прогон src/run — forward-only]
 SampleCursor.advance()  ── исполняет по ОДНОЙ опе (topo-порядок backward
        │                  runBackward-замыканиями — порядок сохранить бит-в-бит)
        ▼
 TrainingRun (эпохи/FF/reset/история) ── useRunSlice (uSES) ──► React UI
        │                                                   (formula strip, граф,
        ▼                                                    панель операции, история звена)
 Эталон-константы (plain-TS, без раннерных импортов) ◄── self-capture (D-31)
        + central-difference gradcheck (независимая численная проверка)
```

Вход пользователя один — URL hash `#scenario=` (клампится в url.ts). Все вычисления — клиент (NFR-03). Выход — walkthrough-экран, каждый экран тянет числа только из живого прогона (инвариант «граф = drill-down = движок»).

### Recommended Project Structure (цель по D-28)

```
src/
├── format/                      # форматирование чисел (d3-format)
│   ├── numbers.ts               # 1 экспорт-модуль + типы по месту
│   ├── numbers.test.ts          # тест РЯДОМ с кодом (D-28а)
│   └── README.md                # «что делает модуль» (D-28в)
├── tensor/                      # ИЗОЛИРОВАННАЯ библиотека движка (граница index.ts — D-20)
│   ├── README.md
│   ├── index.ts                 # единственный публичный вход (баррел — исключение из «1 экспорт»)
│   ├── tensor.ts                # класс Tensor (+ op-дескриптор вместо backwardFn — D-29)
│   ├── ops.ts                   # ЧИСТЫЕ ядра/градиенты per-op (уже такие — база для D-29)
│   ├── value.ts                 # скалярный Value drill-down (+ чистые grad-фн)
│   ├── functional.ts            # F.bce
│   ├── optim.ts                 # SGD
│   ├── model.ts                 # MLP → обобщить до buildModel(spec) (D-30)
│   ├── trace.ts                 # SampleCursor + записи шага
│   ├── expanders.ts             # ленивые раскрытия drill-down
│   ├── boundaries.test.ts       # CI-тест границ (научиться exempt *.test.ts)
│   └── *.test.ts                # expanders/value тесты рядом
├── run/                         # политика прогона
│   ├── README.md
│   ├── scenario.ts              # XOR_SCENARIO + NEURON_SCENARIO (объявления)
│   ├── etalon-constants.ts      # ПЕРЕЕХАЛ из tests/ (plain-TS, 0 импортов)
│   ├── etalon.test.ts           # эталон-мостик NFR-02 (тут: тесты walkthrough-уровня)
│   ├── invariants.test.ts       # «пошагово = FF», детерминизм
│   ├── types.ts                 # ВСЕ типы модуля run (SampleRecord/HistoryRecord/...)
│   ├── trainingRun.ts           # класс TrainingRun
│   ├── run.ts                   # синглтон run (без window.__run — D-33)
│   ├── useRunSlice.ts           # селектор-хук
│   ├── stepRecords.ts           # buildStepRecord (+isSampleRecord/currentPhase рядом или отдельно)
│   ├── history.ts               # история сессии (сплит по экспортам при декомпозиции)
│   ├── url.ts                   # hash-парсер (KNOWN_SCENARIOS + новый id)
│   └── *.test.ts                # runState/history тесты рядом
├── ui/                          # экран (React 19 + SVG)
│   ├── README.md
│   ├── compGraph/  или compGraph*.ts (сплит констант/типов/билдеров по D-28б)
│   ├── chainLinks*.ts           # сплит SEGMENTS/geometryOf/symbolToSegment
│   └── *.tsx                    # компоненты (default→named — см. Pitfall 3)
tests/                           # УДАЛЯЕТСЯ (миграция в src/**)
e2e/                            # Playwright-спеки остаются отдельными раннерами (testDir 'e2e')
```

Интерпретация правила б (подтвердить у владельца при планировании): баррел `index.ts` — осознанное исключение (он и есть «публичный вход модуля»); файл с «1 модулем + 1 типом» допустим; чистые типы агрегируются в `types.ts` модуля.

### Pattern 1: Чистые функции локальных градиентов (D-29) — бит-идентичная миграция

**What:** заменить приватное поле `backwardFn: () => void` на данные об операции + чистую функцию на op; класс лишь аккумулирует.
**When to use:** везде, где сейчас замыкания: `src/tensor/tensor.ts:50,60,82-89,103-107,120-124,135-138,149-152` (Tensor), `src/tensor/value.ts:26,37-102` (Value), `src/tensor/functional.ts:20-23` (F.bce через `Tensor.defineBackward`).

**Ключевое наблюдение:** чистые градиент-функции УЖЕ существуют и вызываются из замыканий — `matvecGradW`, `matvecGradX`, `tanhBackwardFromOutput`, `sigmoidBackwardFromOutput`, `bceGradP` [VERIFIED: src/tensor/ops.ts:21-87]. Рефакторинг = убрать слой замыканий, не трогая математику:

```ts
// Было (src/tensor/tensor.ts:103-107):
out.setBackward(() => {
  if (out.grad === null) return
  accumulate(this, matvecGradW(out.grad, o.data, rows, cols))
  accumulate(o, matvecGradX(this.data, rows, cols, out.grad))
})

// Стало: узел хранит op-дескриптор; диспетчер в чистой функции.
// Порядок accumulate(parentA → parentB) и порядок суммирования в ядрах
// НЕ МЕНЯЮТСЯ — это и есть бит-идентичность.
type BackwardPlan =
  | { op: 'matmul'; w: Tensor; x: Tensor; rows: number; cols: number }
  | { op: 'add'; a: Tensor; b: Tensor }
  | ...

export function runBackwardPlan(plan: BackwardPlan, out: Tensor): void {
  switch (plan.op) {
    case 'matmul': {
      if (out.grad === null) return
      accumulate(plan.w, matvecGradW(out.grad, plan.x.data, plan.rows, plan.cols))
      accumulate(plan.x, matvecGradX(plan.w.data, plan.rows, plan.cols, out.grad))
      return
    }
    // ...
  }
}
```

`Tensor.runBackward()` (публичный, вызывается из `SampleCursor.advance` — topo-порядок в `src/tensor/trace.ts:114-135`) сохраняет сигнатуру и семантику: тот же код исполнения для пошагового и пакетного режимов (инвариант R1/R3 не затрагивается — курсор не меняется). Аналогично для `Value`: `add/sub/mul/div/neg/tanh/sigmoid/log` получают чистые `localGrad(parents)`-функции; метод класса делает `parent.grad += incoming * local` в том же порядке, что сейчас [VERIFIED: src/tensor/value.ts:35-102].

**Safety net между каждым шагом миграции:** `pnpm test` целиком: etalon (1e-6) + invariants (бит-в-бит `expect(...).toEqual(...)`, [VERIFIED: tests/tensor/invariants.test.ts:63-67]) + expanders (1e-12).

### Pattern 2: Декларативная модель → граф → рендер-метки (D-30)

**What:** сценарий становится данными; всё, что сегодня захардкожено под XOR в UI, становится производным от модели.
**Когда:** D-30+D-31 одновременно — интерфейс проектируется под два известных носителя (один нейрон сейчас, XOR-MLP в фазе 3), реализуется для одного нейрона.

Сегодня XOR-специфика размазана по слоям (все — [VERIFIED] чтением файлов в этой сессии):

| Место | Что захардкожено |
|---|---|
| `src/tensor/model.ts:25-51` | `MLP` с полями W1/b1/W2/b2 + `forward` из шести op; `params()` уже отделяет параметры от входов [VERIFIED: src/tensor/model.ts:38-40] |
| `src/tensor/trace.ts:55-146` | `SampleCursor.advance` — switch на 13 операций с прямыми обращениями `this.model.W1...` |
| `src/run/runState.ts:117-261` | `buildStepRecord` — switch на 13 кейсов с XOR-символами (W1, z1, a1…) |
| `src/run/runState.ts:107-110` | `flatWeights` — порядок 13 весов W1(6)/b1(3)/W2(3)/b2(1) |
| `src/ui/compGraph.ts:70-165` | `NODE_SEEDS`/`EDGE_SEEDS` — статичная таблица топологии XOR 2-3-1 |
| `src/ui/chainLinks.ts:40-79,102-115` | `SEGMENTS`/`SEGMENT_NUMBER_SYMS`/`SYMBOL_NODES` — звенья x→z1→a1→z2→ŷ→L→W |
| `src/ui/ComputationGraph.tsx:84-296` | `nodeValue`/`nodeGrad`/`clickOf` — switch по XOR-идентификаторам узлов |
| `src/ui/FormulaStrip.tsx:56-73` | формула сети — литеральная строка XOR |
| `src/run/history.ts:165-194` | `NODE_SERIES`/`WEIGHT_SERIES`/`SEGMENT_DEFAULT_SYMBOL` — символы XOR |

**Рекомендуемая форма интерфейса** (один источник истины; Render-метки — поля модели, «часть полей вычисляется рендером» — D-30):

```ts
interface ScenarioModel {
  id: 'neuron' | 'xor'                     // URL #scenario= (url.ts KNOWN_SCENARIOS)
  net: LayerSpec[]                          // декларативная структура сети
  loss: { kind: 'bce' }                     // модель + функция потерь в одном объекте (D-30)
  lr: number
  samples: readonly { x: readonly number[]; y: number }[]
  startWeights: Record<string, number[][] | number[]>  // детерминированный старт (DOCS-05)
  ops: readonly ScenarioOpMeta[]            // формулы/нарративы RU (уже есть тип, src/run/scenario.ts:9-15)
  render: ScenarioRender                    // метки рендера: узлы/рёбра графа, звенья цепи,
}                                           // символы формулы-строки, серии истории
```

- `buildModel(spec)` в `src/tensor/model.ts` строит граф из `net`+`loss` и возвращает `{ params(): readonly Tensor[]; forward(x): ForwardTensors }` — PyTorch-аналогия `parameters()`; параметры НЕ смешиваются со входами (входы передаются в forward, геттер — только веса). MLP 2-3-1 остаётся частным случаем спека (фаза 3 подключит его без нового UI-слоя).
- `SampleCursor` обобщается с `model.W1` на walked-список op'ов, которые buildModel сгенерировал из спека (порядок = топология); `buildStepRecord` собирается из метаданных op'ов спека вместо 13-кейсового switch.
- `compGraph`/`chainLinks`/`FormulaStrip`/`history`-серии читают `spec.render` вместо литеральных XOR-таблиц. Значения узлов (`nodeValue`/`nodeGrad`) — через стабильные id узлов из спека.
- Для сценария «один нейрон» звено-цепь сжимается: `x→z→ŷ→L→W` (z = W·x + b; отдельные звенья z1/a1/z2 исчезают) — FormulaStrip рендерит `ŷ = σ(W·x + b) · L = BCE(y, ŷ) · W ← W − η·∂L/∂W`.

### Pattern 3: Suspend-точки не появляются — прогон остаётся живым

Walkthrough-исполнение остаётся «живой прогонкой движка» (D-19): никаких предвычисленных трейсов; каждая кнопка «Шаг» = `cursor.advance()` на живых тензорах; запись `StepRecord` — снимок в момент записи (`buildStepRecord`, заморозка чисел — R1 §2.2). Смена сценария меняет спеку, не механику.

### Anti-Patterns to Avoid

- **Переписывать движок «за один присест»:** любые шаги D-28/29 без зелёного `pnpm test` между ними. Страховочная сеть (etalon/invariants/expanders) гоняется после КАЖДОГО файлового хода.
- **Дублировать boundary-enforcement в ESLint:** границы — уже oxlint `no-restricted-imports` + CI-тест; ESLint-airbnb не должен повторно конфигурировать import-ограничения (разделение D-27).
- **Хардкодить топологию «один нейрон» в UI заново:** если скопировать паттерн `NODE_SEEDS` для нового сценария, фаза 3 (XOR) удвоит дублирование — данные должны идти из `ScenarioModel.render`.
- **Снимать эталон с движка без независимой проверки:** константы, снятые с движка и проверяемые только им же, замыкают круг (см. Pitfall 9).
- **Включать ESLint-правила точечно «по вкусу»:** D-27 фиксирует конфиг один раз; любое послабление после freeze — только апрув владельца.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Style-правила TS | Свои сотни ESLint-правил | eslint-config-airbnb-base + typescript-eslint `strictTypeChecked` | airbnb — канон D-27; самописный набор = вечная поддержка и спорные решения |
| Мост eslintrc→flat | Свой транслятор конфигов | `FlatCompat` из `@eslint/eslintrc` | Официальный утилитой ESLint [CITED: eslint.org migration-guide] |
| Дедупликация правил oxlint/ESLint | Ручной список off'ов | eslint-plugin-oxlint | Официальный oxc-проект именно для этого [CITED: oxc.rs] |
| Численный градиент-чек | mathjs/autograd-библиотеки | central difference в ~10 строк чистого TS (методология `torch.autograd.gradcheck`, STACK.md: h≈1e-6, tol 1e-4) | Библиотека ради 10 строк формулы `(f(x+h)−f(x−h))/2h` — лишний вес и зависимость; метод канонический |
| Форматирование чисел | Свой formatter | d3-format (уже в проекте) | Значащие цифры + экспонента уже отлажены (src/format/numbers.ts) |
| Модульные границы | Второй механизм в ESLint | oxlint no-restricted-imports (уже enforce'ится) | Один источник правды для границ; CI-тест границ страхует |
| UI-состояние | Store-библиотека «на время рефакторинга» | TrainingRun + useRunSlice (постоянное правило AGENTS.md) | Правило владельца 2026-11-02; текущая схема R4 работает и не меняется |

**Key insight:** фаза 2 почти целиком — переупаковка уже работающего; единственные по-настоящему новые сущности — lint-конфиг, `ScenarioModel`-слой и сценарий-носитель. Всё остальное — перестановка проверенного кода под зелёными тестами.

## Runtime State Inventory

> Фаза — рефакторинг/миграция: инвентарь обязателен. Канонический вопрос: «после обновления всех файлов репо — какие runtime-системы ещё держат старое?»

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data (БД/хранилища с ключами) | None — verified by grep: 0 упоминаний `localStorage/sessionStorage/indexedDB` в `src/**` (2026-11-09); персистентности нет вообще (URL = только `#scenario=`) | None |
| Live service config (внешние сервисы вне git) | None — verified by стек: статик-SPA без серверов (NFR-03), аналитика не подключена (фаза 4), никаких дашбордов/webhook'ов | None |
| OS-registered state (Task Scheduler/pm2/launchd) | None — verified by инспекцией репо: нет pm2-конфигов, launchd-плитов, cron-задач; запуск = `pnpm dev` вручную | None |
| Secrets/env vars (.env, CI-переменные) | None — verified by `ls .env*` (файлов нет) и .gitignore; секретов в проекте нет (статик, без бэкенда) | None |
| Build artifacts / installed packages | (1) `dist/` — свежая сборка от 2026-11-09 перегенерируется `pnpm build` (e2e-webServer и так делает `pnpm build && pnpm preview`); (2) `e2e/screenshots/` baseline 28 — регенерируется спекой (`rmSync` в начале e2e/smoke.spec.ts:49); (3) `node_modules` — после установки lint-пакетов обновится pnpm-lock.yaml (коммитить вместе); (4) скрин-baseline меняется из-за D-32 (меньше узлов) и D-31 (новый сценарий) — двойной прогон бит-идентичен (дисциплина 01.1-04) | Code edit + перегенерация артефактов; data-миграций нет |

## Common Pitfalls

### Pitfall 1: Колокация тестов ломает enforcement границ
**What goes wrong:** `tests/**` переезжает в `src/**`, и два механизма границ начинают падать на самих тестах: (а) CI-тест `boundaries.test.ts` требует «внутри src/tensor/ только импорты `./…`» — а `src/tensor/expanders.test.ts` импортирует `vitest` [правило (1): tests/tensor/boundaries.test.ts:56-62]; (б) oxlint override для `src/tensor/**` с regex `^[^.]` ловит `import { describe } from 'vitest'` [VERIFIED: .oxlintrc.json:26-31].
**Why:** оба механизма писались в мире «тесты живут отдельно».
**How to avoid:** в миграционном же плане: boundaries-тест exempt'ит `*.test.ts` из правила (1) (правило (2) — deep-imports — продолжает сканировать тесты); oxlint override получает carve-out для тест-файлов (например, отрицание в files или отдельный override для `src/tensor/**/*.test.ts` с импорт-послаблением только на `vitest`).
**Warning signs:** `pnpm lint` / boundaries-тест красные сразу после переноса файлов.

### Pitfall 2: Нарушить бит-порядок аккумуляции градиентов в D-29
**What goes wrong:** «рефакторинг без изменения чисел» даёт расхождение в последних ulp — etalon (1e-6) может не заметить, а бит-в-бит инварианты (`invariants.test.ts: toEqual` весов эпохи) падают.
**Why:** float-сложение некоммутативно: порядок `accumulate(parentA)` → `accumulate(parentB)` внутри одной op, порядок суммирования в циклах ядер (`acc` слева направо от 0 — src/tensor/ops.ts:10-18) и topo-порядок backward в SampleCursor (trace.ts:114-135) вместе определяют биты.
**How to avoid:** диспетчер чистых функций сохраняет порядок побочных эффектов один-в-один с текущими замыканиями; ядра ops.ts не трогаются вообще; между каждым файлом — полный `pnpm test`.
**Warning signs:** инвариант «пошагово = FF» красный при зелёном etalon.

### Pitfall 3: `import/prefer-default-export` (airbnb) против D-28б и no-non-null-assertion против код-стайла
**What goes wrong:** airbnb-base включает правило «единственный экспорт файла должен быть default», а D-28б требует именованные экспорты; strict-typescript-eslint запрещает `!`-нон-нуллы, которыми систематически написан движок (`topo[k]!.backwardFn()` [VERIFIED: src/tensor/value.ts:116]).
**Why:** конфликт стандарта airbnb с локальными правилами владельца.
**How to avoid:** оба правила — первые кандидаты в ЗАФИКСИРОВАННЫЙ список исключений (внесение в список = часть bring-up'а, не «изменение конфига после freeze»); приводить код под `!`-запрет в этой фазе нельзя (чёрн без изменения чисел).
**Warning signs:** >100 ошибок линтера одного вида на неприведённом коде.

### Pitfall 4: `tsc -b` начинает тайпчекать тесты
**What goes wrong:** сегодня `tests/**` вне `include` tsconfig'ов (vitest транспилирует без проверки); после переезда в `src/**` тесты попадают под strict-настройки tsconfig.app.json (`strict`, `exactOptionalPropertyTypes`, `noUnusedLocals` [VERIFIED: tsconfig.app.json:19-28]) — всплывают типовые ошибки старых тестов, `pnpm build` (= `tsc -b && vite build`) красный.
**Why:** colocation расширяет зону действия компилятора.
**How to avoid:** бюджет на типофиксы тестов в волне миграции; это бонус (тесты впервые под полным тайпчеком), но план должен это явно содержать.
**Warning signs:** `pnpm build` падает на тест-файлах после переноса.

### Pitfall 5: Висячий узел `y` после удаления loss-узла (D-32)
**What goes wrong:** удаление `op:bce`/`L` оставляет узел `y[0]` без единого ребра — прямое нарушение правила DESIGN §9a «каждое звено соединено хотя бы с одним ребром»; `SEGMENT_GROUPS.L` и `STEP_GROUPS[6]/[7]` ссылаются на удалённые id.
**Why:** единственный потребитель `y` на графе — op:bce [VERIFIED: src/ui/compGraph.ts:74,148-150].
**How to avoid:** убрать `y[0]` с графа вместе с loss-узлом (метка y остаётся видимой в формуле-строке, карточке «Результат», панели звена L); переопределить геометрию звена L ( highlight `ŷ`) и шагов loss-фазы (STEP_GROUPS 6/7 → `ŷ`); обновить MAX_COL/graphBounds (канва сузится — детерминизм координат).
**Warning signs:** e2e-селекторы `op:bce`/узла L на графе; aria-label svg упоминает BCE [VERIFIED: src/ui/ComputationGraph.tsx:402].

### Pitfall 6: Нестабильные стартовые константы сценария «один нейрон»
**What goes wrong:** при неудачных стартовых весах ŷ₀ ≈ 0 или 1 → ∂L/∂ŷ = (ŷ−y)/(ŷ(1−ŷ)) взрывается (десятки/сотни), первый же шаг пугает студента «стеной цифр».
**Why:** peculiarity BCE: производная имеет полюса на краях (0,1).
**How to avoid:** правило подбора констант: на всех примерах датасета стартовое ŷ ∈ ~[0.3, 0.7] (лёгкая «неуверенность» сети); проверить |∂L/∂ŷ| первого шага < ~5 и сходимость за разумное число эпох (лосс ↓ заметно к 3–5 эпохе FF) ДО фиксации эталон-констант; веса фиксируются руками (детерминированность DOCS-05), не генератором.
**Warning signs:** значения etalon-констант вида ±1e2 и больше в bce-grad.

### Pitfall 7: e2e-baseline и селекторы при смене графа/сценария
**What goes wrong:** скриншот-self-check (28 файлов) и селекторы (`op:bce`, 13-оп лента, формула XOR) ломаются молча — e2e красные пачкой в конце фазы.
**How to avoid:** каждая UI-волна (D-31/D-32) регенерирует baseline в том же плане; двойной прогон бит-идентичен (reducedMotion + DPR2 — проверенная дисциплина 01.1-04); селекторы обновляются по контракту «testid описывает содержимое экрана» (D-20/R2).

### Pitfall 8: Взять ESLint 10 вместо 9
**What goes wrong:** eslint-plugin-import (обязательный peer airbnb-base) декларирует peer максимум `^9` [VERIFIED: npm registry]; на ESLint 10.14.0 возможны peer-конфликты/поведенческие сюрпризы.
**How to avoid:** pin `eslint@^9` (maintenance-линейка реестра активно патчится); апгрейд до 10 — отдельное решение после фазы (и после обновления peer'ов у import-плагина).

### Pitfall 9: Самозамкнутый эталон (self-capture без независимой проверки)
**What goes wrong:** константы сняты с движка → тест сверяет движок с самим собой → опечатка в градиенте «доказывает» сама себя.
**Why:** Python-конвейер удалён (R3), внешний референс не возвращается.
**How to avoid:** двухступенчатая честность: (1) central-difference gradcheck — численная производная НЕ зависит от аналитических формул движка (ловит знаки/формулы; методология gradcheck из STACK.md/pytorch); (2) XOR-etalon остаётся в репо как регрессия движка (та математика, что независимо верифицировалась против Python в 01.1). Новый сценарий наследует доказанную корректность ops от XOR-прогона + свой gradcheck.
**Warning signs:** temptation пропустить gradcheck «эталон же зелёный».

### Pitfall 10: Perf-регрессия от типизированных линтер-правил в CI
**What goes wrong:** `strictTypeChecked` (projectService) замедляет линт на машинах; в сочетании с oxlint гонять оба на каждый чих.
**How to avoid:** разделение уже есть в D-27: быстрый oxlint — частые прогоны; полный ESLint — в `pnpm lint` перед завершением задачи (проект мал, секунды — typescript-eslint сам рекомендует type-aware rules несмотря на цену [CITED: typescript-eslint.io]).

## Code Examples

### ESLint flat config: airbnb-base + typescript-eslint + oxlint-дедуп (эскиз `eslint.config.js`)

```js
// Source: eslint.org/docs/latest/use/configure/migration-guide (FlatCompat),
// typescript-eslint.io/getting-started/typed-linting (flat + projectService),
// oxc.rs/docs/guide/usage/linter (сосуществование с oxlint)
import { defineConfig, globalIgnores } from 'eslint/config'
import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import oxlint from 'eslint-plugin-oxlint'
import globals from 'globals'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const compat = new FlatCompat({ baseDirectory: __dirname })

export default defineConfig([
  globalIgnores(['dist/**', 'e2e/**', '.claude/**']),
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked, // или strictTypeChecked — решение bring-up'а
      ...compat.extends('eslint-config-airbnb-base'),
    ],
    languageOptions: {
      parserOptions: { projectService: true },
      globals: { ...globals.browser },
    },
    settings: {
      'import/resolver': { typescript: true }, // eslint-import-resolver-typescript
    },
  },
  oxlint.configs['flat/off'], // выключить ESLint-правила, покрытые oxlint
  {
    rules: {
      // === ЗАФИКСИРОВАННЫЕ ИСКЛЮЧЕНИЯ (D-27: изменения — только апрув владельца) ===
      'import/prefer-default-export': 'off',          // D-28б: 1 ИМЕНОВАННЫЙ экспорт на файл
      '@typescript-eslint/no-non-null-assertion': 'off', // код-стайл движка (`topo[k]!.…`)
      // ... итоговый список фиксируется по факту bring-up на приведённом коде
    },
  },
])
```

### Central-difference gradcheck для нового сценария (скелет; полный код — задача плана)

```ts
// Методология: STACK.md Testing stack (h≈1e-6, tol 1e-4) / torch.autograd.gradcheck.
// Числ. производная L по каждому параметру — БЕЗ аналитических формул движка.
function numGrad(model: Model, sample: Sample, lr: number, wFlatIndex: number): number {
  const h = 1e-6
  const lossAt = (w: number): number => {
    const m = modelWithPerturbedWeight(model, wFlatIndex, w) // пересборка графа с весом w
    const cursor = new SampleCursor(m, sample.x, sample.y, lr)
    for (let op = 0; op <= LOSS_OP; op++) cursor.advance()    // до bce-опы включительно
    return cursor.tensors.L!.data[0]!
  }
  const orig = flatWeightsOf(model)[wFlatIndex]!
  return (lossAt(orig + h) - lossAt(orig - h)) / (2 * h)
}
// expect(|analytic − numGrad| ≤ 1e-4 · max(1, |numGrad|)) для каждого веса и ∂L/∂x
```

### Self-capture эталон-констант сценария «один нейрон» (порядок действий)

```text
1. Зафиксировать спеку: samples (напр. AND 4 примера), startWeights (ŷ₀ ∈ [0.3,0.7]),
   lr; NEURON_SCENARIO.opMeta — формулы/нарративы RU 8 оп/сэмпл.
2. gradcheck-скрипт (vitest, режим self-check): численные ∂L/∂w_i, ∂L/∂b, ∂L/∂x
   против аналитических градиентов движка → зелёный (независимая верификация формул).
3. Прогнать сэмпл 1 через SampleCursor + buildStepRecord; вывести outputs/grads
   всех оп с полной точностью (exactRepr/JSON — shortest round-trip double).
4. Захардкодить в src/run/etalon-constants.ts (plain-TS, 0 импортов — межраннеровый
   мостик сохраняется); источник в комментариях НЕ называется (гейт NO-JSON-REFS 01.1-05).
5. etalon.test.ts/invariants.test.ts гоняют новый сценарий против констант + инварианты.
```

### Сценарий «один нейрон»: рекомендованные параметры (D-31 — дискреция исследования)

| Параметр | Рекомендация | Обоснование |
|---|---|---|
| Входы | **2** (x₁, x₂) | «Взвешенная сумма» видна как W₁·x₁ + W₂·x₂; то же входное пространство, что XOR фазы 3 → бесшовный переход «один нейрон умеет AND, но не XOR → нужны слои» |
| Датасет | **AND: (0,0)→0, (0,1)→0, (1,0)→0, (1,1)→1** (4 примера) | Линейно-разделим — один нейрон ЧЕСТНО решает задачу (лосс ↓, точность → 100% за пару эпох FF); 4 примера делают экран эпохи и точность осмысленными (0/25/50/75/100%); педагогический мост: «в фазе 3 — XOR, который один нейрон решить не может» |
| Активация | **σ** (выход) | Непрерывность с XOR-уроком (та же σ+BCE в фазе 3); ŷ ∈ (0,1) — «прогноз вероятности» |
| Лосс | **BCE** | Уже реализован и верифицирован (bce/bceGradP); формула уже в UI (FormulaStrip L-сегмент) |
| Оп/сэмпл | **8** (3 forward: matvec/add/sigmoid + bce + 3 backward: bce-grad/sigmoid-grad/[add+matvec]-grad + sgd) | Паттерн группировки backward XOR (add-grad+matvec-grad одной степ-группой — trace.ts:126-135) сохраняется; лента короче (8 vs 13) — крупнее цифры, легче первый урок |
| lr / стартовые веса | lr ~0.5; веса руками под правило ŷ₀ ∈ [0.3,0.7] | Pitfall 6; точные значения — подбор в плане на живом движке ДО фиксации эталона |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ESLint eslintrc-формат (`.eslintrc.*`) | flat config (`eslint.config.js`) — default с v9 | v9 (2024), v10 продолжает только flat | airbnb-base — eslintrc-конфиг: официальный мост FlatCompat; нативного flat-airbnb от airbnb нет |
| airbnb-конфиги как живой стандарт | морально заморожены: airbnb-base 15.0.0 (2021-11-09, 5 лет), airbnb-typescript 18.0.0 (2024-03) пинирует tseslint ^7 | 2021/2024 | «airbnb-линтер» D-27 реализуем только как airbnb-base+FlatCompat или комьюнити-форк; выбран официальный мост |
| ESLint как единственный линтер | дуэт «быстрый Rust-линтер (oxlint) + ESLint для тяжёлых/type-aware правил» | oxlint ~2024–2026, 870+ правил | D-27 ложится на мейнстрим: oxlint (границы/react) + ESLint (airbnb/TS) + eslint-plugin-oxlint против дублей |
| Тесты в отдельной папке `tests/` | колокация `*.test.ts` рядом с кодом | де-факто стандарт TS-проектов | D-28а совпадает с практикой; vitest include default уже покрывает `src/**` [CITED: vitest.dev/config/include] |
| Эталон из внешнего референса (Python) | self-capture + численная перекрёстная проверка (gradcheck) | R3 (фаза 01.1) | NFR-02 держится на трёх ногах: унаследованный XOR-эталон (верифицирован Python'ом в 01.1), новые константы + gradcheck, бит-в-бит инварианты |

**Deprecated/outdated:**
- `eslint-config-airbnb-typescript`: не развивается под typescript-eslint 8 / ESLint 9+ (peer ^7/^8.56) — не устанавливать.
- `eslint-config-airbnb-base` как flat-native: не существует; только через FlatCompat.
- `.eslintrc`/`.eslintignore`/`--env`-флаги: не поддерживаются flat config [CITED: eslint.org migration-guide].

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Замена `window.__run` в DevTools: `await import('/src/run/runState.ts')` в консоли работает в dev-режиме Vite (модули отдаются на лету) — заменить на документированный сниппет в README модуля run; в prod не нужен | D-33 / Patterns | Низкий: если сниппет не заведётся, fallback — временный breakpoint/лог или React DevTools; ни один вариант не требует window-полей |
| A2 | airbnb-base 15.0.0 корректно раскрывается через FlatCompat под ESLint 9.39.x (механизм официальный; конкретная связка в этом репо не прогонялась) | Standard Stack | Низкий-средний: если отдельные правила не переносятся — они попадают в зафиксированный список исключений bring-up'а (правило D-27 это предусматривает) |
| A3 | e2e-спеки Playwright остаются в `e2e/` (не колоцируются в src): D-28 говорит о юнит-тестах рядом с кодом; e2e — отдельный раннер с `testDir: 'e2e'` [VERIFIED: playwright.config.ts:9] и собственным webServer | D-28 / Structure | Низкий: если владелец прочитает правило строго — перенос спек внутрь src сломает testDir-изоляцию; уточнить на планировании |
| A4 | Педагогические параметры сценария (2 входа, AND-датасет, σ+BCE, lr 0.5, 8 оп/сэмпл) — рекомендация исследования; D-31 объявляет состав предметом планирования | D-31 / Code Examples | Низкий: любой валидный набор проходит через ту же механику; менять до фиксации эталона — бесплатно, после — дорого (пересъём констант) |
| A5 | Точный состав зафиксированного списка lint-исключений (минимум: `import/prefer-default-export`, `@typescript-eslint/no-non-null-assertion`) — итоговый список определится первым прогоном на приведённом коде | D-27 / Patterns | Низкий: механизм freeze не зависит от наполнения; важно зафиксировать список коммитом «конфиг один раз» |
| A6 | Интерпретация «1 именованный экспорт»: баррел `src/tensor/index.ts` и файлы «1 модуль + 1 тип» — допустимые исключения; `types.ts` на модуль — легальная агрегация | D-28 / Structure | Средний: слишком буквальное прочтение раздробит код до абсурда (по файлу на `isSampleRecord`); подтвердить гранулометрию у владельца в планировании |
| A7 | `eslint-plugin-oxlint` совместим с oxlint после апгрейда 1.90→~1.92 (peer-диапазон) | Standard Stack | Низкий: иначе отложить плагин и поддерживать off-лист вручную (дублей немного — oxlint у нас узкопрофильный) |

**Если таблица пуста — все claims верифицированы. Здесь 7 допущений — A2/A6 рекомендованы к подтверждению владельцем при планировании.**

## Open Questions

> Ревизия планов 2026-11-09: все 5 вопросов закрыты решениями планов фазы 2 — статусы (RESOLVED) inline с указанием решающего плана/задачи.

1. **Расположение etalon-констант после миграции** — **(RESOLVED: план 02-02, Task 1 — `src/run/etalon-constants.ts`; переезд в `src/scenarios/` отложен до фазы 3, хаб сценариев)**
   - What we know: D-28 явно требует переезда из `tests/`; файл — plain-TS без импортов, потребляется vitest-тестами и playwright-спекой.
   - What's unclear: `src/run/etalon-constants.ts` (рекомендация — рядом со сценарным слоем) vs отдельная папка `src/scenarios/`.
   - Recommendation: `src/run/` — минимум движения файлов и импортов; при желании переезд в `scenarios/` сделать в фазе 3 (хаб сценариев).
2. **y-узел после D-32** — **(RESOLVED: план 02-06, Task 1 — y-узел уходит с графа вместе с loss-узлом; метка y остаётся в формуле-строке/«Результат»/панели звена L; журнализируется с D-32)**
   - What we know: единственный потребитель y на графе — op:bce; правило DESIGN §9a требует минимум одно ребро на звено.
   - What's unclear: владелец подтвердил «только граф/диаграмма» — но не судьбу метки-узла y.
   - Recommendation: убрать y с графа (метка остаётся в формуле-строке/«Результат»/панели звена L); спросить на planning-чекпойнте.
3. **Гранулометрия D-28б** (см. A6) — **(RESOLVED: решение планировщика в плане 02-07 assumptions — «1 модуль (+типы) на файл», баррел index.ts и types.ts легальны; журнализируется с D-28 планом 02-06 Task 2)**
   - What we know: «1 экспорт = 1 файл» буквально или «1 модуль (+типы) = 1 файл»?
   - Recommendation: второе; подтвердить у владельца.
4. **id сценария в URL** — **(RESOLVED: план 02-05, Task 1 — id 'neuron', DEFAULT_SCENARIO = 'neuron' (первый урок — входная дверь MVP R1), xor остаётся в KNOWN_SCENARIOS до фазы 3)**
   - What we know: `#scenario=neuron`? `KNOWN_SCENARIOS`/`DEFAULT_SCENARIO` расширяются (`src/run/url.ts:16-19`).
   - What's unclear: дефолт остаётся `xor` или переключается на первый урок?
   - Recommendation: дефолт = 'neuron'.
5. **XOR-etalon и XOR-тесты в фазе 2** — **(RESOLVED: план 02-03 assumptions + план 02-09 — XOR-эталон/инварианты остаются регрессией движка; XOR-MLP-walkthrough переносится в фазу 3, XOR остаётся выбираемым по URL до тех пор)**
   - What we know: рекомендовано сохранить как регрессию движка (D-29 мигрирует Value/Tensor — XOR-инварианты там главный бит-в-бит предохранитель).
   - What's unclear: —
   - Recommendation: сохранить (альтернатива — удалить вместе с XOR-UI — отвергнута исследованием: теряется независимая точка опоры NFR-02).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | vite/vitest/eslint toolchain | ✓ | v22.22.2 (env) | STACK декларирует Node 24 LTS — на 22 всё работает (текущие сборки/тесты зелёные на нём); не блокер |
| pnpm | package mgmt | ✓ | 11.24.0 | — |
| npm registry (network) | установка lint-пакетов (после checkpoint) | ✓ (npm view работал в сессии) | — | — |
| oxlint | границы модулей | ✓ | 1.90.0 | апгрейд до ~1.92 при установке eslint-plugin-oxlint (peer) |
| vitest | юнит-тесты | ✓ | 5.0.5 | — |
| playwright | e2e | ✓ | 1.64.1 | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** oxlint ~1.92 (peer eslint-plugin-oxlint) — обновление той же волной; при отказе от апгрейда плагин не ставить (A7).

## Security Domain

> `security_enforcement: true`, ASVS L1 (`.planning/config.json`).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Без регистрации (DOCS-04); сессий нет |
| V3 Session Management | no | Состояние — URL hash + память до reload (D-21/D-26) |
| V4 Access Control | no | Статик без сервера; gating отсутствует by design |
| V5 Input Validation | yes | Единственный внешний ввод — hash: `parseHash` клампит к известным сценариям (threat T-01.1-01, src/run/url.ts:22-26); в фазе 2 список известных id расширяется — механика не меняется; drill/формулы строятся только из чисел сценария (T-01.1-03), dangerouslySetInnerHTML запрещён |
| V6 Cryptography | no | Секретов нет; localStorage не используется (verified) |

### Known Threat Patterns for стек фазы (dev-инструментинг + статик-SPA)

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Supply-chain через новые devDeps (7 пакетов) | Tampering/Elevation | Legitimacy-гейт (выполнен: OK/SUS без slop-сигналов, postinstall = null у всех); pnpm lockfile; пакеты dev-only — в рантайм-бандл не попадают (проверено: бандл не содержит маркер тест-файла в src/) |
| Prompt/артефакт-инъекция через внешние доки | Tampering | Untrusted-input boundary (прочитанный контент = данные, не инструкции) |
| DOM-XSS через рендер чисел/формул | Tampering | Формулы — из чисел сценария (без пользовательского ввода); React-эскейпинг; dangerouslySetInnerHTML запрещён (AGENTS) |
| Regression URL-инъекций (новый scenario id) | Tampering | Белый список литеральных id в `KNOWN_SCENARIOS` + клампинг — сохранить при расширении |

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view`, 2026-11-09): версии/даты/peers/postinstall — eslint, eslint-config-airbnb-base, eslint-config-airbnb-typescript, typescript-eslint, @eslint/eslintrc, eslint-plugin-import, eslint-import-resolver-typescript, eslint-plugin-import-x, eslint-plugin-react-hooks, eslint-config-airbnb-extended, eslint-plugin-oxlint, globals
- eslint.org/docs/latest/use/configure/migration-guide — FlatCompat, flat config, globals, CLI-изменения
- typescript-eslint.io/getting-started/typed-linting — flat config, recommendedTypeChecked, projectService
- oxc.rs/docs/guide/usage/linter — сосуществование oxlint+ESLint, eslint-plugin-oxlint, incremental adoption
- vitest.dev/config/include — дефолтный include `['**/*.{test,spec}.?(c|m)[jt]s?(x)']`
- Кодовая база (Read в этой сессии): все файлы src/tensor, src/run, src/ui (ключевые), tests/**, .oxlintrc.json, vite.config.ts, tsconfig*, playwright.config.ts, package.json — процитированные значения помечены [VERIFIED: path:lines]
- Локальный эксперимент (2026-11-09): `src/*.test.ts` с маркером → `pnpm build` → маркер отсутствует в dist/assets — колокация не течёт в прод-бандл; tsc -b проходит

### Secondary (MEDIUM confidence)
- Реестровые метаданные поддерживаемости airbnb-линейки (dist-tags maintenance/latest) — интерпретация свежести по датам публикаций

### Tertiary (LOW confidence)
- None — все внешние утверждения пришли из официальных доков/реестра

## Metadata

**Confidence breakdown:**
- Standard stack (lint): HIGH — версии/peers сверены реестром; связка airbnb-base+FlatCompat официально задокументирована (сами конфиги не прогонялись — A2)
- Architecture (D-28/29/30 паттерны): HIGH — основаны на пофайловом чтении текущего кода с цитатами; страховочная сеть тестов уже существует
- Pitfalls: HIGH для 1–5, 7, 8 (выведены из конкретных строк кода/конфигов, проверены грепами/реестром); MEDIUM для 6, 9–10 (методологические, проверяются в исполнении)
- Сценарий D-31: MEDIUM — педагогический выбор (A4), механика HIGH

**Research date:** 2026-11-09
**Valid until:** 2026-12-09 (npm-версии линт-стека живые — перепроверить `npm view` перед установкой на исполнении; кодовая база — до первого мержа фазы)
