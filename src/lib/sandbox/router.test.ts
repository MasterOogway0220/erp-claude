import { describe, expect, it, vi } from "vitest";
import { routedClient } from "./router";

function fakeClient(tag: string) {
  return {
    tag,
    quotation: { findMany: vi.fn(async (a?: unknown) => ({ tag, a })), count: vi.fn(async () => tag.length) },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(`${tag}-tx`)),
    $queryRaw: vi.fn(async (strings: TemplateStringsArray, ...v: unknown[]) => ({ tag, sql: strings.join("?"), v })),
    $executeRawUnsafe: vi.fn(async () => tag),
    $disconnect: vi.fn(async () => tag),
  };
}

function setup(sandboxUser: string | null) {
  const base = fakeClient("base");
  const sbx = fakeClient("sandbox");
  const sandboxFactory = vi.fn(() => sbx);
  const client = routedClient(() => base, sandboxFactory, async () => sandboxUser) as unknown as ReturnType<typeof fakeClient>;
  return { base, sbx, sandboxFactory, client };
}

describe("routedClient", () => {
  it("sends a normal request's model calls to the real client and never builds the sandbox client", async () => {
    const { client, base, sandboxFactory } = setup(null);
    expect(await client.quotation.findMany({ where: { id: "1" } })).toEqual({ tag: "base", a: { where: { id: "1" } } });
    expect(base.quotation.findMany).toHaveBeenCalledOnce();
    expect(sandboxFactory).not.toHaveBeenCalled();
  });

  it("sends a sandbox request's model calls to the sandbox client", async () => {
    const { client, base } = setup("akash");
    expect(await client.quotation.findMany()).toMatchObject({ tag: "sandbox" });
    expect(base.quotation.findMany).not.toHaveBeenCalled();
  });

  it("routes interactive transactions to the chosen client", async () => {
    expect(await setup("akash").client.$transaction(async (tx: unknown) => tx)).toBe("sandbox-tx");
    expect(await setup(null).client.$transaction(async (tx: unknown) => tx)).toBe("base-tx");
  });

  it("refuses the array form of $transaction rather than silently losing atomicity", () => {
    // Routed calls are already-running Promises, so an array could only ever
    // be Promise.all — not one DB transaction. Fail loudly instead.
    const { client } = setup(null);
    expect(() => client.$transaction([] as never)).toThrow(/callback form/);
  });

  it("routes raw SQL, including tagged templates", async () => {
    const { client } = setup("akash");
    expect(await client.$queryRaw`SELECT ${1}`).toMatchObject({ tag: "sandbox", v: [1] });
    expect(await client.$executeRawUnsafe()).toBe("sandbox");
  });

  it("leaves lifecycle methods on the real client", async () => {
    const { client } = setup("akash");
    expect(await client.$disconnect()).toBe("base");
  });
});
