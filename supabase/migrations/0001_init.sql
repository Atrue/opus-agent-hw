-- BugTrace 0001_init: расширение, enum, таблица bugs, индексы (см. architecture.md §3)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE public.bug_status AS ENUM ('open', 'resolved');

CREATE TABLE public.bugs (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id     uuid NOT NULL REFERENCES auth.users (id),
    title           text NOT NULL,
    description     text NOT NULL DEFAULT '',
    screenshot_path text,                          -- '{bug_id}/{uuid}.{ext}' в bucket bug-screenshots
    status          public.bug_status NOT NULL DEFAULT 'open',
    tags            text[]  NOT NULL DEFAULT '{}', -- теги строками, нормализует API
    similar_bug_ids uuid[]  NOT NULL DEFAULT '{}', -- AI-похожесть: id других багов, без score
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX bugs_reporter_idx ON public.bugs (reporter_id);
CREATE INDEX bugs_status_idx   ON public.bugs (status);
CREATE INDEX bugs_search_idx   ON public.bugs USING gin ((title || ' ' || description) gin_trgm_ops);
