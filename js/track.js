/**
 * TEMPLE RUN: GOLDEN CHASM - TRACK & ENVIRONMENT GENERATOR
 * Endless procedural temple causeway with black & gold architecture, obstacles, coins, and power-ups.
 */

class TrackManager {
  constructor(scene, particleSystem) {
    this.scene = scene;
    this.particles = particleSystem;

    // Track Geometry Configuration
    this.CHUNK_LENGTH = 30.0;
    this.NUM_CHUNKS = 8;
    this.TOTAL_SPAN = this.CHUNK_LENGTH * this.NUM_CHUNKS; // 240 units ahead
    this.LANE_WIDTH = 2.4;
    this.LANES = [-this.LANE_WIDTH, 0, this.LANE_WIDTH];

    // Shared Materials for Black & Gold Theme
    this.initMaterials();

    // Collection Pools
    this.chunks = [];
    this.obstacles = [];
    this.coins = [];
    this.powerups = [];

    // Torch light animation tracking
    this.torches = [];

    // Track generation metrics
    this.distanceTraveled = 0;
    this.spawnZ = 0;

    // Build Initial World
    this.initTrack();
  }

  initMaterials() {
    // 1. Dark Obsidian Stone Floor Slab
    this.floorMat = new THREE.MeshStandardMaterial({
      color: 0x111115,
      roughness: 0.7,
      metalness: 0.2
    });

    // 2. Burnished Gold Inlay & Trim
    this.goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xdfb743,
      roughness: 0.25,
      metalness: 0.85,
      emissive: 0x2b2106,
      emissiveIntensity: 0.2
    });

    // 3. Glowing Golden Rune Material
    this.runeMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.8
    });

    // 4. Temple Pillar Stone
    this.pillarMat = new THREE.MeshStandardMaterial({
      color: 0x16161c,
      roughness: 0.6,
      metalness: 0.25
    });

    // 5. Obstacle Materials
    this.obstacleMat = new THREE.MeshStandardMaterial({
      color: 0x1e1e24,
      roughness: 0.5,
      metalness: 0.4
    });

    this.spikeMat = new THREE.MeshStandardMaterial({
      color: 0xe0ad36,
      roughness: 0.2,
      metalness: 0.9,
      emissive: 0x3d2903,
      emissiveIntensity: 0.3
    });

    this.flameWoodMat = new THREE.MeshStandardMaterial({
      color: 0x241708,
      roughness: 0.9,
      emissive: 0xff5500,
      emissiveIntensity: 0.4
    });

    // 6. Coin Material (Glossy gleaming gold)
    this.coinMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.15,
      metalness: 0.95,
      emissive: 0x4a3c05,
      emissiveIntensity: 0.3
    });

    // Shared Geometries
    this.coinGeo = this.createCoinGeometry();
  }

  createCoinGeometry() {
    // Octagonal faceted ancient coin
    const geo = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 8);
    geo.rotateX(Math.PI / 2);
    return geo;
  }

  initTrack() {
    // Generate consecutive chunks spanning forward from z = 15 down to -225
    for (let i = 0; i < this.NUM_CHUNKS; i++) {
      const zPos = 15 - i * this.CHUNK_LENGTH;
      // First 3 chunks (~90m) are a safe runway with glittering coins to build momentum
      const isStartSafeZone = i < 3;
      const chunk = this.createChunk(zPos, isStartSafeZone);
      this.chunks.push(chunk);
    }

    // Build distant atmospheric background scenery (floating monoliths & golden star dust)
    this.createBackgroundAtmosphere();
  }

  createBackgroundAtmosphere() {
    // 1. Distant towering monolithic ruins in the abyss fog
    const bgGroup = new THREE.Group();
    const monolithGeo = new THREE.BoxGeometry(6, 45, 6);
    const monolithMat = new THREE.MeshStandardMaterial({
      color: 0x0c0b10,
      roughness: 0.8,
      metalness: 0.1
    });

    const goldRuneMat = new THREE.MeshBasicMaterial({
      color: 0xdfb743,
      transparent: true,
      opacity: 0.35
    });

    // Scatter 12 massive distant ruins
    for (let i = 0; i < 12; i++) {
      const x = (i % 2 === 0 ? -1 : 1) * (18 + Math.random() * 25);
      const z = -20 - Math.random() * 180;
      const y = -10 + Math.random() * 8;

      const mono = new THREE.Mesh(monolithGeo, monolithMat);
      mono.position.set(x, y, z);
      mono.rotation.y = Math.random() * Math.PI;
      bgGroup.add(mono);

      // Distant glowing rune ring on monolith
      const ringGeo = new THREE.BoxGeometry(6.2, 1.2, 6.2);
      const ring = new THREE.Mesh(ringGeo, goldRuneMat);
      ring.position.set(x, y + 8, z);
      bgGroup.add(ring);
    }
    this.scene.add(bgGroup);

    // 2. Mystic golden dust motes floating in the abyss
    const starCount = 600;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = -5 + Math.random() * 30;
      positions[i * 3 + 2] = 20 - Math.random() * 260;

      // Golden amber hues
      colors[i * 3] = 0.95 + Math.random() * 0.05;
      colors[i * 3 + 1] = 0.75 + Math.random() * 0.2;
      colors[i * 3 + 2] = 0.25;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });

    this.starPoints = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starPoints);
  }

  // --- Chunk Construction ---

  createChunk(zPos, isSafe) {
    const chunkGroup = new THREE.Group();
    chunkGroup.position.z = zPos;

    // 1. Causeway Floor Slabs
    const floorWidth = 8.6;
    const floorGeo = new THREE.BoxGeometry(floorWidth, 0.8, this.CHUNK_LENGTH);
    const floorMesh = new THREE.Mesh(floorGeo, this.floorMat);
    floorMesh.position.y = -0.4;
    floorMesh.receiveShadow = true;
    chunkGroup.add(floorMesh);

    // 2. Gold Side Trims & Balustrades
    const trimGeo = new THREE.BoxGeometry(0.35, 0.25, this.CHUNK_LENGTH);
    const leftTrim = new THREE.Mesh(trimGeo, this.goldTrimMat);
    leftTrim.position.set(-floorWidth / 2 + 0.18, 0.05, 0);
    chunkGroup.add(leftTrim);

    const rightTrim = new THREE.Mesh(trimGeo, this.goldTrimMat);
    rightTrim.position.set(floorWidth / 2 - 0.18, 0.05, 0);
    chunkGroup.add(rightTrim);

    // 3. Glowing Floor Runes (Inlaid golden lines separating lanes)
    const lineGeo = new THREE.PlaneGeometry(0.08, this.CHUNK_LENGTH);
    lineGeo.rotateX(-Math.PI / 2);
    
    const leftLine = new THREE.Mesh(lineGeo, this.runeMat);
    leftLine.position.set(-this.LANE_WIDTH / 2, 0.01, 0);
    chunkGroup.add(leftLine);

    const rightLine = new THREE.Mesh(lineGeo, this.runeMat);
    rightLine.position.set(this.LANE_WIDTH / 2, 0.01, 0);
    chunkGroup.add(rightLine);

    // Center decorative diamond runes
    for (let rz = -this.CHUNK_LENGTH / 2 + 3; rz < this.CHUNK_LENGTH / 2; rz += 6) {
      const diamondGeo = new THREE.PlaneGeometry(0.6, 0.6);
      diamondGeo.rotateX(-Math.PI / 2);
      diamondGeo.rotateY(Math.PI / 4);
      const diamondMesh = new THREE.Mesh(diamondGeo, this.runeMat);
      diamondMesh.position.set(0, 0.012, rz);
      chunkGroup.add(diamondMesh);
    }

    // 4. Temple Pillars & Torches along the sides
    const pillarSpacing = 15;
    for (let pz = -this.CHUNK_LENGTH / 2 + 7.5; pz < this.CHUNK_LENGTH / 2; pz += pillarSpacing) {
      this.addPillarAndTorch(chunkGroup, -floorWidth / 2 - 0.7, pz);
      this.addPillarAndTorch(chunkGroup, floorWidth / 2 + 0.7, pz);
    }

    // 5. Overhead Grand Archway on some chunks
    if (Math.random() < 0.35) {
      this.addOverheadArchway(chunkGroup, 0);
    }

    this.scene.add(chunkGroup);

    // Dynamic objects belonging to this chunk
    const chunkData = {
      group: chunkGroup,
      obstacles: [],
      coins: [],
      powerups: []
    };

    // Spawn gameplay elements if not in initial spawn safe zone
    if (!isSafe) {
      this.populateChunkGameplay(chunkData, zPos);
    }

    return chunkData;
  }

  addPillarAndTorch(chunkGroup, x, z) {
    // Towering Column
    const pillarHeight = 7.0;
    const pillarGeo = new THREE.CylinderGeometry(0.6, 0.75, pillarHeight, 8);
    const pillarMesh = new THREE.Mesh(pillarGeo, this.pillarMat);
    pillarMesh.position.set(x, pillarHeight / 2 - 0.4, z);
    chunkGroup.add(pillarMesh);

    // Golden Capital & Base
    const capGeo = new THREE.BoxGeometry(1.6, 0.4, 1.6);
    const topCap = new THREE.Mesh(capGeo, this.goldTrimMat);
    topCap.position.set(x, pillarHeight - 0.2, z);
    chunkGroup.add(topCap);

    // Golden Brazier Torch Bowl
    const bowlGeo = new THREE.CylinderGeometry(0.45, 0.2, 0.4, 8);
    const bowlMesh = new THREE.Mesh(bowlGeo, this.goldTrimMat);
    bowlMesh.position.set(x, pillarHeight + 0.2, z);
    chunkGroup.add(bowlMesh);

    // Torch Flame Core (Emissive sphere)
    const flameGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const flameMesh = new THREE.Mesh(flameGeo, flameMat);
    flameMesh.position.set(x, pillarHeight + 0.45, z);
    chunkGroup.add(flameMesh);

    // Ambient Torch Point Light (Subtle flicker)
    const torchLight = new THREE.PointLight(0xffaa22, 1.0, 18);
    torchLight.position.set(x, pillarHeight + 0.5, z);
    chunkGroup.add(torchLight);

    this.torches.push({ light: torchLight, baseIntensity: 1.0, seed: Math.random() * 100 });
  }

  addOverheadArchway(chunkGroup, z) {
    const archGroup = new THREE.Group();
    archGroup.position.set(0, 0, z);

    // Lintels spanning high above the road (safe height ~ 4.5m)
    const lintelGeo = new THREE.BoxGeometry(10.2, 1.0, 1.4);
    const lintelMesh = new THREE.Mesh(lintelGeo, this.obstacleMat);
    lintelMesh.position.y = 5.2;
    archGroup.add(lintelMesh);

    const goldBandGeo = new THREE.BoxGeometry(10.4, 0.25, 1.45);
    const goldBand = new THREE.Mesh(goldBandGeo, this.goldTrimMat);
    goldBand.position.y = 5.3;
    archGroup.add(goldBand);

    // Golden temple emblem at center of arch
    const crestGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.3, 8);
    crestGeo.rotateX(Math.PI / 2);
    const crestMesh = new THREE.Mesh(crestGeo, this.goldTrimMat);
    crestMesh.position.set(0, 5.2, 0.75);
    archGroup.add(crestMesh);

    chunkGroup.add(archGroup);
  }

  // --- Gameplay Spawning: Obstacles, Coins, Power-ups ---

  populateChunkGameplay(chunkData, chunkZ) {
    // Generate 1 or 2 obstacle encounters in this chunk
    const encounterPositions = [-this.CHUNK_LENGTH * 0.3, this.CHUNK_LENGTH * 0.25];
    
    encounterPositions.forEach(localZ => {
      // 70% chance of an obstacle encounter
      if (Math.random() < 0.72) {
        this.spawnObstacleEncounter(chunkData, localZ);
      } else {
        // High density coin trail or power-up in clear sections
        if (Math.random() < 0.3) {
          this.spawnPowerup(chunkData, localZ);
        } else {
          this.spawnCoinTrail(chunkData, localZ, Math.floor(Math.random() * 3) - 1, 6);
        }
      }
    });
  }

  spawnObstacleEncounter(chunkData, localZ) {
    const types = ['jump_log', 'slide_arch', 'monolith_block', 'double_block'];
    const chosenType = types[Math.floor(Math.random() * types.length)];

    if (chosenType === 'jump_log') {
      // A flaming hurdle across 1, 2, or all 3 lanes that must be JUMPED over
      const spanAll = Math.random() < 0.55;
      if (spanAll) {
        // Full width hurdle
        const hurdleGeo = new THREE.CylinderGeometry(0.28, 0.28, 7.8, 10);
        hurdleGeo.rotateZ(Math.PI / 2);
        const mesh = new THREE.Mesh(hurdleGeo, this.flameWoodMat);
        mesh.position.set(0, 0.28, localZ);

        // Gold spike tips
        const ringGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.15, 8);
        ringGeo.rotateZ(Math.PI / 2);
        [-2.4, 0, 2.4].forEach(lx => {
          const r = new THREE.Mesh(ringGeo, this.spikeMat);
          r.position.set(lx, 0.28, localZ);
          chunkData.group.add(r);
        });

        chunkData.group.add(mesh);

        const obs = {
          type: 'hurdle',
          mesh: mesh,
          box: new THREE.Box3(),
          localZ: localZ,
          minX: -3.8,
          maxX: 3.8,
          minY: 0,
          maxY: 0.65,
          active: true
        };
        chunkData.obstacles.push(obs);
        this.obstacles.push(obs);

        // Spawn coins leaping OVER the hurdle in an arc!
        this.spawnCoinArc(chunkData, localZ, 0);

      } else {
        // Single lane hurdle
        const lane = Math.floor(Math.random() * 3) - 1;
        const hurdleGeo = new THREE.CylinderGeometry(0.28, 0.28, 2.3, 8);
        hurdleGeo.rotateZ(Math.PI / 2);
        const mesh = new THREE.Mesh(hurdleGeo, this.flameWoodMat);
        mesh.position.set(lane * this.LANE_WIDTH, 0.28, localZ);
        chunkData.group.add(mesh);

        const obs = {
          type: 'hurdle',
          mesh: mesh,
          box: new THREE.Box3(),
          localZ: localZ,
          minX: lane * this.LANE_WIDTH - 1.1,
          maxX: lane * this.LANE_WIDTH + 1.1,
          minY: 0,
          maxY: 0.65,
          active: true
        };
        chunkData.obstacles.push(obs);
        this.obstacles.push(obs);

        // Arc over it
        this.spawnCoinArc(chunkData, localZ, lane);
      }

    } else if (chosenType === 'slide_arch') {
      // Low broken temple lintel overhead (Bottom clearance ~ 0.75m). Runner MUST SLIDE!
      const archMesh = new THREE.Group();
      archMesh.position.set(0, 0, localZ);

      // Low lintel block
      const barGeo = new THREE.BoxGeometry(8.2, 1.4, 0.6);
      const barMesh = new THREE.Mesh(barGeo, this.obstacleMat);
      barMesh.position.y = 1.6; // Y: from 0.9 to 2.3
      archMesh.add(barMesh);

      const goldTrim = new THREE.Mesh(new THREE.BoxGeometry(8.3, 0.2, 0.65), this.spikeMat);
      goldTrim.position.y = 0.9;
      archMesh.add(goldTrim);

      // Hanging gold spikes
      for (let sx = -3.2; sx <= 3.2; sx += 0.8) {
        const spikeGeo = new THREE.ConeGeometry(0.12, 0.35, 6);
        spikeGeo.rotateX(Math.PI);
        const spike = new THREE.Mesh(spikeGeo, this.spikeMat);
        spike.position.set(sx, 0.75, 0);
        archMesh.add(spike);
      }

      chunkData.group.add(archMesh);

      const obs = {
        type: 'low_ceiling',
        mesh: archMesh,
        box: new THREE.Box3(),
        localZ: localZ,
        minX: -3.8,
        maxX: 3.8,
        minY: 0.75,
        maxY: 2.4,
        active: true
      };
      chunkData.obstacles.push(obs);
      this.obstacles.push(obs);

      // Slide coins along floor underneath
      const lane = Math.floor(Math.random() * 3) - 1;
      this.spawnCoinTrail(chunkData, localZ - 2, lane, 4, 0.25);

    } else if (chosenType === 'monolith_block') {
      // 1 lane completely blocked by a massive obsidian sarcophagus / guardian statue
      const lane = Math.floor(Math.random() * 3) - 1;
      const monoGroup = new THREE.Group();
      monoGroup.position.set(lane * this.LANE_WIDTH, 0, localZ);

      const blockGeo = new THREE.BoxGeometry(1.8, 2.6, 1.2);
      const blockMesh = new THREE.Mesh(blockGeo, this.obstacleMat);
      blockMesh.position.y = 1.3;
      monoGroup.add(blockMesh);

      // Golden inscribed carved front
      const faceGeo = new THREE.BoxGeometry(1.4, 2.2, 0.1);
      const faceMesh = new THREE.Mesh(faceGeo, this.goldTrimMat);
      faceMesh.position.set(0, 1.3, 0.61);
      monoGroup.add(faceMesh);

      chunkData.group.add(monoGroup);

      const obs = {
        type: 'wall',
        mesh: monoGroup,
        box: new THREE.Box3(),
        localZ: localZ,
        minX: lane * this.LANE_WIDTH - 0.9,
        maxX: lane * this.LANE_WIDTH + 0.9,
        minY: 0,
        maxY: 2.6,
        active: true
      };
      chunkData.obstacles.push(obs);
      this.obstacles.push(obs);

      // Coins in the open lanes
      const openLane = (lane === 0) ? (Math.random() < 0.5 ? -1 : 1) : 0;
      this.spawnCoinTrail(chunkData, localZ, openLane, 5);

    } else if (chosenType === 'double_block') {
      // 2 lanes blocked, leaving exactly 1 safe escape lane
      const safeLane = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
      [-1, 0, 1].forEach(l => {
        if (l === safeLane) return;

        const monoGroup = new THREE.Group();
        monoGroup.position.set(l * this.LANE_WIDTH, 0, localZ);

        const blockGeo = new THREE.BoxGeometry(1.8, 2.6, 1.2);
        const blockMesh = new THREE.Mesh(blockGeo, this.obstacleMat);
        blockMesh.position.y = 1.3;
        monoGroup.add(blockMesh);

        const faceGeo = new THREE.BoxGeometry(1.4, 2.2, 0.1);
        const faceMesh = new THREE.Mesh(faceGeo, this.goldTrimMat);
        faceMesh.position.set(0, 1.3, 0.61);
        monoGroup.add(faceMesh);

        chunkData.group.add(monoGroup);

        const obs = {
          type: 'wall',
          mesh: monoGroup,
          box: new THREE.Box3(),
          localZ: localZ,
          minX: l * this.LANE_WIDTH - 0.9,
          maxX: l * this.LANE_WIDTH + 0.9,
          minY: 0,
          maxY: 2.6,
          active: true
        };
        chunkData.obstacles.push(obs);
        this.obstacles.push(obs);
      });

      // Guide the player with a glittering coin trail down the safe escape lane!
      this.spawnCoinTrail(chunkData, localZ, safeLane, 5);
    }
  }

  // --- Coins Spawning ---

  spawnCoinTrail(chunkData, centerZ, lane, count = 5, y = 0.55) {
    const spacing = 1.6;
    const startZ = centerZ - ((count - 1) * spacing) / 2;

    for (let i = 0; i < count; i++) {
      const cz = startZ + i * spacing;
      const coinMesh = new THREE.Mesh(this.coinGeo, this.coinMat);
      coinMesh.position.set(lane * this.LANE_WIDTH, y, cz);

      chunkData.group.add(coinMesh);

      const coinData = {
        mesh: coinMesh,
        chunkGroup: chunkData.group,
        lane: lane,
        baseY: y,
        active: true,
        isAttracted: false
      };
      chunkData.coins.push(coinData);
      this.coins.push(coinData);
    }
  }

  spawnCoinArc(chunkData, hurdleZ, lane) {
    const count = 5;
    const spacing = 1.4;
    const startZ = hurdleZ - 2.8;

    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const cz = startZ + i * spacing;
      const cy = 0.6 + Math.sin(t * Math.PI) * 1.5; // Parabolic jump arc

      const coinMesh = new THREE.Mesh(this.coinGeo, this.coinMat);
      coinMesh.position.set(lane * this.LANE_WIDTH, cy, cz);

      chunkData.group.add(coinMesh);

      const coinData = {
        mesh: coinMesh,
        chunkGroup: chunkData.group,
        lane: lane,
        baseY: cy,
        active: true,
        isAttracted: false
      };
      chunkData.coins.push(coinData);
      this.coins.push(coinData);
    }
  }

  // --- Power-ups Spawning ---

  spawnPowerup(chunkData, localZ) {
    const lane = Math.floor(Math.random() * 3) - 1;
    const types = ['magnet', 'shield', 'multiplier'];
    const type = types[Math.floor(Math.random() * types.length)];

    const powerupGroup = new THREE.Group();
    powerupGroup.position.set(lane * this.LANE_WIDTH, 1.2, localZ);

    if (type === 'magnet') {
      // Golden Magnet Horseshoe / Torus
      const geo = new THREE.TorusGeometry(0.4, 0.12, 10, 16, Math.PI);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xff3b30,
        metalness: 0.8,
        roughness: 0.2
      });
      const magnetMesh = new THREE.Mesh(geo, mat);
      magnetMesh.rotation.z = Math.PI;
      powerupGroup.add(magnetMesh);

      // Gold tips
      const tipGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.18, 8);
      const t1 = new THREE.Mesh(tipGeo, this.goldTrimMat);
      t1.position.set(-0.4, -0.05, 0);
      const t2 = new THREE.Mesh(tipGeo, this.goldTrimMat);
      t2.position.set(0.4, -0.05, 0);
      powerupGroup.add(t1);
      powerupGroup.add(t2);

    } else if (type === 'shield') {
      // Golden Aegis Medallion with luminous cyan core
      const geo = new THREE.OctahedronGeometry(0.45, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x00d2ff,
        metalness: 0.9,
        roughness: 0.1,
        emissive: 0x005577,
        emissiveIntensity: 0.5
      });
      const shieldMesh = new THREE.Mesh(geo, mat);
      powerupGroup.add(shieldMesh);

    } else if (type === 'multiplier') {
      // 2X Multiplier Golden Relic
      const geo = new THREE.DodecahedronGeometry(0.45);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffa500,
        metalness: 0.95,
        roughness: 0.1,
        emissive: 0x884400,
        emissiveIntensity: 0.4
      });
      const multMesh = new THREE.Mesh(geo, mat);
      powerupGroup.add(multMesh);
    }

    // Glowing aura ring around powerup
    const ringGeo = new THREE.RingGeometry(0.55, 0.65, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    powerupGroup.add(ringMesh);

    chunkData.group.add(powerupGroup);

    const powerupData = {
      type: type,
      mesh: powerupGroup,
      chunkGroup: chunkData.group,
      localZ: localZ,
      active: true
    };
    chunkData.powerups.push(powerupData);
    this.powerups.push(powerupData);
  }

  // --- Dynamic World Movement & Infinite Recycling ---

  update(dt, speed, player) {
    const deltaZ = speed * dt;
    this.distanceTraveled += deltaZ;

    // 1. Move all track chunks toward positive Z (towards player at z = 0)
    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];
      chunk.group.position.z += deltaZ;

      // When chunk is far behind camera (z > 25), recycle it to the farthest front!
      if (chunk.group.position.z > 25.0) {
        this.recycleChunk(chunk);
      }
    }

    // 2. Animate Torch Fire Flickers
    const time = performance.now() * 0.005;
    for (let torch of this.torches) {
      torch.light.intensity = torch.baseIntensity + (Math.sin(time + torch.seed) + Math.cos(time * 2.3 + torch.seed)) * 0.2;
    }

    // 3. Animate Coins & Power-ups (Spin & Bob)
    const spinSpeed = 3.5 * dt;
    for (let coin of this.coins) {
      if (!coin.active) continue;
      coin.mesh.rotation.z += spinSpeed;

      // Handle Magnet attraction if active
      if (player.magnetActive) {
        // Calculate world position
        const worldPos = new THREE.Vector3();
        coin.mesh.getWorldPosition(worldPos);

        const dist = worldPos.distanceTo(player.group.position);
        if (dist < 10.0 && worldPos.z > -8.0) {
          // Attract coin toward runner!
          const dir = new THREE.Vector3().subVectors(player.group.position, worldPos).normalize();
          coin.mesh.position.x += dir.x * 22.0 * dt;
          coin.mesh.position.y += dir.y * 22.0 * dt;
          coin.mesh.position.z += dir.z * 22.0 * dt;
        }
      }
    }

    for (let pup of this.powerups) {
      if (!pup.active) continue;
      pup.mesh.rotation.y += 2.5 * dt;
      pup.mesh.position.y = 1.2 + Math.sin(time * 2 + pup.localZ) * 0.2;
    }
  }

  recycleChunk(chunk) {
    // 1. Find the chunk currently furthest away
    let minZ = 0;
    for (let c of this.chunks) {
      if (c.group.position.z < minZ) {
        minZ = c.group.position.z;
      }
    }

    // 2. Reposition chunk ahead of the front-most chunk
    chunk.group.position.z = minZ - this.CHUNK_LENGTH;

    // 3. Clear existing chunk gameplay objects (obstacles, coins, powerups)
    for (let obs of chunk.obstacles) {
      const idx = this.obstacles.indexOf(obs);
      if (idx !== -1) this.obstacles.splice(idx, 1);
      chunk.group.remove(obs.mesh);
    }
    chunk.obstacles = [];

    for (let c of chunk.coins) {
      const idx = this.coins.indexOf(c);
      if (idx !== -1) this.coins.splice(idx, 1);
      chunk.group.remove(c.mesh);
    }
    chunk.coins = [];

    for (let p of chunk.powerups) {
      const idx = this.powerups.indexOf(p);
      if (idx !== -1) this.powerups.splice(idx, 1);
      chunk.group.remove(p.mesh);
    }
    chunk.powerups = [];

    // 4. Populate with fresh obstacles and treasures
    this.populateChunkGameplay(chunk, chunk.group.position.z);
  }

  reset() {
    // Remove all chunk groups from scene
    for (let chunk of this.chunks) {
      this.scene.remove(chunk.group);
    }
    this.chunks = [];
    this.obstacles = [];
    this.coins = [];
    this.powerups = [];
    this.torches = [];
    this.distanceTraveled = 0;

    // Rebuild track chunks
    for (let i = 0; i < this.NUM_CHUNKS; i++) {
      const zPos = 15 - i * this.CHUNK_LENGTH;
      const isStartSafeZone = i < 3;
      const chunk = this.createChunk(zPos, isStartSafeZone);
      this.chunks.push(chunk);
    }
  }
}

window.TrackManager = TrackManager;
