---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 0
total_count: 1
last_updated: 2026-11-02T12:35:08.302Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 1 | deviation | src/player/store.ts | 1 | zustand исключён решением пользователя (checkpoint 01-01); store на React-хуках; правило: store-библиотеки — только после вопроса пользователю | open |  | 2026-11-02T12:35:08.302Z |  |

````json
[
  {
    "id": 1,
    "kind": "deviation",
    "phase": "1",
    "file": "src/player/store.ts",
    "line": 1,
    "description": "zustand исключён решением пользователя (checkpoint 01-01); store на React-хуках; правило: store-библиотеки — только после вопроса пользователю",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-11-02T12:35:08.302Z",
    "resolved_at": null,
    "milestone": null
  }
]
````
