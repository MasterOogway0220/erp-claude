# src/lib/amount-in-words.ts

> Renders a money amount as words — "Rupees Twelve Lakh Thirty Four Thousand
> and Fifty Paise Only" — in Indian or Western grouping depending on currency.

## Why this exists

Indian invoices and quotations state the total in words as well as figures. It
is conventional on commercial paperwork and expected by clients' accounts
departments; for tax invoices it is effectively mandatory.

The hard part is that **Indian and Western numbering group differently**, and
the company issues both domestic and export documents. Getting it wrong on an
export invoice looks amateurish; getting it wrong on a domestic one gets the
document queried.

## What it does

`numberToWords(amount, currency = "INR")` → the full phrase including currency
name, subunit and the trailing "Only".

```
numberToWords(1234050.50)          "Rupees Twelve Lakh Thirty Four Thousand and Fifty and Fifty Paise Only"
numberToWords(1234050.50, "USD")   "US Dollars One Million Two Hundred and Thirty Four Thousand and Fifty and Fifty Cents Only"
```

## How it works

### Two grouping systems

- **Indian** (`INR`): thousand → **lakh** (10⁵) → **crore** (10⁷). Digits group
  2-2-3 from the right: `12,34,567`.
- **Western** (everything else): thousand → million → billion, grouping 3-3-3:
  `1,234,567`.

`convertBelowThousand` handles 0–999 and is shared; the two wrappers differ
only in which magnitudes they peel off.

### Currency table

`INR` → Rupees/Paise, `USD` → US Dollars/Cents, `EUR` → Euros/Cents, `AED` →
AED/Fils. Anything unrecognised uses the code itself with "Cents", which is a
deliberate soft landing — a new currency produces something readable rather
than `undefined`.

Note the Indian/Western switch keys on `currency === "INR"` only, so AED
amounts group Western-style. Correct for Gulf trade documents.

### Subunits

`Math.round((amount - wholePart) * 100)` — rounded, not truncated, so 0.005
does not silently vanish. The subunit phrase is omitted entirely when zero,
giving "Rupees One Thousand Only" rather than "…and Zero Paise Only".

Negatives recurse with a "Minus " prefix. Rare on a quotation, real on a credit
note.

## Domain notes

- **Lakh** = 100,000. **Crore** = 10,000,000. Standard in Indian commerce; the
  ERP's approval bands and spend figures are quoted this way throughout.
- **"Only"** terminates the phrase on Indian financial documents. It is a
  tamper guard — nothing can be appended to the written amount.
- **Paise** are hundredths of a rupee; **Fils** hundredths of a dirham.

## Gotchas and constraints

- **The "and" placement is idiosyncratic.** `convertBelowThousand` inserts
  "and" after a hundreds part, so the phrase can read "…Thousand and Fifty and
  Fifty Paise Only". Slightly clumsy, but it matches what the company's
  documents have always said, so it is deliberately left alone.
- **No upper bound handling.** Above 999 crore the leading group is spelled
  out as a plain number of crores, which is correct but long.
- Floating-point: amounts are computed as `number`, so a total assembled from
  many lines can carry a representation error. The `Math.round` on the subunit
  absorbs it at two decimal places.

## Related

- `src/app/api/quotations/route.ts` and `[id]/route.ts` — store
  `amountInWords` on the quotation at save time, so the document does not
  change if this function later does.
- `src/lib/pdf/invoice-template.ts`, `quotation-standard-template.ts` — print
  it.
