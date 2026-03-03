import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const category = request.nextUrl.searchParams.get("category");
    const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true";

    const details = await prisma.technicalExchangeDetail.findMany({
      where: {
        ...(!includeInactive ? { isActive: true } : {}),
        ...(category ? { category } : {}),
      },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });

    return NextResponse.json({ details });
  } catch (error) {
    console.error("Error fetching technical exchange details:", error);
    return NextResponse.json(
      { error: "Failed to fetch technical exchange details" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();

    if (!body.paramName || !body.category) {
      return NextResponse.json(
        { error: "Parameter name and category are required" },
        { status: 400 }
      );
    }

    const maxSort = await prisma.technicalExchangeDetail.findFirst({
      where: { category: body.category },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const detail = await prisma.technicalExchangeDetail.create({
      data: {
        category: body.category,
        paramName: body.paramName,
        defaultValue: body.defaultValue || null,
        isMandatory: body.isMandatory ?? false,
        sortOrder: body.sortOrder ?? (maxSort ? maxSort.sortOrder + 1 : 1),
        isActive: body.isActive ?? true,
      },
    });

    await createAuditLog({
      tableName: "TechnicalExchangeDetail",
      recordId: detail.id,
      action: "CREATE",
      userId: session.user?.id,
    });

    return NextResponse.json(detail, { status: 201 });
  } catch (error) {
    console.error("Error creating technical exchange detail:", error);
    return NextResponse.json(
      { error: "Failed to create technical exchange detail" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { authorized, session, response } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }

    const data: any = {};
    if (body.category !== undefined) data.category = body.category;
    if (body.paramName !== undefined) data.paramName = body.paramName;
    if (body.defaultValue !== undefined) data.defaultValue = body.defaultValue || null;
    if (body.isMandatory !== undefined) data.isMandatory = body.isMandatory;
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const detail = await prisma.technicalExchangeDetail.update({
      where: { id: body.id },
      data,
    });

    await createAuditLog({
      tableName: "TechnicalExchangeDetail",
      recordId: body.id,
      action: "UPDATE",
      userId: session.user?.id,
    });

    return NextResponse.json(detail);
  } catch (error) {
    console.error("Error updating technical exchange detail:", error);
    return NextResponse.json(
      { error: "Failed to update technical exchange detail" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { authorized, session, response } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }

    await prisma.technicalExchangeDetail.delete({
      where: { id },
    });

    await createAuditLog({
      tableName: "TechnicalExchangeDetail",
      recordId: id,
      action: "DELETE",
      userId: session.user?.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting technical exchange detail:", error);
    return NextResponse.json(
      { error: "Failed to delete technical exchange detail" },
      { status: 500 }
    );
  }
}
