import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

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
  // 1. Find or create the test company
  let testCompany = await prisma.companyMaster.findFirst({
    where: { companyName: "NPS Test Environment" },
  });

  if (testCompany) {
    console.log(`Test company already exists (${testCompany.id})`);
  } else {
    testCompany = await prisma.companyMaster.create({
      data: {
        companyName: "NPS Test Environment",
        companyType: "Trading",
        regAddressLine1: "Test Office, Plot No. 1",
        regCity: "Navi Mumbai",
        regPincode: "400701",
        regState: "Maharashtra",
        regCountry: "India",
        whAddressLine1: "Test Warehouse, Plot No. 1",
        whCity: "Navi Mumbai",
        whPincode: "400701",
        whState: "Maharashtra",
        whCountry: "India",
        email: "test@npspiping.com",
        fyStartMonth: 4,
      },
    });
    console.log(`Created test company: ${testCompany.id}`);
  }

  // 2. Seed document sequences for the test company if not already present
  const existingSeq = await prisma.documentSequence.findFirst({
    where: { companyId: testCompany.id },
  });

  if (!existingSeq) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const fy = (month >= 4 ? year : year - 1) % 100;
    const financialYear = fy.toString().padStart(2, "0");

    const sequences = [
      { documentType: "QUOTATION", prefix: "TST" },
      { documentType: "SALES_ORDER", prefix: "TSO" },
      { documentType: "PURCHASE_REQUISITION", prefix: "TPR" },
      { documentType: "PURCHASE_ORDER", prefix: "TPO" },
      { documentType: "GRN", prefix: "TGN" },
      { documentType: "INSPECTION", prefix: "TIR" },
      { documentType: "NCR", prefix: "TNC" },
      { documentType: "QC_RELEASE", prefix: "TQR" },
      { documentType: "PACKING_LIST", prefix: "TPL" },
      { documentType: "DISPATCH_NOTE", prefix: "TDN" },
      { documentType: "INVOICE_DOMESTIC", prefix: "TIN" },
      { documentType: "INVOICE_EXPORT", prefix: "TEX" },
      { documentType: "RECEIPT", prefix: "TRC" },
      { documentType: "STOCK_ISSUE", prefix: "TIS" },
      { documentType: "CREDIT_NOTE", prefix: "TCN" },
      { documentType: "DEBIT_NOTE", prefix: "TDB" },
    ];

    for (const s of sequences) {
      await prisma.documentSequence.create({
        data: { ...s, currentNumber: 0, financialYear, resetMonth: 4, companyId: testCompany.id },
      });
    }
    console.log("  Seeded document sequences for test company");
  }

  // 3. Seed a test customer if not present
  const existingCustomer = await prisma.customerMaster.findFirst({
    where: { companyId: testCompany.id },
  });
  if (!existingCustomer) {
    await prisma.customerMaster.create({
      data: {
        name: "Test Customer Ltd",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        companyId: testCompany.id,
      },
    });
    console.log("  Seeded test customer");
  }

  // 4. Seed a test vendor if not present
  const existingVendor = await prisma.vendorMaster.findFirst({
    where: { companyId: testCompany.id },
  });
  if (!existingVendor) {
    await prisma.vendorMaster.create({
      data: {
        name: "Test Vendor Pvt Ltd",
        city: "Pune",
        state: "Maharashtra",
        companyId: testCompany.id,
      },
    });
    console.log("  Seeded test vendor");
  }

  // 5. Move test user to the test company
  const testUser = await prisma.user.findUnique({
    where: { email: "testuser@erp.com" },
  });

  if (!testUser) {
    console.error("Test user (testuser@erp.com) not found. Run seed-test-user.ts first.");
    process.exit(1);
  }

  await prisma.user.update({
    where: { email: "testuser@erp.com" },
    data: { companyId: testCompany.id },
  });

  console.log("\nTest environment ready!");
  console.log("─".repeat(50));
  console.log(`  Test Company : NPS Test Environment`);
  console.log(`  Company ID   : ${testCompany.id}`);
  console.log(`  Test User    : testuser@erp.com`);
  console.log(`  Password     : Test@1234`);
  console.log(`  Role         : ADMIN`);
  console.log("─".repeat(50));
  console.log("All changes made by the test user are fully isolated");
  console.log("in the test company and will not affect real data.");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
