import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  CELL,
  CELL_END,
  CELL_TOP,
  base,
  fmt,
  fmtDate,
} from "./primitives";

/**
 * Stores issue slip — the document a storekeeper signs when material leaves
 * the warehouse against a sales order. Replaces the Chromium-rendered
 * `issue-slip-template.ts`.
 *
 * Domain note: a *heat number* identifies the batch of steel a pipe was cast
 * from. It is the thread that ties a delivered pipe back to its mill test
 * certificate, so it appears on every document that moves material and must
 * never be dropped or reformatted.
 */

export interface IssueSlipData {
  issueNo: string;
  issueDate: string | Date;
  status: string;
  remarks?: string | null;
  salesOrder: {
    soNo: string;
    customer?: { name: string } | null;
  };
  issuedBy?: { name: string } | null;
  authorizedBy?: { name: string } | null;
  items: {
    heatNo?: string | null;
    sizeLabel?: string | null;
    material?: string | null;
    quantityMtr: number | string;
    pieces: number;
    location?: string | null;
  }[];
}

export interface CompanyInfo {
  companyName: string;
  regAddressLine1?: string | null;
  regCity?: string | null;
  regPincode?: string | null;
  regState?: string | null;
  telephoneNo?: string | null;
  email?: string | null;
}

// Column widths must total 100%. react-pdf has no table model and no colspan:
// the totals row below spans the first four columns by using a single cell
// whose width is their sum.
const COLS = {
  sno: "5%",
  heat: "15%",
  size: "20%",
  material: "20%",
  qty: "13%",
  pieces: "10%",
  location: "17%",
};
const SPAN_FIRST_FOUR = "60%"; // 5 + 15 + 20 + 20

const STATUS_COLOURS: Record<string, { bg: string; fg: string }> = {
  DRAFT: { bg: "#e5e7eb", fg: "#374151" },
  PENDING_AUTHORIZATION: { bg: "#fef3c7", fg: "#92400e" },
  AUTHORIZED: { bg: "#d1fae5", fg: "#065f46" },
  REJECTED: { bg: "#fee2e2", fg: "#991b1b" },
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={[base.row, { justifyContent: "space-between", paddingVertical: 1 }]}>
      <Text style={{ color: "#888" }}>{label}</Text>
      <Text>{value}</Text>
    </View>
  );
}

function InfoBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: "#ddd",
        borderStyle: "solid",
        padding: 8,
      }}
    >
      <Text
        style={[
          base.bold,
          {
            color: "#666",
            marginBottom: 5,
            paddingBottom: 3,
            borderBottomWidth: 1,
            borderColor: "#eee",
            borderStyle: "solid",
          },
        ]}
      >
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

function Cell({
  width,
  children,
  align,
  header,
  top,
  end,
  filled,
}: {
  width: string;
  children: React.ReactNode;
  align?: "right" | "center";
  header?: boolean;
  top?: boolean;
  end?: boolean;
  filled?: string;
}) {
  return (
    <View
      style={[
        CELL,
        top ? CELL_TOP : {},
        end ? CELL_END : {},
        {
          width,
          paddingVertical: 3,
          paddingHorizontal: 4,
          backgroundColor: filled ?? (header ? "#f3f4f6" : undefined),
        },
      ]}
    >
      <Text style={[header ? base.bold : {}, align === "right" ? base.right : {}]}>
        {children}
      </Text>
    </View>
  );
}

