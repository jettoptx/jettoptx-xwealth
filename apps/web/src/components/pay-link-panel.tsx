import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  Check,
  Copy,
  Link2,
  QrCode,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { copyText } from "@/lib/utils";
import { extractPayPayloadFromFile } from "@/lib/qr-from-file";
import {
  inferXHandle,
  moneyStatusLabel,
  parseXMoneyInput,
  type MoneySetupStatus,
  type XMoneyKind,
} from "@/lib/xmoney";
import { useWealthStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";

type Props = {
  defaultHandle?: string | null;
  displayName?: string | null;
  email?: string | null;
};

export function PayLinkPanel({ defaultHandle, displayName, email }: Props) {
  const money = useWealthStore((s) => s.money);
  const setMoney = useWealthStore((s) => s.setMoney);
  const { theme } = useTheme();
  const [raw, setRaw] = useState(money?.transferUrl ?? "");
  const [kind, setKind] = useState<XMoneyKind>(money?.kind ?? "pay");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);

  const sessionHandle = useMemo(
    () =>
      inferXHandle({
        username: defaultHandle,
        displayName,
        email,
      }),
    [defaultHandle, displayName, email],
  );

  const preview = useMemo(() => parseXMoneyInput(raw, "url", kind), [raw, kind]);

  useEffect(() => {
    const url = money?.transferUrl ?? (preview.ok ? preview.transferUrl : null);
    if (!url) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    const dark = theme === "dark";
    QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      color: dark
        ? { dark: "#0a0a0c", light: "#f4f4f5" }
        : { dark: "#111113", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).then((data) => {
      if (!cancelled) setQrDataUrl(data);
    });
    return () => {
      cancelled = true;
    };
  }, [money?.transferUrl, preview, theme]);

  function applyParsed(parsed: ReturnType<typeof parseXMoneyInput>) {
    if (!parsed.ok) {
      toast.error(parsed.note);
      return;
    }
    const setupStatus: MoneySetupStatus = parsed.likelyNeedsSetup
      ? "setup_needed"
      : "linked_unverified";
    setMoney({
      handle: parsed.handle,
      kind: parsed.kind,
      transferUrl: parsed.transferUrl,
      linkedAt: new Date().toISOString(),
      method: parsed.method,
      setupStatus,
    });
    setRaw(parsed.transferUrl);
    setKind(parsed.kind);
    if (setupStatus === "setup_needed") {
      toast.message(`Linked @${parsed.handle}`, {
        description: "Confirm handle, enable Money on X if needed, then mark ready.",
      });
    } else {
      toast.success(`Linked @${parsed.handle}`);
    }
  }

  function linkFromInput() {
    applyParsed(parseXMoneyInput(raw, "url", kind));
  }

  function useSessionHandle() {
    const h = sessionHandle;
    if (!h) {
      toast.error("Could not read an X handle from this session.", {
        description: "Paste your @handle or X Money pay link.",
      });
      return;
    }
    applyParsed(parseXMoneyInput(`@${h}`, "handle", kind));
  }

  async function onCopy() {
    const url = money?.transferUrl;
    if (!url) return;
    await copyText(url);
    setCopied(true);
    toast.success("Pay link copied");
    setTimeout(() => setCopied(false), 1500);
  }

  async function onFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const result = await extractPayPayloadFromFile(file);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setRaw(result.value);
      applyParsed(
        parseXMoneyInput(
          result.value,
          result.source === "qr" ? "qr" : "url",
          kind,
        ),
      );
    } catch {
      toast.error("Could not read that file — paste the X Money link instead.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <Link2 className="size-4 shrink-0 text-accent" />
              X Money
            </CardTitle>
            <CardDescription className="mt-1">
              Paste pay link, @handle, or QR screenshot.
            </CardDescription>
          </div>
          {money ? (
            <Badge variant={money.setupStatus === "confirmed" ? "success" : "warn"} className="shrink-0">
              @{money.handle}
            </Badge>
          ) : (
            <Badge variant="warn" className="shrink-0">
              Unlinked
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={kind} onValueChange={(v) => setKind(v as XMoneyKind)}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="pay" className="flex-1 sm:flex-none">
              pay
            </TabsTrigger>
            <TabsTrigger value="transfer" className="flex-1 sm:flex-none">
              transfer
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pay" className="space-y-2">
            <Label htmlFor="pay-url" className="sr-only sm:not-sr-only">
              Pay link or @handle
            </Label>
            <Input
              id="pay-url"
              placeholder="https://x.com/i/money/pay/handle"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && linkFromInput()}
              className="font-mono text-sm"
            />
          </TabsContent>
          <TabsContent value="transfer" className="space-y-2">
            <Label htmlFor="tr-url" className="sr-only sm:not-sr-only">
              Transfer link or @handle
            </Label>
            <Input
              id="tr-url"
              placeholder="https://x.com/i/money/transfer/handle"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && linkFromInput()}
              className="font-mono text-sm"
            />
          </TabsContent>
        </Tabs>

        {/* Primary actions — full-width stack on mobile */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button type="button" onClick={linkFromInput} className="col-span-2 sm:col-span-1">
            Save link
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={useSessionHandle}
            className="min-w-0"
          >
            <UserRound className="size-4 shrink-0" />
            <span className="truncate">
              {sessionHandle ? `@${sessionHandle}` : "Use handle"}
            </span>
          </Button>
          <label className="contents">
            <input
              type="file"
              accept="*/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                void onFile(f);
                e.target.value = "";
              }}
            />
            <Button type="button" variant="outline" asChild disabled={uploading}>
              <span>
                <Upload className="size-4" />
                {uploading ? "Reading…" : "QR"}
              </span>
            </Button>
          </label>
          {money && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setMoney(null);
                setRaw("");
                toast.message("Unlinked");
              }}
            >
              <Trash2 className="size-4" />
              Clear
            </Button>
          )}
        </div>

        {sessionHandle && !money && (
          <p className="text-[11px] leading-relaxed text-subtle">
            Suggested{" "}
            <span className="font-mono text-muted">@{sessionHandle}</span>
            {displayName ? ` · ${displayName}` : ""}. Confirm real @username.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-2 rounded-lg border border-border bg-bg p-3 sm:p-4">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-subtle">
              <QrCode className="size-3" />
              Payload
            </div>
            {money ? (
              <>
                <p className="break-all font-mono text-xs text-fg sm:text-sm">
                  {money.transferUrl}
                </p>
                <p className="text-[10px] text-muted sm:text-xs">
                  {moneyStatusLabel(money.setupStatus)}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void onCopy()}
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </>
            ) : (
              <p className="font-mono text-xs text-muted">
                x.com/i/money/pay/&#123;handle&#125;
              </p>
            )}
          </div>

          <div className="mx-auto flex w-full max-w-[200px] flex-col items-center justify-center rounded-lg border border-border bg-surface p-3 sm:mx-0 sm:min-w-[160px]">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="X Money QR"
                className="h-36 w-36 rounded-md bg-fg sm:h-40 sm:w-40"
                width={160}
                height={160}
              />
            ) : (
              <div className="grid h-36 w-full place-items-center text-center text-[11px] text-subtle sm:h-40">
                QR after link
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
