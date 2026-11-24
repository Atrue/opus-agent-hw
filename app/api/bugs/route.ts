import type { NextRequest } from "next/server";
import { fail, json } from "@/lib/api";
import { clientFromRequest, getAuth, roleFromRequest } from "@/lib/supabase";
import { normalizeTags, sanitizeQuery, serializeBug, validateTitle } from "@/lib/bugs";

const PAGE_DEFAULT = 1;
const LIMIT_DEFAULT = 10;
const LIMIT_MAX = 50;

// GET /api/bugs — лента багов: свои + решённые; staff — все (решает RLS).
// Фильтры: ?status=open|resolved&tag=…&q=…&page=&limit=
export async function GET(req: NextRequest) {
  const role = roleFromRequest(req);
  const client = clientFromRequest(req);

  const sp = req.nextUrl.searchParams;
  const page = Math.max(PAGE_DEFAULT, Number.parseInt(sp.get("page") ?? "", 10) || PAGE_DEFAULT);
  const limitRaw = Number.parseInt(sp.get("limit") ?? "", 10) || LIMIT_DEFAULT;
  const limit = Math.min(LIMIT_MAX, Math.max(1, limitRaw));

  let query = client.from("bugs").select("*").order("created_at", { ascending: false });

  const status = sp.get("status");
  if (status === "open" || status === "resolved") query = query.eq("status", status);

  const tag = sp.get("tag")?.trim().toLowerCase();
  if (tag) query = query.contains("tags", [tag]);

  const q = sanitizeQuery(sp.get("q"));
  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const { data, error } = await query.range((page - PAGE_DEFAULT) * limit, page * limit - 1);
  if (error) return fail(500, error.message);

  return json({ items: (data ?? []).map((bug) => serializeBug(bug, role)), page, limit });
}

// POST /api/bugs — создать баг. reporter_id всегда из JWT, не из тела.
export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return fail(401, "Требуется авторизация");

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail(400, "Некорректный JSON");
  }

  const title = validateTitle(body.title);
  if (!title) return fail(400, "title обязателен: строка 3–200 символов после trim");
  const description = typeof body.description === "string" ? body.description : "";
  if (body.tags !== undefined && normalizeTags(body.tags) === null) {
    return fail(400, "tags должен быть массивом коротких строк");
  }
  // Пользователь теги не задаёт (PRD FR-5): ставит AI, правит staff — игнорируем body.tags.

  const { data, error } = await auth.client
    .from("bugs")
    .insert({ reporter_id: auth.userId, title, description })
    .select()
    .single();
  if (error) return fail(500, error.message);

  return json(serializeBug(data, auth.role), 201);
}
