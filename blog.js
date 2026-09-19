// blog.js
// Drives the homepage: populates the hero's masthead typewriter meta line,
// the featured-post card, and a "sneak peek of other sections" preview
// strip — one representative post per section, so a first-time visitor
// sees the site's range without leaving the page. The full searchable/
// sortable library lives on /blog (see blog-page.js); this script only
// teases it and links out via the "Browse the Blog" button in index.html.

document.addEventListener("DOMContentLoaded", async () => {
  const mastheadMeta = document.getElementById("masthead-meta");
  const featuredContainer = document.getElementById("featured-post");
  const sectionsPreview = document.getElementById("blog-sections-preview");
  // Update this when introducing new categories, in ALPHABETICAL order —
  // also fixes the order the "other sections" preview strip fills in.
  const ALL_CATEGORIES = [
    "Entertainment", "Fashion", "Finance", "Food", "Health", "Lifestyle", "Spirituality", "Web Dev"
  ];

  if (!featuredContainer) return;

  let posts = [];
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  try {
    const res = await fetch("posts-index.json");
    if (!res.ok) throw new Error("Failed to load posts-index.json");
    posts = await res.json();
  } catch (err) {
    featuredContainer.innerHTML = "";
    if (sectionsPreview) {
      sectionsPreview.innerHTML = `<p class="zine-empty-state">Couldn't load posts. Run "node build.js" to generate posts-index.json.</p>`;
    }
    console.error(err);
    document.documentElement.classList.remove("hash-loading");
    return;
  }

  // posts-index.json is sorted newest-first by build.js — Issue No. is
  // oldest post = Issue No. 01, newest = Issue No. N — fixed per post
  // (not per position), matching every other page's numbering.
  const issueNumbers = new Map(posts.map((p, i) => [p.slug, posts.length - i]));
  const featured = posts[0];
  const rest = posts.slice(1);

  // Hero masthead meta line — the whole row (today's date through the
  // section count) types in as one line, then the separators get their
  // subtle .meta-sep color swapped in as a final polish pass (typing has
  // to happen as plain text — there's no clean way to type character-by-
  // character into markup with inline spans). Waiting for posts data
  // before building any of this (rather than starting immediately on page
  // load) means the FULL final text is known up front, which matters for
  // .meta-ghost below: an invisible copy of that full text that reserves
  // the line's width from frame one, so centering it (.masthead-meta's
  // flex justify-content) never has to recalculate as it types in — the
  // animated text (.meta-live) is absolutely positioned on top of the
  // ghost rather than sized by its own (changing) content, so its start
  // position never shifts either.
  if (mastheadMeta) {
    const todayStr = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const sectionCount = new Set(posts.flatMap((p) => p.tags || [])).size;
    const restParts = [`Vol. ${posts.length}`, `${sectionCount} Sections`];
    const fullText = [todayStr, ...restParts].join(" · ");
    const fullHtml = [todayStr, ...restParts].join(' <span class="meta-sep">&middot;</span> ');

    // The typewriter needs .meta-stack's white-space:nowrap to type in
    // place — there's no room for that on a phone screen, so below 640px
    // (matching .masthead-meta's mobile breakpoint in blog-zine.css) skip
    // the animation and just show the finished line, wrapped and centered
    // like it rendered before the typewriter existed.
    const isNarrowViewport = window.matchMedia("(max-width: 640px)").matches;

    if (prefersReducedMotion || isNarrowViewport) {
      mastheadMeta.innerHTML = fullHtml;
    } else {
      mastheadMeta.innerHTML = `
        <span class="meta-stack">
          <span class="meta-ghost" aria-hidden="true">${fullText}</span>
          <span class="meta-live"><span id="type-line"></span><span class="cursor">|</span></span>
        </span>`;

      const typeEl = document.getElementById("type-line");
      const cursorEl = mastheadMeta.querySelector(".cursor");
      let i = 0;
      (function typeChar() {
        if (i < fullText.length) {
          typeEl.textContent += fullText.charAt(i);
          i++;
          setTimeout(typeChar, 25); // adjust typing speed here
        } else {
          // swap in the styled separators now that typing (plain text,
          // so it could go character-by-character) has finished
          typeEl.innerHTML = fullHtml;
          // pause on the completed line, then fade cursor out
          setTimeout(() => {
            cursorEl.style.transition = "opacity 0.4s ease";
            cursorEl.style.animation = "none";
            cursorEl.style.opacity = "0";
          }, 600);
        }
      })();
    }
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  function issueLabel(post) {
    return `Issue No. ${String(issueNumbers.get(post.slug)).padStart(2, "0")}`;
  }

  function featureHtml(post) {
    const imgTag = post.heroImage && post.heroImage.src
      ? `<img src="${post.heroImage.src}" alt="${post.heroImage.alt || ""}">`
      : `<div class="img-placeholder" role="img" aria-label="Post image placeholder">Image</div>`;

    const tags = (post.tags || [])
      .map((t) => `<li class="tag">${t}</li>`)
      .join("");

    return `
      <article class="zine-feature fade-section">
        <div class="zine-feature-media">${imgTag}</div>
        <div class="zine-feature-body">
          <p class="zine-byline">${issueLabel(post)}</p>
          <h3 class="zine-feature-title"><a href="blog/${post.slug}.html">${post.title}</a></h3>
          <p class="zine-series"> ${post.series ? post.series.title : ""} ${post.series ? `Part ${post.series.part}` : ""}</p>
          <p class="zine-feature-excerpt">${post.excerpt}</p>
          <ul class="tag-list">${tags}</ul>
          <div class="zine-feature-meta">
            <span>${formatDate(post.date)}</span>
            <a class="zine-feature-link" href="blog/${post.slug}.html">Read the post &rarr;</a>
          </div>
        </div>
      </article>`;
  }

  function sectionCardHtml(post, tag) {
    const imgTag = post.heroImage && post.heroImage.src
      ? `<img src="${post.heroImage.src}" alt="${post.heroImage.alt || ""}">`
      : `<div class="img-placeholder" role="img" aria-label="Post image placeholder">Image</div>`;

    const tags = (post.tags || [])
      .map((t) => `<li class="tag">${t}</li>`)
      .join("");

    return `
      <article class="zine-card fade-section">
        ${imgTag}
        <p class="zine-byline">${tag}</p>
        <h3><a href="blog/${post.slug}.html">${post.title}</a></h3>
        <p>${post.excerpt}</p>
        <ul class="tag-list">${tags}</ul>
        <div class="zine-feature-meta">
          <span>${formatDate(post.date)}</span>
          <a class="zine-feature-link" href="blog/${post.slug}.html">Read the post &rarr;</a>
        </div>
      </article>`;
  }

  // "Sneak peek of other sections" — one representative post per section,
  // most-recent-first, so the strip never just repeats the featured post
  // above. Each post is used at most once (a post covering three tags
  // fills only its first unclaimed section), and a section is skipped
  // entirely if every one of its posts is already spoken for — sparse by
  // design; it fills in naturally as more posts are added.
  function renderSectionsPreview() {
    if (!sectionsPreview) return;
    const used = new Set(featured ? [featured.slug] : []);
    const cards = [];
    ALL_CATEGORIES.forEach((tag) => {
      const candidate = rest.find((p) => !used.has(p.slug) && (p.tags || []).includes(tag));
      if (!candidate) return;
      used.add(candidate.slug);
      cards.push(sectionCardHtml(candidate, tag));
    });
    sectionsPreview.innerHTML = cards.join("");
    if (window.observeFadeIns) window.observeFadeIns(sectionsPreview);
  }

  // Landing here with a URL hash (e.g. a post page's "../index.html#contact"
  // link) scrolls the browser to that section before this script has
  // finished fetching and inserting the featured post + preview strip. That
  // insert pushes everything below #blog further down the page, so the
  // browser's own one-time scroll lands short — usually stalled right at
  // the hero, since the page's smooth-scroll CSS animates that first
  // attempt and a second smooth scroll fired mid-flight/mid-layout-shift
  // doesn't reliably finish. Force this corrective jump to be instant so it
  // can't fight (or get interrupted by) that in-flight animation — the page
  // stays hidden (see index.html's inline guard script) the whole time, so
  // the reader never sees the hero before landing on the right section.
  // Reveal the page only once this jump (or the decision not to make one)
  // is done.
  function correctHashScroll() {
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      if (target) {
        const html = document.documentElement;
        const prevBehavior = html.style.scrollBehavior;
        html.style.scrollBehavior = "auto";
        target.scrollIntoView();
        html.style.scrollBehavior = prevBehavior;
      }
    }
    document.documentElement.classList.remove("hash-loading");
  }

  if (!featured) {
    featuredContainer.innerHTML = "";
    if (sectionsPreview) {
      sectionsPreview.innerHTML = `<p class="zine-empty-state">No posts yet — add one to /posts and run "node build.js".</p>`;
    }
    correctHashScroll();
    return;
  }

  featuredContainer.innerHTML = featureHtml(featured);
  if (window.observeFadeIns) window.observeFadeIns(featuredContainer);

  renderSectionsPreview();
  correctHashScroll();
});
