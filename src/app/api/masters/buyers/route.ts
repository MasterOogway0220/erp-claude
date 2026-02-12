import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const customerId = searchParams.get("customerId") || "";

    const where: any = {};

    if (customerId) {
      where.customerId = customerId;
    }

    if (search) {
      where.OR = [
        { buyerName: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ];
    }

    const buyers = await prisma.buyerMaster.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
      },
      orderBy: { buyerName: "asc" },
    });

    return NextResponse.json({ buyers });
  } catch (error) {
    console.error("Error fetching buyers:", error);
    return NextResponse.json(
      { error: "Failed to fetch buyers" },
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

    if (!body.customerId || !body.buyerName) {
      return NextResponse.json(
        { error: "Customer and buyer name are required" },
        { status: 400 }
      );
    }

    const buyer = await prisma.buyerMaster.create({
      data: {
        customerId: body.customerId,
        buyerName: body.buyerName,
        designation: body.designation || null,
        email: body.email || null,
        mobile: body.mobile || null,
        telephone: body.telephone || null,
        isActive: body.isActive ?? true,
      },
      include: {
        customer: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(buyer, { status: 201 });
  } catch (error) {
    console.error("Error creating buyer:", error);
    return NextResponse.json(
      { error: "Failed to create buyer" },
      { status: 500 }
    );
  }
}
