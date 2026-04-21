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

// A full-border cell: used for most table cells
function Cell({
  style,
  children,
}: {
  style?: any;
  children?: React.ReactNode;
}) {
  return <View style={[BORDER, { padding: "1pt 2pt" }, style]}>{children}</View>;
}

function T({ style, children }: { style?: any; children?: React.ReactNode }) {
  return <Text style={[{ fontFamily: "Helvetica", fontSize: 8 }, style]}>{children}</Text>;
}

// ─── STANDARD QUOTATION (Landscape 297×230mm) ─────────────────────────────────

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

// 14-column widths as % strings (landscape content ~281mm wide)
const STD_COLS = ["3%", "10%", "10%", "10%", "9%", "5%", "4.5%", "6%", "3.5%", "6.5%", "8%", "9%", "8%", "7.5%"];

const stdStyles = StyleSheet.create({
  page: { padding: "6mm 8mm", fontFamily: "Helvetica", fontSize: 8 },
  row: { flexDirection: "row" },
  // Info grid
  infoCell: { ...BOLD_BORDER, padding: "2pt 4pt", flex: 1, fontSize: 8 },
  // Table header
  th: { ...BOLD_BORDER, backgroundColor: GREY, padding: "2pt 2pt", textAlign: "center", fontSize: 7.5, fontFamily: "Helvetica" },
  // Table data
  td: { ...BOLD_BORDER, padding: "1pt 2pt", fontSize: 7.5 },
  // Footer
  footerBar: { borderTopWidth: 1.5, borderTopColor: "#000", borderTopStyle: "solid", borderBottomWidth: 1.5, borderBottomColor: "#000", borderBottomStyle: "solid", marginTop: 3, flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  footerText: { fontSize: 7 },
  footerApprec: { borderWidth: 1, borderColor: "#000", borderStyle: "solid", borderTopWidth: 0, textAlign: "center", padding: "2pt 0", fontSize: 7.5, fontFamily: "Helvetica", fontWeight: "bold" },
  footerAddr: { borderWidth: 1, borderColor: "#000", borderStyle: "solid", borderTopWidth: 0, textAlign: "center", padding: "2pt 0", fontSize: 7.5 },
});

function InfoRow({ cells }: { cells: { label: string; value: string; flex?: number }[] }) {
  return (
    <View style={stdStyles.row}>
      {cells.map((c, i) => (
        <View key={i} style={[stdStyles.infoCell, c.flex ? { flex: c.flex } : {}]}>
          <T>{c.label ? `${c.label}  :  ` : ""}<T style={{ fontFamily: "Helvetica" }}>{c.value}</T></T>
        </View>
      ))}
    </View>
  );
}

function StdTh({ w, children }: { w: string; children: React.ReactNode }) {
  return (
    <View style={[stdStyles.th, { width: w }]}>
      <T style={{ fontSize: 7.5, textAlign: "center", fontFamily: "Helvetica", fontWeight: "bold" }}>{children}</T>
    </View>
  );
}

function StdTd({ w, align = "center", children }: { w: string; align?: "left" | "center" | "right"; children?: React.ReactNode }) {
  return (
    <View style={[stdStyles.td, { width: w }]}>
      <T style={{ textAlign: align, fontSize: 7.5 }}>{children}</T>
    </View>
  );
}

function StandardQuotationPage({
  quotation,
  company,
  isUnquoted,
}: {
  quotation: any;
  company: any;
  isUnquoted: boolean;
}) {
  const curr = quotation.currency || "INR";
  const defaultUom = quotation.items[0]?.uom || "Mtr";
  const allUoms = new Set(quotation.items.map((i: any) => i.uom || defaultUom));
  const hasMixed = allUoms.size > 1;

  const totalAmount = quotation.items.reduce((s: number, i: any) => s + (parseFloat(i.amount) || 0), 0);
  const grandTotal = parseFloat(quotation.grandTotal) || totalAmount;

  const customerAddress = [
    quotation.customer.addressLine1,
    quotation.customer.addressLine2,
    [quotation.customer.city, quotation.customer.state, quotation.customer.pincode].filter(Boolean).join(", "),
    quotation.customer.country,
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
    <Page size={[841.89, 1587]} style={stdStyles.page}>

      {/* HEADER */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <View>
          {company.isoLogoUrl
            ? <Image src={company.isoLogoUrl} style={{ height: 40, objectFit: "contain" }} />
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
      <InfoRow cells={[
        { label: "Customer", value: quotation.customer.name, flex: 2.5 },
        { label: "Inquiry no.", value: quotation.inquiryNo || "", flex: 1.5 },
        { label: "Quotation No.", value: quotation.quotationNo, flex: 1.5 },
      ]} />
      <InfoRow cells={[
        { label: "Address", value: customerAddress, flex: 2.5 },
        { label: "Date", value: fmtDate(quotation.inquiryDate), flex: 1.5 },
        { label: "Date", value: fmtDate(quotation.quotationDate), flex: 1.5 },
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
      <InfoRow cells={[
        { label: "Phone", value: quotation.customer.phone || "", flex: 2.5 },
        { label: "", value: "", flex: 1.5 },
        { label: "Phone", value: quotation.preparedBy?.phone || "", flex: 1.5 },
      ]} />

      {/* SHEET HEADING */}
      <View style={{ borderWidth: 1, borderColor: "#000", borderStyle: "solid", borderTopWidth: 0, backgroundColor: "#f9f9f9", padding: "3pt 0" }}>
        <T style={{ textAlign: "center", fontSize: 9, fontFamily: "Helvetica", fontWeight: "bold" }}>
          {`Quotation Sheet${revLabel}`}
        </T>
      </View>

      {/* ITEMS TABLE HEADER */}
      <View style={stdStyles.row}>
        <StdTh w={STD_COLS[0]}>S/N</StdTh>
        <StdTh w={STD_COLS[1]}>Product</StdTh>
        <StdTh w={STD_COLS[2]}>Material</StdTh>
        <StdTh w={STD_COLS[3]}>Additional{"\n"}Spec.</StdTh>
        <StdTh w={STD_COLS[4]}>Size</StdTh>
        <StdTh w={STD_COLS[5]}>OD{"\n"}(mm)</StdTh>
        <StdTh w={STD_COLS[6]}>W.T.{"\n"}(mm)</StdTh>
        <StdTh w={STD_COLS[7]}>Length{"\n"}(Mtr.)</StdTh>
        <StdTh w={STD_COLS[8]}>Ends</StdTh>
        <StdTh w={STD_COLS[9]}>{`Qty\n(${defaultUom})`}</StdTh>
        <StdTh w={STD_COLS[10]}>{`Unit Rate\n${curr}/${defaultUom}`}</StdTh>
        <StdTh w={STD_COLS[11]}>{`Amount\n(${curr}.)`}</StdTh>
        <StdTh w={STD_COLS[12]}>Delivery{"\n"}(Ex-works)</StdTh>
        <StdTh w={STD_COLS[13]}>Material{"\n"}Code</StdTh>
      </View>

      {/* ITEM ROWS */}
      {quotation.items.map((item: any) => {
        const uom = item.uom || defaultUom;
        const qtyDisplay = hasMixed ? `${fmt(item.quantity, 2)} ${uom}` : fmt(item.quantity, 2);
        const rateDisplay = isUnquoted ? "QUOTED" : (hasMixed ? `${fmt(item.unitRate, 2)}/${uom}` : fmt(item.unitRate, 2));
        const amtDisplay = isUnquoted ? "QUOTED" : fmtIN(item.amount, 2);
        const matCode = item.materialCode?.code || item.materialCodeLabel || "";
        return (
          <View key={item.id} style={stdStyles.row}>
            <StdTd w={STD_COLS[0]} align="center">{item.sNo}</StdTd>
            <StdTd w={STD_COLS[1]} align="left">{item.product}</StdTd>
            <StdTd w={STD_COLS[2]} align="left">{item.material}</StdTd>
            <StdTd w={STD_COLS[3]} align="left">{item.additionalSpec}</StdTd>
            <StdTd w={STD_COLS[4]} align="center">{item.sizeLabel}</StdTd>
            <StdTd w={STD_COLS[5]} align="center">{item.od ? fmt(item.od, 1) : ""}</StdTd>
            <StdTd w={STD_COLS[6]} align="center">{item.wt ? fmt(item.wt, 2) : ""}</StdTd>
            <StdTd w={STD_COLS[7]} align="center">{item.length}</StdTd>
            <StdTd w={STD_COLS[8]} align="center">{item.ends}</StdTd>
            <StdTd w={STD_COLS[9]} align="right">{qtyDisplay}</StdTd>
            <StdTd w={STD_COLS[10]} align="right">{rateDisplay}</StdTd>
            <StdTd w={STD_COLS[11]} align="right">{amtDisplay}</StdTd>
            <StdTd w={STD_COLS[12]} align="center">{item.delivery}</StdTd>
            <StdTd w={STD_COLS[13]} align="left">{matCode}</StdTd>
          </View>
        );
      })}

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

// ─── NON-STANDARD QUOTATION (Portrait 210×320mm) ──────────────────────────────

const nsStyles = StyleSheet.create({
  page: { padding: "8mm 8mm", fontFamily: "Helvetica", fontSize: 8.5 },
  row: { flexDirection: "row" },
  infoCell: { ...BORDER, padding: "1pt 3pt", fontSize: 8.5 },
  th: { ...BORDER, backgroundColor: GREY, padding: "1pt 2pt", textAlign: "center", fontSize: 8.5, fontFamily: "Helvetica" },
  td: { ...BORDER, padding: "2pt 2pt", fontSize: 8.5 },
  termRow: { flexDirection: "row", marginTop: 1 },
  noteRow: { flexDirection: "row", marginTop: 0.5 },
  footerBar: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#000", borderTopStyle: "solid", borderBottomWidth: 1, borderBottomColor: "#000", borderBottomStyle: "solid", marginTop: 4 },
  footerApprec: { borderWidth: 1, borderTopWidth: 0, borderColor: "#000", borderStyle: "solid", textAlign: "center", padding: "2pt 0" },
  footerAddr: { borderWidth: 1, borderTopWidth: 0, borderColor: "#000", borderStyle: "solid", textAlign: "center", padding: "2pt 3pt" },
});

// 9-column widths for non-standard
const NS_COLS = { sn: "5%", desc: "53%", qty: "8%", rate: "11%", total: "11%", del: "12%" };

function NsTh({ w, rowSpan, children }: { w: string | number; rowSpan?: number; children?: React.ReactNode }) {
  return (
    <View style={[nsStyles.th, { width: w as any, justifyContent: "center", alignItems: "center" }]}>
      <T style={{ textAlign: "center", fontSize: 8.5, fontFamily: "Helvetica" }}>{children}</T>
    </View>
  );
}

function NsTd({ w, align, top, children }: { w: string | number; align?: "left" | "center" | "right"; top?: boolean; children?: React.ReactNode }) {
  return (
    <View style={[nsStyles.td, { width: w as any, justifyContent: top ? "flex-start" : "center" }]}>
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
}: {
  quotation: any;
  company: any;
  isTechnical: boolean;
}) {
  const curr = quotation.currency || "INR";
  const typeLabel = isTechnical ? "TECHNICAL" : "COMMERCIAL";
  const revLabel = quotation.version && quotation.version > 0
    ? `REVISED ${typeLabel}\nRevision ${quotation.version}`
    : typeLabel;

  const totalAmount = quotation.items.reduce((s: number, i: any) => s + (parseFloat(i.amount) || 0), 0);
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
  const enquiryRef = quotation.inquiryNo || "";
  const formatText = quotation.version && quotation.version > 0
    ? `FORMAT: QTN-Rev.${quotation.version}, Dated: ${fmtDate(quotation.quotationDate)}`
    : `FORMAT: ${quotation.quotationNo}, Dated: ${fmtDate(quotation.quotationDate)}`;

  return (
    <Page size={[595.28, 907.09]} style={nsStyles.page}>

      {/* ROW 1-2: Logo + Type Label */}
      <View style={[nsStyles.row, { marginBottom: 3, alignItems: "center" }]}>
        <View style={{ width: "25%", justifyContent: "center" }}>
          {company.isoLogoUrl
            ? <Image src={company.isoLogoUrl} style={{ height: 40, objectFit: "contain" }} />
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

      {/* TABLE HEADER */}
      <View style={nsStyles.row}>
        <NsTh w={NS_COLS.sn}>Sr.{"\n"}no.</NsTh>
        <NsTh w={NS_COLS.desc}>Item Description</NsTh>
        <NsTh w={NS_COLS.qty}>{`Qty\n${quotation.items[0]?.uom || "MTR"}`}</NsTh>
        <NsTh w={NS_COLS.rate}>{`Unit rate\n${curr}`}</NsTh>
        <NsTh w={NS_COLS.total}>{`Total\n${curr}`}</NsTh>
        <NsTh w={NS_COLS.del}>Delivery{"\n"}Ex-Works</NsTh>
      </View>

      {/* ITEM ROWS */}
      {quotation.items.map((item: any) => {
        const lines = buildItemDescriptionLines(item);
        return (
          <View key={item.id} style={nsStyles.row}>
            <NsTd w={NS_COLS.sn} align="center" top>{item.sNo}</NsTd>
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
            <NsTd w={NS_COLS.del} align="center" top>{item.delivery}</NsTd>
          </View>
        );
      })}

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
}

export function QuotationPDF({ quotation, company, variant = "QUOTED" }: QuotationPDFProps) {
  const isNonStandard = quotation.quotationCategory === "NON_STANDARD";
  const isUnquoted = variant === "UNQUOTED";

  if (isNonStandard) {
    return (
      <Document>
        <NonStandardQuotationPage quotation={quotation} company={company} isTechnical={isUnquoted} />
      </Document>
    );
  }

  return (
    <Document>
      <StandardQuotationPage quotation={quotation} company={company} isUnquoted={isUnquoted} />
    </Document>
  );
}
