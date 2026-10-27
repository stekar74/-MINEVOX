const BLOCKS = {
  stone:   { name: "Kámen", icon: "🪨", className: "stone", maxHp: 5, reward: 5, chance: 0.49 },
  coal:    { name: "Uhlí", icon: "⬛", className: "coal", maxHp: 15, reward: 20, chance: 0.24 },
  copper:  { name: "Měď", icon: "🟠", className: "copper", maxHp: 25, reward: 35, chance: 0.13 },
  gold:    { name: "Zlato", icon: "🟨", className: "gold", maxHp: 45, reward: 75, chance: 0.075 },
  lapis:   { name: "Lapis", icon: "🔵", className: "lapis", maxHp: 55, reward: 120, chance: 0.035 },
  diamond: { name: "Diamant", icon: "💎", className: "diamond", maxHp: 90, reward: 250, chance: 0.02 },
  emerald: { name: "Smaragd", icon: "🟢", className: "emerald", maxHp: 130, reward: 500, chance: 0.007 },
  ruby:    { name: "Rubín", icon: "♦", className: "ruby", maxHp: 180, reward: 750, chance: 0.003 }
};

const PICKAXES = [
  { name: "Dřevěný krumpáč", damage: 1, cost: 50, durability: 50, icon: "⛏️" },
  { name: "Kamenný krumpáč", damage: 2, cost: 250, durability: 100, icon: "⛏️" },
  { name: "Železný krumpáč", damage: 5, cost: 1000, durability: 175, icon: "⚒️" },
  { name: "Zlatý krumpáč", damage: 10, cost: 5000, durability: 250, icon: "✨" },
  { name: "Diamantový krumpáč", damage: 25, cost: 25000, durability: 400, icon: "💎" }
];

const SIZE = 25;
const SAVE_KEY = "minevoxSaveV2";
const LOCK_EVERY = 20;
const TREASURE_CHANCE = 0.035;
const COMBO_TIMEOUT = 2500;

let state = {
  started: false,
  playerName: "Miner",
  pickaxeStyle: "wood",
  coins: 100,
  mined: 0,
  pickaxe: 0,
  durability: 50,
  materials: { stone: 0, coal: 0, copper: 0, gold: 0, lapis: 0, diamond: 0, emerald: 0, ruby: 0 },
  discovered: {},
  achievements: {},
  blocks: [],
  combo: 0,
  comboUntil: 0,
  unlockedCount: 5,
  updateLogSeen: false
};

const lobby = document.getElementById("lobby");
const game = document.getElementById("game");
const startBtn = document.getElementById("startBtn");
const playerNameInput = document.getElementById("playerName");
const pickaxeStyleInput = document.getElementById("pickaxeStyle");
const grid = document.getElementById("mineGrid");
const coinsEl = document.getElementById("coins");
const minedEl = document.getElementById("mined");
const levelEl = document.getElementById("level");
const damageEl = document.getElementById("damage");
const nextDamageEl = document.getElementById("nextDamage");
const pickaxeNameEl = document.getElementById("pickaxeName");
const pickaxePreviewEl = document.getElementById("pickaxePreview");
const upgradeBtn = document.getElementById("upgradeBtn");
const repairBtn = document.getElementById("repairBtn");
const durabilityEl = document.getElementById("durability");
const durabilityFillEl = document.getElementById("durabilityFill");
const durabilityTextEl = document.getElementById("durabilityText");
const materialsEl = document.getElementById("materials");
const revealedValueEl = document.getElementById("revealedValue");
const progressFillEl = document.getElementById("progressFill");
const unlockMessageEl = document.getElementById("unlockMessage");
const comboEl = document.getElementById("combo");
const comboBonusEl = document.getElementById("comboBonus");
const toastEl = document.getElementById("toast");
const updateLogBtn = document.getElementById("updateLogBtn");
const updateLogModal = document.getElementById("updateLogModal");
const closeUpdateLogBtn = document.getElementById("closeUpdateLogBtn");
const achievementsEl = document.getElementById("achievements");

function createBlock(type) {
  const data = BLOCKS[type];
  return { type, hp: data.maxHp, maxHp: data.maxHp, revealed: false, locked: false, treasure: false };
}

function randomBlock() {
  if (Math.random() < TREASURE_CHANCE) {
    return { type: "treasure", hp: 20, maxHp: 20, revealed: false, locked: false, treasure: true };
  }
  const roll = Math.random();
  let total = 0;
  for (const [id, data] of Object.entries(BLOCKS)) {
    total += data.chance;
    if (roll <= total) return createBlock(id);
  }
  return createBlock("stone");
}

