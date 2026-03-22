import { NextRequest, NextResponse } from "next/server";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "";

    const where: any = { ...companyFilter(companyId), isActive: true };
    if (category) where.category = category;

    const segments = await prisma.industrySegmentMaster.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ segments });
  } catch (error) {
    console.error("Error fetching industry segments:", error);
    return NextResponse.json({ error: "Failed to fetch industry segments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Segment name is required" }, { status: 400 });
    }

    const segment = await prisma.industrySegmentMaster.create({
      data: {
        name: body.name.trim(),
        category: body.category || "CUSTOMER",
        companyId,
      },
    });

    await createAuditLog({
      tableName: "IndustrySegmentMaster",
      recordId: segment.id,
      action: "CREATE",
      userId: session.user?.id,
      companyId,
    });

    return NextResponse.json(segment, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Industry segment already exists" }, { status: 400 });
    }
    console.error("Error creating industry segment:", error);
    return NextResponse.json({ error: "Failed to create industry segment" }, { status: 500 });
  }
}
