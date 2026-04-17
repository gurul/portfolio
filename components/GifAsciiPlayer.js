"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const ASCII_CHARS = " .'`^,:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
const FRAME_COUNT = 43;
const FRAME_DURATION = 1000 / 25;
const BACKGROUND_THRESHOLD = 18;
const CONTRAST = 1.45;
const DEFAULT_BG = "#001918";
const STORAGE_KEY = "horse-theme-active";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export default function GifAsciiPlayer() {
  const pathname = usePathname();
  const showsHorse = pathname === "/" || pathname === "/about" || pathname === "/projects";
  const blockRef = useRef(null);
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const imagesRef = useRef([]);
  const frameIndexRef = useRef(0);
  const lastTimeRef = useRef(0);
  const [showScrollCue, setShowScrollCue] = useState(false);
  const [isActivated, setIsActivated] = useState(false);

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
    if (!showsHorse) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const offscreen = document.createElement("canvas");
    const offscreenContext = offscreen.getContext("2d", { willReadFrequently: true });
    if (!offscreenContext) return;

    let active = true;
    let loaded = 0;

    const images = Array.from({ length: FRAME_COUNT }, (_, index) => {
      const image = new Image();
      image.src = `/glitch-horse-frames/frame_${String(index + 1).padStart(3, "0")}.png`;
      image.onload = () => {
        loaded += 1;
      };
      return image;
    });

    imagesRef.current = images;

    const drawAsciiFrame = (image) => {
      if (!image || !image.complete || image.naturalWidth === 0) {
        return;
      }

      const width = 132;
      const height = Math.round((image.naturalHeight / image.naturalWidth) * width * 0.52);
      offscreen.width = width;
      offscreen.height = height;
      canvas.width = width * 8;
      canvas.height = height * 14;

      offscreenContext.clearRect(0, 0, width, height);
      offscreenContext.drawImage(image, 0, 0, width, height);
      const { data } = offscreenContext.getImageData(0, 0, width, height);

      const themeBackground =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--bg")
          .trim() || DEFAULT_BG;
      context.fillStyle = themeBackground;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.font = "11px JetBrains Mono, monospace";
      context.textBaseline = "top";

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = (y * width + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const a = data[index + 3];

          if (a < 30) continue;

          const baseBrightness = luminance(r, g, b);
          const brightness = clamp(
            (baseBrightness - 128) * CONTRAST + 128,
            0,
            255,
          );
          if (brightness < BACKGROUND_THRESHOLD) continue;

          const charIndex = Math.floor((brightness / 255) * (ASCII_CHARS.length - 1));
          const char = ASCII_CHARS[ASCII_CHARS.length - 1 - charIndex];
          const intensity = brightness / 255;
          const alpha = Math.min(1, 0.34 + intensity * 0.78);
          const red = isActivated
            ? Math.round(240 + intensity * 15)
            : Math.round(228 + intensity * 24);
          const green = isActivated
            ? Math.round(228 + intensity * 20)
            : Math.round(224 + intensity * 28);
          const blue = isActivated
            ? Math.round(220 + intensity * 24)
            : Math.round(220 + intensity * 32);

          context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
          context.fillText(char, x * 8, y * 14);

          if (x % 16 === 0 && y % 10 === 0 && brightness > 118) {
            context.fillStyle = `rgba(${Math.min(255, red + 18)}, ${Math.min(255, green + 18)}, ${Math.min(255, blue + 18)}, ${alpha * 0.18})`;
            context.fillText(char, x * 8 + 0.5, y * 14);
          }
        }
      }
    };

    const render = (time) => {
      if (!active) return;

      if (loaded === 0) {
        frameRef.current = requestAnimationFrame(render);
        return;
      }

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = time;
      }

      if (time - lastTimeRef.current >= FRAME_DURATION) {
        frameIndexRef.current = (frameIndexRef.current + 1) % FRAME_COUNT;
        lastTimeRef.current = time;
      }

      drawAsciiFrame(imagesRef.current[frameIndexRef.current]);

      frameRef.current = requestAnimationFrame(render);
    };

    frameRef.current = requestAnimationFrame(render);

    return () => {
      active = false;
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [showsHorse, isActivated]);

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
      <canvas ref={canvasRef} className="gif-ascii-canvas" />
    </section>
  );
}
