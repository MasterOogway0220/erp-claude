import React from "react";
import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import { CELL, CELL_END, CELL_TOP, base, fmtDate, fmtIN } from "./primitives";
import type { CompanyInfo, POAcceptanceData } from "./po-acceptance-template";

/**
 * PO acceptance letter — our written confirmation to the client that we accept
 * their purchase order, with the committed delivery date (CDD) we promise.
 *
 * The same content as `po-acceptance-template.ts`, which stays as the HTML copy
 * embedded in the acceptance email. This one is the downloadable file: the
 * download used to save that HTML under a .pdf name, which no PDF reader opens.
 */

// Widths total 100%. No colspan in react-pdf: the totals row spans the first
// eight columns with one cell of their summed width.
const COLS = {
  sno: "5%",
  poSl: "8%",
  poCode: "12%",
  desc: "26%",
  size: "12%",
  qty: "7%",
  uom: "6%",
  rate: "11%",
  amount: "13%",
};
const SPAN_TO_AMOUNT = "87%";

const BLUE = "#1e40af";

function Cell({
  width,
  children,
  align,
  header,
  top,
  end,
}: {
  width: string;
  children: React.ReactNode;
  align?: "right" | "center";
  header?: boolean;
  top?: boolean;
  end?: boolean;
}) {
  return (
    <View
      style={[
        CELL,
        top ? CELL_TOP : {},
        end ? CELL_END : {},
        { width, paddingVertical: 3, paddingHorizontal: 4, backgroundColor: header ? "#f1f5f9" : undefined },
      ]}
    >
      <Text style={[header ? base.bold : {}, align === "right" ? base.right : align === "center" ? base.center : {}]}>
        {children}
      </Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text
      style={[
        base.bold,
        { fontSize: 10, color: BLUE, borderBottomWidth: 0.5, borderColor: "#cbd5e1", borderStyle: "solid", paddingBottom: 2, marginTop: 12, marginBottom: 6 },
      ]}
    >
      {children}
    </Text>
  );
}

function Line({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <Text style={{ marginBottom: 1.5 }}>
      <Text style={[base.bold, { color: "#475569" }]}>{label} </Text>
      {value}
    </Text>
  );
}

