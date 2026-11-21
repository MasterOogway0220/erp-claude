import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";
import {
  NOT_ORDERABLE_TENDER_STATUSES,
  organisationSearchWord,
  pickOrderQuotation,
  tenderMatchesCustomer,
} from "@/lib/tenders/order-quotation";

// GET /api/tenders/for-client?customerId=...
// The client's tenders a PO can be registered against: the tender's client is
// this customer, or (no client set) its organisation names the customer —
// punctuation, "M/s." and Ltd/Limited-style variants ignored.
// NO_BID / LOST tenders are left out. A tender with no lines is listed too
// (itemCount 0): its items are typed in on the PO screen.
// `orderQuotationId` is the quotation a PO on this tender will use, when one
// already exists — the PO screen lists that quotation itself, so it can skip
// the tender row.
export async function GET(request: NextRequest) {
  const { authorized, response, companyId } = await checkAccess("clientPO", "read");
  if (!authorized) return response!;

  try {
    const customerId = request.nextUrl.searchParams.get("customerId")?.trim();
    if (!customerId) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 });
    }
    const customer = await prisma.customerMaster.findFirst({
      where: { id: customerId, ...companyFilter(companyId) },
      select: { id: true, name: true },
    });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const tenders = await prisma.tender.findMany({
      where: {
        ...companyFilter(companyId),
        deletedAt: null,
        status: { notIn: [...NOT_ORDERABLE_TENDER_STATUSES] },
        // Narrow in SQL; the exact (case/space-insensitive) rule runs below.
        OR: [{ customerId: customer.id }, { customerId: null, organization: { contains: organisationSearchWord(customer.name) } }],
      },
      select: {
        id: true,
        tenderNo: true,
        tenderDate: true,
        tenderRef: true,
        organization: true,
        customerId: true,
        status: true,
        currency: true,
        _count: { select: { items: true } },
        quotations: {
          where: { deletedAt: null },
          select: { id: true, status: true, version: true, quotationDate: true },
        },
      },
      orderBy: { tenderNo: "desc" },
      take: 200,
    });

    return NextResponse.json({
      tenders: tenders
        .filter((t) => tenderMatchesCustomer(t, customer))
        .map((t) => ({
          id: t.id,
          tenderNo: t.tenderNo,
          tenderDate: t.tenderDate,
          tenderRef: t.tenderRef,
          organization: t.organization,
          status: t.status,
          currency: t.currency,
          itemCount: t._count.items,
          orderQuotationId: pickOrderQuotation(t.quotations).use?.id ?? null,
        })),
    });
  } catch (error) {
    console.error("Tenders for client error:", error);
    return NextResponse.json({ error: "Failed to fetch tenders" }, { status: 500 });
  }
}
