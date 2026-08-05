import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  FlaskConical,
  Loader2,
  LogIn,
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
import { usePrivySolanaWallet } from "@/lib/auth/use-privy-solana-wallet";
import { useWealthStore } from "@/lib/store";
import {
  checkJtxGate,
  isOwnedSolanaWallet,
  JTX_MINT,
  jtxUiGatePassed,
  type JtxGateResult,
} from "@/lib/jtxGate";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dojo")({
  component: DojoHubPage,
});

/**
 * DOJO — operator paylink cockpit (distinct from /console account workspace).
 * JTX ≥1 gate is UI-enforced against the signed-in user's Privy Solana wallet;
 * LIVE settle gated by server X402_LIVE_ENABLED (see /api/x402/status) + proven ownership.
 */
function DojoHubPage() {
  const { user, isPending: userPending } = useCurrentUserState();
  const money = useWealthStore((s) => s.money);
  const setSolanaWallet = useWealthStore((s) => s.setSolanaWallet);
  const {
    ready: privyReady,
    authenticated,
    addresses,
    primaryAddress,
    creating: walletCreating,
    login,
    ensureWallet,
    ownsAddress,
  } = usePrivySolanaWallet();

  const [selectedWallet, setSelectedWallet] = useState("");
  const [gate, setGate] = useState<JtxGateResult | null>(null);
  const [gateBusy, setGateBusy] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [x402Status, setX402Status] = useState<{
    liveEnabled: boolean;
    heliusConfigured: boolean;
    rpc: string;
    joeBuzzNotifyConfigured?: boolean;
  } | null>(null);

  // Bind selection to Privy-owned wallets only (never arbitrary paste / store foreign keys).
  useEffect(() => {
    if (!authenticated) {
      setSelectedWallet("");
      setGate(null);
      return;
    }
    if (addresses.length === 0) {
      setSelectedWallet((prev) => (prev && ownsAddress(prev) ? prev : ""));
      setGate((prev) =>
        prev && ownsAddress(prev.wallet) ? prev : null,
      );
      return;
    }
    setSelectedWallet((prev) =>
      prev && ownsAddress(prev) ? prev : (primaryAddress ?? addresses[0] ?? ""),
    );
  }, [authenticated, addresses, primaryAddress, ownsAddress]);

  // Persist only the Privy-bound address into the wealth store for settle headers.
  useEffect(() => {
    if (selectedWallet && ownsAddress(selectedWallet)) {
      setSolanaWallet(selectedWallet);
    }
  }, [selectedWallet, ownsAddress, setSolanaWallet]);

  // Drop stale gate results if the selected wallet is no longer owned.
  useEffect(() => {
    if (gate && !ownsAddress(gate.wallet)) {
      setGate(null);
    }
  }, [gate, ownsAddress]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/x402/status", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          liveEnabled: boolean;
          heliusConfigured: boolean;
          rpc: string;
        };
        if (!cancelled) setX402Status(data);
      } catch {
        /* keep null footer */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function provisionWallet() {
    setProvisionError(null);
    try {
      const addr = await ensureWallet();
      setSelectedWallet(addr);
      setSolanaWallet(addr);
    } catch (e) {
      setProvisionError(
        e instanceof Error ? e.message : "Could not create Solana wallet",
      );
    }
  }

  async function runGate() {
    if (!authenticated) {
      login();
      return;
    }
    setProvisionError(null);
    setGateBusy(true);
    try {
      let w = selectedWallet.trim();
      if (!w || !ownsAddress(w)) {
        w = await ensureWallet();
        setSelectedWallet(w);
      }
      // ensureWallet remembers the address in sessionOwned; re-check via hook state
      // may lag one render — trust the returned address as Privy-provisioned.
      setSolanaWallet(w);
      const result = await checkJtxGate(w);
      const ownedNow = addresses.includes(w) ? addresses : [...addresses, w];
      if (result.ok && !isOwnedSolanaWallet(result.wallet, ownedNow)) {
        setGate({
          ...result,
          ok: false,
          error: "JTX balance must be on your Privy Solana wallet",
        });
        return;
      }
      setGate(result);
    } catch (e) {
      setProvisionError(
        e instanceof Error ? e.message : "Gate check failed",
      );
      setGate(null);
    } finally {
      setGateBusy(false);
    }
  }

  const ownedForUi =
    selectedWallet && !addresses.includes(selectedWallet)
      ? [...addresses, selectedWallet]
      : addresses;
  const jtxOk = jtxUiGatePassed(gate, ownedForUi);
  const sessionHandle = user?.handle ?? null;
  const step = !gate ? 1 : !jtxOk ? 1 : money ? 3 : 2;
  const sessionLoading = userPending || !privyReady;
  const canCheck =
    authenticated &&
    (Boolean(selectedWallet && ownsAddress(selectedWallet)) ||
      addresses.length === 0);

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
                  Product SKU = your Privy Solana wallet balance. Mint{" "}
                  <span className="font-mono text-[10px]">
                    {JTX_MINT.slice(0, 8)}…
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {sessionLoading ? (
                  <p className="inline-flex items-center gap-2 text-xs text-muted">
                    <Loader2 className="size-3.5 animate-spin" />
                    Loading session…
                  </p>
                ) : !authenticated ? (
                  <div className="space-y-3">
                    <p className="text-xs text-muted">
                      Sign in with Privy to unlock DOJO tools with{" "}
                      <strong className="text-fg">your</strong> Solana wallet.
                      Pasting a foreign pubkey is not allowed.
                    </p>
                    <Button type="button" onClick={() => login()} className="w-full">
                      <LogIn className="size-4" />
                      Sign in to check JTX
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="dojo-wallet"
                        className="inline-flex items-center gap-1.5"
                      >
                        <Wallet className="size-3.5 text-subtle" />
                        Your Privy Solana wallet
                      </Label>
                      {addresses.length === 0 ? (
                        <div className="space-y-2">
                          <p className="rounded-lg border border-border bg-elevated/50 px-3 py-2 text-xs text-muted">
                            No Solana wallet linked yet. Create an embedded
                            wallet via Privy to bind this gate.
                          </p>
                          <Button
                            type="button"
                            onClick={() => void provisionWallet()}
                            disabled={walletCreating}
                            className="w-full"
                          >
                            {walletCreating ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              "Create Solana wallet"
                            )}
                          </Button>
                        </div>
                      ) : addresses.length === 1 ? (
                        <Input
                          id="dojo-wallet"
                          value={selectedWallet}
                          readOnly
                          className="font-mono text-sm"
                          spellCheck={false}
                          aria-readonly
                        />
                      ) : (
                        <select
                          id="dojo-wallet"
                          value={selectedWallet}
                          onChange={(e) => {
                            setGate(null);
                            setSelectedWallet(e.target.value);
                          }}
                          className="flex h-9 w-full rounded-md border border-border bg-surface px-3 font-mono text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                        >
                          {addresses.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      )}
                      {addresses.length > 0 ? (
                        <div className="flex flex-col gap-2 pt-1">
                          <Button
                            type="button"
                            onClick={() => void runGate()}
                            disabled={
                              gateBusy ||
                              walletCreating ||
                              !canCheck ||
                              selectedWallet.trim().length < 32
                            }
                          >
                            {gateBusy ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              "Check JTX"
                            )}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    {provisionError ? (
                      <p className="rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
                        {provisionError}
                      </p>
                    ) : null}
                    {gate ? (
                      <div className="space-y-2">
                        <p
                          className={cn(
                            "rounded-lg border px-3 py-2 font-mono text-xs",
                            jtxOk
                              ? "border-emerald-600/35 bg-emerald-500/10 text-emerald-800 dark:border-emerald-500/30 dark:text-emerald-200"
                              : "border-warn/40 bg-warn/10 text-warn",
                          )}
                        >
                          {jtxOk
                            ? `PASS · ${gate.uiAmount} JTX · tools unlocked`
                            : `FAIL · ${gate.error ?? "need ≥1 JTX on your wallet"}`}
                        </p>
                        {!jtxOk ? (
                          <Button
                            asChild
                            size="sm"
                            variant="secondary"
                            className="w-full"
                          >
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
                    ) : addresses.length > 0 ? (
                      <p className="text-xs text-muted">
                        Check JTX on your linked wallet before dry-run x402. CLI:{" "}
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
                    ) : null}
                  </>
                )}
              </CardContent>
            </Card>

            <div className="rounded-xl border border-border bg-surface/70 p-3 text-xs text-muted">
              <p className="font-mono text-[10px] uppercase tracking-wide text-subtle">
                DOJO vs Console
              </p>
              <ul className="mt-2 space-y-1.5 leading-relaxed">
                <li>
                  <strong className="text-fg">DOJO</strong> — Privy wallet JTX
                  gate, paylink, x402 dry-run (this page).
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
                  {!authenticated
                    ? "JTX gate locked — sign in with Privy, then check JTX on your linked Solana wallet."
                    : addresses.length === 0
                      ? "JTX gate locked — create a Privy Solana wallet, hold ≥1 JTX on it, then check."
                      : "JTX gate locked — Check JTX on your Privy wallet (foreign balances do not unlock tools), or "}
                  {authenticated && addresses.length > 0 ? (
                    <a
                      href={OPTX_LINKS.jtxBuy}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium underline underline-offset-2"
                    >
                      buy JTX at astroknots.space/buy
                    </a>
                  ) : null}
                  {authenticated && addresses.length > 0 ? "." : null}
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
              /dojo · Privy JTX gate · PayLinkPanel · X402Panel ·{" "}
              {x402Status
                ? `LIVE ${x402Status.liveEnabled ? "on" : "off"} · Buzz ${
                    x402Status.joeBuzzNotifyConfigured ? "DM" : "harness"
                  } · ${
                    x402Status.heliusConfigured
                      ? x402Status.rpc
                      : "no Helius"
                  }`
                : "LIVE status…"}
              {" · "}
              <a
                href={OPTX_LINKS.buzzChannel}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:underline"
              >
                Buzz
              </a>
              {" · "}
              <a
                href={OPTX_LINKS.cloudflareWallet}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:underline"
              >
                {OPTX_LINKS.cloudflareWalletHandle}
              </a>
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
