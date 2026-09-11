/**
 * recipe-hotspots.js
 * -------------------------------------------------
 * Powers the "recipeImage" post block (see build.js): a photo with
 * clickable hotspots over individual food/drink items, each surfacing a
 * quick recipe in a popover. No-ops entirely on pages without any
 * .recipe-hotspot elements.
 * -------------------------------------------------
 */
(function () {
  const hotspots = document.querySelectorAll(".recipe-hotspot");
  if (!hotspots.length) return;

  const popover = document.createElement("div");
  popover.className = "recipe-popover";
  popover.hidden = true;
  popover.innerHTML = `
    <button type="button" class="recipe-popover-close" aria-label="Close recipe">&times;</button>
    <p class="recipe-popover-title"></p>
    <h4>Ingredients</h4>
    <ul class="recipe-popover-ingredients"></ul>
    <h4>Steps</h4>
    <ol class="recipe-popover-steps"></ol>
  `;
  document.body.appendChild(popover);

  const titleEl = popover.querySelector(".recipe-popover-title");
  const ingredientsEl = popover.querySelector(".recipe-popover-ingredients");
  const stepsEl = popover.querySelector(".recipe-popover-steps");
  const closeBtn = popover.querySelector(".recipe-popover-close");

  let activeHotspot = null;

  // Recipe text arrives raw (see build.js's recipeImage renderer) — it's
  // only ever been through JSON encoding + HTML-attribute escaping so far,
  // neither of which protects against it being read as markup once it's
  // actually inserted below, so escape it here at the point of use.
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function positionPopover(hotspot) {
    const rect = hotspot.getBoundingClientRect();
    const popRect = popover.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;

    let left = rect.left + window.scrollX + rect.width / 2 - popRect.width / 2;
    left = Math.max(16, Math.min(left, window.scrollX + viewportWidth - popRect.width - 16));

    popover.style.left = `${left}px`;
    popover.style.top = `${rect.bottom + window.scrollY + 10}px`;
  }

  function openRecipe(hotspot) {
    let recipe;
    try {
      recipe = JSON.parse(hotspot.dataset.recipe);
    } catch (err) {
      return;
    }

    titleEl.textContent = recipe.title || "";
    ingredientsEl.innerHTML = (recipe.ingredients || []).map((i) => `<li>${escapeHtml(i)}</li>`).join("");
    stepsEl.innerHTML = (recipe.steps || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("");

    popover.hidden = false;
    activeHotspot = hotspot;
    positionPopover(hotspot);
  }

  function closeRecipe() {
    popover.hidden = true;
    activeHotspot = null;
  }

  hotspots.forEach((hotspot) => {
    hotspot.addEventListener("click", (e) => {
      e.stopPropagation();
      if (activeHotspot === hotspot && !popover.hidden) {
        closeRecipe();
      } else {
        openRecipe(hotspot);
      }
    });
  });

  closeBtn.addEventListener("click", closeRecipe);

  document.addEventListener("click", (e) => {
    if (!popover.hidden && !popover.contains(e.target) && !e.target.closest(".recipe-hotspot")) {
      closeRecipe();
    }
  });

  window.addEventListener("resize", () => {
    if (activeHotspot) positionPopover(activeHotspot);
  });
})();
