import { prisma } from "@/lib/prisma";

/**
 * Assembles everything a dispatch dossier needs, in one pass.
 *
 * This used to live inside the dossier GET route, and the email route reached
 * it by issuing an HTTP request to that route against its own base URL. That
 * cost a second serverless invocation and a second full run of these queries
 * for every dossier emailed — on a database with a 75-connection cap and a
 * firewall that bans connection churn, self-calling over HTTP is the most
 * expensive way to reuse code. Both routes now call this function directly.
 *
 * The traversal is deep on purpose: a dossier has to prove provenance, so it
 * walks dispatch note → packing list → each line's inventory stock → that
 * stock's MTCs, inspections, lab reports, pipe details and QC releases, then
 * back up to the sales order, quotation and client PO. Records reached through
 * more than one line are de-duplicated by id.
 *
 * Domain terms: an *MTC* is the mill test certificate for a heat of steel;
 * *TPI* is third-party inspection; a *QC release* is the internal sign-off
 * that a stock item may be dispatched.
 */

/** Mandatory documents. A dossier missing any of these is blocked unless forced. */
export interface DossierReadiness {
  missing: string[];
  present: string[];
}

export function computeDossierReadiness(d: {
  clientPO: unknown;
  poAcceptance: unknown;
  allMtcs: unknown[];
  allInspections: unknown[];
  invoice: unknown;
}): DossierReadiness {
  const present: string[] = [];
  const missing: string[] = [];

  if (d.clientPO) present.push("Client PO"); else missing.push("Client PO");
  if (d.poAcceptance) present.push("PO Acceptance"); else missing.push("PO Acceptance");
  if (d.allMtcs.length > 0) present.push("MTC"); else missing.push("MTC (at least one required)");
  if (d.allInspections.length > 0) present.push("Inspection Report"); else missing.push("Inspection Report (at least one required)");
  if (d.invoice) present.push("Invoice"); else missing.push("Invoice");

  return { missing, present };
}

/* eslint-disable @typescript-eslint/no-explicit-any -- rows are Prisma results
   with per-branch joins; the document layer reads them defensively. */

/** Returns null when the dispatch note does not exist. */
export async function buildDossierData(id: string) {
  // ============================================================
  // DATA FETCH — deep traversal through the full document chain
  // ============================================================

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
          quotation: {
            include: {
              items: true,
            },
          },
          invoices: {
            include: { items: true },
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      },
      dispatchAddress: true,
      transporter: true,
    },
  });

  if (!dispatchNote) {
    // The caller decides how a missing dispatch note is reported — the GET
    // route answers 404, the email route answers with its own error shape.
    return null;
  }

  const so = dispatchNote.salesOrder;
  const customer = so?.customer;
  const quotation = so?.quotation;
  const plItems = dispatchNote.packingList?.items || [];
  const invoice = so?.invoices?.[0] || null;

  // Find Client PO through quotation
  let clientPO: any = null;
  let poAcceptance: any = null;

  if (quotation) {
    clientPO = await prisma.clientPurchaseOrder.findFirst({
      where: { quotationId: quotation.id },
      include: {
        items: { orderBy: { sNo: "asc" } },
        customer: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (clientPO) {
      poAcceptance = await prisma.pOAcceptance.findUnique({
        where: { clientPurchaseOrderId: clientPO.id },
        include: { createdBy: { select: { name: true } } },
      });
    }
  }

  // Also try matching by customerPoNo on the Sales Order
  if (!clientPO && so?.customerPoNo) {
    clientPO = await prisma.clientPurchaseOrder.findFirst({
      where: { clientPoNumber: so.customerPoNo },
      include: {
        items: { orderBy: { sNo: "asc" } },
        customer: true,
      },
    });
    if (clientPO) {
      poAcceptance = await prisma.pOAcceptance.findUnique({
        where: { clientPurchaseOrderId: clientPO.id },
        include: { createdBy: { select: { name: true } } },
      });
    }
  }

  // Collect unique MTCs, inspections, lab reports, pipe details from inventory stocks
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
      if (!seenIds.mtc.has(mtc.id)) {
        seenIds.mtc.add(mtc.id);
        allMtcs.push({ ...mtc, stockHeatNo: stock.heatNo, stockProduct: stock.product, stockSize: stock.sizeLabel });
      }
    }
    for (const insp of stock.inspections || []) {
      if (!seenIds.insp.has(insp.id)) {
        seenIds.insp.add(insp.id);
        allInspections.push({ ...insp, stockHeatNo: stock.heatNo, stockProduct: stock.product, stockSize: stock.sizeLabel });
      }
    }
    for (const lr of stock.labReports || []) {
      if (!seenIds.lab.has(lr.id)) {
        seenIds.lab.add(lr.id);
        allLabReports.push({ ...lr, stockHeatNo: stock.heatNo, stockProduct: stock.product, stockSize: stock.sizeLabel });
      }
    }
    for (const pd of stock.pipeDetails || []) {
      allPipeDetails.push({ ...pd, stockHeatNo: stock.heatNo, stockProduct: stock.product, stockSize: stock.sizeLabel, stockSpec: stock.specification });
    }
    for (const qcr of stock.qcReleases || []) {
      allQcReleases.push({ ...qcr, stockHeatNo: stock.heatNo, stockProduct: stock.product, stockSize: stock.sizeLabel });
    }
  }

  // TPI inspections are inspections that have a tpiAgency
  const tpiInspections = allInspections.filter((i) => i.tpiAgencyId);

  return {
    dispatchNote,
    customer,
    so,
    clientPO,
    poAcceptance,
    plItems,
    allMtcs,
    allInspections,
    tpiInspections,
    allLabReports,
    allPipeDetails,
    allQcReleases,
    invoice,
  };
}
