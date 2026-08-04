/**
 * LIVE pay processing checklist — agent-terminal style steps.
 * Empty → active → done / fail for each stage of the transaction path.
 */
import { Check, Circle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type FlowStepId =
  | "auth"
  | "wallet"
  | "agent_wallet"
  | "jtx"
  | "sign"
  | "settle"
  | "xmoney";

export type FlowStepStatus = "idle" | "active" | "done" | "fail" | "skip";

export type FlowStep = {
  id: FlowStepId;
  label: string;
  detail?: string;
  status: FlowStepStatus;
};

export const LIVE_FLOW_TEMPLATE: Omit<FlowStep, "status" | "detail">[] = [
  { id: "auth", label: "Sign in (X / Privy)" },
  { id: "wallet", label: "Solana payment wallet ready" },
  { id: "agent_wallet", label: "Preferred Solana agent wallet" },
  { id: "jtx", label: "JTX ≥1 ownership proof" },
  { id: "sign", label: "Sign x402 payment message (Solana)" },
  { id: "settle", label: "Server settle / LIVE intent" },
  { id: "xmoney", label: "Open X Wallet Pay" },
];

export function blankLiveFlow(): FlowStep[] {
  return LIVE_FLOW_TEMPLATE.map((s) => ({ ...s, status: "idle" as const }));
}

export function patchFlow(
  steps: FlowStep[],
  id: FlowStepId,
  status: FlowStepStatus,
  detail?: string,
): FlowStep[] {
  return steps.map((s) =>
    s.id === id
      ? { ...s, status, detail: detail !== undefined ? detail : s.detail }
      : s,
  );
}

function StepIcon({ status }: { status: FlowStepStatus }) {
  if (status === "active")
    return <Loader2 className="size-3.5 animate-spin text-amber-400" />;
  if (status === "done")
    return <Check className="size-3.5 text-emerald-400" />;
  if (status === "fail") return <X className="size-3.5 text-red-400" />;
  if (status === "skip")
    return <Circle className="size-3.5 text-muted opacity-40" />;
  return <Circle className="size-3.5 text-muted/50" />;
}

export function LivePayFlowChecklist({
  steps,
  title = "LIVE transaction flow",
}: {
  steps: FlowStep[];
  title?: string;
}) {
  const active = steps.find((s) => s.status === "active");
  const failed = steps.find((s) => s.status === "fail");
  const doneCount = steps.filter((s) => s.status === "done").length;

  return (
    <div
      className={cn(
        "rounded-xl border p-3 font-mono text-xs",
        failed
          ? "border-red-500/35 bg-red-500/5"
          : "border-amber-500/25 bg-amber-500/5",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-200/90">
          {title}
        </span>
        <span className="text-[10px] text-muted">
          {doneCount}/{steps.length}
          {active ? ` · ${active.label}` : failed ? " · failed" : ""}
        </span>
      </div>
      <ol className="space-y-1.5">
        {steps.map((s, i) => (
          <li
            key={s.id}
            className={cn(
              "flex items-start gap-2 rounded-md px-1.5 py-1",
              s.status === "active" && "bg-amber-500/10",
              s.status === "fail" && "bg-red-500/10",
              s.status === "done" && "opacity-90",
              s.status === "idle" && "opacity-45",
            )}
          >
            <span className="mt-0.5 shrink-0">
              <StepIcon status={s.status} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[10px] text-subtle">{i + 1}.</span>
                <span
                  className={cn(
                    "text-[11px]",
                    s.status === "active" && "text-amber-100",
                    s.status === "done" && "text-emerald-200/90",
                    s.status === "fail" && "text-red-300",
                    s.status === "idle" && "text-muted",
                  )}
                >
                  {s.label}
                </span>
              </div>
              {s.detail ? (
                <div className="mt-0.5 break-all text-[10px] text-muted">
                  {s.detail}
                </div>
              ) : s.status === "idle" ? (
                <div className="mt-0.5 text-[10px] text-subtle/60">—</div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
