/**
 * Health Check Endpoint for Render
 * Used for deployment health monitoring
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
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
    const dbUrl = process.env.DATABASE_URL || 'NOT SET';
    const parsed = dbUrl !== 'NOT SET' ? (() => {
      try {
        const u = new URL(dbUrl);
        return { protocol: u.protocol, host: u.hostname, port: u.port, database: u.pathname.slice(1), user: u.username };
      } catch { return 'INVALID_URL'; }
    })() : null;

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        dbConfig: parsed,
      },
      { status: 503 }
    );
  }
}
