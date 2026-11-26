// Клиент OpenRouter: самая дешёвая модель по умолчанию (free) + платный фолбэк.
// Цены на 2026-11: ling-3.2-flash:free — $0; gemma-3-4b-it — $0.04/$0.05 за 1M токенов.
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const KEY = process.env.OPENROUTER_API_KEY ?? "";
export const AI_MODEL = process.env.OPENROUTER_MODEL ?? "inclusionai/ling-3.2-flash:free";
export const AI_MODEL_FALLBACK = process.env.OPENROUTER_MODEL_FALLBACK ?? "google/gemma-3-4b-it";

export type Part =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export class AiError extends Error {}

/** Один user-message в chat/completions; при сбое primary — один ретрай fallback-моделью. */
export async function chat(
  parts: Part[],
  opts: { maxTokens?: number; fetchImpl?: typeof fetch } = {},
): Promise<string> {
  if (!KEY) throw new AiError("OPENROUTER_API_KEY не задан");

  let lastErr: unknown;
  for (const model of [AI_MODEL, AI_MODEL_FALLBACK]) {
    try {
      const res = await (opts.fetchImpl ?? fetch)(ENDPOINT, {
        method: "POST",
        headers: { authorization: `Bearer ${KEY}`, "content-type": "application/json" },
        body: JSON.stringify({
          model,
          max_tokens: opts.maxTokens ?? 500,
          messages: [{ role: "user", content: parts }],
        }),
      });
      if (!res.ok) throw new AiError(`OpenRouter HTTP ${res.status}`);
      const payload = (await res.json()) as {
        choices?: { message?: { content?: unknown } }[];
      };
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new AiError("Пустой ответ модели");
      }
      return content;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new AiError(`OpenRouter недоступен: ${lastErr instanceof Error ? lastErr.message : lastErr}`);
}

/** Достаёт первый JSON-объект из ответа модели (модели любят добавлять пояснения). */
export function extractJson<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}
