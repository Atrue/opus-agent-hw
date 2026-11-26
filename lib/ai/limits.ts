// Лимиты AI (architecture.md §6, FR-8): в памяти процесса, без таблицы в БД.
// 5 запусков пайплайна на баг в час — этого достаточно для демо и защиты от спама.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_BUG = 5;

const runs = new Map<string, number[]>();

function prune(bugId: string) {
  const arr = runs.get(bugId);
  if (!arr) return;
  runs.set(bugId, arr.filter((t) => Date.now() - t < WINDOW_MS));
}

export function canRun(bugId: string): boolean {
  prune(bugId);
  return (runs.get(bugId)?.length ?? 0) < MAX_PER_BUG;
}

export function record(bugId: string): void {
  prune(bugId);
  const arr = runs.get(bugId) ?? [];
  arr.push(Date.now());
  runs.set(bugId, arr);
}

/** Тестам: сбросить счётчики. */
export function reset(bugId?: string): void {
  if (bugId) runs.delete(bugId);
  else runs.clear();
}
