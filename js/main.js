// ============================================================
// DORO SURVIVORS — UI Controller, Meta Shop & App Bootstrap
// ============================================================

import {
  I18N,
  CHARACTERS,
  WEAPONS,
  PASSIVES,
  META_UPGRADES,
  loadSaveData,
  writeSaveData,
} from './config.js';
import { sound } from './audio.js';
import { drawDoro, drawTitleHeroScene, drawBurstCutIn } from './sprites.js';
import { DoroGame } from './game.js';

const save = loadSaveData();
let lang = save.lang || 'zh';
let selectedCharId = CHARACTERS[0].id;
let titleAnimId = null;
let bannerTimeout = null;
let cutinTimeout = null;
let activeUpgradeChoices = [];

const $ = (id) => document.getElementById(id);

function t(key) {
  return (I18N[lang] && I18N[lang][key]) || I18N.zh[key] || key;
}

function fmtTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  renderCharacterCards();
  renderShop();
  updateTitleMeta();
}

function updateTitleMeta() {
  $('titleCoins').textContent = save.coins;
  $('titleBestTime').textContent = fmtTime(save.bestTime);
  $('titleBestKills').textContent = save.bestKills;
}

// ==================== GAME INSTANCE ====================
const game = new DoroGame($('gameCanvas'), {
  onHudUpdate: updateHud,
  onLevelUp: openLevelUpModal,
  onChestOpen: openChestModal,
  onFullBurst: showFullBurstCutIn,
  onBanner: showBanner,
  onGameOver: (summary) => openSummaryModal(summary, false),
  onVictory: (summary) => openSummaryModal(summary, true),
  onTogglePause: togglePause,
  onToggleMute: toggleMute,
});

// ==================== TITLE SCREEN ====================
function renderCharacterCards() {
  const grid = $('charGrid');
  grid.innerHTML = '';

  CHARACTERS.forEach((c) => {
    const card = document.createElement('div');
    card.className = `char-card${c.id === selectedCharId ? ' selected' : ''}`;
    card.dataset.char = c.id;

    const preview = document.createElement('canvas');
    preview.className = 'char-preview';
    preview.width = 128;
    preview.height = 128;

    const info = document.createElement('div');
    info.className = 'char-info';
    info.innerHTML = `
      <h3>${c.name[lang]}</h3>
      <div class="char-subtitle">${c.title[lang]} • ${WEAPONS[c.startWeapon].icon} ${WEAPONS[c.startWeapon].name[lang]}</div>
      <div class="char-desc">${c.desc[lang]}</div>
    `;

    card.appendChild(preview);
    card.appendChild(info);
    card.addEventListener('click', () => {
      selectedCharId = c.id;
      sound.playXp();
      renderCharacterCards();
    });
    grid.appendChild(card);
  });
}

function startTitleAnimation() {
  if (titleAnimId) cancelAnimationFrame(titleAnimId);
  const heroCanvas = $('titleHeroCanvas');

  const tick = (now) => {
    if ($('titleScreen').classList.contains('hidden')) {
      titleAnimId = null;
      return;
    }
    const time = now / 1000;
    const selectedChar = CHARACTERS.find((c) => c.id === selectedCharId) || CHARACTERS[0];
    drawTitleHeroScene(heroCanvas, time, selectedChar.variant);

    // Animate mini Doro previews in character cards
    document.querySelectorAll('.char-card').forEach((card) => {
      const cid = card.dataset.char;
      const char = CHARACTERS.find((x) => x.id === cid);
      const cv = card.querySelector('canvas');
      if (!cv || !char) return;
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      drawDoro(ctx, 64, 72, {
        scale: 1.8,
        facing: 1,
        moving: cid === selectedCharId,
        walkPhase: time * 7.5,
        variant: char.variant,
        burstActive: cid === selectedCharId,
        time,
      });
    });

    titleAnimId = requestAnimationFrame(tick);
  };
  titleAnimId = requestAnimationFrame(tick);
}

