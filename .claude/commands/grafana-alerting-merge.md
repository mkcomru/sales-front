User ran `just grafana-alerting-export` (and optionally `just grafana-alerting-diff`). Goal: reconcile export into **canonical** `docker/observability/grafana/provisioning/alerting/` **with human approval**.

## Human-in-the-loop (required)

1. **Inspect** — Use `just grafana-alerting-diff` and/or read `grafana-alerting/*` vs canonical. Do **not** edit provisioning yet.
2. **Propose** — Output a **numbered list** of distinct change items. Each item = one logical decision (e.g. per file, or per rule/contact point), with a short **what / why** (plain language). Call out noise you recommend **skipping** (e.g. key order, empty `dashboardUid`/`panelId`) as separate “skip” bullets so the human can ignore them.
3. **Wait** — **Stop and wait** for the human. They approve by citing numbers: e.g. “apply 1, 4” or “all except 2” or “none”.
4. **Execute** — Only after that message: implement **exactly** the approved items under `docker/observability/grafana/provisioning/alerting/`. If something was not approved, do not do it.

## Rules while proposing and applying

- **Secrets**: `contact-points.yaml` must keep `bottoken: ${TELEGRAM_ALERT_BOT_TOKEN}` — never copy literals or `'[REDACTED]'`; describe non-token field changes as separate numbered items.
- **Bad exports**: JSON with `statusCode` / `notFound` → propose “remove from export script list” or “ignore”, not paste into provisioning.
- **Don’t** auto-merge everything; **don’t** treat `grafana-alerting/` as source of truth for secrets.

**Reference**: export endpoints in `scripts/grafana-alerting.sh` (`GRAFANA_ALERTING_EXPORTS`).
