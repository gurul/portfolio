"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { whenIntroReady } from "../lib/introReady";

const ASCII_CHARS = " .'`^,:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
const FRAME_COUNT = 43;
const FRAME_DURATION = 1000 / 25;
const BACKGROUND_THRESHOLD = 18;
const CONTRAST = 1.45;
const DEFAULT_BG = "#001918";
const STORAGE_KEY = "horse-theme-active";
const GRID_WIDTH = 132;
const CELL_WIDTH = 8;
const CELL_HEIGHT = 14;

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

function cellColor(brightness, activated) {
  const intensity = brightness / 255;
  const alpha = Math.min(1, 0.34 + intensity * 0.9);
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
  const showsHorse = pathname === "/" || pathname === "/about" || pathname === "/projects" || pathname === "/research";
  const blockRef = useRef(null);
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const framesRef = useRef([]);
  const frameIndexRef = useRef(0);
  const lastTimeRef = useRef(0);
  const gridHeightRef = useRef(0);
  const activatedRef = useRef(false);
  const needsRedrawRef = useRef(true);
  const reducedMotionRef = useRef(false);
  const [showScrollCue, setShowScrollCue] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const storedTheme = window.localStorage.getItem(STORAGE_KEY);
      const nextTheme = storedTheme == null ? false : storedTheme !== "true";
      setIsActivated(nextTheme);
      window.localStorage.setItem(STORAGE_KEY, String(nextTheme));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(isActivated));
    } catch {}
  }, [isActivated]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const active = isActivated;

    html.classList.toggle("horse-theme-active", active);
    body.classList.toggle("horse-theme-active", active);

    return () => {
      html.classList.remove("horse-theme-active");
      body.classList.remove("horse-theme-active");
    };
  }, [isActivated]);

  useEffect(() => {
    activatedRef.current = isActivated;
    needsRedrawRef.current = true;
  }, [isActivated]);

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

      const activated = activatedRef.current;
      let currentBrightness = -1;

      for (const [x, y, charIndex, brightness] of frame.cells) {
        if (brightness !== currentBrightness) {
          const { red, green, blue, alpha } = cellColor(brightness, activated);
          context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
          currentBrightness = brightness;
        }
        context.fillText(ASCII_CHARS[charIndex], x * CELL_WIDTH, y * CELL_HEIGHT);
      }

      for (const [x, y, charIndex, brightness] of frame.sparkles) {
        const { red, green, blue, alpha } = cellColor(brightness, activated);
        context.fillStyle = `rgba(${Math.min(255, red + 18)}, ${Math.min(255, green + 18)}, ${Math.min(255, blue + 18)}, ${alpha * 0.18})`;
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
        // Hold the reveal until the shared intro gate opens, so the horse
        // never appears before the blank-page choreography has started.
        whenIntroReady(),
      ]);
      if (!active) return;

      const firstUsable = images.find((image) => image.naturalWidth > 0);
      if (!firstUsable) return;

      const gridHeight = Math.round(
        (firstUsable.naturalHeight / firstUsable.naturalWidth) * GRID_WIDTH * 0.52,
      );
      gridHeightRef.current = gridHeight;

      framesRef.current = images.map((image) =>
        image.naturalWidth > 0
          ? computeFrameCells(image, offscreenContext, gridHeight)
          : null,
      );

      sizeCanvas();
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
      onClick={() => setIsActivated((current) => !current)}
    >
      {showScrollCue ? (
        <span className="gif-ascii-scroll-cue">scroll to continue</span>
      ) : null}
      <canvas
        ref={canvasRef}
        className={`gif-ascii-canvas${isReady ? " is-ready" : ""}`}
      />
    </section>
  );
}
