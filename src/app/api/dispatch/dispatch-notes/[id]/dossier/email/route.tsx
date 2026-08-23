import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { renderToBuffer } from "@react-pdf/renderer";
import { DossierDocument } from "@/lib/pdf/dossier-pdf";
import { buildDossierData } from "@/lib/pdf/dossier-data";
import { DOSSIER_COMPANY } from "../route";
import nodemailer from "nodemailer";
import { mailFrom, mailer } from "@/lib/mailer";

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

    // One pass over the document chain, shared with the dossier GET route.
    // This route used to run the whole query set itself and then fetch the GET
    // endpoint over HTTP to build the PDF — two serverless invocations and two
    // full sets of queries per email, against a database with a 75-connection
    // cap and a firewall that bans connection churn.
    const d = await buildDossierData(id);
    if (!d) {
      return NextResponse.json(
        { error: "Dispatch note not found" },
        { status: 404 }
      );
    }

    const { dispatchNote, customer, clientPO, invoice } = d;

    // Recipient defaults to the customer on record.
    const recipientTo: string =
      (body as { to?: string }).to || customer?.email || "";
    if (!recipientTo) {
      return NextResponse.json(
        {
          error:
            "No recipient email: provide 'to' in the request body or ensure the customer has an email on record.",
        },
        { status: 400 }
      );
    }

    const pdfBuffer = await renderToBuffer(
      <DossierDocument
        company={DOSSIER_COMPANY}
        data={{
          dispatchNote: {
            dnNo: d.dispatchNote.dnNo,
            dispatchDate: d.dispatchNote.dispatchDate,
            vehicleNo: d.dispatchNote.vehicleNo,
            packingList: d.dispatchNote.packingList
              ? { plNo: d.dispatchNote.packingList.plNo }
              : null,
          },
          customer: d.customer ?? null,
          salesOrder: d.so ?? null,
          clientPO: d.clientPO,
          poAcceptance: d.poAcceptance,
          mtcs: d.allMtcs,
          inspections: d.allInspections,
          tpiInspections: d.tpiInspections,
          labReports: d.allLabReports,
          pipeDetails: d.allPipeDetails,
          packingListItems: d.plItems,
          qcReleases: d.allQcReleases,
          invoice: d.invoice,
        } as never}
      />
    );

    const fileName = `dossier-${dispatchNote.dnNo.replace(/\//g, "-")}.pdf`;

    const transporter = mailer();

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
          <tr><td style="padding:6px 12px; border:1px solid #ddd; font-weight:600;">MTCs</td><td style="padding:6px 12px; border:1px solid #ddd;">${d.allMtcs.length}</td></tr>
          <tr><td style="padding:6px 12px; border:1px solid #ddd; font-weight:600;">Inspection Reports</td><td style="padding:6px 12px; border:1px solid #ddd;">${d.allInspections.length}</td></tr>
          <tr><td style="padding:6px 12px; border:1px solid #ddd; font-weight:600;">Lab Reports</td><td style="padding:6px 12px; border:1px solid #ddd;">${d.allLabReports.length}</td></tr>
        </table>
        <p>Should you have any queries, please feel free to contact us.</p>
        <p>Best regards,<br><strong>NPS Piping Solutions</strong><br>info@n-pipe.com<br>+91 22 23634200/300</p>
        <hr style="margin:30px 0; border:none; border-top:1px solid #e2e8f0;">
        <p style="font-size:11px; color:#94a3b8;">This is a computer generated document. For any discrepancies, please contact us directly.</p>
      </div>
    `;

    const mailOptions: nodemailer.SendMailOptions = {
      from: mailFrom("NPS Piping Solutions"),
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
  } catch (error) {
    console.error("Error sending dossier email:", error);
    const detail = error instanceof Error ? error.message : undefined;
    return NextResponse.json(
      { error: "Failed to send dossier email", detail },
      { status: 500 }
    );
  }
}
