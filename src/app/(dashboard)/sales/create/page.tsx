"use client";

// Sandbox preview (2026-10-05): the sandbox login gets the new version
// (./page.sandbox), everyone else the unchanged one (./page.legacy).
// Going live: replace this file with page.sandbox.tsx and delete both copies.
import { sandboxSwitch } from "@/components/sandbox/preview-gate";
import Next from "./page.sandbox";
import Legacy from "./page.legacy";

export default sandboxSwitch(Next, Legacy);
