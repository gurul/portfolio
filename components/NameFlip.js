"use client";

import { useEffect, useRef, useState } from "react";
import { prepare, layout } from "@chenglou/pretext";
import { WATERFALL_DONE_EVENT, splitGraphemes } from "../lib/textDecode";

// The name, and what it means — the same phosphor flip as the narratives
// line, applied to the first thing the page says.
const NAME = "Sri Surya Gurucharan Lingamallu";
const MEANING = "The auspicious, radiant one who walks at the feet of wisdom";
const VARIANTS = [NAME, MEANING];

const NOISE = "#%&/\\<>[]{}=+*?!;:^~·01$";
// Matches the narratives flip exactly, so both clicks feel like one gesture.
const SWEEP_MS = 720;
const GLOW_TRAIL = 6;
const NOISE_WINDOW = 7;
// The flip stays locked until the entrance waterfall has finished, because
// that sweep owns this paragraph's text nodes while it runs. If the waterfall
// never reports in, the lock lifts on its own this long after mount.
const READY_FALLBACK_MS = 12000;

// The whole sentence, used only to reserve the tallest wrap up front.
function sentence(variant) {
  return `My name is ${variant}, or Guru (గురు) for short.`;
}

function renderName(segments) {
  return (
    <>
      {segments.settled}
      {segments.glow ? (
        <span className="decode-glow">{segments.glow}</span>
      ) : null}
      {segments.noise ? (
        <span className="decode-noise">{segments.noise}</span>
      ) : null}
      {segments.old ? (
        <span className="name-flip__old">{segments.old}</span>
      ) : null}
    </>
  );
}

export default function NameFlip() {
  const paragraphRef = useRef(null);
  const machineRef = useRef({ idx: 0, busy: false, raf: 0 });
  const [activeIdx, setActiveIdx] = useState(0);
  const [ready, setReady] = useState(false);
  const [minHeight, setMinHeight] = useState(0);
  const [segments, setSegments] = useState(() => ({
    settled: NAME,
    glow: "",
    noise: "",
    old: "",
  }));

  // Pretext measures the sentence with each variant in place at the current
  // width, so the paragraph reserves the taller wrap and the flip never
  // shoves the rest of the page around.
  useEffect(() => {
    const el = paragraphRef.current;
    if (!el) return undefined;
    let cancelled = false;

    const measure = () => {
      const width = Math.floor(el.clientWidth);
      if (width <= 0) return;
      const style = getComputedStyle(el);
      const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const letterSpacing = parseFloat(style.letterSpacing) || 0;
      const lineHeight =
        parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.35;
      let max = 0;
      for (const variant of VARIANTS) {
        // The copy column renders lowercase, so measure what is painted.
        const prepared = prepare(sentence(variant).toLowerCase(), font, {
          letterSpacing,
        });
        const { height } = layout(prepared, width, lineHeight);
        if (height > max) max = height;
      }
      if (!cancelled) {
        setMinHeight((prev) => (prev === max ? prev : max));
      }
    };

    measure();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) measure();
      });
    }
    const observer = new ResizeObserver(() => measure());
    observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  // The page waterfall replaces this paragraph's text nodes while it sweeps;
  // a React re-render in the middle of that would paint into detached nodes.
  // Reduced motion skips the waterfall entirely, so the flip is live at once.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReady(true);
      return undefined;
    }
    const unlock = () => setReady(true);
    window.addEventListener(WATERFALL_DONE_EVENT, unlock);
    const timer = window.setTimeout(unlock, READY_FALLBACK_MS);
    return () => {
      window.removeEventListener(WATERFALL_DONE_EVENT, unlock);
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const machine = machineRef.current;
    return () => {
      machine.busy = false;
      cancelAnimationFrame(machine.raf);
    };
  }, []);

  // Phosphor decode: a head sweeps left to right, chewing the old characters
  // through terminal noise and locking the new ones in behind a short glow.
  const runSweep = (oldChars, newChars, durationMs) => {
    const machine = machineRef.current;
    machine.busy = true;
    const total = Math.max(oldChars.length, newChars.length);
    const began = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - began) / durationMs);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const head = Math.round(eased * total);
      const glowLen = Math.min(GLOW_TRAIL, total - head);
      const windowEnd = Math.min(head + NOISE_WINDOW, total);
      let noise = "";
      for (let i = head; i < windowEnd; i += 1) {
        const target = i < newChars.length ? newChars[i] : " ";
        noise +=
          target === " " ? " " : NOISE[(Math.random() * NOISE.length) | 0];
      }
      setSegments({
        settled: newChars.slice(0, Math.max(0, head - glowLen)).join(""),
        glow: newChars.slice(Math.max(0, head - glowLen), head).join(""),
        noise,
        old: oldChars.slice(windowEnd).join(""),
      });
      if (t < 1) {
        machine.raf = requestAnimationFrame(step);
      } else {
        machine.busy = false;
        setSegments({ settled: newChars.join(""), glow: "", noise: "", old: "" });
      }
    };
    machine.raf = requestAnimationFrame(step);
  };

  const flip = () => {
    const machine = machineRef.current;
    if (!ready || machine.busy) return;
    const oldChars = splitGraphemes(VARIANTS[machine.idx]);
    machine.idx = (machine.idx + 1) % VARIANTS.length;
    setActiveIdx(machine.idx);
    const newChars = splitGraphemes(VARIANTS[machine.idx]);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSegments({ settled: newChars.join(""), glow: "", noise: "", old: "" });
      return;
    }
    runSweep(oldChars, newChars, SWEEP_MS);
  };

  return (
    <p
      ref={paragraphRef}
      style={minHeight ? { minHeight: `${minHeight}px` } : undefined}
    >
      My name is{" "}
      <button
        type="button"
        className="name-flip"
        onClick={flip}
        aria-label={`${VARIANTS[activeIdx]} — tap to flip between my name and what it means`}
      >
        <span aria-hidden="true">{renderName(segments)}</span>
      </button>
      ,{" "}
      <span className="inline-nowrap">
        or{" "}
        <a
          className="name-link"
          href="https://www.instagram.com/gurulingamallu/"
          target="_blank"
          rel="noreferrer"
        >
          Guru
        </a>{" "}
        (గురు) for short.
      </span>
    </p>
  );
}
