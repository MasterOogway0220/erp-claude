import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { PackingListDocument } from "@/lib/pdf/packing-list-pdf";

const DEFAULT_COMPANY = {
  companyName: "NPS Piping Solutions",
  regAddressLine1:
    "1210/1211, Prasad Chambers, Tata Road no. 2, Opera House, Charni Road (E)",
  regCity: "Mumbai",
  regPincode: "400004",
  regState: "Maharashtra",
  regCountry: "India",
  telephoneNo: "+91 22 23634200/300",
  email: "info@n-pipe.com",
  website: "www.n-pipe.com",
  companyLogoUrl: null,
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response } = await checkAccess("packingList", "read");
    if (!authorized) return response!;

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
      },
    });

    if (!packingList) {
      return NextResponse.json(
        { error: "Packing list not found" },
        { status: 404 }
      );
    }

    const company = await prisma.companyMaster.findFirst();
    const companyInfo = company || DEFAULT_COMPANY;

    const pdfBuffer = await renderToBuffer(
      <PackingListDocument data={packingList as never} company={companyInfo as never} />
    );

    const filename = packingList.plNo.replace(/\//g, "-");
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Error generating packing list PDF:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
