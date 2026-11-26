-- BugTrace 0005_bug_links: связи похожести — отдельная таблица вместо uuid[] на баге.
-- Даёт: FK с каскадным удалением (нет висячих ссылок), уникальность связи на уровне БД,
-- индекс для обратного поиска, CHECK против самоссылки.

CREATE TABLE public.bug_links (
    bug_id         uuid NOT NULL REFERENCES public.bugs (id) ON DELETE CASCADE,
    similar_bug_id uuid NOT NULL REFERENCES public.bugs (id) ON DELETE CASCADE,
    created_at     timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (bug_id, similar_bug_id),
    CONSTRAINT bug_links_no_self CHECK (bug_id <> similar_bug_id)
);

-- обратный поиск «кто ссылается на этот баг»
CREATE INDEX bug_links_similar_idx ON public.bug_links (similar_bug_id);

-- бэкфилл из массива (дубли и самоссылки отсекает PK/CHECK + DO NOTHING)
INSERT INTO public.bug_links (bug_id, similar_bug_id)
SELECT b.id, s
FROM public.bugs b, unnest(b.similar_bug_ids) AS s
WHERE s <> b.id
ON CONFLICT DO NOTHING;

ALTER TABLE public.bugs DROP COLUMN similar_bug_ids;

-- читать связи может только staff (в API они и так отдаются только staff);
-- запись — исключительно через SECURITY DEFINER RPC apply_ai_results
ALTER TABLE public.bug_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY bug_links_select ON public.bug_links FOR SELECT TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('moderator', 'admin'));

-- apply_ai_results теперь пишет связи строками: полный replace для бага
CREATE OR REPLACE FUNCTION public.apply_ai_results(
    p_bug       uuid,
    p_description text  DEFAULT NULL,
    p_tags        text[] DEFAULT NULL,
    p_similar     uuid[] DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    UPDATE public.bugs SET
        description = CASE WHEN bugs.description = '' AND p_description IS NOT NULL
                           THEN p_description ELSE bugs.description END,
        tags        = CASE WHEN p_tags IS NOT NULL
                           THEN (SELECT array_agg(DISTINCT t) FROM unnest(bugs.tags || p_tags) AS t)
                           ELSE bugs.tags END,
        updated_at  = now()
    WHERE bugs.id = p_bug
      AND EXISTS (
          SELECT 1 FROM public.bugs b
          WHERE b.id = p_bug
            AND (b.reporter_id = auth.uid()
                 OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('moderator', 'admin'))
      );

    IF p_similar IS NOT NULL THEN
        DELETE FROM public.bug_links WHERE bug_id = p_bug;
        INSERT INTO public.bug_links (bug_id, similar_bug_id)
        SELECT p_bug, s
        FROM unnest(p_similar) AS s
        WHERE s <> p_bug
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$;
