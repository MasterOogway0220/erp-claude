"use client";

// Sandbox preview (2026-10-06): the sandbox login gets the new version
// (./ReviewStep.sandbox), everyone else the unchanged one (./ReviewStep.legacy).
// Going live: replace this file with ReviewStep.sandbox.tsx and delete both copies.
import { sandboxSwitch } from "@/components/sandbox/preview-gate";
import { ReviewStep as Next } from "./ReviewStep.sandbox";
import { ReviewStep as Legacy } from "./ReviewStep.legacy";

export const ReviewStep = sandboxSwitch(Next, Legacy, null);
