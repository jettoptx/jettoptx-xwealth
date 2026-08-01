import fs from "node:fs";

const path = "src/routes/augments.tsx";
let s = fs.readFileSync(path, "utf8");

s = s.replace(
  /import \{ Panel, PanelGroup, PanelResizeHandle \} from "react-resizable-panels";/,
  'import { Group, Panel, Separator } from "react-resizable-panels";',
);
s = s.replace(/PanelGroup/g, "Group");
s = s.replace(/PanelResizeHandle/g, "Separator");
s = s.replace(/direction="horizontal"/g, 'orientation="horizontal"');
s = s.replace(/direction="vertical"/g, 'orientation="vertical"');
s = s.replace(/\s*autoSaveId="[^"]*"/g, "");

fs.writeFileSync(path, s);
console.log("panels api updated");
