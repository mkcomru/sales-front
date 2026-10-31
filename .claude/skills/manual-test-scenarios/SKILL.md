---
name: pulse-manual-test-scenarios
description: >-
  Pulse monorepo: author scripts/manual_testing/test_*.py from a plan, then run non-interactively
  via --all or --scenarios. This SKILL is the single playbook (no separate command doc).
---

# Manual test scenarios (create + run)

Dual purpose: **author** `scripts/manual_testing/test_{feature}.py` from a plan (or tickets), and **execute** — interactive menu for humans, **`--all` / `--scenarios`** for agents (no stdin).

## When to use

- A **plan** or feature needs **manual/API verification** via `scripts/manual_testing/`.
- Default: **create → run** in one session unless the user asked **create-only**.
- **CI/agents** must not depend on `input()` — wire `add_scenario_run_args` + `run_noninteractive_scenarios`.

## Human vs agent

| Runner | How |
|--------|-----|
| Human | `cd scripts/manual_testing && python test_feature.py` → interactive menu |
| Agent | Same script: **`--all`** or **`--scenarios 1,4,6-8`** (1-based, same as menu) |

Non-interactive flags:

- **`--all`** — every scenario; exit `0` if all pass, `1` if any failed.
- **`--scenarios SPEC`** — e.g. `1`, `3,5`, `1,4,6-8`; exit `2` if SPEC invalid.

**Shell (agent):**

```bash
cd scripts/manual_testing && uv run python test_company_metrics.py --all
uv run python scripts/manual_testing/test_company_metrics.py --scenarios 1,3,5-7
```

Use **`cd scripts/manual_testing`** or paths from repo root; needs **reachable backend** and env from `scripts/manual_testing/README.md` (`SERVICE_API_KEY`, `TEST_EMAIL`, `TEST_PASSWORD`, etc.). If setup fails or HTTP errors, exit non-zero — report it; do not treat as pass.

## Default sequence

1. Read **`scripts/manual_testing/.cursor/rules/manual-testing.mdc`** and the **plan**.
2. Add or update **`scripts/manual_testing/test_{feature}.py`**: **`BaseTestClient`**, **`Scenario`**, **`print_scenario_header`**, optional **`UTILITIES`**.
3. **`argparse`** + **`add_scenario_run_args(parser)`** + **`run_noninteractive_scenarios(args, SCENARIOS, client)`** before **`interactive_menu`** (reference **`scripts/manual_testing/test_company_metrics.py`**).
4. Update **`scripts/manual_testing/README.md`** table.
5. Run **`uv run python test_{feature}.py --all`** (or `--scenarios …`) when backend is up; fix script or env on failure.

Optional: **`uv run ruff check` / `ruff format`** on the script if your lint path includes `scripts/manual_testing`.

Stop after step 4 if **create-only**.

## Pre-work (before authoring)

1. Plan: endpoints, models, validation, internal routes, workers.
2. Framework rule: patterns, **`raw_request`** for error cases.
3. **`docker-compose.yml`**: ports; optional services (e.g. Redis for some alerts).
4. Document required vs optional deps in the script docstring.

## Script template

Output: **`scripts/manual_testing/test_{feature}.py`** — must include CLI so agents never need the menu.

```python
import argparse
import asyncio
import sys

from framework import (
    BaseTestClient,
    Scenario,
    add_scenario_run_args,
    console,
    run_noninteractive_scenarios,
    success,
    error,
)
from framework.output import print_scenario_header
from framework.scenarios import interactive_menu
from framework.setup import setup_environment


class FeatureClient(BaseTestClient):
    async def create_feature(self, ...) -> dict:
        return await self.post(f"/companies/{self.company_id}/features", json={...})


async def scenario_1_basic_crud(client: FeatureClient) -> bool:
    print_scenario_header("Scenario 1: Basic CRUD", "Test create, read, update")
    return True


SCENARIOS = [
    Scenario("Basic CRUD", scenario_1_basic_crud, "Create, read, update"),
]

UTILITIES = [
    ("l", "List items", util_list),
]


if __name__ == "__main__":
    async def main() -> int:
        parser = argparse.ArgumentParser(description="...")
        add_scenario_run_args(parser)
        args = parser.parse_args()
        client = FeatureClient()
        if not await setup_environment(client, "Feature Test Company", create_thread=False):
            return 1
        exit_code = await run_noninteractive_scenarios(args, SCENARIOS, client)
        if exit_code is not None:
            return exit_code
        await interactive_menu(client, SCENARIOS, utilities=UTILITIES)
        return 0

    sys.exit(asyncio.run(main()))
```

## Scenario ordering (by complexity)

1. Basic CRUD
2. Validation (422, types)
3. Lifecycle / state
4. Filtering / list params
5. Edge cases (404, auth, idempotency)
6. Integration (workers, internal APIs)
7. Isolation (company / order / thread)

## Mindset

- Cover important plan endpoints and rules.
- **Fail gracefully**: `error()`, return `False`; no silent swallowing.
- Every new script: **`--all`** / **`--scenarios`** wired.

## Framework entry points

- **`parse_scenario_spec`**, **`add_scenario_run_args`**, **`run_noninteractive_scenarios`**, **`run_scenarios_at_indices`**, **`interactive_menu`** — `framework.scenarios` (re-exported from **`framework`**).
- Programmatic: `parse_scenario_spec("1,4-6", count=len(SCENARIOS))` then **`run_scenarios_at_indices`** without argparse.
- **Docs**: **`scripts/manual_testing/README.md`**, **`scripts/manual_testing/.cursor/rules/manual-testing.mdc`**
- **Examples**: **`test_company_metrics.py`** (CLI + menu), **`test_tasks.py`** (menu-heavy)

## Anti-patterns

- New manual scripts without non-interactive flags.
- Treating **`uv run --package backend pytest`** as a substitute for these HTTP scenarios.
