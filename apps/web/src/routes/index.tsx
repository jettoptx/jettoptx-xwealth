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
  XLogo,
} from "@/components/brand-icons";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <main className="relative">
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-20">
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
          <Badge variant="outline">dry-run · USDC / Solana</Badge>
        </div>

        <h1 className="mt-6 max-w-3xl text-balance font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          𝕏 Money for agent harnesses.
          <span className="mt-2 block text-2xl font-semibold text-muted sm:text-3xl lg:text-4xl">
            Paste your pay link. Plug x402. Play.
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          <strong className="font-semibold text-fg">𝕏 Wealth</strong> by{" "}
          <strong className="font-semibold text-fg">
            Jett Optical Encryption
          </strong>{" "}
          links your 𝕏 handle, captures your 𝕏 Money pay/transfer link and QR,
          and gives Grok Build, Hermes, and Claude a one-shot skill so they can
          pay you with HTTP 402 + USDC on Solana.
        </p>

        <HeroCtas />
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
          <Card className="overflow-hidden bg-surface">
            <CardContent className="space-y-3 p-6 font-mono text-xs leading-relaxed text-muted">
              <div className="text-subtle">// agent request</div>
              <div>GET /api/x402/pay</div>
              <div className="text-warn">← 402 Payment Required</div>
              <div className="text-subtle">// accepts USDC · solana-mainnet</div>
              <div>payTo: x.com/i/money/pay/you</div>
              <div className="pt-2 text-subtle">// retry with signature</div>
              <div>{"PAYMENT-SIGNATURE: <base64>"}</div>
              <div className="text-accent">← 200 dry-run receipt</div>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t border-border bg-bg/90 py-10 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div className="flex flex-col gap-2">
            <JettOptWordmark
              height={44}
              className="rounded-md object-contain object-left"
            />
            <p className="text-xs text-subtle">
              𝕏 Wealth ·{" "}
              <a
                href="https://x.com/jettoptx"
                target="_blank"
                rel="noreferrer"
                className="text-muted hover:text-fg"
              >
                @jettoptx
              </a>
            </p>
          </div>
          <div className="self-start rounded-md border border-border bg-bg p-1.5 sm:self-end">
            <OptxBadge height={28} className="block rounded-sm" />
          </div>
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
        <Link to="/exhibit">E𝕏hibit kit</Link>
      </Button>
    </div>
  );
}
