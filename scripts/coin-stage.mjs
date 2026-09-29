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
/* One toss, start to settled. Built from the per-coin profile below rather than
   picked by eye: the last coin starts at 80ms and needs 1120ms of flight and
   settle, plus 120ms of final quiet. Kept under 2.4s so the rhythm stays crisp. */
export const TOSS_MS = 2000;
export const PREPARE_MS = 150;
export const LINE_NAMES = Object.freeze(['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']);
export const LINE_TYPES = Object.freeze({ 6: '老阴', 7: '少阳', 8: '少阴', 9: '老阳' });

/* The state machine. Everything the caller shows in the status line reads off
   this, so the copy cannot drift from what the coins are actually doing. */
export const COIN_STATES = Object.freeze([
  'idle', 'preparing', 'tossing', 'falling', 'settling', 'revealed', 'resetting', 'completed',
]);

/* Per-coin motion. The point is that no two coins read as copies of each other:
   different apex, different spin, different direction, different time in the air.
   `turns` is whole revolutions of the flip; because the coin is 2π-symmetric the
   final orientation still lands exactly on the result — 0 for 字面, π for 背面 —
   however many turns it took to get there.
   The start offsets are 0/40/80ms as specified, and the flight times are tuned so
   the LANDINGS separate by 150ms and 180ms, inside the requested 100–180ms band.
   Peaks are capped by the camera: a coin of radius 1 whose centre passes 2.35 is
   clipped by the top of the frame. Measured, not guessed — the first pass used
   2.40 and the middle coin left the picture. */
const COIN_PROFILES = [
  { start: 0, rise: 430, hold: 70, fall: 350, turns: 5, dir: 1, spinY: 110, spinZ: -18,
    peak: 1.78, driftX: 0.34, driftZ: 0.36, bounce: 0.30, bounces: 2, settle: 430 },
  { start: 40, rise: 450, hold: 80, fall: 430, turns: 6, dir: -1, spinY: -80, spinZ: 22,
    peak: 2.12, driftX: -0.10, driftZ: 0.0, bounce: 0.38, bounces: 2, settle: 450 },
  { start: 80, rise: 470, hold: 60, fall: 570, turns: 4, dir: 1, spinY: 60, spinZ: -10,
    peak: 1.52, driftX: -0.36, driftZ: -0.34, bounce: 0.26, bounces: 3, settle: 470 },
];

/* Landing moments, derived once so the state machine and the sound hook agree.
   The 150ms crouch happens before anyone leaves the table, so it is part of the
   offset. Resulting landings: 1000 / 1150 / 1330ms — gaps of 150 and 180. */
const FLIGHT_START = COIN_PROFILES.map((p) => PREPARE_MS + p.start);
const LAND_MS = COIN_PROFILES.map((p, i) => FLIGHT_START[i] + p.rise + p.hold + p.fall);
const SETTLE_DONE_MS = LAND_MS.map((land, i) => land + COIN_PROFILES[i].settle);

/* Phase boundaries for the state machine, read off the profiles rather than
   guessed, so the status line changes when the coins actually change behaviour:
     preparing  0   → 150   the crouch
     tossing    150 → 650   first coin leaves, through the last apex
     falling    650 → 1330  first descent, through the last landing
     settling   1330 → 2000 the bounces die out
     revealed   2000        coins are still, result is on the table
   That is 150 / 500 / 680 / 670 / 200ms, against the brief's 150 / 450 /
   700-1000 / 450-650 / 200. */
const FIRST_FALL_MS = FLIGHT_START[0] + COIN_PROFILES[0].rise + COIN_PROFILES[0].hold;
const LAST_LAND_MS = LAND_MS[LAND_MS.length - 1];

// Counts follow the traditional three-coin reading: 字面 is worth 2, 背面 is
// worth 3, so one line totals 6, 7, 8 or 9.
export function facesTotal(faces) {
  return faces.reduce((sum, face) => sum + 2 + (face ? 1 : 0), 0);
}

