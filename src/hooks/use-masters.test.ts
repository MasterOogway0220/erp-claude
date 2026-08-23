import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Guards the master cache keys.
 *
 * Two different query keys pointing at one URL is the failure this prevents.
 * It does not throw and it does not show up in review: both keys fetch, so the
 * same list is requested twice, and a write that invalidates one key leaves the
 * other serving stale rows until its window expires. The symptom is "I added a
 * vendor and it is missing from that other dropdown", which reads like a
 * backend bug and is not one.
 *
 * Three of these were introduced in one sitting while adding hooks — `["tax"]`
 * against an existing `["tax-rates"]`, `["company"]` against `["companies"]`,
 * `["units"]` against `["units-master"]` — which is why this is a test and not
 * a convention.
 */

const files = execSync('find src -name "*.tsx" -o -name "*.ts"', {
  encoding: "utf8",
})
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((f) => !f.endsWith("use-masters.test.ts"));

/** endpoint -> Map(key -> Set(files)) */
function collectKeys() {
  const byEndpoint = new Map<string, Map<string, Set<string>>>();
  const re =
    /use(?:Reference|Api)Query<[\s\S]{0,400}?>\(\s*(\[[^\]]*\])\s*,\s*["'`](\/api\/masters\/[a-z-]+)["'`]/g;

  for (const file of files) {
    const src = readFileSync(file, "utf8").split("\r\n").join("\n");
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      const key = m[1].replace(/\s+/g, " ").trim();
      const ep = m[2];
      if (!byEndpoint.has(ep)) byEndpoint.set(ep, new Map());
      const km = byEndpoint.get(ep)!;
      if (!km.has(key)) km.set(key, new Set());
      km.get(key)!.add(file);
    }
  }
  return byEndpoint;
}

/**
 * Top-level keys of every `NextResponse.json({...})` body in a route.
 *
 * Brace-balanced rather than regex-bounded: a body like
 * `{ products, pagination: { total, page } }` nests, and a lazy `\}` stops at
 * the inner one. Shorthand keys carry no trailing comma or colon
 * (`NextResponse.json({ deliveryTerms })`), so keys are read as identifiers at
 * depth 0 rather than as `name:` pairs.
 */
function topLevelKeysOfJsonBodies(src: string): Set<string> {
  const keys = new Set<string>();
  const marker = "NextResponse.json(";

  for (let i = src.indexOf(marker); i !== -1; i = src.indexOf(marker, i + 1)) {
    const open = src.indexOf("{", i);
    if (open === -1 || open > i + marker.length + 2) continue; // not an object literal

    let depth = 0;
    let end = -1;
    for (let j = open; j < src.length; j++) {
      if (src[j] === "{") depth++;
      else if (src[j] === "}") {
        depth--;
        if (depth === 0) {
          end = j;
          break;
        }
      }
    }
    if (end === -1) continue;

    const body = src.slice(open + 1, end);
    let d = 0;
    let cur = "";
    const entries: string[] = [];
    for (const ch of body) {
      if (ch === "{" || ch === "[" || ch === "(") d++;
      if (ch === "}" || ch === "]" || ch === ")") d--;
      if (ch === "," && d === 0) {
        entries.push(cur);
        cur = "";
      } else cur += ch;
    }
    entries.push(cur);

    for (const e of entries) {
      const m = e.trim().match(/^(\w+)/);
      if (m) keys.add(m[1]);
    }
  }
  return keys;
}

describe("master cache keys", () => {
  it("uses exactly one query key per master endpoint", () => {
    const offenders: string[] = [];
    for (const [ep, km] of collectKeys()) {
      if (km.size <= 1) continue;
      const detail = [...km.entries()]
        .map(([k, fs_]) => `${k} (${[...fs_].join(", ")})`)
        .join("  vs  ");
      offenders.push(`${ep}: ${detail}`);
    }
    expect(offenders).toEqual([]);
  });

  it("points every master hook at a route that exists", () => {
    const src = readFileSync("src/hooks/use-masters.ts", "utf8");
    const urls = [...src.matchAll(/["'`](\/api\/masters\/[a-z-]+)["'`]/g)].map(
      (m) => m[1]
    );
    expect(urls.length).toBeGreaterThan(0);

    const missing = urls.filter((u) => {
      const path = `src/app${u}/route.ts`;
      try {
        readFileSync(path);
        return false;
      } catch {
        return true;
      }
    });
    expect(missing).toEqual([]);
  });

  it("unwraps the key each route actually returns", () => {
    // `/api/masters/industry-segments` returns `segments`, `/tax` returns
    // `taxRates`, `/customer-contacts` returns a bare array. Reading the key
    // the endpoint name suggests yields an empty dropdown and no error, so
    // each hook's unwrap is checked against its route's response shape.
    const hooks = readFileSync("src/hooks/use-masters.ts", "utf8")
      .split("\r\n")
      .join("\n");

    // useXQuery<{ KEY: T[] }>(\n  [key],\n  "/api/masters/ep"
    const re =
      /useReferenceQuery<\{\s*(\w+):[\s\S]{0,200}?\}>\(\s*\[[^\]]*\]\s*,\s*["'`](\/api\/masters\/[a-z-]+)["'`]/g;

    const mismatches: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(hooks))) {
      const [, unwrapKey, url] = m;
      const routeSrc = readFileSync(`src/app${url}/route.ts`, "utf8");
      const returned = topLevelKeysOfJsonBodies(routeSrc);
      if (!returned.has(unwrapKey)) {
        mismatches.push(
          `${url} -> hook reads "${unwrapKey}", route returns [${[...returned].join(", ")}]`
        );
      }
    }
    expect(mismatches).toEqual([]);
  });
});
