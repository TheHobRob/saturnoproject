// scroll-fade.js
// -------------------------------------------------
// Fades in ".fade-section" elements (paragraphs, headings, dividers,
// figures/images) as they scroll into view, one block at a time — applied
// per-block rather than per-line/word, which looks choppy at finer
// granularity. Shared by every page (homepage, blog listing, post pages).
//
// Content inserted dynamically after this script's own DOMContentLoaded
// pass (blog.js's featured post + grid cards) won't exist yet for that
// initial scan, so blog.js calls window.observeFadeIns(container) itself
// right after inserting new markup.
// -------------------------------------------------
(function () {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    // Skip the animation for reduced-motion visitors — reveal everything
    // as already visible instead of leaving it faded out with no trigger.
    window.observeFadeIns = function (root) {
      (root || document).querySelectorAll(".fade-section").forEach((el) => el.classList.add("is-visible"));
    };
    document.addEventListener("DOMContentLoaded", () => window.observeFadeIns());
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -15% 0px" }
  );

  function observeFadeIns(root) {
    (root || document).querySelectorAll(".fade-section:not(.is-visible)").forEach((el) => observer.observe(el));
  }

  window.observeFadeIns = observeFadeIns;
  document.addEventListener("DOMContentLoaded", () => observeFadeIns());
})();
