import type { Prisma } from "@prisma/client";
import type { CompanyInfo, POAcceptanceData } from "@/lib/pdf/po-acceptance-template";
import { cleanTermValue } from "@/lib/quotations/terms";

/**
 * Everything the PO acceptance letter prints, loaded and shaped once for both
 * the PDF download and the email (which embeds the HTML copy). The two routes
 * used to each build this by hand, so a field added to one was missing from
 * the other.
 */

/** Used when an acceptance has no company row. */
export const DEFAULT_COMPANY: CompanyInfo = {
  companyName: "NPS Piping Solutions",
  regAddressLine1: "1210/1211, Prasad Chambers, Tata Road no. 2, Opera House, Charni Road (E)",
  regCity: "Mumbai",
  regPincode: "400004",
  regState: "Maharashtra",
  regCountry: "India",
  telephoneNo: "+91 22 23634200/300",
  email: "info@n-pipe.com",
  website: "www.n-pipe.com",
};

export const LETTER_INCLUDE = {
  clientPurchaseOrder: {
    include: {
      customer: {
        select: {
          name: true, contactPerson: true, email: true, phone: true,
          addressLine1: true, addressLine2: true, city: true, state: true, gstNo: true,
        },
      },
      items: { orderBy: { sNo: "asc" } },
      // The order's own terms; unticked ones are not printed.
      terms: { where: { isIncluded: true }, orderBy: { termNo: "asc" } },
      // The saved site the PO bills to; the letter is addressed there.
      billingAddress: true,
    },
  },
  company: true,
  // The user who issued the letter is our follow-up person on it.
  createdBy: { select: { name: true, email: true, phone: true } },
} satisfies Prisma.POAcceptanceInclude;

export type AcceptanceForLetter = Prisma.POAcceptanceGetPayload<{ include: typeof LETTER_INCLUDE }>;

type Num = { toString(): string } | number | null | undefined;
const n = (v: Num) => (v === null || v === undefined ? 0 : Number(v));

/**
 * The rows between the item lines and the Total: material value, each
 * non-zero additional charge ("Others" named by its description), the GST
 * split and round-off — all from the client PO, the same record the Total
 * (its `grandTotal`) comes from, so the page adds up.
 */
export function letterSummary(
  cpo: {
    subtotal: Num; freight: Num; tpiCharges: Num; testingCharges: Num; packingForwarding: Num;
    insurance: Num; otherCharges: Num; gstRate: Num; cgst: Num; sgst: Num; igst: Num; roundOff: Num;
  },
  othersDescription: string | null | undefined
): { label: string; amount: number }[] {
  const rate = n(cpo.gstRate);
  const rows = [
    { label: "Material Value", amount: n(cpo.subtotal) },
    { label: "Freight", amount: n(cpo.freight) },
    { label: "TPI Charges", amount: n(cpo.tpiCharges) },
    { label: "Testing Charges", amount: n(cpo.testingCharges) },
    { label: "Packing & Forwarding", amount: n(cpo.packingForwarding) },
    { label: "Insurance", amount: n(cpo.insurance) },
    { label: othersDescription ? `Others — ${othersDescription}` : "Others", amount: n(cpo.otherCharges) },
    { label: `CGST @ ${rate / 2}%`, amount: n(cpo.cgst) },
    { label: `SGST @ ${rate / 2}%`, amount: n(cpo.sgst) },
    { label: `IGST @ ${rate}%`, amount: n(cpo.igst) },
    { label: "Round Off", amount: n(cpo.roundOff) },
  ];
  return rows.filter((r, i) => i === 0 || r.amount !== 0);
}

type AddressLines = {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  gstNo: string | null;
};

/**
 * Who the letter is addressed to: the billing address on the client PO — a
 * typed one printed as written (it carries its own GSTIN line), else the saved
 * site picked — and the customer master address when the PO names neither.
 * A GSTIN is per state, so a site without its own gets the customer's only when
 * it is in the customer's state.
 */
export function letterAddressee<C extends { name: string } & AddressLines>(
  customer: C,
  site: (AddressLines & { companyName: string | null; pincode: string | null }) | null,
  typed: string | null | undefined
): C {
  if (typed?.trim()) {
    // Typed as "Billing name, address, GSTIN": the first line is who the PO
    // bills (possibly not the customer master's entity), the rest its address.
    const [first, ...rest] = typed.trim().split(/\r?\n/);
    return {
      ...customer,
      name: first.trim(),
      addressLine1: rest.join("\n").trim() || null,
      addressLine2: null,
      city: null,
      state: null,
      gstNo: null,
    };
  }
  if (!site) return customer;
  return {
    ...customer,
    name: site.companyName?.trim() || customer.name,
    addressLine1: site.addressLine1,
    addressLine2: site.addressLine2,
    city: [site.city, site.pincode].filter(Boolean).join(" - ") || null,
    state: site.state,
    gstNo: site.gstNo || (site.state && site.state === customer.state ? customer.gstNo : null),
  };
}

/**
 * `origin` makes a site-relative logo path absolute: react-pdf fetches images
 * over the network, and a relative `src` is a broken image in an email.
 */
export function letterData(
  acceptance: AcceptanceForLetter,
  origin: string
): { data: POAcceptanceData; company: CompanyInfo } {
  const cpo = acceptance.clientPurchaseOrder;
  const company: CompanyInfo = acceptance.company ?? DEFAULT_COMPANY;
  const logo = company.companyLogoUrl;
  return {
    company: {
      ...company,
      companyLogoUrl: logo && logo.startsWith("/") ? `${origin}${logo}` : logo || null,
    },
    data: {
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
        poSlNo: item.poSlNo,
        poItemCode: item.poItemCode,
        // A non-standard line's product reads only "Non-Standard Item"; its
        // own description is what the client ordered.
        product: item.itemDescription?.trim() || item.product,
        material: item.material,
        additionalSpec: item.additionalSpec,
        sizeLabel: item.sizeLabel,
        ends: item.ends,
        uom: item.uom,
        qtyOrdered: Number(item.qtyOrdered),
        unitRate: Number(item.unitRate),
        amount: Number(item.amount),
      })),
      customer: letterAddressee(cpo.customer, cpo.billingAddress ?? null, cpo.billingAddressText),
      ourContact: acceptance.createdBy,
      terms: cpo.terms.map((t) => ({ termName: t.termName, termValue: cleanTermValue(t.termValue) })),
      // The acceptance's own description wins (it can be edited there), else the PO's.
      summary: letterSummary(cpo, acceptance.otherChargesDescription || cpo.otherChargesDescription),
    },
  };
}
