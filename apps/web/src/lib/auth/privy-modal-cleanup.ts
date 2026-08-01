/**
 * Privy renders every OAuth row as:
 *   Continue with Google
 *   Jett Optics · Google   ← redundant (app name × N methods)
 *
 * and a section header "From Jett Optics Privy app".
 * Dashboard app name is "Jett Optics" — we hide the spam, keep one brand on the page.
 */

const APP_SUBTITLE = /Jett Optics\s*[·•\-–—]\s*/i;
const FROM_PRIVY_APP = /^From\s+.+\s+Privy app$/i;

function hideNode(el: Element) {
  if (el instanceof HTMLElement) {
    el.style.setProperty("display", "none", "important");
    el.setAttribute("data-optx-hidden-privy-brand", "1");
  }
}

/** Walk Privy portal roots and hide redundant app-name lines. */
export function scrubPrivyModalBranding(root: ParentNode = document) {
  const candidates = root.querySelectorAll(
    "#privy-dialog, #privy-modal-content, [id*='privy-modal'], [class*='privy']",
  );
  const roots: ParentNode[] =
    candidates.length > 0 ? Array.from(candidates) : [root];

  for (const scope of roots) {
    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = (node.textContent || "").trim();
        if (!text) return;
        if (APP_SUBTITLE.test(text) || FROM_PRIVY_APP.test(text)) {
          const parent = node.parentElement;
          if (!parent) return;
          // Only hide leaf-ish labels (not whole buttons)
          if (parent.childElementCount === 0 || parent.children.length <= 1) {
            hideNode(parent);
          } else {
            // Parent has structure — hide just a wrapping span if possible
            hideNode(parent);
          }
        }
        return;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        // Skip already cleaned
        if (el.getAttribute("data-optx-hidden-privy-brand") === "1") return;
        for (const child of Array.from(el.childNodes)) walk(child);
      }
    };
    walk(scope as unknown as Node);
  }
}

/** Start observing DOM for Privy modal mounts. Returns dispose. */
export function watchPrivyModalBranding(): () => void {
  if (typeof document === "undefined") return () => {};

  let scheduled = false;
  const run = () => {
    scheduled = false;
    try {
      scrubPrivyModalBranding(document.body);
    } catch {
      /* ignore */
    }
  };
  const kick = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(run);
  };

  kick();
  const obs = new MutationObserver(kick);
  obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  return () => obs.disconnect();
}
