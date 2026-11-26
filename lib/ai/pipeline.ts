// AI-пайплайн (architecture.md §6): описание по скрину → теги → похожие баги.
// Стадии независимы: сбой одной не мешает остальным; результаты — через RPC apply_ai_results.
import type { SupabaseClient } from "@supabase/supabase-js";
import { chat, extractJson } from "./openrouter";

export type StageStatus = "done" | "skipped" | "error";
export type Stage = { stage: "description" | "tags" | "similar"; status: StageStatus; detail?: string };
export type PipelineResult = { stages: Stage[] };

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * @param client  клиент Supabase от лица автора или staff (RLS даёт доступ к багу и скрину)
 * @param fetchImpl инъекция fetch для тестов
 */
export async function runAiPipeline(
  bugId: string,
  client: SupabaseClient,
  fetchImpl: typeof fetch = fetch,
): Promise<PipelineResult> {
  const { data: bug, error: bugErr } = await client
    .from("bugs")
    .select("title, description, screenshot_path, tags")
    .eq("id", bugId)
    .maybeSingle();
  if (bugErr || !bug) throw new Error(`Баг недоступен: ${bugErr?.message ?? "не найден"}`);

  const stages: Stage[] = [];

  // 1. Описание по скриншоту — только если скрин есть, а описание пустое.
  if (!bug.screenshot_path || bug.description) {
    stages.push({
      stage: "description",
      status: "skipped",
      detail: bug.description ? "описание уже есть" : "скриншота нет",
    });
  } else {
    try {
      const { data: signed } = await client.storage
        .from("bug-screenshots")
        .createSignedUrl(bug.screenshot_path, 600);
      if (!signed?.signedUrl) throw new Error("не удалось получить signed URL");

      const img = await fetchImpl(signed.signedUrl);
      if (!img.ok) throw new Error(`скрин недоступен: HTTP ${img.status}`);
      const mime = img.headers.get("content-type") ?? "image/png";
      const base64 = Buffer.from(await img.arrayBuffer()).toString("base64");

      const text = await chat(
        [
          { type: "text", text: "Опиши проблему пользователя на скриншоте: 1–3 предложения по-русски, без вступлений и рассуждений." },
          { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } },
        ],
        { maxTokens: 300, fetchImpl },
      );
      await client.rpc("apply_ai_results", { p_bug: bugId, p_description: text.trim() });
      stages.push({ stage: "description", status: "done" });
    } catch (e) {
      stages.push({ stage: "description", status: "error", detail: errText(e) });
    }
  }

  // 2. Теги по заголовку и описанию.
  try {
    const answer = await chat(
      [
        {
          type: "text",
          text:
            `Придумай до 5 коротких тегов (1–2 слова, lowercase) для багрепорта.\n` +
            `Заголовок: ${bug.title}\n` +
            `Описание: ${bug.description || "(нет)"}\n` +
            `Ответь ТОЛЬКО JSON: {"tags":["tag1","tag2"]}`,
        },
      ],
      { maxTokens: 200, fetchImpl },
    );
    const parsed = extractJson<{ tags?: unknown }>(answer);
    const tags = [...new Set(
      (Array.isArray(parsed?.tags) ? parsed.tags : [])
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    )].slice(0, 5);
    if (tags.length === 0) throw new Error("модель не вернула теги");
    await client.rpc("apply_ai_results", { p_bug: bugId, p_tags: tags });
    stages.push({ stage: "tags", status: "done", detail: tags.join(", ") });
  } catch (e) {
    stages.push({ stage: "tags", status: "error", detail: errText(e) });
  }

  // 3. Похожие баги — считает БД (pg_trgm + пересечение тегов), не LLM.
  try {
    const { data, error } = await client.rpc("find_similar_bugs", { target: bugId, k: 5 });
    if (error) throw error;
    const ids = (data ?? []).map((row: { id: string }) => row.id);
    await client.rpc("apply_ai_results", { p_bug: bugId, p_similar: ids });
    stages.push({ stage: "similar", status: "done", detail: `${ids.length} ссылок` });
  } catch (e) {
    stages.push({ stage: "similar", status: "error", detail: errText(e) });
  }

  return { stages };
}
