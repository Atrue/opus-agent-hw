---
phase: 03
review: 03-REVIEW.md
titles: json
findings:
  - id: WR-01
    severity: warning
    disposition: open
    title: "Гало-геометрия измеряется один раз и не переизмеряется при смене метрик (лекционный режим / late font swap)"
  - id: WR-02
    severity: warning
    disposition: open
    title: "Миграция `section → Card` уронила landmark-семантику: `aria-label` на `div` без роли"
  - id: IN-01
    severity: info
    disposition: open
    title: "`<summary>` вне `<details>` — невалидный HTML + протечка `type=\"button\"` от Radix Trigger"
  - id: IN-02
    severity: info
    disposition: open
    title: "Мёртвое CSS-семейство станций 01.2-04 `.diag-*` (~90 строк) пережило зачистку мёртвого CSS фазы"
  - id: IN-03
    severity: info
    disposition: open
    title: "kit/README.md не дополнен tooltip.tsx / collapsible.tsx"
open: 5
total: 5
recorded: 2026-11-19T18:13:44.896Z
---

# Phase 03: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | open | - |
| WR-02 | warning | open | - |
| IN-01 | info | open | - |
| IN-02 | info | open | - |
| IN-03 | info | open | - |

Dispositions: `open` (recorded, not yet triaged), `fixed`, `skipped`, `deferred`.
Set `deferred` by hand and put the reason in the Source cell; both are preserved. A `|` in the reason is kept as prose and escaped on the next run.
Re-running the gate keeps every row it can. A row the current review no longer reports is kept and its Source cell flagged, so a finding does not leave this record silently. ONE exception: when a finding id is REUSED by a different finding, the earlier decision cannot keep a row — the id is taken — and it is dropped. A RECORDED decision (anything but `open`) is named on the console when that happens; a row still at `open` is replaced silently, because `open` records no decision to lose.
