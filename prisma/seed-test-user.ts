import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";

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
  const company = await prisma.companyMaster.findFirst({
    select: { id: true, companyName: true },
  });

  if (!company) {
    console.error("No company found. Run the main seed first.");
    process.exit(1);
  }

  console.log(`Using company: ${company.companyName} (${company.id})`);

  const email = "testuser@erp.com";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists — skipping creation.`);
    console.log("\nCredentials:");
    console.log(`  Email   : ${email}`);
    console.log(`  Password: Test@1234`);
    console.log(`  Role    : ${existing.role}`);
    return;
  }

  const passwordHash = await bcrypt.hash("Test@1234", 10);

  const user = await prisma.user.create({
    data: {
      email,
      name: "Test User",
      passwordHash,
      role: "ADMIN",
      isActive: true,
      companyId: company.id,
    },
  });

  console.log("\nTest user created successfully!");
  console.log("─".repeat(40));
  console.log(`  Name    : ${user.name}`);
  console.log(`  Email   : ${user.email}`);
  console.log(`  Password: Test@1234`);
  console.log(`  Role    : ${user.role}`);
  console.log(`  Company : ${company.companyName}`);
  console.log("─".repeat(40));
  console.log("This user has full access to all modules and master data.");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
