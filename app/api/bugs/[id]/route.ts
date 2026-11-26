import { NextResponse, type NextRequest } from "next/server";
import { fail, json } from "@/lib/api";
import { clientFromRequest, getAuth, roleFromRequest, type Role } from "@/lib/supabase";
import { normalizeTags, serializeBug, validateTitle, type BugRow } from "@/lib/bugs";

type Ctx = { params: Promise<{ id: string }> };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchBug(client: ReturnType<typeof clientFromRequest>, id: string): Promise<BugRow | null> {
  if (!UUID_RE.test(id)) return null;
  const { data } = await client.from("bugs").select("*").eq("id", id).maybeSingle();
  return (data as BugRow | null) ?? null;
}

// GET /api/bugs/{id} — баг по видимости (RLS); невидимый или кривой id → 404.
// Связи похожести двусторонние при чтении: bug_links хранит одну запись на связь
// (bug → similar), обратные находятся по индексу similar_bug_id. Staff видит merge.
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const role = roleFromRequest(req);
  const client = clientFromRequest(req);
  const bug = await fetchBug(client, id);
  if (!bug) return fail(404, "Баг не найден");

  if (role === "user") return json(serializeBug(bug, role));

  const [direct, reverse] = await Promise.all([
    client.from("bug_links").select("similar_bug_id").eq("bug_id", id),
    client.from("bug_links").select("bug_id").eq("similar_bug_id", id),
  ]);
  if (direct.error || reverse.error) return fail(500, direct.error?.message ?? reverse.error?.message ?? "Ошибка чтения связей");

  const merged = [
    ...new Set([
      ...(direct.data ?? []).map((r) => r.similar_bug_id as string),
      ...(reverse.data ?? []).map((r) => r.bug_id as string),
    ]),
  ].filter((x) => x !== id);

  return json(serializeBug(bug, role, merged));
}

// PATCH /api/bugs/{id} — правка контента и статуса. Только staff.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const auth = await getAuth(req);
  if (!auth) return fail(401, "Требуется авторизация");

  const bug = await fetchBug(auth.client, id);
  if (!bug) return fail(404, "Баг не найден");
  if (auth.role === "user") return fail(403, "Правка бага доступна moderator/admin");

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "Некорректный JSON");
  }

  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) {
    const title = validateTitle(body.title);
    if (!title) return fail(400, "title: строка 3–200 символов после trim");
    patch.title = title;
  }
  if (body.description !== undefined) {
    if (typeof body.description !== "string") return fail(400, "description должен быть строкой");
    patch.description = body.description;
  }
  if (body.tags !== undefined) {
    const tags = normalizeTags(body.tags);
    if (tags === null) return fail(400, "tags: массив строк (≤ 10, ≤ 50 символов каждая)");
    patch.tags = tags;
  }
  if (body.status !== undefined) {
    if (body.status !== "open" && body.status !== "resolved") {
      return fail(400, "status: open | resolved");
    }
    if (bug.status === "resolved" && body.status === "open") {
      return fail(400, "resolved — терминальный статус, reopen не поддерживается");
    }
    patch.status = body.status;
  }
  if (Object.keys(patch).length === 0) return fail(400, "Пустой PATCH: нет полей для изменения");

  const { data, error, count } = await auth.client
    .from("bugs")
    .update(patch, { count: "exact" })
    .eq("id", id)
    .select()
    .single();
  if (error) return fail(500, error.message);
  if (count === 0) return fail(404, "Баг не найден");

  return json(serializeBug(data, auth.role));
}

// DELETE /api/bugs/{id} — только admin.
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const auth = await getAuth(req);
  if (!auth) return fail(401, "Требуется авторизация");

  const bug = await fetchBug(auth.client, id);
  if (!bug) return fail(404, "Баг не найден");
  if (auth.role !== "admin") return fail(403, "Удаление доступно только admin");

  const { error, count } = await auth.client.from("bugs").delete({ count: "exact" }).eq("id", id);
  if (error) return fail(500, error.message);
  if (count === 0) return fail(404, "Баг не найден");

  return new NextResponse(null, { status: 204 });
}
