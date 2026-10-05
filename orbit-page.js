// orbit-page.js
// -------------------------------------------------
// Drives orbit/index.html: the cartridge console. Reads projects-index.json
// (built by build.js from /projects/*.json + /orbit/<slug>/manifest.json)
// and renders the console, game book and shelf from one piece of state:
// which slug is plugged in, if any. ?cart=<slug> preloads a cartridge
// (project pages link back with it, so the console is as the player left it).
// Nothing auto-starts — "Start Game" is always a plain link — and the page
// never scrolls on its own; the floating Console button is the shortcut.
// -------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
  const consoleEl = document.getElementById("console");
  const screen = document.getElementById("console-screen");
  const powerLabel = document.getElementById("power-label");
  const dock = document.getElementById("console-dock");
  const book = document.getElementById("game-book");
  const shelf = document.getElementById("shelf");
  const shelfHint = document.getElementById("shelf-hint");
  const shelfEmpty = document.getElementById("shelf-empty");
  const status = document.getElementById("orbit-status");
  const toConsole = document.getElementById("to-console");
  const consoleSection = document.getElementById("console-section");
  const consoleHeading = document.getElementById("console-heading");
  if (!consoleEl || !shelf) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let carts = [];
  let loaded = null; // slug of the plugged-in cartridge, or null

  const esc = (str) =>
    String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Only accept #rrggbb / #rgb so manifest data can't inject CSS.
  const safeColor = (c) => (/^#([0-9a-f]{3}){1,2}$/i.test(c || "") ? c : "");

  const statusText = (cart) => (cart.playable ? cart.status || "Ready" : "Coming soon");

  /* ---------- Console + dock ---------- */

  function renderConsole(cart) {
    consoleEl.dataset.power = cart ? "on" : "off";
    powerLabel.textContent = cart ? "Power on" : "Power off";

    if (!cart) {
      screen.innerHTML = `
        <p class="screen-kicker">Standby</p>
        <p class="screen-standby">Insert a cartridge<span class="screen-cursor" aria-hidden="true">_</span></p>`;
      dock.innerHTML = `<div class="dock-empty">Cartridge slot</div>`;
      return;
    }

    const kicker = [cart.genre, cart.playable ? "Ready to run" : "Coming soon"].filter(Boolean).join(" · ");
    const action = cart.playable
      ? `<a class="screen-btn screen-btn-start" href="${esc(cart.href)}" data-focus="start">${esc(cart.startLabel)}</a>`
      : "";
    screen.innerHTML = `
      <p class="screen-kicker">${esc(kicker)}</p>
      <p class="screen-title">${esc(cart.title)}</p>
      ${cart.playable ? "" : `<p class="screen-note">Not ready to run yet</p>`}
      <div class="screen-actions">
        ${action}
        <button type="button" class="screen-btn" data-eject data-focus="eject" aria-label="Eject ${esc(cart.title)}">Eject</button>
      </div>`;

    const color = safeColor(cart.color);
    dock.innerHTML = `
      <div class="dock-cart" aria-hidden="true"${color ? ` style="--cart:${color}"` : ""}>
        <span class="cart-pins"></span>
        <span class="cart-label"><span class="cart-title">${esc(cart.title)}</span></span>
        <span class="cart-grip"></span>
      </div>`;
  }

  /* ---------- Game book ---------- */

  function renderBook(cart) {
    if (!cart) {
      book.innerHTML = `
        <div class="game-book-page">
          <p class="book-kicker">Game book</p>
          <h3 class="book-title" id="book-title">Nothing inserted</h3>
          <p class="book-hint">Plug a cartridge in from the shelf below to read about it here.</p>
        </div>`;
      return;
    }

    const about = (cart.book?.about || []).map((p) => `<p>${esc(p)}</p>`).join("");
    const controls = cart.book?.controls || [];
    const controlsHtml = controls.length
      ? `<h4 class="book-subhead">How to play</h4>
         <dl class="book-controls">
           ${controls.map((c) => `<div><dt>${esc(c.input)}</dt><dd>${esc(c.how)}</dd></div>`).join("")}
         </dl>`
      : "";
    const devlogHtml = cart.seriesId
      ? `<p class="book-devlog"><a class="contact-btn" href="../blog/index.html?series=${encodeURIComponent(cart.seriesId)}">Read the Devlog &rarr;</a></p>`
      : "";

    book.innerHTML = `
      <div class="game-book-page">
        <p class="book-kicker">${esc([cart.genre, statusText(cart)].filter(Boolean).join(" · "))}</p>
        <h3 class="book-title" id="book-title">${esc(cart.title)}</h3>
        <div class="book-about">${about || `<p>${esc(cart.description)}</p>`}</div>
        ${controlsHtml}
        ${devlogHtml}
      </div>`;
  }

  /* ---------- Shelf ---------- */

  function cartHtml(cart) {
    if (cart.slug === loaded) {
      return `<li><div class="shelf-placeholder">In the console</div></li>`;
    }
    const color = safeColor(cart.color);
    return `
      <li>
        <button type="button" class="cart" data-slug="${esc(cart.slug)}"
          aria-label="Plug in ${esc(cart.title)}${cart.genre ? `, ${esc(cart.genre)}` : ""}, ${esc(statusText(cart))}"
          ${color ? `style="--cart:${color}"` : ""}>
          <span class="cart-pins" aria-hidden="true"></span>
          <span class="cart-label" aria-hidden="true">
            ${cart.genre ? `<span class="cart-genre">${esc(cart.genre)}</span>` : ""}
            <span class="cart-title">${esc(cart.title)}</span>
            ${cart.description ? `<span class="cart-desc">${esc(cart.description)}</span>` : ""}
            <span class="cart-status">${esc(statusText(cart))}</span>
          </span>
          <span class="cart-grip" aria-hidden="true"></span>
        </button>
      </li>`;
  }

  function renderShelf() {
    shelf.innerHTML = carts.map(cartHtml).join("");
    updateHint();
  }

  function updateHint() {
    if (shelfHint) shelfHint.hidden = shelf.scrollWidth <= shelf.clientWidth + 4;
  }

  /* ---------- State ---------- */

  function render() {
    const cart = carts.find((c) => c.slug === loaded) || null;
    renderConsole(cart);
    renderBook(cart);
    renderShelf();
    return cart;
  }

  function syncUrl() {
    const url = new URL(window.location.href);
    if (loaded) url.searchParams.set("cart", loaded);
    else url.searchParams.delete("cart");
    history.replaceState(null, "", url);
  }

  // True while the floating Console button is showing (console off screen).
  let consoleOffScreen = false;

  function insert(slug) {
    const cart = carts.find((c) => c.slug === slug);
    if (!cart) return;
    loaded = slug;
    render();
    syncUrl();
    status.textContent = `${cart.title} plugged in. Console powered on.${cart.playable ? "" : " Coming soon."}`;
    // The clicked cartridge was swapped for a placeholder, so focus needs a
    // new home — without moving the page. If the console is on screen, go to
    // its Start/Eject control; otherwise to the Console button.
    const target = consoleOffScreen && toConsole
      ? toConsole
      : screen.querySelector('[data-focus="start"]') || screen.querySelector('[data-focus="eject"]');
    if (target) target.focus({ preventScroll: true });
  }

  function eject() {
    if (!loaded) return;
    const slug = loaded;
    const cart = carts.find((c) => c.slug === slug);
    const focusWasInConsole = screen.contains(document.activeElement);
    loaded = null;
    render();
    syncUrl();
    status.textContent = `${cart ? cart.title : "Cartridge"} ejected. Console powered off.`;
    // Stay put: keep focus in the console rather than jumping to the shelf.
    if (focusWasInConsole) screen.focus({ preventScroll: true });
  }

  shelf.addEventListener("click", (e) => {
    const btn = e.target.closest(".cart");
    if (btn) insert(btn.dataset.slug);
  });

  /* ---------- Start transition ----------
     Start Game / Open Project: the screen fades to dark, the Saturno logo
     drops in, then the screen grows to fill the window and the browser
     navigates to the project (its page fades in from the same ink).
     Skipped for reduced motion and for Ctrl/Cmd/Shift/middle clicks, so
     "open in new tab" still works like a normal link. */
  let launching = false;
  const play = (el, frames, ms, opts = {}) =>
    el.animate(frames, { duration: ms, fill: "forwards", easing: "ease", ...opts }).finished;
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));

  async function launch(link) {
    launching = true;
    const cart = carts.find((c) => c.slug === loaded);
    status.textContent = `Starting ${cart ? cart.title : "project"}.`;
    try {
      // 1) Screen contents fade into the dark screen.
      await Promise.all([...screen.children].map((el) =>
        play(el, [{ opacity: 1 }, { opacity: 0 }], 180, { easing: "ease-in" })));
      await pause(60);

      // 2) Logo drops in from above the screen's top edge.
      const splash = document.createElement("div");
      splash.className = "screen-splash";
      splash.setAttribute("aria-hidden", "true");
      splash.innerHTML = `<img src="../images/logo.svg" alt=""><span>SATURNO</span>`;
      screen.appendChild(splash);
      const [img, word] = splash.children;
      play(word, [{ opacity: 0, letterSpacing: "0.6em" }, { opacity: 1, letterSpacing: "0.3em" }], 220, { delay: 170 });
      await play(img, [
        { transform: "translateY(-70px)", opacity: 1 },
        { transform: "translateY(4px)", opacity: 1, offset: 0.75 },
        { transform: "translateY(0)", opacity: 1 },
      ], 300, { easing: "cubic-bezier(.3,.7,.4,1)" });
      await pause(140);

      // 3) The screen grows to fill the window.
      const r = screen.getBoundingClientRect();
      const cs = getComputedStyle(screen);
      const cover = document.createElement("div");
      cover.className = "orbit-launch";
      cover.style.background = cs.backgroundColor;
      document.body.appendChild(cover);
      await play(cover, [
        { top: `${r.top}px`, left: `${r.left}px`, width: `${r.width}px`, height: `${r.height}px`, borderRadius: cs.borderRadius },
        { top: "0px", left: "0px", width: `${window.innerWidth}px`, height: `${window.innerHeight}px`, borderRadius: "0px" },
      ], 400, { easing: "cubic-bezier(.7,0,.3,1)" });
    } catch (err) {
      console.error(err);
    }
    window.location.href = link.href;
  }

  // The Back button can restore this page from cache mid-transition —
  // reset it to the loaded console.
  window.addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    document.querySelectorAll(".orbit-launch").forEach((n) => n.remove());
    launching = false;
    render();
  });

  screen.addEventListener("click", (e) => {
    if (launching) {
      e.preventDefault();
      return;
    }
    const start = e.target.closest(".screen-btn-start");
    if (start) {
      const modified = e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
      if (reduceMotion || modified || !start.animate) return; // plain navigation
      e.preventDefault();
      launch(start);
      return;
    }
    if (e.target.closest("[data-eject]")) eject();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && loaded && !launching) eject();
  });

  window.addEventListener("resize", updateHint);

  /* ---------- Floating Console button ---------- */

  if (toConsole && consoleSection) {
    if ("IntersectionObserver" in window) {
      // "On screen" = at least half of the console's screen is visible.
      new IntersectionObserver(([entry]) => {
        consoleOffScreen = entry.intersectionRatio < 0.5;
        toConsole.dataset.hidden = String(!consoleOffScreen);
      }, { threshold: [0, 0.5, 1] }).observe(screen);
    } else {
      toConsole.dataset.hidden = "false";
    }

    toConsole.addEventListener("click", (e) => {
      e.preventDefault();
      consoleSection.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      if (consoleHeading) consoleHeading.focus({ preventScroll: true });
    });
  }

  /* ---------- Load ---------- */

  try {
    const res = await fetch("../projects-index.json");
    if (!res.ok) throw new Error(`projects-index.json: HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("projects-index.json is not a list");
    carts = data.filter((c) => c && c.slug && c.title);
  } catch (err) {
    console.error(err);
    shelfEmpty.hidden = false;
    shelfEmpty.textContent = "The cartridge shelf couldn't load right now. Try refreshing the page.";
    return;
  }

  if (carts.length === 0) {
    shelfEmpty.hidden = false;
    shelfEmpty.textContent = "No cartridges on the shelf yet. Check back soon.";
    return;
  }

  const preset = new URLSearchParams(window.location.search).get("cart");
  if (preset && carts.some((c) => c.slug === preset)) {
    loaded = preset;
    render();
  } else {
    render();
  }
});
