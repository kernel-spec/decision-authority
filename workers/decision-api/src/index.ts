export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    const trace_id = crypto.randomUUID();
    const created_at = new Date().toISOString();

    try {
      await env.DB.prepare(
        `INSERT INTO decision_runs (id, created_at, decision_type, status, input_canonical_json, policy_version, engine_version, hash, trace_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          trace_id,
          created_at,
          "CFO_RUN",
          "PENDING",
          "{}",
          env.POLICY_VERSION,
          env.ENGINE_VERSION,
          "",
          trace_id
        )
        .run();
    } catch (err) {
      console.error("decision_runs insert failed", err);
      return new Response(JSON.stringify({ error: "DB write failed" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ trace_id }), {
      headers: { "content-type": "application/json" },
    });
  },
};

export interface Env {
  ENV: string;
  POLICY_VERSION: string;
  ENGINE_VERSION: string;
  REQUIRE_TRIGGERS: string;
  REQUIRE_GATING: string;
  DB: D1Database;
  R2: R2Bucket;
}
