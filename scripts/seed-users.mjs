// Создаёт 4 тестовых пользователя через публичный signUp (без service key).
// После запуска нужно подтвердить email и проставить роли (см. README/шаг 3):
// SQL-апдейт по auth.users делает агент через MCP.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error(
    "Нет NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY в .env",
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const USERS = [
  { email: "user-a@example.gjcom", role: "user" },
  { email: "user-b@example.com", role: "user" },
  { email: "moderator@example.com", role: "moderator" },
  { email: "admin@example.com", role: "admin" },
];

for (const u of USERS) {
  const { error } = await supabase.auth.signUp({
    email: u.email,
    password: "Test1234!secure",
  });
  if (error && !/already/i.test(error.message)) {
    console.error(`signUp ${u.email}: FAIL — ${error.message}`);
    process.exitCode = 1;
  } else {
    console.log(
      `signUp ${u.email}: OK (${error ? "уже существует" : "создан"})`,
    );
  }
}
