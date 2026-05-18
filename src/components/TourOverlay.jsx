import { useEffect, useLayoutEffect, useState } from "react";
import { ChevronRight, X } from "lucide-react";

const PAD = 8;
const ARROW = 12;
const TOOLTIP_W = 360;
const TOOLTIP_H_EST = 180;
const GAP = 14;

/**
 * Returns a target element from a CSS selector, polling every animation
 * frame until found or `running` becomes false. Returns null while
 * waiting.
 */
function useTargetElement(selector, running) {
  const [el, setEl] = useState(null);

  useEffect(() => {
    if (!running || !selector) {
      setEl(null);
      return;
    }

    let raf;
    const tick = () => {
      const found = document.querySelector(selector);
      if (found !== el) setEl(found);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selector, running]);

  return el;
}

/**
 * Returns the bounding rect of `el`, recomputed on scroll/resize and
 * on each animation frame so layout shifts (modal opens, panel collapses)
 * are tracked.
 */
function useElementRect(el) {
  const [rect, setRect] = useState(null);

  useLayoutEffect(() => {
    if (!el) {
      setRect(null);
      return;
    }
    let raf;
    const update = () => {
      const r = el.getBoundingClientRect();
      setRect((prev) => {
        if (
          prev &&
          prev.top === r.top &&
          prev.left === r.left &&
          prev.width === r.width &&
          prev.height === r.height
        )
          return prev;
        return { top: r.top, left: r.left, width: r.width, height: r.height };
      });
      raf = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(raf);
  }, [el]);

  return rect;
}

function computeTooltipPosition(rect, placement, vw, vh) {
  if (!rect || placement === "center") {
    return {
      top: vh / 2 - TOOLTIP_H_EST / 2,
      left: vw / 2 - TOOLTIP_W / 2,
      arrow: null,
    };
  }

  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  let top, left, arrowSide, arrowOffset;

  switch (placement) {
    case "top":
      top = rect.top - TOOLTIP_H_EST - GAP;
      left = cx - TOOLTIP_W / 2;
      arrowSide = "bottom";
      break;
    case "bottom":
      top = rect.top + rect.height + GAP;
      left = cx - TOOLTIP_W / 2;
      arrowSide = "top";
      break;
    case "left":
      top = cy - TOOLTIP_H_EST / 2;
      left = rect.left - TOOLTIP_W - GAP;
      arrowSide = "right";
      break;
    case "right":
      top = cy - TOOLTIP_H_EST / 2;
      left = rect.left + rect.width + GAP;
      arrowSide = "left";
      break;
    default:
      top = rect.top + rect.height + GAP;
      left = cx - TOOLTIP_W / 2;
      arrowSide = "top";
  }

  // Flip placement if tooltip would overflow
  if (placement === "top" && top < 12) {
    top = rect.top + rect.height + GAP;
    arrowSide = "top";
  }
  if (placement === "bottom" && top + TOOLTIP_H_EST > vh - 12) {
    top = rect.top - TOOLTIP_H_EST - GAP;
    arrowSide = "bottom";
  }

  // Clamp to viewport with margin
  const clampedLeft = Math.max(12, Math.min(left, vw - TOOLTIP_W - 12));
  const clampedTop = Math.max(12, Math.min(top, vh - TOOLTIP_H_EST - 12));

  // Arrow offset = where the arrow visually points
  if (arrowSide === "top" || arrowSide === "bottom") {
    arrowOffset = Math.max(20, Math.min(cx - clampedLeft, TOOLTIP_W - 20));
  } else {
    arrowOffset = Math.max(20, Math.min(cy - clampedTop, TOOLTIP_H_EST - 20));
  }

  return { top: clampedTop, left: clampedLeft, arrow: { side: arrowSide, offset: arrowOffset } };
}

/**
 * Renders an SVG-mask backdrop with a hole over `targetRect` (if any),
 * and a tooltip positioned next to it. The hole has pointer-events
 * disabled (via the SVG fill-rule) so users can interact with the
 * highlighted element directly.
 */
function TourOverlay({
  step,
  stepIdx,
  totalSteps,
  onNext,
  onClose,
  isMobile,
}) {
  const target = useTargetElement(step.target, true);
  const rect = useElementRect(target);
  const [vw, setVw] = useState(window.innerWidth);
  const [vh, setVh] = useState(window.innerHeight);

  useEffect(() => {
    const onResize = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Scroll target into view when step changes
  useEffect(() => {
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }
  }, [target]);

  const placement = isMobile ? "center" : step.placement || "bottom";
  const pos = computeTooltipPosition(rect, placement, vw, vh);

  const hasTarget = !!(rect && step.target);
  const isWait = step.mode === "wait";

  return (
    <>
      {/* Backdrop with cutout (SVG mask). pointer-events disabled, so the
          highlighted target is fully interactive. */}
      <svg
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 9998,
        }}
      >
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {hasTarget && (
              <rect
                x={rect.left - PAD}
                y={rect.top - PAD}
                width={rect.width + 2 * PAD}
                height={rect.height + 2 * PAD}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.65)"
          mask="url(#tour-mask)"
        />
        {/* Glow ring around the cutout for visibility */}
        {hasTarget && (
          <rect
            x={rect.left - PAD}
            y={rect.top - PAD}
            width={rect.width + 2 * PAD}
            height={rect.height + 2 * PAD}
            rx="12"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            style={{ filter: "drop-shadow(0 0 8px rgba(245,158,11,0.6))" }}
          />
        )}
      </svg>

      {/* Tooltip */}
      <div
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          width: TOOLTIP_W,
          maxWidth: "calc(100vw - 24px)",
          zIndex: 9999,
        }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 animate-[fadeIn_0.18s_ease-out]"
      >
        {/* Arrow */}
        {pos.arrow && (
          <span
            style={{
              position: "absolute",
              ...(pos.arrow.side === "top" && { top: -ARROW, left: pos.arrow.offset - ARROW }),
              ...(pos.arrow.side === "bottom" && { bottom: -ARROW, left: pos.arrow.offset - ARROW }),
              ...(pos.arrow.side === "left" && { left: -ARROW, top: pos.arrow.offset - ARROW }),
              ...(pos.arrow.side === "right" && { right: -ARROW, top: pos.arrow.offset - ARROW }),
              width: ARROW * 2,
              height: ARROW * 2,
              transform: "rotate(45deg)",
              background: "white",
              borderTop:
                pos.arrow.side === "top" ? "1px solid #e2e8f0" : "none",
              borderLeft:
                pos.arrow.side === "left" ? "1px solid #e2e8f0" : "none",
              borderBottom:
                pos.arrow.side === "bottom" ? "1px solid #e2e8f0" : "none",
              borderRight:
                pos.arrow.side === "right" ? "1px solid #e2e8f0" : "none",
            }}
          />
        )}

        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Step {stepIdx + 1}/{totalSteps}
            </span>
            {isWait && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                Praktek
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition"
            title="Keluar tutorial"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          {step.title && (
            <h3 className="font-display font-bold text-slate-900 text-base mb-1.5">
              {step.title}
            </h3>
          )}
          <p className="text-sm text-slate-700 leading-relaxed">{step.content}</p>
        </div>

        <div className="px-5 pb-4 pt-1 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition"
          >
            Keluar
          </button>
          {!isWait ? (
            <button
              type="button"
              onClick={onNext}
              className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-sm transition flex items-center gap-1.5"
            >
              {stepIdx === totalSteps - 1 ? "Selesai" : "Lanjut"}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
              Lakukan aksi di atas
            </span>
          )}
        </div>
      </div>
    </>
  );
}

export default TourOverlay;
