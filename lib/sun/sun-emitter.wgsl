// The light source for the radiance cascades: one disc at the canvas center,
// sitting exactly under the CSS sun glyph. RGB stores linear HDR radiance;
// alpha is the occluder mask, kept independent of brightness so the disc
// occludes even while barely lit.
//
// The emission level is a single scalar for the whole disc, so the power-up
// curve (charge ramp, gutter, breathe) lives in JS (`sunEmission` in
// simulation.js). Because every later stage is linear in this scalar, the
// runner renders the lighting chain once at a reference level and scales the
// result at present time.

struct SunEmitter {
  size: vec2f,
  emission: f32,
  radius: f32,
};

@group(0) @binding(0) var<uniform> sun: SunEmitter;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let pixel = uv * sun.size;
  let center = sun.size * 0.5;
  let signed_distance = distance(pixel, center) - sun.radius;
  let mask = 1.0 - smoothstep(-0.8, 0.8, signed_distance);
  let emission = sun.emission;
  let warm_white = vec3f(emission, emission * 0.985, emission * 0.94);
  return vec4f(warm_white * mask, mask);
}
