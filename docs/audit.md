# Audit — Decision Authority

Tento soubor dokumentuje auditní příkazy, výstupy a mapu důkazů použitou při tvorbě [Repo Intelligence Report](../README.md).

---

## Audit Commands Run

```bash
# 1) Struktura repozitáře
find . -not -path './.git/*' -type f | sort

# 2) Entry points / run commands
rg -n "main|bin|entry|start|dev|serve|wrangler|test|typecheck" \
  workers/decision-api/package.json workers/admin-api/package.json \
  workers/decision-api/wrangler.toml workers/admin-api/wrangler.toml \
  .github/workflows/ci.yml .github/workflows/deploy.yml

# 3) Cloudflare Worker fetch handlers
rg -n "export default|addEventListener|async fetch" workers/ -S

# 4) HTTP routing (admin-api)
rg -n "url\.pathname|req\.method|GET|POST|DELETE" workers/admin-api/src/routes.ts

# 5) Env / secrets usage
rg -n "env\." workers/decision-api/src/index.ts workers/admin-api/src/routes.ts workers/admin-api/src/index.ts

# 6) External calls (fetch, axios, SDK)
rg -n "fetch\(|axios\|requests\." workers/ -S

# 7) Auth checks
rg -n "ADMIN_KEY|Authorization|Bearer|X-ADMIN" workers/ -S

# 8) D1 / R2 usage
rg -n "env\.DB\.|env\.R2\." workers/ -S

# 9) Policy validate script
cat scripts/policy-validate.mjs

# 10) CI/CD deploy
rg -n "wrangler deploy|wrangler d1|gh release|CLOUDFLARE" .github/workflows/ -S

# 11) D1 schema
cat workers/decision-api/migrations/0001_init.sql
cat workers/decision-api/migrations/0002_admin.sql
cat workers/decision-api/migrations/0003_add_trace_id_mode.sql

# 12) wrangler bindings
cat workers/decision-api/wrangler.toml
cat workers/admin-api/wrangler.toml
```

---

## Audit Findings

### 1) Struktura repozitáře

Klíčové soubory (z `find`):

```
.github/workflows/ci.yml
.github/workflows/deploy.yml
.github/workflows/release.yml
workers/decision-api/src/index.ts          ← hlavní Worker
workers/decision-api/src/index.test.ts     ← unit testy
workers/admin-api/src/index.ts             ← admin Worker entry
workers/admin-api/src/routes.ts            ← všechny admin routy
workers/decision-api/wrangler.toml         ← CF bindingy, env vars
workers/admin-api/wrangler.toml
scripts/policy-validate.mjs                ← CI policy check
policy/canonicalization/v1.json
policy/fail_closed_mapping/v1.json
policy/conformance_checklist/v1.json
static-site/index.html                     ← Ops Control Center SPA
docs/index/vsf-TEST-CFO-001.md             ← příklad reálného runu
```

### 2) Entry points

Z `workers/decision-api/package.json`:
```json
"scripts": {
  "typecheck": "tsc -p tsconfig.json --noEmit",
  "test": "node --import tsx/esm --test src/index.test.ts"
}
```
Z `workers/admin-api/package.json`:
```json
"scripts": {
  "typecheck": "tsc -p tsconfig.json --noEmit",
  "test": "node --test"
}
```
Z `workers/decision-api/wrangler.toml`: `main = "src/index.ts"`, `compatibility_date = "2026-02-22"`

### 3) Cloudflare Worker fetch handlers

`workers/decision-api/src/index.ts`:
```ts
export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) { ... }
};
```
`workers/admin-api/src/index.ts`:
```ts
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return Router.handle(request, env, ctx);
  },
};
```

### 4) HTTP routing (admin-api)

`workers/admin-api/src/routes.ts`:
```
url.pathname.startsWith("/admin/")        → auth gate (X-ADMIN-KEY)
GET  /admin/health                        → { ok, ts }
GET  /admin/runs                          → D1 SELECT + limit param
POST /admin/retention/purge               → stub { ok: true }
POST /admin/policy/promote                → stub { ok: true }
fallthrough                               → 404
```

### 5) Env / secrets usage

`workers/decision-api/src/index.ts`:
```ts
env.POLICY_VERSION   // řádek ~14
env.ENGINE_VERSION   // řádek ~15
env.DB               // D1 binding
env.R2               // R2 binding (interface only)
```
`workers/admin-api/src/routes.ts`:
```ts
env.ADMIN_KEY        // řádek ~8 — auth gate
env.DB               // D1 binding
```

### 6) External calls

Žádné přímé `fetch()` volání na externí služby v kódu Workers. Veškerá komunikace je přes Cloudflare bindingy (D1, R2).

### 7) Auth checks

