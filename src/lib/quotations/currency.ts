/**
 * Currency resolution for a quotation update.
 *
 * Exists because of a live incident: the update route did `currency || "INR"`,
 * so a payload that arrived without a currency silently repriced an EXPORT
 * quotation from USD to INR — including its amount-in-words — and the customer
 * PDF went out wrong with nothing logged and no error raised.
 *
 * On an update the stored value is the only safe fallback. A blank payload
 * means "the client did not say", never "assume the home currency".
 */
export function resolveUpdateCurrency(
  incoming: unknown,
  stored: string | null | undefined
): string {
  const sent = typeof incoming === "string" ? incoming.trim() : "";
  if (sent) return sent;
  const kept = typeof stored === "string" ? stored.trim() : "";
  // Only reachable for rows predating the NOT NULL default.
  return kept || "INR";
}

/**
 * Fill a blank "Currency" term from the quotation's header currency.
 *
 * The Currency line in Terms & Conditions is derived from the header, but
 * term templates and customer-saved terms carry a blank value for it (and a
 * blank, once saved back to the customer master, comes back blank on every
 * later quotation). The React effect that syncs the term only fires when the
 * header currency CHANGES — for a domestic INR quotation it never fires, so
 * the blank survives and prints as an empty "Currency :" line on the
 * customer's document.
 *
 * Only fills a blank — a value someone typed by hand is left alone.
 */
export function fillBlankCurrencyTerm<
  T extends { termName: string; termValue: string }
>(terms: T[], currency: string): T[] {
  return terms.map((t) =>
    t.termName.toLowerCase().includes("currency") && !t.termValue
      ? { ...t, termValue: currency }
      : t
  );
}
