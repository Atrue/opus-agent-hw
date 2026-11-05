# Quick: Редизайн UI под DESIGN.md (D-25)

- **Дата**: 2026-11-05
- **Воркфлоу**: /gsd-quick (режим plan → build, одобрено владельцем)
- **Статус**: complete — `pnpm test` 61/61, `pnpm lint` 0, `pnpm e2e` 6/6

## Задача

Привести UI в соответствие новой дизайн-системе DESIGN.md (коммит 455b53f):
полный редизайн — палитра, шрифты, компоненты, layout (решение владельца).

## Решения (зафиксированы как D-25 в DECISIONS.md)

- Токен-контракт = DESIGN.md + `src/index.css @theme`; 01-DESIGN-TOKENS.md — superseded
- Шрифты: +@fontsource-variable/space-grotesk, +@fontsource-variable/geist,
  +@fontsource/material-symbols-outlined (fontsource, OFL-1.1, checkpoint пройден);
  −@fontsource-variable/inter; SG без кириллицы → стек SG→Geist
- Знак числа: цвет (Okabe-Ito) + минус U+2212; AA-варианты на тёмном
  #FF8A50/#00C489; роль оформлена в DESIGN.md §2.1, контрасты — §2.2
- Лента шагов: индикатор (13 пилюль done/active-pulse/future, 2→4→8 колонок),
  НЕ навигация — forward-only (AGENTS.md/D-21 против DESIGN.md §7)
- Каркас: шапка 56px + лента шагов + main 12-col (xl 4/5/3; md 2; mobile 1) +
  статус-бар 48px (контролы, LOSS/LR, индикатор, hotkeys, backdrop-blur)
- sampleOpValues в TrainingRun: значения пилюль пишутся в обоих режимах
  (record строится всегда, публикуется только в пошаговом — R1 сохранён)

## Изменённые файлы

`src/index.css` (полная перезапись), `index.html`, `src/run/runState.ts`,
`src/ui/App.tsx`, `src/ui/StepperBand.tsx` (новый), `OperationPanel`,
`NumberDrilldown`, `EpochSummary`, `LossChart`, `WeightsTable`, `NumberHint`,
`NarrativeLine`, `ArchitectureDiagram`; доки: DESIGN.md §2.1–2.2/§3/§7,
DECISIONS.md D-25, 01-DESIGN-TOKENS.md (superseded), artifacts/ (6 скринов
«было/стало»), STATE.md.

## Верификация

- Юниты 61/61, линт 0, e2e 6/6 (скрин-baseline 28 регенерирован)
- Computed-style проверка темы (Playwright): dark class, bg #0f131c, шрифты
  загружены (SG/Geist/JBM/MSO), 13 пилюль со сменой состояний, кейсинг/флоу
  амбер/мята, кнопки/карточки/статус-бар по спецификации, reduced-motion гасит
  анимации
- Контрасты: DESIGN.md §2.2 (все текстовые пары AA+, большинство AAA)
