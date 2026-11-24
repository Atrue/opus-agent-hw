import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export type Role = "user" | "moderator" | "admin";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function bearerToken(req: NextRequest): string {
  const auth = req.headers.get("authorization") ?? "";
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
}

// Клиент Supabase от имени пользователя: JWT из заголовка → RLS решает всё.
export function clientFromRequest(req: NextRequest): SupabaseClient {
  const token = bearerToken(req);
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Роль из подписанного GoTrue JWT (app_metadata пользователь менять не может).
// Используется только для «косметики» API (видимость similar_bug_ids); права — RLS.
export function roleFromRequest(req: NextRequest): Role {
  const payload = decodeJwtPayload(bearerToken(req));
  const meta = payload?.app_metadata as Record<string, unknown> | undefined;
  const role = meta?.role;
  return role === "moderator" || role === "admin" ? role : "user";
}

export async function getAuth(req: NextRequest): Promise<
  { client: SupabaseClient; userId: string; role: Role } | null
> {
  const client = clientFromRequest(req);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return { client, userId: data.user.id, role: roleFromRequest(req) };
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  } catch {
    return null;
  }
}
