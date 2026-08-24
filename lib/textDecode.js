// Shared phosphor-decode sweep for arbitrary DOM text. Text nodes are
// swapped for a four-part span (settled / glow / noise / hidden-rest) so the
// unrevealed tail still reserves its exact layout. Nodes are grouped into
// blocks (paragraphs, headings, …) that decode top-to-bottom as a waterfall:
// each block sweeps at the narratives-flip pace and the next one starts as
// the previous nears completion. Originals are restored at the end — React
// never sees the intermediate DOM.
import { whenIntroReady } from "./introReady";

const NOISE = "#%&/\\<>[]{}=+*?!;:^~·01$";
const BLOCK_SELECTOR =
  "p, h1, h2, h3, h4, h5, h6, li, blockquote, figcaption, section";

// Matches the .page-shell / .site-nav entrance fade delay.
export const DECODE_DELAY_MS = 200;
// The click-to-flip narratives sweep (720ms over ~24 characters) is the
// reference pace everything else matches.
export const PER_CHAR_MS = 30;
// Fired on window when the page sweep finishes, so the narratives line can
// take the next step of the waterfall.
export const PAGE_DECODE_DONE_EVENT = "page-decode-done";
// Fired when the whole text waterfall has finished (narratives included,
// when present).
export const WATERFALL_DONE_EVENT = "decode-waterfall-done";
// Fired WATERFALL_LEAD_MS before the waterfall finishes, so the horse — whose
// own entrance takes exactly that long — can start early and land on the same
// beat as the last character of text.
export const WATERFALL_LEAD_EVENT = "decode-waterfall-lead";
export const WATERFALL_LEAD_MS = 1350;

// The done event is a one-shot, and on a revisit it is dispatched from a
// layout effect — before any component's passive effect has had a chance to
// subscribe. So the state is latched here as well: this listener is attached
// at import time, long before any effect runs, and so can never miss the
// event. A component mounting into an already-settled page reads the latch
// instead of waiting for a dispatch that has already been and gone.
let waterfallSettled = false;

if (typeof window !== "undefined") {
  window.addEventListener(WATERFALL_DONE_EVENT, () => {
    waterfallSettled = true;
  });
}

// True when no sweep currently owns the page's text nodes.
export function isWaterfallSettled() {
  return waterfallSettled;
}

const BLOCK_MIN_MS = 420;
const BLOCK_MAX_MS = 1100;
// The next block starts when the previous one is this far through.
const BLOCK_OVERLAP = 0.6;

export function splitGraphemes(text) {
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    return Array.from(
      new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text),
      (part) => part.segment
    );
  }
  return Array.from(text);
}

