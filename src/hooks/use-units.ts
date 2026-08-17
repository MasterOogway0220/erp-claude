"use client";

import { useQuery } from "@tanstack/react-query";

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
  const { data } = useQuery({
    queryKey: ["uom-master"],
    queryFn: async () => {
      const res = await fetch("/api/masters/units");
      if (!res.ok) throw new Error("Failed to fetch units");
      const json = await res.json();
      return (json.units || []).map((u: { code: string }) => u.code) as string[];
    },
    staleTime: 5 * 60 * 1000,
  });

  return data?.length ? data : FALLBACK_UNITS;
}
