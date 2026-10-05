import { NextResponse } from "next/server";
import { currentSandbox } from "./context";

/**
 * Sandbox preview for API routes: the sandbox login is served the new handler,
 * every other user the unchanged one. Used while changes are tried out on the
 * sandbox account before they go live for everyone (see docs for this file).
 *
 * A method that exists on only one side answers 405 on the other, exactly as
 * if the route did not have it.
 */
// Some existing handlers have a path that returns nothing; Next allows that.
type Result = Response | undefined | void;

export function sandboxGate<Req, Ctx>(
  next: ((req: Req, ctx: Ctx) => Promise<Result> | Result) | undefined,
  legacy: ((req: Req, ctx: Ctx) => Promise<Result> | Result) | undefined
) {
  return async (req: Req, ctx: Ctx): Promise<Result> => {
    const handler = (await currentSandbox()) ? next : legacy;
    if (!handler) return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
    return handler(req, ctx);
  };
}
