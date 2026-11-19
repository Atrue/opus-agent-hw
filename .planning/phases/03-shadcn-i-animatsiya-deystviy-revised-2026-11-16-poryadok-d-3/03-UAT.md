---
status: complete
phase: 03-shadcn-i-animatsiya-deystviy-revised-2026-11-16-poryadok-d-3
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md, 03-05-SUMMARY.md]
started: 2026-11-19T17:52:19.000Z
updated: 2026-11-19T17:55:56.826Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Холодный старт приложения с нуля: останови dev-сервер, очисти кэш Vite (node_modules/.vite), `pnpm dev`, открой главную страницу — старт без ошибок, walkthrough с живыми данными (граф, лента шагов, значения). Серверной части нет (NFR-03).
result: pass

### 2. План 03-01 «Трейсер кита» — подтверждение авто-покрытия (ROADMAP-3.1)
expected: Все 4 поставки плана 03-01 закрыты автоматикой (подтверди): (1) UI-кит src/ui/kit/ с Button (CTA/quiet/toggle, icon-sm), локальный cn, баррел, README вендорной зоны — token-bridge.test + 17 e2e ×2 бит-идентично + гейты KIT-INIT/KIT-CLEAN/TENSOR-UNTOUCHED; (2) токен-мост D-39 в src/index.css (:root-алиасы + @theme inline, tw-animate-css) с сохранением проектных токенов — 4 юнит-контракта; (3) StepControls на kit Button без изменений testid/RU-строк/клавиатуры — 17 e2e без правок селекторов; (4) dependencies ровно по апруву владельца (6 пакетов, точные версии, без cn/radix-ui/lucide) — KIT-CLEAN гейт.
result: pass

### 3. Стилистика «приборной» темы сохранена при миграции на кит — план 03-02, D-49 (ROADMAP-3.1)
expected: Визуальное суждение владельца: после миграции всех потребителей (.btn/.card/.kbd → kit Button/Card/Kbd) приборная стилистика DESIGN.md сохранена (D-49 — без попиксельного гейта). Пары скринов до/после в .planning/ui-reviews/03-02-before|after/. Rationale: сохранение стилистики — визуальное суждение (D-49 явно исключает попиксельный гейт); при исполнении владелец ответил approved.
result: pass

### 4. План 03-03 «Пилоты D-40» — подтверждение авто-покрытия (ROADMAP-3.1/3.3)
expected: Все 4 поставки плана 03-03 закрыты автоматикой (подтверди): (1) kit Tooltip + Collapsible на утверждённых radix-пакетах (без cn/монопакета/иконок) — git diff package.json + NO-LUCIDE; (2) NumberHint на kit Tooltip: контракт машинно сохранён (портал/z-50/края/дождь/touch/Esc/aria) — e2e тесты 1 и 18; (3) LinkHistory на kit Collapsible: нативный open-контракт <details> + интеракция disclosure — e2e тесты 12 и 18 без правок; (4) вердикт D-40 исполнен: @floating-ui/react удалён при delayDuration 200 — pnpm remove + rg-аудит + 18 e2e ×2.
result: pass

### 5. План 03-04 «Движок D-50 + коллапс» — подтверждение авто-покрытия (ROADMAP-3.2/3.3)
expected: Все 3 поставки плана 03-04 закрыты автоматикой (подтверди): (1) решение по движку журнализировано (D-50 в DECISIONS.md, GSAP/Spline с обоснованиями) — D50-JOURNALED; (2) motion@14.14.0 по отдельному пакетному апруву (точная версия, MIT, без postinstall) — git diff package.json; (3) точка 2 D-47: коллапс/раскрытие рамки-нейрона плавные 250 мс ease-in-out, прерываемые, конечные кадры бит-идентичны, NFR-01 не затронут — e2e 17 без правок + e2e 19 (interrupt, station-value) + GEOMETRY/ZOOM-LAYER-UNTOUCHED.
result: pass

### 6. Градус моушна D-48 по всем точкам — план 03-05 (ROADMAP-3.3)
expected: Визуальное суждение владельца: градус моушна D-48 выдержан по всем точкам фазы (1–3 + зум + «Примеры» + якорное кольцо обводки): travel-гало ленты/строки/кольца единым ритмом 250 мс, волна backprop с каскадом ~60 мс/ребро, плавный зум канвы, fade+rise значений. Rationale: субъективное визуальное суждение (D-48); при исполнении владелец ответил approved после четырёх живых итераций (зум/Примеры/обводка-кольцо).
result: pass

### 7. [03-01] UI-кит src/ui/kit/ с Button (CTA/quiet/toggle, icon-sm), локальным cn, баррелом и README вендорной зоны
expected: Поставка 03-01 D1 закрыта автоматикой.
result: pass
source: automated
coverage_id: 03-01/D1

### 8. [03-01] Токен-мост D-39 в src/index.css (:root-алиасы + @theme inline + @import tw-animate-css) с сохранением проектных токенов DESIGN.md
expected: Поставка 03-01 D2 закрыта автоматикой (token-bridge.test: алиас-цепочки, запрет коллизионных реэкспортов, шкала радиусов).
result: pass
source: automated
coverage_id: 03-01/D2