// ==================== HUD UPDATES ====================
function updateHud(data) {
  const xpPct = Math.min(100, (data.xp / Math.max(1, data.xpToNext)) * 100);
  $('xpFill').style.width = `${xpPct}%`;
  $('hudLevel').textContent = `${t('level')} ${data.level}`;
  $('hudTimer').textContent = fmtTime(data.time);
  $('hudKills').textContent = data.kills;
  $('hudCoins').textContent = data.coins;
  $('endlessBadge').classList.toggle('hidden', !data.endless);
  $('endlessBadge').textContent = t('endlessMode');

  // HP
  const hpPct = Math.max(0, Math.min(100, (data.hp / Math.max(1, data.maxHp)) * 100));
  $('hudHpFill').style.width = `${hpPct}%`;
  $('hudHpText').textContent = `${data.hp} / ${data.maxHp}`;

  // Burst Button
  const burstBtn = $('btnBurst');
  const burstFill = $('burstFill');
  const burstLabel = $('burstLabel');
  if (data.burstTimer > 0) {
    burstFill.style.width = `${(data.burstTimer / 8) * 100}%`;
    burstLabel.textContent = `${t('burstActive')} ${data.burstTimer.toFixed(1)}s`;
    burstBtn.disabled = true;
    burstBtn.classList.remove('ready');
    burstBtn.classList.add('active');
  } else if (data.burstCharge >= 100) {
    burstFill.style.width = '100%';
    burstLabel.textContent = t('burstReady');
    burstBtn.disabled = false;
    burstBtn.classList.add('ready');
    burstBtn.classList.remove('active');
  } else {
    burstFill.style.width = `${Math.floor(data.burstCharge)}%`;
    burstLabel.textContent = `${t('burstCharging')} ${Math.floor(data.burstCharge)}%`;
    burstBtn.disabled = true;
    burstBtn.classList.remove('ready', 'active');
  }

  // Boss Bar
  if (data.boss) {
    $('bossBarWrap').classList.remove('hidden');
    $('bossName').textContent = data.boss.name[lang] || data.boss.name.zh;
    $('bossHpText').textContent = `${Math.ceil(data.boss.hp)} / ${data.boss.maxHp}`;
    $('bossHpFill').style.width = `${Math.max(0, (data.boss.hp / data.boss.maxHp) * 100)}%`;
  } else {
    $('bossBarWrap').classList.add('hidden');
  }

  // Weapon & Passive Inventory Slots
  renderSlots($('weaponSlots'), data.weapons, WEAPONS, 6, true);
  renderSlots($('passiveSlots'), data.passives, PASSIVES, 6, false);
}

function renderSlots(container, ownedMap, defs, maxSlots, isWeapon) {
  const entries = Object.entries(ownedMap);
  let html = '';
  for (let i = 0; i < maxSlots; i++) {
    if (entries[i]) {
      const [id, val] = entries[i];
      const def = defs[id];
      const evolved = isWeapon && val.evolved;
      const lv = isWeapon ? val.level : val;
      const icon = evolved ? def.evolvedIcon : def.icon;
      const badge = evolved ? '★' : `L${lv}`;
      const title = evolved ? def.evolvedName[lang] : def.name[lang];
      html += `<div class="inv-slot filled${evolved ? ' evolved' : ''}" title="${title}">${icon}<span class="slot-lv">${badge}</span></div>`;
    } else {
      html += `<div class="inv-slot"></div>`;
    }
  }
  container.innerHTML = html;
}

// ==================== BANNERS & FULL BURST CUT-IN ====================
function showBanner(i18nKey, style = 'pink') {
  const el = $('eventBanner');
  el.textContent = t(i18nKey);
  el.className = `event-banner ${style}`;
  clearTimeout(bannerTimeout);
  bannerTimeout = setTimeout(() => {
    el.classList.add('hidden');
  }, 2900);
}

function showFullBurstCutIn(variant) {
  const wrap = $('burstCutin');
  drawBurstCutIn($('burstCanvas'), variant);
  $('cutinMain').textContent = t('fullBurstShout');
  wrap.classList.remove('hidden');
  // Restart CSS animation cleanly
  const band = wrap.querySelector('.cutin-band');
  band.style.animation = 'none';
  void band.offsetWidth;
  band.style.animation = '';

  clearTimeout(cutinTimeout);
  cutinTimeout = setTimeout(() => {
    wrap.classList.add('hidden');
  }, 1400);
}

