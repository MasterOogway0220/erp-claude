import { NextRequest, NextResponse } from "next/server";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const quotationType = request.nextUrl.searchParams.get("quotationType");
    const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true";

    const templates = await prisma.offerTermTemplate.findMany({
      where: {
        ...companyFilter(companyId),
        ...(!includeInactive ? { isActive: true } : {}),
        ...(quotationType ? { quotationType } : {}),
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Error fetching offer term templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch offer term templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();

    if (!body.termName) {
      return NextResponse.json(
        { error: "Term name is required" },
        { status: 400 }
      );
    }

    // Get max sortOrder for the given quotationType
    const qt = body.quotationType || "DOMESTIC";
    const maxSort = await prisma.offerTermTemplate.findFirst({
      where: { quotationType: qt, ...companyFilter(companyId) },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const template = await prisma.offerTermTemplate.create({
      data: {
        companyId,
        termName: body.termName,
        termDefaultValue: body.termDefaultValue || null,
        sortOrder: body.sortOrder ?? (maxSort ? maxSort.sortOrder + 1 : 1),
        quotationType: qt,
        isActive: body.isActive ?? true,
      },
    });

    await createAuditLog({
      tableName: "OfferTermTemplate",
      recordId: template.id,
      action: "CREATE",
      userId: session.user?.id,
      companyId,
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Error creating offer term template:", error);
    return NextResponse.json(
      { error: "Failed to create offer term template" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    await prisma.offerTermTemplate.delete({
      where: { id, ...companyFilter(companyId) },
    });

    await createAuditLog({
      tableName: "OfferTermTemplate",
      recordId: id,
      action: "DELETE",
      userId: session.user?.id,
      companyId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting offer term template:", error);
    return NextResponse.json(
      { error: "Failed to delete offer term template" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    const template = await prisma.offerTermTemplate.update({
      where: { id: body.id, ...companyFilter(companyId) },
      data: {
        termName: body.termName,
        termDefaultValue: body.termDefaultValue,
        sortOrder: body.sortOrder,
        quotationType: body.quotationType,
        isActive: body.isActive,
      },
    });

    await createAuditLog({
      tableName: "OfferTermTemplate",
      recordId: body.id,
      action: "UPDATE",
      userId: session.user?.id,
      companyId,
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error updating offer term template:", error);
    return NextResponse.json(
      { error: "Failed to update offer term template" },
      { status: 500 }
    );
  }
}
