# Temple Run: Golden Chasm 🏃‍♂️✨

A high-performance, full-featured 3D endless runner web game built purely with **HTML5, CSS3, and JavaScript** utilizing **Three.js** (via CDN) and the **Web Audio API**.

---

## 🏛️ Visual Theme: Black & Gold

The game features an opulent ancient temple aesthetic:
- **Obsidian Black Slabs & Monoliths**: Deep, rich textures with subtle metallic specular sheen.
- **Burnished Ancient Gold Trims**: Carved balustrades, glowing runic floor inlays, and decorative capitals.
- **Volumetric Golden Fog & Lighting**: Deep bronze ambient lighting paired with warm torch point lights and directional moonlight.
- **Floating Chasm Architecture**: Towering ruined columns and cosmic golden dust motes floating in the abyss.
- **Cinzel & Outfit Typography**: Ancient Roman luxury serif for titles with ultra-clean modern numerals for the HUD.

---

## 🎮 How to Play

### Controls
| Action | Keyboard | Touch / Mobile |
| :--- | :--- | :--- |
| **Shift Lane Left** | `A` or `←` | Swipe Left or Tap `◀ LEFT` |
| **Shift Lane Right** | `D` or `→` | Swipe Right or Tap `▶ RIGHT` |
| **Jump Over Obstacles** | `W`, `↑`, or `Space` | Swipe Up or Tap `▲ JUMP` |
| **Slide Under Obstacles** | `S` or `↓` | Swipe Down or Tap `▼ SLIDE` |
| **Pause Game** | `P` or `Esc` | Tap Pause Button in HUD |

---

## ⚡ Game Features & Mechanics

1. **Endless Track & Dynamic Difficulty**:
   - Endless procedural track chunks recycled seamlessly ahead of the player.
   - Dynamic acceleration: speed increases gradually as distance grows, up to 48 m/s with camera speed lines effect.
   - Score multiplier increases automatically with distance survived.

2. **Articulated 3D Runner Model**:
   - Stylized adventurer character with fedora hat, gold trim vest, explorer backpack, vambraces, and knee guards.
   - Sinusoidal running gait cycle with synchronized arm swings, leg strides, and footstep sound effects.
   - Dynamic jump arc with real-time scaling floor shadow.
   - Low slide animation enabling evasion under overhead archways.
   - Lateral banking tilt when switching lanes.
   - Ragdoll crash tumble upon collision.

3. **Obstacles**:
   - **Flaming Hurdles**: Low burning logs and spike rollers spanning lanes — **Jump** over them.
   - **Crumbling Archways**: Low stone lintels with hanging golden spikes — **Slide** under them.
   - **Obsidian Monoliths & Double Blocks**: Massive carved sarcophagi blocking lanes — **Dodge** sideways into the safe escape lane.

4. **Collectibles & Power-Ups**:
   - **Ancient Gold Coins**: Faceted rotating medallions placed in lines and jumping arcs. Pickups award bonus points with escalating pentatonic chime notes!
   - **🧲 Gold Magnet**: Attracts all nearby coins directly to the runner.
   - **🛡️ Golden Shield**: Grants an energetic forcefield bubble that absorbs one fatal collision.
   - **✨ 2x Multiplier**: Doubles all distance and coin points for 12 seconds.

5. **Self-Contained Procedural Audio (Web Audio API)**:
   - Dynamic tribal percussion rhythm (synthesized bass kicks, syncopated toms, shakers, and ambient drone pad).
   - Crisp procedural sound effects: footsteps, jump whoosh, slide friction, crystalline coin chimes, shield hum, and stone smash impact boom.
   - Sound toggle button with persistent state stored in `localStorage`.

6. **Persistent High Scores**:
   - Highest score automatically preserved across browser sessions via `localStorage`.

---

## 🚀 Running the Game Locally

Start any local web server in this directory, for example:

```bash
# Python 3
python3 -m http.server 8000
```

Then open your browser to:
```
http://localhost:8000
```
