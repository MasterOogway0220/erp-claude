/**
 * Technical requirements — the bridge from Order Processing to Procurement.
 *
 * Order Processing records, per sales-order line, everything the client wants
 * done to the material beyond the bare product/material/size: third-party
 * inspection (TPI) and its witness percentages, lab tests, NDT (non-destructive
 * testing), PMI (positive material identification), coating, hot-dip
 * galvanising, screwed ends, colour coding, and the specification stencilled on
 * the pipe.
 *
 * The warehouse already received all of this through the Warehouse Intimation.
 * The purchase in-charge did not — a Purchase Requisition carried only product,
 * material, size and quantity, so an enquiry could go out and a vendor PO could
 * be placed for material that cannot meet the client's inspection, testing,
 * coating or marking requirements. The non-compliance surfaced at GRN or at
 * inspection, after the money was committed.
 *
 * This module renders the requirement set as plain text so it can be stored on
 * PRItem.technicalRequirements and shown, unchanged, on the PR, the RFQ (which
 * renders PR items) and the vendor purchase order.
 */

import {
  LAB_TESTS,
  NDT_TESTS,
  TPI_TYPES,
  PMI_TYPES,
  COATING_SIDES,
} from "@/lib/constants/order-processing";

/**
 * ndtTests / requiredLabTests are stored as a JSON string (LongText) but used
 * as string[] everywhere else. Tolerates a bare comma-separated string too,
 * because early rows were written that way.
 */
export function parseStringArray(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

/** The subset of OrderProcessingItem that describes what must be done. */
export interface TechnicalRequirementSource {
  tpiRequired?: boolean | null;
  tpiType?: string | null;
  vdiRequired?: boolean | null;
  vdiWitnessPercent?: number | null;
  hydroTestRequired?: boolean | null;
  hydroWitnessPercent?: number | null;
  labTestingRequired?: boolean | null;
  requiredLabTests?: unknown;
  otherLabTests?: string | null;
  ndtRequired?: boolean | null;
  ndtTests?: unknown;
  pmiRequired?: boolean | null;
  pmiType?: string | null;
  coatingRequired?: boolean | null;
  coatingType?: string | null;
  coatingSide?: string | null;
  hotDipGalvanising?: boolean | null;
  screwedEnds?: boolean | null;
  colourCodingRequired?: boolean | null;
  colourCode?: string | null;
  additionalPipeSpec?: string | null;
  additionalSpec?: string | null;
}

function label(
  list: ReadonlyArray<{ value: string; label: string }>,
  value: string | null | undefined
): string {
  if (!value) return "";
  return list.find((o) => o.value === value)?.label ?? value;
}

function labTestLabels(
  codes: string[],
  other: string | null | undefined
): string[] {
  const named = codes.map((c) => label(LAB_TESTS, c));
  if (other && other.trim()) named.push(`Other: ${other.trim()}`);
  return named;
}

/**
 * Render the requirement set as one line per requirement. Returns null when
 * nothing is required, so callers can leave the column NULL rather than store
 * an empty string that reads as "requirements were considered and are none".
 */
export function formatTechnicalRequirements(
  p: TechnicalRequirementSource | null | undefined
): string | null {
  if (!p) return null;
  const lines: string[] = [];

  if (p.tpiRequired) {
    lines.push(`TPI: ${label(TPI_TYPES, p.tpiType) || "Required"}`);
  }
  if (p.vdiRequired) {
    lines.push(
      `VDI inspection: witness ${p.vdiWitnessPercent ?? "—"}%`
    );
  }
  if (p.hydroTestRequired) {
    lines.push(
      `Hydro test: witness ${p.hydroWitnessPercent ?? "—"}%`
    );
  }

  const labTests = labTestLabels(
    parseStringArray(p.requiredLabTests),
    p.otherLabTests
  );
  if (labTests.length > 0) {
    lines.push(`Lab tests: ${labTests.join(", ")}`);
  } else if (p.labTestingRequired) {
    lines.push("Lab testing: required (tests not yet specified)");
  }

  const ndt = parseStringArray(p.ndtTests).map((c) => label(NDT_TESTS, c));
  if (ndt.length > 0) {
    lines.push(`NDT: ${ndt.join(", ")}`);
  } else if (p.ndtRequired) {
    lines.push("NDT: required (tests not yet specified)");
  }

  if (p.pmiRequired) {
    lines.push(`PMI: ${label(PMI_TYPES, p.pmiType) || "Required"}`);
  }
  if (p.coatingRequired) {
    const side = label(COATING_SIDES, p.coatingSide);
    lines.push(
      `Coating: ${p.coatingType || "type not specified"}${side ? ` (${side})` : ""}`
    );
  }
  if (p.hotDipGalvanising) lines.push("Hot Dip Galvanising: required");
  if (p.screwedEnds) lines.push("Screwed Ends: required");
  if (p.colourCodingRequired) {
    lines.push(`Colour coding: ${p.colourCode || "colour not specified"}`);
  }
  if (p.additionalSpec?.trim()) {
    lines.push(`Additional spec to comply with: ${p.additionalSpec.trim()}`);
  }
  if (p.additionalPipeSpec?.trim()) {
    lines.push(`Stencil on pipe: ${p.additionalPipeSpec.trim()}`);
  }

  return lines.length > 0 ? lines.join("\n") : null;
}

/** The fields formatTechnicalRequirements needs, for a Prisma `select`. */
export const TECHNICAL_REQUIREMENT_SELECT = {
  tpiRequired: true,
  tpiType: true,
  vdiRequired: true,
  vdiWitnessPercent: true,
  hydroTestRequired: true,
  hydroWitnessPercent: true,
  labTestingRequired: true,
  requiredLabTests: true,
  otherLabTests: true,
  ndtRequired: true,
  ndtTests: true,
  pmiRequired: true,
  pmiType: true,
  coatingRequired: true,
  coatingType: true,
  coatingSide: true,
  hotDipGalvanising: true,
  screwedEnds: true,
  colourCodingRequired: true,
  colourCode: true,
  additionalPipeSpec: true,
  additionalSpec: true,
} as const;
