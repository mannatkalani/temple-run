/**
 * TEMPLE RUN: GOLDEN CHASM - PARTICLE SYSTEM
 * High-performance batched particle effects for flames, gold coin sparkles, dust, and aura.
 */

class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    
    // Shared geometry & materials for optimal performance
    this.sparkleGeo = new THREE.PlaneGeometry(0.18, 0.18);
    this.smokeGeo = new THREE.PlaneGeometry(0.3, 0.3);
    this.debrisGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);

    // Create a circular gradient canvas texture for glowing soft particles
    this.glowTexture = this.createGlowTexture();
    this.sparkleTexture = this.createSparkleTexture();

    this.sparkleMaterial = new THREE.MeshBasicMaterial({
      map: this.sparkleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.dustMaterial = new THREE.MeshBasicMaterial({
      map: this.glowTexture,
      transparent: true,
      depthWrite: false,
      color: 0xd4af37,
      opacity: 0.4
    });

    this.debrisMaterial = new THREE.MeshStandardMaterial({
      color: 0xdfb743,
      metalness: 0.8,
      roughness: 0.3
    });
  }

  createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 235, 150, 1)');
    grad.addColorStop(0.3, 'rgba(223, 183, 67, 0.8)');
    grad.addColorStop(0.7, 'rgba(180, 120, 20, 0.2)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  createSparkleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // 4-pointed glowing sparkle star
    ctx.clearRect(0, 0, 64, 64);
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 24);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.4, 'rgba(255, 215, 0, 0.8)');
    grad.addColorStop(1, 'rgba(255, 180, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(32, 32, 24, 0, Math.PI * 2);
    ctx.fill();

    // Cross spikes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(30, 4, 4, 56);
    ctx.fillRect(4, 30, 56, 4);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  // Burst of golden sparkles upon coin pickup
  spawnCoinSparkles(pos) {
    const count = 14;
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.sparkleGeo, this.sparkleMaterial.clone());
      mesh.position.copy(pos);
      mesh.rotation.z = Math.random() * Math.PI;

      // Spherical random velocity
      const phi = Math.random() * Math.PI * 2;
      const costheta = Math.random() * 2 - 1;
      const u = Math.random();
      const speed = 2.5 + Math.random() * 4.0;
      const theta = Math.acos(costheta);
      const r = Math.cbrt(u);

      const vx = r * Math.sin(theta) * Math.cos(phi) * speed;
      const vy = (Math.abs(r * Math.cos(theta)) + 0.4) * speed * 1.2; // Tend upward
      const vz = r * Math.sin(theta) * Math.sin(phi) * speed;

      this.scene.add(mesh);
      this.particles.push({
        mesh: mesh,
        vx: vx,
        vy: vy,
        vz: vz,
        rotSpeed: (Math.random() - 0.5) * 10,
        scale: 0.8 + Math.random() * 0.6,
        life: 0,
        maxLife: 0.65 + Math.random() * 0.35,
        type: 'sparkle'
      });
    }
  }

  // Soft golden dust puff at runner's feet
  spawnFootstepDust(pos) {
    const mesh = new THREE.Mesh(this.smokeGeo, this.dustMaterial.clone());
    mesh.position.set(
      pos.x + (Math.random() - 0.5) * 0.4,
      pos.y + 0.05,
      pos.z + (Math.random() - 0.5) * 0.2
    );
    mesh.rotation.x = -Math.PI / 2;

    this.scene.add(mesh);
    this.particles.push({
      mesh: mesh,
      vx: (Math.random() - 0.5) * 0.6,
      vy: 0.2 + Math.random() * 0.4,
      vz: 1.0 + Math.random() * 1.5, // Drift slightly back as runner moves forward
      scale: 0.3,
      maxScale: 0.9,
      life: 0,
      maxLife: 0.4,
      type: 'dust'
    });
  }

  // Crash / impact debris explosion
  spawnCrashDebris(pos) {
    const count = 25;
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.debrisGeo, this.debrisMaterial.clone());
      mesh.position.copy(pos);
      
      const speed = 4.0 + Math.random() * 7.0;
      const vx = (Math.random() - 0.5) * speed;
      const vy = 2.0 + Math.random() * speed;
      const vz = (Math.random() - 0.5) * speed;

      this.scene.add(mesh);
      this.particles.push({
        mesh: mesh,
        vx: vx,
        vy: vy,
        vz: vz,
        rx: Math.random() * 12,
        ry: Math.random() * 12,
        scale: 0.8 + Math.random() * 0.8,
        life: 0,
        maxLife: 1.2 + Math.random() * 0.5,
        type: 'debris'
      });
    }
  }

  update(dt, camera) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      const progress = p.life / p.maxLife;

      if (progress >= 1.0) {
        this.scene.remove(p.mesh);
        if (p.mesh.geometry && p.mesh.geometry !== this.sparkleGeo && p.mesh.geometry !== this.smokeGeo && p.mesh.geometry !== this.debrisGeo) {
          p.mesh.geometry.dispose();
        }
        if (p.mesh.material && !p.mesh.material.map) {
          p.mesh.material.dispose();
        }
        this.particles.splice(i, 1);
        continue;
      }

      // Physics update
      if (p.type === 'sparkle') {
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.vy -= 9.8 * dt; // Gravity
        p.mesh.rotation.z += p.rotSpeed * dt;

        // Face camera for billboard sparkle
        p.mesh.quaternion.copy(camera.quaternion);

        // Fade scale and opacity
        const s = (1 - progress) * p.scale;
        p.mesh.scale.set(s, s, s);
        p.mesh.material.opacity = Math.sin((1 - progress) * Math.PI * 0.5);

      } else if (p.type === 'dust') {
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        
        const currentScale = p.scale + (p.maxScale - p.scale) * progress;
        p.mesh.scale.set(currentScale, currentScale, currentScale);
        p.mesh.material.opacity = (1 - progress) * 0.4;

      } else if (p.type === 'debris') {
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.vy -= 16.0 * dt; // Heavy gravity
        
        // Bounce on temple floor y = 0
        if (p.mesh.position.y < 0.1) {
          p.mesh.position.y = 0.1;
          p.vy = -p.vy * 0.4;
          p.vx *= 0.7;
          p.vz *= 0.7;
        }

        p.mesh.rotation.x += p.rx * dt;
        p.mesh.rotation.y += p.ry * dt;

        const s = (1 - progress * 0.3) * p.scale;
        p.mesh.scale.set(s, s, s);
      }
    }
  }

  clear() {
    for (let p of this.particles) {
      this.scene.remove(p.mesh);
    }
    this.particles = [];
  }
}

window.ParticleSystem = ParticleSystem;
