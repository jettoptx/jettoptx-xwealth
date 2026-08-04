/**
 * Client for JOE Buzz / harness x402 LIVE sign challenges.
 * Primary REAL operator path — not MOJO QR.
 */

export type JoeSignChallenge = {
  cid: string;
  status: "pending" | "notified" | "verified" | "expired";
  expiresAt: number;
  message: string;
  paymentRequired: string;
  amountUsdc: string;
  xHandle: string;
  xMoneyUrl: string;
  resource: string;
  buzzNotified: boolean;
  buzzNotifyError?: string;
  buzzChannelUrl: string;
  harnessSkill: string;
  cloudflareWalletHandle: string;
};

export type JoeSignChallengePoll = {
  status: "pending" | "notified" | "verified" | "expired" | "unknown";
  cid: string;
  signature?: string;
  fromWallet?: string;
  approvedVia?: string;
  buzzNotified?: boolean;
  message?: string;
};

export async function createJoeSignChallenge(opts: {
  amountUsdc: string;
  xHandle: string;
  xMoneyUrl: string;
  resource?: string;
}): Promise<JoeSignChallenge> {
  const res = await fetch("/api/x402/sign-challenge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amountUsdc: opts.amountUsdc,
      xHandle: opts.xHandle,
      xMoneyUrl: opts.xMoneyUrl,
      resource: opts.resource,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(err || `sign-challenge failed (${res.status})`);
  }
  return (await res.json()) as JoeSignChallenge;
}

export async function pollJoeSignChallenge(
  cid: string,
): Promise<JoeSignChallengePoll> {
  const res = await fetch(
    `/api/x402/sign-challenge?cid=${encodeURIComponent(cid)}`,
    { cache: "no-store" },
  );
  if (!res.ok) return { status: "unknown", cid };
  return (await res.json()) as JoeSignChallengePoll;
}

export async function submitJoeSignChallenge(opts: {
  cid: string;
  signature: string;
  fromWallet?: string;
  approvedVia?: "joe-buzz" | "harness" | "paste" | "privy-fallback";
}): Promise<JoeSignChallengePoll> {
  const res = await fetch("/api/x402/sign-challenge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "submit",
      cid: opts.cid,
      signature: opts.signature,
      fromWallet: opts.fromWallet,
      approvedVia: opts.approvedVia ?? "paste",
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(err || `submit failed (${res.status})`);
  }
  return (await res.json()) as JoeSignChallengePoll;
}
