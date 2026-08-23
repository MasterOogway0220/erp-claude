import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

/**
 * Mill Test Certificate (MTC) — the document that certifies what a batch of
 * material actually is. It is issued under EN 10204:2004 3.1, which means the
 * manufacturer's own QA department certifies the results and signs for them.
 *
 * A customer's QA will reconcile this certificate against the physical goods
 * via the **heat number** (the identifier of the steel melt), so nothing here
 * is decorative: the chemistry table proves composition, the mechanical table
 * proves strength and toughness, and each is shown against the *specified*
 * limits so a reader can verify compliance without another document.
 *
 * Reading the two result tables:
 *  - **Chemistry** — four rows per item: `min.` and `max.` are the
 *    specification limits, `H` is the result measured on the heat (the melt),
 *    `P` the result measured on the finished product. `F1` and `CEQ` are
 *    derived weldability figures, defined in the formula strip beneath.
 *  - **Mechanical** — three rows per item: `min.`, `max.`, then `P`, the
 *    measured product result. YS is yield strength, TS tensile strength, EL
 *    elongation, RA reduction of area, HB Brinell hardness. `O` is the
 *    specimen orientation and `S` its form; the Legends block spells these out
 *    on the certificate itself because inspectors read it without this file.
 *
 * Replaces ~500 lines of inline HTML built for Chromium. That builder assembled
 * the mechanical table twice and threw the first copy away, and carried
 * comments describing a rowspan problem it never solved; only the final pass
 * rendered. This is a transcription of that final pass.
 *
 * react-pdf has no rowspan. Every span here is "one cell beside N stacked
 * sub-rows", so a spanning cell is a fixed-height box and the varying columns
 * are a stack of fixed-height rows next to it. The heights must agree, which
 * is why ROW_H is a single constant rather than per-table padding.
 */

// A4 landscape at 72dpi, matching the @page rule the HTML used.
const A4_LANDSCAPE: [number, number] = [842, 595];

const GREY = "#D9D9D9";
const LINE = "#000000";

/** Height of one sub-row in the chemistry and mechanical tables. */
const ROW_H = 11;

const s = StyleSheet.create({
  page: {
    // 6mm vertical, 8mm horizontal — the margins render-pdf.ts passed Chromium.
    paddingVertical: 17,
    paddingHorizontal: 23,
    fontSize: 7.5,
    fontFamily: "Helvetica",
    color: "#000",
  },

  titleMain: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 3,
    textAlign: "center",
  },
  titleStd: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginTop: 1,
  },
  titleSub: { fontSize: 6.5, textAlign: "center", marginTop: 2 },

  // Every table cell paints all four edges. react-pdf has no border-collapse,
  // so adjacent cells double the rule; at 0.5pt the doubled line still reads as
  // a single hairline on paper, and it keeps every cell independently
  // positioned — which the stacked-span layout below depends on.
  cell: {
    borderWidth: 0.5,
    borderColor: LINE,
    borderStyle: "solid",
    paddingVertical: 1,
    paddingHorizontal: 2,
    fontSize: 6.5,
    justifyContent: "center",
  },
  th: {
    backgroundColor: GREY,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  sectionHdr: {
    backgroundColor: GREY,
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    letterSpacing: 3,
    textAlign: "center",
    paddingVertical: 2,
  },

  row: { flexDirection: "row" },
  c: { textAlign: "center" },
  b: { fontFamily: "Helvetica-Bold" },
  i: { fontFamily: "Helvetica-Oblique" },

  formula: {
    borderWidth: 0.5,
    borderColor: LINE,
    borderStyle: "solid",
    borderTopWidth: 0,
    fontSize: 6.5,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  certStmt: {
    borderWidth: 0.5,
    borderColor: LINE,
    borderStyle: "solid",
    fontSize: 7,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginTop: 2,
  },
  footerBar: {
    borderWidth: 0.5,
    borderColor: LINE,
    borderStyle: "solid",
    fontSize: 6,
    textAlign: "center",
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginTop: 2,
    lineHeight: 1.3,
  },
  fmtRef: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6,
    marginTop: 2,
  },
});

// ─── Value formatting ─────────────────────────────────────────────────────────

