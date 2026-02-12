import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Register fonts (using default fonts)
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    borderBottom: "2 solid #000",
    paddingBottom: 10,
  },
  companyName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  companyAddress: {
    fontSize: 8,
    color: "#666",
    marginBottom: 2,
  },
  quotationTitle: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  section: {
    marginBottom: 15,
  },
  row: {
    flexDirection: "row",
    marginBottom: 3,
  },
  col50: {
    width: "50%",
  },
  label: {
    fontWeight: "bold",
    marginRight: 5,
  },
  table: {
    marginTop: 10,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    padding: 5,
    fontWeight: "bold",
    fontSize: 8,
    borderBottom: "1 solid #000",
  },
  tableRow: {
    flexDirection: "row",
    padding: 5,
    borderBottom: "0.5 solid #ccc",
    fontSize: 8,
  },
  tableCell: {
    flex: 1,
  },
  totalRow: {
    flexDirection: "row",
    padding: 5,
    fontWeight: "bold",
    backgroundColor: "#f9f9f9",
    marginTop: 5,
  },
  terms: {
    marginTop: 15,
    fontSize: 8,
  },
  termItem: {
    marginBottom: 5,
    flexDirection: "row",
  },
  termNumber: {
    width: 30,
    fontWeight: "bold",
  },
  termContent: {
    flex: 1,
  },
  footer: {
    marginTop: 20,
    fontSize: 7,
    color: "#666",
    textAlign: "center",
    borderTop: "1 solid #ccc",
    paddingTop: 10,
  },
});

interface QuotationPDFProps {
  quotation: any;
  hidePricing?: boolean;
}

// Export quotation notes from PRD Appendix C
const exportNotes = [
  "Prices are subject to review if items are deleted or if quantities are changed.",
  "This quotation is subject to confirmation at the time of order placement.",
  "Invoicing shall be based on the actual quantity supplied at the agreed unit rate.",
  "Shipping date will be calculated based on the number of business days after receipt of the techno-commercial Purchase Order (PO).",
  "Supply shall be made as close as possible to the requested quantity in the fixed lengths indicated.",
  "Once an order is placed, it cannot be cancelled under any circumstances.",
  "The quoted specification complies with the standard practice of the specification, without supplementary requirements (unless otherwise specifically stated in the offer).",
  "Reduction in quantity after placement of order will not be accepted. Any increase in quantity will be subject to our acceptance.",
  "In case of any changes in Government duties, taxes, or policies, the rates are liable to revision.",
];

