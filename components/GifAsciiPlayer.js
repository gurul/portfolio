"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { whenIntroReady } from "../lib/introReady";
import { WATERFALL_DONE_EVENT } from "../lib/textDecode";

const ASCII_CHARS = " .'`^,:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
const FRAME_COUNT = 12;
const FRAME_DURATION = 70;
const BACKGROUND_THRESHOLD = 17;
const CONTRAST = 2.1;
// Spot-forward extraction: each cell supersamples the source and pools toward
// its darkest pixel, so the cheetah's markings and thin limbs survive the
// downsample instead of averaging into the pale body.
const SUPERSAMPLE = 4;
const DETAIL = 1;
const BG_CULL = 238;
// Faint b/w copy of the frame screen-blended under the glyphs so the
// silhouette reads even where the glyph field is sparse.
const GHOST_OPACITY = 0.14;
const DEFAULT_BG = "#001918";
const STORAGE_KEY = "horse-theme-active";
// Click (or a fresh visit) cycles teal -> dark maroon -> black ->
// deep purple -> deep navy. Every non-default theme gets a
// `<name>-theme-active` class on <html>/<body>.
const THEMES = ["default", "horse", "night", "purple", "navy"];
const THEME_CLASSES = THEMES.filter((name) => name !== "default").map(
  (name) => `${name}-theme-active`,
);
const GRID_WIDTH = 176;
const CELL_WIDTH = 8;
const CELL_HEIGHT = 14;
// Entrance decode: a dim noise band sweeps the grid left to right once,
// after the text waterfall finishes — the cheetah is the waterfall's last drop.
const DECODE_DELAY_MS = 150;
const DECODE_MS = 1200;
const DECODE_BAND = 18;
// Noise glyphs re-roll on this clock instead of every frame, so the band
// shimmers instead of strobing.
const DECODE_TICK_MS = 90;
// If the waterfall never reports in, reveal anyway this long after the gate.
const DECODE_FALLBACK_MS = 9000;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Convert one frame image into a brightness-sorted list of [x, y, charIndex,
// brightness] quads so the draw loop can batch fillStyle changes. Sparkle
// cells (the sparse highlight overlay) are kept in their own list. Each cell
// is supersampled and pooled toward its darkest source pixel (DETAIL) so the
// markings drive the glyph density; near-white cells are background.
function computeFrameCells(image, offscreenContext, gridHeight) {
  const offscreen = offscreenContext.canvas;
  const sampleWidth = GRID_WIDTH * SUPERSAMPLE;
  const sampleHeight = gridHeight * SUPERSAMPLE;
  offscreen.width = sampleWidth;
  offscreen.height = sampleHeight;
  offscreenContext.clearRect(0, 0, sampleWidth, sampleHeight);
  offscreenContext.drawImage(image, 0, 0, sampleWidth, sampleHeight);
  const { data } = offscreenContext.getImageData(0, 0, sampleWidth, sampleHeight);

  const cells = [];
  const sparkles = [];

  for (let y = 0; y < gridHeight; y += 1) {
    for (let x = 0; x < GRID_WIDTH; x += 1) {
      let sum = 0;
      let darkest = 255;
      let opaque = 0;
      for (let oy = 0; oy < SUPERSAMPLE; oy += 1) {
        const rowBase = ((y * SUPERSAMPLE + oy) * sampleWidth + x * SUPERSAMPLE) * 4;
        for (let ox = 0; ox < SUPERSAMPLE; ox += 1) {
          const index = rowBase + ox * 4;
          let value = 255; // transparent samples read as background
          if (data[index + 3] >= 30) {
            opaque += 1;
            value = luminance(data[index], data[index + 1], data[index + 2]);
          }
          sum += value;
          if (value < darkest) darkest = value;
        }
      }
      if (opaque === 0) continue;

      const mean = sum / (SUPERSAMPLE * SUPERSAMPLE);
      if (mean > BG_CULL) continue;

      const pooled = mean * (1 - DETAIL) + darkest * DETAIL;
      const brightness = clamp((pooled - 128) * CONTRAST + 128, 0, 255);
      if (brightness < BACKGROUND_THRESHOLD) continue;

      const charIndex =
        ASCII_CHARS.length - 1 - Math.floor((brightness / 255) * (ASCII_CHARS.length - 1));
      cells.push([x, y, charIndex, Math.round(brightness)]);

      if (x % 16 === 0 && y % 10 === 0 && brightness > 118) {
        sparkles.push([x, y, charIndex, Math.round(brightness)]);
      }
    }
  }

  cells.sort((first, second) => first[3] - second[3]);
  return { cells, sparkles };
}

// Inverted grayscale copy of a frame (bright subject on black) used as the
// screen-blended ghost underlay. Precomputed so drawFrame stays cheap and we
// avoid canvas filter support differences.
function buildGhost(image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const inverted =
      data[i + 3] < 30
        ? 0
        : 255 - luminance(data[i], data[i + 1], data[i + 2]);
    data[i] = inverted;
    data[i + 1] = inverted;
    data[i + 2] = inverted;
    data[i + 3] = 255;
  }
  context.putImageData(imageData, 0, 0);
  return canvas;
}

