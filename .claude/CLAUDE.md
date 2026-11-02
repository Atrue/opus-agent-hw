<!-- GSD:project-start source:PROJECT.md -->

## Project

**Backprop Trainer — Интерактивный тренажёр обучения нейросетей**

Бесплатный браузерный тренажёр, в котором студент **сам пошагово исполняет** forward- и backward-pass готовой нейросети (MLP: XOR → спираль → MNIST) и видит каждую операцию: входы, выходы, активации, градиенты — от диаграммы архитектуры до drill-down любого отдельного числа. Аудитория — студенты первых курсов DL (P1) и преподаватели ML (P2); для самоучек-свитчеров (P3) ценность в v1 частичная. Позиционирование: «backprop без магии — на числах, в браузере, за один клик».

**Core Value:** Пользователь сам исполняет каждый шаг forward/backward-pass готового сценария и видит каждый градиент числом (DOCS-01) — при нулевом пороге входа: браузер, без регистрации, ссылка = продукт (DOCS-04). Всё остальное подчинено этому; North Star — число пользователей в неделю, завершивших полный walkthrough хотя бы одного сценария.

### Constraints

- **Tech stack**: Всё в браузере (JS/WASM), статик-хостинг, серверных вычислений нет — архитектура нулевой себестоимости (NFR-03, D-03/D-05)
- **Performance**: Один шаг любого сценария, включая MNIST, < 100 мс на среднем ноутбуке без GPU (NFR-01)
- **Correctness**: 100% операций покрыты автотестами против эталонной реализации (reverse-mode autodiff; референс micrograd/PyTorch на тех же весах); относительное отклонение ≤ 1e-6 (NFR-02) — опечатка в градиенте убивает доверие к продукту
- **Privacy**: Аналитика анонимная, готовый инструмент (Buy); без регистрации (100% сессий); 152-ФЗ/GDPR-совместимость (D-16)
- **Resources**: Один автор; переменные издержки на пользователя ≈ 0 — условие устойчивости (D-08)

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## NFR Traceability (сводка)

