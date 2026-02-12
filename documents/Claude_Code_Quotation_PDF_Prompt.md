# Claude Code Prompt — Pixel-Perfect Quotation PDF Generation

> **CRITICAL:** This prompt defines the EXACT PDF output layout for both Standard and Non-Standard quotations. The PDF must be an identical visual replica of the client's Excel templates. Every font size, border weight, column width ratio, cell alignment, and spacing is specified below from a cell-by-cell forensic analysis of the actual Excel files. **DO NOT improvise the layout — follow this specification exactly.**

---

## FILES TO ATTACH WITH THIS PROMPT

1. `PIPES_QUOTATION_FORMAT__3_.xlsx` — The source of truth for STANDARD quotation layout (use the "RFQ" sheet)
2. `EXPORT_QUOTATION_FORMAT-1__2_.xlsx` — The source of truth for NON-STANDARD quotation layout (use the "COMMERCIAL" and "TECHNICAL-" sheets)

Open these Excel files, print them to PDF, and use as your **visual reference**. Your generated PDF must look identical.

---

## PART 1: STANDARD QUOTATION PDF LAYOUT (from PIPES_QUOTATION_FORMAT > RFQ sheet)

### Page Setup
- Orientation: **LANDSCAPE**
- Paper: A4
- Margins: **5mm** all sides (very tight — near-edge printing)
- Font family: **Calibri** throughout (use equivalent web-safe: 'Calibri', 'Segoe UI', sans-serif)
- Print area: Columns A through P (columns Q & R are internal calculation columns, NOT printed on PDF sent to customer)

### ZONE 1: LETTERHEAD AREA (Rows 1–5)
```
Rows 1–4: COMPANY LOGO AREA
- Merged cell A2:C4 = Company logo image (left-aligned, approximately 180px wide)
- Row 5: Empty thin spacer row (height ~4px)

IMPORTANT: Row 4, columns D–O are merged (D4:O4) — this is where a tagline or company subtitle can go.
Leave this area as a placeholder for the company logo and name.
The logo is pulled from Company Master settings.
```

### ZONE 2: HEADER INFO GRID (Rows 6–10)
This is a 3-column information grid. No visible borders, just label:value pairs.

```
┌─────────────────────────────┬───────────────────────────────┬──────────────────────────────────┐
│ LEFT COLUMN (A:C–G)         │ CENTER COLUMN (H:I–L)         │ RIGHT COLUMN (M:N–P)             │
├─────────────────────────────┼───────────────────────────────┼──────────────────────────────────┤
│ Customer : [Customer Name]  │ Enquiry Reference : [Ref No]  │ Quotation No. : NPS/25/14408     │
│ Address  : [Address Line]   │ Date : [Inquiry Date]         │ Date : [DD/MM/YYYY]              │
│ Country  : [Country]        │                               │ Valid upto : [Validity Date]     │
│ Attn.    : [Buyer Name]     │ Designation : [Designation]   │ Contact : [Preparer Name]        │
│ Email    : [Buyer Email]    │ Contact : [Buyer Phone]       │ Email : [Preparer Email]         │
└─────────────────────────────┴───────────────────────────────┴──────────────────────────────────┘
```

**Exact typography:**
- Labels (Customer, Address, etc.): Calibri 11pt, Normal, RIGHT-aligned
- Values: Calibri 11pt, Normal, LEFT-aligned
- Row height: 20.1pt each (approximately 7mm)
- Row 6 top border: **medium** (2pt) — this is the separator below letterhead
- Row 10 bottom border: **medium** (2pt) — this is the separator above table
- Right column labels and values are in **theme color** (dark grey, not pure black)

### ZONE 3: TABLE TITLE (Row 11)
```
"Quotation Sheet" — merged across A11:P11
Font: Calibri 12pt BOLD, CENTER aligned
Cell: medium border all 4 sides (2pt box)
Height: 21pt
```

### ZONE 4: ITEM TABLE HEADER (Row 12)
This is the column header row for the line items table.

