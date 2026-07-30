import { ExternalLink, ShieldAlert, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  X_MONEY_SETUP_URL,
  moneyStatusLabel,
  type MoneySetupStatus,
} from "@/lib/xmoney";
import { useWealthStore } from "@/lib/store";

type Props = {
  handle?: string | null;
};

export function MoneySetupBanner({ handle }: Props) {
  const money = useWealthStore((s) => s.money);
  const setMoneySetupStatus = useWealthStore((s) => s.setMoneySetupStatus);

  const status: MoneySetupStatus = money?.setupStatus ?? "unlinked";
  const h = money?.handle ?? handle ?? null;

  if (status === "confirmed" && money) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-accent/25 bg-accent/5 px-3 py-2.5 text-xs sm:px-4 sm:text-sm">
        <ShieldCheck className="size-4 shrink-0 text-accent" />
        <span className="min-w-0 truncate text-fg">
          Money ready ·{" "}
          <span className="font-mono text-accent">@{money.handle}</span>
        </span>
      </div>
    );
  }

  const title =
    status === "unlinked"
      ? "No X Money link"
      : status === "setup_needed"
        ? "Confirm X Money setup"
        : "Link saved · verify on X";

  const body =
    status === "unlinked"
      ? "Paste a pay link or use your handle. Open X to enable Money if needed."
      : "We can’t verify Money is live on X. Open setup, then mark ready.";

  return (
    <Card className="border-warn/30 bg-warn/[0.04]">
      <CardHeader className="pb-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warn" />
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base">{title}</CardTitle>
              <CardDescription className="mt-0.5 text-xs sm:text-sm">
                {body}
              </CardDescription>
            </div>
          </div>
          <Badge variant="warn" className="shrink-0 text-[10px]">
            {moneyStatusLabel(status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
        <Button asChild size="sm" variant="secondary" className="w-full sm:w-auto">
          <a
            href={X_MONEY_SETUP_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5"
          >
            <Wallet className="size-3.5" />
            X Money setup
            <ExternalLink className="size-3 opacity-70" />
          </a>
        </Button>
        {h && (
          <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
            <a
              href={`https://x.com/i/money/pay/${h}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5"
            >
              Test @{h}
              <ExternalLink className="size-3 opacity-70" />
            </a>
          </Button>
        )}
        {money && status !== "confirmed" && (
          <Button
            type="button"
            size="sm"
            variant="accent"
            className="w-full sm:w-auto"
            onClick={() => setMoneySetupStatus("confirmed")}
          >
            Mark ready
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
