# RoadReady 🚗

**A driving simulator for teens. Crash here, not out there.**

Play it: **https://vinisha231.github.io/road-ready/**

RoadReady is a free, browser-based driving sim aimed at new drivers.
No installs, no accounts, no build step — vanilla HTML/CSS/JS, a 2D canvas,
and three.js for the 3D view.

## 🪟 Behind the wheel (3D)

The default view puts you **in the driver's seat**: a 3D world with perspective
roads, a dashboard with a steering wheel that actually turns as you steer, an
analog speedometer needle, gas/brake pedal indicators, a gear readout, and
blinker arrows. Headlights carve through the dark, streetlights pool on the
asphalt, rain falls around the car, and traffic carries its own lights.

- **Premium digital cockpit.** A curved widescreen instrument cluster with a
  live lane-assist road animation, a big digital speed readout, gear, speed-limit
  sign and power/brake bars, plus a realistic leather steering wheel (metallic
  spokes, paddle shifters, hub badge) that turns as you steer and an ambient
  light strip — all of it day/night aware and reacting to braking and speeding.
- **Real 3D car models.** Pick from a Trainer Sedan (instant, procedural) or
  real downloaded GLB supercars — the **Scuderia GT** and blacked-out **GT Track
  Edition** (a real Ferrari mesh, Draco-compressed, recolored at runtime) and the
  **Hyper Concept** (Khronos CC-BY concept car). Models load lazily — you only
  download the car you actually pick. Each has **distinct handling**; speed/accel/
  grip bars show the trade-offs before you commit.
- **Rear-view + side mirrors.** Real rear-facing render passes show the world
  behind you, framed in chrome — check them before you change lanes.
- **C** toggles a chase camera if you want to see your car.
- **Gamepads and racing wheels** work via the Gamepad API (left stick / wheel
  steers, triggers / pedals for gas and brake). Mappings vary by hardware.
- Prefer the bird's-eye arcade view? Flip to **🚁 Top-down** on the main menu.
  Worst-moment replays always play out on the top-down "chopper cam."

## What's in it

### Real-ish physics
- Throttle, braking, reverse, speed-sensitive steering, and a lateral-grip tire model.
- Engine power tapers with speed — 0–30 is easy, 50–65 is a commitment.
- Rain cuts your grip almost in half **and** stretches your braking distance. Yes, you **will** slide if you take that turn at 47 mph in the rain.
- Handbrake, skid marks, tire screech, an engine note that follows your right foot, and a skid warning when the rear steps out.
- Brake lights, reverse lights, and turn signals (Q/E) — unsignaled merges cost points, because the blinker is the only telepathy your car has.
- Streetlights and oncoming headlights carve through the dark; rain splashes on the pavement; pedestrians pause at the curb before stepping out.

### Eight scenarios (each unlocks the next at 70+)
| # | Scenario | The lesson |
|---|----------|------------|
| 1 | 🅿️ Parking Lot Basics | Controls, checkpoints, first park |
| 2 | 🏫 School Zone | 20 means 20; kids appear from nowhere |
| 3 | 🛣️ Highway Merge | Match speed, find the gap, commit |
| 4 | 🔄 Roundabout | Yield, counterclockwise, 3rd exit |
| 5 | 🛑 Emergency Stop | Three surprise stops — the last one is wet |
| 6 | 🚧 Construction Zone | Cone taper, lane shift, judgmental barrels |
| 7 | 🌧️ Midnight Rain Run | Night + heavy rain + corners + deer |
| 8 | 🏁 Parallel Parking: The Final Boss | Infinite attempts. Grade: **Needs Improvement.** Always. It's tradition. |

### Educational without feeling like homework
- **Hazard perception** — kids, squirrels, deer, runaway carts and workers spawn from realistic blind spots. Stop in time for a bonus.
- **Distracted driving mode** — your phone buzzes mid-drive. Press P to peek (vision blurs, −8) or ignore it (+4). The group chat can wait.
- **Detailed scorecards** — speeding %, tailgating % ("you tailgated for 73% of that drive, impressive"), harsh braking, cone casualties, and a letter grade.

### The fun layer
- 🏆 **Local leaderboards** per scenario — beat your sibling, assert dominance.
- 🔓 **Unlock chain** — score 70+ to open the next scenario.
- 🎬 **Replay your worst moment** — your single most expensive mistake, replayed in slow motion with letterboxing. Comedy gold.
- 📤 **Share your score** (or your lowlight) via the system share sheet / clipboard.

### Parent / Instructor view
- Progress table per scenario (runs, best, last score).
- Aggregated **weak spots** with suggested practice scenarios.
- **Assign homework**: pin any scenario on the driver's menu (it unlocks immediately and clears when they score 70+).

## Controls

| Key | Action |
|-----|--------|
| ↑ / W | Accelerate |
| ↓ / S | Brake / reverse |
| ← → / A D | Steer |
| Space | Handbrake |
| Q / E | Left / right turn signal (they're scored!) |
| C | Cockpit ⇄ chase camera (3D mode) |
| P | Peek at your phone (don't) |
| R | Reset parking attempt |
| M | Mute |
| Esc | Pause |

Desktop + keyboard required.

## Run locally

```bash
git clone https://github.com/vinisha231/road-ready.git
cd road-ready
python3 -m http.server 8000   # or any static server
```

Open http://localhost:8000.

Progress, leaderboards, and assignments live in `localStorage` — clearing site data resets everything.

## Project structure

```
index.html              page shell + script load order
css/style.css           all styling (dark theme, HUD, screens)
js/
  util.js               math helpers + SAT collision for oriented boxes
  car.js                arcade-but-honest car physics (lateral grip model)
  world.js              roads, rings, props, marks, zones, surface queries
  weather.js            rain particles, grip loss, night + headlight cone
  scoring.js            event table, per-frame trackers, grades, feedback
  hazards.js            proximity-triggered actors (pedestrians.js)
  traffic.js            waypoint AI cars that brake for you
  phone.js              the distraction engine
  replay.js             worst-moment recorder & slow-mo playback
  leaderboard.js        local top-10 per scenario
  unlocks.js            70+ progression chain
  parent.js             instructor dashboard & homework assignment
  ui.js / main.js       DOM screens, HUD, state machine, game loop
  renderer3d.js         three.js first-person world built from the same data
  cockpit.js            steering wheel, gauge, pedals, gear, blinker overlay
  audio.js              zero-asset WebAudio engine hum and blips
  scenarios/            one file per scenario, registered in base.js
vendor/three.module.min.js   three.js r160, vendored — no CDN dependency
```

The 3D mode renders the exact same scenario data as the 2D view — the ground
plane is literally baked by the 2D road-painting code, so both views always
agree about the world. One build step? Still zero.

## Disclaimer

RoadReady is not a substitute for actual driver's education, supervised practice,
or your state's licensing requirements. It is, however, significantly cheaper,
and nobody real gets hurt when you meet a cone.
