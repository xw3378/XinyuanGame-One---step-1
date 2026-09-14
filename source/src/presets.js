// ============================================================
// ENVIRONMENT DATA  (brief.md section 4 - "Environment Data")
// ============================================================
// These values are what the player OBSERVES and must judge.
// Nothing here changes while the player acts. It defines the wall.
//
// Each challenge preset changes SYSTEM VARIABLES, not decoration:
//   - wall angle      (how much the route overhangs)
//   - hold friction   (how secure a grip is - NOT shown as a number)
//   - hold size       (directly visible)
//   - hold spacing    (how far apart moves are)
//   - route width     (how many valid paths exist)
// ============================================================

export const WALL_HEIGHT = 11.0; // metres from ground to summit hold
export const WALL_WIDTH = 9.0;

// Shared simulation constants, in SI-ish units tuned for readability.
export const BODY = {
  HEAD_UP: 0.42, // camera height above body centre
  SHOULDER_UP: 0.46,
  SHOULDER_SIDE: 0.24,
  ARM_REACH: 1.05,
  HIP_SIDE: 0.2,
  LEG_REACH: 0.95,
};

export const PRESETS = {
  gentle: {
    key: 'gentle',
    index: 1,
    name: 'Gentle Warm-up Wall',
    subtitle: 'Shallow slope + large grippy holds',
    // The beginner misconception under test: pull with your arms.
    // Here that still mostly works, so the wall teaches nothing painful yet.
    lesson: 'Climb the simple upward path. Notice that your feet carry you.',
    angleDeg: 8,
    // Vertical distance between consecutive handholds on the guaranteed line.
    // Bounded by ARM_REACH: a bigger step is not "harder", it is impossible.
    verticalStep: 0.86,
    lateralDrift: 0.5,
    routeWidth: 1.7,
    extraRoutes: 0,
    sizeRange: [1.15, 1.5],
    frictionRange: [0.84, 0.97],
    energyDrainScale: 0.72,
    timeLimit: 200,
    seed: 1337,
  },

  slab: {
    key: 'slab',
    index: 2,
    name: 'Steep Slab Climb',
    subtitle: 'Moderate overhang + mixed-size holds',
    // Now several routes exist. Choosing badly costs stamina.
    lesson: 'Several paths are valid. Pick the one that keeps your arms fresh.',
    angleDeg: 21,
    verticalStep: 1.02,
    lateralDrift: 1.15,
    routeWidth: 4.2,
    extraRoutes: 1,
    sizeRange: [0.72, 1.34],
    frictionRange: [0.52, 0.88],
    energyDrainScale: 1.0,
    timeLimit: 190,
    seed: 4242,
  },

  slippery: {
    key: 'slippery',
    index: 3,
    name: 'Slippery Climb',
    subtitle: 'Heavy overhang + sparse slippery holds',
    // Few secure grips. Reach judgement and committed movement decide it.
    lesson: 'Few secure grips. Judge every reach before you commit to it.',
    angleDeg: 34,
    verticalStep: 1.16,
    lateralDrift: 1.5,
    routeWidth: 4.6,
    extraRoutes: 0,
    sizeRange: [0.48, 0.92],
    // Still far and away the most slippery of the three, but [0.22, 0.55] left
    // the route with no margin at all: every grip sat above its limit at all
    // times, so the wall was unwinnable rather than hard.
    frictionRange: [0.32, 0.62],
    energyDrainScale: 1.28,
    timeLimit: 185,
    seed: 9021,
  },
};

export const PRESET_ORDER = ['gentle', 'slab', 'slippery'];

// How far can this limb move, given the preset? Slippery routes force
// bigger commitments; the reachable budget stays honest either way.
export function reachBudgetFor(preset, kind) {
  const base = kind === 'hand' ? BODY.ARM_REACH : BODY.LEG_REACH;
  // A little help on friendly walls, none on the hard one.
  const generosity = preset.key === 'gentle' ? 1.08 : preset.key === 'slab' ? 1.0 : 0.97;
  return base * generosity;
}
