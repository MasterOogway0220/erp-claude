"use client";

import { useReferenceQuery } from "./use-api-query";

/**
 * Shared reads of the master lists that feed dropdowns across the app.
 *
 * These exist because the same lists were being fetched over and over from
 * unrelated screens — the customer master alone was requested from fourteen
 * different pages, each with its own `useState` + `useEffect` + `fetch`, none
 * of them cached. Opening four screens in a row meant four identical queries
 * against a database with a 75-connection cap.
 *
 * Routing them through one hook per list gives every caller the same cache
 * entry: the first screen that needs customers fetches them, and every other
 * screen for the next ten minutes renders instantly from memory and issues no
 * query at all. That is a speed win and a database-load win in the same
 * change, which is the reason to prefer it over converting each page's fetch
 * separately.
 *
 * Adding a list here is worth it once a second screen needs it. A one-off read
 * should just use `useApiQuery` directly rather than growing this file.
 *
 * Each hook returns the array directly — an empty array while loading — so a
 * call site reads the same as the `useState<T[]>([])` it replaces. Where a
 * screen needs to distinguish "loading" from "genuinely empty", use the
 * `...Query` variant and read `isLoading`.
 */

export interface MasterCustomer {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface MasterOption {
  id: string;
  name: string;
  code?: string;
  [key: string]: unknown;
}

/**
 * Customer master. The most-shared list in the app.
 *
 * The key is `["customers"]` deliberately: the quotation forms already cache
 * this endpoint under that key, so sharing it means one fetch serves both,
 * and the customer list screen's `invalidate(["customers"])` clears this too
 * (React Query matches keys by prefix).
 */
export function useCustomersQuery<T = MasterCustomer>() {
  return useReferenceQuery<{ customers: T[] }>(
    ["customers"],
    "/api/masters/customers"
  );
}
export function useCustomers<T = MasterCustomer>(): T[] {
  return useCustomersQuery<T>().data?.customers ?? [];
}

/** Vendor master — suppliers material is bought from. */
export function useVendorsQuery<T = MasterOption>() {
  return useReferenceQuery<{ vendors: T[] }>(
    ["vendors"],
    "/api/masters/vendors"
  );
}
export function useVendors<T = MasterOption>(): T[] {
  return useVendorsQuery<T>().data?.vendors ?? [];
}

/**
 * Warehouse master, including each warehouse's rack/bay locations — the
 * cascading location dropdowns depend on those being present.
 */
export function useWarehousesQuery<T = MasterOption>() {
  return useReferenceQuery<{ warehouses: T[] }>(
    ["warehouses"],
    "/api/masters/warehouses"
  );
}
export function useWarehouses<T = MasterOption>(): T[] {
  return useWarehousesQuery<T>().data?.warehouses ?? [];
}

/**
 * TPI agencies — third-party inspection bodies a customer appoints to witness
 * testing before dispatch.
 */
export function useInspectionAgenciesQuery<T = MasterOption>() {
  return useReferenceQuery<{ agencies: T[] }>(
    ["inspection-agencies"],
    "/api/masters/inspection-agencies"
  );
}
export function useInspectionAgencies<T = MasterOption>(): T[] {
  return useInspectionAgenciesQuery<T>().data?.agencies ?? [];
}

/** Departments, for employee and routing forms. */
export function useDepartmentsQuery<T = MasterOption>() {
  return useReferenceQuery<{ departments: T[] }>(
    ["departments"],
    "/api/masters/departments"
  );
}
export function useDepartments<T = MasterOption>(): T[] {
  return useDepartmentsQuery<T>().data?.departments ?? [];
}

/**
 * Item codes — the internal catalogue number for a product/size/spec
 * combination, used to line quotations up with inventory.
 */
export function useMaterialCodesQuery<T = MasterOption>() {
  return useReferenceQuery<{ materialCodes: T[] }>(
    ["material-codes"],
    "/api/masters/material-codes"
  );
}
export function useMaterialCodes<T = MasterOption>(): T[] {
  return useMaterialCodesQuery<T>().data?.materialCodes ?? [];
}

/** Buyers — the customer-side contacts a quotation is addressed to. */
export function useBuyersQuery<T = MasterOption>() {
  return useReferenceQuery<{ buyers: T[] }>(
    ["buyers"],
    "/api/masters/buyers"
  );
}
export function useBuyers<T = MasterOption>(): T[] {
  return useBuyersQuery<T>().data?.buyers ?? [];
}

/** Employees, for owner/approver pickers. */
export function useEmployeesQuery<T = MasterOption>() {
  return useReferenceQuery<{ employees: T[] }>(
    ["employees"],
    "/api/masters/employees"
  );
}
export function useEmployees<T = MasterOption>(): T[] {
  return useEmployeesQuery<T>().data?.employees ?? [];
}
