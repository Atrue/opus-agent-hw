---
quick_id: 261023-ker
slug: remove-all-claude-mem-references-agents-
date: 2026-10-23
status: complete
commit: 77babe1
---

# Summary: Remove all claude-mem references

## What was done

Executed inline by the orchestrator (subagent dispatch broken in this environment:
all subagent models route to a backend that rejects harness requests with
"thinking cannot be disabled" HTTP 400; planner failed twice — opus and sonnet).

- **AGENTS.md** — rule 1 rewritten: memory is the `docs/memory.md` journal (read at
  session start, append a row at end of work); claude-mem/`save_memory`/frozen wording removed.
- **README.md** — bullet (line 55) and infra table row (line 85) now describe the
  `docs/memory.md` journal instead of the claude-mem plugin.
- **docs/about.md** — section «Память (claude-mem)» replaced with «Память (docs/memory.md)»:
  journal mechanics, one-line note that the claude-mem experiment was reverted same-day
  (external AI-provider credentials required for compression), «ложнозелёный lint»
  memory-cycle demo kept.
- **docs/plan.md** — goal line drops "(claude-mem)"; section 1 retitled «Память» with the
  experiment marked as reverted (history preserved, not deleted); finalization item
  updated.
- **docs/memory.md** — freeze note replaced with active-journal note; new 2026-10-23
  journal row records the removal. Entries never left the file — nothing lost.
- **.claude/settings.local.json** (gitignored, local-only) — removed
  `mcp__plugin_claude-mem_mcp-search__save_memory` and
  `mcp__plugin_claude-mem_mcp-search__work_state_write` from `permissions.allow`.

## Out of scope (intentional)

- `.claude/gsd-core/**` — claude-mem appears only as a generic example in GSD-managed
  files; editing them breaks GSD updates.
- Plugin uninstall itself (`~/.claude-mem/`, user-level hooks, plugin cache) — outside
  the repo, handled separately by the user.

## Verification

- `grep -rni "claude-mem"` over the repo (excluding gsd-core and quick artifacts)
  returns only intentional historical/revert notes (journal row, about.md revert note,
  plan.md revert item).
- `.claude/settings.local.json` parses as valid JSON.
- Commit: `77babe1` on branch `hw-2` (5 files, +15/−17).
