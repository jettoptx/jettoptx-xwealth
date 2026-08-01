import { useState } from "react";
import {
  useCreateWallet,
  usePrivy,
  useSignMessage,
  useWallets,
} from "@privy-io/react-auth";
import { FlaskConical, Loader2, ShieldAlert, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  buildPaymentPayload,
  buildPaymentRequired,
  encodePaymentRequired,
  encodePaymentSignature,
  type X402SettleResult,
} from "@/lib/x402";
import { buildX402SignMessage } from "@/lib/privy-pay-sign";
import { useWealthStore } from "@/lib/store";
import { privyEnabled } from "@/lib/auth/privy";
import { cn } from "@/lib/utils";

type PayMode = "dry" | "live";

export function X402Panel() {
  const money = useWealthStore((s) => s.money);
  const walletStore = useWealthStore((s) => s.solanaWallet);
  const setSolanaWallet = useWealthStore((s) => s.setSolanaWallet);
  const addReceipt = useWealthStore((s) => s.addReceipt);
  const receipts = useWealthStore((s) => s.receipts);
  const [amount, setAmount] = useState("0.10");
  const [mode, setMode] = useState<PayMode>("dry");
  const [liveConfirm, setLiveConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<X402SettleResult | null>(null);
  const [log, setLog] = useState<string[]>([]);

  // Privy wallet hooks — only used on REAL path
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { signMessage } = useSignMessage();
  const { createWallet } = useCreateWallet();

  function push(line: string) {
    setLog((L) => [line, ...L].slice(0, 14));
  }

  /** Ensure a Privy wallet exists and sign the x402 live message. */
  async function signWithPrivy(message: string): Promise<{
    signature: string;
    from: string;
  }> {
    if (!ready || !authenticated) {
      throw new Error("Sign in with X (Privy) before REAL pay");
    }

    let wallet = wallets[0];
    if (!wallet) {
      push("→ Privy: creating wallet for payment signature…");
      await createWallet();
      // wallets list updates async — brief wait + re-read via getAccessToken path
      await new Promise((r) => setTimeout(r, 600));
      wallet = wallets[0];
    }

    // After createWallet the hook may still be empty; prompt sign which
    // Privy will route to the embedded wallet once ready.
    const address = wallet?.address;
    push(
      address
        ? `→ Privy wallet ${address.slice(0, 6)}…${address.slice(-4)}`
        : "→ Privy: requesting wallet signature…",
    );

    const result = await signMessage({
      message,
      ...(address ? { address } : {}),
    });

    const signature =
      typeof result === "string"
        ? result
        : result && typeof result === "object" && "signature" in result
          ? String((result as { signature: string }).signature)
          : String(result);

    const from =
      address ||
      (signature.startsWith("0x") ? "privy-evm" : "privy-wallet");

    if (address && !walletStore) {
      setSolanaWallet(address);
    }

    return { signature, from };
  }

  async function runPay() {
    if (!money) {
      toast.error("Link X Money first");
      return;
    }
    if (mode === "live" && !liveConfirm) {
      toast.error("Confirm LIVE before running REAL pay");
      return;
    }

    setBusy(true);
    setLast(null);
    const isLive = mode === "live";

    try {
      const resource =
        typeof window !== "undefined"
          ? `${window.location.origin}/api/x402/pay`
          : "/api/x402/pay";

      // 1) Probe 402
      const probe = await fetch("/api/x402/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          xHandle: money.handle,
          xMoneyUrl: money.transferUrl,
          amountUsdc: amount,
          mode: isLive ? "live" : "dry",
        }),
      });

      const prFromProbe =
        probe.headers.get("PAYMENT-REQUIRED") ||
        probe.headers.get("payment-required");

      const required = buildPaymentRequired({
        amountUsdc: amount,
        xHandle: money.handle,
        xMoneyUrl: money.transferUrl,
        resource,
      });
      let prHeader = encodePaymentRequired(required);

      if (probe.status === 402) {
        push(`← 402 Payment Required · ${amount} USDC${isLive ? " · LIVE" : ""}`);
        if (prFromProbe) {
          prHeader = prFromProbe;
          push(`PAYMENT-REQUIRED: ${prHeader.slice(0, 48)}…`);
        }
      } else {
        push(`← 402 envelope · ${amount} USDC`);
      }

      let fromWallet =
        walletStore || (isLive ? "agent-harness-live" : "agent-harness-sim");
      let sigBody: string;

      if (isLive && privyEnabled) {
        // 2) Privy signs the payment message (wallet UI)
        const msg = buildX402SignMessage({
          amountUsdc: amount,
          xHandle: money.handle,
          xMoneyUrl: money.transferUrl,
          resource,
        });
        const signed = await signWithPrivy(msg);
        fromWallet = signed.from;
        push(`→ PAYMENT-SIGNATURE (Privy) ${signed.signature.slice(0, 18)}…`);

        const payload = buildPaymentPayload({
          amountUsdc: amount,
          xHandle: money.handle,
          xMoneyUrl: money.transferUrl,
          resource,
          fromWallet,
          dryRun: false,
        });
        // Replace random sig with Privy wallet signature
        payload.payload.signature = signed.signature;
        sigBody = encodePaymentSignature(payload);
      } else {
        const payload = buildPaymentPayload({
          amountUsdc: amount,
          xHandle: money.handle,
          xMoneyUrl: money.transferUrl,
          resource,
          fromWallet,
          dryRun: !isLive,
        });
        sigBody = encodePaymentSignature(payload);
        push(
          isLive
            ? "→ PAYMENT-SIGNATURE (LIVE intent)"
            : "→ PAYMENT-SIGNATURE (dry-run)",
        );
      }

      // 3) Settle intent on our API
      const res = await fetch("/api/x402/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "PAYMENT-SIGNATURE": sigBody,
          "PAYMENT-REQUIRED": prHeader,
          ...(isLive ? { "X-X402-MODE": "live" } : {}),
        },
        body: JSON.stringify({
          xHandle: money.handle,
          xMoneyUrl: money.transferUrl,
          amountUsdc: amount,
          mode: isLive ? "live" : "dry",
        }),
      });

      const data = (await res.json()) as
        | X402SettleResult
        | { success: false; error: string };

      if (!res.ok || !("success" in data) || !data.success) {
        const err =
          data && "error" in data && data.error
            ? String(data.error)
            : `HTTP ${res.status}`;
        push(`× ${err}`);
        toast.error(err);
        return;
      }

      setLast(data);
      addReceipt({
        amount: data.amount,
        asset: data.asset,
        xHandle: data.xHandle,
        transaction: data.transaction,
        settledAt: data.settledAt,
        harness: isLive ? "live" : "manual",
      });

      if (data.rpc) {
        push(
          `↗ RPC ${data.rpc.provider}${
            data.rpc.slot != null ? ` · slot ${data.rpc.slot}` : ""
          }${data.rpc.onChain ? " · on-chain" : ""}`,
        );
        if (data.rpc.chainSignature) {
          push(`✓ chain sig ${data.rpc.chainSignature.slice(0, 16)}…`);
        }
      }

      // 4) REAL → open X Money "Pay now" window
      if (isLive) {
        const payUrl = data.actionUrl || money.transferUrl;
        push(
          data.rpc?.onChain
            ? `✓ Broadcast via Helius · opening Pay now…`
            : `✓ Privy signed · Helius rail ready · opening Pay now…`,
        );
        push(`→ ${payUrl}`);
        const win = window.open(payUrl, "_blank", "noopener,noreferrer");
        if (!win) {
          toast.message("Popup blocked — use Open pay link below");
        } else {
          toast.success("Signed with Privy — complete pay on X Money");
        }
      } else {
        push(`✓ Dry-run settled · ${data.transaction.slice(0, 18)}…`);
        toast.success("x402 dry-run complete");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      push(`× ${msg}`);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="size-4 text-accent" />
              x402 agent pay
            </CardTitle>
            <CardDescription className="mt-1">
              Dry-run simulates the agent path. REAL asks Privy to sign the
              payment message in your wallet, then opens X Money to Pay now.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "font-mono",
              mode === "live" && "border-amber-500/50 text-amber-400",
            )}
          >
            {mode === "live" ? "REAL · Privy sign" : "dry-run"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "dry" ? "secondary" : "ghost"}
            className={cn(mode === "dry" && "ring-1 ring-border")}
            onClick={() => {
              setMode("dry");
              setLiveConfirm(false);
            }}
          >
            Dry-run
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "live" ? "default" : "ghost"}
            className={cn(
              mode === "live" &&
                "bg-amber-600 text-white hover:bg-amber-500 ring-1 ring-amber-500/40",
            )}
            onClick={() => setMode("live")}
          >
            <ShieldAlert className="size-3.5" />
            REAL
          </Button>
        </div>

        {mode === "live" && (
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 size-4 rounded border-border"
              checked={liveConfirm}
              onChange={(e) => setLiveConfirm(e.target.checked)}
            />
            <span>
              <span className="font-medium text-amber-200">I confirm LIVE</span>
              <span className="mt-0.5 block text-xs text-muted">
                Privy will prompt your wallet to sign the x402 payment message,
                then a new window opens on{" "}
                <span className="font-mono text-fg">x.com/i/money/…</span> for
                Pay now. Wallet is only created if you don’t have one yet (not
                on login).
              </span>
            </span>
          </label>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="amt">Amount (USDC)</Label>
            <Input
              id="amt"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              className="max-w-[160px]"
            />
          </div>
          <Button
            type="button"
            variant={mode === "live" ? "default" : "accent"}
            className={cn(
              mode === "live" && "bg-amber-600 text-white hover:bg-amber-500",
            )}
            disabled={!money || busy || (mode === "live" && !liveConfirm)}
            onClick={() => void runPay()}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Zap className="size-4" />
            )}
            {mode === "live" ? "Sign & Pay now" : "Run agent pay"}
          </Button>
        </div>

        {last && (
          <div
            className={cn(
              "rounded-lg border p-4 font-mono text-xs space-y-1",
              last.dryRun
                ? "border-accent/25 bg-accent/5"
                : "border-amber-500/30 bg-amber-500/5",
            )}
          >
            <div className={last.dryRun ? "text-accent" : "text-amber-300"}>
              {last.dryRun
                ? "settled · dry-run"
                : "LIVE · Privy signed · Pay now"}
            </div>
            <div className="break-all">sig: {last.transaction}</div>
            <div>
              {last.amount} {last.asset} → @{last.xHandle}
            </div>
            <div className="text-muted break-all">{last.payTo}</div>
            {last.actionUrl && (
              <a
                href={last.actionUrl}
                target="_blank"
                rel="noreferrer"
                className="block text-amber-300 underline-offset-2 hover:underline break-all"
              >
                Open pay link →
              </a>
            )}
            <div className="text-subtle">{last.note}</div>
          </div>
        )}

        <div className="rounded-lg border border-border bg-bg p-3">
          <div className="mb-2 text-xs uppercase tracking-wider text-subtle">
            Trace
          </div>
          {log.length === 0 ? (
            <p className="text-sm text-muted">No runs yet.</p>
          ) : (
            <ul className="space-y-1 font-mono text-[11px] text-muted">
              {log.map((l, i) => (
                <li key={`${i}-${l.slice(0, 12)}`} className="break-all">
                  {l}
                </li>
              ))}
            </ul>
          )}
        </div>

        {receipts.length > 0 && (
          <div>
            <div className="mb-2 text-xs uppercase tracking-wider text-subtle">
              Recent receipts
            </div>
            <ul className="space-y-2">
              {receipts.slice(0, 5).map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-xs"
                >
                  <span className="font-mono">
                    {r.amount} {r.asset} → @{r.xHandle}
                    {r.harness === "live" ? " · LIVE" : ""}
                  </span>
                  <span className="text-subtle">
                    {new Date(r.settledAt).toLocaleTimeString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
