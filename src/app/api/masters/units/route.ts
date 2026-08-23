import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { cachedMasterRead } from "@/lib/cache/master-cache";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { invalidateMasters } from "@/lib/cache/master-cache";

export async function GET() {
  try {
    const { authorized, response } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    // No companyFilter on this query — the UOM list is global, so every
    // company shares one cache entry rather than each holding a copy.
    const units = await cachedMasterRead({
      tag: "units",
      companyId: null,
      read: () =>
        prisma.uomMaster.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
        }),
    });

    return NextResponse.json({ units });
  } catch (error) {
    console.error("Error fetching units:", error);
    return NextResponse.json(
      { error: "Failed to fetch units" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();

    if (!body.code || !body.name) {
      return NextResponse.json(
        { error: "Code and name are required" },
        { status: 400 }
      );
    }

    const unit = await prisma.uomMaster.create({
      data: {
        code: body.code,
        name: body.name,
        isActive: body.isActive ?? true,
      },
    });

    await createAuditLog({
      tableName: "UomMaster",
      recordId: unit.id,
      action: "CREATE",
      userId: session.user?.id,
    });
invalidateMasters("units");

    return NextResponse.json(unit, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Unit code already exists" },
        { status: 400 }
      );
    }
    console.error("Error creating unit:", error);
    return NextResponse.json(
      { error: "Failed to create unit" },
      { status: 500 }
    );
  }
}