export function POAcceptanceDocument({ data, company }: { data: POAcceptanceData; company: CompanyInfo }) {
  const companyAddress = [
    company.regAddressLine1,
    company.regAddressLine2,
    company.regCity,
    company.regState ? `${company.regState} - ${company.regPincode || ""}` : company.regPincode,
    company.regCountry,
  ]
    .filter(Boolean)
    .join(", ");
  const customerAddress = [data.customer.addressLine1, data.customer.addressLine2, data.customer.city, data.customer.state]
    .filter(Boolean)
    .join(", ");
  const currency = data.clientPO.currency || "INR";

  const contacts = [
    ["Follow-up", data.followUpName, data.followUpEmail, data.followUpPhone],
    ["Quality", data.qualityName, data.qualityEmail, data.qualityPhone],
    ["Accounts", data.accountsName, data.accountsEmail, data.accountsPhone],
  ].filter(([, name]) => name);

  return (
    <Document title={`PO Acceptance ${data.acceptanceNo}`}>
      <Page size="A4" style={[base.page, { fontSize: 8.5, color: "#1e293b" }]}>
        {/* Header */}
        <View style={{ alignItems: "center", borderBottomWidth: 2, borderColor: BLUE, borderStyle: "solid", paddingBottom: 8, marginBottom: 12 }}>
          {company.companyLogoUrl ? (
            <Image src={company.companyLogoUrl} style={{ height: 40, objectFit: "contain", marginBottom: 4 }} />
          ) : null}
          <Text style={[base.bold, { fontSize: 15, color: BLUE }]}>{company.companyName}</Text>
          {companyAddress ? <Text style={{ fontSize: 7.5, color: "#64748b", marginTop: 2 }}>{companyAddress}</Text> : null}
          {company.telephoneNo ? (
            <Text style={{ fontSize: 7.5, color: "#64748b" }}>
              Tel: {company.telephoneNo}
              {company.email ? ` | Email: ${company.email}` : ""}
            </Text>
          ) : null}
          {company.website ? <Text style={{ fontSize: 7.5, color: "#64748b" }}>{company.website}</Text> : null}
        </View>

        <Text style={[base.bold, base.center, { fontSize: 12, marginBottom: 12 }]}>PURCHASE ORDER ACCEPTANCE</Text>

        {/* To / references */}
        <View style={[base.row, { justifyContent: "space-between", marginBottom: 10 }]}>
          <View style={{ width: "48%" }}>
            <Text style={[base.bold, { color: "#475569" }]}>To:</Text>
            <Text style={base.bold}>{data.customer.name}</Text>
            {data.customer.contactPerson ? <Text>Attn: {data.customer.contactPerson}</Text> : null}
            {customerAddress ? <Text>{customerAddress}</Text> : null}
            {data.customer.gstNo ? <Text>GSTIN: {data.customer.gstNo}</Text> : null}
          </View>
          <View style={{ width: "48%", alignItems: "flex-end" }}>
            <Line label="Acceptance No:" value={data.acceptanceNo} />
            <Line label="Date:" value={fmtDate(data.acceptanceDate)} />
            <Line label="Your PO No:" value={data.clientPO.clientPoNumber} />
            <Line label="PO Date:" value={fmtDate(data.clientPO.clientPoDate)} />
            <Line label="Project:" value={data.clientPO.projectName} />
            <Line label="Our Ref:" value={data.clientPO.cpoNo} />
          </View>
        </View>

        <Text style={{ marginBottom: 4 }}>Dear {data.customer.contactPerson || "Sir/Madam"},</Text>
        <Text style={{ marginBottom: 4 }}>
          We acknowledge receipt of your Purchase Order No. <Text style={base.bold}>{data.clientPO.clientPoNumber}</Text>
          {data.clientPO.clientPoDate ? (
            <Text>
              {" "}dated <Text style={base.bold}>{fmtDate(data.clientPO.clientPoDate)}</Text>
            </Text>
          ) : null}{" "}
          and are pleased to confirm our acceptance of the same.
        </Text>
        <Text>
          The committed delivery date for this order is <Text style={base.bold}>{fmtDate(data.committedDeliveryDate)}</Text>.
        </Text>

        <SectionTitle>Order Details</SectionTitle>
        <View>
          <View style={base.row} fixed>
            <Cell width={COLS.sno} header top align="center">S.No</Cell>
            <Cell width={COLS.poSl} header top align="center">PO Sl. No.</Cell>
            <Cell width={COLS.poCode} header top>PO Item Code</Cell>
            <Cell width={COLS.desc} header top>Product Description</Cell>
            <Cell width={COLS.size} header top align="center">Size</Cell>
            <Cell width={COLS.qty} header top align="center">Qty</Cell>
            <Cell width={COLS.uom} header top align="center">UOM</Cell>
            <Cell width={COLS.rate} header top align="right">{`Rate (${currency})`}</Cell>
            <Cell width={COLS.amount} header top end align="right">{`Amount (${currency})`}</Cell>
          </View>
          {data.items.map((item, i) => (
            <View style={base.row} key={i} wrap={false}>
              <Cell width={COLS.sno} align="center">{String(item.sNo)}</Cell>
              <Cell width={COLS.poSl} align="center">{item.poSlNo || "-"}</Cell>
              <Cell width={COLS.poCode}>{item.poItemCode || "-"}</Cell>
              <Cell width={COLS.desc}>
                {item.product || "-"}
                {item.material ? `\n${item.material}${item.additionalSpec ? ` / ${item.additionalSpec}` : ""}` : ""}
              </Cell>
              <Cell width={COLS.size} align="center">{item.sizeLabel || "-"}</Cell>
              <Cell width={COLS.qty} align="center">{String(item.qtyOrdered)}</Cell>
              <Cell width={COLS.uom} align="center">{item.uom || "-"}</Cell>
              <Cell width={COLS.rate} align="right">{fmtIN(item.unitRate)}</Cell>
              <Cell width={COLS.amount} align="right" end>{fmtIN(item.amount)}</Cell>
            </View>
          ))}
          {(data.summary ?? []).map((r, i) => (
            <View style={base.row} key={`s${i}`} wrap={false}>
              <Cell width={SPAN_TO_AMOUNT} align="right">{r.label}</Cell>
              <Cell width={COLS.amount} end align="right">{fmtIN(r.amount)}</Cell>
            </View>
          ))}
          <View style={base.row} wrap={false}>
            <Cell width={SPAN_TO_AMOUNT} header align="right">Total:</Cell>
            <Cell width={COLS.amount} header end align="right">{fmtIN(data.clientPO.grandTotal)}</Cell>
          </View>
        </View>

        {data.terms?.length ? (
          <View>
            <SectionTitle>Terms &amp; Conditions</SectionTitle>
            {data.terms.map((t, i) => (
              <View key={i} style={[base.row, { marginBottom: 2 }]} wrap={false}>
                <Text style={[base.bold, { width: 120, color: "#475569" }]}>{t.termName}</Text>
                <Text style={{ flex: 1 }}>{t.termValue}</Text>
              </View>
            ))}
          </View>
        ) : data.clientPO.paymentTerms || data.clientPO.deliveryTerms ? (
          <View wrap={false}>
            <SectionTitle>Terms</SectionTitle>
            <Line label="Payment Terms:" value={data.clientPO.paymentTerms} />
            <Line label="Delivery Terms:" value={data.clientPO.deliveryTerms} />
          </View>
        ) : null}

        {contacts.length > 0 ? (
          <View wrap={false}>
            <SectionTitle>Contact Persons</SectionTitle>
            <View style={base.row}>
              <Cell width="20%" header top>Department</Cell>
              <Cell width="25%" header top>Name</Cell>
              <Cell width="35%" header top>Email</Cell>
              <Cell width="20%" header top end>Phone</Cell>
            </View>
            {contacts.map(([dept, name, email, phone]) => (
              <View style={base.row} key={dept}>
                <Cell width="20%">{dept}</Cell>
                <Cell width="25%">{name || ""}</Cell>
                <Cell width="35%">{email || ""}</Cell>
                <Cell width="20%" end>{phone || ""}</Cell>
              </View>
            ))}
          </View>
        ) : null}

        {data.remarks ? (
          <Text style={{ marginTop: 12 }}>
            <Text style={base.bold}>Remarks: </Text>
            {data.remarks}
          </Text>
        ) : null}

        {/* Signature: our follow-up person when known, else anonymous. */}
        <View style={{ marginTop: 28 }} wrap={false}>
          <Text>Thanking you,</Text>
          <Text style={[base.bold, { marginTop: 28 }]}>For {company.companyName}</Text>
          {data.ourContact ? (
            <View>
              <Text>{data.ourContact.name}</Text>
              <Text style={{ color: "#64748b" }}>Follow-up contact</Text>
              {data.ourContact.email ? <Text>{data.ourContact.email}</Text> : null}
              {data.ourContact.phone ? <Text>{data.ourContact.phone}</Text> : null}
            </View>
          ) : (
            <Text style={{ color: "#64748b" }}>Authorized Signatory</Text>
          )}
        </View>

        <Text
          style={{ marginTop: 24, fontSize: 7, color: "#94a3b8", textAlign: "center", borderTopWidth: 0.5, borderColor: "#e2e8f0", borderStyle: "solid", paddingTop: 4 }}
        >
          This is a system generated document from {company.companyName}
        </Text>
      </Page>
    </Document>
  );
}
