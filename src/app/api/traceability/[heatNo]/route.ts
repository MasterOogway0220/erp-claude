import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ heatNo: string }> }
) {
  try {
    const { heatNo: heatNoParam } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const heatNo = decodeURIComponent(heatNoParam);

    const stocks = await prisma.inventoryStock.findMany({
      where: {
        heatNo: { equals: heatNo, mode: "insensitive" as const },
      },
      include: {
        grnItem: {
          include: {
            grn: {
              include: {
                purchaseOrder: {
                  select: {
                    id: true,
                    poNo: true,
                    poDate: true,
                    status: true,
                    vendor: {
                      select: { id: true, name: true },
                    },
                  },
                },
              },
            },
          },
        },
        inspections: {
          include: {
            inspector: { select: { id: true, name: true } },
            parameters: true,
          },
          orderBy: { inspectionDate: "desc" },
        },
        mtcDocuments: true,
        ncrs: {
          orderBy: { ncrDate: "desc" },
        },
        stockReservations: {
          include: {
            salesOrderItem: {
              include: {
                salesOrder: {
                  select: {
                    id: true,
                    soNo: true,
                    soDate: true,
                    status: true,
                    customer: {
                      select: { id: true, name: true },
                    },
                  },
                },
              },
            },
          },
        },
        packingListItems: {
          include: {
            packingList: {
              include: {
                dispatchNotes: {
                  include: {
                    invoices: {
                      include: {
                        paymentReceipts: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (stocks.length === 0) {
      return NextResponse.json(
        { error: "No records found for this heat number" },
        { status: 404 }
      );
    }

    return NextResponse.json({ heatNo, stocks });
  } catch (error) {
    console.error("Error fetching traceability data:", error);
    return NextResponse.json(
      { error: "Failed to fetch traceability data" },
      { status: 500 }
    );
  }
}
