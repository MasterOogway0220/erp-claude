import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { fmtDate } from "./primitives";
import { numberToWords } from "../amount-in-words";
import {
  A4_LANDSCAPE,
  BorderedDocument,
  Column,
  ItemsTable,
  TotalsRow,
  s,
} from "./bordered-doc";

/**
 * Purchase order — the document sent to a vendor to buy material, and the one
 * the vendor accepts against. It is the buying-side mirror of a quotation.
 *
 * Domain notes:
 *  - A PO can be **revised**. `version > 0` means this sheet supersedes an
 *    earlier one, which is why the title carries the revision number and the
 *    footer says so explicitly — a vendor holding two copies must be able to
 *    tell which one governs.
 *  - It may be raised against a **PR** (purchase requisition, an internal
 *    request to buy) or directly against a **SO** (sales order, a customer's
 *    order being fulfilled). Only one of those references is shown.
 *  - *Additional spec.* carries requirements beyond the base material grade —
 *    test certificates, NACE compliance, and similar.
 *
 * Replaces `purchase-order-template.ts`. The HTML built its header as a
 * nine-column table with colspans; react-pdf has no colspan, so the same
 * layout is flexbox rows whose widths are those column spans as percentages.
 */

export interface POCompany {
  companyName: string;
  regAddressLine1?: string | null;
  regAddressLine2?: string | null;
  regCity?: string | null;
  regPincode?: string | null;
  regState?: string | null;
  regCountry?: string | null;
  telephoneNo?: string | null;
  email?: string | null;
  website?: string | null;
}

export interface POItem {
  sNo: number;
  product?: string | null;
  material?: string | null;
  additionalSpec?: string | null;
  sizeLabel?: string | null;
  quantity: number | string;
  unitRate: number | string;
  amount: number | string;
  deliveryDate?: string | Date | null;
}

export interface POData {
  poNo: string;
  poDate: string | Date;
  version: number;
  currency: string;
  deliveryDate?: string | Date | null;
  specialRequirements?: string | null;
  paymentTerms?: string | null;
  termsAndConditions?: string | null;
  totalAmount: number;
  vendor: {
    name: string;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    pincode?: string | null;
    contactPerson?: string | null;
    email?: string | null;
    phone?: string | null;
    gstNo?: string | null;
  };
  purchaseRequisition?: { prNo: string } | null;
  salesOrder?: { soNo: string } | null;
  approvedBy?: { name: string } | null;
  approvalDate?: string | Date | null;
  items: POItem[];
}

const t = (v: unknown): string => (v == null ? "" : String(v));

/** Plain fixed-decimal; empty rather than "NaN" so a blank cell stays blank. */
function num(val: unknown, decimals = 2): string {
  const n = parseFloat(String(val));
  return isNaN(n) ? "" : n.toFixed(decimals);
}

// The HTML header grid was 9 columns wide, with cells spanning 2/3/2/2 of it.
const HDR_LABEL = "22.22%"; // 2 of 9
const HDR_VALUE_WIDE = "33.34%"; // 3 of 9
const HDR_VALUE = "22.22%"; // 2 of 9

// Item column widths must total 100%. The totals row spans the first five:
// 4 + 14 + 14 + 14 + 8 = 54%.
const SPAN_FIRST_FIVE = "54%";

const p = StyleSheet.create({
  logoBar: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    borderStyle: "solid",
    paddingVertical: 6,
  },
  companyName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  hdrRow: { flexDirection: "row" },
  hdrLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#333",
    paddingVertical: 2,
    paddingHorizontal: 5,
  },
  hdrValue: { fontSize: 7.5, paddingVertical: 2, paddingHorizontal: 5 },
  titleRow: {
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 4,
    borderTopWidth: 2,
    borderTopColor: "#000",
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    borderStyle: "solid",
  },
  words: {
    fontSize: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: "#000",
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    borderStyle: "solid",
  },
  termsTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  termItem: { flexDirection: "row", marginBottom: 1 },
  termNum: { width: 14, fontSize: 7.5, textAlign: "center" },
  termText: { flex: 1, fontSize: 7.5 },
  approvalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  approvalLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#666",
    marginBottom: 2,
  },
  acceptanceRule: {
    minWidth: 110,
    borderBottomWidth: 1,
    borderBottomColor: "#999",
    borderStyle: "solid",
    marginTop: 20,
  },
  footerNote: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#CCC",
    borderStyle: "solid",
  },
  footerText: { fontSize: 6.5, color: "#666" },
});

