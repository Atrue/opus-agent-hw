import type { Role } from "./supabase";

const TITLE_MIN = 3;
const TITLE_MAX = 200;
const TAGS_MAX = 10;
const TAG_MAX_LEN = 50;

export type BugRow = {
  id: string;
  reporter_id: string;
  title: string;
  description: string;
  screenshot_path: string | null;
  status: "open" | "resolved";
  tags: string[];
  created_at: string;
  updated_at: string;
};

// similar_bug_ids видят только staff (architecture.md §7); остальным — null.
// Список вычисляется в роуте: прямые связи из bug_links + обратные.
export function serializeBug(bug: BugRow, role: Role, similarIds: string[] = []) {
  return {
    id: bug.id,
    reporter_id: bug.reporter_id,
    title: bug.title,
    description: bug.description,
    screenshot_path: bug.screenshot_path,
    status: bug.status,
    tags: bug.tags ?? [],
    similar_bug_ids: role === "user" ? null : similarIds,
    created_at: bug.created_at,
    updated_at: bug.updated_at,
  };
}

export function validateTitle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const title = raw.trim();
  return title.length >= TITLE_MIN && title.length <= TITLE_MAX ? title : null;
}

// Нормализация тегов: строка → trim/lowercase, пустые долой, без дублей.
// null — вход невалиден (не массив строк).
export function normalizeTags(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") return null;
    const tag = item.trim().toLowerCase();
    if (!tag) continue;
    if (tag.length > TAG_MAX_LEN) return null;
    seen.add(tag);
  }
  const tags = [...seen];
  return tags.length <= TAGS_MAX ? tags : null;
}

const Q_SANITIZE = /[%_,()]/g;
export function sanitizeQuery(raw: string | null): string {
  return (raw ?? "").replace(Q_SANITIZE, " ").trim();
}
