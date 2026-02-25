import { PrismaClient, PipeType, StockStatus, MTCType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";
import path from "path";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DOCUMENTS_DIR = path.join(__dirname, "..", "documents");

function readExcel(filename: string): Record<string, unknown>[] {
  const filePath = path.join(DOCUMENTS_DIR, filename);
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

function getVal(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    // Try exact match first
    if (row[key] !== undefined && row[key] !== "") return String(row[key]).trim();
    // Try matching with trimmed keys and normalized newlines
    for (const rowKey of Object.keys(row)) {
      const normalized = rowKey.replace(/\r\n/g, " ").replace(/\n/g, " ").trim();
      if (normalized === key || rowKey.trim() === key) {
        if (row[rowKey] !== undefined && row[rowKey] !== "") {
          return String(row[rowKey]).trim();
        }
      }
    }
  }
  return "";
}

function getNum(row: Record<string, unknown>, ...keys: string[]): number {
  const val = getVal(row, ...keys);
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
}

function excelDateToJS(serial: number | string): Date | null {
  const num = typeof serial === "string" ? parseFloat(serial) : serial;
  if (isNaN(num) || num === 0) return null;
  return new Date((num - 25569) * 86400000);
}

async function seedProductSpecs() {
  console.log("Seeding Product Spec Master...");
  const rows = readExcel("PRODUCT SPEC MASTER - 1.xlsx");
  let lastProduct = "";

  for (const row of rows) {
    const r = row as Record<string, unknown>;
    const product = getVal(r, "Product", "Product ") || lastProduct;
    if (product) lastProduct = product;

    await prisma.productSpecMaster.create({
      data: {
        product,
        material: getVal(r, "Material") || null,
        additionalSpec: getVal(r, "Additional Spec") || null,
        ends: getVal(r, "Ends") || null,
        length: getVal(r, "Length", "Length ") || null,
      },
    });
  }
  console.log(`  Inserted ${rows.length} product specs`);
}

async function seedPipeSizes() {
  console.log("Seeding Pipe Size Master (CS & AS)...");
  const csRows = readExcel("PIPES SIZE MASTER CS & AS PIPES.xlsx");
  for (const row of csRows) {
    const r = row as Record<string, unknown>;
    await prisma.pipeSizeMaster.create({
      data: {
        sizeLabel: getVal(r, "Size"),
        od: getNum(r, "OD (mm)", "OD\r\n(mm)", "OD (mm)"),
        wt: getNum(r, "W.T. (mm)", "W.T.\r\n(mm)", "W.T. (mm)"),
        weight: getNum(r, "Weight (kg/m)", "Weight\r\n(kg/m)", "Weight (kg/m)"),
        pipeType: PipeType.CS_AS,
      },
    });
  }
  console.log(`  Inserted ${csRows.length} CS/AS pipe sizes`);

  console.log("Seeding Pipe Size Master (SS & DS)...");
  const ssRows = readExcel("PIPES SIZE MASTER SS & DS PIPES.xlsx");
  for (const row of ssRows) {
    const r = row as Record<string, unknown>;
    await prisma.pipeSizeMaster.create({
      data: {
        sizeLabel: getVal(r, "Size"),
        od: getNum(r, "OD (mm)", "OD\r\n(mm)", "OD (mm)"),
        wt: getNum(r, "W.T. (mm)", "W.T.\r\n(mm)", "W.T. (mm)"),
        weight: getNum(r, "Weight (kg/m)", "Weight\r\n(kg/m)", "Weight (kg/m)"),
        pipeType: PipeType.SS_DS,
      },
    });
  }
  console.log(`  Inserted ${ssRows.length} SS/DS pipe sizes`);
}

async function seedTestingMaster() {
  console.log("Seeding Testing Master...");
  const rows = readExcel("TESTING MASTER FOR LAB LETTER.xlsx");
  for (const row of rows) {
    const r = row as Record<string, unknown>;
    const testName = getVal(r, "Testing to be performed");
    if (testName) {
      await prisma.testingMaster.create({
        data: {
          testName,
          applicableFor: "ALL",
          isMandatory: false,
        },
      });
    }
  }
  console.log(`  Inserted ${rows.length} testing types`);
}

async function seedTaxMaster() {
  console.log("Seeding Tax Master...");
  const taxes = [
    { name: "GST 5%", percentage: 5, taxType: "GST" },
    { name: "GST 12%", percentage: 12, taxType: "GST" },
    { name: "GST 18%", percentage: 18, taxType: "GST" },
    { name: "GST 28%", percentage: 28, taxType: "GST" },
    { name: "IGST 5%", percentage: 5, taxType: "IGST" },
    { name: "IGST 12%", percentage: 12, taxType: "IGST" },
    { name: "IGST 18%", percentage: 18, taxType: "IGST" },
    { name: "IGST 28%", percentage: 28, taxType: "IGST" },
    { name: "Export 0%", percentage: 0, taxType: "EXPORT" },
  ];
  for (const t of taxes) {
    await prisma.taxMaster.create({ data: t });
  }
  console.log(`  Inserted ${taxes.length} tax entries`);
}

async function seedCurrencyMaster() {
  console.log("Seeding Currency Master...");
  const currencies = [
    { code: "INR", name: "Indian Rupee", symbol: "\u20B9", exchangeRate: 1 },
    { code: "USD", name: "US Dollar", symbol: "$", exchangeRate: 83.5 },
    { code: "EUR", name: "Euro", symbol: "\u20AC", exchangeRate: 91.2 },
    { code: "AED", name: "UAE Dirham", symbol: "AED", exchangeRate: 22.73 },
  ];
  for (const c of currencies) {
    await prisma.currencyMaster.create({ data: c });
  }
  console.log(`  Inserted ${currencies.length} currencies`);
}

async function seedUomMaster() {
  console.log("Seeding UOM Master...");
  const uoms = [
    { code: "Mtr", name: "Meters" },
    { code: "Kg", name: "Kilograms" },
    { code: "MT", name: "Metric Tons" },
    { code: "Nos", name: "Numbers" },
    { code: "Pcs", name: "Pieces" },
    { code: "Ft", name: "Feet" },
    { code: "MM", name: "Millimeters" },
    { code: "In", name: "Inches" },
    { code: "Set", name: "Sets" },
    { code: "Lot", name: "Lots" },
    { code: "Bundle", name: "Bundles" },
  ];
  for (const u of uoms) {
    await prisma.uomMaster.create({ data: u });
  }
  console.log(`  Inserted ${uoms.length} UOMs`);
}

async function seedPaymentTerms() {
  console.log("Seeding Payment Terms...");
  const terms = [
    { name: "Net 30", description: "100% payment within 30 days", days: 30 },
    { name: "LC at Sight", description: "Letter of Credit at sight", days: 0 },
    { name: "100% Advance", description: "Full advance payment", days: 0 },
    { name: "50% Advance + 50% on Delivery", description: "Split payment", days: 15 },
    { name: "Net 60", description: "100% payment within 60 days", days: 60 },
    { name: "Net 90", description: "100% payment within 90 days", days: 90 },
  ];
  for (const t of terms) {
    await prisma.paymentTermsMaster.create({ data: t });
  }
  console.log(`  Inserted ${terms.length} payment terms`);
}

async function seedDeliveryTerms() {
  console.log("Seeding Delivery Terms...");
  const terms = [
    { name: "Ex-works Navi Mumbai", description: "Ex-works from Navi Mumbai warehouse" },
    { name: "Ex-works Jebel Ali", description: "Ex-works from Jebel Ali warehouse" },
    { name: "FOB", description: "Free on Board" },
    { name: "CIF", description: "Cost, Insurance and Freight" },
    { name: "CFR", description: "Cost and Freight" },
  ];
  for (const t of terms) {
    await prisma.deliveryTermsMaster.create({ data: t });
  }
  console.log(`  Inserted ${terms.length} delivery terms`);
}

async function seedInspectionAgencies() {
  console.log("Seeding Inspection Agencies...");
  const agencies = [
    { name: "Bureau Veritas Inspection Services", code: "BVIS" },
    { name: "TUV", code: "TUV" },
    { name: "Lloyds Register", code: "LLOYDS" },
    { name: "SGS", code: "SGS" },
    { name: "Bureau Veritas", code: "BV" },
  ];
  for (const a of agencies) {
    await prisma.inspectionAgencyMaster.create({ data: a });
  }
  console.log(`  Inserted ${agencies.length} inspection agencies`);
}

async function seedCertificationTypes() {
  console.log("Seeding Certification Types...");
  const types = [
    { name: "EN 10204 3.1", code: "EN_10204_3_1" },
    { name: "EN 10204 3.2", code: "EN_10204_3_2" },
  ];
  for (const t of types) {
    await prisma.certificationTypeMaster.create({ data: t });
  }
  console.log(`  Inserted ${types.length} certification types`);
}

async function seedDimensionalStandards() {
  console.log("Seeding Dimensional Standards...");
  const standards = [
    { name: "ASME B36.10", code: "ASME_B36_10" },
    { name: "ASME B36.19", code: "ASME_B36_19" },
  ];
  for (const s of standards) {
    await prisma.dimensionalStandardMaster.create({ data: s });
  }
  console.log(`  Inserted ${standards.length} dimensional standards`);
}

async function seedVendors() {
  console.log("Seeding Vendors...");
  const vendors = [
    { name: "ISMT Limited", city: "Pune", state: "Maharashtra", productsSupplied: "CS Seamless Pipes" },
    { name: "Maharashtra Seamless Limited (MSL)", city: "Nagothane", state: "Maharashtra", productsSupplied: "CS Seamless Pipes" },
    { name: "Jindal Stainless Limited (JSL)", city: "Hisar", state: "Haryana", productsSupplied: "SS Pipes, DS Pipes" },
    { name: "USTPL", city: "Mumbai", state: "Maharashtra", productsSupplied: "CS Seamless Pipes" },
    { name: "Kanak Ferrous (KF)", city: "Mumbai", state: "Maharashtra", productsSupplied: "Alloy Steel Pipes" },
    { name: "Ratnadeep Metal & Tubes Ltd", city: "Mumbai", state: "Maharashtra", productsSupplied: "SS Pipes, CS Pipes" },
  ];
  for (const v of vendors) {
    await prisma.vendorMaster.create({ data: v });
  }
  console.log(`  Inserted ${vendors.length} vendors`);
}

async function seedCustomers() {
  console.log("Seeding Customers...");
  const customers = [
    { name: "ONGC Limited", city: "Mumbai", state: "Maharashtra", gstNo: "27AAACO1711G1Z5", contactPerson: "Mr. Sharma", email: "procurement@ongc.co.in", paymentTerms: "Net 30" },
    { name: "BPCL", city: "Mumbai", state: "Maharashtra", gstNo: "27AAACB5765M1ZF", contactPerson: "Mr. Patel", email: "purchase@bpcl.co.in", paymentTerms: "Net 60" },
    { name: "HPCL", city: "Mumbai", state: "Maharashtra", gstNo: "27AAACH1395M1Z5", contactPerson: "Mr. Gupta", email: "vendor@hpcl.co.in", paymentTerms: "Net 30" },
    { name: "L&T Hydrocarbon", city: "Mumbai", state: "Maharashtra", gstNo: "27AABCL1234M1Z0", contactPerson: "Mr. Reddy", email: "piping@lnthydrocarbon.com", paymentTerms: "Net 60" },
    { name: "Thermax Limited", city: "Pune", state: "Maharashtra", gstNo: "27AAACT1234M1Z0", contactPerson: "Mr. Joshi", email: "purchase@thermaxglobal.com", paymentTerms: "Net 30" },
  ];
  for (const c of customers) {
    await prisma.customerMaster.create({ data: c });
  }
  console.log(`  Inserted ${customers.length} customers`);
}

async function seedAdminUser() {
  console.log("Seeding Admin User...");
  const passwordHash = await bcrypt.hash("Admin@123", 10);
  await prisma.user.create({
    data: {
      email: "admin@erp.com",
      name: "System Admin",
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
  });
  console.log("  Admin user created: admin@erp.com");
}

async function seedDocumentSequences() {
  console.log("Seeding Document Sequences...");
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const fy = (month >= 4 ? year : year - 1) % 100;
  const financialYear = fy.toString().padStart(2, "0");

  const sequences = [
    { documentType: "QUOTATION", prefix: "NPS" },
    { documentType: "SALES_ORDER", prefix: "SO" },
    { documentType: "PURCHASE_REQUISITION", prefix: "PR" },
    { documentType: "PURCHASE_ORDER", prefix: "PO" },
    { documentType: "GRN", prefix: "GRN" },
    { documentType: "INSPECTION", prefix: "IR" },
    { documentType: "NCR", prefix: "NCR" },
    { documentType: "QC_RELEASE", prefix: "QCR" },
    { documentType: "PACKING_LIST", prefix: "PL" },
    { documentType: "DISPATCH_NOTE", prefix: "DN" },
    { documentType: "INVOICE_DOMESTIC", prefix: "INV" },
    { documentType: "INVOICE_EXPORT", prefix: "EXP" },
    { documentType: "RECEIPT", prefix: "REC" },
    { documentType: "STOCK_ISSUE", prefix: "ISS" },
    { documentType: "CREDIT_NOTE", prefix: "CN" },
    { documentType: "DEBIT_NOTE", prefix: "DBN" },
  ];

  for (const s of sequences) {
    await prisma.documentSequence.create({
      data: {
        ...s,
        currentNumber: 0,
        financialYear,
        resetMonth: 4,
      },
    });
  }
  console.log(`  Inserted ${sequences.length} document sequences (FY: ${financialYear})`);
}

async function seedInventory() {
  console.log("Seeding Inventory Stock...");
  const rows = readExcel("INVENTORY MASTER - LATEST.xlsx");
  let count = 0;

  for (const row of rows) {
    const r = row as Record<string, unknown>;
    const quantityStr = getVal(r, "Quantity (Mtr.)", "Quantity\r\n(Mtr.)");
    const quantity = parseFloat(quantityStr) || 0;
    if (quantity === 0) continue;

    const mtcDateRaw = r["MTC Date"] ?? r["MTC Date "];
    let mtcDate: Date | null = null;
    if (mtcDateRaw) {
      if (typeof mtcDateRaw === "number") {
        mtcDate = excelDateToJS(mtcDateRaw);
      } else {
        const parsed = new Date(String(mtcDateRaw));
        if (!isNaN(parsed.getTime())) mtcDate = parsed;
      }
    }

    const mtcTypeStr = getVal(r, "MTC Type");
    let mtcType: MTCType | null = null;
    if (mtcTypeStr.includes("3.2")) mtcType = MTCType.MTC_3_2;
    else if (mtcTypeStr.includes("3.1")) mtcType = MTCType.MTC_3_1;

    // Parse OD and WT from size label if possible
    const sizeLabel = getVal(r, "Size", "Size ");

    await prisma.inventoryStock.create({
      data: {
        form: getVal(r, "Form") || null,
        product: getVal(r, "Product") || null,
        specification: getVal(r, "Specification") || null,
        additionalSpec: getVal(r, "Additional") || null,
        dimensionStd: getVal(r, "Dimension") || null,
        sizeLabel: sizeLabel || null,
        ends: getVal(r, "Ends") || null,
        length: getVal(r, "Length (Mtr.)", "Length\r\n(Mtr.)") || null,
        heatNo: getVal(r, "Heat No.", "Heat No. ") || null,
        make: getVal(r, "Make") || null,
        quantityMtr: quantity,
        pieces: parseInt(getVal(r, "Piece") || "0") || 0,
        mtcNo: getVal(r, "MTC No.") || null,
        mtcDate,
        mtcType,
        tpiAgency: getVal(r, "TPI") || null,
        location: getVal(r, "Location") || null,
        notes: getVal(r, "Notes") || null,
        status: StockStatus.ACCEPTED,
      },
    });
    count++;
  }
  console.log(`  Inserted ${count} inventory stock records`);
}

async function seedCompanyMaster() {
  console.log("Seeding Company Master...");
  await prisma.companyMaster.create({
    data: {
      companyName: "NPS Piping Solutions",
      companyType: "Trading",
      regAddressLine1: "Office No. 123, Trade Center",
      regCity: "Navi Mumbai",
      regPincode: "400701",
      regState: "Maharashtra",
      regCountry: "India",
      whAddressLine1: "Warehouse, Plot No. 45",
      whCity: "Navi Mumbai",
      whPincode: "400701",
      whState: "Maharashtra",
      whCountry: "India",
      email: "info@npspiping.com",
      fyStartMonth: 4,
    },
  });
  console.log("  Company master created");
}

async function seedFinancialYears() {
  console.log("Seeding Financial Years...");
  await prisma.financialYear.create({
    data: {
      label: "2024-25",
      startDate: new Date("2024-04-01"),
      endDate: new Date("2025-03-31"),
      isActive: false,
    },
  });
  await prisma.financialYear.create({
    data: {
      label: "2025-26",
      startDate: new Date("2025-04-01"),
      endDate: new Date("2026-03-31"),
      isActive: true,
    },
  });
  console.log("  Inserted 2 financial years");
}

async function seedOfferTermTemplates() {
  console.log("Seeding Offer Term Templates...");

  const domesticTerms = [
    { termName: "Price", termDefaultValue: "Ex-Godown, Navi Mumbai, India" },
    { termName: "Delivery", termDefaultValue: "As above FOR Site basis + QAP approval Period. LR date will be considered as the date of delivery." },
    { termName: "Payment", termDefaultValue: "100% within 30 days after receipt of materials." },
    { termName: "Offer validity", termDefaultValue: "1 week; further subject to our acceptance." },
    { termName: "Freight", termDefaultValue: "Extra at actual / To your account" },
    { termName: "TPI & Testing", termDefaultValue: "Inclusive" },
    { termName: "P & F charges", termDefaultValue: "NIL" },
    { termName: "Insurance", termDefaultValue: "To your account. Dispatch details will be shared immediately after dispatch." },
    { termName: "GST", termDefaultValue: "18% GST extra" },
    { termName: "Certification", termDefaultValue: "MTC as per EN 10204 - 3.1" },
    { termName: "Material origin", termDefaultValue: "EIL Approved Mill" },
    { termName: "Quantity tolerance", termDefaultValue: "-0/+1 R/L of 5 to 7 mtrs" },
    { termName: "Part orders", termDefaultValue: "Acceptable, subject to reconfirmation" },
    { termName: "LD Clause", termDefaultValue: "Acceptable, 0.5% per week, maximum 5%" },
  ];

  const exportTerms = [
    { termName: "Currency", termDefaultValue: "USD ($)" },
    { termName: "Price", termDefaultValue: "Ex-work, Mumbai, India/ Jebel Ali, UAE" },
    { termName: "Delivery", termDefaultValue: "As above, ex-works, after receipt of PO" },
    { termName: "Payment", termDefaultValue: "100% within 30 Days from date of dispatch" },
    { termName: "Offer validity", termDefaultValue: "6 Days, subject to stock remain unsold" },
    { termName: "Packing", termDefaultValue: "Inclusive" },
    { termName: "Freight", termDefaultValue: "Extra at actual / To your account" },
    { termName: "Insurance", termDefaultValue: "Extra at actual / To your account" },
    { termName: "Certification", termDefaultValue: "Not Applicable" },
    { termName: "T/T charges", termDefaultValue: "To your account, Full Invoice amount to be remitted. No deduction of T/T charges acceptable." },
    { termName: "Third Party Inspection", termDefaultValue: "Not Applicable" },
    { termName: "Material origin", termDefaultValue: "International" },
    { termName: "Qty. Tolerance", termDefaultValue: "Not Applicable" },
    { termName: "Dimension Tolerance", termDefaultValue: "Not Applicable" },
    { termName: "Part orders", termDefaultValue: "Not Applicable" },
  ];

  for (let i = 0; i < domesticTerms.length; i++) {
    await prisma.offerTermTemplate.create({
      data: { ...domesticTerms[i], sortOrder: i + 1, quotationType: "DOMESTIC", isActive: true },
    });
  }
  for (let i = 0; i < exportTerms.length; i++) {
    await prisma.offerTermTemplate.create({
      data: { ...exportTerms[i], sortOrder: i + 1, quotationType: "EXPORT", isActive: true },
    });
  }
  console.log(`  Inserted ${domesticTerms.length} domestic + ${exportTerms.length} export offer term templates`);
}

async function main() {
  console.log("Starting seed...\n");

  // Clear existing data in reverse dependency order
  console.log("Clearing existing data...");
  await prisma.auditLog.deleteMany();
  await prisma.documentSequence.deleteMany();
  await prisma.qCRelease.deleteMany();
  await prisma.stockIssueItem.deleteMany();
  await prisma.stockIssue.deleteMany();
  await prisma.paymentReceipt.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.dispatchNote.deleteMany();
  await prisma.packingListItem.deleteMany();
  await prisma.packingList.deleteMany();
  await prisma.labLetter.deleteMany();
  await prisma.nCR.deleteMany();
  await prisma.inspectionParameter.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.mTCDocument.deleteMany();
  await prisma.inventoryStock.deleteMany();
  await prisma.gRNItem.deleteMany();
  await prisma.goodsReceiptNote.deleteMany();
  await prisma.pOItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.pRItem.deleteMany();
  await prisma.purchaseRequisition.deleteMany();
  await prisma.stockReservation.deleteMany();
  await prisma.salesOrderItem.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.quotationTerm.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  // New tables
  await prisma.customerTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.customerDispatchAddress.deleteMany();
  await prisma.buyerMaster.deleteMany();
  await prisma.materialCodeMaster.deleteMany();
  await prisma.offerTermTemplate.deleteMany();
  await prisma.financialYear.deleteMany();
  await prisma.companyMaster.deleteMany();
  await prisma.employeeMaster.deleteMany();
  // Existing tables
  await prisma.testingMaster.deleteMany();
  await prisma.pipeSizeMaster.deleteMany();
  await prisma.productSpecMaster.deleteMany();
  await prisma.warehouseLocation.deleteMany();
  await prisma.warehouseMaster.deleteMany();
  await prisma.transporterMaster.deleteMany();
  await prisma.dimensionalStandardMaster.deleteMany();
  await prisma.certificationTypeMaster.deleteMany();
  await prisma.inspectionAgencyMaster.deleteMany();
  await prisma.deliveryTermsMaster.deleteMany();
  await prisma.paymentTermsMaster.deleteMany();
  await prisma.uomMaster.deleteMany();
  await prisma.currencyMaster.deleteMany();
  await prisma.taxMaster.deleteMany();
  await prisma.vendorMaster.deleteMany();
  await prisma.customerMaster.deleteMany();
  await prisma.user.deleteMany();
  console.log("  Done clearing\n");

  await seedAdminUser();
  await seedCompanyMaster();
  await seedFinancialYears();
  await seedOfferTermTemplates();
  await seedProductSpecs();
  await seedPipeSizes();
  await seedTestingMaster();
  await seedTaxMaster();
  await seedCurrencyMaster();
  await seedUomMaster();
  await seedPaymentTerms();
  await seedDeliveryTerms();
  await seedInspectionAgencies();
  await seedCertificationTypes();
  await seedDimensionalStandards();
  await seedVendors();
  await seedCustomers();
  await seedDocumentSequences();
  await seedInventory();

  console.log("\nSeed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