function createNewMine() {
  const blocks = Array.from({ length: SIZE }, () => randomBlock());
  const startingIndexes = [7, 11, 12, 13, 17];
  startingIndexes.forEach(index => {
    blocks[index].revealed = true;
    blocks[index].locked = false;
  });
  return blocks;
}

function normalizeState(parsed) {
  state = {
    ...state,
    ...parsed,
    materials: { ...state.materials, ...(parsed.materials || {}) },
    discovered: { ...(parsed.discovered || {}) },
    achievements: { ...(parsed.achievements || {}) },
    blocks: Array.isArray(parsed.blocks) && parsed.blocks.length === SIZE ? parsed.blocks : createNewMine()
  };
  const current = PICKAXES[state.pickaxe] || PICKAXES[0];
  if (!Number.isFinite(state.durability)) state.durability = current.durability;
  state.unlockedCount = Math.max(5, Math.min(SIZE, Number(state.unlockedCount) || 5));
  state.blocks.forEach((b, i) => {
    if (typeof b.revealed !== "boolean") b.revealed = [7,11,12,13,17].includes(i);
    if (typeof b.locked !== "boolean") b.locked = !b.revealed && i >= state.unlockedCount;
  });
}

function loadGame() {
  const saved = localStorage.getItem(SAVE_KEY);
  if (!saved) {
    state.blocks = createNewMine();
    return;
  }
  try { normalizeState(JSON.parse(saved)); }
  catch { state.blocks = createNewMine(); }
}

function saveGame() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }

function neighborsOf(index) {
  const row = Math.floor(index / 5);
  const col = index % 5;
  return [[row-1,col],[row+1,col],[row,col-1],[row,col+1]]
    .filter(([r,c]) => r >= 0 && r < 5 && c >= 0 && c < 5)
    .map(([r,c]) => r * 5 + c);
}

function revealNeighbors(index) {
  neighborsOf(index).forEach(neighborIndex => {
    const block = state.blocks[neighborIndex];
    if (!block.locked) block.revealed = true;
  });
}

function unlockMoreBlocks() {
  if (state.mined <= 0 || state.mined % LOCK_EVERY !== 0) return false;
  const candidates = state.blocks
    .map((b, i) => ({ b, i }))
    .filter(x => x.b.locked);
  const amount = Math.min(5, candidates.length);
  candidates.slice(0, amount).forEach(({ b }) => { b.locked = false; b.revealed = false; });
  state.unlockedCount = Math.min(SIZE, state.unlockedCount + amount);
  showToast(`🔓 Odemčeno ${amount} nových políček!`);
  return true;
}

function renderGrid() {
  grid.innerHTML = "";
  state.blocks.forEach((block, index) => {
    if (block.locked) {
      const locked = document.createElement("div");
      locked.className = "block locked-block";
      locked.innerHTML = `<span>🔒</span><small>UZAMČENO</small>`;
      grid.appendChild(locked);
      return;
    }
    if (!block.revealed) {
      const hidden = document.createElement("div");
      hidden.className = "block hidden-block";
      hidden.innerHTML = `<span class="fog"></span><span class="question">?</span>`;
      grid.appendChild(hidden);
      return;
    }
    const button = document.createElement("button");
    button.className = `block ${block.hp <= 0 ? "empty" : block.treasure ? "treasure" : BLOCKS[block.type].className}`;
    button.type = "button";
    if (block.hp <= 0) { grid.appendChild(button); return; }
    if (block.treasure) {
      button.setAttribute("aria-label", "Těžit poklad");
      button.innerHTML = `<span class="label">POKLAD</span><span class="treasure-icon">🎁</span><span class="hp"><i style="width:${block.hp / block.maxHp * 100}%"></i></span>`;
    } else {
      const data = BLOCKS[block.type];
      button.setAttribute("aria-label", `Těžit ${data.name}`);
      button.innerHTML = `<span class="label">${data.name}</span><span class="ore"></span><span class="hp"><i style="width:${block.hp / block.maxHp * 100}%"></i></span>`;
    }
    button.addEventListener("click", () => mine(index));
    grid.appendChild(button);
  });
}

function getDamage() { return PICKAXES[state.pickaxe].damage; }
function getComboBonus() { return Math.min(0.5, Math.max(0, state.combo - 1) * 0.05); }

