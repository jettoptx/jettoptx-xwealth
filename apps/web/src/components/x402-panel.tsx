import { useEffect, useMemo, useRef, useState } from "react";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import {
  useCreateWallet,
  useSignMessage,
  useWallets,
} from "@privy-io/react-auth/solana";
import {
  Copy,
  ExternalLink,
  FlaskConical,
  Loader2,
  MessageSquare,
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
  encodePaymentSignature,
  USDC_MINT_SOLANA,
  type X402SettleResult,
} from "@/lib/x402";
import { bytesToBase58, sleep } from "@/lib/privy-pay-sign";
import { useWealthStore } from "@/lib/store";
import { privyEnabled } from "@/lib/auth/privy";
import { cn, copyText } from "@/lib/utils";
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
import {
  createJoeSignChallenge,
  pollJoeSignChallenge,
  submitJoeSignChallenge,
  type JoeSignChallenge,
} from "@/lib/x402-sign-challenge";

type PayMode = "dry" | "live";

type X402RailStatus = {
  liveEnabled: boolean;
  heliusConfigured: boolean;
  rpc: string;
  joeBuzzNotifyConfigured?: boolean;
  primaryLiveSignPath?: string;
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
  const [solPayTo, setSolPayTo] = useState("");
  const [railStatus, setRailStatus] = useState<X402RailStatus | null>(null);
  const [challenge, setChallenge] = useState<JoeSignChallenge | null>(null);
  const [pasteSig, setPasteSig] = useState("");
  const [showPrivyFallback, setShowPrivyFallback] = useState(false);
  const [showMojoAdvanced, setShowMojoAdvanced] = useState(false);

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
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Poll JOE / harness challenge until verified
  useEffect(() => {
    if (!challenge || challenge.status === "verified") return;
    let cancelled = false;
    const tick = async () => {
      try {
        const p = await pollJoeSignChallenge(challenge.cid);
        if (cancelled) return;
        if (p.status === "verified" && p.signature) {
          push(`← JOE/harness approved · ${p.approvedVia ?? "sign"}`);
          setChallenge((c) => (c ? { ...c, status: "verified" } : c));
          await settleWithSignature({
            signature: p.signature,
            fromWallet: p.fromWallet || walletStore || "joe-harness",
            paymentRequired: challenge.paymentRequired,
            approvedVia: p.approvedVia || "harness",
          });
        } else if (p.status === "expired") {
          push("× Challenge expired — ask JOE again");
          setChallenge((c) => (c ? { ...c, status: "expired" } : c));
        }
      } catch {
        /* keep polling */
      }
    };
    const id = window.setInterval(() => void tick(), 2500);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- poll only on cid
  }, [challenge?.cid, challenge?.status]);

  const solDest = resolveSolanaPayTo({
    destination: solPayTo,
    payTo: solPayTo,
  });

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

  function push(line: string) {
    setLog((L) => [line, ...L].slice(0, 16));
  }

  async function settleWithSignature(opts: {
    signature: string;
    fromWallet: string;
    paymentRequired: string;
    approvedVia: string;
  }) {
    if (!money) return;
    setBusy(true);
    try {
      const resource =
        typeof window !== "undefined"
          ? `${window.location.origin}/api/x402/pay`
          : "/api/x402/pay";

      const payload = buildPaymentPayload({
        amountUsdc: amount,
        xHandle: money.handle,
        xMoneyUrl: money.transferUrl,
        resource,
        fromWallet: opts.fromWallet,
        dryRun: false,
      });
      payload.payload.signature = opts.signature;
      const sigBody = encodePaymentSignature(payload);

      const proof = await buildJtxProofHeaders(walletStore || opts.fromWallet);
      if (!proof) {
        const err =
          "Connect Phantom (or a Solana wallet) to prove JTX ownership before settle.";
        push(`× ${err}`);
        toast.error(err);
        return;
      }

      push(`→ settle LIVE · via ${opts.approvedVia}`);
      const res = await fetch("/api/x402/pay", {
        method: "POST",
        headers: {
          ...jtxHeaders(
            {
              "Content-Type": "application/json",
              "PAYMENT-SIGNATURE": sigBody,
              "PAYMENT-REQUIRED": opts.paymentRequired,
              "X-JTX-Proof": proof["X-JTX-Proof"],
              "X-JTX-Message": proof["X-JTX-Message"],
              "X-X402-MODE": "live",
            },
            proof["X-Solana-Wallet"],
          ),
        },
        body: JSON.stringify({
          xHandle: money.handle,
          xMoneyUrl: money.transferUrl,
          amountUsdc: amount,
          mode: "live",
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
        harness: "live",
      });

      const payUrl = data.actionUrl || money.transferUrl;
      push(`✓ LIVE settled · opening X Money…`);
      push(`→ ${payUrl}`);
      const win = window.open(payUrl, "_blank", "noopener,noreferrer");
      if (!win) toast.message("Popup blocked — use Open pay link below");
      else toast.success("JOE/harness signed — complete pay on X Money");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Settle failed";
      push(`× ${msg}`);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function askJoeSignChallenge() {
    if (!money) {
      toast.error("Link X Money first");
      return;
    }
    if (!liveConfirm) {
      toast.error("Confirm LIVE before asking JOE");
      return;
    }
    setBusy(true);
    setLast(null);
    setChallenge(null);
    try {
      const resource =
        typeof window !== "undefined"
          ? `${window.location.origin}/api/x402/pay`
          : "/api/x402/pay";
      push(`→ JOE: mint x402 sign challenge · ${amount} USDC`);
      const ch = await createJoeSignChallenge({
        amountUsdc: amount,
        xHandle: money.handle,
        xMoneyUrl: money.transferUrl,
        resource,
      });
      setChallenge(ch);
      if (ch.buzzNotified) {
        push(`← Buzz notified · cid ${ch.cid.slice(0, 18)}…`);
        toast.success("JOE notified Buzz — approve the sign challenge");
      } else {
        push(
          `← Challenge ready · Buzz webhook off — use harness (cid ${ch.cid.slice(0, 14)}…)`,
        );
        toast.message(
          "Buzz DM not wired — copy harness skill or open JettChat. Set JOE_BUZZ_WEBHOOK_URL for auto DM.",
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Challenge failed";
      push(`× ${msg}`);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function submitPastedSignature() {
    if (!challenge || !pasteSig.trim()) {
      toast.error("Paste a signature from JOE/harness first");
      return;
    }
    setBusy(true);
    try {
      push("→ submit harness/paste signature…");
      const p = await submitJoeSignChallenge({
        cid: challenge.cid,
        signature: pasteSig.trim(),
        fromWallet: walletStore || undefined,
        approvedVia: "paste",
      });
      if (p.status !== "verified" || !p.signature) {
        throw new Error("Submit did not verify");
      }
      setChallenge((c) => (c ? { ...c, status: "verified" } : c));
      await settleWithSignature({
        signature: p.signature,
        fromWallet: p.fromWallet || walletStore || "joe-harness",
        paymentRequired: challenge.paymentRequired,
        approvedVia: "paste",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Submit failed";
      push(`× ${msg}`);
      toast.error(msg);
      setBusy(false);
    }
  }

  async function signWithPrivyFallback() {
    if (!money || !challenge) return;
    if (!privyEnabled || !ready || !authenticated) {
      toast.error("Sign in with Privy for wallet fallback");
      login();
      return;
    }
    setBusy(true);
    try {
      let wallet = walletsRef.current[0];
      if (!wallet) {
        push("→ Privy Solana fallback: creating wallet…");
        const created = await createWallet();
        const want = created.wallet?.address;
        for (let i = 0; i < 25; i++) {
          await sleep(200);
          const list = walletsRef.current;
          wallet =
            (want ? list.find((w) => w.address === want) : undefined) ||
            list[0];
          if (wallet) break;
        }
      }
      if (!wallet) throw new Error("Solana wallet not ready");
      const encoded = new TextEncoder().encode(challenge.message);
      const { signature: sigBytes } = await signMessage({
        message: encoded,
        wallet,
      });
      const signature = bytesToBase58(sigBytes);
      push(`→ Privy fallback signed ${wallet.address.slice(0, 6)}…`);
      await submitJoeSignChallenge({
        cid: challenge.cid,
        signature,
        fromWallet: wallet.address,
        approvedVia: "privy-fallback",
      });
      if (!walletStore) setSolanaWallet(wallet.address);
      await settleWithSignature({
        signature,
        fromWallet: wallet.address,
        paymentRequired: challenge.paymentRequired,
        approvedVia: "privy-fallback",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Privy sign failed";
      push(`× ${msg}`);
      toast.error(msg);
      setBusy(false);
    }
  }

  async function runDryPay() {
    if (!money) {
      toast.error("Link X Money first");
      return;
    }
    setBusy(true);
    setLast(null);
    try {
      const resource =
        typeof window !== "undefined"
          ? `${window.location.origin}/api/x402/pay`
          : "/api/x402/pay";
      const fromWallet = walletStore || "agent-harness-sim";
      const payload = buildPaymentPayload({
        amountUsdc: amount,
        xHandle: money.handle,
        xMoneyUrl: money.transferUrl,
        resource,
        fromWallet,
        dryRun: true,
      });
      const sigBody = encodePaymentSignature(payload);
      push("→ PAYMENT-SIGNATURE (dry-run)");

      const probe = await fetch("/api/x402/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          xHandle: money.handle,
          xMoneyUrl: money.transferUrl,
          amountUsdc: amount,
          mode: "dry",
        }),
      });
      const prHeader =
        probe.headers.get("PAYMENT-REQUIRED") ||
        probe.headers.get("payment-required") ||
        "";
      if (probe.status === 402) {
        push(`← 402 Payment Required · ${amount} USDC`);
      }

      const proof = await buildJtxProofHeaders(fromWallet);
      if (!proof) {
        // Dry-run still wants proof on settle — show clear error
        const err =
          "Connect Phantom to prove ownership before dry-run settle.";
        push(`× ${err}`);
        toast.error(err);
        return;
      }

      const res = await fetch("/api/x402/pay", {
        method: "POST",
        headers: {
          ...jtxHeaders(
            {
              "Content-Type": "application/json",
              "PAYMENT-SIGNATURE": sigBody,
              ...(prHeader ? { "PAYMENT-REQUIRED": prHeader } : {}),
              "X-JTX-Proof": proof["X-JTX-Proof"],
              "X-JTX-Message": proof["X-JTX-Message"],
            },
            proof["X-Solana-Wallet"],
          ),
        },
        body: JSON.stringify({
          xHandle: money.handle,
          xMoneyUrl: money.transferUrl,
          amountUsdc: amount,
          mode: "dry",
          wallet: proof["X-Solana-Wallet"],
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
        harness: "manual",
      });
      push(`✓ Dry-run settled · ${data.transaction.slice(0, 18)}…`);
      toast.success("x402 dry-run complete");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      push(`× ${msg}`);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  const liveReady = mode === "dry" || liveConfirm;

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
              Dry-run simulates the agent path. REAL asks{" "}
              <span className="text-fg">JOE</span> to DM a sign challenge in{" "}
              <span className="text-fg">Buzz / harness</span>, then opens X
              Money after approve.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "font-mono",
              mode === "live" && "border-amber-500/50 text-amber-400",
            )}
          >
            {mode === "live" ? "REAL · JOE / harness" : "dry-run"}
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
              setChallenge(null);
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
                JOE will create an x402 sign challenge and notify you in{" "}
                <span className="font-mono text-fg">Buzz (JettChat)</span> when
                the webhook is configured — otherwise approve via the harness
                skill below. MOJO QR is not required.
              </span>
            </span>
          </label>
        )}

        {mode === "live" && railStatus && (
          <p className="font-mono text-[11px] text-subtle">
            server LIVE {railStatus.liveEnabled ? "on" : "off"}
            {" · "}
            Buzz notify{" "}
            {railStatus.joeBuzzNotifyConfigured ? "on" : "off (harness)"}
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
            Identity / future Monetization Gateway — not Solana USDC settle
            today.{" "}
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

          {mode === "dry" ? (
            <Button
              type="button"
              variant="accent"
              disabled={!money || busy}
              onClick={() => void runDryPay()}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Zap className="size-4" />
              )}
              Run agent pay
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="bg-amber-600 text-white hover:bg-amber-500"
                disabled={!money || busy || !liveReady}
                onClick={() => void askJoeSignChallenge()}
              >
                {busy && !challenge ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <MessageSquare className="size-4" />
                )}
                Ask JOE · DM sign challenge
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  // Prefer Buzz Desktop deep link; fall back to buzz.xyz if
                  // the custom scheme is unavailable in this browser.
                  try {
                    window.location.href = OPTX_LINKS.buzzChannel;
                  } catch {
                    /* ignore */
                  }
                  window.setTimeout(() => {
                    window.open(
                      OPTX_LINKS.buzzChannelWeb,
                      "_blank",
                      "noopener",
                    );
                  }, 600);
                }}
              >
                <ExternalLink className="size-4" />
                Open Buzz
              </Button>
            </div>
          )}
        </div>

        {mode === "live" && challenge && (
          <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-mono text-xs text-amber-200">
                cid {challenge.cid}
                {" · "}
                {challenge.status}
                {challenge.buzzNotified ? " · Buzz notified" : " · harness"}
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await copyText(challenge.harnessSkill);
                  toast.success("Harness skill copied");
                }}
              >
                <Copy className="size-3.5" />
                Copy harness
              </Button>
            </div>
            <p className="text-xs text-muted">
              {challenge.buzzNotified
                ? "JOE notified the Buzz bridge. Approve in Buzz Desktop (Augment community) or paste the signature below."
                : "Buzz notify did not land — approve with the harness skill (Console / agent plugin), or paste a signature. Open Buzz Desktop → Augment community (wss://augment.communities.buzz.xyz)."}
            </p>
            <pre className="max-h-40 overflow-auto rounded-md border border-border bg-bg p-2 font-mono text-[10px] text-muted whitespace-pre-wrap">
              {challenge.message}
            </pre>
            <div className="flex flex-wrap gap-2">
              <Input
                value={pasteSig}
                onChange={(e) => setPasteSig(e.target.value)}
                placeholder="Paste signature from JOE / harness"
                className="font-mono text-xs sm:max-w-md"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy || !pasteSig.trim()}
                onClick={() => void submitPastedSignature()}
              >
                Submit & settle
              </Button>
            </div>
            {challenge.status === "pending" ||
            challenge.status === "notified" ? (
              <p className="flex items-center gap-1.5 font-mono text-[11px] text-subtle">
                <Loader2 className="size-3 animate-spin" />
                Waiting for JOE Buzz or harness approve…
              </p>
            ) : null}

            <div className="border-t border-border/60 pt-2">
              <button
                type="button"
                className="text-[11px] text-subtle underline-offset-2 hover:underline"
                onClick={() => setShowPrivyFallback((v) => !v)}
              >
                {showPrivyFallback ? "Hide" : "Show"} Privy wallet fallback
              </button>
              {showPrivyFallback && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {privyEnabled && ready && !authenticated ? (
                    <Button type="button" size="sm" onClick={() => login()}>
                      Sign in with Privy
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy || (privyEnabled && !authenticated)}
                    onClick={() => void signWithPrivyFallback()}
                  >
                    Sign with Privy (optional)
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {mode === "live" && (
          <div className="border-t border-border/50 pt-3">
            <button
              type="button"
              className="text-[11px] text-subtle underline-offset-2 hover:underline"
              onClick={() => setShowMojoAdvanced((v) => !v)}
            >
              {showMojoAdvanced ? "Hide" : "Advanced"} · MOJO phone QR (not
              primary)
            </button>
            {showMojoAdvanced && (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] text-muted">
                  Phone USDC transfer rail — optional. Primary REAL path is JOE
                  DM / harness.
                </p>
                <Label htmlFor="sol-payto">MOJO Solana payTo (USDC)</Label>
                <Input
                  id="sol-payto"
                  value={solPayTo}
                  onChange={(e) => setSolPayTo(e.target.value.trim())}
                  placeholder="Destination Solana pubkey"
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!money || !mojoTx}
                  onClick={() => {
                    if (!looksLikeSolanaPubkey(solPayTo)) {
                      toast.error("Enter a Solana USDC destination pubkey");
                      return;
                    }
                    setMojoOpen(true);
                  }}
                >
                  <Smartphone className="size-4" />
                  MOJO QR
                </Button>
              </div>
            )}
          </div>
        )}

        {mojoSig && (
          <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3 font-mono text-xs">
            <div className="text-orange-300">MOJO signed</div>
            <div className="mt-1 break-all">{mojoSig}</div>
            {mojoChainSig ? (
              <div className="mt-1 break-all text-emerald-400">
                on-chain: {mojoChainSig}
              </div>
            ) : null}
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
                : "LIVE · JOE/harness · Pay now"}
            </div>
            <div className="break-all">sig: {last.transaction}</div>
            <div>
              {last.amount} {last.asset} → @{last.xHandle}
            </div>
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
                const sent = await broadcastMojoSignedTx(r.signedTx);
                if (sent.ok) {
                  setMojoChainSig(sent.signature);
                  toast.success("MOJO USDC broadcast");
                } else toast.error(sent.error);
              } else {
                setMojoChainSig(r.signature);
              }
            })();
          }}
        />
      )}
    </Card>
  );
}
