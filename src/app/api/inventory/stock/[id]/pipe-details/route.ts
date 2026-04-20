import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess, companyFilter } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response, companyId } = await checkAccess("inventory", "read");
    if (!authorized) return response!;

    // Verify stock exists and belongs to company
    const stock = await prisma.inventoryStock.findUnique({
      where: { id, ...companyFilter(companyId) },
      select: { id: true, pieces: true, heatNo: true, make: true, mtcNo: true, mtcDate: true },
    });

    if (!stock) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    const pipeDetails = await prisma.pipeMaterialDetail.findMany({
      where: { inventoryStockId: id },
      orderBy: { pipeNo: "asc" },
    });

    return NextResponse.json({ pipeDetails, stock });
  } catch (error) {
    console.error("Error fetching pipe details:", error);
    return NextResponse.json({ error: "Failed to fetch pipe details" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response, companyId } = await checkAccess("inventory", "write");
    if (!authorized) return response!;

    const stock = await prisma.inventoryStock.findUnique({
      where: { id, ...companyFilter(companyId) },
      select: { id: true, pieces: true, heatNo: true, make: true, mtcNo: true, mtcDate: true },
    });

    if (!stock) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    const body = await request.json();
    const { pipes } = body;

    if (!Array.isArray(pipes) || pipes.length === 0) {
      return NextResponse.json({ error: "At least one pipe detail is required" }, { status: 400 });
    }

    // Validate pipe numbers are unique
    const pipeNos = pipes.map((p: any) => p.pipeNo);
    if (new Set(pipeNos).size !== pipeNos.length) {
      return NextResponse.json({ error: "Pipe numbers must be unique" }, { status: 400 });
    }

    // Check for conflicts with existing pipe numbers
    const existing = await prisma.pipeMaterialDetail.findMany({
      where: { inventoryStockId: id, pipeNo: { in: pipeNos } },
      select: { pipeNo: true },
    });

    if (existing.length > 0) {
      const conflicting = existing.map((e) => e.pipeNo).join(", ");
      return NextResponse.json(
        { error: `Pipe numbers already exist: ${conflicting}` },
        { status: 400 }
      );
    }

    const created = await prisma.pipeMaterialDetail.createMany({
      data: pipes.map((pipe: any) => ({
        inventoryStockId: id,
        pipeNo: pipe.pipeNo,
        length: pipe.length || null,
        heatNo: pipe.heatNo || stock.heatNo || null,
        make: pipe.make || stock.make || null,
        mtcNo: pipe.mtcNo || stock.mtcNo || null,
        mtcDate: pipe.mtcDate ? new Date(pipe.mtcDate) : stock.mtcDate || null,
        bundleNo: pipe.bundleNo || null,
        quantity: pipe.quantity || 1,
        remarks: pipe.remarks || null,
      })),
    });

    const pipeDetails = await prisma.pipeMaterialDetail.findMany({
      where: { inventoryStockId: id },
      orderBy: { pipeNo: "asc" },
    });

    return NextResponse.json({ pipeDetails, created: created.count }, { status: 201 });
  } catch (error) {
    console.error("Error creating pipe details:", error);
    return NextResponse.json({ error: "Failed to create pipe details" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response, companyId } = await checkAccess("inventory", "write");
    if (!authorized) return response!;

    const stock = await prisma.inventoryStock.findUnique({
      where: { id, ...companyFilter(companyId) },
      select: { id: true },
    });

    if (!stock) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    const body = await request.json();
    const { pipes } = body;

    if (!Array.isArray(pipes)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Replace all pipe details in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.pipeMaterialDetail.deleteMany({ where: { inventoryStockId: id } });

      if (pipes.length > 0) {
        await tx.pipeMaterialDetail.createMany({
          data: pipes.map((pipe: any) => ({
            inventoryStockId: id,
            pipeNo: pipe.pipeNo,
            length: pipe.length || null,
            heatNo: pipe.heatNo || null,
            make: pipe.make || null,
            mtcNo: pipe.mtcNo || null,
            mtcDate: pipe.mtcDate ? new Date(pipe.mtcDate) : null,
            bundleNo: pipe.bundleNo || null,
            quantity: pipe.quantity || 1,
            remarks: pipe.remarks || null,
          })),
        });
      }
    });

    const pipeDetails = await prisma.pipeMaterialDetail.findMany({
      where: { inventoryStockId: id },
      orderBy: { pipeNo: "asc" },
    });

    return NextResponse.json({ pipeDetails });
  } catch (error) {
    console.error("Error updating pipe details:", error);
    return NextResponse.json({ error: "Failed to update pipe details" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response, companyId } = await checkAccess("inventory", "write");
    if (!authorized) return response!;

    const stock = await prisma.inventoryStock.findUnique({
      where: { id, ...companyFilter(companyId) },
      select: { id: true },
    });

    if (!stock) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const pipeDetailId = url.searchParams.get("pipeDetailId");

    if (pipeDetailId) {
      await prisma.pipeMaterialDetail.delete({ where: { id: pipeDetailId, inventoryStockId: id } });
    } else {
      await prisma.pipeMaterialDetail.deleteMany({ where: { inventoryStockId: id } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting pipe details:", error);
    return NextResponse.json({ error: "Failed to delete pipe details" }, { status: 500 });
  }
}
