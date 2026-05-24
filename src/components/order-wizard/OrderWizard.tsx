"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WizardOrder {
  id: string;
  soNo: string;
  status: string;
  processingStatus: string;
  allotmentStatus: string;
  poAcceptanceStatus: string;
  [key: string]: unknown;
}

interface OrderWizardProps {
  order: WizardOrder;
}

// ---------------------------------------------------------------------------
// Step config
// ---------------------------------------------------------------------------

const STEPS = [
  { id: 0, label: "Review" },
  { id: 1, label: "Process" },
  { id: 2, label: "Allotment" },
  { id: 3, label: "Ready" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

// ---------------------------------------------------------------------------
// deriveInitialStep
//
// Maps the order's status fields → the step the wizard should land on.
//
// Logic:
//   - allotmentStatus COMPLETED → step 3 (Ready)
//   - allotmentStatus IN_PROGRESS or processingStatus PROCESSED → step 2 (Allotment)
//   - processingStatus PROCESSING or PROCESSED → step 1 (Process)
//   - otherwise → step 0 (Review)
// ---------------------------------------------------------------------------

function deriveInitialStep(order: WizardOrder): StepId {
  if (order.allotmentStatus === "COMPLETED") return 3;
  if (order.allotmentStatus === "IN_PROGRESS") return 2;
  if (
    order.processingStatus === "PROCESSED" ||
    order.processingStatus === "PROCESSING"
  )
    return 1;
  return 0;
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

interface StepIndicatorProps {
  currentStep: StepId;
  onStepClick: (id: StepId) => void;
}

function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex items-center w-full mb-8">
      {STEPS.map((step, idx) => {
        const isDone = step.id < currentStep;
        const isActive = step.id === currentStep;
        const isUpcoming = step.id > currentStep;

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            {/* Circle + label */}
            <button
              type="button"
              className={cn(
                "flex flex-col items-center gap-1 focus:outline-none group",
                // Completed steps are clickable (to go back read-only);
                // upcoming steps are not clickable.
                isDone ? "cursor-pointer" : "cursor-default"
              )}
              onClick={() => {
                // Only allow navigating to completed steps (going back).
                // Cannot skip ahead by clicking the indicator.
                if (isDone) onStepClick(step.id as StepId);
              }}
              disabled={isUpcoming || isActive}
              aria-current={isActive ? "step" : undefined}
            >
              <span
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors",
                  isDone &&
                    "bg-primary border-primary text-primary-foreground group-hover:opacity-80",
                  isActive &&
                    "border-primary text-primary bg-primary/10",
                  isUpcoming &&
                    "border-muted-foreground/30 text-muted-foreground bg-background"
                )}
              >
                {isDone ? <Check className="w-4 h-4" /> : step.id + 1}
              </span>
              <span
                className={cn(
                  "text-xs font-medium whitespace-nowrap",
                  isDone && "text-primary",
                  isActive && "text-primary",
                  isUpcoming && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </button>

            {/* Connector line (skip after last) */}
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 mb-5 transition-colors",
                  step.id < currentStep ? "bg-primary" : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Placeholder step bodies
// (Phases 3–5 will replace these with real extracted components.)
// ---------------------------------------------------------------------------

function ReviewStepBody({ order }: { order: WizardOrder }) {
  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/40 p-10 text-center text-muted-foreground">
      <p className="text-sm font-medium">Review step — Phase 3</p>
      <p className="text-xs mt-1">
        (Will render ReviewStep extracted from{" "}
        <code>sales/[id]/review/page.tsx</code>)
      </p>
    </div>
  );
}

function ProcessStepBody({ order }: { order: WizardOrder }) {
  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/40 p-10 text-center text-muted-foreground">
      <p className="text-sm font-medium">Process step — Phase 5</p>
      <p className="text-xs mt-1">
        (Will render ProcessStep extracted from{" "}
        <code>sales/[id]/process/page.tsx</code>)
      </p>
    </div>
  );
}

function AllotmentStepBody({ order }: { order: WizardOrder }) {
  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/40 p-10 text-center text-muted-foreground">
      <p className="text-sm font-medium">Allotment step — Phase 4</p>
      <p className="text-xs mt-1">
        (Will render AllotmentStep extracted from{" "}
        <code>sales/[id]/allotment/page.tsx</code> + reserve-stock panel)
      </p>
    </div>
  );
}

function ReadyStepBody({ order }: { order: WizardOrder }) {
  return (
    <div className="rounded-lg border border-dashed border-muted-foreground/40 p-10 text-center text-muted-foreground">
      <p className="text-sm font-medium">Ready — order workspace complete</p>
      <p className="text-xs mt-1">
        (Phase 3–5 will populate; will show downstream links: warehouse
        intimation, inspection, lab, dossier, status report.)
      </p>
    </div>
  );
}

const STEP_BODIES: Record<StepId, React.ComponentType<{ order: WizardOrder }>> =
  {
    0: ReviewStepBody,
    1: ProcessStepBody,
    2: AllotmentStepBody,
    3: ReadyStepBody,
  };

// ---------------------------------------------------------------------------
// OrderWizard
// ---------------------------------------------------------------------------

export function OrderWizard({ order }: OrderWizardProps) {
  const [step, setStep] = useState<StepId>(() => deriveInitialStep(order));

  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  const goBack = () => {
    if (!isFirst) setStep((s) => (s - 1) as StepId);
  };

  const goNext = () => {
    // TODO: gate on step completion before advancing.
    // Phase 3 (Review), Phase 4 (Allotment), Phase 5 (Process) will each
    // supply an `isComplete` signal here so Next is disabled until the step
    // reports its required data is saved.
    if (!isLast) setStep((s) => (s + 1) as StepId);
  };

  const handleIndicatorClick = (targetStep: StepId) => {
    // Only allow navigating to a COMPLETED step (going back, read-only).
    // Cannot jump to an upcoming step via the indicator.
    if (targetStep < step) setStep(targetStep);
  };

  const StepBody = STEP_BODIES[step];

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <StepIndicator currentStep={step} onStepClick={handleIndicatorClick} />

      {/* Step body */}
      <div className="min-h-[300px]">
        <StepBody order={order} />
      </div>

      {/* Next / Back footer */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={isFirst}
        >
          Back
        </Button>

        {!isLast && (
          <Button onClick={goNext}>
            {/* TODO: disable when active step is not yet complete (Phase 3/4/5 gate). */}
            Next
          </Button>
        )}

        {isLast && (
          <span className="text-sm text-muted-foreground">
            Order workspace complete
          </span>
        )}
      </div>
    </div>
  );
}
