/**
 * Health Check Endpoint for Render
 * Used for deployment health monitoring
 */

import { NextResponse } from 'next/server';
import { connect } from 'node:net';
import { createConnection } from 'mariadb';
import { prisma } from '@/lib/prisma';

function parsedDbUrl() {
  const dbUrl = process.env.DATABASE_URL || 'NOT SET';
  if (dbUrl === 'NOT SET') return null;
  try {
    const u = new URL(dbUrl);
    return { protocol: u.protocol, host: u.hostname, port: u.port, database: u.pathname.slice(1), user: u.username };
  } catch {
    return 'INVALID_URL' as const;
  }
}

/** Can we open a bare TCP socket to the database port? Separates "the network
 *  drops our packets" (firewall / IP ban) from "MySQL answered and said no". */
function tcpProbe(host: string, port: number, ms: number) {
  return new Promise<Record<string, unknown>>((resolve) => {
    const started = Date.now();
    const sock = connect({ host, port });
    const done = (result: Record<string, unknown>) => {
      sock.destroy();
      resolve({ ...result, ms: Date.now() - started });
    };
    sock.setTimeout(ms);
    sock.on('connect', () => done({ reachable: true }));
    sock.on('timeout', () => done({ reachable: false, error: 'TCP_TIMEOUT' }));
    sock.on('error', (e: NodeJS.ErrnoException) => done({ reachable: false, error: e.code ?? e.message }));
  });
}

/** What does the MySQL server itself say? "Host is blocked" / "Host is not
 *  allowed to connect" / "Access denied" are three different fixes. */
async function driverProbe(url: URL, ms: number) {
  const started = Date.now();
  try {
    const c = await createConnection({
      host: url.hostname,
      port: url.port ? parseInt(url.port) : 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.slice(1),
      connectTimeout: ms,
    });
    await c.end();
    return { connected: true, ms: Date.now() - started };
  } catch (e) {
    const err = e as { code?: string; errno?: number; message?: string };
    return {
      connected: false,
      ms: Date.now() - started,
      code: err.code,
      errno: err.errno,
      // The driver puts the server's own refusal text in here — that sentence
      // is the whole point of this probe, so it is not truncated away.
      message: err.message,
    };
  }
}

export async function GET(request: Request) {
  // ?deep=1 skips Prisma and reports why a connection cannot be opened. Prisma's
  // pool reports only "failed to retrieve a connection from pool after 15000ms",
  // which is the symptom, never the cause. Run separately rather than after the
  // pool timeout so the two budgets cannot add up past the function's limit.
  if (new URL(request.url).searchParams.has('deep')) {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 503 });
    const url = new URL(dbUrl);
    const port = url.port ? parseInt(url.port) : 3306;
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      dbConfig: parsedDbUrl(),
      tcp: await tcpProbe(url.hostname, port, 5000),
      driver: await driverProbe(url, 5000),
    });
  }

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      service: 'nps-erp',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        dbConfig: parsedDbUrl(),
      },
      { status: 503 }
    );
  }
}
