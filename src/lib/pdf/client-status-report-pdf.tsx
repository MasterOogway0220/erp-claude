import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { fmtDate } from "./primitives";
import type {
  ClientStatusReportData,
  StatusReportItem,
} from "./client-status-report-template";

/**
 * Client order status report — the document a customer receives to see how far
 * their sales order has progressed, line by line: how much was ordered, how
 * much has been dispatched, and whether each line has cleared material
 * preparation, inspection and testing.
 *
 * Domain notes:
 *  - A *heat number* identifies the steel melt a pipe came from; it is the
 *    traceability key the customer's own QA will check, so it is monospaced
 *    and never abbreviated.
 *  - *Inspection* here means the customer's or a TPI (third-party inspection)
 *    agency's sign-off; *testing* means lab tests on the material. A line can
 *    be materially ready but still blocked on either.
 *
 * Replaces the Chromium/HTML pipeline. The page is deliberately 297 x 230mm
 * rather than A4 landscape: the HTML version passed `landscape: true`, which
 * in `render-pdf.ts` meant that custom wider-and-shorter sheet, sized so the
 * thirteen-column table and the footer landed on one page. Customers have been
 * receiving that shape, so it is preserved rather than reflowed.
 *
 * The `ClientStatusReportData` shape is still owned by
 * `client-status-report-template.ts`, which remains the source for the HTML
 * preview route; this file only renders it.
 */

// 297mm x 230mm at 72dpi — the sheet `render-pdf.ts` used for `landscape:
// true`. react-pdf takes points and treats a bare number as points, so the
// millimetre figures are converted once, here.
const PAGE_SIZE: [number, number] = [842, 652];

const BLUE = "#1E40AF";
const SLATE = "#64748B";

/** Column widths must total 100% — react-pdf has no table model to do it. */
const COL = {
  sno: "3%",
  product: "12%",
  material: "11%",
  size: "8%",
  heat: "9%",
  ordered: "7%",
  dispatched: "8%",
  balance: "7%",
  matStatus: "8%",
  inspection: "8%",
  testing: "7%",
  expDispatch: "6%",
  remarks: "6%",
};

const s = StyleSheet.create({
  // 6mm vertical / 8mm horizontal, matching the margins render-pdf.ts passed
  // Chromium for the landscape sheet.
  page: {
    paddingTop: 17,
    paddingBottom: 17,
    paddingHorizontal: 23,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#1F2937",
  },

  watermark: {
    position: "absolute",
    top: 280,
    left: 180,
    fontSize: 64,
    fontFamily: "Helvetica-Bold",
    color: "#1E40AF",
    opacity: 0.04,
    transform: "rotate(-30deg)",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 3,
    borderBottomColor: BLUE,
    borderStyle: "solid",
    marginBottom: 14,
  },
  companyName: { fontSize: 14, fontFamily: "Helvetica-Bold", color: BLUE },
  companyAddress: { fontSize: 7, color: "#6B7280", marginTop: 2 },
  reportTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: BLUE,
    textAlign: "right",
  },
  reportDate: {
    fontSize: 7.5,
    color: "#6B7280",
    textAlign: "right",
    marginTop: 2,
  },

  infoGrid: { flexDirection: "row", marginBottom: 14 },
  infoBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "solid",
    padding: 9,
  },
  infoBoxTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: SLATE,
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  infoLabel: { color: SLATE, fontSize: 7.5 },
  infoValue: { fontFamily: "Helvetica-Bold", fontSize: 7.5, maxWidth: "62%", textAlign: "right" },

  summaryBar: { flexDirection: "row", marginBottom: 14 },
  summaryCard: {
    flex: 1,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderStyle: "solid",
    padding: 7,
    alignItems: "center",
  },
  summaryNumber: { fontSize: 14, fontFamily: "Helvetica-Bold", color: BLUE },
  summaryLabel: {
    fontSize: 6.5,
    color: SLATE,
    letterSpacing: 0.3,
    marginTop: 1,
    textAlign: "center",
  },
  progressTrack: {
    width: "100%",
    height: 4,
    backgroundColor: "#E5E7EB",
    marginTop: 3,
  },

  thead: { flexDirection: "row", backgroundColor: BLUE },
  th: {
    color: "#FFFFFF",
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    padding: 4,
    letterSpacing: 0.3,
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    borderStyle: "solid",
  },
  td: { fontSize: 7, padding: 4 },
  mono: { fontFamily: "Courier" },

  badge: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 2,
    paddingHorizontal: 3,
    textAlign: "center",
  },

  footer: {
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: "#E5E7EB",
    borderStyle: "solid",
  },
  footerNote: { fontSize: 7, color: "#9CA3AF" },
  footerCompany: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: BLUE,
    marginTop: 3,
  },
});

