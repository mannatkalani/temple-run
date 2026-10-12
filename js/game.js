/**
 * TEMPLE RUN: GOLDEN CHASM - MASTER GAME CONTROLLER
 * Coordinates Three.js render loop, state machine, collision detection, HUD, and audio.
 */

const STATE = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAMEOVER: 'GAMEOVER'
};

class Game {
  constructor() {
    this.state = STATE.MENU;

    // Canvas & Container
    this.canvas = document.getElementById('game-canvas');
    this.container = document.getElementById('game-container');

    // High Score Persistence
    this.highScore = 0;
    try {
      this.highScore = parseInt(localStorage.getItem('temple_run_highscore') || '0', 10);
    } catch (e) {}

    // Gameplay Metrics
    this.score = 0;
    this.coins = 0;
    this.distance = 0;
    this.baseSpeed = 22.0;
    this.currentSpeed = this.baseSpeed;
    this.maxSpeed = 48.0;
    this.baseMultiplier = 1.0;

    // Power-up Active State
    this.activePowerup = null; // 'magnet', 'shield', 'multiplier'
    this.powerupTimer = 0;
    this.powerupMaxDuration = 10;

    // Temporary Invulnerability buffer (after shield breaks)
    this.invulnerableTimer = 0;

    // Camera Effects
    this.cameraShake = 0;
    this.baseFov = 65;

    // DOM Elements Cache
    this.initDOMElements();

    // Three.js Engine Setup
    this.initThree();

    // Game Systems
    this.particles = new ParticleSystem(this.scene);
    this.player = new Player(this.scene, this.particles);
    this.track = new TrackManager(this.scene, this.particles);

    // Controls & Event Listeners
    this.initControls();
    this.updateHighScoreDisplay();

    // Clock
    this.clock = new THREE.Clock();
    this.lastTime = performance.now();

    // Window Resize Handling
    window.addEventListener('resize', () => this.onResize());

    // Start Master Render Loop
    requestAnimationFrame((t) => this.loop(t));
  }

  initDOMElements() {
    this.hud = document.getElementById('hud');
    this.hudScore = document.getElementById('hud-score');
    this.hudCoins = document.getElementById('hud-coins');
    this.hudDistance = document.getElementById('hud-distance');
    this.hudMultiplier = document.getElementById('hud-multiplier');
    this.hudMultiplierBadge = document.getElementById('hud-multiplier-badge');
    this.speedFx = document.getElementById('speed-fx');

    this.powerupBar = document.getElementById('active-powerup-bar');
    this.powerupIcon = document.getElementById('powerup-icon');
    this.powerupName = document.getElementById('powerup-name');
    this.powerupFill = document.getElementById('powerup-progress-fill');

    this.screenStart = document.getElementById('screen-start');
    this.screenPause = document.getElementById('screen-pause');
    this.screenGameOver = document.getElementById('screen-gameover');

    this.startHighScoreEl = document.getElementById('start-high-score');
    this.finalScoreEl = document.getElementById('final-score');
    this.finalHighScoreEl = document.getElementById('final-high-score');
    this.finalDistanceEl = document.getElementById('final-distance');
    this.finalCoinsEl = document.getElementById('final-coins');
    this.newHighScoreTag = document.getElementById('new-high-score-tag');
    this.deathCauseEl = document.getElementById('death-cause-text');

    this.soundStatusLabel = document.getElementById('sound-status-label');
    this.soundStatusIcon = document.getElementById('sound-status-icon');
  }

