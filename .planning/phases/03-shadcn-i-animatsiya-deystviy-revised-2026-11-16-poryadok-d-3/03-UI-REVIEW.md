# Phase 3 — UI Review

**Audited:** 2026-11-19
**Baseline:** 03-UI-SPEC.md (status: approved, gsd-ui-checker 2026-11-19) + DESIGN.md (D-25/D-48/D-50) + глоссарий PROJECT.md
**Screenshots:** NOT captured — dev-сервер жив на localhost:5173, но сессия ограничена оркестратором code-only аудитом (браузерная автоматизация недоступна); использованы существующие capture-пары `.planning/ui-reviews/03-02-before|after/` (анализ пикселей программный, без браузера)
**Interaction captures:** off (workflow.ui_interaction_capture = false)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | Нулевое изменение копии (D-38) подтверждено: все контрактные строки на месте, generic-лейблов нет |
| 2. Visuals | 4/4 | Единственная заливка экрана — CTA; все icon-only контролы с aria-label; иерархия h2/headline-sm жива; гало-оверлеи aria-hidden |
| 3. Color | 3/4 | Токен-мост D-39 точен, но kit Tooltip хранит канонические shadcn `bg-foreground`/`text-xs` вне моста — сырой потребитель фазы 4 получит светлый тултип мимо «приборной» темы |
| 4. Typography | 4/4 | Роли через CSS-классы; CardTitle привязан к `--ui-size` (лекционный масштаб жив); kbd 11px — заявленный exception |
| 5. Spacing | 3/4 | Мёртвое семейство `.samples-list/.sample-row/.sample-io/.sample-out` (div-лист 01.2-02) пережило зачистку мёртвого CSS; `.sample-row{display:flex}` коллидирует с `<tr class="sample-row">` |
| 6. Experience Design | 3/4 | Состояния/гейты/детерминизм образцовые; print-гейт не гасит transition на `.graph-canvas` — носителе zoom-масштаба (заглушен только `.graph-zoom-layer`) |

**Overall: 21/24**

---

## Top 3 Priority Fixes

1. **Коллизия `.sample-row` (display:flex) на `<tr>` таблицы «Примеры» + мёртвое семейство `.samples-*`** — риск развала колоночной раскладки таблицы (flex на tr выводит строку из table-layout по CSS-фиксапу) и мусор в index.css — удалить мёртвые правила `.samples-list`/`.sample-io`/`.sample-out` и базовый `.sample-row` (проверив живьём выравнивание колонок), оставив `.sample-row-current` как e2e-контракт-маркер.
2. **Канонические shadcn-стили kit Tooltip вне токен-моста** — первый же «сырой» потребитель фазы 4 отрендерит светлый тултип `bg-foreground`+`text-xs` мимо тёмной темы — заменить в базовом классе `TooltipContent` на `bg-popover text-popover-foreground` (слот моста = surface-container-high) и снять `text-xs`; переопределения NumberHint (`.num-hint`) не зависят от этого.
3. **Print-гейт не покрывает `.graph-canvas`** — печать в середине 250-мс zoom-перехода может поймать промежуточный масштаб (переход transform живёт на svg, а не на обёртке) — добавить `.graph-canvas` в @media print-список `transition: none` рядом с `.graph-zoom-layer`.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

Аудит против Copywriting Contract UI-SPEC («нулевое изменение копии», D-38):

