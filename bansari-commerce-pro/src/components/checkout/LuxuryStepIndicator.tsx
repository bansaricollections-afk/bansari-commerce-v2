"use client";

type Step = {
  id: number;
  label: string;
};

const STEPS: Step[] = [
  { id: 1, label: "Details" },
  { id: 2, label: "Shipping" },
  { id: 3, label: "Payment" },
];

type Props = {
  /** 1-indexed current step */
  currentStep: number;
};

/**
 * LuxuryStepIndicator — minimal editorial step progress for the checkout flow.
 * Purely presentational; parent controls currentStep.
 */
export default function LuxuryStepIndicator({ currentStep }: Props) {
  return (
    <nav
      aria-label="Checkout progress"
      className="flex items-center justify-center gap-0"
      style={{ paddingBlock: "var(--bc-space-6)" }}
    >
      {STEPS.map((step, idx) => {
        const done = currentStep > step.id;
        const active = currentStep === step.id;

        return (
          <div key={step.id} className="flex items-center">
            {/* Step node */}
            <div className="flex flex-col items-center gap-1">
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: done || active ? "var(--bc-text-primary)" : "transparent",
                  border: "1px solid",
                  borderColor: done || active ? "var(--bc-text-primary)" : "var(--bc-border-soft)",
                  transition: "all 300ms ease",
                }}
                aria-current={active ? "step" : undefined}
              >
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span
                    style={{
                      fontFamily: "var(--font-inter), sans-serif",
                      fontSize: "var(--bc-text-xs)",
                      fontWeight: active ? 600 : 400,
                      color: active ? "#fff" : "var(--bc-text-muted)",
                    }}
                  >
                    {step.id}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "var(--bc-text-xs)",
                  fontWeight: active ? 600 : 400,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: active ? "var(--bc-text-primary)" : "var(--bc-text-muted)",
                }}
              >
                {step.label}
              </span>
            </div>

            {/* Connector */}
            {idx < STEPS.length - 1 && (
              <div
                aria-hidden="true"
                style={{
                  width: 56,
                  height: 1,
                  marginBottom: 18,
                  backgroundColor: done ? "var(--bc-text-primary)" : "var(--bc-border-soft)",
                  transition: "background-color 300ms ease",
                }}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
