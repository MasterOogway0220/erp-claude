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

    const units = await prisma.uomMaster.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ units });
  } catch (error) {
    console.error("Error fetching units:", error);
    return NextResponse.json(
      { error: "Failed to fetch units" },
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

    if (!body.code || !body.name) {
      return NextResponse.json(
        { error: "Code and name are required" },
        { status: 400 }
      );
    }

    const unit = await prisma.uomMaster.create({
      data: {
        code: body.code,
        name: body.name,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json(unit, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Unit code already exists" },
        { status: 400 }
      );
    }
    console.error("Error creating unit:", error);
    return NextResponse.json(
      { error: "Failed to create unit" },
      { status: 500 }
    );
  }
}
