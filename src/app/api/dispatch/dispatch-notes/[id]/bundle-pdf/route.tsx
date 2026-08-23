import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { renderToBuffer } from "@react-pdf/renderer";
import { DossierDocument, BUNDLE_SECTIONS } from "@/lib/pdf/dossier-pdf";
import { buildDossierData } from "@/lib/pdf/dossier-data";
import { DOSSIER_COMPANY } from "../dossier/route";

/**
 * The dispatch-note bundle: the note itself plus packing list, MTC summary and
 * inspection summary, as one PDF.
 *
 * This used to be ~450 lines of its own HTML. Those four pages were near
 * duplicates of pages the dossier already draws, so the bundle is now the same
 * document rendered with a narrower section list — one layout to maintain
 * instead of two that drifted apart.
 *
 * Unlike the dossier, the bundle has no readiness gate: it is an operational
 * document that travels with the goods, so it must render from whatever exists
 * at dispatch time rather than refusing when evidence is still outstanding.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response } = await checkAccess("dispatch", "read");
    if (!authorized) return response!;

    const d = await buildDossierData(id);
    if (!d) {
      return NextResponse.json(
        { error: "Dispatch note not found" },
        { status: 404 }
      );
    }

    const pdfBuffer = await renderToBuffer(
      <DossierDocument
        company={DOSSIER_COMPANY}
        sections={[...BUNDLE_SECTIONS]}
        data={{
          dispatchNote: {
            dnNo: d.dispatchNote.dnNo,
            dispatchDate: d.dispatchNote.dispatchDate,
            vehicleNo: d.dispatchNote.vehicleNo,
            lrNo: d.dispatchNote.lrNo,
            ewayBillNo: d.dispatchNote.ewayBillNo,
            destination: d.dispatchNote.destination,
            remarks: d.dispatchNote.remarks,
            transporter: d.dispatchNote.transporter,
            dispatchAddress: d.dispatchNote.dispatchAddress,
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

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="DN-Bundle-${d.dispatchNote.dnNo.replace(/\//g, "-")}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error generating dispatch bundle PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate bundle PDF" },
      { status: 500 }
    );
  }
}
