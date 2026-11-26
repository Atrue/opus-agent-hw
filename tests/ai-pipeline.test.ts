// Юнит-тесты AI-слоя: лимиты, клиент OpenRouter (фолбэк), пайплайн (моки вместо сети).
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as limits from "@/lib/ai/limits";
import { chat, extractJson } from "@/lib/ai/openrouter";
import { runAiPipeline } from "@/lib/ai/pipeline";

// --- limits -----------------------------------------------------------------
describe("лимиты AI", () => {
  beforeEach(() => limits.reset());

  it("5 запусков на баг — шестой запрещён", () => {
    expect(limits.canRun("bug-1")).toBe(true);
    for (let i = 0; i < 5; i++) limits.record("bug-1");
    expect(limits.canRun("bug-1")).toBe(false);
    expect(limits.canRun("bug-2")).toBe(true); // другой баг не задет
    limits.reset("bug-1");
    expect(limits.canRun("bug-1")).toBe(true);
  });
});

// --- openrouter ----------------------------------------------------------------
process.env.OPENROUTER_API_KEY ??= "test-key";

describe("chat()", () => {
  it("при сбое primary уходит в fallback-модель", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls++;
      if (calls === 1) return new Response("boom", { status: 500 });
      return new Response(
        JSON.stringify({ choices: [{ message: { content: "ответ fallback" } }] }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    const answer = await chat([{ type: "text", text: "привет" }], { fetchImpl });
    expect(answer).toBe("ответ fallback");
    expect(calls).toBe(2);
  });

  it("обе модели упали → AiError", async () => {
    const fetchImpl = (async () => new Response("boom", { status: 500 })) as unknown as typeof fetch;
    await expect(chat([{ type: "text", text: "x" }], { fetchImpl })).rejects.toThrow(/OpenRouter/);
  });

  it("extractJson достаёт JSON из текста с пояснениями", () => {
    expect(extractJson<{ tags: string[] }>('Вот: {"tags":["ui"]} — готово')).toEqual({ tags: ["ui"] });
    expect(extractJson("нет json")).toBeNull();
  });
});

// --- pipeline ----------------------------------------------------------------
type FakeBug = {
  title: string;
  description: string;
  screenshot_path: string | null;
  tags: string[];
};

function makeClient(bug: FakeBug | null, similar: { id: string; score: number }[] = []) {
  const rpcCalls: { fn: string; args: Record<string, unknown> }[] = [];
  const client = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: bug, error: null }),
        }),
      }),
    }),
    storage: {
      from: () => ({
        createSignedUrl: async () => ({ data: { signedUrl: "http://img.test/shot" }, error: null }),
      }),
    },
    rpc: async (fn: string, args?: Record<string, unknown>) => {
      rpcCalls.push({ fn, args: args ?? {} });
      if (fn === "find_similar_bugs") return { data: similar, error: null };
      return { data: null, error: null };
    },
  };
  return { client: client as unknown as SupabaseClient, rpcCalls };
}

function makeFetch(chatResponses: string[], imgStatus = 200) {
  const openrouterCalls: number[] = [];
  const fetchImpl = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("http://img.test")) {
      return new Response(new Uint8Array([137, 80, 78, 71]), {
        status: imgStatus,
        headers: { "content-type": "image/png" },
      });
    }
    openrouterCalls.push(openrouterCalls.length + 1);
    const content = chatResponses.shift() ?? "{}";
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
  }) as unknown as typeof fetch;
  return { fetchImpl, openrouterCalls };
}

const bugOf = (patch: Partial<FakeBug> = {}): FakeBug => ({
  title: "Кнопка сохранить не работает",
  description: "",
  screenshot_path: "b1/shot.png",
  tags: [],
  ...patch,
});

describe("runAiPipeline", () => {
  beforeEach(() => limits.reset());

  it("все три стадии: описание по скрину, теги (нормализованы), похожие", async () => {
    const { client, rpcCalls } = makeClient(bugOf(), [
      { id: "s1", score: 0.8 },
      { id: "s2", score: 0.4 },
    ]);
    const { fetchImpl } = makeFetch([
      "Кнопка не реагирует на клик.", // vision
      'Вот: {"tags":["UI","Ui","auth"]} — готово', // tags
    ]);

    const { stages } = await runAiPipeline("bug-1", client, fetchImpl);

    expect(stages.map((s) => [s.stage, s.status])).toEqual([
      ["description", "done"],
      ["tags", "done"],
      ["similar", "done"],
    ]);
    const applied = rpcCalls.filter((c) => c.fn === "apply_ai_results");
    expect(applied.map((c) => c.args.p_description)).toContain("Кнопка не реагирует на клик.");
    expect(applied.map((c) => c.args.p_tags)).toContainEqual(["ui", "auth"]);
    expect(applied.map((c) => c.args.p_similar)).toContainEqual(["s1", "s2"]);
  });

  it("описание уже есть → стадия skipped, vision не вызывается", async () => {
    const { client } = makeClient(bugOf({ description: "Уже описано" }));
    const { fetchImpl, openrouterCalls } = makeFetch(['{"tags":["ui"]}']);

    const { stages } = await runAiPipeline("bug-1", client, fetchImpl);

    expect(stages[0]).toMatchObject({ stage: "description", status: "skipped" });
    expect(openrouterCalls).toHaveLength(1); // только стадия тегов
  });

  it("модель вернула мусор вместо тегов → стадия tags error, записи нет", async () => {
    const { client, rpcCalls } = makeClient(bugOf({ description: "Есть описание" }));
    const { fetchImpl } = makeFetch(["Кажется, это про интерфейс"]);

    const { stages } = await runAiPipeline("bug-1", client, fetchImpl);

    expect(stages.find((s) => s.stage === "tags")?.status).toBe("error");
    expect(rpcCalls.some((c) => c.fn === "apply_ai_results" && "p_tags" in c.args)).toBe(false);
  });

  it("нет скриншота → стадия skipped; похожие записываются (в т.ч. пустые)", async () => {
    const { client, rpcCalls } = makeClient(bugOf({ screenshot_path: null }));
    const { fetchImpl } = makeFetch(['{"tags":["auth"]}' ]);

    const { stages } = await runAiPipeline("bug-1", client, fetchImpl);

    expect(stages[0]).toMatchObject({ stage: "description", status: "skipped" });
    const similar = rpcCalls.find((c) => c.fn === "apply_ai_results" && "p_similar" in c.args);
    expect(similar?.args.p_similar).toEqual([]);
  });

  it("скрин недоступен → стадия description error, остальные идут", async () => {
    const { client } = makeClient(bugOf());
    const { fetchImpl } = makeFetch(['{"tags":["ui"]}'], 404);

    const { stages } = await runAiPipeline("bug-1", client, fetchImpl);

    expect(stages.find((s) => s.stage === "description")?.status).toBe("error");
    expect(stages.find((s) => s.stage === "tags")?.status).toBe("done");
    expect(stages.find((s) => s.stage === "similar")?.status).toBe("done");
  });
});
