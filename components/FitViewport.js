"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Locked routes have no scroll, so copy taller than the viewport — a short
// Android screen, a large system font — is simply cut off. Measure the copy
// column at full size and, when it overflows, zoom it down just enough to fit.
// `zoom` (not a transform) reflows, so the narrower text re-wraps into fewer
// lines. Below the floor the text stops shrinking and the page scrolls
// instead, so nothing is ever unreachable.
const MIN_FIT = 0.74;
const BOTTOM_GAP_PX = 12;

export default function FitViewport() {
  const pathname = usePathname();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    let frame = 0;

    const fit = () => {
      const column = document.querySelector(".page-shell .copy-column");
      if (!column) return;

      const limit =
        (window.visualViewport?.height ?? window.innerHeight) - BOTTOM_GAP_PX;
      const fitsAt = (scale) => {
        column.style.zoom = scale === 1 ? "" : String(scale);
        return column.getBoundingClientRect().bottom <= limit;
      };

      // Shrinking re-wraps lines, so height isn't linear in scale: search for
      // the largest scale that fits rather than dividing once.
      let overflows = false;
      if (!fitsAt(1)) {
        if (fitsAt(MIN_FIT)) {
          let lo = MIN_FIT;
          let hi = 1;
          for (let step = 0; step < 7; step += 1) {
            const mid = (lo + hi) / 2;
            if (fitsAt(mid)) lo = mid;
            else hi = mid;
          }
          fitsAt(lo);
        } else {
          overflows = true;
        }
      }

      html.classList.toggle("route-fit-overflow", overflows);
      body.classList.toggle("route-fit-overflow", overflows);
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };

    schedule();
    document.fonts?.ready.then(schedule);
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      html.classList.remove("route-fit-overflow");
      body.classList.remove("route-fit-overflow");
    };
  }, [pathname]);

  return null;
}
