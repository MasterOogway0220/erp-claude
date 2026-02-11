import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const packingList = await prisma.packingList.findUnique({
      where: { id },
      include: {
        salesOrder: {
          include: {
            customer: true,
          },
        },
        items: {
          include: {
            inventoryStock: true,
          },
        },
        dispatchNotes: {
          select: {
            id: true,
            dnNo: true,
            dispatchDate: true,
            vehicleNo: true,
            destination: true,
          },
        },
      },
    });

    if (!packingList) {
      return NextResponse.json(
        { error: "Packing list not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ packingList });
  } catch (error) {
    console.error("Error fetching packing list:", error);
    return NextResponse.json(
      { error: "Failed to fetch packing list" },
      { status: 500 }
    );
  }
}
