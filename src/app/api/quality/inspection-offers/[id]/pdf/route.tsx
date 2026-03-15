import { NextRequest, NextResponse } from "next/server";
import { checkAccess } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { renderHtmlToPdf } from "@/lib/pdf/render-pdf";
import { wrapHtmlForPrint } from "@/lib/pdf/print-wrapper";
import {
  generateInspectionOfferHtml,
  generateLengthTallyHtml,
  generateColourCodeHtml,
  generateCriteriaChecklistHtml,
} from "@/lib/pdf/inspection-offer-template";

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
    const format = searchParams.get("format"); // html for preview

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

    let html: string;
    let landscape = false;
    let filenamePrefix: string;

    switch (docType) {
      case "tally":
        html = generateLengthTallyHtml(offerData, companyInfo as any);
        landscape = true;
        filenamePrefix = "Length-Tally";
        break;
      case "colour":
        html = generateColourCodeHtml(offerData, companyInfo as any);
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

        html = generateCriteriaChecklistHtml(criteriaData, companyInfo as any);
        landscape = true;
        filenamePrefix = "Inspection-Criteria";
        break;
      }
      default:
        html = generateInspectionOfferHtml(offerData, companyInfo as any);
        filenamePrefix = "Inspection-Offer";
        break;
    }

    if (format === "html") {
      return new NextResponse(wrapHtmlForPrint(html, landscape), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const pdfBuffer = await renderHtmlToPdf(html, landscape);
    const filename = `${filenamePrefix}-${offer.offerNo.replace(/\//g, "-")}`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating inspection document PDF:", error);
    return NextResponse.json({ error: error?.message || "Failed to generate PDF" }, { status: 500 });
  }
}
