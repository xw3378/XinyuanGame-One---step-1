// ============================================================
// SYSTEM-CALCULATED RESULTS  (brief.md section 4)
// "The climber moves smoothly or lags, hands slip off holds, body
//  becomes out-of-balance, energy drains quickly."
// ============================================================
// The single most important idea, straight from the core learning shift:
// your FEET should carry you, and your ARMS should only steady you.
// Everything below is a consequence of that one relationship.
// ============================================================

import { BODY } from './presets.js';

export const LIMBS = ['LH', 'RH', 'LF', 'RF'];
export const ENERGY_MAX = 100;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const isHand = (limb) => limb[1] === 'H';
export const sideOf = (limb) => (limb[0] === 'L' ? -1 : 1);

// Where the body currently sits: an average of everything touching the wall,
// with feet weighted heavier because they genuinely carry most of the mass.
export function centreOfMass(climber, holdMap) {
  let sx = 0;
  let sy = 0;
  let total = 0;
  for (const limb of LIMBS) {
    const hold = holdMap[climber.holds[limb]];
    if (!hold) continue;
    const weight = isHand(limb) ? 0.75 : 1.25;
    sx += hold.x * weight;
    sy += hold.y * weight;
    total += weight;
  }
  if (total === 0) return null;
  return { x: sx / total, y: sy / total };
}

// Hands reach from the shoulders; feet reach from the hips. This is what
// makes "can I get there?" a real judgement instead of a guess.
//
// The hips ARE the body's centre of mass, so a foot reaches from the centre
// itself - not from somewhere below it. (An earlier version subtracted a
// HIP_DOWN offset, which put the hips beneath your own high footholds and
// made every upward foot move geometrically impossible.)
export function anchorFor(limb, centre) {
  const side = sideOf(limb);
  if (isHand(limb)) {
    return { x: centre.x + side * BODY.SHOULDER_SIDE, y: centre.y + BODY.SHOULDER_UP };
  }
  return { x: centre.x + side * BODY.HIP_SIDE, y: centre.y };
}

export function steepnessOf(preset) {
  return Math.sin((preset.angleDeg * Math.PI) / 180);
}

// Spread a body-side's share across only the limbs that are actually on holds.
function normaliseSides(attachedLimbs, leftFraction) {
  const map = {};
  const sum = attachedLimbs.reduce(
    (acc, limb) => acc + (sideOf(limb) < 0 ? leftFraction : 1 - leftFraction),
    0
  );
  for (const limb of attachedLimbs) {
    const raw = sideOf(limb) < 0 ? leftFraction : 1 - leftFraction;
    map[limb] = sum > 0 ? raw / sum : 1 / attachedLimbs.length;
  }
  return map;
}

/**
 * Run one frame of the climbing system.
 * Returns every calculated result the feedback layer needs to translate
 * back to the player. Nothing here is invented beyond brief.md section 4/5.
 */
