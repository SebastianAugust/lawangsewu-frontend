// Tags the document with `low-end` on cheap tablets so the motion system can
// dial itself back (see the `.low-end` block in index.css). Detection only
// ever changes animation cost — layout, colours and behaviour are identical
// either way, so a false positive is harmless.
//
// `ls_low_end` in localStorage forces the answer ("1" / "0"), which is how you
// exercise the reduced path on a dev machine without CPU throttling.

export function isLowEndDevice() {
  try {
    const forced = localStorage.getItem("ls_low_end");
    if (forced === "1") return true;
    if (forced === "0") return false;
  } catch {
    // Private mode / storage disabled — fall through to feature detection.
  }

  const cores = navigator.hardwareConcurrency;
  const memory = navigator.deviceMemory; // Chromium only, rounded to a power of 2
  return (typeof memory === "number" && memory <= 2) ||
    (typeof cores === "number" && cores <= 4);
}

export function applyLowEndMode() {
  if (isLowEndDevice()) document.documentElement.classList.add("low-end");
}
