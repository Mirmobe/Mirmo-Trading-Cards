import assert from "node:assert/strict";
import test from "node:test";
import {
  BASE_MODS,
  buildCourse,
  createEncounter,
  createFlight,
  mulberry32,
  shardPosition,
  sourcePosition,
  SOURCE_HITS,
  stepEncounter,
  stepFlight,
} from "../src/sim.js";

test("the source sits inside the shell and takes three hits to clear", () => {
  const enc = createEncounter(24, mulberry32(4));
  for (let t = 0; t < 8; t += 0.25) {
    enc.time = t;
    const radius = Math.hypot(...sourcePosition(enc, 1));
    assert.ok(radius < 3.2, `source radius ${radius}`);
    const shell = Math.hypot(...shardPosition(enc.shards[3], t, 1));
    assert.ok(shell > 5, `shell radius ${shell}`);
  }

  let guard = 0;
  while (!enc.won && guard++ < 40) {
    let inner = 0;
    while (!enc.booming && !enc.won && inner++ < 80) {
      stepEncounter(enc, "source", 0.1, { ...BASE_MODS, burnRate: 6 });
    }
    assert.ok(inner < 80, "burn should land");
    while (enc.booming && !enc.won) stepEncounter(enc, "source", 0.2);
  }
  assert.equal(enc.hits, SOURCE_HITS);
  assert.equal(enc.won, true);
});

test("shell pieces are not the source, and a burn fades if you slip", () => {
  const enc = createEncounter(16, mulberry32(9));
  for (let i = 0; i < 20; i++) stepEncounter(enc, 0, 0.1);
  assert.equal(enc.hits, 0);
  assert.equal(enc.shards[0].alive, false);

  stepEncounter(enc, "source", 0.2);
  const burned = enc.burn;
  assert.ok(burned > 0);
  for (let i = 0; i < 6; i++) stepEncounter(enc, null, 0.2);
  assert.ok(enc.burn < burned);

  const enc2 = createEncounter(12, mulberry32(2));
  stepEncounter(enc2, "source", 0.5, { ...BASE_MODS, burnRate: 4 });
  assert.equal(enc2.booming, true);
  assert.equal(enc2.hits, 1);
  for (let i = 0; i < 4; i++) stepEncounter(enc2, "source", 0.05, { ...BASE_MODS, burnRate: 8 });
  assert.equal(enc2.hits, 1);
});

test("grove gates leave a passable gap", () => {
  const course = buildCourse({ length: 1800, rng: mulberry32(3), spacing: 24 });
  assert.ok(course.gates.length >= 8);
  for (const gate of course.gates) {
    assert.ok(gate.clear >= 3.5, `gap ${gate.clear}`);
  }
  assert.ok(course.demons.length >= 6);
  assert.ok(course.trees.length > 40);
});

test("bolts remove a demon, trees hurt, a hop clears a log, the path can be finished", () => {
  const course = buildCourse({ length: 220, rng: mulberry32(5), spacing: 30 });
  const rng = mulberry32(8);
  const state = createFlight(course, rng);
  state.trees = [];
  state.logs = [];
  state.demons = [
    { id: 0, x: 0, homeX: 0, y: 1.5, z: 28, r: 1.05, drift: 0, phase: 0, alive: true },
  ];
  let shot = false;
  for (let i = 0; i < 40 && state.demons[0].alive; i++) {
    const events = stepFlight(state, { steerX: 0, steerY: 0, shoot: true }, 0.05);
    if (events.some((event) => event.type === "shot")) shot = true;
  }
  assert.equal(shot, true);
  assert.equal(state.demons[0].alive, false);
  assert.ok(state.score >= 100);

  const blocked = createFlight(course, mulberry32(1));
  blocked.trees = [{ x: 0, z: 12, r: 1.2, h: 14, kind: 0 }];
  blocked.demons = [];
  blocked.logs = [];
  blocked.z = 11.2;
  blocked.x = 0;
  blocked.y = 1.6;
  blocked.speed = 30;
  let hurt = false;
  for (let i = 0; i < 8 && !hurt; i++) {
    hurt = stepFlight(blocked, { steerX: 0, steerY: -1, shoot: false }, 0.05).some(
      (event) => event.type === "hurt",
    );
  }
  assert.equal(hurt, true);
  assert.equal(blocked.health, 3);

  const hopper = createFlight(course, mulberry32(1));
  hopper.trees = [];
  hopper.demons = [];
  hopper.logs = [{ x: 0, z: 18, half: 2, h: 1.2 }];
  hopper.z = 16;
  hopper.y = 4.2;
  hopper.speed = 40;
  const before = hopper.health;
  for (let i = 0; i < 12; i++) stepFlight(hopper, { steerX: 0, steerY: 1, shoot: false }, 0.05);
  assert.equal(hopper.health, before);
  assert.ok(hopper.z > 20);

  const finisher = createFlight(course, mulberry32(1));
  finisher.trees = [];
  finisher.demons = [];
  finisher.logs = [];
  finisher.length = 40;
  let won = false;
  for (let i = 0; i < 80 && !won; i++) {
    won = stepFlight(finisher, { steerX: 0, steerY: 0, shoot: false }, 0.05).some(
      (event) => event.type === "won",
    );
  }
  assert.equal(finisher.won, true);
  assert.equal(won, true);
});
