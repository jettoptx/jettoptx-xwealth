import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  FlaskConical,
  Loader2,
  Orbit,
  Settings2,
  ShieldAlert,
  ShieldCheck,
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
 * DOJO — operator paylink hub.
 * Reuses console PayLinkPanel + X402Panel. JTX ≥1 gate is UI-enforced;
 * server LIVE settle still requires X402_LIVE_ENABLED (never client-only).
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

  return (
    <main className="relative mx-auto max-w-6xl space-y-5 px-3 py-5 sm:space-y-6 sm:px-6 sm:py-10">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.08) 0.55px, transparent 0.65px)",
          backgroundSize: "18px 18px",
        }}
        aria-hidden
      />

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-wider text-augment sm:text-xs">
            DOJO · paylink hub
          </p>
          <h1 className="mt-0.5 font-display text-xl font-semibold tracking-tight sm:text-3xl">
            USDC x402 → X Wallet Pay
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-muted sm:text-sm">
            Link an X Money pay URL, gate on JTX ≥1, then dry-run{" "}
            <code className="text-[11px]">/api/x402/pay</code>. LIVE settle is
            server-gated — default is dry-run only.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="gap-1 font-mono text-[10px]">
            <FlaskConical className="size-3" />
            DRY-RUN default
          </Badge>
          <Badge
            variant={jtxOk ? "success" : "warn"}
            className="font-mono text-[10px]"
          >
            {jtxOk ? "JTX PASS" : "JTX locked"}
          </Badge>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="secondary">
          <Link
            to="/warp"
            search={{ market: undefined, vibe: undefined }}
            className="inline-flex items-center gap-1.5"
          >
            <Orbit className="size-3.5" />
            WARP graph
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a
            href={OPTX_LINKS.dojoMoa}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5"
          >
            <BookOpen className="size-3.5" />
            MDX docs
          </a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link
            to="/augments"
            search={{ embed: undefined }}
            className="inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="size-3.5" />
            Augments
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link
            to={OPTX_LINKS.settingsPath}
            className="inline-flex items-center gap-1.5"
          >
            <Settings2 className="size-3.5" />
            Settings
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {jtxOk ? (
              <ShieldCheck className="size-4 text-emerald-400" />
            ) : (
              <ShieldAlert className="size-4 text-warn" />
            )}
            JTX ≥1 gate
          </CardTitle>
          <CardDescription>
            SKU access is wallet balance — not an API key. Mint{" "}
            <span className="font-mono text-[10px]">{JTX_MINT.slice(0, 8)}…</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="dojo-wallet">Solana wallet pubkey</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
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
            <p
              className={cn(
                "rounded-lg border px-3 py-2 font-mono text-xs",
                gate.ok
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : "border-warn/30 bg-warn/10 text-warn",
              )}
            >
              {gate.ok
                ? `PASS · ${gate.uiAmount} JTX · dry-run tools unlocked`
                : `FAIL · ${gate.error ?? "need ≥1 JTX"} — pay tools stay locked`}
            </p>
          ) : (
            <p className="text-xs text-muted">
              Run the gate before dry-run x402. CLI equivalent:{" "}
              <code className="text-[11px]">npm run check-jtx</code>
            </p>
          )}
        </CardContent>
      </Card>

      <MoneySetupBanner handle={sessionHandle ?? money?.handle ?? null} />

      <div
        className={cn(
          "grid gap-4 sm:gap-6 lg:grid-cols-2",
          !jtxOk && "opacity-60",
        )}
      >
        <div className="lg:col-span-2">
          <PayLinkPanel
            defaultHandle={sessionHandle}
            displayName={user?.displayName}
            email={user?.primaryEmail}
          />
        </div>
        <div className="relative lg:col-span-2">
          {!jtxOk ? (
            <div className="mb-2 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
              JTX gate locked — paste a wallet with ≥1 JTX and re-check to use
              x402 dry-run / X Wallet Pay intent.
            </div>
          ) : null}
          <fieldset disabled={!jtxOk} className="min-w-0 disabled:pointer-events-none">
            <X402Panel />
          </fieldset>
        </div>
      </div>

      <p className="text-center font-mono text-[10px] text-subtle">
        Path: /dojo → PayLinkPanel + X402Panel → POST /api/x402/pay → X Money
        actionUrl · LIVE requires server X402_LIVE_ENABLED
      </p>
    </main>
  );
}
