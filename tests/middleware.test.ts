// CORS: белый список ALLOWED_ORIGINS, посторонним — preflight 403, обычные запросы без ACAO-заголовков.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { middleware } from "../middleware";
import { makeReq } from "./helpers/http";

const ORIGIN = "http://localhost:3000";
const EVIL = "http://evil.example";

describe("CORS middleware", () => {
  const saved = process.env.ALLOWED_ORIGINS;
  beforeAll(() => {
    process.env.ALLOWED_ORIGINS = ORIGIN;
  });
  afterAll(() => {
    if (saved === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = saved;
  });

  it("preflight от белого списка → 204 + ACAO", () => {
    const res = middleware(makeReq("/api/bugs", { method: "OPTIONS", headers: { origin: ORIGIN } }));
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    expect(res.headers.get("access-control-allow-methods")).toContain("PATCH");
  });

  it("preflight постороннего origin → 403 без заголовков", () => {
    const res = middleware(makeReq("/api/bugs", { method: "OPTIONS", headers: { origin: EVIL } }));
    expect(res.status).toBe(403);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("обычный запрос с разрешённым origin получает ACAO; без origin — без CORS", () => {
    const withOrigin = middleware(makeReq("/api/bugs", { headers: { origin: ORIGIN } }));
    expect(withOrigin.headers.get("access-control-allow-origin")).toBe(ORIGIN);

    const noOrigin = middleware(makeReq("/api/bugs"));
    expect(noOrigin.headers.get("access-control-allow-origin")).toBeNull();
  });
});