| NFR / DOCS | Решение, которое его закрывает |
|---|---|
| NFR-01 (<100 мс/шаг) | Собственный autodiff на Float64 + **предвычисленная лента walkthrough** (шаг = индекс в массиве, UI не считает); WASM не нужен |
| NFR-02 (≤1e-6 vs референс) | Vitest 5 + golden-фикстуры из Python (micrograd/PyTorch, те же веса, bit-exact f64 через JSON repr) + central-difference gradcheck в репо |
| NFR-03 (статик, $0) | Vite 8 SPA → Cloudflare Pages; PostHog free EU (1M events/мес, анонимный режим); никаких серверов |
| DOCS-04 (<1 мин до шага) | Лёгкий бандл (<300 KB gz), ленивая аналитика, никакого Pyodide/TF.js |
| DOCS-05 (перезагрузка offline, детерминизм) | Service worker (vite-plugin-pwa) + детерминированные сценарии с фиксированным seed + localStorage/URL-состояние |
| DOCS-06 (pre/post-аналитика) | Custom events в PostHog через тонкий facade-модуль (провайдер заменяем) |

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| TypeScript | 5.9+ (latest stable 5.x/6.x) | Язык всего кода | Числа и формулы — ядро продукта: строгая типизация `Value`/op-нод ловит опечатки в градиентах на этапе компиляции (NFR-02 — «опечатка в градиенте убивает доверие»). `strict: true`, `exactOptionalPropertyTypes` | HIGH |
| React | 19.x | UI-фреймворк | Продукт = плотный интерактивный UI (диаграмма, панели чисел, drill-down). React даёт: (а) наибольшую эффективность AI-ассистентов автора-одиночки; (б) доступ к React Flow, если понадобится интерактивный граф; (в) самый большой пул примеров для будущих контрибьюторов. Fine-grained обновления шага — не проблема: шаг = смена selection-состояния, а не пересчёт | HIGH (выбор фреймворка; Svelte 5 — легитимная альтернатива, см. Alternatives) |
| Vite | 8.x (проверено: 8.3.4) | Сборка/dev-сервер | Стандарт де-факто: мгновенный HMR, TS из коробки, tree-shaking/code-splitting (Rolldown), крошечный статик-выход для CF Pages. Ecosystem-плагины (react, tailwind, pwa) все Vite-first | HIGH (версия проверена) |
| **Собственный reverse-mode autodiff на TS (порт семантики micrograd)** | — (свой код, ~300–600 LOC) | Вычислительное ядро: лента операций, каждый Value с `.data/.grad/op/formula/parents` | **Движок — и есть продукт.** Ни одна библиотека не даёт per-number provenance (формула + родители + локальная производная) для drill-down (DOCS-02). Micrograd-семантика (~150 строк Python) — проверенный эталон, чей API уже спроектирован под «каждое число — объект с историей»; портируем, а не ставим dep, потому что нам нужны formula-строки и ленивые drill-down-вычисления, которых в JS-портах нет. Float64 (JS number) совпадает с Python float bit-exact для +−×÷; Math.tanh vs np.tanh расходятся на ~1 ulp (≈1e-16) — на 10 порядков ниже допуска 1e-6 | HIGH |
| SVG (React-компоненты) + хенд-ролled layered layout | browser-native | Диаграмма архитектуры, computational graph, подсветка активной op/ребра | Сценарии фиксированы и малы (десятки рисуемых узлов; 784 входа MNIST агрегируются в один узел-вентилятор) → layout детерминирован и пишется руками. SVG даёт: crisp текст (числа — главный контент!), CSS-стили, нативный hit-testing и a11y, лёгкий скриншот/печать для лекций (DOCS-05 «читаемо с дальних рядов») | HIGH |
| Canvas 2D (хенд-ролled, без библиотек) | browser-native | Только пиксельные хитмапы: 28×28 MNIST-вход, матрицы весов как heatmap | Единственное место, где пиксели уместны; ~50 строк кода на ImageData. Не для диаграмм | HIGH |
| Zustand | 5.x | UI-состояние (текущий шаг, selection, drill-down путь) | Минимальный бойлерплейт, иммутабельные снапшоты, идеально для «шаг N из M». Redux — лишняя церемония для state-машины walkthrough | HIGH |
| react-router | 7.x (library mode) | Роутинг: `/`, `/scenario/:id`, 404 | Стандарт, 4–5 роутов. Hash-роутинг не нужен: CF Pages `_redirects` (`/* /index.html 200`) решает SPA-fallback | MEDIUM-HIGH |
| Vitest | 5.x (проверено: 5.0.5) | Юнит- и численные тесты | Vite-native (переиспользует конфиг), TS без настройки, быстрые watch/CI. См. «Testing stack» ниже | HIGH (версия проверена) |
| Tailwind CSS | 4.x | Стилизация | Скорость итераций автора-одиночки, консистентная типографика лекционного режима, Vite-плагин без конфига. Продукт — кастомная визуализация, поэтому component-библиотеки НЕ нужны, только utility-слой | MEDIUM-HIGH |
| Cloudflare Pages | — | Хостинг/деплой | Бесплатно, **безлимитная раздача статики** (HN/reddit-спайк не страшен — NFR-03), глобальный CDN, instant rollback, preview-URL на каждый коммит (юзабилити-тесты с преподавателями из H2-валидации!). Альтернатива-фолбэк: GitHub Pages | MEDIUM (низкостакесное, обратимое решение) |
| PostHog Cloud (EU, free tier) | posthog-js 1.x (latest) | Анонимная продуктовая аналитика: North Star funnel + DOCS-06 pre/post | Free tier 1M events/мес навсегда (проверено 2026-11-02) — запас на виральный спайк при $0. Funnels/insights — first-class: North Star («открыл сценарий → прошёл forward → прошёл backward → post-тест») измеряется штатно. EU-хостинг (Frankfurt). Анонимный режим: `autocapture: false`, `capture_pageviews: true`, без cookies (`persistence: 'memory'`), только явные custom events → нет персональных данных → GDPR/152-ФЗ совместимо без consent-banner. Загружать лениво после первого рендера — аналитика никогда не ломает DOCS-04/05 | MEDIUM (легитимная альтернатива Umami; обязательно тонкий `analytics.ts` facade для замены провайдера) |
| localStorage + URL (query) | browser-native | Персистентность без аккаунтов | URL = source of truth для сценария/seed/шага («ссылка = продукт», шеринг момента лекции); localStorage — прогресс по сценариям и pre/post-баллы (DOCS-03/04/05). Versioned schema (`{version: 1, ...}`) + миграции. Библиотеки не нужны: URLSearchParams + JSON | HIGH |
| Service Worker (vite-plugin-pwa, Workbox) | latest для Vite 8 | Offline-перезагрузка app shell | DOCS-05 edge case прямо требует: сеть оборвалась → перезагрузил ту же ссылку → **та же страница работает**. HTTP-кэша для этого мало; precache app shell + статики сценариев решает. Бонус: PWA-установка на ноут преподавателя | MEDIUM-HIGH (версия плагина не проверена — взять latest совместимый) |

### Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| d3-format | 3.x | Форматирование чисел: `.4g`, `+.3e`, fixed — значащие цифры и экспонента для градиентов | Везде, где число рендерится: 3–4 значащие цифры в таблицах, экспонента для малых градиентов. Стандарт для научной нотации в JS | HIGH |
| d3-scale + d3-interpolate | 4.x / 3.x | Шкалы и колормапы (viridis/magma) для heatmaps весов | Heatmap-панели drill-down. Только модули, НЕ весь d3-бандл | HIGH |
| @fontsource variable (Inter + JetBrains Mono) | latest | Self-hosted шрифты | JetBrains Mono с `font-variant-numeric: tabular-nums` — выравнивание колонок чисел (DOCS-01) и читаемость с проектора (DOCS-05). Self-host: ноль внешних запросов, работает offline | HIGH |
| Base UI (наследник Radix) | 1.x | A11y-примитивы: tooltip, dialog, popover | Только если/когда появятся модалки и тултипы формул. v1 (XOR) может обойтись без него | MEDIUM |
| Playwright | 1.5x+ | E2E smoke: открыл ссылку → нажал «Шаг» → число отобразилось; замер «<1 мин до первого шага» | Со 2-го милистоуна; в CI не блокировать деплой (slow) | MEDIUM-HIGH |
- Также изолировать все пользовательские строки в один `strings/`-модуль (RU-first, EN потом — D-10) — без i18n-библиотеки в v1.

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Node 24 LTS + pnpm 10 | Рантайм/менеджер пакетов | Node 24 — активный LTS с осени 2025; pnpm — скорость и строгий lockfile (npm тоже ок — низкостакесно) |
| ESLint 9 (flat config) + typescript-eslint 8 + Prettier 3 | Линт/формат | Стандарт; `no-floating-promises` обязательно (движок асинхронных сценариев не планируется, но аналитика/SW — да) |
| vite-plugin-checker | Ошибки типов прямо в HMR-оверлее | Дешёвая страховка для автора-одиночки |
| GitHub Actions | CI: `tsc --noEmit` → `vitest run` → `vite build` → deploy CF Pages | Плюс еженедельный cron «фикстуры свежие?» (см. Testing) |
| Python 3.12 + torch 2.x + micrograd (pin коммита) в `tools/reference/` | Генерация golden-фикстур | Единственный Python в проекте; вне веб-бандла; см. Testing stack |

## Engine Architecture (прескриптивно — это ядро NFR-01/02)

## Testing Stack (NFR-02 — как именно)

- **Golden-фикстуры (главный механизм):** Python-скрипт (`tools/reference/gen_fixtures.py`, micrograd + torch, веса/входы из `random.Random(42)`) дампит **каждый промежуточный value и grad** в JSON с полной точностью (`repr` Python float = shortest round-trip → JS `JSON.parse` восстанавливает тот же double bit-exact). Фикстуры коммитятся. Vitest-тест: строим тот же граф в TS, сравниваем с допуском `rel ≤ 1e-6, abs floor 1e-12`. 100% ops каждого сценария — включая обе гранулярности (скалярные и fused).
- **Central-difference gradcheck внутри Vitest:** для каждой op проверяем аналитический backward против численного (h≈1e-6, tol 1e-4 — предел конечных разностей). Ловит знаки/формулы без Python; golden даёт точность 1e-6.
- **CI-guard:** cron-job регенерирует фикстуры против pinned коммита micrograd и падает при diff — эталон не «уплывает» молча.
- НЕ использовать snapshot-матчеры Vitest для чисел — только явное сравнение с tolerance-хелпером (`expectCloseTo`).

## Installation

# scaffold (Vite 8 + React + TS)

# core

# dev

