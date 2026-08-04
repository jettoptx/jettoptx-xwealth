import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  FlaskConical,
  Loader2,
  Orbit,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { OPTX_LINKS } from "@/lib/optx-links";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PayLinkPanel } from "@/components/pay-link-panel";
import { X402Panel } from "@/components/x402-panel";
import { MoneySetupBanner } from "@/components/money-setup-banner";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useWealthStore } from "@/lib/store";
import {
  checkJtxGate,
  defaultWalletFromEnv,
  JTX_MINT,
  type JtxGateResult,
} from "@/lib/jtxGate";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dojo")({
  component: DojoHubPage,
});

/**
 * DOJO — operator paylink cockpit (distinct from /console account workspace).
 * JTX ≥1 gate is UI-enforced; LIVE settle still requires X402_LIVE_ENABLED.
 */
function DojoHubPage() {
  const { user } = useCurrentUserState();
  const money = useWealthStore((s) => s.money);
  const walletStore = useWealthStore((s) => s.solanaWallet);
  const setSolanaWallet = useWealthStore((s) => s.setSolanaWallet);

  const [wallet, setWallet] = useState(
    () => walletStore || defaultWalletFromEnv() || "",
  );
  const [gate, setGate] = useState<JtxGateResult | null>(null);
  const [gateBusy, setGateBusy] = useState(false);

  useEffect(() => {
    if (walletStore && walletStore !== wallet) setWallet(walletStore);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync store → local once
  }, [walletStore]);

  async function runGate() {
    const w = wallet.trim();
    setSolanaWallet(w);
    setGateBusy(true);
    try {
      const result = await checkJtxGate(w);
      setGate(result);
    } finally {
      setGateBusy(false);
    }
  }

  const jtxOk = gate?.ok === true;
  const sessionHandle = user?.handle ?? null;
  const step = !gate ? 1 : !jtxOk ? 1 : money ? 3 : 2;

  return (
    <main className="dojo-shell relative flex h-[calc(100dvh-3.5rem)] max-h-[calc(100dvh-3.5rem)] w-full flex-col overflow-hidden">
      {/* Light/dark atmosphere — not the Console account page */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklab,var(--color-accent)_14%,transparent),transparent_55%),radial-gradient(ellipse_at_bottom_right,color-mix(in_oklab,var(--color-augment)_10%,transparent),transparent_50%)]" />
        <div
          className="absolute inset-0 opacity-[0.35] dark:opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle, color-mix(in oklab, var(--color-fg) 12%, transparent) 0.55px, transparent 0.65px)",
            backgroundSize: "18px 18px",
          }}
        />
      </div>

      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-surface/75 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
              <FlaskConical className="size-3" />
              DOJO
            </span>
            <span className="font-mono text-[10px] text-subtle">
              operator cockpit · not Console
            </span>
          </div>
          <h1 className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">
            JTX gate → paylink → x402 dry-run
          </h1>
          <p className="mt-0.5 max-w-2xl text-xs text-muted sm:text-sm">
            Lab surface for wallet SKU + settle rehearsal. Account harness wiring
            stays on{" "}
            <Link to="/console" className="text-accent underline-offset-2 hover:underline">
              Console
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="gap-1 font-mono text-[10px]">
            <FlaskConical className="size-3" />
            DRY-RUN
          </Badge>
          <Badge
            variant={jtxOk ? "success" : "warn"}
            className="font-mono text-[10px]"
          >
            {jtxOk ? "JTX PASS" : "JTX locked"}
          </Badge>
          <Button asChild size="sm" variant="ghost" className="h-8 px-2">
            <Link to="/settings">
              <Settings2 className="size-3.5" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Step rail — differentiates DOJO from Console */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border/60 bg-elevated/40 px-4 py-2 sm:px-6">
        <StepChip n={1} label="Gate JTX" active={step === 1} done={jtxOk} />
        <span className="text-subtle">→</span>
        <StepChip n={2} label="Link pay" active={step === 2} done={Boolean(money)} />
        <span className="text-subtle">→</span>
        <StepChip n={3} label="Dry-run x402" active={step === 3} done={false} />
        <div className="ml-auto flex flex-wrap gap-1.5">
          <Button asChild size="sm" variant="secondary" className="h-7">
            <Link
              to="/warp"
              search={{ market: undefined, vibe: undefined }}
              className="inline-flex items-center gap-1"
            >
              <Orbit className="size-3.5" />
              WARP
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="h-7">
            <Link
              to="/augments"
              search={{ embed: undefined }}
              className="inline-flex items-center gap-1"
            >
              <Sparkles className="size-3.5" />
              Augments
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="h-7">
            <a
              href={OPTX_LINKS.dojoMoa}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1"
            >
              <BookOpen className="size-3.5" />
              Docs
            </a>
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
        <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] lg:gap-5">
          {/* Left column — gate (operator-only chrome) */}
          <aside className="space-y-4 lg:sticky lg:top-0 lg:self-start">
            <Card className="border-accent/25 bg-surface/90 shadow-panel">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  {jtxOk ? (
                    <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <ShieldAlert className="size-4 text-warn" />
                  )}
                  JTX ≥1 gate
                </CardTitle>
                <CardDescription>
                  Product SKU = wallet balance. Mint{" "}
                  <span className="font-mono text-[10px]">
                    {JTX_MINT.slice(0, 8)}…
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="dojo-wallet" className="inline-flex items-center gap-1.5">
                    <Wallet className="size-3.5 text-subtle" />
                    Solana wallet pubkey
                  </Label>
                  <div className="flex flex-col gap-2">
                    <Input
                      id="dojo-wallet"
                      value={wallet}
                      onChange={(e) => setWallet(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void runGate()}
                      placeholder="Base58 pubkey"
                      className="font-mono text-sm"
                      spellCheck={false}
                    />
                    <Button
                      type="button"
                      onClick={() => void runGate()}
                      disabled={gateBusy || wallet.trim().length < 32}
                    >
                      {gateBusy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Check JTX"
                      )}
                    </Button>
                  </div>
                </div>
                {gate ? (
                  <div className="space-y-2">
                    <p
                      className={cn(
                        "rounded-lg border px-3 py-2 font-mono text-xs",
                        gate.ok
                          ? "border-emerald-600/35 bg-emerald-500/10 text-emerald-800 dark:border-emerald-500/30 dark:text-emerald-200"
                          : "border-warn/40 bg-warn/10 text-warn",
                      )}
                    >
                      {gate.ok
                        ? `PASS · ${gate.uiAmount} JTX · tools unlocked`
                        : `FAIL · ${gate.error ?? "need ≥1 JTX"}`}
                    </p>
                    {!gate.ok ? (
                      <Button asChild size="sm" variant="secondary" className="w-full">
                        <a
                          href={OPTX_LINKS.jtxBuy}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Buy JTX · astroknots.space/buy
                        </a>
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-xs text-muted">
                    Run the gate before dry-run x402. CLI:{" "}
                    <code className="text-[11px]">npm run check-jtx</code>
                    {" · "}
                    <a
                      href={OPTX_LINKS.jtxBuy}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-accent underline-offset-2 hover:underline"
                    >
                      Buy JTX
                    </a>
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="rounded-xl border border-border bg-surface/70 p-3 text-xs text-muted">
              <p className="font-mono text-[10px] uppercase tracking-wide text-subtle">
                DOJO vs Console
              </p>
              <ul className="mt-2 space-y-1.5 leading-relaxed">
                <li>
                  <strong className="text-fg">DOJO</strong> — JTX gate, paylink,
                  x402 dry-run (this page).
                </li>
                <li>
                  <strong className="text-fg">Console</strong> — account session,
                  harness wiring, onramp.
                </li>
              </ul>
              <Button asChild size="sm" variant="outline" className="mt-3 w-full">
                <Link to="/console">Open Console</Link>
              </Button>
            </div>
          </aside>

          {/* Right column — pay tools */}
          <section className="min-w-0 space-y-4">
            <MoneySetupBanner handle={sessionHandle ?? money?.handle ?? null} />

            <div
              className={cn(
                "space-y-4 transition-opacity",
                !jtxOk && "opacity-55",
              )}
            >
              {!jtxOk ? (
                <div className="rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
                  JTX gate locked — paste a wallet with ≥1 JTX and re-check, or{" "}
                  <a
                    href={OPTX_LINKS.jtxBuy}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline underline-offset-2"
                  >
                    buy JTX at astroknots.space/buy
                  </a>
                  .
                </div>
              ) : null}

              <fieldset
                disabled={!jtxOk}
                className="min-w-0 space-y-4 disabled:pointer-events-none"
              >
                <PayLinkPanel
                  defaultHandle={sessionHandle}
                  displayName={user?.displayName}
                  email={user?.primaryEmail}
                />
                <X402Panel />
              </fieldset>
            </div>

            <p className="pb-2 text-center font-mono text-[10px] text-subtle">
              /dojo · JTX gate · PayLinkPanel · X402Panel · LIVE needs
              X402_LIVE_ENABLED
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

function StepChip({
  n,
  label,
  active,
  done,
}: {
  n: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide",
        done &&
          "border-emerald-600/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
        !done &&
          active &&
          "border-accent/40 bg-accent/10 text-accent",
        !done &&
          !active &&
          "border-border bg-surface/60 text-subtle",
      )}
    >
      <span className="tabular-nums opacity-70">{n}</span>
      {label}
    </span>
  );
}
