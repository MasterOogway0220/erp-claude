import { prisma } from "@/lib/prisma";

// Remember the customer's item IDs from a saved non-standard quotation so
// they can be picked again next time (the same reuse a material code gets,
// without a "Record" step). Runs after the save and never fails it: a
// missed suggestion is not worth losing a quotation over. An existing row
// keeps its curated description — only brand-new IDs are written.
export async function rememberClientItems(args: {
  customerId: string;
  quotationCategory: string | null | undefined;
  items: Array<{ materialCodeLabel?: string | null; itemDescription?: string | null; uom?: string | null }>;
  companyId?: string | null;
}): Promise<void> {
  if (args.quotationCategory !== "NON_STANDARD") return;
  const seen = new Set<string>();
  for (const item of args.items) {
    const itemNo = String(item.materialCodeLabel ?? "").trim();
    if (!itemNo || seen.has(itemNo)) continue;
    seen.add(itemNo);
    try {
      await prisma.clientItemMaster.upsert({
        where: { customerId_itemNo: { customerId: args.customerId, itemNo } },
        create: {
          customerId: args.customerId,
          itemNo,
          description: item.itemDescription?.trim() || null,
          unit: item.uom || null,
          companyId: args.companyId ?? null,
        },
        update: {},
      });
    } catch (error) {
      console.error("rememberClientItems:", itemNo, error);
    }
  }
}
