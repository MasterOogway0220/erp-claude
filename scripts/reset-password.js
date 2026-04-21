/**
 * Emergency password reset script.
 * Usage: node scripts/reset-password.js <email> <newPassword>
 * Example: node scripts/reset-password.js admin@npipe.com MyNewPass@123
 */

const bcrypt = require("bcryptjs");
const { execSync } = require("child_process");

const [, , email, newPassword] = process.argv;

if (!email || !newPassword) {
  console.error("Usage: node scripts/reset-password.js <email> <newPassword>");
  process.exit(1);
}

if (newPassword.length < 6) {
  console.error("Password must be at least 6 characters");
  process.exit(1);
}

// Load DATABASE_URL from .env
require("dotenv").config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not found. Make sure .env exists.");
  process.exit(1);
}

async function main() {
  const { PrismaClient } = require("@prisma/client");
  const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

  const url = new URL(process.env.DATABASE_URL);
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? parseInt(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    connectionLimit: 5,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, isActive: true },
    });

    if (!user) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { email }, data: { passwordHash: hash } });

    console.log(`✓ Password reset for: ${user.name} (${email})`);
    console.log(`✓ New password: ${newPassword}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
