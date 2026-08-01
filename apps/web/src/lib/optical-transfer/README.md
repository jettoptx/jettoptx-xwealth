# JOE optical transfer (Decimen-compatible)

Fountain-coded animated QR transport for Mojo ↔ web.

## Wire format

Every QR frame is **byte-mode** binary:

| offset | type | field |
|--------|------|--------|
| 0 | u8 | magic `0xD1` |
| 1 | u8 | magic `0x0C` |
| 2 | u16 LE | `sessionId` |
| 4 | u32 LE | `seq` (fountain PRNG) |
| 8 | u16 LE | `k` source blocks |
| 10 | u16 LE | `blockLen` |
| 12 | u32 LE | `totalLen` |
| 16 | u32 LE | `payloadFnv` (FNV-1a) |
| 20… | bytes | XOR fountain block |

Assembled payload = UTF-8 JSON `OpticalEnvelope` (`v:1`, `kind: login|sign_tx|raw`).

## Defaults

- ~24 fps, ECC **L**, mask **4**, frame bytes **1465** (QR v27) or **2953** (v40)
- Canvas: `imageSmoothingEnabled = false`
- Progress = frames collected / (K · 1.18), not blocks solved

## Compatibility

Bit-identical to [decimen-optical-transfer](https://github.com/bashalarmistalt/decimen-optical-transfer) `shared/protocol.ts` + `shared/fountain.ts`.
Static `jettmojo://auth|sign` single-frame QRs remain the fallback for small challenges.
