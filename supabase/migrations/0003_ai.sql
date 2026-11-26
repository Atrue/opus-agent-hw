-- BugTrace 0003_ai: RPC для AI-пайплайна (architecture.md §6).
-- Автор по RLS не может UPDATE-ить баг (правит только staff), поэтому результаты AI
-- пишутся через SECURITY DEFINER функции с собственной проверкой прав.

-- Похожие баги: trigram-сходство title+description + буст за пересечение тегов.
-- SECURITY DEFINER: ищет по ВСЕМ багам (решённым и нет), как в PRD.
CREATE OR REPLACE FUNCTION public.find_similar_bugs(target uuid, k int DEFAULT 5)
RETURNS TABLE (id uuid, score real)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    WITH me AS (
        SELECT title || ' ' || description AS text, tags
        FROM public.bugs
        WHERE id = target
    )
    SELECT b.id,
           least(1,
               0.7 * similarity(b.title || ' ' || b.description, me.text)
               + 0.3 * (CASE WHEN b.tags && me.tags THEN 1 ELSE 0 END)
           )::real AS score
    FROM public.bugs b, me
    WHERE b.id <> target
      AND similarity(b.title || ' ' || b.description, me.text) > 0.05
    ORDER BY score DESC
    LIMIT greatest(k, 1);
$$;

GRANT EXECUTE ON FUNCTION public.find_similar_bugs(uuid, int) TO authenticated;

-- Запись результатов AI-стадий. NULL-поля не перезаписываются;
-- description дописывается только если был пуст (auto-run не затирает контент).
-- Права: автор бага или staff — проверка внутри (дальше RLS не действует, definer).
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
        description     = CASE WHEN bugs.description = '' AND p_description IS NOT NULL
                               THEN p_description ELSE bugs.description END,
        tags            = CASE WHEN p_tags IS NOT NULL
                               THEN (SELECT array_agg(DISTINCT t) FROM unnest(bugs.tags || p_tags) AS t)
                               ELSE bugs.tags END,
        similar_bug_ids = COALESCE(p_similar, bugs.similar_bug_ids),
        updated_at      = now()
    WHERE bugs.id = p_bug
      AND EXISTS (
          SELECT 1 FROM public.bugs b
          WHERE b.id = p_bug
            AND (b.reporter_id = auth.uid()
                 OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('moderator', 'admin'))
      );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_ai_results(uuid, text, text[], uuid[]) TO authenticated;

-- Ссылка на скриншот: автор не может UPDATE-ить баг, поэтому путь пишет RPC.
-- p_path проверяется на формат '{uuid}/{uuid}.{ext}' — без path traversal.
CREATE OR REPLACE FUNCTION public.set_screenshot(p_bug uuid, p_path text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF p_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpe?g|webp)$' THEN
        RAISE EXCEPTION 'invalid screenshot path';
    END IF;
    UPDATE public.bugs SET screenshot_path = p_path, updated_at = now()
    WHERE bugs.id = p_bug
      AND EXISTS (
          SELECT 1 FROM public.bugs b
          WHERE b.id = p_bug
            AND (b.reporter_id = auth.uid()
                 OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('moderator', 'admin'))
      );
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_screenshot(uuid, text) TO authenticated;
