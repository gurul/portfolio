// Touch-first devices get the lighter version of the page: no starfield and
// no live WebGPU sun (the CSS sun stays whole). On iOS Safari the end of the
// full-screen starfield fade alone froze the page for ~120 ms, right as the
// cheetah arrived. Keep this in step with the matching @media block in
// globals.css.
export const PHONE_QUERY = "(hover: none) and (pointer: coarse)";

export function isPhone() {
  return window.matchMedia(PHONE_QUERY).matches;
}
