// Creates (or resets) the sandbox login, Akash. Every query from this login
// runs against the sbx_* table copies — see src/lib/sandbox/.
//
//   DATABASE_URL=... npx tsx prisma/seed-sandbox-user.ts
//
// SANDBOX_COMPANY_ID picks the company; it defaults to N-Pipe Solutions Inc.
// in production. Run the first sandbox copy AFTER this, so Akash's own User
// row exists in sbx_User (rows he creates reference him).
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";

const EMAIL = "akash.sandbox@demo.local";
const PASSWORD = "Akash@Sandbox#2026";
const COMPANY_ID = process.env.SANDBOX_COMPANY_ID ?? "cmmrs9ytr0001panemoxnq3gf";

const url = new URL(process.env.DATABASE_URL!);
const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? parseInt(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    connectionLimit: 1,
  }),
});

async function main() {
  const company = await prisma.companyMaster.findUnique({
    where: { id: COMPANY_ID },
    select: { id: true, companyName: true },
  });
  if (!company) throw new Error(`Company ${COMPANY_ID} not found — set SANDBOX_COMPANY_ID`);

  // Same hashing as api/admin/users (bcrypt, 10 rounds).
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const fields = { name: "Akash", role: "ADMIN" as const, companyId: company.id, isSandbox: true, isActive: true, passwordHash };
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: fields,
    create: { email: EMAIL, ...fields },
  });
  console.log(`Sandbox user ready: ${user.email} (${user.id}) in ${company.companyName}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
