"use client";

import { getSupabase } from "./supabase-browser";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type JsonInit = Omit<RequestInit, "body"> & { json?: unknown; body?: BodyInit };

// Вызов нашего API с JWT из сессии. Ошибки API ({error: string}) → ApiError.
// json: тело + content-type: application/json; body: сырые данные (например FormData).
export async function apiFetch<T>(path: string, init: JsonInit = {}): Promise<T> {
  const { data } = await getSupabase().auth.getSession();
  const headers = new Headers(init.headers);
  if (init.json !== undefined) headers.set("content-type", "application/json");
  if (data.session?.access_token) {
    headers.set("authorization", `Bearer ${data.session.access_token}`);
  }

  const res = await fetch(path, {
    ...init,
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    cache: "no-store",
  });

  if (res.status === 204) return undefined as T;
  const payload = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) throw new ApiError(res.status, payload?.error ?? `HTTP ${res.status}`);
  return payload as T;
}

export type Bug = {
  id: string;
  reporter_id: string;
  title: string;
  description: string;
  screenshot_path: string | null;
  status: "open" | "resolved";
  tags: string[];
  similar_bug_ids: string[] | null;
  created_at: string;
  updated_at: string;
};

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
