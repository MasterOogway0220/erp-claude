import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
