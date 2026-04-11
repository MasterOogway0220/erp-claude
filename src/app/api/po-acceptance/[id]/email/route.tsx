import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { generatePOAcceptanceLetterHtml } from "@/lib/pdf/po-acceptance-template";
import nodemailer from "nodemailer";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const DEFAULT_COMPANY = {
  companyName: "NPS Piping Solutions",
  regAddressLine1: "1210/1211, Prasad Chambers, Tata Road no. 2, Opera House, Charni Road (E)",
  regCity: "Mumbai", regPincode: "400004", regState: "Maharashtra", regCountry: "India",
  telephoneNo: "+91 22 23634200/300", email: "info@n-pipe.com", website: "www.n-pipe.com",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, session, response } = await checkAccess("poAcceptance", "write");
    if (!authorized) return response!;

    const body = await request.json();
    const { to, cc, subject, message } = body;

    if (!to) {
      return NextResponse.json({ error: "Recipient email is required" }, { status: 400 });
    }

    // Check SMTP configuration
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return NextResponse.json(
        { error: "Email not configured. Please set SMTP environment variables." },
        { status: 500 }
      );
    }

    const acceptance = await prisma.pOAcceptance.findUnique({
      where: { id },
      include: {
        clientPurchaseOrder: {
          include: {
            customer: {
              select: {
                name: true, contactPerson: true, email: true, phone: true,
                addressLine1: true, addressLine2: true, city: true, state: true, gstNo: true,
              },
            },
            items: { orderBy: { sNo: "asc" } },
          },
        },
        company: true,
      },
    });

    if (!acceptance) {
      return NextResponse.json({ error: "PO Acceptance not found" }, { status: 404 });
    }

    if (acceptance.status !== "ISSUED") {
      return NextResponse.json({ error: "Can only email issued acceptances" }, { status: 400 });
    }

    const cpo = acceptance.clientPurchaseOrder;
    const companyInfo = acceptance.company || DEFAULT_COMPANY;

    // Generate acceptance letter HTML
    const letterHtml = generatePOAcceptanceLetterHtml(
      {
        acceptanceNo: acceptance.acceptanceNo,
        acceptanceDate: acceptance.acceptanceDate,
        committedDeliveryDate: acceptance.committedDeliveryDate,
        remarks: acceptance.remarks,
        followUpName: acceptance.followUpName,
        followUpEmail: acceptance.followUpEmail,
        followUpPhone: acceptance.followUpPhone,
        qualityName: acceptance.qualityName,
        qualityEmail: acceptance.qualityEmail,
        qualityPhone: acceptance.qualityPhone,
        accountsName: acceptance.accountsName,
        accountsEmail: acceptance.accountsEmail,
        accountsPhone: acceptance.accountsPhone,
        clientPO: {
          cpoNo: cpo.cpoNo,
          clientPoNumber: cpo.clientPoNumber,
          clientPoDate: cpo.clientPoDate,
          projectName: cpo.projectName,
          paymentTerms: cpo.paymentTerms,
          deliveryTerms: cpo.deliveryTerms,
          currency: cpo.currency,
          subtotal: cpo.subtotal ? Number(cpo.subtotal) : null,
          grandTotal: cpo.grandTotal ? Number(cpo.grandTotal) : null,
        },
        items: cpo.items.map((item) => ({
          sNo: item.sNo,
          product: item.product,
          material: item.material,
          additionalSpec: item.additionalSpec,
          sizeLabel: item.sizeLabel,
          ends: item.ends,
          uom: item.uom,
          qtyOrdered: Number(item.qtyOrdered),
          unitRate: Number(item.unitRate),
          amount: Number(item.amount),
        })),
        customer: cpo.customer,
      },
      companyInfo as any
    );

    // Compose email
    const emailSubject = subject || `PO Acceptance — ${acceptance.acceptanceNo} | ${(companyInfo as any).companyName || "NPS Piping Solutions"}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <h2 style="color: #1e293b;">PO Acceptance: ${acceptance.acceptanceNo}</h2>
        <p>Dear ${cpo.customer.contactPerson || "Sir/Madam"},</p>
        <p>${message || "Please find below our Purchase Order Acceptance for your reference."}</p>

        <div style="margin: 24px 0; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden;">
          ${letterHtml}
        </div>

        <p>Should you have any queries, please feel free to contact us.</p>
        <p>Best regards,<br>
        <strong>${(companyInfo as any).companyName || "NPS Piping Solutions"}</strong><br>
        ${(companyInfo as any).email || ""}<br>
        ${(companyInfo as any).telephoneNo || ""}</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 11px; color: #94a3b8;">
          This is a computer generated document. For any discrepancies, please contact us directly.
        </p>
      </div>
    `;

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions: nodemailer.SendMailOptions = {
      from: process.env.SMTP_FROM || `"${(companyInfo as any).companyName || "NPS Piping Solutions"}" <${process.env.SMTP_USER || "noreply@npspipe.com"}>`,
      to,
      subject: emailSubject,
      html: emailHtml,
    };
    if (cc && cc.trim()) {
      mailOptions.cc = cc;
    }

    // Send
    try {
      await transporter.sendMail(mailOptions);
    } catch (sendError: any) {
      try {
        await prisma.pOAcceptanceEmailLog.create({
          data: {
            poAcceptanceId: id,
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

    // Log success
    try {
      await prisma.pOAcceptanceEmailLog.create({
        data: {
          poAcceptanceId: id,
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
      tableName: "POAcceptance",
      recordId: id,
      newValue: JSON.stringify({ to, cc: cc || null, subject: emailSubject }),
    }).catch((err) => console.error("Failed to create audit log:", err));

    return NextResponse.json({ success: true, message: "PO Acceptance letter sent successfully" });
  } catch (error: any) {
    console.error("Error in PO acceptance email route:", error?.message || error);
    return NextResponse.json({ error: error?.message || "Failed to send email" }, { status: 500 });
  }
}
