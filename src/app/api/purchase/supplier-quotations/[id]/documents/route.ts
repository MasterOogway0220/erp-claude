import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { storeFile } from "@/lib/storage/files";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("supplierQuotation", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const documents = await prisma.supplierQuotationDocument.findMany({
      where: { supplierQuotationId: id },
      include: { uploadedBy: { select: { name: true } } },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, response } = await checkAccess("supplierQuotation", "write");
    if (!authorized) return response!;

    const { id } = await params;

    const sq = await prisma.supplierQuotation.findUnique({ where: { id } });
    if (!sq) {
      return NextResponse.json({ error: "Supplier Quotation not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    let fileType = "OTHER";
    if (["pdf"].includes(ext)) fileType = "PDF";
    else if (["xlsx", "xls", "csv"].includes(ext)) fileType = "EXCEL";
    else if (["doc", "docx"].includes(ext)) fileType = "WORD";
    else if (["jpg", "jpeg", "png", "webp"].includes(ext)) fileType = "IMAGE";

    // Into the database, not the filesystem: this used to write under
    // public/uploads, which is read-only on Vercel, so every upload threw.
    const stored = await storeFile(file, {
      uploadedById: session.user.id,
      companyId: session.user.companyId ?? null,
    });

    const doc = await prisma.supplierQuotationDocument.create({
      data: {
        supplierQuotationId: id,
        fileName: file.name,
        fileType,
        filePath: stored.filePath,
        fileSize: stored.originalSize,
        uploadedById: session.user.id,
      },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}
