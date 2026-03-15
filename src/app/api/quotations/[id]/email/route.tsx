import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { generateStandardQuotationHtml } from "@/lib/pdf/quotation-standard-template";
import { generateNonStandardQuotationHtml } from "@/lib/pdf/quotation-nonstandard-template";
import nodemailer from "nodemailer";

// Vercel serverless: increase timeout for email send
export const maxDuration = 30;
export const dynamic = "force-dynamic";

const DEFAULT_COMPANY = {
  companyName: "NPS Piping Solutions",
  regAddressLine1:
    "1210/1211, Prasad Chambers, Tata Road no. 2, Opera House, Charni Road (E)",
  regCity: "Mumbai",
  regPincode: "400004",
  regState: "Maharashtra",
  regCountry: "India",
  telephoneNo: "+91 22 23634200/300",
  email: "info@n-pipe.com",
  website: "www.n-pipe.com",
  companyLogoUrl: null,
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response } = await checkAccess("quotation", "read");
    if (!authorized) return response!;

    const body = await request.json();
    const { to, cc, subject, message } = body;

    if (!to) {
      return NextResponse.json(
        { error: "Recipient email is required" },
        { status: 400 }
      );
    }

    // Fetch quotation
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        preparedBy: { select: { name: true, email: true, phone: true } },
        buyer: true,
        items: {
          orderBy: { sNo: "asc" },
          include: { materialCode: true },
        },
        terms: { orderBy: { termNo: "asc" } },
      },
    });

    if (!quotation) {
      return NextResponse.json(
        { error: "Quotation not found" },
        { status: 404 }
      );
    }

    // Fetch company master
    const company = await prisma.companyMaster.findFirst();
    const companyInfo = company || DEFAULT_COMPANY;

    const isNonStandard = quotation.quotationCategory === "NON_STANDARD";
    const generateHtml = isNonStandard
      ? generateNonStandardQuotationHtml
      : generateStandardQuotationHtml;

    // Generate the quotation HTML (QUOTED version) to embed inline in the email
    const quotationHtml = generateHtml(quotation as any, companyInfo as any, "QUOTED");

    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Prepare email
    const totalAmount = quotation.items.reduce(
      (sum: number, item: any) => sum + parseFloat(item.amount || 0),
      0
    );

    const isRevision = quotation.version > 0;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <h2 style="color: #1e293b;">${isRevision ? "Revised Quotation" : "Quotation"}: ${quotation.quotationNo}${isRevision ? ` (Rev.${quotation.version})` : ""}</h2>
        <p>Dear ${quotation.customer.contactPerson || "Sir/Madam"},</p>
        <p>${message || (isRevision ? "Please find below our revised quotation for your reference. This revision supersedes all previous versions." : "Please find below our quotation for your reference.")}</p>

        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <h3 style="margin-top: 0; color: #334155;">Quotation Summary</h3>
          <table style="font-size: 14px; color: #475569;">
            <tr><td style="padding: 3px 12px 3px 0; font-weight: 600;">Customer:</td><td>${quotation.customer.name}</td></tr>
            ${isRevision ? `<tr><td style="padding: 3px 12px 3px 0; font-weight: 600;">Revision:</td><td>Rev.${quotation.version}</td></tr>` : ""}
            <tr><td style="padding: 3px 12px 3px 0; font-weight: 600;">Date:</td><td>${new Date(quotation.quotationDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td></tr>
            <tr><td style="padding: 3px 12px 3px 0; font-weight: 600;">Total Items:</td><td>${quotation.items.length}</td></tr>
            <tr><td style="padding: 3px 12px 3px 0; font-weight: 600;">Total Amount:</td><td>${quotation.currency} ${totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td></tr>
            ${quotation.validUpto ? `<tr><td style="padding: 3px 12px 3px 0; font-weight: 600;">Valid Until:</td><td>${new Date(quotation.validUpto).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td></tr>` : ""}
          </table>
        </div>

        <p>Please find the detailed quotation below:</p>

        <div style="margin: 24px 0; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden;">
          ${quotationHtml}
        </div>

        <p>Should you have any queries, please feel free to contact us.</p>

        <p>Best regards,<br>
        <strong>${quotation.preparedBy?.name || "Sales Team"}</strong><br>
        ${companyInfo.companyName}<br>
        ${quotation.preparedBy?.email || companyInfo.email || ""}<br>
        ${companyInfo.telephoneNo || ""}</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 11px; color: #94a3b8;">
          This is a computer generated quotation. For any discrepancies, please contact us directly.
        </p>
      </div>
    `;

    // Build mail options
    const mailOptions: nodemailer.SendMailOptions = {
      from:
        process.env.SMTP_FROM ||
        `"${companyInfo.companyName}" <${process.env.SMTP_USER || "noreply@npspipe.com"}>`,
      to,
      subject:
        subject ||
        `${isRevision ? "Revised Quotation" : "Quotation"} ${quotation.quotationNo}${isRevision ? ` Rev.${quotation.version}` : ""} - ${quotation.customer.name}`,
      html: emailHtml,
    };
    if (cc && cc.trim()) {
      mailOptions.cc = cc;
    }

    // Send email and log result
    const emailSubject = mailOptions.subject as string;
    try {
      await transporter.sendMail(mailOptions);
    } catch (sendError: any) {
      // Email failed — log the failure and return error
      try {
        await prisma.quotationEmailLog.create({
          data: {
            quotationId: id,
            sentTo: to,
            sentCc: cc || null,
            subject: emailSubject,
            messageBody: emailHtml,
            sentById: session?.user?.id || null,
            status: "FAILED",
            errorMessage: sendError?.message || "Unknown error",
          },
        });
      } catch (logErr) {
        console.error("Failed to log email failure:", logErr);
      }

      console.error("Error sending email:", sendError?.message || sendError);
      return NextResponse.json(
        { error: sendError?.message || "Failed to send email. Please check SMTP configuration." },
        { status: 500 }
      );
    }

    // Email sent successfully — update status
    await prisma.quotation.update({
      where: { id },
      data: {
        status: "SENT",
        sentDate: new Date(),
        sentTo: to,
      },
    });

    // Auto-supersede: When sending a revision, supersede all previous SENT/APPROVED revisions in chain
    if (quotation.version > 0) {
      await prisma.quotation.updateMany({
        where: {
          quotationNo: quotation.quotationNo,
          id: { not: id },
          status: { in: ["SENT", "APPROVED", "REVISED"] },
        },
        data: { status: "SUPERSEDED" },
      });
    }

    // Log email and audit trail
    try {
      await prisma.quotationEmailLog.create({
        data: {
          quotationId: id,
          sentTo: to,
          sentCc: cc || null,
          subject: emailSubject,
          messageBody: emailHtml,
          sentById: session?.user?.id || null,
          status: "SUCCESS",
        },
      });
    } catch (logErr) {
      console.error("Failed to log successful email:", logErr);
    }

    createAuditLog({
      userId: session?.user?.id,
      action: "EMAIL_SENT",
      tableName: "Quotation",
      recordId: id,
      newValue: JSON.stringify({ to, cc: cc || null, subject: emailSubject }),
    }).catch((err) => console.error("Failed to create audit log:", err));

    return NextResponse.json({
      success: true,
      message: "Quotation sent successfully",
    });
  } catch (error: any) {
    console.error("Error in email route:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "Failed to send email" },
      { status: 500 }
    );
  }
}
