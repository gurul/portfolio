"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { prepare, layout } from "@chenglou/pretext";
import { whenIntroReady } from "../lib/introReady";
import {
  PAGE_DECODE_DONE_EVENT,
  PER_CHAR_MS,
  WATERFALL_DONE_EVENT,
  splitGraphemes,
} from "../lib/textDecode";

// SSR renders the settled line for no-JS visitors; on the client the entrance
// blank must land before first paint or navigations flash the full text.
const useClientLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const LABEL = "narratives experienced";
const PREFIX = `${LABEL}: `;
const NOISE = "#%&/\\<>[]{}=+*?!;:^~·01$";
const SWEEP_MS = 720;
// If the page waterfall never reports in (e.g. it found nothing to sweep),
// the entrance starts on its own this long after the intro gate opens.
const ENTRANCE_FALLBACK_MS = 6000;
const GLOW_TRAIL = 6;
const NOISE_WINDOW = 7;

// Module state lives one browser visit (survives client-side navigations,
// resets on full load), so the entrance decode plays only on the first
// visit to this page per session — matching the page sweep's caching.
let entrancePlayed = false;

function variableText(entry) {
  return `${entry.title} — ${entry.author}`;
}

function fullText(entry) {
  return PREFIX + variableText(entry);
}

// Splits the four sweep segments (which together span the whole line) at the
// label boundary so the accent/underline styling survives mid-decode.
function renderLine(segments) {
  const runs = [
    { key: "settled", text: segments.settled, cls: null },
    { key: "glow", text: segments.glow, cls: "currently-reading__glow" },
    { key: "noise", text: segments.noise, cls: "currently-reading__noise" },
    { key: "old", text: segments.old, cls: "currently-reading__old" },
  ];
  const labelRuns = [];
  const restRuns = [];
  let pos = 0;
  for (const run of runs) {
    if (!run.text) continue;
    const end = pos + run.text.length;
    if (end <= LABEL.length) {
      labelRuns.push(run);
    } else if (pos >= LABEL.length) {
      restRuns.push(run);
    } else {
      const cut = LABEL.length - pos;
      labelRuns.push({ ...run, text: run.text.slice(0, cut) });
      restRuns.push({ ...run, text: run.text.slice(cut) });
    }
    pos = end;
  }
  const render = (run) =>
    run.cls ? (
      <span key={run.key} className={run.cls}>
        {run.text}
      </span>
    ) : (
      run.text
    );
  return (
    <>
      {labelRuns.length ? (
        <span className="currently-reading__label">{labelRuns.map(render)}</span>
      ) : null}
      {restRuns.map(render)}
    </>
  );
}

export default function ExperiencingNarratives({ entries }) {
  const linesRef = useRef(null);
  const machineRef = useRef({ idx: 0, busy: false, raf: 0 });
  const [activeIdx, setActiveIdx] = useState(0);
  const [maxHeight, setMaxHeight] = useState(0);
  const [segments, setSegments] = useState(() => ({
    settled: fullText(entries[0]),
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
        const prepared = prepare(fullText(entry), font, {
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

  // Phosphor decode: a head sweeps across the region [start, end), chewing
  // through the old characters as terminal noise and locking in the new ones
  // behind a short phosphor-glow trail. Everything before `start` stays
  // settled, so flips can hold the label still while the entrance sweeps it.
  const runSweep = (oldChars, newChars, start, durationMs, onDone) => {
    const machine = machineRef.current;
    machine.busy = true;
    const total = Math.max(oldChars.length, newChars.length);
    const began = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - began) / durationMs);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const head = start + Math.round(eased * (total - start));
      const glowLen = Math.min(GLOW_TRAIL, total - head);
      const windowEnd = Math.min(head + NOISE_WINDOW, total);
      let noise = "";
      for (let i = head; i < windowEnd; i += 1) {
        const target = i < newChars.length ? newChars[i] : " ";
        noise +=
          target === " " ? " " : NOISE[(Math.random() * NOISE.length) | 0];
      }
      setSegments({
        settled: newChars.slice(0, Math.max(start, head - glowLen)).join(""),
        glow: newChars.slice(Math.max(start, head - glowLen), head).join(""),
        noise,
        old: oldChars.slice(windowEnd).join(""),
      });
      if (t < 1) {
        machine.raf = requestAnimationFrame(step);
      } else {
        machine.busy = false;
        setSegments({ settled: newChars.join(""), glow: "", noise: "", old: "" });
        if (onDone) onDone();
      }
    };
    machine.raf = requestAnimationFrame(step);
  };

  // Entrance: the whole line — label included — decodes out of nothing as
  // the last step of the page waterfall, at the same per-character pace as
  // the flip. The page component remounts on every client-side navigation,
  // so the decode replays each time this page opens.
  useClientLayoutEffect(() => {
    const machine = machineRef.current;
    if (entrancePlayed) {
      // Already decoded this visit: keep the settled line and close the
      // waterfall immediately for anything still listening.
      const doneTimer = window.setTimeout(
        () => window.dispatchEvent(new Event(WATERFALL_DONE_EVENT)),
        0
      );
      return () => window.clearTimeout(doneTimer);
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }
    let cancelled = false;
    let started = false;
    let timer = 0;
    setSegments({ settled: "", glow: "", noise: "", old: "" });
    const begin = () => {
      if (cancelled || started) return;
      started = true;
      window.clearTimeout(timer);
      const chars = splitGraphemes(fullText(entries[machine.idx]));
      runSweep([], chars, 0, chars.length * PER_CHAR_MS, () => {
        // This line is the last text in the waterfall — hand off to the horse.
        entrancePlayed = true;
        window.dispatchEvent(new Event(WATERFALL_DONE_EVENT));
      });
    };
    window.addEventListener(PAGE_DECODE_DONE_EVENT, begin, { once: true });
    whenIntroReady().then(() => {
      if (cancelled || started) return;
      timer = window.setTimeout(begin, ENTRANCE_FALLBACK_MS);
    });
    return () => {
      cancelled = true;
      machine.busy = false;
      window.clearTimeout(timer);
      window.removeEventListener(PAGE_DECODE_DONE_EVENT, begin);
      cancelAnimationFrame(machine.raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flip = () => {
    const machine = machineRef.current;
    if (machine.busy || entries.length < 2) return;
    const oldFull = splitGraphemes(fullText(entries[machine.idx]));
    machine.idx = (machine.idx + 1) % entries.length;
    setActiveIdx(machine.idx);
    const newFull = splitGraphemes(fullText(entries[machine.idx]));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSegments({ settled: newFull.join(""), glow: "", noise: "", old: "" });
      return;
    }
    runSweep(oldFull, newFull, splitGraphemes(PREFIX).length, SWEEP_MS);
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
          {renderLine(segments)}
        </span>
      </button>
    </p>
  );
}
