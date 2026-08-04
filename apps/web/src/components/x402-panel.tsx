import { useMemo, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  useCreateWallet as useCreateSolanaWallet,
  useSignMessage as useSolanaSignMessage,
  useWallets as useSolanaWallets,
} from "@privy-io/react-auth/solana";
import { FlaskConical, Loader2, ShieldAlert, Smartphone, Zap } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
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
import {
  isSolanaDeskAddress,
  pickPrivySolanaAddress,
  resolveSolanaDeskWallet,
} from "@/lib/auth/solana-wallet";
import { jtxDeniedMessage, jtxHeaders, JTX_BUY_URL } from "@/lib/jtx-api";
import { buildJtxProofHeaders } from "@/lib/jtx-proof";
import { OPTX_LINKS } from "@/lib/optx-links";
import {
  blankLiveFlow,
  LivePayFlowChecklist,
  patchFlow,
  type FlowStep,
} from "@/components/live-pay-flow";

type PayMode = "dry" | "live";

export function X402Panel() {
  const money = useWealthStore((s) => s.money);
  const walletStore = useWealthStore((s) => s.solanaWallet);
  const preferredAgentWallet = useWealthStore((s) => s.preferredAgentWallet);
  const agentWalletLabel = useWealthStore((s) => s.agentWalletLabel);
  const setSolanaWallet = useWealthStore((s) => s.setSolanaWallet);
  const addReceipt = useWealthStore((s) => s.addReceipt);
  const receipts = useWealthStore((s) => s.receipts);
  const [amount, setAmount] = useState("0.10");
  const [mode, setMode] = useState<PayMode>("dry");
  const [liveConfirm, setLiveConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<X402SettleResult | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [flow, setFlow] = useState<FlowStep[]>(() => blankLiveFlow());
  const [mojoOpen, setMojoOpen] = useState(false);
  const [mojoSig, setMojoSig] = useState<string | null>(null);
  const [mojoChainSig, setMojoChainSig] = useState<string | null>(null);
  /** Solana USDC destination for Mojo QR (not X Money URL). */
  const [solPayTo, setSolPayTo] = useState("");

  // Privy Solana hooks — REAL path never uses ethereum useWallets / 0x
  const { ready, authenticated, login, user } = usePrivy();
  const { wallets: solanaWallets, ready: solanaReady } = useSolanaWallets();
  const { signMessage: signSolanaMessage } = useSolanaSignMessage();
  const { createWallet: createSolanaWallet } = useCreateSolanaWallet();
  /** Keep latest Solana wallets for async create→poll (avoid stale closure). */
  const solanaWalletsRef = useRef(solanaWallets);
  solanaWalletsRef.current = solanaWallets;

  /** Prefer pinned / stored / Privy Solana — never ethereum 0x */
  const deskWallet = resolveSolanaDeskWallet({
    preferred: preferredAgentWallet,
    stored: walletStore,
    privySolana: pickPrivySolanaAddress(user),
    connectedAddresses: solanaWallets.map((w) => w.address),
  });

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
      // Phone builds transfer when null (signer = Mojo wallet)
      unsignedTx: null,
    };
  }, [money, amount, solDest]);

  function push(line: string) {
    setLog((L) => [line, ...L].slice(0, 14));
  }

  function mark(
    id: Parameters<typeof patchFlow>[1],
    status: Parameters<typeof patchFlow>[2],
    detail?: string,
  ) {
    setFlow((f) => patchFlow(f, id, status, detail));
  }

  /** Ensure Privy session + Solana wallet, then sign the x402 live message. */
  async function signWithPrivy(message: string): Promise<{
    signature: string;
    from: string;
  }> {
    mark("auth", "active");
    if (!ready) {
      mark("auth", "fail", "Privy not ready");
      throw new Error("Privy still loading — try again in a second");
    }
    if (!authenticated) {
      mark("auth", "fail", "Not signed in");
      push("→ opening Privy sign-in…");
      try {
        login();
      } catch {
        /* login is void / modal */
      }
      throw new Error(
        "Sign in with X first (top bar), then retry REAL pay. Settings → Preferred agent wallet to pin a Solana desk key.",
      );
    }
    mark("auth", "done", "Privy session OK");

    mark("wallet", "active", "Ensuring Solana payment wallet…");
    if (!solanaReady) {
      for (let i = 0; i < 6 && !solanaWalletsRef.current.length; i++) {
        await new Promise((r) => setTimeout(r, 250));
      }
    }

    type SolWallet = (typeof solanaWallets)[number];
    const pickWallet = (list: SolWallet[]): SolWallet | undefined => {
      if (deskWallet) {
        const pinned = list.find((w) => w.address === deskWallet);
        if (pinned) return pinned;
      }
      // Prefer Privy embedded Solana over external connectors when signing in-app
      return (
        list.find((w) => {
          const name = (w as { standardWallet?: { name?: string } })
            .standardWallet?.name;
          return name === "Privy";
        }) || list[0]
      );
    };

    let wallet = pickWallet(solanaWalletsRef.current);
    let preferAddr: string | undefined;

    if (!wallet?.address) {
      push("→ Privy: creating Solana embedded wallet…");
      try {
        const created = await createSolanaWallet();
        preferAddr =
          (created as { wallet?: { address?: string }; address?: string })
            ?.wallet?.address ||
          (created as { address?: string })?.address;
        if (preferAddr) {
          push(
            `→ created ${preferAddr.slice(0, 4)}…${preferAddr.slice(-4)}`,
          );
        }
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Could not create Solana wallet";
        mark(
          "wallet",
          "fail",
          msg.includes("authenticated")
            ? "Solana wallet missing — sign out/in, or use MOJO QR / Settings pin"
            : msg.slice(0, 80),
        );
        throw new Error(
          msg.includes("authenticated")
            ? "No Solana embedded wallet yet. Sign out → Sign in with X, pin a Solana address in Settings, or use MOJO QR."
            : msg,
        );
      }
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 400));
        const list = solanaWalletsRef.current;
        wallet = preferAddr
          ? list.find((w) => w.address === preferAddr) || pickWallet(list)
          : pickWallet(list);
        if (wallet?.address) break;
      }
    }

    if (!wallet?.address || !isSolanaDeskAddress(wallet.address)) {
      mark(
        "wallet",
        "fail",
        "No Solana wallet — connect Phantom or pin base58 in Settings",
      );
      throw new Error(
        "No Solana wallet ready. Connect Phantom / Solflare, or save a Solana preferred agent wallet in Settings.",
      );
    }

    const address = wallet.address;
    mark("wallet", "done", `${address.slice(0, 4)}…${address.slice(-4)}`);
    push(`→ Solana wallet ${address.slice(0, 4)}…${address.slice(-4)}`);

    mark("sign", "active", "Solana signature prompt…");
    try {
      const { signature: sigBytes } = await signSolanaMessage({
        message: new TextEncoder().encode(message),
        wallet,
      });
      const signature = bytesToBase58(sigBytes);
      mark("sign", "done", `${signature.slice(0, 14)}…`);

      if (
        !isSolanaDeskAddress(walletStore) &&
        !isSolanaDeskAddress(preferredAgentWallet)
      ) {
        setSolanaWallet(address);
      }

      return { signature, from: address };
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Solana signature rejected";
      mark("sign", "fail", msg.slice(0, 80));
      throw e instanceof Error ? e : new Error(msg);
    }
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
    setFlow(blankLiveFlow());
    const isLive = mode === "live";

    try {
      const resource =
        typeof window !== "undefined"
          ? `${window.location.origin}/api/x402/pay`
          : "/api/x402/pay";

      // Agent wallet step (Solana only — ignore stale ethereum 0x pins)
      mark(
        "agent_wallet",
        "active",
        deskWallet
          ? agentWalletLabel || "Solana desk wallet"
          : "awaiting Solana wallet",
      );
      if (deskWallet) {
        mark(
          "agent_wallet",
          "done",
          `${deskWallet.slice(0, 4)}…${deskWallet.slice(-4)}`,
        );
      } else {
        mark(
          "agent_wallet",
          "skip",
          "No Solana pin — will create/use Privy Solana or Settings",
        );
      }

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
        deskWallet || (isLive ? "agent-harness-live" : "agent-harness-sim");
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
        push(`→ PAYMENT-SIGNATURE (Privy) ${signed.signature.slice(0, 18)}…`);

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
        if (isLive) {
          mark("auth", "skip", "Privy off — intent-only LIVE");
          mark("wallet", "skip");
          mark("sign", "done", "server intent signature");
        }
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

      // 3) JTX ownership proof
      mark("jtx", "active", "Wallet ownership proof…");
      const proofWallet = resolveSolanaDeskWallet({
        preferred: preferredAgentWallet,
        stored: walletStore,
        privySolana: isSolanaDeskAddress(fromWallet) ? fromWallet : deskWallet,
      });
      const proof = await buildJtxProofHeaders(proofWallet);
      if (!proof) {
        const err =
          "Connect Phantom (or pin a Solana agent wallet in Settings) to prove JTX ownership before settle.";
        mark("jtx", "fail", err);
        push(`× ${err}`);
        toast.error(err, {
          action: {
            label: "Settings",
            onClick: () => {
              window.location.href = "/settings";
            },
          },
        });
        return;
      }
      mark("jtx", "done", proof["X-Solana-Wallet"]?.slice(0, 8) + "…");

      mark("settle", "active", "POST /api/x402/pay…");
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
        mark("settle", "fail", err);
        push(`× ${err}`);
        toast.error(err, {
          action: {
            label: "Buy JTX",
            onClick: () => window.open(JTX_BUY_URL || OPTX_LINKS.jtxBuy, "_blank"),
          },
        });
        return;
      }
      mark(
        "settle",
        "done",
        data.dryRun ? "dry-run receipt" : "LIVE intent OK",
      );

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
        mark("xmoney", "active", "Opening X Wallet Pay…");
        const payUrl = data.actionUrl || money.transferUrl;
        push(
          data.rpc?.onChain
            ? `✓ Broadcast via Helius · opening Pay now…`
            : `✓ LIVE intent · opening Pay now…`,
        );
        push(`→ ${payUrl}`);
        const win = window.open(payUrl, "_blank", "noopener,noreferrer");
        if (!win) {
          mark("xmoney", "fail", "Popup blocked — use Open pay link");
          toast.message("Popup blocked — use Open pay link below");
        } else {
          mark("xmoney", "done", payUrl.slice(0, 40) + "…");
          toast.success("Complete pay on X Money / X Wallet");
        }
      } else {
        mark("auth", "skip");
        mark("wallet", "skip");
        mark("sign", "skip");
        mark("jtx", "done");
        mark("settle", "done");
        mark("xmoney", "skip", "dry-run");
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
          <>
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
                  Checklist runs below: sign-in → Solana wallet → preferred
                  agent wallet → JTX proof → sign → settle → open X Wallet Pay.
                  Pin a Solana desk wallet in{" "}
                  <Link
                    to="/settings"
                    className="text-amber-300 underline-offset-2 hover:underline"
                  >
                    Settings
                  </Link>
                  .
                </span>
              </span>
            </label>
            {(busy || flow.some((s) => s.status !== "idle")) && (
              <LivePayFlowChecklist steps={flow} />
            )}
            <div className="rounded-lg border border-border/60 bg-black/20 px-3 py-2 text-[11px] text-muted">
              <span className="text-subtle">Agent wallet: </span>
              {deskWallet ? (
                <span className="font-mono text-fg">
                  {deskWallet.slice(0, 6)}…{deskWallet.slice(-4)}
                  {preferredAgentWallet ? " · pinned" : ""}
                </span>
              ) : (
                <span>
                  none pinned —{" "}
                  <Link to="/settings" className="text-accent hover:underline">
                    save preferred agent wallet
                  </Link>
                </span>
              )}
            </div>
          </>
        )}

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
              <Button
                type="button"
                variant="outline"
                disabled={!money || !mojoTx}
                onClick={() => {
                  if (!looksLikeSolanaPubkey(solPayTo)) {
                    toast.error("Enter a Solana USDC destination pubkey for MOJO QR");
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
                  push(`← on-chain ${sent.signature.slice(0, 18)}… (${sent.rpc})`);
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
                // Phone may have signAndSend'd already — signature is the chain sig.
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
