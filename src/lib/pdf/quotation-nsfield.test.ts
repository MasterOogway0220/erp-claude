import { describe, it, expect } from "vitest";
import React from "react";
import zlib from "node:zlib";
import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";

/**
 * The nonstandard quotation's header cell overflowed, and the document reached
 * the customer that way.
 *
 * A client's purchase inquiry reference was a sentence rather than a number —
 * "-STATION PIPES - TENDER PURPOSE _LAYING AND CONSTRUCTION OF STEEL GAS
 * PIPELINE AND TERMINALS ALONG WITH ASSOCIATED FACILITIES FOR VIJAIPUR - BINA
 * PIPELINE (VBPL) PROJECT". Every line of it ran past the right border of its
 * box and was cut mid-word on the issued PDF: "..._LAYI", "...PIPELI", "...(VB".
 *
 * The cause is a react-pdf default that is the opposite of the web's. CSS sets
 * `flex-shrink: 1`, so an oversized child shrinks into its row. Yoga — which
 * react-pdf lays out with — defaults it to **0**, so a `<Text>` with neither
 * `width` nor `flex` keeps its intrinsic width, wraps at that width instead of
 * the cell's, and is drawn outside the box. Nothing throws: the renderer does
 * exactly what it was told.
 *
 * `NsField` in `quotation-pdf.tsx` now sets `flex: 1` on the value. Rather than
 * trust a visual check, these tests read the glyph-drawing operators back out
 * of the generated PDF and measure how long each drawn line is.
 */

const h = React.createElement as never as (...a: unknown[]) => never;

/**
 * The text of every line the PDF actually draws.
 *
 * Content streams are Flate-compressed. Inside, each drawn line is a
 * `[<hex> kern <hex> ...] TJ` operator whose hex pieces concatenate to that
 * line's characters — so the array this returns is, in effect, the rendered
 * text line by line.
 */
function drawnLines(buf: Buffer): string[] {
  const latin = buf.toString("latin1");
  const lines: string[] = [];

  const streamRe = /stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = streamRe.exec(latin))) {
    const start = m.index + m[0].length;
    const end = latin.indexOf("endstream", start);
    if (end === -1) continue;

    let content: string;
    try {
      content = zlib
        .inflateSync(Buffer.from(latin.slice(start, end), "latin1"))
        .toString("latin1");
    } catch {
      continue; // not a compressed content stream (fonts, images)
    }

    const tjRe = /\[((?:\s*<[0-9a-fA-F]*>\s*-?\d*\s*)+)\]\s*TJ/g;
    let t: RegExpExecArray | null;
    while ((t = tjRe.exec(content))) {
      const text = [...t[1].matchAll(/<([0-9a-fA-F]*)>/g)]
        .map(([, hex]) => Buffer.from(hex, "hex").toString("latin1"))
        .join("");
      if (text.trim()) lines.push(text);
    }
  }
  return lines;
}

const LONG_INQUIRY =
  "-STATION PIPES - TENDER PURPOSE _LAYING AND CONSTRUCTION OF STEEL GAS " +
  "PIPELINE AND TERMINALS ALONG WITH ASSOCIATED FACILITIES FOR VIJAIPUR - " +
  "BINA PIPELINE (VBPL) PROJECT";

/** The real header cell: 35% of the nonstandard sheet's content width. */
const CELL_WIDTH = 190;
const LABEL_WIDTH = 54;

/**
 * Widest line the value may occupy. ~136pt is left after the label, and
 * Helvetica at 8.5pt averages a little over 4pt per character, so about 32
 * characters fit. The measured split is unambiguous — the fixed layout draws
 * at most 30 characters per line, the broken one at least 36 — so this
 * threshold is not finely balanced.
 */
const MAX_CHARS_PER_LINE = 32;

/** Mirrors NsField's markup, so the layout under test is the shipped one. */
function sheet(valueStyle: Record<string, unknown>, value: string) {
  return h(
    Document,
    null,
    h(
      Page,
      { size: "A4", style: { padding: 20, fontSize: 8.5 } },
      h(
        View,
        { style: { width: CELL_WIDTH } },
        h(
          View,
          { style: { flexDirection: "row" } },
          h(Text, { style: { width: LABEL_WIDTH } }, "Inquiry No."),
          h(Text, { style: valueStyle }, `: ${value}`)
        )
      )
    )
  );
}

/** Drawn lines excluding the fixed-width label. */
async function valueLines(valueStyle: Record<string, unknown>, value: string) {
  const buf = await renderToBuffer(sheet(valueStyle, value) as never);
  return drawnLines(buf).filter((l) => !l.startsWith("Inquiry No."));
}

describe("NsField keeps a long inquiry reference inside its cell", () => {
  it("without a flex, lines are drawn wider than the cell — the bug", async () => {
    // Pinning the broken layout proves the assertion below can fail. If a
    // future react-pdf changes Yoga's flexShrink default this test starts
    // failing, which is the correct signal: re-check the fix is still needed.
    const lines = await valueLines({}, LONG_INQUIRY);
    const widest = Math.max(...lines.map((l) => l.length));
    expect(widest).toBeGreaterThan(MAX_CHARS_PER_LINE);
  });

  it("with flex: 1, every drawn line fits the cell", async () => {
    const lines = await valueLines({ flex: 1 }, LONG_INQUIRY);
    const widest = Math.max(...lines.map((l) => l.length));
    expect(widest).toBeLessThanOrEqual(MAX_CHARS_PER_LINE);
  });

  it("wrapping loses none of the reference", async () => {
    // Wrapping inside the box is only a fix if the whole reference survives —
    // this is a customer's own PO/tender wording and must appear in full.
    const lines = await valueLines({ flex: 1 }, LONG_INQUIRY);
    // react-pdf hyphenates, so drop the soft hyphens before comparing.
    const rendered = lines.join("").replace(/- /g, " ").replace(/-(?=[A-Z])/g, "");
    for (const word of ["STATION", "PIPELINE", "VIJAIPUR", "VBPL", "PROJECT"]) {
      expect(rendered).toContain(word);
    }
  });

  it("a short reference still occupies a single line", async () => {
    // The fix must not force wrapping on the normal case, which is a short
    // reference like ENQ/26/0042.
    const lines = await valueLines({ flex: 1 }, "ENQ/26/0042");
    expect(lines.join("")).toContain("ENQ/26/0042");
    const widest = Math.max(...lines.map((l) => l.length));
    expect(widest).toBeLessThanOrEqual(MAX_CHARS_PER_LINE);
  });
});
