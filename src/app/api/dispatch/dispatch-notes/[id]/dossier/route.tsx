import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  DossierDocument,
  DOSSIER_SECTIONS,
  type DossierSection,
} from "@/lib/pdf/dossier-pdf";
import {
  buildDossierData,
  computeDossierReadiness,
} from "@/lib/pdf/dossier-data";

const COMPANY = {
  name: "NPS Piping Solutions",
  address:
    "1210/1211, Prasad Chambers, Tata Road no. 2, Opera House, Charni Road (E)",
  city: "Mumbai - 400004, Maharashtra, India",
  tel: "+91 22 23634200/300",
  email: "info@n-pipe.com",
  web: "www.n-pipe.com",
};

export const DOSSIER_COMPANY = {
  companyName: COMPANY.name,
  address: `${COMPANY.address}, ${COMPANY.city}`,
  contact: `Tel: ${COMPANY.tel} | ${COMPANY.email} | ${COMPANY.web}`,
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response } = await checkAccess("dispatch", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);

    // Which sections to include — all of them unless the caller narrows it.
    const sectionsParam = searchParams.get("sections");
    const sections = (
      sectionsParam
        ? sectionsParam
            .split(",")
            .filter((s): s is DossierSection =>
              (DOSSIER_SECTIONS as readonly string[]).includes(s)
            )
        : [...DOSSIER_SECTIONS]
    ) as DossierSection[];

    const d = await buildDossierData(id);
    if (!d) {
      return NextResponse.json(
        { error: "Dispatch note not found" },
        { status: 404 }
      );
    }

    const readiness = computeDossierReadiness({
      clientPO: d.clientPO,
      poAcceptance: d.poAcceptance,
      allMtcs: d.allMtcs,
      allInspections: d.allInspections,
      invoice: d.invoice,
    });

    // ?validate=true — report readiness without building the dossier.
    if (searchParams.get("validate") === "true") {
      return NextResponse.json({
        missing: readiness.missing,
        present: readiness.present,
      });
    }

    // A dossier missing mandatory documents is refused rather than sent
    // incomplete, because the recipient cannot tell the difference.
    if (readiness.missing.length > 0 && searchParams.get("force") !== "true") {
      return NextResponse.json(
        { error: "Missing mandatory documents", missing: readiness.missing },
        { status: 409 }
      );
    }

    const pdfBuffer = await renderToBuffer(
      <DossierDocument
        company={DOSSIER_COMPANY}
        sections={sections}
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

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="dossier-${d.dispatchNote.dnNo.replace(/\//g, "-")}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error generating dossier:", error);
    return NextResponse.json(
      { error: "Failed to generate dispatch dossier" },
      { status: 500 }
    );
  }
}
