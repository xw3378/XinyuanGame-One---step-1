# First Playable Web Game Brief

> This summary and the accompanying system graph are the two primary development references. Build from both. If they conflict, preserve the learning goal and ask the student before changing the core design.

## 1. Project Identity
- Student / Team: Xinyuan Wang
- Project Title: Rock climbing on indoor climbing walls.
- Domain: Rock climbing
- Tool / AI Agent: Unity

## 2. Design Summary
**Domain and real experience:** Rock climbing on indoor climbing walls.

I have tried indoor rock‑climbing several times. I found that climbing is not just about arm strength. It demands careful foot placement, body balance and route planning to finish a wall.

**Novice misconception:** Beginners think climbing success mainly depends on strong arm and upper‑body strength.

**Most important domain challenge:** The relationship between energy management, body positioning, body weight distribution and route‑sequence planning.

Beginners pull upward with their arms too hard, ignore available footholds, lean their body too far away from the wall, or rush movements without planning ahead.

**Core learning shift:** Beginners think climbing means pulling yourself upward with arm strength. Experts know climbing means understanding the relationship among footholds, weight and energy, and movement sequences to move efficiently.

## 3. Core Player Learning Loop
**Observe:** Handhold and foothold positions, hold size and texture, body distance from the wall, remaining energy, possible movement paths, and distance to the top goal.

**Judge:** Whether a hold is stable enough, whether a movement is reachable, whether body weight is properly balanced, whether energy will last for remaining moves, and whether the climbing sequence is efficient.

**Act:** Reach for handholds, place feet on footholds, shift body weight and direction, pause to rest, choose a climbing sequence, and adjust balance.

**Read feedback:** The climber moves smoothly or lags, hands slip off holds, body becomes out‑of‑balance, energy drains quickly,

**Adjust:** If hands slip, grip the handhold. If balance breaks, shift weight to stabilize. If energy drops fast, pause to rest. If a move cannot be reached, re‑arrange feet or choose an alternate sequence.

**Ability improved through repetition:** Reading rock texture, selecting stable holds, managing energy, shifting weight efficiently, and mapping out a better climbing path.

## 4. Data Model for the System Graph

### Environment Data
- Handhold and foothold positions, hold size and texture, body distance from the wall, remaining energy, possible movement paths, and distance to the top goal.

### Player-Controlled Data
- Reach for handholds, place feet on footholds, shift body weight and direction, pause to rest, choose a climbing sequence, and adjust balance.

### System-Calculated Results
- The climber moves smoothly or lags, hands slip off holds, body becomes out‑of‑balance, energy drains quickly,

### Feedback Translation
- Hands slip: from handholds and friction; tells player that hands slip because the handhold is poor and smooth; appears as character leaning animation and creaking body sound.
- Body trembles: from the player's energy system; tells player that he/she is nearly exhausted; appears as trembling limb animation and heavy breathing audio.
- Body sway: from climber posture and weight; tells player balance is lost or unstable; appears as animation of body leaning and swaying, and soft shifting body sound.

## 5. Challenge Space
**Challenge factors (affecting player-controlled data):** Grip force ← rock friction, hold surface texture；
Body weight shift ← hold spacing, wall slope, hold size;
Climber energy ← route steepness, movement distance；
Route choice ← hold distribution, wall obstacles, steepness

**Factors that force a new judgment:** Slippery holds (grip fails unexpectedly), overhanging wall (shift weight), limited energy (must seek rest spots), tiny footholds (cannot rely on feet)

**Perceivable vs inferred factors:** Hold shape, hold positions, wall slope, foothold size are directly visible; grip friction and remaining energy must be inferred from slipping feedback and movement fatigue.

**Challenge dimension table:** Hold friction: grippy textured holds (easy) → slippery polished holds (hard); learn to weight hands carefully and avoid sudden pulls.
Wall angle: gentle sloped wall (easy) → steep overhanging wall (hard); learn to shift body weight and use feet to support mass.
Hold spacing: closely spaced holds (easy) → wide far‑apart holds (hard); learn dynamic movement and judge reach distance.

