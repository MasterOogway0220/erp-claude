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
 * Several masters do not have a `name` column at all.
 *
 * The response is cast, never parsed, so declaring `MasterOption` on one of
 * these type-checks perfectly and then renders an empty label in every
 * dropdown — there is no error, no warning, and nothing to grep for. Each hook
 * below therefore defaults to the shape its table actually has.
 *
 *   BuyerMaster            buyerName
 *   MaterialCodeMaster     code, description
 *   CompanyMaster          companyName
 *   SizeMaster             sizeLabel
 *   LengthMaster           label
 *   TestingMaster          testName
 *   AdditionalSpecOption   specName
 *   CustomerContact        contactName
 */
export interface MasterBuyer {
  id: string;
  buyerName: string;
  [key: string]: unknown;
}
export interface MasterMaterialCode {
  id: string;
  code: string;
  description?: string | null;
  [key: string]: unknown;
}
export interface MasterCompany {
  id: string;
  companyName: string;
  [key: string]: unknown;
}
export interface MasterSize {
  id: string;
  sizeLabel: string;
  [key: string]: unknown;
}
export interface MasterLength {
  id: string;
  label: string;
  [key: string]: unknown;
}
export interface MasterTesting {
  id: string;
  testName: string;
  [key: string]: unknown;
}
export interface MasterAdditionalSpec {
  id: string;
  specName: string;
  [key: string]: unknown;
}
export interface MasterCustomerContact {
  id: string;
  contactName: string;
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
export function useMaterialCodesQuery<T = MasterMaterialCode>() {
  return useReferenceQuery<{ materialCodes: T[] }>(
    ["material-codes"],
    "/api/masters/material-codes"
  );
}
export function useMaterialCodes<T = MasterMaterialCode>(): T[] {
  return useMaterialCodesQuery<T>().data?.materialCodes ?? [];
}

/** Buyers — the customer-side contacts a quotation is addressed to. */
export function useBuyersQuery<T = MasterBuyer>() {
  return useReferenceQuery<{ buyers: T[] }>(
    ["buyers"],
    "/api/masters/buyers"
  );
}
export function useBuyers<T = MasterBuyer>(): T[] {
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

// ---------------------------------------------------------------------------
// The rest of the master lists.
//
// These were each being read with a bare `useState` + `useEffect` + `fetch`
// from every screen that needed the dropdown — seventy-odd call sites, none of
// them cached, all re-running on every mount. The response key is NOT always
// the endpoint name (`industry-segments` returns `segments`, `tax` returns
// `taxRates`, `customer-contacts` returns a bare array), so each hook below
// unwraps what its route actually sends rather than what its name suggests.
//
// IMPORTANT: only unfiltered reads belong here. A dropdown narrowed by another
// field — `buyers?customerId=`, `material-codes?customerId=&quotationCategory=`
// — is a different list per customer and must keep that value in its own query
// key. Pointing one of those at the hooks here would offer another customer's
// buyers on a quotation, and nothing would report it.
// ---------------------------------------------------------------------------

/**
 * GST/tax rates. Unscoped — every company shares one list.
 *
 * Keyed `["tax-rates"]`, not `["tax"]`, because the Tax Master and Terms &
 * Conditions screens already cache this URL under that key. A second key would
 * mean two cache entries for one list and an invalidation that clears only one.
 */
export function useTaxRatesQuery<T = MasterOption>() {
  return useReferenceQuery<{ taxRates: T[] }>(["tax-rates"], "/api/masters/tax");
}
export function useTaxRates<T = MasterOption>(): T[] {
  return useTaxRatesQuery<T>().data?.taxRates ?? [];
}

/**
 * Companies (the tenant list itself).
 *
 * Keyed `["companies"]` to match the Company Master and super-admin screens,
 * which already cache this URL under that key.
 */
export function useCompaniesQuery<T = MasterCompany>() {
  return useReferenceQuery<{ companies: T[] }>(
    ["companies"],
    "/api/masters/company"
  );
}
export function useCompanies<T = MasterCompany>(): T[] {
  return useCompaniesQuery<T>().data?.companies ?? [];
}

// Units of measure deliberately do NOT get a hook here: `useUnits` already
// exists in `use-units.ts`, returning the codes with a hardcoded fallback so a
// network blip cannot block quotation entry. It caches under ["units-master"],
// which is the key the Unit Master and Product Master screens already share.
// A second hook here would be a same-named export returning a different type,
// on a second cache entry for the same URL.

/** Delivery terms, for quotation and P.O. headers. */
export function useDeliveryTermsQuery<T = MasterOption>() {
  return useReferenceQuery<{ deliveryTerms: T[] }>(
    ["delivery-terms"],
    "/api/masters/delivery-terms"
  );
}
export function useDeliveryTerms<T = MasterOption>(): T[] {
  return useDeliveryTermsQuery<T>().data?.deliveryTerms ?? [];
}

/** Payment terms, for quotation and P.O. headers. */
export function usePaymentTermsQuery<T = MasterOption>() {
  return useReferenceQuery<{ paymentTerms: T[] }>(
    ["payment-terms"],
    "/api/masters/payment-terms"
  );
}
export function usePaymentTerms<T = MasterOption>(): T[] {
  return usePaymentTermsQuery<T>().data?.paymentTerms ?? [];
}

/** Pipe sizes (NB/OD). */
export function useSizesQuery<T = MasterSize>() {
  return useReferenceQuery<{ sizes: T[] }>(["sizes"], "/api/masters/sizes");
}
export function useSizes<T = MasterSize>(): T[] {
  return useSizesQuery<T>().data?.sizes ?? [];
}

/** Industry segments. Note the response key is `segments`, not the path. */
export function useIndustrySegmentsQuery<T = MasterOption>() {
  return useReferenceQuery<{ segments: T[] }>(
    ["industry-segments"],
    "/api/masters/industry-segments"
  );
}
export function useIndustrySegments<T = MasterOption>(): T[] {
  return useIndustrySegmentsQuery<T>().data?.segments ?? [];
}

/** Standard pipe lengths. */
export function useLengthsQuery<T = MasterLength>() {
  return useReferenceQuery<{ lengths: T[] }>(["lengths"], "/api/masters/lengths");
}
export function useLengths<T = MasterLength>(): T[] {
  return useLengthsQuery<T>().data?.lengths ?? [];
}

/**
 * Testing/inspection types.
 *
 * The route sends the same array twice, as `tests` and as `testingMasters`.
 * `tests` is the one read here; the alias exists for older callers.
 */
export function useTestingQuery<T = MasterTesting>() {
  return useReferenceQuery<{ tests: T[]; testingMasters: T[] }>(
    ["testing"],
    "/api/masters/testing"
  );
}
export function useTesting<T = MasterTesting>(): T[] {
  return useTestingQuery<T>().data?.tests ?? [];
}

/** Additional specifications. Response key is `specs`. */
export function useAdditionalSpecsQuery<T = MasterAdditionalSpec>() {
  return useReferenceQuery<{ specs: T[] }>(
    ["additional-specs"],
    "/api/masters/additional-specs"
  );
}
export function useAdditionalSpecs<T = MasterAdditionalSpec>(): T[] {
  return useAdditionalSpecsQuery<T>().data?.specs ?? [];
}

/** Dimensional standards (ASTM/API and friends). */
export function useDimensionalStandardsQuery<T = MasterOption>() {
  return useReferenceQuery<{ dimensionalStandards: T[] }>(
    ["dimensional-standards"],
    "/api/masters/dimensional-standards"
  );
}
export function useDimensionalStandards<T = MasterOption>(): T[] {
  return useDimensionalStandardsQuery<T>().data?.dimensionalStandards ?? [];
}

/**
 * Customer contacts.
 *
 * This route returns a BARE ARRAY, not `{ contacts: [...] }` like every other
 * master — so this hook unwraps `data` itself rather than a named key.
 *
 * Only the unfiltered read belongs here. The per-customer variant
 * (`?customerId=`) is a different list and keeps its own key.
 */
export function useCustomerContactsQuery<T = MasterCustomerContact>() {
  return useReferenceQuery<T[]>(
    ["customer-contacts"],
    "/api/masters/customer-contacts"
  );
}
export function useCustomerContacts<T = MasterCustomerContact>(): T[] {
  return useCustomerContactsQuery<T>().data ?? [];
}
