# src/ui/kit — UI-кит на shadcn (вендорная зона)

Компонентная база проекта (D-43): генерации `shadcn` CLI, кладущиеся сюда
по `components.json` (`aliases.ui: "@/ui/kit"`). Публичный вход — баррел
`index.ts`; домены импортируют `'../kit'`, алиас `@/` — только внутри кита
(генерации CLI).

## Правила зоны (D-44, D-41, D-34)

- **Вендорная зона гранулометрии**: канонические shadcn-файлы с мультиэкспортом
  (`Button` + `buttonVariants`, cva) легальны ТОЛЬКО внутри `kit/`. Домены
  вне кита сохраняют D-34 — одна сущность на файл, именованные экспорты
  (гейт R1 `src/structure.test.ts` действует на кит тоже: дефолт-экспорты
  запрещены).
- **Иконки** — только Material Symbols (`@fontsource/material-symbols-outlined`,
  D-41): люциде-иконки из генераций вычищаются, их пакет не ставится.
- **Пакеты**: ядро `cva`/`clsx`/`tailwind-merge`/`tw-animate-css` + radix
  per-component — утверждены пакетным апрувом 03-01 (AGENTS.md №2, D-42).
  Пакеты `cn` и монопакет `radix-ui` НЕ ставятся (Q1-политика «а»): генерации,
  импортирующие их, правятся на локальный `@/ui/kit/utils` (cn) / чистятся от
  Slot-asChild (потребителей нет).

## Обновление компонентов

`pnpm dlx shadcn@<версия> add <компонент>` (или `npx -registry=https://registry.npmjs.org
shadcn@<версия> add …`, если корп-зеркало карантинит зависимости CLI) — затем
**diff-merge**: канонические части обновляются, локальные правки сохраняются
по пометкам-вставкам сверху файлов (прецедент — JSDoc NumberHint.tsx). После
каждого add: `git diff package.json` — новые зависимости только через
sanctioned-чекпойнт владельца.

## Файлы

- `button.tsx` — Button (variant default-CTA / quiet / toggle; size default / icon-sm);
- `card.tsx` — Card +Header/Title/Action/Description/Content/Footer (контракты .card-семейства, radius 2, padding 16);
- `kbd.tsx` — Kbd (моно 11px, container, усиленный низ бордера, radius 4);
- `utils.ts` — cn (clsx + tailwind-merge), локальная замена пакета cn;
- `index.ts` — баррел публичной поверхности;
- `token-bridge.test.ts` — контракт токен-моста D-39 (index.css ↔ кит).