function mine(index) {
  const block = state.blocks[index];
  if (!block || block.locked || !block.revealed || block.hp <= 0) return;
  if (state.durability <= 0) {
    showToast("🪓 Krumpáč je rozbitý. Oprav ho!");
    return;
  }

  block.hp -= getDamage();
  state.durability = Math.max(0, state.durability - 1);

  const button = grid.children[index];
  if (button) {
    const hpBar = button.querySelector(".hp > i");
    if (hpBar) hpBar.style.width = `${Math.max(0, block.hp / block.maxHp * 100)}%`;
  }

  if (block.hp <= 0) {
    state.mined += 1;
    state.combo = Date.now() <= state.comboUntil ? state.combo + 1 : 1;
    state.comboUntil = Date.now() + COMBO_TIMEOUT;

    if (block.treasure) {
      const reward = 250 + Math.floor(Math.random() * 251);
      state.coins += reward;
      state.durability = Math.min(PICKAXES[state.pickaxe].durability, state.durability + 10);
      showToast(`🎁 Poklad! +${reward} 💰 a +10 durability`);
    } else {
      const data = BLOCKS[block.type];
      const bonus = Math.round(data.reward * getComboBonus());
      state.coins += data.reward + bonus;
      state.materials[block.type] = (state.materials[block.type] || 0) + 1;
      const first = !state.discovered[block.type];
      state.discovered[block.type] = true;
      if (first) {
        const firstBonus = data.reward >= 250 ? 250 : 50;
        state.coins += firstBonus;
        showToast(`✨ ${data.name.toUpperCase()} OBJEVEN! +${firstBonus} 💰`);
      } else {
        showToast(`+${data.reward + bonus} 💰 ${data.icon} ${data.name}${bonus ? `  COMBO +${bonus}` : ""}`);
      }
      checkAchievements();
    }

    revealNeighbors(index);
    state.blocks[index] = randomBlock();
    state.blocks[index].revealed = true;
    state.blocks[index].locked = false;
    unlockMoreBlocks();
    renderGrid();
    updateUI();
    saveGame();
  } else {
    updateUI();
    saveGame();
  }
}

function repairPickaxe() {
  const max = PICKAXES[state.pickaxe].durability;
  const missing = max - state.durability;
  if (missing <= 0) return;
  const cost = Math.max(10, Math.ceil(missing * 2));
  if (state.coins < cost) {
    showToast(`Potřebuješ ${cost.toLocaleString("cs-CZ")} 💰`);
    return;
  }
  state.coins -= cost;
  state.durability = max;
  showToast(`🔧 Krumpáč opraven za ${cost} 💰`);
  updateUI();
  saveGame();
}

function upgradePickaxe() {
  const next = PICKAXES[state.pickaxe + 1];
  if (!next) return;
  if (state.coins < next.cost) {
    showToast(`Potřebuješ ${next.cost.toLocaleString("cs-CZ")} 💰`);
    return;
  }
  state.coins -= next.cost;
  state.pickaxe += 1;
  state.durability = next.durability;
  showToast(`Nový krumpáč: ${next.name} ⛏️`);
  updateUI();
  saveGame();
}

function checkAchievements() {
  const list = {
    first: state.mined >= 1,
    diamondHunter: !!state.discovered.diamond,
    emeraldHunter: !!state.discovered.emerald,
    hundred: state.mined >= 100
  };
  Object.entries(list).forEach(([id, done]) => {
    if (done && !state.achievements[id]) {
      state.achievements[id] = true;
      const names = { first: "⛏️ První krumpáč", diamondHunter: "💎 Lovec diamantů", emeraldHunter: "🟢 Emerald Hunter", hundred: "💥 100 bloků" };
      showToast(`🏆 Achievement: ${names[id]}`);
    }
  });
}

