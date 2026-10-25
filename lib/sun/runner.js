// Slim runner for the radiance-cascades sun: the example's renderer minus its
// lil-gui controls, pinned to the "web" quality tier (4 rays, 24fps lighting)
// with the final-lighting view. The power-up clock starts when the first
// scene finishes compiling — the moment the canvas becomes visible — and only
// ever runs forward, so the sun charges once and stays powered (resizes
// rebuild the scene but keep the clock).
//
// Cost model: the lighting chain (emitter, jump flood, distance field, six
// cascades) runs once per scene, because the sun's brightness is one scalar
// and the field is linear in it. Each 24fps beat then costs a single present
// pass that scales the stored field by the current emission. The loop stops
// while the tab is hidden or the canvas is off screen, and the clock holds.
import { surface } from "vgpu";

import {
  createEffectPool,
  createScene,
  destroyScene,
  prepareScene,
  presentScene,
  renderLighting,
  scaledSize,
  sunEmission,
} from "./simulation";

const VIEW = "final";
const DIRECTION_BASE = 2;
const MAX_SCENE_EDGE = 640;
const FRAMES_PER_SECOND = 24;

/**
 * Starts the radiance-cascades render on `canvas`; returns a teardown
 * function. `onReady` fires once the first scene has compiled — the moment
 * the canvas actually shows light, so the CSS sun knows when to hand over.
 */
export function startSunRadiance(canvas, { onReady } = {}) {
  let disposed = false;
  let gpu;
  let canvasSurface;
  let effectPool;
  let scene;
  let scenePrepared = false;
  let lightingDirty = false;
  let presentDirty = false;
  let sceneGeneration = 0;
  let unsubscribeResize;
  let animationFrame = 0;
  let animationTime = 0;
  let lastTimestamp = 0;
  let lastPresentTimestamp = -Infinity;
  let readyReported = false;
  let onScreen = true;
  let observer;

  const running = () =>
    !disposed && !document.hidden && onScreen && scenePrepared;

  const stop = () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    // The next frame after a pause starts with a zero delta, so the clock
    // holds while nothing is visible.
    lastTimestamp = 0;
  };

  const schedule = () => {
    if (!animationFrame && running()) animationFrame = requestAnimationFrame(tick);
  };

  const onVisibility = () => {
    if (document.hidden) stop();
    else schedule();
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    stop();
    document.removeEventListener("visibilitychange", onVisibility);
    observer?.disconnect();
    unsubscribeResize?.();
    gpu?.dispose();
  };

  const rebuildScene = () => {
    if (disposed || !gpu || !canvasSurface) return;
    const size = scaledSize(
      canvasSurface.size[0],
      canvasSurface.size[1],
      1,
      MAX_SCENE_EDGE,
    );
    if (scene?.size[0] === size[0] && scene.size[1] === size[1]) return;

    const next = createScene(gpu, size, DIRECTION_BASE, effectPool);
    const previous = scene;
    scene = next;
    scenePrepared = false;
    const generation = ++sceneGeneration;
    if (previous) destroyScene(previous);
    void prepareScene(next, canvasSurface.format)
      .then(() => {
        if (disposed || scene !== next || generation !== sceneGeneration) return;
        scenePrepared = true;
        lightingDirty = true;
        presentDirty = true;
        if (!readyReported) {
          readyReported = true;
          onReady?.();
        }
        schedule();
      })
      .catch(() => {
        // A failed compile leaves the CSS sun in charge.
      });
  };

  const tick = (timestamp) => {
    animationFrame = 0;
    if (!running() || !scene || !canvasSurface) return;
    const delta =
      lastTimestamp > 0 ? Math.min((timestamp - lastTimestamp) / 1000, 0.1) : 0;
    animationTime += delta;
    lastTimestamp = timestamp;
    const interval = 1000 / FRAMES_PER_SECOND;
    try {
      if (lightingDirty) {
        renderLighting(scene, VIEW);
        lightingDirty = false;
      }
      if (presentDirty || timestamp - lastPresentTimestamp >= interval) {
        presentScene(scene, canvasSurface, VIEW, sunEmission(animationTime));
        lastPresentTimestamp = timestamp;
        presentDirty = false;
      }
    } catch {
      dispose();
      return;
    }
    animationFrame = requestAnimationFrame(tick);
  };

  void (async () => {
    try {
      const { init } = await import("vgpu");
      if (disposed) return;
      let nextGpu;
      try {
        nextGpu = await init();
      } catch {
        // No WebGPU: the CSS sun stays.
        return;
      }
      if (disposed) {
        nextGpu.dispose();
        return;
      }
      gpu = nextGpu;
      effectPool = createEffectPool(gpu);
      canvasSurface = surface(gpu, canvas, { dpr: [1, 2] });
      // A resize reconfigures the canvas, which clears it: repaint on the
      // next frame even when the scene size did not change.
      unsubscribeResize = canvasSurface.onResize(() => {
        presentDirty = true;
        rebuildScene();
        schedule();
      });
      document.addEventListener("visibilitychange", onVisibility);
      if (typeof IntersectionObserver === "function") {
        observer = new IntersectionObserver((entries) => {
          onScreen = entries[entries.length - 1].isIntersecting;
          if (onScreen) schedule();
          else stop();
        });
        observer.observe(canvas);
      }
      rebuildScene();
    } catch {
      // Chunk load, surface or scene setup failed: release the device and
      // leave the CSS sun whole.
      dispose();
    }
  })();

  return dispose;
}
