# Graph Report - .  (2026-04-11)

## Corpus Check
- 428 files · ~373,932 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 699 nodes · 949 edges · 51 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `main()` - 22 edges
2. `GET()` - 20 edges
3. `logAudit()` - 8 edges
4. `getVal()` - 6 edges
5. `generateHTML()` - 6 edges
6. `readExcel()` - 5 edges
7. `seedPipeSizes()` - 5 edges
8. `seedInventory()` - 5 edges
9. `migrateCustomers()` - 5 edges
10. `handleSubmit()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `startOfMonth()`  [EXTRACTED]
  src/app/api/company/switch/route.ts → src/app/api/sales/dashboard/route.ts
- `GET()` --calls--> `startOfLastMonth()`  [EXTRACTED]
  src/app/api/company/switch/route.ts → src/app/api/sales/dashboard/route.ts
- `GET()` --calls--> `endOfLastMonth()`  [EXTRACTED]
  src/app/api/company/switch/route.ts → src/app/api/sales/dashboard/route.ts
- `GET()` --calls--> `startOfQuarter()`  [EXTRACTED]
  src/app/api/company/switch/route.ts → src/app/api/sales/dashboard/route.ts
- `GET()` --calls--> `escapeHtml()`  [EXTRACTED]
  src/app/api/company/switch/route.ts → src/app/api/quality/lab-letters/[id]/pdf/route.tsx

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (0): 

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (5): handleKeyDown(), navigateToResult(), fetchAlerts(), markAlertRead(), markAllRead()

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (30): findSystemBrowser(), renderHtmlToPdf(), baseStyles(), buildChemicalTable(), buildMechanicalTable(), companyHeaderHtml(), computeChangeSnapshot(), computeCompletion() (+22 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (9): generateDocumentNumber(), getCurrentFinancialYear(), calculateValueDetails(), determineSupplyType(), extractStateCode(), formatDate(), generateEInvoiceJSON(), detectPOVariances() (+1 more)

### Community 4 - "Community 4"
Cohesion: 0.17
Nodes (26): excelDateToJS(), getNum(), getVal(), main(), readExcel(), seedAdminUser(), seedCertificationTypes(), seedCompanyAdmin() (+18 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (19): convertBelowThousand(), convertToIndianWords(), convertToWesternWords(), numberToWords(), escapeHtml(), formatDate(), formatNumber(), generateInvoiceHtml() (+11 more)

### Community 6 - "Community 6"
Cohesion: 0.16
Nodes (18): detectFieldChanges(), getAuditContext(), getIpAddress(), getUserAgent(), logApproval(), logAudit(), logAuthEvent(), logCreate() (+10 more)

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (3): checkAccess(), checkAuth(), getActiveCompanyId()

### Community 8 - "Community 8"
Cohesion: 0.17
Nodes (2): getProductGroup(), tryAutoFill()

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (9): fetchCompanies(), fetchContacts(), fetchDetail(), fetchWarehouses(), handleAddLocation(), handleCPOSelect(), handleDelete(), handleSave() (+1 more)

### Community 10 - "Community 10"
Cohesion: 0.48
Nodes (5): cleanData(), generateValidationReport(), migrateCustomers(), readExcelFile(), validateCustomer()

### Community 11 - "Community 11"
Cohesion: 0.29
Nodes (0): 

### Community 12 - "Community 12"
Cohesion: 0.52
Nodes (5): buildItemDescription(), escapeHtml(), formatDate(), generateNonStandardQuotationHtml(), nl2br()

### Community 13 - "Community 13"
Cohesion: 0.48
Nodes (5): escapeHtml(), formatDate(), generateClientStatusReportHtml(), getStatusBadge(), getStatusColor()

### Community 14 - "Community 14"
Cohesion: 0.67
Nodes (6): escapeHtml(), formatDate(), generateColourCodeHtml(), generateCriteriaChecklistHtml(), generateInspectionOfferHtml(), generateLengthTallyHtml()

### Community 15 - "Community 15"
Cohesion: 0.4
Nodes (6): applyPastQuoteItemFields(), autoGenerateHeatNoForItem(), generateHeatNo(), onPastQuoteSelect(), selectPastQuoteItem(), updateItem()

### Community 16 - "Community 16"
Cohesion: 0.7
Nodes (4): main(), parseNps(), parseSchedule(), readExcel()

### Community 17 - "Community 17"
Cohesion: 0.4
Nodes (5): fetchNCR(), handleCloseNCR(), handleMoveToCorrective(), handleMoveToInvestigation(), handleVerifyNCR()

### Community 18 - "Community 18"
Cohesion: 0.4
Nodes (5): closeDialog(), getSelectedItems(), handleCloseDialog(), handleSubmit(), submitOrder()

### Community 19 - "Community 19"
Cohesion: 0.4
Nodes (5): fetchStock(), handlePartialAccept(), handleUpdateStock(), initPipeRows(), savePipeDetails()

### Community 20 - "Community 20"
Cohesion: 0.7
Nodes (4): escapeHtml(), formatCurrency(), formatDate(), generatePOAcceptanceLetterHtml()

### Community 21 - "Community 21"
Cohesion: 0.83
Nodes (3): main(), parseFraction(), parseSizeLabel()

### Community 22 - "Community 22"
Cohesion: 0.5
Nodes (4): fetchEmailLogs(), fetchInvoice(), markAsSent(), sendEmail()

### Community 23 - "Community 23"
Cohesion: 0.5
Nodes (4): fetchSalesOrder(), handleCancelSO(), handleReleaseReservation(), handleReserveStock()

### Community 24 - "Community 24"
Cohesion: 0.5
Nodes (4): fetchPO(), fetchVariance(), handleApprovalAction(), handleReject()

### Community 25 - "Community 25"
Cohesion: 0.67
Nodes (3): fetchCS(), handleSelectVendor(), handleStatusUpdate()

### Community 26 - "Community 26"
Cohesion: 0.67
Nodes (3): fetchRFQ(), handleSaveQuotation(), handleSendToVendors()

### Community 27 - "Community 27"
Cohesion: 0.67
Nodes (3): autoAllocateAll(), confirmItem(), fetchAnalysis()

### Community 28 - "Community 28"
Cohesion: 0.67
Nodes (3): loadPRItems(), loadSOItems(), mapToPOItems()

### Community 29 - "Community 29"
Cohesion: 0.67
Nodes (3): fetchMTCs(), handleMtcSearch(), handleMtcVerificationUpdate()

### Community 30 - "Community 30"
Cohesion: 0.67
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (2): fetchAcceptance(), updateStatus()

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (2): calculateVendorPerformance(), fetchPOTracking()

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (2): rebuildItems(), toggleItemSelection()

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (2): fetchAvailableStock(), handleOpenReservationDialog()

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (2): fetchReport(), handleUpdate()

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (2): formatCurrency(), handleExportCSV()

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (2): fetchData(), handleFilter()

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (2): handleKeyDown(), handleSearch()

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
Nodes (0): 

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 31`** (2 nodes): `seed-production.ts`, `seedProduction()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (2 nodes): `seed-offer-terms.ts`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (2 nodes): `migrate-master-data-to-company.ts`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (2 nodes): `seed-flange-sizes.ts`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (2 nodes): `fetchAcceptance()`, `updateStatus()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (2 nodes): `calculateVendorPerformance()`, `fetchPOTracking()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (2 nodes): `rebuildItems()`, `toggleItemSelection()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (2 nodes): `fetchAvailableStock()`, `handleOpenReservationDialog()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (2 nodes): `fetchReport()`, `handleUpdate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (2 nodes): `formatCurrency()`, `handleExportCSV()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (2 nodes): `fetchData()`, `handleFilter()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (2 nodes): `handleKeyDown()`, `handleSearch()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (2 nodes): `page-loading.tsx`, `PageLoading()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (2 nodes): `weight-calculation.ts`, `calculateWeightPerMeter()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `middleware.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `prisma.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `next.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `quotation-pdf.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.01 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._