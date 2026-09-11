/**
 * build.js
 * -------------------------------------------------
 * Reads one JSON file per blog post from /posts/
 * Renders each into a static HTML page using a shared template
 * Also generates posts-index.json (lightweight summary for
 * Home page "latest posts" and Blog index search/filter)
 *
 * Run with: node build.js
 * -------------------------------------------------
 */

const fs = require("fs");
const path = require("path");

const POSTS_DIR = path.join(__dirname, "posts");
const OUTPUT_DIR = path.join(__dirname, "blog");
const TEMPLATES_DIR = path.join(__dirname, "templates");
const PARTIALS_DIR = path.join(TEMPLATES_DIR, "partials");
const INDEX_OUTPUT_PATH = path.join(__dirname, "posts-index.json");
const DEFAULT_TEMPLATE = "standard-article";

// Set once per build (see build()) so renderRuns can resolve postLink slugs
// without threading allPosts through every block renderer's signature —
// same "shared state for one build run" pattern as templateCache below.
let postsForLinkResolution = [];

// -------------------------------------------------
// STEP 1: Render a single "runs" array (the shared
// text-formatting pattern used across paragraph,
// list items, and columns)
// -------------------------------------------------
function renderRuns(runs) {
  return runs
    .map((run) => {
      let text = escapeHtml(run.text);
      if (run.postLink) {
        // Internal cross-reference by slug, not a hardcoded URL — resolved
        // to the real page here at build time. The hover/tap preview card
        // is populated client-side from posts-index.json (see
        // post-links.js), so only the slug needs to exist, not the post's
        // title/excerpt/etc.
        const target = postsForLinkResolution.find((p) => p.slug === run.postLink);
        if (!target) {
          console.warn(`postLink "${run.postLink}" does not match any post slug`);
        }
        text = `<a href="${run.postLink}.html" class="post-link" data-post-slug="${run.postLink}">${text}</a>`;
      } else if (run.link) {
        const relAttr = run.affiliate
          ? ` rel="sponsored nofollow" target="_blank"`
          : "";
        text = `<a href="${run.link}"${relAttr}>${text}</a>`;
        if (run.affiliate) {
          text += `<span class="affiliate-marker" title="Affiliate link">*</span>`;
        }
      }
      if (run.bold) text = `<strong>${text}</strong>`;
      if (run.italic) text = `<em>${text}</em>`;
      return text;
    })
    .join("");
}

