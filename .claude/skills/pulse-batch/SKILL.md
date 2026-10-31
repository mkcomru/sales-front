---
name: pulse-batch
description: >-
  Pulse monorepo only. Slice boundaries, dependency order between packages, and pytest
  commands for `uv run --package`. Use together with the user skill `batch` — this file does
  not replace batch’s phases.
---

# Pulse batch — local supplement

**Not a standalone workflow.** Follow `~/.cursor/skills/batch` for Phase 1–4 structure (map → decompose → execute → integrate). This skill only supplies **repo-specific facts** so those phases run faster here.

## Slice boundaries

| Area | Notes |
|------|--------|
| `libs/common` | Shared IO/config — often must land **before** consumers |
| `apps/backend` | Package `backend` in uv |
| `apps/sales-agent` | Directory name; uv package is **`sales-bot`** |
| `apps/telegram-module`, `apps/wappi-module`, `apps/wazzup-module` | Transport packages match folder names in uv |

**Typical order** when a **shared contract** moves (types, envelope, tool schemas): `libs/common` → `backend` → `sales-bot` → transports (drop steps that are irrelevant).

When splitting work across agents, **do not** split a single encapsulated operation from `data-consistency.mdc` across two units — one unit should own the full atomic change.

## Verification (from repo root)

Authoritative list: **`docs/testing.md`**. Quick reference:

```bash
uv run --package backend pytest
uv run --package sales-bot pytest
uv run --package telegram-module pytest
uv run --package wappi-module pytest
uv run --package wazzup-module pytest
```

Prefer targeted paths when the diff is small.

## Anti-patterns

- Guessing uv package names — confirm in `docs/testing.md` or `pyproject.toml` (especially `sales-bot` vs `sales-agent`)
