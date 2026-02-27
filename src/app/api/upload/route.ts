import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// On Vercel, only /tmp is writable at runtime.
// Note: /tmp is ephemeral — files are lost between function invocations.
// For persistent file storage, migrate to cloud storage (S3, Cloudinary, etc.)
const UPLOAD_DIR =
  process.env.NODE_ENV === "production"
    ? "/tmp/uploads"
    : path.join(process.cwd(), "uploads");

export async function POST(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await mkdir(UPLOAD_DIR, { recursive: true });

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${timestamp}_${safeName}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    await writeFile(filePath, buffer);

    return NextResponse.json(
      { filePath: `/uploads/${fileName}`, fileName },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
