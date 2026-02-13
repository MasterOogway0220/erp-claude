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

    const agencies = await prisma.inspectionAgencyMaster.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ agencies });
  } catch (error) {
    console.error("Error fetching inspection agencies:", error);
    return NextResponse.json(
      { error: "Failed to fetch inspection agencies" },
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

    if (!body.name || !body.code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    const agency = await prisma.inspectionAgencyMaster.create({
      data: {
        code: body.code,
        name: body.name,
        contactPerson: body.contactPerson || null,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        accreditationDetails: body.accreditationDetails || null,
        approvedStatus: body.approvedStatus ?? true,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json(agency, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Inspection agency code already exists" },
        { status: 400 }
      );
    }
    console.error("Error creating inspection agency:", error);
    return NextResponse.json(
      { error: "Failed to create inspection agency" },
      { status: 500 }
    );
  }
}
