/**
 * Product names in the product master are free text with no unique
 * constraint, so the same product exists under spellings that differ only in
 * case or stray spaces ("C.S. SEAMLESS PIPE" / "C.S. SEAMLESS PIPE "). Compare
 * and de-duplicate on this key.
 */
export function productKey(name: string): string {
  return name.trim().toUpperCase();
}

/** One entry per product, the first spelling seen (trimmed), sorted. */
export function uniqueProductNames(names: string[]): string[] {
  const byKey = new Map<string, string>();
  for (const n of names) {
    const k = productKey(n);
    if (!byKey.has(k)) byKey.set(k, n.trim());
  }
  return Array.from(byKey.values()).sort();
}
