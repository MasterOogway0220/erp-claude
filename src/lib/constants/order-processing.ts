export const LAB_TESTS = [
  { value: "CHEMICAL", label: "Chemical Test" },
  { value: "TENSILE", label: "Tensile Test" },
  { value: "BEND", label: "Bend Test" },
  { value: "FLATTENING", label: "Flattening Test" },
  { value: "FLARING", label: "Flaring Test" },
  { value: "IGC_PRACTICE_E", label: "IGC Practice 'E' Test" },
  { value: "IGC_PRACTICE_E_MAG", label: "IGC Practice 'E' Test With 20X-250X Mag." },
  { value: "HARDNESS", label: "Hardness Test" },
  { value: "IMPACT", label: "Impact Test" },
  { value: "MACRO_SEAMLESS", label: "Macro Test for Seamless" },
  { value: "MICRO", label: "Micro Test" },
] as const;

export const NDT_TESTS = [
  { value: "DP_TEST", label: "DP Test" },
  { value: "MP_TEST", label: "MP Test" },
  { value: "UT_TEST", label: "UT Test" },
  { value: "RADIOGRAPHY", label: "Radiography" },
] as const;

export const TPI_TYPES = [
  { value: "TPI_CLIENT_QA", label: "Inspection under TPI/Client QA" },
  { value: "INHOUSE_QA", label: "Inspection by Inhouse QA" },
] as const;

export const PMI_TYPES = [
  { value: "INTERNAL", label: "Internal" },
  { value: "UNDER_WITNESS", label: "Under Witness" },
  { value: "BOTH", label: "Both" },
] as const;

export const COATING_SIDES = [
  { value: "INSIDE", label: "Inside" },
  { value: "OUTSIDE", label: "Outside" },
  { value: "BOTH", label: "Both" },
] as const;

export const PROCESSING_STATUS = {
  UNPROCESSED: "UNPROCESSED",
  PROCESSING: "PROCESSING",
  PROCESSED: "PROCESSED",
} as const;

export const ITEM_PROCESSING_STATUS = {
  PENDING: "PENDING",
  PROCESSED: "PROCESSED",
} as const;