**2-3 progressive challenge combinations:** ① Gentle Warm‑up Wall (shallow slope + large grippy holds): climb simple upward path；
② Steep Slab Climb (moderate overhang + mixed‑size holds): pick between multiple valid paths; learn route selection and stamina management;
③ Slippery climb(heavy overhang + sparse slippery holds): reach far between few secure grips; learn dynamic moves and risk judgment.

**Simple-to-complex sequence:** Yes: Gentle Warm‑up Wall → Steep Slab Climb → Slippery climb, from single‑factor to multi‑factor.

**What failure teaches next:** Yes: slipping means poor weight distribution or low hold friction; quick energy drain means bad body positioning; falling short of a hold means misjudged reach.

## 6. Visual & Camera
**Camera perspective:** First‑person, to see holds, wall surface, hand‑reach distance and upcoming climbing path directly.

**Why this perspective fits the learning shift:** First‑person forces the player to judge reach distance, hold texture, and body weight directly;
First‑person delivers intuitive, immersive climbing experience. Players directly perceive reach distance and hold conditions

**2D / 2.5D / 3D:** 3D. A 3D view properly conveys wall depth, hold geometry, and spatial depth.

**Visual style:** Realistic, emphasizing tangible rock textures and details.

**Color tone:** Bright and cool: grey stone walls, muted shadows, highlighted climbing holds.

**Sound:** Sounds of gripping walls signal secure holds; scraping sounds warn of slipping; heavy breathing sounds; sparse tense atmosphere with minimal background music.

## 7. AI Collaboration Boundary
**Student-owned decisions (AI must not change):** Core mechanic (Climbing logic: grip‑weight‑balance), core learning shift, win/lose conditions, core variables (grip strength, body weight, hold stability).

**AI-autonomous decisions:** Technical implementation, code structure, visual polish, sound effects, level layout details.

**How to detect and pull back a generic game:** If the AI turns it into a simple jump‑and‑reach platformer, I would notice it lost the grip‑weight‑balance core climbing logic and ask to restore the hold‑strength and body‑position mechanics.

## 8. Rules, Boundaries, and Outcomes
**Important states:** Secure / slipping grip, balanced / off‑balanced body, rested / exhausted climber, reachable / out‑of‑reach hold, safe / fall‑prone position, firm / loose foothold.

**How player actions change the system:** Shifting body weight changes balance. Grabbing a hold changes grip strength and body position. Resting recovers energy. Pressing harder on footholds changes contact pressure. Moving quickly consumes energy and raises fall risk.

**Success condition:** Reach the summit hold while maintaining stable grip and balance, without falling.

**Failure conditions:** Lose grip and fall from the wall, run out of energy, run out of time, slip off footholds, cannot reach required holds, or lose balance and drop off the climbing route.

**Just-right ranges and thresholds:** Yes. The body tilt angle needs to be maintained within a balanced range. Excessive inclination can lead to instability, while being overly cautious can restrict the choice of movements. There is also a reasonable range for grasping strength. Too little strength can cause slipping, while too much strength can quickly run out of energy.

## 9. Feedback Priorities
**Immediate feedback:** Hand sliping and body swaying should appear immediately because they show direct consequences right after each movement.

**Feedback discovered over time:** Speed of climbing slowing down should appear after several climbing moves so players learn that poor positioning and energy can reduce climbing speed.

**Feedback that must be visual, spatial, audible, or state-based:** Hand slip should be visual and sound‑based; body sway should be shown through character posture and movement; energy drain should be shown through limb trembling and heavy breathing sound.

## 10. First Playable Version Scope
- Build a small desktop-browser game that validates one complete observe → judge → act → feedback → adjust loop.
- Use the accompanying system graph to implement 2-3 challenge presets when they are clearly defined. Each challenge should change system variables or relationships, not only visual decoration.
- Keep graphics simple and readable. Prioritize interaction, feedback, and learning over polish.
- Do not add realistic simulation, complex menus, accounts, online multiplayer, large asset pipelines, or unrelated features in the first version.
- Do not convert the project into a generic mini-game that only uses the domain as a theme.