`workers/admin-api/src/routes.ts` řádek ~7–9:
```ts
const key = req.headers.get("X-ADMIN-KEY");
if (!key || key !== env.ADMIN_KEY) return json({ error: "Unauthorized" }, 401);
```
`decision-api` — **žádná auth**. Veřejný endpoint.

### 8) D1 / R2 usage

`workers/decision-api/src/index.ts`:
```ts
env.DB.prepare(`INSERT INTO decision_runs ...`).bind(...).run()
```
R2 — binding definován v `wrangler.toml` a v `Env` interface, ale **žádný R2 zápis/čtení v kódu**.

`workers/admin-api/src/routes.ts`:
```ts
env.DB.prepare(`SELECT id, created_at, ... FROM decision_runs ORDER BY created_at DESC LIMIT ?`).bind(limit).all()
```

### 9) Policy validate

`scripts/policy-validate.mjs` kontroluje:
- existence souborů: `policy/canonicalization/v1.json`, `policy/fail_closed_mapping/v1.json`, `policy/conformance_checklist/v1.json`
- platnost JSON syntaxe
- `conformance_checklist` je objekt
- Exit 1 při chybě, `[POLICY] OK` při úspěchu

### 10) CI/CD deploy

`.github/workflows/deploy.yml`:
```yaml
- run: npx wrangler d1 migrations apply decision_authority_stage --remote --env stage
- run: npx wrangler deploy --env stage
- run: npx wrangler deploy --env prod
```
Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

`.github/workflows/release.yml`:
```bash
gh release create "${{ github.ref_name }}" --title "..." --generate-notes
```
Secret: `GITHUB_TOKEN` (automatický)

### 11) D1 schema (souhrn)

**0001_init.sql** — tabulky: `decision_runs`, `artifacts`, `audit_events` + indexy  
**0002_admin.sql** — tabulky: `usage_ledger`, `system_state` + seed záznamy pro `active_policy_version`, `active_engine_version`  
**0003_add_trace_id_mode.sql** — ALTER TABLE: přidá `trace_id TEXT`, `mode TEXT` do `decision_runs` + index na `trace_id`

### 12) Cloudflare bindingy

`workers/decision-api/wrangler.toml`:
```
[env.stage] vars = { ENV, POLICY_VERSION, ENGINE_VERSION, REQUIRE_TRIGGERS, REQUIRE_GATING }
d1_databases: decision_authority_stage (id: cf1c8b23-...)
r2_buckets:   decision-authority-artifacts-stage
[env.prod]  vars = { ... }
d1_databases: decision_authority_prod (id: 48fabd29-...)
r2_buckets:   decision-authority-artifacts-prod
```

---

## Evidence Index

| Tvrzení | Soubor(y) | Sekce / řádky |
|---|---|---|
| decision-api je veřejný CF Worker bez auth | `workers/decision-api/src/index.ts` | celý soubor |
| admin-api vyžaduje X-ADMIN-KEY | `workers/admin-api/src/routes.ts` | řádky ~7–9 |
| ADMIN_KEY je CF Worker secret | `workers/admin-api/src/routes.ts` (env.ADMIN_KEY) | řádek ~8 |
| D1 databáze sdílena mezi Workers | `workers/decision-api/wrangler.toml`, `workers/admin-api/wrangler.toml` | stejné database_id |
| R2 binding existuje ale nevyužit | `workers/decision-api/wrangler.toml`, `workers/decision-api/src/index.ts` (Env interface) | — |
| Deploy na stage při push na main | `.github/workflows/deploy.yml` | job `deploy-stage`, condition `github.ref_type == 'branch'` |
| Deploy na prod při push tagu v* | `.github/workflows/deploy.yml` | job `deploy-prod`, condition `github.ref_type == 'tag'` |
| policy-validate v CI před testy | `.github/workflows/ci.yml` | job `policy-validate`, `needs: [policy-validate]` |
| Admin stuby bez implementace | `workers/admin-api/src/routes.ts` | `/retention/purge`, `/policy/promote` — `return json({ ok: true })` |
| Testy decision-api: 3 test cases | `workers/decision-api/src/index.test.ts` | happy path, DB failure, timing |
| Admin-api nemá testy | `workers/admin-api/` | žádný `*.test.ts` soubor |
| Static site ukládá jen URL do localStorage | `static-site/index.html` | JS sekce, `CFG_KEY`, `localStorage` |
| mode sloupec nevyplňován v decision-api | `workers/decision-api/src/index.ts` | INSERT bind — `mode` chybí |
| REQUIRE_TRIGGERS/REQUIRE_GATING nevynuceno | `workers/decision-api/src/index.ts` | proměnné v Env interface, ale nepoužity v logice |
| Custom GPT agenti definováni system prompty | `custom_gpt_system_prompts/*.system.txt` | 8 souborů |
| vsf-TEST-CFO-001 je ukázkový run | `docs/cfo_runs/vsf-TEST-CFO-001/`, `docs/index/vsf-TEST-CFO-001.md` | — |
