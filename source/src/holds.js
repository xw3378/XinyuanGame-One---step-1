// ============================================================
// ENVIRONMENT DATA - hold layout generation (brief.md section 4)
// ============================================================
// Structures the player observes and must judge:
//   hold position, hold size (visible), hold friction (must be INFERRED
//   from how the hold behaves when loaded - brief.md 5 "Perceivable vs
//   inferred factors").
//
// Every route is generated so that a completing line is guaranteed to
// exist: each new hold is placed within the reach budget of the one
// before it. Extra probe holds are added around that line so route
// choice has real consequences.
// ============================================================

import { PRESETS, WALL_HEIGHT, BODY, reachBudgetFor } from './presets.js';

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;

export function buildWall(presetKey) {
  const preset = PRESETS[presetKey];
  const rand = mulberry32(preset.seed);
  const holds = [];
  let nextId = 1;
  const routeHalf = preset.routeWidth / 2;

  const addHold = (kind, x, y, opts = {}) => {
    const hold = {
      id: nextId++,
      kind, // 'hand' | 'foot'
      x,
      y,
      size: opts.size ?? lerp(preset.sizeRange[0], preset.sizeRange[1], rand()),
      friction: opts.friction ?? lerp(preset.frictionRange[0], preset.frictionRange[1], rand()),
      summit: false,
      onLine: !!opts.onLine,
    };
    // A visible, IMPERFECT hint only. The real value stays hidden; the player
    // confirms it by loading the hold and feeling whether it slips.
    hold.polished = hold.friction < 0.46;
    holds.push(hold);
    return hold;
  };

  // Holds that belong to the guaranteed line are given workable values, so a
  // completing route always exists even on the hostile route.
  const lineFriction = () => {
    const [lo, hi] = preset.frictionRange;
    // The guaranteed line is held to the better end of the range. It has to be:
    // moving a hand puts the whole hand load on one grip, and with the full
    // range the Slippery Climb's line holds could not hold that, so the one
    // route that is supposed to exist was mathematically unclimbable.
    return lerp(lerp(lo, hi, 0.7), hi, rand());
  };
  const lineSize = () => {
    const [lo, hi] = preset.sizeRange;
    return lerp(lerp(lo, hi, 0.4), hi, rand());
  };

  const reach = reachBudgetFor(preset, 'hand');
  const legReach = reachBudgetFor(preset, 'foot');
  const vStep = preset.verticalStep;

  // ---- guaranteed climbing line -------------------------------------
  let hx = -0.42;
  let hy = 1.28;
  let fx = 0.34;
  let fy = 0.42;

  // The four holds you START on are the soundest on the wall. Without this the
  // Slippery Climb opened with both hands already at slip risk, so the player
  // fell before pressing a single key - punishing the route, not the technique.
  const startFriction = () => Math.max(lineFriction(), preset.frictionRange[1] * 0.94);
  const startSize = () => Math.max(lineSize(), preset.sizeRange[1] * 0.9);

  const startFootA = addHold('foot', -0.36, 0.4, { size: startSize(), friction: startFriction(), onLine: true });
  const startFootB = addHold('foot', fx, fy, { size: startSize(), friction: startFriction(), onLine: true });
  const startHandA = addHold('hand', hx, hy, { size: startSize(), friction: startFriction(), onLine: true });
  const startHandB = addHold('hand', -0.4, 1.36, { size: startSize(), friction: startFriction(), onLine: true });
  // Flagged explicitly: sorting by height alone would occasionally lose to a
  // randomly placed probe hold, and the player would start on a bad grip.
  for (const h of [startFootA, startFootB, startHandA, startHandB]) h.start = true;

  // An "ideal climber" walks up the line while we generate it, and every new
  // hold is clamped into the disc that limb can actually reach from the posture
  // the climber is in at that moment. A completing route is therefore
  // guaranteed BY CONSTRUCTION, not by luck.
  //
  // The previous version advanced hands and feet on two independent vertical
  // ladders (0.88 m and 0.545 m per step). By the top the hands were at 10.1 m
  // and the feet at 5.9 m - a 4 m gap no leg can bridge, so the upper half of
  // every route was geometrically unclimbable and every run stalled there.
  let idealHands = [startHandA, startHandB];
  let idealFeet = [startFootA, startFootB];

  // Mirrors centreOfMass() in simulate.js: hands 0.75, feet 1.25.
  const idealCentre = () => {
    let sx = 0;
    let sy = 0;
    let total = 0;
    for (const h of idealHands) {
      sx += h.x * 0.75;
      sy += h.y * 0.75;
      total += 0.75;
    }
    for (const h of idealFeet) {
      sx += h.x * 1.25;
      sy += h.y * 1.25;
      total += 1.25;
    }
    return { x: sx / total, y: sy / total };
  };

  // Clamp a preferred position into the reachable disc, never returning
  // something lower than minY unless the disc genuinely cannot reach that high.
  // The 0.80 margin is deliberate: the player is never placed this well, and an
  // exhausted climber still has 0.85 of their reach left, so the route stays
  // climbable right down to an empty tank.
  const placeReachable = (isHandLimb, side, preferredX, preferredY, minY) => {
    const c = idealCentre();
    const ax = c.x + side * (isHandLimb ? BODY.SHOULDER_SIDE : BODY.HIP_SIDE);
    const ay = c.y + (isHandLimb ? BODY.SHOULDER_UP : 0);
    const budget = (isHandLimb ? reach : legReach) * 0.8;

    let dx = preferredX - ax;
    let dy = preferredY - ay;
    const d = Math.hypot(dx, dy);
    if (d > budget) {
      const k = budget / d;
      dx *= k;
      dy *= k;
    }
    let y = ay + dy;

    if (y < minY) {
      const dyNeeded = minY - ay;
      const roomAtMinY = Math.sqrt(Math.max(budget * budget - dyNeeded * dyNeeded, 0));
      if (budget >= dyNeeded && Math.abs(dx) <= roomAtMinY + 1e-9) {
        y = minY;
        dx = Math.sign(dx) * Math.min(Math.abs(dx), roomAtMinY);
      } else {
        y = ay + budget; // best the body can do from here
      }
    }
    return { x: clamp(ax + dx, -routeHalf, routeHalf), y };
  };

  let lastHand = startHandB;
  let lastFootY = startFootB.y;
  let side = 1;

  while (lastHand.y < WALL_HEIGHT - 1.15) {
    // ---- next handhold ------------------------------------------------
    const handPos = placeReachable(
      true,
      side,
      lastHand.x + (rand() * 2 - 1) * preset.lateralDrift * 0.5,
      lastHand.y + vStep,
      lastHand.y + 0.25
    );
    const hand = addHold('hand', handPos.x, handPos.y, {
      size: lineSize(),
      friction: lineFriction(),
      onLine: true,
    });
    idealHands = [idealHands[1], hand];
    lastHand = hand;

    // ---- foothold, kept underneath the hands ---------------------------
    // Feet that lag behind the hands drag the centre of mass down and put the
    // next hold out of reach, so the drop is bounded and the x stays near the
    // hand it belongs to.
    const footPos = placeReachable(
      false,
      side,
      hand.x + (rand() * 2 - 1) * preset.lateralDrift * 0.45,
      // Always BELOW the hand it belongs to. Dropping it a fixed distance was
      // fine low down but put the first foothold above the starting handholds,
      // which opened the route in a splits and popped both feet off.
      hand.y - lerp(0.35, 0.62, rand()),
      lastFootY + 0.15
    );
    const foot = addHold('foot', footPos.x, footPos.y, {
      size: lineSize(),
      friction: lineFriction(),
      onLine: true,
    });
    idealFeet = [idealFeet[1], foot];
    lastFootY = foot.y;

    side = -side;
    hx = hand.x;
    hy = hand.y;
  }

  // Summit hold: the last real move, also clamped into reach so topping out is
  // always something the body can actually do.
  const summitPos = placeReachable(true, side, lastHand.x, WALL_HEIGHT, lastHand.y + 0.25);
  const summit = addHold('hand', summitPos.x, Math.min(summitPos.y, WALL_HEIGHT), {
    size: Math.max(preset.sizeRange[1] * 0.95, 1.05),
    friction: Math.max(0.85, preset.frictionRange[1]),
    onLine: true,
  });
  summit.summit = true;

  // ---- extra routes (Steep Slab: several valid lines) -----------------
  for (let r = 0; r < preset.extraRoutes; r++) {
    const branchX = clamp(hx + (r % 2 === 0 ? 1 : -1) * lerp(0.9, routeHalf * 0.85, rand()), -routeHalf, routeHalf);
    let bx = branchX;
    let by = 1.3;
    for (let i = 0; i < 9 && by < WALL_HEIGHT - 1.2; i++) {
      const room = Math.sqrt(Math.max(reach * reach - vStep * vStep, 0.0004));
      const du = (rand() * 2 - 1) * Math.min(room * 0.8, preset.lateralDrift);
      bx = clamp(bx + du, -routeHalf, routeHalf);
      by += vStep * 0.94;
      addHold('hand', bx, by, { size: lineSize() * 0.92, friction: lineFriction() });
      if (i % 2 === 0) {
        addHold('foot', clamp(bx + (rand() * 2 - 1) * 0.4, -routeHalf, routeHalf), by - 0.72, {
          size: lineSize() * 0.9,
          friction: lineFriction(),
        });
      }
    }
  }

  // ---- probe holds that are NOT on a safe line ------------------------
  // More mixed quality: judging these wrong is where the learning happens.
  const probeCount = Math.round(preset.routeWidth * 2.2);
  for (let i = 0; i < probeCount; i++) {
    const y = lerp(1.0, WALL_HEIGHT - 1.0, rand());
    const x = clamp((rand() * 2 - 1) * routeHalf * 1.05, -routeHalf, routeHalf);
    const kind = rand() < 0.55 ? 'hand' : 'foot';
    const tooClose = holds.some(
      (h) => h.kind === kind && Math.hypot(h.x - x, h.y - y) < 0.42
    );
    if (tooClose) continue;
    // Full range here - some of these are genuinely bad holds.
    addHold(kind, x, y);
  }

  return { holds, summitId: summit.id };
}
