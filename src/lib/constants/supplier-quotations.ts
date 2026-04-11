export const CHARGE_TYPES = [
  { value: "FREIGHT", label: "Freight" },
  { value: "TESTING", label: "Testing Charges" },
  { value: "TPI", label: "TPI Charges" },
  { value: "PACKING", label: "Packing & Forwarding" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "TOOLING", label: "Tooling Charges" },
  { value: "DIE", label: "Die Charges" },
  { value: "COATING", label: "Coating Charges" },
  { value: "MINIMUM_ORDER", label: "Minimum Order Surcharge" },
  { value: "CUSTOM", label: "Custom" },
] as const;

export const STANDARD_CHARGES = CHARGE_TYPES.filter((c) => c.value !== "CUSTOM");

export const PRICING_UNITS = [
  { value: "PER_MTR", label: "Per Meter" },
  { value: "PER_PIECE", label: "Per Piece" },
  { value: "PER_MT", label: "Per Metric Ton" },
  { value: "PER_KG", label: "Per Kg" },
  { value: "LUMPSUM", label: "Lumpsum" },
] as const;

export const PRICE_BASIS_OPTIONS = [
  { value: "EX_WORKS", label: "Ex-Works" },
  { value: "FOR", label: "FOR (Free on Rail)" },
  { value: "CIF", label: "CIF" },
  { value: "FOB", label: "FOB" },
  { value: "DELIVERED", label: "Delivered" },
] as const;

export const SQ_STATUSES = [
  { value: "RECEIVED", label: "Received" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "COMPARED", label: "Compared" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "EXPIRED", label: "Expired" },
] as const;
