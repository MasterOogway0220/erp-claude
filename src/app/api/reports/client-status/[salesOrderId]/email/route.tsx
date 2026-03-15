import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { renderHtmlToPdf } from "@/lib/pdf/render-pdf";
import { generateClientStatusReportHtml } from "@/lib/pdf/client-status-report-template";
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
  { params }: { params: Promise<{ salesOrderId: string }> }
) {
  try {
    const { authorized, session, response, companyId } = await checkAccess("salesOrder", "read");
    if (!authorized) return response!;

    const { salesOrderId } = await params;
    const body = await request.json();
    const { to, cc, subject, message } = body;

    if (!to) {
      return NextResponse.json(
        { error: "Recipient email is required" },
        { status: 400 }
      );
    }

    // Fetch report data
    const baseUrl = request.nextUrl.origin;
    const dataRes = await fetch(
      `${baseUrl}/api/reports/client-status/${salesOrderId}`,
      {
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
      }
    );

    if (!dataRes.ok) {
      const err = await dataRes.json();
      return NextResponse.json(err, { status: dataRes.status });
    }

    const reportData = await dataRes.json();

    // Get company info
    const company = await prisma.companyMaster.findFirst();
    const companyInfo = company || DEFAULT_COMPANY;

    // Generate PDF attachment
    let pdfBuffer: Buffer;
    try {
      const html = generateClientStatusReportHtml(reportData, companyInfo as any);
      pdfBuffer = await renderHtmlToPdf(html, true);
    } catch (pdfError) {
      console.error("Error generating PDF for email:", pdfError);
      return NextResponse.json(
        { error: "Failed to generate PDF attachment" },
        { status: 500 }
      );
    }

    const soNo = reportData.salesOrder.soNo;
    const baseName = `Order-Status-${soNo.replace(/\//g, "-")}`;
    const attachments = [{ filename: `${baseName}.pdf`, content: pdfBuffer }];

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

    // Build summary for email
    const { summary } = reportData;
    const dispPct = summary.totalOrdered > 0
      ? Math.round((summary.totalDispatched / summary.totalOrdered) * 100)
      : 0;

    // Build email HTML
    const emailHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #1f2937;">
        <div style="background: #1e40af; color: white; padding: 20px 24px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 18px;">Order Status Report</h2>
          <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.85;">${companyInfo.companyName}</p>
        </div>

        <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Dear ${reportData.customer.contactPerson || "Sir/Madam"},</p>
          <p>${message || "Please find attached the current status report for your order. The detailed report is included as a PDF attachment."}</p>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <h3 style="margin: 0 0 12px; font-size: 14px; color: #1e40af;">Order Summary</h3>
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Sales Order</td>
                <td style="padding: 4px 0; font-weight: 600; text-align: right;">${soNo}</td>
              </tr>
              ${reportData.salesOrder.customerPoNo ? `
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Your PO No.</td>
                <td style="padding: 4px 0; font-weight: 600; text-align: right;">${reportData.salesOrder.customerPoNo}</td>
              </tr>` : ""}
              ${reportData.salesOrder.projectName ? `
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Project</td>
                <td style="padding: 4px 0; text-align: right;">${reportData.salesOrder.projectName}</td>
              </tr>` : ""}
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Total Items</td>
                <td style="padding: 4px 0; text-align: right;">${summary.totalItems}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Dispatch Progress</td>
                <td style="padding: 4px 0; font-weight: 600; text-align: right; color: ${dispPct === 100 ? '#16a34a' : '#2563eb'};">${dispPct}%</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Material Ready</td>
                <td style="padding: 4px 0; text-align: right;">${summary.materialReady}/${summary.totalItems}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Inspection Complete</td>
                <td style="padding: 4px 0; text-align: right;">${summary.inspectionComplete}/${summary.totalItems}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Testing Complete</td>
                <td style="padding: 4px 0; text-align: right;">${summary.testingComplete}/${summary.totalItems}</td>
              </tr>
            </table>

            <!-- Progress bar -->
            <div style="margin-top: 12px;">
              <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Overall Dispatch Progress</div>
              <div style="width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
                <div style="width: ${dispPct}%; height: 100%; background: ${dispPct === 100 ? '#16a34a' : '#2563eb'}; border-radius: 4px;"></div>
              </div>
            </div>
          </div>

          <p style="font-size: 13px; color: #64748b;">
            The detailed item-wise status report with inspection, testing, and material preparation status is attached as a PDF document.
          </p>

          <p>Best regards,<br>
          <strong>Sales Team</strong><br>
          ${companyInfo.companyName}<br>
          ${companyInfo.email || ""}${companyInfo.telephoneNo ? ` | ${companyInfo.telephoneNo}` : ""}</p>

          <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 11px; color: #9ca3af;">
            This is an automated email generated from our Order Management System.
            For any queries, please contact your account manager.
          </p>
        </div>
      </div>
    `;

    const mailOptions: nodemailer.SendMailOptions = {
      from:
        process.env.SMTP_FROM ||
        `"${companyInfo.companyName}" <noreply@npspipe.com>`,
      to,
      subject:
        subject ||
        `Order Status Report - ${soNo}${reportData.salesOrder.customerPoNo ? ` (PO: ${reportData.salesOrder.customerPoNo})` : ""} - ${reportData.customer.name}`,
      html: emailHtml,
      attachments,
    };
    if (cc && cc.trim()) {
      mailOptions.cc = cc;
    }

    try {
      await transporter.sendMail(mailOptions);
    } catch (sendError: any) {
      console.error("Error sending status report email:", sendError?.message || sendError);
      return NextResponse.json(
        { error: sendError?.message || "Failed to send email" },
        { status: 500 }
      );
    }

    createAuditLog({
      userId: session?.user?.id,
      companyId,
      action: "EMAIL_SENT",
      tableName: "SalesOrder",
      recordId: salesOrderId,
      newValue: JSON.stringify({
        type: "CLIENT_STATUS_REPORT",
        to,
        cc: cc || null,
        soNo,
      }),
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      message: "Order status report sent successfully",
    });
  } catch (error: any) {
    console.error("Error in client status email:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "Failed to send email" },
      { status: 500 }
    );
  }
}
