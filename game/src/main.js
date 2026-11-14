import * as THREE from "three";
import { CARDS, cardById, paintCard, SPELLS } from "../cards.js";
import { createAudio } from "./audio.js";
import { createBloom } from "./bloom.js";
import { createFlightStage } from "./flight-stage.js";
import { createSpellStage } from "./spell-stage.js";

const params = new URLSearchParams(location.search);
const quick = params.has("quick");
const startFlight = params.get("stage") === "flight";
const debug = params.has("debug");
// Query-only preview. The grove steers and shoots on its own so the path can be watched.
const demo = params.has("demo");

const quality = profile();
const audio = createAudio();
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const keys = new Set();
const input = {
  aimX: 0,
  aimY: 0.05,
  steerX: 0,
  steerY: 0,
  shoot: false,
  spellEdge: [false, false, false],
  viewEdge: false,
  attract: false,
};
const pointer = { x: 0, y: 0, down: false, over: false };
let shootHeld = false;
let mode = "title";
let pausedFrom = "title";
let stage = null;
let renderer;
let bloom;
let slowFrames = 0;

const ui = {
  title: document.getElementById("screen-title"),
  ceremony: document.getElementById("screen-ceremony"),
  pause: document.getElementById("screen-pause"),
  end: document.getElementById("screen-end"),
  combat: document.getElementById("combat"),
  spellHud: document.getElementById("spell-hud"),
  flightHud: document.getElementById("flight-hud"),
  spells: document.getElementById("spells"),
  flightControls: document.getElementById("flight-controls"),
  label: document.getElementById("stage-label"),
  pips: document.getElementById("pips"),
  lockReadout: document.getElementById("lock-readout"),
  lockbar: document.getElementById("lockbar"),
  reticle: document.getElementById("reticle"),
  health: document.getElementById("health"),
  flightReadout: document.getElementById("flight-readout"),
  viewToggle: document.getElementById("view-toggle"),
  error: document.getElementById("error"),
  picker: document.getElementById("picker"),
  pickNote: document.getElementById("pick-note"),
  endKicker: document.getElementById("end-kicker"),
  endTitle: document.getElementById("end-title"),
  endCopy: document.getElementById("end-copy"),
  retry: document.getElementById("retry"),
};

const selected = ["026", "028", "022"];

function profile() {
  const small = Math.min(innerWidth, innerHeight) < 900;
  const touch = navigator.maxTouchPoints > 0;
  const mobile = small && touch;
  const cores = navigator.hardwareConcurrency || 4;
  const low = mobile && cores <= 4;
  return {
    mobile,
    low,
    dpr: Math.min(window.devicePixelRatio || 1, low ? 1.05 : mobile ? 1.25 : 1.6),
  };
}

function teamCards() {
  return selected.map((id) => cardById(id)).filter(Boolean);
}

function show(name) {
  for (const screen of [ui.title, ui.ceremony, ui.pause, ui.end]) {
    screen.hidden = screen.id !== `screen-${name}`;
  }
  const playing = name === "none";
  ui.combat.hidden = !playing;
  document.getElementById("pause").disabled = !playing && name !== "pause";
}

function renderPicker() {
  ui.picker.innerHTML = "";
  CARDS.forEach((card) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pick";
    const index = selected.indexOf(card.id);
    if (index >= 0) button.classList.add("chosen");
    const canvas = document.createElement("canvas");
    canvas.width = 420;
    canvas.height = 640;
    paintCard(canvas, card);
    const slot = document.createElement("span");
    slot.className = "slot";
    slot.textContent = index >= 0 ? String(index + 1) : "";
    button.append(canvas, slot);
    button.addEventListener("click", () => toggleCard(card.id));
    ui.picker.append(button);
  });
  ui.pickNote.textContent =
    selected.length === 3 ? "Three cards ready." : `Choose ${3 - selected.length} more.`;
  document.getElementById("play").disabled = selected.length !== 3;
}

function toggleCard(id) {
  const index = selected.indexOf(id);
  if (index >= 0) selected.splice(index, 1);
  else if (selected.length < 3) selected.push(id);
  else {
    ui.pickNote.textContent = "Three cards only. Set one down first.";
    return;
  }
  renderPicker();
}

function buildSpellButtons() {
  ui.spells.innerHTML = "";
  teamCards().forEach((card, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "spell";
    const canvas = document.createElement("canvas");
    canvas.width = 210;
    canvas.height = 320;
    paintCard(canvas, card);
    const name = document.createElement("small");
    name.textContent = `${index + 1}. ${SPELLS[card.spell].name}`;
    const cool = document.createElement("em");
    cool.dataset.cool = String(index);
    button.append(canvas, name, cool);
    button.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      event.preventDefault();
      input.spellEdge[index] = true;
    });
    ui.spells.append(button);
  });
}

