#!/usr/bin/env node
/**
 * Pointer: run Hermes wealth-bookmark-digest from this repo.
 * No secrets. No LIVE money.
 *
 * Resolves:
 *   %HERMES_HOME%/custom-skills/wealth-bookmark-digest/scripts/digest.py
 * Falls back to LOCALAPPDATA/hermes on Windows.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function hermesHome() {
  if (process.env.HERMES_HOME) return process.env.HERMES_HOME;
  if (process.env.LOCALAPPDATA) return path.join(process.env.LOCALAPPDATA, "hermes");
  return path.join(os.homedir(), ".hermes");
}

const script = path.join(
  hermesHome(),
  "custom-skills",
  "wealth-bookmark-digest",
  "scripts",
  "digest.py"
);

if (!fs.existsSync(script)) {
  console.error("ERROR: digest.py not found at", script);
  console.error("Install skill at HERMES custom-skills/wealth-bookmark-digest");
  console.error("See docs/AUGMENT08-QUANT-STACK.md");
  process.exit(2);
}

const pyCandidates = ["python", "python3", "py"];
let py = process.env.PYTHON || null;
if (!py) {
  for (const c of pyCandidates) {
    const probe = spawnSync(c, ["--version"], { encoding: "utf8" });
    if (probe.status === 0) {
      py = c;
      break;
    }
  }
}
if (!py) {
  console.error("ERROR: no python on PATH");
  process.exit(2);
}

const extra = process.argv.slice(2);
const r = spawnSync(py, [script, ...extra], { stdio: "inherit" });
process.exit(r.status ?? 1);
