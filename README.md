# BugTrace — система багрепортов

ДЗ hw-5. Next.js + Supabase: багрепорты с AI-помощью (описание по скрину, теги, похожие баги).
Документация: [PRD.md](PRD.md), [architecture.md](architecture.md).

## Стек

Next.js (App Router, TS) · Supabase (Postgres + Auth + Storage, RLS) · OpenRouter (AI) · Vitest · **pnpm**

## Команды

```sh
pnpm install            # зависимости (pnpm, не npm — package-lock.json не используем)
pnpm run seed:users     # создать тестовых пользователей (user-a/b, moderator, admin @example.com)
pnpm run test:rls       # негативные тесты RLS (15 проверок, реальные JWT)
```

## Окружение

Скопируйте `.env.example` → `.env` и заполните (URL и anon key — из Supabase Dashboard → Project Settings → API).
Файл `.env` закрыт для агента на чтение/запись через `permissions` в `opencode.json`.

## Миграции БД

`supabase/migrations/` — применяются через Supabase MCP (`apply_migration`) в проект `yoygywkcvergkccasgcw` (otus).
