import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Loader2, RefreshCw, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createSignChallenge,
  type SignChallenge,
  type SignTxMeta,
} from "@/lib/mojo-sign-challenge";
import { OpticalQrStream } from "@/components/optical-qr-stream";
import type { OpticalEnvelope } from "@/lib/optical-transfer";

type Props = {
  open: boolean;
  onClose: () => void;
  tx: SignTxMeta;
  origin?: string;
  onSigned?: (result: {
    signature: string;
    signedTx?: string | null;
    signer?: string | null;
  }) => void;
};

/**
 * Lightweight X Wealth modal: mint sign_tx challenge → show QR → poll.
 * Visual cousin of jtx.chat/login Mojo QR (orange / phone approve).
 */
export function MojoSignQrModal({
  open,
  onClose,
  tx,
  origin = "xwealth",
  onSigned,
}: Props) {
  const [challenge, setChallenge] = useState<SignChallenge | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [done, setDone] = useState<{
    signature: string;
    signedTx?: string | null;
    signer?: string | null;
  } | null>(null);
  const [useOptical, setUseOptical] = useState(
    Boolean(tx.unsignedTx && tx.unsignedTx.length > 180),
  );

  const mint = async () => {
    setCreating(true);
    setErr(null);
    setDone(null);
    setScanned(false);
    setChallenge(null);
    setQrDataUrl(null);
    try {
      const ch = await createSignChallenge({ origin, tx });
      setChallenge(ch);
      const url = await QRCode.toDataURL(ch.qrPayload, {
        width: 200,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      });
      setQrDataUrl(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to mint challenge");
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (open) void mint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tx.amount, tx.payTo, tx.unsignedTx]);

  useEffect(() => {
    if (!open || !challenge || done) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      if (stopped) return;
      try {
        const r = await fetch(
          `/api/mojo/sign-challenge?cid=${encodeURIComponent(challenge.cid)}`,
          { cache: "no-store" },
        );
        const d = await r.json();
        if (stopped) return;
        if (d.status === "scanned") setScanned(true);
        if (d.status === "verified") {
          const result = {
            signature: String(d.result?.signature ?? ""),
            signedTx: d.result?.signedTx ?? null,
            signer: d.result?.signer ?? null,
          };
          setDone(result);
          onSigned?.(result);
          return;
        }
        if (
          d.status === "expired" ||
          Date.now() > challenge.expiresAt + 5_000
        ) {
          setErr("Challenge expired — mint a new QR.");
          return;
        }
      } catch {
        /* keep polling */
      }
      if (!stopped) timer = setTimeout(tick, 1500);
    };
    void tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [open, challenge, done, onSigned]);

  if (!open) return null;

  const dest = tx.destination || tx.payTo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-orange-500/35 bg-card p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground hover:bg-muted"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-orange-400">
          <Smartphone className="h-3 w-3" />
          JOE Pay
        </div>
        <h3 className="text-xl font-semibold tracking-tight">
          Approve with MOJO
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Scan with MOJO · same QR rail as jtx.chat/login, for Solana USDC.
        </p>
        <div className="mt-4 space-y-1 rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-medium tabular-nums">
              {tx.amount} {tx.asset || "USDC"}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">To</span>
            <span className="max-w-[60%] truncate font-mono text-xs" title={dest}>
              {dest}
            </span>
          </div>
        </div>

        <div className="mt-5">
          {done ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-5 text-center">
              <Check className="mx-auto mb-2 text-emerald-400" size={22} />
              <p className="text-sm font-medium text-emerald-400">Signed</p>
              <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                {done.signature}
              </p>
            </div>
          ) : creating ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Minting challenge…
            </div>
          ) : err ? (
            <div className="space-y-3">
              <p className="text-sm text-red-400">{err}</p>
              <Button type="button" variant="outline" onClick={() => void mint()}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          ) : qrDataUrl && challenge ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setUseOptical(false)}
                  className={!useOptical ? "font-semibold text-orange-400" : "text-muted-foreground"}
                >
                  Static QR
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  type="button"
                  onClick={() => setUseOptical(true)}
                  className={useOptical ? "font-semibold text-orange-400" : "text-muted-foreground"}
                >
                  Optical stream
                </button>
              </div>
              {useOptical ? (
                <OpticalQrStream
                  envelope={
                    {
                      v: 1,
                      kind: "sign_tx",
                      challenge: {
                        cid: challenge.cid,
                        origin,
                        exp: Math.floor(challenge.expiresAt / 1000),
                        amount: tx.amount,
                        asset: tx.asset || "USDC",
                        mint: tx.mint,
                        payTo: tx.payTo,
                        destination: tx.destination,
                        network: tx.network,
                        memo: tx.memo,
                        unsignedTx: tx.unsignedTx,
                        message: tx.message,
                        resource: tx.resource,
                      },
                    } satisfies OpticalEnvelope
                  }
                  sizeCssPx={200}
                />
              ) : (
                <>
                  <div className="rounded-xl bg-white p-3">
                    <img
                      src={qrDataUrl}
                      alt="Scan with MOJO to approve payment"
                      width={168}
                      height={168}
                    />
                  </div>
                  <p className="text-center text-[11px] text-muted-foreground">
                    {scanned
                      ? "Phone scanning — approve in MOJO…"
                      : "Waiting for MOJO signature…"}
                  </p>
                  <a
                    href={challenge.qrPayload}
                    className="text-sm font-medium text-orange-400 hover:underline"
                  >
                    Open in MOJO
                  </a>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
