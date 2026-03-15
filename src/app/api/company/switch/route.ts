import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/company/switch - Switch active company (SUPER_ADMIN only)
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { companyId } = await request.json();

  if (!companyId) {
    // Clear active company cookie
    const response = NextResponse.json({ message: "Company cleared" });
    response.cookies.set("activeCompanyId", "", { maxAge: 0, path: "/" });
    return response;
  }

  // Validate company exists
  const company = await prisma.companyMaster.findUnique({
    where: { id: companyId },
    select: { id: true, companyName: true },
  });

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const response = NextResponse.json({ message: "Company switched", company });
  response.cookies.set("activeCompanyId", companyId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60, // 24 hours
  });

  return response;
}

/**
 * GET /api/company/switch - Get list of companies (SUPER_ADMIN) or current company info
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role === "SUPER_ADMIN") {
    const companies = await prisma.companyMaster.findMany({
      select: { id: true, companyName: true, regCity: true },
      orderBy: { companyName: "asc" },
    });
    return NextResponse.json({ companies });
  }

  // Non-admin: return their company info
  if (session.user.companyId) {
    const company = await prisma.companyMaster.findUnique({
      where: { id: session.user.companyId },
      select: { id: true, companyName: true },
    });
    return NextResponse.json({ companies: company ? [company] : [] });
  }

  return NextResponse.json({ companies: [] });
}
