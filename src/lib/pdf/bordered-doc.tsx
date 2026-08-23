import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

/**
 * Shared chrome for the "bordered form" family of documents — inspection
 * offers, length tallies, colour-code lists, criteria checklists, packing
 * lists and the like.
 *
 * These all descend from the same paper form: a 2pt box around the whole
 * sheet, the company name centred at the top, a coloured title bar, a
 * two-column reference grid, one wide item table, signature blocks, and a
 * one-line disclaimer. The HTML versions each re-declared that CSS, which is
 * why one file could hold four documents and 433 lines. Declaring it once here
 * means a new document of this family is a column list and a title.
 *
 * react-pdf has no table model, no `border-collapse` and no colspan, so the
 * table below is flexbox rows with explicit percentage widths that must total
 * 100%. Cells paint their own right and bottom edge only; the container
 * supplies the outer box, which keeps internal rules single-width instead of
 * doubling where two cells meet.
 */

// A4 at 72dpi. Landscape is the same sheet with the axes swapped.
export const A4_PORTRAIT: [number, number] = [595, 842];
export const A4_LANDSCAPE: [number, number] = [842, 595];

export const s = StyleSheet.create({
  page: {
    // The HTML used an 8mm @page margin for portrait and 5mm for landscape;
    // both round to a single value here because the outer border supplies the
    // visual inset that actually matters.
    padding: 18,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#000",
  },
  outer: { borderWidth: 2, borderColor: "#000", borderStyle: "solid" },

  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    borderStyle: "solid",
    paddingVertical: 6,
    paddingHorizontal: 10,
    textAlign: "center",
  },
  companyName: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  companyAddress: { fontSize: 6.5, color: "#444", marginTop: 1 },

  titleBar: {
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 4,
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    borderStyle: "solid",
  },

  infoGrid: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    borderStyle: "solid",
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  infoCol: { width: "50%" },
  infoRow: { flexDirection: "row", fontSize: 7.5, marginBottom: 1.5 },
  infoValue: { flex: 1 },

  th: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    paddingVertical: 4,
    paddingHorizontal: 2,
    backgroundColor: "#F5F5F5",
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    borderRightWidth: 1,
    borderRightColor: "#CCC",
    borderStyle: "solid",
  },
  td: {
    fontSize: 7.5,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#DDD",
    borderRightWidth: 1,
    borderRightColor: "#EEE",
    borderStyle: "solid",
  },

  band: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    fontSize: 7.5,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    borderStyle: "solid",
  },
  section: {
    borderTopWidth: 2,
    borderTopColor: "#000",
    borderStyle: "solid",
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#FAFAFA",
  },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 2,
    borderTopColor: "#000",
    borderStyle: "solid",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  disclaimer: {
    textAlign: "center",
    fontSize: 6,
    color: "#888",
    paddingVertical: 2,
    borderTopWidth: 1,
    borderTopColor: "#000",
    borderStyle: "solid",
  },

  bold: { fontFamily: "Helvetica-Bold" },
  mono: { fontFamily: "Courier" },
  center: { textAlign: "center" },
  right: { textAlign: "right" },
});

/** A yes/no cell. Green for yes, grey for no — matches the HTML's colouring. */
export function YesNo({ value }: { value: boolean }) {
  return value ? (
    <Text style={[s.bold, { color: "green" }]}>Yes</Text>
  ) : (
    <Text style={{ color: "#999" }}>No</Text>
  );
}

export function CompanyHeader({
  name,
  address,
  contact,
}: {
  name: string;
  address?: string;
  contact?: string;
}) {
  return (
    <View style={s.header}>
      <Text style={s.companyName}>{name}</Text>
      {address ? <Text style={s.companyAddress}>{address}</Text> : null}
      {contact ? <Text style={s.companyAddress}>{contact}</Text> : null}
    </View>
  );
}

export function TitleBar({ title, bg }: { title: string; bg: string }) {
  return <Text style={[s.titleBar, { backgroundColor: bg }]}>{title}</Text>;
}

/** One `Label   value` line inside the reference grid. Omitted when empty. */
export function InfoRow({
  label,
  value,
  labelWidth = 90,
  bold,
  color,
}: {
  label: string;
  value?: string | null;
  labelWidth?: number;
  bold?: boolean;
  color?: string;
}) {
  if (!value) return null;
  return (
    <View style={s.infoRow}>
      <Text style={[s.bold, { width: labelWidth, color: "#333" }]}>{label}</Text>
      <Text style={[s.infoValue, bold ? s.bold : {}, color ? { color } : {}]}>
        {value}
      </Text>
    </View>
  );
}

