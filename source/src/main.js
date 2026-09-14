// ============================================================
// GAME LOOP
// ============================================================
// observe -> judge -> act -> feedback -> adjust   (brief.md section 3)
//
// observe : the first-person view plus raycast aim readout
// judge   : stepSimulation() reports reach, grip risk, balance, energy
// act     : tryMoveLimb(), lean/hip intent, resting
// feedback: trembling limbs, heavy breathing, creaks, swaying camera, HUD
// adjust  : the player changes plan based on what just happened
// ============================================================

import * as THREE from 'three';
import { PRESETS, PRESET_ORDER, WALL_HEIGHT } from './presets.js';
import { buildWall } from './holds.js';
import { createClimber, attachStartingHolds, tryMoveLimb, updateIntent, release } from './climber.js';
import { stepSimulation, ENERGY_MAX } from './simulate.js';
import { createView } from './scene.js';
import { createAudio } from './feedback.js';
import { createHud } from './hud.js';
// Styles are linked from each HTML page so all three pages share one sheet.

const LIMB_KEYS = { KeyQ: 'LH', KeyE: 'RH', KeyZ: 'LF', KeyC: 'RF' };
const YAW_RANGE = 1.35;
const PITCH_RANGE = 1.0;

const canvas = document.getElementById('scene');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayBody = document.getElementById('overlay-body');
const crosshair = document.getElementById('crosshair');

const view = createView(canvas);
const audio = createAudio();
const hud = createHud();
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();

let preset = PRESETS.gentle;
let holds = [];
let holdMap = {};
let summitId = null;
let climber = createClimber();

let state = 'playing'; // 'playing' | 'won' | 'lost'
let timeLeft = preset.timeLimit;
let look = { yaw: 0, pitch: 0 };
let targetLook = { yaw: 0, pitch: 0 };
let aimedHoldId = null;
let slipTimers = { LH: 0, RH: 0, LF: 0, RF: 0 };
let elapsed = 0;

const intent = {
  leanLeft: false,
  leanRight: false,
  hipIn: false,
  hipOut: false,
  rest: false,
};

const sizeWord = (s) => (s > 1.15 ? 'large' : s > 0.85 ? 'medium' : 'small');

// ---------------------------------------------------------------- levels
function loadLevel(key) {
  preset = PRESETS[key];
  const built = buildWall(key);
  holds = built.holds;
  holdMap = {};
  for (const h of holds) holdMap[h.id] = h;
  summitId = built.summitId;

  climber = createClimber();
  attachStartingHolds(climber, holds);

  view.loadRoute(holds, preset);
  hud.setLevel(preset);

  timeLeft = preset.timeLimit;
  slipTimers = { LH: 0, RH: 0, LF: 0, RF: 0 };
  look = { yaw: 0, pitch: 0 };
  targetLook = { yaw: 0, pitch: 0 };
  aimedHoldId = null;
  state = 'playing';
  elapsed = 0;

  hideOverlay();
  for (const key of Object.keys(intent)) intent[key] = false;

  document.querySelectorAll('[data-level]').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.level === key);
  });
}

function showOverlay(title, body, tone) {
  if (!overlay) return;
  overlayTitle.textContent = title;
  overlayBody.innerHTML = body;
  overlay.dataset.tone = tone;
  overlay.classList.add('is-visible');
}
function hideOverlay() {
  overlay?.classList.remove('is-visible');
}

// ---------------------------------------------------------------- aiming
function updatePointerFromMouse(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const nx = (clientX - rect.left) / rect.width;
  const ny = (clientY - rect.top) / rect.height;
  pointerNdc.set(nx * 2 - 1, -(ny * 2 - 1));
  targetLook.yaw = -nx * 2 * YAW_RANGE * 0.5 - (nx - 0.5) * 0;
  targetLook.yaw = -(nx - 0.5) * YAW_RANGE * 2;
  targetLook.pitch = -(ny - 0.5) * PITCH_RANGE * 2;
  targetLook.pitch = Math.max(-PITCH_RANGE, Math.min(PITCH_RANGE, targetLook.pitch));
  targetLook.yaw = Math.max(-YAW_RANGE, Math.min(YAW_RANGE, targetLook.yaw));
  if (crosshair) {
    crosshair.style.left = `${clientX}px`;
    crosshair.style.top = `${clientY}px`;
  }
}

