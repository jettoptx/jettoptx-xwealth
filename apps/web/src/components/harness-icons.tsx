import type { ReactNode } from "react";
import type { HarnessId } from "@/lib/harness";
import { cn } from "@/lib/utils";

/**
 * Real brand path data (lobe-icons / official marks):
 * - Grok spiral + xAI mark used for Grok Build
 * - Nous Research mark for Hermes Agent
 * - Claude orange starburst (official Anthropic mark color #D97757)
 * - Cursor mark for Custom harness
 *
 * Drop replacements into /public/harness/ anytime if you have press-kit files.
 */

function SvgShell({
  className,
  children,
  title,
}: {
  className?: string;
  children: ReactNode;
  title: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="currentColor"
      fillRule="evenodd"
    >
      <title>{title}</title>
      {children}
    </svg>
  );
}

/** Official-style Grok spiral mark */
export function GrokLogo({ className }: { className?: string }) {
  return (
    <SvgShell className={className} title="Grok">
      <path d="M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815" />
    </SvgShell>
  );
}

/** xAI wordmark-style mark (alternate Grok Build badge) */
export function XaiLogo({ className }: { className?: string }) {
  return (
    <SvgShell className={className} title="xAI">
      <path d="M6.469 8.776L16.512 23h-4.464L2.005 8.776H6.47zm-.004 7.9l2.233 3.164L6.467 23H2l4.465-6.324zM22 2.582V23h-3.659V7.764L22 2.582zM22 1l-9.952 14.095-2.233-3.163L17.533 1H22z" />
    </SvgShell>
  );
}

/** Claude / Anthropic mark — brand orange */
export function ClaudeLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="#D97757"
    >
      <title>Claude</title>
      <path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z" />
    </svg>
  );
}

/** Nous Research mark (parent of Hermes Agent) */
export function HermesLogo({ className }: { className?: string }) {
  return (
    <img
      src="/harness/hermes.svg"
      alt=""
      aria-hidden
      className={cn(className, "object-contain")}
      // mono SVG file — adapt to theme
      style={{
        filter: "var(--harness-icon-filter)",
      }}
      decoding="async"
    />
  );
}

/** Cursor mark — default custom harness */
export function CursorLogo({ className }: { className?: string }) {
  return (
    <SvgShell className={className} title="Cursor">
      <path d="M22.106 5.68L12.5.135a.998.998 0 00-.998 0L1.893 5.68a.84.84 0 00-.419.726v11.186c0 .3.16.577.42.727l9.607 5.547a.999.999 0 00.998 0l9.608-5.547a.84.84 0 00.42-.727V6.407a.84.84 0 00-.42-.726zm-.603 1.176L12.228 22.92c-.063.108-.228.064-.228-.061V12.34a.59.59 0 00-.295-.51l-9.11-5.26c-.107-.062-.063-.228.062-.228h18.55c.264 0 .428.286.296.514z" />
    </SvgShell>
  );
}

const MAP: Record<
  HarnessId,
  {
    Icon: (p: { className?: string }) => ReactNode;
    label: string;
    sub: string;
  }
> = {
  "grok-build": { Icon: GrokLogo, label: "Grok", sub: "xAI" },
  hermes: { Icon: HermesLogo, label: "Hermes", sub: "Nous" },
  claude: { Icon: ClaudeLogo, label: "Claude", sub: "Anthropic" },
  custom: { Icon: CursorLogo, label: "Custom", sub: "Cursor+" },
};

export function HarnessMark({
  id,
  className,
  size = "md",
}: {
  id: HarnessId;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { Icon } = MAP[id];
  const box =
    size === "sm" ? "size-8" : size === "lg" ? "size-12" : "size-10";
  const glyph =
    size === "sm" ? "size-4" : size === "lg" ? "size-7" : "size-5";

  return (
    <span
      className={cn(
        "grid place-items-center rounded-xl border border-border bg-bg text-fg",
        box,
        className,
      )}
    >
      <Icon className={glyph} />
    </span>
  );
}

export function harnessMeta(id: HarnessId) {
  const m = MAP[id];
  return { label: m.label, sub: m.sub };
}