## 11. Web Game Technical Dependencies and GitHub Pages

This project is published as a GitHub Pages site. The published site IS the exhibition. There is no ZIP packaging step and no separate offline build.

### GitHub Pages Publishing Rules
- The site is served from the repository root on the `main` branch, at `https://<username>.github.io/<repository-name>/`.
- Because GitHub Pages serves the site from a subpath, **every internal link and every asset path must be relative**. Root-absolute paths beginning with `/` will break on the published site even when they work locally.
- Store all required models, textures, audio, fonts, and libraries inside the repository. Do not load them from a CDN or another remote service.
- The repository is public. Never commit passwords, tokens, API keys, or personal information the student has not agreed to publish.
- After every push, the site republishes automatically. Verify the live URL, not only the local server.

### Choose the Lowest Necessary Dependency Track
1. **Track A - No build step:** Prefer HTML, CSS, plain JavaScript, and Canvas 2D for simple 2D games. This is the default choice and needs no extra configuration.
2. **Track B - Local vendored library:** For one small browser library, pin its version and store it under `assets/vendor/`.
3. **Track C - npm + build tool:** Use npm and Vite only for Three.js, multiple ES Modules, loaders, or other complex dependency graphs.

### Three.js and Vite Rules
- Three.js is allowed when 3D is important to the designed experience; do not replace meaningful 3D interaction only to avoid npm.
- Pin dependency versions in `package.json` and preserve `package-lock.json`.
- Configure Vite with a relative base such as `base: './'` so built assets work under the Pages subpath.
- Run `npm run build`, then copy the verified static output into the repository root so GitHub Pages serves it.
- Add a `.gitignore` that excludes `node_modules`. Never commit `node_modules`.
- Record dependency names, exact versions, licenses, build command, and output directory in `README.md`.

### Expected Repository Structure
```text
repository/
├── index.html                 # Project home: designer statement, system graph, play link
├── game.html                  # Playable game (or game/index.html)
├── process.html               # Human-AI development timeline
├── assets/                    # JS/CSS, system graph image, models, textures, audio, fonts
├── development-log/
│   └── agent-development-log.md
├── brief.md                   # This design and development specification
├── system-graph.png
├── ratings.csv                # Exported question-clarity ratings (teaching feedback)
├── README.md                  # How to run, controls, dependency track, main variables
└── source/                    # Track C only: src/, package.json, package-lock.json
```

## 12. Integrated Project Website Requirements
The website is the project space, not a final report and not a separate marketing page. It must exist from the first milestone and stay current as development progresses.

### Website From Day One
- Create the first version of `index.html` in the same pass as the first playable demo. Do not defer the website to the end of the project.
- The website is the exhibition surface: classmates and visitors will read it before or instead of playing, so it carries the designer statement, the system graph, and the play link.
- When the design changes, the website changes with it. A website that describes an older version of the game is worse than no website.

### Required Website Content
- **Game Idea:** project title, short concept, player goal, and core learning shift.
- **Domain Knowledge:** explain the real-world domain, novice misconception, expert judgment, and why this knowledge becomes playable.
- **System Design:** show the system graph and summarize environment data, player-controlled data, calculated results, feedback, success, failure, and challenge presets.
- **Development Process:** present a concise chronological timeline based on `agent-development-log.md`, including important changes, failures, tests, student decisions, and AI influence.
- **Play the Game:** the current playable version must be accessible from clear navigation and run directly in the website.

