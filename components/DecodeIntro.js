"use client";

import { useEffect, useLayoutEffect } from "react";
import { decodeSweep } from "../lib/textDecode";

// SSR keeps the full text for no-JS visitors; on the client the blank
// pre-sweep state must land before first paint or navigations flash it.
const useClientLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

// Completed sweeps are tracked in module state, which lives exactly one
// browser visit: it survives client-side navigations but resets on a full
// load, so every animation cycles again on refresh. `once` keys persistent
// elements (nav, cheetah) to once per load; `perPath` scopes the key to the
// current pathname so each page decodes only on its first visit. The set
// also keeps strict-mode double mounts (which cancel and restore the first
// run) from losing their sweep.
const doneKeys = new Set();

export default function DecodeIntro({
  selector,
  exclude,
  reveal,
  once,
  perPath,
  doneEvent,
  finalEvent,
  finalLeadEvent,
  finalUnless,
}) {
  useClientLayoutEffect(() => {
    const key = once
      ? perPath
        ? `${once}:${window.location.pathname}`
        : once
      : null;
    // True when no later element (the narratives line) claims the final step
    // of the waterfall — this sweep is then the one that closes it.
    const isFinalSweep = () =>
      !finalUnless || !document.querySelector(finalUnless);
    const dispatchDone = () => {
      if (doneEvent) window.dispatchEvent(new Event(doneEvent));
      if (finalEvent && isFinalSweep()) {
        window.dispatchEvent(new Event(finalEvent));
      }
    };
    // Only the closing sweep gets to announce the lead — otherwise the
    // narratives line still has its own sweep left to run.
    const dispatchLead = () => {
      if (finalLeadEvent && isFinalSweep()) {
        window.dispatchEvent(new Event(finalLeadEvent));
      }
    };
    if (key && doneKeys.has(key)) {
      // Already decoded this visit: skip the sweep but still report done
      // (deferred past mount) so waterfall listeners settle instantly
      // instead of waiting out their fallback timers.
      const timer = window.setTimeout(dispatchDone, 0);
      return () => window.clearTimeout(timer);
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }
    const roots = Array.from(document.querySelectorAll(selector));
    if (!roots.length) return undefined;
    return decodeSweep(roots, {
      exclude,
      reveal,
      onLead: dispatchLead,
      onDone: () => {
        if (key) doneKeys.add(key);
        dispatchDone();
      },
    });
  }, [
    selector,
    exclude,
    reveal,
    once,
    perPath,
    doneEvent,
    finalEvent,
    finalLeadEvent,
    finalUnless,
  ]);

  return null;
}
