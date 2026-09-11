// post-links.js
// -------------------------------------------------
// Drives the hover/tap preview card for internal cross-reference links
// (build.js's "postLink" run type, rendered as <a class="post-link">).
// Only loaded on individual post pages (see templates/partials/footer.html).
//
// Desktop (hover-capable): hovering a .post-link shows the card; clicking
// the link navigates normally, no extra handling needed.
// Touch: tapping a .post-link shows the card instead of navigating; the
// "Read post →" control inside the card is the only thing that navigates.
// Tapping/clicking anywhere else dismisses the card.
//
// Card content (thumbnail, title, excerpt, series badge) is fetched from
// posts-index.json — build.js only resolves the slug to a URL, so nothing
// about the referenced post is duplicated into this page's HTML.
// -------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
  const links = document.querySelectorAll(".post-link");
  if (links.length === 0) return;

  let posts = [];
  try {
    const res = await fetch("../posts-index.json");
    if (!res.ok) throw new Error("Failed to load posts-index.json");
    posts = await res.json();
  } catch (err) {
    console.error("post-links.js: could not load posts-index.json", err);
    return; // links still navigate normally, just no preview card
  }

  const postsBySlug = new Map(posts.map((p) => [p.slug, p]));
  const isHoverCapable = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const card = document.createElement("div");
  card.className = "post-link-preview";
  card.hidden = true;
  card.innerHTML = `
    <div class="post-link-preview-media"></div>
    <div class="post-link-preview-body">
      <span class="post-link-preview-series" hidden></span>
      <h4 class="post-link-preview-title"></h4>
      <p class="post-link-preview-excerpt"></p>
      <a class="post-link-preview-cta">Read post &rarr;</a>
    </div>`;
  document.body.appendChild(card);

  const mediaEl = card.querySelector(".post-link-preview-media");
  const seriesEl = card.querySelector(".post-link-preview-series");
  const titleEl = card.querySelector(".post-link-preview-title");
  const excerptEl = card.querySelector(".post-link-preview-excerpt");
  const ctaEl = card.querySelector(".post-link-preview-cta");

  let activeLink = null;
  let hideTimer = null;

  function populateCard(post) {
    mediaEl.innerHTML = post.heroImage && post.heroImage.src
      ? `<img src="${post.heroImage.src}" alt="${post.heroImage.alt || ""}">`
      : `<div class="img-placeholder" role="img" aria-label="Post image placeholder">Image</div>`;

    if (post.series) {
      seriesEl.hidden = false;
      seriesEl.textContent = post.series.title;
    } else {
      seriesEl.hidden = true;
      seriesEl.textContent = "";
    }

    titleEl.textContent = post.title;
    excerptEl.textContent = post.excerpt;
    ctaEl.setAttribute("href", `${post.slug}.html`);
  }

  function positionCard(link) {
    const rect = link.getBoundingClientRect();
    const cardWidth = card.offsetWidth || 300;
    const maxLeft = window.scrollX + document.documentElement.clientWidth - cardWidth - 16;
    const left = Math.max(16, Math.min(rect.left + window.scrollX, maxLeft));
    const top = rect.bottom + window.scrollY + 8;
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  }

  function showCard(link, post) {
    activeLink = link;
    populateCard(post);
    card.hidden = false;
    positionCard(link); // after unhiding, so offsetWidth is accurate
    link.setAttribute("aria-expanded", "true");
  }

  function hideCard() {
    if (!activeLink) return;
    activeLink.setAttribute("aria-expanded", "false");
    activeLink = null;
    card.hidden = true;
  }

  links.forEach((link) => {
    const post = postsBySlug.get(link.dataset.postSlug);
    if (!post) return; // build.js already warned at build time

    link.setAttribute("aria-haspopup", "true");
    link.setAttribute("aria-expanded", "false");

    if (isHoverCapable) {
      const open = () => {
        clearTimeout(hideTimer);
        showCard(link, post);
      };
      const scheduleClose = () => {
        hideTimer = setTimeout(hideCard, 150);
      };
      link.addEventListener("mouseenter", open);
      link.addEventListener("focus", open);
      link.addEventListener("mouseleave", scheduleClose);
      link.addEventListener("blur", scheduleClose);
      card.addEventListener("mouseenter", () => clearTimeout(hideTimer));
      card.addEventListener("mouseleave", scheduleClose);
      // Clicking navigates via the link's normal href — nothing to wire up.
    } else {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        showCard(link, post);
      });
    }
  });

  // Dismiss on tap/click outside the card and outside the active link —
  // matters most on touch, since that's the only mode where the card can
  // be left open without the pointer still hovering something.
  document.addEventListener("click", (e) => {
    if (!activeLink) return;
    if (card.contains(e.target) || activeLink.contains(e.target)) return;
    hideCard();
  });
});
