-- BugTrace 0004_storage_staff_upload: скриншот может загрузить автор бага ИЛИ staff
-- (как в роуте POST /api/bugs/{id}/screenshot; architecture.md §5).
DROP POLICY IF EXISTS "screenshots_insert" ON storage.objects;
CREATE POLICY "screenshots_insert" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'bug-screenshots'
        AND EXISTS (
            SELECT 1 FROM public.bugs b
            WHERE b.id = ((storage.foldername(name))[1])::uuid
              AND (b.reporter_id = auth.uid()
                   OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('moderator', 'admin'))
        )
    );
