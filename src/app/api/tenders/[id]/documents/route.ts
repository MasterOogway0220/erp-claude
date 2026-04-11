import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("tender", "read");
    if (!authorized) return response!;

    const { id } = await params;

    const documents = await prisma.tenderDocument.findMany({
      where: { tenderId: id },
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
    const { authorized, session, response } = await checkAccess("tender", "write");
    if (!authorized) return response!;

    const { id } = await params;

    const tender = await prisma.tender.findUnique({ where: { id } });
    if (!tender) {
      return NextResponse.json({ error: "Tender not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "OTHER";

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 });
    }

    // Determine file type
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    let fileType = "OTHER";
    if (["pdf"].includes(ext)) fileType = "PDF";
    else if (["xlsx", "xls", "csv"].includes(ext)) fileType = "EXCEL";
    else if (["doc", "docx"].includes(ext)) fileType = "WORD";
    else if (["jpg", "jpeg", "png", "webp"].includes(ext)) fileType = "IMAGE";

    // Save file
    const uploadDir = path.join(process.cwd(), "public", "uploads", "tenders", id);
    await mkdir(uploadDir, { recursive: true });

    const uniqueName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = path.join(uploadDir, uniqueName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const relativePath = `/uploads/tenders/${id}/${uniqueName}`;

    const doc = await prisma.tenderDocument.create({
      data: {
        tenderId: id,
        fileName: file.name,
        fileType,
        filePath: relativePath,
        fileSize: file.size,
        category,
        uploadedById: session.user.id,
      },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}
