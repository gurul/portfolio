"use client";

import { useEffect, useRef, useState } from "react";
import { startSunRadiance } from "../lib/sun/runner";

/**
 * The sun on the crosshair intersection. The CSS sun (corona + spinning
 * glyph) ignites exactly as before; once the radiance-cascades field has
 * compiled its first scene, the canvas fades in beneath the glyph and begins
 * powering the sun up — real 2D global illumination charging from a gutter to
 * full radiance, then holding. The glyph never leaves; only the static CSS
 * corona bows out to the live light. If WebGPU is missing — or motion is
 * reduced — `onReady` never fires and the CSS sun simply stays whole.
 *
 * The canvas is screen-blended: the field renders light on black, so black is
 * invisible and only the light lands on the page, whatever the theme.
 */
export default function CrosshairSun() {
  const canvasRef = useRef(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    return startSunRadiance(canvas, { onReady: () => setLive(true) });
  }, []);

  return (
    <div className={`crosshair__sun${live ? " crosshair__sun--live" : ""}`}>
      <canvas ref={canvasRef} className="crosshair__sun-radiance" />
      <div className="crosshair__sun-glyph" />
    </div>
  );
}
