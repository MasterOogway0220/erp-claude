import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { fmtDate, fmtIN } from "./primitives";

/**
 * Dispatch dossier — the bound pack of evidence that travels with (or follows)
 * a consignment. It is the document the customer's QA opens to satisfy
 * themselves that what arrived is what was ordered and that it was tested,
 * inspected and released properly.
 *
 * It is a compilation, not a single form: each requested section becomes its
 * own page, drawn from a different part of the order chain.
 *
 * Domain notes for anyone new to this:
 *  - **MTC** — mill test certificate. The steel mill's own record of a heat's
 *    chemistry and mechanical properties. Traceability runs MTC → heat number
 *    → individual pipe.
 *  - **TPI** — third-party inspection. An independent agency the customer
 *    appoints; their sign-off is usually a precondition of payment, which is
 *    why "signed vs pending" is called out per certificate.
 *  - **Length tally** — pipe-by-pipe measured lengths, grouped by heat,
 *    because pipe is sold by the metre and delivered in random lengths.
 *  - **Colour coding** — painted bands identifying material grade on site.
 *  - **QC release** — internal sign-off that a stock item may be dispatched.
 *
 * Replaces the ~700 lines of inline HTML the route used to hand to Chromium.
 * The section list and the "no data" placeholders are preserved exactly: a
 * dossier that silently omits a section reads as though the section was not
 * required, which is the opposite of what an auditor needs to see.
 */

/** Every page this document knows how to draw. */
export const ALL_SECTIONS = [
  "cover",
  "dispatchNote",
  "clientPO",
  "poAcceptance",
  "mtc",
  "inspection",
  "tpi",
  "labReports",
  "lengthTally",
  "colourCoding",
  "packingList",
  "invoice",
] as const;

export type DossierSection = (typeof ALL_SECTIONS)[number];

/**
 * What a full dossier contains by default. `dispatchNote` is deliberately not
 * in this list — the dossier is the evidence pack that accompanies a dispatch
 * note rather than reproducing it, and adding a page here would silently
 * change every dossier already being sent to customers. The dispatch-note
 * bundle asks for that page explicitly instead.
 */
export const DOSSIER_SECTIONS = ALL_SECTIONS.filter(
  (s) => s !== "dispatchNote"
) as readonly DossierSection[];

/**
 * The dispatch-note bundle: the note itself plus the three summaries a driver
 * or a receiving store needs, without the full evidence pack.
 */
export const BUNDLE_SECTIONS: readonly DossierSection[] = [
  "dispatchNote",
  "packingList",
  "mtc",
  "inspection",
];

const NAVY = "#1A365D";

const s = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 44,
    paddingHorizontal: 34,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#333",
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: NAVY,
    borderStyle: "solid",
    paddingBottom: 6,
    marginBottom: 12,
  },
  companyName: { fontSize: 12, fontFamily: "Helvetica-Bold", color: NAVY },
  companySub: { fontSize: 6.5, color: "#666", marginTop: 1 },

  h2: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    borderStyle: "solid",
    paddingBottom: 3,
    marginBottom: 8,
  },
  h3: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginTop: 10,
    marginBottom: 4,
  },
  caption: { fontSize: 7.5, color: "#666", marginBottom: 8 },

  infoGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  infoItem: {
    width: "50%",
    paddingVertical: 3,
    paddingRight: 8,
  },
  infoLabel: { fontSize: 6.5, color: "#888", fontFamily: "Helvetica-Bold" },
  infoValue: { fontSize: 8.5, marginTop: 1 },

  thead: { flexDirection: "row", backgroundColor: NAVY },
  th: {
    color: "#FFFFFF",
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 4,
    paddingHorizontal: 3,
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    borderStyle: "solid",
  },
  td: { fontSize: 7, paddingVertical: 3.5, paddingHorizontal: 3 },
  totalsRow: {
    flexDirection: "row",
    backgroundColor: "#E8EDF2",
  },
  totalsCell: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 4,
    paddingHorizontal: 3,
  },

  empty: {
    fontSize: 9,
    color: "#999",
    textAlign: "center",
    paddingVertical: 30,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    marginTop: 10,
  },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 34,
    right: 34,
    fontSize: 6.5,
    color: "#999",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    borderStyle: "solid",
    paddingTop: 4,
  },

  badge: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 1.5,
    paddingHorizontal: 4,
    textAlign: "center",
  },

  mono: { fontFamily: "Courier" },
  bold: { fontFamily: "Helvetica-Bold" },
  center: { textAlign: "center" },
  right: { textAlign: "right" },
});

const DASH = "---";
const t = (v: unknown): string =>
  v === null || v === undefined || v === "" ? DASH : String(v);

/** Three decimals, Indian grouping — quantities are metres, weights kilos. */
const num = (v: unknown, dec = 3): string => {
  const n = parseFloat(String(v));
  return isNaN(n) ? DASH : fmtIN(n, dec);
};
const money = (v: unknown): string => {
  const n = parseFloat(String(v));
  return isNaN(n) ? DASH : fmtIN(n, 2);
};

type BadgeTone = "pass" | "fail" | "hold" | "info";

const TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  pass: { bg: "#D1FAE5", fg: "#065F46" },
  fail: { bg: "#FEE2E2", fg: "#991B1B" },
  hold: { bg: "#FEF3C7", fg: "#92400E" },
  info: { bg: "#DBEAFE", fg: "#1E40AF" },
};

function Badge({ label, tone }: { label: string; tone: BadgeTone }) {
  const c = TONES[tone];
  return (
    <Text style={[s.badge, { backgroundColor: c.bg, color: c.fg }]}>
      {label}
    </Text>
  );
}

/**
 * PASS / FAIL / HOLD is the inspection vocabulary; anything else (including a
 * missing result) shows neutral rather than implying an outcome.
 */
