"use client";

import { useEffect, useRef } from "react";
import { startStarfield } from "../lib/starfield";

/**
 * The starfield background canvas. Fixed behind every other layer (negative
 * z-index keeps it under even the z-0 ascii art), pointer-transparent, and
 * faded in by the same intro-ready choreography as the rest of the page.
 *
 * Reduced motion skips the whole thing — the render loop never starts, and
 * the CSS hides the canvas so the flat `--bg` background stands alone.
 */
export default function StarfieldBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    return startStarfield(canvas);
  }, []);

  return <canvas ref={canvasRef} className="star-bg" aria-hidden="true" />;
}
