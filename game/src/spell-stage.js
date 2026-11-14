import * as THREE from "three";
import { SPELLS } from "../cards.js";
import { createParticles, nebulaRGB } from "./particles.js";
import {
  BASE_MODS,
  createEncounter,
  mulberry32,
  shardPosition,
  sourcePosition,
  stepEncounter,
} from "./sim.js";

const HIT_COLORS = [
  new THREE.Vector3(1.45, 0.82, 0.28),
  new THREE.Vector3(0.25, 1.15, 1.05),
  new THREE.Vector3(1.35, 0.32, 0.95),
];

const shellVertex = `
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying vec3 vPos;
  uniform float uTime;
  void main() {
    vec3 pos = position;
    float ripple = sin(pos.x * 3.2 + uTime * 2.1) * sin(pos.y * 4.0 - uTime * 1.5) * sin(pos.z * 2.6 + uTime);
    pos += normal * ripple * 0.16;
    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorld = world.xyz;
    vPos = pos;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const shellFragment = `
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying vec3 vPos;
  uniform float uTime;
  uniform float uHit;
  uniform vec3 uCamera;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
                   mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
               mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
                   mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
  }
  void main() {
    vec3 viewDir = normalize(uCamera - vWorld);
    float fres = pow(1.0 - abs(dot(normalize(vNormal), viewDir)), 2.1);
    float vein = smoothstep(0.42, 0.78, noise(vPos * 1.7 + vec3(0.0, uTime * 0.28, 0.0)));
    float pulse = 0.75 + 0.25 * sin(uTime * 2.6);
    vec3 dark = mix(vec3(0.03, 0.0, 0.05), vec3(0.42, 0.05, 0.55), vein);
    vec3 color = dark * 0.45 + vec3(0.62, 0.12, 0.85) * fres * pulse;
    color += vec3(1.2, 0.45, 0.15) * uHit * fres;
    float alpha = clamp(0.08 + fres * 0.62 + vein * 0.18, 0.0, 0.82);
    gl_FragColor = vec4(color, alpha);
  }
