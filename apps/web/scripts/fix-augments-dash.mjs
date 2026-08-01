import fs from "node:fs";

const path = "src/routes/augments.tsx";
let s = fs.readFileSync(path, "utf8").replace(/^\uFEFF/, "");

// remove legacy helper stubs
s = s.replace(
  /\/\*[\s\S]*?layout helpers[\s\S]*?void _legacyAugmentsBodyRemoved;\r?\n\r?\n/,
  "",
);

// MdxMapPanel signature + wrapper class
s = s.replace(
  /function MdxMapPanel\(\) \{\r?\n  const src = OPTX_LINKS\.moaDocs;\r?\n  return \(\r?\n    <div className="space-y-3">/,
  `function MdxMapPanel({ fill = false }: { fill?: boolean }) {
  const src = OPTX_LINKS.moaDocs;
  return (
    <div className={cn("flex flex-col gap-2", fill ? "h-full min-h-0" : "space-y-3")}>`,
);

s = s.replace(
  /className="h-\[min\(72vh,720px\)\] w-full border-0 bg-black"/,
  `className={cn("w-full border-0 bg-black", fill ? "h-full min-h-[50vh]" : "h-[min(72vh,720px)]")}`,
);

// ApiPluginTile compact prop
s = s.replace(
  /function ApiPluginTile\(\{\r?\n  plugin,\r?\n  busy,\r?\n  onDiscover,\r?\n\}: \{\r?\n  plugin: Web4ApiPlugin;\r?\n  busy: boolean;\r?\n  onDiscover: \(\) => void;\r?\n\}\)/,
  `function ApiPluginTile({
  plugin,
  busy,
  onDiscover,
  compact = false,
}: {
  plugin: Web4ApiPlugin;
  busy: boolean;
  onDiscover: () => void;
  compact?: boolean;
})`,
);

// outer tile className uses compact
s = s.replace(
  /function ApiPluginTile\([\s\S]*?return \(\r?\n    <div\r?\n      className="flex flex-col rounded-xl border border-border bg-bg\/70 p-3 transition hover:border-cyan-500\/35 hover:bg-elevated\/40"/,
  (m) =>
    m.replace(
      `className="flex flex-col rounded-xl border border-border bg-bg/70 p-3 transition hover:border-cyan-500/35 hover:bg-elevated/40"`,
      `className={cn(
        "flex flex-col rounded-xl border border-border bg-bg/70 transition hover:border-cyan-500/35 hover:bg-elevated/40",
        compact ? "p-2" : "p-3",
      )}`,
    ),
);

fs.writeFileSync(path, s);
console.log("fixed", path, "len", s.length);
