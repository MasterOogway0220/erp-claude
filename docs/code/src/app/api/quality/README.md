# src/app/api/quality/ — inspection, testing and certification

26 files. The largest cluster after masters, because certifying material is
most of what this business does beyond moving it.

See [the API pattern](../README.md) for shared conventions.

## The domain, in order

Material cannot ship until it is proven to be what the client ordered.

```
QAP agreed on the order          what inspection and testing this order needs
        ↓
Warehouse prepares material      MPR / warehouse intimation
        ↓
InspectionPrep                   collate heats, lengths, colour coding
        ↓
InspectionOffer                  invite the TPI agency to witness
        ↓
Inspection                       the visit; results, images, TPI sign-off
        ↓
LabLetter → LabReport            external destructive testing
        ↓
QCRelease                        stock moves UNDER_INSPECTION → ACCEPTED
        ↓
MTCCertificate                   the certificate issued to the client
```

An `NCR` (Non-Conformance Report) branches off wherever something fails.

## Vocabulary

- **MTC** — Mill Test Certificate. The mill's proof of a heat's chemistry and
  mechanical properties. The most important document in the chain.
- **Heat number** — identifies one batch of molten steel, stamped on the pipe.
  The link between a physical item and its certificate, and the reason
  traceability works.
- **TPI** — Third Party Inspection agency (Lloyd's, BV, TUV, SGS), nominated by
  the client, independent of both parties.
- **QAP** — Quality Assurance Plan; what the client requires. Inspection is
  decided at order level, testing per item — see `src/lib/quality/qap.ts`.
- **PMI / NDT / IGC / Hydro / Charpy** — see
  `src/lib/constants/order-processing.ts` for the full glossary.
- **Length tally** — pipe ships in random lengths, so a 100 m order is some
  number of pieces. The tally is the piece-by-piece record an inspector counts
  against.

## The MTC sub-cluster

`MTCMaterialSpec` declares, per grade, which chemical elements and mechanical
properties apply and their permitted ranges. `MTCCertificate` then records
measured results per heat against that spec, so a value out of range is
detectable rather than merely recorded.

That is why there are separate chemical, mechanical and impact result tables.

## Gotchas

- **Attachments used to be lost.** Inspection images, lab reports and MTC
  documents were written to a filesystem Vercel wipes. They now go to
  `StoredFile`; paths are `/api/files/<id>`.
- **QC release is a stock transition**, not just a record — it moves stock to
  `ACCEPTED` and makes it reservable.
- Inspection results feed vendor quality scoring in the vendor performance
  report.

## Related

- `src/lib/quality/qap.ts`, `src/lib/constants/order-processing.ts`
- `src/lib/pdf/inspection-offer-template.ts`
- `src/lib/storage/files.ts`
