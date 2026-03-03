import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "transporters") {
      const transporters = await prisma.transporterMaster.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          contactPerson: true,
          phone: true,
          vehicleTypes: true,
        },
      });
      return NextResponse.json({ transporters });
    }

    return NextResponse.json(
      { error: "Invalid type parameter. Supported: transporters" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error fetching master data:", error);
    return NextResponse.json(
      { error: "Failed to fetch master data" },
      { status: 500 }
    );
  }
}
