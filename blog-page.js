// blog-page.js
// -------------------------------------------------
// Drives /blog: the series showcase (auto-generated from posts-index.json's
// per-post "series" field — no manual list to maintain) and the searchable/
// sortable library of every post, rendered as flip "book cards". Only
// loaded on blog/index.html — the homepage's own teaser section still runs
// on the separate, simpler blog.js.
// -------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
  const seriesShowcase = document.getElementById("series-showcase");
  const seriesListEl = document.getElementById("series-list");
  const library = document.getElementById("library");
  const libraryGrid = document.getElementById("library-grid");
  const libraryEmpty = document.getElementById("library-empty");
  const searchInput = document.getElementById("library-search");
  const sortSelect = document.getElementById("library-sort-select");
  const tagFilter = document.getElementById("library-tag-filter");

  if (!libraryGrid) return;

  let posts = [];
  let activeTag = "all";
  let activeSeries = null; // series id, or null for "all"
  let searchTerm = "";
  let sortMode = "newest";

  try {
    const res = await fetch("../posts-index.json");
    if (!res.ok) throw new Error("Failed to load posts-index.json");
    posts = await res.json();
  } catch (err) {
    console.error(err);
    if (libraryEmpty) {
      libraryEmpty.hidden = false;
      libraryEmpty.textContent = 'Couldn\'t load posts. Run "node build.js" to generate posts-index.json.';
    }
    return;
  }

  // Same fixed-per-post numbering as the homepage and every post page —
  // oldest post is Issue No. 01 (posts-index.json is sorted newest-first).
  const issueNumbers = new Map(posts.map((p, i) => [p.slug, posts.length - i]));

  function eyebrowText(post) {
    const issue = `Issue No. ${String(issueNumbers.get(post.slug)).padStart(2, "0")}`;
    return post.series ? `${issue} &middot; Part ${post.series.part}` : issue;
  }

  function renderBookCard(post) {
    const href = `${post.slug}.html`;
    const imageDiv =
      post.heroImage && post.heroImage.src
        ? `<div class="book-card-image" style="background-image:url('${post.heroImage.src}')"></div>`
        : "";
    return `
      <article class="book-card fade-section" data-slug="${post.slug}">
        <div class="book-card-inner" tabindex="0" role="button" aria-label="Flip card for ${post.title}">
          <div class="book-card-face book-card-front">
            ${imageDiv}
            <div class="book-card-scrim"></div>
            <div class="book-card-front-content">
              <p class="book-card-eyebrow">${eyebrowText(post)}</p>
              <h3 class="book-card-title">${post.title}</h3>
            </div>
            <a class="book-card-cta" href="${href}">Read it &rarr;</a>
          </div>
          <div class="book-card-face book-card-back">
            <p class="book-card-eyebrow">${eyebrowText(post)}</p>
            <h3 class="book-card-title">${post.title}</h3>
            <p class="book-card-excerpt">${post.excerpt}</p>
            <a class="book-card-cta" href="${href}">Read it &rarr;</a>
          </div>
        </div>
      </article>`;
  }

  // -------------------------------------------------
  // Series showcase — groups posts-index.json by series.id (no separate
  // series list to maintain by hand: a series appears here automatically
  // the moment a second post carries its id), keeps only series with 2+
  // posts, and orders by whichever series has the most recent post.
  // -------------------------------------------------
  function buildSeriesGroups() {
    const groups = new Map();
    posts.forEach((p) => {
      if (!p.series) return;
      if (!groups.has(p.series.id)) groups.set(p.series.id, []);
      groups.get(p.series.id).push(p);
    });
    return Array.from(groups.values())
      .filter((group) => group.length >= 2)
      .map((group) => ({
        id: group[0].series.id,
        title: group[0].series.title,
        posts: group.slice().sort((a, b) => (a.series.part || 0) - (b.series.part || 0)),
        latestDate: Math.max(...group.map((p) => new Date(p.date).getTime())),
      }))
      .sort((a, b) => b.latestDate - a.latestDate);
  }

  const seriesGroups = buildSeriesGroups();

  function updateUrlSeries(seriesId) {
    const url = new URL(window.location.href);
    if (seriesId) url.searchParams.set("series", seriesId);
    else url.searchParams.delete("series");
    window.history.pushState({}, "", url);
  }

  if (seriesGroups.length === 0) {
    if (seriesShowcase) seriesShowcase.hidden = true;
  } else if (seriesListEl) {
    seriesListEl.innerHTML = seriesGroups
      .map(
        (s) => `
      <div class="series-row">
        <button class="series-title-card fade-section" data-series-id="${s.id}" type="button">
          <h3><i>${s.title}</i></h3>
          <p>${s.posts.length} posts</p>
          <span class="series-jump-hint">Explore series &rarr;</span>
        </button>
        <div class="series-cards-scroll">
          ${s.posts.map(renderBookCard).join("")}
        </div>
      </div>`
      )
      .join("");

    seriesListEl.querySelectorAll(".series-title-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeSeries = btn.dataset.seriesId;
        activeTag = "all";
        searchTerm = "";
        if (searchInput) searchInput.value = "";
        syncTagButtons();
        updateUrlSeries(activeSeries);
        renderLibrary();
        if (library) library.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    if (window.observeFadeIns) window.observeFadeIns(seriesListEl);
  }

  // -------------------------------------------------
  // Tag filter (same circular-button component as the homepage)
  // -------------------------------------------------
  const allTags = Array.from(new Set(posts.flatMap((p) => p.tags || []))).sort();

  function syncTagButtons() {
    if (!tagFilter) return;
    tagFilter.querySelectorAll(".zine-tag-btn").forEach((b) => {
      b.classList.toggle("is-active", !activeSeries && b.dataset.tag === activeTag);
    });
  }

  if (tagFilter) {
    allTags.forEach((tag) => {
      const btn = document.createElement("button");
      btn.className = "zine-tag-btn";
      btn.type = "button";
      btn.dataset.tag = tag;
      btn.innerHTML = `<span class="zine-tag-circle">${tag.charAt(0).toUpperCase()}</span><span class="zine-tag-label">${tag.toLowerCase()}</span>`;
      tagFilter.appendChild(btn);
    });

    tagFilter.addEventListener("click", (e) => {
      const btn = e.target.closest(".zine-tag-btn");
      if (!btn) return;
      activeTag = btn.dataset.tag;
      activeSeries = null;
      updateUrlSeries(null);
      syncTagButtons();
      renderLibrary();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchTerm = e.target.value.trim().toLowerCase();
      if (searchTerm && activeSeries) {
        activeSeries = null;
        updateUrlSeries(null);
        syncTagButtons();
      }
      renderLibrary();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      sortMode = e.target.value;
      renderLibrary();
    });
  }

  function matchesSearch(post) {
    if (!searchTerm) return true;
    const haystack = [post.title, post.excerpt, ...(post.tags || [])].join(" ").toLowerCase();
    return haystack.includes(searchTerm);
  }

  function matchesTag(post) {
    if (activeTag === "all") return true;
    return (post.tags || []).includes(activeTag);
  }

  function matchesSeries(post) {
    if (!activeSeries) return true;
    return post.series && post.series.id === activeSeries;
  }

  function sortPosts(list) {
    const sorted = list.slice();
    if (sortMode === "oldest") {
      sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (sortMode === "title") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortMode === "series") {
      sorted.sort((a, b) => {
        const aTitle = a.series ? a.series.title : "";
        const bTitle = b.series ? b.series.title : "";
        if (aTitle !== bTitle) {
          if (!aTitle) return 1;
          if (!bTitle) return -1;
          return aTitle.localeCompare(bTitle);
        }
        if (a.series && b.series) return (a.series.part || 0) - (b.series.part || 0);
        return new Date(b.date) - new Date(a.date);
      });
    } else {
      sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    return sorted;
  }

  function renderLibrary() {
    const filtered = sortPosts(posts.filter((p) => matchesSearch(p) && matchesTag(p) && matchesSeries(p)));
    libraryGrid.innerHTML = filtered.map(renderBookCard).join("");
    if (window.observeFadeIns) window.observeFadeIns(libraryGrid);
    if (libraryEmpty) {
      libraryEmpty.hidden = filtered.length > 0;
      libraryEmpty.textContent = "No posts match your search or filter.";
    }
  }

  // -------------------------------------------------
  // Book card flip — delegated across both the series rows and the library
  // grid, since cards in either place get rebuilt/re-inserted. The CTA link
  // is excluded so clicking it navigates instead of just flipping the card;
  // it's reachable directly (no flip needed first) once hover/focus reveals
  // it on the front face, and always reachable on the back face.
  // -------------------------------------------------
  document.addEventListener("click", (e) => {
    if (e.target.closest(".book-card-cta")) return;
    const inner = e.target.closest(".book-card-inner");
    if (!inner) return;
    inner.closest(".book-card").classList.toggle("is-flipped");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const inner = e.target.closest(".book-card-inner");
    if (!inner) return;
    e.preventDefault();
    inner.closest(".book-card").classList.toggle("is-flipped");
  });

  // -------------------------------------------------
  // ?series= deep link (e.g. from a homepage side-project card) — pre-
  // filters the library even for a series that doesn't (yet) have the 2+
  // posts needed to appear in the showcase above.
  // -------------------------------------------------
  const seriesParam = new URLSearchParams(window.location.search).get("series");
  if (seriesParam && posts.some((p) => p.series && p.series.id === seriesParam)) {
    activeSeries = seriesParam;
  }

  syncTagButtons();
  renderLibrary();

  if (seriesParam && library) {
    requestAnimationFrame(() => library.scrollIntoView({ block: "start" }));
  }
});
