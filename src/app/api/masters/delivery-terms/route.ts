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

    const deliveryTerm = await prisma.deliveryTermsMaster.create({
      data: {
        code: body.code || null,
        name: body.name,
        description: body.description || null,
        incoterms: body.incoterms || null,
        isActive: body.isActive ?? true,
      },
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
