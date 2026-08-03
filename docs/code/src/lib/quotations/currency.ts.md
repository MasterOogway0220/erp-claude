# src/lib/quotations/currency.ts

> Two small guards that stop a quotation's currency from being silently
> rewritten or printed blank.

## Why this exists

Both functions exist because of live incidents on the same field, in the same
release cycle:

1. **Silent repricing.** The update route resolved the header currency as
   `currency || "INR"`. Quotation NPS/26/15214 was an EXPORT quotation in USD;
   an update arrived without a usable currency and the fallback repriced it to
   INR — including the amount-in-words — and the customer PDF went out wrong
   with nothing logged. `resolveUpdateCurrency` encodes the correct rule: on an
   *update*, the stored value is the only safe fallback.

2. **Blank "Currency :" line.** The Terms & Conditions block includes a
   Currency term. Term templates and customer-saved terms carry a blank value
   for it, and the React effect that syncs the term to the header only fires
   when the header currency *changes* — which for a domestic INR quotation is
   never. Worse, every save writes the current terms back to the customer
   master, so one blank propagated itself to every later quotation for that
   customer. `fillBlankCurrencyTerm` heals the blank at load time.

## What it does

```ts
resolveUpdateCurrency("USD", "INR")      // "USD" — client said, client wins
resolveUpdateCurrency("", "USD")         // "USD" — blank means "not told", keep stored
resolveUpdateCurrency(undefined, null)   // "INR" — nothing known anywhere
fillBlankCurrencyTerm(terms, "USD")      // fills only *blank* terms whose name
                                         // contains "currency" (case-insensitive)
```

`fillBlankCurrencyTerm` never overwrites a non-empty value — a value someone
typed by hand ("USD ($)", "US Dollar") is theirs.

## How it works

`resolveUpdateCurrency` trims and type-checks the incoming value; anything that
is not a non-empty string defers to the stored value. The final `"INR"`
fallback is only reachable for rows predating the schema's `NOT NULL DEFAULT
'INR'`.

`fillBlankCurrencyTerm` matches the term by name substring rather than an
exact key because term names are user-editable free text ("Currency",
"CURRENCY OF PAYMENT" both occur). It returns a new array; the input is not
mutated (the callers hand it straight to `setTerms`).

## Domain notes

A quotation's currency drives the unit rates, the totals, the amount-in-words
line and the printed "Currency :" term. EXPORT quotations are typically USD;
DOMESTIC are INR. Getting this wrong is not cosmetic — it changes the price
the customer sees.

## Gotchas and constraints

- `resolveUpdateCurrency` is for **updates only**. On create there is no
  stored value and `currency || "INR"` remains correct.
- `fillBlankCurrencyTerm` must run **after** the header currency is known. In
  edit mode the term-loading effects are gated behind the edit-populate flag,
  which guarantees that ordering; don't call it earlier.
- Neither function validates the currency code itself — a typo like "USd"
  passes through. Validation lives with the form's currency selector.

## Related

- `src/lib/quotations/currency.test.ts` — the regression cases.
- `src/app/api/quotations/[id]/route.ts` — PUT uses `resolveUpdateCurrency`.
- `src/app/(dashboard)/quotations/create/standard/page.tsx`,
  `src/app/(dashboard)/quotations/create/nonstandard/page.tsx` — both wrap
  their term loads in `fillBlankCurrencyTerm`.
- `src/lib/quotations/deal-owner.ts` — the same "absent ≠ clear" rule on a
  different field; these files are siblings in spirit.
