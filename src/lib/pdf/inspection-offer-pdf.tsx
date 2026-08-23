import { Text, View } from "@react-pdf/renderer";
import { fmtDate } from "./primitives";
import {
  A4_LANDSCAPE,
  A4_PORTRAIT,
  BorderedDocument,
  Column,
  CompanyHeader,
  InfoGrid,
  InfoRow,
  ItemsTable,
  SignFor,
  SignSlot,
  TitleBar,
  YesNo,
  s,
} from "./bordered-doc";

/**
 * The four documents a quality inspection produces, all built on the shared
 * bordered-form chrome:
 *
 *  - **Inspection offer letter** — tells the customer (and their TPI agency)
 *    that material is ready and proposes a date to come and inspect it.
 *  - **Length tally list** — the sheet the inspector fills in by hand, pipe by
 *    pipe, recording individual lengths against the declared quantity. Two of
 *    its columns are deliberately blank for that.
 *  - **Colour code compliance list** — piping is colour-banded to identify its
 *    material grade on site; this records whether each line has the required
 *    band applied.
 *  - **Inspection criteria checklist** — the agreed parameters to check, and
 *    whether each needs inspection, lab testing, or colour coding.
 *
 * Domain notes: *TPI* is third-party inspection — an independent agency the
 * customer appoints, whose sign-off is a precondition of dispatch. A *heat
 * number* identifies the steel melt and is the traceability key, so it is
 * monospaced everywhere it appears.
 *
 * These replace `inspection-offer-template.ts`, which produced the same four
 * documents as HTML strings for Chromium to print.
 */

export interface InspectionCompany {
  companyName: string;
  regAddressLine1?: string | null;
  regAddressLine2?: string | null;
  regCity?: string | null;
  regPincode?: string | null;
  regState?: string | null;
  regCountry?: string | null;
  telephoneNo?: string | null;
  email?: string | null;
}

export interface InspectionItem {
  sNo: number;
  product?: string | null;
  material?: string | null;
  sizeLabel?: string | null;
  heatNo?: string | null;
  specification?: string | null;
  quantity?: string | null;
  quantityReady?: string | null;
  uom?: string | null;
  colourCodeRequired?: boolean;
  colourCode?: string | null;
  remark?: string | null;
}

