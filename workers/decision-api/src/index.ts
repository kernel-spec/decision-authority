export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return new Response(JSON.stringify({ ok: true, service: "decision-api" }), { headers: { "content-type": "application/json" } });
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
