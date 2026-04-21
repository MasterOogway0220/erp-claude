import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";

// GET /api/users — returns active users for assignment (deal owner, etc.)
export async function GET() {
  try {
    const { authorized, response, companyId } = await checkAccess("quotation", "read");
    if (!authorized) return response!;

    const users = await prisma.user.findMany({
      where: { isActive: true, role: { not: "SUPER_ADMIN" }, ...companyFilter(companyId) },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });

    // Deduplicate by name (keep first occurrence per name)
    const seen = new Set<string>();
    const deduped = users.filter((u) => {
      const key = (u.name || "").toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({ users: deduped });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
