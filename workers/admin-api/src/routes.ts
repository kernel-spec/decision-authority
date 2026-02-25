import type { Env } from "./index";

export const Router = {
  async handle(req: Request, env: Env, _ctx?: ExecutionContext) {
    const url = new URL(req.url);

    // --- Auth gate for /admin/*
    if (url.pathname.startsWith("/admin/")) {
      const key = req.headers.get("X-ADMIN-KEY");
      // do NOT log secrets
      if (!key || key !== env.ADMIN_KEY) return json({ error: "Unauthorized" }, 401);
    }

    // --- Health
    if (req.method === "GET" && url.pathname === "/admin/health") {
      return json({ ok: true, ts: new Date().toISOString() });
    }

    // --- List runs (D1)
    if (req.method === "GET" && url.pathname === "/admin/runs") {
      const limit = clampInt(url.searchParams.get("limit"), 50, 1, 200);

      // We expect decision-api writes into decision_runs
      // Columns commonly present: id, created_at, decision_type, status, input_canonical_json,
      // policy_version, engine_version, hash, trace_id, mode (after migration 0003).
      const stmt = env.DB.prepare(`
        SELECT
          id,
          created_at,
          decision_type,
          status,
          trace_id,
          mode,
          policy_version,
          engine_version,
          hash
        FROM decision_runs
        ORDER BY created_at DESC
        LIMIT ?
      `).bind(limit);

      const res = await stmt.all();

      const rows = (res?.results ?? []) as Array<Record<string, unknown>>;
      const newest = rows[0]?.created_at as string | undefined;

      // Safe debug logs (no secrets, no payload bodies)
      console.log(
        `[admin-api] listRuns limit=${limit} count=${rows.length} newest_created_at=${newest ?? "N/A"}`
      );

      return json({
        rows,
        count: rows.length,
        newest_created_at: newest ?? null,
      });
    }

    // --- Other admin endpoints (stubs for now)
    if (req.method === "POST" && url.pathname === "/admin/retention/purge") {
      return json({ ok: true });
    }

    if (req.method === "POST" && url.pathname === "/admin/policy/promote") {
      return json({ ok: true });
    }

    return json({ error: "Not found" }, 404);
  },
};

function clampInt(raw: string | null, fallback: number, min: number, max: number) {
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });
}