// The root serves the about page in place, so a first visit skips a redirect
// round trip. Its metadata keeps /about as the canonical URL.
export { default, metadata } from "./about/page";

// Segment config is read statically, so it cannot be re-exported.
export const revalidate = 3600;
