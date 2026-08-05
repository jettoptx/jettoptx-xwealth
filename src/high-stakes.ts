/**
 * OPTX high-stakes approve_action client.
 *
 * Mints Mojo QR via real Aaron router — no silent local keypair autosign.
 * Harnesses (Hermes, Grok Build, Claude, cron, JettChat bots) use this for
 * LIVE / policy / trade clips. Phone (MOJO SEND-02) completes with 4-digit gaze.
 *
 * @see jettoptx-aaron-router/docs/mojo-approve-action-challenge.md
 */

export type ApproveActionMeta = {
  kind: string;
  summary: string;
  amount?: string | null;
  asset?: string | null;
  symbol?: string | null;
  venue?: string | null;
  size?: string | null;
  notional_usdc?: string | null;
  agent?: string | null;
  harness?: string | null;
  policy_ref?: string | null;
  resource?: string | null;
  on_chain?: Record<string, unknown> | null;
  extra?: Record<string, unknown> | null;
};

export type ApproveChallenge = {
  cid: string;
  type: "approve_action";
  origin: string;
  exp: number;
  expiresAt: number;
  qrPayload: string;
  action?: ApproveActionMeta | null;
  degraded?: boolean;
};

export type ChallengePoll = {
  status: "pending" | "scanned" | "verified" | "expired" | "unknown";
  cid: string;
  type?: string;
  action?: ApproveActionMeta | null;
  result?: {
    approval_id?: string;
    kind?: string;
    summary?: string;
    signer?: string | null;
    completed_at?: number;
  };
};

export function defaultAaronUrl(): string {
  return (
    process.env.AARON_ROUTER_URL?.trim() ||
    process.env.VITE_AARON_ROUTER_URL?.trim() ||
    "https://aaron.jettoptics.ai"
  );
}

function normalizeMint(
  d: Record<string, unknown>,
  origin: string,
  action: ApproveActionMeta,
  degraded = false,
): ApproveChallenge {
  const cid = String(d.cid ?? "");
  const expSec =
    typeof d.exp === "number"
      ? d.exp
      : typeof d.expiresAt === "number"
        ? d.expiresAt > 1e12
          ? Math.floor(Number(d.expiresAt) / 1000)
          : Number(d.expiresAt)
        : Math.floor(Date.now() / 1000) + 300;
  // Always use approve deep link for this client (SEND-02).
  // Production Aaron may still echo login-shaped QR until approve_action ships.
  const qrPayload = `jettmojo://approve?cid=${cid}&origin=${origin}&exp=${expSec}`;
  return {
    cid,
    type: "approve_action",
    origin: typeof d.origin === "string" ? d.origin : origin,
    exp: expSec,
    expiresAt: expSec * 1000,
    qrPayload,
    action: (d.action as ApproveActionMeta) ?? action,
    degraded,
  };
}

/** Mint high-stakes approve_action QR via Aaron. */
export async function mintApproveAction(opts: {
  action: ApproveActionMeta;
  origin?: string;
  privyDid?: string | null;
  aaronUrl?: string;
}): Promise<ApproveChallenge> {
  const origin = opts.origin || "optx";
  const base = (opts.aaronUrl || defaultAaronUrl()).replace(/\/$/, "");
  const action = opts.action;
  if (!action?.kind?.trim() || !action?.summary?.trim()) {
    throw new Error("action.kind and action.summary required");
  }
  try {
    const r = await fetch(`${base}/jett/totp/challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "approve_action",
        origin,
        privy_did: opts.privyDid ?? null,
        action,
      }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(`aaron ${r.status}: ${t.slice(0, 200)}`);
    }
    const d = (await r.json()) as Record<string, unknown>;
    return normalizeMint(d, origin, action, false);
  } catch (e) {
    // Degraded: QR still printable; complete needs live Aaron.
    const cid = `ch_local_ap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const exp = Math.floor(Date.now() / 1000) + 300;
    const qrPayload = `jettmojo://approve?cid=${cid}&origin=${origin}&exp=${exp}`;
    return {
      cid,
      type: "approve_action",
      origin,
      exp,
      expiresAt: exp * 1000,
      qrPayload,
      action,
      degraded: true,
    };
  }
}

export async function pollChallenge(
  cid: string,
  aaronUrl?: string,
): Promise<ChallengePoll> {
  const base = (aaronUrl || defaultAaronUrl()).replace(/\/$/, "");
  try {
    const r = await fetch(
      `${base}/jett/totp/status?cid=${encodeURIComponent(cid)}`,
    );
    if (!r.ok) return { status: "unknown", cid };
    const d = (await r.json()) as ChallengePoll;
    return { ...d, cid: d.cid || cid };
  } catch {
    return { status: "unknown", cid };
  }
}

export async function waitForApproval(
  cid: string,
  opts?: { timeoutMs?: number; intervalMs?: number; aaronUrl?: string },
): Promise<ChallengePoll> {
  const timeoutMs = opts?.timeoutMs ?? 300_000;
  const intervalMs = opts?.intervalMs ?? 2_000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const st = await pollChallenge(cid, opts?.aaronUrl);
    if (st.status === "verified") return st;
    if (st.status === "expired") throw new Error("Challenge expired");
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Approval timed out");
}
