/* =========================================================
   BUSINESS CONFIG — edit this block to re-skin for a new client
   ========================================================= */
const BUSINESS = {
  name: "El Jalapeño",
  phone: "(210) 555-0148",
  tel: "tel:+12105550148",
  email: "hola@eljalapenocantina.com",
  address: "812 Calle Verde, San Antonio, TX 78204",
  links: {
    maps: "https://www.google.com/maps/search/?api=1&query=Calle+Verde+San+Antonio+TX",
    doordash: "https://www.doordash.com/",
    ubereats: "https://www.ubereats.com/",
    store: "https://example.com/store"
  },
  // index = day of week, 0 = Sunday
  hours: [
    { day: "Sunday",    open: "10am", close: "10pm", note: "Brunch until 3pm" },
    { day: "Monday",    open: "4pm",  close: "10pm", note: "Happy hour 4 to 6pm" },
    { day: "Tuesday",   open: "11am", close: "11pm", note: "Taco Tuesday" },
    { day: "Wednesday", open: "11am", close: "11pm" },
    { day: "Thursday",  open: "11am", close: "12am" },
    { day: "Friday",    open: "11am", close: "2am",  note: "Kitchen until midnight" },
    { day: "Saturday",  open: "10am", close: "2am",  note: "Kitchen until midnight" }
  ]
};

const DEFAULTS = {
  sections: { welcome: true, events: true, menu: true, team: true, photos: true, reviews: true, faq: true, shop: true, visit: true },
  shopMode: "store",
  notice: true
};

const SECTION_LABELS = [
  ["welcome", "Welcome"], ["events", "Events"], ["menu", "Menu"], ["team", "Meet the Team"],
  ["photos", "Photos"], ["reviews", "Reviews"], ["faq", "FAQ"], ["shop", "Shop"], ["visit", "Visit Us"]
];

/* =========================================================
   SPREADSHEET DATA (Google Sheets → MASTERDATA tab)
   The site tries each source in order and uses the first one that loads:
     1. live:  the published CSV link (edits show up within ~5 minutes)
     2. local: masterdata.csv sitting next to index.html (backup copy)
     3. the built-in demo lists below
   Event columns (header case and spaces don't matter):
     TYPE        weekly_event or special_event. Blank: DATE → special, DAY/DOW → weekly
     NAME, INFO  title and description
     DATE        special events: YYYY-MM-DD or M/D/YYYY
     DAY / DOW   weekly events: day name or 0-6 (0 = Sunday)
     START TIME, END TIME   e.g. 6:30 PM or 18:30. Falls back to TIME text if blank
     FREQUENCY   weekly (default), biweekly, 1st/2nd/3rd/4th/last, monthly
     START_DATE, END_DATE   weekly: season window. special: END_DATE for multi-day events
     SKIP_DATES  dates to cancel, separated by commas
     STYLE       salsa, hoja, mantequilla, naranja, chile
     CATEGORY    adds filter buttons when 2+ categories exist
     FEATURED    yes → shown first with a Featured tag
     ACTIVE      no → hidden
     STATUS      e.g. Sold out, Few seats left, Cancelled
     PRICE, TICKET_URL, AREA, AGE, HOST
     IMAGE (or FLYER) + FLYER_ALT   flyer image replaces the drawn poster
     OFFSET      demo only: days from today, used when useOffsets is true
   Hours rows: TYPE hours, DAY, START TIME, END TIME, INFO (note). Blank times = closed.
   ========================================================= */
const DATA_SOURCES = {
  live: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQfq5o4p6kl-_O742-gkW76xfF2iUt0Z7BiuQRkGnV9EeomKZK_RCEKQMYACR6ej5J6HUBe0j0gpc8N/pub?gid=878306655&single=true&output=csv",
  local: "masterdata.csv",
  // Mockup: place special events OFFSET days from today so the demo always looks current.
  // Real client site: set to false so the DATE column is used.
  useOffsets: true,
  // If the sheet has no weekly (or no special) events, show the demo ones instead.
  // Real client site: set to false.
  keepDemoEvents: true
};

// Recurring weekly events (dow: 0 = Sunday). Add `flyer: "image-url"` to use a real flyer image.
let EVENTS_WEEKLY = [
  { name: "Sunday Brunch & Vinyl", dow: 0, time: "10am – 3pm", info: "Chilaquiles, bottomless micheladas, and cumbia on vinyl from DJ Nopal.", style: "naranja" },
  { name: "Happy Hour", dow: 1, time: "4pm – 6pm", info: "$6 house margaritas and half-price antojitos at the bar.", style: "chile" },
  { name: "Taco Tuesday", dow: 2, time: "4pm – 10pm", info: "$2.50 street tacos all night, al pastor carved off the trompo.", style: "salsa" },
  { name: "Lotería Night", dow: 3, time: "7pm – 9pm", info: "Free to play. Winners take home a jar of salsa macha.", style: "mantequilla" },
  { name: "Mariachi Viernes", dow: 5, time: "8pm – 11pm", info: "Mariachi Los Halcones live on the patio. No cover.", style: "hoja" }
];
// Demo one-off events, placed `offset` days from today so the mockup always looks current.
// Events from the sheet use a real `date` instead.
let EVENTS_SPECIAL = [
  { name: "Mezcal Tasting", offset: 3, time: "6:30pm", info: "Five small-batch mezcals from Oaxaca, led by Diego. $35, 20 seats.", style: "hoja" },
  { name: "Cumbia Dance Class", offset: 12, time: "7pm – 8:30pm", info: "Beginner-friendly lesson on the patio, then open dancing.", style: "naranja" },
  { name: "Chef's Mole Dinner", offset: 18, time: "7pm", info: "Five courses built around Marisol's 28-ingredient mole. $65.", style: "salsa" },
  { name: "Lucha Libre Watch Party", offset: 25, time: "8pm", info: "Masks encouraged. Best costume drinks free all night.", style: "mantequilla" }
];

