import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";

// GET /api/users — returns active employees for assignment dropdowns (deal owner, prepared by, etc.)
// Returns linkedUser.id as the id so it is compatible with Quotation.dealOwnerId / preparedById FKs.
export async function GET() {
  try {
    const { authorized, response, companyId } = await checkAccess("quotation", "read");
    if (!authorized) return response!;

    const employees = await prisma.employeeMaster.findMany({
      where: {
        isActive: true,
        linkedUserId: { not: null },
        ...companyFilter(companyId),
      },
      select: {
        name: true,
        linkedUserId: true,
        linkedUser: { select: { role: true } },
      },
      orderBy: { name: "asc" },
    });

    const users = employees.map((e) => ({
      id: e.linkedUserId as string,
      name: e.name,
      role: e.linkedUser?.role ?? null,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
