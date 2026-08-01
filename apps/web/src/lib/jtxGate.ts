/**
 * Programmatic JTX gate — no Privy login required.
 * Browser: same-origin /api/solana-rpc (Vite proxy strips Origin → avoids public RPC 403)
 *          + VITE_SOLANA_RPC_URL fallbacks.
 * Agent: scripts/check-jtx-gate.mjs in jettoptx-xwealth (keypair / address).
 */

export const JTX_MINT = 'JTXGnx83s2QZ2MwYkRD1cBKrqQKSdG5oe8vSYW5Zjoe'

export type JtxGateResult = {
  ok: boolean
  wallet: string
  mint: string
  /** Human UI amount (9 decimals for JTX v2) */
  uiAmount: number | null
  rawAmount: string | null
  rpc: string
  error?: string
  /** How many RPC endpoints were tried */
  attempts?: string[]
}

/** Dev/browser path — Vite proxies to real Solana RPC without browser Origin. */
export const BROWSER_RPC_PROXY = '/api/solana-rpc'

const PUBLIC_RPC = 'https://api.mainnet-beta.solana.com'

function envRpc(): string | undefined {
  const v = (import.meta.env.VITE_SOLANA_RPC_URL as string | undefined)?.trim()
  return v || undefined
}

/** Ordered RPC candidates for browser / agent-in-browser. */
export function rpcCandidates(explicit?: string): string[] {
  const list: string[] = []
  const push = (u?: string) => {
    if (!u) return
    if (!list.includes(u)) list.push(u)
  }
  push(explicit?.trim())
  // Prefer same-origin proxy first (fixes HTTP 403 from public RPC + Origin)
  if (typeof window !== 'undefined') {
    push(BROWSER_RPC_PROXY)
  }
  push(envRpc())
  push(PUBLIC_RPC)
  // Extra public-ish fallbacks (may still 403 in browser; harmless if proxy works)
  push('https://solana-rpc.publicnode.com')
  return list
}

type RpcJson = {
  result?: {
    value?: Array<{
      account: {
        data: {
          parsed?: {
            info?: {
              tokenAmount?: { uiAmount: number | null; amount: string }
            }
          }
        }
      }
    }>
  }
  error?: { message?: string; code?: number }
}

async function fetchTokenAccounts(
  rpc: string,
  wallet: string,
  mint: string,
): Promise<{ ui: number; raw: string; rpc: string } | { error: string; rpc: string }> {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'getTokenAccountsByOwner',
    params: [
      wallet,
      { mint },
      { encoding: 'jsonParsed', commitment: 'confirmed' },
    ],
  }
  const res = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  // Some gateways return HTTP 403; others HTTP 200 + json error code 403
  const text = await res.text()
  let json: RpcJson
  try {
    json = JSON.parse(text) as RpcJson
  } catch {
    return {
      error: `RPC HTTP ${res.status} (non-JSON)`,
      rpc,
    }
  }
  if (!res.ok) {
    return {
      error: json.error?.message
        ? `RPC HTTP ${res.status}: ${json.error.message}`
        : `RPC HTTP ${res.status}`,
      rpc,
    }
  }
  if (json.error) {
    const code = json.error.code
    const msg = json.error.message ?? 'RPC error'
    return {
      error: code != null ? `RPC ${code}: ${msg}` : msg,
      rpc,
    }
  }

  const accounts = json.result?.value ?? []
  let ui = 0
  let raw = '0'
  for (const a of accounts) {
    const ta = a.account.data.parsed?.info?.tokenAmount
    if (!ta) continue
    ui += ta.uiAmount ?? 0
    raw = ta.amount
  }
  return { ui, raw, rpc }
}

/** Token-2022 / SPL balance via getTokenAccountsByOwner filtered by mint */
export async function checkJtxGate(
  walletAddress: string,
  opts?: { rpc?: string; mint?: string },
): Promise<JtxGateResult> {
  const wallet = walletAddress.trim()
  const mint = opts?.mint ?? JTX_MINT
  const candidates = rpcCandidates(opts?.rpc)
  const attempts: string[] = []

  if (!wallet || wallet.length < 32) {
    return {
      ok: false,
      wallet,
      mint,
      uiAmount: null,
      rawAmount: null,
      rpc: candidates[0] ?? PUBLIC_RPC,
      error: 'Invalid wallet address',
      attempts,
    }
  }

  let lastError = 'No RPC endpoints'
  let lastRpc = candidates[0] ?? PUBLIC_RPC

  for (const rpc of candidates) {
    try {
      const out = await fetchTokenAccounts(rpc, wallet, mint)
      if ('error' in out) {
        attempts.push(`${rpc} → ${out.error}`)
        lastError = out.error
        lastRpc = rpc
        // try next candidate on 403 / forbidden / network-ish failures
        continue
      }
      attempts.push(`${rpc} → ok ui=${out.ui}`)
      return {
        ok: out.ui >= 1,
        wallet,
        mint,
        uiAmount: out.ui,
        rawAmount: out.raw,
        rpc: out.rpc,
        error: out.ui >= 1 ? undefined : `Need ≥1 JTX (have ${out.ui})`,
        attempts,
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      attempts.push(`${rpc} → ${msg}`)
      lastError = msg
      lastRpc = rpc
    }
  }

  return {
    ok: false,
    wallet,
    mint,
    uiAmount: null,
    rawAmount: null,
    rpc: lastRpc,
    error: lastError,
    attempts,
  }
}

export function defaultWalletFromEnv(): string {
  return (
    (import.meta.env.VITE_SOLANA_WALLET as string | undefined)?.trim() || ''
  )
}