// ==================== LEVEL-UP MODAL ====================
function openLevelUpModal(choices) {
  activeUpgradeChoices = choices;
  const grid = $('upgradeGrid');
  grid.innerHTML = '';

  choices.forEach((ch, idx) => {
    const btn = document.createElement('button');
    btn.className = `upgrade-card${ch.kind === 'evolve' ? ' evolve-card' : ''}`;

    let icon = '✨';
    let tagHtml = '';
    let name = '';
    let desc = '';
    let synergyHtml = '';

    if (ch.kind === 'evolve') {
      const def = WEAPONS[ch.id];
      icon = def.evolvedIcon;
      tagHtml = `<span class="upgrade-tag evolve">${t('evolveTag')}</span>`;
      name = def.evolvedName[lang];
      desc = def.evolvedDesc[lang];
    } else if (ch.kind === 'weapon') {
      const def = WEAPONS[ch.id];
      const syn = PASSIVES[def.synergyPassive];
      icon = def.icon;
      tagHtml = ch.isNew
        ? `<span class="upgrade-tag new">${t('newTag')}</span>`
        : `<span class="upgrade-tag">LV ${ch.nextLevel}</span>`;
      name = def.name[lang];
      desc = def.levelTips[lang][ch.nextLevel - 1] || def.desc[lang];
      synergyHtml = `<div class="upgrade-synergy">${t('synergyHint')}: ${syn.icon} ${syn.name[lang]}</div>`;
    } else if (ch.kind === 'passive') {
      const def = PASSIVES[ch.id];
      icon = def.icon;
      tagHtml = ch.isNew
        ? `<span class="upgrade-tag new">${t('newTag')}</span>`
        : `<span class="upgrade-tag">LV ${ch.nextLevel}</span>`;
      name = def.name[lang];
      desc = def.desc[lang];
    }

    btn.innerHTML = `
      <div class="upgrade-top">
        <div class="upgrade-icon">${icon}</div>
        ${tagHtml}
      </div>
      <div class="upgrade-name">${name}</div>
      <div class="upgrade-desc">${desc}</div>
      ${synergyHtml}
      <div class="upgrade-key">[${idx + 1}]</div>
    `;

    btn.addEventListener('click', () => selectUpgrade(idx));
    grid.appendChild(btn);
  });

  $('levelUpModal').classList.remove('hidden');
}

function selectUpgrade(idx) {
  const ch = activeUpgradeChoices[idx];
  if (!ch) return;
  activeUpgradeChoices = [];
  $('levelUpModal').classList.add('hidden');
  game.applyChoice(ch);
}

// Keyboard shortcuts 1/2/3 for Level Up modal
window.addEventListener('keydown', (e) => {
  if (!$('levelUpModal').classList.contains('hidden')) {
    if (e.key === '1' || e.key === '2' || e.key === '3') {
      const idx = Number(e.key) - 1;
      if (activeUpgradeChoices[idx]) selectUpgrade(idx);
    }
  }
});

