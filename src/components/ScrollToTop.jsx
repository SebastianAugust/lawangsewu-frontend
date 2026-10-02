import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

// Every navigation starts at the top of the page.
//
// Most pages scroll the window, but a few scroll an inner element instead
// (the cashier menu list and cart both have their own `overflow-y`), and those
// keep their offset when the element survives a route change. Anything marked
// `data-scroll-reset` is rewound alongside the window, so a page opts in by
// tagging its scroll container rather than by wiring up its own effect.
function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    // Some browsers keep the offset on the scrolling element rather than the
    // window when the page is inside a flex/overflow wrapper.
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;

    document.querySelectorAll("[data-scroll-reset]").forEach((el) => {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    });
  }, [pathname]);

  return null;
}

export default ScrollToTop;
