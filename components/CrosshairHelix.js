"use client";

import { useEffect, useRef } from "react";

/**
 * The crosshair rails, drawn as a point-cloud DNA double helix instead of the
 * tiled radial-gradient dots they used to be.
 *
 * GEOMETRY — two backbone strands 180° out of phase, joined by base-pair rungs,
 * inside a thin sleeve of ambient dust. All of it lives in the vertex shader:
 * helix math, the spin about the rail's own axis, perspective point sizing,
 * depth shading, the end fade and the cursor swell.
 *
 * UNITS — the camera is set up so one world unit is one device pixel at z = 0
 * (focal === distance), so every constant below is a real on-screen size. The
 * z range is only ±(radius + tube), which makes the projection near enough to
 * orthographic that the rail keeps a constant width down its whole length —
 * what reads as depth is the front/back shading, not foreshortening.
 *
 * MOTION — the draw-in and the ignition flash are still the CSS animations the
 * dotted lines used (`crosshair-draw-*` clip-path + `crosshair-flash`), applied
 * to the canvas itself, so the helix is revealed left-to-right / top-down by
 * the same meteor heads on exactly the same curve. Only the resting texture of
 * the line changed; the choreography is untouched.
 *
 * The GL context is built once in useEffect([]) and every live input — size,
 * theme colour, pointer — is read from a ref inside the rAF loop, so nothing
 * here can rebuild the context. loseContext() is never called.
 */

/* ---------------------------------------------------------------- constants */

/* The rail's own thickness is `--crosshair-rail` in globals.css — it has to be
   wide enough to hold the helix diameter plus the cursor swell without
   clipping either. */

/** Helix radius in CSS px — half the visible width of the coil. Skinny: the
 *  coil is a narrow braid riding the rail, not a wide ribbon. */
const RADIUS_PX = 2.5;
/** Scatter radius around the ideal curve, i.e. how soft each strand reads.
 *  Small — a fine chain, not a fuzzy rope. */
const TUBE_PX = 0.4;
/** CSS px of axis per full turn — the spacing of the twists along the line,
 *  independent of how wide the coil is. */
const PITCH_PX = 42;
/** CSS px between points along one strand, and between ladder rungs. */
const STRAND_STEP_PX = 3.4;
const RUNG_SPACING_PX = 19;
/** Points per rung, endpoints included (they land on the two strands). */
const RUNG_POINTS = 3;
/** Ambient dust, as a share of the two strands' point count. Kept sparse: at
 *  this scale dust reads as fuzz around the chain rather than atmosphere. */
const DUST_SHARE = 0.08;
/** Base point diameter in CSS px, before the per-point seed variation. */
const DOT_PX = 2;

/** The helix runs past both ends of the visible rail so its end fade lands
 *  offscreen — the rail still reaches edge to edge, as the dots did. */
const SPAN_OVERSHOOT = 1.5;
/** Where the dissolve starts, as a share of the half-span. 0.72 * 1.5 = 1.08
 *  of the visible half-length, so it begins just past the viewport edge. */
const END_FADE_START = 0.72;

/** Radians per second of the idle rotation about the rail's own axis. A turn
 *  every ~6s: the coil slides one pitch along its own axis in that time, which
 *  is what a rotating helix looks like from the side. Slower than this and the
 *  motion stops registering at a 42px pitch — the rail just reads as static. */
const SPIN_RATE = 1.05;
/** Travelling radius wobble, 0 leaves the geometry with no time dependence. */
const PULSE = 0.35;
/** Wavelength of that wobble in CSS px, measured along the axis. Fixed in px,
 *  not as a share of the span, so the two rails breathe at the same on-screen
 *  rate however long each one happens to be. */
const PULSE_WAVE_PX = 780;

/** Cursor swell, in CSS px: how far the influence reaches and how hard it
 *  pushes dead centre. The push is small enough to stay inside the rail. */
const REACH_PX = 110;
const PUSH_PX = 3;

const DPR_CAP = 2;
const MAX_POINTS = 60000;
const FALLBACK_COLOR = [1, 1, 1];

/* ------------------------------------------------------------------ shaders */

