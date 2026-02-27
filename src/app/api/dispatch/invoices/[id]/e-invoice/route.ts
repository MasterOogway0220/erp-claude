import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { generateEInvoiceJSON } from "@/lib/business-logic/e-invoice-generator";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response } = await checkAccess("invoice", "read");
    if (!authorized) return response!;

    const eInvoiceJson = await generateEInvoiceJSON(id);

    const jsonString = JSON.stringify(eInvoiceJson, null, 2);
    return new NextResponse(jsonString, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="e-invoice-${id}.json"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating e-invoice:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate e-invoice" },
      { status: 500 }
    );
  }
}