/** One `Label : value    Label : value` line of the vendor/PO header grid. */
function HeaderRow({
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
  mono,
  bold,
  borderTop,
  borderBottom,
}: {
  leftLabel: string;
  leftValue?: string | null;
  rightLabel: string;
  rightValue?: string | null;
  mono?: boolean;
  bold?: boolean;
  borderTop?: boolean;
  borderBottom?: boolean;
}) {
  const edge = [
    borderTop
      ? { borderTopWidth: 1, borderTopColor: "#000", borderStyle: "solid" as const }
      : {},
    borderBottom
      ? {
          borderBottomWidth: 1,
          borderBottomColor: "#000",
          borderStyle: "solid" as const,
        }
      : {},
  ];
  return (
    <View style={[p.hdrRow, ...edge]}>
      <Text style={[p.hdrLabel, { width: HDR_LABEL }]}>{leftLabel}</Text>
      <Text
        style={[
          p.hdrValue,
          { width: HDR_VALUE_WIDE },
          mono ? s.mono : {},
          bold ? s.bold : {},
        ]}
      >
        {leftValue || ""}
      </Text>
      <Text style={[p.hdrLabel, { width: HDR_LABEL }]}>{rightLabel}</Text>
      <Text style={[p.hdrValue, { width: HDR_VALUE }, bold ? s.bold : {}]}>
        {rightValue || ""}
      </Text>
    </View>
  );
}

function columns(po: POData): Column<POItem>[] {
  return [
    { header: "S/N", width: "4%", align: "center", render: (i) => t(i.sNo) },
    { header: "Product", width: "14%", align: "center", render: (i) => t(i.product) },
    { header: "Material", width: "14%", align: "center", render: (i) => t(i.material) },
    {
      header: "Additional Spec.",
      width: "14%",
      align: "center",
      render: (i) => t(i.additionalSpec),
    },
    { header: "Size", width: "8%", align: "center", render: (i) => t(i.sizeLabel) },
    { header: "Qty", width: "8%", align: "center", render: (i) => num(i.quantity, 3) },
    {
      header: `Unit Rate (${po.currency})`,
      width: "12%",
      align: "center",
      render: (i) => num(i.unitRate),
    },
    {
      header: `Amount (${po.currency})`,
      width: "14%",
      align: "center",
      render: (i) => num(i.amount),
    },
    {
      header: "Delivery Date",
      width: "12%",
      align: "center",
      // A line can carry its own date; otherwise the PO's date applies.
      render: (i) =>
        i.deliveryDate ? fmtDate(i.deliveryDate) : fmtDate(po.deliveryDate),
    },
  ];
}

