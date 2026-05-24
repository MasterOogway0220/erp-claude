import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { renderHtmlToPdf } from "@/lib/pdf/render-pdf";
import { wrapHtmlForPrint } from "@/lib/pdf/print-wrapper";
import nodemailer from "nodemailer";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response } = await checkAccess("dispatch", "write");
    if (!authorized) return response!;

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return NextResponse.json(
        { error: "Email not configured. Please set SMTP environment variables." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { cc, subject } = body as { to?: string; cc?: string; subject?: string };

    // ---- Fetch the same data chain as the dossier GET ----
    const dispatchNote = await prisma.dispatchNote.findUnique({
      where: { id },
      include: {
        packingList: {
          include: {
            items: {
              include: {
                inventoryStock: {
                  include: {
                    mtcDocuments: true,
                    inspections: {
                      include: { parameters: true, tpiAgency: true },
                    },
                    pipeDetails: { orderBy: { pipeNo: "asc" } },
                    labReports: true,
                    qcReleases: {
                      include: { releasedBy: { select: { name: true } } },
                    },
                  },
                },
              },
            },
          },
        },
        salesOrder: {
          include: {
            customer: true,
            quotation: { include: { items: true } },
            invoices: { include: { items: true }, take: 1, orderBy: { createdAt: "desc" } },
          },
        },
        dispatchAddress: true,
        transporter: true,
      },
    });

    if (!dispatchNote) {
      return NextResponse.json({ error: "Dispatch note not found" }, { status: 404 });
    }

    const so = dispatchNote.salesOrder;
    const customer = so?.customer;
    const quotation = so?.quotation;
    const plItems = dispatchNote.packingList?.items || [];
    const invoice = so?.invoices?.[0] || null;

    // Resolve Client PO + PO Acceptance
    let clientPO: any = null;
    let poAcceptance: any = null;

    if (quotation) {
      clientPO = await prisma.clientPurchaseOrder.findFirst({
        where: { quotationId: quotation.id },
        include: { items: { orderBy: { sNo: "asc" } }, customer: true },
        orderBy: { createdAt: "desc" },
      });
      if (clientPO) {
        poAcceptance = await prisma.pOAcceptance.findUnique({
          where: { clientPurchaseOrderId: clientPO.id },
          include: { createdBy: { select: { name: true } } },
        });
      }
    }
    if (!clientPO && so?.customerPoNo) {
      clientPO = await prisma.clientPurchaseOrder.findFirst({
        where: { clientPoNumber: so.customerPoNo },
        include: { items: { orderBy: { sNo: "asc" } }, customer: true },
      });
      if (clientPO) {
        poAcceptance = await prisma.pOAcceptance.findUnique({
          where: { clientPurchaseOrderId: clientPO.id },
          include: { createdBy: { select: { name: true } } },
        });
      }
    }

    // Collect inventory docs
    const allMtcs: any[] = [];
    const allInspections: any[] = [];
    const allLabReports: any[] = [];
    const allPipeDetails: any[] = [];
    const allQcReleases: any[] = [];
    const seenIds = { mtc: new Set<string>(), insp: new Set<string>(), lab: new Set<string>() };

    for (const item of plItems) {
      const stock = item.inventoryStock;
      if (!stock) continue;
      for (const mtc of stock.mtcDocuments || []) {
        if (!seenIds.mtc.has(mtc.id)) { seenIds.mtc.add(mtc.id); allMtcs.push({ ...mtc, stockHeatNo: stock.heatNo, stockProduct: stock.product, stockSize: stock.sizeLabel }); }
      }
      for (const insp of stock.inspections || []) {
        if (!seenIds.insp.has(insp.id)) { seenIds.insp.add(insp.id); allInspections.push({ ...insp, stockHeatNo: stock.heatNo, stockProduct: stock.product, stockSize: stock.sizeLabel }); }
      }
      for (const lr of stock.labReports || []) {
        if (!seenIds.lab.has(lr.id)) { seenIds.lab.add(lr.id); allLabReports.push({ ...lr, stockHeatNo: stock.heatNo, stockProduct: stock.product, stockSize: stock.sizeLabel }); }
      }
      for (const pd of stock.pipeDetails || []) {
        allPipeDetails.push({ ...pd, stockHeatNo: stock.heatNo, stockProduct: stock.product, stockSize: stock.sizeLabel, stockSpec: stock.specification });
      }
      for (const qcr of stock.qcReleases || []) {
        allQcReleases.push({ ...qcr, stockHeatNo: stock.heatNo, stockProduct: stock.product, stockSize: stock.sizeLabel });
      }
    }

    // Determine recipient — default to customer email
    const recipientTo: string = (body as any).to || customer?.email || "";
    if (!recipientTo) {
      return NextResponse.json({ error: "No recipient email: provide 'to' in the request body or ensure the customer has an email on record." }, { status: 400 });
    }

    // Generate the dossier HTML via the same shared GET endpoint (local call)
    // We re-use the same full-dossier HTML the GET produces by calling its URL
    // For simplicity, we call the GET URL with ?format=html internally via fetch
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const htmlRes = await fetch(`${baseUrl}/api/dispatch/dispatch-notes/${id}/dossier?format=html&force=true`, {
      headers: { cookie: request.headers.get("cookie") || "" },
    });

    let dossierHtml = "";
    if (htmlRes.ok) {
      dossierHtml = await htmlRes.text();
    } else {
      // Fallback: build minimal HTML inline
      dossierHtml = `<!DOCTYPE html><html><body><h1>Dispatch Dossier — ${dispatchNote.dnNo}</h1><p>Please see the attached PDF for the full dossier.</p></body></html>`;
    }

    const pdfBuffer = await renderHtmlToPdf(dossierHtml, false);

    const fileName = `dossier-${dispatchNote.dnNo.replace(/\//g, "-")}.pdf`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const emailSubject = subject || `Dispatch Dossier — ${dispatchNote.dnNo} | NPS Piping Solutions`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <h2 style="color: #1a365d;">Dispatch Dossier: ${dispatchNote.dnNo}</h2>
        <p>Dear ${customer?.contactPerson || customer?.name || "Sir/Madam"},</p>
        <p>Please find attached the complete Dispatch Dossier for your reference.</p>
        <table style="border-collapse:collapse; width:100%; margin:16px 0;">
          <tr><td style="padding:6px 12px; border:1px solid #ddd; font-weight:600; width:40%;">Dispatch Note</td><td style="padding:6px 12px; border:1px solid #ddd;">${dispatchNote.dnNo}</td></tr>
          ${clientPO ? `<tr><td style="padding:6px 12px; border:1px solid #ddd; font-weight:600;">Client PO</td><td style="padding:6px 12px; border:1px solid #ddd;">${clientPO.clientPoNumber || clientPO.cpoNo}</td></tr>` : ""}
          ${invoice ? `<tr><td style="padding:6px 12px; border:1px solid #ddd; font-weight:600;">Invoice</td><td style="padding:6px 12px; border:1px solid #ddd;">${invoice.invoiceNo}</td></tr>` : ""}
          <tr><td style="padding:6px 12px; border:1px solid #ddd; font-weight:600;">MTCs</td><td style="padding:6px 12px; border:1px solid #ddd;">${allMtcs.length}</td></tr>
          <tr><td style="padding:6px 12px; border:1px solid #ddd; font-weight:600;">Inspection Reports</td><td style="padding:6px 12px; border:1px solid #ddd;">${allInspections.length}</td></tr>
          <tr><td style="padding:6px 12px; border:1px solid #ddd; font-weight:600;">Lab Reports</td><td style="padding:6px 12px; border:1px solid #ddd;">${allLabReports.length}</td></tr>
        </table>
        <p>Should you have any queries, please feel free to contact us.</p>
        <p>Best regards,<br><strong>NPS Piping Solutions</strong><br>info@n-pipe.com<br>+91 22 23634200/300</p>
        <hr style="margin:30px 0; border:none; border-top:1px solid #e2e8f0;">
        <p style="font-size:11px; color:#94a3b8;">This is a computer generated document. For any discrepancies, please contact us directly.</p>
      </div>
    `;

    const mailOptions: nodemailer.SendMailOptions = {
      from: process.env.SMTP_FROM || `"NPS Piping Solutions" <${process.env.SMTP_USER}>`,
      to: recipientTo,
      subject: emailSubject,
      html: emailHtml,
      attachments: [
        {
          filename: fileName,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    };

    if (cc && cc.trim()) {
      mailOptions.cc = cc;
    }

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ ok: true, to: recipientTo, subject: emailSubject });
  } catch (error: any) {
    console.error("Error sending dossier email:", error);
    return NextResponse.json(
      { error: "Failed to send dossier email", detail: error?.message },
      { status: 500 }
    );
  }
}
