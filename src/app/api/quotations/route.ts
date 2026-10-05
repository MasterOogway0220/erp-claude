// Sandbox preview (2026-10-05): the sandbox login gets the new version
// (./route.sandbox), everyone else the unchanged one (./route.legacy).
// Going live: replace this file with route.sandbox.ts and delete both copies.
import { sandboxGate } from "@/lib/sandbox/preview";
import * as next from "./route.sandbox";
import * as legacy from "./route.legacy";

export const GET = sandboxGate(next.GET, legacy.GET);
export const POST = sandboxGate(next.POST, legacy.POST);
