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
// The cheetah in the bottom-right corner is never covered, and it gives way
// before the text does: when copy would run across its box, the cheetah is
// narrowed (down to a floor) until it clears the copy. Only when even the
// floor collides does the copy count as not fitting and shrink. When the page
// has to scroll, the cheetah docks at the end of the page (see
// .route-fit-overflow in the CSS) so the copy can never scroll underneath it.
const MIN_FIT = 0.74;
// The smallest the cheetah gets before the copy has to shrink instead.
const CHEETAH_FLOOR_PX = 150;
// Halvings of the cheetah's width range: lands within ~1% of the widest fit.
const CHEETAH_STEPS = 7;
const BOTTOM_GAP_PX = 12;
const CHEETAH_GAP_PX = 12;
const SOLID_SELECTOR = "img, svg, canvas, video, .commit-history-viewport";
// Lines whose text changes after the fit (the narratives line flips through
// titles). They count as painted out to their widest text, which they state
// in characters of their monospaced font as data-reserve-ch.
const RESERVED_SELECTOR = "[data-reserve-ch]";

// The narrowest cheetah any route has needed at each viewport size. Every
// route uses it, so the cheetah keeps one size across tabs instead of
// growing back on pages whose copy leaves it more room. Narrowing only moves
// its top-left corner in, so a width that cleared one page clears them all.
const WIDTH_STORE_KEY = "cheetah-fit-widths";
let sharedWidths = null;
function loadSharedWidths() {
  if (sharedWidths) return sharedWidths;
  try {
    sharedWidths = JSON.parse(window.sessionStorage.getItem(WIDTH_STORE_KEY)) || {};
  } catch {
    sharedWidths = {};
  }
  return sharedWidths;
}
function saveSharedWidths() {
  try {
    window.sessionStorage.setItem(WIDTH_STORE_KEY, JSON.stringify(sharedWidths));
  } catch {
    // Private mode or blocked storage: the in-memory copy still covers tabs.
  }
}

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

// Document-space boxes of what the copy actually paints near `area`: each
// line of text and each solid element. Block boxes are skipped, so a short
// line beside the cheetah does not count as touching it. Subtrees whose box
// misses `area` are skipped whole, so a fit walks only the paragraph or two
// that share space with the cheetah instead of every text node on the page.
function paintedRects(column, area) {
  const rects = [];
  const offsetY = window.scrollY;
  const toPage = (box) => ({
    left: box.left,
    right: box.right,
    top: box.top + offsetY,
    bottom: box.bottom + offsetY,
  });
  const range = document.createRange();
  const walker = document.createTreeWalker(
    column,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    {
      acceptNode(node) {
        if (node.nodeType !== Node.ELEMENT_NODE) return NodeFilter.FILTER_ACCEPT;
        return overlaps(toPage(node.getBoundingClientRect()), area)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    },
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
    } else if (node.matches(RESERVED_SELECTOR)) {
      // Its widest text, capped at its content box (dropping the right
      // padding: on phones that is the gap that already keeps the line clear
      // of the cheetah). A monospaced advance is 0.6em.
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const zoom = box.width / (node.offsetWidth || box.width);
      const widest =
        Number(node.dataset.reserveCh) * parseFloat(style.fontSize) * 0.6 * zoom;
      const right = Math.min(
        box.right - (parseFloat(style.paddingRight) || 0) * zoom,
        box.left + widest,
      );
      boxes = [
        {
          left: box.left,
          right,
          top: box.top,
          bottom: box.bottom,
          width: right - box.left,
          height: box.height,
        },
      ];
    } else {
      continue;
    }
    for (const box of boxes) {
      if (box.width && box.height) rects.push(toPage(box));
    }
  }
  return rects;
}

function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

// Bisecting [MIN_FIT, 1] for seven halvings lands within this of the
// largest scale that fits; every search below stops at the same precision.
const SCALE_STEP = (1 - MIN_FIT) / 128;

// Height the copy may fill. visualViewport.height shrinks while the visitor
// pinch-zooms; times its scale it is the unzoomed height, so a pinch never
// re-fits the copy.
function viewportHeight() {
  const vv = window.visualViewport;
  return vv ? vv.height * vv.scale : window.innerHeight;
}

