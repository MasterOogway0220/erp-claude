import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { base, fmtDate } from "./primitives";

/**
 * Lab letter — the covering letter that goes to an external testing laboratory
 * with a batch of material. It names the heat number, the specification and
 * the list of tests the lab must perform, and records whether a TPI
 * (third-party inspection) agency has to witness those tests before the
 * results count.
 *
 * Domain notes for anyone new to this:
 *  - A *heat number* identifies the melt a piece of steel came from. Every
 *    test result is traceable back to it, so it is reproduced verbatim and in
 *    a monospaced face so digits cannot be misread.
 *  - *TPI witness* means an independent inspector must physically watch the
 *    test. Scheduling them before the lab starts is the whole reason the
 *    witness block is a coloured panel rather than a buried table row.
 *
 * Replaces the inline HTML that used to be handed to Chromium in the route.
 * Rendering in-process removes the browser binary from the deployment.
 */

export interface LabLetterCompany {
  companyName?: string | null;
  regAddressLine1?: string | null;
  regAddressLine2?: string | null;
  regCity?: string | null;
  regState?: string | null;
  regPincode?: string | null;
  telephoneNo?: string | null;
  email?: string | null;
  website?: string | null;
  gstNo?: string | null;
}

export interface LabLetterData {
  letterNo: string;
  letterDate: string | Date | null;
  poNumber?: string | null;
  clientName?: string | null;
  labName?: string | null;
  labAddress?: string | null;
  productDescription?: string | null;
  itemCode?: string | null;
  specification?: string | null;
  sizeLabel?: string | null;
  heatNo?: string | null;
  make?: string | null;
  quantity?: string | null;
  unit?: string | null;
  witnessRequired?: boolean | null;
  tpiAgencyName?: string | null;
  tpiAgency?: { contactPerson?: string | null; phone?: string | null } | null;
  remarks?: string | null;
  generatedBy?: { name?: string | null } | null;
  company?: LabLetterCompany | null;
}

const NAVY = "#1A365D";

const s = StyleSheet.create({
  header: {
    textAlign: "center",
    borderBottomWidth: 3,
    borderBottomColor: NAVY,
    borderStyle: "solid",
    paddingBottom: 10,
    marginBottom: 16,
  },
  companyName: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginBottom: 3,
  },
  sub: { fontSize: 7.5, color: "#555" },

  title: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    textDecoration: "underline",
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 14,
  },

  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    fontSize: 8.5,
  },

  labBox: {
    backgroundColor: "#F7F9FB",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "solid",
    padding: 10,
    marginBottom: 14,
  },
  boxLabel: {
    fontSize: 7,
    color: "#888",
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
  },
  labName: { fontSize: 10, fontFamily: "Helvetica-Bold", color: NAVY },
  labAddr: { fontSize: 8.5, color: "#555", marginTop: 2 },

  subject: { fontSize: 9, marginBottom: 14 },

  // react-pdf has no border-collapse: each row paints its own bottom edge and
  // the wrapper supplies the top, so internal rules stay single-width.
  tableTop: {
    borderTopWidth: 1,
    borderTopColor: "#CBD5E0",
    borderStyle: "solid",
  },
  trow: { flexDirection: "row" },
  th: {
    width: "35%",
    backgroundColor: "#EDF2F7",
    color: NAVY,
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    padding: 6,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#CBD5E0",
    borderStyle: "solid",
  },
  td: {
    width: "65%",
    fontSize: 8.5,
    padding: 6,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: "#CBD5E0",
    borderStyle: "solid",
  },
  mono: { fontFamily: "Courier-Bold" },

  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    borderStyle: "solid",
  },
  badgeRow: { flexDirection: "row", flexWrap: "wrap" },
  badge: {
    backgroundColor: "#EBF4FF",
    color: NAVY,
    borderWidth: 1,
    borderColor: "#BEE3F8",
    borderStyle: "solid",
    paddingVertical: 3,
    paddingHorizontal: 8,
    fontSize: 8.5,
    marginRight: 5,
    marginBottom: 5,
  },

  witness: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FBBF24",
    borderStyle: "solid",
    padding: 10,
    marginBottom: 14,
  },
  witnessLabel: {
    fontSize: 7,
    color: "#92400E",
    fontFamily: "Helvetica-Bold",
  },
  witnessValue: { fontSize: 9, color: "#78350F", marginTop: 2 },

  sigArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 40,
  },
  sigBlock: { width: 170, textAlign: "center" },
  sigLine: {
    borderTopWidth: 1,
    borderTopColor: "#333",
    borderStyle: "solid",
    marginTop: 44,
    paddingTop: 3,
    fontSize: 8.5,
  },
  sigName: { fontSize: 7.5, color: "#666", marginTop: 2 },

  footer: {
    marginTop: 26,
    textAlign: "center",
    fontSize: 7,
    color: "#999",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    borderStyle: "solid",
    paddingTop: 6,
  },
});

/**
 * One label/value line of the material table. Renders nothing when the value
 * is empty, so an absent optional field leaves no blank row behind — the HTML
 * version did the same with a conditional template expression.
 */
function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <View style={s.trow} wrap={false}>
      <Text style={s.th}>{label}</Text>
      <Text style={mono ? [s.td, s.mono] : s.td}>{value}</Text>
    </View>
  );
}

