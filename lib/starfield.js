import { effect, frame, init, surface } from "vgpu";

/**
 * A calm starfield for the page background: three layers of tiny gaussian
 * stars — sparse bright, medium, dense faint — each layer drifting at its own
 * slow rate for a hint of parallax, each star twinkling on its own phase.
 * The canvas surface composites premultiplied, so everywhere that isn't a
 * star stays the theme's `--bg`; the stars are the only thing added.
 *
 * When `init()` fails (no WebGPU), startStarfield resolves to a no-op and the
 * flat CSS background stands alone — decoration, never load-bearing.
 */

/** Background work: hold the buffer below native DPR — stars are computed in
 *  CSS-pixel space, so density and size don't change with the cap. */
const DPR_RANGE = [1, 1.5];

const SHADER = /* wgsl */ `
struct Params {
  time: f32,
  scale: f32,
  texel: vec2f,
}
@group(0) @binding(0) var<uniform> params: Params;

fn hash21(p: vec2f) -> f32 {
  var q = fract(p * vec2f(123.34, 456.21));
  q = q + dot(q, q + 45.32);
  return fract(q.x * q.y);
}

fn hash22(p: vec2f) -> vec2f {
  return vec2f(hash21(p), hash21(p + vec2f(19.19, 7.13)));
}

// A star, not a smudge: a tight gaussian core with four diffraction spikes
// pinched hard against the axes. The spikes only bloom on the brightest
// stars, and there is no round halo to soften the point.
fn star_shape(rel: vec2f, size: f32, spike: f32) -> f32 {
  let d = length(rel);
  let core = exp(-(d * d) / (2.0 * size * size));
  let ax = abs(rel.x);
  let ay = abs(rel.y);
  let spikes =
    exp(-ax / (5.0 * size)) * exp(-(ay * ay) / (0.3 * size * size)) +
    exp(-ay / (5.0 * size)) * exp(-(ax * ax) / (0.3 * size * size));
  return core + spikes * spike * 0.55;
}

// One star per grid cell, placed in the cell's middle 60% so its spikes never
// cross into a neighbor. Brightness, size, twinkle rate and phase all hang
// off the same per-cell hashes.
fn star_layer(pixel: vec2f, cell: f32, seed: f32, drift: vec2f, t: f32) -> f32 {
  let p = pixel + drift * t;
  let g = floor(p / cell);
  let rnd = hash22(g * 0.731 + vec2f(seed, seed * 1.37));
  let star_pos = (g + 0.2 + rnd * 0.6) * cell;
  let b = hash21(g + vec2f(seed + 47.0, seed - 31.0));
  let size = mix(0.5, 1.0, fract(b * 9.0));
  // Only the top of the brightness range earns diffraction spikes.
  let spike = smoothstep(0.55, 1.0, b);
  let shape = star_shape(p - star_pos, size, spike);
  // Two incommensurate sines: the product lingers mid-brightness and spikes
  // irregularly, which reads as a true twinkle rather than a metronome.
  let rate = mix(0.8, 3.2, fract(b * 5.0));
  let wave = sin(t * rate + b * 61.0) * sin(t * rate * 0.37 + b * 23.0);
  let twinkle = 0.3 + 0.7 * (0.5 + 0.5 * wave);
  return shape * twinkle * mix(0.18, 1.0, b * b);
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  // CSS-pixel coordinates: star size and spacing hold steady across DPR.
  let pixel = uv / params.texel / max(params.scale, 0.0001);
  var glow = star_layer(pixel, 210.0, 3.1, vec2f(1.4, 0.5), params.time);
  glow = glow + star_layer(pixel, 115.0, 17.7, vec2f(0.9, 0.35), params.time) * 0.6;
  glow = glow + star_layer(pixel, 62.0, 29.3, vec2f(0.55, 0.2), params.time) * 0.35;
  glow = clamp(glow, 0.0, 1.0);
  // Premultiplied white-on-transparent: the theme background is the sky.
  return vec4f(vec3f(glow), glow);
}
`;

/**
 * Starts the starfield on `canvas`; returns a teardown function. Safe to call
 * in environments without WebGPU — it just never draws.
 */
export function startStarfield(canvas) {
  let disposed = false;
  let raf = 0;
  let gpu;

  void (async () => {
    try {
      gpu = await init();
    } catch {
      // No WebGPU: leave the flat CSS background in place.
      return;
    }
    if (disposed) {
      gpu.dispose();
      return;
    }

    const canvasSurface = surface(gpu, canvas, { dpr: DPR_RANGE });
    const deviceScale = () =>
      canvasSurface.size[0] / Math.max(1, canvas.clientWidth);
    const stars = effect(gpu, SHADER, {
      label: "starfield",
      set: {
        params: {
          time: 0,
          scale: deviceScale(),
          texel: canvasSurface.texelSize,
        },
      },
    });

    canvasSurface.onResize(() => {
      stars.set({
        params: { texel: canvasSurface.texelSize, scale: deviceScale() },
      });
    });

    // Manual rAF loop (the docs' equivalent of frameLoop): in this page
    // frameLoop registered but never ticked, while this pattern — also used
    // by the sun runner — renders reliably.
    const started = performance.now();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) return;
      try {
        stars.set({ params: { time: (performance.now() - started) / 1000 } });
        // Surfaces are only drawable inside frame(gpu) — one pass, one submit.
        frame(gpu, (f) => f.pass(canvasSurface, stars));
      } catch {
        // A dead device stops the loop; the flat background takes over.
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    raf = requestAnimationFrame(tick);
  })();

  return () => {
    disposed = true;
    if (raf) cancelAnimationFrame(raf);
    gpu?.dispose();
  };
}