export default function FitViewport() {
  const pathname = usePathname();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    let frame = 0;
    let disposed = false;
    // The inputs and outcome of the last fit. A resize that changes none of
    // the inputs (iOS fires plenty while its toolbars move) skips the fit,
    // and a fresh fit starts its search from the last scale.
    let lastKey = "";
    let lastScale = 1;
    let lastColumn = null;

    const fit = (force) => {
      const column = document.querySelector(".page-shell .copy-column");
      if (!column) return;

      const cheetah = document.querySelector(".gif-ascii-block");
      // Measure the cheetah at its full size; the fit below narrows it.
      const fittedWidth = cheetah?.style.getPropertyValue("--cheetah-fit-width");
      if (fittedWidth) cheetah.style.removeProperty("--cheetah-fit-width");
      const cheetahBox = cheetah ? cheetahRect(cheetah) : null;
      const limit = viewportHeight() - BOTTOM_GAP_PX;
      const overflowing = html.classList.contains("route-fit-overflow");
      const key = [
        html.clientWidth,
        window.innerHeight,
        limit,
        overflowing,
        cheetahBox
          ? [cheetahBox.left, cheetahBox.top, cheetahBox.right, cheetahBox.bottom].join()
          : "",
      ].join("|");
      if (column !== lastColumn) {
        lastColumn = column;
        lastScale = 1;
        force = true;
      }
      if (!force && key === lastKey) {
        if (fittedWidth) cheetah.style.setProperty("--cheetah-fit-width", fittedWidth);
        return;
      }
      lastKey = key;

      // Space the docked cheetah needs below the copy on a scrolling page:
      // its height plus its bottom offset and the gap.
      const dockSpace = cheetahBox
        ? `${window.innerHeight - cheetahBox.top}px`
        : "0px";
      if (html.style.getPropertyValue("--cheetah-dock-space") !== dockSpace) {
        html.style.setProperty("--cheetah-dock-space", dockSpace);
      }

      const applyScale = (scale) => {
        column.style.zoom = scale === 1 ? "" : String(scale);
      };
      const fullWidth = cheetah ? cheetah.offsetWidth : 0;
      const cheetahAt = (width) => {
        if (width >= fullWidth) {
          cheetah.style.removeProperty("--cheetah-fit-width");
        } else {
          cheetah.style.setProperty("--cheetah-fit-width", `${width}px`);
        }
        return cheetahRect(cheetah);
      };
      // The widest cheetah that clears the copy at the current scale, or 0
      // when even the floor collides. Narrowing it only moves its top-left
      // corner in, so the copy is measured once, against the full-size box.
      const cheetahWidthFor = () => {
        if (!cheetahBox) return fullWidth;
        const rects = paintedRects(column, cheetahBox);
        const clear = (box) => !rects.some((r) => overlaps(r, box));
        if (clear(cheetahBox)) return fullWidth;
        const floor = Math.min(fullWidth, CHEETAH_FLOOR_PX);
        if (!clear(cheetahAt(floor))) return 0;
        let lo = floor;
        let hi = fullWidth;
        for (let step = 0; step < CHEETAH_STEPS; step += 1) {
          const mid = Math.round((lo + hi) / 2);
          if (clear(cheetahAt(mid))) lo = mid;
          else hi = mid;
        }
        return lo;
      };
      const fitsAt = (scale) => {
        applyScale(scale);
        // The column's own box, so space a line reserves before its text
        // arrives still has to fit on screen.
        if (column.getBoundingClientRect().bottom + window.scrollY > limit) {
          return false;
        }
        return cheetahWidthFor() > 0;
      };
      // Shrinking re-wraps lines, so height isn't linear in scale: search for
      // the largest scale that fits rather than dividing once. `lo` fits and
      // `hi` does not.
      const bisect = (lo, hi) => {
        const steps = Math.ceil(Math.log2((hi - lo) / SCALE_STEP) - 1e-9);
        for (let step = 0; step < steps; step += 1) {
          const mid = (lo + hi) / 2;
          if (fitsAt(mid)) lo = mid;
          else hi = mid;
        }
        return lo;
      };
      // The largest scale that fits, or null when even MIN_FIT does not.
      const search = () => {
        const prev = lastScale;
        if (prev === null) {
          // Overflowed last time: one probe at the floor usually settles it.
          if (!fitsAt(MIN_FIT)) return null;
          return fitsAt(1) ? 1 : bisect(MIN_FIT, 1);
        }
        if (prev > MIN_FIT && prev < 1) {
          // A resize rarely moves the answer far: confirm the last scale and
          // the step above it before searching wider.
          if (fitsAt(prev)) {
            const up = Math.min(1, prev + SCALE_STEP);
            if (!fitsAt(up)) return prev;
            if (up === 1 || fitsAt(1)) return 1;
            return bisect(up, 1);
          }
          if (!fitsAt(MIN_FIT)) return null;
          return bisect(MIN_FIT, prev);
        }
        if (fitsAt(1)) return 1;
        if (!fitsAt(MIN_FIT)) return null;
        return bisect(MIN_FIT, 1);
      };

      const scale = search();
      // Below the floor the copy stays at the floor and the page scrolls,
      // with the cheetah docked after it at full size.
      applyScale(scale ?? MIN_FIT);
      if (cheetah) {
        if (scale === null) {
          cheetahAt(fullWidth);
        } else {
          const widths = loadSharedWidths();
          const sizeKey = `${html.clientWidth}x${window.innerHeight}`;
          const width = Math.min(cheetahWidthFor(), widths[sizeKey] ?? fullWidth);
          if (widths[sizeKey] !== width) {
            widths[sizeKey] = width;
            saveSharedWidths();
          }
          cheetahAt(width);
        }
      }
      lastScale = scale;
      const overflows = scale === null;
      if (overflows !== overflowing) {
        html.classList.toggle("route-fit-overflow", overflows);
        body.classList.toggle("route-fit-overflow", overflows);
      }
    };

    // `force` re-measures even when the viewport is unchanged: the fonts
    // changed metrics, or the route mounted new copy.
    let pendingForce = false;
    const schedule = (force) => {
      if (disposed) return;
      pendingForce = pendingForce || force;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const forced = pendingForce;
        pendingForce = false;
        fit(forced);
      });
    };
    const onResize = () => schedule(false);
    const remeasure = () => schedule(true);

    schedule(true);
    document.fonts?.ready.then(remeasure);
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    // The cheetah mounts and sizes itself after this effect first runs. Its
    // callbacks are rare and also land after the copy has settled its own
    // size (the narratives line reserves its height late), so they always
    // re-measure.
    const cheetahObserver = new ResizeObserver(remeasure);
    const cheetah = document.querySelector(".gif-ascii-block");
    if (cheetah) cheetahObserver.observe(cheetah);
    // The narratives line reserves its height after mount, which can push
    // the copy past the bottom; re-fit when the copy changes size. A fit
    // that lands on the same answer changes no size, so this settles.
    const column = document.querySelector(".page-shell .copy-column");
    if (column) cheetahObserver.observe(column);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cheetahObserver.disconnect();
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      html.classList.remove("route-fit-overflow");
      body.classList.remove("route-fit-overflow");
    };
  }, [pathname]);

  return null;
}
