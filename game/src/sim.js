// Gameplay rules for Spellflight, kept free of the renderer so they can be tested.

export const SOURCE_HITS = 3;

export const BASE_MODS = {
  burnRate: 0.78,
  decay: 0.42,
  shellRate: 1.75,
};

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createEncounter(count, rng) {
  const shards = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const n = Math.max(2, count);
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    shards.push({
      id: i,
      dir: [Math.cos(theta) * radius, y, Math.sin(theta) * radius],
      phase: rng() * Math.PI * 2,
      speed: 0.2 + rng() * 0.28,
      hp: 1,
      alive: true,
    });
  }
  return {
    shards,
    source: {
      phase: rng() * Math.PI * 2,
      phase2: rng() * Math.PI * 2,
    },
    rng,
    hits: 0,
    burn: 0,
    time: 0,
    boom: 0,
    booming: false,
    won: false,
  };
}

export function sourcePosition(enc, motion = 1) {
  const s = enc.source;
  const time = enc.time * motion;
  const a = s.phase + time * 0.62;
  const b = s.phase2 + time * 0.41;
  const radius = 2.05 + Math.sin(time * 0.85 + s.phase) * 0.42;
  return [
    Math.cos(a) * Math.cos(b) * radius,
    Math.sin(b) * radius * 0.86,
    Math.sin(a) * Math.cos(b) * radius,
  ];
}

export function shardPosition(shard, time, motion = 1) {
  const spin = shard.phase + time * shard.speed * motion;
  const [x0, y0, z0] = shard.dir;
  const c = Math.cos(spin);
  const sn = Math.sin(spin);
  const x = x0 * c - z0 * sn;
  const y = y0 + Math.sin(time * 0.85 * motion + shard.phase) * 0.06;
  const z = x0 * sn + z0 * c;
  const len = Math.hypot(x, y, z) || 1;
  const pulse = 5.45 + Math.sin(time * 2.35) * 0.28;
  return [(x / len) * pulse, (y / len) * pulse, (z / len) * pulse];
}

function relocateSource(enc) {
  enc.source.phase = enc.rng() * Math.PI * 2;
  enc.source.phase2 = enc.rng() * Math.PI * 2;
}

function reviveShell(enc) {
  for (const shard of enc.shards) {
    shard.alive = true;
    shard.hp = 1;
  }
}

export function stepEncounter(enc, focused, dt, mods = BASE_MODS) {
  const events = [];
  enc.time += dt;
  if (enc.booming) {
    enc.boom += dt;
    if (enc.boom >= 1.2 && !enc.won) {
      enc.booming = false;
      enc.boom = 0;
      relocateSource(enc);
      reviveShell(enc);
      events.push({ type: "reform" });
    }
    return events;
  }

  if (focused === "source") {
    enc.burn = Math.min(1, enc.burn + dt * mods.burnRate);
    if (enc.burn >= 1) {
      enc.burn = 0;
      enc.hits += 1;
      enc.booming = true;
      enc.boom = 0;
      events.push({ type: "source-hit", hit: enc.hits });
      if (enc.hits >= SOURCE_HITS) {
        enc.won = true;
        events.push({ type: "cleared" });
      }
    }
  } else {
    enc.burn = Math.max(0, enc.burn - dt * mods.decay);
    if (typeof focused === "number") {
      const shard = enc.shards[focused];
      if (shard && shard.alive) {
        shard.hp -= dt * mods.shellRate;
        if (shard.hp <= 0) {
          shard.alive = false;
          events.push({ type: "shell", id: focused });
        }
      }
    }
  }
  return events;
}

export function buildCourse(options = {}) {
  const rng = options.rng || mulberry32(1);
  const length = options.length ?? 2400;
  const spacing = options.spacing ?? 22;
  const trees = [];
  const demons = [];
  const logs = [];
  const gates = [];

  for (let z = 28; z < length; z += spacing) {
    const sway = Math.sin(z * 0.017) * 0.8;
    trees.push({
      x: -9.15 + sway,
      z,
      r: 1.02,
      h: 11 + (z % 7) * 0.35,
      kind: z % 3,
    });
    trees.push({
      x: 9.25 - sway * 0.5,
      z: z + spacing * 0.48,
      r: 1.08,
      h: 12.5 + (z % 5) * 0.4,
      kind: (z + 1) % 3,
    });
  }

  for (let z = 86; z < length - 70; z += 84) {
    const gap = Math.sin(z * 0.011 + 0.6) * 2.7;
    const left = gap - 3.2;
    const right = gap + 3.2;
    trees.push({ x: left, z, r: 0.98, h: 12.2, kind: 1 });
    trees.push({ x: right, z, r: 0.98, h: 12.2, kind: 2 });
    gates.push({ z, gap, left, right, clear: right - left - 1.96 });
    if (Math.floor(z / 84) % 2 === 0) {
      logs.push({ x: gap + Math.cos(z) * 0.4, z: z + 30, half: 1.45, h: 1.18 });
    }
    void rng;
  }

  let id = 0;
  for (let z = 130; z < length - 90; z += 125) {
    let homeX = Math.sin(z * 0.02) * 2.2;
    let best = Infinity;
    for (const gate of gates) {
      const d = Math.abs(gate.z - z);
      if (d < best) {
        best = d;
        homeX = gate.gap + Math.sin(z) * 0.45;
      }
    }
    demons.push({
      id: id++,
      x: homeX,
      homeX,
      y: 1.62 + (id % 3) * 0.38,
      homeY: 1.62 + (id % 3) * 0.38,
      z,
      r: 1.05,
      drift: 0.7 + (id % 3) * 0.25,
      phase: id * 1.7,
      alive: true,
    });
  }

  return { trees, demons, logs, gates, length };
}

