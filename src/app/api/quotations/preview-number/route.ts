import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { getCurrentFinancialYear, PREFIXES } from "@/lib/document-numbering";

export async function GET() {
  try {
    const { authorized, response } = await checkAccess("quotation", "read");
    if (!authorized) return response!;

    const currentFY = getCurrentFinancialYear();
    const prefix = PREFIXES.QUOTATION;

    const sequence = await prisma.documentSequence.findUnique({
      where: { documentType: "QUOTATION" },
    });

    let nextNumber: number;
    if (!sequence || sequence.financialYear !== currentFY) {
      nextNumber = 1;
    } else {
      nextNumber = sequence.currentNumber + 1;
    }

    const previewNumber = `${prefix}/${currentFY}/${nextNumber.toString().padStart(5, "0")}`;

    return NextResponse.json({ previewNumber });
  } catch (error) {
    console.error("Error generating preview number:", error);
    return NextResponse.json(
      { error: "Failed to generate preview number" },
      { status: 500 }
    );
  }
}
