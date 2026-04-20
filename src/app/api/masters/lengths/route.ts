import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { notDeleted } from "@/lib/soft-delete";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where = search
      ? { ...notDeleted, label: { contains: search }, ...companyFilter(companyId) }
      : { ...notDeleted, ...companyFilter(companyId) };

    const lengths = await prisma.lengthMaster.findMany({
      where,
      orderBy: { label: "asc" },
    });

    return NextResponse.json({ lengths });
  } catch (error) {
    console.error("Error fetching lengths:", error);
    return NextResponse.json(
      { error: "Failed to fetch lengths" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { label } = body;

    if (!label) {
      return NextResponse.json(
        { error: "Label is required" },
        { status: 400 }
      );
    }

    const newLength = await prisma.lengthMaster.create({
      data: { label, companyId },
    });

    createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      tableName: "LengthMaster",
      recordId: newLength.id,
      newValue: JSON.stringify({ label }),
      companyId,
    }).catch(console.error);

    return NextResponse.json(newLength, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A length with this label already exists" },
        { status: 400 }
      );
    }
    console.error("Error creating length:", error);
    return NextResponse.json(
      { error: "Failed to create length" },
      { status: 500 }
    );
  }
}
