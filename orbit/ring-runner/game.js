// game.js — Ring Runner prototype (placeholder shapes, no sprite files yet)
import { Engine, aabb, clamp } from '../engine.js';
import { palette } from './palette.js';

const W = 320;
const H = 180;
const P = palette;

export const game = new Engine({ id: 'ring-runner', width: W, height: H, palette });

// Three waves, then the boss.
const WAVES = [
  { debris: 8, drones: 0, gap: 0.9 },
  { debris: 6, drones: 5, gap: 0.8 },
  { debris: 8, drones: 8, gap: 0.65 }
];

/* ---------- helpers ---------- */

function text(ctx, str, x, y, { size = 8, color = P.paper, align = 'left' } = {}) {
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.fillText(str, Math.round(x), Math.round(y));
}

const dust = Array.from({ length: 70 }, () => ({
  x: Math.random() * W,
  y: 14 + Math.random() * (H - 14),
  v: 20 + Math.random() * 120,
  len: 1 + Math.floor(Math.random() * 4),
  c: Math.random() < 0.25 ? P.steel : P.dust
}));

function scrollDust(dt, mul = 1) {
  for (const d of dust) {
    d.x -= d.v * mul * dt;
    if (d.x < -8) {
      d.x = W + Math.random() * 20;
      d.y = 14 + Math.random() * (H - 14);
    }
  }
}

function drawBackdrop(ctx) {
  ctx.fillStyle = P.band;
  ctx.fillRect(0, 34, W, 14);
  ctx.fillRect(0, 92, W, 6);
  ctx.fillRect(0, 128, W, 22);
  for (const d of dust) {
    ctx.fillStyle = d.c;
    ctx.fillRect(Math.round(d.x), Math.round(d.y), d.len * 2, 1);
  }
}

// Pointer "tap" detection shared by the menu scenes.
let prevDown = false;
function tapped(g) {
  const d = g.input.pointer.down;
  const tap = d && !prevDown;
  prevDown = d;
  return tap;
}

/* ---------- title ---------- */

const title = {
  controls: { a: 'START' },
  enter() {
    this.lock = 0.4;
  },
  update(dt, g) {
    scrollDust(dt);
    this.lock -= dt;
    const tap = tapped(g);
    if (this.lock <= 0 && (tap || g.input.pressed('a'))) {
      g.sfx.play('select');
      g.go('play');
    }
  },
  render(ctx, g) {
    drawBackdrop(ctx);
    text(ctx, 'RING RUNNER', W / 2, 50, { size: 22, align: 'center' });
    text(ctx, 'Survive the belt. Beat the boss.', W / 2, 78, { size: 8, color: P.steel, align: 'center' });
    const touch = g.touchActive;
    text(ctx, touch ? 'Left thumb: move' : 'Arrows / WASD: move', W / 2, 98, { size: 8, align: 'center' });
    text(ctx, 'A: FIRE   B: DASH', W / 2, 110, { size: 8, align: 'center' });
    if (Math.floor(g.time * 2) % 2 === 0) text(ctx, touch ? 'TAP TO START' : `PRESS ${g.keyFor('a')} TO START`, W / 2, 130, { size: 9, color: P.glow, align: 'center' });
    text(ctx, `BEST ${g.store.get('best', 0)}`, W / 2, 152, { size: 8, align: 'center' });
  }
};

/* ---------- play ---------- */

let S = null;

function startWave(n, g) {
  S.wave = n;
  S.phase = 'intro';
  S.phaseT = 1.6;
  S.banner = n > WAVES.length ? 'BOSS' : `WAVE ${n}`;
  S.queue = [];
  if (n <= WAVES.length) {
    const w = WAVES[n - 1];
    S.queue = [...Array(w.debris).fill('d'), ...Array(w.drones).fill('r')];
    for (let i = S.queue.length - 1; i > 0; i--) {
      const j = Math.floor(g.rand() * (i + 1));
      [S.queue[i], S.queue[j]] = [S.queue[j], S.queue[i]];
    }
    S.gap = w.gap;
  }
}

