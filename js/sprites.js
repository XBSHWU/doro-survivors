// ============================================================
// DORO SURVIVORS — High-Craft Procedural Canvas Sprite Renderer
// ============================================================

/**
 * Draw the infinite Eden/Ark tactical battlefield background
 */
export function drawBattlefield(ctx, camX, camY, width, height, time, burstAlpha) {
  // Deep twilight-indigo Eden ground
  ctx.fillStyle = '#120d22';
  ctx.fillRect(0, 0, width, height);

  const tile = 96;
  const startX = Math.floor((camX - width / 2) / tile) * tile;
  const startY = Math.floor((camY - height / 2) / tile) * tile;
  const endX = camX + width / 2 + tile;
  const endY = camY + height / 2 + tile;

  ctx.save();
  ctx.translate(width / 2 - camX, height / 2 - camY);

  // Checkerboard subtle tactical floor slabs
  for (let gx = startX; gx <= endX; gx += tile) {
    for (let gy = startY; gy <= endY; gy += tile) {
      const ix = Math.round(gx / tile);
      const iy = Math.round(gy / tile);
      const hash = Math.abs(Math.sin(ix * 12.9898 + iy * 78.233) * 43758.5453) % 1;

      if ((ix + iy) % 2 === 0) {
        ctx.fillStyle = '#16102b';
        ctx.fillRect(gx, gy, tile, tile);
      }

      // Subtle tactical corner accents
      ctx.strokeStyle = burstAlpha > 0.05
        ? `rgba(255, 110, 180, ${0.12 + burstAlpha * 0.16})`
        : 'rgba(130, 96, 200, 0.11)';
      ctx.lineWidth = 1;
      ctx.strokeRect(gx + 0.5, gy + 0.5, tile - 1, tile - 1);

      // Deterministic landmarks so movement feels fast & grounded
      if (hash > 0.91) {
        // Eden glowing floor glyph
        ctx.save();
        ctx.translate(gx + tile / 2, gy + tile / 2);
        ctx.strokeStyle = 'rgba(255, 110, 180, 0.16)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.lineTo(12, 0);
        ctx.moveTo(0, -12);
        ctx.lineTo(0, 12);
        ctx.stroke();
        ctx.restore();
      } else if (hash < 0.06) {
        // Fallen glowing pink sakura petal cluster
        ctx.fillStyle = 'rgba(255, 145, 200, 0.25)';
        for (let p = 0; p < 3; p++) {
          const px = gx + 20 + p * 22;
          const py = gy + 28 + ((p * 17) % 35);
          ctx.beginPath();
          ctx.ellipse(px, py, 5, 2.5, p * 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (hash > 0.48 && hash < 0.505) {
        // Decorative tactical floor stripe
        ctx.fillStyle = 'rgba(56, 239, 219, 0.08)';
        ctx.fillRect(gx + 10, gy + tile - 14, tile - 20, 4);
      }
    }
  }

  ctx.restore();

  // Ambient Full Burst pink edge glow
  if (burstAlpha > 0.01) {
    const grad = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.25,
      width / 2, height / 2, Math.max(width, height) * 0.72
    );
    grad.addColorStop(0, 'rgba(255, 110, 180, 0)');
    grad.addColorStop(1, `rgba(255, 70, 165, ${0.28 * burstAlpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }
}

/**
 * Draw our iconic star: DORO (Classic, Eden Mecha, or Orange Gremlin)
 * Centered at (x, y), scalable via `scale`.
 */
export function drawDoro(ctx, x, y, opts = {}) {
  const {
    scale = 1,
    facing = 1, // 1 = right, -1 = left
    walkPhase = 0,
    moving = false,
    variant = 'classic',
    hurtFlash = 0,
    burstActive = false,
    time = 0,
    isMini = false,
    crowned = false,
  } = opts;

  ctx.save();
  ctx.translate(x, y);

  // Ground shadow
  ctx.fillStyle = 'rgba(5, 2, 14, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 18 * scale, 20 * scale, 7 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Full Burst aura beneath Doro
  if (burstActive && !isMini) {
    const pulse = 1 + Math.sin(time * 14) * 0.1;
    const aura = ctx.createRadialGradient(0, 2, 6, 0, 2, 46 * scale * pulse);
    aura.addColorStop(0, 'rgba(255, 210, 102, 0.55)');
    aura.addColorStop(0.5, 'rgba(255, 90, 175, 0.35)');
    aura.addColorStop(1, 'rgba(255, 90, 175, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 2, 46 * scale * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hopping squash & stretch
  const hop = moving ? Math.abs(Math.sin(walkPhase)) : Math.sin(time * 3.5) * 0.25 + 0.25;
  const bounceY = -hop * (moving ? 5.5 : 2) * scale;
  const tilt = moving ? Math.sin(walkPhase) * 0.08 : 0;

  ctx.translate(0, bounceY);
  ctx.rotate(tilt * facing);
  ctx.scale(facing * scale, scale);

  // Back twin-drill pink hair
  const hairBounce = Math.sin(walkPhase * 1.1 + 0.6) * (moving ? 3.5 : 1.2);
  drawHairDrill(ctx, -17, -2 + hairBounce, -0.35, 1.0);

  // Cute tiny angel wings on back
  const wingFlap = Math.sin(time * (burstActive ? 22 : 10)) * 0.22;
  ctx.save();
  ctx.translate(-12, 2);
  ctx.rotate(-0.35 + wingFlap);
  ctx.fillStyle = variant === 'eden' ? '#aefeff' : '#ffffff';
  ctx.strokeStyle = variant === 'eden' ? '#38efdb' : '#f3b7d4';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(-6, -3, 9, 4.5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Quadruped-chibi scuttling tiny white paws/legs!
  const legSwing = moving ? Math.sin(walkPhase * 2) * 5.5 : 0;
  ctx.fillStyle = '#fff5f8';
  ctx.strokeStyle = '#683b56';
  ctx.lineWidth = 1.8;

  // Back legs
  drawPaw(ctx, -11 - legSwing * 0.6, 14);
  drawPaw(ctx, -3 + legSwing * 0.6, 15);
  // Front legs
  drawPaw(ctx, 5 - legSwing * 0.6, 15);
  drawPaw(ctx, 11 + legSwing * 0.6, 14);

  // Frilly white-and-pink Doro dress body
  ctx.fillStyle = variant === 'eden' ? '#eefcff' : '#ffffff';
  ctx.strokeStyle = '#683b56';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(-2, 7, 15, 10, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Dress pink trim & ribbon sash
  ctx.fillStyle = variant === 'eden' ? '#38efdb' : (variant === 'gremlin' ? '#ff9f1c' : '#ff7ab8');
  ctx.beginPath();
  ctx.ellipse(-2, 10, 12, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tiny bow on back of dress
  ctx.fillStyle = variant === 'gremlin' ? '#ff9f1c' : '#ff5ca8';
  ctx.beginPath();
  ctx.ellipse(-15, 5, 4.5, 3, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // === ICONIC DORO HEAD ===
  ctx.save();
  ctx.translate(4, -8);

  // Back hair bulk (soft sakura pink)
  const hairGrad = ctx.createLinearGradient(0, -18, 0, 14);
  hairGrad.addColorStop(0, '#ffc4e1');
  hairGrad.addColorStop(0.55, '#ff94c8');
  hairGrad.addColorStop(1, '#f06ba9');
  ctx.fillStyle = hairGrad;
  ctx.strokeStyle = '#683b56';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(-1, -1, 15.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Face oval (pale cream)
  ctx.fillStyle = '#fff3ed';
  ctx.beginPath();
  ctx.ellipse(2.5, 1.5, 11.5, 10.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Front hair bangs (iconic Doro wavy pink fringe)
  ctx.fillStyle = hairGrad;
  ctx.beginPath();
  ctx.moveTo(-12, -3);
  ctx.quadraticCurveTo(-8, -16, 4, -15);
  ctx.quadraticCurveTo(15, -14, 15, -2);
  ctx.lineTo(11, -5);
  ctx.lineTo(8, 0);
  ctx.lineTo(4, -6);
  ctx.lineTo(0, 0);
  ctx.lineTo(-4, -5);
  ctx.lineTo(-8, 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Rosy cheeks
  ctx.fillStyle = 'rgba(255, 115, 155, 0.55)';
  ctx.beginPath();
  ctx.ellipse(-3.5, 5, 2.8, 1.6, 0, 0, Math.PI * 2);
  ctx.ellipse(10.5, 5, 2.8, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes & Mouth (Dynamic expression!)
  if (hurtFlash > 0) {
    // > < hurt expression
    ctx.strokeStyle = '#5a2a47';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, 0.5); ctx.lineTo(-1, 2.5); ctx.lineTo(-4, 4.5);
    ctx.moveTo(10, 0.5); ctx.lineTo(7, 2.5); ctx.lineTo(10, 4.5);
    ctx.stroke();
    // O mouth
    ctx.fillStyle = '#ff6b9d';
    ctx.beginPath();
    ctx.arc(3.5, 6.8, 1.8, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Big iconic Doro wide-set eyes!
    drawDoroEye(ctx, -1.5, 2.2, burstActive, variant === 'gremlin');
    drawDoroEye(ctx, 8.2, 2.2, burstActive, variant === 'gremlin');

    // Iconic tiny smug cat-smile :3
    ctx.strokeStyle = '#683b56';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(1.2, 6.2);
    ctx.quadraticCurveTo(2.4, 7.8, 3.6, 6.4);
    ctx.quadraticCurveTo(4.8, 7.8, 6.0, 6.2);
    ctx.stroke();
  }

  // Front bouncy side-drill hair
  drawHairDrill(ctx, -11, 5 - hairBounce * 0.8, 0.12, 0.82);

  // Head accessories by variant!
  if (variant === 'classic') {
    // Iconic white ribbon bow + tiny wing hairpin
    drawRibbonBow(ctx, -2, -14.5, '#ffffff', '#ff7ab8');
  } else if (variant === 'eden') {
    // Glowing floating Eden Halo!
    ctx.save();
    ctx.translate(0, -21 + Math.sin(time * 5) * 1.5);
    ctx.strokeStyle = '#38efdb';
    ctx.lineWidth = 2.6;
    ctx.shadowColor = '#38efdb';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 3.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    drawRibbonBow(ctx, -2, -14.5, '#e0ffff', '#38efdb');
  } else if (variant === 'gremlin') {
    // Giant juicy mandarin perched on Doro's head!
    drawMandarin(ctx, 1, -18, 8.5, 0, false);
  }

  // Optional gold crown for evolved Mini-Doros!
  if (crowned) {
    ctx.fillStyle = '#ffd166';
    ctx.strokeStyle = '#a66300';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-6, -15);
    ctx.lineTo(-7, -22);
    ctx.lineTo(-2, -18);
    ctx.lineTo(1, -24);
    ctx.lineTo(4, -18);
    ctx.lineTo(8, -22);
    ctx.lineTo(7, -15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore(); // end head

  // White damage flash overlay
  if (hurtFlash > 0) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.65, hurtFlash)})`;
    ctx.fillRect(-35, -35, 70, 70);
  }

  ctx.restore();
}

function drawPaw(ctx, x, y) {
  ctx.beginPath();
  ctx.ellipse(x, y, 3.6, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawHairDrill(ctx, x, y, rot, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  const g = ctx.createLinearGradient(0, -8, 0, 14);
  g.addColorStop(0, '#ffb8dc');
  g.addColorStop(1, '#e85d9e');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#683b56';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.bezierCurveTo(-9, -4, -10, 6, -3, 13);
  ctx.bezierCurveTo(1, 16, 6, 12, 4, 5);
  ctx.bezierCurveTo(6, -1, 4, -6, 0, -6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawDoroEye(ctx, x, y, starEyes, smug) {
  // Eye white + iris
  ctx.fillStyle = '#3b2459';
  ctx.beginPath();
  ctx.ellipse(x, y, 3.1, smug ? 2.4 : 3.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Gradient inner iris (Dorothy's iconic sky-blue / pink)
  const g = ctx.createLinearGradient(x, y - 3, x, y + 3);
  g.addColorStop(0, starEyes ? '#ffd166' : '#64dfdf');
  g.addColorStop(1, starEyes ? '#ff4d94' : '#ff85c0');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y + 0.5, 2.3, smug ? 1.7 : 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bright anime sparkle dot
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - 0.9, y - 1.1, 1.15, 0, Math.PI * 2);
  ctx.fill();

  if (smug) {
    // Smug eyelid line
    ctx.strokeStyle = '#5a2a47';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - 3.4, y - 1.6);
    ctx.lineTo(x + 3.4, y - 1.2);
    ctx.stroke();
  }
}

function drawRibbonBow(ctx, x, y, fill, outline) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = fill;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(-5, -1, 5.2, 3.2, -0.35, 0, Math.PI * 2);
  ctx.ellipse(5, -1, 5.2, 3.2, 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.arc(0, -0.5, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draw a juicy spinning Mandarin Orange (or Evolved Golden Mandarin!)
 */
export function drawMandarin(ctx, x, y, radius, angle = 0, evolved = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Outer glow for evolved golden mandarin
  if (evolved) {
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = 14;
  }

  const grad = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, radius * 0.15, 0, 0, radius);
  if (evolved) {
    grad.addColorStop(0, '#fff7cc');
    grad.addColorStop(0.5, '#ffd166');
    grad.addColorStop(1, '#ff8800');
  } else {
    grad.addColorStop(0, '#ffd166');
    grad.addColorStop(0.45, '#ff9f1c');
    grad.addColorStop(1, '#e85d04');
  }

  ctx.fillStyle = grad;
  ctx.strokeStyle = evolved ? '#fff3b0' : '#7f2b00';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 1.06, radius * 0.94, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Glossy specular highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.ellipse(-radius * 0.32, -radius * 0.3, radius * 0.28, radius * 0.16, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Cute green leaf on top
  ctx.fillStyle = '#40c057';
  ctx.strokeStyle = '#1b5e20';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(radius * 0.25, -radius * 0.92, radius * 0.42, radius * 0.22, -0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw NIKKE Rapture-inspired enemies & Tyrant Bosses
 */
export function drawEnemy(ctx, e, time) {
  ctx.save();
  ctx.translate(e.x, e.y);

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(0, e.radius * 0.85, e.radius * 0.88, e.radius * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  const wobble = Math.sin(time * 9 + e.seed) * 0.08;
  const flash = e.hitFlash > 0;
  const r = e.radius;

  if (e.isBoss) {
    drawBossSprite(ctx, e, time, flash);
    ctx.restore();
    return;
  }

  ctx.rotate(wobble);

  if (e.type === 'drone') {
    // Dark crimson mechanical Rapture Drone with glowing red eye
    ctx.fillStyle = flash ? '#ffffff' : '#26182c';
    ctx.strokeStyle = flash ? '#ff99cc' : '#ff2e63';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Mechanical side wings/legs
    ctx.strokeStyle = flash ? '#ffffff' : '#6f223d';
    ctx.lineWidth = 2.6;
    for (let s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.7, -2);
      ctx.lineTo(s * r * 1.25, -6 + Math.sin(time * 12 + e.seed) * 3);
      ctx.moveTo(s * r * 0.7, 4);
      ctx.lineTo(s * r * 1.2, 8 - Math.sin(time * 12 + e.seed) * 3);
      ctx.stroke();
    }

    // Glowing red Rapture core eye
    ctx.fillStyle = '#ff1e56';
    ctx.shadowColor = '#ff1e56';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd6e0';
    ctx.beginPath();
    ctx.arc(-2, -2, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'spider') {
    // 6-legged Rapture Spider Stalker
    ctx.strokeStyle = flash ? '#ffffff' : '#ff3864';
    ctx.lineWidth = 2.2;
    for (let i = -1; i <= 1; i++) {
      const legWave = Math.sin(time * 14 + e.seed + i) * 4;
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, i * 5);
      ctx.lineTo(-r * 1.25, i * 9 + legWave);
      ctx.moveTo(r * 0.5, i * 5);
      ctx.lineTo(r * 1.25, i * 9 - legWave);
      ctx.stroke();
    }
    ctx.fillStyle = flash ? '#ffffff' : '#1e1326';
    ctx.strokeStyle = '#ff2a5f';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.85, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Triple red sensors
    ctx.fillStyle = '#ff1744';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(i * 4.5, -1, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (e.type === 'shield') {
    // Heavy Hex-Armored Shield Rapture
    ctx.fillStyle = flash ? '#ffffff' : '#2d1936';
    ctx.strokeStyle = flash ? '#ffffff' : '#b5179e';
    ctx.lineWidth = 3;
    drawPolygon(ctx, 0, 0, r, 6, Math.PI / 6);
    ctx.fill();
    ctx.stroke();

    // Inner armored core
    ctx.strokeStyle = '#ff4d6d';
    ctx.lineWidth = 2;
    drawPolygon(ctx, 0, 0, r * 0.56, 6, Math.PI / 6);
    ctx.stroke();

    ctx.fillStyle = '#ff0a54';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'charger') {
    // Sleek Blade-Horned Sprinter
    const ang = Math.atan2(e.vy || 0, e.vx || 1);
    ctx.rotate(ang - wobble);
    ctx.fillStyle = flash ? '#ffffff' : '#2a1228';
    ctx.strokeStyle = '#ff3864';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r * 1.2, 0);
    ctx.lineTo(-r * 0.8, -r * 0.8);
    ctx.lineTo(-r * 0.4, 0);
    ctx.lineTo(-r * 0.8, r * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ff9900';
    ctx.beginPath();
    ctx.arc(r * 0.15, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'artillery') {
    // Hovering Rapture Cannon Turret
    ctx.fillStyle = flash ? '#ffffff' : '#2b1433';
    ctx.strokeStyle = '#ff5c8a';
    ctx.lineWidth = 2.4;
    drawPolygon(ctx, 0, 0, r * 0.95, 8, time * 0.8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ff0054';
    ctx.shadowColor = '#ff0054';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'thief') {
    // Hilarious Orange Thief Rapture carrying a glowing mandarin!
    ctx.fillStyle = flash ? '#ffffff' : '#3a2210';
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 2, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Glowing golden aura
    ctx.strokeStyle = `rgba(255, 209, 102, ${0.45 + Math.sin(time * 12) * 0.3})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.22, 0, Math.PI * 2);
    ctx.stroke();

    // Stolen mandarin on its back!
    drawMandarin(ctx, 0, -r * 0.65, 9.5, time * 4, true);
  }

  // Slow frost/citrus tint ring
  if (e.slowTimer > 0) {
    ctx.strokeStyle = 'rgba(255, 183, 3, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r + 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawBossSprite(ctx, e, time, flash) {
  const r = e.radius;
  const pulse = 1 + Math.sin(time * 6) * 0.05;

  // Menacing crimson ground ring
  ctx.strokeStyle = 'rgba(255, 0, 90, 0.55)';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 6]);
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.32, time * 0.8, time * 0.8 + Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  if (e.type === 'gravedigger') {
    // Spinning drill mecha segments
    ctx.save();
    ctx.rotate(time * 3);
    ctx.fillStyle = flash ? '#ffffff' : '#2b1224';
    ctx.strokeStyle = '#ff2a5f';
    ctx.lineWidth = 3.5;
    drawStar(ctx, 0, 0, 8, r * 1.05, r * 0.72);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Central drill core
    ctx.fillStyle = flash ? '#ffffff' : '#ff1e56';
    ctx.shadowColor = '#ff1e56';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.42 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff0f3';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'chatterbox') {
    // Winged crimson-gold Tyrant
    ctx.fillStyle = flash ? '#ffffff' : '#250e23';
    ctx.strokeStyle = '#ff0054';
    ctx.lineWidth = 3.5;
    // Broad mechanical wings
    for (let s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.4, -8);
      ctx.lineTo(s * r * 1.45, -r * 0.65);
      ctx.lineTo(s * r * 1.2, r * 0.45);
      ctx.lineTo(s * r * 0.4, r * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // Armored torso
    drawPolygon(ctx, 0, 0, r * 0.88, 6, 0);
    ctx.fill();
    ctx.stroke();

    // Glowing tyrant visor
    ctx.fillStyle = '#ffbe0b';
    ctx.shadowColor = '#ff0054';
    ctx.shadowBlur = 16;
    ctx.fillRect(-r * 0.45, -6, r * 0.9, 10);
  } else {
    // FINAL BOSS: RAPTURE QUEEN CORE (sacred geometry rotating orbital rings)
    ctx.save();
    ctx.rotate(time * 1.2);
    ctx.strokeStyle = '#ff006e';
    ctx.lineWidth = 3.5;
    drawPolygon(ctx, 0, 0, r * 1.18, 6, 0);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.rotate(-time * 1.7);
    ctx.strokeStyle = '#ffbe0b';
    ctx.lineWidth = 2.5;
    drawStar(ctx, 0, 0, 6, r * 1.05, r * 0.65);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = flash ? '#ffffff' : '#1b0724';
    ctx.strokeStyle = '#ff4d94';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Radiant Queen eye
    const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, r * 0.45);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, '#ff006e');
    grad.addColorStop(1, 'rgba(255,0,110,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.48 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawPolygon(ctx, x, y, radius, sides, rotation = 0) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rotation + (i * Math.PI * 2) / sides;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function drawStar(ctx, x, y, points, outerR, innerR) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i * Math.PI) / points;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/**
 * Draw animated Title Screen Hero Scene (Doro on glowing mandarins in Eden)
 */
export function drawTitleHeroScene(canvas, time, selectedVariant = 'classic') {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || 420;
  const h = canvas.clientHeight || 220;
  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
  }
  ctx.save();
  ctx.scale(dpr, dpr);

  // Sunset Eden sky gradient
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#1e1038');
  bg.addColorStop(0.55, '#3b154d');
  bg.addColorStop(1, '#5e1a4a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Radiant halo sun behind Doro
  const sun = ctx.createRadialGradient(w * 0.5, h * 0.54, 12, w * 0.5, h * 0.54, h * 0.65);
  sun.addColorStop(0, 'rgba(255, 210, 120, 0.55)');
  sun.addColorStop(0.4, 'rgba(255, 110, 180, 0.3)');
  sun.addColorStop(1, 'rgba(255, 110, 180, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);

  // Rotating sacred Eden tech ring
  ctx.save();
  ctx.translate(w * 0.5, h * 0.52);
  ctx.rotate(time * 0.3);
  ctx.strokeStyle = 'rgba(255, 180, 220, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.arc(0, 0, h * 0.38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Orbiting glowing mandarins
  for (let i = 0; i < 6; i++) {
    const a = time * 1.1 + (i * Math.PI * 2) / 6;
    const mx = w * 0.5 + Math.cos(a) * (w * 0.34);
    const my = h * 0.54 + Math.sin(a) * (h * 0.28);
    drawMandarin(ctx, mx, my, 12, time * 2 + i, i % 2 === 0);
  }

  // Drifting sakura petals
  ctx.fillStyle = 'rgba(255, 165, 215, 0.65)';
  for (let i = 0; i < 14; i++) {
    const px = ((i * 73 + time * 32) % (w + 30)) - 15;
    const py = ((i * 41 + time * 18 + Math.sin(time + i) * 14) % (h + 20)) - 10;
    ctx.beginPath();
    ctx.ellipse(px, py, 5, 2.6, time + i, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mini sidekick Doros flanking
  drawDoro(ctx, w * 0.24, h * 0.66, {
    scale: 1.05, facing: 1, moving: true, walkPhase: time * 7, variant: 'classic', time, isMini: true,
  });
  drawDoro(ctx, w * 0.76, h * 0.66, {
    scale: 1.05, facing: -1, moving: true, walkPhase: time * 7 + 1.5, variant: 'gremlin', time, isMini: true,
  });

  // Hero Center Doro!
  drawDoro(ctx, w * 0.5, h * 0.54, {
    scale: 2.35,
    facing: 1,
    moving: true,
    walkPhase: time * 5.2,
    variant: selectedVariant,
    burstActive: true,
    time,
  });

  ctx.restore();
}

/**
 * Draw dramatic anime FULL BURST cut-in canvas
 */
export function drawBurstCutIn(canvas, variant = 'classic') {
  const ctx = canvas.getContext('2d');
  const w = 640;
  const h = 180;
  canvas.width = w;
  canvas.height = h;

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#2a0845');
  bg.addColorStop(0.5, '#ff2a85');
  bg.addColorStop(1, '#ff9f1c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Anime speed lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  for (let i = 0; i < 36; i++) {
    const y = (i / 36) * h;
    ctx.lineWidth = 1 + (i % 3);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y + ((i % 2 === 0 ? 1 : -1) * 8));
    ctx.stroke();
  }

  // Flying golden oranges
  drawMandarin(ctx, 110, 48, 22, 0.4, true);
  drawMandarin(ctx, 540, 125, 26, -0.5, true);
  drawMandarin(ctx, 485, 42, 16, 1.1, false);

  // Big close-up sparkling Doro
  drawDoro(ctx, 210, 102, {
    scale: 3.1,
    facing: 1,
    moving: false,
    variant,
    burstActive: true,
    time: 1.2,
  });
}
