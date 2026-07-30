import { Asciify } from "@/components/asciify/Asciify";

/**
 * Full-viewport Asciify field — black grid only.
 * No brand images or watermarks (those were bleeding into the hero).
 * UI chrome sits above in a separate layer.
 */
export function AsciifyBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <Asciify
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
        radius={0.5}
        softness={1}
        scale={2}
        spacing={1}
        charset="ascii"
        background="auto"
        backgroundOpacity={0}
        contrast={1.15}
        brightness={0.06}
        strength={1}
        baseStrength={0.28}
        followSpeed={3.5}
        glow={0.55}
        aberration={0.3}
      >
        {/* Source for the lens: pure dark grid — nothing else */}
        <div className="relative h-[100dvh] w-full overflow-hidden bg-bg">
          <div className="grid-bg absolute inset-0" />
          {/* Extra grid density so the ascii has structure without logos/text */}
          <div
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage: `
                linear-gradient(color-mix(in oklab, var(--color-fg) 5%, transparent) 1px, transparent 1px),
                linear-gradient(90deg, color-mix(in oklab, var(--color-fg) 5%, transparent) 1px, transparent 1px)
              `,
              backgroundSize: "24px 24px",
            }}
          />
        </div>
      </Asciify>
    </div>
  );
}