const MENU = {
  food: [
    { cat: "Antojitos", note: "Small plates to share", items: [
      { n: "Guacamole en Molcajete", p: 11, d: "Hass avocado, serrano, lime, pico, warm chips.", t: ["v", "gf"] },
      { n: "Elote Asado", p: 7, d: "Grilled street corn, cotija, chile-lime mayo, tajín.", t: ["v", "gf"] },
      { n: "Queso Fundido", p: 12, d: "Melted chihuahua cheese with house chorizo and flour tortillas." },
      { n: "Jalapeños Rellenos", p: 10, d: "Our namesake, stuffed with cream cheese and wrapped in bacon.", t: ["spicy"] }
    ]},
    { cat: "Tacos", note: "Three per order, on house-made corn tortillas", items: [
      { n: "Al Pastor", p: 14, d: "Achiote pork off the trompo, pineapple, onion, cilantro.", t: ["gf"] },
      { n: "Carne Asada", p: 16, d: "Mesquite-grilled skirt steak, guacamole, salsa roja.", t: ["gf"] },
      { n: "Birria", p: 17, d: "Braised beef, melted cheese, crispy griddled, with consomé for dipping." },
      { n: "Coliflor al Carbón", p: 13, d: "Charred cauliflower, salsa macha, pickled onion, pepitas.", t: ["v", "gf", "spicy"] }
    ]},
    { cat: "Platos Fuertes", note: "Served with rice, beans, and tortillas", items: [
      { n: "Pollo en Mole Poblano", p: 22, d: "Half chicken in our 28-ingredient mole, sesame." },
      { n: "Carnitas Michoacanas", p: 21, d: "Slow-cooked pork, crispy edges, salsa verde, limes.", t: ["gf"] },
      { n: "Enchiladas Verdes", p: 18, d: "Chicken or squash, tomatillo sauce, crema, queso fresco." },
      { n: "Pescado Zarandeado", p: 28, d: "Grilled whole snapper, adobo rub, mango salsa.", t: ["gf", "spicy"] }
    ]},
    { cat: "Postres", items: [
      { n: "Churros con Cajeta", p: 8, d: "Cinnamon sugar, goat-milk caramel for dipping.", t: ["v"] },
      { n: "Pastel Tres Leches", p: 9, d: "Soaked sponge cake, whipped cream, fresh berries.", t: ["v"] }
    ]}
  ],
  drinks: [
    { cat: "Margaritas", note: "Rocks or frozen, salt or tajín rim", items: [
      { n: "Margarita de la Casa", p: 10, d: "Blanco tequila, fresh lime, agave." },
      { n: "Jalapeño Margarita", p: 12, d: "Muddled jalapeño, cucumber, lime. Our best seller.", t: ["spicy"] },
      { n: "Mango Chamoy", p: 12, d: "Mango purée, chamoy swirl, tamarind straw." },
      { n: "Cadillac", p: 15, d: "Reposado tequila, fresh lime, orange liqueur float." }
    ]},
    { cat: "Tequila & Mezcal", items: [
      { n: "Paloma", p: 11, d: "Blanco tequila, grapefruit soda, lime, salt." },
      { n: "Mezcal Negroni", p: 14, d: "Joven mezcal, Campari, sweet vermouth." },
      { n: "Tequila Flight", p: 18, d: "Blanco, reposado, and añejo side by side." },
      { n: "Mezcal Flight", p: 22, d: "Three small-batch mezcals with orange and sal de gusano." }
    ]},
    { cat: "Cervezas", items: [
      { n: "Michelada", p: 9, d: "Mexican lager, lime, house clamato mix, chile rim.", t: ["spicy"] },
      { n: "Draft Mexican Lager", p: 6, d: "Ask what's on tap this week." },
      { n: "Cubeta", p: 25, d: "Bucket of five bottles, pick any mix." }
    ]},
    { cat: "Sin Alcohol", items: [
      { n: "Horchata", p: 5, d: "Rice, cinnamon, vanilla, made daily." },
      { n: "Agua de Jamaica", p: 5, d: "Hibiscus, lightly sweetened." },
      { n: "Mexican Coke", p: 4, d: "Glass bottle, cane sugar." }
    ]}
  ]
};

const TEAM = [
  { n: "Marisol Treviño", r: "Owner & Head Chef", f: "Her mole has 28 ingredients. She'll tell you 27 of them.", c: "salsa" },
  { n: "Diego Salinas", r: "Bar Manager", f: "Has tasted more than 300 mezcals and still keeps a favorite secret.", c: "hoja" },
  { n: "Ana Lucía Ramos", r: "Sous Chef", f: "Runs the trompo. Nobody else is allowed to touch it.", c: "naranja" },
  { n: "Javi Ortiz", r: "Bartender", f: "Makes the best michelada in the city, according to Javi.", c: "chile" },
  { n: "Mariachi Los Halcones", r: "Friday Night Band", f: "Six players, one trumpet solo that gets the whole patio singing.", c: "mantequilla-dark" },
  { n: "DJ Nopal", r: "Sunday Brunch DJ", f: "Plays cumbia, soul, and oldies, all on vinyl.", c: "carbon" }
];

const PHOTOS = [
  { cap: "Al pastor tacos, fresh off the trompo", cls: "art-1", size: "w2 h2" },
  { cap: "The patio on a Friday night", cls: "art-5", size: "" },
  { cap: "Jalapeño margaritas", cls: "art-3", size: "" },
  { cap: "Papel picado over the bar", cls: "art-4", size: "h2" },
  { cap: "Mariachi Los Halcones", cls: "art-2", size: "" },
  { cap: "Pozole on a cold night", cls: "art-6", size: "" },
  { cap: "Agave wall in the dining room", cls: "art-7", size: "w2" },
  { cap: "Churros con cajeta", cls: "art-8", size: "" }
];

