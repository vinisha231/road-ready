# RoadReady 🚗

**A driving simulator for teens. Crash here, not out there.**

Play it: **https://vinisha231.github.io/road-ready/**

RoadReady is a free, browser-based, top-down driving sim aimed at new drivers.
No installs, no accounts, no build step — just vanilla HTML/CSS/JS and a canvas.

## What's in it

### Real-ish physics
- Throttle, braking, reverse, speed-sensitive steering, and a lateral-grip tire model.
- Rain cuts your grip almost in half. Yes, you **will** slide if you take that turn at 47 mph in the rain.
- Handbrake, skid marks, and a skid warning when the rear steps out.

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
| P | Peek at your phone (don't) |
| R | Reset parking attempt |
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

## Disclaimer

RoadReady is not a substitute for actual driver's education, supervised practice,
or your state's licensing requirements. It is, however, significantly cheaper,
and nobody real gets hurt when you meet a cone.
