// Single gate for the intro choreography. The crosshair meteors, sun and
// horse all hold blank until this resolves, so the sequence starts from a
// blank page and plays identically on every load instead of racing the
// stylesheet, fonts and frame downloads.
let readyPromise = null;

export function whenIntroReady() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (!readyPromise) {
    readyPromise = new Promise((resolve) => {
      const arm = () => {
        // Double rAF so the blank pre-animation state paints at least once
        // before the class flips and the sequence begins.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            document.documentElement.classList.add("intro-ready");
            resolve();
          });
        });
      };

      const fontsReady = document.fonts?.ready ?? Promise.resolve();
      fontsReady.then(arm, arm);
    });
  }

  return readyPromise;
}
