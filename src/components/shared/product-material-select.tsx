"use client";

// Sandbox preview (2026-10-05): the sandbox login gets the new version
// (./product-material-select.sandbox), everyone else the unchanged one (./product-material-select.legacy).
// Going live: replace this file with product-material-select.sandbox.tsx and delete both copies.
import { sandboxSwitch } from "@/components/sandbox/preview-gate";
import * as next from "./product-material-select.sandbox";
import * as legacy from "./product-material-select.legacy";

export const ProductMaterialSelect = sandboxSwitch(next.ProductMaterialSelect, legacy.ProductMaterialSelect, null);

// Each version keeps its own module cache and only one mounts per login, so
// read whichever is filled and clear both.
export function getMasterExtraSizes(product: string): string[] {
  const fromNext = next.getMasterExtraSizes(product);
  return fromNext.length ? fromNext : legacy.getMasterExtraSizes(product);
}
export function invalidateProductCache() {
  next.invalidateProductCache();
  legacy.invalidateProductCache();
}
