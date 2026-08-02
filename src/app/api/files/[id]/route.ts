import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/rbac";
import { readStoredFile } from "@/lib/storage/files";

export const dynamic = "force-dynamic";

// Serves an uploaded document out of the database. Behind auth: these are
// client MTCs, inspection reports and lab certificates, and a cuid in a URL is
// not an access control.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { authorized, response } = await checkAuth();
    if (!authorized) return response!;

    const { id } = await params;
    const file = await readStoredFile(id);
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const download = request.nextUrl.searchParams.get("download") === "1";
    // Quote the filename: MTC names routinely contain spaces and commas.
    const disposition = `${download ? "attachment" : "inline"}; filename="${file.fileName.replace(/"/g, "")}"`;

    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(file.data.length),
        "Content-Disposition": disposition,
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
