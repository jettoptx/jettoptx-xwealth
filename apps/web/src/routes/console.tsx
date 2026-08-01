import { createFileRoute, Link } from "@tanstack/react-router";
import { Cpu, ExternalLink } from "lucide-react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { PayLinkPanel } from "@/components/pay-link-panel";
import { HarnessPanel } from "@/components/harness-panel";
import { X402Panel } from "@/components/x402-panel";
import { OnrampPanel } from "@/components/onramp-panel";
import { MoneySetupBanner } from "@/components/money-setup-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useWealthStore } from "@/lib/store";
import { moneyStatusLabel } from "@/lib/xmoney";
import { OPTX_LINKS } from "@/lib/optx-links";

export const Route = createFileRoute("/console")({
  component: ConsolePage,
});

function ConsolePage() {
  const { user, isPending } = useCurrentUserState();
  const money = useWealthStore((s) => s.money);
  const harnesses = useWealthStore((s) => s.harnesses);

  if (isPending) {
    return (
      <main className="mx-auto max-w-6xl px-3 py-10 sm:px-6 sm:py-16">
        <div className="h-7 w-40 animate-pulse rounded bg-elevated" />
        <div className="mt-4 h-48 animate-pulse rounded-xl bg-elevated" />
      </main>
    );
  }

  if (!user) {
    return <RedirectToSignIn />;
  }

  const wiredCount = Object.values(harnesses).filter((h) => h.wired).length;
  const setup = money?.setupStatus ?? "unlinked";
  const sessionHandle = user.handle;

  return (
    <main className="mx-auto max-w-6xl space-y-4 px-3 py-5 sm:space-y-6 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-subtle sm:text-xs">
            Console
          </p>
          <h1 className="mt-0.5 truncate font-display text-xl font-semibold tracking-tight sm:text-3xl">
            {user.displayName ?? "Your account"}
          </h1>
          <p className="mt-0.5 text-xs text-muted sm:text-sm">
            {sessionHandle ? (
              <span className="font-mono text-fg">@{sessionHandle}</span>
            ) : (
              "x402 → X Money"
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={setup === "confirmed" ? "success" : "warn"}
            className="text-[10px] sm:text-xs"
          >
            {money
              ? `@${money.handle}`
              : moneyStatusLabel("unlinked")}
          </Badge>
          <Badge variant="outline" className="text-[10px] sm:text-xs">
            {wiredCount}/4 wired
          </Badge>
        </div>
      </div>

      <MoneySetupBanner handle={sessionHandle} />

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <PayLinkPanel
            defaultHandle={sessionHandle}
            displayName={user.displayName}
            email={user.primaryEmail}
          />
        </div>
        <div className="lg:col-span-2">
          <HarnessPanel />
        </div>
        <X402Panel />
        <Card className="border-augment/30 bg-surface">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Cpu className="size-4 text-augment" />
              Agent plugin (post-login option)
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              The outer product is this site. The{" "}
              <strong className="text-fg/90">jettoptx-xwealth</strong> agent
              plugin (JTX ≥1 gate, dry-run CLI, Grok/Hermes skills) lives in
              this repo and runs without Privy — install it for harnesses.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <a
                href={OPTX_LINKS.plugin}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5"
              >
                Open plugin repo
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <a
                href={OPTX_LINKS.pluginInstall}
                target="_blank"
                rel="noreferrer"
              >
                Install / gate
              </a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={OPTX_LINKS.pluginGrok} target="_blank" rel="noreferrer">
                Grok plugin docs
              </a>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link to="/augments" search={{ embed: undefined }}>
                Back to Augments map
              </Link>
            </Button>
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
          <OnrampPanel />
        </div>
      </div>
    </main>
  );
}
