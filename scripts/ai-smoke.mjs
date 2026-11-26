// Живой smoke AI-пайплайна: баг со скрином и пустым описанием → загрузка скрина
// триггерит авто-пайплайн; затем явный POST /ai и админский просмотр похожих.
// Запуск: node --env-file=.env scripts/ai-smoke.mjs  (дев-сервер на :3000)
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";

const sb = createClient(URL, KEY, { auth: { persistSession: false } });
const { data: signIn, error: signInErr } = await sb.auth.signInWithPassword({
  email: "user-a@example.com",
  password: "Test1234!secure",
});
if (signInErr) throw signInErr;
const token = signIn.session.access_token;

const api = async (path, init = {}, tok = token) => {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { authorization: `Bearer ${tok}`, ...(init.headers ?? {}) },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};

// Валидный PNG 200x100 (белый фон, красный квадрат), собранный на месте: zlib + CRC32.
import { deflateSync } from "node:zlib";

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
function makePng(width, height, pixel /* (x,y)=>[r,g,b] */) {
  const raw = Buffer.alloc(height * (1 + width * 3));
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x, y);
      raw[o++] = r; raw[o++] = g; raw[o++] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
const png = makePng(200, 100, (x, y) =>
  x > 60 && x < 140 && y > 25 && y < 75 ? [220, 38, 38] : [255, 255, 255],
);

const created = await api("/api/bugs", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ title: "[smoke] Кнопка оплаты не нажимается", description: "" }),
});
if (created.status !== 201) throw new Error(`create: ${created.status} ${JSON.stringify(created.body)}`);
const bug = created.body;
console.log("bug created:", bug.id);

const form = new FormData();
form.set("file", new File([png], "payment.png", { type: "image/png" }));
const up = await api(`/api/bugs/${bug.id}/screenshot`, { method: "POST", body: form });
console.log("screenshot upload:", up.status, up.body?.path ?? up.body);

// загрузка скрина триггерит авто-пайплайн; плюс явный запуск — увидим стадии
const ai = await api(`/api/bugs/${bug.id}/ai`, { method: "POST" });
console.log("ai run:", ai.status, JSON.stringify(ai.body?.stages ?? ai.body));

// ждём завершения (free-модель может быть медленной)
let final = null;
for (let i = 0; i < 12; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  const detail = await api(`/api/bugs/${bug.id}`);
  final = detail.body;
  if (final?.description && final?.tags?.length) break;
  process.stdout.write(".");
}

// похожие видит только staff — смотрим админом
const { data: admin } = await createClient(URL, KEY).auth.signInWithPassword({
  email: "admin@example.com",
  password: "Test1234!secure",
});
const adminDetail = await api(`/api/bugs/${bug.id}`, {}, admin.session.access_token);

console.log("\n--- Результат (вид автора):");
console.log("description:", JSON.stringify(final?.description));
console.log("tags:", JSON.stringify(final?.tags));
console.log("--- Похожие (вид admin):", JSON.stringify(adminDetail.body?.similar_bug_ids));

await fetch(`${BASE}/api/bugs/${bug.id}`, {
  method: "DELETE",
  headers: { authorization: `Bearer ${admin.session.access_token}` },
});
console.log("cleaned up");
