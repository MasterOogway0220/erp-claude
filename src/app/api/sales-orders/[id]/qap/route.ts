import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { normalizeQapInput } from "@/lib/quality/qap";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { authorized, response } = await checkAccess("salesOrder", "read");
  if (!authorized) return response!;
  const { id } = await params;
  const so = await prisma.salesOrder.findUnique({
    where: { id },
    select: {
      id: true,
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
    const { authorized, response } = await checkAccess("salesOrder", "write");
    if (!authorized) return response!;
    const { id } = await params;
    const body = await req.json();
    const data = normalizeQapInput(body);
    const updated = await prisma.salesOrder.update({ where: { id }, data });
    return NextResponse.json({
      id: updated.id,
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
    const status = detail.startsWith("Invalid qapInspectionLocation") ? 400 : 500;
    return NextResponse.json({ error: "Failed to save QAP", detail }, { status });
  }
}
