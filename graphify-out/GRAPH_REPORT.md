# Graph Report - .  (2026-11-21)

## Corpus Check
- 608 files · ~779,206 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1154 nodes · 1592 edges · 71 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `main()` - 21 edges
2. `GET()` - 18 edges
3. `logAudit()` - 8 edges
4. `POST()` - 7 edges
5. `handleSubmit()` - 6 edges
6. `getVal()` - 5 edges
7. `seedPipeSizes()` - 5 edges
8. `seedInventory()` - 5 edges
9. `migrateCustomers()` - 5 edges
10. `generateStandardQuotationHtml()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `startOfMonth()`  [EXTRACTED]
  src/app/api/company/switch/route.ts → src/app/api/sales/dashboard/route.ts
- `GET()` --calls--> `startOfLastMonth()`  [EXTRACTED]
  src/app/api/company/switch/route.ts → src/app/api/sales/dashboard/route.ts
- `GET()` --calls--> `endOfLastMonth()`  [EXTRACTED]
  src/app/api/company/switch/route.ts → src/app/api/sales/dashboard/route.ts
- `GET()` --calls--> `startOfQuarter()`  [EXTRACTED]
  src/app/api/company/switch/route.ts → src/app/api/sales/dashboard/route.ts
- `GET()` --calls--> `parsedDbUrl()`  [EXTRACTED]
  src/app/api/company/switch/route.ts → src/app/api/health/route.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (0): 

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (12): emptyLine(), reset(), save(), fetchAvailableStock(), handleOpenReservationDialog(), deliveryScheduleToDate(), toDateInput(), handleKeyDown() (+4 more)

### Community 2 - "Community 2"
Cohesion: 0.03
Nodes (30): buildAlertData(), createAlert(), findUnpricedItems(), isSettled(), normalizeItemPricing(), parseRate(), unpricedItemsError(), computeChangeSnapshot() (+22 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (30): generateDocumentNumber(), getCurrentFinancialYear(), getShortFinancialYear(), calculateValueDetails(), determineSupplyType(), extractStateCode(), formatDate(), generateEInvoiceJSON() (+22 more)

### Community 4 - "Community 4"
Cohesion: 0.04
Nodes (7): escapeHtml(), formatDate(), generateClientStatusReportHtml(), getStatusBadge(), getStatusColor(), companyLines(), InspectionOfferDocument()

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (10): mailer(), mailerConfigured(), missingMailerConfig(), smtpPort(), otpEnabled(), otpRequiredFor(), checkAccess(), checkAuth() (+2 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (9): productKey(), uniqueProductNames(), applyPastQuoteItemFields(), onPastQuoteSelect(), selectPastQuoteItem(), updateItem(), ApiError, useApiQuery() (+1 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (16): convertBelowThousand(), convertToIndianWords(), convertToWesternWords(), numberToWords(), buildItemDescription(), escapeHtml(), formatDate(), generateNonStandardQuotationHtml() (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (38): useAdditionalSpecs(), useAdditionalSpecsQuery(), useBuyers(), useBuyersQuery(), useCompanies(), useCompaniesQuery(), useCustomerContacts(), useCustomerContactsQuery() (+30 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (16): getFittingDimStandard(), getFittingEnds(), getFittingSizeOptions(), isSS(), pools(), f(), legacyLabel(), main() (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (22): detectFieldChanges(), getAuditContext(), getIpAddress(), getUserAgent(), logApproval(), logAudit(), logAuthEvent(), logCreate() (+14 more)

### Community 11 - "Community 11"
Cohesion: 0.17
Nodes (25): excelDateToJS(), getNum(), getVal(), main(), readExcel(), seedAdminUser(), seedCertificationTypes(), seedCompanyAdmin() (+17 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (10): letterAddressee(), letterData(), letterSummary(), n(), escapeHtml(), formatCurrency(), formatDate(), generatePOAcceptanceLetterHtml() (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.12
Nodes (5): deleteStoredFile(), downscale(), fileIdFromPath(), filePathFor(), storeFile()

### Community 14 - "Community 14"
Cohesion: 0.15
Nodes (7): mtcTypeOf(), normalizeStockRow(), num(), parseLooseDate(), text(), createStockRows(), stockLocationIds()

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (6): organisationKey(), tenderMatchesCustomer(), isMatchable(), isSameItem(), matchKey(), normalizeMatchValue()

### Community 16 - "Community 16"
Cohesion: 0.2
Nodes (3): cert(), item(), mech()

### Community 17 - "Community 17"
Cohesion: 0.28
Nodes (3): findLatestCacheForPair(), getRate(), todayKey()

### Community 18 - "Community 18"
Cohesion: 0.48
Nodes (5): cleanData(), generateValidationReport(), migrateCustomers(), readExcelFile(), validateCustomer()

### Community 19 - "Community 19"
Cohesion: 0.29
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 0.33
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 0.33
Nodes (6): fetchDetail(), fetchTender(), handleDeleteDocument(), handleSave(), handleStatusChange(), handleUpload()

### Community 22 - "Community 22"
Cohesion: 0.4
Nodes (6): applyPastQuoteItemFields(), autoGenerateHeatNoForItem(), generateHeatNo(), onPastQuoteSelect(), selectPastQuoteItem(), updateItem()

### Community 23 - "Community 23"
Cohesion: 0.33
Nodes (6): closeDialog(), finishSignIn(), getSelectedItems(), handleCloseDialog(), handleSubmit(), submitOrder()

### Community 24 - "Community 24"
Cohesion: 0.33
Nodes (6): addRow(), createEmptyRow(), loadEditRows(), navigateTo(), saveDetails(), validateRows()

### Community 25 - "Community 25"
Cohesion: 0.4
Nodes (2): blankToNull(), normalizeQapInput()

### Community 26 - "Community 26"
Cohesion: 0.4
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 0.4
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 0.67
Nodes (2): databaseIsDown(), interpretHealth()

### Community 29 - "Community 29"
Cohesion: 0.83
Nodes (3): drawnLines(), sheet(), valueLines()

### Community 30 - "Community 30"
Cohesion: 0.5
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 0.67
Nodes (3): handleQuotationChange(), loadTenderQuotation(), saveTenderLines()

### Community 32 - "Community 32"
Cohesion: 0.67
Nodes (3): loadPRItems(), loadSOItems(), mapToPOItems()

### Community 33 - "Community 33"
Cohesion: 0.67
Nodes (3): fetchCS(), handleSelectVendor(), handleStatusUpdate()

### Community 34 - "Community 34"
Cohesion: 0.67
Nodes (3): describeLog(), humanize(), truncate()

### Community 35 - "Community 35"
Cohesion: 0.67
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 0.67
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 0.67
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 0.67
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (2): prItemFields(), prItemLabel()

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (2): handleKeyDown(), handleSearch()

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (2): pickAddress(), saveNewAddress()

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (2): formatCurrency(), handleExportCSV()

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (2): fetchRFQ(), handleSendToVendors()

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (2): handleApprovalAction(), handleReject()

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (2): calculateVendorPerformance(), fetchPOTracking()

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (2): rebuildItems(), toggleItemSelection()

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (2): initPipeRows(), savePipeDetails()

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Community 58"
Cohesion: 1.0
Nodes (2): fetchData(), handleFilter()

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Community 61"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "Community 62"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "Community 64"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (0): 

### Community 66 - "Community 66"
Cohesion: 1.0
Nodes (0): 

### Community 67 - "Community 67"
Cohesion: 1.0
Nodes (0): 

### Community 68 - "Community 68"
Cohesion: 1.0
Nodes (0): 

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (0): 

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 40`** (2 nodes): `seed-sandbox-user.ts`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (2 nodes): `seed-test-company.ts`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (2 nodes): `seed-test-user.ts`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (2 nodes): `seed-production.ts`, `seedProduction()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (2 nodes): `seed-offer-terms.ts`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (2 nodes): `migrate-warehouse-details-to-heats.ts`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (2 nodes): `check-recent-logins.ts`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (2 nodes): `handleKeyDown()`, `handleSearch()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (2 nodes): `download.ts`, `downloadFile()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (2 nodes): `pickAddress()`, `saveNewAddress()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (2 nodes): `formatCurrency()`, `handleExportCSV()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (2 nodes): `fetchRFQ()`, `handleSendToVendors()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (2 nodes): `handleApprovalAction()`, `handleReject()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (2 nodes): `calculateVendorPerformance()`, `fetchPOTracking()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (2 nodes): `rebuildItems()`, `toggleItemSelection()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (2 nodes): `initPipeRows()`, `savePipeDetails()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (2 nodes): `download-file.ts`, `downloadFile()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (2 nodes): `otp-client.ts`, `requestLoginOtp()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (2 nodes): `fetchData()`, `handleFilter()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (2 nodes): `breadcrumbs.tsx`, `isDynamicId()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (2 nodes): `no-array-transactions.test.ts`, `files()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (1 nodes): `vitest.e2e.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (1 nodes): `prisma.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (1 nodes): `vitest.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (1 nodes): `next.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (1 nodes): `query-provider.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (1 nodes): `prisma.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (1 nodes): `mailer.sandbox.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (1 nodes): `master-cache.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.01 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 6` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._