### Website Update Rules
- Create clear navigation among Home, Domain Knowledge / System Design, Development Process, and Play Game.
- Use only information supported by this brief, the system graph, the actual game, and the development log. Do not invent a smoother or more complete process.
- After every meaningful milestone, update the relevant website content and the development timeline.
- Keep the game idea and domain-learning explanation readable by classmates who have not seen the project before.
- Keep styling coherent across the informational pages and playable game, but prioritize clarity and function over decorative effects.
- Make the website usable on a typical student laptop. Mobile support is helpful but is not the first-version priority.
- Use relative links and asset paths. GitHub Pages serves the site from `https://<username>.github.io/<repository-name>/`, so root-absolute paths beginning with `/` will fail.
- Support a clean 1920×1080 exhibition view for display on an iMac. Important controls and text must fit without overlap.

## 13. Automatic Human-AI Development Log Protocol
In addition to building the website and game, maintain one Markdown file named `agent-development-log.md`. This file documents how the project develops through human-AI collaboration.

### Initialize the Log
At the beginning of development, create the file with:

```markdown
# Agent Development Log

- Project Title: Rock climbing on indoor climbing walls.
- Student / Team: Xinyuan Wang
- Domain: Rock climbing
- Core Learning Shift: Beginners think climbing means pulling yourself upward with arm strength. Experts know climbing means understanding the relationship among footholds, weight and energy, and movement sequences to move efficiently.
- Current Game Idea: I have tried indoor rock‑climbing several times. I found that climbing is not just about arm strength. It demands careful foot placement, body balance and route planning to finish a wall.

- AI Agent Used: Unity
- System Graph: add the image file or Canva link when available
- Development Period: add start and end dates
```

### Two Entry Types in One Timeline
Keep Raw Interaction Logs and Stage Reflections in chronological order in the same file. Do not separate them into two large sections.

#### A. Raw Interaction Log — Create Automatically
After every meaningful development interaction, append a short factual entry. A meaningful interaction includes implementation, debugging, code explanation that changes the project, mechanic or level changes, visual or audio changes, website updates, playtesting, or an AI suggestion that affects direction. Do not log casual clarification that produces no development change.

Use this format:

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## Interaction 01 — Raw Interaction Log

**Time:**
**Development Stage:**
**Current Goal:**

### Student Request
What the student asked the AI Agent to do.

### Agent Response Summary
What the Agent suggested, generated, explained, or changed.

### Development Action
What was actually implemented, modified, tested, or removed.

### Website Update
Which website section changed, or why no website update was needed.

### Files / Systems Changed
List files, mechanics, assets, data, UI, or challenge settings changed.

### Test and Immediate Result
What was tested and whether it worked, failed, partially worked, or remains uncertain.

### Student Decision / Follow-up
What the student accepted, rejected, modified, did not understand, or decided to try next.
```

#### B. Stage Reflection — Prompt the Student at Milestones
Do not fabricate student reflection. At a meaningful milestone—such as finishing the first playable loop, changing design direction, completing a challenge, or finishing a playtest stage—create a Reflection entry with factual fields, then explicitly ask the student to answer the Required Student Reflection.

Use this format:

```markdown
════════════════════════════════════
## Reflection 01 — Stage Reflection

**Time:**
**Covered Interactions:** Interaction 01–04
**Development Stage:**

### Goal of This Stage
### What Changed in the Playable Game and Website
### How AI Helped
### Student Decisions
### AI Influence on Design Direction
### Relationship to the Core Learning Shift
### Problems / Open Questions
### Next Step

### Required Student Reflection
Does the current game still help the player experience the intended domain-learning shift? What became stronger, weaker, or different? Which AI suggestion did you accept, reject, or change, and why?

> The AI Agent must ask the student to answer this section and must not answer it for them.
```

### Logging Rules
- Append new entries to the end of `agent-development-log.md` and continue Interaction and Reflection numbering.
- Be honest and specific. Record failures, partial results, misunderstandings, abandoned directions, and unresolved questions.
- Record when AI introduces a design direction, when the student rejects or modifies it, and when the student accepts code without fully understanding it.
- Separate factual development events from student reflection. Never invent student opinions or decisions.
- After milestone reflections, update the Development Process section of the website with a concise, truthful timeline summary.

## 14. GitHub Pages Exhibition

The exhibition is the published Pages site. No archive is packaged and nothing is uploaded to a shared drive.

### Enable GitHub Pages
1. Open the repository on GitHub.
2. `Settings` -> `Pages`.
3. Under Build and deployment, set Source to `Deploy from a branch`.
4. Branch: `main`, Folder: `/ (root)`. Save.
5. Wait a few minutes, then open `https://<username>.github.io/<repository-name>/`.

