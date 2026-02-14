import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { authorized, response } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const deliveryTerms = await prisma.deliveryTermsMaster.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ deliveryTerms });
  } catch (error) {
    console.error("Error fetching delivery terms:", error);
    return NextResponse.json(
      { error: "Failed to fetch delivery terms" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const deliveryTerm = await prisma.deliveryTermsMaster.create({
      data: {
        code: body.code || null,
        name: body.name,
        description: body.description || null,
        incoterms: body.incoterms || null,
        isActive: body.isActive ?? true,
      },
    });

    await createAuditLog({
      tableName: "DeliveryTermsMaster",
      recordId: deliveryTerm.id,
      action: "CREATE",
      userId: session.user?.id,
    });

    return NextResponse.json(deliveryTerm, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Delivery term code already exists" },
        { status: 400 }
      );
    }
    console.error("Error creating delivery term:", error);
    return NextResponse.json(
      { error: "Failed to create delivery term" },
      { status: 500 }
    );
  }
}
