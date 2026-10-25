// The vgpu agent-radiance-cascades example's simulation, converted to plain
// JS with the site's sun swapped in as the emitter: the ten-dot mark became
// one charging disc (sun-emitter.wgsl). The lighting pipeline is untouched —
// the emitter renders HDR radiance and an occluder mask, a jump-flood pass
// builds a distance field, and six radiance cascades merge top-down into 2D
// global illumination.
//
// Site change: the emitter is one disc whose brightness is a single scalar,
// and every stage after it is linear in that scalar (the occluder mask does
// not depend on brightness). So the chain renders once per scene at
// REFERENCE_EMISSION, and the power-up curve is applied as a gain at present
// time. The image is the same as re-running the chain every tick, at a
// fraction of the GPU work.
import { effect, frame, sampler, target } from "vgpu";

import jfaInitWgsl from "./jfa-init.wgsl";
import jfaPassWgsl from "./jfa-pass.wgsl";
import presentWgsl from "./present.wgsl";
import radianceCascadeWgsl from "./radiance-cascade.wgsl";
import sdfFinalizeWgsl from "./sdf-finalize.wgsl";
import sunEmitterWgsl from "./sun-emitter.wgsl";

const HDR_FORMAT = "rgba16float";
// Seeds store absolute pixel coordinates, which need f32 precision past 2048.
const SEED_FORMAT = "rgba32float";
const RC_INTERVAL0 = 2;
/** Emitter disc radius as a share of the canvas's short edge — sized to sit
 *  under the core of the CSS sun glyph, so the light reads as coming from it. */
const SUN_RADIUS = 0.06;

// Power-up curve (was in sun-emitter.wgsl). The sun charges over its first few
// seconds: emission climbs a smootherstep ramp while an unsteady surge (two
// incommensurate sines) makes the light gutter like a filament finding its
// current. The surge dies off as the charge completes, so the powered sun
// holds steady, carrying only a slow breathing swell. There is no loop.
const CHARGE_SECONDS = 4.5;
const PEAK_EMISSION = 8.5;
const IDLE_EMISSION = 0.06;
/** The level the lighting chain renders at; present scales from it. */
const REFERENCE_EMISSION = PEAK_EMISSION;
const GLOW_GAIN = 0.03575;

