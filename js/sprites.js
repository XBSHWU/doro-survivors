// ============================================================
// DORO SURVIVORS 2.0 — Procedural Canvas Sprite & Map Renderer
// ============================================================

/**
 * Draw any of the 3 tactical battlefields: 'eden' | 'ark' | 'snow'
 */
export function drawBattlefield(ctx, camX, camY, width, height, time, burstAlpha, mapId = 'eden', feverAlpha = 0) {
  const palette = {
    eden: { bg: '#120d22', alt: '#16102b', line: 'rgba(130, 96, 200, 0.11)', accent: 'rgba(255, 110, 180, 0.18)' },
    ark:  { bg: '#090d1e', alt: '#0e152e', line: 'rgba(56, 239, 219, 0.12)', accent: 'rgba(255, 42, 133, 0.22)' },
    snow: { bg: '#10182b', alt: '#16223a', line: 'rgba(165, 216, 255, 0.12)', accent: 'rgba(116, 192, 252, 0.22)' },
  }[mapId] || { bg: '#120d22', alt: '#16102b', line: 'rgba(130, 96, 200, 0.11)', accent: 'rgba(255, 110, 180, 0.18)' };

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

  const tile = 96;
  const startX = Math.floor((camX - width / 2) / tile) * tile;
  const startY = Math.floor((camY - height / 2) / tile) * tile;
  const endX = camX + width / 2 + tile;
  const endY = camY + height / 2 + tile;

  ctx.save();
  ctx.translate(width / 2 - camX, height / 2 - camY);

  for (let gx = startX; gx <= endX; gx += tile) {
    for (let gy = startY; gy <= endY; gy += tile) {
      const ix = Math.round(gx / tile);
      const iy = Math.round(gy / tile);
      const hash = Math.abs(Math.sin(ix * 12.9898 + iy * 78.233) * 43758.5453) % 1;

      if ((ix + iy) % 2 === 0) {
        ctx.fillStyle = palette.alt;
        ctx.fillRect(gx, gy, tile, tile);
      }

      ctx.strokeStyle = burstAlpha > 0.05
        ? `rgba(255, 110, 180, ${0.14 + burstAlpha * 0.16})`
        : (feverAlpha > 0.05 ? `rgba(255, 209, 102, ${0.14 + feverAlpha * 0.14})` : palette.line);
      ctx.lineWidth = 1;
      ctx.strokeRect(gx + 0.5, gy + 0.5, tile - 1, tile - 1);

      if (mapId === 'eden') {
        if (hash > 0.91) {
          ctx.save();
          ctx.translate(gx + tile / 2, gy + tile / 2);
          ctx.strokeStyle = palette.accent;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 22, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-12, 0); ctx.lineTo(12, 0);
          ctx.moveTo(0, -12); ctx.lineTo(0, 12);
          ctx.stroke();
          ctx.restore();
        } else if (hash < 0.07) {
          ctx.fillStyle = 'rgba(255, 145, 200, 0.25)';
          for (let p = 0; p < 3; p++) {
            ctx.beginPath();
            ctx.ellipse(gx + 20 + p * 22, gy + 28 + ((p * 17) % 35), 5, 2.5, p * 0.9, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (mapId === 'ark') {
        // Cyberpunk neon highway chevron & glowing strips
        if (iy % 4 === 0) {
          ctx.fillStyle = 'rgba(56, 239, 219, 0.11)';
          ctx.fillRect(gx + 10, gy + tile / 2 - 2, tile - 20, 4);
        }
        if (hash > 0.88) {
          ctx.strokeStyle = 'rgba(255, 42, 133, 0.24)';
          ctx.lineWidth = 1.6;
          ctx.strokeRect(gx + 14, gy + 14, tile - 28, tile - 28);
        }
      } else if (mapId === 'snow') {
        // Snow drifts & icy star glyphs
        if (hash > 0.87) {
          ctx.fillStyle = 'rgba(208, 235, 255, 0.11)';
          ctx.beginPath();
          ctx.ellipse(gx + 48, gy + 48, 30, 16, hash * 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (hash < 0.08) {
          ctx.strokeStyle = 'rgba(116, 192, 252, 0.26)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(gx + 40, gy + 48); ctx.lineTo(gx + 56, gy + 48);
          ctx.moveTo(gx + 48, gy + 40); ctx.lineTo(gx + 48, gy + 56);
          ctx.stroke();
        }
      }
    }
  }

  ctx.restore();

  // Falling ambient snow on snow map
  if (mapId === 'snow') {
    ctx.fillStyle = 'rgba(225, 244, 255, 0.55)';
    for (let i = 0; i < 28; i++) {
      const sx = ((i * 97 + time * (24 + (i % 4) * 8) - camX * 0.3) % width + width) % width;
      const sy = ((i * 61 + time * (45 + (i % 5) * 12) - camY * 0.3) % height + height) % height;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5 + (i % 3) * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Golden Mandarin Fever warm radiant vignette
  if (feverAlpha > 0.01) {
    const grad = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.28,
      width / 2, height / 2, Math.max(width, height) * 0.75
    );
    grad.addColorStop(0, 'rgba(255, 209, 102, 0)');
    grad.addColorStop(1, `rgba(255, 168, 0, ${0.28 * feverAlpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // Full Burst pink edge glow
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
 * Draw Interactive Map Props (Orange Supply Crate, Ark Speed Pad, Frost Crystal)
 */
export function drawMapProp(ctx, prop, time) {
  ctx.save();
  ctx.translate(prop.x, prop.y);

  if (prop.kind === 'crate') {
    const flash = prop.hitFlash > 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 18, 20, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = flash ? '#ffffff' : '#6b3e1e';
    ctx.strokeStyle = '#ff9f1c';
    ctx.lineWidth = 2.4;
    ctx.fillRect(-16, -16, 32, 32);
    ctx.strokeRect(-16, -16, 32, 32);
    // Cross planks
    ctx.strokeStyle = '#a6632c';
    ctx.beginPath();
    ctx.moveTo(-14, -14); ctx.lineTo(14, 14);
    ctx.moveTo(14, -14); ctx.lineTo(-14, 14);
    ctx.stroke();
    // Cute mandarin emblem
    drawMandarin(ctx, 0, 0, 7.5, 0, false);
  } else if (prop.kind === 'boost') {
    const pulse = 0.65 + Math.sin(time * 7 + prop.seed) * 0.35;
    const ready = prop.cooldown <= 0;
    ctx.strokeStyle = ready ? `rgba(56, 239, 219, ${pulse})` : 'rgba(120, 140, 160, 0.3)';
    ctx.fillStyle = ready ? 'rgba(56, 239, 219, 0.16)' : 'rgba(60, 70, 90, 0.14)';
    ctx.lineWidth = 2.4;
    drawPolygon(ctx, 0, 0, 26, 6, Math.PI / 6);
    ctx.fill();
    ctx.stroke();

    // Glowing chevron bolt
    ctx.fillStyle = ready ? '#38efdb' : '#6c757d';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', 0, 1);
  } else if (prop.kind === 'crystal') {
    const flash = prop.hitFlash > 0;
    const pulse = 1 + Math.sin(time * 5 + prop.seed) * 0.08;
    ctx.shadowColor = '#74c0fc';
    ctx.shadowBlur = 14;
    ctx.fillStyle = flash ? '#ffffff' : '#74c0fc';
    ctx.strokeStyle = '#e7f5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -22 * pulse);
    ctx.lineTo(15 * pulse, -3);
    ctx.lineTo(9 * pulse, 18 * pulse);
    ctx.lineTo(-9 * pulse, 18 * pulse);
    ctx.lineTo(-15 * pulse, -3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

/**
 * Draw DORO — supports all 6 NIKKE variants + user custom uploaded image!
 */
export function drawDoro(ctx, x, y, opts = {}) {
  const {
    scale = 1,
    facing = 1,
    walkPhase = 0,
    moving = false,
    variant = 'classic',
    hurtFlash = 0,
    burstActive = false,
    time = 0,
    isMini = false,
    crowned = false,
    customImg = null,
  } = opts;

  ctx.save();
  ctx.translate(x, y);

  // Ground shadow
  ctx.fillStyle = 'rgba(5, 2, 14, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 18 * scale, 20 * scale, 7 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Full Burst aura
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

  const hop = moving ? Math.abs(Math.sin(walkPhase)) : Math.sin(time * 3.5) * 0.25 + 0.25;
  const bounceY = -hop * (moving ? 5.5 : 2) * scale;
  const tilt = moving ? Math.sin(walkPhase) * 0.08 : 0;

  ctx.translate(0, bounceY);
  ctx.rotate(tilt * facing);

  // === CUSTOM UPLOADED AVATAR MODE ===
  if (customImg && customImg.complete && customImg.naturalWidth > 0 && !isMini) {
    ctx.save();
    ctx.scale(facing * scale, scale);
    const r = 23;
    ctx.beginPath();
    ctx.arc(0, -2, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    ctx.drawImage(customImg, -r, -2 - r, r * 2, r * 2);
    ctx.restore();

    ctx.strokeStyle = burstActive ? '#ffd166' : '#ff6eb4';
    ctx.lineWidth = 3;
    ctx.stroke();

    if (hurtFlash > 0) {
      ctx.fillStyle = `rgba(255, 60, 100, ${Math.min(0.6, hurtFlash)})`;
      ctx.beginPath();
      ctx.arc(0, -2, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.restore();
    return;
  }

  ctx.scale(facing * scale, scale);

  // Hair & outfit color palette by NIKKE Doro variant
  const hairColors = {
    classic:   ['#ffc4e1', '#ff94c8', '#f06ba9'],
    eden:      ['#ffc4e1', '#ff94c8', '#f06ba9'],
    gremlin:   ['#ffc4e1', '#ff94c8', '#f06ba9'],
    scarlet:   ['#3a2e40', '#23192b', '#140c1a'],
    snowwhite: ['#ffffff', '#e6edf7', '#b8c8df'],
    modernia:  ['#4e3b5c', '#2c1e38', '#1a0f26'],
  }[variant] || ['#ffc4e1', '#ff94c8', '#f06ba9'];

  const dressColor = {
    classic: '#ffffff',
    eden: '#eefcff',
    gremlin: '#fff5eb',
    scarlet: '#ffe5ec',
    snowwhite: '#dfe7f2',
    modernia: '#22152e',
  }[variant] || '#ffffff';

  const sashColor = {
    classic: '#ff7ab8',
    eden: '#38efdb',
    gremlin: '#ff9f1c',
    scarlet: '#e63946',
    snowwhite: '#495057',
    modernia: '#ff2a85',
  }[variant] || '#ff7ab8';

  const hairBounce = Math.sin(walkPhase * 1.1 + 0.6) * (moving ? 3.5 : 1.2);
  drawHairDrill(ctx, -17, -2 + hairBounce, -0.35, 1.0, hairColors);

  // Back wing / Modernia pods / Snow White cloak
  const wingFlap = Math.sin(time * (burstActive ? 22 : 10)) * 0.22;
  if (variant === 'modernia') {
    // Floating crimson-violet wing pods!
    ctx.save();
    ctx.translate(-14, -4 + Math.sin(time * 7) * 2.5);
    ctx.fillStyle = '#2b1238';
    ctx.strokeStyle = '#ff2a85';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -8); ctx.lineTo(-14, -14); ctx.lineTo(-10, 4); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  } else if (variant === 'snowwhite') {
    // Weathered tactical cloak
    ctx.fillStyle = '#adb5bd';
    ctx.strokeStyle = '#495057';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-8, -2); ctx.lineTo(-22, 12); ctx.lineTo(-4, 14); ctx.closePath();
    ctx.fill(); ctx.stroke();
  } else {
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
  }

  // Quadruped-chibi scuttling tiny paws
  const legSwing = moving ? Math.sin(walkPhase * 2) * 5.5 : 0;
  ctx.fillStyle = variant === 'modernia' ? '#3a2247' : '#fff5f8';
  ctx.strokeStyle = '#5a2d4c';
  ctx.lineWidth = 1.8;
  drawPaw(ctx, -11 - legSwing * 0.6, 14);
  drawPaw(ctx, -3 + legSwing * 0.6, 15);
  drawPaw(ctx, 5 - legSwing * 0.6, 15);
  drawPaw(ctx, 11 + legSwing * 0.6, 14);

  // Dress body
  ctx.fillStyle = dressColor;
  ctx.strokeStyle = '#5a2d4c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(-2, 7, 15, 10, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Sash trim
  ctx.fillStyle = sashColor;
  ctx.beginPath();
  ctx.ellipse(-2, 10, 12, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Scarlet carries a tiny glowing crimson blade on her side!
  if (variant === 'scarlet') {
    ctx.save();
    ctx.translate(6, 9);
    ctx.rotate(-0.22);
    ctx.strokeStyle = '#ff2a5f';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-14, 0); ctx.lineTo(14, -4);
    ctx.stroke();
    ctx.restore();
  }

  // === ICONIC DORO HEAD ===
  ctx.save();
  ctx.translate(4, -8);

  const hairGrad = ctx.createLinearGradient(0, -18, 0, 14);
  hairGrad.addColorStop(0, hairColors[0]);
  hairGrad.addColorStop(0.55, hairColors[1]);
  hairGrad.addColorStop(1, hairColors[2]);
  ctx.fillStyle = hairGrad;
  ctx.strokeStyle = '#5a2d4c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(-1, -1, 15.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Face oval
  ctx.fillStyle = '#fff3ed';
  ctx.beginPath();
  ctx.ellipse(2.5, 1.5, 11.5, 10.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Front hair bangs
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

  // Eyes & expression
  if (hurtFlash > 0) {
    ctx.strokeStyle = '#5a2a47';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, 0.5); ctx.lineTo(-1, 2.5); ctx.lineTo(-4, 4.5);
    ctx.moveTo(10, 0.5); ctx.lineTo(7, 2.5); ctx.lineTo(10, 4.5);
    ctx.stroke();
    ctx.fillStyle = '#ff6b9d';
    ctx.beginPath();
    ctx.arc(3.5, 6.8, 1.8, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const eyeMode = variant === 'modernia' ? 'crimson' : (variant === 'scarlet' ? 'amber' : 'default');
    drawDoroEye(ctx, -1.5, 2.2, burstActive, variant === 'gremlin' || variant === 'scarlet', eyeMode);
    drawDoroEye(ctx, 8.2, 2.2, burstActive, variant === 'gremlin' || variant === 'scarlet', eyeMode);

    // Snow White cool hair-band across forehead
    if (variant === 'snowwhite') {
      ctx.fillStyle = '#2b2d42';
      ctx.fillRect(-10, -5.5, 23, 3.5);
    }

    // Iconic :3 cat smile
    ctx.strokeStyle = '#683b56';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(1.2, 6.2);
    ctx.quadraticCurveTo(2.4, 7.8, 3.6, 6.4);
    ctx.quadraticCurveTo(4.8, 7.8, 6.0, 6.2);
    ctx.stroke();
  }

  // Front side-drill
  drawHairDrill(ctx, -11, 5 - hairBounce * 0.8, 0.12, 0.82, hairColors);

  // Headgear by variant!
  if (variant === 'classic') {
    drawRibbonBow(ctx, -2, -14.5, '#ffffff', '#ff7ab8');
  } else if (variant === 'eden') {
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
    drawMandarin(ctx, 1, -18, 8.5, 0, false);
  } else if (variant === 'scarlet') {
    // Iconic Scarlet wide bamboo straw hat (斗笠)!
    ctx.save();
    ctx.translate(0, -13);
    ctx.fillStyle = '#e9c46a';
    ctx.strokeStyle = '#7f4f24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-24, 2);
    ctx.quadraticCurveTo(0, -16, 24, 2);
    ctx.quadraticCurveTo(0, -1, -24, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Red ribbon band on hat
    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-11, -3); ctx.lineTo(11, -3);
    ctx.stroke();
    ctx.restore();
  } else if (variant === 'snowwhite') {
    // White wolf-ear tactical hood!
    ctx.fillStyle = '#f8f9fa';
    ctx.strokeStyle = '#495057';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, -2, 16.5, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
  } else if (variant === 'modernia') {
    // Glowing crimson-violet Heretic Halo!
    ctx.save();
    ctx.translate(0, -22 + Math.sin(time * 6) * 1.5);
    ctx.strokeStyle = '#ff2a85';
    ctx.lineWidth = 2.6;
    ctx.shadowColor = '#ff2a85';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (crowned) {
    ctx.fillStyle = '#ffd166';
    ctx.strokeStyle = '#a66300';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-6, -15); ctx.lineTo(-7, -22); ctx.lineTo(-2, -18);
    ctx.lineTo(1, -24); ctx.lineTo(4, -18); ctx.lineTo(8, -22); ctx.lineTo(7, -15);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }

  ctx.restore(); // end head

  if (hurtFlash > 0) {
    ctx.strokeStyle = `rgba(255, 70, 120, ${Math.min(0.85, hurtFlash * 2)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawPaw(ctx, x, y) {
  ctx.beginPath();
  ctx.ellipse(x, y, 3.6, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawHairDrill(ctx, x, y, rot, s, colors = ['#ffb8dc', '#ff94c8', '#e85d9e']) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  const g = ctx.createLinearGradient(0, -8, 0, 14);
  g.addColorStop(0, colors[0]);
  g.addColorStop(1, colors[2]);
  ctx.fillStyle = g;
  ctx.strokeStyle = '#5a2d4c';
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

function drawDoroEye(ctx, x, y, starEyes, smug, eyeMode = 'default') {
  ctx.fillStyle = '#3b2459';
  ctx.beginPath();
  ctx.ellipse(x, y, 3.1, smug ? 2.4 : 3.4, 0, 0, Math.PI * 2);
  ctx.fill();

  const g = ctx.createLinearGradient(x, y - 3, x, y + 3);
  if (starEyes) {
    g.addColorStop(0, '#ffd166');
    g.addColorStop(1, '#ff4d94');
  } else if (eyeMode === 'crimson') {
    g.addColorStop(0, '#ff2a85');
    g.addColorStop(1, '#ffd166');
  } else if (eyeMode === 'amber') {
    g.addColorStop(0, '#ff9f1c');
    g.addColorStop(1, '#e63946');
  } else {
    g.addColorStop(0, '#64dfdf');
    g.addColorStop(1, '#ff85c0');
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y + 0.5, 2.3, smug ? 1.7 : 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - 0.9, y - 1.1, 1.15, 0, Math.PI * 2);
  ctx.fill();

  if (smug) {
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

export function drawMandarin(ctx, x, y, radius, angle = 0, evolved = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
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

  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.ellipse(-radius * 0.32, -radius * 0.3, radius * 0.28, radius * 0.16, -0.5, 0, Math.PI * 2);
  ctx.fill();

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
 * Draw Scarlet Katana crescent slash VFX
 */
export function drawKatanaSlash(ctx, s) {
  const prog = 1 - s.life / s.maxLife;
  const alpha = Math.max(0, 1 - prog * 0.95);
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.angle);
  ctx.globalAlpha = alpha;

  const r = s.radius * (0.78 + prog * 0.32);
  const spread = s.evolved ? Math.PI * 1.85 : Math.PI * 0.78;
  ctx.strokeStyle = s.evolved ? '#ff0a54' : '#ff3864';
  ctx.shadowColor = '#ff2a85';
  ctx.shadowBlur = 18;
  ctx.lineWidth = (s.evolved ? 22 : 14) * (1 - prog * 0.55);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, r, -spread / 2, spread / 2);
  ctx.stroke();

  ctx.strokeStyle = '#fff0f6';
  ctx.lineWidth = (s.evolved ? 7 : 4.5) * (1 - prog * 0.5);
  ctx.beginPath();
  ctx.arc(0, 0, r, -spread / 2 + 0.12, spread / 2 - 0.12);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw Giant Falling Orange Meteor VFX
 */
export function drawMeteor(ctx, m) {
  ctx.save();
  if (!m.impacted) {
    const pct = 1 - m.timer / m.fallTime;
    // Ground danger target reticle
    ctx.strokeStyle = m.evolved ? 'rgba(255, 209, 102, 0.85)' : 'rgba(255, 115, 0, 0.75)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Growing shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(m.x, m.y, m.radius * pct * 0.75, m.radius * pct * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Falling giant blazing mandarin from sky!
    const fallY = m.y - (1 - pct) * 520;
    const fallX = m.x + (1 - pct) * 140;
    // Fire trail
    const trail = ctx.createLinearGradient(fallX, fallY, fallX + 55, fallY - 120);
    trail.addColorStop(0, m.evolved ? 'rgba(255, 210, 60, 0.9)' : 'rgba(255, 90, 0, 0.85)');
    trail.addColorStop(1, 'rgba(255, 40, 0, 0)');
    ctx.strokeStyle = trail;
    ctx.lineWidth = m.evolved ? 38 : 26;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(fallX, fallY);
    ctx.lineTo(fallX + 55, fallY - 120);
    ctx.stroke();

    drawMandarin(ctx, fallX, fallY, m.evolved ? 28 : 20, pct * 9, true);
  } else {
    // Impact shockwave explosion
    const a = Math.max(0, m.duration / 0.45);
    const g = ctx.createRadialGradient(m.x, m.y, m.radius * 0.1, m.x, m.y, m.radius * (1.2 - a * 0.2));
    g.addColorStop(0, `rgba(255, 250, 200, ${a})`);
    g.addColorStop(0.5, `rgba(255, 130, 0, ${a * 0.85})`);
    g.addColorStop(1, 'rgba(255, 40, 80, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.radius * (1.2 - a * 0.2), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Draw Deployed Hovering Mini-Doro Gun Turret
 */
export function drawTurret(ctx, tr, time) {
  ctx.save();
  ctx.translate(tr.x, tr.y);

  // Hover tech platform
  ctx.strokeStyle = tr.evolved ? '#38efdb' : '#c77dff';
  ctx.fillStyle = 'rgba(24, 12, 46, 0.78)';
  ctx.lineWidth = 2.2;
  drawPolygon(ctx, 0, 8, 18, 6, time * 1.4);
  ctx.fill();
  ctx.stroke();

  // Cute Mini-Doro gunner on turret
  drawDoro(ctx, 0, -2 + Math.sin(time * 7) * 2, {
    scale: tr.evolved ? 0.68 : 0.58,
    facing: Math.cos(tr.aimAngle) >= 0 ? 1 : -1,
    moving: false,
    variant: tr.evolved ? 'modernia' : 'eden',
    time,
    isMini: true,
    crowned: tr.evolved,
  });

  // Rotating laser barrel
  ctx.rotate(tr.aimAngle);
  ctx.fillStyle = tr.evolved ? '#38efdb' : '#ff6eb4';
  ctx.fillRect(6, -3, 16, 6);
  if (tr.evolved) {
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(6, -7, 14, 3);
    ctx.fillRect(6, 4, 14, 3);
  }
  ctx.restore();
}

/**
 * Draw NIKKE Rapture-inspired enemies & Tyrant Bosses (including Alteisen Train!)
 */
export function drawEnemy(ctx, e, time) {
  ctx.save();
  ctx.translate(e.x, e.y);

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
    ctx.fillStyle = flash ? '#ffffff' : '#26182c';
    ctx.strokeStyle = flash ? '#ff99cc' : '#ff2e63';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = flash ? '#ffffff' : '#6f223d';
    ctx.lineWidth = 2.6;
    for (let s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.7, -2); ctx.lineTo(s * r * 1.25, -6 + Math.sin(time * 12 + e.seed) * 3);
      ctx.moveTo(s * r * 0.7, 4); ctx.lineTo(s * r * 1.2, 8 - Math.sin(time * 12 + e.seed) * 3);
      ctx.stroke();
    }
    ctx.fillStyle = '#ff1e56';
    ctx.shadowColor = '#ff1e56'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.36, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd6e0';
    ctx.beginPath(); ctx.arc(-2, -2, r * 0.14, 0, Math.PI * 2); ctx.fill();
  } else if (e.type === 'spider') {
    ctx.strokeStyle = flash ? '#ffffff' : '#ff3864';
    ctx.lineWidth = 2.2;
    for (let i = -1; i <= 1; i++) {
      const legWave = Math.sin(time * 14 + e.seed + i) * 4;
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, i * 5); ctx.lineTo(-r * 1.25, i * 9 + legWave);
      ctx.moveTo(r * 0.5, i * 5); ctx.lineTo(r * 1.25, i * 9 - legWave);
      ctx.stroke();
    }
    ctx.fillStyle = flash ? '#ffffff' : '#1e1326';
    ctx.strokeStyle = '#ff2a5f';
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.85, r * 0.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff1744';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.arc(i * 4.5, -1, 2.2, 0, Math.PI * 2); ctx.fill();
    }
  } else if (e.type === 'shield') {
    ctx.fillStyle = flash ? '#ffffff' : '#2d1936';
    ctx.strokeStyle = flash ? '#ffffff' : '#b5179e';
    ctx.lineWidth = 3;
    drawPolygon(ctx, 0, 0, r, 6, Math.PI / 6); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 2;
    drawPolygon(ctx, 0, 0, r * 0.56, 6, Math.PI / 6); ctx.stroke();
    ctx.fillStyle = '#ff0a54';
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
  } else if (e.type === 'charger') {
    const ang = Math.atan2(e.vy || 0, e.vx || 1);
    ctx.rotate(ang - wobble);
    ctx.fillStyle = flash ? '#ffffff' : '#2a1228';
    ctx.strokeStyle = '#ff3864'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r * 1.2, 0); ctx.lineTo(-r * 0.8, -r * 0.8); ctx.lineTo(-r * 0.4, 0); ctx.lineTo(-r * 0.8, r * 0.8);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff9900';
    ctx.beginPath(); ctx.arc(r * 0.15, 0, 3.5, 0, Math.PI * 2); ctx.fill();
  } else if (e.type === 'artillery') {
    ctx.fillStyle = flash ? '#ffffff' : '#2b1433';
    ctx.strokeStyle = '#ff5c8a'; ctx.lineWidth = 2.4;
    drawPolygon(ctx, 0, 0, r * 0.95, 8, time * 0.8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff0054'; ctx.shadowColor = '#ff0054'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2); ctx.fill();
  } else if (e.type === 'thief') {
    ctx.fillStyle = flash ? '#ffffff' : '#3a2210';
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 2, r * 0.85, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = `rgba(255, 209, 102, ${0.45 + Math.sin(time * 12) * 0.3})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r * 1.22, 0, Math.PI * 2); ctx.stroke();
    drawMandarin(ctx, 0, -r * 0.65, 9.5, time * 4, true);
  }

  // Frozen / slowed ring
  if (e.freezeTimer > 0) {
    ctx.strokeStyle = '#74c0fc';
    ctx.fillStyle = 'rgba(116, 192, 252, 0.32)';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (e.slowTimer > 0) {
    ctx.strokeStyle = 'rgba(255, 183, 3, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r + 3, 0, Math.PI * 2); ctx.stroke();
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

  if (e.type === 'alteisen') {
    // 🚂 ICONIC TYRANT TRAIN BOSS: ALTEISEN Mk.VI!
    const dir = e.vx < 0 ? -1 : 1;
    // Railway charge telegraph!
    if (e.telegraphTimer > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 23, 68, 0.85)';
      ctx.lineWidth = 4;
      ctx.setLineDash([14, 10]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(e.chargeDirX * 520, e.chargeDirY * 520);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    ctx.save();
    ctx.scale(dir, 1);

    // Trailing armored turret car
    ctx.fillStyle = flash ? '#ffffff' : '#261422';
    ctx.strokeStyle = '#ff9f1c';
    ctx.lineWidth = 3;
    ctx.fillRect(-r * 1.95, -22, r * 0.95, 44);
    ctx.strokeRect(-r * 1.95, -22, r * 0.95, 44);
    // Turret dome on rear car
    ctx.fillStyle = '#ff1744';
    ctx.beginPath(); ctx.arc(-r * 1.48, 0, 10, 0, Math.PI * 2); ctx.fill();

    // Coupling bar
    ctx.fillStyle = '#adb5bd';
    ctx.fillRect(-r * 1.0, -5, 14, 10);

    // Main armored locomotive engine
    ctx.fillStyle = flash ? '#ffffff' : '#1f0d1c';
    ctx.strokeStyle = '#ff2a5f';
    ctx.lineWidth = 3.5;
    ctx.fillRect(-r * 0.85, -28, r * 1.65, 56);
    ctx.strokeRect(-r * 0.85, -28, r * 1.65, 56);

    // Heavy front cowcatcher plow
    ctx.fillStyle = '#ff9f1c';
    ctx.beginPath();
    ctx.moveTo(r * 0.8, -26);
    ctx.lineTo(r * 1.32, 0);
    ctx.lineTo(r * 0.8, 26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing red locomotive core eye & smokestack sparks
    ctx.fillStyle = '#ff0a54';
    ctx.shadowColor = '#ff0a54';
    ctx.shadowBlur = 18;
    ctx.fillRect(r * 0.35, -14, 14, 28);
    ctx.shadowBlur = 0;

    // Wheels
    ctx.fillStyle = '#ffbe0b';
    for (const wx of [-r * 1.7, -r * 1.25, -r * 0.55, 0, r * 0.5]) {
      ctx.beginPath(); ctx.arc(wx, 28, 6.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  } else if (e.type === 'gravedigger') {
    ctx.save();
    ctx.rotate(time * 3);
    ctx.fillStyle = flash ? '#ffffff' : '#2b1224';
    ctx.strokeStyle = '#ff2a5f';
    ctx.lineWidth = 3.5;
    drawStar(ctx, 0, 0, 8, r * 1.05, r * 0.72);
    ctx.fill(); ctx.stroke();
    ctx.restore();

    ctx.fillStyle = flash ? '#ffffff' : '#ff1e56';
    ctx.shadowColor = '#ff1e56'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.42 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff0f3';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2); ctx.fill();
  } else if (e.type === 'chatterbox') {
    ctx.fillStyle = flash ? '#ffffff' : '#250e23';
    ctx.strokeStyle = '#ff0054';
    ctx.lineWidth = 3.5;
    for (let s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.4, -8); ctx.lineTo(s * r * 1.45, -r * 0.65);
      ctx.lineTo(s * r * 1.2, r * 0.45); ctx.lineTo(s * r * 0.4, r * 0.25);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    drawPolygon(ctx, 0, 0, r * 0.88, 6, 0);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffbe0b'; ctx.shadowColor = '#ff0054'; ctx.shadowBlur = 16;
    ctx.fillRect(-r * 0.45, -6, r * 0.9, 10);
  } else {
    ctx.save();
    ctx.rotate(time * 1.2);
    ctx.strokeStyle = '#ff006e'; ctx.lineWidth = 3.5;
    drawPolygon(ctx, 0, 0, r * 1.18, 6, 0); ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.rotate(-time * 1.7);
    ctx.strokeStyle = '#ffbe0b'; ctx.lineWidth = 2.5;
    drawStar(ctx, 0, 0, 6, r * 1.05, r * 0.65); ctx.stroke();
    ctx.restore();

    ctx.fillStyle = flash ? '#ffffff' : '#1b0724';
    ctx.strokeStyle = '#ff4d94'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, r * 0.45);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, '#ff006e');
    grad.addColorStop(1, 'rgba(255,0,110,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.48 * pulse, 0, Math.PI * 2); ctx.fill();
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

export function drawTitleHeroScene(canvas, time, selectedVariant = 'classic', mapId = 'eden', customImg = null) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || 420;
  const h = canvas.clientHeight || 200;
  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
  }
  ctx.save();
  ctx.scale(dpr, dpr);

  const bg = ctx.createLinearGradient(0, 0, w, h);
  if (mapId === 'ark') {
    bg.addColorStop(0, '#07142b'); bg.addColorStop(0.55, '#1b1448'); bg.addColorStop(1, '#54124a');
  } else if (mapId === 'snow') {
    bg.addColorStop(0, '#0d1b36'); bg.addColorStop(0.55, '#1d3557'); bg.addColorStop(1, '#452c63');
  } else {
    bg.addColorStop(0, '#1e1038'); bg.addColorStop(0.55, '#3b154d'); bg.addColorStop(1, '#5e1a4a');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const sun = ctx.createRadialGradient(w * 0.5, h * 0.52, 12, w * 0.5, h * 0.52, h * 0.65);
  sun.addColorStop(0, 'rgba(255, 210, 120, 0.55)');
  sun.addColorStop(0.4, 'rgba(255, 110, 180, 0.3)');
  sun.addColorStop(1, 'rgba(255, 110, 180, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(w * 0.5, h * 0.5);
  ctx.rotate(time * 0.3);
  ctx.strokeStyle = 'rgba(255, 180, 220, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 6]);
  ctx.beginPath(); ctx.arc(0, 0, h * 0.38, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  for (let i = 0; i < 6; i++) {
    const a = time * 1.1 + (i * Math.PI * 2) / 6;
    drawMandarin(ctx, w * 0.5 + Math.cos(a) * (w * 0.34), h * 0.5 + Math.sin(a) * (h * 0.28), 11, time * 2 + i, i % 2 === 0);
  }

  ctx.fillStyle = mapId === 'snow' ? 'rgba(220, 245, 255, 0.7)' : 'rgba(255, 165, 215, 0.65)';
  for (let i = 0; i < 14; i++) {
    const px = ((i * 73 + time * 32) % (w + 30)) - 15;
    const py = ((i * 41 + time * 18 + Math.sin(time + i) * 14) % (h + 20)) - 10;
    ctx.beginPath(); ctx.ellipse(px, py, 4.5, 2.5, time + i, 0, Math.PI * 2); ctx.fill();
  }

  // Flanking Doros
  drawDoro(ctx, w * 0.22, h * 0.62, { scale: 1.0, facing: 1, moving: true, walkPhase: time * 7, variant: 'scarlet', time, isMini: true });
  drawDoro(ctx, w * 0.78, h * 0.62, { scale: 1.0, facing: -1, moving: true, walkPhase: time * 7 + 1.5, variant: 'modernia', time, isMini: true });

  // Center Hero Doro
  drawDoro(ctx, w * 0.5, h * 0.5, {
    scale: 2.2, facing: 1, moving: true, walkPhase: time * 5.2,
    variant: selectedVariant, burstActive: true, time, customImg,
  });

  ctx.restore();
}

export function drawBurstCutIn(canvas, variant = 'classic', customImg = null) {
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

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  for (let i = 0; i < 36; i++) {
    const y = (i / 36) * h;
    ctx.lineWidth = 1 + (i % 3);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + ((i % 2 === 0 ? 1 : -1) * 8)); ctx.stroke();
  }

  drawMandarin(ctx, 110, 48, 22, 0.4, true);
  drawMandarin(ctx, 540, 125, 26, -0.5, true);
  drawMandarin(ctx, 485, 42, 16, 1.1, false);

  drawDoro(ctx, 210, 102, {
    scale: 3.0, facing: 1, moving: false, variant, burstActive: true, time: 1.2, customImg,
  });
}