function cellColor(brightness, theme) {
  const intensity = brightness / 255;
  const alpha = Math.min(1, 0.34 + intensity * 0.9);
  const activated = theme === "horse";
  const red = activated
    ? Math.round(240 + intensity * 15)
    : Math.round(228 + intensity * 27);
  const green = activated
    ? Math.round(228 + intensity * 27)
    : Math.round(224 + intensity * 31);
  const blue = activated
    ? Math.round(220 + intensity * 35)
    : Math.round(220 + intensity * 35);
  return { red, green, blue, alpha };
}

export default function GifAsciiPlayer() {
  const pathname = usePathname();
  const showsHorse = pathname === "/" || pathname === "/about" || pathname === "/software" || pathname === "/hardware" || pathname === "/research" || pathname === "/communities";
  const blockRef = useRef(null);
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const framesRef = useRef([]);
  const ghostsRef = useRef([]);
  const frameIndexRef = useRef(0);
  const lastTimeRef = useRef(0);
  const gridHeightRef = useRef(0);
  const themeRef = useRef("default");
  const needsRedrawRef = useRef(true);
  const reducedMotionRef = useRef(false);
  const decodeRef = useRef({ started: 0, eased: 1, tick: 0 });
  const [showScrollCue, setShowScrollCue] = useState(false);
  const [theme, setTheme] = useState("default");
  const [isReady, setIsReady] = useState(false);
  // When the decode sweep drives the reveal, the CSS opacity fade would run
  // on top of it and mud the first half of the sweep — snap instead.
  const [instantReveal, setInstantReveal] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      // Legacy boolean values from the two-theme era.
      const current =
        stored === "true" ? "horse" : stored === "false" ? "default" : stored;
      // A fresh visit advances the cycle; a first visit starts on default.
      const nextTheme =
        current == null
          ? "default"
          : THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
      setTheme(nextTheme);
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    const roots = [document.documentElement, document.body];

    for (const root of roots) {
      root.classList.remove(...THEME_CLASSES);
      if (theme !== "default") {
        root.classList.add(`${theme}-theme-active`);
      }
    }

    return () => {
      for (const root of roots) {
        root.classList.remove(...THEME_CLASSES);
      }
    };
  }, [theme]);

  useEffect(() => {
    themeRef.current = theme;
    needsRedrawRef.current = true;
  }, [theme]);

  useEffect(() => {
    if (!showsHorse) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const offscreen = document.createElement("canvas");
    const offscreenContext = offscreen.getContext("2d", { willReadFrequently: true });
    if (!offscreenContext) return;

    let active = true;
    // next/font serves JetBrains Mono under a generated family name, so
    // resolve the real family from the DOM instead of hardcoding it.
    let asciiFont = "500 11px monospace";

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = motionQuery.matches;
    const onMotionChange = (event) => {
      reducedMotionRef.current = event.matches;
    };
    motionQuery.addEventListener("change", onMotionChange);

    // The cheetah is the waterfall's last drop: hold its reveal until the text
    // decode reports done (or a safety timeout). Listen from the start so a
    // fast waterfall can't finish before slow frame downloads subscribe.
    let waterfallTimer = 0;
    let onWaterfallDone = null;
    const waterfallDone = new Promise((resolve) => {
      onWaterfallDone = () => {
        window.clearTimeout(waterfallTimer);
        resolve();
      };
      window.addEventListener(WATERFALL_DONE_EVENT, onWaterfallDone, {
        once: true,
      });
      waterfallTimer = window.setTimeout(onWaterfallDone, DECODE_FALLBACK_MS);
    });

    const drawFrame = (frame) => {
      if (!frame) return;

      const gridHeight = gridHeightRef.current;
      const cssWidth = GRID_WIDTH * CELL_WIDTH;
      const cssHeight = gridHeight * CELL_HEIGHT;

      const themeBackground =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--bg")
          .trim() || DEFAULT_BG;
      context.fillStyle = themeBackground;
      context.fillRect(0, 0, cssWidth, cssHeight);
      context.font = asciiFont;
      context.textBaseline = "top";

      const theme = themeRef.current;
      // Entrance sweep head in grid columns; Infinity once settled.
      const decode = decodeRef.current;
      const headX =
        decode.eased >= 1 ? Infinity : decode.eased * (GRID_WIDTH + DECODE_BAND);

      // Ghost underlay, clipped to the settled side of the decode sweep so it
      // arrives with the glyphs rather than ahead of them.
      const ghost =
        ghostsRef.current[frameIndexRef.current] ?? ghostsRef.current.find(Boolean);
      if (ghost && GHOST_OPACITY > 0) {
        const settled =
          decode.eased >= 1
            ? cssWidth
            : clamp((headX - DECODE_BAND) * CELL_WIDTH, 0, cssWidth);
        if (settled > 0) {
          context.save();
          context.beginPath();
          context.rect(0, 0, settled, cssHeight);
          context.clip();
          context.globalAlpha = GHOST_OPACITY;
          context.globalCompositeOperation = "screen";
          context.drawImage(ghost, 0, 0, cssWidth, cssHeight);
          context.restore();
        }
      }

      // Sparkles push a step brighter than their base cell.
      const sparkleShift = 18;
      let currentBrightness = -1;

      for (const [x, y, charIndex, brightness] of frame.cells) {
        if (x >= headX) continue;
        if (x >= headX - DECODE_BAND) {
          // Noise band: dim shimmer that brightens toward the settled edge,
          // glyphs re-rolled on the tick clock rather than every frame.
          const { red, green, blue, alpha } = cellColor(brightness, theme);
          const settle = (headX - x) / DECODE_BAND;
          context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${
            alpha * (0.2 + 0.6 * settle)
          })`;
          currentBrightness = -1;
          const glyph =
            ASCII_CHARS[
              (x * 31 + y * 17 + decode.tick * 7) % ASCII_CHARS.length
            ];
          context.fillText(glyph, x * CELL_WIDTH, y * CELL_HEIGHT);
          continue;
        }
        if (brightness !== currentBrightness) {
          const { red, green, blue, alpha } = cellColor(brightness, theme);
          context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
          currentBrightness = brightness;
        }
        context.fillText(ASCII_CHARS[charIndex], x * CELL_WIDTH, y * CELL_HEIGHT);
      }

      for (const [x, y, charIndex, brightness] of frame.sparkles) {
        if (x >= headX - DECODE_BAND) continue;
        const { red, green, blue, alpha } = cellColor(brightness, theme);
        context.fillStyle = `rgba(${clamp(red + sparkleShift, 0, 255)}, ${clamp(green + sparkleShift, 0, 255)}, ${clamp(blue + sparkleShift, 0, 255)}, ${alpha * 0.18})`;
        context.fillText(ASCII_CHARS[charIndex], x * CELL_WIDTH + 0.5, y * CELL_HEIGHT);
      }
    };

    const loadFrames = async () => {
      const images = Array.from({ length: FRAME_COUNT }, (_, index) => {
        const image = new Image();
        image.src = `/cheetah-frames/frame_${String(index + 1).padStart(3, "0")}.png`;
        return image;
      });

      const bodyFontFamily = getComputedStyle(document.body).fontFamily;
      if (bodyFontFamily) {
        asciiFont = `500 11px ${bodyFontFamily}`;
      }

      await Promise.all([
        ...images.map((image) => image.decode().catch(() => {})),
        document.fonts?.load(asciiFont).catch(() => {}),
      ]);
      if (!active) return;

      const firstUsable = images.find((image) => image.naturalWidth > 0);
      if (!firstUsable) return;

      const gridHeight = Math.round(
        (firstUsable.naturalHeight / firstUsable.naturalWidth) * GRID_WIDTH * 0.52,
      );
      gridHeightRef.current = gridHeight;

      // Process frames in small batches with a rAF yield between them. A
      // single synchronous pass over every frame blocks the main thread
      // long enough that the crosshair meteors (which animate top/left on
      // the main thread) skip their opening frames and appear to start
      // mid-screen instead of from the corner.
      const frames = [];
      const ghosts = [];
      for (let index = 0; index < images.length; index += 1) {
        const image = images[index];
        const usable = image.naturalWidth > 0;
        frames.push(usable ? computeFrameCells(image, offscreenContext, gridHeight) : null);
        ghosts.push(usable ? buildGhost(image) : null);
        if ((index + 1) % 3 === 0) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
          if (!active) return;
        }
      }

      // Hold the reveal until the shared intro gate opens, so the cheetah
      // never appears before the blank-page choreography has started.
      await whenIntroReady();
      if (!active) return;

      framesRef.current = frames;
      ghostsRef.current = ghosts;
      sizeCanvas();

      if (reducedMotionRef.current) {
        setIsReady(true);
        return;
      }

      await waterfallDone;
      if (!active) return;

      decodeRef.current = {
        started: performance.now() + DECODE_DELAY_MS,
        eased: 0,
        tick: 0,
      };
      setInstantReveal(true);
      setIsReady(true);
    };

    // Match the backing store to the displayed size in device pixels so
    // glyphs land 1:1 on screen pixels instead of being CSS-downscaled.
    const sizeCanvas = () => {
      const gridHeight = gridHeightRef.current;
      if (!gridHeight) return;

      const dpr = window.devicePixelRatio || 1;
      const displayWidth = canvas.clientWidth || GRID_WIDTH * CELL_WIDTH;
      const scale = (displayWidth * dpr) / (GRID_WIDTH * CELL_WIDTH);
      canvas.width = Math.round(GRID_WIDTH * CELL_WIDTH * scale);
      canvas.height = Math.round(gridHeight * CELL_HEIGHT * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
      needsRedrawRef.current = true;
    };

    const resizeObserver = new ResizeObserver(() => {
      sizeCanvas();
    });
    resizeObserver.observe(canvas);

    loadFrames();

    const render = (time) => {
      if (!active) return;
      frameRef.current = requestAnimationFrame(render);

      const frames = framesRef.current;
      if (frames.length === 0) return;

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = time;
      }

      const decode = decodeRef.current;
      if (decode.eased < 1) {
        const t = clamp((time - decode.started) / DECODE_MS, 0, 1);
        decode.eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        decode.tick = (time / DECODE_TICK_MS) | 0;
        needsRedrawRef.current = true;
      }

      const elapsed = time - lastTimeRef.current;
      if (elapsed >= FRAME_DURATION && !reducedMotionRef.current) {
        const steps = Math.floor(elapsed / FRAME_DURATION);
        // After a long pause (tab hidden), skip ahead instead of replaying.
        if (steps > FRAME_COUNT) {
          lastTimeRef.current = time;
        } else {
          lastTimeRef.current += steps * FRAME_DURATION;
        }
        frameIndexRef.current = (frameIndexRef.current + steps) % FRAME_COUNT;
        needsRedrawRef.current = true;
      }

      if (needsRedrawRef.current) {
        drawFrame(frames[frameIndexRef.current] ?? frames.find(Boolean));
        needsRedrawRef.current = false;
      }
    };

    frameRef.current = requestAnimationFrame(render);

    return () => {
      active = false;
      motionQuery.removeEventListener("change", onMotionChange);
      window.clearTimeout(waterfallTimer);
      if (onWaterfallDone) {
        window.removeEventListener(WATERFALL_DONE_EVENT, onWaterfallDone);
      }
      resizeObserver.disconnect();
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      lastTimeRef.current = 0;
      framesRef.current = [];
      ghostsRef.current = [];
      setIsReady(false);
    };
  }, [showsHorse]);

  useEffect(() => {
    if (!showsHorse) {
      setShowScrollCue(false);
      return undefined;
    }

    setShowScrollCue(false);

    const updateScrollCue = () => {
      const isMobile = window.innerWidth <= 900;
      const footerHeight =
        blockRef.current?.getBoundingClientRect().height ?? 0;
      const copyColumn = document.querySelector(".copy-column");
      const lastContent = copyColumn?.lastElementChild;

      if (!isMobile || !footerHeight || !lastContent) {
        setShowScrollCue(false);
        return;
      }

      const lastContentBottom = lastContent.getBoundingClientRect().bottom;
      const footerTop = window.innerHeight - footerHeight;

      setShowScrollCue(lastContentBottom > footerTop + 12);
    };

    const frameOne = window.requestAnimationFrame(() => {
      updateScrollCue();
      window.requestAnimationFrame(updateScrollCue);
    });
    const delayed = window.setTimeout(updateScrollCue, 180);

    window.addEventListener("scroll", updateScrollCue, { passive: true });
    window.addEventListener("resize", updateScrollCue);

    return () => {
      window.cancelAnimationFrame(frameOne);
      window.clearTimeout(delayed);
      window.removeEventListener("scroll", updateScrollCue);
      window.removeEventListener("resize", updateScrollCue);
    };
  }, [showsHorse, pathname]);

  if (!showsHorse) {
    return null;
  }

  return (
    <section
      ref={blockRef}
      className="gif-ascii-block"
      aria-label="ASCII animation experiment"
      onClick={() =>
        setTheme(
          (current) => THEMES[(THEMES.indexOf(current) + 1) % THEMES.length],
        )
      }
    >
      {showScrollCue ? (
        <span className="gif-ascii-scroll-cue">scroll to continue</span>
      ) : null}
      <canvas
        ref={canvasRef}
        className={`gif-ascii-canvas${isReady ? " is-ready" : ""}${
          instantReveal ? " is-instant" : ""
        }`}
      />
    </section>
  );
}