export function randomFaces() {
  const values = crypto.getRandomValues(new Uint8Array(3));
  return Array.from(values, (value) => value & 1);
}

/* The single source of truth for one toss.
   Called BEFORE the animation starts, so the coins are thrown at a result that
   already exists rather than the result being read off wherever they happen to
   stop. `faces` keeps the 0/1 shape the rest of the project already speaks
   (0 = 字面, 1 = 背面); `coins` is the readable form the UI wants. */
export function generateCoinResult() {
  const faces = randomFaces();
  const total = facesTotal(faces);
  return {
    coins: faces.map((face) => (face ? 'back' : 'front')),
    faces,
    total,
    lineType: LINE_TYPES[total],
    moving: total === 6 || total === 9,
  };
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
    /* Base tone. This was #947b52, a dull olive-brown: brass is a warm yellow
       metal and at metalness 0.86 the map colour is the metal's reflectance, so a
       desaturated base reads as dull plastic rather than old brass. */
    c.fillStyle = '#9d7b33';
    c.fillRect(0, 0, size, size);
    b.fillStyle = '#777777';
    b.fillRect(0, 0, size, size);
    /* Patina. The first pass used 520 blobs of radius 12-79, and at coin size
       they blended into one soft mottle that read as blur, not as oxidation. More
       and smaller patches at higher contrast give the surface a grain instead of
       a wash — this is the difference between "old metal" and "out of focus". */
    for (let i = 0; i < 1400; i += 1) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 5 + rand() * 26;
      const gradient = c.createRadialGradient(x, y, 0, x, y, r);
      const verdigris = i % 3 === 0;
      gradient.addColorStop(0, verdigris ? 'rgba(52,104,80,.5)' : 'rgba(38,27,11,.44)');
      gradient.addColorStop(0.62, verdigris ? 'rgba(46,88,68,.2)' : 'rgba(44,32,14,.18)');
      gradient.addColorStop(1, 'rgba(60,50,25,0)');
      c.fillStyle = gradient;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 90000; i += 1) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 0.2 + rand() * 1.2;
      c.fillStyle = rand() > 0.5 ? 'rgba(255,235,180,.26)' : 'rgba(18,28,20,.42)';
      c.fillRect(x, y, r, r);
      const level = Math.floor(70 + rand() * 112);
      b.fillStyle = `rgb(${level},${level},${level})`;
      b.fillRect(x, y, r, r);
    }
    /* Fine scratches. 240 at 0.8px over a 1024 texture is below what survives
       the coin's on-screen size, so they never showed at all. More, longer and
       brighter so a few of them actually catch the light. */
    for (const pass of [{ n: 420, w: 0.9, a: 0.34 }, { n: 90, w: 1.6, a: 0.22 }]) {
      c.lineWidth = pass.w;
      c.strokeStyle = `rgba(255,238,192,${pass.a})`;
      for (let i = 0; i < pass.n; i += 1) {
        const a = rand() * TAU;
        const r = 150 + rand() * 340;
        const x = 512 + Math.cos(a) * r;
        const y = 512 + Math.sin(a) * r;
        const len = 18 + rand() * 54;
        const ang = rand() * TAU;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
        c.stroke();
      }
    }
    const ring = (r, w) => {
      for (const ctx of [c, b]) {
        ctx.beginPath();
        ctx.arc(512, 512, r, 0, TAU);
        ctx.lineWidth = w;
        ctx.strokeStyle = ctx === c ? '#d5b877' : '#cfcfcf';
        ctx.stroke();
      }
    };
    ring(451, 5);
    ring(435, 2);
    ring(195, 3);
    for (const ctx of [c, b]) {
      ctx.lineWidth = 9;
      ctx.strokeStyle = ctx === c ? '#c9ab6b' : '#c4c4c4';
      ctx.strokeRect(367, 367, 290, 290);
    }
    if (!back) {
      const glyphs = [['乾', 512, 263], ['坤', 512, 778], ['通', 779, 520], ['寶', 248, 520]];
      for (const [glyph, x, y] of glyphs) {
        c.font = 'bold 154px "STKaiti", "KaiTi", "SimSun", serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        /* Cast characters stand proud of the field and wear bright, while the
           field around them stays oxidised. The glyph was #b79b67 on a #947b52
           field: about 1.5:1, which is why the inscription could not be read at
           all. Bright metal on an oxidised field is also what the real object
           does, so this is a correction rather than a stylistic choice. */
        c.shadowColor = '#2b2312';
        c.shadowBlur = 4;
        c.shadowOffsetX = 3;
        c.shadowOffsetY = 4;
        c.fillStyle = '#f0d79b';
        c.fillText(glyph, x, y);
        c.shadowBlur = 0;
        c.shadowOffsetX = 0;
        c.shadowOffsetY = 0;
        b.font = c.font;
        b.textAlign = 'center';
        b.textBaseline = 'middle';
        // Raised in the bump map too, so the relief catches the light on its own.
        b.fillStyle = '#f4f4f4';
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
      /* bumpScale was 0.016, which flattened every bit of relief the texture
         carries — the casting, the rings, the square frame, all of it. That is
         the single line that made three engraved coins look like blank discs.
         metalness stays in "high but not a mirror" territory and roughness stays
         inside the 0.45-0.65 band the brief asked for; the lift comes from the
         relief and the reflection, not from making it glossy. */
      map: texture.map, bumpMap: texture.bumpMap, bumpScale: 0.06, metalness: 0.88, roughness: 0.5,
      clearcoat: 0.05, clearcoatRoughness: 0.7, envMapIntensity: 1.0,
    }));
    // Edge slightly darker than the faces, as asked: the struck surface is the
    // part that gets handled and polished, the rim stays oxidised.
    const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0x6d5734, metalness: 0.8, roughness: 0.55, envMapIntensity: 0.8 });
    const rimMaterial = new THREE.MeshStandardMaterial({ color: 0xa98c52, metalness: 0.86, roughness: 0.46, envMapIntensity: 0.9 });
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
    /* The framing has to hold the whole toss, not just the coins at rest. A coin
       of radius 1 at peak sits 1 unit above its centre, so the top of the frame
       must clear rest + peak + 1 ≈ 3.3 units or the coin leaves the picture —
       which is exactly what happened at 2.40 peak on the first pass. Raise the
       target and the look-at together so the extra room goes upward, not evenly. */
    const targetHeight = Math.max(5.0, 6.1 / camera.aspect);
    const distance = targetHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    camera.position.set(0, 0.72 * distance + 0.82, 0.78 * distance);
    camera.lookAt(0, 0.82, 0);
    camera.updateProjectionMatrix();
    render();
  }

  // ── state ────────────────────────────────────────────────────────────────
  let state = 'idle';
  let stateHandler = null;
  let landHandler = null;
  const landed = [false, false, false];

  function setState(next) {
    if (state === next) return;
    state = next;
    if (stateHandler) stateHandler(state);
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

  // ── easing / shaping ─────────────────────────────────────────────────────
  const easeOut = (u) => 1 - Math.pow(1 - u, 3);
  const clamp01 = (u) => (u < 0 ? 0 : u > 1 ? 1 : u);
  const mix = (a, b, u) => a + (b - a) * u;
  // 0 at both ends, 1 in the middle — used for anything that should leave and return.
  const arc = (u) => Math.sin(clamp01(u) * Math.PI);

  /* Flight progress of the FLIP, normalised to 0..1 across the whole flight.
     Its slope is deliberately the same shape as the vertical speed: fastest
     leaving the hand, zero at the apex, fastest again on impact. That is why a
     tossed coin appears to hang and stop turning at the top — and it means the
     rotation is a consequence of the arc instead of an independent spin. */
  function flipProgress(t, p) {
    const { rise, hold, fall } = p;
    if (t < rise) {
      const u = t / rise;
      return (2 * u - u * u) / 2;
    }
    if (t < rise + hold) return 0.5;
    const u = clamp01((t - rise - hold) / fall);
    return 0.5 + (u * u) / 2;
  }

  // Height above the table, split into the two halves of one parabola.
  function heightAt(t, p) {
    const { rise, hold, fall, peak } = p;
    if (t < rise) {
      const u = t / rise;
      return peak * (1 - (1 - u) * (1 - u));
    }
    if (t < rise + hold) return peak;
    const u = clamp01((t - rise - hold) / fall);
    return peak * (1 - u * u);
  }

  // ── per-coin placement ───────────────────────────────────────────────────
  function placeCoin(i, ms, fromFaces, toFaces) {
    const coin = coins[i];
    const p = COIN_PROFILES[i];
    const home = restPositions[i];
    const fromX = fromFaces[i] * Math.PI;
    const finalX = toFaces[i] * Math.PI + p.dir * TAU * p.turns;
    const crouchX = home.x - home.x * 0.16;
    const crouchZ = home.z * 0.72;
    const t = ms - FLIGHT_START[i];

    coin.visible = true;

    // still on the table: the 150ms crouch, then waiting its own turn to leave
    if (t < 0) {
      const u = easeOut(clamp01(ms / PREPARE_MS));
      const settled = ms >= PREPARE_MS ? 1 : u;
      coin.position.set(mix(home.x, crouchX, settled), REST_Y - 0.045 * settled, mix(home.z, crouchZ, settled));
      coin.rotation.set(fromX, restAngles[i], 0);
      coin.scale.setScalar(1 - 0.05 * settled);
      return;
    }

    const landing = p.rise + p.hold + p.fall;
    if (t < landing) {
      const f = flipProgress(t, p);
      const h = heightAt(t, p);
      // outward drift is an arc so the coins separate in the air and come back
      const out = arc(t / landing);
      coin.position.set(
        crouchX + (home.x + p.driftX - crouchX) * out,
        REST_Y - 0.045 + h,
        crouchZ + (home.z + p.driftZ - crouchZ) * out,
      );
      coin.rotation.set(
        mix(fromX, finalX, f),
        restAngles[i] + THREE.MathUtils.degToRad(p.spinY) * f,
        THREE.MathUtils.degToRad(p.spinZ) * arc(f),
      );
      coin.scale.setScalar(1);
      return;
    }

    // ── landed: a restrained bounce, then a wobble that dies out ──
    const after = (t - landing) / 1000;
    const decay = Math.exp(-after * 6.5);
    const omega = (Math.PI * p.bounces) / (p.settle / 1000);
    coin.position.set(
      home.x + Math.sin(after * 6) * 0.02 * decay,
      REST_Y + p.bounce * Math.abs(Math.sin(after * omega)) * decay,
      home.z + Math.cos(after * 5) * 0.02 * decay,
    );
    coin.rotation.set(
      finalX + Math.sin(after * 20) * 0.22 * decay,
      restAngles[i] + Math.sin(after * 14) * 0.05 * decay,
      Math.sin(after * 17) * 0.16 * decay,
    );
    coin.scale.setScalar(1);

    if (t >= landing + p.settle) {
      // Exactly the result, not approximately: 0 for 字面, π for 背面.
      coin.position.copy(home);
      coin.rotation.set(toFaces[i] * Math.PI, restAngles[i], 0);
    }
  }

  function animateToss(ms, fromFaces, toFaces) {
    for (let i = 0; i < coins.length; i += 1) placeCoin(i, ms, fromFaces, toFaces);
  }

  // ── playback ─────────────────────────────────────────────────────────────
  /* Plays one toss. `toFaces` is the RESULT and is already known before the
     first frame — the animation is bent to land on it, never the other way
     round. Landings fire onLand per coin at their own moment, which is where a
     collision sound belongs; the project has no audio system yet, so this is the
     hook and nothing more. */
  function playToss({ fromFaces, toFaces, onFrame, onDone, onState, onLand }) {
    stateHandler = onState || stateHandler;
    landHandler = onLand || landHandler;
    if (!init()) {
      showRest(toFaces);
      setState('completed');
      if (onDone) onDone();
      return false;
    }
    if (prefersReducedMotion()) {
      // Keep the honesty of the result, drop the travel.
      showRest(toFaces);
      setState('preparing');
      setState('completed');
      if (onFrame) onFrame(TOSS_MS);
      if (onDone) onDone();
      return true;
    }
    cancelAnimationFrame(frame);
    landed[0] = landed[1] = landed[2] = false;
    const started = performance.now();
    setState('preparing');

    const step = (now) => {
      const elapsed = now - started;
      animateToss(elapsed, fromFaces, toFaces);
      render();
      if (onFrame) onFrame(elapsed);

      if (elapsed >= PREPARE_MS) {
        if (elapsed < FIRST_FALL_MS) setState('tossing');
        else if (elapsed < LAST_LAND_MS) setState('falling');
        else setState('settling');
      }
      for (let i = 0; i < 3; i += 1) {
        if (!landed[i] && elapsed >= LAND_MS[i]) {
          landed[i] = true;
          if (landHandler) landHandler({ coin: i, at: LAND_MS[i], face: toFaces[i] ? 'back' : 'front' });
        }
      }

      if (elapsed < TOSS_MS) {
        frame = requestAnimationFrame(step);
        return;
      }
      showRest(toFaces);
      setState('revealed');
      if (onDone) onDone();
    };
    frame = requestAnimationFrame(step);
    return true;
  }

  // Deterministic frame for screenshots and checks.
  function seek(ms, fromFaces = [0, 1, 0], toFaces = [1, 0, 1]) {
    if (!init()) return;
    if (ms < PREPARE_MS) showRest(fromFaces);
    else if (ms < TOSS_MS) {
      animateToss(ms, fromFaces, toFaces);
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
    /* Diagnostic: the resting rotation must equal the result — 0 for 字面,
       π (mod 2π) for 背面. verify-coin-toss.cjs reads this to prove the visual
       and the logic agree, rather than trusting that they do. */
    coinRotations: () => coins.map((coin) => [coin.rotation.x, coin.rotation.y, coin.rotation.z]),
    /* Diagnostic: is each coin fully inside the frame right now? A coin is a disc
       of radius 1, so its extremes are centre ± 1 on Y. If either projects outside
       ±1 in NDC the coin is being cut by the edge of the arena — which is how the
       first peak value was caught leaving the top of the picture. */
    clipCheck: () => {
      if (!camera) return [];
      return coins.map((coin) => {
        const top = new THREE.Vector3(coin.position.x, coin.position.y + 1, coin.position.z).project(camera);
        const bottom = new THREE.Vector3(coin.position.x, coin.position.y - 1, coin.position.z).project(camera);
        return {
          topY: Number(top.y.toFixed(3)),
          bottomY: Number(bottom.y.toFixed(3)),
          x: Number(top.x.toFixed(3)),
          inside: Math.abs(top.y) <= 1 && Math.abs(bottom.y) <= 1 && Math.abs(top.x) <= 1,
        };
      });
    },
    /* State surface. The caller drives its status line and its label reveal off
       this rather than off frame counts, so copy cannot drift from the coins. */
    state: () => state,
    setStateHandler: (fn) => { stateHandler = fn; },
    /* Hook for the collision sound. The project has no audio system yet; when it
       gets one, assign here and it will be called once per coin, on its own
       landing frame, with { coin, at, face }. */
    setLandHandler: (fn) => { landHandler = fn; },
    /* Landing times in ms from the start of the toss — exposed so a caller can
       schedule anything else it needs without guessing at magic numbers. */
    landTimes: () => [...LAND_MS],
    profile: () => COIN_PROFILES.map((p) => ({ ...p })),
  };
}
