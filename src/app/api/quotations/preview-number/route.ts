import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { getCurrentFinancialYear, PREFIXES } from "@/lib/document-numbering";

const QUOTATION_NUMBER_BASE = 15000;

function getShortFinancialYear(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const fyStartYear = month >= 4 ? year : year - 1;
  return (fyStartYear % 100).toString().padStart(2, "0");
}

export async function GET() {
  try {
    const { authorized, response, companyId } = await checkAccess("quotation", "read");
    if (!authorized) return response!;

    const currentFY = getCurrentFinancialYear();

    // `?? null` matters: passing `undefined` would drop the companyId filter
    // entirely and let findFirst return an arbitrary company's counter.
    let sequence = await prisma.documentSequence.findFirst({
      where: { documentType: "QUOTATION", companyId: companyId ?? null },
    });
    if (!sequence) {
      sequence = await prisma.documentSequence.findFirst({
        where: { documentType: "QUOTATION", companyId: null },
      });
    }

    let nextNumber: number;
    if (!sequence || sequence.financialYear !== currentFY) {
      nextNumber = 1;
    } else {
      nextNumber = sequence.currentNumber + 1;
    }

    const fy = getShortFinancialYear();
    const displayNumber = nextNumber + QUOTATION_NUMBER_BASE;
    const previewNumber = `${PREFIXES.QUOTATION}/${fy}/${displayNumber.toString().padStart(5, "0")}`;

    return NextResponse.json({ previewNumber });
  } catch (error) {
    console.error("Error generating preview number:", error);
    return NextResponse.json(
      { error: "Failed to generate preview number" },
      { status: 500 }
    );
  }
}
