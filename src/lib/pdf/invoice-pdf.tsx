import { Text, View } from "@react-pdf/renderer";
import { fmtDate, fmtIN } from "./primitives";
import { numberToWords } from "../amount-in-words";
import {
  A4_PORTRAIT,
  BorderedDocument,
  Column,
  CompanyHeader,
  InfoGrid,
  InfoRow,
  ItemsTable,
  TitleBar,
  TotalsRow,
  s,
} from "./bordered-doc";

/**
 * GST tax invoice — the legal document the customer is billed with, and the
 * one their finance team files against their own tax return. Its wording and
 * the tax split are prescribed, not cosmetic.
 *
 * Domain notes for anyone new to Indian GST:
 *  - A sale *within* the seller's state is taxed as **CGST + SGST** (central
 *    and state halves). A sale *across* state lines is taxed as a single
 *    **IGST** instead. It is one or the other, never both — which is why the
 *    tax rows below branch on whether IGST is non-zero rather than printing
 *    all three.
 *  - **HSN code** is the tariff classification of the goods; it must appear
 *    per line for the invoice to be compliant.
 *  - **TCS** is tax collected at source, an extra levy on large sales.
 *  - **Place of supply** decides which of the two tax treatments applies.
 *  - A *heat number* identifies the steel melt, carried onto the invoice so
 *    the billed goods stay traceable to their mill test certificate.
 *
 * Replaces `invoice-template.ts`, which built the same document as an HTML
 * string for Chromium to print.
 */

export interface InvoiceCompany {
  companyName: string;
  regAddressLine1?: string | null;
  regAddressLine2?: string | null;
  regCity?: string | null;
  regPincode?: string | null;
  regState?: string | null;
  regCountry?: string | null;
  gstNo?: string | null;
  panNo?: string | null;
}

export interface InvoiceItem {
  sNo: number;
  description?: string | null;
  heatNo?: string | null;
  sizeLabel?: string | null;
  hsnCode?: string | null;
  uom?: string | null;
  quantity: number;
  unitRate: number;
  amount: number;
  taxRate?: number | null;
}

export interface InvoiceData {
  invoiceNo: string;
  invoiceDate: string | Date;
  invoiceType: string;
  dueDate?: string | Date | null;
  placeOfSupply?: string | null;
  customerGstin?: string | null;
  eWayBillNo?: string | null;
  currency: string;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  tcsAmount: number;
  roundOff: number;
  totalAmount: number;
  amountInWords?: string | null;
  customer: {
    name: string;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    gstNo?: string | null;
    panNo?: string | null;
    contactPerson?: string | null;
    phone?: string | null;
  };
  salesOrder?: { soNo: string } | null;
  dispatchNote?: { dnNo: string } | null;
  items: InvoiceItem[];
}

const t = (v: unknown): string => (v == null ? "" : String(v));

// Widths must total 100%. Every summary row below labels across the first
// seven columns, so its leading cell is 5 + 22 + 10 + 10 + 10 + 6 + 10 = 73%.
const SPAN_FIRST_SEVEN = "73%";
const RATE_W = "12%";
const AMOUNT_W = "15%";

function columns(currency: string): Column<InvoiceItem>[] {
  return [
    { header: "S/N", width: "5%", align: "center", render: (i) => t(i.sNo) },
    { header: "Description", width: "22%", render: (i) => t(i.description) },
    { header: "Heat No.", width: "10%", align: "center", mono: true, render: (i) => t(i.heatNo) },
    { header: "Size", width: "10%", align: "center", render: (i) => t(i.sizeLabel) },
    { header: "HSN Code", width: "10%", align: "center", render: (i) => t(i.hsnCode) },
    { header: "UOM", width: "6%", align: "center", render: (i) => t(i.uom) || "Mtr" },
    { header: "Qty", width: "10%", align: "right", render: (i) => fmtIN(i.quantity, 3) },
    { header: `Rate (${currency})`, width: RATE_W, align: "right", render: (i) => fmtIN(i.unitRate) },
    { header: `Amount (${currency})`, width: AMOUNT_W, align: "right", render: (i) => fmtIN(i.amount) },
  ];
}

/** One right-aligned label + amount line under the item table. */
function SummaryRow({ label, amount }: { label: string; amount: string }) {
  return (
    <View style={{ flexDirection: "row" }} wrap={false}>
      <Text style={[s.td, s.right, { width: SPAN_FIRST_SEVEN, paddingRight: 8 }]}>
        {label}
      </Text>
      <Text style={[s.td, { width: RATE_W }]}> </Text>
      <Text style={[s.td, s.right, { width: AMOUNT_W }]}>{amount}</Text>
    </View>
  );
}

