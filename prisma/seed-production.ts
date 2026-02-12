/**
 * Production Seed Script
 * Automatically runs on Render deployment
 * Creates essential data: admin user, document sequences
 * Safe to run multiple times (idempotent)
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Initialize Prisma with adapter (required for Prisma v7)
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedProduction() {
  console.log('🌱 Starting production seed...');

  try {
    // 1. Create Admin User (idempotent)
    const adminEmail = 'admin@erp.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      const hashedPassword = await hash(adminPassword, 10);
      await prisma.user.create({
        data: {
          name: 'System Administrator',
          email: adminEmail,
          passwordHash: hashedPassword,
          role: 'ADMIN',
          isActive: true,
        },
      });
      console.log('✅ Admin user created:', adminEmail);
      if (adminPassword === 'Admin@123') {
        console.log('⚠️  WARNING: Using default password. Set ADMIN_PASSWORD env var for security.');
      }
    } else {
      console.log('ℹ️  Admin user already exists:', adminEmail);
    }

    // 2. Create Document Sequences (idempotent)
    const sequences = [
      { documentType: 'ENQUIRY', prefix: 'ENQ', financialYear: '25' },
      { documentType: 'QUOTATION', prefix: 'QT', financialYear: '25' },
      { documentType: 'SALES_ORDER', prefix: 'SO', financialYear: '25' },
      { documentType: 'PURCHASE_REQUISITION', prefix: 'PR', financialYear: '25' },
      { documentType: 'PURCHASE_ORDER', prefix: 'PO', financialYear: '25' },
      { documentType: 'GOODS_RECEIPT_NOTE', prefix: 'GRN', financialYear: '25' },
      { documentType: 'INSPECTION', prefix: 'INS', financialYear: '25' },
      { documentType: 'NCR', prefix: 'NCR', financialYear: '25' },
      { documentType: 'PACKING_LIST', prefix: 'PL', financialYear: '25' },
      { documentType: 'DISPATCH_NOTE', prefix: 'DN', financialYear: '25' },
      { documentType: 'INVOICE', prefix: 'INV', financialYear: '25' },
      { documentType: 'PAYMENT_RECEIPT', prefix: 'PR', financialYear: '25' },
      { documentType: 'LAB_LETTER', prefix: 'LL', financialYear: '25' },
    ];

    let sequencesCreated = 0;
    let sequencesExisting = 0;

    for (const seq of sequences) {
      const existing = await prisma.documentSequence.findUnique({
        where: { documentType: seq.documentType },
      });

      if (!existing) {
        await prisma.documentSequence.create({
          data: {
            documentType: seq.documentType,
            prefix: seq.prefix,
            currentNumber: 0,
            financialYear: seq.financialYear,
            resetMonth: 4, // April (Indian FY)
          },
        });
        sequencesCreated++;
      } else {
        sequencesExisting++;
      }
    }

    console.log(`✅ Document sequences: ${sequencesCreated} created, ${sequencesExisting} existing`);

    // 3. Create Company Master (idempotent)
    const existingCompany = await prisma.companyMaster.findFirst();
    if (!existingCompany) {
      await prisma.companyMaster.create({
        data: {
          companyName: 'NPS Piping Solutions',
          companyType: 'Trading',
          regAddressLine1: 'Office No. 123, Trade Center',
          regCity: 'Navi Mumbai',
          regPincode: '400701',
          regState: 'Maharashtra',
          regCountry: 'India',
          whAddressLine1: 'Warehouse, Plot No. 45',
          whCity: 'Navi Mumbai',
          whPincode: '400701',
          whState: 'Maharashtra',
          whCountry: 'India',
          email: 'info@npspiping.com',
          fyStartMonth: 4,
        },
      });
      console.log('Company master created');
    } else {
      console.log('Company master already exists');
    }

    // 4. Create Financial Year for current FY (idempotent)
    const now = new Date();
    const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fyLabel = `${fyStartYear}-${(fyStartYear + 1) % 100}`;
    const existingFY = await prisma.financialYear.findUnique({
      where: { label: fyLabel },
    });
    if (!existingFY) {
      await prisma.financialYear.create({
        data: {
          label: fyLabel,
          startDate: new Date(`${fyStartYear}-04-01`),
          endDate: new Date(`${fyStartYear + 1}-03-31`),
          isActive: true,
        },
      });
      console.log(`Financial year ${fyLabel} created`);
    } else {
      console.log(`Financial year ${fyLabel} already exists`);
    }

    // 5. Summary
    console.log('\n✅ Production seed completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Admin Email:', adminEmail);
    console.log('🔑 Admin Password:', adminPassword === 'Admin@123' ? 'Admin@123 (default)' : '****** (custom)');
    console.log('📋 Document Sequences:', sequences.length);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  IMPORTANT: Change admin password after first login!');
    console.log('\n🚀 Application ready for use!\n');

  } catch (error) {
    console.error('❌ Production seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seed
seedProduction()
  .then(() => {
    console.log('✅ Seed script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed script failed:', error);
    process.exit(1);
  });
