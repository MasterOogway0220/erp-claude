// Read-only diagnostic: DB health + all login/audit activity in the last N hours.
// Run: source .env && export DATABASE_URL && npx tsx scripts/check-recent-logins.ts

import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const HOURS = 10;

const url = new URL(process.env.DATABASE_URL!);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: url.port ? parseInt(url.port) : 3306,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  connectionLimit: 2,
});

const prisma = new PrismaClient({ adapter });
const since = new Date(Date.now() - HOURS * 60 * 60 * 1000);

async function main() {
  console.log(`Window: last ${HOURS}h (since ${since.toISOString()} UTC)\n`);

  // --- server health ---
  const t0 = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  console.log(`SELECT 1 round trip: ${Date.now() - t0}ms`);
  try {
    const status = await prisma.$queryRawUnsafe<{ Variable_name: string; Value: string }[]>(
      `SHOW GLOBAL STATUS WHERE Variable_name IN
       ('Threads_connected','Max_used_connections','Aborted_connects','Aborted_clients','Uptime','Connections')`
    );
    for (const s of status) {
      let extra = "";
      if (s.Variable_name === "Uptime") {
        const h = (parseInt(s.Value) / 3600).toFixed(1);
        extra = ` (~${h}h since MySQL last restarted)`;
      }
      console.log(`  ${s.Variable_name}: ${s.Value}${extra}`);
    }
  } catch (e) {
    console.log("  SHOW GLOBAL STATUS not permitted on this shared host:", (e as Error).message.split("\n")[0]);
  }

  // --- logins in window ---
  const logins = await prisma.auditLog.findMany({
    where: { action: "LOGIN", timestamp: { gte: since } },
    orderBy: { timestamp: "desc" },
    select: { timestamp: true, ipAddress: true, user: { select: { email: true } } },
  });
  console.log(`\nSuccessful logins in window: ${logins.length}`);
  for (const l of logins)
    console.log(" ", l.timestamp.toISOString(), l.ipAddress ?? "", l.user?.email ?? "?");

  // --- all audit activity in window, grouped ---
  const activity = await prisma.auditLog.groupBy({
    by: ["action", "tableName"],
    where: { timestamp: { gte: since } },
    _count: true,
  });
  console.log("\nAll audit activity in window (action × table):");
  for (const a of activity.sort((x, y) => y._count - x._count))
    console.log(`  ${String(a._count).padStart(4)}  ${a.action}  ${a.tableName}`);

  // --- most recent 40 audit rows, any action ---
  const recent = await prisma.auditLog.findMany({
    where: { timestamp: { gte: since } },
    orderBy: { timestamp: "desc" },
    take: 40,
    select: {
      timestamp: true, action: true, ipAddress: true, tableName: true, recordId: true,
      user: { select: { email: true } },
    },
  });
  console.log("\nMost recent 40 audit entries:");
  for (const r of recent)
    console.log(
      " ",
      r.timestamp.toISOString(),
      (r.user?.email ?? "?").padEnd(28),
      r.action,
      r.tableName,
      r.recordId,
      r.ipAddress ?? ""
    );

  // --- user accounts: state + anything touched recently ---
  const users = await prisma.user.findMany({
    orderBy: { lastLogin: "desc" },
    select: { email: true, lastLogin: true, isActive: true, updatedAt: true, createdAt: true, role: true },
  });
  console.log(`\nAll user accounts (${users.length}):`);
  for (const u of users) {
    const touched = u.updatedAt >= since ? "  << modified in window" : "";
    console.log(
      " ",
      (u.lastLogin ? u.lastLogin.toISOString() : "never logged in").padEnd(25),
      u.isActive ? "active  " : "INACTIVE",
      String(u.role).padEnd(12),
      u.email,
      touched
    );
  }
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
