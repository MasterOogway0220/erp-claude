import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * POST /api/admin/seed-company-admin
 * Creates an ADMIN user for a specific company. SUPER_ADMIN only.
 */
export async function POST(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("admin", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { companyId, name, email, password } = body;

    if (!companyId || !name || !email || !password) {
      return NextResponse.json(
        { error: "companyId, name, email, and password are all required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Verify company exists
    const company = await prisma.companyMaster.findUnique({
      where: { id: companyId },
      select: { id: true, companyName: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Check for duplicate email
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: "ADMIN",
        companyId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
      },
    });

    return NextResponse.json({
      message: `Admin user created for ${company.companyName}`,
      user,
    }, { status: 201 });
  } catch (error) {
    console.error("Error seeding company admin:", error);
    return NextResponse.json(
      { error: "Failed to create company admin" },
      { status: 500 }
    );
  }
}
