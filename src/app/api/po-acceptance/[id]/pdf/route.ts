import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { generatePOAcceptanceLetterHtml } from "@/lib/pdf/po-acceptance-template";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("poAcceptance", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const acceptance = await prisma.pOAcceptance.findUnique({
      where: { id },
      include: {
        clientPurchaseOrder: {
          include: {
            customer: {
              select: {
                name: true, contactPerson: true, email: true, phone: true,
                addressLine1: true, addressLine2: true, city: true, state: true, gstNo: true,
              },
            },
            items: { orderBy: { sNo: "asc" } },
          },
        },
        company: true,
      },
    });

    if (!acceptance) {
      return NextResponse.json({ error: "PO Acceptance not found" }, { status: 404 });
    }

    if (acceptance.status !== "ISSUED") {
      return NextResponse.json({ error: "Acceptance letter is only available for issued acceptances" }, { status: 400 });
    }

    const cpo = acceptance.clientPurchaseOrder;
    const company = acceptance.company || {
      companyName: "NPS Piping Solutions",
      regAddressLine1: "1210/1211, Prasad Chambers, Tata Road no. 2, Opera House, Charni Road (E)",
      regCity: "Mumbai", regPincode: "400004", regState: "Maharashtra", regCountry: "India",
      telephoneNo: "+91 22 23634200/300", email: "info@n-pipe.com", website: "www.n-pipe.com",
    };

    const html = generatePOAcceptanceLetterHtml(
      {
        acceptanceNo: acceptance.acceptanceNo,
        acceptanceDate: acceptance.acceptanceDate,
        committedDeliveryDate: acceptance.committedDeliveryDate,
        remarks: acceptance.remarks,
        followUpName: acceptance.followUpName,
        followUpEmail: acceptance.followUpEmail,
        followUpPhone: acceptance.followUpPhone,
        qualityName: acceptance.qualityName,
        qualityEmail: acceptance.qualityEmail,
        qualityPhone: acceptance.qualityPhone,
        accountsName: acceptance.accountsName,
        accountsEmail: acceptance.accountsEmail,
        accountsPhone: acceptance.accountsPhone,
        clientPO: {
          cpoNo: cpo.cpoNo,
          clientPoNumber: cpo.clientPoNumber,
          clientPoDate: cpo.clientPoDate,
          projectName: cpo.projectName,
          paymentTerms: cpo.paymentTerms,
          deliveryTerms: cpo.deliveryTerms,
          currency: cpo.currency,
          subtotal: cpo.subtotal ? Number(cpo.subtotal) : null,
          grandTotal: cpo.grandTotal ? Number(cpo.grandTotal) : null,
        },
        items: cpo.items.map((item) => ({
          sNo: item.sNo,
          product: item.product,
          material: item.material,
          additionalSpec: item.additionalSpec,
          sizeLabel: item.sizeLabel,
          ends: item.ends,
          uom: item.uom,
          qtyOrdered: Number(item.qtyOrdered),
          unitRate: Number(item.unitRate),
          amount: Number(item.amount),
        })),
        customer: cpo.customer,
      },
      company as any
    );

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error generating PO acceptance PDF:", error);
    return NextResponse.json({ error: "Failed to generate acceptance letter" }, { status: 500 });
  }
}
