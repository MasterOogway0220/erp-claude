/**
 * Production Seed Script
 * Automatically runs on Render deployment
 * Creates essential data: admin user, document sequences
 * Safe to run multiple times (idempotent)
 */

import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { hash } from 'bcryptjs';

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

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

    // 5. Warehouse Master
    const warehouses = [
      { code: 'WH-NM-01', name: 'Main Warehouse - Navi Mumbai', address: 'Plot No. 45, Navi Mumbai, Maharashtra - 400701' },
      { code: 'WH-JA-01', name: 'Jebel Ali Warehouse', address: 'Jebel Ali Free Zone, Dubai, UAE' },
    ];
    let whCreated = 0;
    for (const wh of warehouses) {
      const existing = await prisma.warehouseMaster.findUnique({ where: { code: wh.code } });
      if (!existing) {
        await prisma.warehouseMaster.create({ data: wh });
        whCreated++;
      }
    }
    console.log(`✅ Warehouses: ${whCreated} created, ${warehouses.length - whCreated} existing`);

    // 6. Transporter Master
    const transporters = [
      { name: 'V-Trans India Ltd', contactPerson: 'Mr. Verma', phone: '9876543210', vehicleTypes: 'Trailer, Flatbed' },
      { name: 'TCI Freight', contactPerson: 'Mr. Singh', phone: '9876543211', vehicleTypes: 'Trailer, Container' },
      { name: 'Gati Ltd', contactPerson: 'Mr. Gupta', phone: '9876543212', vehicleTypes: 'Trailer, Mini Truck' },
      { name: 'Blue Dart Express', contactPerson: 'Mr. Shah', phone: '9876543213', vehicleTypes: 'Courier, Van' },
      { name: 'DTDC Courier', contactPerson: 'Mr. Patel', phone: '9876543214', vehicleTypes: 'Courier' },
    ];
    let tpCreated = 0;
    for (const tp of transporters) {
      const existing = await prisma.transporterMaster.findFirst({ where: { name: tp.name } });
      if (!existing) {
        await prisma.transporterMaster.create({ data: tp });
        tpCreated++;
      }
    }
    console.log(`✅ Transporters: ${tpCreated} created, ${transporters.length - tpCreated} existing`);

    // 7. Employee Master
    const adminUser = await prisma.user.findUnique({ where: { email: 'admin@erp.com' } });
    const employees = [
      { employeeCode: 'EMP-001', name: 'System Administrator', department: 'Management', designation: 'Administrator', email: 'admin@erp.com', isActive: true, linkedUserId: adminUser?.id ?? undefined },
      { employeeCode: 'EMP-002', name: 'Sales Manager', department: 'Sales', designation: 'Sales Manager', email: 'sales@npspiping.com', isActive: true },
      { employeeCode: 'EMP-003', name: 'Purchase Manager', department: 'Purchase', designation: 'Purchase Manager', email: 'purchase@npspiping.com', isActive: true },
      { employeeCode: 'EMP-004', name: 'QC Manager', department: 'Quality', designation: 'QC Manager', email: 'qc@npspiping.com', isActive: true },
      { employeeCode: 'EMP-005', name: 'Accounts Manager', department: 'Accounts', designation: 'Accounts Manager', email: 'accounts@npspiping.com', isActive: true },
    ];
    let empCreated = 0;
    for (const emp of employees) {
      const existing = await prisma.employeeMaster.findUnique({ where: { employeeCode: emp.employeeCode } });
      if (!existing) {
        await prisma.employeeMaster.create({ data: emp });
        empCreated++;
      }
    }
    console.log(`✅ Employees: ${empCreated} created, ${employees.length - empCreated} existing`);

    // 8. Offer Term Templates (Domestic + Export)
    const domesticTerms = [
      { termName: 'Price', termDefaultValue: 'Ex-Godown, Navi Mumbai, India' },
      { termName: 'Delivery', termDefaultValue: 'As above FOR Site basis + QAP approval Period. LR date will be considered as the date of delivery.' },
      { termName: 'Payment', termDefaultValue: '100% within 30 days after receipt of materials.' },
      { termName: 'Offer validity', termDefaultValue: '1 week; further subject to our acceptance.' },
      { termName: 'Freight', termDefaultValue: 'Extra at actual / To your account' },
      { termName: 'TPI & Testing', termDefaultValue: 'Inclusive (Testing as per HMEL Standard ITP: 9112-000-INP-614-008, REV. 01)' },
      { termName: 'P & F charges', termDefaultValue: 'NIL' },
      { termName: 'Insurance', termDefaultValue: 'To your account. Dispatch details will be shared immediately after dispatch.' },
      { termName: 'GST', termDefaultValue: '18% GST extra' },
      { termName: 'Certification', termDefaultValue: 'MTC as per EN 10204 - 3.1' },
      { termName: 'Material origin', termDefaultValue: 'EIL Approved Mill' },
      { termName: 'Quantity tolerance', termDefaultValue: '-0/+1 R/L of 5 to 7 mtrs' },
      { termName: 'Part orders', termDefaultValue: 'Acceptable, subject to reconfirmation' },
      { termName: 'LD Clause', termDefaultValue: 'Acceptable, 0.5% per week, maximum 5%' },
    ];
    const exportTerms = [
      { termName: 'Currency', termDefaultValue: 'USD ($)' },
      { termName: 'Price', termDefaultValue: 'Ex-work, Mumbai, India/ Jebel Ali, UAE' },
      { termName: 'Delivery', termDefaultValue: 'As above, ex-works, after receipt of PO' },
      { termName: 'Payment', termDefaultValue: '100% within 30 Days from date of dispatch' },
      { termName: 'Offer validity', termDefaultValue: '6 Days, subject to stock remain unsold' },
      { termName: 'Packing', termDefaultValue: 'Inclusive' },
      { termName: 'Freight', termDefaultValue: 'Extra at actual / To your account' },
      { termName: 'Insurance', termDefaultValue: 'Extra at actual / To your account' },
      { termName: 'Certification', termDefaultValue: 'Not Applicable' },
      { termName: 'T/T charges', termDefaultValue: 'To your account, Full Invoice amount to be remitted. No deduction of T/T charges acceptable.' },
      { termName: 'Third Party Inspection', termDefaultValue: 'Not Applicable' },
      { termName: 'Material origin', termDefaultValue: 'International' },
      { termName: 'Qty. Tolerance', termDefaultValue: 'Not Applicable' },
      { termName: 'Dimension Tolerance', termDefaultValue: 'Not Applicable' },
      { termName: 'Part orders', termDefaultValue: 'Not Applicable' },
    ];

    // Check if any terms already exist to avoid duplicates
    const existingTermsCount = await prisma.offerTermTemplate.count();
    if (existingTermsCount === 0) {
      for (let i = 0; i < domesticTerms.length; i++) {
        await prisma.offerTermTemplate.create({
          data: { ...domesticTerms[i], sortOrder: i + 1, quotationType: 'DOMESTIC', isActive: true },
        });
      }
      for (let i = 0; i < exportTerms.length; i++) {
        await prisma.offerTermTemplate.create({
          data: { ...exportTerms[i], sortOrder: i + 1, quotationType: 'EXPORT', isActive: true },
        });
      }
      console.log(`✅ Offer Terms: ${domesticTerms.length} domestic + ${exportTerms.length} export created`);
    } else {
      console.log(`ℹ️  Offer Terms: ${existingTermsCount} already exist, skipping`);
    }

    // 10. Summary
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
