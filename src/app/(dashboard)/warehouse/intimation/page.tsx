"use client";

import { WarehouseIntimationPanel } from "@/components/inventory/warehouse-intimation-panel";

// The list now lives as a tab on the inventory page, but this route stays:
// the create and detail screens navigate back to it, and existing links and
// bookmarks point here.
export default function WarehouseIntimationPage() {
  return <WarehouseIntimationPanel />;
}