function bootRenderer() {
  renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.domElement.id = "view";
  document.getElementById("stage").append(renderer.domElement);
  bloom = createBloom(renderer, quality);
  resize();
}

function resize() {
  const width = innerWidth;
  const height = innerHeight;
  renderer.setPixelRatio(quality.dpr);
  renderer.setSize(width, height, false);
  bloom.setSize(renderer.domElement.width, renderer.domElement.height);
  if (stage) stage.resize(width, height);
}

function disposeStage() {
  if (stage) {
    stage.dispose();
    stage = null;
  }
}

function beginSpell(attract) {
  disposeStage();
  stage = createSpellStage(quality, teamCards(), { quick, reduced, seed: attract ? 7 : Date.now() % 99991 });
  stage.resize(innerWidth, innerHeight);
  if (!attract) buildSpellButtons();
  mode = attract ? "title" : "spell";
  input.attract = attract;
  if (!attract) {
    audio.startDrone("spell");
    show("none");
    ui.spellHud.hidden = false;
    ui.flightHud.hidden = true;
    ui.spells.hidden = false;
    ui.flightControls.hidden = true;
    ui.reticle.hidden = false;
    ui.label.textContent = "The source";
  }
}

function beginFlight() {
  disposeStage();
  stage = createFlightStage(quality, teamCards(), { quick, reduced, seed: quick ? 4 : Date.now() % 99991 });
  stage.resize(innerWidth, innerHeight);
  mode = "flight";
  input.attract = false;
  audio.startDrone("flight");
  show("none");
  ui.spellHud.hidden = true;
  ui.flightHud.hidden = false;
  ui.spells.hidden = true;
  ui.flightControls.hidden = false;
  ui.reticle.hidden = true;
  ui.label.textContent = "Grove flight";
}

function readPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const pad of pads) {
    if (!pad) continue;
    const x = pad.axes[0] || 0;
    const y = pad.axes[1] || 0;
    const active = Math.hypot(x, y) > 0.2;
    const shoot = Boolean(pad.buttons[7]?.pressed || pad.buttons[0]?.pressed);
    if (pad.buttons[9]?.pressed && !readPad.wasPause) input.pauseEdge = true;
    readPad.wasPause = Boolean(pad.buttons[9]?.pressed);
    if (pad.buttons[2]?.pressed && !readPad.b2) input.spellEdge[0] = true;
    if (pad.buttons[3]?.pressed && !readPad.b3) input.spellEdge[1] = true;
    if (pad.buttons[1]?.pressed && !readPad.b1) input.spellEdge[2] = true;
    readPad.b2 = Boolean(pad.buttons[2]?.pressed);
    readPad.b3 = Boolean(pad.buttons[3]?.pressed);
    readPad.b1 = Boolean(pad.buttons[1]?.pressed);
    if (pad.buttons[3]?.pressed && mode === "flight" && !readPad.viewLatch) input.viewEdge = true;
    readPad.viewLatch = mode === "flight" && Boolean(pad.buttons[3]?.pressed);
    return { active, x, y, shoot };
  }
  return { active: false, x: 0, y: 0, shoot: false };
}

function steer(dt, pad) {
  if (input.scripted) return;
  let keyX = 0;
  let keyY = 0;
  if (keys.has("a") || keys.has("arrowleft")) keyX -= 1;
  if (keys.has("d") || keys.has("arrowright")) keyX += 1;
  if (keys.has("w") || keys.has("arrowup")) keyY += 1;
  if (keys.has("s") || keys.has("arrowdown")) keyY -= 1;
  if (mode === "spell") {
    if (pad.active) {
      input.aimX = Math.max(-1, Math.min(1, input.aimX + pad.x * dt * 1.35));
      input.aimY = Math.max(-1, Math.min(1, input.aimY - pad.y * dt * 1.35));
    } else if (keyX || keyY) {
      input.aimX = Math.max(-1, Math.min(1, input.aimX + keyX * dt * 0.95));
      input.aimY = Math.max(-1, Math.min(1, input.aimY + keyY * dt * 0.95));
    } else if (pointer.over) {
      input.aimX = pointer.x;
      input.aimY = pointer.y;
    }
    input.shoot = false;
  } else if (mode === "flight") {
    if (pad.active) {
      input.steerX = pad.x;
      input.steerY = -pad.y;
    } else if (keyX || keyY) {
      input.steerX = keyX;
      input.steerY = keyY;
    } else if (pointer.down) {
      input.steerX = pointer.x;
      input.steerY = pointer.y;
    } else {
      input.steerX *= Math.exp(-dt * 2.4);
      input.steerY *= Math.exp(-dt * 2.4);
    }
    input.shoot = pointer.down || shootHeld || pad.shoot || keys.has(" ") || keys.has("j");
  }
}

