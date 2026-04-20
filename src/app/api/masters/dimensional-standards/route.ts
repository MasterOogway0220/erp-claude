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
      ? {
          ...notDeleted,
          OR: [
            { name: { contains: search } },
            { code: { contains: search } },
          ],
          ...companyFilter(companyId),
        }
      : { ...notDeleted, ...companyFilter(companyId) };

    const dimensionalStandards = await prisma.dimensionalStandardMaster.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ dimensionalStandards });
  } catch (error) {
    console.error("Error fetching dimensional standards:", error);
    return NextResponse.json(
      { error: "Failed to fetch dimensional standards" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { name, code } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    const newStandard = await prisma.dimensionalStandardMaster.create({
      data: { name, code, companyId },
    });

    createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      tableName: "DimensionalStandardMaster",
      recordId: newStandard.id,
      newValue: JSON.stringify({ name, code }),
      companyId,
    }).catch(console.error);

    return NextResponse.json(newStandard, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A dimensional standard with this code already exists" },
        { status: 400 }
      );
    }
    console.error("Error creating dimensional standard:", error);
    return NextResponse.json(
      { error: "Failed to create dimensional standard" },
      { status: 500 }
    );
  }
}
