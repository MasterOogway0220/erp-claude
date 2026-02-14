import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response } = await checkAccess("qcRelease", "read");
    if (!authorized) return response!;

    const qcRelease = await prisma.qCRelease.findUnique({
      where: { id },
      include: {
        inspection: {
          select: {
            id: true, inspectionNo: true, inspectionDate: true, overallResult: true,
            grnItem: {
              select: {
                id: true, heatNo: true, product: true, material: true, sizeLabel: true,
                grn: { select: { id: true, grnNo: true } },
              },
            },
            parameters: true,
          },
        },
        inventoryStock: {
          select: {
            id: true, heatNo: true, product: true, specification: true,
            sizeLabel: true, status: true, quantityMtr: true, pieces: true,
          },
        },
        releasedBy: { select: { id: true, name: true } },
      },
    });

    if (!qcRelease) {
      return NextResponse.json({ error: "QC Release not found" }, { status: 404 });
    }

    return NextResponse.json({ qcRelease });
  } catch (error) {
    console.error("Error fetching QC release:", error);
    return NextResponse.json({ error: "Failed to fetch QC release" }, { status: 500 });
  }
}
