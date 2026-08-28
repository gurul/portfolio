// Slim runner for the radiance-cascades sun: the example's renderer minus its
// lil-gui controls, pinned to the "web" quality tier (4 rays, 24fps lighting)
// with the final-lighting view. The power-up clock starts when the first
// scene finishes compiling — the moment the canvas becomes visible — and only
// ever runs forward, so the sun charges once and stays powered (resizes
// rebuild the scene but keep the clock). The lighting chain re-renders on its
// own 24fps beat; presentation rides every rAF so resizes stay crisp.
import { surface } from "vgpu";

import {
  createScene,
  destroyScene,
  prepareScene,
  presentScene,
  renderLighting,
  scaledSize,
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
  let scene;
  let scenePrepared = false;
  let sceneGeneration = 0;
  let unsubscribeResize;
  let animationFrame = 0;
  let animationTime = 0;
  let lastTimestamp = 0;
  let lastChainTimestamp = -Infinity;
  let readyReported = false;

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (animationFrame) cancelAnimationFrame(animationFrame);
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

    const next = createScene(gpu, size, DIRECTION_BASE);
    const previous = scene;
    scene = next;
    scenePrepared = false;
    const generation = ++sceneGeneration;
    if (previous) destroyScene(previous);
    void prepareScene(next, canvasSurface.format)
      .then(() => {
        if (disposed || scene !== next || generation !== sceneGeneration) return;
        scenePrepared = true;
        if (!readyReported) {
          readyReported = true;
          onReady?.();
        }
      })
      .catch(() => {
        // A failed compile leaves the CSS sun in charge.
      });
  };

  const tick = (timestamp) => {
    animationFrame = 0;
    if (disposed) return;
    if (!document.hidden && scenePrepared && scene && canvasSurface) {
      const delta =
        lastTimestamp > 0 ? Math.min((timestamp - lastTimestamp) / 1000, 0.1) : 0;
      animationTime += delta;
      const interval = 1000 / FRAMES_PER_SECOND;
      try {
        if (timestamp - lastChainTimestamp >= interval) {
          renderLighting(scene, animationTime, VIEW);
          lastChainTimestamp = timestamp;
        }
        presentScene(scene, canvasSurface, VIEW);
      } catch {
        dispose();
        return;
      }
    }
    lastTimestamp = timestamp;
    animationFrame = requestAnimationFrame(tick);
  };

  void (async () => {
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
    canvasSurface = surface(gpu, canvas, { dpr: [1, 2] });
    rebuildScene();
    unsubscribeResize = canvasSurface.onResize(rebuildScene);
    animationFrame = requestAnimationFrame(tick);
  })();

  return dispose;
}