### 9. [03-01] StepControls мигрирован на kit Button с сохранением testid/RU-строк/ui-label/клавиатурного контракта (D-38)
expected: Поставка 03-01 D3 закрыта автоматикой (17 e2e без правок селекторов, ×2 бит-идентично).
result: pass
source: automated
coverage_id: 03-01/D3

### 10. [03-01] Состав dependencies точно соответствует апруву владельца (approve-exact-list: 6 пакетов, точные версии, без cn/radix-ui/lucide)
expected: Поставка 03-01 D4 закрыта автоматикой (KIT-CLEAN: git diff package.json = только 6 строк апрува).
result: pass
source: automated
coverage_id: 03-01/D4

### 11. [03-02] kit Card + Kbd (контракты .card/.kbd DESIGN.md), без новых зависимостей и люциде-иконок
expected: Поставка 03-02 D1 закрыта автоматикой (CARD-KBD-ADDED + NO-LUCIDE + git diff package.json пуст).
result: pass
source: automated
coverage_id: 03-02/D1

### 12. [03-02] Все потребители .btn/.card/.kbd мигрированы на кит; мёртвый CSS удалён; контракты экрана не изменились
expected: Поставка 03-02 D2 закрыта автоматикой (17 e2e ×2 бит-идентично; CONSUMERS-MIGRATED/DEAD-CSS-GONE/GATES-UNTOUCHED; 144 юнит + lint 0 + build ok).
result: pass
source: automated
coverage_id: 03-02/D2

### 13. [03-03] kit Tooltip + Collapsible на утверждённых radix-пакетах (без cn/монопакета/иконок)
expected: Поставка 03-03 D1 закрыта автоматикой (git diff package.json — только удаление @floating-ui/react по вердикту; NO-LUCIDE).
result: pass
source: automated
coverage_id: 03-03/D1

### 14. [03-03] NumberHint на kit Tooltip: контракт сохранён машинно (портал/z-50/края/дождь/touch/Esc/aria) — пилот D-40 зелёный
expected: Поставка 03-03 D2 закрыта автоматикой (e2e тест 1 + тест 18: дождь/края/touch/animation-name===none).
result: pass
source: automated
coverage_id: 03-03/D2

### 15. [03-03] LinkHistory на kit Collapsible: нативный open-контракт + интеракция disclosure сохранены
expected: Поставка 03-03 D3 закрыта автоматикой (e2e тест 12 без правок + тест 18: open-зеркало, collapsible animation-name===none).
result: pass
source: automated
coverage_id: 03-03/D3

### 16. [03-03] Вердикт D-40 исполнен: @floating-ui/react удалён из dependencies при delayDuration 200
expected: Поставка 03-03 D4 закрыта автоматикой (pnpm remove; rg-аудит src/ — импортов floating нет; 18 e2e ×2 бит-идентично).
result: pass
source: automated
coverage_id: 03-03/D4

### 17. [03-04] Решение по анимационному движку журнализировано (D-50, частичная супрессия D-23; GSAP/Spline — с обоснованиями)
expected: Поставка 03-04 D1 закрыта автоматикой (rg 'D-50' DECISIONS.md — D50-JOURNALED gate).
result: pass
source: automated
coverage_id: 03-04/D1

### 18. [03-04] motion@14.14.0 установлен по отдельному пакетному апруву владельца
expected: Поставка 03-04 D2 закрыта автоматикой (git diff package.json = +motion 14.14.0, точная версия; легитимность сверена на реестре).
result: pass
source: automated
coverage_id: 03-04/D2

### 19. [03-04] Точка 2 D-47: коллапс/раскрытие плавные (250 мс ease-in-out), прерываемые; конечные кадры бит-идентичны; NFR-01 не затронут
expected: Поставка 03-04 D3 закрыта автоматикой (e2e 17 без правок + e2e 19: interrupt, конечные состояния, живые station-value; GEOMETRY/ZOOM-LAYER-UNTOUCHED).
result: pass
source: automated
coverage_id: 03-04/D3

### 20. [03-05] Точка 1: travel-гало ленты (позиция = f(структуры), ретаргет), конверт графа 250 мс ease-out, значения fade+rise 200 мс
expected: Поставка 03-05 D1 закрыта автоматикой (e2e тест 20: гало = активная пилюля x/width, переезды; 17 прежних без правок).
result: pass
source: automated
coverage_id: 03-05/D1

### 21. [03-05] Точка 3: волна backprop с delay-каскадом (индексы из структуры, семантика data-flow/цвет сохранена)
expected: Поставка 03-05 D2 закрыта автоматикой (e2e тест 20: --flow-i 0..k-1; animation-name === none под reduce).
result: pass
source: automated
coverage_id: 03-05/D2

### 22. [03-05] Гейты финализированы: print-список покрывает все новые анимации фазы; reduced-motion блок не менялся; NFR-01 не затронут
expected: Поставка 03-05 D3 закрыта автоматикой (rg print-блок index.css: tooltip/collapsible/step-halo/value-changed/zoom/samples/g-step-halo; 20 e2e ×2 бит-идентично).
result: pass
source: automated
coverage_id: 03-05/D3

## Summary

total: 22
passed: 22
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
