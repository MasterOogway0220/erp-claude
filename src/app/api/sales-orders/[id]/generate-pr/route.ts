import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import {
  analyzeSalesOrderShortfall,
  handleAutoGeneratePR,
} from "@/lib/business-logic/auto-pr-generation";

// GET — Analyze shortfall without generating PR
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response } = await checkAccess("purchase_requisition", "read");
    if (!authorized) return response!;

    const analysis = await analyzeSalesOrderShortfall(id);
    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error("Error analyzing shortfall:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to analyze shortfall" },
      { status: 500 }
    );
  }
}

// POST — Generate PR from SO shortfall
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response } = await checkAccess("purchase_requisition", "write");
    if (!authorized) return response!;

    const body = await request.json().catch(() => ({}));

    const result = await handleAutoGeneratePR(id, session.user.id, {
      autoSubmitForApproval: body.autoSubmitForApproval ?? false,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 200 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Error generating PR:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate PR" },
      { status: 500 }
    );
  }
}
