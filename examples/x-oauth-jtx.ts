/**
 * Example: X Wealth auth without Privy
 *
 * - Identity: Jett Optical Encryption X OAuth app (32724640)
 * - Gate: Solana wallet holds ≥ 1 JTX v2
 *
 * Client ID is public. Client secret stays server-side only
 * (Hermes / AARON / never ship to browser bundles).
 */

import {
  XWealthPlugin,
  JETT_OPTICS_X_CLIENT_ID,
  checkJtxGate,
} from "../src/index.js";

async function main() {
  const wallet =
    process.env.SOLANA_WALLET || process.env.XWEALTH_WALLET || "";

  if (!wallet) {
    console.error("Set SOLANA_WALLET=<pubkey>");
    process.exit(2);
  }

  const plugin = new XWealthPlugin({
    xOauthClientId: JETT_OPTICS_X_CLIENT_ID,
    // rpcUrl: process.env.SOLANA_RPC_URL,
  });

  // Optional: attach X identity after user OAuth (console Generate or PKCE)
  if (process.env.X_USER_HANDLE) {
    plugin.setXSession({
      xHandle: process.env.X_USER_HANDLE,
      xUserId: process.env.X_USER_ID,
      hasRefreshToken: Boolean(process.env.X_BOOKMARKS_REFRESH_TOKEN),
    });
  }

  plugin.setWallet(wallet, "env");
  const state = await plugin.assertReady();
  console.log(JSON.stringify(state, null, 2));

  // Direct gate helper
  const gate = await checkJtxGate(wallet);
  console.log("gate", gate);

  if (!state.ready) process.exit(1);

  const node = plugin.createPayoutNode({
    recipientHandle: "JoshuaJett",
    amount: 1,
    currency: "USD",
  });
  console.log(await node.execute());
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
