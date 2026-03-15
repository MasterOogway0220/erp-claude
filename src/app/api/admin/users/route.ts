import { NextRequest, NextResponse } from "next/server";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("admin", "read");
    if (!authorized) return response!;

    const userRole = session.user?.role;

    // ADMIN users only see users from their own company
    // SUPER_ADMIN sees users filtered by active company (or all if no company selected)
    const where: any = { ...companyFilter(companyId) };

    // ADMIN should not see SUPER_ADMIN users
    if (userRole === "ADMIN") {
      where.role = { not: "SUPER_ADMIN" };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLogin: true,
        phone: true,
        companyId: true,
        createdAt: true,
        company: {
          select: { id: true, companyName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("admin", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { email, name, password, role, phone } = body;

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "Email, name, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const userRole = session.user?.role;

    // ADMIN cannot create SUPER_ADMIN users
    if (userRole === "ADMIN" && role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "You cannot create a Super Admin user" },
        { status: 403 }
      );
    }

    // ADMIN must assign users to their own company
    if (userRole === "ADMIN" && !companyId) {
      return NextResponse.json(
        { error: "No company assigned. Contact your Super Admin." },
        { status: 400 }
      );
    }

    // Check for duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
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
        role: role || "SALES",
        phone: phone || null,
        ...(companyId ? { companyId } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLogin: true,
        phone: true,
        companyId: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
