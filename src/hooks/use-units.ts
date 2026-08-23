"use client";

import { useReferenceQuery } from "./use-api-query";

// The Unit dropdowns used to hold their own hardcoded array, so adding a UOM in
// Product Master → Units never reached the quotation forms. This reads the
// master instead. FALLBACK_UNITS is only what the arrays used to contain — it
// keeps the dropdown usable if the masters API is unreachable, so a network
// blip cannot block quotation entry.
const FALLBACK_UNITS = ["Mtr", "Nos", "Kg", "MT", "Feet", "Set", "Lot"];

/**
 * Active UOM codes from Unit Master (`/masters/units`), e.g. Mtr, Nos, Kg.
 * The API already filters to isActive and sorts by name.
 */
export function useUnits(): string[] {
  // Shares the Unit Master screen's cache entry rather than fetching the same
  // endpoint again under a key of its own — the codes are derived here instead
  // of in the query, so both callers can hold one cached response.
  const { data } = useReferenceQuery<{ units: { code: string }[] }>(
    ["units-master"],
    "/api/masters/units"
  );

  const codes = (data?.units || []).map((u) => u.code);
  return codes.length ? codes : FALLBACK_UNITS;
}
