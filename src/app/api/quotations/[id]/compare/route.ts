import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

function toNumber(val: any): number | null {
  if (val === null || val === undefined) return null;
  return Number(val);
}

function isDecimalLike(val: any): boolean {
  return val !== null && val !== undefined && typeof val === "object" && typeof val.toNumber === "function";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response } = await checkAccess("quotation", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const compareWithId = searchParams.get("compareWith");

    // Fetch the current quotation
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sNo: "asc" } },
        terms: { orderBy: { termNo: "asc" } },
        customer: { select: { name: true } },
        paymentTerms: { select: { name: true } },
        deliveryTerms: { select: { name: true } },
      },
    });

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    // If compareWith is specified, compare with that specific revision
    // Otherwise, compare with the parent revision
    let compareId = compareWithId;
    if (!compareId) {
      // Default: compare with previous version in chain
      const previousRevision = await prisma.quotation.findFirst({
        where: {
          quotationNo: quotation.quotationNo,
          version: quotation.version - 1,
        },
        select: { id: true },
      });
      if (!previousRevision) {
        return NextResponse.json(
          { error: "No previous revision to compare with (this is Rev 0)" },
          { status: 400 }
        );
      }
      compareId = previousRevision.id;
    }

    const compareQuotation = await prisma.quotation.findUnique({
      where: { id: compareId },
      include: {
        items: { orderBy: { sNo: "asc" } },
        terms: { orderBy: { termNo: "asc" } },
        paymentTerms: { select: { name: true } },
        deliveryTerms: { select: { name: true } },
      },
    });

    if (!compareQuotation) {
      return NextResponse.json({ error: "Comparison quotation not found" }, { status: 404 });
    }

    if (compareQuotation.quotationNo !== quotation.quotationNo) {
      return NextResponse.json(
        { error: "Can only compare revisions of the same quotation" },
        { status: 400 }
      );
    }

    // Determine left (older) and right (newer)
    const [left, right] = compareQuotation.version < quotation.version
      ? [compareQuotation, quotation]
      : [quotation, compareQuotation];

    // Compare header fields
    const headerChanges: Record<string, { old: any; new: any }> = {};
    const headerFields: [string, string][] = [
      ["validUpto", "Validity"],
      ["currency", "Currency"],
      ["deliveryPeriod", "Delivery Period"],
    ];

    for (const [field, label] of headerFields) {
      const leftVal = (left as any)[field];
      const rightVal = (right as any)[field];
      const leftStr = leftVal instanceof Date ? leftVal.toISOString() : String(leftVal ?? "");
      const rightStr = rightVal instanceof Date ? rightVal.toISOString() : String(rightVal ?? "");
      if (leftStr !== rightStr) {
        headerChanges[label] = { old: leftVal, new: rightVal };
      }
    }

    // Compare payment/delivery terms by name
    if (left.paymentTerms?.name !== right.paymentTerms?.name) {
      headerChanges["Payment Terms"] = {
        old: left.paymentTerms?.name || null,
        new: right.paymentTerms?.name || null,
      };
    }
    if (left.deliveryTerms?.name !== right.deliveryTerms?.name) {
      headerChanges["Delivery Terms"] = {
        old: left.deliveryTerms?.name || null,
        new: right.deliveryTerms?.name || null,
      };
    }

    // Compare items
    const leftItemMap = new Map(left.items.map((i) => [i.sNo, i]));
    const rightItemMap = new Map(right.items.map((i) => [i.sNo, i]));

    const itemsAdded: any[] = [];
    const itemsRemoved: any[] = [];
    const itemsModified: any[] = [];
    const itemsUnchanged: any[] = [];

    const itemCompareFields = [
      "product", "material", "additionalSpec", "sizeLabel", "od", "wt",
      "length", "ends", "quantity", "unitRate", "amount",
      "materialCost", "logisticsCost", "inspectionCost", "otherCosts",
      "totalCostPerUnit", "marginPercentage", "delivery", "remark",
    ];

    // Check right items (new/modified)
    for (const [sNo, rightItem] of rightItemMap) {
      const leftItem = leftItemMap.get(sNo);
      if (!leftItem) {
        itemsAdded.push({
          sNo,
          product: rightItem.product,
          material: rightItem.material,
          sizeLabel: rightItem.sizeLabel,
          quantity: toNumber(rightItem.quantity),
          unitRate: toNumber(rightItem.unitRate),
          amount: toNumber(rightItem.amount),
        });
      } else {
        const changes: Record<string, { old: any; new: any }> = {};
        for (const field of itemCompareFields) {
          const lv = (leftItem as any)[field];
          const rv = (rightItem as any)[field];
          const ln = isDecimalLike(lv) ? Number(lv) : lv;
          const rn = isDecimalLike(rv) ? Number(rv) : rv;
          if (ln !== rn && String(ln ?? "") !== String(rn ?? "")) {
            changes[field] = { old: ln, new: rn };
          }
        }
        if (Object.keys(changes).length > 0) {
          itemsModified.push({
            sNo,
            product: rightItem.product,
            material: rightItem.material,
            sizeLabel: rightItem.sizeLabel,
            changes,
          });
        } else {
          itemsUnchanged.push({ sNo, product: rightItem.product });
        }
      }
    }

    // Check for removed items
    for (const [sNo, leftItem] of leftItemMap) {
      if (!rightItemMap.has(sNo)) {
        itemsRemoved.push({
          sNo,
          product: leftItem.product,
          material: leftItem.material,
          sizeLabel: leftItem.sizeLabel,
          quantity: toNumber(leftItem.quantity),
          unitRate: toNumber(leftItem.unitRate),
          amount: toNumber(leftItem.amount),
        });
      }
    }

    // Compare terms
    const termsChanges: any[] = [];
    const leftTermMap = new Map(left.terms.map((t) => [t.termName, t]));
    const rightTermMap = new Map(right.terms.map((t) => [t.termName, t]));

    for (const [name, rightTerm] of rightTermMap) {
      const leftTerm = leftTermMap.get(name);
      if (!leftTerm) {
        termsChanges.push({ termName: name, change: "added", old: null, new: rightTerm.termValue });
      } else if (leftTerm.termValue !== rightTerm.termValue) {
        termsChanges.push({ termName: name, change: "modified", old: leftTerm.termValue, new: rightTerm.termValue });
      }
    }
    for (const [name] of leftTermMap) {
      if (!rightTermMap.has(name)) {
        termsChanges.push({ termName: name, change: "removed", old: leftTermMap.get(name)!.termValue, new: null });
      }
    }

    // Summary
    const leftTotal = toNumber(left.grandTotal) || 0;
    const rightTotal = toNumber(right.grandTotal) || 0;
    const totalChange = rightTotal - leftTotal;

    // Calculate margin change if costing data available
    const leftSubtotal = toNumber(left.subtotal) || 0;
    const rightSubtotal = toNumber(right.subtotal) || 0;

    return NextResponse.json({
      comparison: {
        left: {
          id: left.id,
          version: left.version,
          status: left.status,
          quotationDate: left.quotationDate,
          grandTotal: leftTotal,
          itemCount: left.items.length,
        },
        right: {
          id: right.id,
          version: right.version,
          status: right.status,
          quotationDate: right.quotationDate,
          grandTotal: rightTotal,
          itemCount: right.items.length,
        },
        headerChanges,
        itemsAdded,
        itemsRemoved,
        itemsModified,
        itemsUnchanged,
        termsChanges,
        summary: {
          totalChange: Math.round(totalChange * 100) / 100,
          totalChangePercent: leftTotal > 0 ? Math.round((totalChange / leftTotal) * 10000) / 100 : 0,
          itemCountChange: right.items.length - left.items.length,
          hasHeaderChanges: Object.keys(headerChanges).length > 0,
          hasItemChanges: itemsAdded.length > 0 || itemsRemoved.length > 0 || itemsModified.length > 0,
          hasTermsChanges: termsChanges.length > 0,
        },
      },
    });
  } catch (error) {
    console.error("Error comparing quotation revisions:", error);
    return NextResponse.json(
      { error: "Failed to compare quotation revisions" },
      { status: 500 }
    );
  }
}
