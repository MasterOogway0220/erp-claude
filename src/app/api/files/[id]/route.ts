import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/rbac";
import { readStoredFile } from "@/lib/storage/files";

export const dynamic = "force-dynamic";

// Only these open in the browser; anything else is forced to download.
const PREVIEWABLE = /^(image\/(png|jpeg|webp)|application\/pdf)$/;

// Serves an uploaded document out of the database. Behind auth: these are
// client MTCs, inspection reports and lab certificates, and a cuid in a URL is
// not an access control. The file must belong to the caller's company.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, session, companyId, response } = await checkAuth();
    if (!authorized) return response!;

    const { id } = await params;
    const file = await readStoredFile(id);
    const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
    if (!file || (!isSuperAdmin && file.companyId !== companyId)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const download = request.nextUrl.searchParams.get("download") === "1";
    const inline = !download && PREVIEWABLE.test(file.mimeType);
    // Quote the filename: MTC names routinely contain spaces and commas.
    const disposition = `${inline ? "inline" : "attachment"}; filename="${file.fileName.replace(/"/g, "")}"`;

    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(file.data.length),
        "Content-Disposition": disposition,
        "X-Content-Type-Options": "nosniff",
        // Immutable: a stored file's bytes never change, only the row is
        // deleted. Private because the content is customer documentation.
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error reading stored file:", error);
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}
