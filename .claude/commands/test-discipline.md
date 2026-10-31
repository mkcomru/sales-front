---
description: Activate test-backed workflow — prove every step with tests, not just at the end.
---

# Test Discipline

You are mid-task. This command reminds you to **lean on tests as you work**, not write them as a separate activity.

## How to Apply

1. **Before changing code**, check that the area you're about to touch has adequate test coverage. If it doesn't — add the missing tests first, then proceed with the actual task.
2. **After each meaningful step**, run `pytest -x -q --tb=short`. Green = move on. Red = stop and fix before the next step.
3. **When you change an interface** (signature, DI, moved module), update affected tests in the same step — not as cleanup later.
4. **After completion**, run the full suite + `rg` for stale symbols (dead imports, old fixtures, removed service names). Zero matches = clean.

## What "Adequate Coverage" Means

Not just the happy path. Edge cases, error paths, boundary values. A test that only proves "it works when everything is perfect" proves nothing about production.

## Mindset

Tests are not a deliverable — they are the **proof that your actual deliverable works**. Write them alongside production code, not after. Treat red tests as a hard stop, not a TODO.

Full philosophy: `.cursor/rules/test-discipline.mdc`
