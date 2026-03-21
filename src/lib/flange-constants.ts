// Centralized flange constants shared across create, edit, and seed

export const FLANGE_TYPES_B165 = [
  { value: "Weld Neck", label: "WELDNECK (WN)" },
  { value: "Slip On", label: "SLIPON (SO)" },
  { value: "Socket Weld", label: "SOCKETWELD (SW)" },
  { value: "Blind", label: "BLIND (BL)" },
  { value: "Lap Joint", label: "LAPJOINT (LJ)" },
  { value: "Threaded", label: "THREADED (TH)" },
];

// ASME B16.47 — large flanges only WN and BL
export const FLANGE_TYPES_B1647 = [
  { value: "Weld Neck", label: "WELDNECK (WN)" },
  { value: "Blind", label: "BLIND (BL)" },
];

// Ratings for ASME B16.5 (no 75#)
export const FLANGE_RATINGS = ["150", "300", "400", "600", "900", "1500", "2500"];

// Ratings for ASME B16.47 Series A
export const FLANGE_RATINGS_B1647_A = ["150", "300", "400", "600", "900"];

// Ratings for ASME B16.47 Series B (75# is Series B specific)
export const FLANGE_RATINGS_B1647_B = ["75", "150", "300", "400", "600", "900"];

// Series B limited sizes: 400#, 600#, 900# only available up to 36"
export const SERIES_B_LIMITED_RATINGS = ["400", "600", "900"];
export const SERIES_B_LIMITED_MAX_SIZE = 36; // inches

export const FLANGE_FACINGS = [
  { value: "RF", label: "RAISED FACE (RF)" },
  { value: "FF", label: "FLAT FACE (FF)" },
  { value: "RTJ", label: "RING TONGUE GROOVE (RTJ)" },
];

// ASME B16.5 sizes (up to 24")
export const SIZES_B165 = [
  '1/2"', '3/4"', '1"', '1.25"', '1.5"', '2"', '2.5"', '3"',
  '4"', '5"', '6"', '8"', '10"', '12"', '14"', '16"', '18"', '20"', '22"', '24"',
];

// ASME B16.47 sizes (26" and above)
export const SIZES_B1647 = [
  '26"', '28"', '30"', '32"', '34"', '36"', '38"', '40"',
  '42"', '44"', '46"', '48"', '50"', '52"', '54"', '56"', '58"', '60"',
];

export const ALL_FLANGE_SIZES = [...SIZES_B165, ...SIZES_B1647];

// ─── ASME B16.5 Schedules (applicable for WNRF & SWRF only) ─────────────────
export const SCHEDULES_SS_DS = [
  "SCH 5S", "SCH 10S", "SCH 20", "SCH 30", "SCH 40S", "SCH 80S",
  "SCH 100", "SCH 120", "SCH 140", "SCH 160", "SCH XXS",
];

export const SCHEDULES_CS_AS = [
  "SCH 5", "SCH 10", "SCH 20", "SCH 30", "SCH STD", "SCH 40",
  "SCH XS", "SCH 80", "SCH 100", "SCH 120", "SCH 140", "SCH 160", "SCH XXS",
];

// ─── ASME B16.47 Schedules (shorter list) ────────────────────────────────────
export const SCHEDULES_B1647_SS_DS = [
  "SCH 10S", "SCH 20", "SCH 30", "SCH 40S", "SCH 80S",
];

export const SCHEDULES_B1647_CS_AS = [
  "SCH 10", "SCH 20", "SCH 30", "SCH STD", "SCH 40", "SCH XS",
];

// B16.47 Series options
export const B1647_SERIES = [
  { value: "ASME B16.47 Series A", label: "Series A" },
  { value: "ASME B16.47 Series B", label: "Series B" },
];

// Facing rules for ASME B16.47
// FF only for 150#, RTJ only for 300#/400#/600#/900#
export function getAllowedFacings(rating: string, standard: string): string[] {
  if (standard.includes("B16.47")) {
    if (rating === "150") return ["RF", "FF"];
    if (["300", "400", "600", "900"].includes(rating)) return ["RF", "RTJ"];
    return ["RF"];
  }
  // ASME B16.5 — all facings allowed for all ratings
  return ["RF", "FF", "RTJ"];
}

// Schedule applicable only for WN+RF or SW+RF
export function isScheduleApplicable(type: string, facing: string): boolean {
  return (type === "Weld Neck" || type === "Socket Weld") && facing === "RF";
}

// Determine standard from size (base standard, series picked by user for B16.47)
export function getStandardForSize(size: string): string {
  const num = parseFloat(size.replace('"', '').replace('NB', '').trim());
  return num >= 26 ? "ASME B16.47" : "ASME B16.5";
}

// Get ratings for a given standard
export function getRatingsForStandard(standard: string): string[] {
  if (standard.includes("Series B")) return FLANGE_RATINGS_B1647_B;
  if (standard.includes("Series A")) return FLANGE_RATINGS_B1647_A;
  if (standard.includes("B16.47")) return FLANGE_RATINGS_B1647_A; // default to A
  return FLANGE_RATINGS;
}

// Get schedule options based on standard and pipe category
export function getScheduleOptions(standard: string, pipeCategory: string): string[] {
  if (standard.includes("B16.47")) {
    return pipeCategory === "SS_DS" ? SCHEDULES_B1647_SS_DS : SCHEDULES_B1647_CS_AS;
  }
  return pipeCategory === "SS_DS" ? SCHEDULES_SS_DS : SCHEDULES_CS_AS;
}

// Check if a rating+size combo is valid for Series B
export function isSeriesBSizeValid(rating: string, size: string): boolean {
  if (!SERIES_B_LIMITED_RATINGS.includes(rating)) return true;
  const num = parseFloat(size.replace('"', '').replace('NB', '').trim());
  return num <= SERIES_B_LIMITED_MAX_SIZE;
}
