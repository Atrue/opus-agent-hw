---
schema_version: 1
open_count: 3
waived_count: 0
fixed_count: 0
total_count: 3
last_updated: 2026-11-02T12:58:55.635Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 1 | deviation | src/player/store.ts | 1 | zustand исключён решением пользователя (checkpoint 01-01); store на React-хуках; правило: store-библиотеки — только после вопроса пользователю | open |  | 2026-11-02T12:35:08.302Z |  |
| 2 | 1 | stub | src/ui/App.tsx |  | Слот диаграммы (55%) пуст — SVG-диаграмма 2-3-1: план 01-03 (отложено objective плана 01-02) | open |  | 2026-11-02T12:58:55.554Z |  |
| 3 | 1 | stub | src/ui/StepPanel.tsx |  | Клик по числу вызывает openDrill; панель NumberDrilldown не рендерится — план 01-03 (отложено objective плана 01-02) | open |  | 2026-11-02T12:58:55.635Z |  |

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
  },
  {
    "id": 2,
    "kind": "stub",
    "phase": "1",
    "file": "src/ui/App.tsx",
    "line": null,
    "description": "Слот диаграммы (55%) пуст — SVG-диаграмма 2-3-1: план 01-03 (отложено objective плана 01-02)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-11-02T12:58:55.554Z",
    "resolved_at": null,
    "milestone": null
  },
  {
    "id": 3,
    "kind": "stub",
    "phase": "1",
    "file": "src/ui/StepPanel.tsx",
    "line": null,
    "description": "Клик по числу вызывает openDrill; панель NumberDrilldown не рендерится — план 01-03 (отложено objective плана 01-02)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-11-02T12:58:55.635Z",
    "resolved_at": null,
    "milestone": null
  }
]
````
