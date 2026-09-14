// ============================================================
// PLAYER-CONTROLLED DATA  (brief.md section 4)
// "Reach for handholds, place feet on footholds, shift body weight
//  and direction, pause to rest, choose a climbing sequence, and
//  adjust balance."
// ============================================================
// Judge -> Act. The player decides WHICH limb goes WHERE and in WHAT
// ORDER. Nothing here guesses for them. Notice that reach judgement
// reads result data (the body centre) before allowing an action.
// ============================================================

import { LIMBS, ENERGY_MAX, isHand, centreOfMass, anchorFor } from './simulate.js';
import { reachBudgetFor } from './presets.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export { LIMBS };

export function createClimber() {
  return {
    holds: { LH: null, RH: null, LF: null, RF: null },
    lean: 0, // -1 shift weight left ... +1 shift weight right
    // Standing close to the wall. 0.45 was used first and already put the
    // Slippery Climb past its grip limit before the player could react.
    hip: 0.3,
    energy: ENERGY_MAX,
  };
}

// Start on the lowest holds so the first thing the player does is a real move.
export function attachStartingHolds(climber, holds) {
  // Prefer the holds buildWall() flagged as the start, so the opening position
  // is always the sound one regardless of where probe holds landed.
  const byStartThenHeight = (a, b) => (b.start ? 1 : 0) - (a.start ? 1 : 0) || a.y - b.y;
  const feet = holds.filter((h) => h.kind === 'foot').sort(byStartThenHeight);
  const hands = holds.filter((h) => h.kind === 'hand').sort(byStartThenHeight);

  // Always take from the front of the sorted pool. An earlier version took
  // index 1 for the "right" limb, which skipped the second-best hold and handed
  // the player one weak starting grip and a foot 1.2 m above the other.
  const take = (pool) => (pool.length ? pool.splice(0, 1)[0] : null);

  const footA = take(feet);
  const footB = take(feet);
  const handA = take(hands);
  const handB = take(hands);

  if (footA && footA.x > (footB?.x ?? -Infinity)) {
    climber.holds.LF = footB ? footB.id : footA.id;
    climber.holds.RF = footA.id;
  } else {
    climber.holds.LF = footA ? footA.id : null;
    climber.holds.RF = footB ? footB.id : null;
  }

  if (handA && handA.x > (handB?.x ?? -Infinity)) {
    climber.holds.LH = handB ? handB.id : handA.id;
    climber.holds.RH = handA.id;
  } else {
    climber.holds.LH = handA ? handA.id : null;
    climber.holds.RH = handB ? handB.id : null;
  }
}

export function release(climber, limb) {
  climber.holds[limb] = null;
}

/**
 * Attempt a move. Returns { ok, reason, cost, distance, budget }.
 * Reasons: 'type' (wrong hold kind), 'airborne', 'out-of-reach', 'same'.
 */
export function tryMoveLimb(climber, holdMap, preset, limb, targetHold) {
  if (!targetHold) return { ok: false, reason: 'no-target' };

  // Feet belong on footholds, hands on handholds. Ignoring footholds is the
  // exact beginner mistake this game is about.
  const wanted = isHand(limb) ? 'hand' : 'foot';
  if (targetHold.kind !== wanted) return { ok: false, reason: 'type' };

  if (climber.holds[limb] === targetHold.id) return { ok: false, reason: 'same' };

  const centre = centreOfMass(climber, holdMap);
  if (!centre) return { ok: false, reason: 'airborne' };

  const anchor = anchorFor(limb, centre);
  const distance = Math.hypot(targetHold.x - anchor.x, targetHold.y - anchor.y);

  // Tired climbers cannot make long reaches. Energy changes what is possible.
  // The floor stays at 0.85: at 0.72 an exhausted climber could no longer reach
  // the holds the route was built from, so running low became an unrecoverable
  // spiral rather than a reason to stop and rest.
  const fatigue = 0.85 + 0.15 * clamp(climber.energy / ENERGY_MAX, 0, 1);
  const budget = reachBudgetFor(preset, wanted) * fatigue;

  if (distance > budget) {
    return { ok: false, reason: 'out-of-reach', distance, budget };
  }

  // Committing to a long move costs more than a short stable one. Sized so a
  // full route (~28 moves) plus the resting needed to recover it fits inside
  // the time limit - at 1.6 + 5.2*effort a single move cost ~6.8 and the route
  // ran out of energy a third of the way up.
  const effort = (distance / Math.max(budget, 0.001)) ** 1.5;
  const cost = 0.6 + 2.0 * effort;

  climber.holds[limb] = targetHold.id;
  return { ok: true, cost, distance, budget };
}

export function updateIntent(climber, intent, dt) {
  const rate = 1.7;
  if (intent.leanLeft) climber.lean = clamp(climber.lean - rate * dt, -1, 1);
  if (intent.leanRight) climber.lean = clamp(climber.lean + rate * dt, -1, 1);
  if (intent.hipIn) climber.hip = clamp(climber.hip - rate * dt, 0, 1);
  if (intent.hipOut) climber.hip = clamp(climber.hip + rate * dt, 0, 1);
}
