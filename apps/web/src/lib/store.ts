import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HarnessId } from "./harness";
import type { MoneySetupStatus, XMoneyKind } from "./xmoney";
import {
  MOA_SEED_LINKS,
  MOA_SEED_PROOFS,
  normalizeHandle,
  type MoaLink,
  type MoaPublicProof,
} from "./moa-graph";

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
  /** Map of Augments — public edges (follow / delegate / paid) */
  moaLinks: MoaLink[];
  /** Map of Augments — public proofs (amounts truncated by default) */
  moaProofs: MoaPublicProof[];
  setMoney: (money: LinkedMoney | null) => void;
  setMoneySetupStatus: (status: MoneySetupStatus) => void;
  setSolanaWallet: (w: string) => void;
  setCustomHarnessName: (name: string) => void;
  wireHarness: (id: HarnessId, wired: boolean) => void;
  addReceipt: (r: Omit<DryRunReceipt, "id">) => void;
  clearReceipts: () => void;
  toggleStarAugment: (handle: string) => void;
  upsertMoaLink: (link: MoaLink) => void;
  recordMoaProof: (proof: MoaPublicProof, link?: MoaLink) => void;
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
      moaLinks: MOA_SEED_LINKS,
      moaProofs: MOA_SEED_PROOFS,
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
      upsertMoaLink: (link) =>
        set((s) => {
          const next = s.moaLinks.filter((l) => l.id !== link.id);
          return { moaLinks: [link, ...next].slice(0, 200) };
        }),
      recordMoaProof: (proof, link) =>
        set((s) => {
          const proofs = [
            proof,
            ...s.moaProofs.filter((p) => p.id !== proof.id),
          ].slice(0, 100);
          let moaLinks = s.moaLinks;
          if (link) {
            moaLinks = [
              link,
              ...s.moaLinks.filter((l) => l.id !== link.id),
            ].slice(0, 200);
          }
          return { moaProofs: proofs, moaLinks };
        }),
    }),
    {
      name: "xwealth-jettoptx-v4",
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<WealthState>;
        const seededLinkIds = new Set(MOA_SEED_LINKS.map((l) => l.id));
        const seededProofIds = new Set(MOA_SEED_PROOFS.map((pr) => pr.id));
        const userLinks = (p.moaLinks ?? []).filter(
          (l) => !seededLinkIds.has(l.id),
        );
        const userProofs = (p.moaProofs ?? []).filter(
          (pr) => !seededProofIds.has(pr.id),
        );
        return {
          ...current,
          ...p,
          harnesses: {
            ...defaultHarnesses,
            ...(p.harnesses ?? {}),
          },
          moaLinks: [...userLinks, ...MOA_SEED_LINKS].slice(0, 200),
          moaProofs: [...userProofs, ...MOA_SEED_PROOFS].slice(0, 100),
        };
      },
    },
  ),
);

export function findMoaProof(
  proofs: MoaPublicProof[],
  proofId: string | null | undefined,
): MoaPublicProof | undefined {
  if (!proofId) return undefined;
  return proofs.find((p) => p.id === proofId);
}

export function hasMoaLink(
  links: MoaLink[],
  fromHandle: string,
  toHandle: string,
  kind?: MoaLink["kind"],
): boolean {
  const from = normalizeHandle(fromHandle);
  const to = normalizeHandle(toHandle);
  return links.some(
    (l) =>
      normalizeHandle(l.fromHandle) === from &&
      normalizeHandle(l.toHandle) === to &&
      (kind ? l.kind === kind : true),
  );
}
