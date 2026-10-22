import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { normalizeQapInput } from "@/lib/quality/qap";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { authorized, response, companyId } = await checkAccess("salesOrder", "read");
  if (!authorized) return response!;
  if (!companyId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { id } = await params;
  const so = await prisma.salesOrder.findFirst({
    where: { id, companyId },
    select: {
      id: true,
      orderInspectionType: true,
      qapInspectionRequired: true,
      qapInspectionLocation: true,
      qapTpiAgencyId: true,
      qapDocumentPath: true,
      qapProposedInspectionDate: true,
      qapRemarks: true,
    },
  });
  if (!so) return NextResponse.json({ error: "Sales Order not found" }, { status: 404 });
  return NextResponse.json(so);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { authorized, response, companyId } = await checkAccess("salesOrder", "write");
    if (!authorized) return response!;
    if (!companyId) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { id } = await params;
    const body = await req.json();
    const data = normalizeQapInput(body);
    const owned = await prisma.salesOrder.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!owned) return NextResponse.json({ error: "Sales Order not found" }, { status: 404 });
    const updated = await prisma.salesOrder.update({ where: { id }, data });
    return NextResponse.json({
      id: updated.id,
      orderInspectionType: updated.orderInspectionType,
      qapInspectionRequired: updated.qapInspectionRequired,
      qapInspectionLocation: updated.qapInspectionLocation,
      qapTpiAgencyId: updated.qapTpiAgencyId,
      qapDocumentPath: updated.qapDocumentPath,
      qapProposedInspectionDate: updated.qapProposedInspectionDate,
      qapRemarks: updated.qapRemarks,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("QAP save error:", detail);
    const status =
      detail.startsWith("Invalid qapInspectionLocation") ||
      detail.startsWith("Invalid orderInspectionType")
        ? 400
        : 500;
    return NextResponse.json({ error: "Failed to save QAP", detail }, { status });
  }
}
