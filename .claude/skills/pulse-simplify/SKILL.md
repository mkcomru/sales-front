---
name: pulse-simplify
description: >-
  Pulse monorepo only. After a simplify/review pass, which pytest commands to run for which
  touched paths; Aerich note for backend schema work. Use with the user skill `simplify`.
---

# Pulse simplify — local supplement

**Not a standalone review.** Use `~/.cursor/skills/simplify` for the three review passes and fixes. This file only helps **Phase 3 verification** and **migration hygiene** in this repo.

## Suggested checks by touched paths

| If the diff includes… | Run (from repo root; narrow paths when possible) |
|----------------------|-----------------------------------------------------|
| `apps/backend/**` | `uv run --package backend pytest` |
| `apps/sales-agent/**` | `uv run --package sales-bot pytest` |
| `apps/telegram-module/**` | `uv run --package telegram-module pytest` |
| `apps/wappi-module/**` | `uv run --package wappi-module pytest` |
| `apps/wazzup-module/**` | `uv run --package wazzup-module pytest` |
| `libs/common/**` | Tests only if behavior changed; see `docs/testing.md` |

Details and alternatives: **`docs/testing.md`**.

## Schema / migrations

If the diff adds or changes Tortoise models in `apps/backend`, migrations are **Aerich** from that app; after `migrate`, add the `backend` schema prefix to generated SQL per **`AGENTS.md`**.
