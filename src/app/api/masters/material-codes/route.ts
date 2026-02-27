import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { description: { contains: search } },
        { productType: { contains: search } },
      ];
    }

    const materialCodes = await prisma.materialCodeMaster.findMany({
      where,
      orderBy: { code: "asc" },
      take: 100,
    });

    return NextResponse.json({ materialCodes });
  } catch (error) {
    console.error("Error fetching material codes:", error);
    return NextResponse.json(
      { error: "Failed to fetch material codes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();

    if (!body.code) {
      return NextResponse.json(
        { error: "Material code is required" },
        { status: 400 }
      );
    }

    const materialCode = await prisma.materialCodeMaster.create({
      data: {
        code: body.code,
        description: body.description || null,
        productType: body.productType || null,
        materialGrade: body.materialGrade || null,
        size: body.size || null,
        schedule: body.schedule || null,
      },
    });

    await createAuditLog({
      tableName: "MaterialCodeMaster",
      recordId: materialCode.id,
      action: "CREATE",
      userId: session.user?.id,
    });

    return NextResponse.json(materialCode, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Material code already exists" },
        { status: 400 }
      );
    }
    console.error("Error creating material code:", error);
    return NextResponse.json(
      { error: "Failed to create material code" },
      { status: 500 }
    );
  }
}
