import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mailFrom, mailer, mailerConfigured } from "@/lib/mailer";
import { hasExpired, needsReminder } from "@/lib/purchase/rfq-reminders";

// Nudges vendors before an RFQ closes and marks the silent ones as no-response
// once it has. Scheduled from vercel.json; see PURCHASE MODULE WORKFLOW,
// "RFQ REMINDER SYSTEM".
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Vercel sends `Authorization: Bearer $CRON_SECRET`. Without the secret set
  // the endpoint refuses outright rather than sitting open to the internet.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const reminded: string[] = [];
  const expired: string[] = [];

  try {
    // Only RFQs that are actually out and still open can have pending vendors.
    const candidates = await prisma.rFQVendor.findMany({
      where: {
        status: "PENDING",
        rfq: { status: { in: ["SENT", "PARTIALLY_RESPONDED"] } },
      },
      include: {
        vendor: { select: { name: true, email: true } },
        rfq: { select: { rfqNo: true, submissionDeadline: true } },
      },
    });

    for (const rv of candidates) {
      const state = {
        status: rv.status,
        sentDate: rv.sentDate,
        submissionDeadline: rv.rfq.submissionDeadline,
        lastReminderDate: rv.lastReminderDate,
      };

      if (hasExpired(state, now)) {
        await prisma.rFQVendor.update({
          where: { id: rv.id },
          data: { status: "EXPIRED" },
        });
        expired.push(`${rv.rfq.rfqNo}/${rv.vendor.name}`);
        continue;
      }

      if (!needsReminder(state, now)) continue;

      // No mail configured is a real condition, not a crash: still record the
      // expiries above, and report the reminders that could not go out.
      if (!mailerConfigured() || !rv.vendor.email) continue;

      const deadline = rv.rfq.submissionDeadline!;
      await mailer().sendMail({
        from: mailFrom("NPS Piping Solutions"),
        to: rv.vendor.email,
        subject: `Reminder: quotation for ${rv.rfq.rfqNo} closes ${deadline.toLocaleDateString("en-IN")}`,
        text:
          `Dear ${rv.vendor.name},\n\n` +
          `This is a reminder that our RFQ ${rv.rfq.rfqNo} closes on ` +
          `${deadline.toLocaleDateString("en-IN")}. We have not yet received your quotation.\n\n` +
          `Kindly send it before the deadline.\n\nProcurement Department\nNPS Piping Solutions`,
      });

      await prisma.rFQVendor.update({
        where: { id: rv.id },
        data: { reminderCount: { increment: 1 }, lastReminderDate: now },
      });
      reminded.push(`${rv.rfq.rfqNo}/${rv.vendor.name}`);
    }

    return NextResponse.json({
      checked: candidates.length,
      reminded: reminded.length,
      expired: expired.length,
      mailConfigured: mailerConfigured(),
      details: { reminded, expired },
    });
  } catch (error: any) {
    console.error("RFQ reminder job failed:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "RFQ reminder job failed", reminded, expired },
      { status: 500 }
    );
  }
}
