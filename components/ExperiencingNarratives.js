"use client";

import { useEffect, useRef, useState } from "react";
import { prepare, layout } from "@chenglou/pretext";

const PREFIX = "narratives experienced: ";
const NOISE = "#%&/\\<>[]{}=+*?!;:^~·01$";
const SWEEP_MS = 720;
const GLOW_TRAIL = 6;
const NOISE_WINDOW = 7;

function variableText(entry) {
  return `${entry.title} — ${entry.author}`;
}

function splitGraphemes(text) {
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    return Array.from(
      new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text),
      (part) => part.segment
    );
  }
  return Array.from(text);
}

export default function ExperiencingNarratives({ entries }) {
  const linesRef = useRef(null);
  const machineRef = useRef({ idx: 0, busy: false, raf: 0 });
  const [activeIdx, setActiveIdx] = useState(0);
  const [maxHeight, setMaxHeight] = useState(0);
  const [segments, setSegments] = useState(() => ({
    settled: variableText(entries[0]),
    glow: "",
    noise: "",
    old: "",
  }));

  // Pretext measures every entry at the current width so the block reserves
  // the tallest wrap up front — the decode sweep never shifts layout below it.
  useEffect(() => {
    const el = linesRef.current;
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
      for (const entry of entries) {
        const prepared = prepare(PREFIX + variableText(entry), font, {
          letterSpacing,
        });
        const { height } = layout(prepared, width, lineHeight);
        if (height > max) max = height;
      }
      if (!cancelled) {
        setMaxHeight((prev) => (prev === max ? prev : max));
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
  }, [entries]);

  useEffect(() => {
    const machine = machineRef.current;
    return () => cancelAnimationFrame(machine.raf);
  }, []);

  // Phosphor decode: a head sweeps across the variable part, chewing through
  // the old title as terminal noise and locking in the new one behind a
  // short phosphor-glow trail.
  const flip = () => {
    const machine = machineRef.current;
    if (machine.busy || entries.length < 2) return;
    const oldVar = splitGraphemes(variableText(entries[machine.idx]));
    machine.idx = (machine.idx + 1) % entries.length;
    setActiveIdx(machine.idx);
    const newVar = splitGraphemes(variableText(entries[machine.idx]));
    const rest = { settled: newVar.join(""), glow: "", noise: "", old: "" };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSegments(rest);
      return;
    }
    machine.busy = true;
    const total = Math.max(oldVar.length, newVar.length);
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / SWEEP_MS);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const head = Math.round(eased * total);
      const glowLen = Math.min(GLOW_TRAIL, total - head);
      const windowEnd = Math.min(head + NOISE_WINDOW, total);
      let noise = "";
      for (let i = head; i < windowEnd; i += 1) {
        const target = i < newVar.length ? newVar[i] : " ";
        noise +=
          target === " " ? " " : NOISE[(Math.random() * NOISE.length) | 0];
      }
      setSegments({
        settled: newVar.slice(0, Math.max(0, head - glowLen)).join(""),
        glow: newVar.slice(Math.max(0, head - glowLen), head).join(""),
        noise,
        old: oldVar.slice(windowEnd).join(""),
      });
      if (t < 1) {
        machine.raf = requestAnimationFrame(step);
      } else {
        machine.busy = false;
        setSegments(rest);
      }
    };
    machine.raf = requestAnimationFrame(step);
  };

  return (
    <p className="currently-reading">
      <button
        type="button"
        className="currently-reading__button"
        onClick={flip}
        aria-label={`${PREFIX}${variableText(entries[activeIdx])} — tap to flip through the collection`}
      >
        <span
          className="currently-reading__lines"
          aria-hidden="true"
          ref={linesRef}
          style={maxHeight ? { minHeight: `${maxHeight}px` } : undefined}
        >
          <span className="currently-reading__label">
            narratives experienced
          </span>
          {": "}
          {segments.settled}
          {segments.glow ? (
            <span className="currently-reading__glow">{segments.glow}</span>
          ) : null}
          {segments.noise ? (
            <span className="currently-reading__noise">{segments.noise}</span>
          ) : null}
          {segments.old ? (
            <span className="currently-reading__old">{segments.old}</span>
          ) : null}
        </span>
      </button>
    </p>
  );
}
