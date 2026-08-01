import { Link, createFileRoute } from "@tanstack/react-router";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { copyText } from "@/lib/utils";

export const Route = createFileRoute("/exhibit")({
  component: ExhibitPage,
});

const EXHIBIT = {
  appName: "X Wealth",
  developer: "Jett Optical Encryption",
  xHandle: "@jettoptx",
  developerAccount: "jettoptx",
  tagline:
    "Link X Money pay links & QR codes so agent harnesses (Grok Build, Hermes, Claude) can settle x402 payments in USDC on Solana.",
  category: "Payments · Agents · X API",
  apis: "X OAuth (login), X identity, X Money deep links",
  shortDescription:
    "X Wealth is a plugin-and-play agentic pay surface for X Money. Creators sign in with X, paste their Money pay/transfer link or QR, and export harness skills so Grok Build, Hermes, and Claude can honor HTTP 402 (x402) micropayments in USDC on Solana — routed to the creator’s X Money account.",
  longDescription: `X Wealth by Jett Optical Encryption turns any X Money account into an agent-payable endpoint.

1. User links their X handle via OAuth.
2. User pastes (or QR-uploads) their X Money pay/transfer URL: https://x.com/i/money/pay|{transfer}/{handle}
3. Console generates copy-paste skills/env for Grok Build, Hermes Agent, and Claude.
4. Agents request a gated resource, receive HTTP 402 + payment instructions, attach a USDC/Solana x402 payment signature, and dry-run settle into the linked X Money account.

Default rail: USDC on Solana mainnet. Live facilitator settlement can be enabled without changing the harness contract.

Built for the X Developer E𝕏hibit under the official Jett Optical Encryption developer app (@jettoptx).`,
  consoleUrl: "https://console.x.com/",
  exhibitUrl: "https://developer.x.com/exhibit",
};

function ExhibitPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <Badge variant="success">E𝕏hibit submission kit</Badge>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
          Submit X Wealth to the Developer E𝕏hibit
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Pre-filled copy for the{" "}
          <a
            href={EXHIBIT.exhibitUrl}
            target="_blank"
            rel="noreferrer"
            className="text-fg underline-offset-2 hover:underline"
          >
            X Developer E𝕏hibit
          </a>{" "}
          under your official{" "}
          <strong className="text-fg">Jett Optical Encryption</strong> developer
          app ({EXHIBIT.xHandle}).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listing fields</CardTitle>
          <CardDescription>
            Copy each field into the Developer Console when you submit the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="App name" value={EXHIBIT.appName} />
          <Field label="Developer" value={EXHIBIT.developer} />
          <Field label="Developer X account" value={EXHIBIT.developerAccount} />
          <Field label="Tagline" value={EXHIBIT.tagline} />
          <Field label="Category" value={EXHIBIT.category} />
          <Field label="X APIs used" value={EXHIBIT.apis} />
          <Field label="Short description" value={EXHIBIT.shortDescription} />
          <Field label="Long description" value={EXHIBIT.longDescription} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submission checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm text-muted">
            <CheckItem>
              Open{" "}
              <a
                className="text-fg underline-offset-2 hover:underline"
                href={EXHIBIT.consoleUrl}
                target="_blank"
                rel="noreferrer"
              >
                console.x.com
              </a>{" "}
              with the Jett Optical Encryption / @jettoptx developer account.
            </CheckItem>
            <CheckItem>
              Select the official X developer app for this product.
            </CheckItem>
            <CheckItem>Submit to E𝕏hibit and paste the fields above.</CheckItem>
            <CheckItem>
              Point the live URL at this deployed X Wealth instance.
            </CheckItem>
            <CheckItem>
              Confirm OAuth callback URLs match the production origin.
            </CheckItem>
            <CheckItem>
              Demo path: Login with X → paste Money link → wire harness → run
              x402 dry-run.
            </CheckItem>
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild>
              <a href={EXHIBIT.consoleUrl} target="_blank" rel="noreferrer">
                Open Developer Console
                <ExternalLink className="size-4" />
              </a>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/console">Open console demo</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-subtle">
        Prototype inspired by{" "}
        <a
          href="https://xwealth.space/augments"
          target="_blank"
          rel="noreferrer"
          className="hover:text-muted"
        >
          xwealth.space/augments
        </a>
        . This build is exhibit-ready dry-run (no live settle).
      </p>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-bg p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-wider text-subtle">
          {label}
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7"
          onClick={() => {
            void copyText(value).then(() => {
              setCopied(true);
              toast.success(`${label} copied`);
              setTimeout(() => setCopied(false), 1200);
            });
          }}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          Copy
        </Button>
      </div>
      <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-fg">
        {value}
      </pre>
    </div>
  );
}

function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2">
      <Check className="mt-0.5 size-4 shrink-0 text-accent" />
      <span>{children}</span>
    </li>
  );
}
