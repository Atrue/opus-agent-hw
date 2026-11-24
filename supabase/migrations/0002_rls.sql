-- BugTrace 0002_rls: RLS-политики таблицы bugs + приватный bucket bug-screenshots (см. architecture.md §4–5)
ALTER TABLE public.bugs ENABLE ROW LEVEL SECURITY;

-- видят: автор — свои; все — решённые; staff (moderator/admin) — все
CREATE POLICY bugs_select ON public.bugs FOR SELECT TO authenticated
    USING (
        reporter_id = auth.uid()
        OR status = 'resolved'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('moderator', 'admin')
    );

-- создать может только «от себя»
CREATE POLICY bugs_insert ON public.bugs FOR INSERT TO authenticated
    WITH CHECK (reporter_id = auth.uid());

-- менять — только staff (resolve / правка контента)
CREATE POLICY bugs_update ON public.bugs FOR UPDATE TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('moderator', 'admin'));

-- удалять — только admin
CREATE POLICY bugs_delete ON public.bugs FOR DELETE TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- приватный bucket для скриншотов
INSERT INTO storage.buckets (id, name, public)
VALUES ('bug-screenshots', 'bug-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- загрузка: только автор бага (первая часть пути = bug_id)
CREATE POLICY "screenshots_insert" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'bug-screenshots'
        AND EXISTS (
            SELECT 1 FROM public.bugs b
            WHERE b.id = ((storage.foldername(name))[1])::uuid
              AND b.reporter_id = auth.uid()
        )
    );

-- чтение: автор, staff, либо баг решён
CREATE POLICY "screenshots_select" ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'bug-screenshots'
        AND EXISTS (
            SELECT 1 FROM public.bugs b
            WHERE b.id = ((storage.foldername(name))[1])::uuid
              AND (b.reporter_id = auth.uid()
                   OR b.status = 'resolved'
                   OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('moderator', 'admin'))
        )
    );
