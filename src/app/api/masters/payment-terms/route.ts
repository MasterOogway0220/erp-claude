import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { authorized, response } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const paymentTerms = await prisma.paymentTermsMaster.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ paymentTerms });
  } catch (error) {
    console.error("Error fetching payment terms:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment terms" },
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

    const paymentTerm = await prisma.paymentTermsMaster.create({
      data: {
        code: body.code || null,
        name: body.name,
        description: body.description || null,
        days: body.days ?? 30,
        isActive: body.isActive ?? true,
      },
    });

    await createAuditLog({
      tableName: "PaymentTermsMaster",
      recordId: paymentTerm.id,
      action: "CREATE",
      userId: session.user?.id,
    });

    return NextResponse.json(paymentTerm, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Payment term code already exists" },
        { status: 400 }
      );
    }
    console.error("Error creating payment term:", error);
    return NextResponse.json(
      { error: "Failed to create payment term" },
      { status: 500 }
    );
  }
}