function ResultBadge({ result }: { result?: string | null }) {
  const r = (result || "").toUpperCase();
  if (r === "PASS") return <Badge label="PASS" tone="pass" />;
  if (r === "FAIL") return <Badge label="FAIL" tone="fail" />;
  if (r === "HOLD") return <Badge label="HOLD" tone="hold" />;
  return <Text style={{ fontSize: 7 }}>{r || DASH}</Text>;
}

// ─── Layout primitives ────────────────────────────────────────────────────────

export interface DossierCompany {
  companyName: string;
  address?: string;
  contact?: string;
}

function DossierPage({
  company,
  title,
  children,
}: {
  company: DossierCompany;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Page size="A4" style={s.page}>
      <View style={s.header} fixed>
        <Text style={s.companyName}>{company.companyName}</Text>
        {company.address ? (
          <Text style={s.companySub}>{company.address}</Text>
        ) : null}
        {company.contact ? (
          <Text style={s.companySub}>{company.contact}</Text>
        ) : null}
      </View>

      {title ? <Text style={s.h2}>{title}</Text> : null}
      {children}

      <Text
        style={s.footer}
        fixed
        render={({ pageNumber, totalPages }) =>
          `${company.companyName} — Dispatch Dossier | Page ${pageNumber} of ${totalPages}`
        }
      />
    </Page>
  );
}

function InfoItem({
  label,
  value,
  mono,
  width = "50%",
}: {
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
  width?: string;
}) {
  return (
    <View style={[s.infoItem, { width }]}>
      <Text style={s.infoLabel}>{label.toUpperCase()}</Text>
      {typeof value === "string" || typeof value === "number" || value == null ? (
        <Text style={[s.infoValue, mono ? s.mono : {}]}>{t(value)}</Text>
      ) : (
        <View style={{ marginTop: 1 }}>{value}</View>
      )}
    </View>
  );
}

function Empty({ message }: { message: string }) {
  return <Text style={s.empty}>{message}</Text>;
}

/** A table column. Widths are percentages and must total 100%. */
interface Col<T> {
  header: string;
  width: string;
  align?: "center" | "right";
  mono?: boolean;
  render: (row: T, index: number) => React.ReactNode;
}

