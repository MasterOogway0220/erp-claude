import { Prisma } from "@prisma/client";

/**
 * Every real table the Prisma schema maps to. The sandbox copies exactly these
 * (as sbx_<table>) and the sandbox client renames exactly these, so the two
 * can never disagree about what "a real table" is.
 */
export const MODEL_TABLES: readonly string[] = (
  Prisma.dmmf.datamodel.models as unknown as { name: string; dbName: string | null }[]
).map((m) => m.dbName ?? m.name);
