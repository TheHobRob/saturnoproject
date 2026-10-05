// engine.js — shared engine for The Saturno Project games (v0.1 draft)
// Dependency-free ES module. Each game imports this and supplies only its own rules.
//
//   import { Engine } from '../engine.js';
//   const game = new Engine({ id: 'ring-runner', width: 320, height: 180 });
//   // Input is the standard controller: stick, A, B, start. Scenes name what A and B do:
//   game.add('play', { controls: { a: 'JUMP', b: 'ATTACK' }, update(dt, g) { if (g.input.pressed('a')) {} } });
//   game.add('play', { enter(g) {}, update(dt, g) {}, render(ctx, g) {} });
//   game.mount(document.getElementById('game'));
//   game.go('play');
//   game.start();

export const STEP = 1 / 60;

export const DEFAULT_PALETTE = {
  ink: '#2E2517',
  paper: '#F2ECDD',
  steel: '#B08F52',
  signal: '#5D6A39',
  glow: '#8FA35E',
  bg: '#2E2517'
};

// The standard controller every game shares: a stick, A and B, and Start.
// Games read 'a' and 'b' and let each scene decide what they mean (see scene.controls).
export const DEFAULT_KEYS = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  a: ['KeyZ', 'KeyJ', 'Enter'],
  b: ['KeyX', 'KeyK', 'Space'],
  start: ['KeyP', 'Escape']
};

// What A and B are called when a scene does not say otherwise.
export const DEFAULT_LABELS = { a: 'OK', b: 'BACK' };

const keyName = (code) => (code || '').replace(/^Key/, '').replace(/^Digit/, '');

/* ---------- Math, easing, rng, collision ---------- */

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => t * (2 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  outBack: (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2)
};

// Small seeded RNG so levels and waves can be reproducible.
export function rng(seed = Date.now()) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + next() * (hi - lo);
  next.int = (lo, hi) => Math.floor(next.range(lo, hi + 1));
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  return next;
}

// Rects are { x, y, w, h }. Circles are { x, y, r }.
export const aabb = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export const circles = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 < (a.r + b.r) ** 2;
export const circleRect = (c, r) => {
  const nx = clamp(c.x, r.x, r.x + r.w);
  const ny = clamp(c.y, r.y, r.y + r.h);
  return (c.x - nx) ** 2 + (c.y - ny) ** 2 < c.r ** 2;
};
export const pointInRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

/* ---------- Storage (namespaced per game) ---------- */

export class Store {
  constructor(id) {
    this.prefix = `saturno:${id}:`;
  }
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
  set(key, value) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch {
      /* storage blocked: fail quietly */
    }
  }
  // Returns true when the score is a new best.
  submitScore(score) {
    const best = this.get('best', 0);
    if (score > best) {
      this.set('best', score);
      return true;
    }
    return false;
  }
}

/* ---------- Input: keyboard, pointer, and touch buttons behind named actions ---------- */

