import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

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
    const { authorized, session, response } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { product, category, specification, grade, material, additionalSpec, ends, length, dimensionalStandardId } = body;

    if (!product) {
      return NextResponse.json(
        { error: "Product is required" },
        { status: 400 }
      );
    }

    const newProduct = await prisma.productSpecMaster.create({
      data: {
        product,
        category: category || null,
        specification: specification || null,
        grade: grade || null,
        material: material || null,
        additionalSpec: additionalSpec || null,
        ends: ends || null,
        length: length || null,
        dimensionalStandardId: dimensionalStandardId || null,
      },
    });

    createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      tableName: "ProductSpecMaster",
      recordId: newProduct.id,
      newValue: JSON.stringify({ product: newProduct.product }),
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
