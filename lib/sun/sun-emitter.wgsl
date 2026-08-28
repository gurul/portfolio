// The light source for the radiance cascades: one disc at the canvas center,
// sitting exactly under the CSS sun glyph. RGB stores linear HDR radiance;
// alpha is the occluder mask, kept independent of brightness so the disc
// occludes even while barely lit.
//
// POWER-UP — the sun charges over its first few seconds: emission climbs a
// smootherstep ramp while an unsteady surge (two incommensurate sines) makes
// the light gutter like a filament finding its current. The surge amplitude
// dies off as the charge completes, so the powered sun holds steady, carrying
// only a slow breathing swell. There is no loop: once powered, it stays
// powered.

struct SunEmitter {
  size: vec2f,
  time: f32,
  radius: f32,
};

@group(0) @binding(0) var<uniform> sun: SunEmitter;

const CHARGE_SECONDS = 4.5;
const PEAK_EMISSION = 8.5;
const IDLE_EMISSION = 0.06;

fn smootherstep01(value: f32) -> f32 {
  let x = clamp(value, 0.0, 1.0);
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let pixel = uv * sun.size;
  let center = sun.size * 0.5;
  let signed_distance = distance(pixel, center) - sun.radius;
  let mask = 1.0 - smoothstep(-0.8, 0.8, signed_distance);

  let charge = smootherstep01(sun.time / CHARGE_SECONDS);

  // Gutter while charging: the two frequencies never phase-lock, so the
  // surges read as irregular. Amplitude fades to zero with the charge.
  let surge = 0.5 + 0.5 * sin(sun.time * 14.0) * sin(sun.time * 5.7);
  let unsteady = 1.0 - (1.0 - charge) * 0.55 * surge;

  // Once powered: a slow swell, the canvas twin of the CSS sun's breathe.
  let breathe = 1.0 + 0.06 * charge * sin(sun.time * 0.9);

  let emission = mix(IDLE_EMISSION, PEAK_EMISSION, charge * unsteady) * breathe;
  let warm_white = vec3f(emission, emission * 0.985, emission * 0.94);
  return vec4f(warm_white * mask, mask);
}
