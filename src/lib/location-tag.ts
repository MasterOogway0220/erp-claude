/**
 * Generates a unique location tag by joining non-empty parts with "-".
 * Example: generateLocationTag("WH01", "A", "R1", "B2", "S3") → "WH01-A-R1-B2-S3"
 */
export function generateLocationTag(
  warehouseCode: string,
  zone?: string | null,
  rack?: string | null,
  bay?: string | null,
  shelf?: string | null
): string {
  return [warehouseCode, zone, rack, bay, shelf]
    .filter((part) => part && part.trim() !== "")
    .join("-");
}
