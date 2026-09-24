import { Prisma } from "@prisma/client";

// Model delegates as they appear on the client: `Quotation` -> `quotation`,
// `RFQVendor` -> `rFQVendor`.
const DELEGATES = new Set(
  (Prisma.dmmf.datamodel.models as unknown as { name: string }[]).map((m) => m.name[0].toLowerCase() + m.name.slice(1))
);
const RAW = new Set(["$queryRaw", "$queryRawUnsafe", "$executeRaw", "$executeRawUnsafe"]);

type AnyFn = (...args: unknown[]) => unknown;

/**
 * A client that decides per call which real client runs it: `sandbox()` when
 * `pickSandbox()` names a sandbox user for this request, `base()` otherwise.
 *
 * Model calls, $transaction and raw SQL are routed; everything else
 * ($connect, $disconnect, $on, ...) stays on the base client. The sandbox
 * client is only constructed the first time a sandbox request needs it.
 */
export function routedClient<C extends object>(
  base: () => C,
  sandbox: () => C,
  pickSandbox: () => Promise<string | null>
): C {
  const choose = async (): Promise<Record<string, unknown>> =>
    ((await pickSandbox()) ? sandbox() : base()) as Record<string, unknown>;

  const delegates = new Map<string, object>();
  const delegate = (name: string) => {
    let d = delegates.get(name);
    if (!d) {
      d = new Proxy(
        {},
        {
          get: (_t, method) =>
            typeof method === "string"
              ? (...args: unknown[]) =>
                  choose().then((c) => {
                    const target = c[name] as Record<string, AnyFn>;
                    return target[method](...args);
                  })
              : undefined,
        }
      );
      delegates.set(name, d);
    }
    return d;
  };

  return new Proxy({} as C, {
    get(_t, prop) {
      if (typeof prop === "string" && DELEGATES.has(prop)) return delegate(prop);
      if (prop === "$transaction") {
        return (arg: unknown, options?: unknown) => {
          // Routed calls are already-running Promises, not lazy
          // PrismaPromises, so an array could only be Promise.all — silently
          // not atomic. Refuse it; the callback form works on both clients.
          if (Array.isArray(arg)) {
            throw new Error("prisma.$transaction([...]) is not supported; use the callback form $transaction(async (tx) => ...)");
          }
          return choose().then((c) => (c.$transaction as AnyFn).call(c, arg, options));
        };
      }
      if (typeof prop === "string" && RAW.has(prop)) {
        return (...args: unknown[]) => choose().then((c) => (c[prop] as AnyFn).apply(c, args));
      }
      const b = base();
      const value = Reflect.get(b, prop, b);
      // Methods must keep their `this`; everything else is a plain property.
      return typeof value === "function" ? value.bind(b) : value;
    },
  });
}
