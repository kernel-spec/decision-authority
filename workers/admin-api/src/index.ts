import { Router } from "./routes";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return Router.handle(request, env, ctx);
  },
};

export interface Env {
  ENV: string;
  ADMIN_KEY: string;
  DB: D1Database;
  R2: R2Bucket;
}