function spawn(kind, g) {
  const r = g.rand;
  if (kind === 'd') {
    const rad = r.range(4, 8);
    const pts = Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2;
      const k = r.range(0.7, 1.1);
      return [Math.cos(a) * rad * k, Math.sin(a) * rad * k];
    });
    S.foes.push({ type: 'debris', x: W + 10, y: r.range(18, H - 10), r: rad, vx: -r.range(40, 75), vy: r.range(-10, 10), hp: rad > 6 ? 2 : 1, pts });
  } else {
    S.foes.push({ type: 'drone', x: W + 10, y: 0, baseY: r.range(28, H - 20), vx: -42, t: 0, hp: 1, shootT: r.range(0.8, 1.6) });
  }
}

function spawnBoss() {
  S.boss = { type: 'boss', x: W + 40, y: H / 2, w: 30, h: 44, hp: 40, max: 40, t: 0, shootT: 1.5 };
}

function aimShot(x, y, tx, ty, speed, spread = 0) {
  const a = Math.atan2(ty - y, tx - x) + spread;
  S.shots.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed });
}

const rectOf = (f) => {
  if (f.type === 'debris') return { x: f.x - f.r, y: f.y - f.r, w: f.r * 2, h: f.r * 2 };
  if (f.type === 'drone') return { x: f.x - 5, y: f.y - 3, w: 10, h: 6 };
  return { x: f.x - f.w / 2, y: f.y - f.h / 2, w: f.w, h: f.h };
};

function damage(f, g) {
  f.hp -= 1;
  if (f.hp > 0) {
    g.burst(f.x, f.y, { count: 4, color: P.paper, speed: 40, life: 0.25 });
    g.sfx.play('select');
    return;
  }
  if (f.type === 'boss') {
    g.burst(f.x, f.y, { count: 50, color: P.hot, speed: 110, life: 0.9, size: 3 });
    g.burst(f.x, f.y, { count: 30, color: P.steel, speed: 80, life: 0.8, size: 2 });
    g.shake(8, 0.6);
    g.hitstop(0.15);
    g.sfx.play('boom');
    S.boss = null;
    S.shots = [];
    return;
  }
  f.dead = true;
  S.score += f.type === 'debris' ? 10 : 25;
  g.burst(f.x, f.y, { count: 10, color: f.type === 'debris' ? P.steel : P.glow, speed: 70, life: 0.4 });
  g.sfx.play(f.type === 'debris' ? 'hit' : 'coin');
  g.shake(1.5, 0.1);
}

function hurt(g) {
  const p = S.player;
  p.hp -= 1;
  p.inv = 1.4;
  g.shake(5, 0.3);
  g.hitstop(0.08);
  g.sfx.play('hit');
  g.burst(p.x + 6, p.y + 4, { count: 14, color: P.paper, speed: 80, life: 0.5 });
  if (p.hp <= 0) {
    S.dead = true;
    S.deadT = 0.9;
    g.burst(p.x + 6, p.y + 4, { count: 40, color: P.hot, speed: 100, life: 0.8, size: 3 });
    g.sfx.play('boom');
  }
}

function updatePlayer(dt, g) {
  const p = S.player;
  const inp = g.input;
  p.inv = Math.max(0, p.inv - dt);
  p.fireCD -= dt;
  p.dashCD -= dt;
  let ix = inp.axis('left', 'right');
  let iy = inp.axis('up', 'down');
  const analog = Math.hypot(inp.stick.x, inp.stick.y) > 0;
  if (analog) {
    ix = inp.stick.x;
    iy = inp.stick.y;
  }

  if (p.dash > 0) {
    p.dash -= dt;
    p.x += p.dx * 230 * dt;
    p.y += p.dy * 230 * dt;
    g.burst(p.x, p.y + 4, { count: 1, color: P.glow, speed: 15, life: 0.25 });
  } else {
    if (ix || iy) {
      const len = Math.hypot(ix, iy);
      const mag = analog ? Math.min(1, len) : 1; // joystick push sets the speed
      p.dx = ix / len;
      p.dy = iy / len;
      p.x += p.dx * 100 * mag * dt;
      p.y += p.dy * 100 * mag * dt;
    } else {
      p.dx = 1;
      p.dy = 0;
    }
    if (inp.pressed('b') && p.dashCD <= 0) {
      p.dash = 0.18;
      p.dashCD = 1;
      g.sfx.tone({ freq: 200, slide: 900, dur: 0.16, type: 'sawtooth', vol: 0.1 });
    }
  }
  p.x = clamp(p.x, 6, 150);
  p.y = clamp(p.y, 14, H - p.h - 4);

  if (inp.isDown('a') && p.fireCD <= 0 && p.dash <= 0) {
    p.fireCD = 0.16;
    S.bullets.push({ x: p.x + p.w, y: p.y + p.h / 2 - 1, vx: 230, w: 5, h: 2 });
    g.sfx.tone({ freq: 700, slide: 300, dur: 0.06, type: 'square', vol: 0.07 });
  }
}