# reference-генератор фикстур (не входит в веб-бандл)

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| React 19 | Svelte 5 (runes) | Технически равный или лучший выбор (мельче, fine-grained). Брать, если автору комфортнее Svelte; но потерять React Flow и максимум AI-кодгена. Решение необратимо дёшево только на старте — выбрать до первой строчки кода |
| React 19 | SolidJS | Аналогично Svelte, но экосистема меньше — не рекомендую |
| Собственный SVG-layout | @xyflow/react (React Flow) 12.x+ | Взять в R2, если появится свободноперетаскиваемый конструктор сетей — его нативный сценарий. Для фиксированных диаграмм v1 — лишний вес и стилизация против собственного продукта |
| Собственный SVG-layout | Cytoscape.js / vis-network | Только для графов с неизвестной заранее топологией и авто-layout. Наши DAG-слои фиксированы — авто-layout только мешает детерминизму DOCS-05 |
| Собственный TS-autodiff | Порт micrograd как npm-dep / WASM (Rust) | Никогда в v1: JS-порты micrograd stale и нетипизированы; WASM — двойной toolchain без нужды (NFR-01 закрывается с 10-кратным запасом) |
| PostHog free EU | Umami Cloud free (100K events/мес, проверено 2026-11-02) | Равнозначная «чистая» альтернатива: скрипт легче, позиционирование cookieless-анонимности сильнее, но лимит 100K и funnel-аналитика слабее. Через facade `analytics.ts` замена — 1 день |
| PostHog free EU | Plausible | Чистейший cookieless-вариант, но платный с первого дня; страницу цен проверить не удалось (404 на 2026-11-02) — LOW confidence по актуальной цене |
| Cloudflare Pages | GitHub Pages / Netlify | GH Pages — простейший фолбэк (уже есть репо), но 100 GB/мес soft-cap и скорость в RU нестабильны. Netlify равен CF, но free-лимиты жёстче |
| Vite SPA | Astro | Только для маркетингового лендинга/блога (SEO-этап роста), как отдельный статик-сайт рядом с app. Не мигрировать сам app |
| Zustand | Jotai/valtio | Личное предпочтение; разница несущественна на нашем state-графе |
| d3-format | Intl.NumberFormat | Нет комбинации «значащие цифры + экспонента» нужного вида — не подходит |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| TensorFlow.js | (а) Op непрозрачны — нет per-number provenance, drill-down невозможен; (б) WebGL-бэкенд = float32 + недетерминизм между устройствами → NFR-02 (1e-6) недостижим; (в) ~1 MB+ бандл убивает DOCS-04; (г) чужая семантика ops ≠ методика курса | Собственный TS-движок |
| Pyodide / любой Python-in-browser | 30–50 MB загрузка и секунды инициализации → «первый шаг < 1 мин» на слабом интернете и лекционная надёжность (DOCS-04/05) мертвы. Python живёт только в `tools/reference/` для генерации фикстур | Собственный TS-движок |
| ONNX Runtime Web | Инференс-ориентирован: backward/градиенты наружу не exposed вообще — для backprop-тренажёра бесполезен | Собственный TS-движок |
| WASM/Rust-движок | Двойной toolchain, медленная итерация, сложнее отладка provenance; производительность не нужна (NFR-01 закрыт с запасом ~100×) | Чистый TS + Float64 |
| Canvas/WebGL/PixiJS для диаграмм | Продукт = текст и числа: crisp-рендер текста, hit-testing, a11y, печать — всё больно. WebGL оправдан только при 10⁵+ частиц | SVG |
| Полный d3 (d3 целиком) | Императивное DOM-управление конфликтует с React-рендером; 250 KB лишних | d3-format/scale/interpolate модулями |
| Next.js / Remix / SSR-фреймворки | SSR не нужен (нет SEO у tool-страниц, нет персонализации), static export добавляет трение; NFR-03 хочет тупой статик | Vite SPA |
| Redux Toolkit | Бойлерплейт без выгоды на нашем state | Zustand |
| GA4 | Cookies/consent-burden, риск блокировок в RU, GDPR-трения — противоречит «аналитика анонимная» | PostHog anonymous / Umami |
| Яндекс.Метрика | Бесплатна и мощна, но данные в RF + cookies/fingerprint → несовместима с GDPR-режимом EN-рынка (D-10). Не смешивать с «анонимно»-обещанием | PostHog EU anonymous |
| decimal.js / arbitrary precision | Медленнее, не нужно: допуск 1e-6 на порядки шире ошибок Float64; референс (Python float) — тоже f64 | JS number |
| IndexedDB в v1 | Нет данных крупнее пары KB (прогресс, баллы); усложнение без нужды. Появится в R2 с «train-your-own» | localStorage |
| Jest | Медленнее, конфиг-трение против Vite-стека; Vitest Jest-compatible, если придётся переносить | Vitest 5 |
| Snapshot-тесты чисел | Молчаливое «обновить снапшот» — прямой путь пропустить регрессию градиента | Явные tolerance-сравнения с golden-фикстурами |

