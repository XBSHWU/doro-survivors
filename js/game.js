// ============================================================
// DORO SURVIVORS 2.0 — Core Vampire Survivors Simulation Engine
// ============================================================

import { CHARACTERS, WEAPONS, PASSIVES, ENEMY_TYPES } from './config.js';
import { sound } from './audio.js';
import {
  drawBattlefield,
  drawMapProp,
  drawDoro,
  drawMandarin,
  drawKatanaSlash,
  drawMeteor,
  drawTurret,
  drawEnemy,
} from './sprites.js';

const MAX_ENEMIES = 260;
const MAX_GEMS = 280;
const MAX_PARTICLES = 320;
const MAX_DAMAGE_NUMS = 90;

export class DoroGame {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cb = callbacks;

    this.state = 'idle';
    this.rafId = null;
    this.lastFrameTime = 0;
    this.customImg = null;

    this.keys = new Set();
    this.pointer = { active: false, originX: 0, originY: 0, x: 0, y: 0, dx: 0, dy: 0 };

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.resize();
    this._bindInputs();
  }

  setCustomAvatarImage(img) {
    this.customImg = img;
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
  }

  _bindInputs() {
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        if (this.state === 'playing') e.preventDefault();
      }
      this.keys.add(k);

      if (k === ' ' && this.state === 'playing') {
        this.tryTriggerFullBurst();
      } else if ((k === 'p' || k === 'escape') && (this.state === 'playing' || this.state === 'paused')) {
        this.cb.onTogglePause?.();
      } else if (k === 'm') {
        this.cb.onToggleMute?.();
      }
    });

    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.pointer.active = false;
      this.pointer.dx = 0;
      this.pointer.dy = 0;
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.state !== 'playing') return;
      this.pointer.active = true;
      this.pointer.originX = e.clientX;
      this.pointer.originY = e.clientY;
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
      this.pointer.dx = 0;
      this.pointer.dy = 0;
      sound.ensureContext();
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.pointer.active) return;
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
      const dx = e.clientX - this.pointer.originX;
      const dy = e.clientY - this.pointer.originY;
      const len = Math.hypot(dx, dy);
      if (len > 8) {
        const clamped = Math.min(len, 60) / 60;
        this.pointer.dx = (dx / len) * clamped;
        this.pointer.dy = (dy / len) * clamped;
      } else {
        this.pointer.dx = 0;
        this.pointer.dy = 0;
      }
    });

    const releasePointer = () => {
      this.pointer.active = false;
      this.pointer.dx = 0;
      this.pointer.dy = 0;
    };
    window.addEventListener('pointerup', releasePointer);
    window.addEventListener('pointercancel', releasePointer);
  }

  startRun(charId, mapId, metaUpgrades) {
    const char = CHARACTERS.find((c) => c.id === charId) || CHARACTERS[0];
    this.char = char;
    this.mapId = mapId || 'eden';
    this.meta = metaUpgrades || { might: 0, maxHp: 0, speed: 0, xpGain: 0, rerolls: 0, revive: 0 };

    const maxHp = char.stats.maxHp + (this.meta.maxHp || 0) * 20;

    this.player = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      facing: 1,
      walkPhase: 0,
      moving: false,
      radius: 17,
      hp: maxHp,
      maxHp,
      xp: 0,
      level: 1,
      xpToNext: 12,
      invuln: 0,
      hurtFlash: 0,
      speedBoostTimer: 0,
      revivesLeft: this.meta.revive || 0,
      rerollsLeft: 3 + (this.meta.rerolls || 0),
      burstCharge: 35,
      burstTimer: 0,
      burstMissileTimer: 0,
      weapons: {
        [char.startWeapon]: { level: 1, evolved: false, cd: 0.15 },
      },
      passives: {},
    };

    this.time = 0;
    this.kills = 0;
    this.coinsEarned = 0;
    this.endless = false;
    this.victoryTriggered = false;
    this.damageByWeapon = { [char.startWeapon]: 0, burst: 0 };

    this.camX = 0;
    this.camY = 0;
    this.shake = 0;
    this.screenFlash = 0;
    this.screenFlashColor = '#ff6eb4';

    this.enemies = [];
    this.projectiles = [];
    this.enemyBullets = [];
    this.beams = [];
    this.novas = [];
    this.slashes = [];
    this.meteors = [];
    this.turrets = [];
    this.pools = [];
    this.mapProps = [];
    this.gems = [];
    this.pickups = [];
    this.particles = [];
    this.damageNums = [];

    this.orbitAngle = 0;
    this.orbitActiveTimer = 0;
    this.orbitHitCooldowns = new Map();

    // Events & Fever
    this.spawnTimer = 0.25;
    this.propSpawnTimer = 3.0;
    this.feverTimer = 0;
    this.feverRainTimer = 0;
    this.eventsTriggered = new Set();
    this.nextEndlessBoss = 360;
    this.nextEndlessFever = 390;
    this.hudTimer = 0;

    this.state = 'playing';
    this.keys.clear();
    this.pointer.active = false;
    this.pointer.dx = 0;
    this.pointer.dy = 0;

    sound.intenseMode = false;
    sound.startBgm();

    // Initial welcome enemies + interactive map props!
    for (let i = 0; i < 6; i++) {
      this._spawnEnemy('drone', 340 + Math.random() * 140);
    }
    for (let i = 0; i < 4; i++) {
      this._spawnMapProp(220 + Math.random() * 240);
    }

    this.lastFrameTime = performance.now();
    if (!this.rafId) {
      this.rafId = requestAnimationFrame((t) => this._loop(t));
    }
    this._emitHud();
  }

  stop() {
    this.state = 'idle';
    sound.stopBgm();
  }

  pause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      sound.stopBgm();
    }
  }

  resume() {
    if (this.state === 'paused' || this.state === 'modal') {
      this.state = 'playing';
      this.lastFrameTime = performance.now();
      sound.startBgm();
    }
  }

  enterEndlessMode() {
    this.endless = true;
    this.state = 'playing';
    this.lastFrameTime = performance.now();
    sound.startBgm();
  }

  getStats() {
    const p = this.player;
    const base = this.char.stats;
    const m = this.meta;
    const burst = p.burstTimer > 0;
    const boost = p.speedBoostTimer > 0;

    const might =
      base.might *
      (1 + (m.might || 0) * 0.1) *
      (1 + (p.passives.ribbon || 0) * 0.18) *
      (burst ? 1.5 : 1);

    const speed =
      base.speed *
      (1 + (m.speed || 0) * 0.06) *
      (1 + (p.passives.paws || 0) * 0.1) *
      (burst ? 1.25 : 1) *
      (boost ? 1.45 : 1);

    const fireRate =
      (1 + (p.passives.basket || 0) * 0.12) *
      (burst ? 1.85 : 1) *
      (boost ? 1.35 : 1);

    const cooldownMult =
      Math.max(0.28, base.cooldown * (1 - (p.passives.core || 0) * 0.09)) / fireRate;

    const area = base.area * (1 + (p.passives.halo || 0) * 0.16);
    const magnet = base.magnet * (1 + (p.passives.magnet || 0) * 0.32) * (this.feverTimer > 0 ? 1.55 : 1);
    const xpMult = 1 + (m.xpGain || 0) * 0.12;
    const burstRate = base.burstRate * (1 + (p.passives.core || 0) * 0.12);
    const regen = (p.passives.paws || 0) * 0.5;
    const critChance = (burst ? 0.35 : 0.14) + (base.critBonus || 0);

    return { might, speed, cooldownMult, area, magnet, xpMult, burstRate, regen, critChance };
  }

  tryTriggerFullBurst() {
    const p = this.player;
    if (!p || p.burstCharge < 100 || p.burstTimer > 0) return false;
    p.burstCharge = 0;
    p.burstTimer = 8.0;
    p.invuln = Math.max(p.invuln, 1.8);
    this.shake = 14;
    this.screenFlash = 0.7;
    this.screenFlashColor = '#ff6eb4';
    sound.playFullBurst();
    sound.intenseMode = true;

    this.novas.push({
      x: p.x,
      y: p.y,
      r: 20,
      maxR: 340,
      damage: 48 * this.getStats().might,
      color: '#ffd166',
      weaponId: 'burst',
      hitSet: new Set(),
      text: 'FULL BURST!!',
    });

    this.cb.onRunEvent?.('burst');
    this.cb.onFullBurst?.(this.char.variant);
    this._emitHud();
    return true;
  }

  rerollChoices() {
    if (!this.player || this.player.rerollsLeft <= 0) return null;
    this.player.rerollsLeft -= 1;
    sound.playXp();
    return this._generateUpgradeChoices(3);
  }

  skipLevelUpAndHeal() {
    if (!this.player) return;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.round(this.player.maxHp * 0.2));
    sound.playHeal();
    this._emitHud();
    this.resume();
  }

  _loop(now) {
    const dt = Math.min(0.05, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    if (this.state === 'playing') {
      this._update(dt);
    }
    if (this.state !== 'idle') {
      this._render();
    }

    this.rafId = requestAnimationFrame((t) => this._loop(t));
  }

  _update(dt) {
    this.time += dt;
    const p = this.player;
    const stats = this.getStats();

    // 1. Movement
    let ix = 0;
    let iy = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) iy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) iy += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) ix -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) ix += 1;

    if (ix === 0 && iy === 0 && this.pointer.active) {
      ix = this.pointer.dx;
      iy = this.pointer.dy;
    }

    const inputLen = Math.hypot(ix, iy);
    if (inputLen > 0.05) {
      const norm = inputLen > 1 ? 1 / inputLen : 1;
      p.vx = ix * norm * stats.speed;
      p.vy = iy * norm * stats.speed;
      p.moving = true;
      if (Math.abs(ix) > 0.1) p.facing = ix > 0 ? 1 : -1;
      p.walkPhase += dt * (11 + (p.burstTimer > 0 ? 4 : 0) + (p.speedBoostTimer > 0 ? 4 : 0));

      if (Math.random() < dt * 11) {
        this._spawnParticle(
          p.x - p.facing * 8 + (Math.random() - 0.5) * 8,
          p.y + 15,
          -p.vx * 0.12,
          -10 - Math.random() * 14,
          p.speedBoostTimer > 0 ? '#38efdb' : (p.burstTimer > 0 ? '#ffd166' : 'rgba(255,180,220,0.65)'),
          3 + Math.random() * 2.5,
          0.35
        );
      }
    } else {
      p.vx *= 0.72;
      p.vy *= 0.72;
      p.moving = false;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    this.camX += (p.x - this.camX) * Math.min(1, dt * 8.5);
    this.camY += (p.y - this.camY) * Math.min(1, dt * 8.5);
    this.shake = Math.max(0, this.shake - dt * 28);
    this.screenFlash = Math.max(0, this.screenFlash - dt * 2.4);

    if (p.invuln > 0) p.invuln -= dt;
    if (p.hurtFlash > 0) p.hurtFlash -= dt;
    if (p.speedBoostTimer > 0) p.speedBoostTimer -= dt;

    if (stats.regen > 0 && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + stats.regen * dt);
    }

    // Golden Mandarin Fever rain!
    if (this.feverTimer > 0) {
      this.feverTimer -= dt;
      this.feverRainTimer -= dt;
      if (this.feverRainTimer <= 0) {
        this.feverRainTimer = 0.45;
        const a = Math.random() * Math.PI * 2;
        const d = 70 + Math.random() * 240;
        const fx = p.x + Math.cos(a) * d;
        const fy = p.y + Math.sin(a) * d;
        if (Math.random() < 0.22) {
          this.pickups.push({ kind: 'heal', x: fx, y: fy, bob: 0 });
        } else {
          this._spawnGem(fx, fy, 18);
          this.coinsEarned += 2;
          this._spawnParticle(fx, fy, 0, -40, '#ffd166', 4.5, 0.45);
        }
      }
    }

    // Full Burst countdown
    if (p.burstTimer > 0) {
      p.burstTimer -= dt;
      p.burstMissileTimer -= dt;
      if (p.burstMissileTimer <= 0) {
        p.burstMissileTimer = 0.22;
        this._fireBurstMissiles(stats);
      }
      if (p.burstTimer <= 0) {
        p.burstTimer = 0;
        sound.intenseMode = this.enemies.some((e) => e.isBoss);
      }
    }

    this._updateWaveDirector(dt);
    this._updateMapProps(dt);
    this._updateWeapons(dt, stats);
    this._updateProjectiles(dt);
    this._updateBeams(dt);
    this._updateNovas(dt);
    this._updateSlashes(dt);
    this._updateMeteors(dt);
    this._updateTurrets(dt, stats);
    this._updatePools(dt);
    this._updateEnemies(dt);
    this._updateEnemyBullets(dt);
    this._updateGems(dt, stats);
    this._updatePickups(dt);
    this._updateParticles(dt);
    this._updateDamageNums(dt);

    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.08;
      this._emitHud();
    }
  }

  _updateWaveDirector(dt) {
    const t = this.time;

    if (t >= 40 && !this.eventsTriggered.has('thief1')) {
      this.eventsTriggered.add('thief1');
      this.cb.onBanner?.('thiefIncoming', 'gold');
      for (let i = 0; i < 3; i++) this._spawnEnemy('thief', 440);
    }
    if (t >= 75 && !this.eventsTriggered.has('boss1')) {
      this.eventsTriggered.add('boss1');
      this._spawnBoss('gravedigger');
    }
    if (t >= 105 && !this.eventsTriggered.has('fever1')) {
      this.eventsTriggered.add('fever1');
      this._startMandarinFever();
    }
    if (t >= 135 && !this.eventsTriggered.has('boss_train')) {
      this.eventsTriggered.add('boss_train');
      sound.playBossWarning();
      sound.intenseMode = true;
      this.cb.onBanner?.('trainIncoming', 'danger');
      this._spawnEnemy('alteisen', 540);
    }
    if (t >= 165 && !this.eventsTriggered.has('swarm1')) {
      this.eventsTriggered.add('swarm1');
      this.cb.onBanner?.('swarmIncoming', 'pink');
      const count = 24;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        this._spawnEnemyAt('spider', this.player.x + Math.cos(a) * 440, this.player.y + Math.sin(a) * 440);
      }
    }
    if (t >= 195 && !this.eventsTriggered.has('boss2')) {
      this.eventsTriggered.add('boss2');
      this._spawnBoss('chatterbox');
    }
    if (t >= 230 && !this.eventsTriggered.has('fever2')) {
      this.eventsTriggered.add('fever2');
      this._startMandarinFever();
    }
    if (t >= 260 && !this.eventsTriggered.has('thief2')) {
      this.eventsTriggered.add('thief2');
      this.cb.onBanner?.('thiefIncoming', 'gold');
      for (let i = 0; i < 5; i++) this._spawnEnemy('thief', 460);
    }
    if (t >= 300 && !this.eventsTriggered.has('boss3')) {
      this.eventsTriggered.add('boss3');
      this._spawnBoss('queen');
    }

    if (this.endless) {
      if (t >= this.nextEndlessBoss) {
        this.nextEndlessBoss += 60;
        const pool = ['gravedigger', 'alteisen', 'chatterbox', 'queen'];
        this._spawnBoss(pool[Math.floor(Math.random() * pool.length)]);
      }
      if (t >= this.nextEndlessFever) {
        this.nextEndlessFever += 90;
        this._startMandarinFever();
      }
    }

    // Continuous spawning
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.enemies.length < MAX_ENEMIES) {
      const minute = t / 60;
      this.spawnTimer = Math.max(0.16, 0.82 - minute * 0.11);
      const batch = Math.min(6, 1 + Math.floor(minute * 0.95));
      for (let i = 0; i < batch; i++) {
        if (this.enemies.length >= MAX_ENEMIES) break;
        this._spawnEnemy(this._pickEnemyType(minute));
      }
    }
  }

  _startMandarinFever() {
    this.feverTimer = 15.0;
    this.feverRainTimer = 0.2;
    sound.playEvolve();
    this.cb.onBanner?.('feverIncoming', 'gold');
  }

  _pickEnemyType(minute) {
    const r = Math.random();
    if (minute < 0.7) return r < 0.8 ? 'drone' : 'spider';
    if (minute < 1.5) return r < 0.45 ? 'drone' : (r < 0.82 ? 'spider' : 'shield');
    if (minute < 2.8) {
      if (r < 0.28) return 'drone';
      if (r < 0.54) return 'spider';
      if (r < 0.76) return 'shield';
      if (r < 0.92) return 'charger';
      return 'artillery';
    }
    if (r < 0.18) return 'drone';
    if (r < 0.38) return 'spider';
    if (r < 0.6) return 'shield';
    if (r < 0.82) return 'charger';
    if (r < 0.96) return 'artillery';
    return 'thief';
  }

  _spawnBoss(type) {
    sound.playBossWarning();
    sound.intenseMode = true;
    this.cb.onBanner?.(type === 'alteisen' ? 'trainIncoming' : 'bossIncoming', 'danger');
    this._spawnEnemy(type, 520);
  }

  _spawnEnemy(type, forcedDist = null) {
    const a = Math.random() * Math.PI * 2;
    const dist = forcedDist || (Math.max(this.width, this.height) * 0.56 + 70 + Math.random() * 90);
    this._spawnEnemyAt(type, this.player.x + Math.cos(a) * dist, this.player.y + Math.sin(a) * dist);
  }

  _spawnEnemyAt(type, x, y) {
    const def = ENEMY_TYPES[type] || ENEMY_TYPES.drone;
    const minute = this.time / 60;
    const hpScale = 1 + minute * 0.34 + (this.endless ? (minute - 5) * 0.55 : 0);
    const maxHp = Math.round(def.hp * hpScale);

    this.enemies.push({
      id: Math.random(),
      type,
      x,
      y,
      vx: 0,
      vy: 0,
      hp: maxHp,
      maxHp,
      speed: def.speed * (1 + Math.min(0.45, minute * 0.045)),
      damage: Math.round(def.damage * (1 + minute * 0.12)),
      radius: def.radius,
      xp: def.xp,
      mass: def.mass,
      isBoss: !!def.isBoss,
      isFinalBoss: !!def.isFinalBoss,
      isThief: !!def.isThief,
      ranged: !!def.ranged,
      bossPattern: def.bossPattern || null,
      bossName: def.name || null,
      hitFlash: 0,
      slowTimer: 0,
      freezeTimer: 0,
      seed: Math.random() * 100,
      attackCd: 2.2 + Math.random() * 1.5,
      telegraphTimer: 0,
      chargeTimer: 0,
      chargeDirX: 1,
      chargeDirY: 0,
    });
  }

  // ==================== INTERACTIVE MAP PROPS ====================
  _spawnMapProp(dist = null) {
    if (this.mapProps.length >= 10) return;
    const a = Math.random() * Math.PI * 2;
    const d = dist || (320 + Math.random() * 340);
    const kind = this.mapId === 'ark' ? 'boost' : (this.mapId === 'snow' ? 'crystal' : 'crate');
    this.mapProps.push({
      kind,
      x: this.player.x + Math.cos(a) * d,
      y: this.player.y + Math.sin(a) * d,
      hp: kind === 'boost' ? 9999 : 35,
      radius: kind === 'boost' ? 28 : 20,
      cooldown: 0,
      hitFlash: 0,
      seed: Math.random() * 10,
    });
  }

  _updateMapProps(dt) {
    const p = this.player;
    this.propSpawnTimer -= dt;
    if (this.propSpawnTimer <= 0) {
      this.propSpawnTimer = 6.5;
      this._spawnMapProp();
    }

    for (let i = this.mapProps.length - 1; i >= 0; i--) {
      const pr = this.mapProps[i];
      if (pr.hitFlash > 0) pr.hitFlash -= dt;
      if (pr.cooldown > 0) pr.cooldown -= dt;

      const d = Math.hypot(pr.x - p.x, pr.y - p.y);
      if (d > 1100) {
        this.mapProps.splice(i, 1);
        continue;
      }

      // Ark Boost Pad trigger
      if (pr.kind === 'boost' && pr.cooldown <= 0 && d < pr.radius + p.radius) {
        pr.cooldown = 10;
        p.speedBoostTimer = 3.2;
        sound.playMagnet();
        this.cb.onBanner?.('speedBoostBanner', 'cyan');
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2;
          this._spawnParticle(pr.x, pr.y, Math.cos(a) * 140, Math.sin(a) * 140, '#38efdb', 4, 0.4);
        }
      }
    }
  }

  _hitMapPropsInRadius(x, y, r, dmg) {
    for (let i = this.mapProps.length - 1; i >= 0; i--) {
      const pr = this.mapProps[i];
      if (pr.kind === 'boost') continue;
      if (Math.hypot(pr.x - x, pr.y - y) <= pr.radius + r) {
        pr.hp -= dmg;
        pr.hitFlash = 0.14;
        if (pr.hp <= 0) {
          this.mapProps.splice(i, 1);
          this._breakMapProp(pr);
        }
      }
    }
  }

  _breakMapProp(pr) {
    if (pr.kind === 'crate') {
      sound.playChest();
      this.cb.onBanner?.('crateBanner', 'gold');
      const roll = Math.random();
      if (roll < 0.42) this.pickups.push({ kind: 'heal', x: pr.x, y: pr.y, bob: 0 });
      else if (roll < 0.72) this.pickups.push({ kind: 'magnet', x: pr.x, y: pr.y, bob: 0 });
      else this.pickups.push({ kind: 'bomb', x: pr.x, y: pr.y, bob: 0 });
      this.coinsEarned += 8;
      for (let k = 0; k < 10; k++) {
        const a = Math.random() * Math.PI * 2;
        this._spawnParticle(pr.x, pr.y, Math.cos(a) * 120, Math.sin(a) * 120, '#ff9f1c', 4.5, 0.45);
      }
    } else if (pr.kind === 'crystal') {
      sound.playNova();
      this.shake = Math.max(this.shake, 7);
      this.cb.onBanner?.('frostNovaBanner', 'cyan');
      // Flash-freeze nearby Raptures!
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (Math.hypot(e.x - pr.x, e.y - pr.y) < 240) {
          if (!e.isBoss) e.freezeTimer = 3.2;
          else e.slowTimer = 3.2;
          this._damageEnemy(e, 45 * this.getStats().might, 'burst');
        }
      }
      for (let k = 0; k < 18; k++) {
        const a = (k / 18) * Math.PI * 2;
        this._spawnParticle(pr.x, pr.y, Math.cos(a) * 180, Math.sin(a) * 180, '#74c0fc', 5, 0.55);
      }
    }
  }

  // ==================== WEAPONS (9 BASE + 9 EVOLVED) ====================
  _updateWeapons(dt, stats) {
    const p = this.player;

    if (p.weapons.orange) {
      const w = p.weapons.orange;
      w.cd -= dt;
      if (w.cd <= 0) {
        w.cd = (w.evolved ? 0.32 : Math.max(0.45, 1.05 - w.level * 0.07)) * stats.cooldownMult;
        this._fireMandarins(w, stats);
      }
    }

    if (p.weapons.orbit) {
      const w = p.weapons.orbit;
      this.orbitAngle += dt * (w.evolved ? 4.4 : 2.5 + w.level * 0.2);
      if (w.evolved) {
        this.orbitActiveTimer = 99;
      } else {
        w.cd -= dt;
        if (this.orbitActiveTimer > 0) this.orbitActiveTimer -= dt;
        else if (w.cd <= 0) {
          const duration = 3.2 + w.level * 0.35;
          this.orbitActiveTimer = duration;
          w.cd = (duration + Math.max(0.6, 2.2 - w.level * 0.18)) * stats.cooldownMult;
        }
      }
      if (this.orbitActiveTimer > 0) this._checkOrbitHits(w, stats);
    }

    if (p.weapons.beam) {
      const w = p.weapons.beam;
      w.cd -= dt;
      if (w.cd <= 0) {
        w.cd = (w.evolved ? 0.95 : Math.max(1.15, 2.35 - w.level * 0.13)) * stats.cooldownMult;
        this._fireParadiseBeams(w, stats);
      }
    }

    if (p.weapons.nova) {
      const w = p.weapons.nova;
      w.cd -= dt;
      if (w.cd <= 0) {
        w.cd = (w.evolved ? 1.55 : Math.max(1.8, 3.1 - w.level * 0.15)) * stats.cooldownMult;
        this._fireDoroNova(w, stats);
      }
    }

    if (p.weapons.minidoro) {
      const w = p.weapons.minidoro;
      w.cd -= dt;
      if (w.cd <= 0) {
        w.cd = (w.evolved ? 0.72 : Math.max(1.1, 2.25 - w.level * 0.14)) * stats.cooldownMult;
        this._fireMiniDoros(w, stats);
      }
    }

    if (p.weapons.juice) {
      const w = p.weapons.juice;
      w.cd -= dt;
      if (w.cd <= 0) {
        w.cd = (w.evolved ? 1.45 : Math.max(1.8, 3.3 - w.level * 0.18)) * stats.cooldownMult;
        this._fireJuicePools(w, stats);
      }
    }

    // === NEW WEAPON 7: Scarlet Katana (katana) ===
    if (p.weapons.katana) {
      const w = p.weapons.katana;
      w.cd -= dt;
      if (w.cd <= 0) {
        w.cd = (w.evolved ? 0.62 : Math.max(0.75, 1.45 - w.level * 0.08)) * stats.cooldownMult;
        this._fireKatana(w, stats);
      }
    }

    // === NEW WEAPON 8: Giant Orange Meteor (meteor) ===
    if (p.weapons.meteor) {
      const w = p.weapons.meteor;
      w.cd -= dt;
      if (w.cd <= 0) {
        w.cd = (w.evolved ? 1.35 : Math.max(1.65, 2.9 - w.level * 0.14)) * stats.cooldownMult;
        this._fireMeteors(w, stats);
      }
    }

    // === NEW WEAPON 9: Doro Gun Turret (turret) ===
    if (p.weapons.turret) {
      const w = p.weapons.turret;
      w.cd -= dt;
      if (w.cd <= 0) {
        w.cd = (w.evolved ? 3.2 : Math.max(3.6, 5.4 - w.level * 0.2)) * stats.cooldownMult;
        this._deployTurret(w);
      }
    }
  }

  _findNearestEnemies(count = 1, maxRange = 640, fromX = this.player.x, fromY = this.player.y) {
    const list = [];
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      const d2 = (e.x - fromX) ** 2 + (e.y - fromY) ** 2;
      if (d2 <= maxRange * maxRange) list.push({ e, d2 });
    }
    list.sort((a, b) => a.d2 - b.d2);
    return list.slice(0, count).map((o) => o.e);
  }

  _fireMandarins(w, stats) {
    const p = this.player;
    const count = w.evolved ? 5 : 1 + Math.floor(w.level / 2) + (w.level >= 8 ? 2 : 0);
    const dmg = (w.evolved ? 48 : 16 + w.level * 6.5) * stats.might;
    const pierce = w.evolved ? 6 : 1 + (w.level >= 3 ? 1 : 0) + (w.level >= 6 ? 1 : 0);
    const speed = w.evolved ? 560 : 420 + w.level * 16;
    const radius = (w.evolved ? 16 : 11) * stats.area;

    const targets = this._findNearestEnemies(count, 620);
    const baseAngle = targets[0] ? Math.atan2(targets[0].y - p.y, targets[0].x - p.x) : (p.facing > 0 ? 0 : Math.PI);

    for (let i = 0; i < count; i++) {
      const ang = targets[i]
        ? Math.atan2(targets[i].y - p.y, targets[i].x - p.x)
        : baseAngle + (i - (count - 1) / 2) * 0.22;
      this.projectiles.push({
        kind: 'orange', weaponId: 'orange', evolved: w.evolved,
        x: p.x, y: p.y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
        radius, damage: dmg, pierce, life: 1.8, rot: Math.random() * 6,
        hitSet: new Set(), knockback: w.evolved ? 140 : 65 + w.level * 8,
      });
    }
    sound.playThrow();
  }

  _getOrbitOrbs(w, stats) {
    const p = this.player;
    const orbs = [];
    const count = w.evolved ? 6 : 2 + Math.floor(w.level * 0.75);
    const dist = (78 + w.level * 7) * stats.area;
    const orbRadius = (w.evolved ? 17 : 13) * stats.area;

    for (let i = 0; i < count; i++) {
      const a = this.orbitAngle + (i * Math.PI * 2) / count;
      orbs.push({ x: p.x + Math.cos(a) * dist, y: p.y + Math.sin(a) * dist, radius: orbRadius, isMini: i % 2 === 1, evolved: w.evolved });
    }
    if (w.evolved) {
      const outerDist = dist * 1.58;
      for (let i = 0; i < 5; i++) {
        const a = -this.orbitAngle * 0.8 + (i * Math.PI * 2) / 5;
        orbs.push({ x: p.x + Math.cos(a) * outerDist, y: p.y + Math.sin(a) * outerDist, radius: orbRadius * 1.15, isMini: false, evolved: true });
      }
    }
    return orbs;
  }

  _checkOrbitHits(w, stats) {
    const orbs = this._getOrbitOrbs(w, stats);
    const dmg = (w.evolved ? 38 : 13 + w.level * 5.2) * stats.might;
    const now = this.time;

    for (const orb of orbs) {
      this._hitMapPropsInRadius(orb.x, orb.y, orb.radius, dmg * 0.25);
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        const rr = orb.radius + e.radius;
        const dx = e.x - orb.x;
        const dy = e.y - orb.y;
        if (dx * dx + dy * dy <= rr * rr) {
          const last = this.orbitHitCooldowns.get(e.id) || 0;
          if (now - last > (w.evolved ? 0.2 : 0.34)) {
            this.orbitHitCooldowns.set(e.id, now);
            this._damageEnemy(e, dmg, 'orbit', 110, Math.atan2(e.y - this.player.y, e.x - this.player.x));
          }
        }
      }
    }
    if (this.orbitHitCooldowns.size > 400) this.orbitHitCooldowns.clear();
  }

  _fireParadiseBeams(w, stats) {
    const p = this.player;
    const count = w.evolved ? 5 : 1 + Math.floor(w.level / 2) + (w.level >= 8 ? 1 : 0);
    const radius = (w.evolved ? 72 : 44 + w.level * 4) * stats.area;
    const dmg = (w.evolved ? 95 : 28 + w.level * 12) * stats.might;

    const visible = this.enemies
      .filter((e) => Math.abs(e.x - p.x) < this.width * 0.52 && Math.abs(e.y - p.y) < this.height * 0.52)
      .sort((a, b) => b.hp - a.hp);

    for (let i = 0; i < count; i++) {
      let tx, ty;
      if (visible[i]) {
        tx = visible[i].x + (Math.random() - 0.5) * 20;
        ty = visible[i].y + (Math.random() - 0.5) * 20;
      } else {
        const a = Math.random() * Math.PI * 2;
        const d = 80 + Math.random() * 240;
        tx = p.x + Math.cos(a) * d;
        ty = p.y + Math.sin(a) * d;
      }
      this.beams.push({ x: tx, y: ty, radius, damage: dmg, evolved: w.evolved, timer: 0.28, duration: 0.45, struck: false, weaponId: 'beam' });
    }
  }

  _fireDoroNova(w, stats) {
    const p = this.player;
    const maxR = (w.evolved ? 265 : 125 + w.level * 18) * stats.area;
    const dmg = (w.evolved ? 56 : 18 + w.level * 7.5) * stats.might;
    const pulses = w.evolved ? 3 : (w.level >= 5 ? 2 : 1);

    for (let i = 0; i < pulses; i++) {
      this.novas.push({
        x: p.x, y: p.y, r: 14, maxR: maxR * (1 - i * 0.1), delay: i * 0.14,
        damage: dmg, color: w.evolved ? '#ff99dd' : '#ff4d94', weaponId: 'nova',
        slow: w.evolved || w.level >= 7, hitSet: new Set(),
        text: i === 0 ? (w.evolved ? 'HYPER DORO!!' : 'DORO!') : '',
      });
    }
    sound.playNova();
  }

  _fireMiniDoros(w, stats) {
    const p = this.player;
    const count = w.evolved ? 7 : 2 + Math.floor(w.level * 0.85);
    const dmg = (w.evolved ? 52 : 20 + w.level * 7) * stats.might;
    const speed = w.evolved ? 380 : 270 + w.level * 14;

    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      this.projectiles.push({
        kind: 'minidoro', weaponId: 'minidoro', evolved: w.evolved,
        x: p.x + Math.cos(a) * 16, y: p.y + Math.sin(a) * 16,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, speed,
        radius: 13 * stats.area, splashRadius: (w.evolved ? 68 : 44 + w.level * 3) * stats.area,
        damage: dmg, pierce: w.evolved ? 2 : (w.level >= 7 ? 2 : 1), life: 3.2, rot: 0, hitSet: new Set(),
      });
    }
    sound.playThrow();
  }

  _fireJuicePools(w, stats) {
    const p = this.player;
    const count = w.evolved ? 4 : 1 + Math.floor(w.level / 2);
    const radius = (w.evolved ? 105 : 54 + w.level * 7) * stats.area;
    const dmg = (w.evolved ? 28 : 9 + w.level * 4) * stats.might;
    const duration = w.evolved ? 5.5 : 3.2 + w.level * 0.35;

    for (let i = 0; i < count; i++) {
      const target = this.enemies[Math.floor(Math.random() * this.enemies.length)];
      let tx, ty;
      if (target && Math.hypot(target.x - p.x, target.y - p.y) < 420) {
        tx = target.x + (Math.random() - 0.5) * 45;
        ty = target.y + (Math.random() - 0.5) * 45;
      } else {
        const a = Math.random() * Math.PI * 2;
        const d = 90 + Math.random() * 190;
        tx = p.x + Math.cos(a) * d;
        ty = p.y + Math.sin(a) * d;
      }
      this.pools.push({ x: tx, y: ty, radius, damage: dmg, duration, maxDuration: duration, tickTimer: 0.05, evolved: w.evolved, slow: w.evolved || w.level >= 5, weaponId: 'juice' });
    }
  }

  _fireKatana(w, stats) {
    const p = this.player;
    const radius = (w.evolved ? 175 : 85 + w.level * 12) * stats.area;
    const dmg = (w.evolved ? 82 : 24 + w.level * 10) * stats.might;
    const nearest = this._findNearestEnemies(1, 360)[0];
    const baseAngle = nearest ? Math.atan2(nearest.y - p.y, nearest.x - p.x) : (p.facing > 0 ? 0 : Math.PI);
    const arcs = w.evolved ? [baseAngle, baseAngle + Math.PI] : (w.level >= 3 ? [baseAngle, baseAngle + Math.PI] : [baseAngle]);

    for (const ang of arcs) {
      this.slashes.push({ x: p.x, y: p.y, angle: ang, radius, evolved: w.evolved, life: 0.24, maxLife: 0.24 });
      this._hitMapPropsInRadius(p.x + Math.cos(ang) * (radius * 0.5), p.y + Math.sin(ang) * (radius * 0.5), radius * 0.7, dmg);

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d <= radius + e.radius) {
          if (w.evolved) {
            this._damageEnemy(e, dmg, 'katana', 175, Math.atan2(dy, dx), 0.25);
          } else {
            let diff = Math.atan2(dy, dx) - ang;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            if (Math.abs(diff) <= Math.PI * 0.48) {
              this._damageEnemy(e, dmg, 'katana', 145, ang, 0.2);
            }
          }
        }
      }
    }
    sound.playThrow();
  }

  _fireMeteors(w, stats) {
    const p = this.player;
    const count = w.evolved ? 4 : 1 + (w.level >= 3 ? 1 : 0) + (w.level >= 6 ? 1 : 0) + (w.level >= 8 ? 1 : 0);
    const radius = (w.evolved ? 115 : 64 + w.level * 7) * stats.area;
    const dmg = (w.evolved ? 120 : 38 + w.level * 15) * stats.might;

    const targets = this._findNearestEnemies(count, 480);
    for (let i = 0; i < count; i++) {
      let tx, ty;
      if (targets[i]) {
        tx = targets[i].x + (Math.random() - 0.5) * 30;
        ty = targets[i].y + (Math.random() - 0.5) * 30;
      } else {
        const a = Math.random() * Math.PI * 2;
        const d = 90 + Math.random() * 230;
        tx = p.x + Math.cos(a) * d;
        ty = p.y + Math.sin(a) * d;
      }
      this.meteors.push({ x: tx, y: ty, radius, damage: dmg, evolved: w.evolved, timer: 0.48, fallTime: 0.48, duration: 0.45, impacted: false });
    }
  }

  _deployTurret(w) {
    const p = this.player;
    const maxTurrets = w.evolved ? 5 : 1 + (w.level >= 3 ? 1 : 0) + (w.level >= 6 ? 1 : 0);
    if (this.turrets.length >= maxTurrets) {
      this.turrets.shift();
    }
    const a = Math.random() * Math.PI * 2;
    this.turrets.push({
      x: p.x + Math.cos(a) * 58,
      y: p.y + Math.sin(a) * 58,
      evolved: w.evolved,
      level: w.level,
      aimAngle: 0,
      fireCd: 0.1,
      life: w.evolved ? 18 : 11 + w.level * 0.9,
    });
    sound.playXp();
  }

  _fireBurstMissiles(stats) {
    const p = this.player;
    const targets = this._findNearestEnemies(3, 620);
    for (let i = 0; i < 3; i++) {
      const a = targets[i] ? Math.atan2(targets[i].y - p.y, targets[i].x - p.x) : Math.random() * Math.PI * 2;
      this.projectiles.push({
        kind: 'burstStar', weaponId: 'burst', evolved: true,
        x: p.x, y: p.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, speed: 520,
        radius: 12, damage: 34 * stats.might, pierce: 2, life: 1.5, rot: a, hitSet: new Set(), knockback: 90,
      });
    }
  }

  // ==================== ENTITY UPDATES ====================
  _updateSlashes(dt) {
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const s = this.slashes[i];
      s.x = this.player.x;
      s.y = this.player.y;
      s.life -= dt;
      if (s.life <= 0) this.slashes.splice(i, 1);
    }
  }

  _updateMeteors(dt) {
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      if (!m.impacted) {
        m.timer -= dt;
        if (m.timer <= 0) {
          m.impacted = true;
          sound.playBomb();
          this.shake = Math.max(this.shake, m.evolved ? 11 : 6);
          this._splashDamage(m.x, m.y, m.radius, m.damage, 'meteor');
          this._hitMapPropsInRadius(m.x, m.y, m.radius, m.damage);
          for (let k = 0; k < 16; k++) {
            const a = Math.random() * Math.PI * 2;
            const spd = 80 + Math.random() * 170;
            this._spawnParticle(m.x, m.y, Math.cos(a) * spd, Math.sin(a) * spd, k % 2 === 0 ? '#ff9f1c' : '#ffd166', 5, 0.5);
          }
          // Evolved Supernova Mandarin splits into 6 fiery fragments!
          if (m.evolved) {
            for (let s = 0; s < 6; s++) {
              const a = (s / 6) * Math.PI * 2;
              this.projectiles.push({
                kind: 'orange', weaponId: 'meteor', evolved: true, isShard: true,
                x: m.x, y: m.y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420,
                radius: 11, damage: m.damage * 0.42, pierce: 2, life: 0.75, rot: a, hitSet: new Set(), knockback: 90,
              });
            }
          }
        }
      } else {
        m.duration -= dt;
        if (m.duration <= 0) this.meteors.splice(i, 1);
      }
    }
  }

  _updateTurrets(dt, stats) {
    for (let i = this.turrets.length - 1; i >= 0; i--) {
      const tr = this.turrets[i];
      tr.life -= dt;
      if (tr.life <= 0) {
        this.turrets.splice(i, 1);
        continue;
      }
      // Gently follow player if far away
      const distP = Math.hypot(this.player.x - tr.x, this.player.y - tr.y);
      if (distP > 280) {
        tr.x += ((this.player.x - tr.x) / distP) * 180 * dt;
        tr.y += ((this.player.y - tr.y) / distP) * 180 * dt;
      }

      tr.fireCd -= dt;
      if (tr.fireCd <= 0) {
        const target = this._findNearestEnemies(1, 520, tr.x, tr.y)[0];
        if (target) {
          const ang = Math.atan2(target.y - tr.y, target.x - tr.x);
          tr.aimAngle = ang;
          tr.fireCd = (tr.evolved ? 0.14 : Math.max(0.22, 0.46 - tr.level * 0.03)) * stats.cooldownMult;
          const dmg = (tr.evolved ? 30 : 12 + tr.level * 4.5) * stats.might;
          const shots = tr.evolved ? [-0.08, 0.08] : [0];
          for (const off of shots) {
            this.projectiles.push({
              kind: 'turretShot', weaponId: 'turret', evolved: tr.evolved,
              x: tr.x + Math.cos(ang) * 14, y: tr.y + Math.sin(ang) * 14,
              vx: Math.cos(ang + off) * 580, vy: Math.sin(ang + off) * 580,
              radius: tr.evolved ? 8 : 6, damage: dmg,
              pierce: tr.evolved ? 3 : (tr.level >= 5 ? 2 : 1),
              life: 1.1, rot: ang + off, hitSet: new Set(), knockback: 35,
            });
          }
        } else {
          tr.fireCd = 0.15;
        }
      }
    }
  }

  _updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life -= dt;
      if (pr.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      if (pr.kind === 'minidoro' || pr.kind === 'burstStar') {
        let best = null;
        let bestD2 = 420 * 420;
        for (let j = 0; j < this.enemies.length; j++) {
          const e = this.enemies[j];
          if (pr.hitSet.has(e.id)) continue;
          const d2 = (e.x - pr.x) ** 2 + (e.y - pr.y) ** 2;
          if (d2 < bestD2) { bestD2 = d2; best = e; }
        }
        if (best) {
          const desired = Math.atan2(best.y - pr.y, best.x - pr.x);
          const cur = Math.atan2(pr.vy, pr.vx);
          let diff = desired - cur;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const next = cur + Math.max(-7 * dt, Math.min(7 * dt, diff));
          pr.vx = Math.cos(next) * pr.speed;
          pr.vy = Math.sin(next) * pr.speed;
        }
      }

      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.rot += dt * (pr.kind === 'orange' ? 12 : 4);

      if (pr.evolved && Math.random() < dt * 24) {
        this._spawnParticle(pr.x, pr.y, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, pr.kind === 'turretShot' ? '#38efdb' : '#ffd166', 3, 0.22);
      }

      this._hitMapPropsInRadius(pr.x, pr.y, pr.radius, pr.damage * 0.45);

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (pr.hitSet.has(e.id)) continue;
        const rr = pr.radius + e.radius;
        const dx = e.x - pr.x;
        const dy = e.y - pr.y;
        if (dx * dx + dy * dy <= rr * rr) {
          pr.hitSet.add(e.id);
          pr.pierce -= 1;

          const hitAngle = Math.atan2(pr.vy, pr.vx);
          this._damageEnemy(e, pr.damage, pr.weaponId, pr.knockback || 55, hitAngle);

          if (pr.kind === 'minidoro') {
            this._splashDamage(pr.x, pr.y, pr.splashRadius, pr.damage * 0.65, 'minidoro', pr.hitSet);
            for (let k = 0; k < 7; k++) {
              const a = Math.random() * Math.PI * 2;
              this._spawnParticle(pr.x, pr.y, Math.cos(a) * 120, Math.sin(a) * 120, '#ff85c0', 4, 0.32);
            }
          } else if (pr.kind === 'orange' && pr.evolved && !pr.isShard) {
            for (let s = 0; s < 3; s++) {
              const sa = hitAngle + (s - 1) * 0.9 + (Math.random() - 0.5) * 0.3;
              this.projectiles.push({
                kind: 'shard', weaponId: 'orange', isShard: true, evolved: true,
                x: pr.x, y: pr.y, vx: Math.cos(sa) * 440, vy: Math.sin(sa) * 440,
                radius: 7, damage: pr.damage * 0.45, pierce: 1, life: 0.42, rot: sa, hitSet: new Set([e.id]),
              });
            }
          }

          if (pr.pierce <= 0) {
            this.projectiles.splice(i, 1);
            break;
          }
        }
      }
    }
  }

  _updateBeams(dt) {
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      if (!b.struck) {
        b.timer -= dt;
        if (b.timer <= 0) {
          b.struck = true;
          sound.playLaser();
          this.shake = Math.max(this.shake, b.evolved ? 6 : 3);
          this._splashDamage(b.x, b.y, b.radius, b.damage, b.weaponId);
          this._hitMapPropsInRadius(b.x, b.y, b.radius, b.damage);
          for (let k = 0; k < 12; k++) {
            const a = Math.random() * Math.PI * 2;
            const spd = 60 + Math.random() * 140;
            this._spawnParticle(b.x, b.y, Math.cos(a) * spd, Math.sin(a) * spd, b.evolved ? '#38efdb' : '#ff6eb4', 4, 0.4);
          }
          if (b.evolved) {
            this.pools.push({ x: b.x, y: b.y, radius: b.radius * 0.85, damage: b.damage * 0.2, duration: 2.2, maxDuration: 2.2, tickTimer: 0.25, evolved: true, isEdenScorch: true, weaponId: 'beam' });
          }
        }
      } else {
        b.duration -= dt;
        if (b.duration <= 0) this.beams.splice(i, 1);
      }
    }
  }

  _updateNovas(dt) {
    for (let i = this.novas.length - 1; i >= 0; i--) {
      const n = this.novas[i];
      if (n.delay && n.delay > 0) { n.delay -= dt; continue; }
      n.x = this.player.x;
      n.y = this.player.y;
      n.r += dt * (n.maxR * 2.5);
      this._hitMapPropsInRadius(n.x, n.y, n.r, n.damage * 0.3);

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (n.hitSet.has(e.id)) continue;
        if (Math.hypot(e.x - n.x, e.y - n.y) <= n.r + e.radius) {
          n.hitSet.add(e.id);
          if (n.slow) e.slowTimer = Math.max(e.slowTimer, 2.2);
          this._damageEnemy(e, n.damage, n.weaponId, 175, Math.atan2(e.y - n.y, e.x - n.x));
        }
      }
      if (n.r >= n.maxR) this.novas.splice(i, 1);
    }
  }

  _updatePools(dt) {
    for (let i = this.pools.length - 1; i >= 0; i--) {
      const pool = this.pools[i];
      pool.duration -= dt;
      pool.tickTimer -= dt;
      if (pool.tickTimer <= 0) {
        pool.tickTimer = 0.28;
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if (Math.hypot(e.x - pool.x, e.y - pool.y) <= pool.radius + e.radius * 0.7) {
            if (pool.slow) e.slowTimer = Math.max(e.slowTimer, 0.8);
            this._damageEnemy(e, pool.damage, pool.weaponId, 0, 0);
          }
        }
      }
      if (pool.duration <= 0) this.pools.splice(i, 1);
    }
  }

  _splashDamage(x, y, radius, damage, weaponId, skipSet = null) {
    for (let j = this.enemies.length - 1; j >= 0; j--) {
      const e = this.enemies[j];
      if (skipSet && skipSet.has(e.id)) continue;
      if (Math.hypot(e.x - x, e.y - y) <= radius + e.radius) {
        this._damageEnemy(e, damage, weaponId, 60, Math.atan2(e.y - y, e.x - x));
      }
    }
  }

  _damageEnemy(e, rawDamage, weaponId, knockback = 0, angle = 0, extraCrit = 0) {
    if (e.hp <= 0) return;
    const isCrit = Math.random() < (this.getStats().critChance + extraCrit);
    const dmg = Math.max(1, Math.round(rawDamage * (isCrit ? 1.65 : 1) * (0.92 + Math.random() * 0.16)));
    e.hp -= dmg;
    e.hitFlash = 0.12;

    if (weaponId) {
      this.damageByWeapon[weaponId] = (this.damageByWeapon[weaponId] || 0) + dmg;
    }

    if (knockback > 0 && !e.isBoss) {
      const kb = knockback / Math.sqrt(e.mass);
      e.x += Math.cos(angle) * kb * 0.14;
      e.y += Math.sin(angle) * kb * 0.14;
    }

    sound.playHit(isCrit);

    if (this.damageNums.length < MAX_DAMAGE_NUMS) {
      this.damageNums.push({
        x: e.x + (Math.random() - 0.5) * 14,
        y: e.y - e.radius * 0.7,
        vy: -55,
        text: isCrit ? `${dmg}!` : `${dmg}`,
        color: isCrit ? '#ffd166' : '#ffffff',
        scale: isCrit ? 1.25 : 0.95,
        life: 0.65,
      });
    }

    if (e.hp <= 0) this._killEnemy(e);
  }

  _killEnemy(e) {
    const idx = this.enemies.indexOf(e);
    if (idx !== -1) this.enemies.splice(idx, 1);

    this.kills += 1;
    const coinMult = this.feverTimer > 0 ? 2 : 1;

    const stats = this.getStats();
    if (this.player.burstTimer <= 0) {
      const gain = (e.isBoss ? 35 : (e.isThief ? 12 : 1.55)) * stats.burstRate;
      this.player.burstCharge = Math.min(100, this.player.burstCharge + gain);
    }

    const sparkCount = e.isBoss ? 35 : 6;
    for (let k = 0; k < sparkCount; k++) {
      const a = Math.random() * Math.PI * 2;
      const spd = (e.isBoss ? 140 : 60) + Math.random() * 110;
      this._spawnParticle(e.x, e.y, Math.cos(a) * spd, Math.sin(a) * spd, e.isThief ? '#ffd166' : (k % 2 === 0 ? '#ff4d94' : '#ff9f1c'), e.isBoss ? 6 : 3.5, e.isBoss ? 0.75 : 0.35);
    }

    if (e.isBoss) {
      this.coinsEarned += (e.isFinalBoss ? 120 : (e.type === 'alteisen' ? 75 : 45)) * coinMult;
      this.shake = 14;
      this.pickups.push({ kind: 'chest', x: e.x, y: e.y, bob: 0 });
      for (let g = 0; g < 8; g++) {
        const a = (g / 8) * Math.PI * 2;
        this._spawnGem(e.x + Math.cos(a) * 32, e.y + Math.sin(a) * 32, Math.round(e.xp / 8));
      }
      this.cb.onRunEvent?.('bossKilled', e.type);

      if (!this.enemies.some((o) => o.isBoss) && this.player.burstTimer <= 0) {
        sound.intenseMode = false;
      }
      if (e.isFinalBoss && !this.victoryTriggered) {
        this.victoryTriggered = true;
        this.state = 'victory';
        sound.playEvolve();
        sound.stopBgm();
        this.cb.onVictory?.(this.getRunSummary());
      }
    } else if (e.isThief) {
      this.coinsEarned += 15 * coinMult;
      this._spawnGem(e.x, e.y, e.xp);
      const roll = Math.random();
      if (roll < 0.45) this.pickups.push({ kind: 'heal', x: e.x + 12, y: e.y, bob: 0 });
      else if (roll < 0.75) this.pickups.push({ kind: 'magnet', x: e.x + 12, y: e.y, bob: 0 });
      else this.pickups.push({ kind: 'chest', x: e.x + 12, y: e.y, bob: 0 });
    } else {
      this._spawnGem(e.x, e.y, e.xp);
      if (Math.random() < 0.012) {
        const r = Math.random();
        if (r < 0.55) this.pickups.push({ kind: 'heal', x: e.x, y: e.y, bob: 0 });
        else if (r < 0.82) this.pickups.push({ kind: 'magnet', x: e.x, y: e.y, bob: 0 });
        else this.pickups.push({ kind: 'bomb', x: e.x, y: e.y, bob: 0 });
      }
      if (Math.random() < 0.14) this.coinsEarned += coinMult;
    }
  }

  _updateEnemies(dt) {
    const p = this.player;
    const len = this.enemies.length;

    for (let i = 0; i < len; i++) {
      const e = this.enemies[i];
      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e.slowTimer > 0) e.slowTimer -= dt;
      if (e.freezeTimer > 0) {
        e.freezeTimer -= dt;
        continue; // Completely frozen solid!
      }

      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;

      if (!e.isBoss && dist > 1150) {
        const a = Math.random() * Math.PI * 2;
        e.x = p.x + Math.cos(a) * 620;
        e.y = p.y + Math.sin(a) * 620;
        continue;
      }

      const slowMult = e.slowTimer > 0 ? 0.55 : 1;

      if (e.isBoss) {
        e.attackCd -= dt;
        if (e.telegraphTimer > 0) {
          e.telegraphTimer -= dt;
          e.vx *= 0.8;
          e.vy *= 0.8;
          if (e.telegraphTimer <= 0) {
            e.chargeTimer = 0.95;
            sound.playBossWarning();
          }
        } else if (e.chargeTimer > 0) {
          e.chargeTimer -= dt;
          const mult = e.bossPattern === 'train' ? 3.5 : 2.8;
          e.vx = e.chargeDirX * e.speed * mult;
          e.vy = e.chargeDirY * e.speed * mult;
          if (e.bossPattern === 'train' && Math.random() < dt * 10) {
            // Train launches side missiles while charging!
            const perpX = -e.chargeDirY;
            const perpY = e.chargeDirX;
            this._spawnEnemyBullet(e.x, e.y, perpX * 190, perpY * 190, e.damage * 0.65);
            this._spawnEnemyBullet(e.x, e.y, -perpX * 190, -perpY * 190, e.damage * 0.65);
          }
        } else {
          e.vx = (dx / dist) * e.speed * slowMult;
          e.vy = (dy / dist) * e.speed * slowMult;
          if (e.attackCd <= 0) {
            if (e.bossPattern === 'train') {
              e.telegraphTimer = 0.75;
              e.chargeDirX = dx / dist;
              e.chargeDirY = dy / dist;
              e.attackCd = 4.2;
            } else if (e.bossPattern === 'charge') {
              e.chargeTimer = 0.75;
              e.chargeDirX = dx / dist;
              e.chargeDirY = dy / dist;
              e.attackCd = 3.8;
            } else if (e.bossPattern === 'barrage') {
              const base = Math.atan2(dy, dx);
              for (let b = 0; b < 10; b++) {
                const a = base + (b / 10) * Math.PI * 2;
                this._spawnEnemyBullet(e.x, e.y, Math.cos(a) * 210, Math.sin(a) * 210, e.damage * 0.7);
              }
              e.attackCd = 3.2;
            } else if (e.bossPattern === 'queen') {
              const base = this.time * 1.4;
              for (let b = 0; b < 14; b++) {
                const a = base + (b / 14) * Math.PI * 2;
                this._spawnEnemyBullet(e.x, e.y, Math.cos(a) * 225, Math.sin(a) * 225, e.damage * 0.75);
              }
              e.attackCd = 2.5;
            }
          }
        }
      } else if (e.isThief) {
        const tangentX = -dy / dist;
        const tangentY = dx / dist;
        const pull = dist > 260 ? 0.65 : -0.35;
        e.vx = ((dx / dist) * pull + tangentX * 0.85) * e.speed * slowMult;
        e.vy = ((dy / dist) * pull + tangentY * 0.85) * e.speed * slowMult;
      } else {
        e.vx = (dx / dist) * e.speed * slowMult;
        e.vy = (dy / dist) * e.speed * slowMult;
        if (e.ranged && dist < 390) {
          e.attackCd -= dt;
          if (e.attackCd <= 0) {
            e.attackCd = 3.1;
            this._spawnEnemyBullet(e.x, e.y, (dx / dist) * 195, (dy / dist) * 195, e.damage * 0.85);
          }
        }
      }

      e.x += e.vx * dt;
      e.y += e.vy * dt;

      if (dist < e.radius + p.radius - 4) {
        this._damagePlayer(e.damage);
      }
    }

    for (let i = 0; i < len; i++) {
      const a = this.enemies[i];
      for (let j = i + 1; j < Math.min(len, i + 18); j++) {
        const b = this.enemies[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minD = (a.radius + b.radius) * 0.82;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0.01 && d2 < minD * minD) {
          const d = Math.sqrt(d2);
          const overlap = (minD - d) * 0.35;
          const nx = dx / d;
          const ny = dy / d;
          if (!a.isBoss) { a.x -= nx * overlap; a.y -= ny * overlap; }
          if (!b.isBoss) { b.x += nx * overlap; b.y += ny * overlap; }
        }
      }
    }
  }

  _spawnEnemyBullet(x, y, vx, vy, damage) {
    this.enemyBullets.push({ x, y, vx, vy, radius: 7, damage, life: 3.4 });
  }

  _updateEnemyBullets(dt) {
    const p = this.player;
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0) { this.enemyBullets.splice(i, 1); continue; }
      if (Math.hypot(b.x - p.x, b.y - p.y) < b.radius + p.radius - 3) {
        this.enemyBullets.splice(i, 1);
        this._damagePlayer(b.damage);
      }
    }
  }

  _damagePlayer(amount) {
    const p = this.player;
    if (p.invuln > 0) return;
    p.hp -= Math.round(amount);
    p.invuln = 0.68;
    p.hurtFlash = 0.35;
    this.shake = 9;
    this.screenFlash = 0.35;
    this.screenFlashColor = '#ff1744';
    sound.playPlayerHurt();

    if (p.hp <= 0) {
      if (p.revivesLeft > 0) {
        p.revivesLeft -= 1;
        p.hp = p.maxHp;
        p.invuln = 2.5;
        this.screenFlash = 0.8;
        this.screenFlashColor = '#ffd166';
        sound.playFullBurst();
        this.cb.onBanner?.('reviveShout', 'gold');
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (!e.isBoss && Math.hypot(e.x - p.x, e.y - p.y) < 380) this._killEnemy(e);
        }
      } else {
        p.hp = 0;
        this.state = 'gameover';
        sound.stopBgm();
        this._emitHud();
        this.cb.onGameOver?.(this.getRunSummary());
      }
    }
  }

  _spawnGem(x, y, value) {
    if (this.gems.length >= MAX_GEMS) {
      const target = this.gems[Math.floor(Math.random() * this.gems.length)];
      if (target) { target.value += value; return; }
    }
    this.gems.push({ x, y, value, magnetized: false });
  }

  _updateGems(dt, stats) {
    const p = this.player;
    const magR2 = stats.magnet * stats.magnet;
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      const dx = p.x - g.x;
      const dy = p.y - g.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < magR2) g.magnetized = true;
      if (g.magnetized) {
        const d = Math.sqrt(d2) || 1;
        g.x += (dx / d) * 580 * dt;
        g.y += (dy / d) * 580 * dt;
      }
      if (d2 < 24 * 24) {
        this.gems.splice(i, 1);
        sound.playXp();
        this._gainXp(g.value * stats.xpMult);
      }
    }
  }

  _gainXp(amount) {
    const p = this.player;
    p.xp += amount;
    if (p.xp >= p.xpToNext) {
      p.xp -= p.xpToNext;
      p.level += 1;
      p.xpToNext = Math.round(12 + p.level * 9 + Math.pow(p.level, 1.38) * 3.2);
      sound.playLevelUp();

      const choices = this._generateUpgradeChoices(3);
      if (choices.length > 0) {
        this.state = 'modal';
        this._emitHud();
        this.cb.onLevelUp?.(choices, p.rerollsLeft);
      } else {
        p.hp = Math.min(p.maxHp, p.hp + 25);
        this.coinsEarned += 20;
      }
    }
  }

  _updatePickups(dt) {
    const p = this.player;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      pk.bob += dt * 4.5;
      if (Math.hypot(pk.x - p.x, pk.y - p.y) < 34) {
        this.pickups.splice(i, 1);
        if (pk.kind === 'heal') {
          p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.32));
          sound.playHeal();
          this.cb.onBanner?.('healPickup', 'gold');
        } else if (pk.kind === 'magnet') {
          this.gems.forEach((g) => (g.magnetized = true));
          sound.playMagnet();
          this.cb.onBanner?.('magnetPickup', 'cyan');
        } else if (pk.kind === 'bomb') {
          sound.playBomb();
          this.shake = 16;
          this.screenFlash = 0.75;
          this.screenFlashColor = '#ff6eb4';
          this.cb.onBanner?.('bombPickup', 'pink');
          for (let j = this.enemies.length - 1; j >= 0; j--) {
            const e = this.enemies[j];
            if (Math.abs(e.x - p.x) < this.width * 0.65 && Math.abs(e.y - p.y) < this.height * 0.65) {
              if (e.isBoss) this._damageEnemy(e, 320, 'burst');
              else this._killEnemy(e);
            }
          }
        } else if (pk.kind === 'chest') {
          this._openChest();
        }
      }
    }
  }

  // ==================== UPGRADES, EVOLUTION & CHESTS ====================
  getEvolvableWeapons() {
    const p = this.player;
    const ready = [];
    for (const [id, w] of Object.entries(p.weapons)) {
      const def = WEAPONS[id];
      if (!w.evolved && w.level >= def.maxLevel && (p.passives[def.synergyPassive] || 0) >= 1) {
        ready.push(id);
      }
    }
    return ready;
  }

  _generateUpgradeChoices(count = 3) {
    const p = this.player;
    const pool = [];

    for (const wid of this.getEvolvableWeapons()) pool.push({ kind: 'evolve', id: wid });

    const ownedWeaponIds = Object.keys(p.weapons);
    for (const wid of ownedWeaponIds) {
      if (p.weapons[wid].level < WEAPONS[wid].maxLevel) {
        pool.push({ kind: 'weapon', id: wid, nextLevel: p.weapons[wid].level + 1, isNew: false });
      }
    }
    if (ownedWeaponIds.length < 6) {
      for (const wid of Object.keys(WEAPONS)) {
        if (!p.weapons[wid]) pool.push({ kind: 'weapon', id: wid, nextLevel: 1, isNew: true });
      }
    }
    const ownedPassiveIds = Object.keys(p.passives);
    for (const pid of ownedPassiveIds) {
      if (p.passives[pid] < PASSIVES[pid].maxLevel) {
        pool.push({ kind: 'passive', id: pid, nextLevel: p.passives[pid] + 1, isNew: false });
      }
    }
    if (ownedPassiveIds.length < 6) {
      for (const pid of Object.keys(PASSIVES)) {
        if (!p.passives[pid]) pool.push({ kind: 'passive', id: pid, nextLevel: 1, isNew: true });
      }
    }

    const evolutions = pool.filter((x) => x.kind === 'evolve');
    const rest = pool.filter((x) => x.kind !== 'evolve').sort(() => Math.random() - 0.5);
    return [...evolutions, ...rest].slice(0, count);
  }

  applyChoice(choice) {
    const p = this.player;
    if (choice.kind === 'evolve') {
      p.weapons[choice.id].evolved = true;
      p.weapons[choice.id].cd = 0;
      sound.playEvolve();
      this.cb.onBanner?.('evolvedBanner', 'gold');
      this.cb.onRunEvent?.('evolution');
    } else if (choice.kind === 'weapon') {
      if (!p.weapons[choice.id]) {
        p.weapons[choice.id] = { level: 1, evolved: false, cd: 0.1 };
        this.damageByWeapon[choice.id] = this.damageByWeapon[choice.id] || 0;
      } else {
        p.weapons[choice.id].level += 1;
      }
    } else if (choice.kind === 'passive') {
      p.passives[choice.id] = (p.passives[choice.id] || 0) + 1;
    }
    this._emitHud();
    this.resume();
  }

  _openChest() {
    this.state = 'modal';
    const rewards = [];
    const evolvable = this.getEvolvableWeapons();

    if (evolvable.length > 0) {
      const wid = evolvable[0];
      this.player.weapons[wid].evolved = true;
      this.player.weapons[wid].cd = 0;
      rewards.push({ kind: 'evolve', id: wid });
      sound.playEvolve();
      this.cb.onRunEvent?.('evolution');
    } else {
      sound.playChest();
    }

    const extraCount = rewards.length > 0 ? 1 : (Math.random() < 0.35 ? 3 : 2);
    for (let i = 0; i < extraCount; i++) {
      const upgradable = [];
      for (const [wid, w] of Object.entries(this.player.weapons)) {
        if (w.level < WEAPONS[wid].maxLevel) upgradable.push({ kind: 'weapon', id: wid });
      }
      for (const [pid, lv] of Object.entries(this.player.passives)) {
        if (lv < PASSIVES[pid].maxLevel) upgradable.push({ kind: 'passive', id: pid });
      }
      if (upgradable.length === 0) break;
      const pick = upgradable[Math.floor(Math.random() * upgradable.length)];
      if (pick.kind === 'weapon') {
        this.player.weapons[pick.id].level += 1;
        rewards.push({ kind: 'weapon', id: pick.id, nextLevel: this.player.weapons[pick.id].level });
      } else {
        this.player.passives[pick.id] += 1;
        rewards.push({ kind: 'passive', id: pick.id, nextLevel: this.player.passives[pick.id] });
      }
    }

    const bonusCoins = (25 + Math.floor(Math.random() * 25)) * (this.feverTimer > 0 ? 2 : 1);
    this.coinsEarned += bonusCoins;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.round(this.player.maxHp * 0.25));

    this._emitHud();
    this.cb.onChestOpen?.({ rewards, bonusCoins });
  }

  _spawnParticle(x, y, vx, vy, color, size, life) {
    if (this.particles.length >= MAX_PARTICLES) return;
    this.particles.push({ x, y, vx, vy, color, size, life, maxLife: life });
  }

  _updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) { this.particles.splice(i, 1); continue; }
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.94;
      pt.vy *= 0.94;
    }
  }

  _updateDamageNums(dt) {
    for (let i = this.damageNums.length - 1; i >= 0; i--) {
      const d = this.damageNums[i];
      d.life -= dt;
      d.y += d.vy * dt;
      d.vy *= 0.92;
      if (d.life <= 0) this.damageNums.splice(i, 1);
    }
  }

  // ==================== RENDERING ====================
  _render() {
    const ctx = this.ctx;
    const p = this.player;
    if (!p) return;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    const shakeX = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    const shakeY = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    const camX = this.camX + shakeX;
    const camY = this.camY + shakeY;

    const burstAlpha = p.burstTimer > 0 ? Math.min(1, p.burstTimer) : 0;
    const feverAlpha = this.feverTimer > 0 ? Math.min(1, this.feverTimer / 2) : 0;
    drawBattlefield(ctx, camX, camY, this.width, this.height, this.time, burstAlpha, this.mapId, feverAlpha);

    ctx.save();
    ctx.translate(this.width / 2 - camX, this.height / 2 - camY);

    // 1. Pools
    for (let i = 0; i < this.pools.length; i++) {
      const pool = this.pools[i];
      const alpha = Math.min(1, pool.duration / 0.8) * 0.58;
      const g = ctx.createRadialGradient(pool.x, pool.y, pool.radius * 0.15, pool.x, pool.y, pool.radius);
      if (pool.isEdenScorch) {
        g.addColorStop(0, `rgba(56, 239, 219, ${alpha})`);
        g.addColorStop(0.65, `rgba(255, 110, 180, ${alpha * 0.7})`);
        g.addColorStop(1, 'rgba(255, 110, 180, 0)');
      } else {
        g.addColorStop(0, `rgba(255, 209, 102, ${alpha})`);
        g.addColorStop(0.65, `rgba(255, 140, 0, ${alpha * 0.85})`);
        g.addColorStop(1, 'rgba(255, 140, 0, 0)');
      }
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(pool.x, pool.y, pool.radius, 0, Math.PI * 2); ctx.fill();
    }

    // 2. Interactive Map Props
    for (const pr of this.mapProps) {
      if (Math.abs(pr.x - camX) < this.width * 0.65 && Math.abs(pr.y - camY) < this.height * 0.65) {
        drawMapProp(ctx, pr, this.time);
      }
    }

    // 3. Gems
    for (let i = 0; i < this.gems.length; i++) {
      const g = this.gems[i];
      if (Math.abs(g.x - camX) > this.width * 0.6 || Math.abs(g.y - camY) > this.height * 0.6) continue;
      let col = '#38efdb', r = 5;
      if (g.value >= 40) { col = '#ffd166'; r = 7.5; }
      else if (g.value >= 15) { col = '#ff6eb4'; r = 6.5; }
      else if (g.value >= 7) { col = '#7bf1a8'; r = 5.6; }
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y - r); ctx.lineTo(g.x + r * 0.75, g.y);
      ctx.lineTo(g.x, g.y + r); ctx.lineTo(g.x - r * 0.75, g.y);
      ctx.closePath(); ctx.fill();
    }

    // 4. Pickups
    for (const pk of this.pickups) {
      const by = Math.sin(pk.bob) * 4;
      ctx.save();
      ctx.translate(pk.x, pk.y + by);
      if (pk.kind === 'heal') {
        ctx.shadowColor = '#ff9f1c'; ctx.shadowBlur = 14;
        drawMandarin(ctx, 0, 0, 12, 0, true);
      } else if (pk.kind === 'chest') {
        const pulse = 1 + Math.sin(this.time * 7) * 0.12;
        const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 34 * pulse);
        glow.addColorStop(0, 'rgba(255, 215, 90, 0.75)');
        glow.addColorStop(1, 'rgba(255, 215, 90, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(0, 0, 34 * pulse, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3c1642'; ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2.6;
        ctx.fillRect(-14, -10, 28, 20); ctx.strokeRect(-14, -10, 28, 20);
        ctx.fillStyle = '#ffd166'; ctx.fillRect(-14, -2, 28, 4); ctx.fillRect(-3.5, -5, 7, 9);
      } else {
        ctx.fillStyle = pk.kind === 'magnet' ? 'rgba(199,125,255,0.28)' : 'rgba(255,77,148,0.32)';
        ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
        ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(pk.kind === 'magnet' ? '🧲' : '💣', 0, 1);
      }
      ctx.restore();
    }

    // 5. Deployed Doro Gun Turrets
    for (const tr of this.turrets) drawTurret(ctx, tr, this.time);

    // 6. Enemies
    for (const e of this.enemies) {
      if (!e.isBoss && (Math.abs(e.x - camX) > this.width * 0.62 || Math.abs(e.y - camY) > this.height * 0.62)) continue;
      drawEnemy(ctx, e, this.time);
    }

    // 7. Novas & Katana Slashes
    for (const n of this.novas) {
      if (n.delay && n.delay > 0) continue;
      const progress = n.r / n.maxR;
      ctx.save();
      ctx.strokeStyle = n.color;
      ctx.globalAlpha = Math.max(0, 1 - progress) * 0.85;
      ctx.lineWidth = 8 * (1 - progress * 0.6);
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.stroke();
      if (n.text && progress < 0.7) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 18px "Noto Sans TC", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(n.text, n.x, n.y - n.r * 0.72);
      }
      ctx.restore();
    }
    for (const s of this.slashes) drawKatanaSlash(ctx, s);

    // 8. Orbiting Mandarins
    if (p.weapons.orbit && this.orbitActiveTimer > 0) {
      const orbs = this._getOrbitOrbs(p.weapons.orbit, this.getStats());
      for (const orb of orbs) {
        if (orb.isMini) {
          drawDoro(ctx, orb.x, orb.y, { scale: orb.evolved ? 0.68 : 0.56, facing: orb.x >= p.x ? 1 : -1, moving: true, walkPhase: this.time * 14, variant: 'classic', time: this.time, isMini: true, crowned: orb.evolved });
        } else {
          drawMandarin(ctx, orb.x, orb.y, orb.radius, this.time * 8, orb.evolved);
        }
      }
    }

    // 9. Player DORO
    drawDoro(ctx, p.x, p.y, {
      scale: 1.15, facing: p.facing, walkPhase: p.walkPhase, moving: p.moving,
      variant: this.char.variant, hurtFlash: p.hurtFlash,
      burstActive: p.burstTimer > 0 || p.speedBoostTimer > 0,
      time: this.time, customImg: this.customImg,
    });

    const hpW = 46;
    const hpPct = Math.max(0, p.hp / p.maxHp);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(p.x - hpW / 2, p.y + 27, hpW, 5.5);
    ctx.fillStyle = hpPct > 0.35 ? '#4ef29b' : '#ff3864';
    ctx.fillRect(p.x - hpW / 2 + 1, p.y + 28, (hpW - 2) * hpPct, 3.5);

    // 10. Projectiles
    for (const pr of this.projectiles) {
      if (pr.kind === 'orange') {
        drawMandarin(ctx, pr.x, pr.y, pr.radius, pr.rot, pr.evolved);
      } else if (pr.kind === 'minidoro') {
        drawDoro(ctx, pr.x, pr.y, { scale: pr.evolved ? 0.65 : 0.54, facing: pr.vx >= 0 ? 1 : -1, moving: true, walkPhase: this.time * 18, variant: 'classic', time: this.time, isMini: true, crowned: pr.evolved });
      } else if (pr.kind === 'turretShot') {
        ctx.save();
        ctx.translate(pr.x, pr.y);
        ctx.rotate(pr.rot);
        ctx.fillStyle = pr.evolved ? '#38efdb' : '#ff6eb4';
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8;
        ctx.fillRect(-10, -2.5, 20, 5);
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(pr.x, pr.y);
        ctx.rotate(pr.rot);
        ctx.fillStyle = pr.kind === 'burstStar' ? '#ff6eb4' : '#ffd166';
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(-5, -5.5); ctx.lineTo(-2, 0); ctx.lineTo(-5, 5.5); ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // 11. Beams & Meteors
    for (const b of this.beams) {
      if (!b.struck) {
        ctx.strokeStyle = b.evolved ? 'rgba(56, 239, 219, 0.7)' : 'rgba(255, 110, 180, 0.7)';
        ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      } else {
        const a = Math.max(0, b.duration / 0.45);
        const col = b.evolved ? `rgba(56, 239, 219, ${a})` : `rgba(255, 105, 180, ${a})`;
        const beamW = b.radius * 0.9 * a;
        const grad = ctx.createLinearGradient(b.x - beamW, b.y, b.x + beamW, b.y);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.35, col);
        grad.addColorStop(0.5, `rgba(255, 255, 255, ${a})`);
        grad.addColorStop(0.65, col);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(b.x - beamW, b.y - 720, beamW * 2, 720);
      }
    }
    for (const m of this.meteors) drawMeteor(ctx, m);

    // 12. Enemy Bullets
    for (const b of this.enemyBullets) {
      ctx.fillStyle = '#ff0a54'; ctx.shadowColor = '#ff0a54'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd6e0';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.radius * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 13. Particles & Damage Numbers
    for (const pt of this.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    for (const d of this.damageNums) {
      ctx.globalAlpha = Math.min(1, d.life * 2);
      ctx.font = `900 ${Math.round(14 * d.scale)}px "Inter", "Noto Sans TC", sans-serif`;
      ctx.strokeStyle = 'rgba(15, 5, 25, 0.85)'; ctx.lineWidth = 3;
      ctx.strokeText(d.text, d.x, d.y);
      ctx.fillStyle = d.color;
      ctx.fillText(d.text, d.x, d.y);
    }
    ctx.globalAlpha = 1;

    ctx.restore(); // end world

    this._renderOffscreenPointers(ctx, camX, camY);

    if (this.pointer.active) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 165, 215, 0.45)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(this.pointer.originX, this.pointer.originY, 44, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255, 110, 180, 0.55)';
      ctx.beginPath(); ctx.arc(this.pointer.originX + this.pointer.dx * 42, this.pointer.originY + this.pointer.dy * 42, 18, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    if (this.screenFlash > 0.01) {
      ctx.fillStyle = this.screenFlashColor;
      ctx.globalAlpha = this.screenFlash * 0.35;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  _renderOffscreenPointers(ctx, camX, camY) {
    const targets = [];
    for (const e of this.enemies) {
      if (e.isBoss || e.isThief) {
        targets.push({ x: e.x, y: e.y, color: e.isBoss ? '#ff1744' : '#ffd166', icon: e.type === 'alteisen' ? '🚂' : (e.isBoss ? '💀' : '🍊') });
      }
    }
    for (const pk of this.pickups) {
      if (pk.kind === 'chest') targets.push({ x: pk.x, y: pk.y, color: '#ffd166', icon: '🎁' });
    }

    const margin = 48;
    for (const t of targets) {
      const sx = t.x - camX + this.width / 2;
      const sy = t.y - camY + this.height / 2;
      if (sx > 24 && sx < this.width - 24 && sy > 24 && sy < this.height - 24) continue;

      const ang = Math.atan2(sy - this.height / 2, sx - this.width / 2);
      const px = Math.max(margin, Math.min(this.width - margin, this.width / 2 + Math.cos(ang) * (this.width / 2 - margin)));
      const py = Math.max(margin + 36, Math.min(this.height - margin, this.height / 2 + Math.sin(ang) * (this.height / 2 - margin)));

      ctx.save();
      ctx.translate(px, py);
      ctx.fillStyle = 'rgba(20, 12, 34, 0.85)'; ctx.strokeStyle = t.color; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.font = '15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(t.icon, 0, 1);
      ctx.rotate(ang);
      ctx.fillStyle = t.color;
      ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(18, -6); ctx.lineTo(18, 6); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  _emitHud() {
    const p = this.player;
    if (!p) return;
    const boss = this.enemies.find((e) => e.isBoss) || null;
    this.cb.onHudUpdate?.({
      hp: Math.ceil(p.hp),
      maxHp: p.maxHp,
      xp: p.xp,
      xpToNext: p.xpToNext,
      level: p.level,
      time: this.time,
      kills: this.kills,
      coins: this.coinsEarned,
      burstCharge: p.burstCharge,
      burstTimer: p.burstTimer,
      feverTimer: this.feverTimer,
      endless: this.endless,
      weapons: p.weapons,
      passives: p.passives,
      boss: boss ? { name: boss.bossName, hp: Math.max(0, boss.hp), maxHp: boss.maxHp } : null,
    });
  }

  getRunSummary() {
    return {
      time: this.time,
      kills: this.kills,
      level: this.player.level,
      coinsEarned: this.coinsEarned,
      damageByWeapon: { ...this.damageByWeapon },
      weapons: this.player.weapons,
      victory: this.victoryTriggered,
      mapId: this.mapId,
    };
  }
}