function updateUI() {
  const pickaxe = PICKAXES[state.pickaxe];
  const next = PICKAXES[state.pickaxe + 1];
  const max = pickaxe.durability;
  const durabilityPct = Math.max(0, Math.min(100, state.durability / max * 100));
  coinsEl.textContent = state.coins.toLocaleString("cs-CZ");
  minedEl.textContent = state.mined.toLocaleString("cs-CZ");
  levelEl.textContent = Math.floor(state.mined / 10) + 1;
  pickaxeNameEl.textContent = pickaxe.name;
  pickaxePreviewEl.textContent = pickaxe.icon;
  damageEl.textContent = pickaxe.damage;
  durabilityEl.textContent = `${Math.round(durabilityPct)}%`;
  durabilityTextEl.textContent = `${state.durability} / ${max}`;
  durabilityFillEl.style.width = `${durabilityPct}%`;
  repairBtn.disabled = state.durability >= max;
  const repairCost = Math.max(10, Math.ceil((max - state.durability) * 2));
  repairBtn.innerHTML = state.durability >= max ? "KRUMPNÁČ JE OPRAVENÝ" : `OPRAVIT ${repairCost.toLocaleString("cs-CZ")} 💰`;
  if (next) {
    nextDamageEl.textContent = next.damage;
    upgradeBtn.disabled = state.coins < next.cost;
    upgradeBtn.innerHTML = `VYLEPŠIT ${next.cost.toLocaleString("cs-CZ")} 💰`;
  } else {
    nextDamageEl.textContent = "MAX";
    upgradeBtn.textContent = "MAXIMÁLNÍ ÚROVEŇ";
    upgradeBtn.disabled = true;
  }
  comboEl.textContent = `×${state.combo || 0}`;
  comboBonusEl.textContent = `+${Math.round(getComboBonus() * 100)} % coins`;
  renderMaterials();
  renderAchievements();
  updateProgress();
}

function renderMaterials() {
  materialsEl.innerHTML = Object.entries(BLOCKS).map(([id, data]) => `
    <div class="material ${state.discovered[id] ? "discovered" : "undiscovered"}">
      <span class="material-icon">${state.discovered[id] ? data.icon : "❔"}</span>
      <div><div class="material-name">${state.discovered[id] ? data.name : "Neobjeveno"}</div><div class="material-count">${state.materials[id] || 0}</div></div>
    </div>`).join("");
}

function renderAchievements() {
  const achievements = [
    ["first", "⛏️", "První krumpáč", "Vytěž první blok."],
    ["diamondHunter", "💎", "Lovec diamantů", "Najdi diamant."],
    ["emeraldHunter", "🟢", "Emerald Hunter", "Najdi smaragd."],
    ["hundred", "💥", "100 bloků", "Vytěž 100 bloků."]
  ];
  achievementsEl.innerHTML = achievements.map(([id, icon, name, desc]) => `<div class="achievement ${state.achievements[id] ? "done" : ""}"><span>${state.achievements[id] ? icon : "🔒"}</span><div><strong>${name}</strong><small>${desc}</small></div></div>`).join("");
}

function updateProgress() {
  const revealed = state.blocks.filter(block => block.revealed).length;
  revealedValueEl.textContent = revealed;
  progressFillEl.style.width = `${revealed / SIZE * 100}%`;
  unlockMessageEl.textContent = state.mined < LOCK_EVERY ? `Další část se odemkne po vytěžení ${LOCK_EVERY - state.mined} bloků.` : "Těž dál a odemykej další zamčená políčka.";
}

function startGame() {
  state.playerName = playerNameInput.value.trim() || "Miner";
  state.pickaxeStyle = pickaxeStyleInput.value;
  state.started = true;
  document.getElementById("playerLabel").textContent = state.playerName;
  lobby.classList.add("hidden");
  game.classList.remove("hidden");
  renderGrid(); updateUI(); saveGame();
}

function openUpdateLog() { updateLogModal.classList.remove("hidden"); }
function closeUpdateLog() { updateLogModal.classList.add("hidden"); }

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.classList.add("show");
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1700);
}

startBtn.addEventListener("click", startGame);
upgradeBtn.addEventListener("click", upgradePickaxe);
repairBtn.addEventListener("click", repairPickaxe);
updateLogBtn.addEventListener("click", openUpdateLog);
closeUpdateLogBtn.addEventListener("click", closeUpdateLog);
updateLogModal.addEventListener("click", e => { if (e.target === updateLogModal) closeUpdateLog(); });
playerNameInput.addEventListener("keydown", e => { if (e.key === "Enter") startGame(); });

document.addEventListener("keydown", e => { if (e.key === "Escape") closeUpdateLog(); });

loadGame();
if (state.started) {
  playerNameInput.value = state.playerName;
  pickaxeStyleInput.value = state.pickaxeStyle || "wood";
  document.getElementById("playerLabel").textContent = state.playerName;
  lobby.classList.add("hidden"); game.classList.remove("hidden");
  renderGrid(); updateUI();
}

setInterval(() => {
  if (state.combo && Date.now() > state.comboUntil) {
    state.combo = 0;
    updateUI();
  }
  saveGame();
}, 1000);
