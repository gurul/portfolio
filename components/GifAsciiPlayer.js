"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { whenIntroReady } from "../lib/introReady";
import {
  WATERFALL_DONE_EVENT,
  WATERFALL_LEAD_EVENT,
  WATERFALL_LEAD_MS,
} from "../lib/textDecode";

const ASCII_CHARS = " .'`^,:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
const FRAME_COUNT = 12;
const FRAME_DURATION = 83;
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
// Phosphor persistence: the previous frame's glyphs linger at this fraction of
// their alpha, so fast poses (the tail whip crosses a third of its arc in one
// 83ms step) read as a motion-blurred sweep instead of a 12fps snap.
const TRAIL_OPACITY = 0.35;
const STORAGE_KEY = "cheetah-theme-active";
// Click (or a fresh visit) cycles teal -> dark maroon -> black ->
// deep purple -> deep navy. Every non-default theme gets a
// `<name>-theme-active` class on <html>/<body>.
const THEMES = ["default", "cheetah", "night", "purple", "navy"];
const THEME_CLASSES = THEMES.filter((name) => name !== "default").map(
  (name) => `${name}-theme-active`,
);
const GRID_WIDTH = 176;
const CELL_WIDTH = 8;
const CELL_HEIGHT = 14;
// Entrance decode: a dim noise band sweeps the grid left to right once,
// timed off the waterfall's lead signal so the cheetah settles on the same
// beat as the last character of text rather than trailing it.
const DECODE_MS = 1200;
// Beat between the lead signal and the sweep. Derived so the whole entrance
// (beat + sweep) spans exactly the lead the waterfall gives us.
const DECODE_DELAY_MS = Math.max(0, WATERFALL_LEAD_MS - DECODE_MS);
const DECODE_BAND = 18;
// Freshly-settled columns behind the noise band flare in the accent color
// with a soft halo — the same phosphor trail the text decode uses.
const DECODE_GLOW = 10;
const DECODE_GLOW_BLUR = 7;
// Room around each glyph in the glow sprite sheet for the blur to spread.
const GLOW_PAD = 10;
// The sweep repaints the whole grid every frame; cap it at 60fps so a 120Hz
// screen does not pay twice for motion nobody can tell apart.
const SWEEP_MIN_FRAME_MS = 15;
// Noise glyphs re-roll on this clock instead of every frame, so the band
// shimmers instead of strobing.
const DECODE_TICK_MS = 90;
// If the waterfall never reports in, reveal anyway this long after the gate.
const DECODE_FALLBACK_MS = 9000;
// Settled frames are drawn once into offscreen canvases and copied from
// there, so playback is one drawImage per frame instead of ~1,100 fillText
// calls. Twelve copies of the backing store are kept, so the cache is skipped
// above this size (large desktop windows, which can afford fillText). A phone
// canvas is ~60k pixels.
const CACHE_MAX_PIXELS = 512 * 1024;
// Main-thread time spent converting frames before yielding to the next
// animation frame. Well under one 60fps frame, so the text intro keeps its
// rhythm.
const SLICE_BUDGET_MS = 6;

// Shrinking a canvas to nothing frees its backing store now. iOS Safari caps
// total canvas memory and is slow to collect canvases left to the GC.
function releaseCanvas(canvas) {
  if (!canvas) return;
  canvas.width = 0;
  canvas.height = 0;
}

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
  // Reassigning a dimension reallocates the canvas even when it is unchanged.
  if (offscreen.width !== sampleWidth || offscreen.height !== sampleHeight) {
    offscreen.width = sampleWidth;
    offscreen.height = sampleHeight;
  }
  offscreenContext.clearRect(0, 0, sampleWidth, sampleHeight);
  offscreenContext.drawImage(image, 0, 0, sampleWidth, sampleHeight);
  const { data } = offscreenContext.getImageData(0, 0, sampleWidth, sampleHeight);

  const cells = [];
  const sparkles = [];
  // Occupied grid positions, so the trail pass can skip cells the live frame
  // draws anyway instead of overstriking them.
  const keys = new Set();

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
      keys.add(y * GRID_WIDTH + x);

      if (x % 16 === 0 && y % 10 === 0 && brightness > 118) {
        sparkles.push([x, y, charIndex, Math.round(brightness)]);
      }
    }
  }

  cells.sort((first, second) => first[3] - second[3]);
  return { cells, sparkles, keys };
}

