/**
 * TEMPLE RUN: GOLDEN CHASM - PLAYER RUNNER
 * Fully articulated 3D character with procedural run, jump, slide, and bank animations.
 */

class Player {
  constructor(scene, particleSystem) {
    this.scene = scene;
    this.particles = particleSystem;

    // Lane positioning
    this.LANE_WIDTH = 2.4;
    this.currentLane = 0; // -1: Left, 0: Center, 1: Right
    this.targetX = 0;
    this.x = 0;
    this.y = 0;
    this.z = 0;

    // Movement Physics
    this.laneSpeed = 16.0; // Lerp speed for lane shifting
    this.leanAngle = 0;

    // Jump Physics
    this.isJumping = false;
    this.jumpVelocity = 0;
    this.gravity = -34.0;
    this.jumpInitialSpeed = 12.5;

    // Slide Physics
    this.isSliding = false;
    this.slideTimer = 0;
    this.slideDuration = 0.72; // Seconds
    this.slideHeight = 0.55;
    this.normalHeight = 1.8;

    // Animation Gait Cycle
    this.animTime = 0;
    this.isDead = false;
    this.deathTimer = 0;
    this.footstepTimer = 0;

    // Power-up states
    this.shieldActive = false;
    this.magnetActive = false;

    // Bounding Box for Precise Collision Detection
    this.box = new THREE.Box3();
    this.hitboxSize = new THREE.Vector3(0.9, 1.7, 0.9);

    // Build the 3D Character Mesh Hierarchy
    this.buildMesh();
  }

