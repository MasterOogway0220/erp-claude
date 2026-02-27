import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-setup-secret");
  if (!secret || secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];

  // 1. Admin user
  const adminEmail = "admin@erp.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: { email: adminEmail, name: "System Administrator", passwordHash, role: "ADMIN", isActive: true },
    });
    results.push("Admin user created");
  } else {
    results.push("Admin user already exists");
  }

  // 2. Company master
  const existingCompany = await prisma.companyMaster.findFirst();
  if (!existingCompany) {
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
    results.push("Company master created");
  } else {
    results.push("Company master already exists");
  }

  // 3. Financial year
  const now = new Date();
  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fyLabel = `${fyStartYear}-${(fyStartYear + 1) % 100}`;
  const existingFY = await prisma.financialYear.findUnique({ where: { label: fyLabel } });
  if (!existingFY) {
    await prisma.financialYear.create({
      data: {
        label: fyLabel,
        startDate: new Date(`${fyStartYear}-04-01`),
        endDate: new Date(`${fyStartYear + 1}-03-31`),
        isActive: true,
      },
    });
    results.push(`Financial year ${fyLabel} created`);
  } else {
    results.push(`Financial year ${fyLabel} already exists`);
  }

  // 4. Document sequences
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
  const financialYear = (fyStartYear % 100).toString().padStart(2, "0");
  let seqCreated = 0;
  for (const s of sequences) {
    const existing = await prisma.documentSequence.findUnique({ where: { documentType: s.documentType } });
    if (!existing) {
      await prisma.documentSequence.create({
        data: { ...s, currentNumber: 0, financialYear, resetMonth: 4 },
      });
      seqCreated++;
    }
  }
  results.push(`Document sequences: ${seqCreated} created, ${sequences.length - seqCreated} existing`);

  return NextResponse.json({ ok: true, results });
}
