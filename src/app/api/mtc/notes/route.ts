import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("mtc", "read");
    if (!authorized) return response!;

    const notes = await prisma.mTCNoteMaster.findMany({
      where: { ...companyFilter(companyId) },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Error fetching MTC notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch MTC notes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("mtc", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { noteText, isDefault, sortOrder } = body;

    if (!noteText) {
      return NextResponse.json(
        { error: "Note text is required" },
        { status: 400 }
      );
    }

    const note = await prisma.mTCNoteMaster.create({
      data: {
        companyId: companyId || undefined,
        noteText,
        isDefault: isDefault || false,
        sortOrder: sortOrder || 0,
      },
    });

    await createAuditLog({
      tableName: "MTCNoteMaster",
      recordId: note.id,
      action: "CREATE",
      userId: session?.user?.id,
      companyId,
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error("Error creating MTC note:", error);
    return NextResponse.json(
      { error: "Failed to create MTC note" },
      { status: 500 }
    );
  }
}
