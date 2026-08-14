# src/lib/quotations/display.ts

> Two formatting helpers shared by both quotation PDF renderers, so the printed
> document never shows a blank cell or an embarrassing placeholder.

## Why this exists

A quotation is a commercial document sent to a client. Two fields kept
producing output that made it look unfinished:

- **Inquiry No.** — sales staff type whatever the customer sent. Sometimes
  that is a real reference (`RFQ-2291`, an item code, a mail subject);
  sometimes it is free text like *"require quotation"* or *"pl quote"*. The
  second kind was ending up in the PDF filename. (The printed headers
  originally used this filter too, but that hid legitimate entries the sales
  team expected to see — headers now print the inquiry no. exactly as entered,
  and the filter guards the filename only.)
- **Size** — items assembled from different sources do not all carry a
  `sizeLabel`. A missing one rendered as an empty cell, which on a printed
  table reads as a rendering fault rather than absent data.

Both renderers (the react-pdf download and the HTML email attachment) needed
identical behaviour, so the rules live here rather than in either.

## What it does

| Export | Behaviour |
|---|---|
| `displayInquiryNo(raw)` | Returns the trimmed value if it contains a digit, otherwise `""`. Used for the PDF **filename** only — headers print the raw value. |
| `displaySizeLabel(item)` | `sizeLabel`, else reconstructed from NPS + schedule, else `"-"`. |

## How it works

### `displayInquiryNo`

The test is `/\d/` — does the string contain at least one digit anywhere.

That is a heuristic, chosen deliberately over a stricter pattern. Every real
inquiry reference the company receives carries a number somewhere: an RFQ
number, a date, an item code, a mail reference. Prose placeholders do not.
A stricter format rule would reject legitimate references from clients whose
numbering nobody here controls, and the cost of a false negative (a real
reference suppressed) is higher than a false positive.

Returning `""` rather than a dash is intentional: the caller decides whether to
omit the row entirely.

### `displaySizeLabel`

Three tiers:

1. `sizeLabel` if present — the authoritative string, e.g. `6"NB X SCH 40`.
2. Reconstructed from `sizeNPS` and `schedule`. The schedule prefix is
   normalised here: stored values are inconsistent, some already carrying the
   prefix (`"Sch 40"`, `"SCH XS"`) and some bare (`"XS"`, `"STD"`). Testing
   `/^sch\b/i` before prepending avoids printing `SCH SCH 40`.
3. `"-"`, so a genuinely missing size reads as intentional.

`sizeNPS` is typed `unknown` because it arrives as a Prisma `Decimal`, a
number, or a string depending on the query path, hence the
`parseFloat(String(...))`.

## Domain notes

- **NPS / NB** — Nominal Pipe Size / Nominal Bore. The nominal internal size,
  not the outside diameter. Printed as `6"NB`.
- **SCH** — Schedule, the wall-thickness class. `SCH 40`, `SCH 80`, `SCH STD`,
  `SCH XS` (extra strong), `SCH XXS`. Bore plus schedule identifies a pipe.
- **Inquiry No.** — the client's own reference for their enquiry, reproduced on
  the quotation so their purchasing team can match it up.

## Gotchas and constraints

- The digit heuristic will suppress a genuinely alphabetic reference. None have
  been seen; if one appears, the fix is a caller-side override, not a looser
  regex.
- `displaySizeLabel` never returns an empty string, so callers do not need
  their own fallback. Adding one would produce a double dash.

## Related

- `src/lib/quotations/display.test.ts`
- `src/lib/pdf/quotation-pdf.tsx`, `quotation-standard-template.ts`,
  `quotation-nonstandard-template.ts` — the renderers sharing
  `displaySizeLabel`; they print the inquiry no. raw.
- `src/app/api/quotations/[id]/pdf/route.tsx` — the sole remaining
  `displayInquiryNo` caller (filename construction).
