import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HarnessId } from "./harness";
import type { MoneySetupStatus, XMoneyKind } from "./xmoney";

export type LinkedMoney = {
  handle: string;
  kind: XMoneyKind;
  transferUrl: string;
  linkedAt: string;
  method: string;
  /** Whether the user believes X Money is live for this handle */
  setupStatus: MoneySetupStatus;
};

export type WiredHarness = {
  id: HarnessId;
  wired: boolean;
  updatedAt: string | null;
};

export type DryRunReceipt = {
  id: string;
  amount: string;
  asset: string;
  xHandle: string;
  transaction: string;
  settledAt: string;
  harness: HarnessId | "manual" | "live";
};

/** Where the agent / JTX gate pubkey comes from */
export type PreferredWalletSource = "manual" | "privy" | "phantom";

type WealthState = {
  money: LinkedMoney | null;
  solanaWallet: string;
  /**
   * Preferred agent wallet (Solana base58) used for JTX proof + x402 settle.
   * Distinct from ephemeral Privy sign address when user pins a desk wallet.
   */
  preferredAgentWallet: string;
  /** Optional human label e.g. "desk phantom" / "hermes agent" */
  agentWalletLabel: string;
  preferredWalletSource: PreferredWalletSource;
  harnesses: Record<HarnessId, WiredHarness>;
  receipts: DryRunReceipt[];
  /** Handles the user starred from Augments marketplace */
  starredAugments: string[];
  /** Label for the custom harness card */
  customHarnessName: string;
  setMoney: (money: LinkedMoney | null) => void;
  setMoneySetupStatus: (status: MoneySetupStatus) => void;
  setSolanaWallet: (w: string) => void;
  setPreferredAgentWallet: (w: string) => void;
  setAgentWalletLabel: (label: string) => void;
  setPreferredWalletSource: (s: PreferredWalletSource) => void;
  setCustomHarnessName: (name: string) => void;
  wireHarness: (id: HarnessId, wired: boolean) => void;
  addReceipt: (r: Omit<DryRunReceipt, "id">) => void;
  clearReceipts: () => void;
  toggleStarAugment: (handle: string) => void;
};

const defaultHarnesses: Record<HarnessId, WiredHarness> = {
  "grok-build": { id: "grok-build", wired: false, updatedAt: null },
  hermes: { id: "hermes", wired: false, updatedAt: null },
  claude: { id: "claude", wired: false, updatedAt: null },
  custom: { id: "custom", wired: false, updatedAt: null },
};

export const useWealthStore = create<WealthState>()(
  persist(
    (set) => ({
      money: null,
      solanaWallet: "",
      preferredAgentWallet: "",
      agentWalletLabel: "Agent desk wallet",
      preferredWalletSource: "manual",
      harnesses: defaultHarnesses,
      receipts: [],
      starredAugments: [],
      customHarnessName: "My Agent",
      setMoney: (money) => set({ money }),
      setMoneySetupStatus: (setupStatus) =>
        set((s) =>
          s.money ? { money: { ...s.money, setupStatus } } : s,
        ),
      setSolanaWallet: (solanaWallet) => {
        const w = solanaWallet.trim();
        // Never persist Ethereum 0x as the Solana desk wallet
        if (w.startsWith("0x")) return;
        set({ solanaWallet: w });
      },
      setPreferredAgentWallet: (preferredAgentWallet) => {
        const w = preferredAgentWallet.trim();
        if (w.startsWith("0x")) return;
        set((s) => ({
          preferredAgentWallet: w,
          // Pin also drives JTX settle wallet when set
          solanaWallet: w || s.solanaWallet,
        }));
      },
      setAgentWalletLabel: (agentWalletLabel) => set({ agentWalletLabel }),
      setPreferredWalletSource: (preferredWalletSource) =>
        set({ preferredWalletSource }),
      setCustomHarnessName: (customHarnessName) => set({ customHarnessName }),
      wireHarness: (id, wired) =>
        set((s) => ({
          harnesses: {
            ...s.harnesses,
            [id]: {
              id,
              wired,
              updatedAt: new Date().toISOString(),
            },
          },
        })),
      addReceipt: (r) =>
        set((s) => ({
          receipts: [
            {
              ...r,
              id: `rcpt_${Date.now().toString(36)}`,
            },
            ...s.receipts,
          ].slice(0, 25),
        })),
      clearReceipts: () => set({ receipts: [] }),
      toggleStarAugment: (handle) =>
        set((s) => {
          const h = handle.toLowerCase();
          const has = s.starredAugments.includes(h);
          return {
            starredAugments: has
              ? s.starredAugments.filter((x) => x !== h)
              : [...s.starredAugments, h],
          };
        }),
    }),
    {
      name: "xwealth-jettoptx-v3",
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<WealthState>;
        // Drop stale Ethereum pins that were saved as "solana" desk wallets
        const scrub = (w?: string) =>
          w && w.trim().startsWith("0x") ? "" : (w ?? "");
        return {
          ...current,
          ...p,
          solanaWallet: scrub(p.solanaWallet) || current.solanaWallet,
          preferredAgentWallet:
            scrub(p.preferredAgentWallet) || current.preferredAgentWallet,
          harnesses: {
            ...defaultHarnesses,
            ...(p.harnesses ?? {}),
          },
        };
      },
    },
  ),
);
