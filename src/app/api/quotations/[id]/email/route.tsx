import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
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
    const { authorized, response } = await checkAccess("quotation", "read");
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
        enquiry: true,
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
      if (isNonStandard) {
        // Generate sequentially to avoid resource issues
        const commercialHtml = generateNonStandardQuotationHtml(
          quotation as any,
          companyInfo as any,
          "COMMERCIAL"
        );
        const commercialBuf = await renderHtmlToPdf(commercialHtml, false);
        attachments.push({
          filename: `${baseName}-COMMERCIAL.pdf`,
          content: commercialBuf,
        });

        const technicalHtml = generateNonStandardQuotationHtml(
          quotation as any,
          companyInfo as any,
          "TECHNICAL"
        );
        const technicalBuf = await renderHtmlToPdf(technicalHtml, false);
        attachments.push({
          filename: `${baseName}-TECHNICAL.pdf`,
          content: technicalBuf,
        });
      } else {
        const html = generateStandardQuotationHtml(
          quotation as any,
          companyInfo as any
        );
        const pdfBuffer = await renderHtmlToPdf(html, true);
        attachments.push({
          filename: `${baseName}.pdf`,
          content: pdfBuffer,
        });
      }
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

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Quotation: ${quotation.quotationNo}</h2>
        <p>Dear ${quotation.customer.contactPerson || "Sir/Madam"},</p>
        <p>${message || "Please find attached our quotation for your reference."}</p>

        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Quotation Summary</h3>
          <p><strong>Customer:</strong> ${quotation.customer.name}</p>
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
        `Quotation ${quotation.quotationNo} - ${quotation.customer.name}`,
      html: emailHtml,
      attachments,
    };
    if (cc && cc.trim()) {
      mailOptions.cc = cc;
    }

    await transporter.sendMail(mailOptions);

    // Update quotation status to SENT
    await prisma.quotation.update({
      where: { id },
      data: {
        status: "SENT",
        sentDate: new Date(),
        sentTo: to,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Quotation sent successfully",
    });
  } catch (error: any) {
    console.error("Error sending email:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "Failed to send email" },
      { status: 500 }
    );
  }
}
