import { useMemo, useState } from "react";
import { Check, Copy, Plug, Unplug } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HARNESSES,
  buildEnvSnippet,
  buildHarnessSkill,
  type HarnessId,
} from "@/lib/harness";
import { HarnessMark, harnessMeta } from "@/components/harness-icons";
import { copyText } from "@/lib/utils";
import { useWealthStore } from "@/lib/store";

export function HarnessPanel() {
  const money = useWealthStore((s) => s.money);
  const harnesses = useWealthStore((s) => s.harnesses);
  const wireHarness = useWealthStore((s) => s.wireHarness);
  const customHarnessName = useWealthStore((s) => s.customHarnessName);
  const setCustomHarnessName = useWealthStore((s) => s.setCustomHarnessName);
  const [active, setActive] = useState<HarnessId>("grok-build");

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://example.com";

  const skill = useMemo(() => {
    if (!money) {
      return "# Link an X Money pay URL first to generate harness skills.";
    }
    return buildHarnessSkill({
      harness: active,
      handle: money.handle,
      payUrl: money.transferUrl,
      kind: money.kind,
      endpointBase: origin,
      customName: customHarnessName,
    });
  }, [active, money, origin, customHarnessName]);

  const env = useMemo(() => {
    if (!money) return "# Link X Money first";
    return buildEnvSnippet({
      handle: money.handle,
      payUrl: money.transferUrl,
      endpointBase: origin,
      customName: active === "custom" ? customHarnessName : undefined,
    });
  }, [money, origin, active, customHarnessName]);

  async function copy(text: string, label: string) {
    await copyText(text);
    toast.success(`${label} copied`);
  }

  const activeDef = HARNESSES.find((h) => h.id === active);
  const activeMeta = harnessMeta(active);
  const wiredCount = Object.values(harnesses).filter((h) => h.wired).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <HarnessMark id={active} size="sm" className="!size-7 rounded-lg" />
              Harnesses
            </CardTitle>
            <CardDescription className="mt-1">
              Icon = agent. Tap to copy skill / wire.
            </CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
            {wiredCount}/4
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Icon-first grid — equal cells, short labels */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {HARNESSES.map((h) => {
            const wired = harnesses[h.id]?.wired;
            const meta = harnessMeta(h.id);
            const selected = active === h.id;
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => setActive(h.id)}
                aria-pressed={selected}
                aria-label={`${meta.label} harness`}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border px-1.5 py-3 transition-colors sm:gap-2 sm:px-2 sm:py-4 ${
                  selected
                    ? h.id === "custom"
                      ? "border-augment/45 bg-augment/10 ring-1 ring-augment/25"
                      : "border-border-strong bg-elevated ring-1 ring-border"
                    : "border-border bg-bg hover:bg-elevated/50"
                }`}
              >
                <span className="relative">
                  <HarnessMark
                    id={h.id}
                    size="md"
                    className={
                      selected
                        ? h.id === "custom"
                          ? "border-augment/40 text-augment"
                          : "border-border-strong"
                        : ""
                    }
                  />
                  {wired && (
                    <span className="absolute -right-1 -top-1 size-2 rounded-full bg-accent ring-2 ring-surface" />
                  )}
                </span>
                <span className="font-display text-[11px] font-semibold leading-none sm:text-xs">
                  {meta.label}
                </span>
                <span className="hidden text-[10px] text-subtle sm:block">
                  {meta.sub}
                </span>
              </button>
            );
          })}
        </div>

        {active === "custom" && (
          <div className="space-y-2 rounded-xl border border-augment/30 bg-augment/7 p-3 sm:p-4">
            <Label htmlFor="custom-harness-name" className="text-augment">
              Custom name
            </Label>
            <Input
              id="custom-harness-name"
              value={customHarnessName}
              onChange={(e) => setCustomHarnessName(e.target.value)}
              placeholder="Cursor, OpenClaw, LangGraph…"
              maxLength={64}
            />
          </div>
        )}

        <Tabs defaultValue="skill">
          <TabsList className="w-full">
            <TabsTrigger value="skill" className="flex-1 gap-1.5">
              <HarnessMark id={active} size="sm" className="!size-5 !rounded-md border-0 bg-transparent p-0" />
              Skill
            </TabsTrigger>
            <TabsTrigger value="env" className="flex-1">
              Env
            </TabsTrigger>
          </TabsList>
          <TabsContent value="skill" className="space-y-2">
            <Textarea
              readOnly
              value={skill}
              className="min-h-[180px] font-mono text-[11px] sm:min-h-[220px] sm:text-xs"
            />
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Button
                type="button"
                size="sm"
                onClick={() => void copy(skill, "Skill")}
                disabled={!money}
              >
                <Copy className="size-4" />
                Copy
              </Button>
              <Button
                type="button"
                size="sm"
                variant={harnesses[active]?.wired ? "secondary" : "accent"}
                disabled={!money}
                onClick={() => {
                  const next = !harnesses[active]?.wired;
                  wireHarness(active, next);
                  const label =
                    active === "custom"
                      ? customHarnessName.trim() || "Custom"
                      : activeMeta.label;
                  toast.success(next ? `${label} wired` : "Unwired");
                }}
              >
                {harnesses[active]?.wired ? (
                  <>
                    <Unplug className="size-4" />
                    Unwire
                  </>
                ) : (
                  <>
                    <Plug className="size-4" />
                    Wire
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="env" className="space-y-2">
            <Textarea
              readOnly
              value={env}
              className="min-h-[140px] font-mono text-[11px] sm:text-xs"
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!money}
              onClick={() => void copy(env, "Env")}
              className="w-full sm:w-auto"
            >
              <Copy className="size-4" />
              Copy env
            </Button>
          </TabsContent>
        </Tabs>

        {money && harnesses[active]?.wired && (
          <div className="flex items-start gap-2 rounded-lg border border-accent/25 bg-accent/5 px-3 py-2 text-[11px] text-muted sm:text-xs">
            <Check className="mt-0.5 size-3.5 shrink-0 text-accent" />
            <span className="min-w-0 break-all">
              {activeMeta.label} ready · @{money.handle} ·{" "}
              <span className="font-mono text-fg">/api/x402/pay</span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
