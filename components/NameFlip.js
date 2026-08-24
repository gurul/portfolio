"use client";

import { useEffect, useRef, useState } from "react";
import {
  WATERFALL_DONE_EVENT,
  isWaterfallSettled,
  splitGraphemes,
} from "../lib/textDecode";

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
  const machineRef = useRef({ idx: 0, busy: false, raf: 0 });
  const [activeIdx, setActiveIdx] = useState(0);
  const [ready, setReady] = useState(false);
  const [segments, setSegments] = useState(() => ({
    settled: NAME,
    glow: "",
    noise: "",
    old: "",
  }));

  // No height is reserved for the longer variant: the paragraph grows with
  // the sweep and the copy below rides along, so there is never idle space
  // sitting under the name.

  // The page waterfall replaces this paragraph's text nodes while it sweeps;
  // a React re-render in the middle of that would paint into detached nodes.
  // Reduced motion skips the waterfall entirely, so the flip is live at once.
  // Returning to this page re-mounts the component but does not re-run the
  // sweep (it is cached for the visit), and the done event is dispatched from
  // a layout effect — before this one subscribes. So the settled state is read
  // first: only a sweep that is actually still running gets waited on.
  useEffect(() => {
    if (
      isWaterfallSettled() ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
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

  // The span carries button semantics, so it has to answer the keys a button
  // would.
  const handleKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    flip();
  };

  return (
    <p>
      My name is{" "}
      {/* A span, not a button: Chrome never breaks a button's text across
          lines, so a real button would drop the whole name onto its own
          line instead of flowing with the sentence. */}
      <span
        className="name-flip"
        role="button"
        tabIndex={0}
        onClick={flip}
        onKeyDown={handleKeyDown}
        aria-label={`${VARIANTS[activeIdx]} — tap to flip between my name and what it means`}
      >
        <span aria-hidden="true">{renderName(segments)}</span>
      </span>
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
