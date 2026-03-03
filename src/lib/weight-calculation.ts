/**
 * Pipe weight per meter calculation formulas.
 *
 * Carbon Steel & Alloy Steel (CS_AS):
 *   (OD - WT) × WT × 0.0246615
 *
 * Stainless Steel & Duplex Steel (SS_DS):
 *   (OD - WT) × WT × 0.0246615 × 1.014
 *
 * @param od  Outside Diameter in mm
 * @param wt  Wall Thickness in mm
 * @param pipeType  "CS_AS" or "SS_DS"
 * @returns Weight in Kg/Meter, rounded to 4 decimal places, or null if inputs are invalid
 */
export function calculateWeightPerMeter(
  od: number,
  wt: number,
  pipeType: "CS_AS" | "SS_DS"
): number | null {
  if (!od || !wt || od <= 0 || wt <= 0 || wt >= od) return null;

  const base = (od - wt) * wt * 0.0246615;
  const weight = pipeType === "SS_DS" ? base * 1.014 : base;

  return Math.round(weight * 10000) / 10000;
}