export function PurchaseOrderDocument({
  po,
  company,
}: {
  po: POData;
  company: POCompany;
}) {
  const vendorAddress = [
    po.vendor.addressLine1,
    po.vendor.addressLine2,
    po.vendor.city,
    po.vendor.state
      ? `${po.vendor.state} - ${po.vendor.pincode || ""}`
      : po.vendor.pincode,
    po.vendor.country,
  ]
    .filter(Boolean)
    .join(", ");

  const footerAddress = [
    company.regAddressLine1,
    company.regAddressLine2,
    company.regCity,
    company.regState
      ? `${company.regState} - ${company.regPincode || ""}`
      : company.regPincode,
    company.regCountry,
  ]
    .filter(Boolean)
    .join(", ");

  const footerContact = [
    company.telephoneNo ? `Tel. ${company.telephoneNo}` : null,
    company.email ? `Email: ${company.email}` : null,
    company.website ? `Web: ${company.website}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const totalQty = po.items.reduce(
    (sum, i) => sum + (parseFloat(String(i.quantity)) || 0),
    0
  );
  const totalAmount = Number(po.totalAmount) || 0;

  const tcLines = po.termsAndConditions
    ? po.termsAndConditions.split("\n").filter((l) => l.trim())
    : [];

  // A PO is raised either against an internal requisition or against the
  // customer order it serves — never labelled as both.
  const refLabel = po.purchaseRequisition
    ? "PR Ref :"
    : po.salesOrder
      ? "SO Ref :"
      : "";
  const refValue = po.purchaseRequisition?.prNo || po.salesOrder?.soNo || "";

  const contact = [po.vendor.contactPerson, po.vendor.phone]
    .filter(Boolean)
    .join(" | ");

  return (
    <BorderedDocument
      title={`Purchase Order - ${po.poNo}`}
      size={A4_LANDSCAPE}
    >
      <View style={p.logoBar}>
        <Text style={p.companyName}>{company.companyName}</Text>
      </View>

      <HeaderRow
        leftLabel="Vendor :"
        leftValue={po.vendor.name}
        rightLabel="PO No. :"
        rightValue={po.poNo}
        bold
        borderTop
      />
      <HeaderRow
        leftLabel="Address :"
        leftValue={vendorAddress}
        rightLabel="PO Date :"
        rightValue={fmtDate(po.poDate)}
      />
      <HeaderRow
        leftLabel="GST No. :"
        leftValue={po.vendor.gstNo}
        rightLabel="Delivery Date :"
        rightValue={fmtDate(po.deliveryDate)}
        mono
      />
      <HeaderRow
        leftLabel="Contact :"
        leftValue={contact}
        rightLabel={refLabel}
        rightValue={refValue}
      />
      <HeaderRow
        leftLabel="Email :"
        leftValue={po.vendor.email}
        rightLabel="Currency :"
        rightValue={po.currency}
        borderBottom
      />

      <Text style={p.titleRow}>
        {po.version > 0
          ? `PURCHASE ORDER — Revision ${po.version}`
          : "PURCHASE ORDER"}
      </Text>

      <ItemsTable columns={columns(po)} rows={po.items} />

      <TotalsRow
        cells={[
          { width: SPAN_FIRST_FIVE, content: "Total", align: "center" },
          { width: "8%", content: num(totalQty, 3), align: "center" },
          { width: "12%" },
          { width: "14%", content: num(totalAmount), align: "center" },
          { width: "12%" },
        ]}
      />

      <Text style={p.words}>
        <Text style={s.bold}>Amount in Words: </Text>
        {numberToWords(totalAmount, po.currency)}
      </Text>

      <View style={{ padding: 8 }}>
        {po.paymentTerms ? (
          <View style={{ marginBottom: 6 }}>
            <Text style={p.termsTitle}>PAYMENT TERMS:</Text>
            <Text style={{ fontSize: 7.5 }}>{po.paymentTerms}</Text>
          </View>
        ) : null}

        {tcLines.length > 0 ? (
          <View style={{ marginBottom: 6 }}>
            <Text style={p.termsTitle}>TERMS &amp; CONDITIONS:</Text>
            {tcLines.map((line, i) => (
              <View key={i} style={p.termItem}>
                <Text style={p.termNum}>{i + 1}</Text>
                <Text style={p.termText}>{line.trim()}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {po.specialRequirements ? (
          <View style={{ marginBottom: 6 }}>
            <Text style={p.termsTitle}>SPECIAL REQUIREMENTS:</Text>
            <Text style={{ fontSize: 7.5 }}>{po.specialRequirements}</Text>
          </View>
        ) : null}

        <View style={p.approvalRow}>
          <View>
            <Text style={p.approvalLabel}>Prepared By</Text>
            <Text style={{ fontSize: 7.5 }}>{company.companyName}</Text>
          </View>
          {po.approvedBy ? (
            <View>
              <Text style={p.approvalLabel}>Approved By</Text>
              <Text style={{ fontSize: 7.5 }}>{po.approvedBy.name}</Text>
              <Text style={{ fontSize: 7, color: "#666" }}>
                {fmtDate(po.approvalDate)}
              </Text>
            </View>
          ) : null}
          <View>
            <Text style={p.approvalLabel}>Vendor Acceptance</Text>
            <View style={p.acceptanceRule} />
          </View>
        </View>

        <View style={p.footerNote}>
          <Text style={p.footerText}>
            This is a computer generated document hence not signed.
          </Text>
          <Text style={p.footerText}>
            {po.version > 0 ? "This PO supersedes all previous revisions." : ""}
          </Text>
        </View>
        <Text style={[p.footerText, { marginTop: 2 }]}>
          Regd. Address: {footerAddress}. {footerContact}
        </Text>
      </View>
    </BorderedDocument>
  );
}
