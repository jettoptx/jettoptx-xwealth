# Agents storefront → Wealth deeplink

**Target app:** `C:\Users\joshu\jettoptx-jtx-trade` (private dapp)  
**CTA URL:** https://wealth.astroknots.space  

## Suggested card

- Title: **X Wealth**  
- Body: JTX-gated dry-run · X Money QR/link · Augment-08  
- Button: Open Wealth → `https://wealth.astroknots.space`  
- Badge: dry-run · no Privy  

## Optional vercel.json redirect

```json
{
  "redirects": [
    {
      "source": "/agents/xwealth",
      "destination": "https://wealth.astroknots.space",
      "permanent": false
    }
  ]
}
```

## Note

Do not nest the full Vite wealth SPA under `/agents` (asset base breaks). Subdomain split is intentional (see xwealth-ui HANDOVER).
