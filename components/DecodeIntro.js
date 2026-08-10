"use client";

import { useEffect, useLayoutEffect } from "react";
import { decodeSweep } from "../lib/textDecode";

// SSR keeps the full text for no-JS visitors; on the client the blank
// pre-sweep state must land before first paint or navigations flash it.
const useClientLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

// Elements that persist across navigations (nav, horse) decode once per
// full page load; completion is tracked here so strict-mode double mounts
// (which cancel and restore the first run) still get their sweep.
const doneKeys = new Set();

export default function DecodeIntro({
  selector,
  exclude,
  once,
  doneEvent,
  finalEvent,
  finalUnless,
}) {
  useClientLayoutEffect(() => {
    if (once && doneKeys.has(once)) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }
    const roots = Array.from(document.querySelectorAll(selector));
    if (!roots.length) return undefined;
    return decodeSweep(roots, {
      exclude,
      onDone: () => {
        if (once) doneKeys.add(once);
        if (doneEvent) window.dispatchEvent(new Event(doneEvent));
        // If no later element (the narratives line) claims the final step
        // of the waterfall, this sweep was it.
        if (
          finalEvent &&
          (!finalUnless || !document.querySelector(finalUnless))
        ) {
          window.dispatchEvent(new Event(finalEvent));
        }
      },
    });
  }, [selector, exclude, once, doneEvent, finalEvent, finalUnless]);

  return null;
}