  buildMesh() {
    this.group = new THREE.Group();

    // High quality stylized materials with black & gold theme
    const obsidianMat = new THREE.MeshStandardMaterial({
      color: 0x121316,
      roughness: 0.35,
      metalness: 0.2
    });

    const clothDarkMat = new THREE.MeshStandardMaterial({
      color: 0x1c1a16,
      roughness: 0.8,
      metalness: 0.1
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xdfb743,
      roughness: 0.25,
      metalness: 0.85,
      emissive: 0x3d2f09,
      emissiveIntensity: 0.25
    });

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xba825a,
      roughness: 0.85,
      metalness: 0.05
    });

    // 1. Root Pivot (allows easy scaling and tilting)
    this.pivot = new THREE.Group();
    this.group.add(this.pivot);

    // 2. Torso (Vest + Chestplate with Gold Trim)
    this.torso = new THREE.Group();
    this.torso.position.y = 1.05;

    const chestGeo = new THREE.BoxGeometry(0.7, 0.75, 0.45);
    const chestMesh = new THREE.Mesh(chestGeo, obsidianMat);
    chestMesh.castShadow = true;
    this.torso.add(chestMesh);

    // Gold Chest Emblem & Trim
    const trimGeo = new THREE.BoxGeometry(0.72, 0.12, 0.47);
    const trimMesh = new THREE.Mesh(trimGeo, goldMat);
    trimMesh.position.y = 0.15;
    this.torso.add(trimMesh);

    const emblemGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.48, 6);
    emblemGeo.rotateX(Math.PI / 2);
    const emblemMesh = new THREE.Mesh(emblemGeo, goldMat);
    this.torso.add(emblemMesh);

    // Explorer Backpack on Runner's Back
    const packGeo = new THREE.BoxGeometry(0.55, 0.55, 0.28);
    const packMesh = new THREE.Mesh(packGeo, clothDarkMat);
    packMesh.position.set(0, 0.05, -0.32);
    packMesh.castShadow = true;
    this.torso.add(packMesh);

    const packFlapGeo = new THREE.BoxGeometry(0.56, 0.16, 0.29);
    const packFlap = new THREE.Mesh(packFlapGeo, goldMat);
    packFlap.position.set(0, 0.24, -0.32);
    this.torso.add(packFlap);

    // Belt with Golden Buckle
    const beltGeo = new THREE.BoxGeometry(0.72, 0.14, 0.47);
    const beltMesh = new THREE.Mesh(beltGeo, clothDarkMat);
    beltMesh.position.y = -0.32;
    this.torso.add(beltMesh);

    const buckleGeo = new THREE.BoxGeometry(0.2, 0.18, 0.49);
    const buckleMesh = new THREE.Mesh(buckleGeo, goldMat);
    buckleMesh.position.y = -0.32;
    this.torso.add(buckleMesh);

    // 3. Head & Fedora Hat
    this.head = new THREE.Group();
    this.head.position.y = 0.6;

    const headGeo = new THREE.BoxGeometry(0.42, 0.44, 0.42);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    this.head.add(headMesh);

    // Fedora Hat
    const hatBrimGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.05, 12);
    const hatBrim = new THREE.Mesh(hatBrimGeo, obsidianMat);
    hatBrim.position.y = 0.22;
    this.head.add(hatBrim);

    const hatBandGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.08, 12);
    const hatBand = new THREE.Mesh(hatBandGeo, goldMat);
    hatBand.position.y = 0.26;
    this.head.add(hatBand);

    const hatCrownGeo = new THREE.CylinderGeometry(0.32, 0.35, 0.28, 12);
    const hatCrown = new THREE.Mesh(hatCrownGeo, obsidianMat);
    hatCrown.position.y = 0.38;
    this.head.add(hatCrown);

    this.torso.add(this.head);

    // 4. Arms
    // Left Arm
    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.48, 0.26, 0);
    const armGeo = new THREE.BoxGeometry(0.22, 0.65, 0.24);
    const leftArmMesh = new THREE.Mesh(armGeo, clothDarkMat);
    leftArmMesh.position.y = -0.3;
    leftArmMesh.castShadow = true;
    this.leftArmPivot.add(leftArmMesh);

    // Gold Vambrace
    const bracerGeo = new THREE.BoxGeometry(0.24, 0.22, 0.26);
    const leftBracer = new THREE.Mesh(bracerGeo, goldMat);
    leftBracer.position.y = -0.38;
    this.leftArmPivot.add(leftBracer);

    this.torso.add(this.leftArmPivot);

    // Right Arm
    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.48, 0.26, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, clothDarkMat);
    rightArmMesh.position.y = -0.3;
    rightArmMesh.castShadow = true;
    this.rightArmPivot.add(rightArmMesh);

    const rightBracer = new THREE.Mesh(bracerGeo, goldMat);
    rightBracer.position.y = -0.38;
    this.rightArmPivot.add(rightBracer);

    this.torso.add(this.rightArmPivot);

    this.pivot.add(this.torso);

    // 5. Legs
    // Left Leg
    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.22, 0.72, 0);
    const legGeo = new THREE.BoxGeometry(0.24, 0.72, 0.26);
    const leftLegMesh = new THREE.Mesh(legGeo, clothDarkMat);
    leftLegMesh.position.y = -0.36;
    leftLegMesh.castShadow = true;
    this.leftLegPivot.add(leftLegMesh);

    // Left Greave / Boot
    const bootGeo = new THREE.BoxGeometry(0.26, 0.3, 0.32);
    const leftBoot = new THREE.Mesh(bootGeo, obsidianMat);
    leftBoot.position.set(0, -0.56, 0.03);
    this.leftLegPivot.add(leftBoot);

    const kneeGoldGeo = new THREE.BoxGeometry(0.26, 0.12, 0.28);
    const leftKnee = new THREE.Mesh(kneeGoldGeo, goldMat);
    leftKnee.position.y = -0.25;
    this.leftLegPivot.add(leftKnee);

    this.pivot.add(this.leftLegPivot);

    // Right Leg
    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.22, 0.72, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, clothDarkMat);
    rightLegMesh.position.y = -0.36;
    rightLegMesh.castShadow = true;
    this.rightLegPivot.add(rightLegMesh);

    const rightBoot = new THREE.Mesh(bootGeo, obsidianMat);
    rightBoot.position.set(0, -0.56, 0.03);
    this.rightLegPivot.add(rightBoot);

    const rightKnee = new THREE.Mesh(kneeGoldGeo, goldMat);
    rightKnee.position.y = -0.25;
    this.rightLegPivot.add(rightKnee);

    this.pivot.add(this.rightLegPivot);

    // 6. Dynamic Soft Ground Shadow
    const shadowGeo = new THREE.PlaneGeometry(1.4, 1.4);
    const shadowTex = this.createShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.65
    });
    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.03;
    this.group.add(this.shadowMesh);

    // 7. Golden Shield Bubble (Invisible until collected)
    const shieldGeo = new THREE.SphereGeometry(1.35, 16, 16);
    this.shieldMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      wireframe: true,
      transparent: true,
      opacity: 0.0
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, this.shieldMat);
    this.shieldMesh.position.y = 1.0;
    this.group.add(this.shieldMesh);

    // 8. Dynamic Golden Player Light (Illuminates upcoming path)
    this.playerLight = new THREE.PointLight(0xffdf88, 1.2, 14);
    this.playerLight.position.set(0, 1.8, 1.2);
    this.group.add(this.playerLight);

    this.scene.add(this.group);
  }

  createShadowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.4)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(canvas);
  }

  // --- Controls & Actions ---

  shiftLeft() {
    if (this.isDead) return;
    if (this.currentLane > -1) {
      this.currentLane--;
      this.targetX = this.currentLane * this.LANE_WIDTH;
      window.soundEngine.playLaneShift();
    }
  }

  shiftRight() {
    if (this.isDead) return;
    if (this.currentLane < 1) {
      this.currentLane++;
      this.targetX = this.currentLane * this.LANE_WIDTH;
      window.soundEngine.playLaneShift();
    }
  }

  jump() {
    if (this.isDead || this.isJumping) return;
    this.isJumping = true;
    this.jumpVelocity = this.jumpInitialSpeed;
    
    // Cancel slide if jumping out of a slide
    if (this.isSliding) {
      this.isSliding = false;
      this.slideTimer = 0;
    }

    window.soundEngine.playJump();
  }

  slide() {
    if (this.isDead || this.isSliding) return;
    this.isSliding = true;
    this.slideTimer = this.slideDuration;

    // Fast-drop if in mid-air
    if (this.isJumping) {
      this.jumpVelocity = -18.0;
    }

    window.soundEngine.playSlide();
  }

  setShield(active) {
    this.shieldActive = active;
    if (this.shieldMat) {
      this.shieldMat.opacity = active ? 0.6 : 0.0;
    }
  }

  setMagnet(active) {
    this.magnetActive = active;
  }

  crash() {
    if (this.isDead) return;
    this.isDead = true;
    this.deathTimer = 0;
    window.soundEngine.playCrash();
    this.particles.spawnCrashDebris(this.group.position);
  }

  reset() {
    this.currentLane = 0;
    this.targetX = 0;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.isJumping = false;
    this.jumpVelocity = 0;
    this.isSliding = false;
    this.slideTimer = 0;
    this.isDead = false;
    this.deathTimer = 0;
    this.animTime = 0;
    this.setShield(false);
    this.setMagnet(false);

    this.pivot.position.set(0, 0, 0);
    this.pivot.rotation.set(0, 0, 0);
    this.torso.position.set(0, 1.05, 0);
    this.torso.rotation.set(0, 0, 0);
    this.group.position.set(0, 0, 0);
  }

  // --- Animation & Physics Update ---

  update(dt, gameSpeed) {
    if (this.isDead) {
      this.deathTimer += dt;
      // Dramatic crash stumble / fall backward
      if (this.pivot.rotation.x > -Math.PI / 2.2) {
        this.pivot.rotation.x -= 8.0 * dt;
        this.pivot.position.y += Math.sin(this.deathTimer * 6) * 0.3 * dt;
        this.pivot.position.z += 3.0 * dt;
      }
      return;
    }

    // 1. Lane lateral interpolation & dynamic banking
    const dx = this.targetX - this.x;
    this.x += dx * Math.min(1.0, this.laneSpeed * dt);
    
    // Tilt character slightly into turn
    const targetLean = -dx * 0.22;
    this.leanAngle += (targetLean - this.leanAngle) * 12.0 * dt;
    this.pivot.rotation.z = this.leanAngle;
    this.pivot.rotation.y = dx * 0.15; // Face turn slightly

    // 2. Jumping Physics
    if (this.isJumping) {
      this.y += this.jumpVelocity * dt;
      this.jumpVelocity += this.gravity * dt;

      if (this.y <= 0) {
        this.y = 0;
        this.isJumping = false;
        this.jumpVelocity = 0;
        // Landing dust
        this.particles.spawnFootstepDust(this.group.position);
      }
    }

    // 3. Sliding Physics & Timers
    if (this.isSliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
      }
    }

    // Position container
    this.group.position.set(this.x, this.y, this.z);

    // Ground shadow scale/opacity fades with jump height
    const shadowScale = Math.max(0.3, 1.0 - this.y / 3.0);
    this.shadowMesh.scale.set(shadowScale, shadowScale, 1.0);
    this.shadowMesh.material.opacity = 0.65 * shadowScale;
    this.shadowMesh.position.y = -this.y + 0.03; // Stay anchored to ground

    // 4. Procedural Bone Animations
    this.animTime += dt * (gameSpeed * 0.45);

    if (this.isSliding) {
      // Slide Pose: Torso drops and leans back, legs extend forward
      this.torso.position.y = 0.45;
      this.torso.rotation.x = -0.85; // Lean back
      this.leftLegPivot.rotation.x = -1.2;
      this.rightLegPivot.rotation.x = -1.3;
      this.leftArmPivot.rotation.x = 0.7;
      this.rightArmPivot.rotation.x = 0.7;

      // Dust trail while sliding
      if (Math.random() < 0.4) {
        this.particles.spawnFootstepDust(this.group.position);
      }

    } else if (this.isJumping) {
      // Jump Pose: Legs tucked, arms back/up
      this.torso.position.y = 1.05;
      this.torso.rotation.x = 0.15;
      this.leftLegPivot.rotation.x = 0.75;
      this.rightLegPivot.rotation.x = 0.45;
      this.leftArmPivot.rotation.x = -1.1;
      this.rightArmPivot.rotation.x = -1.1;

    } else {
      // Running Gait Cycle: Natural rhythmic alternating stride
      this.torso.position.y = 1.05 + Math.abs(Math.sin(this.animTime * 2.0)) * 0.1;
      this.torso.rotation.x = 0.12; // Slight forward aggressive sprint lean

      const stride = Math.sin(this.animTime);
      this.leftLegPivot.rotation.x = stride * 0.95;
      this.rightLegPivot.rotation.x = -stride * 0.95;

      this.leftArmPivot.rotation.x = -stride * 1.05;
      this.rightArmPivot.rotation.x = stride * 1.05;

      // Footstep sound & dust trigger on foot strike
      this.footstepTimer += dt * (gameSpeed * 0.45);
      if (this.footstepTimer >= Math.PI) {
        this.footstepTimer -= Math.PI;
        window.soundEngine.playFootstep();
        this.particles.spawnFootstepDust(this.group.position);
      }
    }

    // 5. Shield Aura Rotation
    if (this.shieldActive) {
      this.shieldMesh.rotation.y += 2.0 * dt;
      this.shieldMesh.rotation.x += 1.0 * dt;
    }

    // 6. Update Dynamic Hitbox
    this.updateHitbox();
  }

  updateHitbox() {
    const p = this.group.position;
    if (this.isSliding) {
      // Low hitbox
      this.box.min.set(p.x - 0.4, p.y + 0.05, p.z - 0.45);
      this.box.max.set(p.x + 0.4, p.y + 0.65, p.z + 0.45);
    } else {
      // Standard standing/jumping hitbox
      this.box.min.set(p.x - 0.42, p.y + 0.1, p.z - 0.45);
      this.box.max.set(p.x + 0.42, p.y + 1.85, p.z + 0.45);
    }
  }
}

window.Player = Player;
