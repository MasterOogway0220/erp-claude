import { NextRequest, NextResponse } from "next/server";
import { checkAccess, companyFilter } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response, companyId } = await checkAccess("masters", "read");
    if (!authorized) return response!;

    const tests = await prisma.testingMaster.findMany({
      where: { ...companyFilter(companyId) },
      orderBy: { testName: "asc" },
    });

    return NextResponse.json({
      tests,
      testingMasters: tests,
      count: tests.length,
    });
  } catch (error) {
    console.error("Error fetching testing masters:", error);
    return NextResponse.json(
      { error: "Failed to fetch testing masters" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("masters", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { testName, applicableFor, isMandatory } = body;

    if (!testName?.trim()) {
      return NextResponse.json({ error: "Test name is required" }, { status: 400 });
    }

    const test = await prisma.testingMaster.create({
      data: {
        testName: testName.trim(),
        applicableFor: applicableFor || null,
        isMandatory: isMandatory === true,
        companyId,
      },
    });

    await createAuditLog({
      tableName: "TestingMaster",
      recordId: test.id,
      action: "CREATE",
      userId: session.user?.id,
      companyId,
    });

    return NextResponse.json(test, { status: 201 });
  } catch (error) {
    console.error("Error creating testing master:", error);
    return NextResponse.json({ error: "Failed to create testing type" }, { status: 500 });
  }
}
