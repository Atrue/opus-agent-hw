---
phase: "3"
slug: shadcn-i-animatsiya-deystviy
created: "2026-11-19"
status: complete
---

# Phase 3: shadcn и анимация действий — Research

**Researched:** 2026-11-19
**Domain:** UI-платформа: подключение shadcn/ui на Vite 8 + React 19.3 + Tailwind 4.3 CSS-first; выбор анимационного подхода (GSAP vs motion vs CSS-only); интеграция анимаций в существующие CSS-контракты без нарушения e2e-детерминизма
**Confidence:** HIGH

## Summary

Фаза технически распадается на два полузависимых домена. (1) **shadcn/ui**: канонический путь подключения в существующий Vite-проект — tsconfig-алиасы + `pnpm dlx shadcn@latest init` + `shadcn add` — не требует create-vite и не конфликтует с Tailwind 4.3 CSS-first; официальная документация подтверждает полный спектр нужных настроек (`aliases.ui` → `src/ui/kit`, `tailwind.config: ""` для v4, `cssVariables: true`). Токен-мост D-39 механически реализуется двухслойной схемой shadcn для Tailwind v4: слоты в `:root` (алиасы `var()` на `@theme`-токены) + `@theme inline`-реэкспорт в утилити-неймспейс Tailwind — с одной коллизией (`--color-primary` уже занята мятой DESIGN.md), решаемой адаптацией cva-вариантов кита. `tw-animate-css` — официальная замена `tailwindcss-animate` для Tailwind v4 (коммит shadcn #6968), но **не содержит собственного reduced-motion-гейта** — этот пробел закрывается существующим глобальным гейтом проекта `animation: none !important` (src/index.css:841–848). (2) **Анимации**: все три обязательные точки D-47 покрываются CSS-only без новых зависимостей — ключевая находка: геометрия графа уже чистая функция структуры (два детерминированных кадра коллапса известны заранее), а глобальный reduced-motion/print-гейт и e2e-ассерт `animation-name === none` покрывают только CSS-анимации; JS-движки (motion +45.0 KB gz, GSAP +26.2 KB gz + несвободная лицензия) создали бы новую поверхность детерминизма, не закрытую существующими проверками.

**Primary recommendation:** CSS-only (нулевые зависимости, весь моушн через существующие гейты и e2e-ассерты) для всех трёх точек D-47; альтернатива — `motion` (MIT, MotionConfig `reducedMotion="user"`), если пилот коллапса нейрона упрётся в ограничения CSS-интерполяции SVG-атрибутов; GSAP отклонить (несвободная лицензия + вес + императивная интеграция); Spline — отказ без пилота (282 KB gz + WASM, D-45).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (D-38…D-48, дословно из 03-CONTEXT.md)

- **D-38: Агрессивная замена.** Все пересобираемые на shadcn компоненты пересобираются в фазе 3: кнопки StepControls (primary/quiet), карточки, вкладки/сегмент-контролы, тултипы (radix через shadcn), `kbd`, обёртки степпера, range-слайдер — по составу, который уточнит ресёрч/план. Обязательства: экраны визуально идентичны (DESIGN.md — канон), testid/RU-строки/e2e-селекторы (17 проверок) не меняются, двойной прогон бит-идентичен. Спец-компоненты продукта (граф, формула-строка, лента, панели чисел, drill-down) НЕ мигрируют — shadcn их не заменяет.
- **D-39: Токен-мост алиасами.** CSS-переменные shadcn (`--background`, `--primary`, `--radius`…) объявляются алиасами на существующие `@theme`-токены DESIGN.md в `src/index.css` — один источник правды; правка палитры DESIGN.md распространяется на кит автоматически. Дублирования палитры в shadcn-формате нет.
- **D-40: @floating-ui/react уходит, если radix покроет контракт NumberHint.** Ресэрч/пилот проверяет: портал, z-index поверх SVG-графа (D-35 фикс 2), hover/focus, позиционирование у краёв. Покрывает — зависимость удаляется (минус одна); не покрывает — остаётся только для NumberHint, radix-тултипы живут в ките. Решение фиксируется в RESEARCH.md с доказательством (пилотный компонент до массовой замены).
- **D-41: Material Symbols — единственная иконная система.** `lucide-react` НЕ ставится; при добавлении shadcn-компонентов их lucide-импорты вычищаются, иконки заменяются глифами Material Symbols (пакет `@fontsource/material-symbols-outlined` уже в зависимостях; DESIGN.md Don'ts: «иконки только Material Symbols»).
- **D-42: Состав пакетов — ядро + radix per-component, один апрув.** Ядро: `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css` (enter/exit-анимации shadcn; reduced-motion совместимость проверяется ресёрчем). Radix-примитивы (`@radix-ui/react-tooltip`, `-tabs`, `-dialog`, `-select`, `-slider`… по составу замены) — ровно под выбранные компоненты, без веера «на будущее». Итоговый список с версиями/весами/владельцами ресёрч приносит в первый план фазы — один пакетный апрув владельца перед установкой (AGENTS.md №2). Удаление `@floating-ui/react` — по вердикту D-40.
- **D-43: Кит в `src/ui/kit/`.** Внутри ui-дерева: баррел `index.ts` + README; structure-gate R2 доволен (корень `ui` — только README); `components.json` указывает CLI класть компоненты сюда; домены импортируют из `ui/kit` как из библиотеки. Термин `kit` — в глоссарий PROJECT.md (UI-кит проекта на shadcn, вендорная зона).
- **D-44: Кит = вендорная зона гранулометрии.** Канонические shadcn-файлы (мультиэкспорт `Button` + `buttonVariants`, cva-варианты) легальны внутри `kit/` — фиксируется README кита и пометкой на ревью планов фазы. Гейт `src/structure.test.ts` НЕ меняется (R1 no-export-default совместим — shadcn использует именованные экспорты; R2 требует подпапку — соблюдено; R4 не про ui). Гранулометрия D-34 (1 субъект/файл) остаётся мягкой инструкцией для доменов; выгода — CLI-обновления компонентов shadcn остаются применимыми (diff-merge против канонических файлов).
- **D-45: Ресэрч GSAP vs motion vs CSS-only; Spline — краткий отказ.** Spline закрывается в RESEARCH.md кратким обоснованием (3D-редактор с proprietary-рантаймом и онлайн-механикой; конфликт с Don'ts «3D-блобы/параллакс» и «приборной» атмосферой DESIGN.md) — без пилота. Полное сравнение: вес в бандле, лицензии (GSAP-лицензию верифицировать отдельно после перехода Webflow на «всё бесплатно»), интеграция с React 19, влияние на NFR-01 и e2e-детерминизм. Итог — журнализированное решение владельца (частичная супрессия D-23, новая запись DECISIONS.md; ROADMAP критерий 2): один вариант принят или отказ с обоснованием.
- **D-46: Без заранее зафиксированного весового бюджета.** Жёсткий потолок KB gz НЕ фиксируется; вес и лицензия оцениваются качественно в ресёрче (DOCS-04 < 300 KB gz общий ориентир бандла — учитывать как контекст, не как гейт), решение принимает владелец по итогам ресёрча.
- **D-47: Все три точки применения обязательны.** Подсветка активного шага, коллапс/раскрытие нейрона (мгновенный коллапс из 2.1 получает анимацию), поток forward/backward — все три включаются в план; финальный состав/детали — на ревью планов по итогам ресёрча.
- **D-48: Сдержанный функциональный градус.** Микровзаимодействия 150–400 мс, продолжение DESIGN.md §8 «движение = смысл»: подсветка приезжает, коллапс схлопывается плавно, волна по рёбрам читает направление backprop. Без декоративных циклов вне активного действия. reduced-motion: полное отключение несущих анимаций, остаются цветовые переходы ≤ 150 мс; print/lecture-гейты сохраняются.

### Claude's Discretion (дословно)

- Точный перечень мигрируемых примитивов внутри «агрессивной замены» (какие из существующих компонентов пересобираются на кит, а какие остаются локальными обёртками) — ресёрч предлагает, ревью планов утверждает.
- Механика токен-моста (какие именно shadcn-переменные нужны выбранному набору компонентов; `@theme inline` vs обычные алиасы в Tailwind 4) — исследовательская деталь.
- Порядок пилотирования radix-тултипа против NumberHint (до массовой замены) — план определяет.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

### Reviewed Todos (not folded)

- `.planning/todos/pending/deferred-h2-h3-validation.md` — НЕ фолдится: D-24 прямо запрещает включение H2/H3-задач в планы фаз без явного запроса владельца.
</user_constraints>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| shadcn-кит (Button/Card/Tooltip/Kbd/Collapsible) | Browser (клиент, скопированный исходник в `src/ui/kit/`) | — | shadcn = копируемый исходник, не runtime-пакет; весь рендер на клиенте (NFR-03) |
| Токен-мост кит ↔ DESIGN.md | Browser (CSS в `src/index.css`) | — | `@theme`-токены уже клиентские; мост — чистый CSS-слой |
| Radix-примитивы (портал/поведение) | Browser (`document.body`-портал) | — | NFR-03: серверов нет |
| CLI shadcn (`init`/`add`) | Dev-инструмент (devDep-время, `pnpm dlx`) | — | не попадает в прод-бандл; зависимости CLI не наследуются рантаймом |
| Анимации трёх точек D-47 | Browser (CSS-слой / JS-анимации) | — | презентационный слой, вне критического пути шага (NFR-01) |
| e2e-детерминизм анимаций | Browser + Playwright-инфраструктура | — | `emulateMedia reducedMotion` + двойной прогон — существующий контракт (01.1-04) |

## Домен 1: shadcn/ui на Vite 8 + React 19.3 + Tailwind 4.3 CSS-first

### 1.1. Канонический путь инициализации (без create-vite)

Официальная инструкция «Existing Project» для Vite [CITED: ui.shadcn.com/docs/installation/vite, доступ 2026-11-19]:

1. Tailwind уже настроен → шаг пропускается («If your project already has Tailwind CSS configured, skip this step»).
2. Алиас `@/*` → `./src/*` в `compilerOptions.paths` **обоих** файлов: `tsconfig.json` и `tsconfig.app.json` (Vite-сплит конфигурации).
3. `resolve.alias` в `vite.config.ts` (`@` → `path.resolve(__dirname, "./src")`); `@types/node` уже в devDeps проекта.
4. `pnpm dlx shadcn@latest init` — создаёт `components.json`.
5. `pnpm dlx shadcn@latest add button card tooltip kbd collapsible` — компоненты копируются исходником в директорию алиаса `aliases.ui`.

create-vite не нужен — он нужен только для новых проектов. CLI-пакет `shadcn` (npm `shadcn@4.23.0`, MIT, создан 2024-07-09) — **dev-инструмент**: запускается через `pnpm dlx`, не попадает в зависимости проекта и в бандл [VERIFIED: npm registry]. Важно для плана: `pnpm dlx shadcn@latest …` качает CLI в кэш pnpm — это НЕ установка npm-пакета в проект и формально не подпадает под AGENTS.md №2 (пакеты проекта не меняются); однако `init`/`add` **предлагает** установить runtime-зависимости — этот шаг обязан идти через sanctioned-чекпойнт (см. Домен 2).

**Состав runtime-зависимостей** для выбранного набора (button, card, tooltip, kbd, collapsible): `class-variance-authority` + `clsx` + `tailwind-merge` (через локальный `cn`-хелпер `@/lib/utils` классического стиля) + `@radix-ui/react-tooltip`, `@radix-ui/react-collapsible` + `tw-animate-css` (CSS-импорт). Kbd/Button/Card — чистые cva-компоненты без radix. [CITED: ui.shadcn.com/docs/components-json, ручная установка; доступ 2026-11-19]

### 1.2. components.json под D-43/D-39

Подтверждённые документацией поля [CITED: ui.shadcn.com/docs/components-json, доступ 2026-11-19]:

| Поле | Значение для проекта | Комментарий |
|---|---|---|
| `$schema` | `https://ui.shadcn.com/schema.json` | — |
| `style` | **решить на плане**: `new-york` (классика; `default` deprecated) или актуальный `base-nova` | «This cannot be changed after initialization» — см. риск 1.5 |
| `rsc` | `false` | Vite-SPA, не Next |
| `tsx` | `true` | — |
| `tailwind.config` | `""` | «For Tailwind CSS v4, leave this blank» — наш случай (4.3.3, CSS-first, без конфига) |
| `tailwind.css` | `src/index.css` | файл, куда мост встанет |
| `tailwind.baseColor` | любой из neutral/stone/zinc/mauve/olive/mist/taupe | пресет НЕ применяется (UI-SPEC: preset none) — базовые значения будут перезаписаны мостом D-39 |
| `tailwind.cssVariables` | `true` | семантические токены → мост алиасами |
| `aliases.ui` | `@/ui/kit` | **ключевое поле**: CLI кладёт компоненты в `src/ui/kit/` (D-43) |
| `aliases.utils` | `@/ui/kit/utils` | локальный `cn` внутри кита — вендорная зона D-44 |
| `aliases.components` / `lib` / `hooks` | `@/ui/kit` (или не используются) | чтобы CLI ничего не создал вне кита |

Алиасы CLI требует бэкендить либо `compilerOptions.paths` (tsconfig), либо `package.json#imports` — для Vite-проекта с paths нужен и `resolve.alias` в vite.config.ts [CITED: там же]. Предупреждение документации соблюдено: «make sure your aliases include the src directory when applicable».

### 1.3. tw-animate-css vs tailwindcss-animate на Tailwind v4

- `tailwindcss-animate` (1.0.7, MIT) — **JS-плагин старой архитектуры**, последний релиз 2023-08-28, в npm нет поля repository (вердикт seam: SUS) [VERIFIED: npm registry]. shadcn официально депрекировал его: миграционный гайд Tailwind v4 требует «Remove `tailwindcss-animate`… Install [tw-animate-css]», коммит shadcn-ui/ui #6968 «feat(shadcn): replace tailwindcss-animate with tw-animate-css» [CITED: ui.shadcn.com/docs/tailwind-v4 + github.com/shadcn-ui/ui/commit/205bfc6, доступ 2026-11-19].
- `tw-animate-css` (1.4.0, MIT, Wombosvideo) — «pure CSS solution… without relying on the legacy JavaScript plugin system», прямая замена tailwindcss-animate под CSS-first Tailwind v4 [CITED: github.com/Wombosvideo/tw-animate-css README, доступ 2026-11-19]. Подключение — одна строка `@import "tw-animate-css";` в CSS. Tailwind трясёт неиспользуемые анимации из финального CSS («if you don't use `accordion-down`, it won't be included in the final CSS file»).
- **Прямая ценность для фазы**: готовые утилиты `collapsible-down`/`collapsible-up`, спроектированные под Radix Collapsible (читают `--radix-collapsible-content-height`), плюс `animate-in`/`animate-out` + `fade-in`/`zoom-in`/`slide-in-from-*` — канонические классы enter/exit в shadcn-файлах тултипа/коллапсибла [CITED: тот же README].
- **Критический пробел (ответ на вопрос D-42)**: tw-animate-css **не содержит собственной обработки `prefers-reduced-motion`** — ни одного упоминания в README/доках. Гейт закрывается существующим глобальным блоком проекта `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }` [VERIFIED: src/index.css:841-848, приведено дословно ниже в Домене 5] — tw-animate-css это чистые CSS-анимации, гейт их гасит как родные. Совместимость: **структурно гарантирована**, но план обязан прогнать e2e-ассерт `animation-name === none` на kit-тултипе/коллапсибле после первого `shadcn add`.
- **Риск версии**: README предупреждает «The upcoming release v2.0.0 will include breaking changes» — план фиксирует версию `1.4.0` точно (caret не ставить), апгрейд v2 — отдельным решением.

### 1.4. Механика токен-моста (D-39): алиасы `:root` + `@theme inline`

Каноническая схема shadcn для Tailwind v4 [CITED: ui.shadcn.com/docs/theming, доступ 2026-11-19] двухслойна:

```css
/* слой 1: сырые слоты в :root (у shadcn — значения; у нас — АЛИАСЫ на @theme) */
:root { --background: ...; --primary: ...; }
/* слой 2: реэкспорт в утилити-неймспейс Tailwind */
@theme inline { --color-background: var(--background); ... }
```

Семантика `@theme inline`: тема-переменная **не эмитится** как CSS-переменная на `:root`; вместо этого утилита (`bg-popover`) подставляет ссылку `var(--popover)` инлайн. Цепочка разрешения: `bg-popover` → `var(--popover)` → `var(--color-surface-container-high)` → `#262a33` — правка палитры в `@theme` (единственный источник правды D-39) распространяется на кит автоматически, hex-дублей нет. Обычный (не-inline) `@theme` так не может: он копирует значение на этапе генерации, разрывая связь.

**Единственная коллизия**: проектный `@theme` уже объявляет `--color-primary: #4edea3` (мята = forward) [VERIFIED: src/index.css:53]. Слот shadcn `--primary` по UI-SPEC правилу 4 = `primary-container` #10b981 (CTA). Два несовместимых значения для одного ключа утилиты `bg-primary`. Решение (дискреция ресёрча, утверждается планом):

1. **Слоты без коллизий** (`--card`, `--popover`, `--muted`, `--destructive`, `--border`, `--input`, `--ring`, `+ *-foreground`) — мостятся канонически: `:root`-алиас → `@theme inline`-реэкспорт. Существующие проектные утилиты (`bg-surface-container-high` и т.д.) не затрагиваются — имена не пересекаются.
2. **Коллизионные слоты** (`primary`, `secondary`, `accent`) — NOT переопределяют `--color-*` проекта; вместо этого cva-варианты kit-компонентов адаптируются под проектные утилиты напрямую: CTA `Button` variant `default` = `bg-primary-container text-on-primary-container hover:bg-primary` (все три утилиты **уже существуют** в @theme: `--color-primary-container`, `--color-on-primary-container`, `--color-primary`). cva-таблица вариантов — штатная точка кастомизации shadcn; расхождение с каноническим файлом локализовано в variant-строках (diff-merge обновлений CLI остаётся практичным для остального файла — компромисс D-44).
3. **`--radius`**: `:root { --radius: 4px; }` + производная шкала вместо канонических коэффициентов shadcn (0.6/0.8/1/1.4/…): `@theme inline { --radius-sm: calc(var(--radius) * 0.5); --radius-md: var(--radius); --radius-lg: calc(var(--radius) * 2); --radius-xl: calc(var(--radius) * 3); }` = ровно шкала DESIGN.md §4 **2/4/8/12** из одного источника; `> 12px` не возникает математически (множитель ≤ 3). Карточка = 2 (`rounded-sm` в терминах кита), кнопка/инпут = 4.
4. Тёмная тема единственная — `:root`-слоты объявляются один раз, механизм `.dark`/`@custom-variant dark` не подключается (UI-SPEC: «механизм `.dark` shadcn не используется»).
5. `chart-*`/`sidebar-*`-слоты не объявляются (нет потребителей — UI-SPEC).

Верификация моста планом: тривиальный тест вычисленных стилей (правка `--color-surface-container-high` меняет `bg-popover`-элемент) — уже предусмотрено UI-SPEC (правило 2 токен-моста).

### 1.5. Риск нового поколения реестра: `base-nova`, пакеты `shadcn` и `cn`

Актуальная документация (доступ 2026-11-19) показывает стиль `base-nova` со схемой `@import "shadcn/tailwind.css"` и ручной установкой `pnpm add shadcn class-variance-authority cn lucide-react tw-animate-css` [CITED: ui.shadcn.com/docs/installation/manual]. Пакет `cn` (v0.5.2, MIT, **официальный** — repo `github.com/shadcn-ui/cn`, мейнтейнер shadcn) — «Drop-in replacement for clsx + tailwind-merge» [VERIFIED: npm registry]. То есть **новейшие** компоненты реестра импортируют `cn` из пакета, а не из `@/lib/utils` (clsx + tailwind-merge), как классический `new-york`.

Следствие для D-42 (список ядра зафиксирован: cva/clsx/tailwind-merge/tw-animate-css): план выбирает `style: "new-york"` (или эквивалентные по генеалогии компоненты), чьи файлы используют локальный `cn` на clsx+tailwind-merge. Если пилот первого `shadcn add` покажет, что текущий CLI генерирует файлы с пакетным `cn`-импортом — два легальных выхода: (а) точечная правка импорта в вендорном файле кита (D-44 разрешает), (б) добавить `cn` в sanctioned-таблицу отдельным апрувом (вес 10.7 KB gz full, но tree-shaken фактически меньше; замена двух пакетов одним). Решение — за владельцем на пакетном апруве (см. Open Questions Q1). `lucide-react` вычищается из генераций в любом случае (D-41).

### 1.6. Совместимость версий стека (сводка)

| Компонент стека | Версия в проекте | Совместимость | Основание |
|---|---|---|---|
| Vite | 8.3.5 | ✓ | официальный путь установки shadcn для Vite без оговорок [CITED: docs/installation/vite] |
| React / react-dom | 19.3.1 | ✓ | radix peerDeps `^16.8 \|\| ^17 \|\| ^18 \|\| ^19` [VERIFIED: npm registry]; cva/clsx/tailwind-merge React-agnostic |
| Tailwind CSS | 4.3.3 (CSS-first, `@theme`, без конфига) | ✓ | shadcn: `tailwind.config: ""` для v4; tw-animate-css CSS-first [CITED: docs/components-json; tw-animate-css README] |
| TypeScript | 5.9.3 | ✓ | shadcn-файлы tsx; никаких требований TS7+ в компонентах |
| oxlint / structure-gate | ~1.92.0 / R1-R4 | ✓ без правок конфигов | shadcn = именованные экспорты (R1), кит в подпапке (R2), R4 не про ui [CITED: UI-SPEC Registry Safety + D-44] |

## Домен 2: Sanctioned-таблица пакетов (для переноса в план 03-01)

Все данные сняты 2026-11-19. «Вес gz (in-app)» — эмпирический прод-билд зонда вне репозитория (Vite 8.3.5, React 19.3.1, базлайн react-dom 66.1 KB gz; tree-shaking реального импорта), «Вес gz (full)» — Bundlephobia (весь пакет без тряски). Скачивания — api.npmjs.org, последняя неделя.

### Ядро кита (D-42)

| Пакет | Версия | Владелец (npm maintainers / repo) | Возраст (first publish) | Скачиваний/нед | Лицензия | Вес gz in-app / full | Вердикт seam | Роль |
|---|---|---|---|---|---|---|---|---|
| `class-variance-authority` | 0.7.1 | joe-bell (joebell93) / github.com/joe-bell/cva | 2022-01-26 (~4.9 г.) | 87 360 610 | Apache-2.0 | ~0.7 KB / 655 B | SUS* (unknown-downloads — сбой API скачиваний у seam; повторный прогон: repo+exists OK) | варианты компонентов кита |
| `clsx` | 2.1.1 | lukeed / github.com/lukeed/clsx | 2018-12-24 (~8 г.) | 175 387 622 | MIT | ~0.4 KB / 353 B | OK | конкатенация classNames |
| `tailwind-merge` | 3.7.0 | dcastil / github.com/dcastil/tailwind-merge | 2021-07-18 (~5.4 г.) | 114 742 937 | MIT | ~7.2 KB / 9.2 KB | OK | resolve конфликтов Tailwind-классов |
| `tw-animate-css` | 1.4.0 | Wombosvideo / github.com/Wombosvideo/tw-animate-css | 2025-03-10 (~2.7 г.) | 51 738 418 | MIT | CSS ~0–2 KB (трясётся Tailwind) / — | OK | enter/exit кит-компонентов (см. 1.3) |
| `cn` (пакет) — **условная строка** | 0.5.2 | shadcn / github.com/shadcn-ui/cn | 2025 | — | MIT | — / 10.7 KB | не прогонялся (ставится только по исходу Q1) | замена clsx+tailwind-merge для base-nova |

Ядро суммарно: **~8.5 KB gz** (эмпирический зонд cva+clsx+tailwind-merge одним билдом; tw-animate-css — CSS-слой, трясятся неиспользуемые правила).

### Radix per-component (D-42: ровно под выбранные компоненты)

| Пакет | Версия | Владелец | Первая публикация | Скачиваний/нед | Лицензия | Вес gz in-app / full | Вердикт seam | Потребитель |
|---|---|---|---|---|---|---|---|---|
| `@radix-ui/react-tooltip` | 1.4.1 | Workos-команда radix-ui (hadihallak, chancestrickland, mark-workos…) / github.com/radix-ui/primitives | 2020-12-15 (~6 л.) | 74 883 403 | MIT | +18.2 KB / 19.3 KB | OK | `Tooltip` кита; пилот D-40 |
| `@radix-ui/react-collapsible` | 1.2.1 | та же | 2020-12-15 | 67 530 209 | MIT | +4.6 KB / 4.8 KB | OK | `Collapsible` кита; пилот `<details>` (UI-SPEC) |
| `@radix-ui/react-tabs` — **условная** | 1.2.1 | та же | 2020-12-15 | 80 687 971 | MIT | (−0.6 KB маржинально к tooltip: общие internals дедупятся) / 8.9 KB | OK | только при нахождении точки замены (D-42 запрещает веер; основные потребители — фаза 4) |
| `@radix-ui/react-slider` — **условная** | 1.6.1 | та же | 2020-12-15 | 56 989 725 | MIT | ~+5 KB оценка / 9.8 KB | OK | только при нахождении точки замены |

Radix tooltip+collapsible вместе: **+18.8 KB gz** (общие `@radix-ui/react-context` и пр. дедупятся — второй компонент почти бесплатен). Для сравнения: текущий `@floating-ui/react` = **+14.58 KB gz** in-app (замер 01.1-04, зафиксирован в STATE.md). Обмен floating→radix по весу: ≈ +4.2 KB gz, минус один прямой dep.

### Удаляемые

| Пакет | Текущая версия | Судьба | Условие |
|---|---|---|---|
| `@floating-ui/react` | 0.27.20 | удалить из dependencies | вердикт пилота D-40 (ради­кс покрыл контракт NumberHint) |

### Анимационные кандидаты (только для сравнения D-45; установка — по решению владельца)

| Пакет | Версия | Владелец | Скачиваний/нед | Лицензия | Вес gz in-app / full | Вердикт seam |
|---|---|---|---|---|---|---|
| `motion` | 14.14.0 | motiondivision (popanimation/motionone, Matt Perry) / github.com/motiondivision/motion | 36 219 915 | **MIT** | **+45.0 KB** / 64.3 KB | SUS (too-new: свежий релиз 2026-11-13; пакет старый — first publish 2013, 33M+/нед устойчиво) |
| `gsap` | 3.15.1 | greensock (Webflow) / github.com/greensock/GSAP | 8 427 368 | **«Standard 'no charge' license»** — НЕ OSI (см. Домен 4.2) | +26.2 KB / 27.4 KB | SUS (too-new: релиз 2026-11-04; пакет first publish 2014) |
| `@gsap/react` (если GSAP) | 2.1.2 | greensock | — | та же несвободная | ~+2–3 KB оценка [ASSUMED] | не прогонялся |
| `@splinetool/runtime` (отказ) | 2.0.190 | Spline | — | нет license-поля в npm (кастомная EULA) | **282.2 KB gz только main JS** + WASM-ассеты (hana-ui 1.1 MB gz, physics 587 KB gz); unpacked 36.4 MB | не прогонялся — отказ D-45 |

Ни один пакет не имеет postinstall-скриптов [VERIFIED: npm view scripts.postinstall для всех строк таблицы — none].

\* Примечание по cva: seam дважды вернул SUS из-за `unknown-downloads` (регистрационные сигналы exists/repo OK, скачивания API вернул null). Прямой запрос api.npmjs.org даёт 87.4M/нед [VERIFIED]. Квалификация ресёрча: cva — устоявшийся стандарт (используется каждым shadcn-проектом), SUS-вердикт — артефакт API, не свойство пакета; тем не менее формально строка помечена, финальное слово за владельцем на пакетном апруве (что и требуется AGENTS.md №2).

## Домен 3: Radix Tooltip vs @floating-ui/react для контракта NumberHint (пилот D-40)

### 3.1. Действующий контракт NumberHint (что обязана покрыть замена)

Верифицировано чтением исходника этой сессией [VERIFIED: src/ui/numbers/NumberHint.tsx:32-93]:

```ts
const { floatingStyles, context } = useFloating({
  open: open && hint !== null,
  onOpenChange: setOpen,
  placement: 'top',
  middleware: [offset(6), flip(), shift({ padding: 8 })],
  elements: { reference: anchor, floating: floatingEl },
})
const hover = useHover(context, { restMs: 60, delay: { open: 120 } })
const focus = useFocus(context)
const dismiss = useDismiss(context, { escapeKey: true })
const role = useRole(context, { role: 'tooltip' })
```

Плюс портал `createPortal(…, document.body)`, `className="num-hint"` (`z-index: 50` — [VERIFIED: src/index.css:882-883] `z-index: 50;`), `data-testid="number-hint"`, контент = метка+значение / формула / градиент / note. Touch: «мобильный тап тултип не показывает (useHover игнорирует touch-указатели — тап ведёт сразу в drill, LOCKED-решение R5 §2c к3)» [VERIFIED: NumberHint.tsx:22-24, док-комментарий]. a11y: aria-describedby на якорь ставит `useRole('tooltip')` «на время открытого тултипа» [VERIFIED: NumberHint.tsx:50-51].

### 3.2. Покрытие radix-тултипом, по пунктам

| Пункт контракта | Radix Tooltip | Основание |
|---|---|---|
| Портал в `document.body` | ✓ `Tooltip.Portal`, `container` по умолчанию `document.body` | [CITED: radix-ui.com/primitives/docs/components/tooltip, доступ 2026-11-19] |
| z-index 50 поверх SVG-графа | ✓ конструктивно: контент в body-портале вне SVG; z-50 ставится классом в файле кита (канонический shadcn-файл содержит z-50) | портал — CITED (там же); класс — проверить пилотом на сгенерированном файле |
| flip/shift у краёв | ✓ `avoidCollisions: true` (default), `collisionBoundary`, `collisionPadding`, `sticky`, `hideWhenDetached` — это и есть flip+shift | [CITED: там же, API Reference Content] |
| offset | ✓ `sideOffset` (int в px; текущее 6 — план округляет к 4/8 по UI-SPEC) | [CITED: там же] |
| hover-delay | ◐ `delayDuration` (default 700; на Provider или Root) — **нет аналога restMs**: radix не детектит «указатель остановился», открывает по истечении delay от входа | [CITED: там же] — расхождение с `restMs: 60 + delay 120` NumberHint; см. риск 3.3 |
| focus-visible | ✓ «Opens when the trigger is focused»; Tab открывает/закрывает без delay | [CITED: там же, Accessibility] |
| Esc-dismiss | ✓ Escape закрывает без delay; `onEscapeKeyDown` | [CITED: там же] |
| aria-describedby | ✓ Trigger ставит `aria-describedby` на contentId при открытии (с конкатенацией внешнего describedby) | [VERIFIED: github.com/radix-ui/primitives, packages/react/tooltip/src/tooltip.tsx:274-296 — `aria-describedby={…concatAriaDescribedby(ariaDescribedby, context.contentId)}`] |
| Touch-тап → drill, не тултип | **?** документация touch-поведение не специфицирует; тултип закрывается при активации триггера («Closes when the trigger is activated»), но открытие по touch-событиям не описано | [CITED: там же, Features] — **обязательный пункт пилота** |
| Якоря — SVG-элементы | ✓ `Trigger asChild` оборачивает любой элемент, включая SVG (обёртка NumberHint клонирует якорь — та же схема) | [CITED: там же, Custom APIs + Composition] |
| React 19.3 | ✓ peer `react: '^16.8 \|\| ^17 \|\| ^18 \|\| ^19 \|\| ^19.0.0-rc'` | [VERIFIED: npm registry, peerDependencies] |
| Время жизни / enter/exit-анимации | ✓ `--radix-tooltip-content-transform-origin`, `data-side`/`data-align` для коллизионно-осознанных анимаций; `@radix-ui/react-presence` в deps | [CITED: там же, Examples] |

### 3.3. Риски пилота и его критерии (для плана)

1. **restMs-семантика** (главный кандидат на провал): текущий NumberHint открывается через 120 мс **после остановки указателя** (restMs 60); radix откроется через `delayDuration` от входа в якорь — при проведении по графу «дождём» тултипы будут вспыхивать чаще. Митигации: (а) увеличить `delayDuration` до ~200–300 мс (UX-компромисс против 120), (б) принять поведение (скрин-ревью владельцем), (в) провал → floating остаётся. Критерий пилота: проведение курсора по 3+ узлам подряд не оставляет открытых тултипов.
2. **Touch**: критерий — на эмуляции mobile (Playwright touch / устройство) тап по числу открывает drill, тултип не всплывает (или всплывает и мгновенно закрывается активацией — визуально не мешает). Провал → floating остаётся.
3. **Края графа со скроллом**: collisionBoundary по умолчанию viewport; тултип у правого края карточки графа (карточка скроллится, DESIGN §9a) должен flip'аться внутри viewport, не обрезаясь. Критерий: hover узла в правом верхнем углу канвы.
4. **Провал любого критерия** → `@floating-ui/react` остаётся **только** в NumberHint, radix-тултип живёт в ките для прочих потребителей (D-40 явно разрешает обе стороны решения).

### 3.4. Экономика замены

+18.2 KB gz (radix tooltip in-app) против −14.58 KB gz (floating при удалении) ≈ **+3.6 KB gz** нетто; минус один прямой dependency; floating-ui-ядро при этом **не исчезает из бандла полностью**: `@radix-ui/react-tooltip` транзитивно зависит от `@radix-ui/react-popper` [VERIFIED: npm registry, dependencies], который внутренни стоит на @floating-ui/react-dom — позиционирование radix само построено на floating-ui. D-40 всё равно выполняется (уходит прямая зависимость и React-API обёртка), но «минус floating-ui из бандла» — не буквальное следствие; план не должен обещать −14.58 KB.

## Домен 4: Анимации — GSAP vs motion vs CSS-only (D-45)

### 4.1. Сравнительная таблица по критериям D-45/D-48

| Критерий | CSS-only (+ существующие контракты) | `motion` 14.14.0 | `gsap` 3.15.1 (+`@gsap/react` 2.1.2) |
|---|---|---|---|
| Вес gz in-app (зонд) | **0 KB** | **+45.0 KB** | **+26.2 KB** (+ ~2–3 KB хук [ASSUMED]) |
| Лицензия | — | MIT (OSI) [VERIFIED: npm] | «Standard "No Charge"» — кастомная, **не OSI** (см. 4.2) [VERIFIED: npm + текст лицензии] |
| React 19.3 интеграция | нативная (классы/стили) | first-class: `motion/react`, `MotionConfig`, `useReducedMotion` [CITED: motion.dev] | императивная: `useGSAP()` — drop-in замена useEffect с авто-cleanup через gsap.context, `contextSafe()` для событий [CITED: gsap.com/resources/React] |
| SVG: dash-offset интерполяция | ✓ `stroke-dashoffset` — уже работает (`.diag-flow`) | ✓ pathLength/pathSpacing/pathOffset (0–1 прогресс), path-morphing `d`, viewBox | ✓ эталонные SVG-плагины (DrawSVG/MorphSVG теперь бесплатны) [CITED: gsap.com] |
| FLIP-коллапс SVG-групп рамки | ◐ два детерминированных кадра известны (geometry/frames — чистые функции) → transform+opacity transition на `<g>`; retarget = interrupt; пилот обязан проверить интерполяцию позиционирования (SVG x/y как CSS-свойства в целевых браузерах) | ✓ декларативно, interruption by design | ✓ timelines/Flip-плагин, overwrite-режим настраивать [ASSUMED] |
| Прерываемость (interrupt-restart, D-47.2) | ✓ transition ретаргетится с текущего вычисленного значения | ✓ «animate from the current value to a new value», wildcard `null`-keyframes для мягкого перебивания [CITED: motion.dev/docs/react-animation] | ◐ `overwrite: 'auto'`/kill-дисциплина вручную [ASSUMED] |
| prefers-reduced-motion | ✓✓ глобальный гейт `animation/transition: none !important` уже существует — **нулевая новая поверхность** | ✓ `MotionConfig reducedMotion="user"`: гасит transform/layout, **оставляет opacity/backgroundColor** — в точности формула D-48 «остаются цветовые переходы» [CITED: motion.dev/docs/react-motion-config] | ◐ нет глобального механизма; `gsap.matchMedia()` вручную [ASSUMED — страница не фетчилась] |
| e2e-детерминизм | ✓ existing-ассерт `animation-name === none` покрывает всё (smoke.spec.ts:94-98) | **риск**: JS/WAAPI-анимации невидимы для CSS-гейта; полагаемся на `reducedMotion:"user"` + новые ассерты | **риск**: тот же + ручной гейт |
| NFR-01 (<100 мс, вне критического пути) | ✓ тривиально (compositor-свойства) | ✓ (WAAPI/compositor-движок) | ✓ (rAF-движок) |
| Декларативность в React-коде доменов | высокая (классы по data-атрибутам) | высокая (animate-пропы) | низкая (эффекты + селекторы) |

### 4.2. GSAP: лицензия — верифицированный текст и OSI-статус (прямое требование D-45)

Полный текст снят с официальной страницы 2026-11-19 [CITED: gsap.com/standard-license]. Ключевые пункты дословно:

- Название: **«Standard "No Charge" GSAP License»**; лицензиар — Webflow («Webflow grants you a non-exclusive, worldwide license to use, reproduce, display, and implement GSAP Products solely for Permitted Uses»). Effective date April 30, 2025; last modified May 30, 2025.
- «Всё бесплатно» подтверждено FAQ дословно: **«Can I really use GSAP in commercial projects without paying anything? Yes, really! Commercial usage is covered under the standard license. All of GSAP including the plugins that were formerly "members-only" like SplitText and MorphSVG can be used in commercial projects at no charge.»**
- **Prohibited Uses**: «any implementation and/or use of GSAP Products in tools that allow users to build visual animations without code that encourages, induces, or materially assists in creating a solution that competes with Webflow's visual animation building capabilities».
- **Ownership**: «All intellectual property rights in GSAP Products … remain the exclusive property of Webflow».
- **Termination/Amendments**: Webflow «may terminate this GSAP License and revoke your access **in its discretion**»; «reserves the right to update or modify this GSAP License at any time» (с правом остаться на ранее выпущенных версиях).

**OSI-статус: НЕ open-source лицензия.** Формальные основания: (а) field-of-use restriction (запрет класса применений — визуальные анимационные билдеры, конкурирующие с Webflow) — OSI требует отсутствия ограничений на поле применения; (б) односторонняя поправка/терминация по дискреции лицензиара; (в) все права остаются у Webflow (лицензия не передаёт ownership). npm-поля: gsap → `Standard 'no charge' license: https://gsap.com/standard-license.`; @gsap/react → `SEE LICENSE AT https://gsap.com/standard-license` [VERIFIED: npm registry].

**Для этого продукта**: Backprop Trainer — кодовый учебный тренажёр, не визуальный анимационный билдер → Permitted Use, практического запрета нет. Но историческая причина отбраковки GSAP в D-23 («GSAP (лицензия)») **не исчезла**: лицензия стала бесплатной, но не стала свободной. Владелец явно просил верифицировать именно это — вынесено в решение D-45 (Рекомендация + Open Questions Q2).

### 4.3. CSS-only: что уже есть и чего не хватает

Уже в проде (всё — чтение файлов этой сессией):

- «Бегущий пунктир»: `.diag-edge-g.active .diag-flow { opacity: 1; animation: diag-flow-run 1.2s linear infinite; }`; `@keyframes diag-flow-run { to { stroke-dashoffset: -14; } }` («период штриха 8+6 — бесшовный бесконечный цикл»); `stroke-dasharray: 8 6`; backward: `[data-flow="backward"] .diag-edge-g.active .diag-flow { stroke: var(--color-tertiary); animation-direction: reverse; }` [VERIFIED: src/index.css:690-710].
- Подсветка-переходы графа: `.diag-node, .diag-edge, .diag-edge-casing, .diag-flow, .diag-edge-label { transition: stroke 180ms, fill 180ms, opacity 180ms, stroke-width 180ms; }` [VERIFIED: src/index.css:671-681] — fade-приезд амбер-подсветки группы активной op **уже существует** (transition на stroke/fill/opacity/stroke-width).
- Пульс активной пилюли: `animation: step-pill-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;` + `@keyframes step-pill-pulse` [VERIFIED: src/index.css:358-361].
- Значения шага: fade+rise ≤ 200 мс ease-out — канон DESIGN §8.

Не хватает (дельта фазы 3): (а) **travel-подсветка ленты** — ring/тинт переезжает к новой пилюле (общий оверлей-элемент с `transform`-transition; `grid-auto-columns` стабилен по UI-SPEC, layout не меняется); (б) **плавный коллапс рамки-нейрона** (сейчас мгновенный по D-36; два кадра детерминированы — анимация = интерполяция transform/opacity между кадрами); (в) **«волна, читающая направление backprop»** — уточнение текущего dash-механизма (кандидат: transition-delay-каскад по цепочке рёбер — остаётся CSS).

### 4.4. Spline — отказ без пилота (D-45)

`@splinetool/runtime@2.0.190` — **282.2 KB gz только main JS**, плюс WASM-ассеты (hana-ui 1.1 MB gz, physics 587 KB gz), unpacked 36.4 MB [VERIFIED: bundlephobia + npm]; у `@splinetool/react-spline@4.2.0` и runtime **пустое license-поле в npm** — кастомная EULA Spline [VERIFIED: npm registry — отсутствие поля]; сцены авторятся в онлайн-редакторе (proprietary-рантайм + онлайн-механика — формулировка D-45 подтверждена). Против: DESIGN.md §10 Don'ts («3D-блобы, параллакс»), §1 «приборная» атмосфера; DOCS-04-ориентир < 300 KB gz (один рантайм съедает весь бюджет); D-23 lineage. Отказ без пилота — согласован с D-45.

### 4.5. Влияние на e2e-детерминизм и NFR-01 (решающий критерий)

Существующая дисциплина [VERIFIED: e2e/smoke.spec.ts:63-65, 94-98]: все тесты под `page.emulateMedia({ reducedMotion: 'reduce' })`; ассерт «computed `animation-name` активного `.diag-flow` === 'none'»; двойной прогон бит-идентичен; `deviceScaleFactor: 2`.

- **CSS-only**: новые анимации — те же CSS-механизмы → глобальный гейт гасит их автоматически, existing-ассерт остаётся единственным свидетелем; скриншоты ловят конечные состояния. **Нулевая новая поверхность детерминизма.**
- **motion/gsap**: анимации исполняются JS-движком — CSS-гейт и ассерт `animation-name` их **не видят**. Потребовалось бы: (а) библиотечный гейт (`MotionConfig reducedMotion="user"` — но он **оставляет opacity/цвет-переходы**, скриншот может поймать середину фейда; GSAP — ручной matchMedia); (б) новые per-point ассерты мгновенного конечного состояния; (в) аудит скриншот-точек на «середину анимации». Это реальная инфраструктурная стоимость для каждой из трёх точек.
- **NFR-01**: все три варианта выводят анимации из критического пути (значения в DOM синхронно — контракт UI-SPEC «градус»); CSS-only не добавляет JS-работы в шаг вовсе.

## Домен 5: Интеграция с существующими контрактами (D-47 — три точки + гейты)

### 5.1. Точка 1 — «подсветка приезжает» (лента + граф + значения)

| Слой | Файлы (сегодня) | Что делает фаза 3 |
|---|---|---|
| Лента шагов | `src/ui/stepper/` (StepperBand, `.step-pill*` в index.css ~293–365) | оверлей-элемент ring+тинт, `transform: translateX(…)`-transition 150–400 мс ease-out к активной пилюле; прерывание = ретаргет transition; `grid-auto-columns` не меняется; автоскролл smooth / `behavior: auto` при reduced-motion — существующий контракт |
| Пульс пилюли | index.css:358-361 | не трогается (континуальный индикатор 2 s — вне конверта 150–400 мс по D-48) |
| Граф — группа активной op | `src/ui/graph/` + index.css:671-681 | уже есть transition 180 мс на stroke/fill/opacity/stroke-width — привести конверт к 150–400 мс и удостовериться, что «предыдущая группа гаснет тем же конвертом» (симметричный transition out) |
| Значения шага | панели `src/ui/operation/`, классы значений | fade+rise ≤ 200 мс — канон §8, сверить/привести к единообразию |

### 5.2. Точка 2 — коллапс/раскрытие нейрона (D-36 → анимация)

| Слой | Файлы (сегодня) | Что делает фаза 3 |
|---|---|---|
| Геометрия рамок | `src/ui/graph/frames.ts` (bbox членов + FRAME_PAD), `geometry.ts` (x = PAD_X + колонка×PITCH_X …) | не меняется: анимация интерполирует между двумя детерминированными кадрами, не порождая новых layouts (UI-SPEC) |
| Рамка-контейнер, заголовок-кнопка `aria-expanded`, двойной клик | `src/ui/graph/` (ComputationGraph/frames) | добавляется переходное состояние: transform+opacity на SVG-группах (scale+fade между кадрами «раскрытая рамка» ↔ «квадратный блок»), 150–400 мс ease-in-out; interrupt-restart — повторный двойной клик ретаргетит transition с текущего кадра |
| Живые числа (`station-value` z) | граф, `station-value` | остаются в DOM и читаемы; промежуточные кадры не меняют числа (UI-SPEC «Читаемость») |
| Цепь при коллапсе x → n → z → σ → ŷ | рёбра/geometry | конечные состояния бит-идентичны сегодняшним (D-38) |

Техника (все варианты из UI-SPEC: FLIP/transform на SVG-группах, WAAPI, CSS, GSAP/motion): при CSS-only рекомендуются transform/opacity-переходы с `transform-box: fill-box` на группах (центрирование scale вокруг bbox группы); Pilот обязан проверить прерывание и близнецовость конечных кадров (e2e-снимки).

### 5.3. Точка 3 — поток forward/backward («волна, читающая направление»)

| Слой | Файлы (сегодня) | Что делает фаза 3 |
|---|---|---|
| Бегущий пунктир | index.css:664-710 (`.diag-flow`, `data-flow` на корне svg, один селектор направления) | доработка семантики волны: цвет/направление уже кодируются фазой (мята forward / амбер backward + reverse); уточнение техники/скорости — в рамках CSS (dash-паттерн, delay-каскад по рёбрам цепочки); параметры канона §8 (~1.2 s linear loop) — базовые |
| e2e-ассерт | smoke.spec.ts:94-98 (`animation-name === none` при reducedMotion) | остаётся нетронутым (жёсткое требование UI-SPEC «гейты») |

### 5.4. Гейты — что уже существует и как расширяется

Верифицировано чтением index.css этой сессией:

```css
@media (prefers-reduced-motion: reduce) {   /* index.css:841-848 */
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
}
@media print {                               /* index.css:849-854 */
  .diag-edge-g.active .diag-flow,
  .step-pill-active::after {
    animation: none;
  }
}
```

Док-комментарий канона [VERIFIED: src/index.css:836-839]: «prefers-reduced-motion гасит анимации и переходы ГЛОБАЛЬНО (e2e проверяет computed animation-name активного .diag-flow === 'none'); @media print останавливает пунктир и пульс — статичный кадр. .lecture поток НЕ выключает: направление вычисления — дидактический контент».

Расширение фазы 3 (по UI-SPEC «Гейты»): print-блок **дополняется** новыми анимациями точек (travel, коллапс, enter/exit кит-компонентов) — печать всегда ловит конечное состояние; reduced-motion блок **не меняется** (гасит всё скопом — легальная более строгая реализация D-48); `.lecture` не выключает анимации смысла (R5 §4.2 сохранён). Зум-обёртка графа (transform, уровни 0.5–2.0 шаг 0.25) и лекционный `--diag-scale` суммируются, не подменяются [VERIFIED: DESIGN.md §9a] — анимации не должны трогать transform зум-обёртки (иначе конфликт каналов).

### 5.5. Взаимодействие с миграцией кита

`tw-animate-css` (enter/exit тултипа/коллапсибла) — те же CSS-механизмы → покрыт обоими гейтами автоматически; длительности enter/exit кит-компонентов приводятся к конверту 150–400 мс (D-48). `NumberHint` после пилота D-40: либо radix-тултип кита (гейты те же), либо floating остаётся (уже гейтов нет — он вне CSS-анимаций, поведение порта/flip — не анимация).

## Рекомендация по анимации (D-45 — для решения владельца)

**Рекомендуемый вариант: CSS-only (расширение существующих контрактов), 0 новых зависимостей.**

Обоснование против критериев D-45/D-47/D-48:

1. **Вес**: 0 KB против +45.0 KB (motion) / +26.2 KB+хук (gsap). При ориентире DOCS-04 < 300 KB gz (контекст D-46) и уже спланированном росте от кита (+~27 KB gz ядро+radix) — CSS-only удерживает бандл в ориентире без торга.
2. **Лицензия**: нет предмета. GSAP — бесплатен, но не свободен ( OSI-несовместимая лицензия Webflow с field-of-use и односторонней терминацией — 4.2); историческая причина отказа D-23 не устранена. motion — MIT, легален без оговорок.
3. **React 19**: CSS не имеет поверхности интеграции; motion — first-class; gsap — императивная дисциплина (useGSAP/contextSafe) поверх чужого кода доменов.
4. **Три точки D-47**: (1) приезд подсветки — transition 180 мс на графе уже существует, лента — один оверлей с transform-transition; (2) коллапс — оба кадра детерминированы чистыми функциями, интерполяция transform/opacity между двумя известными состояниями — ровно тот случай, когда FLIP-движок не нужен (он нужен, когда кадры надо измерять в рантайме); (3) волна — уже CSS, дорабатывается в CSS.
5. **reduced-motion/e2e-детерминизм** (решающий): CSS-анимации автоматически покрыты существующим глобальным гейтом и existing-ассертом `animation-name === none`; JS-движки потребовали бы нового слоя проверок на каждую точку и несли остаточный риск середины фейда на скриншотах. D-48 «при reduced-motion остаются только цветовые переходы ≤ 150 мс» формально строже, чем существующий гейт (он гасит и их) — UI-SPEC уже признал гейт «легальной (более строгой) реализацией».
6. **Прерываемость**: CSS-transition ретаргет с текущего значения = interrupt-restart без очередей (критерий D-47.2); для keyframe-циклов (пунктир) прерывание не требуется by design.

**Альтернатива (если пилот коллапса провалится): `motion` 14.14.0 (MIT).** Триггер перехода: CSS-пилот коллапса не даёт удовлетворительного interrupt/интерполяции SVG-групп в целевых браузерах. Тогда: `MotionConfig reducedMotion="user"` на корне + пер-point ассерты конечных состояний + аудит скриншот-точек; вес +45.0 KB gz — в пределах апрува владельца. Выбор motion, а не gsap, при равных SVG-способностях: MIT против несвободной лицензии, first-class React против императивной обёртки.

**GSAP — отклонить** (несвободная лицензия при свободных альтернативах, вес, императивная интеграция; отсутствие встроенного reduced-motion). **Spline — отказ** (4.4).

Итоговая формула для DECISIONS.md (частичная супрессия D-23, готовит план): «Анимации трёх точек — CSS-only на существующих гейтах; анимационные JS-фреймворки не вводятся (motion — санкционированная альтернатива при провале CSS-пилота коллапса); GSAP отклонён лицензионно; Spline отклонён по D-45».

## Package Legitimacy Audit

Гейт протокола исполнен: `gsd-tools query package-legitimacy check --ecosystem npm …` (два прогона — второй для cva из-за сбоя API скачиваний) + `npm view` для каждой строки + `npm view scripts.postinstall` (все — none) + скачивания api.npmjs.org.

| Package | Registry | Age | Downloads/нед | Source Repo | Verdict | Disposition |
|---|---|---|---|---|---|---|
| class-variance-authority | npm | 4.9 г. | 87.4M | github.com/joe-bell/cva | SUS* | Approved (артефакт API; см. Домен 2) |
| clsx | npm | 8 г. | 175.4M | github.com/lukeed/clsx | OK | Approved |
| tailwind-merge | npm | 5.4 г. | 114.7M | github.com/dcastil/tailwind-merge | OK | Approved |
| tw-animate-css | npm | 2.7 г. | 51.7M | github.com/Wombosvideo/tw-animate-css | OK | Approved |
| @radix-ui/react-tooltip | npm | 6 л. | 74.9M | github.com/radix-ui/primitives | OK | Approved |
| @radix-ui/react-collapsible | npm | 6 л. | 67.5M | github.com/radix-ui/primitives | OK | Approved |
| @radix-ui/react-tabs (условная) | npm | 6 л. | 80.7M | github.com/radix-ui/primitives | OK | Условно (D-42: только при точке замены) |
| @radix-ui/react-slider (условная) | npm | 6 л. | 57.0M | github.com/radix-ui/primitives | OK | Условно (D-42) |
| motion (сравнение) | npm | 13 г. (first publish 2013) | 36.2M | github.com/motiondivision/motion | SUS (too-new — свежий релиз) | Не ставится (альтернатива D-45) |
| gsap (сравнение) | npm | 12 л. | 8.4M | github.com/greensock/GSAP | SUS (too-new — свежий релиз) | Не ставится (отклонён) |
| tailwindcss-animate (отвергнута) | npm | 4.7 г. | 24.9M | нет поля repo | SUS (no-repository) | REMOVED — заменена tw-animate-css (официально shadcn) |

**Packages removed due to SLOP verdict:** none. **Packages flagged as suspicious [SUS]:** cva — Seam-вердикт SUS объяснён (сбой downloads-API у seam, повторный прогон подтвердил exists+repo, скачивания сняты напрямую; фактических сигналов слопа нет, пакет — стандарт экосистемы); motion/gsap — «too-new» отражает свежесть последнего релиза (2026-11-13/2026-11-04), не возраст пакета; оба в фазе не устанавливаются. `lucide-react` не исследовался и не вносится (D-41 — исключён решением).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Позиционирование тултипа у краёв | свой flip/shift | radix `avoidCollisions` (внутри — floating-ui) | десятки edge-cases (viewport, sticky, scrollbar-gutter) |
| Enter/exit-анимации примитивов (mount/unmount) | свои keyframes + conditional render | `tw-animate-css` (`animate-in fade-in …`) + `@radix-ui/react-presence` (внутри radix) | race unmount/animation — классическая ошибка ручной реализации |
| Resolve конфликтов Tailwind-классов | свой merge | `tailwind-merge` | таблица конфликтов Tailwind — большой поддерживаемый датасет |
| Варианты кнопок с приоритетами классов | конкатенация строк | `cva` (в ките) | типизированные варианты — стандарт shadcn-файлов |
| Источник правды палитры кита | копия hex в shadcn-формате | токен-мост D-39 (`:root`-алиасы + `@theme inline`) | UI-SPEC правило 1-2; дрейф палитр исключён |
| FLIP-измерения в рантайме | измерение DOM до/после | **не нужно**: кадры коллапса — чистые функции (geometry/frames) | детерминизм e2e; измерение = недетерминизм |

## Common Pitfalls

### Pitfall 1: Инициализация shadcn перезаписывает src/index.css
**What goes wrong:** `shadcn init` пишет дефолтный CSS-скаффолд (пресет base-nova, `@import "shadcn/tailwind.css"`) поверх существующего `@theme`.
**How to avoid:** init в режиме, не трогающем CSS (CLI спрашивает/флаги), либо немедленный откат CSS-части с сохранением только `components.json`; пресет не применяется (UI-SPEC: preset none). План: первый план фазы делает init на чистой ветке с проверкой `git diff src/index.css`.
**Warning signs:** дефолтные oklch-переменные в index.css.

### Pitfall 2: Коллизия `--color-primary` (мята vs CTA)
**What goes wrong:** мост «в лоб» (`@theme inline { --color-primary: var(--primary) }`) перезапишет мятную `--color-primary` проекта — сломаются hover CTA, focus-ring, все существующие `bg-primary`-использования.
**How to avoid:** механика из 1.4: коллизионные слоты не переопределяются, cva-варианты кита ссылаются на проектные утилиты (`bg-primary-container`/`hover:bg-primary` уже существуют).
**Warning signs:** e2e-скрин диф после первого kit-компонента; computed-стиль CTA ≠ #10b981.

### Pitfall 3: `cn`-импорты нового поколения реестра
**What goes wrong:** свежий `shadcn add` генерирует файлы с `import { cn } from "cn"` (пакет) или `lucide-react`-иконки — оба нарушают D-42/D-41.
**How to avoid:** `style: "new-york"` в components.json + вычитка генерации после первого add; правки импортов в вендорных файлах кита (D-44); вопрос о пакете `cn` — на пакетный апрув (Q1).
**Warning signs:** новые deps в package.json после add.

### Pitfall 4: tw-animate-css без reduced-motion-гейта библиотеки
**What goes wrong:** предположение «tw-animate-css сам уважает prefers-reduced-motion» — ложное (в доках/README отсутствует).
**How to avoid:** глобальный гейт проекта уже покрывает (1.3); ассерт `animation-name === none` прогоняется на kit-тултипе/коллапсибле.
**Warning signs:** мигающий тултип в e2e-скринах.

### Pitfall 5: Середина JS-анимации на скриншоте (если motion/gsap)
**What goes wrong:** `MotionConfig reducedMotion="user"` оставляет opacity/цвет-переходы — скриншот может снять 150-мс фейд в середине.
**How to avoid:** при выборе motion — per-point ассерты конечных состояний до скриншотов + `initial={false}` где возможно; при CSS-only — неприменимо (гейт строже).
**Warning signs:** недетерминированные скрин-диффы двойного прогона.

### Pitfall 6: Анимация transform зум-обёртки графа
**What goes wrong:** коллапс-анимация пишет transform на ту же ноду, где живёт зум (0.5–2.0) и `--diag-scale` — каналы конфликтуют.
**How to avoid:** анимировать transform только на внутренних SVG-группах рамки; зум-обёртка и lecture-scale не трогаются (5.4).
**Warning signs:** дрожание зума при двойном клике в .lecture.

### Pitfall 7: restMs-регрессия NumberHint при переезде на radix
**What goes wrong:** radix-тултип открывается по delay от входа, не от остановки указателя — «дождь тултипов» при проведении по графу.
**How to avoid:** критерий пилота 3.3.1; провал → floating остаётся в NumberHint (D-40).

## Code Examples

### Токен-мост (D-39) — фрагмент для src/index.css

```css
/* Source: механика — ui.shadcn.com/docs/theming (доступ 2026-11-19);
   карта слотов — 03-UI-SPEC «Токен-мост». Слоты БЕЗ коллизий: */
:root {
  --background: var(--color-background);
  --foreground: var(--color-on-surface);
  --card: var(--color-surface-container-low);
  --card-foreground: var(--color-on-surface);
  --popover: var(--color-surface-container-high);
  --popover-foreground: var(--color-on-surface);
  --muted: var(--color-surface-container-high);
  --muted-foreground: var(--color-on-surface-variant);
  --accent: var(--color-surface-container-high);
  --accent-foreground: var(--color-on-surface);
  --destructive: var(--color-error);
  --border: var(--color-outline-variant);
  --input: var(--color-outline-variant);
  --ring: var(--color-primary);
  --radius: 4px;
}
@theme inline {
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-destructive: var(--destructive);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) * 0.5);  /* 2 — карточка */
  --radius-md: var(--radius);              /* 4 — кнопка/инпут */
  --radius-lg: calc(var(--radius) * 2);    /* 8 */
  --radius-xl: calc(var(--radius) * 3);    /* 12 — потолок DESIGN §4 */
}
/* Коллизионные слоты (primary/secondary/accent) НЕ объявляются:
   kit-варианты используют проектные утилиты bg-primary-container и т.д. */
```

### Радикс-тултип с каноническим enter/exit (пилот D-40)

```tsx
// Source: radix-ui.com/primitives/docs/components/tooltip + tw-animate-css README
<Tooltip.Provider delayDuration={200}>
  <Tooltip.Root>
    <Tooltip.Trigger asChild>{anchor}</Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Content
        sideOffset={6}
        className="num-hint z-50 data-[state=delayed-open]:animate-in data-[state=closed]:animate-out fade-in zoom-in-95 duration-200"
      >
        {/* контент NumberHint без изменений: метка + значение + градиент */}
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
</Tooltip.Provider>
```

### CSS-only interrupt-restart (точка 1 — travel подсветки ленты)

```css
/* Оверлей ездит к активной пилюле; ретаргет transition = прерывание. */
.step-halo {
  position: absolute;
  transition: transform 250ms cubic-bezier(0, 0, 0.2, 1); /* конверт 150–400 мс */
  will-change: transform;                                   /* только transform/opacity */
}
/* reduced-motion/print — глобальные гейты index.css:841-854, без правок */
```

## Project Constraints (from CLAUDE.md / AGENTS.md)

| # | Директива | Следствие для фазы |
|---|---|---|
| 1 | Store-библиотеки не вводить без вопроса с обоснованием | неактуально (не планируется) |
| 2 | Новые npm-пакеты — только sanctioned-чекпойнт (владелец/версия/вес) | Домен 2 = пакетный апрув в плане 03-01; `pnpm dlx shadcn` не устанавливает пакеты сам — установка deps инициируется планом после апрува |
| 3 | Именование по глоссарию PROJECT.md | `kit` добавляется в глоссарий (D-43) |
| 4 | Пользовательские строки RU-first, изолированы | миграция с нулевой правкой копии (UI-SPEC Copywriting) |
| 5 | dangerouslySetInnerHTML запрещён; формулы drill-down — из чисел сценария | shadcn/radix innerHTML не используют; пилот это сохраняет |
| 6 | .oxlintrc.json / исключения / structure.test.ts не меняются без апрува | кит проходит R1/R2/R4 без правок гейта (D-44) |
| 7 | Гранулометрия D-34 (мягкая) | kit/ — документированная вендорная зона (D-44) |
| NFR-01/02/03 | < 100 мс/шаг; эталоны/инварианты; без серверов | анимации вне критического пути; `src/tensor/` не трогается; всё клиентское |
| Прогон forward-only / URL `#scenario=` | не трогается в фазе 3 (роутинг — фаза 4, D-37) | миграция не меняет URL-механику |

## Runtime State Inventory

Фаза = UI-миграция примитивов; переименований строк/ключей нет. Категории проверены: **Stored data** — нет (localStorage/URL ключи не меняются, `#scenario=` жив). **Live service config** — нет (NFR-03, сервисов нет). **OS-registered state** — нет. **Secrets/env vars** — нет. **Build artifacts** — `dist/` и e2e-скриншоты регенерируются штатно (baseline перегенерируется один раз по итогам миграции, UI-SPEC). Замен XSS-поверхностей не добавляется (Pitfall-контроль №5).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| Node.js | сборка/CLI | ✓ | v22.22.2 | — |
| pnpm | пакетный менеджер | ✓ | 11.24.0 | — |
| npm registry (сеть) | `pnpm dlx shadcn`, установки | ✓ (все `npm view` этой сессии успешны) | — | офлайн-зеркало не настроен |
| shadcn CLI | init/add | ✓ через dlx (не установлен локально — и не должен) | 4.23.0 latest | пиннинг `shadcn@4.23.0` в командах плана для воспроизводимости |

## Security Domain (ASVS L1, скан)

| ASVS Category | Applies | Standard Control |
|---|---|---|
| V2/V3 Auth/Session | no | без регистрации (NFR-03) |
| V4 Access Control | no | статик, серверной логики нет |
| V5 Input Validation | косвенно | пользовательский ввод в фазе не расширяется; кит не вводит форм |
| V6 Cryptography | no | — |
| XSS-поверхность | yes | dangerouslySetInnerHTML запрещён (постоянное правило №5); shadcn/radix рендерят через React без HTML-инъекций; тултип-контент — существующие RE-строки из чисел сценария |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | вес `@gsap/react` ~2–3 KB gz | Домен 2 | несущественен (gsap отклонён) |
| A2 | GSAP: нет глобального reduced-motion, `gsap.matchMedia()` вручную; `overwrite: 'auto'` для прерываний | 4.1/4.2 | не влияет на рекомендацию (CSS-only); проверить при возврате к gsap |
| A3 | канонический shadcn-файл тултипа содержит z-50 | 3.2 | проверка пилотом — одна строка класса |
| A4 | маржинальный вес radix-tabs при наличии tooltip ≈ +0.6 KB (дедуп internals) | Домен 2 | пересчитать в плане при добавлении |
| A5 | актуальный CLI генерирует компоненты либо new-york (lib/utils cn), либо base-nova (пакет cn) — состав импортов выясняется первым `shadcn add` | 1.5 | план закладывает вычитку генерации до массового add (Q1) |
| A6 | «fade+rise значений ≤200 мс» уже реализован классами значений | 4.3 | сверить планом; при отсутствии — добавить в точку 1 |

## Open Questions

1. **Поколение shadcn-реестра и пакет `cn`** (A5, Домен 1.5)
   - What we know: классический new-york = cva+clsx+tailwind-merge через локальный `cn`; новейший base-nova = пакеты `shadcn`+`cn`; D-42 зафиксировал первый состав.
   - What's unclear: что генерирует текущий CLI при `style: "new-york"` сегодня.
   - Recommendation: первый план фазы — init с `style:"new-york"` + один test-add; если генерация тянет пакет `cn` — решение владельца на пакетном апруве: правка импортов в ките (0 новых пакетов) или добавление `cn` (−2 пакета +1).
2. **Решение владельца по анимации (D-45)** — журнализируется по итогам этого ресёрча
   - What we know: рекомендация CSS-only; gsap лицензионно несвободен; motion MIT +45 KB gz.
   - What's unclear: принимает ли владелец CSS-only или предпочитает motion «про запас» (экраны фазы 4).
   - Recommendation: принять рекомендацию CSS-only; motion оставить санкционированной альтернативой при провале пилота коллапса; записать частичную супрессию D-23 новой строкой DECISIONS.md (формула — в «Рекомендации»).
3. **Порог провала CSS-пилота коллапса нейрона**
   - What we know: два детерминированных кадра; interrupt = transition-ретаргет.
   - What's unclear: достаточно ли стабильно интерполируются SVG-группы (transform-box: fill-box, x/y-атрибуты) в целевых браузерах.
   - Recommendation: план определяет критерии пилота (бит-идентичность конечных кадров, прерывание двойным кликом, скрин-двойной прогон); провал → motion по Q2.
4. **`delayDuration` radix-тултипа** (если пилот D-40 успешен по остальным пунктам)
   - What we know: нет restMs-аналога; 120 мс «от входа» — агрессивно для дождя якорей.
   - Recommendation: пилот прогоняет 120/200/300 мс, владелец выбирает по скринкею.
5. **Карта миграции `<details>` → Collapsible (LinkHistory)**
   - What we know: UI-SPEC требует пилот сохранения интеракции `<details>` (аналог D-40); tw-animate-css имеет готовые collapsible-down/up под `--radix-collapsible-content-height`.
   - What's unclear: воспроизводится ли семантика disclosure (testid link-history, поведение триггера) без изменения e2e-селекторов.
   - Recommendation: пилот в том же плане, что и D-40-пилот; провал → `<details>` остаётся нативным (замена отменяется, зависимость `-collapsible` не ставится).

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view`, api.npmjs.org/downloads) — версии/лицензии/мейнтейнеры/peers/postinstall всех строк Домена 2; доступ 2026-11-19
- bundlephobia.com/api/size — gz-веса всех пакетов; доступ 2026-11-19
- Эмпирический билд-зонд (вне репо): Vite 8.3.5 prod build, React 19.3.1, минимальные импорты — in-app дельты gz; 2026-11-19
- ui.shadcn.com/docs/installation/vite, /docs/components-json, /docs/theming, /docs/installation/manual — доступ 2026-11-19
- radix-ui.com/primitives/docs/components/tooltip — доступ 2026-11-19
- github.com/radix-ui/primitives — packages/react/tooltip/src/tooltip.tsx:274-296 (aria-describedby); доступ 2026-11-19
- gsap.com/standard-license — полный текст лицензии; доступ 2026-11-19
- motion.dev/docs/react-animation, /react-motion-config, /react-use-reduced-motion, /react-svg-animation — доступ 2026-11-19
- gsap.com/resources/React — useGSAP(); доступ 2026-11-19
- github.com/Wombosvideo/tw-animate-css — README; доступ 2026-11-19
- Репозиторий (чтение этой сессии): src/index.css (токены, гейты, .diag-flow, .num-hint), src/ui/numbers/NumberHint.tsx, e2e/smoke.spec.ts, package.json, DESIGN.md, REQUIREMENTS.md, ROADMAP.md, 03-CONTEXT.md, 03-UI-SPEC.md, DECISIONS.md (D-23/D-25/D-35/D-37), STATE.md

### Secondary (MEDIUM confidence)
- github.com/shadcn-ui/ui commit 205bfc6 (#6968) + shadcn-доки Tailwind v4 — tw-animate-css замена (websearch, подтверждено двумя независимыми источниками)
- Websearch-подтверждение миграционных гайдов Tailwind v4 ↔ shadcn (`@theme inline` паттерн)

### Tertiary (LOW confidence)
- A1–A6 из Assumptions Log

## Metadata

**Confidence breakdown:**
- Standard stack (кит + мост): HIGH — официальные доки shadcn по всем трём механизмам (Vite-установка, components.json-алиасы, @theme inline) + эмпирические веса
- Анимационное сравнение: HIGH по фактам (лицензии/веса/доки), MEDIUM по CSS-пилоту коллапса (A-пункт: SVG-интерполяция проверяется пилотом)
- Radix-покрытие NumberHint: HIGH по 10/12 пунктам док-эвиденции; touch + restMs — MEDIUM (закрывается пилотом, критерии готовы)

**Research date:** 2026-11-19
**Valid until:** 2026-12-19 (реестр shadcn двигается быстро — style/`cn`-ситуацию перепроверить первым планом фазы; npm-версии стабильны)
