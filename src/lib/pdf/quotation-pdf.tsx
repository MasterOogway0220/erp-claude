import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";
import { numberToWords } from "../amount-in-words";
import { displayInquiryNo, displaySizeLabel } from "../quotations/display";

Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
  ],
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function fmt(val: any, dec = 2): string {
  const n = parseFloat(val);
  return isNaN(n) ? "" : n.toFixed(dec);
}

function fmtIN(val: any, dec = 2): string {
  const n = parseFloat(val);
  if (isNaN(n)) return "";
  return n.toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

// ─── Shared primitives ────────────────────────────────────────────────────────

const GREY = "#D9D9D9";
const BORDER = { borderWidth: 0.5, borderColor: "#999", borderStyle: "solid" as const };
const BOLD_BORDER = { borderWidth: 1, borderColor: "#000", borderStyle: "solid" as const };

/**
 * react-pdf has no `border-collapse`, so a cell bordered on all four sides
 * paints its own edge right next to its neighbour's — every internal gridline
 * came out as a double rule, which doubles the ink on a printed quotation.
 *
 * Cells therefore paint only their bottom and left edge. Bottom rather than top
 * so that a table split across pages still closes at the page break: the last
 * row before the break draws its own bottom. The first row of a table supplies
 * the top edge and the last cell in a row closes the right edge.
 */
const CELL = { borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderColor: "#999", borderStyle: "solid" as const };
const CELL_END = { borderRightWidth: 0.5 };
const CELL_TOP = { borderTopWidth: 0.5 };

const CELL_BOLD = { borderBottomWidth: 1, borderLeftWidth: 1, borderColor: "#000", borderStyle: "solid" as const };
const CELL_BOLD_END = { borderRightWidth: 1 };
const CELL_BOLD_TOP = { borderTopWidth: 1 };

/**
 * Diagonal DRAFT watermark for quotations that are not yet approved — rendered
 * as the first child of the Page so all content paints on top of it.
 */
function DraftWatermark() {
  return (
    <View
      fixed
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: 120,
          fontFamily: "Helvetica",
          fontWeight: "bold",
          color: "#e31e24",
          opacity: 0.08,
          transform: "rotate(-30deg)",
        }}
      >
        DRAFT
      </Text>
    </View>
  );
}

function T({ style, children }: { style?: any; children?: React.ReactNode }) {
  return <Text style={[{ fontFamily: "Helvetica", fontSize: 8 }, style]}>{children}</Text>;
}

// ─── STANDARD QUOTATION (A4 landscape, paginated) ─────────────────────────────

const NOTES = [
  "This quotation is subject to our final confirmation at the time of order placement.",
  "Prices are subject to review in the event of any change in item scope or quantities.",
  "Invoicing shall be based on the actual quantity supplied at the agreed unit rates.",
  "The delivery / shipping schedule shall be calculated based on the number of business days from the date of receipt of a clear techno-commercial Purchase Order (PO).",
  "Supply shall be made as close as reasonably possible to the requested quantities, in accordance with standard manufacturing tolerances and available fixed lengths.",
  "Once a Purchase Order is placed, cancellation shall not be permitted under any circumstances.",
  "The quoted specifications conform to standard industry practices and applicable specifications, without any supplementary requirements unless explicitly stated in this offer.",
  "Reduction in ordered quantity after placement of Purchase Order shall not be accepted. Any increase in quantity shall be subject to our review and acceptance.",
  "In the event of any change in Government duties, taxes, levies, or policies, the quoted prices shall be subject to revision accordingly.",
  "In case of Force Majeure events, we shall not be liable for any delay or failure in performance due to unforeseen events beyond our control, and delivery schedules shall be adjusted accordingly.",
];

// 14-column widths as % strings (landscape content ~281mm wide).
// Layout follows the client's standard format (QTN-Rev.2): S/N, Product,
// Specification, Dim., Add. Spec., Size, Length, Ends, Qty, Unit, Unit Rate,
// Amount, Delivery, Remark/Material Code.
const STD_COLS = ["3%", "11%", "10%", "6.5%", "8%", "11%", "6%", "4%", "5%", "4%", "8%", "9%", "7%", "7.5%"];

// UOM as printed in the Unit column of the standard format.
function unitLabel(uom: string): string {
  return uom === "Mtr" || uom === "Nos" ? `${uom}.` : uom;
}