// ==================== TREASURE CHEST MODAL ====================
function openChestModal({ rewards, bonusCoins }) {
  const box = $('chestRewards');
  box.innerHTML = '';

  rewards.forEach((rw) => {
    const row = document.createElement('div');
    row.className = `chest-item${rw.kind === 'evolve' ? ' evolved' : ''}`;
    if (rw.kind === 'evolve') {
      const def = WEAPONS[rw.id];
      row.innerHTML = `
        <div class="chest-item-icon">${def.evolvedIcon}</div>
        <div>
          <div style="font-weight:900;color:#ffd166">${t('evolveTag')} — ${def.evolvedName[lang]}</div>
          <div style="font-size:12px;color:#f3d6e8">${def.evolvedDesc[lang]}</div>
        </div>
      `;
    } else if (rw.kind === 'weapon') {
      const def = WEAPONS[rw.id];
      row.innerHTML = `
        <div class="chest-item-icon">${def.icon}</div>
        <div>
          <div style="font-weight:900">${def.name[lang]} → LV ${rw.nextLevel}</div>
          <div style="font-size:12px;color:#b8a4cc">${def.levelTips[lang][rw.nextLevel - 1] || ''}</div>
        </div>
      `;
    } else {
      const def = PASSIVES[rw.id];
      row.innerHTML = `
        <div class="chest-item-icon">${def.icon}</div>
        <div>
          <div style="font-weight:900">${def.name[lang]} → LV ${rw.nextLevel}</div>
          <div style="font-size:12px;color:#b8a4cc">${def.desc[lang]}</div>
        </div>
      `;
    }
    box.appendChild(row);
  });

  const coinRow = document.createElement('div');
  coinRow.className = 'chest-item';
  coinRow.innerHTML = `
    <div class="chest-item-icon">🍊</div>
    <div>
      <div style="font-weight:900;color:#ffd166">+${bonusCoins} ${t('coins')} & +25% HP</div>
    </div>
  `;
  box.appendChild(coinRow);

  $('chestModal').classList.remove('hidden');
}

// ==================== EDEN SHOP ====================
function renderShop() {
  $('shopCoins').textContent = save.coins;
  const grid = $('shopGrid');
  grid.innerHTML = '';

  META_UPGRADES.forEach((up) => {
    const lv = save.upgrades[up.id] || 0;
    const isMax = lv >= up.maxLevel;
    const cost = up.baseCost + lv * up.costStep;
    const canAfford = !isMax && save.coins >= cost;

    const item = document.createElement('div');
    item.className = 'shop-item';

    let pips = '';
    for (let i = 0; i < up.maxLevel; i++) {
      pips += `<div class="shop-pip${i < lv ? ' filled' : ''}"></div>`;
    }

    item.innerHTML = `
      <div class="shop-item-top">
        <div class="shop-item-icon">${up.icon}</div>
        <div class="shop-item-name">${up.name[lang]}</div>
      </div>
      <div class="shop-item-desc">${up.desc[lang]}</div>
      <div class="shop-pips">${pips}</div>
      <button class="btn ${isMax ? 'ghost-btn' : 'secondary-btn'} shop-buy-btn" ${canAfford ? '' : 'disabled'}>
        ${isMax ? t('maxed') : `${t('buy')} (🍊 ${cost})`}
      </button>
    `;

    const buyBtn = item.querySelector('button');
    buyBtn.addEventListener('click', () => {
      if (isMax || save.coins < cost) return;
      save.coins -= cost;
      save.upgrades[up.id] = lv + 1;
      writeSaveData(save);
      sound.playLevelUp();
      renderShop();
      updateTitleMeta();
    });

    grid.appendChild(item);
  });
}

// ==================== SUMMARY / VICTORY / PAUSE ====================
function commitRunRecords(summary) {
  save.coins += summary.coinsEarned;
  if (summary.time > save.bestTime) save.bestTime = summary.time;
  if (summary.kills > save.bestKills) save.bestKills = summary.kills;
  writeSaveData(save);
  updateTitleMeta();
}

