import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";

const EMAIL = "admin@npipe.com";
const NEW_PASSWORD = "Npipe@123";

const url = new URL(process.env.DATABASE_URL!);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: url.port ? parseInt(url.port) : 3306,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  connectionLimit: 5,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: EMAIL },
    select: { id: true, name: true, role: true, isActive: true, companyId: true },
  });

  if (!existing) {
    console.log(`No user with email ${EMAIL} exists. Cannot reset.`);
    await prisma.$disconnect();
    process.exit(2);
  }

  console.log(`Found user: ${existing.name} (${existing.role}) isActive=${existing.isActive}`);

  const hash = await bcrypt.hash(NEW_PASSWORD, 10);
  await prisma.user.update({
    where: { email: EMAIL },
    data: { passwordHash: hash, isActive: true },
  });
  console.log(`Password reset to '${NEW_PASSWORD}'. isActive forced to true.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
