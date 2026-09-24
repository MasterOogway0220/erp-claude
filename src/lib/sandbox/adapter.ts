import type {
  SqlDriverAdapter,
  SqlDriverAdapterFactory,
  SqlQuery,
  Transaction,
} from "@prisma/driver-adapter-utils";
import { toSandboxSql } from "./rewrite";

/**
 * Wraps a Prisma driver adapter so that every statement it sends — model
 * queries, writes, interactive-transaction statements and raw SQL — has its
 * real table names renamed to the sbx_ copies first. A statement the renamer
 * cannot make safe throws before it reaches the database.
 *
 * This sits below Prisma's query engine, so nothing a route does with the
 * client (includes, nested writes, $transaction, $queryRaw) can go around it.
 */
export function sandboxAdapter(factory: SqlDriverAdapterFactory, tables: readonly string[]): SqlDriverAdapterFactory {
  const rename = (q: SqlQuery): SqlQuery => ({ ...q, sql: toSandboxSql(q.sql, tables) });

  const wrapQueryable = <T extends Transaction | SqlDriverAdapter>(target: T): T =>
    new Proxy(target, {
      get(t, prop, receiver) {
        const value = Reflect.get(t, prop, receiver);
        if (typeof value !== "function") return value;
        switch (prop) {
          case "queryRaw":
          case "executeRaw":
            return (q: SqlQuery) => value.call(t, rename(q));
          case "executeScript":
            return (script: string) => value.call(t, toSandboxSql(script, tables));
          case "startTransaction":
            return async (...args: unknown[]) => wrapQueryable(await value.apply(t, args));
          default:
            return value.bind(t);
        }
      },
    });

  return new Proxy(factory, {
    get(t, prop, receiver) {
      const value = Reflect.get(t, prop, receiver);
      if (prop === "connect" && typeof value === "function") {
        return async () => wrapQueryable(await value.call(t));
      }
      return typeof value === "function" ? value.bind(t) : value;
    },
  });
}