- **Все контрактные строки на месте, дословно:** «Шаг» / «Следующая эпоха» (src/ui/stepper/StepControls.tsx:70,80), «Сброс» / «Запустить эпоху» (:49,59), «Лекционный режим» (src/ui/app/App.tsx:93), hotkeys «шаг»/«к шагу» с Kbd Space/Esc (App.tsx:188–190).
- **Empty-стейты по контракту:** «н/д» до вычисления (ResultPanel.tsx:70,75; ComputationGraph.tsx:355,397,450; aria-метки :75,466), «ŷ и L появятся по ходу прохода» (ResultPanel.tsx:40), «История появится после первого сэмпла» (LinkHistory.tsx:191), плейсхолдер «·» в ŷ (ExamplesPanel.tsx:108).
- **Error-стейты по контракту:** вердикты «✓ Верно» / «Не сошлось» (ResultPanel.tsx:40) + aria-label «верно»/«не сошлось» на ✓/✗ (ExamplesPanel.tsx:115) — знак не только цветом.
- **Generic-паттерны отсутствуют:** grep по `Submit|Click Here|OK|Cancel|Save|Loading|Error occurred|went wrong|try again` по src/**/*.tsx — 0 совпадений.
- **Новых пользовательских строк фаза не ввела:** все новые визуальные элементы (гало `.step-halo`, `.samples-row-halo`, кольцо `.g-step-halo`) — `aria-hidden="true"` декоративные оверлеи (StepperBand.tsx:86, ExamplesPanel.tsx:68, ComputationGraph.tsx:483). RU-first соблюдён, строки изолированы в компонентах.
- 20 e2e-проверок (17 исходных + 18/19/20 расширения) без правок RU-строк — машинное подтверждение D-38 (SUMMARY 03-01..03-05, гейты ×2 бит-идентичны).

### Pillar 2: Visuals (4/4)

- **Фокальная точка:** единственная заливка экрана — CTA «Шаг»/«Следующая эпоха» (`bg-primary-container #10b981` → hover мята, button.tsx:27–28) — контракт «единственная заливка» соблюдён конструкцией вариантов кита; всё остальное — контурные quiet-кнопки.
- **Icon-only контролы подписаны (4/4):** зум ×3 — aria-label «Уменьшить/Сбросить/Увеличить масштаб» (ComputationGraph.tsx:217–223); крестик звена — aria-label «Снять выбор звена» (LinkPanel.tsx:63).
- **Иерархия:** CardTitle = h2 `headline-sm` Space Grotesk (card.tsx:40–51, семантика заголовков сохранена при миграции — решение 03-02); фазный бейдж; результат ŷ/y/L ×1.25 моно; лекционный режим масштабирует только переменные.
- **Машинные контракты экрана живы:** testid (`step-band`, `diagram-slot`, `samples-panel`, `link-history`, `frame-block`, `station-value`…), aria (`aria-pressed` toggle, `aria-expanded` заголовка рамки, `aria-current` пилюль/строк, `role="list"` ленты) — всё на месте; e2e ×2 бит-идентичен.
- Примечание (не дефект, D-38): глифы зума −/+/%% — текстовые, как до фазы.

### Pillar 3: Color (3/4)

- **Токен-мост D-39 исполнен точно:** :root-алиасы без hex-дублей (index.css:107–124: `--popover → --color-surface-container-high`, `--ring → --color-primary` и т.д. по слот-карте UI-SPEC), `@theme inline`-реэкспорт (:125–139), коллизионные слоты primary/secondary/accent НЕ реэкспортированы — проектная мята `--color-primary #4edea3` и циан живы; юнит-контракты моста зелёные (token-bridge.test.ts, 144/144 подтверждено прогоном).
- **Акцентная дисциплина:** в TSX всего 5 утилит-употреблений primary (button.tsx: CTA hover, toggle-pressed border/text) — закрытый список «Accent reserved for» не нарушен; 60-30-10 сохранён (поверхности/текст/акценты из @theme, index.css:37–73).
- **Hardcoded-цветов в TSX нет** (grep `#[0-9a-fA-F]{6}|rgb(` — 0); Okabe-Ito роли знака числа остаются прямыми токенами вне моста, знак дублируется минусом U+2212.
- ⚠ **WARNING — kit Tooltip вне моста:** `TooltipContent` (kit/tooltip.tsx:54) хранит канонические shadcn `bg-foreground text-background` + `text-xs`: это светло-серая плашка с тёмным текстом — инверсия «приборной» темы. Сегодня единственный потребитель NumberHint перекрывает всё unlayered-классом `.num-hint` (index.css:934–947: surface-container-high, z-50) — экран корректен, но платформенная цель фазы (готовая база для фазы 4, мотив D-37) допускает первое же «сырое» использование `kit/Tooltip` мимо темы. Мост предоставляет слот `--popover` именно для этого — он не потребляется базовым классом.

