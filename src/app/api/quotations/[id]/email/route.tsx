import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { QuotationPDF } from "@/lib/pdf/quotation-pdf";
import nodemailer from "nodemailer";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
        items: { orderBy: { sNo: "asc" } },
        terms: { orderBy: { termNo: "asc" } },
      },
    });

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    // Generate PDF buffer
    const pdfBuffer = await renderToBuffer(<QuotationPDF quotation={quotation} />);

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
        NPS Piping Solutions<br>
        ${quotation.preparedBy?.email || "info@npspipe.com"}</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #666;">
          This is an automated email. Please do not reply directly to this message.
        </p>
      </div>
    `;

    // Send email
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"NPS Piping" <noreply@npspipe.com>',
      to,
      cc,
      subject: subject || `Quotation ${quotation.quotationNo} - ${quotation.customer.name}`,
      html: emailHtml,
      attachments: [
        {
          filename: `${quotation.quotationNo.replace(/\//g, "-")}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

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
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
