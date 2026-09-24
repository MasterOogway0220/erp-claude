import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import net from "node:net";

export const PORT = 3100;
export const BASE = `http://localhost:${PORT}`;

/** Starts `next dev` against the given database and waits until it answers. */
export async function startServer(env: Record<string, string>): Promise<ChildProcess> {
  const child = spawn("npx", ["next", "dev", "-p", String(PORT)], {
    env: { ...process.env, ...env },
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", (d) => process.env.E2E_VERBOSE && process.stdout.write(d));
  child.stderr?.on("data", (d) => process.env.E2E_VERBOSE && process.stderr.write(d));
  const deadline = Date.now() + 300_000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/api/auth/csrf`);
      if (r.ok) return child;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  child.kill();
  throw new Error("next dev did not start within 5 minutes");
}

export function stopServer(child: ChildProcess | undefined) {
  if (!child?.pid) return;
  // `shell: true` on Windows means the pid is the shell; kill the whole tree,
  // synchronously — vitest exits right after afterAll, and an async taskkill
  // left the dev server running and holding the port.
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
  else child.kill("SIGTERM");
}

/** A TCP listener standing in for SMTP. Anything that connects is counted. */
export function fakeSmtp(port: number): Promise<{ connections: () => number; close: () => void }> {
  let n = 0;
  const server = net.createServer((socket) => {
    n++;
    socket.end("554 e2e fake smtp: no mail accepted\r\n");
  });
  return new Promise((resolve) =>
    server.listen(port, "127.0.0.1", () => resolve({ connections: () => n, close: () => server.close() }))
  );
}

export type Api = (path: string, init?: RequestInit) => Promise<Response>;

/** Signs in through NextAuth's credentials flow; returns a fetch that carries the session cookie. */
export async function login(email: string, password: string): Promise<Api> {
  const jar = new Map<string, string>();
  const keep = (r: Response) => {
    for (const c of r.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      jar.set(pair.slice(0, i), pair.slice(i + 1));
    }
  };
  const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");

  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  keep(csrfRes);
  const { csrfToken } = await csrfRes.json();
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: cookie() },
    body: new URLSearchParams({ csrfToken, email, password, json: "true" }),
  });
  keep(res);
  if (![...jar.keys()].some((k) => k.includes("session-token"))) {
    throw new Error(`login failed for ${email}: HTTP ${res.status}`);
  }
  return (path, init = {}) =>
    fetch(`${BASE}${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...(init.headers ?? {}), cookie: cookie() },
    });
}