export class Input {
  constructor() {
    this.keyToActions = {};
    this.held = new Set();
    this.hit = new Set();
    this.up = new Set();
    this.pointer = { x: 0, y: 0, down: false };
    this.stick = { x: 0, y: 0 }; // analog -1..1, driven by the touch joystick
    this._kd = (e) => {
      const acts = this.keyToActions[e.code];
      if (!acts) return;
      e.preventDefault(); // stop arrow keys and space from scrolling the page
      if (e.repeat) return;
      acts.forEach((a) => this.press(a));
    };
    this._ku = (e) => {
      const acts = this.keyToActions[e.code];
      if (acts) acts.forEach((a) => this.release(a));
    };
    this._blur = () => [...this.held].forEach((a) => this.release(a));
    this.bind(DEFAULT_KEYS);
  }
  // map: { action: ['KeyCode', ...] } replaces every binding.
  bind(map) {
    this.bindings = {};
    this.keyToActions = {};
    for (const [action, keys] of Object.entries(map)) {
      this.bindings[action] = [...keys];
      for (const k of keys) (this.keyToActions[k] ||= []).push(action);
    }
  }
  // Adds keys or actions on top of the defaults, e.g. extend({ a: ['KeyC'] }).
  extend(map) {
    const merged = { ...this.bindings };
    for (const [action, keys] of Object.entries(map)) merged[action] = [...(merged[action] || []), ...keys];
    this.bind(merged);
  }
  firstKey(action) {
    return (this.bindings[action] || [])[0];
  }
  press(a) {
    if (!this.held.has(a)) this.hit.add(a);
    this.held.add(a);
  }
  release(a) {
    if (this.held.delete(a)) this.up.add(a);
  }
  isDown(a) {
    return this.held.has(a);
  }
  pressed(a) {
    return this.hit.has(a);
  }
  released(a) {
    return this.up.has(a);
  }
  axis(neg, pos) {
    return (this.isDown(pos) ? 1 : 0) - (this.isDown(neg) ? 1 : 0);
  }
  endFrame() {
    this.hit.clear();
    this.up.clear();
  }
  attach() {
    window.addEventListener('keydown', this._kd);
    window.addEventListener('keyup', this._ku);
    window.addEventListener('blur', this._blur);
  }
  detach() {
    window.removeEventListener('keydown', this._kd);
    window.removeEventListener('keyup', this._ku);
    window.removeEventListener('blur', this._blur);
  }
}

/* ---------- Audio: tiny synth, no asset files needed ---------- */

const PRESETS = {
  select: { freq: 520, slide: 520, dur: 0.06, type: 'triangle', vol: 0.15 },
  jump: { freq: 300, slide: 700, dur: 0.14, type: 'square', vol: 0.14 },
  coin: { freq: 880, slide: 1320, dur: 0.1, type: 'square', vol: 0.12 },
  hit: { freq: 180, slide: 60, dur: 0.18, type: 'sawtooth', vol: 0.2 },
  boom: { noise: true, dur: 0.35, vol: 0.25 }
};

export class Sfx {
  constructor(store) {
    this.ctx = null;
    this.store = store;
    this.muted = store.get('muted', false);
  }
  // Mobile browsers only allow audio after a user gesture; call from the first tap.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) this.ctx = new AC();
  }
  setMuted(m) {
    this.muted = m;
    this.store.set('muted', m);
  }
  play(name) {
    const p = PRESETS[name];
    if (!p || this.muted || !this.ctx) return;
    p.noise ? this.noise(p) : this.tone(p);
  }
  tone({ freq = 440, slide = freq, dur = 0.1, type = 'square', vol = 0.15 }) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, freq), t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, slide), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  }
  noise({ dur = 0.2, vol = 0.2 }) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = buf;
    gain.gain.value = vol;
    src.connect(gain).connect(this.ctx.destination);
    src.start(t);
  }
}

/* ---------- Assets ---------- */

