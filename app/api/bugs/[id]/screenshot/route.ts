import { after, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fail, json } from "@/lib/api";
import { getAuth } from "@/lib/supabase";
import { canRun, record } from "@/lib/ai/limits";
import { runAiPipeline } from "@/lib/ai/pipeline";

type Ctx = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_SIZE = 5 * 1024 * 1024; // PRD FR-2: PNG/JPEG/WebP ≤ 5 МБ
const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

async function fetchBug(client: SupabaseClient, id: string) {
  if (!UUID_RE.test(id)) return null;
  const { data } = await client.from("bugs").select("reporter_id, screenshot_path").eq("id", id).maybeSingle();
  return (data as { reporter_id: string; screenshot_path: string | null } | null) ?? null;
}

// POST /api/bugs/{id}/screenshot — загрузка скрина (multipart, поле file). Автор или staff.
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const auth = await getAuth(req);
  if (!auth) return fail(401, "Требуется авторизация");

  const bug = await fetchBug(auth.client, id);
  if (!bug) return fail(404, "Баг не найден");
  if (bug.reporter_id !== auth.userId && auth.role === "user") {
    return fail(403, "Скриншот загружает автор бага или staff");
  }

  let file: File;
  try {
    const form = await req.formData();
    const entry = form.get("file") as File | string | null;
    // duck-typing вместо instanceof: Next бандлит свой undici — классы File разные
    const fileLike = entry && typeof entry === "object" &&
      typeof (entry as File).arrayBuffer === "function" &&
      typeof (entry as File).type === "string" &&
      typeof (entry as File).size === "number";
    if (!fileLike) return fail(400, "Ожидается multipart-поле file");
    file = entry as File;
  } catch {
    return fail(400, "Ожидается multipart/form-data");
  }

  const ext = EXT_BY_TYPE[file.type];
  if (!ext) return fail(400, "Формат должен быть PNG, JPEG или WebP");
  if (file.size > MAX_SIZE) return fail(400, "Файл больше 5 МБ");

  const path = `${id}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadErr } = await auth.client.storage
    .from("bug-screenshots")
    .upload(path, await file.arrayBuffer(), { contentType: file.type });
  if (uploadErr) return fail(500, uploadErr.message);

  const { error: rpcErr } = await auth.client.rpc("set_screenshot", { p_bug: id, p_path: path });
  if (rpcErr) {
    await auth.client.storage.from("bug-screenshots").remove([path]);
    return fail(500, rpcErr.message);
  }

  // Скрин появился после создания — пайплайн мог пропустить стадию «описание по скрину».
  // Перезапускаем его автоматически (лимиты те же: 5 на баг в час).
  const client = auth.client;
  try {
    after(async () => {
      if (!canRun(id)) return;
      record(id);
      try {
        await runAiPipeline(id, client);
      } catch {
        // стадии логируются внутри пайплайна
      }
    });
  } catch {
    // вне request-контекста (unit-тесты): авто-запуск не планируется
  }

  return json({ path }, 201);
}

// GET /api/bugs/{id}/screenshot — short-lived signed URL (видимость решает RLS + storage policy).
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const auth = await getAuth(req);
  if (!auth) return fail(401, "Требуется авторизация");

  const bug = await fetchBug(auth.client, id);
  if (!bug?.screenshot_path) return fail(404, "Скриншот не найден");

  const { data, error } = await auth.client.storage
    .from("bug-screenshots")
    .createSignedUrl(bug.screenshot_path, 300);
  if (error || !data?.signedUrl) return fail(500, error?.message ?? "signed URL недоступен");

  return json({ url: data.signedUrl });
}
