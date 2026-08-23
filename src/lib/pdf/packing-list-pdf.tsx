import { Text, View } from "@react-pdf/renderer";
import { fmtDate } from "./primitives";
import {
  A4_LANDSCAPE,
  BorderedDocument,
  Column,
  CompanyHeader,
  InfoGrid,
  InfoRow,
  ItemsTable,
  SignFor,
  SignSlot,
  TitleBar,
  TotalsRow,
  s,
} from "./bordered-doc";

/**
 * Packing list — the sheet that travels with a consignment and is used for
 * physical verification at dispatch: every bundle, its heat number, how many
 * pieces, and what it weighs.
 *
 * Domain notes: a *heat number* identifies the steel melt each pipe came from
 * and is the traceability key the receiving QA checks against the mill test
 * certificate, so it is monospaced and never abbreviated. *Gross* weight
 * includes packing; *net* is the material alone — the disclaimer quotes net,
 * because that is what the customer is invoiced against.
 *
 * Replaces `packing-list-template.ts`, which produced this as an HTML string
 * for Chromium to print.
 */

export interface PackingListCompany {
  companyName: string;
  regAddressLine1?: string | null;
  regAddressLine2?: string | null;
  regCity?: string | null;
  regPincode?: string | null;
  regState?: string | null;
  regCountry?: string | null;
}

export interface PackingListItem {
  heatNo?: string | null;
  sizeLabel?: string | null;
  material?: string | null;
  quantityMtr: number;
  pieces: number;
  bundleNo?: string | null;
  grossWeightKg?: number | null;
  netWeightKg?: number | null;
  markingDetails?: string | null;
  inventoryStock?: { product?: string | null } | null;
}

export interface PackingListData {
  plNo: string;
  plDate: string | Date;
  remarks?: string | null;
  salesOrder?: {
    soNo: string;
    customer?: {
      name: string;
      addressLine1?: string | null;
      city?: string | null;
      state?: string | null;
      pincode?: string | null;
    } | null;
  } | null;
  items: PackingListItem[];
}

/** Three decimals, plain — quantities are metres and weights kilograms. */
function num(val: unknown, decimals = 3): string {
  const n = parseFloat(String(val));
  return isNaN(n) ? "0.000" : n.toFixed(decimals);
}

const t = (v: unknown): string => (v == null ? "" : String(v));

// Widths must total 100%. The totals row below spans the first five, so its
// leading cell is 4 + 11 + 10 + 12 + 10 = 47%.
const COLUMNS: Column<PackingListItem>[] = [
  { header: "S/N", width: "4%", align: "center", render: (_i, idx) => String(idx + 1) },
  { header: "Heat No.", width: "11%", align: "center", mono: true, render: (i) => t(i.heatNo) },
  { header: "Size", width: "10%", align: "center", render: (i) => t(i.sizeLabel) },
  { header: "Material", width: "12%", render: (i) => t(i.material) },
  { header: "Product", width: "10%", render: (i) => t(i.inventoryStock?.product) },
  { header: "Qty (Mtr)", width: "9%", align: "right", render: (i) => num(i.quantityMtr) },
  { header: "Pcs", width: "5%", align: "center", render: (i) => String(i.pieces ?? "") },
  { header: "Bundle No.", width: "8%", align: "center", render: (i) => t(i.bundleNo) },
  {
    header: "Gross Wt (Kg)",
    width: "10%",
    align: "right",
    render: (i) => (i.grossWeightKg ? num(i.grossWeightKg) : "-"),
  },
  {
    header: "Net Wt (Kg)",
    width: "10%",
    align: "right",
    render: (i) => (i.netWeightKg ? num(i.netWeightKg) : "-"),
  },
  { header: "Marking", width: "11%", fontSize: 6.5, render: (i) => t(i.markingDetails) },
];

const SPAN_FIRST_FIVE = "47%";

export function PackingListDocument({
  data,
  company,
}: {
  data: PackingListData;
  company: PackingListCompany;
}) {
  const companyAddress = [
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

  const customer = data.salesOrder?.customer;
  const customerAddress = [
    customer?.addressLine1,
    customer?.city,
    customer?.state
      ? `${customer.state} - ${customer.pincode || ""}`
      : customer?.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const sum = (pick: (i: PackingListItem) => unknown) =>
    data.items.reduce((acc, i) => acc + (parseFloat(String(pick(i))) || 0), 0);

  const totalQty = sum((i) => i.quantityMtr);
  const totalPcs = data.items.reduce((acc, i) => acc + (Number(i.pieces) || 0), 0);
  const totalGross = sum((i) => i.grossWeightKg);
  const totalNet = sum((i) => i.netWeightKg);

  return (
    <BorderedDocument title={`Packing List - ${data.plNo}`} size={A4_LANDSCAPE}>
      <CompanyHeader name={company.companyName} address={companyAddress} />
      <TitleBar title="PACKING LIST" bg="#E8F0FE" />

      <InfoGrid
        left={
          <>
            <InfoRow label="PL No." value={data.plNo} bold />
            <InfoRow label="PL Date" value={fmtDate(data.plDate)} />
            <InfoRow label="SO Ref." value={data.salesOrder?.soNo} />
          </>
        }
        right={
          <>
            <InfoRow label="Customer" value={customer?.name} bold />
            <InfoRow label="Address" value={customerAddress} />
          </>
        }
      />

      <ItemsTable columns={COLUMNS} rows={data.items} />

      <TotalsRow
        cells={[
          { width: SPAN_FIRST_FIVE, content: "Total", align: "center" },
          { width: "9%", content: num(totalQty), align: "right" },
          { width: "5%", content: String(totalPcs), align: "center" },
          { width: "8%" },
          { width: "10%", content: num(totalGross), align: "right" },
          { width: "10%", content: num(totalNet), align: "right" },
          { width: "11%" },
        ]}
      />

      {data.remarks ? (
        <Text
          style={[
            s.band,
            { borderBottomWidth: 0, borderTopWidth: 1, borderTopColor: "#000" },
          ]}
        >
          <Text style={s.bold}>Remarks: </Text>
          {data.remarks}
        </Text>
      ) : null}

      <View style={s.footer}>
        <SignSlot label="Checked By:" />
        <SignFor company={company.companyName} role="Authorised Signatory" gap={30} />
      </View>

      <Text style={s.disclaimer}>
        This is a computer generated document. | Total Items: {data.items.length} |
        Total Weight: {num(totalNet)} Kg (Net)
      </Text>
    </BorderedDocument>
  );
}
