import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/rbac";
import { storeFile } from "@/lib/storage/files";

// Vercel's filesystem is read-only outside /tmp, and /tmp is wiped between
// invocations — files written to disk here were lost the moment the function
// froze, and the /uploads path they were served from never existed. Uploads
// now go into the database (StoredFile) and are served from /api/files/[id].
//
// The response shape is unchanged: callers keep storing `filePath`, so the
// QAP, inspection, lab report, company logo and order wizard screens needed no
// edits — only where the bytes live changed.
export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response } = await checkAuth();
    if (!authorized) return response!;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const stored = await storeFile(file, {
      uploadedById: session?.user?.id ?? null,
      companyId: session?.user?.companyId ?? null,
    });

    return NextResponse.json(
      {
        filePath: stored.filePath,
        fileName: stored.fileName,
        id: stored.id,
        size: stored.size,
        originalSize: stored.originalSize,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error uploading file:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload file" },
      { status: 500 }
    );
  }
}
