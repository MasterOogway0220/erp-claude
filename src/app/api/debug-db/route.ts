import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const url = process.env.DATABASE_URL || "NOT SET";
    const urlPreview = url.substring(0, 30) + "...";
    const user = await prisma.user.findUnique({
      where: { email: "admin@n-pipe.com" },
      select: { id: true, email: true, isActive: true },
    });
    return NextResponse.json({ ok: true, urlPreview, user });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message, code: e.code }, { status: 500 });
  }
}
