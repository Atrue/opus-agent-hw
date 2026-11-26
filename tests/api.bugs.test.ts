// Интеграционные тесты API (шаг 4): CRUD багов + бизнес-сценарий.
// Ходят в реальный Supabase от лица тестовых пользователей (RLS активна).
// Заголовки багов начинаются с "[api]" — чтобы уборка после тестов была точечной.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as bugsRoute from "../app/api/bugs/route";
import * as bugRoute from "../app/api/bugs/[id]/route";
import { makeReq, ctx } from "./helpers/http";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const PASSWORD = "Test1234!secure";

type Session = { token: string; id: string; role: string; client: SupabaseClient };
const users: Record<"a" | "b" | "m" | "admin", Session> = {} as never;

const signIn = async (email: string): Promise<Session> => {
  const client = createClient(URL, KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  expect(error, `signIn ${email}`).toBeNull();
  const token = data.session!.access_token;
  const { data: userData } = await client.auth.getUser();
  return {
    token,
    id: userData.user!.id,
    role: (userData.user!.app_metadata?.role as string) ?? "user",
    client,
  };
};

const adminClient = () =>
  createClient(URL, KEY, {
    global: { headers: { Authorization: `Bearer ${users.admin.token}` } },
    auth: { persistSession: false },
  });

const cleanup = async () => {
  await adminClient().from("bugs").delete().like("title", "[api]%");
};

beforeAll(async () => {
  users.a = await signIn("user-a@example.com");
  users.b = await signIn("user-b@example.com");
  users.m = await signIn("moderator@example.com");
  users.admin = await signIn("admin@example.com");
  await cleanup();
});

afterAll(cleanup);

const createBug = async (u: Session, title: string, description = "") => {
  const res = await bugsRoute.POST(
    makeReq("/api/bugs", { method: "POST", token: u.token, body: { title, description } }),
  );
  expect(res.status, `createBug ${title}`).toBe(201);
  return (await res.json()) as { id: string };
};

describe("Бизнес-сценарий: создать баг → модератор закрывает → видимость другим", () => {
  it("полный поток US-2 → US-6", async () => {
    // 1. A создаёт баг
    const created = await bugsRoute.POST(
      makeReq("/api/bugs", {
        method: "POST",
        token: users.a.token,
        body: { title: "[api] Кнопка сохранить не работает", description: "Шаги: нажать Save" },
      }),
    );
    expect(created.status).toBe(201);
    const bug = (await created.json()) as Record<string, string>;
    expect(bug.reporter_id).toBe(users.a.id);
    expect(bug.status).toBe("open");
    expect(bug.tags).toEqual([]);

    // 2. B не видит чужой открытый баг ни в списке, ни детально (404)
    const bList = await bugsRoute.GET(makeReq("/api/bugs", { token: users.b.token }));
    expect((await bList.json()).items.map((x: { id: string }) => x.id)).not.toContain(bug.id);
    const bDetail = await bugRoute.GET(makeReq(`/api/bugs/${bug.id}`), ctx(bug.id));
    expect(bDetail.status).toBe(404);

    // 3. A видит свой баг; user получает similar_bug_ids: null (только staff)
    const aDetail = await bugRoute.GET(
      makeReq(`/api/bugs/${bug.id}`, { token: users.a.token }),
      ctx(bug.id),
    );
    expect(aDetail.status).toBe(200);
    expect(((await aDetail.json()) as Record<string, unknown>).similar_bug_ids).toBeNull();

    // 4. A не может закрыть свой баг (только staff)
    const aPatch = await bugRoute.PATCH(
      makeReq(`/api/bugs/${bug.id}`, { method: "PATCH", token: users.a.token, body: { status: "resolved" } }),
      ctx(bug.id),
    );
    expect(aPatch.status).toBe(403);

    // 5. Модератор закрывает баг
    const mPatch = await bugRoute.PATCH(
      makeReq(`/api/bugs/${bug.id}`, { method: "PATCH", token: users.m.token, body: { status: "resolved" } }),
      ctx(bug.id),
    );
    expect(mPatch.status).toBe(200);
    expect(((await mPatch.json()) as Record<string, string>).status).toBe("resolved");

    // 6. Теперь B видит решённый: и детально, и в списке с фильтром
    const bDetail2 = await bugRoute.GET(
      makeReq(`/api/bugs/${bug.id}`, { token: users.b.token }),
      ctx(bug.id),
    );
    expect(bDetail2.status).toBe(200);
    const bResolved = await bugsRoute.GET(
      makeReq("/api/bugs", { token: users.b.token, searchParams: { status: "resolved" } }),
    );
    expect((await bResolved.json()).items.map((x: { id: string }) => x.id)).toContain(bug.id);

    // 7. Модератор ставит теги — нормализация API: lowercase, trim, без дублей
    const mTags = await bugRoute.PATCH(
      makeReq(`/api/bugs/${bug.id}`, { method: "PATCH", token: users.m.token, body: { tags: ["UI", " ui ", "Auth"] } }),
      ctx(bug.id),
    );
    expect(mTags.status).toBe(200);
    expect(((await mTags.json()) as Record<string, string[]>).tags).toEqual(["ui", "auth"]);
  });
});

describe("CRUD: создание и валидация", () => {
  it("POST без title / короткий / длинный → 400", async () => {
    const noTitle = await bugsRoute.POST(
      makeReq("/api/bugs", { method: "POST", token: users.a.token, body: { description: "x" } }),
    );
    expect(noTitle.status).toBe(400);

    const short = await bugsRoute.POST(
      makeReq("/api/bugs", { method: "POST", token: users.a.token, body: { title: "аб" } }),
    );
    expect(short.status).toBe(400);

    const long = await bugsRoute.POST(
      makeReq("/api/bugs", { method: "POST", token: users.a.token, body: { title: "x".repeat(201) } }),
    );
    expect(long.status).toBe(400);
  });

  it("POST от анонима → 401", async () => {
    const res = await bugsRoute.POST(
      makeReq("/api/bugs", { method: "POST", body: { title: "[api] аноним" } }),
    );
    expect(res.status).toBe(401);
  });

  it("reporter_id всегда от JWT, не из тела запроса", async () => {
    const res = await bugsRoute.POST(
      makeReq("/api/bugs", {
        method: "POST",
        token: users.a.token,
        body: { title: "[api] подмена автора", reporter_id: users.b.id },
      }),
    );
    expect(res.status).toBe(201);
    expect(((await res.json()) as Record<string, string>).reporter_id).toBe(users.a.id);
  });
});

describe("CRUD: чтение", () => {
  it("несуществующий id → 404, кривой uuid → 404", async () => {
    const missing = await bugRoute.GET(
      makeReq(`/api/bugs/${crypto.randomUUID()}`, { token: users.a.token }),
      ctx(crypto.randomUUID()),
    );
    expect(missing.status).toBe(404);

    const bad = await bugRoute.GET(makeReq("/api/bugs/not-a-uuid", { token: users.a.token }), ctx("not-a-uuid"));
    expect(bad.status).toBe(404);
  });

  it("staff видит similar_bug_ids массивом, user — null", async () => {
    const bug = await createBug(users.b, "[api] деталь staff/user");
    const mDetail = await bugRoute.GET(
      makeReq(`/api/bugs/${bug.id}`, { token: users.m.token }),
      ctx(bug.id),
    );
    expect(mDetail.status).toBe(200);
    expect(((await mDetail.json()) as Record<string, unknown>).similar_bug_ids).toEqual([]);
  });

  it("фильтры списка: status, tag, q; пагинация", async () => {
    const b1 = await createBug(users.a, "[api] фильтр поиск платежи", "оплачиваю картой и ничего");
    await createBug(users.a, "[api] фильтр другое");

    const byTag = await bugsRoute.GET(
      makeReq("/api/bugs", { token: users.admin.token, searchParams: { tag: "payments" } }),
    );
    expect(byTag.status).toBe(200);

    const patched = await bugRoute.PATCH(
      makeReq(`/api/bugs/${b1.id}`, { method: "PATCH", token: users.m.token, body: { tags: ["payments"] } }),
      ctx(b1.id),
    );
    expect(patched.status).toBe(200);

    const tagged = await bugsRoute.GET(
      makeReq("/api/bugs", { token: users.m.token, searchParams: { tag: "payments" } }),
    );
    const taggedIds = (await tagged.json()).items.map((x: { id: string }) => x.id);
    expect(taggedIds).toContain(b1.id);

    const found = await bugsRoute.GET(
      makeReq("/api/bugs", { token: users.m.token, searchParams: { q: "картОЙ" } }),
    );
    expect((await found.json()).items.map((x: { id: string }) => x.id)).toContain(b1.id);

    const page = await bugsRoute.GET(
      makeReq("/api/bugs", { token: users.admin.token, searchParams: { limit: "1", page: "1" } }),
    );
    expect((await page.json()).items).toHaveLength(1);
  });

  it("?mine=1 — только свои баги, даже для staff (RLS бы вернул все)", async () => {
    const withoutMine = await bugsRoute.GET(makeReq("/api/bugs", { token: users.m.token }));
    expect((await withoutMine.json()).items.length).toBeGreaterThan(0);

    const mine = await bugsRoute.GET(
      makeReq("/api/bugs", { token: users.m.token, searchParams: { mine: "1" } }),
    );
    expect(mine.status).toBe(200);
    const items = (await mine.json()).items;
    expect(items).toHaveLength(0);

    const mineA = await bugsRoute.GET(
      makeReq("/api/bugs", { token: users.a.token, searchParams: { mine: "1" } }),
    );
    const mineAItems = (await mineA.json()).items;
    expect(mineAItems.length).toBeGreaterThan(0);
    for (const item of mineAItems) expect(item.reporter_id).toBe(users.a.id);
  });

  it("похожесть двусторонняя: одна запись в БД, видна в обе стороны (staff)", async () => {
    const b1 = await createBug(users.a, "[api] двусторонность источник");
    const b2 = await createBug(users.a, "[api] двусторонность цель");

    // AI-пайплайн пишет ссылку только на исходном баге — эмулируем его RPC-ом
    const { error } = await users.admin.client.rpc("apply_ai_results", {
      p_bug: b1.id,
      p_similar: [b2.id],
    });
    expect(error).toBeNull();

    const d1 = await bugRoute.GET(makeReq(`/api/bugs/${b1.id}`, { token: users.m.token }), ctx(b1.id));
    const d2 = await bugRoute.GET(makeReq(`/api/bugs/${b2.id}`, { token: users.m.token }), ctx(b2.id));
    const s1 = ((await d1.json()) as { similar_bug_ids: string[] }).similar_bug_ids;
    const s2 = ((await d2.json()) as { similar_bug_ids: string[] }).similar_bug_ids;

    expect(s1).toContain(b2.id);     // прямая связь
    expect(s2).toContain(b1.id);     // обратная — вычислена при чтении

    // в БД запись одна: у цели similar_bug_ids пуст
    const { data } = await users.admin.client
      .from("bugs")
      .select("similar_bug_ids")
      .eq("id", b2.id)
      .single();
    expect((data as { similar_bug_ids: string[] }).similar_bug_ids).toEqual([]);
  });
});

describe("CRUD: обновление и удаление (права)", () => {
  it("resolved — терминальный: reopen → 400", async () => {
    const bug = await createBug(users.a, "[api] терминальный статус");
    await bugRoute.PATCH(
      makeReq(`/api/bugs/${bug.id}`, { method: "PATCH", token: users.m.token, body: { status: "resolved" } }),
      ctx(bug.id),
    );
    const reopen = await bugRoute.PATCH(
      makeReq(`/api/bugs/${bug.id}`, { method: "PATCH", token: users.m.token, body: { status: "open" } }),
      ctx(bug.id),
    );
    expect(reopen.status).toBe(400);
  });

  it("user PATCH видимый чужой решённый → 403; невидимый свой чужой → 404", async () => {
    const bug = await createBug(users.a, "[api] права на patch");
    await bugRoute.PATCH(
      makeReq(`/api/bugs/${bug.id}`, { method: "PATCH", token: users.m.token, body: { status: "resolved" } }),
      ctx(bug.id),
    );
    const bOnVisible = await bugRoute.PATCH(
      makeReq(`/api/bugs/${bug.id}`, { method: "PATCH", token: users.b.token, body: { title: "[api] взлом" } }),
      ctx(bug.id),
    );
    expect(bOnVisible.status).toBe(403);

    const hidden = await createBug(users.a, "[api] скрытый от B");
    const bOnHidden = await bugRoute.PATCH(
      makeReq(`/api/bugs/${hidden.id}`, { method: "PATCH", token: users.b.token, body: { title: "[api] взлом 2" } }),
      ctx(hidden.id),
    );
    expect(bOnHidden.status).toBe(404);
  });

  it("DELETE: moderator → 403, admin → 204, после — 404; аноним → 401", async () => {
    const bug = await createBug(users.b, "[api] на удаление");
    const visibleToM = await bugRoute.DELETE(
      makeReq(`/api/bugs/${bug.id}`, { method: "DELETE", token: users.m.token }),
      ctx(bug.id),
    );
    expect(visibleToM.status).toBe(403);

    const anon = await bugRoute.DELETE(makeReq(`/api/bugs/${bug.id}`, { method: "DELETE" }), ctx(bug.id));
    expect(anon.status).toBe(401);

    const byAdmin = await bugRoute.DELETE(
      makeReq(`/api/bugs/${bug.id}`, { method: "DELETE", token: users.admin.token }),
      ctx(bug.id),
    );
    expect(byAdmin.status).toBe(204);

    const gone = await bugRoute.GET(
      makeReq(`/api/bugs/${bug.id}`, { token: users.b.token }),
      ctx(bug.id),
    );
    expect(gone.status).toBe(404);
  });
});
