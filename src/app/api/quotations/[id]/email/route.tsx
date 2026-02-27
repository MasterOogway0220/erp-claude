import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { renderHtmlToPdf } from "@/lib/pdf/render-pdf";
import { generateStandardQuotationHtml } from "@/lib/pdf/quotation-standard-template";
import { generateNonStandardQuotationHtml } from "@/lib/pdf/quotation-nonstandard-template";
import nodemailer from "nodemailer";

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
        preparedBy: { select: { name: true, email: true } },
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

    // Generate PDF attachment(s)
    const attachments: { filename: string; content: Buffer }[] = [];
    const baseName = quotation.quotationNo.replace(/\//g, "-");

    try {
      const landscape = !isNonStandard;
      const generateHtml = isNonStandard
        ? generateNonStandardQuotationHtml
        : generateStandardQuotationHtml;

      // Generate Quoted PDF
      const quotedHtml = generateHtml(quotation as any, companyInfo as any, "QUOTED");
      const quotedBuf = await renderHtmlToPdf(quotedHtml, landscape);
      attachments.push({
        filename: `${baseName}.pdf`,
        content: quotedBuf,
      });

      // Generate Unquoted PDF
      const unquotedHtml = generateHtml(quotation as any, companyInfo as any, "UNQUOTED");
      const unquotedBuf = await renderHtmlToPdf(unquotedHtml, landscape);
      attachments.push({
        filename: `${baseName}-UNQUOTED.pdf`,
        content: unquotedBuf,
      });
    } catch (pdfError) {
      console.error("Error generating PDF for email attachment:", pdfError);
      return NextResponse.json(
        { error: "Failed to generate PDF attachment" },
        { status: 500 }
      );
    }

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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${isRevision ? "Revised Quotation" : "Quotation"}: ${quotation.quotationNo}${isRevision ? ` (Rev.${quotation.version})` : ""}</h2>
        <p>Dear ${quotation.customer.contactPerson || "Sir/Madam"},</p>
        <p>${message || (isRevision ? "Please find attached our revised quotation for your reference. This revision supersedes all previous versions." : "Please find attached our quotation for your reference.")}</p>

        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Quotation Summary</h3>
          <p><strong>Customer:</strong> ${quotation.customer.name}</p>
          ${isRevision ? `<p><strong>Revision:</strong> Rev.${quotation.version}</p>` : ""}
          <p><strong>Date:</strong> ${new Date(quotation.quotationDate).toLocaleDateString()}</p>
          <p><strong>Total Items:</strong> ${quotation.items.length}</p>
          <p><strong>Total Amount:</strong> ${quotation.currency} ${totalAmount.toFixed(2)}</p>
          ${quotation.validUpto ? `<p><strong>Valid Until:</strong> ${new Date(quotation.validUpto).toLocaleDateString()}</p>` : ""}
        </div>

        <p>Should you have any queries, please feel free to contact us.</p>

        <p>Best regards,<br>
        <strong>${quotation.preparedBy?.name || "Sales Team"}</strong><br>
        ${companyInfo.companyName}<br>
        ${quotation.preparedBy?.email || companyInfo.email || ""}</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #666;">
          This is an automated email. Please do not reply directly to this message.
        </p>
      </div>
    `;

    // Build mail options — omit cc if empty to avoid SMTP errors
    const mailOptions: nodemailer.SendMailOptions = {
      from:
        process.env.SMTP_FROM ||
        `"${companyInfo.companyName}" <noreply@npspipe.com>`,
      to,
      subject:
        subject ||
        `${isRevision ? "Revised Quotation" : "Quotation"} ${quotation.quotationNo}${isRevision ? ` Rev.${quotation.version}` : ""} - ${quotation.customer.name}`,
      html: emailHtml,
      attachments,
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
        { error: sendError?.message || "Failed to send email" },
        { status: 500 }
      );
    }

    // Email sent successfully — update status first (critical), then log (non-blocking)
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

    // Log email and audit trail — non-blocking, should not prevent success response
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