Every later push to `main` republishes the site automatically.

### Pre-Publish Audit
- Run the project through a local static HTTP server and test every navigation link, the playable game, controls, challenge selection, success, failure, and restart.
- Confirm every internal link and asset path is relative. Root-absolute paths are the most common cause of a Pages site that loads but shows nothing.
- Test the layout at 1920x1080 for exhibition display; text, controls, canvas, and navigation must not overlap.
- Confirm `node_modules`, caches, temporary files, passwords, tokens, and API keys are not committed.
- Push, then open the live Pages URL and repeat the navigation and gameplay test.

### What the Student Submits
- The GitHub Pages URL: the playable exhibition link.
- The repository URL.
- Nothing else. The repository is already public, so there is no upload step.

### Public Display
- The repository and the published site are public, because GitHub Pages requires a public repository on the free plan.
- Anything the student does not want published simply stays out of the repository.
- The student must confirm before publishing that `brief.md`, `ratings.csv`, and `development-log/agent-development-log.md` may be publicly visible.

## 15. Instructions for the AI Agent

1. **Index the workspace before planning anything.** List every file in the project folder, then read `brief.md` and `system-graph.png`. Report what you found: which files exist, what the brief specifies, and what is missing or contradictory. Do not write code before this step.
2. Restate the core learning shift, core loop, main variables, feedback mappings, and challenge presets in a short implementation plan.
3. Identify missing or contradictory information. Ask only questions that block the first playable version.
4. Propose the repository structure, then create the website skeleton (`index.html`, `game.html`, `process.html`, `assets/`) and initialize `development-log/agent-development-log.md`.
5. Implement the smallest complete game loop first, then add the defined challenge presets.
6. Keep variable names clear, and keep environment data, player-controlled data, and calculated results visibly separated in the code.
7. Add short comments only where a high-school student needs help understanding a rule.
8. **The first milestone must ship the playable demo and the first version of `index.html` together.** Never let the website fall behind the game, and never leave the site to the end of the project.
9. Start a local static server, test navigation and gameplay, and give the student the local URL and simple controls.
10. Automatically append a Raw Interaction Log after meaningful development work, and request student reflection at milestones.
11. After every milestone, update the website so its Development Process page matches the actual log.
12. Before the exhibition, run the pre-publish audit and confirm the live GitHub Pages URL works.

## 16. Acceptance Checklist
- [ ] The player can take a meaningful action within 30 seconds.
- [ ] Player actions visibly change system data or state.
- [ ] Important invisible data is translated into readable feedback.
- [ ] Success and failure conditions work and can be understood.
- [ ] A second attempt can improve because the player learned from feedback.
- [ ] Challenge presets differ through variables, relationships, information, or constraints.
- [ ] The game runs in a browser without a complex installation process.
- [ ] README.md identifies the dependency track and explains how to run, the controls, and the main variables.
- [ ] `index.html` existed from the first milestone and was kept current, not added at the end.
- [ ] The site clearly presents the game idea, domain knowledge, system design, development process, and playable game.
- [ ] `development-log/agent-development-log.md` contains chronological Interaction and Reflection entries.
- [ ] The Development Process page matches the actual log and does not hide failures or unfinished work.
- [ ] All internal links and assets use relative paths, because Pages serves from a subpath.
- [ ] The published GitHub Pages URL has been opened and tested at 1920x1080.
- [ ] No passwords, API keys, tokens, or `node_modules` are committed.
- [ ] The student has confirmed the brief, ratings, and development log may be publicly visible.