function pickAimedHold() {
  raycaster.setFromCamera(pointerNdc, view.camera);
  const hits = raycaster.intersectObjects(view.pickables, false);
  return hits.length ? hits[0].object.userData.holdId : null;
}

// ---------------------------------------------------------------- acting
function attemptMove(limb) {
  if (state !== 'playing') return;
  const target = aimedHoldId ? holdMap[aimedHoldId] : null;
  if (!target) {
    hud.toast('Aim at a hold first', 'warn');
    return;
  }
  const result = tryMoveLimb(climber, holdMap, preset, limb, target);
  if (result.ok) {
    climber.energy = Math.max(0, climber.energy - result.cost);
    audio.thunk(target.kind === 'hand' ? 1 : 0.72);
    const kindWord = target.kind === 'hand' ? 'hand' : 'foot';
    hud.toast(`${kindWord === 'hand' ? 'Hand' : 'Foot'} placed`, 'good');
  } else if (result.reason === 'type') {
    hud.toast(
      target.kind === 'foot' ? 'That is a foothold — use Z / C' : 'That is a handhold — use Q / E',
      'warn'
    );
  } else if (result.reason === 'out-of-reach') {
    // Misjudging reach is the lesson, but it costs effort rather than the run.
    climber.energy = Math.max(0, climber.energy - 1.4);
    hud.toast('Out of reach — reposition your feet or hips first', 'warn');
  } else if (result.reason === 'airborne') {
    hud.toast('Nothing to push from', 'warn');
  }
}

// ---------------------------------------------------------------- outcome
function endRun(kind, title, body, tone) {
  if (state !== 'playing') return;
  state = kind;
  showOverlay(title, body, tone);
}

function handleContactFailure(results, dt) {
  for (const limb of ['LH', 'RH', 'LF', 'RF']) {
    const hold = results.contacts[limb];
    if (!hold) {
      slipTimers[limb] = 0;
      continue;
    }
    if (results.slipping[limb]) {
      slipTimers[limb] += dt;
      // A brief window to correct - that window is the whole skill.
      if (slipTimers[limb] > 0.2) {
        release(climber, limb);
        slipTimers[limb] = 0;
        audio.slip();
        hud.toast(limb[1] === 'H' ? 'Hand slipped off!' : 'Foot popped off!', 'bad');
      }
    } else {
      slipTimers[limb] = Math.max(0, slipTimers[limb] - dt * 2);
    }
  }
}

function checkOutcome(results) {
  // Success: touch the summit hold while still on the wall.
  const summitReached =
    (climber.holds.LH && holdMap[climber.holds.LH]?.summit) ||
    (climber.holds.RH && holdMap[climber.holds.RH]?.summit);

  if (summitReached) {
    audio.chime();
    endRun(
      'won',
      'Topped out',
      `You reached the summit hold on <strong>${preset.name}</strong> with ${Math.round(
        climber.energy
      )}% energy left.<br/>Press <kbd>R</kbd> to climb it again, or pick another challenge.`,
      'good'
    );
    return;
  }

  if (results.attachedHands.length === 0) {
    endRun(
      'lost',
      'You fell',
      `Your hands came off the wall.<br/>Weight on your arms was at ${Math.round(
        results.handShare * 100
      )}%.<br/>Press <kbd>R</kbd> to try again.`,
      'bad'
    );
    return;
  }

  if (climber.energy <= 0) {
    endRun(
      'lost',
      'Pumped out',
      `Your forearms gave out.<br/>Try keeping your hips closer to the wall and letting your feet carry more of the weight.<br/>Press <kbd>R</kbd> to try again.`,
      'bad'
    );
    return;
  }

  if (timeLeft <= 0) {
    endRun(
      'lost',
      'Out of time',
      `The route clock ran out with ${Math.round((climber.holds.LH ? holdMap[climber.holds.LH]?.y || 0 : 0) * 10) / 10} m climbed.<br/>Press <kbd>R</kbd> to try again.`,
      'bad'
    );
  }
}

