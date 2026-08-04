import { useEffect, useMemo, useRef, useState } from "react";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import {
  useCreateWallet,
  useSignMessage,
  useWallets,
} from "@privy-io/react-auth/solana";
import {
  FlaskConical,
  Loader2,
  ShieldAlert,
  Smartphone,
  Zap,
} from "lucide-react";
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
  USDC_MINT_SOLANA,
  type X402SettleResult,
} from "@/lib/x402";
import {
  buildX402SignMessage,
  bytesToBase58,
  sleep,
} from "@/lib/privy-pay-sign";
import { useWealthStore } from "@/lib/store";
import { privyEnabled } from "@/lib/auth/privy";
import { cn } from "@/lib/utils";
import { MojoSignQrModal } from "@/components/mojo-sign-qr";
import type { SignTxMeta } from "@/lib/mojo-sign-challenge";
import {
  broadcastMojoSignedTx,
  looksLikeSolanaPubkey,
  resolveSolanaPayTo,
} from "@/lib/usdc-payto";
import { jtxDeniedMessage, jtxHeaders, JTX_BUY_URL } from "@/lib/jtx-api";
import { buildJtxProofHeaders } from "@/lib/jtx-proof";
import { OPTX_LINKS } from "@/lib/optx-links";

type PayMode = "dry" | "live";