## Stack Patterns by Variant

- Расширить fused ops (одна op = слой целиком), скалярный drill-down оставить ленивым — запас вырастает ещё на порядок. WASM по-прежнему не нужен.
- Перейти на @xyflow/react для canvas-редактора графа; walkthrough-рендер оставить собственным SVG. Движок уже универсален (сценарий = граф).
- Аналитика не критична для юзера (facade, silent-fail); опция — self-hosted Umami (но это сервер — нарушает $0; допустим осознанно как trade-off) или принять потерю данных.
- Строки уже изолированы в `strings/` → добавить словарь, без i18n-фреймворка; хостинг/аналитика уже глобальные.
- Embed через iframe + `postMessage`-контракт; CSP `frame-ancestors` на CF Pages; tenancy через URL-параметры. Текущий стек не меняется.
- Сценарий = декларативный JSON (структура сети + seed + примеры) → генерация ленты уже есть; нужен только валидатор схемы.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| vite@8.x | @vitejs/plugin-react latest (5.x?) | Версию plugin-react взять из scaffold-шаблона Vite 8; отдельно не проверено — MEDIUM |
| vitest@5 | vite@8 | Vitest 5 — актуальная линейка (v5.0.5 проверено); в проекте без Vite-конфликтов |
| tailwindcss@4 | vite@8 через @tailwindcss/vite | Без PostCSS-конфига; CSS-first config |
| vite-plugin-pwa | vite@8 | Проверить таблицу совместимости при установке (MEDIUM) |
| react-router@7 | react@19 | Только library (declarative) mode, без framework-режима |
| zustand@5 | react@19 | Поддержка useSyncExternalStore; конфликтов нет |
| d3-format@3 / d3-scale@4 / d3-interpolate@3 | Всё (без зависимостей от React) | Ставить отдельными пакетами, не d3-метапакетом |
| posthog-js@1.x | Любой фреймворк | Конфиг: `autocapture: false, persistence: 'memory'`, lazy-init после первого рендера |
| Node 24 LTS | vite@8, vitest@5 | Другие мажоры Node не поддерживаем |
| GitHub Pages fallback | vite `base: '/<repo>/'` | Если нет custom domain; CF Pages — base по умолчанию `/` |

## Confidence Summary

| Recommendation | Confidence |
|---|---|
| TypeScript strict | HIGH |
| Собственный TS autodiff (порт micrograd-семантики), без WASM/TF.js | HIGH |
| Предвычисленная лента walkthrough (шаг = индекс) | HIGH |
| Vite 8 | HIGH (проверено) |
| React 19 | HIGH (Svelte 5 — равная альтернатива; выбор до первой строки кода) |
| SVG-first + Canvas только для heatmaps | HIGH |
| d3-format/scale/interpolate | HIGH |
| Vitest 5 + golden-фикстуры Python + gradcheck | HIGH (методология; версии проверены) |
| Cloudflare Pages | MEDIUM (низкостакесно; GH Pages — фолбэк) |
| PostHog free EU anonymous | MEDIUM (Umami — равная альтернатива; фасад обязателен) |
| vite-plugin-pwa | MEDIUM-HIGH (нужен для DOCS-05; версию проверить) |
| Tailwind 4 / Zustand 5 / react-router 7 | MEDIUM-HIGH |

## Sources