export function InfoGrid({
  left,
  right,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <View style={s.infoGrid}>
      <View style={s.infoCol}>{left}</View>
      <View style={s.infoCol}>{right}</View>
    </View>
  );
}

/**
 * A table column. `render` returns the cell body for one row; returning a
 * string is the common case, but a node is allowed so a cell can carry its own
 * colour (see `YesNo`). Widths are CSS percentages and must total 100%.
 */
export interface Column<T> {
  header: string;
  width: string;
  align?: "center" | "right";
  bold?: boolean;
  mono?: boolean;
  fontSize?: number;
  render: (row: T, index: number) => React.ReactNode;
}

export function ItemsTable<T>({
  columns,
  rows,
}: {
  columns: Column<T>[];
  rows: T[];
}) {
  return (
    <View>
      {/* `fixed` repeats the header when the table spills onto another page,
          which <thead> did for free in the HTML version. */}
      <View style={{ flexDirection: "row" }} fixed>
        {columns.map((c, i) => (
          <Text key={i} style={[s.th, { width: c.width }]}>
            {c.header}
          </Text>
        ))}
      </View>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: "row" }} wrap={false}>
          {columns.map((c, i) => {
            const body = c.render(row, r);
            const style = [
              s.td,
              { width: c.width },
              c.align === "center" ? s.center : {},
              c.align === "right" ? s.right : {},
              c.bold ? s.bold : {},
              c.mono ? s.mono : {},
              c.fontSize ? { fontSize: c.fontSize } : {},
            ];
            // A node child (a coloured <Text>) must not be nested inside a
            // <Text> that also sets width, or react-pdf lays it out inline and
            // the column width is ignored.
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
    </View>
  );
}

/**
 * The bold summary row that closes an item table.
 *
 * There is no colspan in react-pdf, so a cell that spanned five columns in the
 * HTML becomes one cell whose width is the sum of those five percentages. The
 * caller states that sum explicitly — deriving it would mean parsing the
 * percentage strings, and a wrong sum is immediately visible on the page
 * anyway (the row stops lining up with the columns above it).
 */
export function TotalsRow({
  cells,
}: {
  cells: {
    width: string;
    content?: string;
    align?: "center" | "right";
  }[];
}) {
  return (
    <View style={{ flexDirection: "row" }} wrap={false}>
      {cells.map((c, i) => (
        <Text
          key={i}
          style={[
            s.td,
            s.bold,
            {
              width: c.width,
              fontSize: 8,
              borderTopWidth: 2,
              borderTopColor: "#000",
              borderBottomWidth: 0,
            },
            c.align === "center" ? s.center : {},
            c.align === "right" ? s.right : {},
          ]}
        >
          {c.content ?? " "}
        </Text>
      ))}
    </View>
  );
}

/** A signature slot: a caption over a ruled blank. */
export function SignSlot({ label }: { label: string }) {
  return (
    <Text style={{ fontSize: 7.5 }}>
      <Text style={s.bold}>{label}</Text> ________________
    </Text>
  );
}

/** The right-hand "For <company> / <role>" block with room to sign. */
export function SignFor({
  company,
  role,
  gap = 25,
}: {
  company: string;
  role: string;
  gap?: number;
}) {
  return (
    <View style={{ alignItems: "flex-end" }}>
      <Text style={[s.bold, { fontSize: 7.5 }]}>For {company}</Text>
      <View style={{ height: gap }} />
      <Text style={{ fontSize: 7.5 }}>{role}</Text>
    </View>
  );
}

/**
 * The whole sheet: one Page, the 2pt box, and whatever the caller puts inside.
 * Documents in this family differ only in title, columns and footer, so this
 * takes the chrome and leaves the body to them.
 */
export function BorderedDocument({
  title,
  size,
  children,
}: {
  title: string;
  size: [number, number];
  children: React.ReactNode;
}) {
  return (
    <Document title={title}>
      <Page size={size} style={s.page}>
        <View style={s.outer}>{children}</View>
      </Page>
    </Document>
  );
}
