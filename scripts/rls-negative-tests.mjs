// Негативные тесты RLS (architecture.md §4). Запуск: npm run test:rls
// Каждый тест выполняется от лица реального пользователя (JWT из signInWithPassword).
// UPDATE/DELETE, заблокированные RLS, не ошибку дают, а 0 затронутых строк — учитываем в ассертах.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Нет NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY в .env");
  process.exit(1);
}

const PASSWORD = "Test1234!secure";
const EMAILS = {
  a: "user-a@example.com",
  b: "user-b@example.com",
  m: "moderator@example.com",
  admin: "admin@example.com",
};

const results = [];
function check(name, ok, detail = "") {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const mk = () => createClient(url, key, { auth: { persistSession: false } });
const signIn = async (email) => {
  const c = mk();
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  const { data } = await c.auth.getUser();
  return { client: c, id: data.user.id, role: data.user.app_metadata?.role ?? "user" };
};

const rls = (err) => err && /row-level security/i.test(err.message);

// --- вход всех участников -------------------------------------------------
const [A, B, M, Admin] = await Promise.all([
  signIn(EMAILS.a),
  signIn(EMAILS.b),
  signIn(EMAILS.m),
  signIn(EMAILS.admin),
]);
console.log(
  `Вошли: A=${A.role}, B=${B.role}, M=${M.role}, Admin=${Admin.role}\n`
);

// --- подготовка: чистим таблицу и создаём данные ---------------------------
await Admin.client.from("bugs").delete().not("id", "is", null);

const ins = async (who, title) => {
  const { data, error } = await who.client
    .from("bugs")
    .insert({ reporter_id: who.id, title })
    .select()
    .single();
  if (error) throw new Error(`insert(${title}): ${error.message}`);
  return data.id;
};

const bugA1 = await ins(A, "Баг A1: открытый");
const bugA2 = await ins(A, "Баг A2: станет решённым");
const bugB1 = await ins(B, "Баг B1: открытый");

// --- 1. видимость нерешённых и решённых ------------------------------------
{
  const { data, error } = await B.client.from("bugs").select("id");
  const seen = (data ?? []).map((r) => r.id);
  check(
    "1a. B видит только свой баг: чужие нерешённые A скрыты",
    !error && seen.length === 1 && seen[0] === bugB1,
    error?.message ?? `видно ${seen.length}: ${seen.join(",")}`
  );

  const single = await B.client.from("bugs").select("*").eq("id", bugA1);
  check(
    "1b. точечный SELECT чужого открытого бага → 0 строк",
    !single.error && (single.data ?? []).length === 0
  );
}

// --- 2. вставка с чужим reporter_id ----------------------------------------
{
  const { error } = await B.client.from("bugs").insert({
    reporter_id: A.id,
    title: "Попытка создать баг от имени A",
  });
  check("2. B не может вставить баг с reporter_id = A", rls(error), error?.message ?? "вставка прошла!");
}

// --- 3. user не может обновлять/удалять -------------------------------------
{
  const { data, count } = await A.client
    .from("bugs")
    .update({ status: "resolved" }, { count: "exact" })
    .eq("id", bugA1)
    .select();
  check(
    "3a. A не может сменить статус даже своего бага",
    (count ?? 0) === 0 && (data ?? []).length === 0,
    `обновлено строк: ${count ?? 0}`
  );

  const { count: del } = await A.client
    .from("bugs")
    .delete({ count: "exact" })
    .eq("id", bugA1)
    .select();
  const still = await M.client.from("bugs").select("id").eq("id", bugA1);
  check(
    "3b. A не может удалить свой баг",
    !del && (still.data ?? []).length === 1,
    `удалено: ${del ?? 0}`
  );
}

// --- 4. staff: видят всё, moderator обновляет, но удалять может только admin -
{
  const { data } = await M.client.from("bugs").select("id");
  const ids = new Set((data ?? []).map((r) => r.id));
  check(
    "4a. moderator видит все баги (включая чужие открытые)",
    ids.has(bugA1) && ids.has(bugA2) && ids.has(bugB1),
    `видно ${ids.size} из 3`
  );

  const { data: upd, error, count } = await M.client
    .from("bugs")
    .update({ status: "resolved" }, { count: "exact" })
    .eq("id", bugA2)
    .select();
  check(
    "4b. moderator помечает баг решённым",
    !error && count === 1 && upd?.[0]?.status === "resolved",
    error?.message
  );

  const { count: mDel } = await M.client
    .from("bugs")
    .delete({ count: "exact" })
    .eq("id", bugA1)
    .select();
  check(
    "4c. moderator НЕ может удалять (только admin)",
    !mDel,
    `удалено строк: ${mDel ?? 0}`
  );
}

// --- 5. решённые видны всем; storage-доступ по видимости бага ----------------
{
  const { data } = await B.client.from("bugs").select("status").eq("id", bugA2);
  check(
    "5a. B видит решённый баг A",
    (data ?? []).length === 1 && data[0].status === "resolved"
  );

  const bytes = new TextEncoder().encode("fake-png-bytes");
  const foreign = await B.client.storage
    .from("bug-screenshots")
    .upload(`${bugA1}/steal.png`, bytes, { contentType: "image/png" });
  check(
    "5b. B не может загрузить файл в папку чужого бага",
    !!foreign.error && rls(foreign.error),
    foreign.error?.message ?? "загрузка прошла!"
  );

  const own = await B.client.storage
    .from("bug-screenshots")
    .upload(`${bugB1}/own.png`, bytes, { contentType: "image/png" });
  check("5c. B загружает скрин в папку своего бага", !own.error, own.error?.message);
}

// --- 6. admin удаляет; аноним не видит ничего --------------------------------
{
  const { count } = await Admin.client
    .from("bugs")
    .delete({ count: "exact" })
    .eq("id", bugB1)
    .select();
  check("6a. admin удаляет баг", count === 1, `удалено: ${count ?? 0}`);

  const Anon = mk();
  const { data, error } = await Anon.from("bugs").select("id");
  check(
    "6b. аноним не видит ни одного бага",
    !error && (data ?? []).length === 0,
    error?.message ?? `видно ${data?.length ?? "?"}`
  );

  const { error: anonIns, status: anonStatus, data: anonData } = await Anon.from("bugs")
    .insert({ reporter_id: A.id, title: "Анонимная вставка" })
    .select("id");
  check(
    "6c. аноним не может создать баг",
    !!anonIns.error || anonStatus >= 400 || (anonData ?? []).length === 0,
    `status ${anonStatus}, error: ${anonIns.error?.message ?? "—"}`
  );

  const leftover = await Admin.client.from("bugs").select("id").eq("title", "Анонимная вставка");
  check(
    "6d. анонимной вставки в БД нет (проверка от admin)",
    !leftover.error && (leftover.data ?? []).length === 0,
    `найдено строк: ${leftover.data?.length ?? "?"}`
  );
}

// --- уборка -------------------------------------------------------------------
await Admin.client.from("bugs").delete().not("id", "is", null);
await B.client.storage.from("bug-screenshots").remove([`${bugB1}/own.png`]);

const failed = results.filter((r) => !r).length;
console.log(`\nИтого: ${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