  initThree() {
    // 1. Scene with Rich Ancient Temple Atmosphere
    this.scene = new THREE.Scene();
    
    // Deep mystical charcoal-gold fog
    this.scene.background = new THREE.Color(0x0a0907);
    this.scene.fog = new THREE.FogExp2(0x0a0907, 0.016);

    // 2. Camera Setup
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(this.baseFov, aspect, 0.1, 350);
    this.cameraDefaultPos = new THREE.Vector3(0, 3.8, 6.2);
    this.cameraTargetLook = new THREE.Vector3(0, 1.6, -10.0);
    this.camera.position.copy(this.cameraDefaultPos);
    this.camera.lookAt(this.cameraTargetLook);

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. Lighting Rig
    // Ambient light - deep bronze warmth
    const ambientLight = new THREE.AmbientLight(0x282015, 1.4);
    this.scene.add(ambientLight);

    // Warm golden directional moonlight / temple skylight
    this.dirLight = new THREE.DirectionalLight(0xffdf88, 1.6);
    this.dirLight.position.set(10, 24, 12);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 60;
    this.dirLight.shadow.camera.left = -10;
    this.dirLight.shadow.camera.right = 10;
    this.dirLight.shadow.camera.top = 20;
    this.dirLight.shadow.camera.bottom = -10;
    this.scene.add(this.dirLight);

    // Deep chasm abyss rim light from below
    const chasmLight = new THREE.DirectionalLight(0x402500, 0.8);
    chasmLight.position.set(-10, -15, -20);
    this.scene.add(chasmLight);
  }

  // --- Input & Controls ---

  initControls() {
    // Keyboard Listeners
    window.addEventListener('keydown', (e) => {
      // Audio warmup on user action
      window.soundEngine.ensureContext();

      if (this.state === STATE.MENU) {
        if (e.code === 'Space' || e.code === 'Enter') {
          this.startGame();
        }
        return;
      }

      if (this.state === STATE.GAMEOVER) {
        if (e.code === 'Space' || e.code === 'Enter') {
          this.restartGame();
        }
        return;
      }

      if (e.code === 'KeyP' || e.code === 'Escape') {
        this.togglePause();
        return;
      }

      if (this.state !== STATE.PLAYING) return;

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.player.shiftLeft();
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.player.shiftRight();
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'Space':
          e.preventDefault();
          this.player.jump();
          break;
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          this.player.slide();
          break;
      }
    });

    // Touch / Swipe Gestures on Screen
    let touchStartX = 0;
    let touchStartY = 0;
    const minSwipeDist = 30;

    window.addEventListener('touchstart', (e) => {
      window.soundEngine.ensureContext();
      if (e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (this.state !== STATE.PLAYING) return;
      if (e.changedTouches.length === 0) return;

      const diffX = e.changedTouches[0].clientX - touchStartX;
      const diffY = e.changedTouches[0].clientY - touchStartY;

      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal Swipe
        if (diffX > minSwipeDist) {
          this.player.shiftRight();
        } else if (diffX < -minSwipeDist) {
          this.player.shiftLeft();
        }
      } else {
        // Vertical Swipe
        if (diffY < -minSwipeDist) {
          this.player.jump();
        } else if (diffY > minSwipeDist) {
          this.player.slide();
        }
      }
    }, { passive: true });

