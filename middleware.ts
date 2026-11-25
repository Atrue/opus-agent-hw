// CORS-middleware: белый список origins из ALLOWED_ORIGINS, остальным preflight → 403.
// Один origin (сам фронт) в CORS не нуждается — правила только для внешних клиентов.
import { NextResponse, type NextRequest } from "next/server";

const METHODS = "GET,POST,PATCH,DELETE,OPTIONS";
const HEADERS = "authorization,content-type";
const MAX_AGE = "86400";

function applyCors(res: NextResponse, origin: string) {
  res.headers.set("access-control-allow-origin", origin);
  res.headers.set("access-control-allow-methods", METHODS);
  res.headers.set("access-control-allow-headers", HEADERS);
  res.headers.set("access-control-max-age", MAX_AGE);
  res.headers.set("vary", "Origin");
}

function isAllowed(origin: string | null): origin is string {
  if (!origin) return false;
  const whitelist = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return whitelist.includes(origin);
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    if (!isAllowed(origin)) {
      return new NextResponse(null, { status: 403 });
    }
    const preflight = new NextResponse(null, { status: 204 });
    applyCors(preflight, origin);
    return preflight;
  }

  const res = NextResponse.next();
  if (isAllowed(origin)) applyCors(res, origin);
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