export function createFlight(course, rng) {
  return {
    x: 0,
    y: 1.72,
    z: 0,
    speed: 52,
    bank: 0,
    health: 4,
    invuln: 0,
    score: 0,
    bolts: [],
    nextBolt: 1,
    cooldown: 0,
    demons: course.demons.map((demon) => ({ ...demon, alive: true })),
    trees: course.trees,
    logs: course.logs,
    length: course.length,
    won: false,
    lost: false,
    rng,
    time: 0,
  };
}

function hurt(state, events, push) {
  if (state.invuln > 0 || state.lost || state.won) return;
  state.health -= 1;
  state.invuln = 1.15;
  state.speed = Math.max(42, state.speed * 0.78);
  if (push) state.x = Math.max(-8, Math.min(8, state.x + push * 1.35));
  events.push({ type: "hurt" });
  if (state.health <= 0) {
    state.health = 0;
    state.lost = true;
    events.push({ type: "lost" });
  }
}

export function stepFlight(state, input, dt) {
  const events = [];
  if (state.won || state.lost) return events;
  const steerX = input.steerX || 0;
  const steerY = input.steerY || 0;
  state.time += dt;

  const targetX = Math.max(-1, Math.min(1, steerX)) * 6.6;
  const targetY = 1.68 + Math.max(-1, Math.min(1, steerY)) * 2.05;
  const ease = 1 - Math.exp(-dt * 7.2);
  state.x += (targetX - state.x) * ease;
  state.y += (Math.max(0.78, Math.min(5.8, targetY)) - state.y) * ease;
  state.x = Math.max(-8.1, Math.min(8.1, state.x));
  const targetBank = Math.max(-1, Math.min(1, steerX)) * -0.62;
  state.bank += (targetBank - state.bank) * Math.min(1, dt * 5);
  state.speed = Math.min(84, 52 + state.z * 0.011);
  state.z += state.speed * dt;
  state.invuln = Math.max(0, state.invuln - dt);

  if (input.shoot && state.cooldown <= 0 && !state.lost) {
    state.cooldown = 0.11;
    state.bolts.push({
      id: state.nextBolt++,
      x: state.x,
      y: state.y + 0.72,
      z: state.z + 3.15,
      hue: (state.nextBolt * 0.17) % 1,
      life: 1.2,
    });
    events.push({ type: "shot", hue: state.bolts[state.bolts.length - 1].hue });
  } else {
    state.cooldown = Math.max(0, state.cooldown - dt);
  }

  for (let i = state.bolts.length - 1; i >= 0; i--) {
    const bolt = state.bolts[i];
    bolt.z += (state.speed + 96) * dt;
    bolt.life -= dt;
    if (bolt.life <= 0 || bolt.z > state.z + 130) state.bolts.splice(i, 1);
  }

  for (const demon of state.demons) {
    if (!demon.alive) continue;
    if (demon.homeY == null) demon.homeY = demon.y;
    demon.x = demon.homeX + Math.sin(state.time * demon.drift + demon.phase) * 1.05;
    demon.y = demon.homeY + Math.sin(state.time * 1.6 + demon.phase) * 0.28;
  }

  for (const demon of state.demons) {
    if (!demon.alive) continue;
    for (let i = state.bolts.length - 1; i >= 0; i--) {
      const bolt = state.bolts[i];
      const dx = bolt.x - demon.x;
      const dy = bolt.y - demon.y;
      const dz = bolt.z - demon.z;
      if (dx * dx + dy * dy + dz * dz < (demon.r + 0.75) * (demon.r + 0.75)) {
        demon.alive = false;
        state.bolts.splice(i, 1);
        state.score += 100;
        events.push({ type: "demon", x: demon.x, y: demon.y, z: demon.z });
        break;
      }
    }
  }

  if (state.invuln <= 0) {
    for (const demon of state.demons) {
      if (!demon.alive) continue;
      const dx = state.x - demon.x;
      const dy = state.y - demon.y;
      const dz = state.z - demon.z;
      if (dx * dx + dy * dy + dz * dz < (demon.r + 0.62) * (demon.r + 0.62)) {
        demon.alive = false;
        state.score += 40;
        hurt(state, events, Math.sign(dx) || 1);
        events.push({ type: "demon", x: demon.x, y: demon.y, z: demon.z, ram: true });
        break;
      }
    }
  }

  if (state.invuln <= 0 && !state.lost) {
    for (const tree of state.trees) {
      if (tree.z < state.z - 3 || tree.z > state.z + 3) continue;
      if (state.y > tree.h * 0.9) continue;
      const dx = state.x - tree.x;
      const reach = tree.r + 0.52;
      if (dx * dx < reach * reach) {
        hurt(state, events, Math.sign(dx) || 1);
        break;
      }
    }
  }

  if (state.invuln <= 0 && !state.lost) {
    for (const log of state.logs) {
      if (Math.abs(log.z - state.z) > 1.45) continue;
      if (Math.abs(log.x - state.x) > log.half + 0.35) continue;
      if (state.y < log.h + 0.48) {
        hurt(state, events, Math.sign(state.x - log.x) || 1);
        break;
      }
    }
  }

  if (!state.lost && state.z >= state.length) {
    state.won = true;
    state.score += Math.floor(state.length);
    events.push({ type: "won" });
  }
  return events;
}