type X402RailStatus = {
  liveEnabled: boolean;
  heliusConfigured: boolean;
  rpc: string;
  cloudflareWallet?: {
    handle: string;
    url: string;
    blog: string;
    role: string;
    note: string;
  };
};

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
  const [mojoOpen, setMojoOpen] = useState(false);
  const [mojoSig, setMojoSig] = useState<string | null>(null);
  const [mojoChainSig, setMojoChainSig] = useState<string | null>(null);
  /** Solana USDC destination for Mojo QR (not X Money URL). */
  const [solPayTo, setSolPayTo] = useState("");
  const [railStatus, setRailStatus] = useState<X402RailStatus | null>(null);

  // Privy — identity from main package; Solana wallets from /solana
  const { ready, authenticated } = usePrivy();
  const { login } = useLogin();
  const { wallets } = useWallets();
  const { signMessage } = useSignMessage();
  const { createWallet } = useCreateWallet();
  const walletsRef = useRef(wallets);
  walletsRef.current = wallets;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/x402/status", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as X402RailStatus;
        if (!cancelled) setRailStatus(data);
      } catch {
        /* footer / badge stay unknown */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const solDest = resolveSolanaPayTo({
    destination: solPayTo,
    payTo: solPayTo,
  });

  /** Mojo QR spend meta — phone builds + signs USDC transfer to solDest. */
  const mojoTx: SignTxMeta | null = useMemo(() => {
    if (!money || !solDest) return null;
    return {
      amount: amount.trim() || "0.10",
      mint: USDC_MINT_SOLANA,
      asset: "USDC",
      payTo: solDest,
      destination: solDest,
      network: "solana-mainnet",
      memo: `xwealth x402 @${money.handle}`,
      resource:
        typeof window !== "undefined"
          ? `${window.location.origin}/api/x402/pay`
          : "/api/x402/pay",
      unsignedTx: null,
    };
  }, [money, amount, solDest]);

  const liveReady =
    mode === "dry" ||
    (liveConfirm &&
      (!privyEnabled || (ready && authenticated)));

  function push(line: string) {
    setLog((L) => [line, ...L].slice(0, 14));
  }

  /** Ensure a Privy Solana wallet exists and sign the x402 live message. */
  async function signWithPrivy(message: string): Promise<{
    signature: string;
    from: string;
  }> {
    if (!privyEnabled) {
      throw new Error("Privy is not configured — cannot REAL-sign");
    }
    if (!ready) {
      throw new Error("Privy still loading — wait a moment and retry");
    }
    if (!authenticated) {
      throw new Error("Sign in with Privy before REAL pay");
    }

    let wallet = walletsRef.current[0];
    if (!wallet) {
      push("→ Privy Solana: creating embedded wallet…");
      try {
        const created = await createWallet();
        const want = created.wallet?.address;
        for (let i = 0; i < 25; i++) {
          await sleep(200);
          const list = walletsRef.current;
          wallet =
            (want
              ? list.find((w) => w.address === want)
              : undefined) || list[0];
          if (wallet) break;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/authenticated/i.test(msg)) {
          throw new Error(
            "Privy session required before creating a Solana wallet — sign in, then retry REAL",
          );
        }
        if (/already has/i.test(msg)) {
          // Wallet exists but hook list not ready yet — wait
          for (let i = 0; i < 25; i++) {
            await sleep(200);
            wallet = walletsRef.current[0];
            if (wallet) break;
          }
        } else {
          throw e;
        }
      }
    }

    if (!wallet) {
      throw new Error(
        "Solana wallet not ready after create — wait a second and retry Sign & Pay",
      );
    }

    const address = wallet.address;
    push(`→ Privy Solana ${address.slice(0, 6)}…${address.slice(-4)}`);

    const encoded = new TextEncoder().encode(message);
    const { signature: sigBytes } = await signMessage({
      message: encoded,
      wallet,
    });
    const signature = bytesToBase58(sigBytes);

    if (!walletStore) {
      setSolanaWallet(address);
    }

    return { signature, from: address };
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
    if (mode === "live" && privyEnabled && (!ready || !authenticated)) {
      toast.error("Sign in with Privy before REAL pay");
      login();
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
        const msg = buildX402SignMessage({
          amountUsdc: amount,
          xHandle: money.handle,
          xMoneyUrl: money.transferUrl,
          resource,
        });
        const signed = await signWithPrivy(msg);
        fromWallet = signed.from;
        push(`→ PAYMENT-SIGNATURE (Privy Solana) ${signed.signature.slice(0, 18)}…`);

        const payload = buildPaymentPayload({
          amountUsdc: amount,
          xHandle: money.handle,
          xMoneyUrl: money.transferUrl,
          resource,
          fromWallet,
          dryRun: false,
        });
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

      // 3) Settle — server requires ≥1 JTX + ownership proof (Phantom)
      const proof = await buildJtxProofHeaders(walletStore || fromWallet);
      if (!proof) {
        const err =
          "Connect Phantom (or a Solana wallet) to prove ownership before settle. Paste-pubkey alone is not enough for settle/mojo.";
        push(`× ${err}`);
        toast.error(err, {
          action: {
            label: "Buy JTX",
            onClick: () =>
              window.open(JTX_BUY_URL || OPTX_LINKS.jtxBuy, "_blank"),
          },
        });
        return;
      }

      const res = await fetch("/api/x402/pay", {
        method: "POST",
        headers: {
          ...jtxHeaders(
            {
              "Content-Type": "application/json",
              "PAYMENT-SIGNATURE": sigBody,
              "PAYMENT-REQUIRED": prHeader,
              "X-JTX-Proof": proof["X-JTX-Proof"],
              "X-JTX-Message": proof["X-JTX-Message"],
              ...(isLive ? { "X-X402-MODE": "live" } : {}),
            },
            proof["X-Solana-Wallet"],
          ),
        },
        body: JSON.stringify({
          xHandle: money.handle,
          xMoneyUrl: money.transferUrl,
          amountUsdc: amount,
          mode: isLive ? "live" : "dry",
          wallet: proof["X-Solana-Wallet"],
        }),
      });

      const data = (await res.json()) as
        | X402SettleResult
        | { success: false; error: string; buyUrl?: string; message?: string };

      if (!res.ok || !("success" in data) || !data.success) {
        const err =
          "buyUrl" in data || ("error" in data && data.error === "jtx_required")
            ? jtxDeniedMessage(data)
            : data && "error" in data && data.error
              ? String(data.error)
              : `HTTP ${res.status}`;
        push(`× ${err}`);
        toast.error(err, {
          action: {
            label: "Buy JTX",
            onClick: () =>
              window.open(JTX_BUY_URL || OPTX_LINKS.jtxBuy, "_blank"),
          },
        });
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
              payment message with a Solana wallet, then opens X Money to Pay
              now.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "font-mono",
              mode === "live" && "border-amber-500/50 text-amber-400",
            )}
          >
            {mode === "live" ? "REAL · Privy Solana" : "dry-run"}
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
                Privy will prompt your Solana wallet to sign the x402 payment
                message, then a new window opens on{" "}
                <span className="font-mono text-fg">x.com/i/money/…</span> for
                Pay now. Wallet is only created if you don’t have one yet (not
                on login).
              </span>
            </span>
          </label>
        )}

        {mode === "live" && privyEnabled && ready && !authenticated && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2.5 text-sm">
            <span className="text-muted">
              Privy sign-in required before REAL pay.
            </span>
            <Button type="button" size="sm" onClick={() => login()}>
              Sign in with Privy
            </Button>
          </div>
        )}

        {mode === "live" && railStatus && (
          <p className="font-mono text-[11px] text-subtle">
            server LIVE {railStatus.liveEnabled ? "on" : "off"}
            {" · "}
            {railStatus.heliusConfigured
              ? `Helius ${railStatus.rpc}`
              : "Helius not configured"}
          </p>
        )}

        <div className="rounded-lg border border-border/80 bg-bg/60 px-3 py-2.5 text-xs text-muted">
          <span className="font-medium text-fg">Cloudflare agent wallet</span>
          {" · "}
          <a
            href={OPTX_LINKS.cloudflareWallet}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-accent underline-offset-2 hover:underline"
          >
            {OPTX_LINKS.cloudflareWalletHandle}
          </a>
          <span className="mt-1 block text-[11px] text-subtle">
            Identity / future Monetization Gateway rail — does not settle Solana
            USDC today. LIVE settle = Privy sign + X Money.{" "}
            <a
              href={OPTX_LINKS.cloudflareWalletsBlog}
              target="_blank"
              rel="noreferrer"
              className="underline-offset-2 hover:underline"
            >
              CF Wallets blog
            </a>
          </span>
        </div>

        <div className="space-y-3">
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
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={mode === "live" ? "default" : "accent"}
                className={cn(
                  mode === "live" &&
                    "bg-amber-600 text-white hover:bg-amber-500",
                )}
                disabled={!money || busy || !liveReady}
                onClick={() => void runPay()}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Zap className="size-4" />
                )}
                {mode === "live" ? "Sign & Pay now" : "Run agent pay"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!money || !mojoTx}
                onClick={() => {
                  if (!looksLikeSolanaPubkey(solPayTo)) {
                    toast.error(
                      "Enter a Solana USDC destination pubkey for MOJO QR",
                    );
                    return;
                  }
                  setMojoOpen(true);
                }}
                title="Approve Solana USDC spend via MOJO QR (same rail as jtx.chat/login)"
              >
                <Smartphone className="size-4" />
                MOJO QR
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sol-payto">MOJO Solana payTo (USDC)</Label>
            <Input
              id="sol-payto"
              value={solPayTo}
              onChange={(e) => setSolPayTo(e.target.value.trim())}
              placeholder="Destination Solana pubkey"
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted">
              Phone builds + signs the USDC transfer. Not an X Money URL.
            </p>
          </div>
        </div>

        {mojoSig && (
          <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3 font-mono text-xs">
            <div className="text-orange-300">MOJO signed</div>
            <div className="mt-1 break-all">{mojoSig}</div>
            {mojoChainSig ? (
              <div className="mt-1 break-all text-emerald-400">
                on-chain: {mojoChainSig}
              </div>
            ) : (
              <div className="mt-1 text-subtle">
                Waiting for Helius broadcast… (or phone already sent)
              </div>
            )}
          </div>
        )}

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

      {mojoTx && (
        <MojoSignQrModal
          open={mojoOpen}
          onClose={() => setMojoOpen(false)}
          tx={mojoTx}
          origin="xwealth"
          onSigned={(r) => {
            void (async () => {
              setMojoSig(r.signature);
              setMojoChainSig(null);
              push(`← MOJO signed ${r.signature.slice(0, 18)}…`);
              setMojoOpen(false);
              if (r.signedTx) {
                push("→ Helius broadcast signedTx…");
                const sent = await broadcastMojoSignedTx(r.signedTx);
                if (sent.ok) {
                  setMojoChainSig(sent.signature);
                  push(
                    `← on-chain ${sent.signature.slice(0, 18)}… (${sent.rpc})`,
                  );
                  toast.success("MOJO USDC broadcast");
                  if (money) {
                    addReceipt({
                      amount: amount.trim() || "0.10",
                      asset: "USDC",
                      xHandle: money.handle,
                      transaction: sent.signature,
                      harness: "live",
                      settledAt: new Date().toISOString(),
                    });
                  }
                } else {
                  push(`← broadcast failed: ${sent.error}`);
                  toast.error(sent.error);
                }
              } else {
                setMojoChainSig(r.signature);
                toast.success("MOJO signed (phone broadcast)");
              }
            })();
          }}
        />
      )}
    </Card>
  );
}
