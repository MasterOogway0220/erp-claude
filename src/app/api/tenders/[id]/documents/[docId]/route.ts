import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { authorized, response } = await checkAccess("tender", "delete");
    if (!authorized) return response!;

    const { id, docId } = await params;

    const doc = await prisma.tenderDocument.findFirst({
      where: { id: docId, tenderId: id },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Delete file from disk
    try {
      const fullPath = path.join(process.cwd(), "public", doc.filePath);
      await unlink(fullPath);
    } catch (err) {
      console.error("Failed to delete file from disk:", err);
    }

    await prisma.tenderDocument.delete({ where: { id: docId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
