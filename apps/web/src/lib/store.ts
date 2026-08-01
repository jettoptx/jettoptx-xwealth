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

type WealthState = {
  money: LinkedMoney | null;
  solanaWallet: string;
  harnesses: Record<HarnessId, WiredHarness>;
  receipts: DryRunReceipt[];
  /** Handles the user starred from Augments marketplace */
  starredAugments: string[];
  /** Label for the custom harness card */
  customHarnessName: string;
  setMoney: (money: LinkedMoney | null) => void;
  setMoneySetupStatus: (status: MoneySetupStatus) => void;
  setSolanaWallet: (w: string) => void;
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
      harnesses: defaultHarnesses,
      receipts: [],
      starredAugments: [],
      customHarnessName: "My Agent",
      setMoney: (money) => set({ money }),
      setMoneySetupStatus: (setupStatus) =>
        set((s) =>
          s.money ? { money: { ...s.money, setupStatus } } : s,
        ),
      setSolanaWallet: (solanaWallet) => set({ solanaWallet }),
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
        return {
          ...current,
          ...p,
          harnesses: {
            ...defaultHarnesses,
            ...(p.harnesses ?? {}),
          },
        };
      },
    },
  ),
);
