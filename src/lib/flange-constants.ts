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

export const FLANGE_RATINGS = ["75", "150", "300", "400", "600", "900", "1500", "2500"];

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

export const SCHEDULES_SS_DS = [
  "SCH 10S", "SCH 20", "SCH 30", "SCH 40S", "SCH 80S",
];

export const SCHEDULES_CS_AS = [
  "SCH 10", "SCH 20", "SCH 30", "SCH STD", "SCH 40", "SCH XS",
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

// Determine standard from size
export function getStandardForSize(size: string): string {
  const num = parseFloat(size.replace('"', '').replace('NB', '').trim());
  return num >= 26 ? "ASME B16.47" : "ASME B16.5";
}
