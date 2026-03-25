"use client";

import { useEffect, useRef } from "react";

const ASCII_CHARS = " .'`^,:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
const FRAME_COUNT = 43;
const FRAME_DURATION = 1000 / 25;
const BACKGROUND_THRESHOLD = 18;
const CONTRAST = 1.22;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export default function GifAsciiPlayer() {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const imagesRef = useRef([]);
  const frameIndexRef = useRef(0);
  const lastTimeRef = useRef(0);

  useEffect(() => {
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

      const width = 116;
      const height = Math.round((image.naturalHeight / image.naturalWidth) * width * 0.52);
      offscreen.width = width;
      offscreen.height = height;
      canvas.width = width * 8;
      canvas.height = height * 14;

      offscreenContext.clearRect(0, 0, width, height);
      offscreenContext.drawImage(image, 0, 0, width, height);
      const { data } = offscreenContext.getImageData(0, 0, width, height);

      context.fillStyle = "#211d1c";
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
          const alpha = Math.min(1, 0.22 + intensity * 0.82);
          const red = Math.round(120 + intensity * 111);
          const green = Math.round(28 + intensity * 78);
          const blue = Math.round(28 + intensity * 78);

          context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
          context.fillText(char, x * 8, y * 14);

          if (x % 11 === 0 && y % 7 === 0 && brightness > 96) {
            context.fillStyle = `rgba(${Math.min(255, red + 18)}, ${Math.min(255, green + 18)}, ${Math.min(255, blue + 18)}, ${alpha * 0.18})`;
            context.fillText(char, x * 8 + 1, y * 14);
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
  }, []);

  return (
    <section className="gif-ascii-block" aria-label="ASCII animation experiment">
      <canvas ref={canvasRef} className="gif-ascii-canvas" />
    </section>
  );
}