// Sample reviews for the mockup (a live site would pull these from Google)
const REVIEWS = [
  { n: "Carla M.", s: 5, w: "1 week ago", t: "The birria tacos are unreal and the consomé is worth the trip by itself. Javi made me a jalapeño margarita that I'm still thinking about." },
  { n: "Trevor H.", s: 5, w: "2 weeks ago", t: "Went for Taco Tuesday and stayed for the mariachi. Great energy on the patio and the staff kept the chips coming." },
  { n: "Lupe G.", s: 5, w: "3 weeks ago", t: "Finally a mole that tastes like my abuela's. Marisol came out to say hi. We'll be back for the mole dinner." },
  { n: "Andre P.", s: 4, w: "1 month ago", t: "Solid food and strong drinks. It gets loud on Fridays, so come Wednesday for lotería if you want to talk." },
  { n: "Sophie K.", s: 5, w: "1 month ago", t: "Booked the patio for my 30th. They handled 40 people without a hitch and the taco spread was perfect." },
  { n: "Marcus D.", s: 5, w: "2 months ago", t: "The mezcal flight was a great intro for someone who only knew tequila. Diego knows his stuff." }
];

const PRODUCTS = [
  { id: "tee", n: "Logo Tee", p: 28, opts: ["S", "M", "L", "XL"], art: "tee" },
  { id: "hat", n: "Pepper Dad Hat", p: 24, art: "hat" },
  { id: "salsa", n: "Salsa Macha, 8 oz", p: 12, art: "jar" },
  { id: "gift", n: "Gift Card", p: 50, opts: ["$25", "$50", "$100"], prices: [25, 50, 100], art: "card" }
];

