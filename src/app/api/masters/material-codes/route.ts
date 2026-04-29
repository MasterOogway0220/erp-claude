import { NextRequest, NextResponse } from "next/server";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const customerId = searchParams.get("customerId") || "";
    const quotationCategory = searchParams.get("quotationCategory") || "";

    const where: any = { ...companyFilter(companyId) };
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { clientItemCode: { contains: search } },
        { description: { contains: search } },
        { productType: { contains: search } },
        { materialGrade: { contains: search } },
        { standard: { contains: search } },
      ];
    }
    if (customerId) {
      where.quotationItems = {
        some: {
          quotation: {
            customerId,
            ...(quotationCategory ? { quotationCategory } : {}),
          },
        },
      };
    }

    const materialCodes = await prisma.materialCodeMaster.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 200,
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
    const { authorized, session, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();

    if (!body.code?.trim()) {
      return NextResponse.json(
        { error: "Item Code is required" },
        { status: 400 }
      );
    }

    const materialCode = await prisma.materialCodeMaster.create({
      data: {
        code: body.code.trim(),
        clientItemCode: body.clientItemCode || null,
        description: body.description || null,
        productType: body.productType || null,
        materialGrade: body.materialGrade || null,
        size: body.size || null,
        odSize: body.odSize || null,
        nbSize: body.nbSize || null,
        thickness: body.thickness || null,
        schedule: body.schedule || null,
        standard: body.standard || null,
        unit: body.unit || null,
        rate: body.rate ? parseFloat(body.rate) : null,
        companyId,
      },
    });

    await createAuditLog({
      tableName: "MaterialCodeMaster",
      recordId: materialCode.id,
      action: "CREATE",
      userId: session.user?.id,
      companyId,
    });

    return NextResponse.json(materialCode, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Item code already exists" },
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