function paintSpellHud(hud) {
  ui.pips.textContent = `Source ${hud.hits} / 3`;
  ui.lockReadout.textContent = hud.message;
  ui.lockbar.style.width = `${Math.round(hud.burn * 100)}%`;
  ui.reticle.style.left = `${(input.aimX * 0.5 + 0.5) * innerWidth}px`;
  ui.reticle.style.top = `${(-input.aimY * 0.5 + 0.5) * innerHeight}px`;
  ui.reticle.classList.toggle("hot", hud.focused === "source");
  hud.spells.forEach((spell, index) => {
    const button = ui.spells.children[index];
    if (!button) return;
    button.classList.toggle("cooling", spell.cooldown > 0.05);
    button.classList.toggle("on", spell.active > 0);
    const cool = button.querySelector("em");
    cool.textContent = spell.cooldown > 0.05 ? `${spell.cooldown.toFixed(1)}s` : spell.active > 0 ? "Live" : "Ready";
  });
}

function paintFlightHud(hud) {
  ui.health.textContent = `${"✦".repeat(hud.health)}${"·".repeat(Math.max(0, 4 - hud.health))}`;
  const along = Math.min(100, Math.round((hud.z / hud.length) * 100));
  ui.flightReadout.textContent = `${hud.view === "cockpit" ? "Cockpit" : "Chase"} · ${along}% · ${hud.demonsLeft} demons · ${hud.score}`;
  ui.viewToggle.textContent = hud.view === "cockpit" ? "Chase cam" : "Cockpit";
}

function finish(kind, hud) {
  mode = "end";
  audio.stopDrone();
  show("end");
  ui.combat.hidden = true;
  ui.spells.hidden = true;
  ui.flightControls.hidden = true;
  if (kind === "won") {
    ui.endKicker.textContent = "Grove clear";
    ui.endTitle.textContent = "The grove is quiet";
    ui.endCopy.textContent = `You flew the path and scattered the demons. Score ${hud.score}.`;
    ui.retry.hidden = true;
  } else {
    ui.endKicker.textContent = "Thrown from the path";
    ui.endTitle.textContent = "The broom tumbles";
    ui.endCopy.textContent = "The trees or a demon caught you. The broom is still yours.";
    ui.retry.hidden = false;
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - (frame.last || now)) / 1000);
  frame.last = now;
  if (!stage || !renderer) return;
  try {
  frameBody(dt);
  } catch (error) {
    ui.error.hidden = false;
    ui.error.textContent = error.message || String(error);
    console.error(error);
  }
}

function frameBody(dt) {
  const paused = mode === "pause" || mode === "end";
  if (!paused && (mode === "spell" || mode === "flight" || mode === "title" || mode === "ceremony")) {
    const pad = mode === "title" || mode === "ceremony" ? { active: false, x: 0, y: 0, shoot: false } : readPad();
    if (mode === "spell" || mode === "flight") steer(dt, pad);
    if (demo && mode === "flight" && stage.guide && !pointer.down && !shootHeld && !pad.active) {
      const manual = ["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "s"].some((key) => keys.has(key));
      if (!manual) {
        const guide = stage.guide();
        input.steerX = guide.steerX;
        input.steerY = guide.steerY;
        input.shoot = true;
      }
    }
    input.attract = mode === "title";
    if (input.pauseEdge) togglePause();
    const result = stage.update(dt, input, audio);
    bloom.render(stage.scene, stage.camera, result);
    if (mode === "spell") {
      paintSpellHud(result.hud);
      if (result.ceremony) {
        mode = "ceremony";
        show("ceremony");
        ui.combat.hidden = true;
        ui.spells.hidden = true;
        audio.win();
      }
    } else if (mode === "flight") {
      paintFlightHud(result.hud);
      if (result.won) finish("won", result.hud);
      else if (result.lost) finish("lost", result.hud);
    }
    if (dt > 0.034) slowFrames += 1;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames > 45 && quality.dpr > 0.85) {
      quality.dpr = Math.max(0.8, quality.dpr * 0.82);
      quality.low = true;
      slowFrames = 0;
      resize();
    }
  } else {
    bloom.render(stage.scene, stage.camera, { motion: 0, flash: 0, bloom: 0.2 });
  }
  input.spellEdge = [false, false, false];
  input.viewEdge = false;
  input.pauseEdge = false;
}

