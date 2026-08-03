import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  JettOptWordmark,
  JtxMark,
  OptxBadge,
  UsdcSolanaRail,
  XLogo,
} from "@/components/brand-icons";
/** Official Canvas UI Particle Reveal — https://canvasui.dev/docs/components/particle-reveal */
import { ParticleReveal } from "@/components/canvasui/ParticleReveal";
/** Official Canvas UI Decrypt Reveal — https://canvasui.dev/docs/components/decrypt-reveal */
import { DecryptReveal } from "@/components/canvasui/DecryptReveal";
import { Web4ToolsConstellation } from "@/components/web4-tools-constellation";
import { useTheme } from "@/lib/theme";
import { OPTX_LINKS } from "@/lib/optx-links";
import { WEB4_SLOGAN } from "@/lib/web4-seo";

/** Footer brand marks — compact Particle Reveal + outbound link. */
const FOOTER_BRAND_REVEAL = {
  radius: 160,
  softness: 0.8,
  size: 1,
  scatter: 18,
  drift: 1,
  aberration: 28,
  bend: 36,
  fade: 0.85,
  threshold: 0.1,
  smoothing: 0.22,
} as const;

const JETTOPTX_GITHUB_ORG = "https://github.com/jettoptx";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

/** Match site surface so dust contrast detection works in light + dark. */
function particleBg(theme: "light" | "dark") {
  return theme === "light" ? "#ffffff" : "#121214";
}