function isWhitespace(ch) {
  return ch === " " || ch === "\n" || ch === "\t";
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function clampMs(value) {
  return Math.max(BLOCK_MIN_MS, Math.min(BLOCK_MAX_MS, value));
}

// Inline style beats stray descendant selectors (e.g. the commit-history
// spans are display:block) so the injected spans never break layout.
function inlineSpan(className) {
  const el = document.createElement("span");
  el.style.display = "inline";
  if (className) el.className = className;
  return el;
}

export function decodeSweep(
  roots,
  { exclude, delayMs = DECODE_DELAY_MS, onDone, onLead, reveal } = {}
) {
  const records = [];
  for (const root of roots) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (exclude && parent.closest(exclude)) {
          return NodeFilter.FILTER_REJECT;
        }
        // Skip text hidden by display:none (e.g. whichever nav variant the
        // current viewport hides) so it doesn't hold a slot in the cascade.
        if (parent.getClientRects().length === 0) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let node;
    while ((node = walker.nextNode())) {
      records.push({ node, chars: splitGraphemes(node.nodeValue) });
    }
  }
  if (!records.length) return () => {};

  // A sweep is about to claim these text nodes, so the page is unsettled
  // again until it reports done. This runs from a layout effect, ahead of the
  // passive effects that read the latch.
  waterfallSettled = false;

  // Group document-ordered records into visual blocks for the waterfall.
  const blocks = [];
  const byElement = new Map();
  for (const rec of records) {
    const el =
      rec.node.parentElement.closest(BLOCK_SELECTOR) || rec.node.parentElement;
    let block = byElement.get(el);
    if (!block) {
      block = { records: [], total: 0, done: false };
      byElement.set(el, block);
      blocks.push(block);
    }
    rec.blockStart = block.total;
    block.records.push(rec);
    block.total += rec.chars.length;
  }

  let clock = 0;
  let timelineEnd = 0;
  for (const block of blocks) {
    block.duration = clampMs(block.total * PER_CHAR_MS);
    block.startAt = clock;
    block.glow = Math.max(6, Math.round(block.total * 0.08));
    block.noise = Math.max(7, Math.round(block.total * 0.12));
    timelineEnd = Math.max(timelineEnd, clock + block.duration);
    clock += block.duration * BLOCK_OVERLAP;
  }

  // Non-text visuals (e.g. the github contribution chart) hold blank and
  // fade in when the waterfall reaches their spot: the start of the first
  // text block at or below them in document order.
  const reveals = [];
  if (reveal) {
    for (const root of roots) {
      for (const el of root.querySelectorAll(reveal)) {
        if (exclude && el.closest(exclude)) continue;
        let at = timelineEnd;
        for (const [blockEl, block] of byElement) {
          const pos = el.compareDocumentPosition(blockEl);
          if (
            pos &
            (Node.DOCUMENT_POSITION_FOLLOWING |
              Node.DOCUMENT_POSITION_CONTAINED_BY)
          ) {
            at = block.startAt;
            break;
          }
        }
        reveals.push({
          el,
          at,
          done: false,
          prevOpacity: el.style.opacity,
          prevTransition: el.style.transition,
        });
        el.style.opacity = "0";
      }
    }
  }

  for (const rec of records) {
    rec.settledEl = inlineSpan();
    rec.glowEl = inlineSpan("decode-glow");
    rec.noiseEl = inlineSpan("decode-noise");
    rec.hiddenEl = inlineSpan();
    rec.hiddenEl.style.visibility = "hidden";
    rec.hiddenEl.textContent = rec.chars.join("");
    rec.wrapper = inlineSpan();
    rec.wrapper.append(rec.settledEl, rec.glowEl, rec.noiseEl, rec.hiddenEl);
    rec.node.replaceWith(rec.wrapper);
  }

  const paintBlock = (block, head) => {
    const settledUpTo = Math.max(0, head - block.glow);
    const windowEnd = Math.min(block.total, head + block.noise);
    for (const rec of block.records) {
      const start = rec.blockStart;
      const len = rec.chars.length;
      if (settledUpTo >= start + len) {
        rec.settledEl.textContent = rec.chars.join("");
        rec.glowEl.textContent = "";
        rec.noiseEl.textContent = "";
        rec.hiddenEl.textContent = "";
        continue;
      }
      if (windowEnd <= start) continue;
      const s = Math.max(0, Math.min(len, settledUpTo - start));
      const g = Math.max(s, Math.min(len, head - start));
      const n = Math.max(g, Math.min(len, windowEnd - start));
      rec.settledEl.textContent = rec.chars.slice(0, s).join("");
      rec.glowEl.textContent = rec.chars.slice(s, g).join("");
      let noise = "";
      for (let i = g; i < n; i += 1) {
        const target = rec.chars[i];
        noise += isWhitespace(target)
          ? target
          : NOISE[(Math.random() * NOISE.length) | 0];
      }
      rec.noiseEl.textContent = noise;
      rec.hiddenEl.textContent = rec.chars.slice(n).join("");
    }
  };

  const restore = () => {
    for (const rec of records) {
      if (rec.wrapper.isConnected) rec.wrapper.replaceWith(rec.node);
    }
    for (const r of reveals) {
      r.el.style.opacity = r.prevOpacity;
      r.el.style.transition = r.prevTransition;
    }
  };

  let raf = 0;
  let timer = 0;
  let cancelled = false;
  let finished = false;

  const run = () => {
    const began = performance.now();
    // Announce the finish a lead-time ahead, so a listener with its own
    // entrance to play can land on the same beat as the last character.
    const leadAt = Math.max(0, timelineEnd - WATERFALL_LEAD_MS);
    let led = false;
    const step = (now) => {
      if (cancelled) return;
      const elapsed = now - began;
      if (!led && elapsed >= leadAt) {
        led = true;
        if (onLead) onLead();
      }
      for (const r of reveals) {
        if (!r.done && elapsed >= r.at) {
          r.el.style.transition = "opacity 0.6s ease";
          r.el.style.opacity = "1";
          r.done = true;
        }
      }
      for (const block of blocks) {
        if (block.done) continue;
        const t = Math.min(1, (elapsed - block.startAt) / block.duration);
        if (t <= 0) continue;
        // The head overshoots by the glow trail so the final characters
        // cool to body text before the block settles.
        paintBlock(block, Math.round(easeInOut(t) * (block.total + block.glow)));
        if (t >= 1) block.done = true;
      }
      if (elapsed < timelineEnd) {
        raf = requestAnimationFrame(step);
      } else {
        finished = true;
        restore();
        if (onDone) onDone();
      }
    };
    raf = requestAnimationFrame(step);
  };

  whenIntroReady().then(() => {
    if (cancelled) return;
    timer = window.setTimeout(() => {
      if (!cancelled) run();
    }, delayMs);
  });

  return () => {
    if (cancelled || finished) return;
    cancelled = true;
    window.clearTimeout(timer);
    cancelAnimationFrame(raf);
    restore();
  };
}
