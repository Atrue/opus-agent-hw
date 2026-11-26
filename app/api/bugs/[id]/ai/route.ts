import { type NextRequest } from "next/server";
import { fail, json } from "@/lib/api";
import { getAuth } from "@/lib/supabase";
import { canRun, record } from "@/lib/ai/limits";
import { runAiPipeline } from "@/lib/ai/pipeline";

type Ctx = { params: Promise<{ id: string }> };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/bugs/{id}/ai — запустить AI-пайплайн (описание → теги → похожие).
// Доступно автору бага и staff; лимит: 5 запусков на баг в час (FR-8).
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const auth = await getAuth(req);
  if (!auth) return fail(401, "Требуется авторизация");
  if (!UUID_RE.test(id)) return fail(404, "Баг не найден");

  const { data: bug } = await auth.client
    .from("bugs")
    .select("reporter_id")
    .eq("id", id)
    .maybeSingle();
  if (!bug) return fail(404, "Баг не найден");
  if (bug.reporter_id !== auth.userId && auth.role === "user") {
    return fail(403, "AI запускает автор бага или staff");
  }

  if (!canRun(id)) return fail(429, "Лимит AI-запусков для этого бага исчерпан (5 в час)");
  record(id);

  const { stages } = await runAiPipeline(id, auth.client);
  return json({ stages });
}
