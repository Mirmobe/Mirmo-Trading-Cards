import * as THREE from "three";

const quadVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const brightFragment = `
  uniform sampler2D tScene;
  uniform float uThreshold;
  varying vec2 vUv;
  void main() {
    vec3 color = texture2D(tScene, vUv).rgb;
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    float mask = smoothstep(uThreshold, uThreshold + 0.45, luma);
    gl_FragColor = vec4(color * mask, 1.0);
  }
`;

const blurFragment = `
  uniform sampler2D tScene;
  uniform vec2 uTexel;
  uniform vec2 uDir;
  varying vec2 vUv;
  void main() {
    vec2 step = uTexel * uDir;
    vec3 color = texture2D(tScene, vUv).rgb * 0.227027;
    color += texture2D(tScene, vUv + step * 1.3846).rgb * 0.316216;
    color += texture2D(tScene, vUv - step * 1.3846).rgb * 0.316216;
    color += texture2D(tScene, vUv + step * 3.2308).rgb * 0.070270;
    color += texture2D(tScene, vUv - step * 3.2308).rgb * 0.070270;
    gl_FragColor = vec4(color, 1.0);
  }
`;

const compositeFragment = `
  uniform sampler2D tScene;
  uniform sampler2D tBloom;
  uniform float uBloom;
  uniform float uFlash;
  uniform vec3 uFlashColor;
  uniform float uMotion;
  uniform float uKick;
  varying vec2 vUv;
  vec3 aces(vec3 x) {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  }
  void main() {
    vec2 dir = vUv - 0.5;
    float dist = length(dir);
    vec2 n = dir / max(dist, 0.0008);
    float blur = uMotion * smoothstep(0.08, 0.9, dist);
    vec3 scene = texture2D(tScene, vUv).rgb * 0.46;
    scene += texture2D(tScene, vUv - n * blur * 0.02).rgb * 0.27;
    scene += texture2D(tScene, vUv - n * blur * 0.042).rgb * 0.27;
    vec2 kick = n * uKick * 0.014;
    scene.r = mix(scene.r, texture2D(tScene, vUv + kick).r, clamp(uKick, 0.0, 1.0));
    scene.b = mix(scene.b, texture2D(tScene, vUv - kick).b, clamp(uKick, 0.0, 1.0));
    vec3 color = scene + texture2D(tBloom, vUv).rgb * uBloom;
    color += uFlashColor * uFlash;
    float vignette = smoothstep(1.12, 0.28, dist);
    color *= mix(0.58, 1.0, vignette);
    color = pow(max(aces(color), 0.0), vec3(0.4545));
    gl_FragColor = vec4(color, 1.0);
  }
`;

function target(width, height, type, depth) {
  const rt = new THREE.WebGLRenderTarget(width, height, {
    type,
    depthBuffer: depth,
    stencilBuffer: false,
    magFilter: THREE.LinearFilter,
    minFilter: THREE.LinearFilter,
  });
  rt.texture.colorSpace = THREE.NoColorSpace;
  return rt;
}

function material(fragment, uniforms) {
  return new THREE.ShaderMaterial({
    vertexShader: quadVertex,
    fragmentShader: fragment,
    uniforms,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
}

export function createBloom(renderer, quality) {
  const gl = renderer.getContext();
  const floatExt = renderer.capabilities.isWebGL2 && gl.getExtension("EXT_color_buffer_float");
  const type = floatExt ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const hdr = Boolean(floatExt);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x07060c, 1);

  const sceneRT = target(2, 2, type, true);
  const brightRT = target(2, 2, type, false);
  const blurA = target(2, 2, type, false);
  const blurB = target(2, 2, type, false);

  const brightMat = material(brightFragment, {
    tScene: { value: null },
    uThreshold: { value: hdr ? 0.72 : 0.5 },
  });
  const blurMat = material(blurFragment, {
    tScene: { value: null },
    uTexel: { value: new THREE.Vector2(1, 1) },
    uDir: { value: new THREE.Vector2(1, 0) },
  });
  const compositeMat = material(compositeFragment, {
    tScene: { value: null },
    tBloom: { value: null },
    uBloom: { value: 1.15 },
    uFlash: { value: 0 },
    uFlashColor: { value: new THREE.Vector3(1, 0.9, 0.6) },
    uMotion: { value: 0 },
    uKick: { value: 0 },
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), brightMat);
  const quadScene = new THREE.Scene();
  quadScene.add(quad);
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const passes = quality.low ? 2 : 3;

  function setSize(width, height) {
    const w = Math.max(2, Math.floor(width));
    const h = Math.max(2, Math.floor(height));
    const scale = quality.low ? 0.22 : quality.mobile ? 0.3 : 0.42;
    const bw = Math.max(2, Math.floor(w * scale));
    const bh = Math.max(2, Math.floor(h * scale));
    sceneRT.setSize(w, h);
    brightRT.setSize(bw, bh);
    blurA.setSize(bw, bh);
    blurB.setSize(bw, bh);
    blurMat.uniforms.uTexel.value.set(1 / bw, 1 / bh);
  }

  function render(scene, camera, fx = {}) {
    renderer.setRenderTarget(sceneRT);
    renderer.clear(true, true, true);
    renderer.render(scene, camera);

    quad.material = brightMat;
    brightMat.uniforms.tScene.value = sceneRT.texture;
    renderer.setRenderTarget(brightRT);
    renderer.clear(true, false, false);
    renderer.render(quadScene, quadCamera);

    let input = brightRT;
    quad.material = blurMat;
    for (let i = 0; i < passes; i++) {
      const radius = 1 + i * 0.85;
      blurMat.uniforms.uDir.value.set(radius, 0);
      blurMat.uniforms.tScene.value = input.texture;
      renderer.setRenderTarget(blurA);
      renderer.render(quadScene, quadCamera);
      blurMat.uniforms.uDir.value.set(0, radius);
      blurMat.uniforms.tScene.value = blurA.texture;
      renderer.setRenderTarget(blurB);
      renderer.render(quadScene, quadCamera);
      input = blurB;
    }

    const flash = fx.flash || 0;
    compositeMat.uniforms.tScene.value = sceneRT.texture;
    compositeMat.uniforms.tBloom.value = blurB.texture;
    compositeMat.uniforms.uBloom.value = 0.95 + (fx.bloom || 0);
    compositeMat.uniforms.uFlash.value = flash;
    compositeMat.uniforms.uMotion.value = fx.motion || 0;
    compositeMat.uniforms.uKick.value = fx.kick || 0;
    if (fx.flashColor) compositeMat.uniforms.uFlashColor.value.copy(fx.flashColor);
    quad.material = compositeMat;
    renderer.setRenderTarget(null);
    renderer.render(quadScene, quadCamera);
  }

  return { setSize, render, hdr };
}
