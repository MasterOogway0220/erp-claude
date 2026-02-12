import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await prisma.offerTermTemplate.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Error fetching offer term templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch offer term templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.termName) {
      return NextResponse.json(
        { error: "Term name is required" },
        { status: 400 }
      );
    }

    // Get max sortOrder
    const maxSort = await prisma.offerTermTemplate.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const template = await prisma.offerTermTemplate.create({
      data: {
        termName: body.termName,
        termDefaultValue: body.termDefaultValue || null,
        sortOrder: body.sortOrder ?? (maxSort ? maxSort.sortOrder + 1 : 1),
        isExportOnly: body.isExportOnly ?? false,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Error creating offer term template:", error);
    return NextResponse.json(
      { error: "Failed to create offer term template" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    const template = await prisma.offerTermTemplate.update({
      where: { id: body.id },
      data: {
        termName: body.termName,
        termDefaultValue: body.termDefaultValue,
        sortOrder: body.sortOrder,
        isExportOnly: body.isExportOnly,
        isActive: body.isActive,
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error updating offer term template:", error);
    return NextResponse.json(
      { error: "Failed to update offer term template" },
      { status: 500 }
    );
  }
}
