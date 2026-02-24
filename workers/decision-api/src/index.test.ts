import { test } from "node:test";
import assert from "node:assert/strict";

// Minimal stub types for the test environment
interface MockEnv {
  ENV: string;
  POLICY_VERSION: string;
  ENGINE_VERSION: string;
  REQUIRE_TRIGGERS: string;
  REQUIRE_GATING: string;
  DB: {
    prepare: (sql: string) => {
      bind: (...args: unknown[]) => {
        run: () => Promise<void>;
      };
    };
  };
  R2: object;
}

function makeEnv(overrides: Partial<MockEnv["DB"]> = {}): MockEnv {
  return {
    ENV: "test",
    POLICY_VERSION: "v1",
    ENGINE_VERSION: "v0.1.0",
    REQUIRE_TRIGGERS: "true",
    REQUIRE_GATING: "true",
    R2: {},
    DB: {
      prepare: () => ({
        bind: () => ({
          run: async () => {},
        }),
      }),
      ...overrides,
    },
  };
}

// Import the worker handler dynamically so we can use the real implementation
// We test the logic by calling the fetch handler directly.
import worker from "./index.ts";

const ctx = {} as ExecutionContext;

test("returns trace_id after successful DB insert", async () => {
  const env = makeEnv();
  const request = new Request("https://example.com/decide");
  const response = await worker.fetch(request, env as never, ctx);
  assert.equal(response.status, 200);
  const body = await response.json() as { trace_id?: string };
  assert.ok(typeof body.trace_id === "string" && body.trace_id.length > 0,
    "trace_id should be a non-empty string");
});

test("returns 500 when DB write fails", async () => {
  const env = makeEnv({
    prepare: () => ({
      bind: () => ({
        run: async () => { throw new Error("D1 write error"); },
      }),
    }),
  });
  const request = new Request("https://example.com/decide");
  const response = await worker.fetch(request, env as never, ctx);
  assert.equal(response.status, 500);
  const body = await response.json() as { error?: string };
  assert.equal(body.error, "DB write failed");
});

test("does not return trace_id before DB insert completes", async () => {
  let insertCalled = false;
  let resolveInsert!: () => void;
  const insertPromise = new Promise<void>((resolve) => { resolveInsert = resolve; });

  const env = makeEnv({
    prepare: () => ({
      bind: () => ({
        run: async () => {
          insertCalled = true;
          await insertPromise;
        },
      }),
    }),
  });

  const request = new Request("https://example.com/decide");
  const fetchPromise = worker.fetch(request, env as never, ctx);

  // Before insert resolves, response should not be available yet
  const raceResult = await Promise.race([
    fetchPromise.then(() => "resolved"),
    new Promise<string>((res) => setTimeout(() => res("pending"), 10)),
  ]);
  assert.equal(raceResult, "pending", "response should not arrive before insert completes");
  assert.ok(insertCalled, "insert should have been called");

  // Now resolve the insert
  resolveInsert();
  const response = await fetchPromise;
  assert.equal(response.status, 200);
  const body = await response.json() as { trace_id?: string };
  assert.ok(typeof body.trace_id === "string");
});
