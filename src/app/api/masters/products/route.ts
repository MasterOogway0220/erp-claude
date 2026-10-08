import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Catalog data is global — the product catalog is shared across all
    // company entities (the physical steel is the same); no company scoping.
    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { product: { contains: search } },
        { material: { contains: search } },
        { additionalSpec: { contains: search } },
        { specification: { contains: search } },
        { grade: { contains: search } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.productSpecMaster.findMany({
        where,
        skip,
        take: limit,
        orderBy: { product: "asc" },
        include: {
          dimensionalStandard: true,
        },
      }),
      prisma.productSpecMaster.count({ where }),
    ]);

    return NextResponse.json({
      products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { product, category, specification, grade, material, additionalSpec, ends, size, length, dimensionalStandardId } = body;

    // Trimmed: a stray trailing space is how "C.S. SEAMLESS PIPE " came to sit
    // beside "C.S. SEAMLESS PIPE" and show twice in the product picker.
    const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
    const name = text(product);
    if (!name) {
      return NextResponse.json(
        { error: "Product is required" },
        { status: 400 }
      );
    }

    const fields = {
      product: name,
      category: category || null,
      specification: text(specification),
      grade: text(grade),
      material: text(material),
      additionalSpec: text(additionalSpec),
      ends: text(ends),
      size: text(size),
      length: text(length),
      dimensionalStandardId: dimensionalStandardId || null,
      companyId,
    };

    // Reject an identical row. All fields, not just the product: rows of one
    // product legitimately differ by size, ends, spec. MySQL's default
    // collation compares case-insensitively and ignores trailing spaces.
    const existing = await prisma.productSpecMaster.findFirst({ where: fields, select: { id: true } });
    if (existing) {
      return NextResponse.json(
        { error: "This product already exists in the master with the same details" },
        { status: 409 }
      );
    }

    const newProduct = await prisma.productSpecMaster.create({ data: fields });

    createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      tableName: "ProductSpecMaster",
      recordId: newProduct.id,
      newValue: JSON.stringify({ product: newProduct.product }),
      companyId,
    }).catch(console.error);

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