export interface InspectionOfferData {
  offerNo: string;
  offerDate: string | Date;
  poNumber?: string | null;
  projectName?: string | null;
  inspectionLocation?: string | null;
  proposedInspectionDate?: string | Date | null;
  quantityReady?: string | null;
  remarks?: string | null;
  customer: {
    name: string;
    addressLine1?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
  };
  tpiAgency?: {
    name: string;
    contactPerson?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  items: InspectionItem[];
}

export interface CriteriaData {
  offerNo: string;
  offerDate: string | Date;
  poNumber?: string | null;
  customerName: string;
  inspectionLocation?: string | null;
  tpiAgencyName?: string | null;
  criteria: {
    sNo: number;
    parameter: string;
    value?: string | null;
    inspectionRequired: boolean;
    testingRequired: boolean;
    testType?: string | null;
    colourCodingRequired: boolean;
    inspectionLocation?: string | null;
    remarks?: string | null;
  }[];
}

const t = (v: unknown): string => (v == null ? "" : String(v));

function companyLines(company: InspectionCompany) {
  const address = [
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
  const contact = company.telephoneNo
    ? `Tel: ${company.telephoneNo}${company.email ? ` | Email: ${company.email}` : ""}`
    : "";
  return { address, contact };
}

/** The reference block every one of these four sheets carries, top-left. */
function RefColumn({
  refLabel,
  data,
  labelWidth,
}: {
  refLabel: string;
  data: { offerNo: string; offerDate: string | Date; poNumber?: string | null };
  labelWidth: number;
}) {
  return (
    <>
      <InfoRow label={refLabel} value={data.offerNo} labelWidth={labelWidth} bold />
      <InfoRow label="Date" value={fmtDate(data.offerDate)} labelWidth={labelWidth} />
      <InfoRow label="PO Number" value={data.poNumber} labelWidth={labelWidth} />
    </>
  );
}

// ─── 1. Inspection offer letter ───────────────────────────────────────────────

const OFFER_COLUMNS: Column<InspectionItem>[] = [
  { header: "S/N", width: "4%", align: "center", render: (i) => t(i.sNo) },
  { header: "Product", width: "15%", render: (i) => t(i.product) },
  { header: "Material", width: "14%", render: (i) => t(i.material) },
  { header: "Size", width: "10%", align: "center", render: (i) => t(i.sizeLabel) },
  { header: "Heat No.", width: "12%", align: "center", mono: true, render: (i) => t(i.heatNo) },
  { header: "Specification", width: "15%", render: (i) => t(i.specification) },
  { header: "Qty Ordered", width: "10%", align: "right", render: (i) => t(i.quantity) },
  { header: "Qty Ready", width: "10%", align: "right", bold: true, render: (i) => t(i.quantityReady) },
  { header: "UOM", width: "6%", align: "center", render: (i) => t(i.uom) || "Mtr" },
];

export function InspectionOfferDocument({
  data,
  company,
}: {
  data: InspectionOfferData;
  company: InspectionCompany;
}) {
  const { address, contact } = companyLines(company);
  const customerAddress = [
    data.customer.addressLine1,
    data.customer.city,
    data.customer.state
      ? `${data.customer.state} - ${data.customer.pincode || ""}`
      : data.customer.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <BorderedDocument
      title={`Inspection Offer - ${data.offerNo}`}
      size={A4_PORTRAIT}
    >
      <CompanyHeader name={company.companyName} address={address} contact={contact} />
      <TitleBar title="INSPECTION OFFER LETTER" bg="#E8F0FE" />

      <InfoGrid
        left={
          <>
            <RefColumn refLabel="Offer No." data={data} labelWidth={120} />
            <InfoRow label="Project" value={data.projectName} labelWidth={120} />
          </>
        }
        right={
          <>
            <InfoRow label="Client" value={data.customer.name} labelWidth={120} bold />
            <InfoRow label="Address" value={customerAddress} labelWidth={120} />
            <InfoRow
              label="Inspection Location"
              value={data.inspectionLocation}
              labelWidth={120}
            />
            <InfoRow
              label="Proposed Date"
              value={
                data.proposedInspectionDate
                  ? fmtDate(data.proposedInspectionDate)
                  : null
              }
              labelWidth={120}
              bold
              color="#0066CC"
            />
          </>
        }
      />

      {data.quantityReady ? (
        <Text style={s.band}>
          <Text style={s.bold}>Quantity Ready for Inspection: </Text>
          {data.quantityReady}
        </Text>
      ) : null}

      <ItemsTable columns={OFFER_COLUMNS} rows={data.items} />

      {data.tpiAgency ? (
        <View style={s.section}>
          <Text style={[s.bold, { fontSize: 8.5, marginBottom: 3 }]}>
            Third Party Inspection (TPI) Agency
          </Text>
          <InfoRow label="Agency Name" value={data.tpiAgency.name} labelWidth={120} bold />
          <InfoRow
            label="Contact Person"
            value={data.tpiAgency.contactPerson}
            labelWidth={120}
          />
          <InfoRow label="Phone" value={data.tpiAgency.phone} labelWidth={120} />
          <InfoRow label="Email" value={data.tpiAgency.email} labelWidth={120} />
        </View>
      ) : null}

      {data.remarks ? (
        <Text style={[s.band, { borderBottomWidth: 0, borderTopWidth: 1, borderTopColor: "#000" }]}>
          <Text style={s.bold}>Remarks: </Text>
          {data.remarks}
        </Text>
      ) : null}

      <View style={s.footer}>
        <SignSlot label="Prepared By:" />
        <SignFor company={company.companyName} role="Authorised Signatory" gap={35} />
      </View>

      <Text style={s.disclaimer}>
        This is a computer generated document. | Offer No: {data.offerNo} | Items:{" "}
        {data.items.length}
      </Text>
    </BorderedDocument>
  );
}

// ─── 2. Length tally list ─────────────────────────────────────────────────────

const TALLY_COLUMNS: Column<InspectionItem>[] = [
  { header: "S/N", width: "4%", align: "center", render: (i) => t(i.sNo) },
  { header: "Product", width: "14%", render: (i) => t(i.product) },
  { header: "Material", width: "14%", render: (i) => t(i.material) },
  { header: "Size", width: "9%", align: "center", render: (i) => t(i.sizeLabel) },
  { header: "Heat No.", width: "11%", align: "center", mono: true, render: (i) => t(i.heatNo) },
  { header: "Qty", width: "9%", align: "right", render: (i) => t(i.quantity) },
  { header: "Qty Ready", width: "9%", align: "right", render: (i) => t(i.quantityReady) },
  { header: "UOM", width: "6%", align: "center", render: (i) => t(i.uom) || "Mtr" },
  // Intentionally blank: the inspector writes each pipe's measured length and
  // ticks the tally by hand on the printed sheet.
  { header: "Length (Individual)", width: "12%", render: () => " " },
  { header: "Tally Verified", width: "12%", render: () => " " },
];

export function LengthTallyDocument({
  data,
  company,
}: {
  data: InspectionOfferData;
  company: InspectionCompany;
}) {
  return (
    <BorderedDocument title={`Length Tally - ${data.offerNo}`} size={A4_LANDSCAPE}>
      <CompanyHeader name={company.companyName} />
      <TitleBar title="LENGTH TALLY LIST" bg="#E8F0FE" />

      <InfoGrid
        left={<RefColumn refLabel="Ref. No." data={data} labelWidth={85} />}
        right={
          <>
            <InfoRow label="Client" value={data.customer.name} labelWidth={85} bold />
            <InfoRow label="Location" value={data.inspectionLocation} labelWidth={85} />
          </>
        }
      />

      <ItemsTable columns={TALLY_COLUMNS} rows={data.items} />

      <View style={s.footer}>
        <SignSlot label="Tallied By:" />
        <SignSlot label="Verified By:" />
        <SignFor company={company.companyName} role="Authorised Signatory" />
      </View>

      <Text style={s.disclaimer}>
        Length Tally List | Ref: {data.offerNo} | Items: {data.items.length}
      </Text>
    </BorderedDocument>
  );
}

// ─── 3. Colour code compliance list ───────────────────────────────────────────

const COLOUR_COLUMNS: Column<InspectionItem>[] = [
  { header: "S/N", width: "4%", align: "center", render: (i) => t(i.sNo) },
  { header: "Product", width: "14%", render: (i) => t(i.product) },
  { header: "Material", width: "14%", render: (i) => t(i.material) },
  { header: "Size", width: "9%", align: "center", render: (i) => t(i.sizeLabel) },
  { header: "Heat No.", width: "11%", align: "center", mono: true, render: (i) => t(i.heatNo) },
  {
    header: "Colour Code Req.",
    width: "10%",
    align: "center",
    render: (i) => <YesNo value={!!i.colourCodeRequired} />,
  },
  {
    header: "Colour Code",
    width: "12%",
    align: "center",
    bold: true,
    // A line that needs a band but has not been given one is the whole point of
    // this sheet, so it reads PENDING in red rather than showing blank.
    render: (i) =>
      i.colourCode ? (
        t(i.colourCode)
      ) : i.colourCodeRequired ? (
        <Text style={{ color: "red" }}>PENDING</Text>
      ) : (
        "-"
      ),
  },
  {
    header: "Compliance",
    width: "10%",
    align: "center",
    render: (i) => (i.colourCodeRequired ? " " : "-"),
  },
  { header: "Remarks", width: "16%", render: (i) => t(i.remark) },
];

export function ColourCodeDocument({
  data,
  company,
}: {
  data: InspectionOfferData;
  company: InspectionCompany;
}) {
  return (
    <BorderedDocument title={`Colour Code - ${data.offerNo}`} size={A4_PORTRAIT}>
      <CompanyHeader name={company.companyName} />
      <TitleBar title="COLOUR CODE COMPLIANCE LIST" bg="#FFF3E0" />

      <InfoGrid
        left={<RefColumn refLabel="Ref. No." data={data} labelWidth={85} />}
        right={
          <>
            <InfoRow label="Client" value={data.customer.name} labelWidth={85} bold />
            <InfoRow label="Location" value={data.inspectionLocation} labelWidth={85} />
          </>
        }
      />

      <ItemsTable columns={COLOUR_COLUMNS} rows={data.items} />

      <View style={s.footer}>
        <SignSlot label="Checked By:" />
        <SignFor company={company.companyName} role="QC In-Charge" />
      </View>

      <Text style={s.disclaimer}>
        Colour Code Compliance List | Ref: {data.offerNo} | Items: {data.items.length}
      </Text>
    </BorderedDocument>
  );
}

// ─── 4. Inspection criteria checklist ─────────────────────────────────────────

type Criterion = CriteriaData["criteria"][number];

const CRITERIA_COLUMNS: Column<Criterion>[] = [
  { header: "S/N", width: "4%", align: "center", render: (c) => t(c.sNo) },
  { header: "Parameter", width: "14%", bold: true, render: (c) => t(c.parameter) },
  { header: "Required Value / Spec", width: "16%", render: (c) => t(c.value) },
  {
    header: "Inspection Req.",
    width: "8%",
    align: "center",
    render: (c) => <YesNo value={c.inspectionRequired} />,
  },
  {
    header: "Testing Req.",
    width: "8%",
    align: "center",
    render: (c) => <YesNo value={c.testingRequired} />,
  },
  { header: "Test Type", width: "8%", align: "center", render: (c) => t(c.testType) || "-" },
  {
    header: "Colour Code",
    width: "8%",
    align: "center",
    render: (c) => <YesNo value={c.colourCodingRequired} />,
  },
  {
    header: "Location",
    width: "8%",
    align: "center",
    render: (c) => t(c.inspectionLocation) || "-",
  },
  // Filled in by hand during the inspection.
  { header: "Result", width: "10%", render: () => " " },
  { header: "Remarks", width: "16%", render: (c) => t(c.remarks) },
];

export function CriteriaChecklistDocument({
  data,
  company,
}: {
  data: CriteriaData;
  company: InspectionCompany;
}) {
  return (
    <BorderedDocument
      title={`Inspection Criteria - ${data.offerNo}`}
      size={A4_LANDSCAPE}
    >
      <CompanyHeader name={company.companyName} />
      <TitleBar title="INSPECTION CRITERIA CHECKLIST" bg="#E8F5E9" />

      <InfoGrid
        left={<RefColumn refLabel="Ref. No." data={data} labelWidth={95} />}
        right={
          <>
            <InfoRow label="Client" value={data.customerName} labelWidth={95} bold />
            <InfoRow label="Location" value={data.inspectionLocation} labelWidth={95} />
            <InfoRow label="TPI Agency" value={data.tpiAgencyName} labelWidth={95} bold />
          </>
        }
      />

      <ItemsTable columns={CRITERIA_COLUMNS} rows={data.criteria} />

      <View style={s.footer}>
        <SignSlot label="Inspector:" />
        <SignSlot label="TPI Representative:" />
        <SignFor company={company.companyName} role="QC Manager" />
      </View>

      <Text style={s.disclaimer}>
        Inspection Criteria Checklist | Ref: {data.offerNo} | Parameters:{" "}
        {data.criteria.length}
      </Text>
    </BorderedDocument>
  );
}
