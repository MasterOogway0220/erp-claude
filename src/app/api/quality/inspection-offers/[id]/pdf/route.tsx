import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  InspectionOfferDocument,
  LengthTallyDocument,
  ColourCodeDocument,
  CriteriaChecklistDocument,
} from "@/lib/pdf/inspection-offer-pdf";

const DEFAULT_COMPANY = {
  companyName: "NPS Piping Solutions",
  regAddressLine1: "1210/1211, Prasad Chambers, Tata Road no. 2, Opera House, Charni Road (E)",
  regCity: "Mumbai",
  regPincode: "400004",
  regState: "Maharashtra",
  regCountry: "India",
  telephoneNo: "+91 22 23634200/300",
  email: "info@n-pipe.com",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { authorized, response } = await checkAccess("inspectionOffer", "read");
    if (!authorized) return response!;

    const { searchParams } = new URL(request.url);
    const docType = searchParams.get("type") || "offer"; // offer | tally | colour | criteria

    const offer = await prisma.inspectionOffer.findUnique({
      where: { id },
      include: {
        customer: true,
        tpiAgency: true,
        items: { orderBy: { sNo: "asc" } },
      },
    });

    if (!offer) {
      return NextResponse.json({ error: "Inspection Offer not found" }, { status: 404 });
    }

    const company = await prisma.companyMaster.findFirst();
    const companyInfo = company || DEFAULT_COMPANY;

    const offerData = {
      offerNo: offer.offerNo,
      offerDate: offer.offerDate,
      poNumber: offer.poNumber,
      projectName: offer.projectName,
      inspectionLocation: offer.inspectionLocation,
      proposedInspectionDate: offer.proposedInspectionDate,
      quantityReady: offer.quantityReady,
      remarks: offer.remarks,
      customer: {
        name: offer.customer.name,
        addressLine1: offer.customer.addressLine1,
        city: offer.customer.city,
        state: offer.customer.state,
        pincode: offer.customer.pincode,
      },
      tpiAgency: offer.tpiAgency
        ? {
            name: offer.tpiAgency.name,
            contactPerson: offer.tpiAgency.contactPerson,
            phone: offer.tpiAgency.phone,
            email: offer.tpiAgency.email,
          }
        : null,
      items: offer.items.map((item) => ({
        sNo: item.sNo,
        product: item.product,
        material: item.material,
        sizeLabel: item.sizeLabel,
        heatNo: item.heatNo,
        specification: item.specification,
        quantity: item.quantity,
        quantityReady: item.quantityReady,
        uom: item.uom,
        colourCodeRequired: item.colourCodeRequired,
        colourCode: item.colourCode,
        remark: item.remark,
      })),
    };

    // Each document decides its own page size internally, so the route only
    // has to pick which one to render and what to call the file.
    let doc: React.ReactElement;
    let filenamePrefix: string;

    switch (docType) {
      case "tally":
        doc = (
          <LengthTallyDocument data={offerData} company={companyInfo as never} />
        );
        filenamePrefix = "Length-Tally";
        break;
      case "colour":
        doc = (
          <ColourCodeDocument data={offerData} company={companyInfo as never} />
        );
        filenamePrefix = "Colour-Code-Compliance";
        break;
      case "criteria": {
        // Fetch quality requirements for the criteria checklist
        const requirements = await prisma.qualityRequirement.findMany({
          where: { isActive: true, ...(company ? { companyId: company.id } : {}) },
          include: { tpiAgency: { select: { name: true } } },
          orderBy: { parameter: "asc" },
        });

        const criteriaData = {
          offerNo: offer.offerNo,
          offerDate: offer.offerDate,
          poNumber: offer.poNumber,
          customerName: offer.customer.name,
          inspectionLocation: offer.inspectionLocation,
          tpiAgencyName: offer.tpiAgency?.name || null,
          criteria: requirements.map((r, idx) => ({
            sNo: idx + 1,
            parameter: r.parameter,
            value: r.value,
            inspectionRequired: r.inspectionRequired,
            testingRequired: r.testingRequired,
            testType: r.testType,
            colourCodingRequired: r.colourCodingRequired,
            inspectionLocation: r.inspectionLocation,
            remarks: r.remarks,
          })),
        };

        doc = (
          <CriteriaChecklistDocument
            data={criteriaData}
            company={companyInfo as never}
          />
        );
        filenamePrefix = "Inspection-Criteria";
        break;
      }
      default:
        doc = (
          <InspectionOfferDocument
            data={offerData}
            company={companyInfo as never}
          />
        );
        filenamePrefix = "Inspection-Offer";
        break;
    }

    const pdfBuffer = await renderToBuffer(doc as never);
    const filename = `${filenamePrefix}-${offer.offerNo.replace(/\//g, "-")}`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error generating inspection document PDF:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
