import * as THREE from "three";
import { createParticles, nebulaRGB } from "./particles.js";
import { buildCourse, createFlight, mulberry32, stepFlight } from "./sim.js";

const skyVertex = `
  varying vec3 vDir;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vDir = world.xyz - cameraPosition;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const skyFragment = `
  varying vec3 vDir;
  varying vec2 vUv;
  uniform sampler2D tSky;
  uniform float uTime;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  void main() {
    vec3 dir = normalize(vDir);
    vec3 color = texture2D(tSky, vUv).rgb;
    float cell = hash(floor(dir * 280.0));
    float star = step(0.984, cell);
    float twinkle = 0.5 + 0.5 * sin(uTime * (1.4 + cell * 6.0) + cell * 40.0);
    color += vec3(0.92, 0.95, 1.0) * star * twinkle * 1.55;
    float gold = step(0.996, hash(floor(dir * 120.0 + 4.0)));
    color += vec3(1.2, 0.78, 0.32) * gold;
    gl_FragColor = vec4(color, 1.0);
  }
`;

const groundVertex = `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const groundFragment = `
  varying vec3 vWorld;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  void main() {
    float lane = smoothstep(10.5, 2.2, abs(vWorld.x));
    float grit = noise(vWorld.xz * 0.42);
    float streak = smoothstep(0.62, 0.98, noise(vec2(vWorld.x * 0.55, vWorld.z * 0.05)));
    float edge = smoothstep(5.6, 6.5, abs(vWorld.x)) * smoothstep(8.2, 6.8, abs(vWorld.x));
    vec3 moss = vec3(0.02, 0.055, 0.032);
    vec3 dirt = vec3(0.2, 0.14, 0.07);
    vec3 color = mix(moss, dirt, lane);
    color *= 0.75 + grit * 0.4;
    color += vec3(0.42, 0.28, 0.08) * streak * lane * 0.35;
    color += vec3(0.72, 0.52, 0.22) * edge;
    gl_FragColor = vec4(color, 1.0);
  }
`;

function paintSkyTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const wash = ctx.createLinearGradient(0, 0, 0, 512);
  wash.addColorStop(0, "#140824");
  wash.addColorStop(0.45, "#0b1024");
  wash.addColorStop(1, "#070910");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, 1024, 512);
  const blobs = [
    ["rgba(120, 40, 150, 0.85)", 180, 90, 260],
    ["rgba(20, 90, 110, 0.8)", 520, 70, 300],
    ["rgba(180, 70, 120, 0.55)", 760, 120, 240],
    ["rgba(210, 150, 60, 0.35)", 340, 150, 180],
    ["rgba(70, 40, 180, 0.6)", 900, 60, 200],
    ["rgba(30, 140, 130, 0.45)", 80, 200, 160],
  ];
  ctx.globalCompositeOperation = "lighter";
  for (const [color, x, y, radius] of blobs) {
    const grd = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grd.addColorStop(0, color);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 1024, 512);
  }
  ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < 2200; i++) {
    const bright = Math.random();
    ctx.fillStyle = `rgba(243,236,223,${0.2 + bright * 0.8})`;
    const size = bright > 0.985 ? 2 : 1;
    ctx.fillRect(Math.random() * 1024, Math.random() * 512, size, size);
  }
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = "rgba(240,194,122,0.95)";
    ctx.fillRect(Math.random() * 1024, Math.random() * 360, 2, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

function leafTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 256, 256);
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = `rgba(${10 + (i % 4) * 6}, ${36 + (i % 5) * 8}, ${22 + (i % 3) * 6}, 0.95)`;
    ctx.beginPath();
    ctx.ellipse(30 + ((i * 53) % 190), 24 + ((i * 67) % 180), 34, 16, i * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.ellipse(28 + i * 32, 40 + (i % 3) * 48, 18, 12, i, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

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

function paintInstance(mesh, index, dummy, color) {
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
  if (color) mesh.setColorAt(index, color);
}

export function createFlightStage(quality, team, options = {}) {
  const rng = mulberry32(options.seed ?? 11);
  const course = buildCourse({
    length: options.quick ? 860 : 2450,
    spacing: quality.low ? 30 : 22,
    rng,
  });
  const state = createFlight(course, mulberry32((options.seed ?? 11) + 3));
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x1a1438, quality.low ? 0.011 : 0.0085);
  scene.background = new THREE.Color("#070814");

  const camera = new THREE.PerspectiveCamera(78, 1, 0.08, 700);
  scene.add(camera);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(340, 28, 16),
    new THREE.ShaderMaterial({
      uniforms: { tSky: { value: paintSkyTexture() }, uTime: { value: 0 } },
      vertexShader: skyVertex,
      fragmentShader: skyFragment,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    }),
  );
  scene.add(sky);

  const starCount = quality.low ? 500 : quality.mobile ? 900 : 1400;
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starPositions[i * 3] = (Math.random() - 0.5) * 70;
    starPositions[i * 3 + 1] = 6 + Math.random() * 32;
    starPositions[i * 3 + 2] = Math.random() * course.length;
    const gold = Math.random() > 0.82;
    starColors[i * 3] = gold ? 1 : 0.85;
    starColors[i * 3 + 1] = gold ? 0.78 : 0.88;
    starColors[i * 3 + 2] = gold ? 0.4 : 1;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      size: 0.62,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );
  scene.add(stars);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(46, course.length + 160, 1, 1),
    new THREE.ShaderMaterial({ vertexShader: groundVertex, fragmentShader: groundFragment }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, course.length / 2);
  scene.add(ground);

  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  const trunkGeo = new THREE.CylinderGeometry(1, 1.28, 1, 7);
  const crownGeo = new THREE.ConeGeometry(1, 1, 7);
  const puffGeo = new THREE.SphereGeometry(1, 7, 6);
  const bark = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    emissive: 0x5a381c,
    emissiveIntensity: 0.42,
  });
  const leaf = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    emissive: 0x1c5a32,
    emissiveIntensity: 0.38,
  });
  const trunks = new THREE.InstancedMesh(trunkGeo, bark, course.trees.length);
  const crowns = new THREE.InstancedMesh(crownGeo, leaf, course.trees.length);
  const puffs = new THREE.InstancedMesh(puffGeo, leaf, course.trees.length);
  const barkTints = ["#a56a3c", "#8d552e", "#c4844e"];
  const leafTints = ["#3e9a58", "#2f7a48", "#57b36a"];
  course.trees.forEach((tree, index) => {
    dummy.position.set(tree.x, tree.h * 0.46, tree.z);
    dummy.scale.set(tree.r * 0.72, tree.h * 0.92, tree.r * 0.72);
    dummy.rotation.set(0, tree.z * 0.2, 0);
    tint.set(barkTints[tree.kind % 3]);
    paintInstance(trunks, index, dummy, tint);
    const crownH = 3.6 + tree.kind * 0.55;
    dummy.position.set(tree.x, tree.h + crownH * 0.28, tree.z);
    dummy.scale.set(2.5 + tree.kind * 0.28, crownH, 2.5);
    dummy.rotation.set(0, index * 0.4, 0);
    tint.set(leafTints[tree.kind % 3]);
    paintInstance(crowns, index, dummy, tint);
    dummy.position.set(tree.x, tree.h * 0.78, tree.z);
    dummy.scale.set(1.7 + tree.kind * 0.15, 1.15, 1.7);
    dummy.rotation.set(0, index * 0.7, 0);
    tint.set(leafTints[(tree.kind + 1) % 3]);
    paintInstance(puffs, index, dummy, tint);
  });
  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  puffs.instanceMatrix.needsUpdate = true;
  if (trunks.instanceColor) trunks.instanceColor.needsUpdate = true;
  if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
  if (puffs.instanceColor) puffs.instanceColor.needsUpdate = true;
  scene.add(trunks, crowns, puffs);

  const leafMat = new THREE.MeshBasicMaterial({
    map: leafTexture(),
    transparent: true,
    alphaTest: 0.4,
    side: THREE.DoubleSide,
    color: 0xc5d7c0,
  });
  const canopyCount = Math.max(1, Math.floor(course.length / (quality.low ? 48 : 32)));
  const canopy = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), leafMat, canopyCount);
  for (let i = 0; i < canopyCount; i++) {
    dummy.position.set(Math.sin(i * 1.7) * 1.4, 6.1 + (i % 3) * 0.45, 18 + i * (course.length / canopyCount));
    dummy.scale.set(18, 7.2, 1);
    dummy.rotation.set(-1.05, i * 0.4, Math.sin(i) * 0.2);
    dummy.updateMatrix();
    canopy.setMatrixAt(i, dummy.matrix);
  }
  canopy.instanceMatrix.needsUpdate = true;
  scene.add(canopy);

  if (course.logs.length) {
    const logs = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshLambertMaterial({ color: 0x5a3a24 }),
      course.logs.length,
    );
    course.logs.forEach((log, index) => {
      dummy.position.set(log.x, log.h * 0.5, log.z);
      dummy.rotation.set(0, Math.sin(log.z) * 0.4, 0.08);
      dummy.scale.set(log.half * 2, log.h, 0.62);
      dummy.updateMatrix();
      logs.setMatrixAt(index, dummy.matrix);
    });
    logs.instanceMatrix.needsUpdate = true;
    scene.add(logs);
  }

  if (course.gates.length) {
    const wisps = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.18, 0),
      new THREE.MeshBasicMaterial({ color: 0xffd78a }),
      course.gates.length,
    );
    course.gates.forEach((gate, index) => {
      dummy.position.set(gate.gap, 2.05, gate.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1.8, 1);
      dummy.updateMatrix();
      wisps.setMatrixAt(index, dummy.matrix);
    });
    wisps.instanceMatrix.needsUpdate = true;
    scene.add(wisps);
  }

  const laneMarkers = [
    ...course.trees.filter((tree) => tree.lane).map((tree) => ({ x: tree.x, z: tree.z })),
    ...course.logs.map((log) => ({ x: log.x, z: log.z })),
  ];
  const warnings = Array.from({ length: 6 }, () => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.25, 0.07, 6, 18),
      new THREE.MeshBasicMaterial({
        color: 0xffc56b,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.visible = false;
    ring.frustumCulled = false;
    scene.add(ring);
    return ring;
  });

  const bodyGeo = new THREE.IcosahedronGeometry(0.86, 1);
  const hornGeo = new THREE.ConeGeometry(0.16, 0.7, 5);
  const eyeGeo = new THREE.SphereGeometry(0.13, 8, 8);
  const wingGeo = new THREE.PlaneGeometry(1.45, 0.55);
  const demonSkins = [0xff3ec8, 0xff7a32, 0x3de4ff].map(
    (color) => new THREE.MeshBasicMaterial({ color }),
  );
  const demonRims = [0xffd0f0, 0xffe0b0, 0xd8fbff].map(
    (color) => new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }),
  );
  const demonEye = new THREE.MeshBasicMaterial({ color: 0xfff6c2 });
  const demonWing = new THREE.MeshBasicMaterial({
    color: 0x7af6ff,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
  });
  const demonHorn = new THREE.MeshBasicMaterial({ color: 0xffd27a });
  const demonGroups = state.demons.map((demon) => {
    const group = new THREE.Group();
    const skin = demon.id % demonSkins.length;
    const body = new THREE.Mesh(bodyGeo, demonSkins[skin]);
    group.add(body);
    if (!quality.low) {
      const rim = new THREE.Mesh(bodyGeo, demonRims[skin]);
      rim.scale.setScalar(1.22);
      group.add(rim);
    }
    [-1, 1].forEach((side) => {
      const horn = new THREE.Mesh(hornGeo, demonHorn);
      horn.position.set(side * 0.32, 0.7, 0.05);
      horn.rotation.z = side * -0.4;
      group.add(horn);
      const eye = new THREE.Mesh(eyeGeo, demonEye);
      eye.position.set(side * 0.24, 0.14, -0.7);
      group.add(eye);
      const wing = new THREE.Mesh(wingGeo, demonWing);
      wing.position.set(side * 0.85, 0.18, 0.15);
      wing.userData.wing = side;
      group.add(wing);
    });
    group.position.set(demon.x, demon.y, demon.z);
    group.scale.setScalar(quality.low ? 1.15 : 1.35);
    scene.add(group);
    return group;
  });

  const boltGeo = new THREE.OctahedronGeometry(0.42, 0);
  const bolts = Array.from({ length: 28 }, () => {
    const mesh = new THREE.Mesh(
      boltGeo,
      new THREE.MeshBasicMaterial({ color: 0xff2d95 }),
    );
    mesh.scale.set(2.2, 2.2, 4.4);
    mesh.visible = false;
    mesh.frustumCulled = false;
    scene.add(mesh);
    return mesh;
  });

  const gemGeo = new THREE.OctahedronGeometry(0.22, 0);
  const gems = Array.from({ length: quality.low ? 36 : 56 }, () => {
    const gem = new THREE.Mesh(gemGeo, new THREE.MeshBasicMaterial({ color: 0x66ccff }));
    gem.scale.setScalar(1.85);
    gem.visible = false;
    gem.frustumCulled = false;
    scene.add(gem);
    return gem;
  });
  const trails = createParticles(quality.low ? 240 : 480, 0.36);
  const bursts = createParticles(quality.low ? 180 : 360, 0.55);
  scene.add(trails.points, bursts.points);

  const finish = new THREE.Mesh(
    new THREE.TorusGeometry(3.6, 0.09, 12, 48),
    new THREE.MeshBasicMaterial({ color: 0xffe1a8 }),
  );
  finish.position.set(0, 2.15, course.length);
  const finishLight = new THREE.PointLight(0xffd48a, 8, 24, 2);
  finishLight.position.copy(finish.position);
  scene.add(finish, finishLight);
  for (let i = 0; i < 8; i++) {
    const jewel = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.16, 0),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0x7af0ff : 0xff7ad9 }),
    );
    const angle = (i / 8) * Math.PI * 2;
    jewel.position.set(Math.cos(angle) * 3.6, 2.15 + Math.sin(angle) * 3.6, course.length);
    scene.add(jewel);
  }

  const limbGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
  const wood = new THREE.MeshLambertMaterial({ color: 0x6d3c22, emissive: 0x2a140c, emissiveIntensity: 0.15 });
  const hide = new THREE.MeshLambertMaterial({ color: 0x1a120c });
  const paint = new THREE.MeshLambertMaterial({ color: 0x1c6d66, emissive: 0x0e3e3a, emissiveIntensity: 0.25 });
  const ochre = new THREE.MeshLambertMaterial({ color: 0xc45a3c, emissive: 0x6a2814, emissiveIntensity: 0.18 });
  const goldMat = new THREE.MeshBasicMaterial({ color: 0xe2b066 });
  const rig = new THREE.Group();
  const handleStart = new THREE.Vector3(0, 0.02, 0.55);
  const handleEnd = new THREE.Vector3(0, -0.08, 3.35);
  cylinderBetween(limbGeo, handleStart, handleEnd, 0.075, wood, rig);
  for (let i = 0; i < 5; i++) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.016, 6, 12), goldMat);
    band.position.lerpVectors(handleStart, handleEnd, 0.16 + i * 0.15);
    band.lookAt(handleEnd);
    rig.add(band);
  }
  for (let i = 0; i < 9; i++) {
    const bristle = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.95, 5), goldMat);
    const angle = (i / 9) * Math.PI * 2;
    bristle.position.copy(handleEnd);
    bristle.position.x += Math.cos(angle) * 0.14;
    bristle.position.y += Math.sin(angle) * 0.1;
    bristle.rotation.x = Math.PI / 2 + Math.sin(angle) * 0.18;
    bristle.rotation.z = angle;
    rig.add(bristle);
  }
  const shoulders = [new THREE.Vector3(-0.48, 0.22, -0.05), new THREE.Vector3(0.48, 0.22, -0.05)];
  const hands = [new THREE.Vector3(-0.22, 0.04, 0.95), new THREE.Vector3(0.22, 0.04, 0.95)];
  shoulders.forEach((shoulder, index) => {
    const elbow = shoulder.clone().lerp(hands[index], 0.5);
    elbow.y -= 0.08;
    elbow.x += index === 0 ? -0.12 : 0.12;
    cylinderBetween(limbGeo, shoulder, elbow, 0.085, index === 0 ? paint : ochre, rig);
    cylinderBetween(limbGeo, elbow, hands[index], 0.062, hide, rig);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), hide);
    hand.scale.set(1.15, 0.72, 1.35);
    hand.position.copy(hands[index]);
    rig.add(hand);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 10), goldMat);
    ring.position.copy(hands[index]);
    ring.position.z += 0.08;
    rig.add(ring);
  });
  const cloak = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.25, 8), hide);
  cloak.position.set(0, -0.2, -0.42);
  rig.add(cloak);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), hide);
  hood.position.set(0, 0.78, -0.58);
  rig.add(hood);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.028, 6, 16), goldMat);
  band.position.set(0, 0.7, -0.34);
  band.rotation.x = Math.PI / 2;
  rig.add(band);
  const head = new THREE.Object3D();
  head.position.set(0, 0.46, -0.22);
  rig.add(head);
  const tip = new THREE.Object3D();
  tip.position.copy(handleEnd);
  rig.add(tip);
  scene.add(rig);

  const speedLines = new THREE.Group();
  const lineMat = new THREE.MeshBasicMaterial({
    color: 0xf0c27a,
    transparent: true,
    opacity: 0.14,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const lineGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let i = 0; i < 28; i++) {
    const line = new THREE.Mesh(lineGeo, lineMat);
    const angle = Math.random() * Math.PI * 2;
    const radius = 1.85 + Math.random() * 2.1;
    line.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.75 - 0.15, -3 - Math.random() * 16);
    line.scale.set(0.025, 0.025, 2.2 + Math.random() * 4.5);
    line.userData.radius = radius;
    line.userData.angle = angle;
    speedLines.add(line);
  }
  camera.add(speedLines);

  scene.add(new THREE.HemisphereLight(0xb7a6e4, 0x1c2a1c, 1.25));
  const moon = new THREE.DirectionalLight(0xe4eeff, 1.45);
  moon.position.set(-36, 58, 24);
  scene.add(moon);
  const rim = new THREE.DirectionalLight(0xffc48a, 0.62);
  rim.position.set(28, 16, -18);
  scene.add(rim);
  const tipLight = new THREE.PointLight(0xffc56b, 3.2, 11, 2);
  scene.add(tipLight);

  let view = "cockpit";
  let pitch = 0.12;
  let camSmooth = new THREE.Vector3();
  let chaseReady = false;
  let shake = 0;
  let flash = 0;
  const flashColor = new THREE.Vector3(1, 0.85, 0.7);
  const reduced = Boolean(options.reduced);
  const color = new THREE.Color();

  function placeCamera(dt, steerY) {
    pitch += (-steerY * 0.16 - pitch) * Math.min(1, dt * 4);
    rig.position.set(state.x, state.y, state.z);
    rig.rotation.set(pitch, 0, state.bank);
    rig.updateMatrixWorld(true);
    const nextFov = view === "cockpit" ? 64 : 72;
    if (camera.fov !== nextFov) {
      camera.fov = nextFov;
      camera.updateProjectionMatrix();
    }
    if (view === "cockpit") {
      head.getWorldPosition(camera.position);
      const lookTarget = new THREE.Vector3(0, 0.22, 14).applyMatrix4(rig.matrixWorld);
      camera.up.set(0, 1, 0).applyQuaternion(rig.quaternion);
      camera.lookAt(lookTarget);
      chaseReady = false;
    } else {
      const ideal = new THREE.Vector3(0, 0.92, -2.05).applyQuaternion(rig.quaternion).add(rig.position);
      if (!chaseReady) {
        camSmooth.copy(ideal);
        chaseReady = true;
      } else camSmooth.lerp(ideal, 1 - Math.exp(-dt * 4.2));
      camera.position.copy(camSmooth);
      camera.up.set(0, 1, 0);
      camera.lookAt(state.x, state.y + 0.42, state.z + 4.5);
      camera.rotateZ(state.bank * 0.55);
    }
    sky.position.copy(camera.position);
    tip.getWorldPosition(tipLight.position);
  }

  function update(dt, input, audio) {
    if (input.viewEdge) view = view === "cockpit" ? "chase" : "cockpit";
    const events = stepFlight(state, { steerX: input.steerX, steerY: input.steerY, shoot: input.shoot }, dt);
    placeCamera(dt, input.steerY || 0);
    sky.material.uniforms.uTime.value = state.time;

    state.demons.forEach((demon, index) => {
      const group = demonGroups[index];
      group.visible = demon.alive;
      if (!demon.alive) return;
      group.position.set(demon.x, demon.y, demon.z);
      group.lookAt(state.x, state.y, state.z);
      group.children.forEach((child) => {
        if (child.userData.wing) child.rotation.y = child.userData.wing * (0.5 + Math.sin(state.time * 8 + index) * 0.35);
      });
    });

    const boltList = state.bolts;
    bolts.forEach((mesh, index) => {
      const bolt = boltList[index];
      mesh.visible = Boolean(bolt);
      if (!bolt) return;
      mesh.position.set(bolt.x, bolt.y, bolt.z + 1.4);
      const [r, g, b] = nebulaRGB(bolt.hue);
      color.setRGB(Math.min(0.82, r * 0.7), Math.min(0.82, g * 0.7), Math.min(0.82, b * 0.7));
      mesh.material.color.copy(color);
      for (let n = 0; n < 3; n++) {
        const spark = nebulaRGB(bolt.hue + n * 0.2 + Math.random());
        trails.spawn(
          bolt.x + (Math.random() - 0.5) * 0.5,
          bolt.y + (Math.random() - 0.5) * 0.5,
          bolt.z - 1.2 - Math.random() * 3.5,
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.8,
          -2,
          0.28,
          Math.min(0.8, spark[0] * 0.7),
          Math.min(0.8, spark[1] * 0.7),
          Math.min(0.8, spark[2] * 0.7),
        );
      }
    });

    let gemIndex = 0;
    const perBolt = 4;
    for (const bolt of boltList) {
      for (let n = 0; n < perBolt && gemIndex < gems.length; n++) {
        const gem = gems[gemIndex++];
        const spark = nebulaRGB(bolt.hue + (n + 1) * 0.17);
        color.setRGB(Math.min(0.9, spark[0] * 0.8), Math.min(0.9, spark[1] * 0.8), Math.min(0.9, spark[2] * 0.8));
        gem.material.color.copy(color);
        const spin = state.time * 3 + n;
        gem.position.set(
          bolt.x + Math.sin(spin) * 0.72,
          bolt.y + Math.cos(spin * 0.8) * 0.46,
          bolt.z - (n + 1) * 1.7,
        );
        gem.rotation.set(state.time * 2, state.time * 3, 0);
        gem.visible = true;
      }
    }
    for (; gemIndex < gems.length; gemIndex++) gems[gemIndex].visible = false;

    let shown = 0;
    for (const marker of laneMarkers) {
      const ahead = marker.z - state.z;
      if (ahead < 3 || ahead > 46 || shown >= warnings.length) continue;
      const ring = warnings[shown++];
      ring.visible = true;
      ring.position.set(marker.x, 0.28, marker.z);
      const near = 1 - ahead / 46;
      ring.material.opacity = 0.16 + near * 0.62;
      const pulse = 1 + Math.sin(state.time * 5 + marker.z) * 0.08;
      ring.scale.setScalar(0.85 + near * 0.35 * pulse);
    }
    for (let i = shown; i < warnings.length; i++) warnings[i].visible = false;

    const speedGlow = Math.min(1, state.speed / 80);
    lineMat.opacity = 0.04 + speedGlow * 0.12;
    speedLines.children.forEach((line) => {
      line.position.z += dt * (18 + state.speed * 0.55);
      if (line.position.z > -1.2) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 1.9 + Math.random() * 2.2;
        line.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.72 - 0.2, -14 - Math.random() * 8);
      }
    });

    for (const event of events) {
      if (event.type === "shot" && audio) audio.shot();
      if (event.type === "demon") {
        const palette = [0.15, 0.48, 0.81].map((offset) => nebulaRGB(state.time * 0.2 + offset));
        for (let i = 0; i < (quality.low ? 18 : 36); i++) {
          const [r, g, b] = palette[i % palette.length];
          bursts.spawn(
            event.x,
            event.y,
            event.z,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
            0.35 + Math.random() * 0.4,
            r,
            g,
            b,
          );
        }
        flash = Math.max(flash, 0.18);
        if (audio) audio.demon();
      }
      if (event.type === "hurt") {
        shake = Math.max(shake, reduced ? 0.08 : 0.38);
        flash = 0.55;
        flashColor.set(1.1, 0.35, 0.25);
        if (audio) audio.hurt();
      }
      if (event.type === "won") {
        flash = 0.7;
        flashColor.set(1.2, 0.95, 0.55);
        if (audio) audio.win();
      }
    }

    trails.update(dt);
    bursts.update(dt);
    shake = Math.max(0, shake - dt * 1.3);
    flash = Math.max(0, flash - dt * 1.6);
    if (shake > 0) {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
    }

    const demonsLeft = state.demons.filter((demon) => demon.alive).length;
    const teamHue = team.length ? team[0].id : "026";
    void teamHue;
    return {
      won: state.won,
      lost: state.lost,
      flash,
      kick: flash * 0.4,
      bloom: 0.08 + Math.min(0.22, state.bolts.length * 0.035),
      motion: reduced ? 0 : Math.min(0.55, (state.speed - 50) / 70),
      flashColor,
      hud: {
        health: state.health,
        score: state.score + Math.floor(state.z),
        z: state.z,
        length: state.length,
        speed: state.speed,
        view,
        demonsLeft,
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
        list.forEach((material) => {
          if (material.map) material.map.dispose();
          material.dispose();
        });
      }
    });
  }

  function guide() {
    let steerX = 0;
    let steerY = 0;
    let nextZ = state.length;
    for (const gate of course.gates) {
      if (gate.z > state.z + 6) {
        steerX = Math.max(-1, Math.min(1, gate.gap / 6.6));
        nextZ = gate.z;
        break;
      }
    }
    for (const log of course.logs) {
      if (log.z > state.z && log.z < state.z + 28 && Math.abs(log.x - state.x) < log.half + 0.8) steerY = 1;
    }
    return { steerX, steerY, z: state.z, length: state.length, health: state.health, won: state.won, lost: state.lost };
  }

  function nearest() {
    let best = null;
    for (const demon of state.demons) {
      if (!demon.alive) continue;
      const dz = demon.z - state.z;
      if (dz < -4) continue;
      if (!best || dz < best.dz) best = { dz, x: demon.x, y: demon.y };
    }
    return best;
  }

  placeCamera(0.016, 0);
  return { scene, camera, update, resize, dispose, guide, nearest };
}
