---
phase: "03"
slug: 03-shadcn-i-animatsiya-deystviy-revised-2026-11-16-poryadok-d-3
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-19"
---

# Phase 03 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| npm registry → package.json | runtime-зависимости кита/motion пересекают границу внешнего реестра (supply chain; sanctioned-чекпойнт AGENTS.md №2) | метаданные пакетов, исходники депов |
| shadcn CLI → рабочее дерево | внешний dev-инструмент пишет исходники в src/ui/kit/ и (риск) CSS в src/index.css | генерации компонентов |
| tw-animate-css → CSS-бандл | сторонний CSS импортируется в src/index.css | CSS-утилиты анимаций |
| kit-примитивы → контракт экрана | смена носителя кнопок/карточек/тултипов не должна менять наблюдаемый DOM-контракт (testid/aria/RU-строки) | DOM-контракт |
| Radix Portal → document.body | тултип-контент покидает SVG-канву в body-портал (z-слой поверх графа) | текст подсказки |
| touch-указатель → интеракция drill | тап не должен открывать тултип вместо drill (LOCKED R5 §2c к3) | события указателя |
| CSS/JS-анимации → e2e-детерминизм | новые анимации обязаны гаситься reduced-motion/print-гейтами; позиция оверлеев — функция структуры | computed-стили, скриншоты |
| анимация → критический путь шага | презентационный слой не должен входить в NFR-01 (< 100 мс) | кадры рендера |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-3-01 | Tampering | npm-установка ядра+radix (package.json/pnpm-lock.yaml) | high | mitigate | Sanctioned-таблица дословно + blocking-human checkpoint (Task 1); точные версии без caret; postinstall — none (проверено); сверка npmjs.com owner/org | closed |
| T-3-02 | Tampering | shadcn CLI: перезапись src/index.css скаффолдом и записи вне кита | medium | mitigate | components.json руками (пресет none, init не запускался); git diff src/index.css после каждого CLI-шага; aliases замкнуты в src/ui/kit | closed |
| T-3-03 | Tampering | генерация реестра тянет непрошенные deps (cn, монопакет radix-ui, Lucide) | medium | mitigate | Q1-вычитка после каждого add; отклонение = правка вендорного файла (D-44), НЕ установка; KIT-CLEAN rg-гейт | closed |
| T-3-04 | Tampering | tw-animate-css в CSS-бандле (сторонний CSS-слой) | low | mitigate | запиннена 1.4.0; чистые CSS-утилиты без executed-кода; глобальные reduced-motion/print-гейты гасят как родные | closed |
| T-3-05 | Tampering | визуальный контракт экрана при cva-адаптации (Card/Kbd/Button) | medium | mitigate | карта миграции UI-SPEC; скрин-диф до/после + blocking скрин-ревью владельца (approved, D-49); e2e ×2 бит-идентичность; CONSUMERS-MIGRATED | closed |
| T-3-06 | Tampering | add card/kbd тянет непрошенные deps/иконки | medium | mitigate | git diff package.json пуст после add (CARD-KBD-ADDED); NO-LUCIDE-гейт | closed |
| T-3-07 | Tampering | touch: тап открывает тултип вместо drill | medium | mitigate | e2e тест 18: тап → drill-panel, number-hint отсутствует (LOCKED R5 §2c к3) | closed |
| T-3-08 | DoS | «дождь тултипов» при проведении по графу | medium | mitigate | e2e тест 18: 3 узла подряд → 0 открытых number-hint; delayDuration 200 + disableHoverableContent (вердикт D-40) | closed |
| T-3-09 | Tampering | удаление @floating-ui/react ломает NumberHint | low | mitigate | порядок «пилот → вердикт → удаление»; rg-аудит: импортов floating в src/ нет (только док-проза об откате); 18 e2e ×2 | closed |
| T-3-10 | Tampering | конфликт transform: анимация на ноде зум-обёртки и --diag-scale (Pitfall 6) | medium | mitigate | анимируются только внутренние SVG-группы рамки; зум-анимация — отдельный узел .graph-zoom-layer (живая проверка владельцем); ZOOM-LAYER-UNTOUCHED | closed |
| T-3-11 | DoS | e2e-недетерминизм от JS-анимаций motion (Pitfall 5) | high | mitigate | MotionConfig reducedMotion="user" на корне App; per-point ассерты конечных состояний (e2e 19); двойной прогон бит-идентичен — обязательный гейт (20 e2e ×2) | closed |
| T-3-12 | Tampering | print-гейт пропускает анимацию коллапса | low | mitigate | print-селектор-список расширен (.g-frame-block пиннится opacity:1); финализация — 03-05 | closed |
| T-3-13 | Tampering | позиция travel-гало недетерминирована (race эффекта) | medium | mitigate | позиция = offsetLeft/offsetTop через bandRef + useLayoutEffect (функция структуры); под reducedMotion — мгновенно; e2e тест 20 (гало = активная пилюля x/width); ×2 бит-идентично | closed |
| T-3-14 | Tampering | print-гейт пропускает одну из новых анимаций фазы | low | mitigate | print-список финализирован и rg-проверен: enter/exit кита, step-halo, value-changed, zoom, samples-row-halo, g-step-halo, каскад | closed |
| T-3-SC | Tampering | npm/pnpm installs за пределами апрува | high | mitigate | approve-exact-list (6 пакетов) + отдельный апрув motion@14.14.0; package-legitimacy gate; L1-аудит 2026-11-19: dependencies = ровно утверждённые точные версии, cn/radix-ui/lucide отсутствуют, postinstall-скриптов нет | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|

*Accepted risks do not resurface in future audit runs.*

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-19 | 15 | 15 | 0 | gsd verify-work (inline secure-phase, ASVS L1) |

L1-верификация (grep-depth) 2026-11-19: package.json = точные версии апрува (cva 0.7.1, clsx 2.1.1, tailwind-merge 3.7.0, tw-animate-css 1.4.0, @radix-ui/react-tooltip 1.4.1, @radix-ui/react-collapsible 1.2.1, motion 14.14.0), cn/radix-ui/lucide отсутствуют, postinstall — none; MotionConfig reducedMotion="user" (App.tsx:72); prefers-reduced-motion ×3 и print-гейт (.step-halo/.samples-row-halo/.g-step-halo/.value-changed/.graph-zoom-layer) в src/index.css; импортов floating-ui в src/ нет.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-19
