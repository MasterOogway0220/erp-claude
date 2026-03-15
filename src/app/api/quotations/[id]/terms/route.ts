import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { checkAccess, companyFilter } from "@/lib/rbac";

// PUT — Update terms & conditions for a quotation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response, companyId } = await checkAccess("quotation", "write");
    if (!authorized) return response!;

    const existing = await prisma.quotation.findFirst({
      where: { id, ...companyFilter(companyId) },
      select: {
        status: true,
        quotationNo: true,
        terms: { select: { termName: true, termValue: true, isIncluded: true }, orderBy: { termNo: "asc" } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    const userRole = session.user?.role;
    const isAdminOrMgmt = userRole === "SUPER_ADMIN" || userRole === "MANAGEMENT";

    // Allow editing terms for DRAFT (anyone) or other statuses (admin/mgmt only)
    if (existing.status !== "DRAFT" && !isAdminOrMgmt) {
      return NextResponse.json(
        { error: "Only management can edit terms on non-draft quotations" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { terms } = body;

    if (!terms || !Array.isArray(terms)) {
      return NextResponse.json({ error: "Terms array is required" }, { status: 400 });
    }

    // Track changes for audit
    const oldTerms = existing.terms;
    const termChanges: any[] = [];
    terms.forEach((nt: any, idx: number) => {
      const ot = oldTerms[idx];
      if (ot) {
        if (ot.termName !== nt.termName || ot.termValue !== nt.termValue || ot.isIncluded !== (nt.isIncluded ?? true)) {
          termChanges.push({ action: "modified", termName: nt.termName, old: ot.termValue, new: nt.termValue });
        }
      } else {
        termChanges.push({ action: "added", termName: nt.termName });
      }
    });
    oldTerms.forEach((ot: any, idx: number) => {
      if (idx >= terms.length) {
        termChanges.push({ action: "removed", termName: ot.termName });
      }
    });

    await prisma.$transaction(async (tx) => {
      await tx.quotationTerm.deleteMany({ where: { quotationId: id } });
      await tx.quotation.update({
        where: { id },
        data: {
          terms: {
            create: terms.map((term: any, index: number) => ({
              termNo: index + 1,
              termName: term.termName,
              termValue: term.termValue,
              isDefault: term.isDefault ?? false,
              isIncluded: term.isIncluded ?? true,
              isCustom: term.isCustom ?? false,
              isHeadingEditable: term.isHeadingEditable ?? false,
            })),
          },
        },
      });
    });

    createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      tableName: "Quotation",
      recordId: id,
      fieldName: "terms",
      oldValue: `${oldTerms.length} terms`,
      newValue: JSON.stringify({
        quotationNo: existing.quotationNo,
        editedInStatus: existing.status,
        termCount: terms.length,
        changes: termChanges,
      }),
      companyId,
    }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating quotation terms:", error);
    return NextResponse.json(
      { error: "Failed to update terms" },
      { status: 500 }
    );
  }
}