function togglePause() {
  if (mode === "pause") {
    mode = pausedFrom;
    show(mode === "spell" || mode === "flight" ? "none" : mode);
    if (mode === "spell" || mode === "flight") {
      ui.combat.hidden = false;
      ui.spells.hidden = mode !== "spell";
      ui.flightControls.hidden = mode !== "flight";
    }
    return;
  }
  if (mode !== "spell" && mode !== "flight") return;
  pausedFrom = mode;
  mode = "pause";
  show("pause");
}

function pointerPos(event) {
  const point = event.touches ? event.touches[0] : event;
  if (!point) return;
  pointer.x = (point.clientX / innerWidth) * 2 - 1;
  pointer.y = -((point.clientY / innerHeight) * 2 - 1);
}

function onUi(event) {
  return Boolean(event.target.closest && event.target.closest("button, a, .screen, details"));
}

function bind() {
  renderPicker();
  document.getElementById("play").addEventListener("click", () => {
    audio.unlock();
    audio.click();
    if (startFlight) beginFlight();
    else beginSpell(false);
  });
  document.getElementById("mount").addEventListener("click", () => {
    audio.unlock();
    audio.click();
    beginFlight();
  });
  document.getElementById("pause").addEventListener("click", () => togglePause());
  document.getElementById("resume").addEventListener("click", () => togglePause());
  document.getElementById("restart").addEventListener("click", () => {
    audio.click();
    if (pausedFrom === "flight") beginFlight();
    else beginSpell(false);
  });
  document.getElementById("quit").addEventListener("click", () => {
    audio.stopDrone();
    mode = "title";
    show("title");
    beginSpell(true);
  });
  document.getElementById("again").addEventListener("click", () => {
    audio.click();
    mode = "title";
    show("title");
    beginSpell(true);
  });
  ui.retry.addEventListener("click", () => beginFlight());
  document.getElementById("mute").addEventListener("click", () => {
    audio.unlock();
    const muted = audio.toggleMute();
    document.getElementById("mute").textContent = muted ? "Muted" : "Sound";
    document.getElementById("mute").setAttribute("aria-pressed", String(muted));
  });
  ui.viewToggle.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    event.preventDefault();
    input.viewEdge = true;
  });
  const shoot = document.getElementById("shoot");
  shoot.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    event.preventDefault();
    shootHeld = true;
  });
  window.addEventListener("pointerup", () => {
    shootHeld = false;
    pointer.down = false;
  });
  window.addEventListener("pointercancel", () => {
    shootHeld = false;
    pointer.down = false;
  });
  window.addEventListener(
    "pointerdown",
    (event) => {
      if (onUi(event)) return;
      pointer.down = true;
      pointer.over = true;
      pointerPos(event);
    },
    { passive: false },
  );
  window.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType === "mouse" || pointer.down) {
        pointer.over = !onUi(event);
        pointerPos(event);
      }
    },
    { passive: true },
  );
  window.addEventListener(
    "touchmove",
    (event) => {
      if (event.target.closest && event.target.closest(".screen")) return;
      event.preventDefault();
    },
    { passive: false },
  );
  window.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    keys.add(event.key.toLowerCase());
    if (event.key === "p" || event.key === "Escape") togglePause();
    if (event.key === "m") document.getElementById("mute").click();
    if (event.key === "c" && mode === "flight") input.viewEdge = true;
    if (event.key === "1") input.spellEdge[0] = true;
    if (event.key === "2") input.spellEdge[1] = true;
    if (event.key === "3") input.spellEdge[2] = true;
    if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) event.preventDefault();
  });
  window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
  window.addEventListener("resize", resize);
  window.addEventListener("error", (event) => {
    ui.error.hidden = false;
    ui.error.textContent = event.message || "The grove failed to start.";
  });
}

function main() {
  try {
    bootRenderer();
  } catch (error) {
    ui.error.hidden = false;
    ui.error.textContent = "This browser could not start the grove view.";
    console.error(error);
    return;
  }
  bind();
  beginSpell(true);
  show("title");
  requestAnimationFrame(frame);
  if (debug) {
    window.__spellflight = {
      get mode() {
        return mode;
      },
      aim(x, y) {
        input.aimX = x;
        input.aimY = y;
        input.scripted = true;
        pointer.over = false;
      },
      source() {
        return stage && stage.sourceNdc ? stage.sourceNdc() : null;
      },
      guide() {
        return stage && stage.guide ? stage.guide() : null;
      },
      view() {
        input.viewEdge = true;
      },
      steer(x, y, shoot) {
        input.steerX = x;
        input.steerY = y;
        input.shoot = Boolean(shoot);
        input.scripted = true;
        pointer.down = false;
      },
    };
  }
}

main();
