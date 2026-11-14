import * as THREE from "three";

export function createParticles(max, size) {
  const positions = new Float32Array(max * 3);
  const colors = new Float32Array(max * 3);
  for (let i = 0; i < max; i++) positions[i * 3 + 1] = -4000;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  const pool = Array.from({ length: max }, () => ({
    alive: false,
    life: 0,
    max: 1,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    r: 1,
    g: 1,
    b: 1,
  }));
  let cursor = 0;

  return {
    points,
    spawn(x, y, z, vx, vy, vz, life, r, g, b) {
      const particle = pool[cursor];
      cursor = (cursor + 1) % max;
      particle.alive = true;
      particle.x = x;
      particle.y = y;
      particle.z = z;
      particle.vx = vx;
      particle.vy = vy;
      particle.vz = vz;
      particle.life = life;
      particle.max = life;
      particle.r = r;
      particle.g = g;
      particle.b = b;
    },
    update(dt) {
      for (let i = 0; i < max; i++) {
        const particle = pool[i];
        const o = i * 3;
        if (!particle.alive) {
          positions[o + 1] = -4000;
          continue;
        }
        particle.life -= dt;
        if (particle.life <= 0) {
          particle.alive = false;
          positions[o + 1] = -4000;
          continue;
        }
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.z += particle.vz * dt;
        particle.vx *= 0.985;
        particle.vy = particle.vy * 0.985 - dt * 0.35;
        particle.vz *= 0.985;
        const fade = Math.max(0, particle.life / particle.max);
        positions[o] = particle.x;
        positions[o + 1] = particle.y;
        positions[o + 2] = particle.z;
        colors[o] = particle.r * fade;
        colors[o + 1] = particle.g * fade;
        colors[o + 2] = particle.b * fade;
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
    },
  };
}

export function nebulaRGB(t) {
  const palette = [
    [1.15, 0.28, 0.78],
    [0.2, 0.95, 1.15],
    [1.2, 0.82, 0.28],
    [0.55, 0.28, 1.25],
    [1.05, 0.42, 0.22],
    [0.35, 1.05, 0.72],
  ];
  const scaled = ((t % 1) + 1) % 1 * palette.length;
  const index = Math.floor(scaled) % palette.length;
  const next = (index + 1) % palette.length;
  const blend = scaled - Math.floor(scaled);
  return [
    palette[index][0] + (palette[next][0] - palette[index][0]) * blend,
    palette[index][1] + (palette[next][1] - palette[index][1]) * blend,
    palette[index][2] + (palette[next][2] - palette[index][2]) * blend,
  ];
}