export function stepSimulation(climber, holdMap, preset, dt, options = {}) {
  const steepness = steepnessOf(preset);

  // ---- gather what is touching the wall -----------------------------
  const contacts = {};
  const attachedHands = [];
  const attachedFeet = [];
  for (const limb of LIMBS) {
    const hold = holdMap[climber.holds[limb]] || null;
    contacts[limb] = hold;
    if (!hold) continue;
    (isHand(limb) ? attachedHands : attachedFeet).push(limb);
  }

  const centre = centreOfMass(climber, holdMap);

  // ---- 1. how much of your weight your feet are carrying ------------
  // This is the lesson. Hips tucked into the wall => skeleton carries you.
  // Hips pushed out, or a steep wall => your arms must make up the gap.
  let footShare = 0;
  if (attachedFeet.length > 0) {
    const hipQuality = 1 - climber.hip; // 1 = hips tucked in
    const anglePenalty = 1 - 0.5 * steepness; // overhangs punish lazy feet
    // While you are moving ONE hand, your feet and hips genuinely take over -
    // standing up on good footholds is exactly the expert habit the brief
    // describes. Without this, the lone remaining hand carries the whole hand
    // share and every move on a hard route is instantly fatal, which teaches
    // nothing. Set too high it would make arms irrelevant; at 1.55 good feet
    // save you and lazy hips still kill you.
    const movementSupport =
      attachedHands.length === 1 ? 1.3 : attachedHands.length === 0 ? 1.45 : 1;
    // Two feet can carry far more between them than one. Without this the whole
    // foot share dropped onto the surviving foot the moment its partner popped,
    // which overloaded that one too and set off a cascade that emptied the wall
    // inside two frames - no window to correct, so no learning.
    const footCountFactor = attachedFeet.length >= 2 ? 1 : 0.62;
    footShare = clamp(0.8 * hipQuality * anglePenalty * movementSupport * footCountFactor, 0, 0.9);
  }
  const handShare = clamp(1 - footShare, 0.1, 1);

  // ---- 2. deliberate left/right weight shift ------------------------
  const leftFraction = clamp(0.5 - climber.lean * 0.42, 0.06, 0.94);
  const handSides = normaliseSides(attachedHands, leftFraction);
  const footSides = normaliseSides(attachedFeet, leftFraction);

  // ---- 3. demand vs capacity on every contact -----------------------
  // Steeper walls genuinely cost more, but not so much that they become
  // unsolvable - the difficulty comes from technique, not from a cliff.
  // Kept small on purpose: steepness is ALREADY priced in twice elsewhere (it
  // shifts load from feet to hands via anglePenalty, and it multiplies the arm
  // cost in the energy model). At 0.35 the Slippery Climb demanded more grip
  // than any hold on it could give, on the hands or the feet.
  const totalLoad = 1 + 0.1 * steepness;
  const energyFactor = 0.34 + 0.66 * clamp(climber.energy / ENERGY_MAX, 0, 1);

  const risk = {};
  const demand = {};
  const capacity = {};
  const warning = {};
  const slipping = {};

  for (const limb of LIMBS) {
    const hold = contacts[limb];
    if (!hold) {
      risk[limb] = 0;
      continue;
    }
    const sideShare = isHand(limb) ? handSides[limb] : footSides[limb];
    const shareLoad = isHand(limb) ? handShare : footShare;

    const d = shareLoad * sideShare * totalLoad;
    // Capacity is a property of the hold: how grippy and how big it is. A
    // steepness penalty used to be applied here as well, but steepness already
    // moves load off the feet and onto the hands further up - charging it twice
    // made every foothold on the overhang pop off the moment you moved a hand.
    const c =
      hold.friction *
      (isHand(limb) ? 0.5 + 0.5 * hold.size : 0.35 + 0.65 * hold.size) *
      energyFactor;

    demand[limb] = d;
    capacity[limb] = Math.max(c, 0.02);
    risk[limb] = d / Math.max(c, 0.02);
    warning[limb] = risk[limb] > 0.78;
    slipping[limb] = risk[limb] >= 1;
  }

  // ---- 4. balance: is our weight still over our feet? ---------------
  let supportMinX = 0;
  let supportMaxX = 0;
  let supportCount = 0;
  let highestHandY = 0;
  if (centre) {
    let min = Infinity;
    let max = -Infinity;
    for (const limb of LIMBS) {
      const hold = contacts[limb];
      if (!hold) continue;
      supportCount++;
      min = Math.min(min, hold.x);
      max = Math.max(max, hold.x);
      if (isHand(limb)) highestHandY = Math.max(highestHandY, hold.y);
    }
    if (supportCount > 0) {
      supportMinX = min;
      supportMaxX = max;
    }
  }

  let stability = 1;
  let overshoot = 0;
  let comX = centre ? centre.x : 0;
  if (centre && supportCount > 1) {
    const supportCentre = (supportMinX + supportMaxX) / 2;
    const existingOffset = centre.x - supportCentre;
    // The barndoor: with hips pushed out on an overhang, gravity swings you
    // further off whatever support you still have.
    const swing =
      steepness * (0.3 + 0.7 * climber.hip) * 0.55 * (existingOffset >= 0 ? 1 : -1);
    comX = centre.x + climber.lean * 0.26 + swing;
    overshoot = Math.max(supportMinX - comX, comX - supportMaxX, 0);
    stability = clamp(1 - overshoot / 0.55, 0, 1);
  } else if (supportCount === 1) {
    // Hanging off a single point - you are rotating, not standing.
    stability = clamp(0.25 - steepness * 0.2, 0, 1);
  }

  // ---- 5. energy ----------------------------------------------------
  // Resting only works with hips in and feet loaded: straight arms, weight on
  // your skeleton. Exactly the expert habit the brief describes. It has to be
  // computed BEFORE the drain, because resting changes the drain itself - on a
  // steep wall an earlier version still lost energy while resting, so no route
  // past the first could ever be finished.
  const restingWell =
    !!options.resting && climber.hip < 0.45 && attachedFeet.length > 0 && handShare < 0.62;

  // Hanging on straight arms is cheap. Pulling on bent arms is what pumps you
  // out - and it is precisely the beginner mistake in section 2 of the brief.
  const baseDrain = restingWell ? 0.35 : 0.75;
  const armEffort = restingWell ? 0.25 : 1;
  const armCost = 2.2 * Math.pow(handShare, 1.6) * (1 + 1.1 * steepness) * armEffort;
  const struggleCost = 1.4 * (1 - stability);
  const drainRate = (baseDrain + armCost + struggleCost) * preset.energyDrainScale;

  const regenRate = restingWell ? 3.0 * (1 - handShare) : 0;
  const netDrain = drainRate - regenRate;

  return {
    centre,
    contacts,
    handShare,
    footShare,
    demand,
    capacity,
    risk,
    warning,
    slipping,
    comX,
    supportMinX,
    supportMaxX,
    supportCount,
    stability,
    overshoot,
    attachedHands,
    attachedFeet,
    highestHandY,
    drainRate,
    regenRate,
    netDrain,
    energyFactor,
    steepness,
    restingWell,
  };
}