const VERT = `
precision highp float;

attribute vec4 aInfo;    // x = type (0 strandA, 1 strandB, 2 rung, 3 dust), y = axis 0..1, z = rung fraction, w = seed
attribute vec3 aOffset;  // unit-ball sample, scaled by uTube into device px

uniform vec2  uRes;
uniform float uFocal;
uniform float uDistance;
uniform float uTime;
uniform float uRadius;
uniform float uSpan;
uniform float uEndFade;
uniform float uPitch;
uniform float uTube;
uniform float uDot;
uniform float uSpin;
uniform float uPulse;
uniform float uPulseWave;
uniform float uVertical;
uniform float uScale;      // device pixel ratio
uniform vec3  uColor;
uniform vec2  uCursor;     // pointer in device px from the canvas centre, y up
uniform float uHover;

varying vec3  vColor;
varying float vAlpha;

const float TAU = 6.28318530718;
const float PI  = 3.14159265359;
const float REACH_PX = ${REACH_PX.toFixed(1)};
const float PUSH_PX  = ${PUSH_PX.toFixed(1)};

void main() {
    float type  = aInfo.x;
    float u     = aInfo.y;
    float rungT = aInfo.z;
    float seed  = aInfo.w;

    // The axis is world X. Phase is a function of position along it, so the
    // strands stay one continuous helix and uSpin turns the whole coil about
    // that axis rather than swinging an end into frame.
    float axis  = (u - 0.5) * uSpan;
    float phase = (axis / uPitch) * TAU + uSpin;

    // Every uTime term is multiplied by pulseAmt, so Pulse 0 is genuinely
    // static. The wobble travels along the axis in *pixels*, not in normalised
    // u — keyed to u it would stretch with the rail, so the long horizontal
    // rail and the short vertical one would breathe at visibly different rates.
    float pulseAmt = clamp(uPulse, 0.0, 1.0);
    float breathe  = 1.0 + pulseAmt * 0.22 * sin(uTime * 1.6 - (axis / uPulseWave) * TAU);

    float rad   = uRadius * breathe;

    vec3 basePos;

    if (type < 0.5) {
        basePos = vec3(axis, rad * sin(phase), rad * cos(phase));
    } else if (type < 1.5) {
        float pB = phase + PI;
        basePos = vec3(axis, rad * sin(pB), rad * cos(pB));
    } else if (type < 2.5) {
        float pB = phase + PI;
        vec3 pA3 = vec3(axis, rad * sin(phase), rad * cos(phase));
        vec3 pB3 = vec3(axis, rad * sin(pB), rad * cos(pB));
        basePos = mix(pA3, pB3, rungT);
    } else {
        float dustA = phase * 0.5 + seed * TAU;
        float dustR = rad * (1.15 + 0.55 * sin(seed * 17.0 + uTime * 0.4 * pulseAmt));
        basePos = vec3(axis, dustR * sin(dustA), dustR * cos(dustA));
    }

    // aOffset is a unit-ball sample, so uTube IS the strand radius in px.
    vec3 posCam = basePos + aOffset * uTube;

    // The vertical rail is the same helix stood on end: swap the axis into
    // screen Y. A rotation matrix would do the same for more work.
    if (uVertical > 0.5) {
        posCam.xy = vec2(posCam.y, posCam.x);
    }

    float halfW = max(uRes.x * 0.5, 1.0);
    float halfH = max(uRes.y * 0.5, 1.0);
    float zProj = max(uDistance - posCam.z, 1.0);

    vec2 ndc = vec2(
        (posCam.x * uFocal) / (zProj * halfW),
        (posCam.y * uFocal) / (zProj * halfH)
    );

    // Project before the cursor test: the pointer lives on the screen, so the
    // distance to it has to be measured there too.
    if (uHover > 0.001) {
        vec2 d = ndc * vec2(halfW, halfH) - uCursor;
        float dist = length(d);
        float reach = REACH_PX * uScale;
        if (dist < reach) {
            float f = 1.0 - dist / reach;
            f = f * f * uHover;
            vec2 push = (d / max(dist, 0.0001)) * (PUSH_PX * uScale * f);
            // Screen px back into camera units at this point's depth. zProj is
            // unchanged by an x/y push, so the projection stays exact.
            posCam.xy += push * zProj / uFocal;
            ndc += push / vec2(halfW, halfH);
        }
    }

    gl_Position = vec4(ndc, 0.0, 1.0);

    float size = uDot * uScale * (uFocal / zProj) * (0.72 + 0.56 * seed);
    if (type >= 2.5) { size *= 0.62; }
    gl_PointSize = clamp(size, 1.0, 32.0);

    // Front/back shading across the tube — the near half of the coil reads
    // brighter, which is what makes the double strand legible as 3D.
    float near = clamp(posCam.z / max(uRadius + uTube, 1.0) * 0.5 + 0.5, 0.0, 1.0);
    float depthFade = mix(0.3, 1.0, near);

    // The last stretch dissolves instead of stopping dead. It sits outside the
    // rail, so at rest this costs nothing.
    float halfSpan = uSpan * 0.5;
    float endFade = 1.0 - smoothstep(halfSpan * uEndFade, halfSpan, abs(axis));

    float weight = 0.86;
    if (type >= 1.5 && type < 2.5) { weight = 0.58; }
    if (type >= 2.5)               { weight = 0.32; }

    vColor = uColor;
    vAlpha = depthFade * endFade * weight * breathe;
}
`;

