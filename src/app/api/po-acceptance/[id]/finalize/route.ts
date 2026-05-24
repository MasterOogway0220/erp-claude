import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const { authorized, response } = await checkAccess("poAcceptance", "write");
    if (!authorized) return response!;

    const acceptance = await prisma.pOAcceptance.update({
      where: { id },
      data: { status: "ISSUED", pdfGeneratedAt: new Date() },
      include: {
        clientPurchaseOrder: {
          include: {
            customer: {
              select: {
                email: true,
                contactPersonEmail: true,
              },
            },
          },
        },
      },
    });

    const customer = acceptance.clientPurchaseOrder.customer;
    const suggestedRecipient =
      customer.email ??
      customer.contactPersonEmail ??
      acceptance.followUpEmail ??
      "";

    return NextResponse.json({
      pdfUrl: `/api/po-acceptance/${id}/pdf`,
      suggestedRecipient,
      suggestedSubject: `P.O. Acceptance Letter — ${acceptance.acceptanceNo}`,
    });
  } catch (error) {
    console.error("finalize error:", error);
    return NextResponse.json({ error: "Failed to finalize" }, { status: 500 });
  }
}
