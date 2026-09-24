import { beforeEach, describe, expect, it, vi } from "vitest";

const sandbox = vi.hoisted(() => ({ user: null as string | null }));
const realSend = vi.hoisted(() => vi.fn(async () => ({ messageId: "real" })));

vi.mock("@/lib/sandbox/context", () => ({ currentSandbox: async () => sandbox.user }));
vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail: realSend }) } }));

const { mailer } = await import("./mailer");

beforeEach(() => {
  sandbox.user = null;
  realSend.mockClear();
  process.env.SMTP_USER = "ops@n-pipe.com";
  process.env.SMTP_PASS = "secret";
});

describe("mailer() for the sandbox login", () => {
  it("never reaches SMTP and reports success, so the screen flow completes", async () => {
    sandbox.user = "akash";
    const info = await mailer().sendMail({ to: "buyer@client.com", subject: "Quotation NPS/26/15001" });
    expect(realSend).not.toHaveBeenCalled();
    expect(info.messageId).toMatch(/^sandbox-/);
    expect(info.accepted).toEqual(["buyer@client.com"]);
  });

  it("sends for real for everyone else", async () => {
    const info = await mailer().sendMail({ to: "buyer@client.com", subject: "x" });
    expect(realSend).toHaveBeenCalledOnce();
    expect(info.messageId).toBe("real");
  });
});