```
VISIBLE COLUMNS ON PDF (A through P, 16 columns):
┌─────┬──────────┬──────────┬──────────────┬───────┬──────┬──────────┬──────┬────────┬──────┬───────┬───────────┬────────┬──────────┬──────────────────┐
│ S/N │ Product  │ Material │ Additional   │ Size  │ OD   │ Schedule │ W.T. │ Length │ Ends │ Qty   │ Unit Rate │ Amount │ Delivery │ Remark/          │
│     │          │          │ Spec.        │ (NPS) │ (mm) │          │ (mm) │ (Mtr.) │      │ (Mtr.)│ USD/Mtr   │ (USD.) │ (Ex-works)│ Material Code   │
└─────┴──────────┴──────────┴──────────────┴───────┴──────┴──────────┴──────┴────────┴──────┴───────┴───────────┴────────┴──────────┴──────────────────┘
```

**HIDDEN COLUMNS (NOT on PDF, internal only):**
- Column Q: "Unit weight Kg/Mtr" — formula: `(OD - WT) × WT × 0.0246615`
- Column R: "QTY M.Ton" — formula: `Qty × Unit_Weight / 1000`
- These are for internal calculation. They do NOT appear on the customer-facing PDF.

**Header row styling:**
- Font: Calibri 11pt **BOLD**, CENTER aligned, wrap text ON
- Height: 34.5pt (tall row to accommodate two-line headers)
- Borders: **medium top** (2pt), thin internal separators
- Left-most column: medium left border
- Right-most column (P): medium right border
- "Unit Rate" column (M): **GREEN BACKGROUND** (hex #92D050) — this highlights the pricing column

**Column width ratios (proportional — these define the PDF column sizes):**
```
A (S/N):        5.4  → ~3%
B+C (Product):  18.1 → ~11%   [B+C merged in data rows]
D (Material):   17.6 → ~10%
E (Addl Spec):  18.7 → ~11%
F (NPS):         9.0 → ~5%
G (OD):          8.3 → ~5%
H (Schedule):    9.1 → ~5%
I (WT):          8.4 → ~5%
J (Length):     10.6 → ~6%
K (Ends):        6.4 → ~4%
L (Qty):         9.4 → ~6%
M (Unit Rate):  11.4 → ~7%    ← GREEN HIGHLIGHT
N (Amount):     12.9 → ~8%
O (Delivery):   13.6 → ~8%
P (Remark):     18.6 → ~11%
```

### ZONE 5: ITEM DATA ROWS (Row 13+)
```
Sample row:
│ 1 │ C.S. SEAMLESS │ API 5L GR.B │ NACE MR0175/ │ 24 │ 609.6 │ Sch 40 │ 17.48│ 9.00-11.8│ BE │ 1,400 │ 150.00  │ 210,000│ 6-8 Weeks│                │
│   │ PIPE          │ PSL-1       │ MR0103       │    │       │        │      │          │    │       │         │        │          │                │
```

**Data row styling:**
- Font: Calibri **10pt** Normal, CENTER aligned (all columns)
- Height: 17.25–18pt per row
- Borders: thin (1pt) all internal cell borders
- Left edge (col A): **medium** left border
- "Unit Rate" column (M): **GREEN BACKGROUND** (#92D050) continues in data rows
- Product column: B+C merged in data rows (B12:C12 header, B13:C13, B14:C14 etc.)
- Numbers format: No thousand separator on Qty, plain decimals on OD/WT

**Auto-calculations (done in system, shown on PDF):**
```
Amount = Qty × Unit Rate                     (displayed in column N)
Unit Weight = (OD - WT) × WT × 0.0246615    (NOT shown on PDF)
Total Weight = Qty × Unit Weight / 1000       (NOT shown on PDF)
```

### ZONE 6: TOTAL ROW (Row 15 in sample)
```
│ Total                                                          │       │ 1,700 │         │240,000│         │                │
```

**Total row styling:**
- "Total" text: merged A:K, Calibri 11pt **BOLD**, CENTER aligned
- Total Qty (L): **BOLD**, SUM formula
- Total Amount (N): **BOLD**, SUM formula
- Borders: thin top, **medium bottom** (2pt) — this closes the table
- Left edge: medium border, Right edge: medium border

### ZONE 7: OFFER TERMS (Rows 17–32)
```
OFFER TERMS:                                          ← BOLD 10pt, left-aligned, medium top+left border
 1  Price             : Ex-work, Navi Mumbai, India/Jebel Ali, UAE
 2  Delivery          : As above, ex-works, after receipt of PO
 3  Payment           : 100% within 30 Days from date of dispatch
 4  Offer validity    : 6 Days, subject to stock remain unsold
 5  Packing           : Inclusive
 6  Freight           : Extra at actual / To your account
 7  Insurance         : Extra at actual / To your account
 8  Certification     : EN 10204 3.1
 9  T/T charges       : To your account, Full Invoice amount to be remitted. No deduction of T/T charges acceptable.
10  Third Party Insp. : If any required that all charges Extra At Actual
11  Testing Charges   : If any required that all charges Extra At Actual
12  Material origin   : India/Canada
13  Qty. Tolerance    : -0 / +1 Random Length
14  Dimension Tol.    : As per manufacture
15  Part orders       : Subject reconfirm with N-PIPE
```

**Offer terms styling:**
- 3-column layout: Number (col A, center) | Term Name (col B, left, **BOLD** 10pt) | Value (col D onward, left, Normal 10pt)
- Row height: 13.5pt each (compact)
- Left border on col A: **medium** (continues the table's left wall)
- No right/bottom borders on individual term rows
- Colon (":") is part of the value text, starts each value

### ZONE 8: NOTES (Rows 34–43)
```
NOTES:                                                ← BOLD 10pt
1) Prices are subject to review if items are deleted or if quantities are changed.
2) This quotation is subject to confirmation at the time of order placement.
3) Invoicing shall be based on the actual quantity supplied at the agreed unit rate.
4) Shipping date will be calculated based on the number of business days after receipt of the techno-commercial Purchase Order (PO).
5) Supply shall be made as close as possible to the requested quantity in the fixed lengths indicated.
6) Once an order is placed, it cannot be cancelled under any circumstances.
7) The quoted specification complies with the standard practice of the specification, without supplementary requirements (unless otherwise specifically stated in the offer).
8) Reduction in quantity after placement of order will not be accepted. Any increase in quantity will be subject to our acceptance.
9) In case of any changes in Government duties, taxes, or policies, the rates are liable to revision.
```

**Notes styling:**
- "NOTES:" label: BOLD 10pt, left-aligned, medium left border
- Each note: Calibri **9pt** Normal, left-aligned
- Medium left border continues on all note rows
- These 9 notes are HARD-CODED — they appear on every quotation, they are NOT editable

### ZONE 9: FOOTER (Rows 45–47)
```
Row 45: "This is a computer generated document hence not signed."          FORMAT: QTN-Rev.2, Dated: 19/12/2012
         ↑ left-aligned, 7pt                                                ↑ right-aligned, 7pt

Row 46: YOUR ORDER WILL BE GREATLY APPRECIATED AND WILL RECEIVE OUR PROMPT AND CAREFUL ATTENTION.
         ↑ centered, 9pt, merged A:P

Row 47: Regd. Address: 1210/1211, Prasad Chambers, Tata Road no. 2, Opera House, Charni Road (E), Mumbai - 400004, India. Tel. +91 22 23634200/300 Email: info@n-pipe.com, Web: www.n-pipe.com
         ↑ centered, 10pt, merged A:P
```

**Footer styling:**
- Row 45 left: Calibri **7pt**, left-aligned (very small disclaimer)
- Row 45 right (col P): Calibri **7pt**, right-aligned (format reference)
- Row 46: Calibri **9pt** Normal, CENTER, merged across full width
- Row 47: Calibri **10pt** Normal, CENTER, merged across full width
- Footer text is pulled from Company Master (address, phone, email, website)

---

## PART 2: NON-STANDARD QUOTATION PDF LAYOUT (from EXPORT_QUOTATION_FORMAT > COMMERCIAL/TECHNICAL sheets)

### Page Setup
- Orientation: **PORTRAIT**
- Paper: A4
- Print area: Columns A through I only (9 columns)
- Font family: Calibri throughout

### THIS QUOTATION GENERATES TWO SEPARATE PDFs:
1. **COMMERCIAL PDF** — has "COMMERCIAL" header, shows actual prices in Unit Rate and Total
2. **TECHNICAL PDF** — has "TECHNICAL" header, replaces Unit Rate and Total with bold "QUOTED"

Both PDFs are identical in every other way — same header, same items, same offer terms, same footer. Only the pricing columns differ.

### ZONE 1: TYPE LABEL (Rows 1–2)
```
                                                    ┌──────────────┐
                                                    │  COMMERCIAL  │   ← or "TECHNICAL"
                                                    └──────────────┘
```
- Merged G1:I2
- Font: Calibri **20pt BOLD**, CENTER aligned
- Thin border all 4 sides
- Positioned in TOP-RIGHT area of page
- Left area (A1:F2): Company logo space

### ZONE 2: QUOTATION INFO BLOCK (Rows 4–10)
```
┌────────────────────────────────────┐  ┌─────────────────────────────────────────┐
│                                    │  │ Quotation Number:  NPS/25/14408         │
│                                    │  │ Dated:             09/09/2025           │
│ [LOGO AREA]                        │  └─────────────────────────────────────────┘
│                                    │
└────────────────────────────────────┘

┌──────────────┬─────────────────────┬──────────────────────────────────────────┐
│ Customer:    │ Attention:          │ Prepared by: MAHENDRA JAIN               │
│ M/s. XXXXX   │ (Buyer Name)       │ Direct Line: +91-9167065283              │
│ Address...   │ (Buyer Designation) │ Enquiry Reference: EMAIL (MODE)          │
│ Country...   │ (Buyer Email)      │ Client Ref No. - Enquiry No. PIPES       │
│              │ (Buyer Contact)     │ Dated: 09/09/2025                        │
└──────────────┴─────────────────────┴──────────────────────────────────────────┘
```

**Layout is 3-column:**
- LEFT (cols A–C): Customer name on row 7 (**BOLD**), then address lines 8-9 (Normal)
- CENTER (cols D–F): Attention/Buyer details with labels in parentheses
- RIGHT (cols G–I): Quotation number block (rows 4-5) + Prepared by + Contact + Enquiry ref

**All cells have HAIR borders** (very thin, barely visible) — NOT thin or medium

**Exact styling:**
- Labels (Customer:, Attention:, Prepared by:): Calibri 10pt **BOLD**
- Values: Calibri 10pt Normal
- Customer name (row 7): Calibri 10pt **BOLD**, left-aligned
- Enquiry reference number (row 9): Calibri **9pt** Normal (slightly smaller)
- Row heights: all 13.5pt (compact)

### ZONE 3: INTRO LINE (Row 12)
```
"In response to your inquiry, we are pleased to quote as follows:"
```
- Calibri 10pt Normal, left-aligned, no borders

### ZONE 4: ITEM TABLE (Rows 13–18+)
**Header (rows 13–14):**
```
┌──────┬───────────────────────────────────────────┬──────┬───────────┬───────────┬─────────────────────┐
│ Sr.  │            Item Description               │ Qty  │ Unit rate │   Total   │      Delivery       │
│ no.  │                                           │ MTR  │   USD     │    USD    │      Ex-Works       │
└──────┴───────────────────────────────────────────┴──────┴───────────┴───────────┴─────────────────────┘
```

**Header styling:**
- Background: **#D9D9D9** (light grey) on ALL header cells
- Font: Calibri 10pt Normal (column names), **BOLD** for sub-labels (MTR, USD)
- Borders: **hair** (very thin) all sides
- "Item Description" spans B13:E13 (merged 4 columns)
- Row heights: 15pt each (2 header rows)

**Column width ratios (portrait A4, cols A–I):**
```
A (Sr.no):     4.7  → ~5%
B (Desc):     14.6  → ~16%
C (Desc):     15.7  → ~17%   ← B+C+D+E merged for description
D (Desc):     11.0  → ~12%
E (Desc):     11.3  → ~12%
F (Qty):       7.7  → ~8%
G (Unit rate): 10.1 → ~11%
H (Total):    11.4  → ~12%
I (Delivery): 12.0  → ~13%
```

**Data rows (rows 15+):**
Each item is a TALL row because the description is multi-line.

```
COMMERCIAL VERSION:
│ 5.4 │ MATERIAL CODE: 9715286                                    │  6  │  [price] │ [total] │ 8-10 Week,  │
│     │ PIPE BE 6" S-40 A106B + NACE + CLAD N10276               │     │          │         │ Ex-works     │
│     │ SIZE: 6" X SCH-40                                         │     │          │         │              │
│     │ BEVELLED ENDS                                              │     │          │         │              │
│     │ MATERIAL: A106Gr.B + NACE + WITH CLADDING 3MM OF N10276  │     │          │         │              │
│     │ TAG NUMBER: 011/012C0002 ISO                               │     │          │         │              │
│     │ DWG: SA-JER-DS012-TRJR-382001-NPH-012018001-0002         │     │          │         │              │
│     │ ITEM NO.: 02                                               │     │          │         │              │
│     │                                                            │     │          │         │              │
│     │ CERTIFICATE REQUIRED: NACE MILLS (MANUFACTURERS) TEST      │     │          │         │              │
│     │ CERTIFICATES SHOWING PHYSICAL AND CHEMICAL PROPERTIES MUST │     │          │         │              │
│     │ MEET NACE SPECIFICATION & HAVE NACE MARKING TEST           │     │          │         │              │
│     │ CERTIFICATES SHOULD BEAR HEAT MARK NUMBER FOR CO-RELATION  │     │          │         │              │

TECHNICAL VERSION (same row, but pricing replaced):
│ 5.4 │ [same description]                                        │  6  │  QUOTED  │ QUOTED  │ 8-10 Week,  │
                                                                         ↑ BOLD     ↑ Normal    Ex-works
```

**Data row styling:**
- Sr. no (col A): Calibri 10pt, CENTER, vertical-align top
- Description (B:E merged): Calibri 10pt, LEFT-aligned, **WRAP TEXT ON** — this is what makes rows tall
- Qty (col F): Calibri 10pt, LEFT, wrap text
- Unit rate (col G): Calibri 10pt — COMMERCIAL: numeric right-aligned / TECHNICAL: "QUOTED" **BOLD** right-aligned
- Total (col H): Calibri 10pt — COMMERCIAL: formula `=G×F` right-aligned / TECHNICAL: "QUOTED" Normal right-aligned, white background (#FFFFFF)
- Delivery (col I): Calibri 10pt, CENTER, wrap text
- Borders: **hair** all sides
- Row heights: **AUTO-EXPAND** (typically 138–180pt depending on description length)

**The description text structure for each item follows this pattern:**
```
MATERIAL CODE: [code]
[Short pipe description with size and spec]
SIZE: [size detail]
END TYPE: [end type]                          ← sometimes omitted
MATERIAL: [full material specification]
TAG NUMBER: [tag]                              ← if applicable
DWG: [drawing reference]                       ← if applicable
ITEM NO.: [item number]                        ← if applicable

CERTIFICATE REQUIRED: [certificate text]
CERTIFICATES SHOWING...                        ← continuation
CERTIFICATES SHOULD BEAR HEAT MARK NUMBER...
```

In the ERP data entry screen, provide a structured form with fields for each line above, then concatenate them with `\n` into the single description cell for PDF generation.

### ZONE 5: GRAND TOTAL ROW
```
│        Grand Total                              │  24  │           │    0  │                     │
```
- "Grand Total" merged A:E, Calibri 10pt **BOLD**, CENTER
- Qty total: SUM formula, **BOLD**
- Amount total: SUM formula, **BOLD**
- Borders: hair all sides

### ZONE 6: OFFER TERMS (Rows 21–37)
**Identical to Standard quotation terms PLUS an additional first term:**

```
OFFER TERMS:                                      ← BOLD 10pt
Currency          : USD ($)                        ← THIS TERM IS EXTRA (not in Standard)
Price             : Ex-work, Navi Mumbai, India/Jebel Ali, UAE
Delivery          : As above, ex-works, after receipt of PO
Payment           : 100% within 30 Days from date of dispatch
Offer validity    : 6 Days, subject to stock remain unsold
Packing           : Inclusive
Freight           : Extra at actual / To your account
Insurance         : Extra at actual / To your account
Certification     : EN 10204 3.1
T/T charges       : To your account, Full Invoice amount to be remitted. No deduction of T/T charges acceptable.
Third Party Insp. : If any required that all charges Extra At Actual
Testing Charges   : If any required that all charges Extra At Actual
Material origin   : India/Canada
Qty. Tolerance    : -0 / +1 Random Length
Dimension Tol.    : As per manufacture
Part orders       : Subject reconfirm with N-PIPE
```

**Non-Standard offer terms layout (different from Standard):**
- NO number column — just term name and value
- 2-column layout: Term Name (cols A–B, **BOLD** 10pt) | Value (col C onward, Normal 10pt)
- NO borders on offer term rows (clean look)
- Row height: 13.5pt each

### ZONE 7: NOTES (Rows 39–49)
Same 9 hard-coded notes as Standard quotation.
- "NOTES:" in BOLD 10pt
- Notes in Calibri **9pt** Normal
- Note 7 wraps to two lines (continuation indented with spaces on next row)
- Row 49 (last note): thin bottom border — closes the notes section

### ZONE 8: FOOTER (Rows 50–52)
```
Row 50: "This is a computer generated document hence not signed."          FORMAT: QTN-Rev.2, Dated: 19/12/2012
         ↑ Calibri 8pt, left-aligned                                        ↑ Calibri 8pt, right-aligned
         Thin border top, bottom, left                                       Thin border top, bottom, right

Row 51: "YOUR ORDER WILL BE GREATLY APPRECIATED AND WILL RECEIVE OUR PROMPT AND CAREFUL ATTENTION."
         ↑ Calibri 8pt, CENTER, merged A:I, thin border top+bottom

Row 52: "Regd. Address: 1210/1211, Prasad Chambers, Tata Road no. 2, Opera House, Charni Road (E), Mumbai - 400004, India,
         Phone: +91.22.23634200/300/400 Email: info@n-pipe.com, Web: www.n-pipe.com"
         ↑ Calibri 9pt, CENTER, merged A:I, WRAP TEXT, thin border all 4 sides, height 24.75pt (2 lines)
```

---

## PART 3: IMPLEMENTATION INSTRUCTIONS

```
Build the quotation PDF generation system with these exact requirements:

TECHNOLOGY:
- Use Puppeteer (headless Chrome) or @react-pdf/renderer for PDF generation
- If using Puppeteer: create an HTML template and render to PDF
- If using @react-pdf/renderer: map all styles to the React PDF style system
- Puppeteer is RECOMMENDED because it handles complex table layouts and multi-line text wrapping more accurately

PDF GENERATION APPROACH (Puppeteer method):
1. Create two HTML template files:
   - `/templates/quotation-standard.html` — landscape A4, 16-column table
   - `/templates/quotation-nonstandard.html` — portrait A4, 6-column table
2. Each template uses inline CSS with exact font sizes, border weights, and column widths from this spec
3. Server-side: populate template with quotation data → render with Puppeteer → return PDF buffer
4. For Non-Standard: render TWICE — once with prices (COMMERCIAL), once with "QUOTED" replacing prices (TECHNICAL)

CRITICAL RENDERING RULES:

1. BORDERS:
   - "medium" in Excel = 2px solid in CSS
   - "thin" in Excel = 1px solid in CSS
   - "hair" in Excel = 0.5px solid #999 in CSS (very thin, grey)
   - The Standard quotation uses medium borders for the outer frame and section dividers, thin for internal cell borders
   - The Non-Standard quotation uses hair borders throughout (lighter, more elegant feel)

2. FONTS:
   - Calibri 12pt = CSS font-size: 12pt (or 16px)
   - Calibri 11pt = CSS font-size: 11pt (or 14.67px)
   - Calibri 10pt = CSS font-size: 10pt (or 13.33px)
   - Calibri 9pt = CSS font-size: 9pt (or 12px)
   - Calibri 8pt = CSS font-size: 8pt (or 10.67px)
   - Calibri 7pt = CSS font-size: 7pt (or 9.33px)

3. GREEN HIGHLIGHT:
   - Only on Standard quotation
   - Only on "Unit Rate" column (header + all data cells)
   - Color: #92D050 (bright green)
   - This visually highlights the pricing column

4. NON-STANDARD DUAL OUTPUT:
   - COMMERCIAL PDF: "COMMERCIAL" header, actual prices shown
   - TECHNICAL PDF: "TECHNICAL" header, col G shows "QUOTED" in BOLD, col H shows "QUOTED" in Normal weight
   - Grand Total row on TECHNICAL: Amount shows "0" or can be hidden
   - Both PDFs generated from same quotation data, only a boolean flag switches them
   - When user clicks "Download PDF", offer choice: "Commercial", "Technical", or "Both (ZIP)"

5. OFFER TERMS ON PDF:
   - Only CHECKED terms appear (from the checkbox system in the UI)
   - Term heading in BOLD, value in Normal weight
   - Standard format: 3-column (Number | Heading | Value)
   - Non-Standard format: 2-column (Heading | Value) — no numbering

6. NOTES:
   - Always appear. All 9 notes. Not editable. Hard-coded in template.
   - Calibri 9pt. Left-aligned. No borders (except left medium border on Standard).

7. FOOTER:
   - Always appears. Pull company details from Company Master.
   - Three lines: Disclaimer + Format ref | Appreciation text | Registered address
   - Standard: 7pt/9pt/10pt respectively
   - Non-Standard: 8pt/8pt/9pt respectively (slightly different sizes!)

8. COLUMN P "Remark/Material Code" ON STANDARD:
   - This is where the Material Code auto-generated by the system appears on the PDF
   - If user also enters a remark, show both: "Remark text | MAT-CODE-001"

9. PRINT AREA:
   - Standard: Cols A–P only (Q and R are hidden internal columns)
   - Non-Standard: Cols A–I only (J onwards are hidden)

10. DYNAMIC HEIGHT:
    - Standard quotation: item rows are fixed ~18pt height (one-line items)
    - Non-Standard quotation: item rows EXPAND to fit multi-line description (typically 140–180pt)
    - The PDF renderer must handle page breaks correctly when items overflow to next page
    - Offer terms, Notes, and Footer should NOT be split across pages — keep them together

SAMPLE DATA FOR TESTING:

Standard Quotation Test Data:
- Item 1: C.S. SEAMLESS PIPE, API 5L GR.B PSL-1, NACE MR0175/MR0103, NPS=24, OD=609.6, Sch 40, WT=17.48, Length=9.00-11.8, Ends=BE, Qty=1400, Rate=150, Delivery="6-8 Weeks"
- Item 2: C.S. SEAMLESS PIPE, API 5L GR.B PSL-1, NACE MR0175/MR0103, NPS=6, OD=168.3, Sch 40, WT=7.11, Length=9.00-11.8, Ends=BE, Qty=300, Rate=100, Delivery="6-8 Weeks"

Non-Standard Quotation Test Data:
- Item 5.4: Material Code 9715286, Description="PIPE BE 6\" S-40 A106B + NACE + CLAD N10276\nSIZE: 6\" X SCH-40\nBEVELLED ENDS\nMATERIAL: A106Gr.B + NACE + WITH CLADDING 3MM OF N10276\nTAG NUMBER: 011/012C0002 ISO\nDWG: SA-JER-DS012-TRJR-382001-NPH-012018001-0002\nITEM NO.: 02\n\nCERTIFICATE REQUIRED: NACE MILLS (MANUFACTURERS) TEST\nCERTIFICATES SHOWING PHYSICAL AND CHEMICAL PROPERTIES MUST MEET NACE SPECIFICATION & HAVE NACE MARKING TEST\nCERTIFICATES SHOULD BEAR HEAT MARK NUMBER FOR CO-RELATION", Qty=6, Rate=0, Delivery="8-10 Week, Ex-works"

Generate both PDFs with this test data and visually compare against the Excel files printed to PDF. They must be visually indistinguishable.
```

---

## VISUAL COMPARISON CHECKLIST

After generating, verify against this checklist:

### Standard Quotation PDF:
- [ ] Landscape A4 with ~5mm margins
- [ ] 3-column header info grid (Customer | Enquiry | Quotation)
- [ ] "Quotation Sheet" bold centered title bar with medium borders
- [ ] 16-column item table (S/N through Remark/Material Code)
- [ ] Size split into NPS + Schedule as separate columns
- [ ] OD and WT auto-populated
- [ ] Green (#92D050) background on Unit Rate column header AND data cells
- [ ] Medium border outer frame on item table
- [ ] Thin internal borders between cells
- [ ] Total row at bottom with bold SUM values
- [ ] 15 numbered offer terms (number | bold heading | value)
- [ ] 9 hard-coded notes in 9pt font
- [ ] 3-line footer (disclaimer | appreciation | address)
- [ ] Columns Q and R NOT visible on PDF

### Non-Standard Quotation COMMERCIAL PDF:
- [ ] Portrait A4
- [ ] "COMMERCIAL" in 20pt bold top-right box
- [ ] 3-column header (Customer | Buyer | Prepared By)
- [ ] Hair borders (very thin, grey) throughout
- [ ] "In response to your inquiry..." intro line
- [ ] 6-column table with grey (#D9D9D9) header background
- [ ] Item Description spans 4 merged columns, multi-line with wrap
- [ ] Actual prices shown in Unit Rate and Total columns
- [ ] 16 offer terms (with "Currency : USD ($)" as first term)
- [ ] 9 notes, note 7 wraps to 2 lines
- [ ] Footer in thin border box

### Non-Standard Quotation TECHNICAL PDF:
- [ ] Identical to Commercial EXCEPT:
- [ ] "TECHNICAL" header instead of "COMMERCIAL"
- [ ] Unit Rate column shows "QUOTED" in BOLD
- [ ] Total column shows "QUOTED" in Normal weight
- [ ] Everything else is pixel-identical to Commercial version
