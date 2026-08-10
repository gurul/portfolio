"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { whenIntroReady } from "../lib/introReady";
import { WATERFALL_DONE_EVENT } from "../lib/textDecode";

const ASCII_CHARS = " .'`^,:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
const FRAME_COUNT = 43;
const FRAME_DURATION = 1000 / 25;
const BACKGROUND_THRESHOLD = 18;
const CONTRAST = 1.45;
const DEFAULT_BG = "#001918";
const STORAGE_KEY = "horse-theme-active";
// Click (or a fresh visit) cycles teal -> red -> black -> deep purple ->
// forest green -> deep navy. Every non-default theme gets a
// `<name>-theme-active` class on <html>/<body>.
const THEMES = ["default", "horse", "night", "purple", "sage", "navy"];
const THEME_CLASSES = THEMES.filter((name) => name !== "default").map(
  (name) => `${name}-theme-active`,
);
const GRID_WIDTH = 132;
const CELL_WIDTH = 8;
const CELL_HEIGHT = 14;
// Entrance decode: a dim noise band sweeps the grid left to right once,
// after the text waterfall finishes — the horse is the waterfall's last drop.
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
// cells (the sparse highlight overlay) are kept in their own list.
function computeFrameCells(image, offscreenContext, gridHeight) {
  const offscreen = offscreenContext.canvas;
  offscreen.width = GRID_WIDTH;
  offscreen.height = gridHeight;
  offscreenContext.clearRect(0, 0, GRID_WIDTH, gridHeight);
  offscreenContext.drawImage(image, 0, 0, GRID_WIDTH, gridHeight);
  const { data } = offscreenContext.getImageData(0, 0, GRID_WIDTH, gridHeight);

  const cells = [];
  const sparkles = [];

  for (let y = 0; y < gridHeight; y += 1) {
    for (let x = 0; x < GRID_WIDTH; x += 1) {
      const index = (y * GRID_WIDTH + x) * 4;
      const a = data[index + 3];
      if (a < 30) continue;

      const baseBrightness = luminance(data[index], data[index + 1], data[index + 2]);
      const brightness = clamp((baseBrightness - 128) * CONTRAST + 128, 0, 255);
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

    // The horse is the waterfall's last drop: hold its reveal until the text
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
        image.src = `/glitch-horse-frames/frame_${String(index + 1).padStart(3, "0")}.png`;
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
      // single synchronous pass over all 43 frames blocks the main thread
      // long enough that the crosshair meteors (which animate top/left on
      // the main thread) skip their opening frames and appear to start
      // mid-screen instead of from the corner.
      const frames = [];
      for (let index = 0; index < images.length; index += 1) {
        const image = images[index];
        frames.push(
          image.naturalWidth > 0
            ? computeFrameCells(image, offscreenContext, gridHeight)
            : null,
        );
        if ((index + 1) % 3 === 0) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
          if (!active) return;
        }
      }

      // Hold the reveal until the shared intro gate opens, so the horse
      // never appears before the blank-page choreography has started.
      await whenIntroReady();
      if (!active) return;

      framesRef.current = frames;
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
