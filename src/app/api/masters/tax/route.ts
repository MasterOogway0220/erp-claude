import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { authorized, response } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const taxRates = await prisma.taxMaster.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ taxRates });
  } catch (error) {
    console.error("Error fetching tax rates:", error);
    return NextResponse.json(
      { error: "Failed to fetch tax rates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();

    if (!body.name || body.percentage === undefined) {
      return NextResponse.json(
        { error: "Name and percentage are required" },
        { status: 400 }
      );
    }

    const taxRate = await prisma.taxMaster.create({
      data: {
        code: body.code || null,
        name: body.name,
        percentage: body.percentage,
        taxType: body.taxType || null,
        hsnCode: body.hsnCode || null,
        effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : null,
        effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
        isActive: body.isActive ?? true,
      },
    });

    await createAuditLog({
      tableName: "TaxMaster",
      recordId: taxRate.id,
      action: "CREATE",
      userId: session.user?.id,
    });

    return NextResponse.json(taxRate, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Tax code already exists" },
        { status: 400 }
      );
    }
    console.error("Error creating tax rate:", error);
    return NextResponse.json(
      { error: "Failed to create tax rate" },
      { status: 500 }
    );
  }
}
