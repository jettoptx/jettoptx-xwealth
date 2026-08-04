/**
 * Ephemeral in-process store for JOE / harness x402 sign challenges.
 * Serverless instances do not share memory — production Buzz DM needs
 * JOE_BUZZ_WEBHOOK_URL (+ durable store later). Harness paste/submit still works
 * when the approving client hits the same deployment.
 */

export type X402SignChallengeRecord = {
  cid: string;
  status: "pending" | "notified" | "verified" | "expired";
  createdAt: number;
  expiresAt: number;
  xHandle: string;
  xMoneyUrl: string;
  amountUsdc: string;
  resource: string;
  message: string;
  paymentRequired: string;
  buzzNotified: boolean;
  buzzNotifyError?: string;
  signature?: string;
  fromWallet?: string;
  approvedVia?: "joe-buzz" | "harness" | "paste" | "privy-fallback";
};

const g = globalThis as typeof globalThis & {
  __x402SignChallenges?: Map<string, X402SignChallengeRecord>;
};

function map(): Map<string, X402SignChallengeRecord> {
  if (!g.__x402SignChallenges) g.__x402SignChallenges = new Map();
  return g.__x402SignChallenges;
}

export function putChallenge(rec: X402SignChallengeRecord): void {
  map().set(rec.cid, rec);
}

export function getChallenge(cid: string): X402SignChallengeRecord | undefined {
  const rec = map().get(cid);
  if (!rec) return undefined;
  if (rec.status !== "verified" && Date.now() > rec.expiresAt) {
    rec.status = "expired";
    map().set(cid, rec);
  }
  return rec;
}

export function newChallengeId(): string {
  return `joe_x402_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function joeBuzzWebhookConfigured(): boolean {
  return Boolean(
    process.env.JOE_BUZZ_WEBHOOK_URL?.trim() ||
      process.env.JETTCHAT_NOTIFY_URL?.trim() ||
      process.env.JOE_DM_WEBHOOK_URL?.trim(),
  );
}

export function joeBuzzWebhookUrl(): string | null {
  return (
    process.env.JOE_BUZZ_WEBHOOK_URL?.trim() ||
    process.env.JETTCHAT_NOTIFY_URL?.trim() ||
    process.env.JOE_DM_WEBHOOK_URL?.trim() ||
    null
  );
}
