import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const product = searchParams.get("product") || "";

    const where: any = { isActive: true };
    if (product) where.product = product;

    const specs = await prisma.additionalSpecOption.findMany({
      where,
      orderBy: [{ product: "asc" }, { specName: "asc" }],
    });

    return NextResponse.json({ specs });
  } catch (error) {
    console.error("Error fetching additional specs:", error);
    return NextResponse.json({ error: "Failed to fetch additional specs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { product, specName } = body;

    if (!product || !specName) {
      return NextResponse.json({ error: "Product and specName are required" }, { status: 400 });
    }

    const spec = await prisma.additionalSpecOption.create({
      data: { product, specName },
    });

    return NextResponse.json(spec, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "This additional spec already exists for this product" }, { status: 400 });
    }
    console.error("Error creating additional spec:", error);
    return NextResponse.json({ error: "Failed to create additional spec" }, { status: 500 });
  }
}