- vite.dev — проверено 2026-11-02: актуальная версия **Vite 8.3.4**, Rolldown-based, docs v7/v6 доступны (HIGH)
- vitest.dev — проверено 2026-11-02: актуальная версия **Vitest 5.0.5** (HIGH)
- umami.is/pricing — проверено 2026-11-02: Hobby free = 100K events/мес, 1 сайт, 6 мес retention, GDPR, без cookies (HIGH по фактам; выбор — MEDIUM)
- posthog.com/pricing — проверено 2026-11-02: free tier = 1M events/мес ежемесячно, EU (Frankfurt) опция, 1 год retention (HIGH по фактам; выбор — MEDIUM)
- plausible.io/pricing — недоступен (404) 2026-11-02: актуальные цены не проверены (LOW по Plausible)
- github.com/karpathy/micrograd — эталонная семантика scalar autodiff + тесты; версия pinned-коммитом (HIGH, стабильный проект)
- react.dev, xyflow.com — мажоры React 19 / @xyflow/react 12 — по знаниям автора, xyflow.com/react-flow вернул 404 при проверке (MEDIUM по точным версиям)
- pytorch.org docs `torch.autograd.gradcheck` — методология численной проверки градиентов (HIGH)
- Karpathy, «The spelled-out intro to neural networks and backpropagation» — подтверждающая методика stepwise-объяснения (контекст продукта)

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| ansoff-matrix | "Generate an Ansoff Matrix analysis mapping growth strategies across market penetration, market development, product development, and diversification. Use when considering growth options, planning market expansion, or evaluating strategic growth paths." | `.claude/skills/ansoff-matrix/SKILL.md` |
| business-model | "Generate a Business Model Canvas with all 9 building blocks. Use when creating a business model, documenting how a business creates value, or analyzing an existing business model." | `.claude/skills/business-model/SKILL.md` |
| lean-canvas | "Generate a Lean Canvas with problem, solution, metrics, cost structure, UVP, unfair advantage, channels, segments, and revenue. Use when exploring a lean startup canvas, testing a business hypothesis, or modeling a new venture." | `.claude/skills/lean-canvas/SKILL.md` |
| monetization-strategy | "Brainstorm 3-5 monetization strategies with audience fit, risks, and validation experiments. Use when exploring revenue models, evaluating pricing strategies, or deciding how to monetize a product." | `.claude/skills/monetization-strategy/SKILL.md` |
| pestle-analysis | "Perform a PESTLE analysis covering Political, Economic, Social, Technological, Legal, and Environmental factors. Use when assessing the macro environment, doing strategic planning, or evaluating external factors affecting your business." | `.claude/skills/pestle-analysis/SKILL.md` |
| porters-five-forces | "Perform Porter's Five Forces analysis — competitive rivalry, supplier power, buyer power, threat of substitutes, and threat of new entrants. Use when analyzing industry dynamics, assessing competitive forces, or evaluating market attractiveness." | `.claude/skills/porters-five-forces/SKILL.md` |
| pricing-strategy | "Analyze and design pricing strategies including pricing models, competitive pricing analysis, willingness-to-pay estimation, and price elasticity. Use when setting prices, evaluating pricing models, preparing for a pricing change, or comparing freemium vs paid approaches." | `.claude/skills/pricing-strategy/SKILL.md` |
| product-strategy | "Create a comprehensive product strategy using the 9-section Product Strategy Canvas — vision, segments, costs, value propositions, trade-offs, metrics, growth, capabilities, and defensibility. Use when building a product strategy, creating a strategic plan, or defining product direction." | `.claude/skills/product-strategy/SKILL.md` |
| product-vision | "Brainstorm an inspiring, achievable, and emotional product vision that motivates teams and aligns stakeholders. Use when defining or refining a product vision, creating a vision statement, or aligning the team around a shared direction." | `.claude/skills/product-vision/SKILL.md` |
| startup-canvas | "Generate a Startup Canvas combining Product Strategy (9 sections) and Business Model (costs + revenue) for a new product. An alternative to BMC and Lean Canvas that separates strategy from business model. Use when launching a new product or evaluating a startup concept." | `.claude/skills/startup-canvas/SKILL.md` |
| swot-analysis | "Perform a detailed SWOT analysis — strengths, weaknesses, opportunities, and threats with actionable recommendations. Use when doing strategic assessment, competitive analysis, or evaluating a product or business position." | `.claude/skills/swot-analysis/SKILL.md` |
| value-proposition | "Design a detailed value proposition using a 6-part JTBD template — Who, Why, What before, How, What after, Alternatives. Use when creating a value proposition, analyzing customer value delivery, or articulating why customers should choose your product." | `.claude/skills/value-proposition/SKILL.md` |
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-fast` for a trivial task inline, with no subagents and no PLAN.md
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
