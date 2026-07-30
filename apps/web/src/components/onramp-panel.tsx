import { ExternalLink, Wallet } from "lucide-react";
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
import { USDC_MINT_SOLANA } from "@/lib/x402";
import { useWealthStore } from "@/lib/store";
import { copyText } from "@/lib/utils";

export function OnrampPanel() {
  const wallet = useWealthStore((s) => s.solanaWallet);
  const setWallet = useWealthStore((s) => s.setSolanaWallet);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-4 text-accent" />
              USDC / Solana on-ramp
            </CardTitle>
            <CardDescription className="mt-1">
              Default payment rail for agent x402 is USDC on Solana. Optional
              wallet address is used as the dry-run payer identity.
            </CardDescription>
          </div>
          <Badge variant="success">default rail</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sol">Solana wallet (optional)</Label>
          <Input
            id="sol"
            placeholder="Your Solana address"
            value={wallet}
            onChange={(e) => setWallet(e.target.value.trim())}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-bg p-3">
            <div className="text-xs uppercase tracking-wider text-subtle">
              Asset
            </div>
            <div className="mt-1 font-display font-semibold">USDC</div>
            <p className="mt-1 font-mono text-[11px] text-muted break-all">
              {USDC_MINT_SOLANA}
            </p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-2 px-0"
              onClick={() => {
                void copyText(USDC_MINT_SOLANA).then(() =>
                  toast.success("Mint copied"),
                );
              }}
            >
              Copy mint
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-bg p-3">
            <div className="text-xs uppercase tracking-wider text-subtle">
              Network
            </div>
            <div className="mt-1 font-display font-semibold">Solana mainnet</div>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Low fees, instant finality for agent micropayments. Live settle can
              be enabled later via an x402 facilitator.
            </p>
            <a
              href="https://solana.com"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline"
            >
              Solana docs
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>

        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted leading-relaxed">
          <li>Fund a Solana wallet with USDC (CEX, card on-ramp, or bridge).</li>
          <li>Paste the address above so harness dry-runs label the payer.</li>
          <li>
            Agents pay via x402; destination is your X Money link — not the
            wallet address.
          </li>
        </ol>
      </CardContent>
    </Card>
  );
}
