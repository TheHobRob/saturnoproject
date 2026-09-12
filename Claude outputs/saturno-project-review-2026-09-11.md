# The Saturno Project — Site Review
**Date:** September 11, 2026
**Scope:** Layout & design, spelling/copy, SEO, accessibility
**Status:** Findings only — no changes made. Everything below is pending your go-ahead.

This is the first pass in an ongoing reviewer role. Nothing has been edited in the codebase; each item below is a suggestion for you to approve, reject, or modify before I touch anything.

---

## 1. Layout & Design

1. **Visible placeholder copy in production** — `index.html` line 100, the Creator section's photo placeholder literally reads `*Here goes a Photo*`. Every other placeholder on the site (hero images, blog thumbnails) uses a neutral "Image"/"Photo placeholder" label with no visible asterisked note — this one reads like an unfinished to-do left in place.
2. **Tone mismatch in the About section** — `index.html` line 67: "We blend technical precision with creative vision to deliver exceptional digital experiences." This is generic corporate boilerplate sitting right above your Creator bio, which is personal and specific ("whimsical nonsense," the astrology framing). Worth a rewrite pass so the About section matches the site's actual voice — or tell me if that contrast is intentional (a more "brand" register vs. a personal one).
3. **`blog/index.html` is a legacy, unlinked page** — nothing on the live site links to it (the current design treats "Blog" as an anchor on the homepage, not a separate page). It still uses an older masthead layout (Issue No. / "Affiliate Content" / date row) that doesn't match the current single-page design, and it has its own broken links (see SEO §7). Worth deciding: delete it, or fold it into the current design?
4. **`script.js` is dead code** — it powers a homepage carousel (`#carousel-track`, `.carousel-dots`) that no longer exists in `index.html`; the file isn't even loaded there (only `blog.js` is). It's also out of sync with `blog.js` — its masthead line says "Price: One Coffee" vs. `blog.js`'s "Price: (1) Coffee." Recommend removing it once confirmed unused.
5. **Minor copy inconsistency** — the homepage masthead says "Grand Rapids, MI, USA" (`index.html` line 46) while every post page masthead says just "Grand Rapids, MI." Small, but noticeable when clicking between home and a post.
6. **Every image on the site is still a placeholder** — not a bug, just a heads-up that several layouts (the zine feature grid, image groups, text/image split blocks) haven't been visually proven with real photos yet, so some spacing/sizing calls may need revisiting once real images go in.

## 2. Spelling & Copy

1. **Typo** — `posts/my-second-post.json` line 21 (renders into `blog/my-second-post.html` line 59): *"Hello World! This is my **Second hi** official post."* — stray word "hi" and an unnecessary capital on "Second."
2. **Inconsistent emphasis** — the second post's excerpt shouts "**SECOND**" in caps, but the first post's parallel line doesn't emphasize "first" at all. If the caps are a running bit for each post number, it should probably start with the first one too.
3. **Name spelled two ways** — `posts/drag-race-the-simulation.json`: the queens table lists **"Ivy Winters"** (line 47) but the track-records table lists **"Ivy Winter"** (line 75) for what looks like the same contestant.
4. **Heavy emoji density in "My First Post"** — worth a deliberate call, not necessarily a fix: sentences like *"Do I still love this?❣️ Am I capable of staying up to date with technology?💻"* get read aloud by screen readers as the emoji's literal name ("heavy black heart," "laptop computer") interrupting the sentence, and emoji render differently across platforms. If the density is intentional to the voice, that's fine — flagging it so it's a choice rather than a default.
5. **`BRANDING.md` is stale relative to the live site** — it still lists the site title as "The Rob Blog *(placeholder — TBD)*" and the tagline as "Placeholder," even though the site has shipped as "The Saturno Project" with a real tagline. Not a site bug — just means the branding doc hasn't caught up to a decision that's already live.

## 3. SEO

1. **No meta description anywhere** — not on `index.html`, and `build.js`/the post templates never generate one for blog posts either. This directly affects what shows up in Google search snippets.
2. **No Open Graph / Twitter Card tags** (`og:title`, `og:description`, `og:image`, `twitter:card`) — links shared to social media, Slack, or iMessage will show no preview card.
3. **No canonical link tags** on any page.
4. **No favicon** referenced in `<head>` — browser tabs and bookmarks fall back to a generic icon.
5. **No `robots.txt` or `sitemap.xml`** at the project root.
6. **The "Block Type Showcase" reference post ships to production** — `posts/block-type-showcase.json` is a developer demo post ("A reference post demonstrating every content block type... with placeholder content") with a fake `1999-01-19` date, but `build.js` includes it in the real `posts-index.json`. It shows up in the live homepage grid, tag filter, and search, and would get indexed by search engines like a real post. Worth either excluding demo posts from the public feed (e.g., a `draft: true` flag `build.js` respects) or moving it out of `/posts`.
7. **Broken links on `blog/index.html`** — it links to `../legal.html`, `../contact.html`, and `../legal.html#affiliate-disclosure`, none of which exist (the site now uses `index.html#legal` / `index.html#contact` anchors, same as this page's own header nav two lines above). These are real 404s for anyone who lands on this page directly or via search.

## 4. Accessibility

1. **Color contrast fails WCAG AA in light mode** — `styles.css`'s `--steel` token (`#B08F52`) is used for primary nav links, tag pill text, byline/meta text, and footer nav against the `--paper` background (`#F2ECDD`). Measured contrast is **~2.6:1**, well under the 4.5:1 minimum for normal text (and under even the 3:1 large-text/UI threshold). This touches navigation and content on every page. Worth noting: dark mode's equivalent pairing measures **~8.7:1** and is completely fine — this is specifically a light-mode color problem. `--signal` (`#5D6A39`), used for hover states and inline links, measures **~5:1** and passes.
2. **What's already solid** (so nothing gets "fixed" that isn't broken): skip-to-content link, `aria-live` on the search/filter results grid, `aria-label`s on icon-only and placeholder elements, visible `:focus-visible` outlines, `prefers-reduced-motion` support, a decorative logo `alt=""` correctly paired with visible wordmark text, and proper semantic landmarks (header/nav/main/footer). This is a good foundation to build on.
3. The broken-affiliate-messaging issue noted in SEO §7 is also worth fixing in the same pass, since inaccurate disclosure text is a trust/compliance issue, not just a broken link.

---

## Suggested next steps (for your approval — nothing below has been done)

- **Quick fixes** (low-risk, high-value): the "Second hi" typo, the "Ivy Winter(s)" inconsistency, adding a meta description + favicon + basic Open Graph tags, fixing/removing `blog/index.html`'s broken links.
- **Needs your call**: whether to keep `script.js` at all, whether the About-section copy should be rewritten to match voice, whether the emoji density is intentional, what to do with the Block Type Showcase demo post, and how to fix the `--steel` contrast issue (a specific darker hex swap is easy to propose once you confirm you want it changed).

Let me know which of these you'd like me to act on, and I'll come back with the specific diffs before touching any files.
