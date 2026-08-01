import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Orbit, Settings2 } from "lucide-react";
import { OPTX_LINKS } from "@/lib/optx-links";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dojo")({
  component: DojoHubPage,
});

/**
 * DOJO hub — bridge to WARP node graph + prototype MDX docs.
 * Subtle MOA field background matches jtx.chat/dojo/moa family.
 * The interactive nodes graph lives at /warp (WealthMoaBuilder).
 */
function DojoHubPage() {
  return (
    <main className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col items-center justify-center overflow-hidden px-4 py-12 text-center">
      {/* Same brand plate + dotted field as WARP / jtx.chat MOA */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: "url('/jett-optx-bg-dark.jpg')" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.12) 0.55px, transparent 0.65px)",
          backgroundSize: "18px 18px",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 55% at 50% 42%, rgba(255,105,0,0.07) 0%, transparent 55%), radial-gradient(ellipse 80% 70% at 50% 50%, transparent 35%, var(--color-bg) 100%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex max-w-lg flex-col items-center gap-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-augment">
          DOJO · operator hub
        </p>
        <h1 className="font-display text-2xl font-semibold">Map of Augments</h1>
        <p className="text-sm text-muted">
          Wealth-08 runtime graph on{" "}
          <strong className="text-fg">WARP</strong> — the public X Money + JTX
          gate surface that onboards users into the Jett Optics ecosystem.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild size="lg">
            <Link
              to="/warp"
              search={{ market: undefined, vibe: undefined }}
              className="inline-flex items-center gap-2"
            >
              <Orbit className="size-4" />
              Open WARP graph
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <a
              href={OPTX_LINKS.dojoMoa}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2"
            >
              <BookOpen className="size-4" />
              MDX docs MOA
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link
              to="/augments"
              search={{ embed: undefined }}
              className="inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="size-3.5" />
              Augments
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link
              to={OPTX_LINKS.settingsPath}
              className="inline-flex items-center gap-1.5"
            >
              <Settings2 className="size-3.5" />
              Settings
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
