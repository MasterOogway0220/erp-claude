import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { renderHtmlToPdf } from "@/lib/pdf/render-pdf";
import { generateInvoiceHtml } from "@/lib/pdf/invoice-template";
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
  gstNo: null,
  panNo: null,
  companyLogoUrl: null,
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response } = await checkAccess("invoice", "read");
    if (!authorized) return response!;

    const body = await request.json();
    const { to, cc, subject, message } = body;

    if (!to) {
      return NextResponse.json(
        { error: "Recipient email is required" },
        { status: 400 }
      );
    }

    // Fetch invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sNo: "asc" } },
        customer: true,
        salesOrder: { select: { soNo: true } },
        dispatchNote: { select: { dnNo: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Fetch company master
    const company = await prisma.companyMaster.findFirst();
    const companyInfo = company || DEFAULT_COMPANY;

    // Generate PDF attachment
    const invoiceData = {
      invoiceNo: invoice.invoiceNo,
      invoiceDate: invoice.invoiceDate,
      invoiceType: invoice.invoiceType,
      dueDate: invoice.dueDate,
      placeOfSupply: invoice.placeOfSupply,
      customerGstin: invoice.customerGstin,
      eWayBillNo: invoice.eWayBillNo,
      currency: invoice.currency,
      subtotal: Number(invoice.subtotal),
      cgst: Number(invoice.cgst),
      sgst: Number(invoice.sgst),
      igst: Number(invoice.igst),
      tcsAmount: Number(invoice.tcsAmount),
      roundOff: Number(invoice.roundOff),
      totalAmount: Number(invoice.totalAmount),
      amountInWords: invoice.amountInWords,
      customer: invoice.customer as any,
      salesOrder: invoice.salesOrder,
      dispatchNote: invoice.dispatchNote,
      items: invoice.items.map((item) => ({
        sNo: item.sNo,
        description: item.description,
        heatNo: item.heatNo,
        sizeLabel: item.sizeLabel,
        hsnCode: item.hsnCode,
        uom: item.uom,
        quantity: Number(item.quantity),
        unitRate: Number(item.unitRate),
        amount: Number(item.amount),
        taxRate: item.taxRate ? Number(item.taxRate) : null,
      })),
    };

    let pdfBuffer: Buffer;
    try {
      const html = generateInvoiceHtml(invoiceData, companyInfo as any);
      pdfBuffer = await renderHtmlToPdf(html, false);
    } catch (pdfError) {
      console.error("Error generating PDF for email attachment:", pdfError);
      return NextResponse.json(
        { error: "Failed to generate PDF attachment" },
        { status: 500 }
      );
    }

    const baseName = invoice.invoiceNo.replace(/\//g, "-");
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

    // Build email HTML
    const totalAmount = Number(invoice.totalAmount);
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Invoice: ${invoice.invoiceNo}</h2>
        <p>Dear ${invoice.customer.contactPerson || "Sir/Madam"},</p>
        <p>${message || "Please find attached our invoice for your reference."}</p>

        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Invoice Summary</h3>
          <p><strong>Customer:</strong> ${invoice.customer.name}</p>
          <p><strong>Invoice Date:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString()}</p>
          <p><strong>Total Amount:</strong> ${invoice.currency} ${totalAmount.toFixed(2)}</p>
          ${invoice.dueDate ? `<p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>` : ""}
          ${invoice.salesOrder ? `<p><strong>SO Ref:</strong> ${invoice.salesOrder.soNo}</p>` : ""}
        </div>

        <p>Kindly arrange payment at the earliest.</p>

        <p>Best regards,<br>
        <strong>Accounts Team</strong><br>
        ${companyInfo.companyName}<br>
        ${companyInfo.email || ""}</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #666;">
          This is an automated email. Please do not reply directly to this message.
        </p>
      </div>
    `;

    // Build mail options
    const mailOptions: nodemailer.SendMailOptions = {
      from:
        process.env.SMTP_FROM ||
        `"${companyInfo.companyName}" <noreply@npspipe.com>`,
      to,
      subject:
        subject ||
        `Invoice ${invoice.invoiceNo} - ${invoice.customer.name}`,
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
      // Log failure
      try {
        await prisma.invoiceEmailLog.create({
          data: {
            invoiceId: id,
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

    // Email sent successfully — update status if DRAFT
    if (invoice.status === "DRAFT") {
      await prisma.invoice.update({
        where: { id },
        data: { status: "SENT" },
      });
    }

    // Log successful email
    try {
      await prisma.invoiceEmailLog.create({
        data: {
          invoiceId: id,
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
      tableName: "Invoice",
      recordId: id,
      newValue: JSON.stringify({ to, cc: cc || null, subject: emailSubject }),
    }).catch((err) => console.error("Failed to create audit log:", err));

    return NextResponse.json({
      success: true,
      message: "Invoice sent successfully",
    });
  } catch (error: any) {
    console.error("Error in invoice email route:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "Failed to send email" },
      { status: 500 }
    );
  }
}
