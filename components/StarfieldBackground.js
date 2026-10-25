"use client";

import { useEffect, useRef } from "react";

import { isPhone } from "../lib/phone";

/**
 * The starfield background canvas. Fixed behind every other layer (negative
 * z-index keeps it under even the z-0 ascii art), pointer-transparent, and
 * faded in by the same intro-ready choreography as the rest of the page.
 *
 * Reduced motion skips the whole thing — the render loop never starts, and
 * the CSS hides the canvas so the flat `--bg` background stands alone.
 *
 * The WebGPU renderer is fetched after mount, and only where WebGPU exists,
 * so it never weighs on first paint and never downloads where it cannot run.
 */
export default function StarfieldBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!navigator.gpu || isPhone()) return;

    let stop = null;
    let cancelled = false;
    import("../lib/starfield")
      .then(({ startStarfield }) => {
        if (!cancelled) stop = startStarfield(canvas);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  return <canvas ref={canvasRef} className="star-bg" aria-hidden="true" />;
}