// Inverted grayscale copy of a frame (bright subject on black) used as the
// screen-blended ghost underlay. Precomputed so drawFrame stays cheap and we
// avoid canvas filter support differences. The pixels are read through a
// willReadFrequently context: reading back a GPU-backed canvas stalls on a
// GPU sync, which Safari pays on every call.
function buildGhost(image, readContext) {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const reader = readContext.canvas;
  if (reader.width !== width || reader.height !== height) {
    reader.width = width;
    reader.height = height;
  }
  readContext.clearRect(0, 0, width, height);
  readContext.drawImage(image, 0, 0);
  const imageData = readContext.getImageData(0, 0, width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const inverted =
      data[i + 3] < 30
        ? 0
        : 255 - luminance(data[i], data[i + 1], data[i + 2]);
    data[i] = inverted;
    data[i + 1] = inverted;
    data[i + 2] = inverted;
    // Alpha follows brightness: the black surround is fully transparent, so
    // the ghost never lays a rectangular veil over the starfield beneath.
    data[i + 3] = inverted;
  }
  context.putImageData(imageData, 0, 0);
  return canvas;
}

function cellColor(brightness, theme) {
  const intensity = brightness / 255;
  const alpha = Math.min(1, 0.34 + intensity * 0.9);
  const activated = theme === "cheetah";
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
  const showsCheetah = pathname === "/" || pathname === "/about" || pathname === "/projects" || pathname === "/research" || pathname === "/communities";
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const framesRef = useRef([]);
  const ghostsRef = useRef([]);
  const frameIndexRef = useRef(0);
  const lastTimeRef = useRef(0);
  const gridHeightRef = useRef(0);
  const themeRef = useRef("default");
  const needsRedrawRef = useRef(true);
  // The theme accent, read once per theme change: reading computed style on
  // every drawn frame forces a style recalc while the text decode is still
  // mutating the page.
  const accentRef = useRef("#ffffff");
  const lastDrawRef = useRef(0);
  const reducedMotionRef = useRef(false);
  const decodeRef = useRef({ started: 0, eased: 1, tick: 0 });
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
        stored === "true" ? "cheetah" : stored === "false" ? "default" : stored;
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
    accentRef.current =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim() || "#ffffff";
    needsRedrawRef.current = true;
  }, [theme]);

  useEffect(() => {
    if (!showsCheetah) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const offscreen = document.createElement("canvas");
    const offscreenContext = offscreen.getContext("2d", { willReadFrequently: true });
    if (!offscreenContext) return;
    const ghostReader = document.createElement("canvas");
    const ghostReadContext = ghostReader.getContext("2d", { willReadFrequently: true });
    if (!ghostReadContext) return;

    let active = true;
    const nextSlice = () =>
      new Promise((resolve) => requestAnimationFrame(resolve));
    // next/font serves JetBrains Mono under a generated family name, so
    // resolve the real family from the DOM instead of hardcoding it.
    let asciiFont = "500 11px monospace";

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = motionQuery.matches;
    const onMotionChange = (event) => {
      reducedMotionRef.current = event.matches;
    };
    motionQuery.addEventListener("change", onMotionChange);

    // The cheetah lands with the waterfall's last drop: hold its reveal until
    // the text decode signals it is a cheetah-entrance away from finishing. The
    // done event is the backstop for the paths that never lead (a cached sweep
    // reporting in instantly, reduced motion), as is the safety timeout.
    // Listen from the start so a fast waterfall can't get there before slow
    // frame downloads subscribe.
    let waterfallTimer = 0;
    let onWaterfallCue = null;
    const waterfallCue = new Promise((resolve) => {
      onWaterfallCue = () => {
        window.clearTimeout(waterfallTimer);
        resolve();
      };
      window.addEventListener(WATERFALL_LEAD_EVENT, onWaterfallCue, {
        once: true,
      });
      window.addEventListener(WATERFALL_DONE_EVENT, onWaterfallCue, {
        once: true,
      });
      waterfallTimer = window.setTimeout(onWaterfallCue, DECODE_FALLBACK_MS);
    });

    // Device pixels per grid pixel; set by sizeCanvas.
    let canvasScale = 1;
    let glowSheet = null;
    const glowSprites = (accent) => {
      if (
        glowSheet &&
        glowSheet.accent === accent &&
        glowSheet.scale === canvasScale &&
        glowSheet.font === asciiFont
      ) {
        return glowSheet;
      }
      // Each sprite spans whole device pixels, so copying one never samples
      // the edge of its neighbour.
      const cellWidth = Math.ceil((CELL_WIDTH + GLOW_PAD * 2) * canvasScale);
      const cellHeight = Math.ceil((CELL_HEIGHT + GLOW_PAD * 2) * canvasScale);
      const sheet = document.createElement("canvas");
      sheet.width = cellWidth * ASCII_CHARS.length;
      sheet.height = cellHeight;
      const sheetContext = sheet.getContext("2d");
      sheetContext.font = asciiFont;
      sheetContext.textBaseline = "top";
      sheetContext.fillStyle = accent;
      sheetContext.shadowColor = accent;
      // shadowBlur ignores the transform, exactly as on the live canvas.
      sheetContext.shadowBlur = DECODE_GLOW_BLUR;
      for (let index = 0; index < ASCII_CHARS.length; index += 1) {
        sheetContext.setTransform(canvasScale, 0, 0, canvasScale, index * cellWidth, 0);
        sheetContext.fillText(ASCII_CHARS[index], GLOW_PAD, GLOW_PAD);
      }
      releaseCanvas(glowSheet?.canvas);
      glowSheet = {
        canvas: sheet,
        cellWidth,
        cellHeight,
        accent,
        scale: canvasScale,
        font: asciiFont,
      };
      return glowSheet;
    };

    // Paint frame `index` into `ctx` (already cleared, transform set), with
    // the sweep head at `headX` (Infinity once settled). Columns left of
    // `fromColumn` and pixels left of `fromX` are skipped: the caller has
    // already copied them from the settled-frame cache.
    const paint = (ctx, index, headX, fromColumn, fromX) => {
      const frames = framesRef.current;
      const frame = frames[index] ?? frames.find(Boolean);
      if (!frame) return;

      const gridHeight = gridHeightRef.current;
      const cssWidth = GRID_WIDTH * CELL_WIDTH;
      const cssHeight = gridHeight * CELL_HEIGHT;

      const themeAccent = accentRef.current;
      ctx.font = asciiFont;
      ctx.textBaseline = "top";

      const theme = themeRef.current;
      const decode = decodeRef.current;

      // Ghost underlay, clipped to the settled side of the decode sweep so it
      // arrives with the glyphs rather than ahead of them.
      const ghost = ghostsRef.current[index] ?? ghostsRef.current.find(Boolean);
      if (ghost && GHOST_OPACITY > 0) {
        const settled =
          headX === Infinity
            ? cssWidth
            : clamp((headX - DECODE_BAND) * CELL_WIDTH, 0, cssWidth);
        if (settled > fromX) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(fromX, 0, settled - fromX, cssHeight);
          ctx.clip();
          ctx.globalAlpha = GHOST_OPACITY;
          ctx.globalCompositeOperation = "screen";
          ctx.drawImage(ghost, 0, 0, cssWidth, cssHeight);
          ctx.restore();
        }
      }

      // Phosphor trail: the previous frame's glyphs at reduced alpha, only in
      // cells the current frame leaves empty and only in the settled zone of
      // the decode sweep. Skipped under reduced motion, where the frame index
      // never advances and the trail would sit as a permanent double exposure.
      const prevFrame = frames[(index + FRAME_COUNT - 1) % FRAME_COUNT];
      if (
        prevFrame &&
        prevFrame !== frame &&
        TRAIL_OPACITY > 0 &&
        !reducedMotionRef.current
      ) {
        let trailBrightness = -1;
        for (const [x, y, charIndex, brightness] of prevFrame.cells) {
          if (x < fromColumn || x >= headX - DECODE_BAND) continue;
          if (frame.keys.has(y * GRID_WIDTH + x)) continue;
          if (brightness !== trailBrightness) {
            const { red, green, blue, alpha } = cellColor(brightness, theme);
            ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${
              alpha * TRAIL_OPACITY
            })`;
            trailBrightness = brightness;
          }
          ctx.fillText(ASCII_CHARS[charIndex], x * CELL_WIDTH, y * CELL_HEIGHT);
        }
      }

      // Sparkles push a step brighter than their base cell.
      const sparkleShift = 18;
      let currentBrightness = -1;
      // Glow-band cells are collected and drawn in one pass afterwards so the
      // shadow state is set once instead of per glyph.
      const glowCells = [];

      for (const [x, y, charIndex, brightness] of frame.cells) {
        if (x < fromColumn || x >= headX) continue;
        if (x >= headX - DECODE_BAND) {
          // Noise band: dim shimmer that brightens toward the settled edge,
          // glyphs re-rolled on the tick clock rather than every frame.
          const { red, green, blue, alpha } = cellColor(brightness, theme);
          const settle = (headX - x) / DECODE_BAND;
          ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${
            alpha * (0.2 + 0.6 * settle)
          })`;
          currentBrightness = -1;
          const glyph =
            ASCII_CHARS[
              (x * 31 + y * 17 + decode.tick * 7) % ASCII_CHARS.length
            ];
          ctx.fillText(glyph, x * CELL_WIDTH, y * CELL_HEIGHT);
          continue;
        }
        if (x >= headX - DECODE_BAND - DECODE_GLOW) {
          const { alpha } = cellColor(brightness, theme);
          glowCells.push([x, y, charIndex, alpha]);
          continue;
        }
        if (brightness !== currentBrightness) {
          const { red, green, blue, alpha } = cellColor(brightness, theme);
          ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
          currentBrightness = brightness;
        }
        ctx.fillText(ASCII_CHARS[charIndex], x * CELL_WIDTH, y * CELL_HEIGHT);
      }

      for (const [x, y, charIndex, brightness] of frame.sparkles) {
        if (x < fromColumn || x >= headX - DECODE_BAND) continue;
        const { red, green, blue, alpha } = cellColor(brightness, theme);
        ctx.fillStyle = `rgba(${clamp(red + sparkleShift, 0, 255)}, ${clamp(green + sparkleShift, 0, 255)}, ${clamp(blue + sparkleShift, 0, 255)}, ${alpha * 0.18})`;
        ctx.fillText(ASCII_CHARS[charIndex], x * CELL_WIDTH + 0.5, y * CELL_HEIGHT);
      }

      if (glowCells.length > 0) {
        // Blurred shadows are slow to draw (Safari most of all), so each
        // glyph's glow is drawn once into a sprite sheet and copied from there.
        const sprites = glowSprites(themeAccent);
        const spriteWidth = sprites.cellWidth / sprites.scale;
        const spriteHeight = sprites.cellHeight / sprites.scale;
        ctx.save();
        for (const [x, y, charIndex, alpha] of glowCells) {
          ctx.globalAlpha = alpha;
          ctx.drawImage(
            sprites.canvas,
            charIndex * sprites.cellWidth,
            0,
            sprites.cellWidth,
            sprites.cellHeight,
            x * CELL_WIDTH - GLOW_PAD,
            y * CELL_HEIGHT - GLOW_PAD,
            spriteWidth,
            spriteHeight,
          );
        }
        ctx.restore();
      }
    };

    // Settled-frame cache: frame index -> offscreen canvas the size of the
    // backing store holding that frame fully painted. A settled frame depends
    // only on the frame data, the backing size and the theme, so it is
    // painted once and copied after that. Under reduced motion the trail is
    // off and only one frame is ever drawn, so the cache is not used.
    let frameCache = [];
    let frameCacheKey = "";
    const clearFrameCache = () => {
      frameCache.forEach(releaseCanvas);
      frameCache = [];
    };
    const cacheUsable = () => {
      if (reducedMotionRef.current) return false;
      if (canvas.width * canvas.height > CACHE_MAX_PIXELS) return false;
      const key = `${canvas.width}x${canvas.height}|${themeRef.current}|${asciiFont}`;
      if (key !== frameCacheKey) {
        clearFrameCache();
        frameCacheKey = key;
      }
      return true;
    };
    const cachedFrame = (index) => {
      if (frameCache[index]) return frameCache[index];
      const cache = document.createElement("canvas");
      cache.width = canvas.width;
      cache.height = canvas.height;
      const cacheContext = cache.getContext("2d");
      if (!cacheContext) return null;
      cacheContext.setTransform(canvasScale, 0, 0, canvasScale, 0, 0);
      paint(cacheContext, index, Infinity, 0, 0);
      frameCache[index] = cache;
      return cache;
    };

    const drawFrame = (index) => {
      const cssWidth = GRID_WIDTH * CELL_WIDTH;
      const cssHeight = gridHeightRef.current * CELL_HEIGHT;
      // Transparent clear, not a --bg fill: the starfield lives beneath this
      // canvas and must show through between the glyphs.
      context.clearRect(0, 0, cssWidth, cssHeight);

      // Entrance sweep head in grid columns; Infinity once settled.
      const decode = decodeRef.current;
      // Overshoot by the glow trail so the final columns pass through the
      // flare instead of snapping straight to settled.
      const headX =
        decode.eased >= 1
          ? Infinity
          : decode.eased * (GRID_WIDTH + DECODE_BAND + DECODE_GLOW);
      if (headX <= 0) return;

      const useCache = cacheUsable();
      if (headX === Infinity) {
        const cache = useCache ? cachedFrame(index) : null;
        if (cache) {
          context.setTransform(1, 0, 0, 1, 0, 0);
          context.drawImage(cache, 0, 0);
          context.setTransform(canvasScale, 0, 0, canvasScale, 0, 0);
        } else {
          paint(context, index, Infinity, 0, 0);
        }
        return;
      }

      // Mid-sweep: columns wholly behind the glow trail look exactly as they
      // will once settled, so copy them from the cache (when it is already
      // warm; painting a cache entry here would cost more than it saves) and
      // paint only the glow and noise bands live. The copy ends on a device
      // pixel so the seam needs no antialiasing.
      const settledColumns = clamp(
        Math.ceil(headX - DECODE_BAND - DECODE_GLOW),
        0,
        GRID_WIDTH,
      );
      const cache = useCache && settledColumns > 0 ? frameCache[index] : null;
      if (cache) {
        const seam = Math.min(
          canvas.width,
          Math.round(settledColumns * CELL_WIDTH * canvasScale),
        );
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.drawImage(cache, 0, 0, seam, canvas.height, 0, 0, seam, canvas.height);
        context.setTransform(canvasScale, 0, 0, canvasScale, 0, 0);
        paint(context, index, headX, settledColumns, seam / canvasScale);
      } else {
        paint(context, index, headX, 0, 0);
      }
    };

    // Paint the settled frames into the cache while waiting for the cue, so
    // the sweep can copy its settled columns instead of drawing them. It stops
    // at the reveal: once the sweep is running, an extra full paint per frame
    // costs more than it saves, and playback fills the rest as it goes.
    const warmFrameCache = async () => {
      for (let index = 0; index < FRAME_COUNT; index += 1) {
        if (!active || revealed || !cacheUsable()) return;
        if (!frameCache[index]) {
          cachedFrame(index);
          await nextSlice();
        }
      }
    };

    const loadFrames = async () => {
      const images = Array.from({ length: FRAME_COUNT }, (_, index) => {
        const image = new Image();
        image.src = `/cheetah-frames/frame_${String(index + 1).padStart(3, "0")}.webp`;
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

      // Process frames in short time slices, yielding to the next animation
      // frame in between. A single synchronous pass over every frame blocks
      // the main thread long enough that the crosshair meteors (which
      // animate top/left on the main thread) skip their opening frames and
      // appear to start mid-screen instead of from the corner. A slow phone
      // still gets one frame per slice; a fast one finishes in fewer
      // animation frames, so the frames are ready before the reveal cue.
      const frames = [];
      const ghosts = [];
      let sliceStart = performance.now();
      for (let index = 0; index < images.length; index += 1) {
        const image = images[index];
        const usable = image.naturalWidth > 0;
        frames.push(usable ? computeFrameCells(image, offscreenContext, gridHeight) : null);
        ghosts.push(usable ? buildGhost(image, ghostReadContext) : null);
        if (performance.now() - sliceStart >= SLICE_BUDGET_MS) {
          await nextSlice();
          if (!active) return;
          sliceStart = performance.now();
        }
      }

      // Hold the reveal until the shared intro gate opens, so the cheetah
      // never appears before the blank-page choreography has started.
      await whenIntroReady();
      if (!active) return;

      framesRef.current = frames;
      ghostsRef.current = ghosts;
      // The pixels are no longer needed; free them now rather than at unmount.
      releaseCanvas(offscreen);
      releaseCanvas(ghostReader);
      sizeCanvas();

      if (reducedMotionRef.current) {
        revealed = true;
        setIsReady(true);
        return;
      }

      // Build the glow sprite sheet now: drawn lazily, its 66 blurred glyphs
      // would land in the first frame of the sweep that reaches the glow.
      glowSprites(accentRef.current);
      warmFrameCache();

      await waterfallCue;
      if (!active) return;

      decodeRef.current = {
        started: performance.now() + DECODE_DELAY_MS,
        eased: 0,
        tick: 0,
      };
      revealed = true;
      needsRedrawRef.current = true;
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
      const width = Math.round(GRID_WIDTH * CELL_WIDTH * scale);
      const height = Math.round(gridHeight * CELL_HEIGHT * scale);
      // Assigning a canvas dimension reallocates and wipes it even when the
      // value is unchanged, so leave a canvas that is already the right size.
      if (scale === canvasScale && width === canvas.width && height === canvas.height) {
        return;
      }
      canvas.width = width;
      canvas.height = height;
      context.setTransform(scale, 0, 0, scale, 0, 0);
      canvasScale = scale;
      needsRedrawRef.current = true;
    };

    const resizeObserver = new ResizeObserver(() => {
      sizeCanvas();
    });
    resizeObserver.observe(canvas);

    // Nothing is painted while the canvas is still hidden ahead of its
    // reveal, or while it is scrolled out of view (the cheetah docks into
    // the page flow on routes that scroll).
    let revealed = false;
    let onScreen = true;
    const intersectionObserver =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver((entries) => {
            const entry = entries[entries.length - 1];
            if (!entry) return;
            onScreen = entry.isIntersecting;
            if (onScreen) needsRedrawRef.current = true;
          })
        : null;
    intersectionObserver?.observe(canvas);

    loadFrames();

    const render = (time) => {
      if (!active) return;
      frameRef.current = requestAnimationFrame(render);

      const frames = framesRef.current;
      if (frames.length === 0 || !revealed || !onScreen) return;

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = time;
      }

      const decode = decodeRef.current;
      if (decode.eased < 1 && time - lastDrawRef.current >= SWEEP_MIN_FRAME_MS) {
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
        drawFrame(frameIndexRef.current);
        needsRedrawRef.current = false;
        lastDrawRef.current = time;
      }
    };

    frameRef.current = requestAnimationFrame(render);

    return () => {
      active = false;
      motionQuery.removeEventListener("change", onMotionChange);
      window.clearTimeout(waterfallTimer);
      if (onWaterfallCue) {
        window.removeEventListener(WATERFALL_LEAD_EVENT, onWaterfallCue);
        window.removeEventListener(WATERFALL_DONE_EVENT, onWaterfallCue);
      }
      resizeObserver.disconnect();
      intersectionObserver?.disconnect();
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      lastTimeRef.current = 0;
      framesRef.current = [];
      ghostsRef.current.forEach(releaseCanvas);
      ghostsRef.current = [];
      clearFrameCache();
      releaseCanvas(glowSheet?.canvas);
      glowSheet = null;
      releaseCanvas(offscreen);
      releaseCanvas(ghostReader);
      // Drop a sweep cut off mid-way, so a remount starts from a clean state.
      decodeRef.current = { started: 0, eased: 1, tick: 0 };
      setIsReady(false);
      setInstantReveal(false);
    };
  }, [showsCheetah]);

  if (!showsCheetah) {
    return null;
  }

  return (
    <section
      className="gif-ascii-block"
      aria-label="ASCII animation experiment"
      onClick={() =>
        setTheme(
          (current) => THEMES[(THEMES.indexOf(current) + 1) % THEMES.length],
        )
      }
    >
      <canvas
        ref={canvasRef}
        className={`gif-ascii-canvas${isReady ? " is-ready" : ""}${
          instantReveal ? " is-instant" : ""
        }`}
      />
    </section>
  );
}