// ---------------------------------------------------------------- loop
let lastTime = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  const active = state === 'playing';

  if (active) {
    elapsed += dt;
    timeLeft -= dt;
    updateIntent(climber, intent, dt);

    const results = stepSimulation(climber, holdMap, preset, dt, { resting: intent.rest });
    climber.energy = Math.max(0, Math.min(ENERGY_MAX, climber.energy - results.netDrain * dt));

    handleContactFailure(results, dt);

    // Re-read after any contacts let go, so feedback matches reality.
    const live = stepSimulation(climber, holdMap, preset, dt, { resting: intent.rest });

    // ---- feedback translation -------------------------------------
    const exhaustion = 1 - Math.max(0, climber.energy) / ENERGY_MAX;
    const worstHandRisk = Math.max(live.risk.LH ?? 0, live.risk.RH ?? 0);
    const tremble = Math.min(1, exhaustion * exhaustion * 0.9 + Math.max(0, worstHandRisk - 0.78) * 2.2);

    audio.updateBreath(exhaustion, dt);
    if (worstHandRisk > 0.8 && Math.random() < 0.09) audio.creak(Math.min(1, worstHandRisk));
    if (live.stability < 0.6 && Math.random() < 0.05) audio.swayShift(1 - live.stability);

    aimedHoldId = pickAimedHold();
    if (aimedHoldId !== null && aimedHoldId !== undefined) view.setAim(aimedHoldId);
    else view.setAim(null);

    const aimed = aimedHoldId ? holdMap[aimedHoldId] : null;
    const aimText = aimed
      ? `${aimed.kind === 'hand' ? 'Handhold' : 'Foothold'} · ${sizeWord(aimed.size)}${aimed.summit ? ' · SUMMIT' : ''}`
      : '';

    // ---- camera: position from the body, sway from lost balance ----
    look.yaw += (targetLook.yaw - look.yaw) * Math.min(1, dt * 9);
    look.pitch += (targetLook.pitch - look.pitch) * Math.min(1, dt * 9);
    view.updateCamera(live.centre ?? { x: 0, y: 0 }, climber.hip, look, tremble);
    // Body sway: the wall rotates around you when your weight is off your feet.
    const sway = (1 - live.stability) * 0.34;
    view.camera.rotateZ(Math.sin(now * 0.004) * sway + (1 - live.stability) * 0.1);

    view.syncLimbs(climber, holdMap, tremble);

    hud.update(live, climber, {
      height: live.highestHandY,
      total: WALL_HEIGHT,
      timeLeft,
      resting: intent.rest,
      aimText,
    });

    checkOutcome(live);
  } else {
    view.syncLimbs(climber, holdMap, 0);
  }

  view.render();
}

// ---------------------------------------------------------------- input
window.addEventListener('resize', () => view.resize());

canvas.addEventListener('mousemove', (e) => updatePointerFromMouse(e.clientX, e.clientY));

canvas.addEventListener('mousedown', () => audio.resume());

document.querySelectorAll('[data-level]').forEach((btn) => {
  btn.addEventListener('click', () => {
    audio.resume();
    loadLevel(btn.dataset.level);
  });
});

document.getElementById('overlay-restart')?.addEventListener('click', () => {
  audio.resume();
  loadLevel(preset.key);
});

window.addEventListener('keydown', (e) => {
  audio.resume();
  if (e.repeat) return;

  if (e.code === 'KeyR') {
    loadLevel(preset.key);
    return;
  }
  if (e.code === 'KeyM') {
    audio.setMuted(!audio.muted);
    hud.toast(audio.muted ? 'Sound off' : 'Sound on', 'info');
    return;
  }
  if (e.code === 'Digit1') return loadLevel('gentle');
  if (e.code === 'Digit2') return loadLevel('slab');
  if (e.code === 'Digit3') return loadLevel('slippery');

  const limb = LIMB_KEYS[e.code];
  if (limb) {
    attemptMove(limb);
    return;
  }

  if (e.code === 'KeyA') intent.leanLeft = true;
  if (e.code === 'KeyD') intent.leanRight = true;
  if (e.code === 'KeyW') intent.hipIn = true;
  if (e.code === 'KeyS') intent.hipOut = true;
  if (e.code === 'Space') {
    intent.rest = true;
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyA') intent.leanLeft = false;
  if (e.code === 'KeyD') intent.leanRight = false;
  if (e.code === 'KeyW') intent.hipIn = false;
  if (e.code === 'KeyS') intent.hipOut = false;
  if (e.code === 'Space') intent.rest = false;
});

// ---------------------------------------------------------------- boot
view.resize();
loadLevel('gentle');
requestAnimationFrame(frame);