/**
 * Status wording varies by source table (a dispatch row says ISSUED, an
 * inspection row says PASS), so the colour is keyed off the vocabulary rather
 * than off one enum. Anything unrecognised stays neutral grey instead of
 * inventing a signal.
 */
function statusColor(status: string): string {
  switch ((status || "").toUpperCase()) {
    case "COMPLETED":
    case "DONE":
    case "PASS":
    case "READY":
    case "ISSUED":
      return "#16A34A";
    case "IN_PROGRESS":
    case "IN PROGRESS":
    case "PREPARING":
      return "#2563EB";
    case "PENDING":
      return "#D97706";
    case "FAIL":
    case "REJECTED":
      return "#DC2626";
    case "N/A":
    case "NA":
      return "#9CA3AF";
    default:
      return "#374151";
  }
}

function Badge({ status, width }: { status: string; width: string }) {
  const color = statusColor(status);
  return (
    <View style={{ width, padding: 3 }}>
      <Text
        style={[
          s.badge,
          {
            color,
            // The HTML used 8-digit hex (#RRGGBB15) for a 8% tint. react-pdf
            // does not parse that, so the tint is a separate opacity-free
            // colour: a very light neutral keeps the badge readable in
            // greyscale, which is how most clients print this.
            backgroundColor: "#F3F4F6",
            borderWidth: 0.5,
            borderColor: color,
            borderStyle: "solid",
          },
        ]}
      >
        {(status || "").replace(/_/g, " ")}
      </Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

function SummaryCard({
  value,
  label,
  color,
  bg,
  border,
  pct,
}: {
  value: string;
  label: string;
  color?: string;
  bg?: string;
  border?: string;
  pct?: number;
}) {
  return (
    <View
      style={[
        s.summaryCard,
        bg ? { backgroundColor: bg } : {},
        border ? { borderColor: border } : {},
      ]}
    >
      <Text style={[s.summaryNumber, color ? { color } : {}]}>{value}</Text>
      <Text style={s.summaryLabel}>{label}</Text>
      {pct !== undefined ? (
        <View style={s.progressTrack}>
          <View
            style={{
              // A zero-width View still paints its border box in react-pdf, so
              // 0% must render nothing rather than a 0-width sliver.
              width: `${Math.max(pct, 0)}%`,
              height: 4,
              backgroundColor: color || BLUE,
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

/** Indian digit grouping to three decimals — quantities here are in metres. */
function qty(val: number | string): string {
  const n = parseFloat(String(val));
  if (isNaN(n)) return "0.000";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

function ItemRow({ item, even }: { item: StatusReportItem; even: boolean }) {
  return (
    <View
      style={[s.tr, even ? { backgroundColor: "#F9FAFB" } : {}]}
      wrap={false}
    >
      <Text style={[s.td, { width: COL.sno, textAlign: "center" }]}>
        {item.sNo}
      </Text>
      <Text style={[s.td, { width: COL.product }]}>{item.product}</Text>
      <Text style={[s.td, { width: COL.material }]}>{item.material}</Text>
      <Text style={[s.td, { width: COL.size }]}>{item.size}</Text>
      <Text
        style={[s.td, s.mono, { width: COL.heat, textAlign: "center", fontSize: 6.5 }]}
      >
        {item.heatNo || "—"}
      </Text>
      <Text style={[s.td, { width: COL.ordered, textAlign: "right" }]}>
        {qty(item.qtyOrdered)}
      </Text>
      <Text style={[s.td, { width: COL.dispatched, textAlign: "right" }]}>
        {qty(item.qtyDispatched)}
      </Text>
      <Text
        style={[
          s.td,
          { width: COL.balance, textAlign: "right", fontFamily: "Helvetica-Bold" },
        ]}
      >
        {qty(item.qtyBalance)}
      </Text>
      <Badge status={item.materialPrepared} width={COL.matStatus} />
      <Badge status={item.inspectionStatus} width={COL.inspection} />
      <Badge status={item.testingStatus} width={COL.testing} />
      <Text
        style={[s.td, { width: COL.expDispatch, textAlign: "center", fontSize: 6.5 }]}
      >
        {item.expectedDispatchDate || "—"}
      </Text>
      <Text style={[s.td, { width: COL.remarks, fontSize: 6.5 }]}>
        {item.remarks || "—"}
      </Text>
    </View>
  );
}

export interface StatusReportCompany {
  companyName: string;
  regAddressLine1?: string | null;
  regAddressLine2?: string | null;
  regCity?: string | null;
  regPincode?: string | null;
  regState?: string | null;
  telephoneNo?: string | null;
  email?: string | null;
}

export function ClientStatusReportDocument({
  report,
  company,
}: {
  report: ClientStatusReportData;
  company: StatusReportCompany;
}) {
  const companyAddress = [
    company.regAddressLine1,
    company.regAddressLine2,
    company.regCity,
    company.regState
      ? `${company.regState} - ${company.regPincode || ""}`
      : company.regPincode,
  ]
    .filter(Boolean)
    .join(", ");

  const customerAddress = [
    report.customer.addressLine1,
    report.customer.city,
    report.customer.state
      ? `${report.customer.state} - ${report.customer.pincode || ""}`
      : report.customer.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const { summary } = report;
  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
  const inspPct = pct(summary.inspectionComplete, summary.totalItems);
  const testPct = pct(summary.testingComplete, summary.totalItems);
  const prepPct = pct(summary.materialReady, summary.totalItems);
  const dispPct = pct(summary.totalDispatched, summary.totalOrdered);

  const footerContact = [company.telephoneNo, company.email]
    .filter(Boolean)
    .join(" | ");

  return (
    <Document title={`Order Status Report - ${report.salesOrder.soNo}`}>
      <Page size={PAGE_SIZE} style={s.page}>
        <Text style={s.watermark} fixed>
          ORDER STATUS
        </Text>

        <View style={s.header}>
          <View>
            <Text style={s.companyName}>{company.companyName}</Text>
            {companyAddress ? (
              <Text style={s.companyAddress}>{companyAddress}</Text>
            ) : null}
            {company.telephoneNo ? (
              <Text style={s.companyAddress}>
                Tel: {company.telephoneNo}
                {company.email ? ` | Email: ${company.email}` : ""}
              </Text>
            ) : null}
          </View>
          <View>
            <Text style={s.reportTitle}>Order Status Report</Text>
            <Text style={s.reportDate}>
              Generated: {fmtDate(report.reportDate)}
            </Text>
          </View>
        </View>

        <View style={s.infoGrid}>
          <View style={[s.infoBox, { marginRight: 10 }]}>
            <Text style={s.infoBoxTitle}>CUSTOMER DETAILS</Text>
            <InfoRow label="Customer" value={report.customer.name} />
            <InfoRow label="Contact" value={report.customer.contactPerson} />
            <InfoRow label="Address" value={customerAddress} />
          </View>
          <View style={s.infoBox}>
            <Text style={s.infoBoxTitle}>ORDER DETAILS</Text>
            <InfoRow label="SO No." value={report.salesOrder.soNo} />
            <InfoRow label="SO Date" value={fmtDate(report.salesOrder.soDate)} />
            <InfoRow
              label="Client PO No."
              value={report.salesOrder.customerPoNo}
            />
            <InfoRow
              label="PO Date"
              value={
                report.salesOrder.customerPoDate
                  ? fmtDate(report.salesOrder.customerPoDate)
                  : null
              }
            />
            <InfoRow label="Project" value={report.salesOrder.projectName} />
            <InfoRow
              label="SO Status"
              value={(report.salesOrder.status || "").replace(/_/g, " ")}
            />
            <InfoRow
              label="Delivery"
              value={report.salesOrder.deliverySchedule}
            />
          </View>
        </View>

        <View style={s.summaryBar}>
          <SummaryCard
            value={String(summary.totalItems)}
            label="TOTAL ITEMS"
          />
          <View style={{ width: 8 }} />
          <SummaryCard
            value={`${dispPct}%`}
            label="DISPATCHED"
            color="#2563EB"
            bg="#EFF6FF"
            border="#BFDBFE"
            pct={dispPct}
          />
          <View style={{ width: 8 }} />
          <SummaryCard
            value={`${prepPct}%`}
            label="MATERIAL READY"
            color="#16A34A"
            bg="#F0FDF4"
            border="#BBF7D0"
            pct={prepPct}
          />
          <View style={{ width: 8 }} />
          <SummaryCard
            value={`${inspPct}%`}
            label="INSPECTION DONE"
            color="#D97706"
            bg="#FFFBEB"
            border="#FDE68A"
            pct={inspPct}
          />
          <View style={{ width: 8 }} />
          <SummaryCard
            value={`${testPct}%`}
            label="TESTING DONE"
            color="#6366F1"
            pct={testPct}
          />
        </View>

        {/* `fixed` repeats the header on every page the item table spills onto —
            the HTML relied on <thead> doing this for free. */}
        <View style={s.thead} fixed>
          <Text style={[s.th, { width: COL.sno, textAlign: "center" }]}>#</Text>
          <Text style={[s.th, { width: COL.product }]}>PRODUCT</Text>
          <Text style={[s.th, { width: COL.material }]}>MATERIAL</Text>
          <Text style={[s.th, { width: COL.size }]}>SIZE</Text>
          <Text style={[s.th, { width: COL.heat, textAlign: "center" }]}>
            HEAT NO.
          </Text>
          <Text style={[s.th, { width: COL.ordered, textAlign: "right" }]}>
            ORDERED
          </Text>
          <Text style={[s.th, { width: COL.dispatched, textAlign: "right" }]}>
            DISPATCHED
          </Text>
          <Text style={[s.th, { width: COL.balance, textAlign: "right" }]}>
            BALANCE
          </Text>
          <Text style={[s.th, { width: COL.matStatus, textAlign: "center" }]}>
            MATERIAL
          </Text>
          <Text style={[s.th, { width: COL.inspection, textAlign: "center" }]}>
            INSPECTION
          </Text>
          <Text style={[s.th, { width: COL.testing, textAlign: "center" }]}>
            TESTING
          </Text>
          <Text style={[s.th, { width: COL.expDispatch, textAlign: "center" }]}>
            EXP. DISP.
          </Text>
          <Text style={[s.th, { width: COL.remarks }]}>REMARKS</Text>
        </View>

        {report.items.map((item, i) => (
          <ItemRow key={i} item={item} even={i % 2 === 1} />
        ))}

        <View style={s.footer}>
          <Text style={s.footerNote}>
            This is a computer-generated report. Status information is current
            as of {fmtDate(report.reportDate)}. For any queries, please contact
            our sales team.
          </Text>
          <Text style={s.footerCompany}>
            {company.companyName}
            {footerContact ? ` | ${footerContact}` : ""}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