    // On-screen Touch Button Handlers
    const bindTouchBtn = (id, action) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          window.soundEngine.ensureContext();
          if (this.state === STATE.PLAYING) action();
        });
      }
    };
    bindTouchBtn('touch-left', () => this.player.shiftLeft());
    bindTouchBtn('touch-right', () => this.player.shiftRight());
    bindTouchBtn('touch-up', () => this.player.jump());
    bindTouchBtn('touch-down', () => this.player.slide());

    // Button Bindings
    document.getElementById('btn-play').addEventListener('click', () => {
      window.soundEngine.ensureContext();
      this.startGame();
    });

    document.getElementById('btn-pause').addEventListener('click', () => {
      this.togglePause();
    });

    document.getElementById('btn-resume').addEventListener('click', () => {
      this.togglePause();
    });

    document.getElementById('btn-restart-pause').addEventListener('click', () => {
      this.restartGame();
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
      window.soundEngine.ensureContext();
      this.restartGame();
    });

    document.getElementById('btn-menu').addEventListener('click', () => {
      this.showMenu();
    });

    // Sound Toggle Button
    const btnSound = document.getElementById('btn-toggle-sound');
    btnSound.addEventListener('click', () => {
      window.soundEngine.ensureContext();
      const unmuted = window.soundEngine.toggleMute();
      this.updateSoundButtonUI(unmuted);
    });
    this.updateSoundButtonUI(!window.soundEngine.isMuted);
  }

  updateSoundButtonUI(isSoundOn) {
    if (this.soundStatusLabel) {
      this.soundStatusLabel.textContent = isSoundOn ? 'ON' : 'OFF';
    }
    if (this.soundStatusIcon) {
      this.soundStatusIcon.textContent = isSoundOn ? '🔊' : '🔇';
    }
  }

  updateHighScoreDisplay() {
    if (this.startHighScoreEl) {
      this.startHighScoreEl.textContent = this.highScore.toLocaleString();
    }
  }

  // --- Game State Transitions ---

  startGame() {
    this.state = STATE.PLAYING;
    this.score = 0;
    this.coins = 0;
    this.distance = 0;
    this.currentSpeed = this.baseSpeed;
    this.baseMultiplier = 1.0;
    this.invulnerableTimer = 0;
    this.activePowerup = null;

    this.player.reset();
    this.track.reset();
    this.particles.clear();

    // UI Updates
    this.screenStart.classList.add('hidden');
    this.screenPause.classList.add('hidden');
    this.screenGameOver.classList.add('hidden');
    this.hud.classList.remove('hidden');
    this.powerupBar.classList.add('hidden');

    window.soundEngine.startMusic();
  }

  restartGame() {
    this.startGame();
  }

  showMenu() {
    this.state = STATE.MENU;
    this.player.reset();
    this.track.reset();
    this.particles.clear();

    this.screenStart.classList.remove('active');
    this.screenStart.classList.remove('hidden');
    this.screenPause.classList.add('hidden');
    this.screenGameOver.classList.add('hidden');
    this.hud.classList.add('hidden');

    this.updateHighScoreDisplay();
    window.soundEngine.stopMusic();
  }

  togglePause() {
    if (this.state === STATE.PLAYING) {
      this.state = STATE.PAUSED;
      this.screenPause.classList.remove('hidden');
      window.soundEngine.stopMusic();
    } else if (this.state === STATE.PAUSED) {
      this.state = STATE.PLAYING;
      this.screenPause.classList.add('hidden');
      window.soundEngine.startMusic();
    }
  }

  triggerGameOver(cause = 'OVERCOME BY ANCIENT TRAPS') {
    if (this.state === STATE.GAMEOVER) return;
    this.state = STATE.GAMEOVER;

    this.player.crash();
    this.cameraShake = 0.55;
    window.soundEngine.stopMusic();

    // High Score Processing
    let isNewHigh = false;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      isNewHigh = true;
      try {
        localStorage.setItem('temple_run_highscore', this.highScore.toString());
      } catch (e) {}
    }

    // Populate Game Over screen stats
    this.deathCauseEl.textContent = cause;
    this.finalScoreEl.textContent = this.score.toLocaleString();
    this.finalHighScoreEl.textContent = this.highScore.toLocaleString();
    this.finalDistanceEl.textContent = `${Math.floor(this.distance)} m`;
    this.finalCoinsEl.textContent = this.coins.toLocaleString();

    if (isNewHigh) {
      this.newHighScoreTag.classList.remove('hidden');
    } else {
      this.newHighScoreTag.classList.add('hidden');
    }

    // Delay showing game over screen for 0.75s to showcase slow-motion tumble
    setTimeout(() => {
      this.screenGameOver.classList.remove('hidden');
      this.hud.classList.add('hidden');
    }, 750);
  }

  // --- Master Loop ---

  loop(currentTime) {
    requestAnimationFrame((t) => this.loop(t));

    const rawDt = (currentTime - this.lastTime) * 0.001;
    this.lastTime = currentTime;
    const dt = Math.min(rawDt, 0.1); // Guard against giant lag spikes

    if (this.state === STATE.PLAYING) {
      this.updatePlaying(dt);
    } else if (this.state === STATE.GAMEOVER) {
      // Slow-motion tumble
      this.player.update(dt * 0.4, this.currentSpeed * 0.2);
      this.particles.update(dt * 0.4, this.camera);
    } else if (this.state === STATE.MENU) {
      // Gentle menu idle camera bobbing
      const t = currentTime * 0.001;
      this.camera.position.x = Math.sin(t * 0.5) * 0.4;
      this.camera.position.y = 3.8 + Math.cos(t * 0.8) * 0.15;
      this.track.update(dt * 0.1, 4.0, this.player);
      this.particles.update(dt, this.camera);
    }

    // Camera shake decay & positioning
    this.updateCamera(dt);

    // Three.js Render
    this.renderer.render(this.scene, this.camera);
  }

  updatePlaying(dt) {
    // 1. Dynamic Speed Progression based on Distance
    this.distance += this.currentSpeed * dt * 0.5;
    this.currentSpeed = Math.min(this.maxSpeed, this.baseSpeed + (this.distance / 90) * 1.6);

    // Multiplier increases as distance grows
    this.baseMultiplier = 1.0 + Math.floor(this.distance / 150) * 0.5;
    const activeMultiplier = this.activePowerup === 'multiplier' ? this.baseMultiplier * 2.0 : this.baseMultiplier;

    // Score accumulation (passive distance score)
    this.score += Math.round(this.currentSpeed * dt * 4 * activeMultiplier);

    // Speed Lines Effect
    if (this.currentSpeed > 32.0) {
      this.speedFx.classList.add('active');
    } else {
      this.speedFx.classList.remove('active');
    }

    // 2. Power-up Timers
    if (this.activePowerup) {
      this.powerupTimer -= dt;
      const progress = Math.max(0, (this.powerupTimer / this.powerupMaxDuration) * 100);
      this.powerupFill.style.width = `${progress}%`;

      if (this.powerupTimer <= 0) {
        this.deactivatePowerup();
      }
    }

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }

    // 3. Update Systems
    this.player.update(dt, this.currentSpeed);
    this.track.update(dt, this.currentSpeed, this.player);
    this.particles.update(dt, this.camera);

    // 4. Collision Detection
    this.checkCollisions(activeMultiplier);

    // 5. Update HUD Displays
    this.updateHUD(activeMultiplier);
  }

  // --- Collision Detection System ---

  checkCollisions(activeMultiplier) {
    const playerPos = this.player.group.position;

    // A. Check Obstacles
    for (let obs of this.track.obstacles) {
      if (!obs.active) continue;

      // Get obstacle world Z
      const obsWorldPos = new THREE.Vector3();
      obs.mesh.getWorldPosition(obsWorldPos);

      // Only check obstacles in close Z proximity to runner (near z = 0)
      if (Math.abs(obsWorldPos.z - playerPos.z) < 1.0) {
        // Lateral lane check
        if (playerPos.x >= obs.minX - 0.25 && playerPos.x <= obs.maxX + 0.25) {
          
          let hasHit = false;

          if (obs.type === 'hurdle') {
            // Low barrier: Hit if player didn't jump over it (player y < maxY)
            if (playerPos.y < obs.maxY) {
              hasHit = true;
            }
          } else if (obs.type === 'low_ceiling') {
            // High overhead barrier: Hit if player is NOT sliding!
            if (!this.player.isSliding) {
              hasHit = true;
            }
          } else if (obs.type === 'wall') {
            // Full blockage monolith: Always hits if in lane
            hasHit = true;
          }

          if (hasHit) {
            this.handlePlayerCollision(obs);
            return;
          }
        }
      }
    }

    // B. Check Coins
    for (let coin of this.track.coins) {
      if (!coin.active) continue;

      const coinWorldPos = new THREE.Vector3();
      coin.mesh.getWorldPosition(coinWorldPos);

      const dist = coinWorldPos.distanceTo(playerPos);
      if (dist < 1.35) {
        // Collect Coin!
        coin.active = false;
        coin.mesh.visible = false;
        this.coins++;
        this.score += Math.round(50 * activeMultiplier);

        window.soundEngine.playCoin();
        this.particles.spawnCoinSparkles(coinWorldPos);
      }
    }

    // C. Check Power-ups
    for (let pup of this.track.powerups) {
      if (!pup.active) continue;

      const pupWorldPos = new THREE.Vector3();
      pup.mesh.getWorldPosition(pupWorldPos);

      const dist = pupWorldPos.distanceTo(playerPos);
      if (dist < 1.5) {
        // Collect Power-up!
        pup.active = false;
        pup.mesh.visible = false;
        this.activatePowerup(pup.type);
        this.particles.spawnCoinSparkles(pupWorldPos);
        window.soundEngine.playPowerup();
      }
    }
  }

  handlePlayerCollision(obs) {
    if (this.invulnerableTimer > 0) return; // Invulnerability buffer

    if (this.player.shieldActive) {
      // Shield absorbs collision!
      this.deactivatePowerup();
      this.invulnerableTimer = 1.2;
      this.cameraShake = 0.35;
      obs.active = false; // Disable obstacle hit
      window.soundEngine.playCrash();
      this.particles.spawnCrashDebris(this.player.group.position);
      return;
    }

    // Fatal Crash
    let causeText = 'OVERCOME BY ANCIENT TRAPS';
    if (obs.type === 'hurdle') causeText = 'TRIPPED OVER FLAMING TIMBER';
    if (obs.type === 'low_ceiling') causeText = 'STRUCK BY CRUMBLING ARCHWAY';
    if (obs.type === 'wall') causeText = 'SMASHED INTO OBSIDIAN MONOLITH';

    this.triggerGameOver(causeText);
  }

  // --- Power-up Management ---

  activatePowerup(type) {
    this.activePowerup = type;
    this.powerupTimer = (type === 'multiplier' ? 12 : 10);
    this.powerupMaxDuration = this.powerupTimer;

    this.powerupBar.classList.remove('hidden');

    if (type === 'magnet') {
      this.powerupIcon.textContent = '🧲';
      this.powerupName.textContent = 'GOLD MAGNET';
      this.player.setMagnet(true);
      this.player.setShield(false);
    } else if (type === 'shield') {
      this.powerupIcon.textContent = '🛡️';
      this.powerupName.textContent = 'GOLDEN SHIELD';
      this.player.setShield(true);
      this.player.setMagnet(false);
    } else if (type === 'multiplier') {
      this.powerupIcon.textContent = '✨';
      this.powerupName.textContent = '2X MULTIPLIER';
      this.player.setShield(false);
      this.player.setMagnet(false);
    }
  }

  deactivatePowerup() {
    this.activePowerup = null;
    this.powerupTimer = 0;
    this.powerupBar.classList.add('hidden');
    this.player.setMagnet(false);
    this.player.setShield(false);
  }

  // --- HUD Updates ---

  updateHUD(activeMultiplier) {
    this.hudScore.textContent = this.score.toString().padStart(6, '0');
    this.hudCoins.textContent = this.coins.toLocaleString();
    this.hudDistance.innerHTML = `${Math.floor(this.distance)}<small>m</small>`;
    this.hudMultiplier.textContent = `${activeMultiplier.toFixed(1)}x`;
  }

  // --- Camera Rig Update ---

  updateCamera(dt) {
    if (this.state === STATE.PLAYING || this.state === STATE.GAMEOVER) {
      // Dynamic camera tracking: camera tracks player's X smoothly with slight lag
      const targetCamX = this.player.x * 0.42;
      this.camera.position.x += (targetCamX - this.camera.position.x) * 10.0 * dt;

      // Camera Y follows jumping slightly with damping
      const targetCamY = 3.8 + this.player.y * 0.4;
      this.camera.position.y += (targetCamY - this.camera.position.y) * 8.0 * dt;

      // Dynamic FOV widening with speed
      const targetFov = this.baseFov + (this.currentSpeed - this.baseSpeed) * 0.35;
      if (Math.abs(this.camera.fov - targetFov) > 0.1) {
        this.camera.fov += (targetFov - this.camera.fov) * 5.0 * dt;
        this.camera.updateProjectionMatrix();
      }
    }

    // Camera Shake Effect
    if (this.cameraShake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake * 0.6;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShake * 0.6;
      this.cameraShake -= 2.0 * dt;
      if (this.cameraShake < 0) this.cameraShake = 0;
    }
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }
}

// Start Game Engine when window finishes loading
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
