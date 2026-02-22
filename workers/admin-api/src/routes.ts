import type { Env } from "./index";

export const Router = {
  async handle(req: Request, env: Env) {
    const url = new URL(req.url);

    if (url.pathname.startsWith("/admin/")) {
      const key = req.headers.get("X-ADMIN-KEY");
      if (!key || key !== env.ADMIN_KEY) return json({ error: "Unauthorized" }, 401);
    }

    if (req.method === "GET" && url.pathname === "/admin/health") {
      return json({ ok: true, ts: new Date().toISOString() });
    }

    if (req.method === "GET" && url.pathname === "/admin/runs") {
      return json({ rows: [] });
    }

    if (req.method === "POST" && url.pathname === "/admin/retention/purge") {
      return json({ ok: true });
    }

    if (req.method === "POST" && url.pathname === "/admin/policy/promote") {
      return json({ ok: true });
    }

    return json({ error: "Not found" }, 404);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json" }
  });
}
