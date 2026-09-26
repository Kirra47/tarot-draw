// Three-coin (三钱) stage for the reading flow.
//
// This is the interactive half of the coin-3q-1 profile: it renders three aged
// bronze coins and reports the six tossed lines upward. It never decides what a
// line means — coin-cast.mjs owns that — and it never touches saved casts.
//
// The WebGL context is created lazily on first mount so pages that never open
// the coin stage pay nothing for it.
import * as THREE from 'three';

const TAU = Math.PI * 2;
const REST_Y = 0.11;
export const TOSS_MS = 2450;
export const LINE_NAMES = Object.freeze(['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']);
export const LINE_TYPES = Object.freeze({ 6: '老阴', 7: '少阳', 8: '少阴', 9: '老阳' });

// Counts follow the traditional three-coin reading: 字面 is worth 2, 背面 is
// worth 3, so one line totals 6, 7, 8 or 9.
export function facesTotal(faces) {
  return faces.reduce((sum, face) => sum + 2 + (face ? 1 : 0), 0);
}

export function randomFaces() {
  const values = crypto.getRandomValues(new Uint8Array(3));
  return Array.from(values, (value) => value & 1);
}

function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createCoinStage({ canvas, stage, prefersReducedMotion = () => false }) {
  let renderer = null;
  let scene = null;
  let camera = null;
  let coins = [];
  let shadows = [];
  let frame = 0;
  let resizeObserver = null;
  let lastFaces = [0, 1, 0];

  const restPositions = [
    new THREE.Vector3(-1.84, REST_Y, 0.2),
    new THREE.Vector3(0, REST_Y, -0.13),
    new THREE.Vector3(1.84, REST_Y, 0.14),
  ];
  const restAngles = [-0.22, 0.09, 0.23];

  function makeTextures(back) {
    const size = 1024;
    const color = document.createElement('canvas');
    color.width = color.height = size;
    const bump = document.createElement('canvas');
    bump.width = bump.height = size;
    const c = color.getContext('2d');
    const b = bump.getContext('2d');
    const rand = seededRandom(back ? 75331 : 18019);
    c.fillStyle = '#947b52';
    c.fillRect(0, 0, size, size);
    b.fillStyle = '#777777';
    b.fillRect(0, 0, size, size);
    for (let i = 0; i < 520; i += 1) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 12 + rand() * 67;
      const gradient = c.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, i % 4 === 0 ? 'rgba(37,72,57,.23)' : 'rgba(44,35,20,.16)');
      gradient.addColorStop(1, 'rgba(60,50,25,0)');
      c.fillStyle = gradient;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 75000; i += 1) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 0.2 + rand() * 1.4;
      c.fillStyle = rand() > 0.5 ? 'rgba(242,212,146,.13)' : 'rgba(15,25,19,.24)';
      c.fillRect(x, y, r, r);
      const level = Math.floor(83 + rand() * 86);
      b.fillStyle = `rgb(${level},${level},${level})`;
      b.fillRect(x, y, r, r);
    }
    c.lineWidth = 0.7;
    c.strokeStyle = 'rgba(229,205,163,.18)';
    for (let i = 0; i < 240; i += 1) {
      const a = rand() * TAU;
      const r = 130 + rand() * 355;
      const x = 512 + Math.cos(a) * r;
      const y = 512 + Math.sin(a) * r;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + rand() * 26 - 13, y + rand() * 22 - 11);
      c.stroke();
    }
    const ring = (r, w) => {
      for (const ctx of [c, b]) {
        ctx.beginPath();
        ctx.arc(512, 512, r, 0, TAU);
        ctx.lineWidth = w;
        ctx.strokeStyle = ctx === c ? '#b19969' : '#bcbcbc';
        ctx.stroke();
      }
    };
    ring(451, 5);
    ring(435, 2);
    ring(195, 3);
    for (const ctx of [c, b]) {
      ctx.lineWidth = 9;
      ctx.strokeStyle = ctx === c ? '#aa9265' : '#b8b8b8';
      ctx.strokeRect(367, 367, 290, 290);
    }
    if (!back) {
      const glyphs = [['乾', 512, 263], ['坤', 512, 778], ['通', 779, 520], ['寶', 248, 520]];
      for (const [glyph, x, y] of glyphs) {
        c.font = 'bold 154px "STKaiti", "KaiTi", "SimSun", serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.shadowColor = '#2e291d';
        c.shadowBlur = 3;
        c.shadowOffsetX = 3;
        c.shadowOffsetY = 4;
        c.fillStyle = '#b79b67';
        c.fillText(glyph, x, y);
        c.shadowBlur = 0;
        c.shadowOffsetX = 0;
        c.shadowOffsetY = 0;
        b.font = c.font;
        b.textAlign = 'center';
        b.textBaseline = 'middle';
        b.fillStyle = '#c2c2c2';
        b.fillText(glyph, x, y);
      }
    } else {
      for (const ctx of [c, b]) {
        ctx.strokeStyle = ctx === c ? '#aa9366' : '#bdbdbd';
        ctx.lineWidth = 11;
        ctx.lineCap = 'round';
        for (const s of [-1, 1]) {
          const x = 512 + s * 267;
          ctx.beginPath();
          ctx.moveTo(x, 356);
          ctx.bezierCurveTo(x - s * 43, 408, x + s * 34, 467, x, 520);
          ctx.bezierCurveTo(x - s * 30, 574, x + s * 36, 618, x, 671);
          ctx.stroke();
          for (let j = 0; j < 4; j += 1) {
            const y = 400 + j * 65;
            ctx.beginPath();
            ctx.moveTo(x - 29, y);
            ctx.lineTo(x + 28, y + 17);
            ctx.stroke();
          }
        }
        for (const y of [250, 775]) {
          ctx.beginPath();
          ctx.arc(512, y, 19, 0, TAU);
          ctx.stroke();
        }
      }
    }
    const map = new THREE.CanvasTexture(color);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    const bumpMap = new THREE.CanvasTexture(bump);
    bumpMap.anisotropy = map.anisotropy;
    return { map, bumpMap };
  }

  function buildCoin(geometry, materials, rimGeometry, rimMaterial) {
    const root = new THREE.Group();
    const body = new THREE.Group();
    body.rotation.x = -Math.PI / 2;
    root.add(body);
    const coin = new THREE.Mesh(geometry, materials);
    coin.castShadow = true;
    coin.receiveShadow = true;
    body.add(coin);
    for (const side of [-1, 1]) {
      const ring = new THREE.Mesh(rimGeometry, rimMaterial);
      ring.position.z = side * 0.08;
      ring.castShadow = true;
      body.add(ring);
      // The square hole keeps its own bevelled frame on both faces.
      const holeRim = new THREE.Shape();
      holeRim.moveTo(-0.223, -0.223);
      holeRim.lineTo(0.223, -0.223);
      holeRim.lineTo(0.223, 0.223);
      holeRim.lineTo(-0.223, 0.223);
      holeRim.closePath();
      const inner = new THREE.Path();
      inner.moveTo(-0.21, -0.21);
      inner.lineTo(-0.21, 0.21);
      inner.lineTo(0.21, 0.21);
      inner.lineTo(0.21, -0.21);
      inner.closePath();
      holeRim.holes.push(inner);
      const square = new THREE.Mesh(
        new THREE.ExtrudeGeometry(holeRim, { depth: 0.006, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.003, bevelSegments: 2, steps: 1 }),
        rimMaterial,
      );
      square.position.z = side * 0.077;
      if (side < 0) square.rotation.y = Math.PI;
      body.add(square);
    }
    scene.add(root);
    return root;
  }

  function init() {
    if (renderer) return true;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (error) {
      renderer = null;
      throw error;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
    camera.position.set(0, 7.5, 7.2);
    camera.lookAt(0, 0.35, 0);

    // Large soft studio reflections give the metal volume without glitter.
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0.16, 0.17, 0.15);
    for (const [position, scale, color] of [
      [[-4, 5, 2], [4, 5, 1], [3.3, 2.9, 2.2]],
      [[4, 3, -2], [2, 4, 1], [1.65, 1.85, 2.0]],
      [[0, 6, 0], [4, 4, 1], [2.1, 1.9, 1.55]],
      [[0, 1, 6], [6, 2, 1], [0.35, 0.36, 0.32]],
    ]) {
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(scale[0], scale[1]),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(color[0], color[1], color[2]), side: THREE.DoubleSide }),
      );
      panel.position.set(position[0], position[1], position[2]);
      panel.lookAt(0, 0, 0);
      envScene.add(panel);
    }
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(envScene, 0.07).texture;
    pmrem.dispose();

    scene.add(new THREE.HemisphereLight(0xdad8ca, 0x39362b, 1.0));
    const key = new THREE.DirectionalLight(0xffe7c1, 3.5);
    key.position.set(-3, 8, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.1, far: 20 });
    key.shadow.bias = -0.00035;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 4;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xc3d0d0, 1.45);
    fill.position.set(4, 4, -3);
    scene.add(fill);

    const frontTexture = makeTextures(false);
    const backTexture = makeTextures(true);
    const faceMaterials = [frontTexture, backTexture].map((texture) => new THREE.MeshPhysicalMaterial({
      map: texture.map, bumpMap: texture.bumpMap, bumpScale: 0.016, metalness: 0.72, roughness: 0.57,
      clearcoat: 0.06, clearcoatRoughness: 0.68, envMapIntensity: 0.72,
    }));
    const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0x625039, metalness: 0.78, roughness: 0.48, envMapIntensity: 0.75 });
    const rimMaterial = new THREE.MeshStandardMaterial({ color: 0x91764e, metalness: 0.82, roughness: 0.44, envMapIntensity: 0.76 });
    const coinShape = new THREE.Shape();
    coinShape.absarc(0, 0, 0.74, 0, TAU, false);
    const hole = new THREE.Path();
    hole.moveTo(-0.205, -0.205);
    hole.lineTo(-0.205, 0.205);
    hole.lineTo(0.205, 0.205);
    hole.lineTo(0.205, -0.205);
    hole.closePath();
    coinShape.holes.push(hole);
    const geometry = new THREE.ExtrudeGeometry(coinShape, { depth: 0.13, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.012, bevelThickness: 0.012, curveSegments: 96 });
    geometry.translate(0, 0, -0.065);
    geometry.clearGroups();
    const normals = geometry.attributes.normal;
    const positions = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    let previous = -1;
    let start = 0;
    for (let i = 0; i < positions.count; i += 3) {
      const z = normals.getZ(i);
      const material = z > 0.7 ? 0 : z < -0.7 ? 1 : 2;
      if (material !== previous) {
        if (previous !== -1) geometry.addGroup(start, i - start, previous);
        start = i;
        previous = material;
      }
      for (let j = 0; j < 3; j += 1) {
        uv.setXY(i + j, 0.5 + (material === 1 ? -1 : 1) * positions.getX(i + j) / 1.48, 0.5 + positions.getY(i + j) / 1.48);
      }
    }
    geometry.addGroup(start, positions.count - start, previous);
    uv.needsUpdate = true;
    const rimGeometry = new THREE.TorusGeometry(0.704, 0.013, 8, 128);
    coins = [0, 1, 2].map(() => buildCoin(geometry, faceMaterials.concat(edgeMaterial), rimGeometry, rimMaterial));

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.14 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.008;
    floor.receiveShadow = true;
    scene.add(floor);

    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = shadowCanvas.height = 128;
    const shadowContext = shadowCanvas.getContext('2d');
    const shadowGradient = shadowContext.createRadialGradient(64, 64, 0, 64, 64, 64);
    shadowGradient.addColorStop(0, 'rgba(0,0,0,.52)');
    shadowGradient.addColorStop(0.45, 'rgba(0,0,0,.2)');
    shadowGradient.addColorStop(1, 'rgba(0,0,0,0)');
    shadowContext.fillStyle = shadowGradient;
    shadowContext.fillRect(0, 0, 128, 128);
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    shadows = coins.map(() => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2.1, 2.1),
        new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: 0.42 }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.012;
      scene.add(mesh);
      return mesh;
    });

    if (!resizeObserver) {
      resizeObserver = new ResizeObserver(() => resize());
      resizeObserver.observe(stage);
    }
    return true;
  }

  function updateShadows() {
    coins.forEach((coin, i) => {
      const shadow = shadows[i];
      shadow.visible = coin.visible;
      shadow.position.x = coin.position.x;
      shadow.position.z = coin.position.z;
      const height = Math.max(0, coin.position.y - REST_Y);
      shadow.scale.setScalar(coin.scale.x * (1 + height * 0.3));
      shadow.material.opacity = Math.max(0.08, 0.46 - height * 0.3);
    });
  }

  function render() {
    if (!renderer) return;
    updateShadows();
    renderer.render(scene, camera);
  }

  function resize() {
    if (!renderer) return;
    const width = stage.clientWidth || 1;
    const height = stage.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width < 500 ? 34 : 31;
    const targetHeight = Math.max(4.4, 5.75 / camera.aspect);
    const distance = targetHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    camera.position.set(0, 0.62 * distance + 0.58, 0.78 * distance);
    camera.lookAt(0, 0.58, 0);
    camera.updateProjectionMatrix();
    render();
  }

  function showRest(faces = lastFaces) {
    lastFaces = [...faces];
    coins.forEach((coin, i) => {
      coin.visible = true;
      coin.position.copy(restPositions[i]);
      coin.rotation.set(faces[i] * Math.PI, restAngles[i], 0);
      coin.scale.setScalar(1);
    });
    render();
  }

  const easeOut = (u) => 1 - Math.pow(1 - u, 3);
  const mix = (a, b, u) => a + (b - a) * u;

  function animateToss(ms, fromFaces, toFaces) {
    const t = ms / 1000;
    coins.forEach((coin, i) => {
      coin.visible = true;
      coin.scale.setScalar(1);
      const fromX = fromFaces[i] * Math.PI;
      const targetX = toFaces[i] * Math.PI;
      const home = restPositions[i];
      if (t < 0.33) {
        const u = t / 0.33;
        coin.position.lerpVectors(home, new THREE.Vector3((i - 1) * 0.34, REST_Y + 0.02, 0.5), easeOut(u));
        coin.rotation.set(mix(fromX, TAU * 3 + fromX, u), restAngles[i] + Math.sin(u * Math.PI) * 0.5, mix(0, -0.3, u));
      } else if (t < 0.67) {
        const u = (t - 0.33) / 0.34;
        const packed = new THREE.Vector3((i - 1) * 0.34, REST_Y + 0.02, 0.5);
        coin.position.copy(packed);
        coin.position.y += Math.sin(u * Math.PI) * 1.5;
        coin.position.z += Math.sin(u * Math.PI) * (i - 1) * 0.22;
        coin.rotation.set(fromX + TAU * 3 * (1 + u), restAngles[i] + u * 2.4, -0.3 + u * 0.3);
      } else {
        const u = (t - 0.67 - i * 0.035) / (1.02 + i * 0.04);
        if (u < 1) {
          const flight = Math.max(0, u);
          const packed = new THREE.Vector3((i - 1) * 0.34, REST_Y + 0.02, 0.5);
          coin.position.lerpVectors(packed, home, flight);
          coin.position.y += 4 * (1.62 + i * 0.11) * flight * (1 - flight);
          coin.position.z += Math.sin(flight * Math.PI) * (i - 1) * 0.12;
          coin.rotation.set(mix(fromX, TAU * 2 + targetX, flight), restAngles[i] + TAU * flight, Math.sin(flight * Math.PI) * (i === 1 ? -0.48 : 0.35));
        } else {
          const after = t - (0.67 + i * 0.035 + 1.02 + i * 0.04);
          const decay = Math.exp(-after * 8);
          coin.position.copy(home);
          coin.position.y += Math.abs(Math.sin(after * 19)) * 0.22 * decay;
          coin.rotation.set(targetX + Math.sin(after * 24) * 0.24 * decay, restAngles[i] + Math.sin(after * 15) * 0.06 * decay, Math.sin(after * 21) * 0.19 * decay);
          if (t >= 2.4) {
            coin.position.copy(home);
            coin.rotation.set(targetX, restAngles[i], 0);
          }
        }
      }
    });
  }

  // Plays one toss. onFrame receives the elapsed milliseconds so the caller can
  // keep its own status copy in step; onDone runs once the coins have settled.
  function playToss({ fromFaces, toFaces, onFrame, onDone }) {
    if (!init()) return false;
    if (prefersReducedMotion()) {
      showRest(toFaces);
      if (onFrame) onFrame(TOSS_MS);
      if (onDone) onDone();
      return true;
    }
    cancelAnimationFrame(frame);
    const started = performance.now();
    const step = (now) => {
      const elapsed = now - started;
      animateToss(elapsed, fromFaces, toFaces);
      render();
      if (onFrame) onFrame(elapsed);
      if (elapsed < TOSS_MS) {
        frame = requestAnimationFrame(step);
        return;
      }
      showRest(toFaces);
      if (onDone) onDone();
    };
    frame = requestAnimationFrame(step);
    return true;
  }

  // Deterministic frame for screenshots and checks.
  function seek(ms, fromFaces = [0, 1, 0], toFaces = [1, 0, 1]) {
    if (!init()) return;
    if (ms < 350) showRest(fromFaces);
    else if (ms < 350 + TOSS_MS) {
      animateToss(ms - 350, fromFaces, toFaces);
      render();
    } else showRest(toFaces);
  }

  function dispose() {
    cancelAnimationFrame(frame);
    if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
    if (renderer) { renderer.dispose(); renderer = null; }
  }

  // Stage-space anchors for the 字面/背面 labels that sit under each coin.
  function labelAnchors() {
    if (!camera) return [];
    const width = stage.clientWidth || 1;
    const height = stage.clientHeight || 1;
    return coins.map((coin) => {
      const point = coin.position.clone().project(camera);
      return { x: (point.x * 0.5 + 0.5) * width, y: (point.y * -0.5 + 0.5) * height };
    });
  }

  return {
    init,
    resize,
    render,
    showRest,
    playToss,
    seek,
    dispose,
    labelAnchors,
    isReady: () => Boolean(renderer),
    coinPositions: () => coins.map((coin) => coin.position.toArray()),
  };
}