const FRAG = `
precision highp float;

varying vec3 vColor;
varying float vAlpha;

void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float r2 = dot(coord, coord);
    if (r2 > 0.25) discard;

    // The same falloff the dots had: bright core fading softly to transparent.
    float intensity = exp(-r2 * 8.0);
    // Premultiplied — the context is premultipliedAlpha and the blend is
    // additive, so RGB is added as-is. Emitting the unscaled colour would make
    // every alpha term (depth shading, end fade, pulse) invisible.
    float a = clamp(vAlpha * intensity, 0.0, 1.0);
    gl_FragColor = vec4(vColor * a, a);
}
`;

/* ------------------------------------------------------------------ helpers */

/** `--crosshair-dot` is a bare "R, G, B" triplet so the stylesheet can wrap it
 *  in rgba() at any alpha; read it the same way and normalise to 0..1. */
function readRailColor() {
  if (typeof window === "undefined") return FALLBACK_COLOR;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--crosshair-dot")
    .trim();
  const parts = raw.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return FALLBACK_COLOR;
  return [
    Number(parts[0]) / 255,
    Number(parts[1]) / 255,
    Number(parts[2]) / 255,
  ];
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

/* ---------------------------------------------------------------- component */

export default function CrosshairHelix({ orientation = "horizontal" }) {
  const canvasRef = useRef(null);
  const verticalRef = useRef(orientation === "vertical");
  verticalRef.current = orientation === "vertical";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      depth: false,
      antialias: true,
      premultipliedAlpha: true,
    });
    if (!gl) return;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    const program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    gl.useProgram(program);

    const u = (name) => gl.getUniformLocation(program, name);
    const uRes = u("uRes");
    const uFocal = u("uFocal");
    const uDistance = u("uDistance");
    const uTime = u("uTime");
    const uRadius = u("uRadius");
    const uSpan = u("uSpan");
    const uEndFade = u("uEndFade");
    const uPitch = u("uPitch");
    const uTube = u("uTube");
    const uDot = u("uDot");
    const uSpin = u("uSpin");
    const uPulse = u("uPulse");
    const uPulseWave = u("uPulseWave");
    const uVertical = u("uVertical");
    const uScale = u("uScale");
    const uColor = u("uColor");
    const uCursor = u("uCursor");
    const uHover = u("uHover");

    const aInfoLoc = gl.getAttribLocation(program, "aInfo");
    const aOffLoc = gl.getAttribLocation(program, "aOffset");
    const infoBuffer = gl.createBuffer();
    const offBuffer = gl.createBuffer();

    let dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    let spanPx = 0;
    let pointCount = 0;

    /** Point count scales with the rail's length, so the dot spacing on screen
     *  is the same on a short page and a long one. */
    const buildBuffers = (span) => {
      spanPx = span;

      const strandCount = Math.max(2, Math.round(span / (STRAND_STEP_PX * dpr)));
      const rungSteps = Math.max(2, Math.round(span / (RUNG_SPACING_PX * dpr)));
      const dustCount = Math.round(strandCount * 2 * DUST_SHARE);
      const total = Math.min(
        strandCount * 2 + rungSteps * RUNG_POINTS + dustCount,
        MAX_POINTS,
      );
      pointCount = total;

      const info = new Float32Array(total * 4);
      const off = new Float32Array(total * 3);
      let idx = 0;

      const addPoint = (type, axisU, rungT, seed) => {
        if (idx >= total) return;
        info[idx * 4] = type;
        info[idx * 4 + 1] = axisU;
        info[idx * 4 + 2] = rungT;
        info[idx * 4 + 3] = seed;

        // Rejection-sample the unit ball so TUBE_PX is a true tube radius, not
        // the corner-heavy cube a per-axis uniform would give.
        let ox = 0;
        let oy = 0;
        let oz = 0;
        let l2 = 2;
        while (l2 > 1) {
          ox = Math.random() * 2 - 1;
          oy = Math.random() * 2 - 1;
          oz = Math.random() * 2 - 1;
          l2 = ox * ox + oy * oy + oz * oz;
        }
        off[idx * 3] = ox;
        off[idx * 3 + 1] = oy;
        off[idx * 3 + 2] = oz;

        idx++;
      };

      for (let i = 0; i < strandCount; i++) {
        addPoint(0, i / (strandCount - 1), 0, Math.random());
      }
      for (let i = 0; i < strandCount; i++) {
        addPoint(1, i / (strandCount - 1), 0, Math.random());
      }
      for (let s = 0; s < rungSteps; s++) {
        for (let p = 0; p < RUNG_POINTS; p++) {
          addPoint(2, s / (rungSteps - 1), p / (RUNG_POINTS - 1), Math.random());
        }
      }
      while (idx < total) {
        addPoint(3, Math.random(), 0, Math.random());
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, infoBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, info, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, offBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, off, gl.STATIC_DRAW);
    };

    gl.enableVertexAttribArray(aInfoLoc);
    gl.enableVertexAttribArray(aOffLoc);

    const syncSize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return false;

      dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }

      const length = verticalRef.current ? h : w;
      const wanted = length * SPAN_OVERSHOOT;
      // Rebuild only on a real size change, not on every sub-pixel resize tick.
      if (Math.abs(wanted - spanPx) > 24) buildBuffers(wanted);
      return true;
    };

    let color = readRailColor();
    const themeObserver = new MutationObserver(() => {
      color = readRailColor();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const pointer = { x: 0, y: 0, seen: false };
    const onPointerMove = (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.seen = true;
    };
    const onPointerLeave = () => {
      pointer.seen = false;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);

    let raf = 0;
    let spin = 0;
    let lastT = null;

    const loop = (t) => {
      raf = requestAnimationFrame(loop);

      // Reduced motion hides .crosshair outright, which collapses the canvas to
      // zero — nothing to draw, and no buffers to build.
      if (!syncSize() || pointCount === 0) return;

      const dt = lastT === null ? 1 / 60 : Math.min((t - lastT) / 1000, 1 / 15);
      lastT = t;
      spin += SPIN_RATE * dt;

      const distance = 1400 * dpr;

      gl.bindBuffer(gl.ARRAY_BUFFER, infoBuffer);
      gl.vertexAttribPointer(aInfoLoc, 4, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, offBuffer);
      gl.vertexAttribPointer(aOffLoc, 3, gl.FLOAT, false, 0, 0);

      gl.uniform2f(uRes, canvas.width, canvas.height);
      // focal === distance puts one world unit on one device pixel at z = 0.
      gl.uniform1f(uFocal, distance);
      gl.uniform1f(uDistance, distance);
      gl.uniform1f(uTime, t / 1000);
      gl.uniform1f(uRadius, RADIUS_PX * dpr);
      gl.uniform1f(uSpan, spanPx);
      gl.uniform1f(uEndFade, END_FADE_START);
      gl.uniform1f(uPitch, PITCH_PX * dpr);
      gl.uniform1f(uTube, TUBE_PX * dpr);
      gl.uniform1f(uDot, DOT_PX);
      gl.uniform1f(uSpin, spin);
      gl.uniform1f(uPulse, PULSE);
      gl.uniform1f(uPulseWave, PULSE_WAVE_PX * dpr);
      gl.uniform1f(uVertical, verticalRef.current ? 1 : 0);
      gl.uniform1f(uScale, dpr);
      gl.uniform3f(uColor, color[0], color[1], color[2]);

      if (pointer.seen) {
        const rect = canvas.getBoundingClientRect();
        gl.uniform2f(
          uCursor,
          (pointer.x - rect.left) * dpr - canvas.width / 2,
          -((pointer.y - rect.top) * dpr - canvas.height / 2),
        );
        gl.uniform1f(uHover, 1);
      } else {
        gl.uniform1f(uHover, 0);
      }

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, pointCount);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      themeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      // Never call gl.getExtension("WEBGL_lose_context")?.loseContext().
    };
  }, []);

  return (
    <div
      className={`crosshair__line crosshair__line--${
        orientation === "vertical" ? "v" : "h"
      }`}
    >
      <canvas ref={canvasRef} className="crosshair__helix" />
    </div>
  );
}
