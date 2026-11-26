// Интеграционные тесты скриншотов (storage + RPC set_screenshot).
// AI-пайплайн запускается только автоматически (после создания/загрузки скрина);
// его логика покрыта юнит-тестами (ai-pipeline.test.ts) — без реальных вызовов OpenRouter.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as bugsRoute from "../app/api/bugs/route";
import * as bugRoute from "../app/api/bugs/[id]/route";
import * as shotRoute from "../app/api/bugs/[id]/screenshot/route";
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

// 1x1 прозрачный PNG
const PNG_1X1 = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="),
  (c) => c.charCodeAt(0),
);

const uploads: string[] = [];

const createBug = async (u: Session, title: string) => {
  const res = await bugsRoute.POST(
    makeReq("/api/bugs", { method: "POST", token: u.token, body: { title } }),
  );
  expect(res.status).toBe(201);
  return (await res.json()) as { id: string };
};

const uploadShot = async (u: Session, bugId: string, file: File) =>
  shotRoute.POST(
    makeReq(`/api/bugs/${bugId}/screenshot`, {
      method: "POST",
      token: u.token,
      body: (() => {
        const form = new FormData();
        form.set("file", file);
        return form;
      })(),
    }),
    ctx(bugId),
  );

beforeAll(async () => {
  users.a = await signIn("user-a@example.com");
  users.b = await signIn("user-b@example.com");
  users.m = await signIn("moderator@example.com");
  users.admin = await signIn("admin@example.com");
  await adminClient().from("bugs").delete().like("title", "[shot]%");
});

afterAll(async () => {
  await adminClient().from("bugs").delete().like("title", "[shot]%");
  if (uploads.length) await adminClient().storage.from("bug-screenshots").remove(uploads);
});

describe("скриншоты", () => {
  it("автор загружает PNG → путь в баге; GET возвращает signed URL", async () => {
    const bug = await createBug(users.a, "[shot] со скрином");
    const res = await uploadShot(users.a, bug.id, new File([PNG_1X1], "shot.png", { type: "image/png" }));
    expect(res.status).toBe(201);
    const { path } = (await res.json()) as { path: string };
    expect(path).toMatch(new RegExp(`^${bug.id}/[0-9a-f-]{36}\\.png$`));
    uploads.push(path);

    const detail = await bugRoute.GET(makeReq(`/api/bugs/${bug.id}`, { token: users.a.token }), ctx(bug.id));
    expect(((await detail.json()) as { screenshot_path: string }).screenshot_path).toBe(path);

    const urlRes = await shotRoute.GET(
      makeReq(`/api/bugs/${bug.id}/screenshot`, { token: users.a.token }),
      ctx(bug.id),
    );
    expect(urlRes.status).toBe(200);
    const signedUrl = ((await urlRes.json()) as { url: string }).url;
    expect(signedUrl).toContain("/object/sign/bug-screenshots/");
    expect(signedUrl).toContain("token=");
  });

  it("чужой открытый баг: user не видит скрин (404) и не грузит (404); staff — видит и грузит", async () => {
    const bug = await createBug(users.a, "[shot] чужой");

    const bGet = await shotRoute.GET(
      makeReq(`/api/bugs/${bug.id}/screenshot`, { token: users.b.token }),
      ctx(bug.id),
    );
    expect(bGet.status).toBe(404);

    const bPost = await uploadShot(users.b, bug.id, new File([PNG_1X1], "x.png", { type: "image/png" }));
    expect(bPost.status).toBe(404);

    const mPost = await uploadShot(users.m, bug.id, new File([PNG_1X1], "m.png", { type: "image/png" }));
    expect(mPost.status).toBe(201);
    uploads.push(((await mPost.json()) as { path: string }).path);

    const mGet = await shotRoute.GET(
      makeReq(`/api/bugs/${bug.id}/screenshot`, { token: users.m.token }),
      ctx(bug.id),
    );
    expect(mGet.status).toBe(200);
  });

  it("неверный формат и oversized → 400", async () => {
    const bug = await createBug(users.a, "[shot] валидация файла");

    const badType = await uploadShot(users.a, bug.id, new File([PNG_1X1], "x.txt", { type: "text/plain" }));
    expect(badType.status).toBe(400);

    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", { type: "image/png" });
    const oversize = await uploadShot(users.a, bug.id, big);
    expect(oversize.status).toBe(400);
  });
});