const stdStyles = StyleSheet.create({
  page: { padding: "6mm 8mm", fontFamily: "Helvetica", fontSize: 8 },
  row: { flexDirection: "row" },
  // Info grid
  infoCell: { ...CELL_BOLD, padding: "2pt 4pt", flex: 1, fontSize: 8 },
  // Table header. Repeated on every page, so it carries the table's top edge.
  th: { ...CELL_BOLD, ...CELL_BOLD_TOP, backgroundColor: GREY, padding: "2pt 2pt", textAlign: "center", fontSize: 7.5, fontFamily: "Helvetica" },
  // Table data
  td: { ...CELL_BOLD, padding: "1pt 2pt", fontSize: 7.5 },
  // Footer
  footerBar: { borderTopWidth: 1.5, borderTopColor: "#000", borderTopStyle: "solid", borderBottomWidth: 1.5, borderBottomColor: "#000", borderBottomStyle: "solid", marginTop: 3, flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  footerText: { fontSize: 7 },
  footerApprec: { borderWidth: 1, borderColor: "#000", borderStyle: "solid", borderTopWidth: 0, textAlign: "center", padding: "2pt 0", fontSize: 7.5, fontFamily: "Helvetica", fontWeight: "bold" },
  footerAddr: { borderWidth: 1, borderColor: "#000", borderStyle: "solid", borderTopWidth: 0, textAlign: "center", padding: "2pt 0", fontSize: 7.5 },
});

// Labels sit in their own sub-column with a rule after them, so the values
// line up on one edge across the whole header (as in the client's format).
const INFO_LABEL_W = 62;
const BOLD_TEXT = { fontFamily: "Helvetica", fontWeight: "bold" as const };

function InfoRow({ cells, first }: { cells: { label: string; value: string; flex?: number; bold?: boolean }[]; first?: boolean }) {
  return (
    <View style={stdStyles.row}>
      {cells.map((c, i) => (
        <View
          key={i}
          style={[
            stdStyles.infoCell,
            { padding: 0, flexDirection: "row" },
            c.flex ? { flex: c.flex } : {},
            i === cells.length - 1 ? CELL_BOLD_END : {},
            first ? CELL_BOLD_TOP : {},
          ]}
        >
          <View style={{ width: INFO_LABEL_W, padding: "2pt 4pt", borderRightWidth: 1, borderRightColor: "#000", borderRightStyle: "solid" }}>
            <T style={c.bold ? BOLD_TEXT : {}}>{c.label}</T>
          </View>
          <View style={{ flex: 1, padding: "2pt 4pt" }}>
            <T style={c.bold ? BOLD_TEXT : {}}>{c.label ? `:  ${c.value}` : c.value}</T>
          </View>
        </View>
      ))}
    </View>
  );
}

function StdTh({ w, last, children }: { w: string; last?: boolean; children: React.ReactNode }) {
  return (
    <View style={[stdStyles.th, { width: w }, last ? CELL_BOLD_END : {}]}>
      <T style={{ fontSize: 7.5, textAlign: "center", fontFamily: "Helvetica", fontWeight: "bold" }}>{children}</T>
    </View>
  );
}

function StdTd({ w, align = "center", last, children }: { w: string; align?: "left" | "center" | "right"; last?: boolean; children?: React.ReactNode }) {
  return (
    <View style={[stdStyles.td, { width: w }, last ? CELL_BOLD_END : {}]}>
      <T style={{ textAlign: align, fontSize: 7.5 }}>{children}</T>
    </View>
  );
}

function StandardQuotationPage({
  quotation,
  company,
  isUnquoted,
  watermark,
}: {
  quotation: any;
  company: any;
  isUnquoted: boolean;
  watermark?: boolean;
}) {
  const curr = quotation.currency || "INR";
  const defaultUom = quotation.items[0]?.uom || "Mtr";

  const totalAmount = quotation.items.reduce((s: number, i: any) => s + (parseFloat(i.amount) || 0), 0);
  const totalQty = quotation.items.reduce((s: number, i: any) => s + (parseFloat(i.quantity) || 0), 0);
  const grandTotal = parseFloat(quotation.grandTotal) || totalAmount;

  // Country prints on its own header row, so the address line excludes it.
  const customerAddress = [
    quotation.customer.addressLine1,
    quotation.customer.addressLine2,
    [quotation.customer.city, quotation.customer.state, quotation.customer.pincode].filter(Boolean).join(", "),
  ].filter(Boolean).join(", ");

  const footerAddress = [
    "Regd. Address:",
    company.regAddressLine1,
    company.regAddressLine2,
    company.regCity,
    company.regState ? `${company.regState} - ${company.regPincode || ""}` : company.regPincode,
    company.regCountry,
  ].filter(Boolean).join(", ");

  const footerContact = [
    company.telephoneNo ? `Tel. ${company.telephoneNo}` : null,
    company.email ? `Email: ${company.email}` : null,
    company.website ? `Web: ${company.website}` : null,
  ].filter(Boolean).join("  ");

  const includedTerms = quotation.terms.filter((t: any) => t.isIncluded !== false);
  const revLabel = quotation.version && quotation.version > 0 ? ` (Revision ${quotation.version})` : "";
  const formatText = quotation.version && quotation.version > 0
    ? `FORMAT: QTN-Rev.${quotation.version}, Dated: ${fmtDate(quotation.quotationDate)}`
    : `FORMAT: ${quotation.quotationNo}, Dated: ${fmtDate(quotation.quotationDate)}`;

  return (
    <Page size="A4" orientation="landscape" style={stdStyles.page}>
      {watermark ? <DraftWatermark /> : null}

      {/* HEADER */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <View>
          {company.isoLogoUrl
            ? <Image src={company.isoLogoUrl} style={{ height: 60, objectFit: "contain" }} />
            : <T style={{ fontSize: 7, color: "#666" }}>ISO 9001:2015 | ISO 14001:2015 | ISO 45001:2018</T>
          }
        </View>
        <View style={{ alignItems: "flex-end" }}>
          {company.companyLogoUrl
            ? <Image src={company.companyLogoUrl} style={{ height: 40, objectFit: "contain" }} />
            : <T style={{ fontSize: 18, fontFamily: "Helvetica", fontWeight: "bold", color: "#548235" }}>{company.companyName}</T>
          }
        </View>
      </View>

      {/* INFO GRID */}
      <InfoRow first cells={[
        { label: "Customer", value: quotation.customer.name, flex: 2.5, bold: true },
        { label: "Inquiry no.", value: displayInquiryNo(quotation.inquiryNo), flex: 1.5 },
        { label: "Quotation No.", value: quotation.quotationNo, flex: 1.5, bold: true },
      ]} />
      <InfoRow cells={[
        { label: "Address", value: customerAddress, flex: 2.5 },
        { label: "Date", value: fmtDate(quotation.inquiryDate), flex: 1.5 },
        { label: "Date", value: fmtDate(quotation.quotationDate), flex: 1.5 },
      ]} />
      <InfoRow cells={[
        { label: "Country", value: quotation.customer.country || "", flex: 2.5 },
        { label: "", value: "", flex: 1.5 },
        { label: "", value: "", flex: 1.5 },
      ]} />
      <InfoRow cells={[
        { label: "Attn.", value: quotation.buyer?.buyerName || quotation.customer.contactPerson || "", flex: 2.5 },
        { label: "Designation", value: quotation.buyer?.designation || "", flex: 1.5 },
        { label: "Contact", value: quotation.preparedBy?.name || "", flex: 1.5 },
      ]} />
      <InfoRow cells={[
        { label: "Email", value: quotation.buyer?.email || quotation.customer.email || "", flex: 2.5 },
        { label: "Contact no.", value: quotation.buyer?.mobile || quotation.buyer?.telephone || quotation.customer.phone || "", flex: 1.5 },
        { label: "Email", value: quotation.preparedBy?.email || "", flex: 1.5 },
      ]} />

      {/* SHEET HEADING */}
      <View style={{ borderLeftWidth: 1, borderRightWidth: 1, borderColor: "#000", borderStyle: "solid", backgroundColor: "#f9f9f9", padding: "3pt 0" }}>
        <T style={{ textAlign: "center", fontSize: 9, fontFamily: "Helvetica", fontWeight: "bold" }}>
          {`Quotation Sheet${revLabel}`}
        </T>
      </View>

      {/* ITEMS TABLE — the header is fixed inside this wrapper so it repeats on
          each page the table spans, and not on later pages that hold only terms. */}
      <View>
      <View style={stdStyles.row} fixed>
        <StdTh w={STD_COLS[0]}>S/N</StdTh>
        <StdTh w={STD_COLS[1]}>Product</StdTh>
        <StdTh w={STD_COLS[2]}>Specification</StdTh>
        <StdTh w={STD_COLS[3]}>Dim.</StdTh>
        <StdTh w={STD_COLS[4]}>Add. Spec.</StdTh>
        <StdTh w={STD_COLS[5]}>Size</StdTh>
        <StdTh w={STD_COLS[6]}>Length</StdTh>
        <StdTh w={STD_COLS[7]}>Ends</StdTh>
        <StdTh w={STD_COLS[8]}>Qty</StdTh>
        <StdTh w={STD_COLS[9]}>Unit</StdTh>
        <StdTh w={STD_COLS[10]}>{`Unit Rate\n${curr}/Unit`}</StdTh>
        <StdTh w={STD_COLS[11]}>{`Amount\n(${curr}.)`}</StdTh>
        <StdTh w={STD_COLS[12]}>Delivery{"\n"}(Ex-works)</StdTh>
        <StdTh w={STD_COLS[13]} last>Remark/{"\n"}Material Code</StdTh>
      </View>

      {/* ITEM ROWS */}
      {quotation.items.map((item: any) => {
        const uom = item.uom || defaultUom;
        const rateDisplay = isUnquoted ? "QUOTED" : fmt(item.unitRate, 2);
        const amtDisplay = isUnquoted ? "QUOTED" : fmtIN(item.amount, 2);
        const matCode = item.materialCode?.code || item.materialCodeLabel || "";
        const remarkCode = [item.remark, matCode].filter(Boolean).join(" / ");
        return (
          <View key={item.id} style={stdStyles.row} wrap={false}>
            <StdTd w={STD_COLS[0]} align="center">{item.slNo || item.sNo}</StdTd>
            <StdTd w={STD_COLS[1]} align="left">{item.product}</StdTd>
            <StdTd w={STD_COLS[2]} align="left">{item.material}</StdTd>
            <StdTd w={STD_COLS[3]} align="center">{item.dimStandard || "-"}</StdTd>
            <StdTd w={STD_COLS[4]} align="left">{item.additionalSpec || "-"}</StdTd>
            <StdTd w={STD_COLS[5]} align="center">{displaySizeLabel(item)}</StdTd>
            <StdTd w={STD_COLS[6]} align="center">{item.length || "-"}</StdTd>
            <StdTd w={STD_COLS[7]} align="center">{item.ends || "-"}</StdTd>
            <StdTd w={STD_COLS[8]} align="right">{fmt(item.quantity, 2)}</StdTd>
            <StdTd w={STD_COLS[9]} align="center">{unitLabel(uom)}</StdTd>
            <StdTd w={STD_COLS[10]} align="right">{rateDisplay}</StdTd>
            <StdTd w={STD_COLS[11]} align="right">{amtDisplay}</StdTd>
            <StdTd w={STD_COLS[12]} align="center">{item.delivery}</StdTd>
            <StdTd w={STD_COLS[13]} align="left" last>{remarkCode}</StdTd>
          </View>
        );
      })}

      {/* TOTAL ROW (per reference format) */}
      <View style={stdStyles.row} wrap={false}>
        <View style={[stdStyles.td, { width: "59.5%" }]}>
          <T style={{ textAlign: "center", fontSize: 7.5, fontFamily: "Helvetica", fontWeight: "bold" }}>Total</T>
        </View>
        <View style={[stdStyles.td, { width: STD_COLS[8] }]}>
          <T style={{ textAlign: "right", fontSize: 7.5, fontFamily: "Helvetica", fontWeight: "bold" }}>{fmt(totalQty, 2)}</T>
        </View>
        <View style={[stdStyles.td, { width: STD_COLS[9] }]} />
        <View style={[stdStyles.td, { width: STD_COLS[10] }]} />
        <View style={[stdStyles.td, { width: STD_COLS[11] }]}>
          <T style={{ textAlign: "right", fontSize: 7.5, fontFamily: "Helvetica", fontWeight: "bold" }}>
            {isUnquoted ? "QUOTED" : fmtIN(totalAmount, 2)}
          </T>
        </View>
        <View style={[stdStyles.td, { width: STD_COLS[12] }]} />
        <View style={[stdStyles.td, CELL_BOLD_END, { width: STD_COLS[13] }]} />
      </View>
      </View>

      {/* AMOUNT IN WORDS */}
      {!isUnquoted && (
        <View style={{ marginTop: 2 }}>
          <T style={{ fontSize: 7.5 }}>
            <T style={{ fontFamily: "Helvetica", fontWeight: "bold" }}>Amount in Words: </T>
            {numberToWords(grandTotal, curr)}
          </T>
        </View>
      )}

      {/* OFFER TERMS */}
      <View style={{ marginTop: 3 }}>
        <T style={{ fontFamily: "Helvetica", fontWeight: "bold", fontSize: 8.5, textDecoration: "underline" }}>OFFER TERMS:</T>
        {includedTerms.map((term: any, i: number) => (
          <View key={term.id} style={{ flexDirection: "row", marginTop: 1 }}>
            <T style={{ width: 14, textAlign: "right" }}>{i + 1}.</T>
            <T style={{ width: 100, paddingLeft: 3, fontFamily: "Helvetica", fontWeight: "bold" }}>{term.termName}</T>
            <T style={{ flex: 1, paddingLeft: 2 }}>: {term.termValue}</T>
          </View>
        ))}
      </View>

      {/* NOTES */}
      <View style={{ marginTop: 3 }}>
        <T style={{ fontFamily: "Helvetica", fontWeight: "bold", fontSize: 8.5, textDecoration: "underline" }}>NOTES:</T>
        {NOTES.map((note, i) => (
          <View key={i} style={{ flexDirection: "row", marginTop: 1 }}>
            <T style={{ width: 14, textAlign: "right" }}>{i + 1}.</T>
            <T style={{ flex: 1, paddingLeft: 3, fontSize: 7.5 }}>{note}</T>
          </View>
        ))}
      </View>

      {/* FOOTER */}
      <View style={stdStyles.footerBar}>
        <T style={stdStyles.footerText}>This is a computer generated document hence not signed.</T>
        <T style={stdStyles.footerText}>{formatText}</T>
      </View>
      <View style={stdStyles.footerApprec}>
        <T style={{ fontSize: 7.5, fontFamily: "Helvetica", fontWeight: "bold", textAlign: "center" }}>
          YOUR ORDER WILL BE GREATLY APPRECIATED AND WILL RECEIVE OUR PROMPT AND CAREFUL ATTENTION.
        </T>
      </View>
      <View style={stdStyles.footerAddr}>
        <T style={{ fontSize: 7.5, textAlign: "center", fontFamily: "Helvetica", fontWeight: "bold" }}>
          {`${footerAddress}.  ${footerContact}`}
        </T>
      </View>
    </Page>
  );
}

// ─── NON-STANDARD QUOTATION (A4 portrait, paginated) ──────────────────────────

const nsStyles = StyleSheet.create({
  page: { padding: "8mm 8mm", fontFamily: "Helvetica", fontSize: 8.5 },
  row: { flexDirection: "row" },
  // Sits inside a fully-bordered wrapper, so the dividing lines come from the
  // explicit right borders on the cells that precede one.
  infoCell: { padding: "1pt 3pt", fontSize: 8.5 },
  // Follows plain text, so the header supplies the table's top edge here.
  th: { ...CELL, ...CELL_TOP, backgroundColor: GREY, padding: "1pt 2pt", textAlign: "center", fontSize: 8.5, fontFamily: "Helvetica" },
  td: { ...CELL, padding: "2pt 2pt", fontSize: 8.5 },
  termRow: { flexDirection: "row", marginTop: 1 },
  noteRow: { flexDirection: "row", marginTop: 0.5 },
  footerBar: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#000", borderTopStyle: "solid", borderBottomWidth: 1, borderBottomColor: "#000", borderBottomStyle: "solid", marginTop: 4 },
  footerApprec: { borderWidth: 1, borderTopWidth: 0, borderColor: "#000", borderStyle: "solid", textAlign: "center", padding: "2pt 0" },
  footerAddr: { borderWidth: 1, borderTopWidth: 0, borderColor: "#000", borderStyle: "solid", textAlign: "center", padding: "2pt 3pt" },
});

// 9-column widths for non-standard
const NS_COLS = { sn: "5%", desc: "53%", qty: "8%", rate: "11%", total: "11%", del: "12%" };

function NsTh({ w, last, children }: { w: string | number; last?: boolean; children?: React.ReactNode }) {
  return (
    <View style={[nsStyles.th, { width: w as any, justifyContent: "center", alignItems: "center" }, last ? CELL_END : {}]}>
      <T style={{ textAlign: "center", fontSize: 8.5, fontFamily: "Helvetica" }}>{children}</T>
    </View>
  );
}

function NsTd({ w, align, top, last, children }: { w: string | number; align?: "left" | "center" | "right"; top?: boolean; last?: boolean; children?: React.ReactNode }) {
  return (
    <View style={[nsStyles.td, { width: w as any, justifyContent: top ? "flex-start" : "center" }, last ? CELL_END : {}]}>
      <T style={{ textAlign: align || "left", fontSize: 8.5 }}>{children}</T>
    </View>
  );
}

function buildItemDescriptionLines(item: any): string[] {
  if (item.itemDescription) {
    const mcCode = item.materialCode?.code || item.materialCodeLabel || "";
    const lines: string[] = [];
    if (mcCode && !item.itemDescription.includes(mcCode)) {
      lines.push(`MATERIAL CODE: ${mcCode}`);
    }
    lines.push(...item.itemDescription.split("\n"));
    return lines;
  }

  const lines: string[] = [];
  const matCode = item.materialCode?.code || item.materialCodeLabel || item.remark || "";
  if (matCode) lines.push(`MATERIAL CODE: ${matCode}`);
  const descParts = [item.product, item.sizeLabel, item.material].filter(Boolean);
  if (descParts.length) lines.push(descParts.join(" "));
  if (item.sizeLabel) lines.push(`SIZE: ${item.sizeLabel}${item.schedule ? ` X ${item.schedule}` : ""}`);
  if (item.ends) lines.push(`END TYPE: ${item.ends}`);
  if (item.material) lines.push(`MATERIAL: ${item.material}${item.additionalSpec ? ` ${item.additionalSpec}` : ""}`);
  if (item.tagNo) lines.push(`TAG NUMBER: ${item.tagNo}`);
  if (item.drawingRef) lines.push(`DWG: ${item.drawingRef}`);
  if (item.componentPosition) lines.push(`ITEM NO.: ${item.componentPosition}`);
  if (item.certificateReq) { lines.push(""); lines.push(`CERTIFICATE REQUIRED: ${item.certificateReq}`); }
  return lines;
}

function NonStandardQuotationPage({
  quotation,
  company,
  isTechnical,
  watermark,
}: {
  quotation: any;
  company: any;
  isTechnical: boolean;
  watermark?: boolean;
}) {
  const curr = quotation.currency || "INR";
  const typeLabel = isTechnical ? "TECHNICAL" : "COMMERCIAL";
  const revLabel = quotation.version && quotation.version > 0
    ? `REVISED ${typeLabel}\nRevision ${quotation.version}`
    : typeLabel;

  const totalAmount = quotation.items.reduce((s: number, i: any) => s + (parseFloat(i.amount) || 0), 0);
  const totalQty = quotation.items.reduce((s: number, i: any) => s + (parseFloat(i.quantity) || 0), 0);
  const grandTotal = parseFloat(quotation.grandTotal) || totalAmount;
  const includedTerms = quotation.terms.filter((t: any) => t.isIncluded !== false);

  const footerAddress = [
    company.regAddressLine1,
    company.regAddressLine2,
    company.regCity,
    company.regState ? `${company.regState} - ${company.regPincode || ""}` : company.regPincode,
    company.regCountry,
  ].filter(Boolean).join(", ");

  const footerContact = [
    company.telephoneNo ? `Phone: ${company.telephoneNo}` : null,
    company.email ? `Email: ${company.email}` : null,
    company.website ? `Web: ${company.website}` : null,
  ].filter(Boolean).join("  ");

  const customerAddressLines = [
    quotation.customer.addressLine1,
    quotation.customer.addressLine2,
    [quotation.customer.city, quotation.customer.state, quotation.customer.pincode, quotation.customer.country].filter(Boolean).join(", "),
  ].filter(Boolean);

  const buyerName = quotation.buyer?.buyerName || quotation.customer.contactPerson || "";
  const buyerDes = quotation.buyer?.designation || "";
  const buyerEmail = quotation.buyer?.email || quotation.customer.email || "";
  const buyerContact = quotation.buyer?.mobile || quotation.buyer?.telephone || quotation.customer.phone || "";
  const prepName = quotation.preparedBy?.name || "";
  const prepEmail = quotation.preparedBy?.email || "";
  const prepPhone = quotation.preparedBy?.phone || "";
  const enquiryRef = displayInquiryNo(quotation.inquiryNo);
  const formatText = quotation.version && quotation.version > 0
    ? `FORMAT: QTN-Rev.${quotation.version}, Dated: ${fmtDate(quotation.quotationDate)}`
    : `FORMAT: ${quotation.quotationNo}, Dated: ${fmtDate(quotation.quotationDate)}`;

  return (
    <Page size="A4" style={nsStyles.page}>
      {watermark ? <DraftWatermark /> : null}

      {/* ROW 1-2: Logo + Type Label */}
      <View style={[nsStyles.row, { marginBottom: 3, alignItems: "center" }]}>
        <View style={{ width: "25%", justifyContent: "center" }}>
          {company.isoLogoUrl
            ? <Image src={company.isoLogoUrl} style={{ height: 60, objectFit: "contain" }} />
            : <T style={{ fontSize: 6.5, color: "#666" }}>ISO 9001:2015 | ISO 14001:2015 | ISO 45001:2018</T>
          }
        </View>
        <View style={{ width: "42%", alignItems: "center", justifyContent: "center" }}>
          {company.companyLogoUrl
            ? <Image src={company.companyLogoUrl} style={{ height: 45, objectFit: "contain" }} />
            : <T style={{ fontSize: 16, fontFamily: "Helvetica", fontWeight: "bold" }}>{company.companyName}</T>
          }
        </View>
        <View style={{ width: "33%", ...BOLD_BORDER, alignItems: "center", justifyContent: "center", padding: "6pt 4pt" }}>
          <T style={{ fontSize: 16, fontFamily: "Helvetica", fontWeight: "bold", textAlign: "center" }}>{revLabel}</T>
        </View>
      </View>

      {/* QUOTATION NUMBER + DATE (right side) */}
      <View style={[nsStyles.row, { justifyContent: "flex-end", marginBottom: 2 }]}>
        <View style={{ width: "45%" }}>
          <View style={nsStyles.row}>
            <T style={{ fontFamily: "Helvetica", fontWeight: "bold", width: "55%" }}>Quotation Number :</T>
            <T style={{ fontFamily: "Helvetica", fontWeight: "bold", width: "45%" }}>Dated :</T>
          </View>
          <View style={nsStyles.row}>
            <T style={{ width: "55%" }}>{quotation.quotationNo}</T>
            <T style={{ width: "45%" }}>{fmtDate(quotation.quotationDate)}</T>
          </View>
        </View>
      </View>

      {/* CUSTOMER / ATTENTION / PREPARED BY GRID */}
      <View style={[nsStyles.row, { ...BORDER }]}>
        <View style={[nsStyles.infoCell, { width: "38%", borderRightWidth: 0.5, borderRightColor: "#999", borderRightStyle: "solid" }]}>
          <T style={{ fontFamily: "Helvetica", fontWeight: "bold" }}>Customer :</T>
          <T style={{ fontFamily: "Helvetica", fontWeight: "bold", fontSize: 9 }}>M/s. {quotation.customer.name}</T>
          {customerAddressLines.map((line, i) => <T key={i}>{line}</T>)}
        </View>
        <View style={[nsStyles.infoCell, { width: "30%", borderRightWidth: 0.5, borderRightColor: "#999", borderRightStyle: "solid" }]}>
          <T style={{ fontFamily: "Helvetica", fontWeight: "bold" }}>Attention :</T>
          <T>{buyerName}</T>
          <T>{buyerDes}</T>
          <T>{buyerEmail}</T>
          <T>{buyerContact}</T>
        </View>
        <View style={[nsStyles.infoCell, { width: "32%" }]}>
          <T style={{ fontFamily: "Helvetica", fontWeight: "bold" }}>Prepared by: {prepName}</T>
          {prepPhone ? <T>Direct Line : {prepPhone}</T> : null}
          {prepEmail ? <T>Email : {prepEmail}</T> : null}
          {enquiryRef ? <><T style={{ fontFamily: "Helvetica", fontWeight: "bold", marginTop: 3 }}>Enquiry Reference :</T><T>{enquiryRef}</T></> : null}
          {quotation.inquiryDate ? <T>Dated: {fmtDate(quotation.inquiryDate)}</T> : null}
        </View>
      </View>

      {/* INTRO LINE */}
      <View style={{ marginTop: 4, marginBottom: 3 }}>
        <T>In response to your inquiry, we are pleased to quote as follows:</T>
      </View>

      {/* TABLE — the header is fixed inside this wrapper so it repeats on each
          page the table spans, and not on later pages that hold only terms. */}
      <View>
      <View style={nsStyles.row} fixed>
        <NsTh w={NS_COLS.sn}>Sr.{"\n"}no.</NsTh>
        <NsTh w={NS_COLS.desc}>Item Description</NsTh>
        <NsTh w={NS_COLS.qty}>{`Qty\n${quotation.items[0]?.uom || "MTR"}`}</NsTh>
        <NsTh w={NS_COLS.rate}>{`Unit rate\n${curr}`}</NsTh>
        <NsTh w={NS_COLS.total}>{`Total\n${curr}`}</NsTh>
        <NsTh w={NS_COLS.del} last>Delivery{"\n"}Ex-Works</NsTh>
      </View>

      {/* ITEM ROWS */}
      {quotation.items.map((item: any) => {
        const lines = buildItemDescriptionLines(item);
        return (
          <View key={item.id} style={nsStyles.row}>
            <NsTd w={NS_COLS.sn} align="center" top>{item.slNo || item.sNo}</NsTd>
            <View style={[nsStyles.td, { width: NS_COLS.desc }]}>
              {lines.map((line, li) => (
                <T key={li} style={{ fontSize: 8, lineHeight: 1.3 }}>{line}</T>
              ))}
            </View>
            <NsTd w={NS_COLS.qty} align="center" top>{fmt(item.quantity, 0)}</NsTd>
            <NsTd w={NS_COLS.rate} align="right" top>
              {isTechnical ? "QUOTED" : fmt(item.unitRate, 2)}
            </NsTd>
            <NsTd w={NS_COLS.total} align="right" top>
              {isTechnical ? "QUOTED" : fmtIN(item.amount, 0)}
            </NsTd>
            <NsTd w={NS_COLS.del} align="center" top last>{item.delivery}</NsTd>
          </View>
        );
      })}

      {/* GRAND TOTAL ROW (per reference format) */}
      <View style={nsStyles.row} wrap={false}>
        <View style={[nsStyles.td, { width: "58%" }]}>
          <T style={{ fontFamily: "Helvetica", fontWeight: "bold", fontSize: 8.5 }}>Grand Total</T>
        </View>
        <View style={[nsStyles.td, { width: NS_COLS.qty }]}>
          <T style={{ textAlign: "center", fontFamily: "Helvetica", fontWeight: "bold", fontSize: 8.5 }}>{fmt(totalQty, 0)}</T>
        </View>
        <View style={[nsStyles.td, { width: NS_COLS.rate }]} />
        <View style={[nsStyles.td, { width: NS_COLS.total }]}>
          <T style={{ textAlign: "right", fontFamily: "Helvetica", fontWeight: "bold", fontSize: 8.5 }}>
            {isTechnical ? "QUOTED" : fmtIN(totalAmount, 0)}
          </T>
        </View>
        <View style={[nsStyles.td, CELL_END, { width: NS_COLS.del }]} />
      </View>
      </View>

      {/* AMOUNT IN WORDS */}
      {!isTechnical && (
        <View style={[BORDER, { padding: "2pt 4pt", borderTopWidth: 0 }]}>
          <T style={{ fontSize: 8 }}>
            <T style={{ fontFamily: "Helvetica", fontWeight: "bold" }}>Amount in Words: </T>
            {numberToWords(grandTotal, curr)}
          </T>
        </View>
      )}

      {/* OFFER TERMS */}
      <View style={{ marginTop: 4 }}>
        <T style={{ fontFamily: "Helvetica", fontWeight: "bold", fontSize: 8.5, textDecoration: "underline" }}>OFFER TERMS:</T>
        {includedTerms.map((term: any) => (
          <View key={term.id} style={nsStyles.termRow}>
            <T style={{ width: "28%", fontFamily: "Helvetica", fontWeight: "bold", fontSize: 8 }}>{term.termName}</T>
            <T style={{ flex: 1, fontSize: 8 }}>: {term.termValue}</T>
          </View>
        ))}
      </View>

      {/* NOTES */}
      <View style={{ marginTop: 4 }}>
        <T style={{ fontFamily: "Helvetica", fontWeight: "bold", fontSize: 8.5, textDecoration: "underline" }}>NOTES:</T>
        {NOTES.map((note, i) => (
          <View key={i} style={nsStyles.noteRow}>
            <T style={{ width: 14, textAlign: "right", fontSize: 7.5 }}>{i + 1})</T>
            <T style={{ flex: 1, paddingLeft: 3, fontSize: 7.5, lineHeight: 1.25 }}>{note}</T>
          </View>
        ))}
      </View>

      {/* FOOTER */}
      <View style={{ marginTop: 6 }}>
        <View style={nsStyles.footerBar}>
          <View style={{ flex: 1, padding: "2pt 3pt" }}>
            <T style={{ fontSize: 7 }}>This is a computer generated document hence not signed.</T>
          </View>
          <View style={{ padding: "2pt 3pt" }}>
            <T style={{ fontSize: 7, textAlign: "right" }}>{formatText}</T>
          </View>
        </View>
        <View style={nsStyles.footerApprec}>
          <T style={{ fontSize: 7.5, fontFamily: "Helvetica", fontWeight: "bold", textAlign: "center" }}>
            YOUR ORDER WILL BE GREATLY APPRECIATED AND WILL RECEIVE OUR PROMPT AND CAREFUL ATTENTION.
          </T>
        </View>
        <View style={nsStyles.footerAddr}>
          <T style={{ fontSize: 7.5, fontFamily: "Helvetica", fontWeight: "bold", textAlign: "center" }}>
            {`Regd. Address: ${footerAddress}.  ${footerContact}`}
          </T>
        </View>
      </View>
    </Page>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface QuotationPDFProps {
  quotation: any;
  company: any;
  variant?: "QUOTED" | "UNQUOTED";
  /** Render a diagonal DRAFT watermark (quotation not yet approved). */
  watermark?: boolean;
}

export function QuotationPDF({ quotation, company, variant = "QUOTED", watermark = false }: QuotationPDFProps) {
  const isNonStandard = quotation.quotationCategory === "NON_STANDARD";
  const isUnquoted = variant === "UNQUOTED";

  if (isNonStandard) {
    return (
      <Document>
        <NonStandardQuotationPage quotation={quotation} company={company} isTechnical={isUnquoted} watermark={watermark} />
      </Document>
    );
  }

  return (
    <Document>
      <StandardQuotationPage quotation={quotation} company={company} isUnquoted={isUnquoted} watermark={watermark} />
    </Document>
  );
}
