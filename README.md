# Mirmo Trading Cards, Indian Style

A 50-card collectible series of abstract Indigenous art trading cards.

- Double-sided design: front artwork (with a Legendary enchanted glow for specials) and a back for stats and abilities.
- Themes: Traditional activities (spear fishing, canoe carving, bow hunting), historical figures (Sacagawea, Lozen, Running Eagle, chiefs), Spirit Animals with Nature/Beauty/Strength/Spirit Power levels.
- Rarity: Standard, Legendary (enchanted glow).

## Play Spellflight

Spellflight is a static browser game in [`game/`](game/index.html). It uses the series roster, the charcoal / parchment / antique-gold palette, and original card fronts painted in the browser (this repo did not include image files).

1. **The source.** A huge pulsing ball of bad energy fills the view. Steer a beam with a finger, the mouse, the arrow keys, or a gamepad. The ball is made of pieces. The target is the source, the weak knot inside. Hold the beam on it until it burns through. Three hits, three explosions, then the broom.
2. **Grove flight.** The view is from the rider's eyes: hands, handle, and the front of the broom sit in the lower part of the screen. Fly a forest path at speed, shoot cosmic bolts at demons, and thread the trees. Press `C` or View for a close chase camera. The night sky is dense with stars, and nebula light shows through the canopy. **Fly now** on the title skips the source. `?stage=2` (also `?stage=flight`) opens straight into the grove.

Each of the three chosen cards grants one spell during the first stage. Sound is synthesized in the browser. No audio files.

Footer line on the gallery and the game: Apps, not investments.

## Run locally

The game uses ES modules, so open it through a local server rather than a `file://` URL.

```bash
python3 -m http.server 8080
```

- Gallery: http://localhost:8080/
- Game: http://localhost:8080/game/

Rules tests:

```bash
node --test game/test/sim.test.mjs
```

## GitHub Pages

The site is a static root. In the repository settings, open **Pages → Build and deployment → Deploy from a branch**, choose `main` and `/ (root)`, and save.

- Gallery: https://mirmobe.github.io/Mirmo-Trading-Cards/
- Game: https://mirmobe.github.io/Mirmo-Trading-Cards/game/

`.nojekyll` is included so Pages serves the game files as they are. Three.js lives in `game/vendor/` (MIT, Three.js authors) and does not need a build step.

## Controls

| Action | Touch | Keyboard | Gamepad |
| --- | --- | --- | --- |
| Aim the beam / steer the broom | Drag | Arrows or WASD | Left stick |
| Skip to the grove | Fly now | — | — |
| Cast spell 1–3 | Spell buttons | 1 2 3 | West, north, east |
| Shoot | Hold on the screen, or Shoot | Space or J | A or right trigger |
| Cockpit / chase | View | C | — |
| Pause | Pause | P or Escape | Start |
| Mute | Sound | M | — |

## Cards overview (1–50)

- 001–020: Activities and early figures
- 021–030: Legendary specials (Shapeshifter, Dreamwalker, Astral Walker, Telepath, Wind Talker) and historical women
- 031–050: More spirit animals (Buffalo, Raven, and others) and activities (Canoe Carver, Bow Hunter)

The playable deck is the featured twelve: 021–029, 031 Buffalo Spirit, 032 Raven Spirit, and 034 Canoe Carver.

Created by Mirmobe.