function updateEnemies(dt, g) {
  const p = S.player;
  for (const f of S.foes) {
    if (f.type === 'debris') {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
    } else {
      f.t += dt;
      f.x += f.vx * dt;
      f.y = f.baseY + Math.sin(f.t * 3) * 14;
      f.shootT -= dt;
      if (f.shootT <= 0 && f.x < W - 20 && f.x > p.x + 30) {
        aimShot(f.x - 5, f.y, p.x + 6, p.y + 4, 70);
        f.shootT = 1.6 + g.rand() * 0.8;
      }
    }
    if (f.x < -20) f.dead = true;
  }

  const b = S.boss;
  if (b) {
    b.t += dt;
    if (b.x > 268) {
      b.x -= 40 * dt;
    } else {
      b.y = H / 2 + Math.sin(b.t * 1.2) * 48;
      b.shootT -= dt;
      if (b.shootT <= 0) {
        const n = b.hp < b.max / 2 ? 2 : 1;
        for (let i = -n; i <= n; i++) aimShot(b.x - 16, b.y, p.x + 6, p.y + 4, 80, i * 0.28);
        g.sfx.tone({ freq: 240, slide: 120, dur: 0.12, type: 'sawtooth', vol: 0.09 });
        b.shootT = b.hp < b.max / 2 ? 0.9 : 1.4;
      }
    }
  }

  for (const s of S.shots) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
  }
  S.shots = S.shots.filter((s) => s.x > -6 && s.x < W + 6 && s.y > -6 && s.y < H + 6);
}

function collide(g) {
  const p = S.player;
  const targets = S.boss ? [...S.foes, S.boss] : S.foes;

  for (const b of S.bullets) {
    for (const f of targets) {
      if (f.dead || b.dead) continue;
      if (aabb(b, rectOf(f))) {
        b.dead = true;
        damage(f, g);
      }
    }
  }

  if (!S.dead && p.inv <= 0 && p.dash <= 0) {
    const box = { x: p.x + 2, y: p.y + 1, w: p.w - 4, h: p.h - 2 };
    for (const f of targets) {
      if (f.dead) continue;
      if (aabb(box, rectOf(f))) {
        if (f.type !== 'boss') {
          f.dead = true;
          g.burst(f.x, f.y, { count: 8, color: P.steel, speed: 60, life: 0.3 });
        }
        hurt(g);
        return;
      }
    }
    for (const s of S.shots) {
      if (aabb(box, { x: s.x - 1, y: s.y - 1, w: 3, h: 3 })) {
        s.dead = true;
        hurt(g);
        return;
      }
    }
  }
}

function updatePhase(dt, g) {
  switch (S.phase) {
    case 'intro':
      S.phaseT -= dt;
      if (S.phaseT <= 0) {
        if (S.wave > WAVES.length) {
          spawnBoss();
          S.phase = 'boss';
        } else {
          S.phase = 'fight';
          S.spawnT = 0;
        }
      }
      break;
    case 'fight':
      S.spawnT -= dt;
      if (S.queue.length && S.spawnT <= 0) {
        spawn(S.queue.pop(), g);
        S.spawnT = S.gap;
      }
      if (!S.queue.length && S.foes.length === 0) {
        S.score += 100 * S.wave;
        S.phase = 'clear';
        S.phaseT = 1.4;
        S.banner = 'WAVE CLEAR';
        g.sfx.play('coin');
      }
      break;
    case 'clear':
      S.phaseT -= dt;
      if (S.phaseT <= 0) startWave(S.wave + 1, g);
      break;
    case 'boss':
      if (!S.boss) {
        S.score += 500;
        S.phase = 'won';
        S.phaseT = 2;
        S.banner = 'BELT CLEARED';
      }
      break;
    case 'won':
      S.phaseT -= dt;
      if (S.phaseT <= 0) g.go('over', { won: true, score: S.score });
      break;
  }
}