function smootherstep01(value) {
  const x = Math.min(Math.max(value, 0), 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

export function sunEmission(time) {
  const charge = smootherstep01(time / CHARGE_SECONDS);
  const surge = 0.5 + 0.5 * Math.sin(time * 14) * Math.sin(time * 5.7);
  const unsteady = 1 - (1 - charge) * 0.55 * surge;
  const breathe = 1 + 0.06 * charge * Math.sin(time * 0.9);
  const level = charge * unsteady;
  return (IDLE_EMISSION + (PEAK_EMISSION - IDLE_EMISSION) * level) * breathe;
}

/**
 * Effects are size-independent, so one pool serves every scene of a gpu and
 * a resize does not leak a fresh set of uniform buffers. The JFA and cascade
 * lists grow to the longest chain seen; each encoded pass still gets its own
 * effect because uniforms upload immediately.
 */
export function createEffectPool(gpu) {
  return {
    sun: effect(gpu, sunEmitterWgsl),
    jfaInit: effect(gpu, jfaInitWgsl),
    jfaSteps: [],
    sdfFinalize: effect(gpu, sdfFinalizeWgsl),
    cascade: [],
    present: effect(gpu, presentWgsl),
  };
}

function ensureEffects(gpu, pool, jumpCount, cascadeCount) {
  while (pool.jfaSteps.length < jumpCount) pool.jfaSteps.push(effect(gpu, jfaPassWgsl));
  while (pool.cascade.length < cascadeCount) pool.cascade.push(effect(gpu, radianceCascadeWgsl));
  return pool;
}

export function scaledSize(width, height, requestedScale, maxEdge) {
  const scale = Math.min(requestedScale, maxEdge / Math.max(width, height, 1));
  return [
    Math.max(1, Math.round(width * scale)),
    Math.max(1, Math.round(height * scale)),
  ];
}

function resolveView(view, cascadeCount) {
  if (view === "emitters") return { mode: 1, stage: 0, stopAt: cascadeCount };
  if (view === "jfa") return { mode: 4, stage: 1, stopAt: cascadeCount };
  if (view === "sdf") return { mode: 2, stage: 2, stopAt: cascadeCount };
  if (view.startsWith("cascade-")) {
    return {
      mode: 3,
      stage: 3,
      stopAt: Math.min(Number(view.slice(8)), cascadeCount - 1),
    };
  }
  return { mode: 0, stage: 3, stopAt: 0 };
}

export function createScene(gpu, requestedSize, directionBase = 2, pool = createEffectPool(gpu)) {
  const width = Math.max(1, Math.floor(requestedSize[0]));
  const height = Math.max(1, Math.floor(requestedSize[1]));
  const size = [width, height];
  const cascadeCount = Math.min(
    6,
    Math.max(
      5,
      Math.ceil(
        Math.log(1 + (3 * Math.hypot(width, height)) / RC_INTERVAL0) /
          Math.log(4),
      ),
    ),
  );
  const coarsest = 2 ** (cascadeCount - 1);
  const atlas = [
    Math.ceil(width / coarsest) * coarsest * directionBase,
    Math.ceil(height / coarsest) * coarsest * directionBase,
  ];
  const jumpCount = Math.ceil(Math.log2(Math.max(width, height, 2)));
  const jumps = [
    ...Array.from({ length: jumpCount }, (_, index) =>
      Math.max(1, 2 ** (jumpCount - index - 1)),
    ),
    1,
    1,
  ];
  const created = [];
  const own = (resource) => {
    created.push(resource);
    return resource;
  };

  try {
    const emitter = own(target(gpu, { size, format: HDR_FORMAT }));
    const jfa = [
      own(target(gpu, { size, format: SEED_FORMAT })),
      own(target(gpu, { size, format: SEED_FORMAT })),
    ];
    const sdf = own(target(gpu, { size, format: HDR_FORMAT }));
    const cascades = [
      own(target(gpu, { size: atlas, format: HDR_FORMAT })),
      own(target(gpu, { size: atlas, format: HDR_FORMAT })),
    ];
    return {
      gpu,
      size,
      atlas,
      directionBase,
      cascadeCount,
      jumps,
      emitter,
      jfa,
      sdf,
      cascades,
      effects: ensureEffects(gpu, pool, jumps.length, cascadeCount),
      sampler: sampler(gpu, {
        minFilter: "linear",
        magFilter: "linear",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge",
      }),
    };
  } catch (error) {
    try {
      destroyTargets(created);
    } catch {
      // Preserve the allocation error after best-effort rollback.
    }
    throw error;
  }
}

export async function prepareScene(scene, outputFormat) {
  await Promise.all([
    scene.effects.sun.compile({ colors: [HDR_FORMAT] }),
    scene.effects.jfaInit.compile({ colors: [SEED_FORMAT] }),
    ...scene.effects.jfaSteps
      .slice(0, scene.jumps.length)
      .map((shader) => shader.compile({ colors: [SEED_FORMAT] })),
    scene.effects.sdfFinalize.compile({ colors: [HDR_FORMAT] }),
    ...scene.effects.cascade
      .slice(0, scene.cascadeCount)
      .map((shader) => shader.compile({ colors: [HDR_FORMAT] })),
    scene.effects.present.compile({ colors: [outputFormat] }),
  ]);
}

export function destroyScene(scene) {
  destroyTargets([scene.emitter, ...scene.jfa, scene.sdf, ...scene.cascades]);
}

function destroyTargets(targets) {
  let firstError;
  for (let index = targets.length - 1; index >= 0; index--) {
    try {
      targets[index].destroy?.();
    } catch (error) {
      firstError ??= error;
    }
  }
  if (firstError) throw firstError;
}

function buildChain(scene, view) {
  const { size, effects } = scene;
  const resolved = resolveView(view, scene.cascadeCount);
  const passes = [];

  effects.sun.set({
    sun: {
      size: [size[0], size[1]],
      emission: REFERENCE_EMISSION,
      radius: Math.min(size[0], size[1]) * SUN_RADIUS,
    },
  });
  passes.push({ target: scene.emitter, effect: effects.sun });
  if (resolved.stage === 0) return passes;

  effects.jfaInit.set({ emitter: scene.emitter });
  passes.push({ target: scene.jfa[0], effect: effects.jfaInit });
  let seedRead = scene.jfa[0];
  let seedWrite = scene.jfa[1];
  scene.jumps.forEach((jump, index) => {
    const shader = effects.jfaSteps[index];
    shader.set({ jfa: { jump: [jump, 0, 0, 0] }, seeds: seedRead });
    passes.push({ target: seedWrite, effect: shader });
    [seedRead, seedWrite] = [seedWrite, seedRead];
  });
  scene.jfa = [seedRead, seedWrite];
  if (resolved.stage === 1) return passes;

  effects.sdfFinalize.set({ seeds: seedRead });
  passes.push({ target: scene.sdf, effect: effects.sdfFinalize });
  if (resolved.stage === 2) return passes;

  let atlasWrite = scene.cascades[0];
  let atlasRead = scene.cascades[1];
  for (
    let cascade = scene.cascadeCount - 1;
    cascade >= resolved.stopAt;
    cascade--
  ) {
    const shader = effects.cascade[cascade];
    shader.set({
      rc: {
        state: [
          cascade,
          cascade < scene.cascadeCount - 1 ? 1 : 0,
          scene.directionBase,
          0,
        ],
      },
      sdf_tex: scene.sdf,
      sdf_samp: scene.sampler,
      emitter_tex: scene.emitter,
      emitter_samp: scene.sampler,
      upper_tex: atlasRead,
    });
    passes.push({ target: atlasWrite, effect: shader });
    [atlasRead, atlasWrite] = [atlasWrite, atlasRead];
  }
  scene.cascades = [atlasRead, atlasWrite];
  return passes;
}

/** Renders the full chain at REFERENCE_EMISSION. Needed once per scene. */
export function renderLighting(scene, view) {
  const passes = buildChain(scene, view);
  frame(scene.gpu, (currentFrame) => {
    for (const pass of passes) {
      currentFrame.pass({ target: pass.target, clear: [0, 0, 0, 0] }, (encoder) =>
        encoder.draw(pass.effect),
      );
    }
  });
}

/** Presents the stored field lit as if the sun emitted `emission`. */
export function presentScene(scene, output, view, emission) {
  scene.effects.present.set({
    present: {
      display: [
        0.92,
        resolveView(view, scene.cascadeCount).mode,
        48,
        scene.directionBase,
      ],
      // x is the glow gain on the raw irradiance field (site patch in
      // present.wgsl); the example's albedo/ambient floor is gone.
      lighting: [GLOW_GAIN * (emission / REFERENCE_EMISSION), 0, 0, 0],
    },
    cascade_tex: scene.cascades[0],
    emitter_tex: scene.emitter,
    sdf_tex: scene.sdf,
    jfa_tex: scene.jfa[0],
    emitter_samp: scene.sampler,
  });
  frame(scene.gpu, (currentFrame) => {
    // Transparent clear: the present shader emits premultiplied light, and
    // everything it doesn't light stays see-through to the page.
    currentFrame.pass({ target: output, clear: [0, 0, 0, 0] }, (encoder) =>
      encoder.draw(scene.effects.present),
    );
  });
}