/* ========================================================= */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const weekStart = d => addDays(d, -d.getDay());
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const fmt = (d, o) => d.toLocaleDateString("en-US", o);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const chili = '<svg class="chili" aria-label="Spicy" role="img"><use href="#i-chili"/></svg>';

  /* ---------- Bind business info ---------- */
  $$("[data-bind]").forEach(el => { el.textContent = BUSINESS[el.dataset.bind] ?? ""; });
  $$("[data-bind-href]").forEach(el => {
    const k = el.dataset.bindHref;
    el.href = k === "tel" ? BUSINESS.tel : BUSINESS.links[k];
  });
  $("#year").textContent = today.getFullYear();
  /* ---------- Hours ---------- */
  const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hoursText = h => h.closed ? "Closed" : `${h.open} – ${h.close}`;
  function renderHours() {
    const th = BUSINESS.hours[today.getDay()];
    $("#heroHours").textContent = th.closed ? "Closed today" : `Open today · ${th.open} – ${th.close}`;
    const order = [1, 2, 3, 4, 5, 6, 0];
    $("#hoursTable tbody").innerHTML = order.map(i => {
      const h = BUSINESS.hours[i];
      const isToday = i === today.getDay();
      return `<tr class="${isToday ? "is-today" : ""}"><td>${esc(h.day)}${isToday ? ' <span class="today-tag">Today</span>' : ""}</td>
      <td>${hoursText(h)}${h.note ? `<small>${esc(h.note)}</small>` : ""}</td></tr>`;
    }).join("");
    // Footer: group days in a row that share the same hours, e.g. "Tue – Wed 11am – 11pm"
    const groups = [];
    order.forEach(i => {
      const t = hoursText(BUSINESS.hours[i]), last = groups[groups.length - 1];
      if (last && last.t === t) last.end = i; else groups.push({ start: i, end: i, t });
    });
    $("#footHours").innerHTML = groups.map(g =>
      `${SHORT_DAYS[g.start]}${g.end !== g.start ? " – " + SHORT_DAYS[g.end] : ""} ${esc(g.t)}`).join("<br>");
  }
  renderHours();

  /* ---------- Events ---------- */
  // Every event, from the sheet or the demo lists, is normalized to one shape:
  // { kind: "weekly"|"special", name, info, style, category, featured, status, area, age, host,
  //   price, ticketUrl, image, imageAlt, time, startMin, endMin,
  //   dow, freq, startDate, endDate, date, skip }
  const DAY_MS = 864e5;
  const dayKey = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const slug = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  function baseEvent(e, kind) {
    return {
      kind, name: e.name, info: e.info || "", style: e.style || "chile", category: e.category || "",
      featured: !!e.featured, status: e.status || "", area: e.area || "", age: e.age || "", host: e.host || "",
      price: e.price || "", ticketUrl: e.ticketUrl || "", image: e.image || e.flyer || "", imageAlt: e.imageAlt || "",
      time: e.time || "", startMin: e.startMin ?? null, endMin: e.endMin ?? null,
      dow: e.dow ?? null, freq: e.freq || { t: "weekly" }, startDate: e.startDate || null, endDate: e.endDate || null,
      date: e.date ? new Date(e.date) : (kind === "special" ? addDays(today, e.offset || 0) : null),
      skip: e.skip || new Set()
    };
  }
  let ALL_EVENTS = [];
  const buildDemo = () => [...EVENTS_WEEKLY.map(e => baseEvent(e, "weekly")), ...EVENTS_SPECIAL.map(e => baseEvent(e, "special"))];
  ALL_EVENTS = buildDemo();

  function occursOn(e, d) {
    if (e.skip.has(dayKey(d))) return false;
    if (e.kind === "special") return d >= e.date && d <= (e.endDate || e.date);
    if (d.getDay() !== e.dow) return false;
    if (e.startDate && d < e.startDate) return false;
    if (e.endDate && d > e.endDate) return false;
    if (e.freq.t === "biweekly") {
      const anchor = weekStart(e.startDate || new Date(2026, 0, 4));
      return Math.round((weekStart(d) - anchor) / (7 * DAY_MS)) % 2 === 0;
    }
    if (e.freq.t === "nth") {
      if (e.freq.n === -1) return addDays(d, 7).getMonth() !== d.getMonth();
      return Math.ceil(d.getDate() / 7) === e.freq.n;
    }
    return true;
  }

  let activeCategory = "";
  function eventsBetween(from, to) {
    const out = [];
    for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
      ALL_EVENTS.forEach(e => {
        if (activeCategory && e.category !== activeCategory) return;
        if (occursOn(e, d)) out.push({ ...e, date: new Date(d) });
      });
    }
    return out.sort((a, b) => (a.date - b.date) || ((a.startMin ?? 0) - (b.startMin ?? 0)));
  }

  function whenLabel(e) {
    if (sameDay(e.date, today)) {
      if (e.startMin !== null && e.endMin !== null && nowMin >= e.startMin && nowMin < e.endMin) return "Happening now";
      return "Tonight";
    }
    return fmt(e.date, { weekday: "short", month: "short", day: "numeric" });
  }
  const isOver = e => sameDay(e.date, today) && e.endMin !== null && nowMin >= e.endMin;

  function renderPosters() {
    const seen = new Set();
    const upcoming = eventsBetween(today, addDays(today, 45))
      .filter(e => !isOver(e))
      .filter(e => !seen.has(e.name) && seen.add(e.name));
    const posters = [...upcoming.filter(e => e.featured), ...upcoming.filter(e => !e.featured)];
    $("#rail").innerHTML = posters.map(e => {
      const st = slug(e.status);
      const dim = st === "cancelled" || st === "canceled" || st === "sold-out";
      const tags = [
        e.featured ? '<span class="ev-tag ev-tag--featured">Featured</span>' : "",
        e.status ? `<span class="ev-tag ev-tag--status">${esc(e.status)}</span>` : "",
        e.price ? `<span class="ev-tag ev-tag--price">${esc(e.price)}</span>` : "",
        e.category ? `<span class="ev-tag">${esc(e.category)}</span>` : ""
      ].join("");
      const extra = [e.area, e.age, e.host ? "Hosted by " + e.host : ""].filter(Boolean).map(esc).join(" · ");
      const art = e.image
        ? `<img src="${esc(e.image)}" alt="${esc(e.imageAlt || e.name + " flyer")}" loading="lazy">`
        : `<span class="poster-kicker">El Jalapeño presenta</span>
        <h3 class="poster-title">${esc(e.name)}</h3>
        <div class="poster-date"><span class="pd-day">${e.date.getDate()}</span><span>${fmt(e.date, { weekday: "short" })}<br>${fmt(e.date, { month: "short" })}</span></div>`;
      const ticketLabel = st === "sold-out" ? "Join the waitlist" : "Get tickets";
      return `
    <article class="poster-card${e.featured ? " is-featured" : ""}">
      <div class="poster p-${e.style}${e.image ? " poster--image" : ""}${dim ? " is-dimmed" : ""}">${art}</div>
      <div class="poster-info">
        ${tags ? `<div class="ev-tags">${tags}</div>` : ""}
        <h3>${esc(e.name)}</h3>
        <p class="meta">${whenLabel(e)}${e.time ? " · " + esc(e.time) : ""}</p>
        ${extra ? `<p class="ev-extra">${extra}</p>` : ""}
        ${e.info ? `<p>${esc(e.info)}</p>` : ""}
        ${e.ticketUrl && st !== "cancelled" && st !== "canceled" ? `<a class="btn btn--naranja btn--sm poster-ticket" href="${esc(e.ticketUrl)}" target="_blank" rel="noopener">${ticketLabel}</a>` : ""}
      </div>
    </article>`;
    }).join("") || '<p class="rail-status">No upcoming events right now. Check back soon.</p>';
    rail.scrollLeft = 0;
  }
  const rail = $("#rail");
  $("#railPrev").addEventListener("click", () => rail.scrollBy({ left: -rail.clientWidth * .8, behavior: "smooth" }));
  $("#railNext").addEventListener("click", () => rail.scrollBy({ left: rail.clientWidth * .8, behavior: "smooth" }));

  const WEEKS = 4;
  let calStart = weekStart(today);
  function renderCal() {
    const end = addDays(calStart, WEEKS * 7 - 1);
    const evs = eventsBetween(calStart, end);
    $("#calRange").textContent = `${fmt(calStart, { month: "short", day: "numeric" })} – ${fmt(end, { month: "short", day: "numeric", year: "numeric" })}`;
    const dows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => `<div class="cal-dow">${d}</div>`).join("");
    let cells = "";
    for (let i = 0; i < WEEKS * 7; i++) {
      const d = addDays(calStart, i);
      const isToday = sameDay(d, today);
      const cls = isToday ? "today" : (d < today ? "past" : "");
      const label = (i === 0 || d.getDate() === 1) ? fmt(d, { month: "short", day: "numeric" }) : d.getDate();
      const chips = evs.filter(e => sameDay(e.date, d)).map(e => {
        const tip = [e.name, e.time, e.status, e.price].filter(Boolean).join(" · ");
        return `<span class="chip c-${e.style}${e.status ? " is-" + slug(e.status) : ""}" title="${esc(tip)}">${esc(e.name)}<small>${esc([e.time, e.status].filter(Boolean).join(" · "))}</small></span>`;
      }).join("");
      cells += `<div class="cal-day ${cls}"><div class="cal-num"><span><span class="cal-mdow">${fmt(d, { weekday: "short" })}</span>${label}</span>${isToday ? '<span class="today-tag">Today</span>' : ""}</div>${chips}</div>`;
    }
    $("#calGrid").innerHTML = dows + cells;
  }
  $("#calPrev").addEventListener("click", () => { calStart = addDays(calStart, -7 * WEEKS); renderCal(); });
  $("#calNext").addEventListener("click", () => { calStart = addDays(calStart, 7 * WEEKS); renderCal(); });
  $("#calToday").addEventListener("click", () => { calStart = weekStart(today); renderCal(); });

  function renderFilters() {
    const cats = [...new Set(ALL_EVENTS.map(e => e.category).filter(Boolean))].sort();
    const box = $("#eventFilters");
    box.hidden = cats.length < 2;
    if (box.hidden) { activeCategory = ""; return; }
    box.innerHTML = ["", ...cats].map(c =>
      `<button type="button" data-cat="${esc(c)}" aria-pressed="${c === activeCategory}">${c ? esc(c) : "All events"}</button>`).join("");
    $$("button", box).forEach(b => b.addEventListener("click", () => {
      activeCategory = b.dataset.cat;
      $$("button", box).forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      renderPosters(); renderCal();
    }));
  }

  /* ---------- Load events from the spreadsheet ---------- */
  function parseCSV(text) {
    const rows = []; let row = [], field = "", q = false;
    text = text.replace(/^﻿/, "");
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
        else field += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); rows.push(row); row = []; field = "";
      } else field += c;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    // "START TIME", "Start-Time" and "start_time" all become start_time
    const head = (rows.shift() || []).map(h => h.trim().toLowerCase().replace(/[\s-]+/g, "_"));
    return rows.filter(r => r.some(v => v.trim() !== ""))
      .map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || "").trim()]).filter(([h]) => h)));
  }

  const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const STYLES = ["salsa", "hoja", "mantequilla", "naranja", "chile"];
  const isYes = v => /^(yes|y|true|1|x)$/i.test(v || "");
  const isNo = v => /^(no|n|false|0)$/i.test(v || "");
  function parseDow(v) {
    if (!v) return null;
    if (/^[0-6]$/.test(v)) return +v;
    const i = DAY_NAMES.indexOf(v.slice(0, 3).toLowerCase());
    return i === -1 ? null : i;
  }
  function parseDate(v) {
    let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v || "");
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v || "");
    if (m) return new Date(+m[3], +m[1] - 1, +m[2]);
    return null;
  }
  // "6:30:00 PM", "6:30 pm", "7pm" or "18:30" → minutes after midnight
  function parseClock(v) {
    const m = /^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*([ap])?\.?\s*m?\.?$/i.exec((v || "").trim());
    if (!m) return null;
    let h = +m[1]; const min = +(m[2] || 0);
    if (m[3]) h = (h % 12) + (m[3].toLowerCase() === "p" ? 12 : 0);
    return h > 23 || min > 59 ? null : h * 60 + min;
  }
  const clockText = t => { const h = Math.floor(t / 60), m = t % 60; return `${h % 12 || 12}${m ? ":" + String(m).padStart(2, "0") : ""}${h < 12 ? "am" : "pm"}`; };
  // "10:00 AM - 3:00 PM" becomes "10am – 3pm"
  const tidyTime = t => t.replace(/:00(?=\s*[AaPp])/g, "").replace(/\s*([AaPp])\.?[Mm]\.?/g, (_, p) => p.toLowerCase() + "m").replace(/\s*-\s*/g, " – ");
  function fmtPrice(v) {
    if (!v) return "";
    if (/^(free|\$?0(\.00)?)$/i.test(v)) return "Free";
    const n = v.replace(/[$,\s]/g, "");
    if (/^\d+(\.\d+)?$/.test(n)) return "$" + (+n % 1 ? (+n).toFixed(2) : +n);
    return v;
  }
  const safeUrl = v => /^https?:\/\//i.test(v || "") ? v : "";
  const safeSrc = v => (!v || /^\s*(javascript|data):/i.test(v)) ? "" : v;
  function parseFreq(v) {
    v = (v || "").toLowerCase();
    if (/bi-?weekly|every other/.test(v)) return { t: "biweekly" };
    if (/last/.test(v)) return { t: "nth", n: -1 };
    const m = /(1st|first|2nd|second|3rd|third|4th|fourth)/.exec(v);
    if (m) return { t: "nth", n: { "1st": 1, first: 1, "2nd": 2, second: 2, "3rd": 3, third: 3, "4th": 4, fourth: 4 }[m[1]] };
    if (/monthly/.test(v)) return { t: "nth", n: 1 };
    return { t: "weekly" };
  }

  function rowToEvent(r) {
    if (!r.name || isNo(r.active)) return null;
    const type = (r.type || "").toLowerCase().replace(/[\s-]+/g, "_");
    let date = parseDate(r.date);
    if (DATA_SOURCES.useOffsets && /^-?\d+$/.test(r.offset || "")) date = addDays(today, +r.offset);
    const dow = parseDow(r.dow || r.day);
    const kind = type === "special_event" ? "special" : type === "weekly_event" ? "weekly" : type ? null : date ? "special" : dow !== null ? "weekly" : null;
    if (!kind || (kind === "special" && !date) || (kind === "weekly" && dow === null)) return null;
    const startMin = parseClock(r.start_time), endMin = parseClock(r.end_time);
    const time = startMin !== null ? clockText(startMin) + (endMin !== null ? " – " + clockText(endMin) : "") : tidyTime(r.time || "");
    const style = (r.style || "").toLowerCase();
    let endDate = parseDate(r.end_date);
    if (kind === "special" && endDate && DATA_SOURCES.useOffsets && /^-?\d+$/.test(r.offset || "")) {
      endDate = addDays(date, Math.round((endDate - parseDate(r.date)) / DAY_MS) || 0);
    }
    return baseEvent({
      name: r.name, info: r.info, style: STYLES.includes(style) ? style : "chile", category: r.category,
      featured: isYes(r.featured), status: r.status, area: r.area, age: r.age, host: r.host,
      price: fmtPrice(r.price), ticketUrl: safeUrl(r.ticket_url), image: safeSrc(r.image || r.flyer), imageAlt: r.flyer_alt,
      time, startMin, endMin, dow, freq: parseFreq(r.frequency),
      startDate: kind === "weekly" ? parseDate(r.start_date) : null, endDate,
      date: kind === "special" ? date : null,
      skip: new Set((r.skip_dates || "").split(/[,;\n]+/).map(s => parseDate(s.trim())).filter(Boolean).map(dayKey))
    }, kind);
  }

  // TYPE "hours" rows: DAY, START TIME, END TIME (or TIME), INFO as the note.
  // Leave both times blank, or write "Closed" in TIME, for a closed day.
  function applyHours(rows) {
    let found = false;
    rows.filter(r => (r.type || "").toLowerCase() === "hours").forEach(r => {
      const i = parseDow(r.dow || r.day);
      if (i === null) return;
      const s = parseClock(r.start_time), e = parseClock(r.end_time);
      const closed = /closed/i.test(r.time || "") || (s === null && !r.time);
      let open = "", close = "";
      if (s !== null) { open = clockText(s); close = e !== null ? clockText(e) : ""; }
      else if (r.time) { [open, close = ""] = tidyTime(r.time).split(" – "); }
      BUSINESS.hours[i] = { day: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][i], open, close, note: r.info || "", closed };
      found = true;
    });
    return found;
  }

  function applySheet(rows) {
    const gotHours = applyHours(rows);
    const evs = rows.map(rowToEvent).filter(Boolean);
    if (!evs.length) return gotHours;
    const weekly = evs.filter(e => e.kind === "weekly"), special = evs.filter(e => e.kind === "special");
    const demo = buildDemo();
    ALL_EVENTS = [
      ...(weekly.length || !DATA_SOURCES.keepDemoEvents ? weekly : demo.filter(e => e.kind === "weekly")),
      ...(special.length || !DATA_SOURCES.keepDemoEvents ? special : demo.filter(e => e.kind === "special"))
    ];
    return true;
  }

  async function fetchText(url, ms = 5000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      if (/^\s*</.test(text)) throw new Error("Got a web page instead of CSV");
      return text;
    } finally { clearTimeout(timer); }
  }

  async function loadEvents() {
    for (const [label, url] of [["live sheet", DATA_SOURCES.live], ["local masterdata.csv", DATA_SOURCES.local]]) {
      if (!url) continue;
      try {
        if (applySheet(parseCSV(await fetchText(url)))) { console.info("Events loaded from " + label); return; }
      } catch (err) { console.warn("Could not load events from " + label + ":", err.message); }
    }
    console.info("Using the built-in demo events");
  }

  $("#rail").innerHTML = '<p class="rail-status">Loading events…</p>';
  loadEvents().finally(() => { renderHours(); renderFilters(); renderPosters(); renderCal(); });

  $$("[data-view]").forEach(btn => btn.addEventListener("click", () => {
    const v = btn.dataset.view;
    $$("[data-view]").forEach(b => b.setAttribute("aria-pressed", String(b === btn)));
    $("#postersView").hidden = v !== "posters";
    $("#calendarView").hidden = v !== "calendar";
    try { localStorage.setItem("ej-view", v); } catch (e) {}
  }));
  try { if (localStorage.getItem("ej-view") === "calendar") $('[data-view="calendar"]').click(); } catch (e) {}

  /* ---------- Menu ---------- */
  const tagHtml = t => (t || []).map(x => x === "spicy" ? chili : `<span class="tag">${x.toUpperCase()}</span>`).join("");
  function renderMenu(which) {
    $("#menuCats").innerHTML = MENU[which].map(c => `
      <div class="menu-cat">
        <h3>${esc(c.cat)}</h3>${c.note ? `<p class="cat-note">${esc(c.note)}</p>` : ""}
        ${c.items.map(i => `<div class="item"><div class="item-head"><span class="name">${esc(i.n)}${i.t ? `<span class="tags">${tagHtml(i.t)}</span>` : ""}</span><span class="dots"></span><span class="price">${i.p}</span></div><p>${esc(i.d)}</p></div>`).join("")}
      </div>`).join("");
  }
  renderMenu("food");
  const tabs = $$(".tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => { const on = t === tab; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; });
      $("#menuCats").setAttribute("aria-labelledby", tab.id);
      renderMenu(tab.dataset.tab);
    });
    tab.addEventListener("keydown", e => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const next = tabs[(tabs.indexOf(tab) + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
        next.focus(); next.click();
      }
    });
  });
  $("#printMenu").innerHTML = [...MENU.food, ...MENU.drinks].map(c => `
    <div class="pm-cat"><h3>${esc(c.cat)}</h3>
      ${c.items.map(i => `<div class="pm-item"><span>${esc(i.n)}</span><span class="dots"></span><span class="price">${i.p}</span></div>`).join("")}
    </div>`).join("");

  /* ---------- Dialogs ---------- */
  const openDlg = d => { if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", ""); };
  $$("dialog").forEach(d => {
    d.addEventListener("click", e => { if (e.target === d) d.close(); });
    $$("[data-close]", d).forEach(b => b.addEventListener("click", () => d.close()));
  });
  $("#openFullMenu").addEventListener("click", () => openDlg($("#fullMenu")));

  /* ---------- Team ---------- */
  $("#teamGrid").innerHTML = TEAM.map(m => {
    const init = m.n.replace(/^(DJ|Mariachi)\s+/, "").split(/\s+/).map(w => w[0]).slice(0, 2).join("");
    return `<article class="member"><div class="avatar avatar--${m.c}" role="img" aria-label="Photo placeholder for ${esc(m.n)}"><span>${esc(init)}</span></div>
      <h3>${esc(m.n)}</h3><p class="role">${esc(m.r)}</p><p class="fact">${esc(m.f)}</p></article>`;
  }).join("");

  /* ---------- Photos ---------- */
  $("#gallery").innerHTML = PHOTOS.map((p, i) => `
    <button class="tile ${p.cls} ${p.size}" type="button" data-photo="${i}" aria-label="View photo: ${esc(p.cap)}"><span class="cap">${esc(p.cap)}</span></button>`).join("");
  let lbIndex = 0;
  function showPhoto(i) {
    lbIndex = (i + PHOTOS.length) % PHOTOS.length;
    const p = PHOTOS[lbIndex];
    $("#lbArt").className = "lightbox-art " + p.cls;
    $("#lbArt").setAttribute("aria-label", p.cap);
    $("#lbCap").textContent = `${p.cap}  (${lbIndex + 1} of ${PHOTOS.length})`;
  }
  $$("[data-photo]").forEach(b => b.addEventListener("click", () => { showPhoto(+b.dataset.photo); openDlg($("#lightbox")); }));
  $("#lbPrev").addEventListener("click", () => showPhoto(lbIndex - 1));
  $("#lbNext").addEventListener("click", () => showPhoto(lbIndex + 1));
  $("#lightbox").addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") showPhoto(lbIndex - 1);
    if (e.key === "ArrowRight") showPhoto(lbIndex + 1);
  });

  /* ---------- Reviews ---------- */
  const stars = n => Array.from({ length: 5 }, (_, i) => `<svg class="${i < n ? "" : "star-off"}" aria-hidden="true"><use href="#i-star"/></svg>`).join("");
  $("#summaryStars").innerHTML = stars(5);
  $("#revGrid").innerHTML = REVIEWS.map((r, i) => `
    <article class="review">
      <div class="rev-head"><span class="initial initial--${i % 4}">${esc(r.n[0])}</span>
        <div><strong>${esc(r.n)}</strong><small>${esc(r.w)}</small></div></div>
      <span class="stars" aria-label="${r.s} out of 5 stars">${stars(r.s)}</span>
      <p>${esc(r.t)}</p>
      <span class="src">Google review · sample</span>
    </article>`).join("");

  /* ---------- Shop ---------- */
  const art = {
    tee: '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M32 14l-22 12 8 18 10-5v47h44V39l10 5 8-18-22-12c-2 7-8 11-18 11S34 21 32 14z" class="f-masa"/><g transform="translate(43 44) rotate(-20) scale(.075)"><use href="#i-pepper" width="200" height="400"/></g></svg>',
    hat: '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M18 62c0-22 14-36 32-36s32 14 32 36z" class="f-hoja"/><path d="M14 62h58c10 0 18 3 18 8H14z" class="f-carbon"/><circle cx="50" cy="27" r="3" class="f-carbon"/><g transform="translate(46 34) rotate(-20) scale(.06)"><use href="#i-pepper" width="200" height="400"/></g></svg>',
    jar: '<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="30" y="14" width="40" height="12" rx="3" class="f-carbon"/><rect x="24" y="26" width="52" height="62" rx="10" class="f-salsa-oscura"/><rect x="30" y="44" width="40" height="26" rx="4" class="f-mantequilla"/><text x="50" y="61" text-anchor="middle" class="prod-jar-text">MACHA</text></svg>',
    card: '<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="10" y="26" width="80" height="50" rx="8" class="f-mantequilla"/><rect x="10" y="60" width="80" height="16" class="f-salsa"/><text x="18" y="46" class="prod-card-title">El Jalapeño</text><text x="18" y="72" class="prod-card-label">GIFT CARD</text></svg>'
  };
  $("#shopGrid").innerHTML = PRODUCTS.map(p => `
    <article class="product">
      <div class="prod-art prod-art--${p.id}">${art[p.art]}</div>
      <h3>${esc(p.n)}</h3>
      <div class="row">
        <span class="price" id="price-${p.id}">$${p.p}</span>
        ${p.opts ? `<select id="opt-${p.id}" aria-label="${esc(p.n)} option">${p.opts.map((o, i) => `<option value="${i}" ${p.prices && p.prices[i] === p.p ? "selected" : ""}>${o}</option>`).join("")}</select>` : ""}
      </div>
      <button class="btn btn--salsa btn--sm" type="button" data-add="${p.id}">Add to cart</button>
    </article>`).join("");
  const cart = [];
  const priceOf = p => { const sel = $("#opt-" + p.id); return p.prices && sel ? p.prices[+sel.value] : p.p; };
  PRODUCTS.forEach(p => {
    const sel = $("#opt-" + p.id);
    if (sel && p.prices) sel.addEventListener("change", () => { $("#price-" + p.id).textContent = "$" + priceOf(p); });
  });
  $$("[data-add]").forEach(b => b.addEventListener("click", () => {
    const p = PRODUCTS.find(x => x.id === b.dataset.add);
    const sel = $("#opt-" + p.id);
    cart.push({ n: p.n, opt: sel ? p.opts[+sel.value] : "", price: priceOf(p) });
    const total = cart.reduce((s, x) => s + x.price, 0);
    $("#cartText").textContent = `${cart.length} item${cart.length > 1 ? "s" : ""} · $${total}`;
    toast(`Added ${p.n}${sel ? " (" + p.opts[+sel.value] + ")" : ""} to your cart`);
  }));

  /* ---------- Copy buttons ---------- */
  $$("[data-copy]").forEach(btn => btn.addEventListener("click", () => {
    const text = BUSINESS[btn.dataset.copy];
    const done = ok => { btn.textContent = ok ? "Copied" : "Selected"; setTimeout(() => { btn.textContent = "Copy"; }, 1600); };
    const fallback = () => {
      const target = btn.parentElement.querySelector(".val, .num");
      if (target) { const r = document.createRange(); r.selectNodeContents(target); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      done(false);
    };
    try { navigator.clipboard.writeText(text).then(() => done(true), fallback); } catch (e) { fallback(); }
  }));

  /* ---------- Forms ---------- */
  $("#contactForm").addEventListener("submit", e => {
    e.preventDefault();
    const f = e.target;
    const status = $("#formStatus");
    const name = f.elements.name.value.trim(), email = f.elements.email.value.trim(), msg = f.elements.message.value.trim();
    if (!name || !email || !msg) { status.classList.add("is-error"); status.textContent = "Add your name, email, and a message so we can reply."; return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { status.classList.add("is-error"); status.textContent = "That email address looks incomplete. Check it and try again."; return; }
    status.classList.remove("is-error");
    status.textContent = `Thanks, ${name}. This is a design mockup, so nothing was sent.`;
    f.reset();
  });

  const rsDate = $("#rs-date");
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  rsDate.min = iso(today); rsDate.value = iso(today);
  const times = [];
  for (let h = 17; h <= 21; h++) for (const m of [0, 30]) times.push(`${h - 12}:${m ? "30" : "00"} pm`);
  $("#rs-time").innerHTML = times.map(t => `<option ${t === "7:00 pm" ? "selected" : ""}>${t}</option>`).join("");
  $$("[data-action='reserve']").forEach(b => b.addEventListener("click", () => {
    $("#resForm").hidden = false; $("#resDone").hidden = true;
    closeNav(); openDlg($("#reserve"));
  }));
  $("#resForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("#rs-name").value.trim();
    if (!name) { $("#rs-name").focus(); return; }
    const d = new Date(rsDate.value + "T12:00:00");
    $("#resDone").innerHTML = `<strong>Table requested for ${esc(name)}</strong>${fmt(d, { weekday: "long", month: "long", day: "numeric" })} at ${$("#rs-time").value}, party of ${$("#rs-size").value}, ${$("#rs-seat").value.toLowerCase()}.<br><br>This is a design mockup, so no booking was made. A live site would connect this form to the restaurant's booking system.`;
    $("#resForm").hidden = true; $("#resDone").hidden = false;
  });

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  /* ---------- Header ---------- */
  const header = $("#siteHeader");
  const navToggle = $("#navToggle");
  let state;
  const updateHeader = () => header.classList.toggle("scrolled", window.scrollY > 40 || !state.sections.welcome);
  window.addEventListener("scroll", updateHeader, { passive: true });
  function closeNav() { header.classList.remove("open"); navToggle.setAttribute("aria-expanded", "false"); navToggle.setAttribute("aria-label", "Open menu"); }
  navToggle.addEventListener("click", () => {
    const open = !header.classList.contains("open");
    header.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  $$("#navLinks a, .logo").forEach(a => a.addEventListener("click", closeNav));

  /* ---------- Customize ---------- */
  const load = () => {
    try { const s = JSON.parse(localStorage.getItem("ej-mockup")); if (s && s.sections) return { ...DEFAULTS, ...s, sections: { ...DEFAULTS.sections, ...s.sections } }; } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULTS));
  };
  const save = () => { try { localStorage.setItem("ej-mockup", JSON.stringify(state)); } catch (e) {} };
  state = load();

  $("#swList").innerHTML = SECTION_LABELS.map(([id, label]) =>
    `<label class="sw-row" for="sw-${id}">${label}<input class="sw" type="checkbox" role="switch" id="sw-${id}" data-sec="${id}"></label>`).join("");

  function apply() {
    SECTION_LABELS.forEach(([id]) => {
      const on = !!state.sections[id];
      $("#" + id).hidden = !on;
      const li = $(`[data-nav="${id}"]`); if (li) li.hidden = !on;
      $$(`[data-needs="${id}"]`).forEach(el => { el.hidden = !on; });
      $("#sw-" + id).checked = on;
    });
    $("#shopStore").hidden = state.shopMode !== "store";
    $("#shopLink").hidden = state.shopMode !== "link";
    $("#cartPill").hidden = state.shopMode !== "store";
    $("#shopModeStore").checked = state.shopMode === "store";
    $("#shopModeLink").checked = state.shopMode === "link";
    $("#constructionNotice").hidden = !state.notice;
    $("#sw-notice").checked = state.notice;
    updateHeader();
  }
  apply();

  $$("#swList .sw").forEach(sw => sw.addEventListener("change", () => { state.sections[sw.dataset.sec] = sw.checked; save(); apply(); }));
  $$("input[name='shopMode']").forEach(r => r.addEventListener("change", () => { state.shopMode = r.value; save(); apply(); }));
  $("#sw-notice").addEventListener("change", e => { state.notice = e.target.checked; save(); apply(); });
  $("#custReset").addEventListener("click", () => { state = JSON.parse(JSON.stringify(DEFAULTS)); save(); apply(); toast("All sections restored"); });

  const custBtn = $("#custBtn"), custPanel = $("#custPanel");
  const setPanel = open => { custPanel.hidden = !open; custBtn.setAttribute("aria-expanded", String(open)); };
  custBtn.addEventListener("click", () => setPanel(custPanel.hidden));
  $("#custClose").addEventListener("click", () => setPanel(false));
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !custPanel.hidden) setPanel(false); });
})();
