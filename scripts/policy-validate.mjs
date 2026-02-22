import fs from "node:fs";
import path from "node:path";

const requiredFiles = [
  "policy/canonicalization/v1.json",
  "policy/fail_closed_mapping/v1.json",
  "policy/conformance_checklist/v1.json",
];

function readJson(p) {
  const s = fs.readFileSync(p, "utf8");
  return JSON.parse(s);
}

let ok = true;

for (const rel of requiredFiles) {
  const p = path.resolve(process.cwd(), rel);
  if (!fs.existsSync(p)) {
    console.error(`[POLICY] Missing required file: ${rel}`);
    ok = false;
    continue;
  }
  try {
    readJson(p);
  } catch (e) {
    console.error(`[POLICY] Invalid JSON in: ${rel}`);
    console.error(e);
    ok = false;
  }
}

try {
  const cc = readJson(path.resolve("policy/conformance_checklist/v1.json"));
  if (!cc || typeof cc !== "object") throw new Error("conformance_checklist must be an object");
} catch (e) {
  console.error(`[POLICY] Conformance checklist semantic check failed`);
  console.error(e);
  ok = false;
}

if (!ok) process.exit(1);
console.log("[POLICY] OK");