const QuotationSheet: React.FC<{ quotation: any; hidePricing: boolean; sheetTitle: string }> = ({
  quotation,
  hidePricing,
  sheetTitle,
}) => {
  const totalAmount = quotation.items.reduce(
    (sum: number, item: any) => sum + parseFloat(item.amount || 0),
    0
  );
  const totalWeight = quotation.items.reduce(
    (sum: number, item: any) => sum + parseFloat(item.totalWeightMT || 0),
    0
  );

  const isExport = quotation.quotationType === "EXPORT";
  const isBOM = quotation.quotationType === "BOM";

  return (
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.companyName}>ERP</Text>
        <Text style={styles.companyAddress}>
          1210/1211, Prasad Chambers, Tata Road no. 2, Opera House, Charni Road (E)
        </Text>
        <Text style={styles.companyAddress}>Mumbai - 400004, India</Text>
        <Text style={styles.companyAddress}>
          Email: info@npspipe.com | Phone: +91-22-2367-XXXX
        </Text>
      </View>

      {/* Quotation Title */}
      <Text style={styles.quotationTitle}>{sheetTitle}</Text>

      {/* Quotation Info */}
      <View style={styles.section}>
        <View style={styles.row}>
          <View style={styles.col50}>
            <Text>
              <Text style={styles.label}>Quotation No.:</Text> {quotation.quotationNo}
            </Text>
            <Text>
              <Text style={styles.label}>Date:</Text>{" "}
              {new Date(quotation.quotationDate).toLocaleDateString()}
            </Text>
            {quotation.validUpto && (
              <Text>
                <Text style={styles.label}>Valid Until:</Text>{" "}
                {new Date(quotation.validUpto).toLocaleDateString()}
              </Text>
            )}
          </View>
          <View style={styles.col50}>
            <Text>
              <Text style={styles.label}>Currency:</Text> {quotation.currency}
            </Text>
            <Text>
              <Text style={styles.label}>Type:</Text> {quotation.quotationType}
            </Text>
            {quotation.preparedBy && (
              <Text>
                <Text style={styles.label}>Prepared By:</Text>{" "}
                {quotation.preparedBy.name}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Customer Info */}
      <View style={styles.section}>
        <Text style={styles.label}>TO:</Text>
        <Text>{quotation.customer.name}</Text>
        {quotation.customer.addressLine1 && (
          <Text>{quotation.customer.addressLine1}</Text>
        )}
        {quotation.customer.city && (
          <Text>
            {quotation.customer.city}, {quotation.customer.state}{" "}
            {quotation.customer.pincode}
          </Text>
        )}
        {quotation.customer.gstNo && (
          <Text>
            <Text style={styles.label}>GST No.:</Text> {quotation.customer.gstNo}
          </Text>
        )}
      </View>

      {/* Items Table - Different formats for DOMESTIC, EXPORT, BOM */}
      <View style={styles.table}>
        {/* EXPORT Format - Rich text item descriptions */}
        {isExport && (
          <>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { width: 30 }]}>S/N</Text>
              <Text style={[styles.tableCell, { flex: 3 }]}>Item Description</Text>
              <Text style={[styles.tableCell, { width: 50 }]}>Qty (Mtr)</Text>
              <Text style={[styles.tableCell, { width: 60 }]}>Rate</Text>
              <Text style={[styles.tableCell, { width: 70 }]}>Amount</Text>
            </View>
            {quotation.items.map((item: any) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: 30 }]}>{item.sNo}</Text>
                <View style={[styles.tableCell, { flex: 3 }]}>
                  {item.itemDescription ? (
                    <Text>{item.itemDescription}</Text>
                  ) : (
                    <>
                      <Text>
                        {item.product} - {item.material}
                      </Text>
                      <Text style={{ fontSize: 7, color: "#666" }}>
                        SIZE: {item.sizeLabel} | ENDS: {item.ends}
                      </Text>
                      {item.tagNo && (
                        <Text style={{ fontSize: 7, color: "#666" }}>
                          TAG NO: {item.tagNo}
                        </Text>
                      )}
                      {item.drawingRef && (
                        <Text style={{ fontSize: 7, color: "#666" }}>
                          DWG REF: {item.drawingRef}
                        </Text>
                      )}
                      {item.certificateReq && (
                        <Text style={{ fontSize: 7, color: "#666" }}>
                          CERT: {item.certificateReq}
                        </Text>
                      )}
                    </>
                  )}
                </View>
                <Text style={[styles.tableCell, { width: 50 }]}>
                  {parseFloat(item.quantity).toFixed(3)}
                </Text>
                <Text style={[styles.tableCell, { width: 60 }]}>
                  {hidePricing ? "QUOTED" : parseFloat(item.unitRate).toFixed(2)}
                </Text>
                <Text style={[styles.tableCell, { width: 70 }]}>
                  {hidePricing ? "QUOTED" : parseFloat(item.amount).toFixed(2)}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* BOM Format - With component positions and drawing refs */}
        {isBOM && (
          <>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { width: 25 }]}>S/N</Text>
              <Text style={[styles.tableCell, { width: 40 }]}>Pos.</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>Product/Material</Text>
              <Text style={[styles.tableCell, { width: 60 }]}>Size</Text>
              <Text style={[styles.tableCell, { width: 45 }]}>Qty</Text>
              <Text style={[styles.tableCell, { width: 50 }]}>Rate</Text>
              <Text style={[styles.tableCell, { width: 60 }]}>Amount</Text>
            </View>
            {quotation.items.map((item: any) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: 25 }]}>{item.sNo}</Text>
                <Text style={[styles.tableCell, { width: 40 }]}>
                  {item.componentPosition || "—"}
                </Text>
                <View style={[styles.tableCell, { flex: 2 }]}>
                  <Text>
                    {item.itemType || "Pipe"} - {item.product}
                  </Text>
                  <Text style={{ fontSize: 7, color: "#666" }}>
                    {item.material}
                  </Text>
                  {item.drawingRef && (
                    <Text style={{ fontSize: 7, color: "#666" }}>
                      Dwg: {item.drawingRef}
                    </Text>
                  )}
                  {item.wtType && (
                    <Text style={{ fontSize: 7, color: "#666" }}>
                      WT Type: {item.wtType}
                    </Text>
                  )}
                  {item.tubeLength && item.tubeCount && (
                    <Text style={{ fontSize: 7, color: "#666" }}>
                      {item.tubeCount} tubes × {item.tubeLength} each
                    </Text>
                  )}
                </View>
                <View style={[styles.tableCell, { width: 60 }]}>
                  <Text>{item.sizeLabel}</Text>
                  {item.ends && (
                    <Text style={{ fontSize: 7, color: "#666" }}>
                      {item.ends}
                    </Text>
                  )}
                </View>
                <Text style={[styles.tableCell, { width: 45 }]}>
                  {parseFloat(item.quantity).toFixed(3)}
                </Text>
                <Text style={[styles.tableCell, { width: 50 }]}>
                  {parseFloat(item.unitRate).toFixed(2)}
                </Text>
                <Text style={[styles.tableCell, { width: 60 }]}>
                  {parseFloat(item.amount).toFixed(2)}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* DOMESTIC Format - Standard table */}
        {!isExport && !isBOM && (
          <>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { width: 30 }]}>S/N</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>Product/Material</Text>
              <Text style={[styles.tableCell, { flex: 1.5 }]}>Size</Text>
              <Text style={[styles.tableCell, { width: 50 }]}>Qty (Mtr)</Text>
              <Text style={[styles.tableCell, { width: 60 }]}>Rate</Text>
              <Text style={[styles.tableCell, { width: 70 }]}>Amount</Text>
            </View>
            {quotation.items.map((item: any) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: 30 }]}>{item.sNo}</Text>
                <View style={[styles.tableCell, { flex: 2 }]}>
                  <Text>{item.product || "—"}</Text>
                  <Text style={{ fontSize: 7, color: "#666" }}>
                    {item.material || ""}
                  </Text>
                </View>
                <View style={[styles.tableCell, { flex: 1.5 }]}>
                  <Text>{item.sizeLabel || "—"}</Text>
                  {item.ends && (
                    <Text style={{ fontSize: 7, color: "#666" }}>
                      Ends: {item.ends}
                    </Text>
                  )}
                </View>
                <Text style={[styles.tableCell, { width: 50 }]}>
                  {parseFloat(item.quantity).toFixed(3)}
                </Text>
                <Text style={[styles.tableCell, { width: 60 }]}>
                  {hidePricing ? "QUOTED" : parseFloat(item.unitRate).toFixed(2)}
                </Text>
                <Text style={[styles.tableCell, { width: 70 }]}>
                  {hidePricing ? "QUOTED" : parseFloat(item.amount).toFixed(2)}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Totals */}
        {!hidePricing && (
          <View style={styles.totalRow}>
            <Text style={[styles.tableCell, { flex: 1 }]}>TOTAL:</Text>
            <Text style={[styles.tableCell, { width: 70 }]}>
              {quotation.currency} {totalAmount.toFixed(2)}
            </Text>
          </View>
        )}
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 1 }]}>Total Weight:</Text>
          <Text style={[styles.tableCell, { width: 70 }]}>
            {totalWeight.toFixed(4)} MT
          </Text>
        </View>
      </View>

      {/* Terms & Conditions */}
      {quotation.terms && quotation.terms.length > 0 && (
        <View style={styles.terms}>
          <Text style={[styles.label, { marginBottom: 8 }]}>
            OFFER TERMS & CONDITIONS:
          </Text>
          {quotation.terms.map((term: any, index: number) => (
            <View key={term.id} style={styles.termItem}>
              <Text style={styles.termNumber}>{index + 1}.</Text>
              <View style={styles.termContent}>
                <Text>
                  <Text style={styles.label}>{term.termName}:</Text> {term.termValue}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Export Quotation Notes (PRD Appendix C) */}
      {isExport && (
        <View style={[styles.terms, { marginTop: 10 }]}>
          <Text style={[styles.label, { marginBottom: 8 }]}>NOTES:</Text>
          {exportNotes.map((note, index) => (
            <View key={index} style={styles.termItem}>
              <Text style={styles.termNumber}>{index + 1}.</Text>
              <Text style={styles.termContent}>{note}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text>This is a computer generated document hence not signed.</Text>
        <Text style={{ marginTop: 5, fontWeight: "bold" }}>
          YOUR ORDER WILL BE GREATLY APPRECIATED AND WILL RECEIVE OUR PROMPT AND
          CAREFUL ATTENTION.
        </Text>
        <Text style={{ marginTop: 5 }}>
          Regd. Address: 1210/1211, Prasad Chambers, Tata Road no. 2, Opera House,
          Charni Road (E), Mumbai - 400004, India
        </Text>
      </View>
    </Page>
  );
};

export const QuotationPDF: React.FC<QuotationPDFProps> = ({ quotation, hidePricing }) => {
  const isExport = quotation.quotationType === "EXPORT";

  if (isExport) {
    // Export quotations get dual sheets: Commercial (with pricing) + Technical (without)
    return (
      <Document>
        <QuotationSheet
          quotation={quotation}
          hidePricing={false}
          sheetTitle="COMMERCIAL QUOTATION"
        />
        <QuotationSheet
          quotation={quotation}
          hidePricing={true}
          sheetTitle="TECHNICAL QUOTATION"
        />
      </Document>
    );
  }

  return (
    <Document>
      <QuotationSheet
        quotation={quotation}
        hidePricing={hidePricing || false}
        sheetTitle="QUOTATION"
      />
    </Document>
  );
};
