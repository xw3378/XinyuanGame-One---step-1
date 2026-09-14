# Rock climbing on indoor climbing walls

A first-person 3D browser game for the course project *Game Design from Everyday Life* (CGDD).

You do not pull yourself up the wall. You decide where your weight goes, and the wall tells you
whether that decision was any good.

- **[Play the game](./game.html)** · **[Project home](./index.html)** · **[Development process](./process.html)**

---

## Running it

The repository root holds a **built static site** — open it directly, no build step needed.

```bash
# Option 1: just open the file
open index.html          # macOS
# then click "Play the current build"

# Option 2: serve it (recommended; ES modules dislike file:// in some browsers)
python3 -m http.server 8000
# then visit http://localhost:8000
```

### Rebuilding after a change

The source lives in `source/` and is built with Vite. You only need this if you edit the code.

```bash
cd source
npm install
npm run build     # writes to source/dist
npm run dev       # or: live-reload dev server

# then copy the build into the repository root so Pages serves it
cd .. && cp -R source/dist/. .
```

Every internal link and asset path is **relative** (`./game.html`, `assets/game-*.js`). This is
deliberate: GitHub Pages serves from a repository subpath, so any path beginning with `/` breaks on
the live site while still working locally.

### Publishing to GitHub Pages

Push the repository, then in *Settings → Pages* set the source to the branch and `/` (root). The
built `index.html` at the root is what gets served.

---

## Controls

| Action | Key |
|---|---|
| Look / aim at a hold | mouse |
| Place **left hand** on the aimed hold | <kbd>Q</kbd> |
| Place **right hand** on the aimed hold | <kbd>E</kbd> |
| Place **left foot** on the aimed hold | <kbd>Z</kbd> |
| Place **right foot** on the aimed hold | <kbd>C</kbd> |
| Shift weight left / right | <kbd>A</kbd> <kbd>D</kbd> |
| **Hips in / out from the wall** | <kbd>W</kbd> <kbd>S</kbd> |
| Rest (recover energy) | <kbd>Space</kbd> |
| Restart route | <kbd>R</kbd> |
| Switch challenge | <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> |
| Toggle sound | <kbd>M</kbd> |

**If you only learn one key, learn <kbd>W</kbd>.** Hips close to the wall is the single biggest
lever in the game: it moves load off your hands and onto your skeleton.

### How to win

Touch the summit hold with either hand while still attached to the wall.

### How to lose

- **You fall** — both hands come off.
- **You pump out** — energy reaches zero.
- **Out of time** — the route clock runs out.

---

## Dependency track

**Track C — npm + Vite + Three.js.**

| | |
|---|---|
| `three` | `0.160.1` — 3D rendering |
| `vite` | `5.4.11` — build, multi-page bundling |
| Node | 22.x |
| Runtime deps | none beyond the above |
| Audio | synthesised at runtime with the Web Audio API — no audio files |
| Fonts | system stack — no web fonts |

The build emits three HTML entries (`index`, `game`, `process`) configured in
`source/vite.config.js`, with `base: './'` so output paths stay relative.

> The brief lists the tool/AI agent as *Unity* in Sections 1 and 13, while Sections 10, 11 and 14
> require a browser game published from GitHub Pages. The "Unity" entry has been treated as a stale
> field. This is an AI-applied assumption and is recorded as such in the development log.

---

## Main variables

### Environment data — fixed, describes the wall (`source/src/presets.js`)

| Variable | Meaning | Gentle | Slab | Slippery |
|---|---|---|---|---|
| `angleDeg` | wall overhang | 8° | 21° | 34° |
| `frictionRange` | how secure a grip is **(never shown as a number — must be inferred)** | 0.84–0.97 | 0.52–0.88 | 0.32–0.62 |
| `sizeRange` | hold size (directly visible) | 1.15–1.50 | 0.72–1.34 | 0.48–0.92 |
| `verticalStep` | spacing between handholds on the line | 0.86 | 1.02 | 1.16 |
| `routeWidth` / `extraRoutes` | how many valid paths exist | 1.7 / 0 | 4.2 / 1 | 4.6 / 0 |
| `energyDrainScale` | how fast the wall tires you | 0.72 | 1.00 | 1.28 |
| `timeLimit` | route clock (s) | 200 | 190 | 185 |

### Player-controlled data (`source/src/climber.js`)

| Variable | Range | What it does |
|---|---|---|
| `holds.LH/RH/LF/RF` | hold id or `null` | which limb is on which hold |
| `lean` | −1 … +1 | deliberate left/right weight shift |
| `hip` | 0 (tucked) … 1 (pushed out) | **the core lever** — decides how much your arms carry |
| `energy` | 0 … 100 | stamina; shrinks your reach as it falls |

### System-calculated results (`source/src/simulate.js`)

| Result | Derived from | Drives |
|---|---|---|
| `footShare` / `handShare` | hip distance, wall angle, how many limbs are on | the "weight on arms" meter, energy drain |
| `demand` / `capacity` / `risk` per limb | load × total load vs friction × size × energy | slip warning, tremble, the four grip bars |
| `stability` | centre of mass vs the span of your supports | camera sway, shifting-body sound |
| `netDrain` | arm loading, struggle, resting quality | the energy meter |

Risk is `demand / capacity`. Below ~0.78 nothing happens; above it the limb trembles and creaks; at
**1.0 the hold lets go**.

---

## Verification

The routes are checked by a headless harness that imports the same modules the browser runs and
climbs each one twice. Results as of Milestone 1:

| Challenge | Good technique | Beginner habit (hips out, never rests) |
|---|---|---|
| Gentle Warm-up Wall | tops out · 26 moves · 26 s | tops out · 30% energy left |
| Steep Slab Climb | tops out · 30 moves · 56 s | **falls at 7.3 m** |
| Slippery Climb | tops out · 32 moves · 89 s | **falls at 1.4 m** |

The second column is the point of the game: bad technique gets you up the easy wall and kills you on
the other two.

**Caveat: no human has played this yet.** Every number was tuned against the harness, not against
feel.

---

## Repository layout

```text
.
├── index.html                        # home: designer statement, system graph, play link
├── game.html                         # the playable game
├── process.html                      # human–AI development timeline
├── assets/                           # built JS / CSS / system graph  (generated)
├── development-log/
│   └── agent-development-log.md      # raw interaction + reflection log
├── brief.md                          # the specification — source of truth
├── generate-development-log-prompt.md
├── README.md
└── source/                           # Vite project — edit code here
    ├── package.json
    ├── vite.config.js
    ├── index.html  game.html  process.html
    ├── assets/img/system-graph.png
    └── src/
        ├── presets.js    # environment data (the three challenges)
        ├── holds.js      # hold layout / route generation
        ├── climber.js    # player-controlled data + move attempts
        ├── simulate.js   # system-calculated results
        ├── scene.js      # Three.js scene
        ├── feedback.js   # synthesised audio
        ├── hud.js        # on-screen readouts
        ├── main.js       # the game loop
        └── style.css
```

The data split — environment / player-controlled / calculated — is deliberately mirrored by the
module split, as the brief's Section 4 requires.

---

## Known limitations

- Not playtested by anyone other than the author; feel is unverified.
- Graphics are plain: simple geometry with a procedural concrete texture.
- All numeric values are AI-chosen, since the brief gives none. They were tuned until a bot could
  finish each route.
- No git repository yet, so the development log cannot be mapped to commits.
