import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response, companyId } = await checkAccess("alerts", "write");
    if (!authorized) return response!;

    const { id } = await params;
    const body = await request.json();

    // Validate status
    const validStatuses = ["READ", "DISMISSED"];
    if (!body.status || !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be READ or DISMISSED." },
        { status: 400 }
      );
    }

    // Dynamic alerts (prefixed IDs) cannot be persisted
    if (id.startsWith("mpr-") || id.startsWith("insp-") || id.startsWith("lab-") || id.startsWith("del-")) {
      // For dynamic alerts, we could create a dismissed record, but for now just acknowledge
      return NextResponse.json({ success: true, message: "Dynamic alert acknowledged" });
    }

    const alert = await prisma.alert.update({
      where: { id, ...companyFilter(companyId) },
      data: { status: body.status },
    });

    return NextResponse.json({ alert });
  } catch (error) {
    console.error("Error updating alert:", error);
    return NextResponse.json(
      { error: "Failed to update alert" },
      { status: 500 }
    );
  }
}