### Pillar 4: Typography (4/4)

- **Роли через CSS-классы, кит наследует:** `.num`/`.ui-text`/`.ui-label`/`.app-heading` (index.css:165–187) — единственные носители кеглей; kit-компоненты не вводят собственных размеров, кроме привязок к переменным.
- **CardTitle = `text-[calc(var(--ui-size)+2px)]` font-display semibold** (card.tsx:45) — заголовок карточек живёт на лекционной переменной (масштабируется в .lecture) — лучше канона §3 (там же §18px ориентир).
- **Kbd 11px mono** (kbd.tsx:18) — сохраняемый exception UI-SPEC Typography (`src/index.css:534` прерыдущей эпохи), задокументирован в шапке вендор-файла.
- **Числа всегда weight 400** (`.num` font-weight 400; result-value 400; kbd font-normal) — «акцент цветом, не весом» соблюдён; weights в TSX: только `font-normal`/`font-semibold` (+ role-класс `ui-label` 600) — в пределах нормы «≤2 весов + роли».
- Кегли кита замкнуты на переменные/exception'ы: `text-xs`/`text-sm` в канонических базах Tooltip/CardDescription перекрываются unlayered-контентом потребителей (у CardDescription потребителей нет — баррел-запас кита, легально по D-44).

### Pillar 5: Spacing (3/4)

- **Шкала 8/4 соблюдена китом:** Card `p-4`/`gap-2`/radius 2 (`rounded-sm` = `--radius-sm` 2px моста), Button `min-h-10 px-3 py-2`/radius 4 (`rounded-md`), статус-бар h-12 (48px) — всё по таблице Spacing Scale.
- **Locked-исключения D-38 воспроизведены и задокументированы:** зум `min-w-[34px] px-2 py-[2px]` (button.tsx:41), kbd `text-[11px] py-[2px]` (kbd.tsx:18), tooltip `sideOffset 6` (NumberHint.tsx:40 — сохранён как инвариант нулевой смены, округление к 4/8 из спека не потребовалось), статус-бар 48.
- **Произвольные значения вне кита:** только `min-h-[320px]`/`min-h-[220px]` (App.tsx:117,139, ExamplesPanel.tsx:59) — прерыдущие минимумы карточек, кратны 4.
- ⚠ **WARNING — мёртвое семейство + коллизия в «Примерах»:** правила div-листинга 01.2-02 `.samples-list`/`.sample-row`/`.sample-io`/`.sample-out` (index.css:564–589) не имеют потребителей (grep: 0 использований `.samples-list/.sample-io/.sample-out`), но `.sample-row { display:flex; gap:12px; … }` (:569) математически совпадает с `<tr className="sample-row">` (ExamplesPanel.tsx:99). `display:flex` на tr выводит строку из колоночной раскладки таблицы (CSS anonymous-table fixup) — риск рассинхрона колонок тела с thead; риск прерыдущий (введён 01.2-07, коммит 19e96b8 — до фазы 3), но зачистка мёртвого CSS 03-02 (карта `.btn/.card/.kbd`) его не накрыла, а e2e-тест 15 проверяет только текст, не геометрию колонок. Живая проверка рендера в этой сессии недоступна (code-only) — требуется 30-секундный live-look; независимо от исхода, мёртвые правила подлежат удалению.

### Pillar 6: Experience Design (3/4)

Покрытие состояний против UI Considerations UI-SPEC (15 covered / 1 backstop):

