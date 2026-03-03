import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where = search
      ? { label: { contains: search } }
      : {};

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
    const { authorized, session, response } = await checkAccess("masters", "write");
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
      data: { label },
    });

    createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      tableName: "LengthMaster",
      recordId: newLength.id,
      newValue: JSON.stringify({ label }),
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