function LandingPage() {
  const { theme, mounted } = useTheme();
  const bg = particleBg(mounted ? theme : "dark");

  return (
    <main className="relative">
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div>
            <div className="mb-5">
              <JtxMark
                size={56}
                className="h-14 w-14 rounded-2xl border border-border bg-surface object-cover shadow-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success">X Developer E𝕏hibit ready</Badge>
              <Badge variant="outline" className="font-mono">
                @jettoptx
              </Badge>
              <UsdcSolanaRail className="border-border bg-surface text-fg" />
            </div>

            <h1 className="mt-6 max-w-3xl text-balance font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              𝕏 Money for agent harnesses.
              <span className="mt-2 block text-2xl font-semibold text-muted sm:text-3xl lg:text-4xl">
                Paste your pay link. Plug x402. Play.
              </span>
            </h1>

            <p className="mt-4 max-w-xl font-mono text-[11px] uppercase tracking-[0.14em] text-augment">
              {WEB4_SLOGAN}
            </p>

            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
              <strong className="font-semibold text-fg">𝕏 Wealth</strong> by{" "}
              <strong className="font-semibold text-fg">
                Jett Optical Encryption
              </strong>{" "}
              links your 𝕏 handle, captures your 𝕏 Money pay/transfer link and QR,
              and gives Grok Build, Hermes, and Claude a one-shot skill so they can
              pay you with HTTP 402 + USDC on Solana.
            </p>

            <HeroCtas />
          </div>

          {/* Constellation — Canvas UI Particle Reveal (html-in-canvas) */}
          <div className="relative min-h-[320px] w-full">
            <ParticleReveal
              className="h-full min-h-[320px] w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-panel"
              background={bg}
              radius={500}
              softness={0.75}
              size={1}
              scatter={25}
              drift={1}
              aberration={40}
              bend={50}
              fade={0.85}
              threshold={0.1}
              smoothing={0.25}
            >
              <Web4ToolsConstellation className="h-full w-full border-0 shadow-none" />
            </ParticleReveal>
            <p className="pointer-events-none mt-3 text-center text-[12px] leading-snug text-muted sm:text-[13px]">
              <span className="font-medium text-fg/90">
                Move cursor over the graph to reveal
              </span>
              <span className="mx-1.5 text-subtle" aria-hidden>
                ·
              </span>
              <span className="font-mono text-[11px] tracking-wide text-subtle sm:text-[12px]">
                Canvas UI · Particle Reveal
              </span>
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-accent">
              <QrCode className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wider">
                Flow
              </span>
            </div>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              From 𝕏 Money to agent pay in three steps
            </h2>
            <ol className="mt-6 space-y-4 text-sm leading-relaxed text-muted">
              <li className="flex gap-3">
                <span className="font-mono text-accent">01</span>
                Sign in with 𝕏 and save your Money pay or transfer link.
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-accent">02</span>
                Copy the harness skill for Grok Build, Hermes, or Claude.
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-accent">03</span>
                Agents hit 402, attach a USDC payment signature, settle dry-run
                into your 𝕏 Money account.
              </li>
            </ol>
          </div>
          {/* Agent request card — Canvas UI Decrypt Reveal (cipher → clear UI) */}
          <div className="relative w-full">
            <div
              className="relative h-[280px] w-full touch-none overflow-hidden rounded-2xl border border-border bg-surface shadow-panel"
              style={{ minHeight: 280 }}
            >
              <DecryptReveal
                className="absolute inset-0 h-full w-full"
                background={bg}
                radius={420}
                softness={0.5}
                cell={10}
                aspect={0.75}
                colored={1}
                color="#ff6900"
                brightness={1.15}
                legibility={1}
                contrast={1.15}
                exposure={1.1}
                scramble={0.22}
                scrambleSpeed={10}
                edgeWidth={0.25}
                edgeFlicker={1}
                edgeGlow={2.2}
                edgeTint={0.85}
                aberration={12}
                passthrough={0}
                threshold={0.02}
                smoothing={0.16}
              >
                <Card className="absolute inset-0 h-full w-full border-0 bg-surface shadow-none">
                  <CardContent className="box-border h-full space-y-3 overflow-hidden p-6 font-mono text-xs leading-relaxed text-muted">
                    <div className="text-subtle">// agent request</div>
                    <div>GET /api/x402/pay</div>
                    <div className="text-warn">← 402 Payment Required</div>
                    <div className="text-subtle">
                      // accepts USDC · solana-mainnet
                    </div>
                    <div>
                      payTo: x.com/i/money/pay/
                      <span className="rounded bg-accent/90 px-1 text-primary-fg">
                        you
                      </span>
                    </div>
                    <div className="pt-2">
                      <span className="rounded bg-accent/90 px-1.5 py-0.5 text-[11px] font-semibold text-primary-fg">
                        // retry with signature
                      </span>
                    </div>
                    <div>{"PAYMENT-SIGNATURE: <base64>"}</div>
                    <div className="text-accent">← 200 dry-run receipt</div>
                  </CardContent>
                </Card>
              </DecryptReveal>
            </div>
            <p className="pointer-events-none mt-3 text-center text-[12px] leading-snug text-muted sm:text-[13px]">
              <span className="font-medium text-fg/90">
                Move cursor over the cipher to decrypt
              </span>
              <span className="mx-1.5 text-subtle" aria-hidden>
                ·
              </span>
              <span className="font-mono text-[11px] tracking-wide text-subtle sm:text-[12px]">
                Canvas UI · Decrypt Reveal
              </span>
            </p>
          </div>
        </div>
      </section>

      <footer className="shrink-0 overflow-hidden border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 overflow-hidden px-4 py-10 sm:px-6">
          {/* Brand pair — fixed height, never scrollable; hover dust only */}
          <div className="flex shrink-0 items-center justify-center gap-5 overflow-hidden sm:gap-6">
            <a
              href={OPTX_LINKS.home}
              target="_blank"
              rel="noreferrer"
              title="Jett Optical Encryption · jettoptics.ai"
              aria-label="Jett Optical Encryption — open jettoptics.ai"
              className="group block shrink-0 overflow-hidden rounded-xl outline-none ring-offset-bg transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ParticleReveal
                className="h-11 w-auto min-w-[140px] max-w-[220px] overflow-hidden rounded-xl border border-border/50 bg-surface shadow-sm sm:h-12"
                background={bg}
                contentOverflow="hidden"
                {...FOOTER_BRAND_REVEAL}
              >
                <div className="flex h-11 max-h-12 items-center justify-center overflow-hidden px-2 sm:h-12">
                  <JettOptWordmark
                    height={44}
                    className="pointer-events-none h-11 w-auto max-h-12 object-contain opacity-95 sm:h-12"
                  />
                </div>
              </ParticleReveal>
            </a>
            <span
              className="h-7 w-px shrink-0 bg-border-strong/60 sm:h-8"
              aria-hidden
            />
            <a
              href={JETTOPTX_GITHUB_ORG}
              target="_blank"
              rel="noreferrer"
              title="OPTX · github.com/jettoptx"
              aria-label="OPTX — open jettoptx on GitHub"
              className="group block shrink-0 overflow-hidden rounded-xl outline-none ring-offset-bg transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ParticleReveal
                className="h-11 w-auto min-w-[88px] max-w-[140px] overflow-hidden rounded-xl border border-border/50 bg-surface shadow-sm sm:h-12"
                background={bg}
                contentOverflow="hidden"
                {...FOOTER_BRAND_REVEAL}
              >
                <div className="flex h-11 max-h-12 items-center justify-center overflow-hidden px-2 sm:h-12">
                  <OptxBadge
                    height={44}
                    className="pointer-events-none h-11 w-auto max-h-12 object-contain opacity-95 sm:h-12"
                  />
                </div>
              </ParticleReveal>
            </a>
          </div>
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm tracking-wide text-muted sm:text-base">
            <span className="inline-flex items-center gap-1.5 font-display font-semibold text-fg">
              <XLogo className="size-4" />
              Wealth
            </span>
            <span className="text-border-strong" aria-hidden>
              ·
            </span>
            <a
              href="https://x.com/jettoptx"
              target="_blank"
              rel="noreferrer"
              className="font-mono text-muted transition-colors hover:text-fg"
            >
              @jettoptx
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}

function HeroCtas() {
  const { user, isPending } = useCurrentUserState();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const showSkeleton = !mounted || isPending;

  return (
    <div className="mt-8 flex min-h-12 flex-wrap gap-3">
      {showSkeleton ? (
        <div
          className="h-12 w-40 animate-pulse rounded-lg bg-elevated"
          aria-hidden
        />
      ) : user ? (
        <Button asChild size="lg">
          <Link to="/console">
            Open console
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      ) : (
        <Button asChild size="lg">
          <Link to="/login" className="inline-flex items-center gap-2">
            <XLogo className="size-4" />
            Pay Link
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      )}
      <Button asChild size="lg" variant="secondary">
        <Link to="/dojo">DOJO</Link>
      </Button>
    </div>
  );
}