- **hover/focus:** рецепты §5 в ките (`transition-colors duration-150 ease-out`, button.tsx:21); глобальный `:focus-visible` mint 2px сохранён (index.css:244–247) + SVG-фокус рёбер/узлов (:639–664).
- **disabled:** `disabled:opacity-60 disabled:cursor-not-allowed` (button.tsx:21); зум на границах 0.5–2.0 (ComputationGraph.tsx:217,223); «Шаг» никогда не disabled (StepControls — disabled-пропа нет, контракт 01.1).
- **loading/error:** по контракту N/A (синхронные вычисления, NFR-01; спиннеры запрещены §10); единственный «ошибочный» UI — дидактический вердикт «Не сошлось» — на месте.
- **empty:** «н/д»/«История появится…» — см. Pillar 1.
- **rapid-interact:** все анимации прерываемы ретаргетом — CSS-transition (гало ленты/строки/кольца), motion-ретаргет коллапса; e2e 19 (тройной dblclick) зелёный.
- **touch:** тап → drill, не тултип — e2e 18(г) машинно.
- **Гейты (D-48):** глобальный reduced-motion `animation/transition: none !important` (index.css:871–878) + e2e-ассерт `animation-name === 'none'` (тест 1, 18а, 20); JS-слой — `MotionConfig reducedMotion="user"` (App.tsx:72); .lecture анимации смысла не выключает. Print-гейт финализирован списком (index.css:879–906): enter/exit кита, гало ленты/строки, fade+rise, зум-слой, каскад, пульс, пиннинг `.g-frame-block`.
- ⚠ **WARNING — print-гейт пропускает `.graph-canvas`:** переход zoom-масштаба живёт на самом svg (`.graph-canvas { transition: transform 250ms … }`, index.css:974–981; инлайн `transform: scale()` — ComputationGraph.tsx:237), а print-список гасит только `.graph-zoom-layer` (:897 — габариты). Печать в середине 250-мс перехода поймает промежуточный масштаб — против строки контракта «печать всегда ловит конечное состояние». Окно узкое (250 мс), дефект косметический.
- Примечание (принято контрактом): JS-анимации под print гасятся не CSS, а конечностью (250 мс, детерминированные кадры) — задокументировано в комментарии гейта (:866–869).

---

## Registry Safety

`components.json` существует; UI-SPEC Registry Safety заявляет **только официальный реестр shadcn** (button, card, tooltip, kbd, collapsible), сторонних реестров нет (строка «Сторонние реестры | none»). Аудит сторонних блоков не требуется; профилактический grep вендор-зоны `src/ui/kit/` на `fetch(|XMLHttpRequest|sendBeacon|process.env|eval(|new Function|import(http` — **0 совпадений**.

Registry audit: 0 third-party blocks checked, no flags.

---

## Files Audited

**Кит (вендорная зона):** src/ui/kit/{button,card,kbd,tooltip,collapsible}.tsx, index.ts, utils.ts, README.md, token-bridge.test.ts
**Потребители:** src/ui/app/App.tsx, src/ui/stepper/{StepControls,StepperBand}.tsx, src/ui/graph/ComputationGraph.tsx, src/ui/dataset/{ExamplesPanel,ResultPanel}.tsx, src/ui/operation/OperationPanel.tsx, src/ui/epoch/EpochSummary.tsx, src/ui/numbers/{NumberHint,NumberDrilldown}.tsx, src/ui/chain/{LinkPanel,LinkHistory}.tsx
**Стили/гейты:** src/index.css (полностью, 1161 строка), components.json, package.json
**Контракты:** e2e/smoke.spec.ts (тесты 1, 15, 17–20), DESIGN.md §8, 03-UI-SPEC.md, 03-CONTEXT.md, 03-01..03-05 PLAN/SUMMARY
**Верификация:** `pnpm test` — 144/144 passed (прогон аудита); пиксельный анализ capture-пар `.planning/ui-reviews/03-02-before|after/` (программный, без браузера)