export function loadImages(map) {
  const entries = Object.entries(map);
  return Promise.all(
    entries.map(
      ([, src]) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Could not load ${src}`));
          img.src = src;
        })
    )
  ).then((imgs) => Object.fromEntries(entries.map(([k], i) => [k, imgs[i]])));
}

export class SpriteSheet {
  constructor(image, frameW, frameH) {
    this.image = image;
    this.fw = frameW;
    this.fh = frameH;
    this.cols = Math.floor(image.width / frameW);
  }
  draw(ctx, frame, x, y, { flip = false, sx = 1, sy = 1 } = {}) {
    const col = frame % this.cols;
    const row = Math.floor(frame / this.cols);
    ctx.save();
    ctx.translate(Math.round(x + (flip ? this.fw : 0)), Math.round(y));
    ctx.scale(flip ? -sx : sx, sy); // sx/sy give squash and stretch
    ctx.drawImage(this.image, col * this.fw, row * this.fh, this.fw, this.fh, 0, 0, this.fw, this.fh);
    ctx.restore();
  }
}

/* ---------- Engine ---------- */

export class Engine {
  constructor({ id = 'game', width = 320, height = 180, palette = {}, forceTouch = false } = {}) {
    this.id = id;
    this.w = width;
    this.h = height;
    this.palette = { ...DEFAULT_PALETTE, ...palette };
    this.forceTouch = forceTouch;
    this.touchActive = false;
    this.stacked = false;
    this.controls = { ...DEFAULT_LABELS };

    this.store = new Store(id);
    this.input = new Input();
    this.sfx = new Sfx(this.store);
    this.rand = rng();

    this.scenes = {};
    this.current = null;
    this.particles = [];
    this.tweens = [];
    this.time = 0;
    this.running = false;
    this.paused = false;
    this._shake = { mag: 0, t: 0, dur: 0 };
    this._hitstop = 0;
    this._acc = 0;
    this._last = 0;
    this._raf = 0;
  }

  /* --- lifecycle (the Orbit console calls these) --- */

  mount(container) {
    this.container = container;
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    Object.assign(container.style, { display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', touchAction: 'none', userSelect: 'none', background: this.palette.bg });

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.canvas.style.imageRendering = 'pixelated';
    this.canvas.style.touchAction = 'none';
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    container.appendChild(this.canvas);

    this._onResize = () => {
      this._layout();
      this._fit();
    };
    this._ro = new ResizeObserver(this._onResize);
    this._ro.observe(container);
    this._fit();

    this._onPointer = (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.input.pointer.x = ((e.clientX - r.left) / r.width) * this.w;
      this.input.pointer.y = ((e.clientY - r.top) / r.height) * this.h;
      if (e.type === 'pointerdown') this.input.pointer.down = true;
      if (e.type === 'pointerup' || e.type === 'pointercancel') this.input.pointer.down = false;
    };
    this.container.addEventListener('pointerdown', this._onPointer);
    this.canvas.addEventListener('pointermove', this._onPointer);
    ['pointerup', 'pointercancel'].forEach((t) => window.addEventListener(t, this._onPointer));

    this._unlock = () => this.sfx.unlock();
    window.addEventListener('pointerdown', this._unlock);
    window.addEventListener('keydown', this._unlock);

    this._onVisibility = () => (document.hidden ? this.pause() : this.resume());
    document.addEventListener('visibilitychange', this._onVisibility);

    this.input.attach();
    return this;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this._last = performance.now();
    this._raf = requestAnimationFrame((t) => this._frame(t));
  }

  pause() {
    this.paused = true;
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    this._last = performance.now();
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this._raf);
    this.input.detach();
    this._ro?.disconnect();
    window.removeEventListener('pointerdown', this._unlock);
    window.removeEventListener('keydown', this._unlock);
    this.container?.removeEventListener('pointerdown', this._onPointer);
    window.removeEventListener('pointerup', this._onPointer);
    window.removeEventListener('pointercancel', this._onPointer);
    if (this._stickDown) {
      this.container.removeEventListener('pointerdown', this._stickDown);
      window.removeEventListener('pointermove', this._stickMove);
      window.removeEventListener('pointerup', this._stickUp);
      window.removeEventListener('pointercancel', this._stickUp);
      window.removeEventListener('pointerdown', this._touchSeen, true);
    }
    document.removeEventListener('visibilitychange', this._onVisibility);
    this.current?.exit?.(this);
    this.touchLayer?.remove();
    this.canvas?.remove();
  }

  /* --- scenes: title -> play -> pause -> game over --- */

  add(name, scene) {
    this.scenes[name] = scene;
    return this;
  }

  go(name, data) {
    this.current?.exit?.(this);
    this.current = this.scenes[name];
    if (!this.current) throw new Error(`Unknown scene: ${name}`);
    this.setControls(this.current.controls || DEFAULT_LABELS);
    this.current.enter?.(this, data);
  }

  /* --- the standard controller: A and B change meaning per scene --- */

  // labels: { a: 'FIRE', b: 'DASH', start: 'PAUSE' }. A missing or null label hides that button on touch screens.
  setControls(labels) {
    this.controls = { a: labels.a ?? null, b: labels.b ?? null, start: labels.start ?? null };
    this._applyLabels();
  }

  // Display name of the keyboard key behind a button, e.g. keyFor('a') -> 'Z'.
  keyFor(name) {
    return keyName(this.input.firstKey(name));
  }

  // "Z: FIRE   Space: DASH" on keyboards, "A: FIRE   B: DASH" on touch screens.
  hintLine() {
    return ['a', 'b']
      .filter((n) => this.controls[n])
      .map((n) => `${this.touchActive ? n.toUpperCase() : this.keyFor(n)}: ${this.controls[n]}`)
      .join('   ');
  }

  _applyLabels() {
    if (!this._btn) return;
    for (const [name, el] of Object.entries(this._btn)) {
      const label = this.controls[name];
      if (!label) {
        el.style.display = 'none';
        this.input.release(name);
      } else {
        el.style.display = 'flex';
        el._cap.textContent = label;
        el.setAttribute('aria-label', `${name.toUpperCase()} button: ${label}`);
      }
    }
  }

  /* --- juice --- */

  shake(mag = 4, dur = 0.25) {
    this._shake = { mag, t: dur, dur };
  }

  // Freeze the game for a moment on impact.
  hitstop(seconds = 0.06) {
    this._hitstop = Math.max(this._hitstop, seconds);
  }

  burst(x, y, { count = 12, color = this.palette.paper, speed = 60, life = 0.5, size = 2, gravity = 0 } = {}) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color, size, gravity });
    }
  }

  tween({ from = 0, to = 1, dur = 0.3, ease: fn = ease.outQuad, onUpdate, onDone }) {
    this.tweens.push({ from, to, dur, t: 0, fn, onUpdate, onDone });
  }

  /* --- touch controls: floating joystick + buttons, touch devices only --- */

  // Nothing is drawn on desktop. The layer appears on coarse-pointer devices, or the
  // first time a finger touches the screen (hybrid laptops), and hides again on mouse use.
  // buttons: which of A/B to draw, left to right. start: the Game Boy-style pill at bottom center.
  // All labels come from scene.controls, and a missing label hides the button.
  touchControls({ stick = true, start = true, buttons = ['b', 'a'] } = {}) {
    const pal = this.palette;
    this.touchActive = window.matchMedia('(pointer: coarse)').matches || this.forceTouch;

    const layer = document.createElement('div');
    Object.assign(layer.style, { position: 'absolute', inset: '0', pointerEvents: 'none', display: this.touchActive ? 'flex' : 'none', justifyContent: 'flex-end', alignItems: 'flex-end', padding: '16px', gap: '12px' });

    const row = document.createElement('div');
    Object.assign(row.style, { display: 'flex', alignItems: 'flex-end', gap: '12px', pointerEvents: 'none' });
    layer.appendChild(row);

    this._btn = {};
    for (const name of buttons) {
      const el = document.createElement('button');
      el.type = 'button';
      Object.assign(el.style, { pointerEvents: 'auto', width: '68px', height: '68px', borderRadius: '34px', border: `3px solid ${pal.paper}`, background: 'rgba(46, 37, 23, 0.6)', color: pal.paper, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0', touchAction: 'none', marginBottom: name === 'a' ? '28px' : '0' });
      const letter = document.createElement('span');
      letter.textContent = name.toUpperCase();
      Object.assign(letter.style, { font: '700 22px "Space Grotesk", sans-serif', lineHeight: '1' });
      const cap = document.createElement('span');
      Object.assign(cap.style, { font: '700 9px "Space Grotesk", sans-serif', letterSpacing: '0.06em', lineHeight: '1.2' });
      el.append(letter, cap);
      el._cap = cap;
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        this.input.press(name);
      });
      const up = () => this.input.release(name);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      this._btn[name] = el;
      row.appendChild(el);
    }

    if (start) {
      const el = document.createElement('button');
      el.type = 'button';
      Object.assign(el.style, { pointerEvents: 'auto', position: 'absolute', left: '50%', bottom: '16px', transform: 'translateX(-50%)', minWidth: '88px', height: '44px', padding: '0 18px', borderRadius: '22px', border: `3px solid ${pal.paper}`, background: 'rgba(46, 37, 23, 0.6)', color: pal.paper, font: '700 11px "Space Grotesk", sans-serif', letterSpacing: '0.1em', alignItems: 'center', justifyContent: 'center', touchAction: 'none' });
      el._cap = el; // the pill is all label, no letter
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        this.input.press('start');
      });
      const up = () => this.input.release('start');
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      this._btn.start = el;
      layer.appendChild(el);
    }

    // Floating joystick: appears where the left thumb lands, so it never covers the action.
    const R = 44;
    let base = null;
    let thumb = null;
    if (stick) {
      base = document.createElement('div');
      Object.assign(base.style, { position: 'absolute', display: 'none', width: `${R * 2}px`, height: `${R * 2}px`, borderRadius: '50%', border: `3px solid ${pal.paper}`, background: 'rgba(46, 37, 23, 0.35)', boxSizing: 'border-box', opacity: '0.7' });
      thumb = document.createElement('div');
      Object.assign(thumb.style, { position: 'absolute', left: `${R - 20 - 3}px`, top: `${R - 20 - 3}px`, width: '40px', height: '40px', borderRadius: '50%', background: pal.paper, opacity: '0.85' });
      base.appendChild(thumb);
      layer.appendChild(base);
    }

    const hint = document.createElement('div');
    hint.textContent = 'MOVE';
    Object.assign(hint.style, { position: 'absolute', left: '0', top: '0', width: '60%', height: '100%', display: 'none', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: pal.paper, opacity: '0.25', font: '700 13px "Space Grotesk", sans-serif', letterSpacing: '0.3em' });
    layer.appendChild(hint);
    this._stickHint = hint;

    this.container.appendChild(layer);
    this.touchLayer = layer;
    this._applyLabels();

    const zero = () => {
      this.input.stick.x = 0;
      this.input.stick.y = 0;
    };
    const local = (e) => {
      const r = this.touchLayer.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
    };

    let id = null;
    let ox = 0;
    let oy = 0;

    this._stickDown = (e) => {
      if (!stick || !this.touchActive || id !== null) return;
      if (e.target.closest && e.target.closest('button')) return;
      const p = local(e);
      if (p.y < 0 || p.y > p.h || p.x < 0 || p.x > p.w * 0.6) return; // joystick zone: left 60% of the controller area
      id = e.pointerId;
      ox = p.x;
      oy = p.y;
      Object.assign(base.style, { display: 'block', left: `${ox - R}px`, top: `${oy - R}px` });
      hint.style.opacity = '0';
      thumb.style.transform = 'translate(0px, 0px)';
    };
    this._stickMove = (e) => {
      if (e.pointerId !== id) return;
      const p = local(e);
      let dx = p.x - ox;
      let dy = p.y - oy;
      const len = Math.hypot(dx, dy);
      if (len > R) {
        dx = (dx / len) * R;
        dy = (dy / len) * R;
      }
      thumb.style.transform = `translate(${dx}px, ${dy}px)`;
      const nx = dx / R;
      const ny = dy / R;
      if (Math.hypot(nx, ny) < 0.18) zero(); // small dead zone
      else {
        this.input.stick.x = nx;
        this.input.stick.y = ny;
      }
    };
    this._stickUp = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      if (base) base.style.display = 'none';
      hint.style.opacity = '0.25';
      zero();
    };
    this._touchSeen = (e) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        this.touchActive = true;
        layer.style.display = 'flex';
      } else if (e.pointerType === 'mouse' && !this.forceTouch) {
        this.touchActive = false;
        layer.style.display = 'none';
        zero();
      } else return;
      this._layout();
      this._fit();
    };

    this.container.addEventListener('pointerdown', this._stickDown);
    window.addEventListener('pointermove', this._stickMove);
    window.addEventListener('pointerup', this._stickUp);
    window.addEventListener('pointercancel', this._stickUp);
    window.addEventListener('pointerdown', this._touchSeen, true);
    this._layout();
    this._fit();
  }

  /* --- internals --- */

  // Portrait touch screens get the Game Boy layout: game screen on top, controller area
  // underneath. Landscape touch screens overlay the controls on the sides. Desktop has none.
  _layout() {
    const L = this.touchLayer;
    if (!L) return;
    const cw = this.container.clientWidth;
    const ch = this.container.clientHeight;
    this.stacked = this.touchActive && ch > cw * 1.15;
    const c = this.container.style;
    if (this.stacked) {
      Object.assign(c, { flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center' });
      Object.assign(L.style, { position: 'relative', inset: 'auto', flex: '1 1 0', width: '100%', minHeight: '0', padding: '16px 16px 72px', background: 'rgba(0, 0, 0, 0.22)', borderTop: `3px solid ${this.palette.band}`, boxSizing: 'border-box' });
    } else {
      Object.assign(c, { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' });
      Object.assign(L.style, { position: 'absolute', inset: '0', flex: 'none', width: 'auto', minHeight: '', padding: '16px', background: 'none', borderTop: 'none', boxSizing: 'content-box' });
    }
    if (this._stickHint) this._stickHint.style.display = this.stacked ? 'flex' : 'none';
  }

  _fit() {
    const cw = this.container.clientWidth;
    const ch = this.container.clientHeight;
    // Stacked: fill the width, but always leave at least 220px for the controller area.
    let s = this.stacked ? Math.min(cw / this.w, (ch - 220) / this.h) : Math.min(cw / this.w, ch / this.h);
    s = Math.max(s, 0.25);
    // Whole-number scaling keeps pixels crisp, but only snap when it wastes little
    // space. On a 390px phone, 1.2x beats a tiny 1x canvas.
    const snapped = Math.floor(s);
    if (snapped >= 1 && snapped / s > 0.85) s = snapped;
    this.scale = s;
    this.canvas.style.width = `${this.w * s}px`;
    this.canvas.style.height = `${this.h * s}px`;
  }

  _frame(now) {
    if (!this.running) return;
    this._raf = requestAnimationFrame((t) => this._frame(t));
    let dt = Math.min(0.25, (now - this._last) / 1000);
    this._last = now;

    if (!this.paused) {
      if (this._hitstop > 0) {
        this._hitstop -= dt;
        dt = 0;
      }
      this._acc += dt;
      while (this._acc >= STEP) {
        this._update(STEP);
        this.input.endFrame();
        this._acc -= STEP;
      }
    }
    this._render();
  }

  _update(dt) {
    this.time += dt;
    this.current?.update?.(dt, this);

    if (this._shake.t > 0) this._shake.t -= dt;

    for (const p of this.particles) {
      p.life -= dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    for (const tw of this.tweens) {
      tw.t += dt;
      const k = clamp(tw.t / tw.dur, 0, 1);
      tw.onUpdate?.(lerp(tw.from, tw.to, tw.fn(k)));
      if (k >= 1) tw.onDone?.();
    }
    this.tweens = this.tweens.filter((tw) => tw.t < tw.dur);
  }

  _render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = this.palette.bg;
    ctx.fillRect(0, 0, this.w, this.h);

    if (this._shake.t > 0) {
      const m = this._shake.mag * (this._shake.t / this._shake.dur);
      ctx.translate(Math.round((Math.random() - 0.5) * 2 * m), Math.round((Math.random() - 0.5) * 2 * m));
    }

    this.current?.render?.(ctx, this);

    for (const p of this.particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
