// The vgpu agent-radiance-cascades example's simulation, converted to plain
// JS with the site's sun swapped in as the emitter: the ten-dot mark became
// one charging disc (sun-emitter.wgsl). The lighting pipeline is untouched —
// the emitter renders HDR radiance and an occluder mask, a jump-flood pass
// builds a distance field, and six radiance cascades merge top-down into 2D
// global illumination.
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

export function createScene(gpu, requestedSize, directionBase = 2) {
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
      effects: {
        sun: effect(gpu, sunEmitterWgsl),
        jfaInit: effect(gpu, jfaInitWgsl),
        // Uniforms upload immediately, so each encoded pass needs its own effect.
        jfaSteps: jumps.map(() => effect(gpu, jfaPassWgsl)),
        sdfFinalize: effect(gpu, sdfFinalizeWgsl),
        cascade: Array.from({ length: cascadeCount }, () =>
          effect(gpu, radianceCascadeWgsl),
        ),
        present: effect(gpu, presentWgsl),
      },
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
    ...scene.effects.jfaSteps.map((shader) =>
      shader.compile({ colors: [SEED_FORMAT] }),
    ),
    scene.effects.sdfFinalize.compile({ colors: [HDR_FORMAT] }),
    ...scene.effects.cascade.map((shader) =>
      shader.compile({ colors: [HDR_FORMAT] }),
    ),
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

function buildChain(scene, time, view) {
  const { size, effects } = scene;
  const resolved = resolveView(view, scene.cascadeCount);
  const passes = [];

  effects.sun.set({
    sun: {
      size: [size[0], size[1]],
      time,
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

export function renderLighting(scene, time, view) {
  const passes = buildChain(scene, time, view);
  frame(scene.gpu, (currentFrame) => {
    for (const pass of passes) {
      currentFrame.pass({ target: pass.target, clear: [0, 0, 0, 0] }, (encoder) =>
        encoder.draw(pass.effect),
      );
    }
  });
}

export function presentScene(scene, output, view) {
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
      lighting: [0.03575, 0, 0, 0],
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