function DTable<T>({
  columns,
  rows,
  totals,
}: {
  columns: Col<T>[];
  rows: T[];
  /** Bold summary row; widths must line up with the columns above. */
  totals?: { width: string; content?: string; align?: "center" | "right" }[];
}) {
  return (
    <View>
      <View style={s.thead} fixed>
        {columns.map((c, i) => (
          <Text
            key={i}
            style={[
              s.th,
              { width: c.width },
              c.align === "center" ? s.center : {},
              c.align === "right" ? s.right : {},
            ]}
          >
            {c.header.toUpperCase()}
          </Text>
        ))}
      </View>

      {rows.map((row, r) => (
        <View key={r} style={s.tr} wrap={false}>
          {columns.map((c, i) => {
            const body = c.render(row, r);
            const style = [
              s.td,
              { width: c.width },
              c.align === "center" ? s.center : {},
              c.align === "right" ? s.right : {},
              c.mono ? s.mono : {},
            ];
            // A node (a Badge) must sit in a View, not inside a width-bearing
            // Text, or react-pdf lays it out inline and ignores the width.
            return typeof body === "string" || typeof body === "number" ? (
              <Text key={i} style={style}>
                {body}
              </Text>
            ) : (
              <View key={i} style={style}>
                {body}
              </View>
            );
          })}
        </View>
      ))}

      {totals ? (
        <View style={s.totalsRow} wrap={false}>
          {totals.map((c, i) => (
            <Text
              key={i}
              style={[
                s.totalsCell,
                { width: c.width },
                c.align === "center" ? s.center : {},
                c.align === "right" ? s.right : {},
              ]}
            >
              {c.content ?? " "}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ─── Data shape ───────────────────────────────────────────────────────────────

/**
 * Rows come straight from Prisma with joined relations, and the joins differ
 * per section, so these are deliberately loose. The route owns the queries;
 * this file only decides how a row is drawn, and every field access goes
 * through `t()` so a missing column renders as "---" rather than "undefined".
 */
type Row = Record<string, unknown>;

export interface DossierData {
  dispatchNote: {
    dnNo: string;
    dispatchDate?: string | Date | null;
    vehicleNo?: string | null;
    lrNo?: string | null;
    ewayBillNo?: string | null;
    destination?: string | null;
    remarks?: string | null;
    transporter?: { name?: string | null } | null;
    dispatchAddress?: Row | null;
    packingList?: { plNo?: string | null } | null;
  };
  customer?: {
    name?: string | null;
    gstNo?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    contactPerson?: string | null;
    phone?: string | null;
  } | null;
  salesOrder?: { soNo?: string | null } | null;
  clientPO?: Row | null;
  poAcceptance?: Row | null;
  mtcs: Row[];
  inspections: Row[];
  tpiInspections: Row[];
  labReports: Row[];
  pipeDetails: Row[];
  packingListItems: Row[];
  qcReleases: Row[];
  invoice?: Row | null;
}

const g = (row: Row | null | undefined, key: string): unknown =>
  row ? row[key] : undefined;

/** Reads `a.b` style paths off the loose Prisma rows. */
const gp = (row: Row | null | undefined, path: string): unknown => {
  let cur: unknown = row;
  for (const part of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
};

// ─── Sections ─────────────────────────────────────────────────────────────────

function CoverPage({
  company,
  data,
}: {
  company: DossierCompany;
  data: DossierData;
}) {
  const { dispatchNote, clientPO, poAcceptance } = data;

  // The contents list names what is actually in this pack, so the recipient
  // can tell a missing document from an omitted section.
  const contents = [
    clientPO && "Client PO",
    poAcceptance && "PO Acceptance",
    data.mtcs.length > 0 && `${data.mtcs.length} MTC(s)`,
    data.inspections.length > 0 && `${data.inspections.length} Inspection(s)`,
    data.tpiInspections.length > 0 &&
      `${data.tpiInspections.length} TPI Certificate(s)`,
    data.labReports.length > 0 && `${data.labReports.length} Lab Report(s)`,
    data.pipeDetails.length > 0 && "Length Tally",
    "Packing List",
    data.invoice && "Invoice",
  ].filter(Boolean) as string[];

  return (
    <DossierPage company={company}>
      <View style={{ textAlign: "center", marginTop: 40, marginBottom: 26 }}>
        <Text style={{ fontSize: 20, fontFamily: "Helvetica-Bold", color: NAVY }}>
          DISPATCH DOSSIER
        </Text>
        <Text style={{ fontSize: 10, color: "#555", marginTop: 4 }}>
          Final Document Compilation for Client
        </Text>
      </View>

      <View style={[s.infoGrid, { marginTop: 24, marginBottom: 24 }]}>
        <InfoItem label="Dispatch Note" value={dispatchNote.dnNo} mono />
        <InfoItem
          label="Dispatch Date"
          value={fmtDate(dispatchNote.dispatchDate)}
        />
        <InfoItem label="Customer" value={data.customer?.name} />
        <InfoItem label="Order" value={data.salesOrder?.soNo} mono />
        {clientPO ? (
          <InfoItem
            label="Client PO"
            value={t(g(clientPO, "clientPoNumber"))}
            mono
          />
        ) : null}
        {poAcceptance ? (
          <InfoItem
            label="PO Acceptance"
            value={t(g(poAcceptance, "acceptanceNo"))}
            mono
          />
        ) : null}
      </View>

      <Text style={s.h3}>Table of Contents</Text>
      {contents.map((doc, i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingVertical: 3,
            borderBottomWidth: 0.5,
            borderBottomColor: "#EEE",
            borderStyle: "solid",
          }}
        >
          <Text style={{ fontSize: 8.5 }}>
            {i + 1}. {doc}
          </Text>
          <Text style={{ fontSize: 7.5, color: "#16A34A" }}>Included</Text>
        </View>
      ))}
    </DossierPage>
  );
}

/**
 * The dispatch note itself — who it goes to, on what vehicle, under which
 * transport documents. A *LR number* is the transporter's consignment note;
 * an *E-way bill* is the tax document that must accompany goods in transit in
 * India, so both are shown even when absent, as "---" rather than omitted.
 *
 * A consignment may ship to a site address that differs from the customer's
 * registered address, in which case that address (and its own GST number)
 * governs — hence the label switches rather than showing both.
 */
function DispatchNotePage({
  company,
  data,
}: {
  company: DossierCompany;
  data: DossierData;
}) {
  const dn = data.dispatchNote;
  const c = data.customer;
  const addr = dn.dispatchAddress;

  const shipTo = addr
    ? [
        g(addr, "companyName"),
        g(addr, "addressLine1"),
        g(addr, "addressLine2"),
        g(addr, "city"),
        g(addr, "state"),
        g(addr, "pincode") ? `PIN: ${String(g(addr, "pincode"))}` : null,
      ]
        .filter(Boolean)
        .join(", ")
    : [c?.addressLine1, c?.addressLine2, c?.city, c?.state, c?.pincode]
        .filter(Boolean)
        .join(", ");

  const siteContact = addr?.["contactPerson"]
    ? `${String(g(addr, "contactPerson"))}${
        g(addr, "contactNumber") ? ` (${String(g(addr, "contactNumber"))})` : ""
      }`
    : null;

  return (
    <DossierPage company={company} title="Dispatch Note">
      <View style={s.infoGrid}>
        <InfoItem label="DN Number" value={dn.dnNo} mono />
        <InfoItem label="Dispatch Date" value={fmtDate(dn.dispatchDate)} />
        <InfoItem label="Order" value={t(data.salesOrder?.soNo)} mono />
        <InfoItem label="Packing List" value={t(dn.packingList?.plNo)} mono />
      </View>

      <Text style={s.h3}>Customer Information</Text>
      <View style={s.infoGrid}>
        <InfoItem label="Customer Name" value={t(c?.name)} />
        <InfoItem label="GST No." value={t(c?.gstNo)} mono />
        <InfoItem
          label={addr ? "Dispatch Address" : "Address"}
          value={shipTo || DASH}
        />
        {siteContact ? (
          <InfoItem label="Site Contact" value={siteContact} />
        ) : null}
        {addr && g(addr, "gstNo") ? (
          <InfoItem label="Dispatch GST" value={t(g(addr, "gstNo"))} mono />
        ) : null}
        <InfoItem
          label="Contact"
          value={`${t(c?.contactPerson)}${c?.phone ? ` | ${c.phone}` : ""}`}
        />
      </View>

      <Text style={s.h3}>Transport Details</Text>
      <View style={s.infoGrid}>
        <InfoItem label="Vehicle Number" value={t(dn.vehicleNo)} mono />
        <InfoItem label="LR Number" value={t(dn.lrNo)} mono />
        <InfoItem label="Transporter" value={t(dn.transporter?.name)} />
        <InfoItem label="E-Way Bill No." value={t(dn.ewayBillNo)} mono />
        <InfoItem label="Destination" value={t(dn.destination)} />
      </View>

      {dn.remarks ? (
        <>
          <Text style={s.h3}>Remarks</Text>
          <Text style={{ fontSize: 8, color: "#555" }}>{dn.remarks}</Text>
        </>
      ) : null}
    </DossierPage>
  );
}

function ClientPOPage({
  company,
  data,
}: {
  company: DossierCompany;
  data: DossierData;
}) {
  const po = data.clientPO!;
  const items = (g(po, "items") as Row[]) || [];

  const columns: Col<Row>[] = [
    { header: "#", width: "5%", align: "center", render: (r, i) => t(g(r, "sNo") ?? i + 1) },
    { header: "Product", width: "16%", render: (r) => t(g(r, "product")) },
    {
      header: "Material",
      width: "18%",
      render: (r) => {
        const mat = t(g(r, "material"));
        const spec = g(r, "additionalSpec");
        return spec ? `${mat} / ${String(spec)}` : mat;
      },
    },
    { header: "Size", width: "11%", mono: true, render: (r) => t(g(r, "sizeLabel")) },
    { header: "Ends", width: "9%", render: (r) => t(g(r, "ends")) },
    { header: "Qty", width: "10%", align: "right", render: (r) => num(g(r, "qtyOrdered")) },
    { header: "UOM", width: "7%", render: (r) => t(g(r, "uom") ?? "Mtr") },
    { header: "Rate", width: "11%", align: "right", render: (r) => money(g(r, "unitRate")) },
    { header: "Amount", width: "13%", align: "right", render: (r) => money(g(r, "amount")) },
  ];

  return (
    <DossierPage company={company} title="Client Purchase Order">
      <View style={s.infoGrid}>
        <InfoItem label="CPO Number" value={t(g(po, "cpoNo"))} mono />
        <InfoItem label="Client PO Number" value={t(g(po, "clientPoNumber"))} mono />
        <InfoItem label="CPO Date" value={fmtDate(g(po, "cpoDate") as string)} />
        <InfoItem
          label="Client PO Date"
          value={fmtDate(g(po, "clientPoDate") as string)}
        />
        <InfoItem
          label="Customer"
          value={t(gp(po, "customer.name") ?? data.customer?.name)}
        />
        <InfoItem label="Project" value={t(g(po, "projectName"))} />
        <InfoItem label="Payment Terms" value={t(g(po, "paymentTerms"))} />
        <InfoItem label="Delivery Terms" value={t(g(po, "deliveryTerms"))} />
      </View>

      <DTable
        columns={columns}
        rows={items}
        totals={[
          { width: "87%", content: "Grand Total", align: "right" },
          { width: "13%", content: money(g(po, "grandTotal")), align: "right" },
        ]}
      />

      {g(po, "remarks") ? (
        <Text style={{ fontSize: 7.5, color: "#555", marginTop: 8 }}>
          <Text style={s.bold}>Remarks: </Text>
          {String(g(po, "remarks"))}
        </Text>
      ) : null}
    </DossierPage>
  );
}

function ContactCard({
  dept,
  bg,
  name,
  email,
  phone,
}: {
  dept: string;
  bg: string;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
}) {
  return (
    <View
      style={{
        width: "32%",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderStyle: "solid",
        marginRight: "2%",
      }}
    >
      <Text
        style={{
          backgroundColor: bg,
          color: "#FFF",
          fontSize: 7,
          fontFamily: "Helvetica-Bold",
          padding: 3,
          textAlign: "center",
        }}
      >
        {dept}
      </Text>
      <View style={{ padding: 5 }}>
        <Text style={s.infoLabel}>NAME</Text>
        <Text style={{ fontSize: 8, marginBottom: 3 }}>{t(name)}</Text>
        <Text style={s.infoLabel}>EMAIL</Text>
        <Text style={{ fontSize: 7, marginBottom: 3 }}>{t(email)}</Text>
        <Text style={s.infoLabel}>CONTACT</Text>
        <Text style={{ fontSize: 7 }}>{t(phone)}</Text>
      </View>
    </View>
  );
}

function POAcceptancePage({
  company,
  data,
}: {
  company: DossierCompany;
  data: DossierData;
}) {
  const pa = data.poAcceptance!;
  return (
    <DossierPage company={company} title="P.O. Acceptance">
      <View style={s.infoGrid}>
        <InfoItem label="Acceptance No" value={t(g(pa, "acceptanceNo"))} mono />
        <InfoItem
          label="Status"
          value={<Badge label={t(g(pa, "status"))} tone="info" />}
        />
        <InfoItem
          label="Acceptance Date"
          value={fmtDate(g(pa, "acceptanceDate") as string)}
        />
        <InfoItem
          label="Committed Delivery Date"
          value={fmtDate(g(pa, "committedDeliveryDate") as string)}
        />
        <InfoItem
          label="Client PO"
          value={t(g(data.clientPO, "clientPoNumber"))}
          mono
        />
        <InfoItem label="Created By" value={t(gp(pa, "createdBy.name"))} />
      </View>

      <Text style={s.h3}>Client Contact / Department Contact Details</Text>
      <View style={{ flexDirection: "row" }}>
        <ContactCard
          dept="Follow-up"
          bg={NAVY}
          name={g(pa, "followUpName")}
          email={g(pa, "followUpEmail")}
          phone={g(pa, "followUpPhone")}
        />
        <ContactCard
          dept="Quality / Inspection"
          bg="#4A5568"
          name={g(pa, "qualityName")}
          email={g(pa, "qualityEmail")}
          phone={g(pa, "qualityPhone")}
        />
        <ContactCard
          dept="Accounts"
          bg="#2D3748"
          name={g(pa, "accountsName")}
          email={g(pa, "accountsEmail")}
          phone={g(pa, "accountsPhone")}
        />
      </View>

      {g(pa, "remarks") ? (
        <Text style={{ fontSize: 7.5, color: "#555", marginTop: 10 }}>
          <Text style={s.bold}>Remarks: </Text>
          {String(g(pa, "remarks"))}
        </Text>
      ) : null}
    </DossierPage>
  );
}

function MtcPage({
  company,
  data,
}: {
  company: DossierCompany;
  data: DossierData;
}) {
  if (data.mtcs.length === 0) {
    return (
      <DossierPage company={company} title="MTC Certificates">
        <Empty message="No MTC certificates available for dispatched items" />
      </DossierPage>
    );
  }

  const columns: Col<Row>[] = [
    { header: "#", width: "5%", align: "center", render: (_r, i) => String(i + 1) },
    { header: "MTC No.", width: "15%", mono: true, render: (r) => t(g(r, "mtcNo")) },
    {
      header: "Heat No.",
      width: "14%",
      mono: true,
      render: (r) => t(g(r, "heatNo") ?? g(r, "stockHeatNo")),
    },
    { header: "Product", width: "16%", render: (r) => t(g(r, "stockProduct")) },
    { header: "Size", width: "12%", mono: true, render: (r) => t(g(r, "stockSize")) },
    { header: "Date", width: "11%", render: (r) => fmtDate(g(r, "uploadDate") as string) },
    {
      header: "Verification",
      width: "13%",
      align: "center",
      render: (r) => {
        const v = String(g(r, "verificationStatus") || "");
        if (v === "VERIFIED") return <Badge label="VERIFIED" tone="pass" />;
        if (v === "DISCREPANT") return <Badge label="DISCREPANT" tone="fail" />;
        return <Badge label="PENDING" tone="hold" />;
      },
    },
    { header: "Remarks", width: "14%", render: (r) => t(g(r, "remarks")) },
  ];

  return (
    <DossierPage company={company} title="MTC Certificates">
      <Text style={s.caption}>
        DN: {data.dispatchNote.dnNo} | Total MTCs: {data.mtcs.length}
      </Text>
      <DTable columns={columns} rows={data.mtcs} />
    </DossierPage>
  );
}

function InspectionPage({
  company,
  data,
}: {
  company: DossierCompany;
  data: DossierData;
}) {
  // Internal inspections only — anything with a TPI agency belongs on the TPI
  // page instead, so a certificate is never counted twice.
  const internal = data.inspections.filter((i) => !g(i, "tpiAgencyId"));

  if (internal.length === 0) {
    return (
      <DossierPage company={company} title="Inspection Reports">
        <Empty message="No internal inspection reports for dispatched items" />
      </DossierPage>
    );
  }

  const overview: Col<Row>[] = [
    { header: "#", width: "5%", align: "center", render: (_r, i) => String(i + 1) },
    { header: "Inspection No.", width: "20%", mono: true, render: (r) => t(g(r, "inspectionNo")) },
    { header: "Heat No.", width: "15%", mono: true, render: (r) => t(g(r, "stockHeatNo")) },
    { header: "Product", width: "20%", render: (r) => t(g(r, "stockProduct")) },
    { header: "Size", width: "14%", mono: true, render: (r) => t(g(r, "stockSize")) },
    { header: "Date", width: "14%", render: (r) => fmtDate(g(r, "inspectionDate") as string) },
    {
      header: "Result",
      width: "12%",
      align: "center",
      render: (r) => <ResultBadge result={g(r, "overallResult") as string} />,
    },
  ];

  const params: Col<Row>[] = [
    { header: "Parameter", width: "26%", render: (r) => t(g(r, "parameterName")) },
    { header: "Type", width: "14%", render: (r) => t(g(r, "parameterType")) },
    { header: "Standard", width: "17%", mono: true, render: (r) => t(g(r, "standardValue")) },
    { header: "Tolerance", width: "14%", mono: true, render: (r) => t(g(r, "tolerance")) },
    { header: "Result", width: "17%", mono: true, render: (r) => t(g(r, "resultValue")) },
    {
      header: "Status",
      width: "12%",
      align: "center",
      render: (r) => <ResultBadge result={g(r, "result") as string} />,
    },
  ];

  return (
    <DossierPage company={company} title="Inspection Reports">
      <Text style={s.caption}>
        DN: {data.dispatchNote.dnNo} | Total Inspections: {internal.length}
      </Text>
      <DTable columns={overview} rows={internal} />

      {internal.map((insp, i) => {
        const rows = (g(insp, "parameters") as Row[]) || [];
        if (rows.length === 0) return null;
        return (
          <View key={i}>
            <Text style={s.h3}>
              {t(g(insp, "inspectionNo"))} — Heat: {t(g(insp, "stockHeatNo"))} |{" "}
              {t(g(insp, "stockProduct"))} {t(g(insp, "stockSize"))}
            </Text>
            <DTable columns={params} rows={rows} />
            {g(insp, "remarks") ? (
              <Text style={{ fontSize: 7, color: "#666", marginTop: 3 }}>
                Remarks: {String(g(insp, "remarks"))}
              </Text>
            ) : null}
          </View>
        );
      })}
    </DossierPage>
  );
}

function TpiPage({
  company,
  data,
}: {
  company: DossierCompany;
  data: DossierData;
}) {
  const title = "TPI Certificates (Third-Party Inspection)";
  if (data.tpiInspections.length === 0) {
    return (
      <DossierPage company={company} title={title}>
        <Empty message="No TPI inspection records for dispatched items" />
      </DossierPage>
    );
  }

  const overview: Col<Row>[] = [
    { header: "#", width: "4%", align: "center", render: (_r, i) => String(i + 1) },
    { header: "Inspection No.", width: "16%", mono: true, render: (r) => t(g(r, "inspectionNo")) },
    { header: "TPI Agency", width: "16%", render: (r) => t(gp(r, "tpiAgency.name")) },
    { header: "Heat No.", width: "13%", mono: true, render: (r) => t(g(r, "stockHeatNo")) },
    {
      header: "Product / Size",
      width: "18%",
      render: (r) => `${t(g(r, "stockProduct"))} ${g(r, "stockSize") || ""}`.trim(),
    },
    { header: "Date", width: "11%", render: (r) => fmtDate(g(r, "inspectionDate") as string) },
    {
      header: "Result",
      width: "11%",
      align: "center",
      render: (r) => <ResultBadge result={g(r, "overallResult") as string} />,
    },
    {
      header: "Sign-off",
      width: "11%",
      align: "center",
      // An unsigned TPI certificate usually blocks payment, so this is called
      // out per row rather than assumed from the result.
      render: (r) => {
        const paths = g(r, "tpiSignOffPaths");
        const signed = Array.isArray(paths) && paths.length > 0;
        return signed ? (
          <Badge label="Signed" tone="pass" />
        ) : (
          <Badge label="Pending" tone="hold" />
        );
      },
    },
  ];

  const params: Col<Row>[] = [
    { header: "Parameter", width: "40%", render: (r) => t(g(r, "parameterName")) },
    { header: "Standard", width: "22%", mono: true, render: (r) => t(g(r, "standardValue")) },
    { header: "Result", width: "22%", mono: true, render: (r) => t(g(r, "resultValue")) },
    {
      header: "Status",
      width: "16%",
      align: "center",
      render: (r) => <ResultBadge result={g(r, "result") as string} />,
    },
  ];

  return (
    <DossierPage company={company} title={title}>
      <Text style={s.caption}>
        Total TPI Inspections: {data.tpiInspections.length}
      </Text>
      <DTable columns={overview} rows={data.tpiInspections} />

      {data.tpiInspections.map((insp, i) => {
        const rows = (g(insp, "parameters") as Row[]) || [];
        if (rows.length === 0) return null;
        return (
          <View key={i}>
            <Text style={s.h3}>
              {t(g(insp, "inspectionNo"))} — TPI: {t(gp(insp, "tpiAgency.name"))} |
              Heat: {t(g(insp, "stockHeatNo"))}
            </Text>
            <DTable columns={params} rows={rows} />
          </View>
        );
      })}
    </DossierPage>
  );
}

function LabReportsPage({
  company,
  data,
}: {
  company: DossierCompany;
  data: DossierData;
}) {
  if (data.labReports.length === 0) {
    return (
      <DossierPage company={company} title="Lab Test Reports">
        <Empty message="No lab test reports for dispatched items" />
      </DossierPage>
    );
  }

  const columns: Col<Row>[] = [
    { header: "#", width: "4%", align: "center", render: (_r, i) => String(i + 1) },
    { header: "Report No.", width: "14%", mono: true, render: (r) => t(g(r, "reportNo")) },
    {
      header: "Type",
      width: "12%",
      align: "center",
      render: (r) => <Badge label={t(g(r, "reportType"))} tone="info" />,
    },
    {
      header: "Heat No.",
      width: "12%",
      mono: true,
      render: (r) => t(g(r, "heatNo") ?? g(r, "stockHeatNo")),
    },
    { header: "Product", width: "14%", render: (r) => t(g(r, "stockProduct")) },
    { header: "Size", width: "10%", mono: true, render: (r) => t(g(r, "stockSize")) },
    { header: "Lab", width: "14%", render: (r) => t(g(r, "labName")) },
    {
      header: "Test Date",
      width: "10%",
      render: (r) => fmtDate((g(r, "testDate") ?? g(r, "reportDate")) as string),
    },
    {
      header: "Result",
      width: "10%",
      align: "center",
      render: (r) =>
        g(r, "result") ? (
          <ResultBadge result={g(r, "result") as string} />
        ) : (
          DASH
        ),
    },
  ];

  return (
    <DossierPage company={company} title="Lab Test Reports">
      <Text style={s.caption}>Total Reports: {data.labReports.length}</Text>
      <DTable columns={columns} rows={data.labReports} />
    </DossierPage>
  );
}

function LengthTallyPage({
  company,
  data,
}: {
  company: DossierCompany;
  data: DossierData;
}) {
  if (data.pipeDetails.length === 0) {
    return (
      <DossierPage company={company} title="Length Tally List">
        <Empty message="No pipe-level length tally data available" />
      </DossierPage>
    );
  }

  // Grouped by heat because that is the unit a customer's QA reconciles
  // against a mill certificate.
  const byHeat = new Map<string, Row[]>();
  for (const pd of data.pipeDetails) {
    const key = String(g(pd, "heatNo") ?? g(pd, "stockHeatNo") ?? "Unknown");
    const list = byHeat.get(key);
    if (list) list.push(pd);
    else byHeat.set(key, [pd]);
  }

  const columns: Col<Row>[] = [
    { header: "Pipe No.", width: "13%", align: "center", render: (r) => t(g(r, "pipeNo")) },
    {
      header: "Length (Mtr)",
      width: "15%",
      align: "right",
      mono: true,
      render: (r) => {
        const len = Number(g(r, "length")) || 0;
        return len > 0 ? len.toFixed(3) : DASH;
      },
    },
    { header: "Make", width: "16%", mono: true, render: (r) => t(g(r, "make")) },
    { header: "MTC No.", width: "18%", mono: true, render: (r) => t(g(r, "mtcNo")) },
    { header: "Bundle", width: "13%", render: (r) => t(g(r, "bundleNo")) },
    { header: "Remarks", width: "25%", render: (r) => t(g(r, "remarks")) },
  ];

  let grandPipes = 0;
  let grandLength = 0;
  for (const pipes of byHeat.values()) {
    grandPipes += pipes.length;
    for (const p of pipes) grandLength += Number(g(p, "length")) || 0;
  }

  return (
    <DossierPage company={company} title="Length Tally List">
      <Text style={s.caption}>
        DN: {data.dispatchNote.dnNo} | Total Pipes: {grandPipes} | Total Length:{" "}
        {grandLength.toFixed(3)} Mtr
      </Text>

      {Array.from(byHeat.entries()).map(([heatNo, pipes], i) => {
        const heatTotal = pipes.reduce(
          (sum, p) => sum + (Number(g(p, "length")) || 0),
          0
        );
        const first = pipes[0];
        return (
          <View key={i}>
            <Text style={s.h3}>
              {`Heat No: ${heatNo} — ${t(g(first, "stockProduct"))} ${
                g(first, "stockSize") ?? ""
              } ${g(first, "stockSpec") ?? ""}`.trim()}
            </Text>
            <DTable
              columns={columns}
              rows={pipes}
              totals={[
                { width: "13%", content: `Pipes: ${pipes.length}`, align: "right" },
                { width: "15%", content: heatTotal.toFixed(3), align: "right" },
                { width: "72%" },
              ]}
            />
          </View>
        );
      })}
    </DossierPage>
  );
}

function ColourCodingPage({
  company,
  data,
}: {
  company: DossierCompany;
  data: DossierData;
}) {
  const released = new Set(
    data.qcReleases.map((q) => String(g(q, "inventoryStockId")))
  );

  const rows = data.packingListItems
    .filter((item) => g(item, "markingDetails") || g(item, "inventoryStock"))
    .map((item, idx) => ({
      sNo: idx + 1,
      heatNo: g(item, "heatNo") ?? gp(item, "inventoryStock.heatNo"),
      product: gp(item, "inventoryStock.product"),
      size: g(item, "sizeLabel") ?? gp(item, "inventoryStock.sizeLabel"),
      marking: g(item, "markingDetails"),
      released: released.has(String(g(item, "inventoryStockId"))),
    }));

  if (rows.length === 0) {
    return (
      <DossierPage company={company} title="Colour Coding Compliance">
        <Empty message="No colour coding / marking data available" />
      </DossierPage>
    );
  }

  type CcRow = (typeof rows)[number];
  const columns: Col<CcRow>[] = [
    { header: "#", width: "5%", align: "center", render: (r) => String(r.sNo) },
    { header: "Heat No.", width: "16%", mono: true, render: (r) => t(r.heatNo) },
    { header: "Product", width: "19%", render: (r) => t(r.product) },
    { header: "Size", width: "14%", mono: true, render: (r) => t(r.size) },
    { header: "Marking Details", width: "31%", render: (r) => t(r.marking) },
    {
      header: "QC Status",
      width: "15%",
      align: "center",
      render: (r) =>
        r.released ? (
          <Badge label="QC Released" tone="pass" />
        ) : (
          <Badge label="Pending" tone="hold" />
        ),
    },
  ];

  return (
    <DossierPage company={company} title="Colour Coding & Marking Compliance">
      <Text style={s.caption}>
        DN: {data.dispatchNote.dnNo} | Items: {rows.length}
      </Text>
      <DTable columns={columns} rows={rows} />
    </DossierPage>
  );
}

function PackingListPage({
  company,
  data,
}: {
  company: DossierCompany;
  data: DossierData;
}) {
  const items = data.packingListItems;

  const columns: Col<Row>[] = [
    { header: "#", width: "4%", align: "center", render: (_r, i) => String(i + 1) },
    {
      header: "Heat No.",
      width: "13%",
      mono: true,
      render: (r) => t(g(r, "heatNo") ?? gp(r, "inventoryStock.heatNo")),
    },
    {
      header: "Size",
      width: "11%",
      mono: true,
      render: (r) => t(g(r, "sizeLabel") ?? gp(r, "inventoryStock.sizeLabel")),
    },
    { header: "Material", width: "14%", render: (r) => t(g(r, "material")) },
    { header: "Product", width: "13%", render: (r) => t(gp(r, "inventoryStock.product")) },
    { header: "Qty (Mtr)", width: "10%", align: "right", render: (r) => num(g(r, "quantityMtr")) },
    { header: "Pcs", width: "6%", align: "right", render: (r) => String(g(r, "pieces") ?? 0) },
    { header: "Bundle", width: "9%", render: (r) => t(g(r, "bundleNo")) },
    {
      header: "Gross (Kg)",
      width: "10%",
      align: "right",
      render: (r) => {
        const v = Number(g(r, "grossWeightKg")) || 0;
        return v > 0 ? num(v) : DASH;
      },
    },
    {
      header: "Net (Kg)",
      width: "10%",
      align: "right",
      render: (r) => {
        const v = Number(g(r, "netWeightKg")) || 0;
        return v > 0 ? num(v) : DASH;
      },
    },
  ];

  const totalQty = items.reduce((a, i) => a + (Number(g(i, "quantityMtr")) || 0), 0);
  const totalPcs = items.reduce((a, i) => a + (Number(g(i, "pieces")) || 0), 0);
  const totalGross = items.reduce((a, i) => a + (Number(g(i, "grossWeightKg")) || 0), 0);
  const totalNet = items.reduce((a, i) => a + (Number(g(i, "netWeightKg")) || 0), 0);

  const plNo = data.dispatchNote.packingList?.plNo || "";

  return (
    <DossierPage
      company={company}
      title={plNo ? `Packing List — ${plNo}` : "Packing List"}
    >
      <View style={s.infoGrid}>
        <InfoItem label="DN Number" value={data.dispatchNote.dnNo} mono width="25%" />
        <InfoItem
          label="Dispatch Date"
          value={fmtDate(data.dispatchNote.dispatchDate)}
          width="25%"
        />
        <InfoItem label="Customer" value={data.customer?.name} width="25%" />
        <InfoItem
          label="Vehicle"
          value={data.dispatchNote.vehicleNo}
          mono
          width="25%"
        />
      </View>

      <DTable
        columns={columns}
        rows={items}
        totals={[
          { width: "55%", content: "TOTALS", align: "right" },
          { width: "10%", content: totalQty.toFixed(3), align: "right" },
          { width: "6%", content: String(totalPcs), align: "right" },
          { width: "9%" },
          { width: "10%", content: totalGross.toFixed(3), align: "right" },
          { width: "10%", content: totalNet.toFixed(3), align: "right" },
        ]}
      />
    </DossierPage>
  );
}

function InvoicePage({
  company,
  data,
}: {
  company: DossierCompany;
  data: DossierData;
}) {
  const inv = data.invoice;
  if (!inv) {
    return (
      <DossierPage company={company} title="Invoice">
        <Empty message="No invoice generated yet for this dispatch" />
      </DossierPage>
    );
  }

  const items = (g(inv, "items") as Row[]) || [];

  const columns: Col<Row>[] = [
    { header: "#", width: "4%", align: "center", render: (r, i) => t(g(r, "sNo") ?? i + 1) },
    { header: "Description", width: "24%", render: (r) => t(g(r, "description")) },
    { header: "Heat No.", width: "13%", mono: true, render: (r) => t(g(r, "heatNo")) },
    { header: "Size", width: "11%", mono: true, render: (r) => t(g(r, "sizeLabel")) },
    { header: "Qty", width: "10%", align: "right", render: (r) => num(g(r, "quantity")) },
    { header: "UOM", width: "6%", render: (r) => t(g(r, "uom") ?? "Mtr") },
    { header: "Rate", width: "10%", align: "right", render: (r) => money(g(r, "unitRate")) },
    { header: "Amount", width: "12%", align: "right", render: (r) => money(g(r, "amount")) },
    { header: "HSN", width: "10%", align: "center", mono: true, render: (r) => t(g(r, "hsnCode")) },
  ];

  // Only the taxes that actually apply are listed; intra-state shows CGST +
  // SGST, inter-state shows IGST.
  const taxLines: string[] = [];
  if (Number(g(inv, "cgst")) > 0) taxLines.push(`CGST: ${money(g(inv, "cgst"))}`);
  if (Number(g(inv, "sgst")) > 0) taxLines.push(`SGST: ${money(g(inv, "sgst"))}`);
  if (Number(g(inv, "igst")) > 0) taxLines.push(`IGST: ${money(g(inv, "igst"))}`);
  if (Number(g(inv, "tcsAmount")) > 0)
    taxLines.push(`TCS: ${money(g(inv, "tcsAmount"))}`);

  const status = String(g(inv, "status") || "");

  return (
    <DossierPage
      company={company}
      title={`Invoice — ${t(g(inv, "invoiceNo"))}`}
    >
      <View style={s.infoGrid}>
        <InfoItem label="Invoice No" value={t(g(inv, "invoiceNo"))} mono />
        <InfoItem
          label="Invoice Date"
          value={fmtDate(g(inv, "invoiceDate") as string)}
        />
        <InfoItem
          label="Type"
          value={<Badge label={t(g(inv, "invoiceType"))} tone="info" />}
        />
        <InfoItem
          label="Status"
          value={
            <Badge label={status || DASH} tone={status === "PAID" ? "pass" : "hold"} />
          }
        />
        <InfoItem label="Customer" value={data.customer?.name} />
        <InfoItem
          label="GSTIN"
          value={t(g(inv, "customerGstin") ?? data.customer?.gstNo)}
          mono
        />
        {g(inv, "eWayBillNo") ? (
          <InfoItem label="E-Way Bill" value={t(g(inv, "eWayBillNo"))} mono />
        ) : null}
        {g(inv, "dueDate") ? (
          <InfoItem label="Due Date" value={fmtDate(g(inv, "dueDate") as string)} />
        ) : null}
      </View>

      <DTable
        columns={columns}
        rows={items}
        totals={[
          { width: "78%", content: "Subtotal", align: "right" },
          { width: "12%", content: money(g(inv, "subtotal")), align: "right" },
          { width: "10%" },
        ]}
      />

      <View style={{ alignItems: "flex-end", marginTop: 8 }}>
        {taxLines.length > 0 ? (
          <Text style={{ fontSize: 7.5, color: "#555" }}>
            {taxLines.join(" | ")}
          </Text>
        ) : null}
        {Number(g(inv, "roundOff")) !== 0 ? (
          <Text style={{ fontSize: 7.5, color: "#555" }}>
            Round Off: {money(g(inv, "roundOff"))}
          </Text>
        ) : null}
        <Text
          style={{
            fontSize: 13,
            fontFamily: "Helvetica-Bold",
            color: NAVY,
            marginTop: 3,
          }}
        >
          Total: {money(g(inv, "totalAmount"))}
        </Text>
        {g(inv, "amountInWords") ? (
          <Text style={{ fontSize: 7, color: "#666" }}>
            {String(g(inv, "amountInWords"))}
          </Text>
        ) : null}
      </View>
    </DossierPage>
  );
}

// ─── Document ─────────────────────────────────────────────────────────────────

export function DossierDocument({
  data,
  company,
  sections = [...DOSSIER_SECTIONS],
}: {
  data: DossierData;
  company: DossierCompany;
  sections?: DossierSection[];
}) {
  const has = (name: DossierSection) => sections.includes(name);

  return (
    <Document title={`Dispatch Dossier - ${data.dispatchNote.dnNo}`}>
      {has("cover") ? <CoverPage company={company} data={data} /> : null}
      {has("dispatchNote") ? (
        <DispatchNotePage company={company} data={data} />
      ) : null}
      {has("clientPO") && data.clientPO ? (
        <ClientPOPage company={company} data={data} />
      ) : null}
      {has("poAcceptance") && data.poAcceptance ? (
        <POAcceptancePage company={company} data={data} />
      ) : null}
      {has("mtc") ? <MtcPage company={company} data={data} /> : null}
      {has("inspection") ? <InspectionPage company={company} data={data} /> : null}
      {has("tpi") ? <TpiPage company={company} data={data} /> : null}
      {has("labReports") ? <LabReportsPage company={company} data={data} /> : null}
      {has("lengthTally") ? <LengthTallyPage company={company} data={data} /> : null}
      {has("colourCoding") ? (
        <ColourCodingPage company={company} data={data} />
      ) : null}
      {has("packingList") ? <PackingListPage company={company} data={data} /> : null}
      {has("invoice") ? <InvoicePage company={company} data={data} /> : null}
    </Document>
  );
}