`;

const sourceVertex = `
  varying vec3 vNormal;
  varying vec3 vWorld;
  uniform float uTime;
  void main() {
    vec3 pos = position * (1.0 + 0.08 * sin(uTime * 6.0 + position.y * 8.0));
    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const sourceFragment = `
  varying vec3 vNormal;
  varying vec3 vWorld;
  uniform float uTime;
  uniform float uBurn;
  uniform vec3 uCamera;
  void main() {
    vec3 viewDir = normalize(uCamera - vWorld);
    float fres = pow(1.0 - abs(dot(normalize(vNormal), viewDir)), 1.6);
    float beat = 0.55 + 0.45 * sin(uTime * 7.5);
    vec3 cold = vec3(0.18, 0.02, 0.16);
    vec3 hot = vec3(2.4, 1.15, 0.35);
    vec3 color = mix(cold, vec3(0.85, 0.15, 1.1), fres) * (0.7 + beat);
    color = mix(color, hot, uBurn);
    color += vec3(1.6, 1.4, 1.1) * fres * uBurn;
    gl_FragColor = vec4(color, 0.92);
  }
`;

const beamVertex = `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const beamFragment = `
  varying vec2 vUv;
  varying vec3 vNormal;
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uCharge;
  void main() {
    float core = pow(1.0 - abs(vNormal.x), 3.0);
    float scroll = 0.55 + 0.45 * sin(vUv.y * 40.0 - uTime * 28.0);
    float ends = smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
    vec3 color = uColor * (0.35 + core * 1.8) * scroll * (1.0 + uCharge);
    gl_FragColor = vec4(color, clamp(0.25 + core * 0.7, 0.0, 1.0) * ends);
  }
`;

function cylinderBetween(geo, a, b, radius, material, parent) {
  const mesh = new THREE.Mesh(geo, material);
  const delta = new THREE.Vector3().subVectors(b, a);
  const length = Math.max(0.001, delta.length());
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  mesh.scale.set(radius, length, radius);
  parent.add(mesh);
  return mesh;
}

function burst(particles, origin, count, power, palette) {
  for (let i = 0; i < count; i++) {
    const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    const speed = power * (0.35 + Math.random());
    const [r, g, b] = palette[i % palette.length];
    particles.spawn(
      origin.x,
      origin.y,
      origin.z,
      dir.x * speed,
      dir.y * speed,
      dir.z * speed,
      0.45 + Math.random() * 0.7,
      r,
      g,
      b,
    );
  }
}

export function createSpellStage(quality, team, options = {}) {
  const rng = mulberry32(options.seed ?? (Date.now() % 100000));
  const enc = createEncounter(quality.low ? 32 : 46, rng);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#07060c");
  scene.fog = new THREE.FogExp2(0x07060c, 0.028);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 80);
  camera.position.set(0, 0.35, 15.5);
  scene.add(camera);

  const shellMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uHit: { value: 0 },
      uCamera: { value: new THREE.Vector3() },
    },
    vertexShader: shellVertex,
    fragmentShader: shellFragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(5.55, 48, 32), shellMat);
  scene.add(shell);

  const shardGeo = new THREE.OctahedronGeometry(0.42, 0);
  const shardMat = new THREE.MeshLambertMaterial({
    color: 0x140814,
    emissive: 0x6a2478,
    emissiveIntensity: 0.65,
  });
  const shards = enc.shards.map((shard, index) => {
    const mesh = new THREE.Mesh(shardGeo, shardMat);
    mesh.scale.setScalar(0.7 + (index % 5) * 0.16);
    scene.add(mesh);
    return mesh;
  });

  const sourceMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBurn: { value: 0 },
      uCamera: { value: new THREE.Vector3() },
    },
    vertexShader: sourceVertex,
    fragmentShader: sourceFragment,
    transparent: true,
    depthWrite: false,
  });
  const source = new THREE.Group();
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 2), sourceMat);
  const knotA = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 1), sourceMat);
  const knotB = new THREE.Mesh(new THREE.OctahedronGeometry(1.45, 0), sourceMat);
  knotA.scale.set(1, 0.45, 1);
  knotB.scale.set(0.55, 1.2, 0.55);
  source.add(core, knotA, knotB);
  scene.add(source);

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe1a0, transparent: true, opacity: 0.95, depthTest: false }),
  );
  beacon.visible = false;
  beacon.renderOrder = 3;
  scene.add(beacon);

  const arcCount = 8;
  const arcPositions = new Float32Array(arcCount * 2 * 3);
  const arcGeo = new THREE.BufferGeometry();
  arcGeo.setAttribute("position", new THREE.BufferAttribute(arcPositions, 3));
  const arcs = new THREE.LineSegments(
    arcGeo,
    new THREE.LineBasicMaterial({ color: 0xb06cff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending }),
  );
  scene.add(arcs);

  const beamMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color("#f2c56b") },
      uCharge: { value: 0 },
    },
    vertexShader: beamVertex,
    fragmentShader: beamFragment,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 16, 1, true);
  const beams = [0.16, 0.34, 0.62].map((radius) => {
    const mesh = new THREE.Mesh(beamGeo, beamMat);
    mesh.frustumCulled = false;
    mesh.userData.radius = radius;
    scene.add(mesh);
    return mesh;
  });
  const sideBeamMat = beamMat.clone();
  sideBeamMat.uniforms = {
    uTime: beamMat.uniforms.uTime,
    uColor: { value: new THREE.Color("#7ae0ff") },
    uCharge: beamMat.uniforms.uCharge,
  };
  const sideBeams = [1, -1].map((side) => {
    const mesh = new THREE.Mesh(beamGeo, sideBeamMat);
    mesh.frustumCulled = false;
    mesh.visible = false;
    mesh.userData.side = side;
    scene.add(mesh);
    return mesh;
  });

  const lockRing = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.68, 32),
    new THREE.MeshBasicMaterial({ color: 0xf0c27a, side: THREE.DoubleSide, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }),
  );
  scene.add(lockRing);

  const shock = new THREE.Mesh(
    new THREE.RingGeometry(0.4, 0.72, 48),
    new THREE.MeshBasicMaterial({ color: 0xfff1c4, side: THREE.DoubleSide, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  scene.add(shock);

  const particles = createParticles(quality.low ? 320 : 640, quality.low ? 0.34 : 0.48);
  scene.add(particles.points);

  const hemi = new THREE.HemisphereLight(0x3a2458, 0x07060c, 0.35);
  const coreLight = new THREE.PointLight(0xc43bd0, 18, 22, 2);
  const aimLight = new THREE.PointLight(0xffc56b, 0, 12, 2);
  scene.add(hemi, coreLight, aimLight);
  coreLight.position.set(0, 0, 0);

  const limbGeo = new THREE.CylinderGeometry(1, 1, 1, 7);
  const hide = new THREE.MeshLambertMaterial({ color: 0x2a2118, emissive: 0x3a2a12, emissiveIntensity: 0.3 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4af37, emissive: 0xf0c27a, emissiveIntensity: 0.8, metalness: 0.4, roughness: 0.35 });
  const focus = new THREE.Group();
  focus.position.set(0, -1.12, -2.15);
  focus.scale.setScalar(1.45);
  const palmL = new THREE.Vector3(-0.16, -0.02, 0.05);
  const palmR = new THREE.Vector3(0.16, -0.02, 0.05);
  cylinderBetween(limbGeo, new THREE.Vector3(-0.42, -0.28, 0.15), palmL, 0.055, hide, focus);
  cylinderBetween(limbGeo, new THREE.Vector3(0.42, -0.28, 0.15), palmR, 0.055, hide, focus);
  const stone = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), gold);
  focus.add(stone);
  for (const palm of [palmL, palmR]) {
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), hide);
    hand.position.copy(palm);
    focus.add(hand);
  }
  camera.add(focus);

  const award = new THREE.Group();
  award.visible = false;
  const awardHide = hide.clone();
  const awardGold = gold.clone();
  cylinderBetween(limbGeo, new THREE.Vector3(0, 0, -1.4), new THREE.Vector3(0, 0.05, 1.6), 0.07, awardHide, award);
  const bristle = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.1, 8), awardGold);
  bristle.position.set(0, 0.05, 2.05);
  bristle.rotation.x = Math.PI / 2;
  award.add(bristle);
  award.position.set(0, -0.4, 2.2);
  scene.add(award);

  const cooldowns = [0, 0, 0];
  const active = [0, 0, 0];
  const yAxis = new THREE.Vector3(0, 1, 0);
  const focusWorld = new THREE.Vector3();
  const target = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const projected = new THREE.Vector3();
  let shake = 0;
  let flash = 0;
  let kick = 0;
  let shockLife = 0;
  let awardShown = false;
  let lockWas = false;
  const flashColor = HIT_COLORS[0].clone();
  const quick = Boolean(options.quick);
  const reduced = Boolean(options.reduced);

  function spellActive(id) {
    return team.some((card, index) => card.spell === id && active[index] > 0);
  }

  function mods() {
    const next = {
      burnRate: (quick ? 2.6 : BASE_MODS.burnRate) * (spellActive("fang") ? 1.9 : 1) * (spellActive("astral") ? 1.35 : 1) * (spellActive("dive") ? 2.5 : 1),
      decay: spellActive("steady") ? 0.1 : BASE_MODS.decay,
      shellRate: BASE_MODS.shellRate * (spellActive("thunder") ? 2.4 : 1) * (spellActive("prism") ? 1.8 : 1),
    };
    return next;
  }

  function aimBeam(mesh, from, to, radius) {
    const delta = tmp.copy(to).sub(from);
    const length = Math.max(0.2, delta.length());
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(yAxis, delta.normalize());
    mesh.scale.set(radius, length, radius);
  }

  function update(dt, input, audio) {
    for (let i = 0; i < 3; i++) {
      cooldowns[i] = Math.max(0, cooldowns[i] - dt);
      active[i] = Math.max(0, active[i] - dt);
      if (input.spellEdge && input.spellEdge[i] && cooldowns[i] <= 0) {
        const spec = SPELLS[team[i].spell];
        cooldowns[i] = spec.cooldown * (quick ? 0.45 : 1);
        active[i] = spec.duration;
        if (audio) audio.cast();
        if (team[i].spell === "dive") enc.burn = Math.min(0.92, enc.burn + 0.34);
      }
    }

    const motion = spellActive("dream") ? 0.36 : 1;
    const reveal =
      (spellActive("guide") || spellActive("mind") || spellActive("shadow") ? 1 : 0) +
      (spellActive("listen") ? 0.8 : 0) +
      (spellActive("dream") ? 0.35 : 0) +
      (enc.hits === 0 && enc.time > 14 && Math.sin(enc.time * 0.65) > 0.55 ? 0.45 : 0);
    const lockRadius = 0.12 + (spellActive("steady") ? 0.02 : 0) + (spellActive("thunder") ? 0.02 : 0) + (spellActive("astral") ? 0.025 : 0);
    let aimX = input.aimX || 0;
    let aimY = input.aimY || 0;

    enc.time += 0;
    const preview = sourcePosition({ ...enc, time: enc.time + dt }, motion);
    if (spellActive("gale")) {
      camera.updateMatrixWorld();
      projected.set(preview[0], preview[1], preview[2]).project(camera);
      aimX += (projected.x - aimX) * 0.22;
      aimY += (projected.y - aimY) * 0.22;
    }

    shellMat.uniforms.uTime.value = enc.time;
    shellMat.uniforms.uHit.value = enc.booming ? Math.max(0, 1 - enc.boom) : enc.burn * 0.35;
    shellMat.uniforms.uCamera.value.copy(camera.position);
    sourceMat.uniforms.uTime.value = enc.time;
    sourceMat.uniforms.uBurn.value = enc.burn;
    sourceMat.uniforms.uCamera.value.copy(camera.position);
    beamMat.uniforms.uTime.value = enc.time;
    const pulse = 1 + Math.sin(enc.time * 2.4) * 0.045;
    shell.scale.setScalar(pulse * (enc.booming ? 1 + enc.boom * 0.18 : 1));
    shell.visible = !enc.won || enc.boom < 1.1;

    let sourceWorld = [0, 0, 0];
    shards.forEach((mesh, index) => {
      const shard = enc.shards[index];
      const pos = shardPosition(shard, enc.time, motion);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.lookAt(pos[0] * 2, pos[1] * 2, pos[2] * 2);
      mesh.visible = shard.alive;
      const s = shard.alive ? mesh.userData.base || mesh.scale.x : 0.001;
      if (!mesh.userData.base) mesh.userData.base = mesh.scale.x;
      mesh.scale.setScalar(shard.alive ? mesh.userData.base * (0.9 + shard.hp * 0.2) : 0.001);
      void s;
    });
    sourceWorld = sourcePosition(enc, motion);
    source.position.set(sourceWorld[0], sourceWorld[1], sourceWorld[2]);
    source.rotation.y += dt * 0.8;
    source.rotation.z += dt * 0.35;
    knotA.rotation.x += dt * 1.4;
    knotB.rotation.y -= dt * 1.1;
    coreLight.position.copy(source.position);
    coreLight.intensity = 10 + Math.sin(enc.time * 7.5) * 6 + enc.burn * 24 + (enc.booming ? 30 : 0);
    coreLight.color.set(enc.burn > 0.2 ? "#ffd27a" : "#c43bd0");

    for (let i = 0; i < arcCount; i++) {
      const shard = enc.shards[(i * 5) % enc.shards.length];
      const pos = shard.alive ? shards[(i * 5) % shards.length].position : source.position;
      const o = i * 6;
      arcPositions[o] = source.position.x;
      arcPositions[o + 1] = source.position.y;
      arcPositions[o + 2] = source.position.z;
      arcPositions[o + 3] = pos.x;
      arcPositions[o + 4] = pos.y;
      arcPositions[o + 5] = pos.z;
    }
    arcGeo.attributes.position.needsUpdate = true;
    arcs.visible = shell.visible;

    camera.updateMatrixWorld();
    let bestShell = null;
    enc.shards.forEach((shard, index) => {
      if (!shard.alive) return;
      projected.copy(shards[index].position).project(camera);
      if (projected.z > 1) return;
      const d = Math.hypot(projected.x - aimX, projected.y - aimY);
      if (d > lockRadius) return;
      if (!bestShell || d < bestShell.d) bestShell = { index, d };
    });
    projected.copy(source.position).project(camera);
    const sourceD = Math.hypot(projected.x - aimX, projected.y - aimY);
    let focused = null;
    const sourceWins = shell.visible && sourceD < lockRadius && (!bestShell || sourceD <= bestShell.d + 0.035);
    if (sourceWins) focused = "source";
    else if (bestShell) focused = bestShell.index;

    const attract = Boolean(input.attract);
    const events = !attract && shell.visible ? stepEncounter(enc, focused, dt, mods()) : [];
    if (attract) enc.time += dt;
    if (spellActive("prism") && focused === "source") {
      enc.shards.forEach((shard) => {
        if (!shard.alive) return;
        if (shards[shard.id].position.distanceTo(source.position) < 2.4) shard.hp -= dt * 0.85;
        if (shard.hp <= 0) shard.alive = false;
      });
    }

    let message = "Seek the source inside the ball";
    if (focused === "source") message = "Source locked";
    else if (typeof focused === "number") message = "Shell piece — the source is inside";
    if (enc.booming) message = enc.won ? "The source breaks" : `Source hit ${enc.hits} / 3`;

    focus.getWorldPosition(focusWorld);
    if (focused === "source") target.copy(source.position);
    else if (typeof focused === "number") target.copy(shards[focused].position);
    else {
      const ndc = projected.set(aimX, aimY, 0.5).unproject(camera);
      target.copy(focusWorld).add(ndc.sub(camera.position).normalize().multiplyScalar(14));
    }
    const charge = focused === "source" ? 0.4 + enc.burn : 0;
    beamMat.uniforms.uCharge.value = charge;
    const thickness = spellActive("fang") ? 0.62 : spellActive("thunder") ? 1.35 : 1;
    beams.forEach((mesh) => aimBeam(mesh, focusWorld, target, mesh.userData.radius * thickness * (0.85 + charge)));
    const prismOn = spellActive("prism");
    sideBeams.forEach((mesh) => {
      mesh.visible = prismOn && shell.visible;
      if (!mesh.visible) return;
      const offset = tmp.set(mesh.userData.side * 1.4, 0.4, 0);
      aimBeam(mesh, focusWorld, target.clone().add(offset), 0.12);
    });
    beams.forEach((mesh) => {
      mesh.visible = shell.visible && !attract;
    });
    if (attract) {
      sideBeams.forEach((mesh) => {
        mesh.visible = false;
      });
      lockRing.visible = false;
    }

    lockRing.visible = focused !== null && shell.visible;
    if (lockRing.visible) {
      const at = focused === "source" ? source.position : shards[focused].position;
      lockRing.position.copy(at);
      lockRing.lookAt(camera.position);
      const span = 1.1 - (focused === "source" ? enc.burn : 0.4);
      lockRing.scale.setScalar(span);
      lockRing.material.color.set(focused === "source" ? "#fff1c2" : "#9b6cff");
    }
    aimLight.position.copy(target);
    aimLight.intensity = focused === "source" ? 8 + enc.burn * 16 : focused !== null ? 3 : 0;

    beacon.visible = reveal > 0.3 && shell.visible;
    if (beacon.visible) {
      beacon.position.copy(source.position);
      beacon.scale.setScalar(1.4 + Math.sin(enc.time * 6) * 0.25 + reveal);
    }

    for (const event of events) {
      if (event.type === "source-hit") {
        const color = HIT_COLORS[(event.hit - 1) % HIT_COLORS.length];
        flashColor.copy(color);
        flash = 1;
        kick = 1;
        shake = reduced ? 0.12 : 0.72;
        shock.position.copy(source.position);
        shock.lookAt(camera.position);
        shockLife = 1;
        shock.material.color.setRGB(color.x, color.y, color.z);
        const palette = [nebulaRGB(event.hit * 0.17), nebulaRGB(event.hit * 0.17 + 0.33), nebulaRGB(event.hit * 0.17 + 0.66), [1.4, 1.2, 0.7]];
        burst(particles, source.position, quality.low ? 90 : 170, event.hit === 3 ? 16 : 11, palette);
        if (audio) audio.boom();
      } else if (event.type === "shell") {
        burst(particles, shards[event.id].position, 12, 4, [[0.7, 0.2, 0.9], [0.3, 0.05, 0.4]]);
        if (audio) audio.shatter();
      }
    }
    if (focused === "source" && !lockWas && audio) audio.lock();
    lockWas = focused === "source";
    if (focused === "source" && Math.random() < dt * 30) {
      const [r, g, b] = nebulaRGB(enc.time * 0.3);
      particles.spawn(target.x, target.y, target.z, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 0.25, r, g, b);
    }

    particles.update(dt);
    if (shockLife > 0) {
      shockLife -= dt * 0.85;
      shock.scale.setScalar(1 + (1 - shockLife) * 18);
      shock.material.opacity = Math.max(0, shockLife);
    } else shock.material.opacity = 0;

    shake = Math.max(0, shake - dt * (reduced ? 2.4 : 1.15));
    flash = Math.max(0, flash - dt * 1.4);
    kick = Math.max(0, kick - dt * 1.6);
    camera.position.set((Math.random() - 0.5) * shake, 0.35 + (Math.random() - 0.5) * shake, 15.5);

    if (enc.won && enc.boom > 1.05) {
      awardShown = true;
      award.visible = true;
      award.rotation.y += dt * 0.6;
      award.position.y = -0.2 + Math.sin(enc.time * 1.5) * 0.15;
    }

    shardMat.emissiveIntensity = 0.45 + enc.burn * 1.4 + (reveal > 0.4 ? 0.5 : 0);

    return {
      ceremony: awardShown,
      shake,
      flash,
      kick,
      bloom: enc.booming ? 1.4 : enc.burn * 0.7,
      motion: 0,
      flashColor,
      hud: {
        hits: enc.hits,
        burn: enc.burn,
        message,
        focused: focused === "source" ? "source" : focused === null ? "none" : "shell",
        spells: team.map((card, index) => ({
          name: SPELLS[card.spell].name,
          cooldown: cooldowns[index],
          max: SPELLS[card.spell].cooldown * (quick ? 0.45 : 1),
          active: active[index],
        })),
      },
    };
  }

  function resize(width, height) {
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
  }

  function dispose() {
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const list = Array.isArray(obj.material) ? obj.material : [obj.material];
        list.forEach((mat) => mat.dispose());
      }
    });
  }

  function sourceNdc() {
    camera.updateMatrixWorld();
    const projectedSource = source.position.clone().project(camera);
    return { x: projectedSource.x, y: projectedSource.y, z: projectedSource.z };
  }

  return { scene, camera, update, resize, dispose, sourceNdc };
}