function openSummaryModal(summary, isVictory) {
  commitRunRecords(summary);

  const badge = $('summaryBadge');
  badge.textContent = isVictory ? 'VICTORY' : 'DEFEAT';
  badge.className = `summary-badge${isVictory ? ' victory' : ''}`;
  $('summaryTitle').textContent = isVictory ? t('victoryTitle') : t('gameOverTitle');
  $('summarySub').textContent = isVictory ? t('victorySub') : t('gameOverSub');
  $('btnEndless').classList.toggle('hidden', !isVictory);

  $('sumTime').textContent = fmtTime(summary.time);
  $('sumKills').textContent = summary.kills;
  $('sumLevel').textContent = summary.level;
  $('sumCoins').textContent = `+${summary.coinsEarned}`;

  // Damage breakdown chart
  const dpsList = $('dpsList');
  dpsList.innerHTML = '';
  const entries = Object.entries(summary.damageByWeapon)
    .filter(([, dmg]) => dmg > 0)
    .sort((a, b) => b[1] - a[1]);
  const maxDmg = entries[0]?.[1] || 1;

  entries.forEach(([wid, dmg]) => {
    const def = WEAPONS[wid];
    const wState = summary.weapons[wid];
    let label = wid === 'burst' ? '⚡ FULL BURST' : wid;
    if (def) {
      label = wState?.evolved
        ? `${def.evolvedIcon} ${def.evolvedName[lang]}`
        : `${def.icon} ${def.name[lang]}`;
    }
    const pct = Math.max(4, Math.round((dmg / maxDmg) * 100));
    const row = document.createElement('div');
    row.className = 'dps-row';
    row.innerHTML = `
      <div class="dps-name" title="${label}">${label}</div>
      <div class="dps-bar-track"><div class="dps-bar-fill" style="width:${pct}%"></div></div>
      <div class="dps-val">${dmg.toLocaleString()}</div>
    `;
    dpsList.appendChild(row);
  });

  $('summaryModal').classList.remove('hidden');
}

function togglePause() {
  if (game.state === 'playing') {
    game.pause();
    $('pauseModal').classList.remove('hidden');
  } else if (game.state === 'paused') {
    $('pauseModal').classList.add('hidden');
    game.resume();
  }
}

function toggleMute() {
  const muted = sound.toggleMute();
  $('btnMute').textContent = muted ? '🔇' : '🔊';
  if (!muted && game.state === 'playing') {
    sound.startBgm();
  }
}

function startNewRun() {
  $('titleScreen').classList.add('hidden');
  $('shopModal').classList.add('hidden');
  $('pauseModal').classList.add('hidden');
  $('summaryModal').classList.add('hidden');
  $('levelUpModal').classList.add('hidden');
  $('chestModal').classList.add('hidden');
  $('hud').classList.remove('hidden');
  sound.ensureContext();
  game.startRun(selectedCharId, save.upgrades);
}

function returnToTitle() {
  game.stop();
  $('hud').classList.add('hidden');
  $('pauseModal').classList.add('hidden');
  $('summaryModal').classList.add('hidden');
  $('levelUpModal').classList.add('hidden');
  $('chestModal').classList.add('hidden');
  $('titleScreen').classList.remove('hidden');
  updateTitleMeta();
  startTitleAnimation();
}

// ==================== WIRE UP BUTTONS ====================
$('btnStart').addEventListener('click', startNewRun);
$('btnOpenShop').addEventListener('click', () => {
  renderShop();
  $('shopModal').classList.remove('hidden');
});
$('btnShopClose').addEventListener('click', () => {
  $('shopModal').classList.add('hidden');
});
$('btnShopReset').addEventListener('click', () => {
  let refund = 0;
  META_UPGRADES.forEach((up) => {
    const lv = save.upgrades[up.id] || 0;
    for (let i = 0; i < lv; i++) refund += up.baseCost + i * up.costStep;
    save.upgrades[up.id] = 0;
  });
  save.coins += refund;
  writeSaveData(save);
  renderShop();
  updateTitleMeta();
});

$('btnLang').addEventListener('click', () => {
  lang = lang === 'zh' ? 'en' : 'zh';
  save.lang = lang;
  writeSaveData(save);
  applyI18n();
});

$('btnMute').addEventListener('click', toggleMute);
$('btnPause').addEventListener('click', togglePause);
$('btnBurst').addEventListener('click', () => game.tryTriggerFullBurst());
$('btnResume').addEventListener('click', togglePause);
$('btnRestartPause').addEventListener('click', startNewRun);
$('btnQuitTitle').addEventListener('click', returnToTitle);
$('btnPlayAgain').addEventListener('click', startNewRun);
$('btnSummaryTitle').addEventListener('click', returnToTitle);
$('btnEndless').addEventListener('click', () => {
  $('summaryModal').classList.add('hidden');
  game.enterEndlessMode();
});
$('btnChestClaim').addEventListener('click', () => {
  $('chestModal').classList.add('hidden');
  game.resume();
});

// Initialize!
applyI18n();
startTitleAnimation();
