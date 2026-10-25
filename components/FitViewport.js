"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Locked routes have no scroll, so copy taller than the viewport — a short
// Android screen, a large system font — is simply cut off. Measure the copy
// column at full size and, when it overflows, zoom it down just enough to fit.
// `zoom` (not a transform) reflows, so the narrower text re-wraps into fewer
// lines. Below the floor the text stops shrinking and the page scrolls
// instead, so nothing is ever unreachable.
//
// The cheetah in the bottom-right corner is never covered: copy that would
// run across its box counts as not fitting. When the page has to scroll, the
// cheetah docks at the end of the page (see .route-fit-overflow in the CSS)
// so the copy can never scroll underneath it.
const MIN_FIT = 0.74;
const BOTTOM_GAP_PX = 12;
const CHEETAH_GAP_PX = 12;
const SOLID_SELECTOR = "img, svg, canvas, video, .commit-history-viewport";

// Where the cheetah sits while fixed to the viewport, worked out from its
// computed offsets so the answer holds even while it is docked.
function cheetahRect(cheetah) {
  const style = getComputedStyle(cheetah);
  const width = cheetah.offsetWidth;
  const height = cheetah.offsetHeight;
  if (!width || !height) return null;
  const right = document.documentElement.clientWidth - parseFloat(style.right);
  const bottom = window.innerHeight - parseFloat(style.bottom);
  return {
    left: right - width - CHEETAH_GAP_PX,
    top: bottom - height - CHEETAH_GAP_PX,
    right,
    bottom,
  };
}

// Document-space boxes of what the copy actually paints: each line of text
// and each solid element. Block boxes are skipped, so a short line beside
// the cheetah does not count as touching it.
function contentRects(column) {
  const rects = [];
  const offsetY = window.scrollY;
  const range = document.createRange();
  const walker = document.createTreeWalker(
    column,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
  );
  let node;
  while ((node = walker.nextNode())) {
    let boxes;
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.nodeValue.trim()) continue;
      range.selectNodeContents(node);
      boxes = range.getClientRects();
    } else if (node.matches(SOLID_SELECTOR)) {
      boxes = node.getClientRects();
    } else {
      continue;
    }
    for (const box of boxes) {
      if (box.width && box.height) {
        rects.push({
          left: box.left,
          right: box.right,
          top: box.top + offsetY,
          bottom: box.bottom + offsetY,
        });
      }
    }
  }
  return rects;
}

function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export default function FitViewport() {
  const pathname = usePathname();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    let frame = 0;

    const fit = () => {
      const column = document.querySelector(".page-shell .copy-column");
      if (!column) return;

      const cheetah = document.querySelector(".gif-ascii-block");
      const cheetahBox = cheetah ? cheetahRect(cheetah) : null;
      // Space the docked cheetah needs below the copy on a scrolling page:
      // its height plus its bottom offset and the gap.
      html.style.setProperty(
        "--cheetah-dock-space",
        cheetahBox ? `${window.innerHeight - cheetahBox.top}px` : "0px",
      );
      const limit =
        (window.visualViewport?.height ?? window.innerHeight) - BOTTOM_GAP_PX;
      const fitsAt = (scale) => {
        column.style.zoom = scale === 1 ? "" : String(scale);
        const rects = contentRects(column);
        const bottom = rects.reduce((max, r) => Math.max(max, r.bottom), 0);
        if (bottom > limit) return false;
        return !cheetahBox || !rects.some((r) => overlaps(r, cheetahBox));
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
    // The cheetah mounts and sizes itself after this effect first runs.
    const cheetahObserver = new ResizeObserver(schedule);
    const cheetah = document.querySelector(".gif-ascii-block");
    if (cheetah) cheetahObserver.observe(cheetah);

    return () => {
      cancelAnimationFrame(frame);
      cheetahObserver.disconnect();
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      html.classList.remove("route-fit-overflow");
      body.classList.remove("route-fit-overflow");
    };
  }, [pathname]);

  return null;
}
