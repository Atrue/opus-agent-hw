---
quick_id: 261023-ker
slug: remove-all-claude-mem-references-agents-
date: 2026-10-23
mode: quick
description: Remove all claude-mem references from repo docs and settings; restore docs/memory.md as active journal
---

# Plan: Remove all claude-mem references

## Context

User decided to remove claude-mem entirely (plugin memory compression requires external
AI-provider credentials; login will not be used; the worker's credentials were refused).
The plugin itself and `~/.claude-mem/` are removed separately by the user — this task
covers repo-side references only. `docs/memory.md` entries survived in the file (the
"migration" to claude-mem did not empty it), so nothing is lost by reverting to it as
the active session journal.

GSD-managed files (`.claude/gsd-core/**`) are out of scope: claude-mem appears there
only as a generic example, and editing them breaks GSD updates.

<threat_model>
ASVS L1 / block on high. Docs-and-config cleanup; no code, no network, no secrets.
Removing stale MCP permission grants (`mcp__plugin_claude-mem_*`) from
`.claude/settings.local.json` reduces, not increases, the permission surface. No threats.
</threat_model>

No external API integration: docs/config cleanup only.

## Task 1: Strip claude-mem references, restore docs/memory.md journal

- **files**: AGENTS.md, README.md, docs/about.md, docs/plan.md, docs/memory.md, .claude/settings.local.json
- **action**:
  - AGENTS.md — rewrite rule 1 («Память сессий»): memory is the manual journal
    `docs/memory.md` (agent reads history at session start, appends a table row at end
    of work); drop claude-mem/`save_memory`/frozen-journal wording.
  - README.md — line 55 bullet and line 85 table row: describe `docs/memory.md` journal
    instead of the claude-mem plugin.
  - docs/about.md — replace section «Память (claude-mem)» (lines 64–71) with
    «Память (docs/memory.md)»: journal mechanics + one-line note that the claude-mem
    experiment (2026-10-23) was reverted the same day (external credentials required);
    keep the «ложнозелёный lint» memory-cycle demo case.
  - docs/plan.md — goal line 5: drop "(claude-mem)"; section «### 1. Память: claude-mem
    (заменяет docs/memory.md)»: retitle to «### 1. Память», mark the claude-mem items as
    reverted (2026-10-23, external credentials) with the journal restored — do not
    delete the hw-2 history, record the revert; line 43: drop claude-mem from the list.
  - docs/memory.md — replace the freeze note (line 3) with an active-journal note;
    append a 2026-10-23 journal row recording the claude-mem removal and journal restore.
  - .claude/settings.local.json — remove `mcp__plugin_claude-mem_mcp-search__save_memory`
    and `mcp__plugin_claude-mem_mcp-search__work_state_write` from `permissions.allow`
    (keep remaining entries; valid JSON).
- **verify**:
  ```bash
  grep -rni "claude-mem\|claude_mem" --include="*" . 2>/dev/null | grep -v node_modules | grep -v ".git/" | grep -v ".claude/gsd-core/" | grep -v ".planning/quick/"
  ```
  Expected: only the intentional historical mentions in docs/memory.md, docs/about.md,
  docs/plan.md (revert notes / journal row) and GSD quick-task artifacts; no active
  references. JSON validity: `node -e "JSON.parse(require('fs').readFileSync('.claude/settings.local.json'))"`.
- **done**: No claude-mem plugin references remain as active instructions;
  `docs/memory.md` is the documented memory mechanism; settings JSON valid.
