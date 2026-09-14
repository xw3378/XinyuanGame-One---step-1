// ============================================================
// 3D VIEW  (brief.md section 6: first-person, 3D, realistic,
// "bright and cool: grey stone walls, muted shadows, highlighted
// climbing holds")
// ============================================================
// The wall and every hold live inside a TILTED group. A steep route
// literally leans out over the climber. The camera does NOT live inside
// that group, so "up" stays aligned with gravity - which is exactly how
// an overhang feels when you are hanging under it.
// ============================================================

import * as THREE from 'three';
import { BODY, WALL_HEIGHT, WALL_WIDTH } from './presets.js';

const HOLD_COLORS = [0xe8734a, 0x3f8fd0, 0x62b356, 0xd9b13f, 0xc05097, 0x4bb6ac];

function concreteTexture() {
  // Procedural, so the repository needs no binary texture assets.
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#9aa0a3';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 5200; i++) {
    const v = 118 + Math.random() * 78;
    ctx.fillStyle = `rgba(${v},${v + 3},${v + 6},${0.05 + Math.random() * 0.16})`;
    const r = Math.random() * 4.5;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 90; i++) {
    ctx.strokeStyle = `rgba(90,94,98,${0.05 + Math.random() * 0.1})`;
    ctx.lineWidth = 0.6 + Math.random() * 1.4;
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, Math.random() * size);
    ctx.lineTo(Math.random() * size, Math.random() * size);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 8);
  return tex;
}

export function createView(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdfe6ea);
  scene.fog = new THREE.Fog(0xdfe6ea, 16, 46);

  const camera = new THREE.PerspectiveCamera(74, 1, 0.05, 220);

  // Lighting: bright and cool, muted shadows.
  const hemi = new THREE.HemisphereLight(0xdff0ff, 0x6b6f72, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff6e8, 1.25);
  sun.position.set(4.5, 14, 7.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -9;
  sun.shadow.camera.right = 9;
  sun.shadow.camera.top = 16;
  sun.shadow.camera.bottom = -2;
  sun.shadow.camera.far = 40;
  sun.shadow.radius = 3;
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.22));

  // Ground stays in world space so gravity reads clearly against the tilt.
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x8f959a, roughness: 0.95 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  scene.add(ground);

  const wallGroup = new THREE.Group();
  scene.add(wallGroup);

  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(WALL_WIDTH, WALL_HEIGHT + 3),
    new THREE.MeshStandardMaterial({ map: concreteTexture(), roughness: 0.92, metalness: 0.02 })
  );
  wall.position.y = (WALL_HEIGHT + 3) / 2 - 1.2;
  wall.receiveShadow = true;
  wallGroup.add(wall);

  const pickables = [];
  const holdMeshes = new Map();
  const limbMeshes = {};
  let highlighted = null;
  const tmp = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();

  function clearRoute() {
    for (const child of [...wallGroup.children]) {
      if (child === wall) continue;
      wallGroup.remove(child);
      child.geometry?.dispose?.();
      child.material?.dispose?.();
    }
    pickables.length = 0;
    holdMeshes.clear();
    highlighted = null;
  }

  function loadRoute(holds, preset) {
    clearRoute();
    wallGroup.rotation.x = THREE.MathUtils.degToRad(preset.angleDeg);

    for (const hold of holds) {
      const r = 0.052 + 0.044 * hold.size;
      const color = HOLD_COLORS[hold.id % HOLD_COLORS.length];
      const mat = new THREE.MeshStandardMaterial({
        color,
        // The ONLY friction hint, and it is deliberately subtle: a polished
        // hold catches a specular highlight. The number is never shown.
        roughness: hold.polished ? 0.28 : 0.86,
        metalness: hold.polished ? 0.16 : 0.02,
        emissive: new THREE.Color(hold.summit ? 0x2a5c1f : 0x000000),
        emissiveIntensity: hold.summit ? 0.55 : 0,
      });

      const geo = new THREE.SphereGeometry(1, 20, 14);
      const mesh = new THREE.Mesh(geo, mat);
      if (hold.kind === 'hand') {
        mesh.scale.set(r * 1.15, r, r * 1.35);
        mesh.position.set(hold.x, hold.y, r * 0.55);
      } else {
        mesh.scale.set(r * 1.5, r * 0.5, r * 1.05);
        mesh.position.set(hold.x, hold.y, r * 0.4);
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.holdId = hold.id;
      wallGroup.add(mesh);
      pickables.push(mesh);
      holdMeshes.set(hold.id, mesh);
    }

    // The climber's own limbs, visible in first person.
    if (!limbMeshes.LH) {
      const skin = new THREE.MeshStandardMaterial({ color: 0xd9a884, roughness: 0.72 });
      const shoe = new THREE.MeshStandardMaterial({ color: 0x2f3540, roughness: 0.6 });
      limbMeshes.LH = new THREE.Mesh(new THREE.SphereGeometry(0.062, 16, 12), skin);
      limbMeshes.RH = new THREE.Mesh(new THREE.SphereGeometry(0.062, 16, 12), skin);
      limbMeshes.LF = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.05, 0.15), shoe);
      limbMeshes.RF = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.05, 0.15), shoe);
      for (const mesh of Object.values(limbMeshes)) {
        mesh.visible = false;
        scene.add(mesh); // kept in world space, positioned each frame
      }
    }
  }

  function setAim(holdId) {
    if (highlighted && highlighted !== holdId) {
      const prev = holdMeshes.get(highlighted);
      if (prev) prev.scale.multiplyScalar(1 / 1.22);
    }
    highlighted = holdId;
    if (holdId != null) {
      const mesh = holdMeshes.get(holdId);
      if (mesh) mesh.scale.multiplyScalar(1.22);
    }
  }

  // Place the camera from the climber's body centre, but keep world-up.
  function updateCamera(centre, hip, look, tremble = 0) {
    if (!centre) return;
    const localX = centre.x;
    const localY = centre.y + BODY.HEAD_UP;
    const localZ = 0.62 + hip * 0.4;

    tmp.set(localX + (Math.random() - 0.5) * tremble * 0.06,
            localY + (Math.random() - 0.5) * tremble * 0.06,
            localZ);
    wallGroup.localToWorld(tmp);
    camera.position.copy(tmp);

    lookTarget.set(localX, localY, localZ - 1.0);
    wallGroup.localToWorld(lookTarget);
    camera.up.set(0, 1, 0);
    camera.lookAt(lookTarget);
    camera.rotateY(look.yaw);
    camera.rotateX(look.pitch);
  }

  function syncLimbs(climber, holdMap, signature = 0) {
    const time = performance.now() * 0.02;
    for (const key of ['LH', 'RH', 'LF', 'RF']) {
      const mesh = limbMeshes[key];
      const hold = holdMap[climber.holds[key]];
      if (!hold) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      // A limb about to fail trembles before it lets go.
      const jitter = signature > 0 ? Math.sin(time + key.charCodeAt(0)) * 0.012 * signature : 0;
      const outward = hold.kind === 'hand' ? 0.1 : 0.075;
      tmp.set(hold.x + jitter, hold.y + jitter, outward + (hold.kind === 'hand' ? 0.03 : 0.05));
      wallGroup.localToWorld(tmp);
      mesh.position.copy(tmp);
      mesh.rotation.copy(wallGroup.rotation);
    }
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  return {
    renderer,
    scene,
    camera,
    pickables,
    holdMeshes,
    loadRoute,
    setAim,
    updateCamera,
    syncLimbs,
    resize,
    render: () => renderer.render(scene, camera),
  };
}