export function InvoiceDocument({
  invoice,
  company,
}: {
  invoice: InvoiceData;
  company: InvoiceCompany;
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

  const customerAddress = [
    invoice.customer.addressLine1,
    invoice.customer.addressLine2,
    invoice.customer.city,
    invoice.customer.state
      ? `${invoice.customer.state} - ${invoice.customer.pincode || ""}`
      : invoice.customer.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const gstLine = [
    company.gstNo ? `GSTIN: ${company.gstNo}` : null,
    company.panNo ? `PAN: ${company.panNo}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  // Inter-state supply is taxed as one IGST line; intra-state splits into
  // CGST + SGST. Never both.
  const hasIgst = Number(invoice.igst) > 0;
  const totalAmount = Number(invoice.totalAmount) || 0;
  const amtWords =
    invoice.amountInWords ||
    numberToWords(totalAmount, invoice.currency || "INR");

  return (
    <BorderedDocument
      title={`Tax Invoice - ${invoice.invoiceNo}`}
      size={A4_PORTRAIT}
    >
      <CompanyHeader
        name={company.companyName}
        address={companyAddress}
        contact={gstLine}
      />
      <TitleBar title="TAX INVOICE" bg="#E8F0FE" />

      <InfoGrid
        left={
          <>
            <InfoRow label="Invoice No." value={invoice.invoiceNo} bold />
            <InfoRow label="Invoice Date" value={fmtDate(invoice.invoiceDate)} />
            <InfoRow
              label="Due Date"
              value={invoice.dueDate ? fmtDate(invoice.dueDate) : null}
            />
            <InfoRow label="SO Ref." value={invoice.salesOrder?.soNo} />
            <InfoRow label="DN Ref." value={invoice.dispatchNote?.dnNo} />
            <InfoRow label="E-Way Bill" value={invoice.eWayBillNo} />
          </>
        }
        right={
          <>
            <InfoRow label="Bill To" value={invoice.customer.name} bold />
            <InfoRow label="Address" value={customerAddress} />
            <InfoRow label="GSTIN" value={invoice.customer.gstNo} />
            <InfoRow label="PAN" value={invoice.customer.panNo} />
            <InfoRow label="Place of Supply" value={invoice.placeOfSupply} />
          </>
        }
      />

      <ItemsTable columns={columns(invoice.currency)} rows={invoice.items} />

      {/* Subtotal closes the item list with a rule above it. */}
      <View style={{ flexDirection: "row" }} wrap={false}>
        <Text
          style={[
            s.td,
            s.bold,
            s.right,
            {
              width: SPAN_FIRST_SEVEN,
              paddingRight: 8,
              borderTopWidth: 1,
              borderTopColor: "#000",
            },
          ]}
        >
          Subtotal
        </Text>
        <Text
          style={[s.td, { width: RATE_W, borderTopWidth: 1, borderTopColor: "#000" }]}
        >
          {" "}
        </Text>
        <Text
          style={[
            s.td,
            s.bold,
            s.right,
            { width: AMOUNT_W, borderTopWidth: 1, borderTopColor: "#000" },
          ]}
        >
          {fmtIN(invoice.subtotal)}
        </Text>
      </View>

      {hasIgst ? (
        <SummaryRow label="IGST" amount={fmtIN(invoice.igst)} />
      ) : (
        <>
          <SummaryRow label="CGST" amount={fmtIN(invoice.cgst)} />
          <SummaryRow label="SGST" amount={fmtIN(invoice.sgst)} />
        </>
      )}

      {Number(invoice.tcsAmount) > 0 ? (
        <SummaryRow label="TCS" amount={fmtIN(invoice.tcsAmount)} />
      ) : null}

      {Number(invoice.roundOff) !== 0 ? (
        <SummaryRow label="Round Off" amount={fmtIN(invoice.roundOff)} />
      ) : null}

      <TotalsRow
        cells={[
          { width: SPAN_FIRST_SEVEN, content: "TOTAL", align: "right" },
          { width: RATE_W },
          {
            width: AMOUNT_W,
            content: `${invoice.currency} ${fmtIN(totalAmount)}`,
            align: "right",
          },
        ]}
      />

      <Text
        style={[
          s.band,
          { borderTopWidth: 1, borderTopColor: "#000", borderBottomWidth: 0 },
        ]}
      >
        <Text style={s.bold}>Amount in Words: </Text>
        {amtWords}
      </Text>

      <View style={s.footer}>
        <View>
          <Text style={[s.bold, { fontSize: 8 }]}>Bank Details:</Text>
          <Text style={{ fontSize: 7.5 }}>Bank: HDFC Bank</Text>
          <Text style={{ fontSize: 7.5 }}>A/c No: As per Company Records</Text>
          <Text style={{ fontSize: 7.5 }}>IFSC: As per Company Records</Text>
          <Text style={{ fontSize: 7.5 }}>Branch: Mumbai</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[s.bold, { fontSize: 7.5 }]}>
            For {company.companyName}
          </Text>
          <View style={{ height: 40 }} />
          <Text style={{ fontSize: 7.5 }}>Authorised Signatory</Text>
        </View>
      </View>

      <Text style={s.disclaimer}>
        This is a computer generated invoice. | Subject to Mumbai Jurisdiction.
      </Text>
    </BorderedDocument>
  );
}
