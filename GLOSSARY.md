# GLOSSARY

Domain terms for this ERP (a piping and tubular trading company). The longer
explanations live in `docs/code/prisma/schema.prisma.md` ("Domain notes"); this
file is the quick index. Add a term here the first time code depends on it.

| Term | Meaning | Where it shows up |
|---|---|---|
| NB | Nominal bore. With SCH, identifies a pipe size (`2" NB X Sch 40S`). | Product specs, quotation lines |
| SCH | Schedule: the wall-thickness class of a pipe. | Product specs, quotation lines |
| MTC | Mill Test Certificate: the mill's proof of a heat's chemistry and properties. The most important document in the chain. | Quality, inventory, dossier |
| Heat number | Identifies one batch of molten steel. Stamped on the pipe and links it to its MTC. Gives physical traceability. | `HeatEntry`, `PipeMaterialDetail`, GRN, stock |
| TPI | Third Party Inspection agency, nominated by the client. In-house testing is the alternative. | Order processing, inspection offers |
| QAP | Quality Assurance Plan: the inspection and testing the client requires on an order. | Quality, order processing |
| PSL | Product Specification Level (API 5L PSL1 / PSL2): stricter test and chemistry requirements at PSL2. | Product specs, technical requirements |
| NDT | Non-destructive testing (UT, RT, hydro and similar). | Order processing lab and NDT tests |
| L1 / L2 / L3 | Vendor rank by total landed cost on a comparative statement. Choosing other than L1 needs a written justification. | Purchase |
| CPO | Client Purchase Order: the order the customer sends us. | `client-purchase-orders` |
| POA | PO Acceptance: our letter accepting a CPO. | `po-acceptance` |
| CDD | Committed Delivery Date: the date we promise delivery by. Header CDD = latest line CDD. | CPO, PO acceptance |
| MPR | Material Preparation Request (`WarehouseIntimation`). | Warehouse |
| GRN | Goods Receipt Note: stock arriving from a vendor. | Inventory |
| Sandbox | A login (`User.isSandbox`) that reads and writes `sbx_` twin tables, for safe live testing. | `src/lib/sandbox/` |
