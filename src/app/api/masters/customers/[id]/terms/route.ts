import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response, companyId } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const quotationType = searchParams.get("quotationType") || "";

    // Verify customer exists and belongs to company
    const customer = await prisma.customerMaster.findUnique({
      where: { id, ...companyFilter(companyId) },
      select: { id: true },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const where: any = { customerId: id };
    if (quotationType) {
      where.quotationType = quotationType;
    }

    const terms = await prisma.customerTermDefault.findMany({
      where,
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ terms });
  } catch (error) {
    console.error("Error fetching customer terms:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer terms" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { terms, quotationType } = body;

    if (!quotationType || !Array.isArray(terms)) {
      return NextResponse.json(
        { error: "quotationType and terms array are required" },
        { status: 400 }
      );
    }

    // Verify customer exists
    const customer = await prisma.customerMaster.findUnique({
      where: { id, ...companyFilter(companyId) },
      select: { id: true },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Delete existing terms for this quotationType and recreate (sequential)
    await prisma.$transaction(async (tx) => {
      await tx.customerTermDefault.deleteMany({
        where: { customerId: id, quotationType },
      });

      // Deduplicate by termName to avoid unique constraint violations
      const seen = new Set<string>();
      const uniqueTerms = terms.filter((t: any) => {
        const key = t.termName?.trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (uniqueTerms.length > 0) {
        await tx.customerTermDefault.createMany({
          data: uniqueTerms.map((t: any, idx: number) => ({
            customerId: id,
            termName: t.termName.trim(),
            termValue: t.termValue || "",
            sortOrder: idx,
            quotationType,
            isIncluded: t.isIncluded ?? true,
          })),
        });
      }
    });

    const updated = await prisma.customerTermDefault.findMany({
      where: { customerId: id, quotationType },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ terms: updated });
  } catch (error) {
    console.error("Error saving customer terms:", error);
    return NextResponse.json(
      { error: "Failed to save customer terms" },
      { status: 500 }
    );
  }
}
