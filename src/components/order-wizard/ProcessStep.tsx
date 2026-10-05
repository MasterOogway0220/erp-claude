"use client";

// Sandbox preview (2026-10-05): the sandbox login gets the new version
// (./ProcessStep.sandbox), everyone else the unchanged one (./ProcessStep.legacy).
// Going live: replace this file with ProcessStep.sandbox.tsx and delete both copies.
import { sandboxSwitch } from "@/components/sandbox/preview-gate";
import { ProcessStep as Next } from "./ProcessStep.sandbox";
import { ProcessStep as Legacy } from "./ProcessStep.legacy";

export const ProcessStep = sandboxSwitch(Next, Legacy, null);
