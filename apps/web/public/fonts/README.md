# Fonts — Neue Haas Unica

xwealth.space body + display type uses **Neue Haas Unica** (Monotype), self-hosted.

## Required files

Place licensed web cuts here (woff2):

| File | Weight |
|------|--------|
| `NeueHaasUnica-Regular.woff2` | 400 |
| `NeueHaasUnica-Medium.woff2` | 500 (+ mapped for 600/700/800 UI classes) |

Optional later: Italic / Bold if you license more cuts — then update `@font-face` in `src/styles.css`.

## License

Do **not** commit unlicensed font binaries. Obtain a web license (MyFonts / Monotype / Adobe Fonts export), then drop the woff2 files into this folder and redeploy.

Until files are present, CSS falls back to **Arial / Helvetica Neue** via the metric-matched `Neue Haas Unica Fallback` face.

## Mono

`Space Mono` remains for code / mono UI (Google Fonts).