// Basic HTML escaping so post text can't accidentally break markup
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// For content embedded inside a single-quoted HTML attribute (the
// recipeImage block's data-recipe JSON) rather than as element text —
// only & and ' need escaping there, so this stays separate from
// escapeHtml above rather than overloading it.
function escapeAttr(str) {
  return str.replace(/&/g, "&amp;").replace(/'/g, "&#39;");
}

// -------------------------------------------------
// STEP 2: Render each block type to HTML
// One function per type, matched by a lookup object
// -------------------------------------------------
// Optional explicit render width (e.g. "200px", "50%") for image blocks that
// shouldn't fill the full article column — a logo or icon example, say.
// Left unset, an image keeps filling its container at 100% as before.
function imageSizeStyle(width) {
  return width
    ? ` style="max-width: ${escapeHtml(String(width))}; margin-left: auto; margin-right: auto;"`
    : "";
}

const blockRenderers = {
  heading: (block) => `<h2 class="post-heading">${escapeHtml(block.text)}</h2>`,

  paragraph: (block) => `<p class="post-paragraph">${renderRuns(block.runs)}</p>`,

  pullquote: (block) => `
    <blockquote class="pullquote">
      <p>${escapeHtml(block.text)}</p>
      ${block.attribution ? `<cite>${escapeHtml(block.attribution)}</cite>` : ""}
    </blockquote>`,

  image: (block) => `
    <figure class="post-image"${imageSizeStyle(block.width)}>
      <img src="${block.src}" alt="${escapeHtml(block.alt)}" />
      ${block.caption ? `<figcaption class="block-caption">${escapeHtml(block.caption)}</figcaption>` : ""}
    </figure>`,

  // "divider": true draws a thin rule between every image in the group
  // (any number of images — the grid just wraps additional ones onto new
  // rows) instead of the default plain gap.
  imageGroup: (block) => `
    <div class="image-group${block.divider ? " image-group--divided" : ""}">
      ${block.images
        .map(
          (img) => `
        <figure${imageSizeStyle(img.width)}>
          <img src="${img.src}" alt="${escapeHtml(img.alt)}" />
          ${img.caption ? `<figcaption class="block-caption">${escapeHtml(img.caption)}</figcaption>` : ""}
        </figure>`
        )
        .join("")}
    </div>`,

  list: (block) => {
    const tag = block.style === "ordered" ? "ol" : "ul";
    const items = block.items
      .map((item) => `<li>${renderRuns(item.runs)}</li>`)
      .join("");
    return `<${tag} class="post-list">${items}</${tag}>`;
  },

  columns: (block) => `
    <div class="post-columns">
      ${block.columns
        .map((col) => `<div class="column">${renderRuns(col.runs)}</div>`)
        .join("")}
    </div>`,

  // Text on one side, one image on the other. "imagePosition" is "left" or
  // "right" (default) — everything else follows the paragraph/image
  // conventions: block.runs for the text side, block.image.{src,alt,caption}
  // for the picture.
  textImage: (block) => {
    const position = block.imagePosition === "left" ? "left" : "right";
    const textHtml = `<div class="text-image-text">${renderRuns(block.runs)}</div>`;
    const imageHtml = `
      <figure class="text-image-figure"${imageSizeStyle(block.image.width)}>
        <img src="${block.image.src}" alt="${escapeHtml(block.image.alt)}" />
        ${block.image.caption ? `<figcaption class="block-caption">${escapeHtml(block.image.caption)}</figcaption>` : ""}
      </figure>`;
    return `
    <div class="text-image-block">
      ${position === "left" ? imageHtml + textHtml : textHtml + imageHtml}
    </div>`;
  },

  // Photo of a meal/dish with clickable hotspots over individual items
  // (block.hotspots: {x, y, label, recipe}, x/y as percentages of the
  // image for CSS positioning). Clicking a hotspot surfaces its quick
  // recipe in a popover (see recipe-hotspots.js) — a "quick search for
  // healthy meals" feature, distinct from the full recipe/description that
  // still runs below the image as normal paragraph/list blocks.
  recipeImage: (block) => {
    const hotspotsHtml = (block.hotspots || [])
      .map((h) => {
        // Recipe text stays raw here — it's only being carried as JSON
        // inside an HTML attribute, not rendered as HTML yet. escapeAttr
        // below handles what THIS layer needs (attribute safety); the
        // client (recipe-hotspots.js) HTML-escapes it once, right before
        // actually inserting it into the popover's markup. Escaping it
        // here too would double-escape (e.g. "&" becoming "&amp;amp;").
        const recipeAttr = escapeAttr(JSON.stringify(h.recipe));
        return `
        <button type="button" class="recipe-hotspot" style="left: ${h.x}%; top: ${h.y}%;" data-recipe='${recipeAttr}' aria-label="View recipe: ${escapeHtml(h.label)}">
          <span class="recipe-hotspot-dot"></span>
        </button>`;
      })
      .join("");

    return `
    <figure class="recipe-image-block">
      <div class="recipe-image-frame">
        <img src="${block.image.src}" alt="${escapeHtml(block.image.alt)}" />
        ${hotspotsHtml}
      </div>
      ${block.image.caption ? `<figcaption class="block-caption">${escapeHtml(block.image.caption)}</figcaption>` : ""}
    </figure>`;
  },

  // Monospace code/schema snippet with a prose "subtext" caption underneath
  // explaining what it shows — for the schema/data-structure asides in
  // posts like drag-race-the-simulation, not for runnable code samples.
  code: (block) => `
    <figure class="post-code">
      <pre class="post-code-block"><code>${escapeHtml(block.code)}</code></pre>
      ${block.caption ? `<figcaption class="block-caption">${escapeHtml(block.caption)}</figcaption>` : ""}
    </figure>`,

  // Mocked-up spreadsheet snippet — not an embed of a real spreadsheet,
  // just a hand-authored table (block.headers + block.rows) styled to look
  // like one, so a post can show example rows/columns without wiring up an
  // actual sheet. Column letters (A, B, C…) and row numbers are generated
  // here purely for the visual, not sourced from the data.
  spreadsheet: (block) => {
    const headers = block.headers || [];
    const rows = block.rows || [];
    const colLetters = headers.map((_, i) => String.fromCharCode(65 + i));
    const lettersRow = `<tr class="post-spreadsheet-letters"><th></th>${colLetters
      .map((l) => `<th>${l}</th>`)
      .join("")}</tr>`;
    const headersRow = `<tr class="post-spreadsheet-headers"><th></th>${headers
      .map((h) => `<th>${escapeHtml(h)}</th>`)
      .join("")}</tr>`;
    const bodyRows = rows
      .map(
        (row, i) => `
      <tr>
        <th class="post-spreadsheet-rownum">${i + 1}</th>
        ${row.map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join("")}
      </tr>`
      )
      .join("");

    return `
    <figure class="post-spreadsheet">
      <div class="post-spreadsheet-scroll">
        <table class="post-spreadsheet-table">
          <thead>${lettersRow}${headersRow}</thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
      ${block.caption ? `<figcaption class="block-caption">${escapeHtml(block.caption)}</figcaption>` : ""}
    </figure>`;
  },

  divider: () => `<hr class="post-divider" />`,

  embed: (block) => `<!-- embed placeholder: ${block.provider} -->`,
};

function renderBlock(block) {
  const renderer = blockRenderers[block.type];
  if (!renderer) {
    console.warn(`No renderer for block type: ${block.type}`);
    return "";
  }
  return renderer(block);
}

function renderBody(bodyBlocks) {
  return bodyBlocks.map(renderBlock).join("\n");
}

// -------------------------------------------------
// STEP 3: Related posts (bottom of every post)
// Every other post, shown — same-tag matches first (most shared tags,
// then newest), then everything else (newest first). One unified sort
// naturally produces "related first, then the rest" without needing to
// treat "has a tag match" and "fallback" as separate cases.
// -------------------------------------------------
function getRelatedPosts(post, allPosts) {
  return allPosts
    .filter((p) => p.slug !== post.slug)
    .map((p) => ({
      post: p,
      sharedCount: p.tags.filter((t) => post.tags.includes(t)).length,
    }))
    .sort((a, b) => {
      if (b.sharedCount !== a.sharedCount) return b.sharedCount - a.sharedCount;
      return new Date(b.post.date) - new Date(a.post.date);
    })
    .map((entry) => entry.post);
}

// Reuses the .zine-card markup/classes from the homepage grid so related
// posts look like part of the same component family, not a new one. The
// "related-card" modifier lets .related-posts-scroll override the grid-only
// border/sizing rules (see blog-zine.css) without fighting their specificity.
function renderRelatedCard(relatedPost, issueNumbers) {
  const num = issueNumbers.get(relatedPost.slug);
  const label = `Issue No. ${String(num).padStart(2, "0")}`;
  const imgTag = relatedPost.heroImage?.src
    ? `<img src="${relatedPost.heroImage.src}" alt="${escapeHtml(relatedPost.heroImage.alt || "")}">`
    : `<div class="img-placeholder" role="img" aria-label="Post image placeholder">Image</div>`;
  const tags = relatedPost.tags
    .map((t) => `<li class="tag">${escapeHtml(t)}</li>`)
    .join("");

  return `
      <article class="zine-card related-card">
        ${imgTag}
        <p class="zine-byline">${label}</p>
        <h3><a href="${relatedPost.slug}.html">${escapeHtml(relatedPost.title)}</a></h3>
        <p class="zine-series"> ${relatedPost.series ? escapeHtml(relatedPost.series.title) : ""} ${relatedPost.series ? `Part ${relatedPost.series.part}` : ""}</p>
        <p>${escapeHtml(relatedPost.excerpt)}</p>
        <ul class="tag-list">${tags}</ul>
      </article>`;
}

function renderRelatedPosts(relatedPosts, issueNumbers) {
  if (relatedPosts.length === 0) return "";
  return `
  <section class="related-posts">
    <div class="wrap" style="max-width:900px;">
      <h2 class="section-title">Related Reading</h2>
      <div class="related-posts-scroll">
        ${relatedPosts.map((p) => renderRelatedCard(p, issueNumbers)).join("")}
      </div>
    </div>
  </section>`;
}

// -------------------------------------------------
// Series (ongoing content, e.g. devlogs) — separate from tags on purpose:
// tags describe what one post is about, series groups entries of an
// ongoing thing together regardless of what each entry's tags say.
// Ordered by "part" (ascending — devlogs read front-to-back), not date.
// -------------------------------------------------
function getSeriesPosts(post, allPosts) {
  if (!post.series) return [];
  return allPosts
    .filter((p) => p.series && p.series.id === post.series.id && p.slug !== post.slug)
    .sort((a, b) => (a.series.part || 0) - (b.series.part || 0));
}

// Same card component as Related Reading, but labeled by its place in the
// series ("Part N") rather than the site-wide Issue No. — within a devlog,
// episode order is the meaningful number, not overall post recency.
function renderSeriesCard(seriesPost) {
  const label = `Part ${seriesPost.series.part}`;
  const imgTag = seriesPost.heroImage?.src
    ? `<img src="${seriesPost.heroImage.src}" alt="${escapeHtml(seriesPost.heroImage.alt || "")}">`
    : `<div class="img-placeholder" role="img" aria-label="Post image placeholder">Image</div>`;
  const tags = seriesPost.tags
    .map((t) => `<li class="tag">${escapeHtml(t)}</li>`)
    .join("");

  return `
      <article class="zine-card related-card">
        ${imgTag}
        <p class="zine-byline">${label}</p>
        <h3><a href="${seriesPost.slug}.html">${escapeHtml(seriesPost.title)}</a></h3>
        <p>${escapeHtml(seriesPost.excerpt)}</p>
        <ul class="tag-list">${tags}</ul>
      </article>`;
}

function renderSeriesPosts(post, allPosts) {
  if (!post.series) return "";
  const seriesPosts = getSeriesPosts(post, allPosts);
  if (seriesPosts.length === 0) return "";
  return `
  <section class="series-posts">
    <div class="wrap" style="max-width:900px;">
      <h2 class="section-title">More from ${escapeHtml(post.series.title)}</h2>
      <div class="related-posts-scroll">
        ${seriesPosts.map((p) => renderSeriesCard(p)).join("")}
      </div>
    </div>
  </section>`;
}

// -------------------------------------------------
// STEP 4: Load a post's template (by name, from post.template), with the
// shared header/footer/title-section partials already stitched in. Cached
// per name since multiple posts commonly share the same template.
// -------------------------------------------------
const templateCache = {};

function loadTemplate(name, partials) {
  if (templateCache[name]) return templateCache[name];

  const templatePath = path.join(TEMPLATES_DIR, `${name}.html`);
  if (!fs.existsSync(templatePath)) {
    console.warn(`No template file for "${name}" — falling back to "${DEFAULT_TEMPLATE}"`);
    return loadTemplate(DEFAULT_TEMPLATE, partials);
  }

  const raw = fs.readFileSync(templatePath, "utf-8");
  const stitched = raw
    .replace(/{{HEADER}}/g, partials.header)
    .replace(/{{FOOTER}}/g, partials.footer)
    .replace(/{{TITLE_SECTION}}/g, partials.titleSection);

  templateCache[name] = stitched;
  return stitched;
}

// -------------------------------------------------
// STEP 5: Inject rendered content + metadata into the stitched template.
// Template should contain placeholders like {{TITLE}}, {{BODY}}, etc.
// -------------------------------------------------
const DEFAULT_LOCATION = "Grand Rapids, MI, USA";

function renderPost(post, template, allPosts, issueNumbers) {
  const bodyHtml = renderBody(post.body);
  const tagsHtml = post.tags.map((t) => `<span class="tag">${t}</span>`).join("");
  const relatedPostsHtml = renderRelatedPosts(
    getRelatedPosts(post, allPosts),
    issueNumbers
  );
  const seriesPostsHtml = renderSeriesPosts(post, allPosts);
  // Where this post was written from — defaults to home base; a post
  // written while traveling can override it with its own "location".
  const locationText = post.location ? escapeHtml(post.location) : DEFAULT_LOCATION;
  // Issue No. is the same computed number shown everywhere else on the
  // site (homepage grid, Related Reading) — not the post JSON's own
  // "issue" field, so a post never shows two different numbers for itself.
  const issueNumber = String(issueNumbers.get(post.slug)).padStart(2, "0");

  return template
    .replace(/{{TITLE}}/g, escapeHtml(post.title))
    .replace(/{{AUTHOR}}/g, escapeHtml(post.author))
    .replace(/{{DATE}}/g, post.date)
    .replace(/{{TAGS}}/g, tagsHtml)
    .replace(/{{LOCATION}}/g, locationText)
    .replace(/{{ISSUE}}/g, issueNumber)
    .replace(/{{HERO_IMAGE_SRC}}/g, post.heroImage?.src || "")
    .replace(/{{HERO_IMAGE_ALT}}/g, post.heroImage?.alt || "")
    .replace(/{{BODY}}/g, bodyHtml)
    .replace(/{{SERIES_POSTS}}/g, seriesPostsHtml)
    .replace(/{{RELATED_POSTS}}/g, relatedPostsHtml);
}

// -------------------------------------------------
// STEP 6: Main build process
// Two passes: (1) parse every post into memory and sort newest-first, so
// (2) each post's related-posts section can be computed with full
// knowledge of every other post before anything gets written to disk.
// -------------------------------------------------
function build() {
  const partials = {
    header: fs.readFileSync(path.join(PARTIALS_DIR, "header.html"), "utf-8"),
    footer: fs.readFileSync(path.join(PARTIALS_DIR, "footer.html"), "utf-8"),
    titleSection: fs.readFileSync(path.join(PARTIALS_DIR, "title-section.html"), "utf-8"),
  };
  const postFiles = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".json"));

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const allPosts = postFiles.map((filename) => {
    const filePath = path.join(POSTS_DIR, filename);
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  });
  allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
  postsForLinkResolution = allPosts;

  // Issue No. — oldest post is Issue No. 01 — computed once here so
  // related-post cards and each post's own title section match the
  // homepage's client-side numbering (blog.js), same date order.
  const issueNumbers = new Map(
    allPosts.map((p, i) => [p.slug, allPosts.length - i])
  );

  allPosts.forEach((post) => {
    const templateName = post.template || DEFAULT_TEMPLATE;
    const template = loadTemplate(templateName, partials);
    const html = renderPost(post, template, allPosts, issueNumbers);
    const outputPath = path.join(OUTPUT_DIR, `${post.slug}.html`);
    fs.writeFileSync(outputPath, html, "utf-8");
    console.log(`Built: ${outputPath} (template: ${templateName})`);
  });

  const indexEntries = allPosts.map((post) => ({
    slug: post.slug,
    title: post.title,
    date: post.date,
    tags: post.tags,
    excerpt: post.excerpt,
    heroImage: post.heroImage,
    series: post.series || null,
  }));
  fs.writeFileSync(INDEX_OUTPUT_PATH, JSON.stringify(indexEntries, null, 2), "utf-8");
  console.log(`Built posts-index.json with ${indexEntries.length} posts`);
}

build();
