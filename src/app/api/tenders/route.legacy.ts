import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { generateDocumentNumber } from "@/lib/document-numbering";
import { createAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("tender", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const source = searchParams.get("source") || "";
    const cFilter = companyFilter(companyId);

    const where: any = { ...cFilter };

    if (search) {
      where.OR = [
        { tenderNo: { contains: search } },
        { organization: { contains: search } },
        { projectName: { contains: search } },
        { tenderRef: { contains: search } },
      ];
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (source) {
      where.tenderSource = source;
    }

    const tenders = await prisma.tender.findMany({
      where,
      include: {
        customer: { select: { name: true } },
        createdBy: { select: { name: true } },
        _count: { select: { items: true, documents: true } },
      },
      orderBy: { closingDate: "asc" },
    });

    return NextResponse.json(
      tenders.map((t) => ({
        ...t,
        estimatedValue: t.estimatedValue ? Number(t.estimatedValue) : null,
        emdAmount: t.emdAmount ? Number(t.emdAmount) : null,
      }))
    );
  } catch (error) {
    console.error("Error fetching tenders:", error);
    return NextResponse.json({ error: "Failed to fetch tenders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("tender", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const {
      tenderSource, tenderRef, organization, projectName, location,
      closingDate, openingDate, estimatedValue, currency,
      emdRequired, emdAmount, emdType,
      customerId, remarks, items,
    } = body;

    const tenderNo = await generateDocumentNumber("TENDER", companyId);

    const tender = await prisma.tender.create({
      data: {
        companyId,
        tenderNo,
        tenderSource: tenderSource || null,
        tenderRef: tenderRef || null,
        organization: organization || null,
        projectName: projectName || null,
        location: location || null,
        closingDate: closingDate ? new Date(closingDate) : null,
        openingDate: openingDate ? new Date(openingDate) : null,
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null,
        currency: currency || "INR",
        emdRequired: emdRequired || false,
        emdAmount: emdRequired && emdAmount ? parseFloat(emdAmount) : null,
        emdType: emdRequired ? emdType || null : null,
        customerId: customerId || null,
        remarks: remarks || null,
        status: "IDENTIFIED",
        createdById: session.user.id,
        items: items && items.length > 0 ? {
          create: items.map((item: any, idx: number) => ({
            sNo: idx + 1,
            product: item.product || null,
            material: item.material || null,
            additionalSpec: item.additionalSpec || null,
            sizeLabel: item.sizeLabel || null,
            quantity: parseFloat(item.quantity) || 0,
            uom: item.uom || null,
            estimatedRate: item.estimatedRate ? parseFloat(item.estimatedRate) : null,
            amount: item.estimatedRate && item.quantity
              ? parseFloat(item.quantity) * parseFloat(item.estimatedRate)
              : null,
            remarks: item.remarks || null,
          })),
        } : undefined,
      },
      include: {
        items: { orderBy: { sNo: "asc" } },
        customer: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    });

    createAuditLog({
      companyId,
      userId: session.user.id,
      action: "CREATE",
      tableName: "Tender",
      recordId: tender.id,
      newValue: JSON.stringify({ tenderNo, organization, projectName }),
    }).catch(console.error);

    return NextResponse.json(
      {
        ...tender,
        estimatedValue: tender.estimatedValue ? Number(tender.estimatedValue) : null,
        emdAmount: tender.emdAmount ? Number(tender.emdAmount) : null,
        items: tender.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          estimatedRate: item.estimatedRate ? Number(item.estimatedRate) : null,
          amount: item.amount ? Number(item.amount) : null,
        })),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating tender:", error);
    return NextResponse.json({ error: "Failed to create tender" }, { status: 500 });
  }
}
