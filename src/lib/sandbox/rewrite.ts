// Renames every real table in a SQL statement to its sandbox copy
// (`Quotation` -> `sbx_Quotation`). This is the whole isolation boundary for
// the sandbox login: the sandbox Prisma client sends nothing that has not
// been through toSandboxSql, and toSandboxSql refuses anything that still
// names a real table after renaming.

export const SANDBOX_PREFIX = "sbx_";

export class SandboxSqlError extends Error {
  constructor(reason: string, sql: string) {
    super(`[sandbox] refused SQL (${reason}): ${sql.slice(0, 200)}`);
    this.name = "SandboxSqlError";
  }
}

type Segment = { kind: "code" | "ident" | "string"; text: string; q?: string };

// Splits SQL into code, `backticked identifiers` and 'string' / "string"
// literals. Doubled quotes and backslash escapes stay inside their literal,
// matching MySQL's default (non-ANSI_QUOTES) lexing — production's sql_mode
// has no ANSI_QUOTES (checked 2026-09-24).
//
// Comments are refused rather than parsed: a quote inside one would open a
// phantom literal here and hide what follows, and MariaDB executes /*! */ and
// /*M! */ comments as SQL. Neither Prisma's generated SQL nor the app's raw
// SQL contains any.
function segments(sql: string): Segment[] {
  const out: Segment[] = [];
  let code = "";
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    if (c === "#" || (c === "-" && sql[i + 1] === "-") || (c === "/" && sql[i + 1] === "*")) {
      throw new SandboxSqlError("contains a comment", sql);
    }
    if (c === "`" || c === "'" || c === '"') {
      if (code) {
        out.push({ kind: "code", text: code });
        code = "";
      }
      let j = i + 1;
      let body = "";
      while (j < sql.length) {
        if (c !== "`" && sql[j] === "\\" && j + 1 < sql.length) {
          body += sql[j] + sql[j + 1];
          j += 2;
          continue;
        }
        if (sql[j] === c) {
          if (sql[j + 1] === c) {
            body += c + c;
            j += 2;
            continue;
          }
          break;
        }
        body += sql[j++];
      }
      out.push({ kind: c === "`" ? "ident" : "string", text: body, q: c });
      i = j + 1;
      continue;
    }
    code += c;
    i++;
  }
  if (code) out.push({ kind: "code", text: code });
  return out;
}

function join(segs: Segment[]): string {
  return segs
    .map((s) => (s.kind === "code" ? s.text : `${s.q}${s.text}${s.q}`))
    .join("");
}

const bareCache = new WeakMap<readonly string[], RegExp>();
function bareNames(tables: readonly string[]): RegExp {
  let re = bareCache.get(tables);
  if (!re) {
    // Longest first so QuotationItem is never matched as Quotation + "Item"
    // (the lookarounds would reject that anyway; this keeps it obvious).
    const alt = [...tables].sort((a, b) => b.length - a.length).join("|");
    re = new RegExp(`(?<![\\w$])(${alt})(?![\\w$])`, "g");
    bareCache.set(tables, re);
  }
  re.lastIndex = 0;
  return re;
}

/** The statement with every real table renamed to its sandbox copy. Throws SandboxSqlError if one survives. */
export function toSandboxSql(sql: string, tables: readonly string[]): string {
  const names = new Set(tables);
  const segs = segments(sql).map((s): Segment => {
    if (s.kind === "ident" && names.has(s.text)) return { ...s, text: SANDBOX_PREFIX + s.text };
    if (s.kind === "code") return { ...s, text: s.text.replace(bareNames(tables), `${SANDBOX_PREFIX}$1`) };
    return s;
  });
  const out = join(segs);
  assertNoRealTables(out, tables);
  return out;
}

/** Throws if the statement names any real table, backticked or bare (string literals excepted). */
export function assertNoRealTables(sql: string, tables: readonly string[]): void {
  const names = new Set(tables);
  for (const s of segments(sql)) {
    if (s.kind === "ident" && names.has(s.text)) throw new SandboxSqlError(`names real table ${s.text}`, sql);
    if (s.kind === "code") {
      const m = bareNames(tables).exec(s.text);
      if (m) throw new SandboxSqlError(`names real table ${m[1]}`, sql);
    }
  }
}