export function IssueSlipDocument({
  data,
  company,
}: {
  data: IssueSlipData;
  company: CompanyInfo;
}) {
  const totalQty = data.items.reduce(
    (sum, item) => sum + Number(item.quantityMtr || 0),
    0
  );
  const totalPcs = data.items.reduce((sum, item) => sum + (item.pieces || 0), 0);

  const address = [
    company.regAddressLine1,
    company.regCity,
    company.regPincode ? `- ${company.regPincode}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const contact = company.telephoneNo ? ` | Tel: ${company.telephoneNo}` : "";

  const status = STATUS_COLOURS[data.status] ?? STATUS_COLOURS.DRAFT;

  return (
    <Document title={`Issue Slip ${data.issueNo}`}>
      <Page size="A4" style={base.page}>
        {/* Header */}
        <View
          style={{
            borderBottomWidth: 2,
            borderColor: "#333",
            borderStyle: "solid",
            paddingBottom: 8,
            marginBottom: 12,
          }}
        >
          <Text style={[base.bold, base.center, { fontSize: 14 }]}>
            {company.companyName}
          </Text>
          <Text style={[base.center, { fontSize: 7, color: "#666", marginTop: 2 }]}>
            {address}
            {contact}
          </Text>
          <Text style={[base.bold, base.center, { fontSize: 11, marginTop: 6, letterSpacing: 1 }]}>
            ISSUE SLIP
          </Text>
        </View>

        {/* Two info boxes side by side */}
        <View style={[base.row, { gap: 12, marginBottom: 12 }]}>
          <InfoBox title="Issue Details">
            <InfoRow label="Issue No." value={data.issueNo} />
            <InfoRow label="Issue Date" value={fmtDate(data.issueDate)} />
            <View style={[base.row, { justifyContent: "space-between", paddingVertical: 1 }]}>
              <Text style={{ color: "#888" }}>Status</Text>
              <Text
                style={{
                  backgroundColor: status.bg,
                  color: status.fg,
                  paddingVertical: 1,
                  paddingHorizontal: 5,
                  fontFamily: "Helvetica-Bold",
                  fontSize: 7,
                }}
              >
                {data.status.replace(/_/g, " ")}
              </Text>
            </View>
          </InfoBox>
          <InfoBox title="Sales Order">
            <InfoRow label="SO No." value={data.salesOrder.soNo} />
            <InfoRow label="Customer" value={data.salesOrder.customer?.name || "—"} />
          </InfoBox>
        </View>

        {data.remarks ? (
          <View
            style={{
              marginBottom: 12,
              padding: 6,
              borderWidth: 1,
              borderColor: "#ddd",
              borderStyle: "solid",
              backgroundColor: "#fafafa",
            }}
          >
            <Text>
              <Text style={base.bold}>REMARKS: </Text>
              {data.remarks}
            </Text>
          </View>
        ) : null}

        {/* Items — the header repeats on every page a long slip spills onto. */}
        <View style={{ marginBottom: 12 }}>
          <View style={base.row} fixed>
            <Cell width={COLS.sno} header top>#</Cell>
            <Cell width={COLS.heat} header top>Heat No.</Cell>
            <Cell width={COLS.size} header top>Size</Cell>
            <Cell width={COLS.material} header top>Material</Cell>
            <Cell width={COLS.qty} header top align="right">Qty (Mtr)</Cell>
            <Cell width={COLS.pieces} header top align="right">Pieces</Cell>
            <Cell width={COLS.location} header top end>Location</Cell>
          </View>

          {data.items.map((item, i) => (
            <View style={base.row} key={i} wrap={false}>
              <Cell width={COLS.sno} filled={i % 2 ? "#fafafa" : undefined}>{String(i + 1)}</Cell>
              <Cell width={COLS.heat} filled={i % 2 ? "#fafafa" : undefined}>{item.heatNo || "—"}</Cell>
              <Cell width={COLS.size} filled={i % 2 ? "#fafafa" : undefined}>{item.sizeLabel || "—"}</Cell>
              <Cell width={COLS.material} filled={i % 2 ? "#fafafa" : undefined}>{item.material || "—"}</Cell>
              <Cell width={COLS.qty} align="right" filled={i % 2 ? "#fafafa" : undefined}>{fmt(item.quantityMtr, 3)}</Cell>
              <Cell width={COLS.pieces} align="right" filled={i % 2 ? "#fafafa" : undefined}>{String(item.pieces)}</Cell>
              <Cell width={COLS.location} end filled={i % 2 ? "#fafafa" : undefined}>{item.location || "—"}</Cell>
            </View>
          ))}

          {/* colspan={4} in the HTML original */}
          <View style={base.row}>
            <Cell width={SPAN_FIRST_FOUR} align="right" header filled="#f0f0f0">Total</Cell>
            <Cell width={COLS.qty} align="right" header filled="#f0f0f0">{fmt(totalQty, 3)}</Cell>
            <Cell width={COLS.pieces} align="right" header filled="#f0f0f0">{String(totalPcs)}</Cell>
            <Cell width={COLS.location} end header filled="#f0f0f0">{" "}</Cell>
          </View>
        </View>

        {/* Signatures */}
        <View style={[base.row, { gap: 18, marginTop: 34 }]}>
          {[
            `Issued By: ${data.issuedBy?.name || ""}`,
            `Authorized By: ${data.authorizedBy?.name || ""}`,
            "Received By",
          ].map((label) => (
            <View key={label} style={{ flex: 1 }}>
              <Text
                style={[
                  base.center,
                  {
                    borderTopWidth: 1,
                    borderColor: "#333",
                    borderStyle: "solid",
                    marginTop: 40,
                    paddingTop: 4,
                    fontSize: 7,
                  },
                ]}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