function drawPlayer(ctx) {
  const p = S.player;
  if (S.dead) return;
  if (p.inv > 0 && Math.floor(p.inv * 14) % 2 === 0) return; // blink while invulnerable
  const x = Math.round(p.x);
  const y = Math.round(p.y);
  const fl = 2 + Math.floor((S.t * 30) % 3);
  ctx.fillStyle = P.glow;
  ctx.fillRect(x - fl, y + 3, fl, 2);
  if (p.dash > 0) {
    ctx.globalAlpha = 0.35;
    ctx.fillRect(x - 22, y + 1, 22, 6);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = P.paper;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + p.w, y + p.h / 2);
  ctx.lineTo(x, y + p.h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = P.signal;
  ctx.fillRect(x + 2, y + 3, 4, 2);
}

function drawFoes(ctx) {
  for (const f of S.foes) {
    if (f.type === 'debris') {
      ctx.fillStyle = P.steel;
      ctx.beginPath();
      f.pts.forEach(([px, py], i) => (i ? ctx.lineTo(f.x + px, f.y + py) : ctx.moveTo(f.x + px, f.y + py)));
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = P.dust;
      ctx.fillRect(Math.round(f.x - 1), Math.round(f.y - 1), 2, 2);
    } else {
      const x = Math.round(f.x);
      const y = Math.round(f.y);
      ctx.fillStyle = P.signal;
      ctx.fillRect(x - 5, y - 3, 10, 6);
      ctx.fillStyle = P.glow;
      ctx.fillRect(x - 5, y - 1, 2, 2);
      ctx.fillStyle = P.paper;
      ctx.fillRect(x - 2, y - 5, 4, 2);
      ctx.fillRect(x - 2, y + 3, 4, 2);
    }
  }
  const b = S.boss;
  if (b) {
    const x = Math.round(b.x);
    const y = Math.round(b.y);
    ctx.fillStyle = P.steel;
    ctx.fillRect(x - 15, y - 22, 30, 44);
    ctx.fillStyle = P.band;
    ctx.fillRect(x - 15, y - 22, 6, 44);
    ctx.fillStyle = b.hp < b.max / 2 && Math.floor(S.t * 6) % 2 ? P.hot : P.glow;
    ctx.fillRect(x - 6, y - 6, 12, 12);
    ctx.fillStyle = P.ink;
    ctx.fillRect(x - 2, y - 2, 4, 4);
    // health bar
    ctx.fillStyle = P.ink;
    ctx.fillRect(W / 2 - 41, 14, 82, 5);
    ctx.fillStyle = P.hot;
    ctx.fillRect(W / 2 - 40, 15, Math.max(0, (b.hp / b.max) * 80), 3);
  }
  ctx.fillStyle = P.hot;
  for (const s of S.shots) ctx.fillRect(Math.round(s.x - 1), Math.round(s.y - 1), 3, 3);
}

function drawHud(ctx, g) {
  text(ctx, `SCORE ${S.score}`, 4, 3);
  text(ctx, S.wave > WAVES.length ? 'BOSS' : `WAVE ${S.wave}`, W / 2, 3, { align: 'center', color: P.steel });
  for (let i = 0; i < S.player.hp; i++) {
    const x = W - 12 - i * 12;
    ctx.fillStyle = P.paper;
    ctx.beginPath();
    ctx.moveTo(x, 3);
    ctx.lineTo(x + 8, 7);
    ctx.lineTo(x, 11);
    ctx.closePath();
    ctx.fill();
  }
  // dash charge
  const c = clamp(1 - S.player.dashCD, 0, 1);
  ctx.fillStyle = P.band;
  ctx.fillRect(4, H - 7, 24, 3);
  ctx.fillStyle = c >= 1 ? P.glow : P.steel;
  ctx.fillRect(4, H - 7, Math.round(24 * c), 3);
}

const play = {
  controls: { a: 'FIRE', b: 'DASH', start: 'PAUSE' },
  enter(g) {
    S = {
      t: 0,
      score: 0,
      wave: 0,
      phase: 'intro',
      phaseT: 0,
      queue: [],
      spawnT: 0,
      gap: 1,
      banner: '',
      dead: false,
      deadT: 0,
      paused: false,
      bullets: [],
      foes: [],
      shots: [],
      boss: null,
      player: { x: 30, y: H / 2 - 4, w: 12, h: 8, hp: 3, inv: 0, dash: 0, dashCD: 0, fireCD: 0, dx: 1, dy: 0 }
    };
    prevDown = g.input.pointer.down;
    startWave(1, g);
  },
  update(dt, g) {
    scrollDust(dt, S.phase === 'boss' ? 1.4 : 1);
    if (!S.dead && (g.input.pressed('start') || (S.paused && g.input.pressed('a')))) {
      S.paused = !S.paused;
      g.setControls(S.paused ? { a: 'RESUME', start: 'RESUME' } : play.controls); // A and B change meaning per screen
    }
    if (S.paused) return;
    S.t += dt;

    if (S.dead) {
      S.deadT -= dt;
      if (S.deadT <= 0) g.go('over', { won: false, score: S.score });
      return;
    }

    updatePlayer(dt, g);
    for (const b of S.bullets) b.x += b.vx * dt;
    updateEnemies(dt, g);
    collide(g);
    S.bullets = S.bullets.filter((b) => !b.dead && b.x < W + 8);
    S.foes = S.foes.filter((f) => !f.dead);
    S.shots = S.shots.filter((s) => !s.dead);
    updatePhase(dt, g);
  },
  render(ctx, g) {
    drawBackdrop(ctx);
    drawFoes(ctx);
    ctx.fillStyle = P.paper;
    for (const b of S.bullets) ctx.fillRect(Math.round(b.x), Math.round(b.y), b.w, b.h);
    drawPlayer(ctx);
    drawHud(ctx, g);

    if (['intro', 'clear', 'won'].includes(S.phase)) {
      text(ctx, S.banner, W / 2, 72, { size: 16, align: 'center', color: S.phase === 'clear' ? P.glow : P.paper });
    }
    if (S.paused) {
      ctx.fillStyle = 'rgba(46, 37, 23, 0.7)';
      ctx.fillRect(0, 0, W, H);
      text(ctx, 'PAUSED', W / 2, 76, { size: 16, align: 'center' });
      text(ctx, g.touchActive ? 'Tap RESUME to continue' : `Press ${g.keyFor('a')} or P to resume`, W / 2, 100, { align: 'center', color: P.steel });
    }
  }
};

/* ---------- game over / win ---------- */

const over = {
  controls: { a: 'RETRY' },
  enter(g, data) {
    this.data = data;
    this.lock = 0.7;
    this.newBest = g.store.submitScore(data.score);
    prevDown = g.input.pointer.down;
  },
  update(dt, g) {
    scrollDust(dt, 0.6);
    this.lock -= dt;
    const tap = tapped(g);
    if (this.lock <= 0 && (tap || g.input.pressed('a'))) {
      g.sfx.play('select');
      g.go('play');
    }
  },
  render(ctx, g) {
    drawBackdrop(ctx);
    text(ctx, this.data.won ? 'BELT CLEARED' : 'GAME OVER', W / 2, 48, { size: 20, align: 'center', color: this.data.won ? P.glow : P.paper });
    text(ctx, `SCORE ${this.data.score}`, W / 2, 84, { size: 10, align: 'center' });
    text(ctx, this.newBest ? 'NEW BEST!' : `BEST ${g.store.get('best', 0)}`, W / 2, 102, { align: 'center', color: P.steel });
    if (this.lock <= 0 && Math.floor(g.time * 2) % 2 === 0) text(ctx, g.touchActive ? 'TAP TO RETRY' : `PRESS ${g.keyFor('a')} TO RETRY`, W / 2, 136, { size: 9, color: P.glow, align: 'center' });
  }
};

/* ---------- boot ---------- */

game.add('title', title).add('play', play).add('over', over);
game.mount(document.getElementById('game'));
game.touchControls(); // standard stick + A/B; labels come from each scene's controls
game.go('title');
game.start();