export function LabLetterDocument({
  data,
  testNames,
}: {
  data: LabLetterData;
  testNames: string[];
}) {
  const c = data.company;
  const address = [
    c?.regAddressLine1,
    c?.regAddressLine2,
    c?.regCity,
    c?.regState,
    c?.regPincode,
  ]
    .filter(Boolean)
    .join(", ");
  const contact = [
    c?.telephoneNo ? `Tel: ${c.telephoneNo}` : null,
    c?.email ? `Email: ${c.email}` : null,
    c?.website,
  ]
    .filter(Boolean)
    .join(" | ");
  const companyName = c?.companyName || "NPS Piping Solutions";

  const witnessLine = [
    data.tpiAgencyName
      ? `Yes — Agency: ${data.tpiAgencyName}`
      : "Yes — TPI Agency to be confirmed",
    data.tpiAgency?.contactPerson
      ? `Contact: ${data.tpiAgency.contactPerson}`
      : null,
    data.tpiAgency?.phone ? `Phone: ${data.tpiAgency.phone}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  return (
    <Document title={`Lab Letter - ${data.letterNo}`}>
      <Page size="A4" style={base.page}>
        <View style={s.header}>
          <Text style={s.companyName}>{companyName}</Text>
          {address ? <Text style={s.sub}>{address}</Text> : null}
          {contact ? <Text style={s.sub}>{contact}</Text> : null}
          {c?.gstNo ? <Text style={s.sub}>GST: {c.gstNo}</Text> : null}
        </View>

        <Text style={s.title}>LAB TESTING LETTER</Text>

        <View style={s.metaRow}>
          <View>
            <Text>
              <Text style={base.bold}>Letter No: </Text>
              {data.letterNo}
            </Text>
            {data.poNumber ? (
              <Text>
                <Text style={base.bold}>PO Ref: </Text>
                {data.poNumber}
              </Text>
            ) : null}
          </View>
          <View style={base.right}>
            <Text>
              <Text style={base.bold}>Date: </Text>
              {fmtDate(data.letterDate)}
            </Text>
            {data.clientName ? (
              <Text>
                <Text style={base.bold}>Client: </Text>
                {data.clientName}
              </Text>
            ) : null}
          </View>
        </View>

        {data.labName ? (
          <View style={s.labBox}>
            <Text style={s.boxLabel}>TO: EXTERNAL TESTING LABORATORY</Text>
            <Text style={s.labName}>{data.labName}</Text>
            {data.labAddress ? (
              <Text style={s.labAddr}>{data.labAddress}</Text>
            ) : null}
          </View>
        ) : null}

        <Text style={s.subject}>
          <Text style={base.bold}>Subject: </Text>
          Request for testing of material as per details given below.
        </Text>

        <View style={[s.tableTop, { marginBottom: 14 }]}>
          <Row label="Product Description" value={data.productDescription} />
          <Row label="Item Code" value={data.itemCode} />
          <Row label="Specification / Grade" value={data.specification} />
          <Row label="Size" value={data.sizeLabel} />
          <Row label="Heat Number" value={data.heatNo} mono />
          <Row label="Make / Manufacturer" value={data.make} />
          <Row
            label="Quantity"
            value={
              data.quantity
                ? `${data.quantity}${data.unit ? ` ${data.unit}` : ""}`
                : null
            }
          />
          <Row label="PO Number" value={data.poNumber} />
          <Row label="Client Name" value={data.clientName} />
        </View>

        <View style={{ marginBottom: 14 }}>
          <Text style={s.sectionTitle}>Tests to be Performed</Text>
          <View style={s.badgeRow}>
            {testNames.map((t, i) => (
              <Text key={i} style={s.badge}>
                {t}
              </Text>
            ))}
          </View>
        </View>

        {data.witnessRequired ? (
          <View style={s.witness}>
            <Text style={s.witnessLabel}>THIRD-PARTY WITNESS REQUIRED</Text>
            <Text style={s.witnessValue}>{witnessLine}</Text>
          </View>
        ) : null}

        {data.remarks ? (
          <View style={{ marginBottom: 16 }}>
            <Text style={[s.sectionTitle, { fontSize: 9 }]}>Remarks</Text>
            <Text style={{ fontSize: 8.5, color: "#555" }}>{data.remarks}</Text>
          </View>
        ) : null}

        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 8.5 }}>
            Kindly carry out the above tests and furnish the test
            reports/certificates at the earliest.
          </Text>
          {data.witnessRequired ? (
            <Text style={{ fontSize: 8.5, marginTop: 4 }}>
              Please coordinate with the TPI agency for witness scheduling
              before commencing tests.
            </Text>
          ) : null}
        </View>

        <View style={s.sigArea}>
          <View style={s.sigBlock}>
            <Text style={s.sigLine}>Authorized Signatory</Text>
            <Text style={s.sigName}>{data.generatedBy?.name || ""}</Text>
          </View>
          <View style={s.sigBlock}>
            <Text style={s.sigLine}>Lab Received By</Text>
            <Text style={s.sigName}>(Stamp &amp; Sign)</Text>
          </View>
        </View>

        <Text style={s.footer}>
          This is a system-generated document from {companyName} ERP.
        </Text>
      </Page>
    </Document>
  );
}
