import { NextRequest } from "next/server";

export type ReqOpts = {
  method?: "GET" | "POST" | "PATCH" | "DELETE" | "OPTIONS";
  token?: string;
  body?: unknown;
  searchParams?: Record<string, string>;
  headers?: Record<string, string>;
};

// Собирает NextRequest так, как это сделал бы Next.js при реальном запросе.
export function makeReq(path: string, opts: ReqOpts = {}): NextRequest {
  const url = new URL(path, "http://test.local");
  for (const [k, v] of Object.entries(opts.searchParams ?? {})) {
    url.searchParams.set(k, v);
  }
  const headers: Record<string, string> = { ...opts.headers };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  const hasBody = opts.body !== undefined;
  // Для FormData content-type ставит undici сам (multipart+boundary); для остального — JSON.
  if (hasBody && !(opts.body instanceof FormData)) headers["content-type"] = "application/json";
  const body = opts.body === undefined
    ? undefined
    : opts.body instanceof FormData
      ? opts.body
      : JSON.stringify(opts.body);
  return new NextRequest(url, {
    method: opts.method ?? "GET",
    headers,
    body,
  });
}

// Контекст для роутов с динамическим сегментом (Next 16: params — Promise).
export const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
