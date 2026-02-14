import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { authorized, response } = await checkAccess("reports", "read");
    if (!authorized) return response!;

    const now = new Date();

    // Fetch all customers with their invoices and payments
    const customers = await prisma.customerMaster.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        invoices: {
          where: {
            status: { in: ["SENT", "PARTIALLY_PAID"] },
          },
          select: {
            id: true,
            totalAmount: true,
            dueDate: true,
            paymentReceipts: {
              select: {
                amountReceived: true,
              },
            },
          },
        },
      },
    });

    const customerAgeing = customers
      .map((customer) => {
        const ageingBuckets = {
          "0-30": 0,
          "31-60": 0,
          "61-90": 0,
          "91+": 0,
        };

        let totalOutstanding = 0;

        for (const invoice of customer.invoices) {
          const invoiceTotal = Number(invoice.totalAmount);
          const paymentsReceived = invoice.paymentReceipts.reduce(
            (sum, pr) => sum + Number(pr.amountReceived),
            0
          );
          const outstanding = invoiceTotal - paymentsReceived;

          if (outstanding <= 0) continue;

          totalOutstanding += outstanding;

          // Calculate age from due date
          const dueDate = invoice.dueDate ?? now;
          const ageDays = Math.max(
            0,
            Math.floor(
              (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
            )
          );

          if (ageDays <= 30) {
            ageingBuckets["0-30"] += outstanding;
          } else if (ageDays <= 60) {
            ageingBuckets["31-60"] += outstanding;
          } else if (ageDays <= 90) {
            ageingBuckets["61-90"] += outstanding;
          } else {
            ageingBuckets["91+"] += outstanding;
          }
        }

        return {
          customerId: customer.id,
          customerName: customer.name,
          totalOutstanding: Number(totalOutstanding.toFixed(2)),
          ageingBuckets: {
            "0-30": Number(ageingBuckets["0-30"].toFixed(2)),
            "31-60": Number(ageingBuckets["31-60"].toFixed(2)),
            "61-90": Number(ageingBuckets["61-90"].toFixed(2)),
            "91+": Number(ageingBuckets["91+"].toFixed(2)),
          },
        };
      })
      .filter((c) => c.totalOutstanding > 0)
      .sort((a, b) => b.totalOutstanding - a.totalOutstanding);

    return NextResponse.json({ customers: customerAgeing });
  } catch (error) {
    console.error("Error fetching customer ageing:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer ageing data" },
      { status: 500 }
    );
  }
}