/**
 * Significant-digit formatting: render to `maxDec` places then strip trailing
 * zeros back to `minDec`. A chemistry figure of 0.170 reads as 0.17, but 0.00
 * stays 0.00 rather than collapsing to 0 — analysts read the precision as a
 * statement about the measurement.
 */
function v(val: unknown, minDec = 2, maxDec = 3): string {
  if (val === null || val === undefined || val === "") return "";
  const n = typeof val === "number" ? val : parseFloat(String(val));
  if (isNaN(n)) return String(val);
  let out = n.toFixed(maxDec);
  if (maxDec > minDec) {
    const dot = out.indexOf(".");
    if (dot >= 0) {
      let end = out.length;
      while (end > dot + minDec + 1 && out[end - 1] === "0") end--;
      out = out.substring(0, end);
    }
  }
  return out;
}

function fmtDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}-${d.getFullYear()}`;
}

const t = (val: unknown): string =>
  val === null || val === undefined ? "" : String(val);

// ─── Data shapes ──────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

export interface MtcCompany {
  companyName?: string | null;
  regAddressLine1?: string | null;
  regAddressLine2?: string | null;
  regCity?: string | null;
  regPincode?: string | null;
  regState?: string | null;
  regCountry?: string | null;
  telephoneNo?: string | null;
  fax?: string | null;
  worksAddress?: string | null;
}

export interface MtcCertificate {
  certificateNo?: string | null;
  certificateDate?: Date | string | null;
  customerName?: string | null;
  poNo?: string | null;
  quotationNo?: string | null;
  poDate?: Date | string | null;
  projectName?: string | null;
  otherReference?: string | null;
  materialSpec?: string | null;
  startingMaterial?: string | null;
  additionalRequirement?: string | null;
  heatTreatment?: string | null;
  notes?: string | null;
  remarks?: string | null;
  reviewedBy?: string | null;
  witnessedBy?: string | null;
  revision?: number | null;
  items?: Row[];
}

export interface MechProp {
  name: string;
  unit: string | null;
}

const g = (row: Row | null | undefined, key: string): unknown =>
  row ? row[key] : undefined;

// ─── Small building blocks ────────────────────────────────────────────────────

function Cell({
  children,
  width,
  flex,
  height,
  header,
  bold,
  italic,
  align = "center",
  grey,
  fontSize,
}: {
  children?: React.ReactNode;
  width?: string;
  flex?: number;
  height?: number;
  header?: boolean;
  bold?: boolean;
  italic?: boolean;
  align?: "center" | "left" | "right";
  grey?: boolean;
  fontSize?: number;
}) {
  return (
    <View
      style={[
        s.cell,
        width ? { width } : {},
        flex ? { flexGrow: flex, flexBasis: 0 } : {},
        height ? { height } : {},
        header ? s.th : {},
        grey ? { backgroundColor: GREY } : {},
      ]}
    >
      <Text
        style={[
          { textAlign: align },
          bold || header ? s.b : {},
          italic ? s.i : {},
          fontSize ? { fontSize } : {},
        ]}
      >
        {children ?? " "}
      </Text>
    </View>
  );
}

// ─── Chemical composition ─────────────────────────────────────────────────────

/**
 * Four sub-rows per item — min., max., H, P — with ITEM NO. and HEAT NO.
 * spanning all four. The spanning cells are fixed at 4 x ROW_H and the varying
 * columns are stacked beside them.
 */
function ChemicalTable({
  items,
  elements,
}: {
  items: Row[];
  elements: string[];
}) {
  if (elements.length === 0) return null;

  // The element columns share whatever the three fixed columns leave.
  const elemFlex = 87.5 / elements.length;
  const LABEL_FLEX = 2.5;

  const valueRow = (
    label: React.ReactNode,
    read: (r: Row | undefined) => string,
    resultsByElement: Map<string, Row>,
    bold?: boolean,
    italic?: boolean
  ) => (
    <View style={s.row}>
      <Cell flex={LABEL_FLEX} height={ROW_H} bold={bold} italic={italic}>
        {label}
      </Cell>
      {elements.map((el, i) => (
        <Cell key={i} flex={elemFlex} height={ROW_H}>
          {read(resultsByElement.get(el))}
        </Cell>
      ))}
    </View>
  );

  return (
    <View>
      <View style={s.row}>
        <View style={[s.cell, s.sectionHdr, { width: "100%" }]}>
          <Text style={s.sectionHdr}>
            C H E M I C A L   C O M P O S I T I O N
          </Text>
        </View>
      </View>

      <View style={s.row}>
        <Cell width="4%" header>ITEM</Cell>
        <Cell width="6%" header>HEAT NO.</Cell>
        <Cell flex={LABEL_FLEX} header>%</Cell>
        {elements.map((el, i) => (
          <Cell key={i} flex={elemFlex} header>
            {el}
          </Cell>
        ))}
      </View>

      {items.map((item, idx) => {
        const results = (g(item, "chemicalResults") as Row[]) || [];
        const byElement = new Map<string, Row>(
          results.map((r) => [String(g(r, "element")), r])
        );
        const span = ROW_H * 4;

        return (
          <View key={idx} style={s.row} wrap={false}>
            <Cell width="4%" height={span} bold grey>
              {t(g(item, "itemNo"))}
            </Cell>
            <Cell width="6%" height={span}>
              {t(g(item, "heatNo"))}
            </Cell>
            <View style={{ flexGrow: 1, flexBasis: 0 }}>
              {valueRow(
                "min.",
                (r) => (g(r, "minValue") != null ? v(g(r, "minValue"), 0, 3) : "--"),
                byElement,
                false,
                true
              )}
              {valueRow(
                "max.",
                (r) => (g(r, "maxValue") != null ? v(g(r, "maxValue"), 0, 3) : "--"),
                byElement,
                false,
                true
              )}
              {valueRow(
                "H",
                (r) => (g(r, "heatResult") != null ? v(g(r, "heatResult"), 2, 3) : ""),
                byElement,
                true
              )}
              {valueRow(
                "P",
                (r) =>
                  g(r, "productResult") != null
                    ? v(g(r, "productResult"), 2, 3)
                    : "",
                byElement,
                true
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Mechanical properties ────────────────────────────────────────────────────

/**
 * Three sub-rows per item — min., max., P. ITEM NO., HEAT NO., the orientation
 * and specimen columns, the impact block and the client item code all span the
 * three; the label column and the tensile/hardness measurements vary per row.
 *
 * Those two varying groups are not adjacent — O and S sit between them — so
 * this renders as two independent stacks of three fixed-height rows, which
 * line up because both use ROW_H.
 */
function MechanicalTable({
  items,
  hasImpact,
}: {
  items: Row[];
  hasImpact: boolean;
}) {
  // Column widths total 100% in each variant.
  const W = hasImpact
    ? {
        item: "4%", heat: "8%", label: "5%", o: "3%", s: "3%",
        meas: "44%", // YS TS EL RA HBind (1) (2) (3)
        impSize: "6%", imp1: "4%", imp2: "4%", imp3: "4%", impAvg: "5%",
        client: "10%",
      }
    : {
        item: "5%", heat: "10%", label: "6%", o: "4%", s: "4%",
        meas: "56%",
        impSize: "0%", imp1: "0%", imp2: "0%", imp3: "0%", impAvg: "0%",
        client: "15%",
      };

  // Proportions inside the measurement stack: YS TS EL RA | HB-indicator (1) (2) (3)
  const M = { ys: 9, ts: 9, el: 8, ra: 8, hbInd: 4, hb1: 6, hb2: 6, hb3: 6 };
  const span = ROW_H * 3;

  /** Property lookup is by keyword because names vary by specification. */
  const finder = (results: Row[]) => (keyword: string): Row | null => {
    for (const r of results) {
      if (String(g(r, "propertyName") || "").toLowerCase().includes(keyword)) {
        return r;
      }
    }
    return null;
  };

  return (
    <View>
      {/* Row 1 — section header, plus the raw/finished material declaration. */}
      <View style={s.row}>
        <View
          style={[
            s.cell,
            { width: hasImpact ? "79%" : "72%", backgroundColor: GREY },
          ]}
        >
          <Text style={s.sectionHdr}>
            M E C H A N I C A L   P R O P E R T I E S
          </Text>
        </View>
        <Cell width={hasImpact ? "10%" : "14%"} grey fontSize={6}>
          on Raw Material
        </Cell>
        <Cell width={hasImpact ? "11%" : "14%"} grey fontSize={6}>
          {"✓ on Finished Material"}
        </Cell>
      </View>

      {/* Row 2 — group headers. */}
      <View style={s.row}>
        <Cell
          width={`${parseFloat(W.item) + parseFloat(W.heat)}%`}
          bold
          fontSize={7}
        >
          TENSILE PROPERTIES
        </Cell>
        <Cell
          width={`${
            parseFloat(W.label) +
            parseFloat(W.o) +
            parseFloat(W.s) +
            parseFloat(W.meas) * ((M.ys + M.ts + M.el + M.ra) / 56)
          }%`}
        />
        <Cell
          width={`${
            parseFloat(W.meas) * ((M.hbInd + M.hb1 + M.hb2 + M.hb3) / 56)
          }%`}
          bold
          fontSize={7}
        >
          HARDNESS
        </Cell>
        {hasImpact ? (
          <Cell
            width={`${
              parseFloat(W.impSize) +
              parseFloat(W.imp1) +
              parseFloat(W.imp2) +
              parseFloat(W.imp3) +
              parseFloat(W.impAvg)
            }%`}
            bold
            fontSize={7}
          >
            IMPACT PROPERTIES
          </Cell>
        ) : null}
        <Cell width={W.client} bold fontSize={7}>
          Client
        </Cell>
      </View>

      {/* Row 3 — test method strip. */}
      <View style={s.row}>
        <Cell width={W.item} header fontSize={6}>TEST METHOD</Cell>
        <Cell width={W.heat} header />
        <Cell width={W.label} header fontSize={6}>ASTM A370</Cell>
        <Cell width={W.o} header />
        <Cell width={W.s} header />
        <View style={[s.row, { width: W.meas }]}>
          <Cell flex={M.ys} header fontSize={6}>ROOM TEMP.</Cell>
          <Cell flex={M.ts + M.el + M.ra} header />
          <Cell flex={M.hbInd + M.hb1 + M.hb2 + M.hb3} header />
        </View>
        {hasImpact ? (
          <>
            <Cell width={W.impSize} header fontSize={6}>TEMPERATURE</Cell>
            <Cell
              width={`${
                parseFloat(W.imp1) +
                parseFloat(W.imp2) +
                parseFloat(W.imp3) +
                parseFloat(W.impAvg)
              }%`}
              header
            />
          </>
        ) : null}
        <Cell width={W.client} header fontSize={6}>Item Code</Cell>
      </View>

      {/* Row 4 — column headers. */}
      <View style={s.row}>
        <Cell width={W.item} header>ITEM NO.</Cell>
        <Cell width={W.heat} header>HEAT NO.</Cell>
        <Cell width={W.label} header />
        <Cell width={W.o} header>O</Cell>
        <Cell width={W.s} header>S</Cell>
        <View style={[s.row, { width: W.meas }]}>
          <Cell flex={M.ys} header>YS MPa</Cell>
          <Cell flex={M.ts} header>TS MPa</Cell>
          <Cell flex={M.el} header>EL %</Cell>
          <Cell flex={M.ra} header>RA %</Cell>
          <Cell flex={M.hbInd} header />
          <Cell flex={M.hb1} header>(1)</Cell>
          <Cell flex={M.hb2} header>(2)</Cell>
          <Cell flex={M.hb3} header>(3)</Cell>
        </View>
        {hasImpact ? (
          <>
            <Cell width={W.impSize} header>Size (mm)</Cell>
            <Cell width={W.imp1} header>(1)</Cell>
            <Cell width={W.imp2} header>(2)</Cell>
            <Cell width={W.imp3} header>(3)</Cell>
            <Cell width={W.impAvg} header>AVG.</Cell>
          </>
        ) : null}
        <Cell width={W.client} header />
      </View>

      {items.map((item, idx) => {
        const mech = (g(item, "mechanicalResults") as Row[]) || [];
        const find = finder(mech);
        const ys = find("yield");
        const ts = find("tensile");
        const el = find("elongation");
        const ra = find("reduction");
        const hb = find("hardness");
        // Hardness is taken as three readings; extra rows named "hardness"
        // carry readings 2 and 3.
        const hbAll = mech.filter((r) =>
          String(g(r, "propertyName") || "").toLowerCase().includes("hardness")
        );
        const impact = ((g(item, "impactResults") as Row[]) || [])[0] || null;

        const limitRow = (key: "minValue" | "maxValue") => (
          <View style={s.row}>
            <Cell flex={M.ys} height={ROW_H}>
              {g(ys, key) != null ? v(g(ys, key), 0, 0) : "--"}
            </Cell>
            <Cell flex={M.ts} height={ROW_H}>
              {g(ts, key) != null ? v(g(ts, key), 0, 0) : "--"}
            </Cell>
            <Cell flex={M.el} height={ROW_H}>
              {g(el, key) != null ? v(g(el, key), 0, 0) : "--"}
            </Cell>
            <Cell flex={M.ra} height={ROW_H}>
              {g(ra, key) != null ? v(g(ra, key), 0, 0) : "--"}
            </Cell>
            {/* Hardness has no minimum; its maximum spans the four columns. */}
            <Cell
              flex={M.hbInd + M.hb1 + M.hb2 + M.hb3}
              height={ROW_H}
            >
              {key === "maxValue" && g(hb, "maxValue") != null
                ? v(g(hb, "maxValue"), 0, 0)
                : "--"}
            </Cell>
          </View>
        );

        return (
          <View key={idx} style={s.row} wrap={false}>
            <Cell width={W.item} height={span} bold grey>
              {t(g(item, "itemNo"))}
            </Cell>
            <Cell width={W.heat} height={span}>
              {t(g(item, "heatNo"))}
            </Cell>

            {/* Label stack — min. / max. / P */}
            <View style={{ width: W.label }}>
              <Cell height={ROW_H} italic>min.</Cell>
              <Cell height={ROW_H} italic>max.</Cell>
              <Cell height={ROW_H} bold>P</Cell>
            </View>

            <Cell width={W.o} height={span}>
              {t(g(item, "orientation"))}
            </Cell>
            <Cell width={W.s} height={span}>
              {t(g(item, "specimenForm"))}
            </Cell>

            {/* Measurement stack — same three rows, different columns. */}
            <View style={{ width: W.meas }}>
              {limitRow("minValue")}
              {limitRow("maxValue")}
              <View style={s.row}>
                <Cell flex={M.ys} height={ROW_H} bold>
                  {g(ys, "result") != null ? v(g(ys, "result"), 2, 2) : ""}
                </Cell>
                <Cell flex={M.ts} height={ROW_H} bold>
                  {g(ts, "result") != null ? v(g(ts, "result"), 2, 2) : ""}
                </Cell>
                <Cell flex={M.el} height={ROW_H} bold>
                  {g(el, "result") != null ? v(g(el, "result"), 2, 2) : ""}
                </Cell>
                <Cell flex={M.ra} height={ROW_H} bold>
                  {g(ra, "result") != null ? v(g(ra, "result"), 2, 2) : ""}
                </Cell>
                {/* B = Brinell, the hardness scale these readings are on. */}
                <Cell flex={M.hbInd} height={ROW_H}>B</Cell>
                <Cell flex={M.hb1} height={ROW_H} bold>
                  {g(hbAll[0], "result") != null ? v(g(hbAll[0], "result"), 0, 0) : ""}
                </Cell>
                <Cell flex={M.hb2} height={ROW_H} bold>
                  {g(hbAll[1], "result") != null ? v(g(hbAll[1], "result"), 0, 0) : ""}
                </Cell>
                <Cell flex={M.hb3} height={ROW_H} bold>
                  {g(hbAll[2], "result") != null ? v(g(hbAll[2], "result"), 0, 0) : ""}
                </Cell>
              </View>
            </View>

            {hasImpact ? (
              <>
                <Cell width={W.impSize} height={span}>
                  {t(g(impact, "specimenSize"))}
                </Cell>
                <Cell width={W.imp1} height={span}>
                  {g(impact, "result1") != null ? v(g(impact, "result1"), 0, 0) : ""}
                </Cell>
                <Cell width={W.imp2} height={span}>
                  {g(impact, "result2") != null ? v(g(impact, "result2"), 0, 0) : ""}
                </Cell>
                <Cell width={W.imp3} height={span}>
                  {g(impact, "result3") != null ? v(g(impact, "result3"), 0, 0) : ""}
                </Cell>
                <Cell width={W.impAvg} height={span} bold>
                  {g(impact, "average") != null ? v(g(impact, "average"), 0, 0) : ""}
                </Cell>
              </>
            ) : null}

            <Cell width={W.client} height={span} fontSize={6}>
              {t(g(item, "clientItemCode"))}
            </Cell>
          </View>
        );
      })}
    </View>
  );
}

// ─── Item details ─────────────────────────────────────────────────────────────

function ItemsTable({ items }: { items: Row[] }) {
  return (
    <View>
      <View style={s.row}>
        <Cell width="4%" height={22} header>ITEM NO.</Cell>
        <Cell width="18%" height={22} header>DESCRIPTION</Cell>
        <View style={{ width: "18%" }}>
          <Cell height={11} header>CONSTRUCTION</Cell>
          <View style={s.row}>
            <Cell width="44.4%" height={11} header>TYPE</Cell>
            <Cell width="55.6%" height={11} header>STANDARD</Cell>
          </View>
        </View>
        <View style={{ width: "24%" }}>
          <Cell height={11} header>SIZE</Cell>
          <View style={s.row}>
            <Cell width="29.2%" height={11} header>OD 1</Cell>
            <Cell width="29.2%" height={11} header>WT 1</Cell>
            <Cell width="20.8%" height={11} header>OD 2</Cell>
            <Cell width="20.8%" height={11} header>WT 2</Cell>
          </View>
        </View>
        <Cell width="4%" height={22} header>QTY. PCS.</Cell>
        <Cell width="8%" height={22} header>HEAT NO.</Cell>
        <Cell width="8%" height={22} header>RAW MATERIAL</Cell>
      </View>

      {items.map((item, i) => (
        <View key={i} style={s.row} wrap={false}>
          <Cell width="4%">{t(g(item, "itemNo"))}</Cell>
          <Cell width="18%" align="left">{t(g(item, "description"))}</Cell>
          <Cell width="8%">{t(g(item, "constructionType"))}</Cell>
          <Cell width="10%">{t(g(item, "dimensionStandard"))}</Cell>
          <Cell width="7%">{t(g(item, "sizeOD1"))}</Cell>
          <Cell width="7%">{t(g(item, "sizeWT1"))}</Cell>
          <Cell width="5%">{g(item, "sizeOD2") ? t(g(item, "sizeOD2")) : "-"}</Cell>
          <Cell width="5%">{g(item, "sizeWT2") ? t(g(item, "sizeWT2")) : "-"}</Cell>
          <Cell width="4%">{t(g(item, "quantity"))}</Cell>
          <Cell width="8%">{t(g(item, "heatNo"))}</Cell>
          <Cell width="8%">{t(g(item, "rawMaterial"))}</Cell>
        </View>
      ))}
    </View>
  );
}

// ─── Customer detail block ────────────────────────────────────────────────────

function InfoLine({
  cells,
}: {
  cells: { width: string; text?: string; bold?: boolean }[];
}) {
  return (
    <View style={s.row}>
      {cells.map((c, i) => (
        <Cell key={i} width={c.width} align="left" bold={c.bold} fontSize={7}>
          {c.text ?? " "}
        </Cell>
      ))}
    </View>
  );
}

// ─── Legends ──────────────────────────────────────────────────────────────────

/**
 * Printed on the certificate because the result tables use single-letter codes
 * and the reader is often an inspector with only the paper in hand.
 */
const LEGENDS: [string, string, string, string, string, string][] = [
  ["O", "Orientation", "S", "Strip", "H", "Heat"],
  ["R", "Round", "RA", "Reduction Area", "P", "Product"],
  ["W", "Weld", "N", "Normalized", "L", "Longitudinal"],
  ["YS", "Yield strength", "N&T", "Normalize & Tempered", "T", "Transverse"],
  ["TS", "Tensile strength", "Q", "Quenched", "B", "Base"],
  ["EL", "Elongation", "ANL", "Annealed", "", ""],
];

// ─── Document ─────────────────────────────────────────────────────────────────

export function MtcCertificateDocument({
  certificate,
  company,
  chemElements,
  companyLogoUrl,
  isoLogoUrl,
}: {
  certificate: MtcCertificate;
  company?: MtcCompany | null;
  chemElements: string[];
  /** Absolute URLs. react-pdf fetches these at render time; an unreachable
   *  URL throws, so the caller passes an empty string rather than a guess. */
  companyLogoUrl?: string;
  isoLogoUrl?: string;
}) {
  const cert = certificate;
  const items = cert.items || [];
  const hasImpact = items.some(
    (it) => ((g(it, "impactResults") as Row[]) || []).length > 0
  );

  const footerAddr1 =
    [
      "Regd. Office:",
      company?.regAddressLine1,
      company?.regAddressLine2,
      company?.regCity ? `${company.regCity} - ${company?.regPincode || ""}` : "",
      company?.regState,
      company?.regCountry,
    ]
      .filter(Boolean)
      .join(", ") +
    (company?.telephoneNo ? ` Tel.: ${company.telephoneNo}` : "") +
    (company?.fax ? `, Fax: ${company.fax}` : "");

  const notesLines = (cert.notes || "").split("\n").filter((l) => l.trim());
  const remarksLines = (cert.remarks || "").split("\n").filter((l) => l.trim());

  return (
    <Document title={`MTC - ${cert.certificateNo || ""}`}>
      <Page size={A4_LANDSCAPE} style={s.page}>
        {/* Header */}
        <View style={[s.row, { marginBottom: 2, alignItems: "center" }]}>
          <View style={{ width: "15%" }}>
            {isoLogoUrl ? (
              // react-pdf's Image is a PDF primitive with no alt prop; the
              // a11y rule below targets DOM <img> and does not apply here.
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={isoLogoUrl} style={{ maxHeight: 60 }} />
            ) : (
              <Text style={{ fontSize: 6, color: "#666" }}>
                ISO 9001:2015{"\n"}ISO 14001:2015{"\n"}ISO 45001:2018
              </Text>
            )}
          </View>
          <View style={{ width: "70%" }}>
            <Text style={s.titleMain}>M I L L   T E S T   C E R T I F I C A T E</Text>
            <Text style={s.titleStd}>EN 10204:2004 3.1 / ISO 10474:1991 3.1</Text>
            <Text style={s.titleSub}>
              Manufacturer of Pipes, Fittings &amp; Flanges in Carbon Steel, Alloy
              Steel, Stainless Steel, Duplex Steel &amp; Nickel Alloys
            </Text>
          </View>
          <View style={{ width: "15%", alignItems: "flex-end" }}>
            {companyLogoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- see above.
              <Image src={companyLogoUrl} style={{ maxHeight: 44 }} />
            ) : (
              <Text
                style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: "#003366" }}
              >
                {company?.companyName || "NPS"}
              </Text>
            )}
          </View>
        </View>

        {/* Customer / reference block */}
        <InfoLine
          cells={[
            { width: "14%", text: "Customer" },
            { width: "36%", text: t(cert.customerName), bold: true },
            { width: "14%", text: "Certificate No." },
            { width: "22%", text: t(cert.certificateNo), bold: true },
            { width: "5%", text: "Date" },
            { width: "9%", text: fmtDate(cert.certificateDate) },
          ]}
        />
        <InfoLine
          cells={[
            { width: "14%", text: "P.O. No. / P. R. No." },
            { width: "36%", text: t(cert.poNo || cert.quotationNo) },
            { width: "14%", text: "Date" },
            { width: "27%", text: fmtDate(cert.poDate) },
            { width: "9%" },
          ]}
        />
        <InfoLine
          cells={[
            { width: "14%", text: "Project Name" },
            { width: "36%", text: t(cert.projectName) || "-" },
            { width: "14%", text: "Other Reference" },
            { width: "36%", text: t(cert.otherReference) },
          ]}
        />
        <InfoLine
          cells={[
            { width: "14%", text: "Material Specification" },
            { width: "36%", text: t(cert.materialSpec) },
            { width: "14%", text: "Starting Material" },
            { width: "36%", text: t(cert.startingMaterial) },
          ]}
        />
        <InfoLine
          cells={[
            { width: "14%", text: "Additional Requirement" },
            { width: "36%", text: t(cert.additionalRequirement) },
            { width: "14%", text: "Heat Treatment" },
            { width: "36%", text: t(cert.heatTreatment) },
          ]}
        />

        <View style={{ marginTop: 2 }}>
          <ItemsTable items={items} />
        </View>

        <View style={{ marginTop: 2 }}>
          <ChemicalTable items={items} elements={chemElements} />
        </View>
        {chemElements.length > 0 ? (
          <Text style={s.formula}>
            F1 = Cu+Ni+Cr+Mo ; CEQ = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15
          </Text>
        ) : null}

        <View style={{ marginTop: 2 }}>
          <MechanicalTable items={items} hasImpact={hasImpact} />
        </View>

        <Text style={s.certStmt}>
          We hereby certify that the material herein manufactured, sampled,
          tested &amp; inspected in accordance with the above specification and
          requirements of Purchase order.
        </Text>

        {/* Notes + legends */}
        <View style={[s.row, { marginTop: 2 }]}>
          <View
            style={[
              s.cell,
              { width: "40%", paddingVertical: 3, paddingHorizontal: 6, justifyContent: "flex-start" },
            ]}
          >
            <Text style={[s.b, { fontSize: 6.5 }]}>Notes:</Text>
            <Text style={{ fontSize: 6.5 }}>
              {notesLines.length > 0
                ? notesLines.join("\n")
                : "Visual & Dimension : Satisfactory"}
            </Text>
          </View>
          <View
            style={[
              s.cell,
              { width: "60%", paddingVertical: 3, paddingHorizontal: 4, justifyContent: "flex-start" },
            ]}
          >
            <Text style={[s.b, { fontSize: 6.5 }]}>Legends :</Text>
            {LEGENDS.map((line, i) => (
              <View key={i} style={s.row}>
                {line.map((part, j) => (
                  <Text
                    key={j}
                    style={[
                      { fontSize: 6, width: j % 2 === 0 ? "6%" : "27.3%" },
                      j % 2 === 0 ? s.b : {},
                    ]}
                  >
                    {part}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </View>

        {remarksLines.length > 0 ? (
          <View style={[s.cell, { paddingVertical: 3, paddingHorizontal: 6, marginTop: 2 }]}>
            <Text style={[s.b, { fontSize: 6.5 }]}>Remarks:</Text>
            <Text style={{ fontSize: 6.5 }}>{remarksLines.join("\n")}</Text>
          </View>
        ) : null}

        {/* Signatures */}
        <View style={[s.row, { marginTop: 15 }]}>
          <View style={{ width: "5%" }} />
          <View
            style={{
              width: "20%",
              borderBottomWidth: 0.5,
              borderBottomColor: LINE,
              borderStyle: "solid",
              paddingBottom: 2,
            }}
          >
            <Text style={{ fontSize: 6.5 }}>
              Reviewed by{cert.reviewedBy ? ` : ${cert.reviewedBy}` : " :"}
            </Text>
          </View>
          <View style={{ width: "10%" }} />
          <View
            style={{
              width: "20%",
              borderBottomWidth: 0.5,
              borderBottomColor: LINE,
              borderStyle: "solid",
              paddingBottom: 2,
            }}
          >
            <Text style={{ fontSize: 6.5 }}>
              Witnessed by{cert.witnessedBy ? ` : ${cert.witnessedBy}` : " :"}
            </Text>
          </View>
          <View style={{ width: "5%" }} />
          <Text style={{ width: "15%", fontSize: 6.5, textAlign: "center" }}>
            Auth. Signatory
          </Text>
          <View style={{ width: "5%" }} />
          <Text style={{ width: "20%", fontSize: 6.5, textAlign: "right" }}>
            Incharge (QA / QC Dept.)
          </Text>
        </View>

        <Text style={s.footerBar}>
          {footerAddr1}
          {company?.worksAddress ? `\n${company.worksAddress}` : ""}
        </Text>

        <View style={s.fmtRef}>
          <Text>Format: NPFI/QC/001-Rev.{cert.revision ?? 0}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
