# src/lib/document-numbering.ts

> Allocates the next number for any document type — `NPS/26/15213`,
> `PO/2026-27/00042` — from a per-company, per-financial-year counter.

## Why this exists

Every document the company issues carries a sequential number that appears on
the printed copy and is quoted back by clients and vendors. Numbers must be
unique, gapless within a financial year, and reset each April.

Doing this per-module would give 28 slightly different implementations of the
same race condition.

## What it does

`generateDocumentNumber(documentType, companyId?)` → the next number as a
string. Also exports `PREFIXES`, `getCurrentFinancialYear()`, and the
`DocumentType` union of 28 types.

Formats:

```
NPS/26/15213          quotations and tenders  (short FY, +15000 base)
PO/2026-27/00042      everything else         (full FY, from 1)
```

## How it works

### Indian financial year

April to March. `getCurrentFinancialYear()` returns `2026-27`;
`getShortFinancialYear()` returns `26`. A document raised in March 2027 belongs
to FY 2026-27; one raised in April 2027 starts 2027-28 at 1.

### The quotation series, and why tenders share it

`QUOTATION_SERIES = ["QUOTATION", "TENDER"]`. Both resolve to the `QUOTATION`
counter, so a tender consumes a number from the same run — the two never
collide, and the company's numbering reads continuously the way it always has
on paper. `PREFIXES.TENDER` (`TND`) is therefore **unused**, and is annotated as
such in the source.

This is also why the quotation list shows tenders alongside quotations
(`shouldIncludeTenders`): to the business they are one series.

The series also carries a `QUOTATION_NUMBER_BASE` of `15000` — the company's
historical numbering had already reached that point before the ERP existed, so
sequence 213 prints as `15213` and continuity with the old records is
preserved.

### The race condition, and the fix

```ts
const updated = await prisma.documentSequence.update({
  where: { id: sequence.id },
  data: { currentNumber: { increment: 1 } },
  select: { currentNumber: true },
});
```

The increment happens **in the database**, and the post-increment value is
read back from the same statement. The naive version — read `currentNumber`,
add one, write it back — hands the same number to two requests that overlap,
and the second insert dies on the unique index. Under serverless concurrency
that is not a rare case.

### Company scoping

```ts
where: { documentType: seriesType, companyId: companyId ?? null }
```

`?? null` rather than leaving it `undefined`. Prisma **drops an `undefined`
filter entirely**, so `findFirst` would return an arbitrary company's counter
and start issuing numbers from someone else's run. With three companies in this
database that is a live hazard, not a theoretical one.

A legacy lookup for a `companyId: null` counter follows, for sequences created
before multi-company support.

## Domain notes

The prefixes are the company's own document codes and appear on printed
paperwork: `NPS` quotation, `CPO` client PO, `POA` PO acceptance, `MPR`
warehouse intimation (Material Preparation Request), `IOF` inspection offer,
`GRN` goods receipt, `MTC` mill test certificate, `CS` comparative statement.
Do not change them casually — they are what people say on the phone.

## Gotchas and constraints

- **Not transactional with the caller.** The counter increments, then the
  caller inserts. If that insert fails, the number is burnt and the series has
  a gap. Acceptable here; a gapless guarantee would need the whole thing inside
  one transaction.
- **The FY reset is lazy** — triggered by the first document of the new year,
  not by a scheduled job. A type with no activity in April keeps last year's
  `financialYear` on the row until it is next used.
- **`padStart(5)` caps tidy formatting at 99,999** per year. Quotations start
  at 15,000, so ~85,000 remain.
- `preview-number` reads the counter **without** incrementing, so the form can
  show the upcoming number. It must never be used to allocate.

## Related

- `prisma/schema.prisma` → `DocumentSequence`.
- `src/app/api/quotations/preview-number/route.ts` — the read-only peek.
- `src/lib/quotations/listing.ts` — why tenders appear in the quotation list.
