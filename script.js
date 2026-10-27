const BLOCKS = {
  stone:   { name: "Stone",   icon: "🪨", className: "stone",   maxHp: 5,   reward: 5,   chance: 0.62 },
  coal:    { name: "Coal",    icon: "⬛", className: "coal",    maxHp: 15,  reward: 20,  chance: 0.25 },
  gold:    { name: "Gold",    icon: "🟨", className: "gold",    maxHp: 30,  reward: 75,  chance: 0.10 },
  diamond: { name: "Diamond", icon: "💎", className: "diamond", maxHp: 75,  reward: 250, chance: 0.025 },
  ruby:    { name: "Ruby",    icon: "♦",  className: "ruby",    maxHp: 150, reward: 750, chance: 0.005 }
};

const PICKAXES = [
  { name: "Dřevěný krumpáč", damage: 1, cost: 50, icon: "⛏️" },
  { name: "Kamenný krumpáč", damage: 2, cost: 250, icon: "⛏️" },
  { name: "Železný krumpáč", damage: 5, cost: 1000, icon: "⚒️" },
  { name: "Zlatý krumpáč", damage: 10, cost: 5000, icon: "✨" },
  { name: "Diamantový krumpáč", damage: 25, cost: 25000, icon: "💎" }
];

const SIZE = 25;
const SAVE_KEY = "minevoxSaveV2";

let state = {
  started: false,
  playerName: "Miner",
  pickaxeStyle: "wood",
  coins: 100,
  mined: 0,
  pickaxe: 0,
  materials: { stone: 0, coal: 0, gold: 0, diamond: 0, ruby: 0 },
  blocks: []
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
const materialsEl = document.getElementById("materials");
const revealedValueEl = document.getElementById("revealedValue");
const progressFillEl = document.getElementById("progressFill");
const unlockMessageEl = document.getElementById("unlockMessage");
const toastEl = document.getElementById("toast");

function createBlock(type) {
  const data = BLOCKS[type];
  return { type, hp: data.maxHp, maxHp: data.maxHp, revealed: false };
}

function randomBlock() {
  const roll = Math.random();
  let total = 0;

  for (const [id, data] of Object.entries(BLOCKS)) {
    total += data.chance;
    if (roll <= total) return createBlock(id);
  }

  return createBlock("stone");
}

function createNewMine() {
  // Pouze počáteční středové bloky jsou odhalené.
  const blocks = Array.from({ length: SIZE }, () => randomBlock());

  const startingIndexes = [7, 11, 12, 13, 17];
  startingIndexes.forEach(index => {
    blocks[index].revealed = true;
  });

  return blocks;
}

function loadGame() {
  const saved = localStorage.getItem(SAVE_KEY);

  if (!saved) {
    state.blocks = createNewMine();
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    state = {
      ...state,
      ...parsed,
      materials: { ...state.materials, ...(parsed.materials || {}) },
      blocks: Array.isArray(parsed.blocks) && parsed.blocks.length === SIZE
        ? parsed.blocks
        : createNewMine()
    };
  } catch {
    state.blocks = createNewMine();
  }
}

function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function revealNeighbors(index) {
  const row = Math.floor(index / 5);
  const col = index % 5;

  const neighbors = [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1]
  ];

  neighbors.forEach(([r, c]) => {
    if (r >= 0 && r < 5 && c >= 0 && c < 5) {
      const neighborIndex = r * 5 + c;
      state.blocks[neighborIndex].revealed = true;
    }
  });
}

function renderGrid() {
  grid.innerHTML = "";

  state.blocks.forEach((block, index) => {
    if (!block.revealed) {
      const hidden = document.createElement("div");
      hidden.className = "block hidden-block";
      hidden.innerHTML = `<span class="fog"></span><span class="question">?</span>`;
      grid.appendChild(hidden);
      return;
    }

    const button = document.createElement("button");
    button.className = `block ${block.hp <= 0 ? "empty" : BLOCKS[block.type].className}`;
    button.type = "button";

    if (block.hp <= 0) {
      button.innerHTML = "";
      grid.appendChild(button);
      return;
    }

    button.setAttribute("aria-label", `Těžit ${BLOCKS[block.type].name}`);
    button.innerHTML = `
      <span class="label">${BLOCKS[block.type].name}</span>
      <span class="ore"></span>
      <span class="hp"><i style="width:${Math.max(0, block.hp / block.maxHp * 100)}%"></i></span>
    `;

    button.addEventListener("click", () => mine(index));
    grid.appendChild(button);
  });
}

function mine(index) {
  const block = state.blocks[index];
  if (!block || !block.revealed || block.hp <= 0) return;

  block.hp -= getDamage();

  const button = grid.children[index];
  if (button) {
    const hpBar = button.querySelector(".hp > i");
    if (hpBar) {
      hpBar.style.width = `${Math.max(0, block.hp / block.maxHp * 100)}%`;
    }
  }

  if (block.hp <= 0) {
    const data = BLOCKS[block.type];

    state.coins += data.reward;
    state.mined += 1;
    state.materials[block.type] += 1;

    // Po vytěžení se odhalí okolí.
    revealNeighbors(index);

    showToast(`+${data.reward} 💰  ${data.icon} ${data.name}`);

    // Na stejném místě vznikne nový skrytý blok.
    state.blocks[index] = randomBlock();

    // Ale samotné políčko zůstane odhalené.
    state.blocks[index].revealed = true;

    renderGrid();
    updateUI();
    saveGame();
  }
}

function getDamage() {
  return PICKAXES[state.pickaxe].damage;
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

  showToast(`Nový krumpáč: ${next.name} ⛏️`);
  updateUI();
  saveGame();
}

function updateUI() {
  const pickaxe = PICKAXES[state.pickaxe];
  const next = PICKAXES[state.pickaxe + 1];

  coinsEl.textContent = state.coins.toLocaleString("cs-CZ");
  minedEl.textContent = state.mined.toLocaleString("cs-CZ");
  levelEl.textContent = Math.floor(state.mined / 10) + 1;

  pickaxeNameEl.textContent = pickaxe.name;
  pickaxePreviewEl.textContent = pickaxe.icon;
  damageEl.textContent = pickaxe.damage;

  if (next) {
    nextDamageEl.textContent = next.damage;
    upgradeBtn.disabled = state.coins < next.cost;
    upgradeBtn.innerHTML = `VYLEPŠIT ${next.cost.toLocaleString("cs-CZ")} 💰`;
  } else {
    nextDamageEl.textContent = "MAX";
    upgradeBtn.textContent = "MAXIMÁLNÍ ÚROVEŇ";
    upgradeBtn.disabled = true;
  }

  renderMaterials();
  updateProgress();
}

function renderMaterials() {
  materialsEl.innerHTML = Object.entries(BLOCKS).map(([id, data]) => `
    <div class="material">
      <span class="material-icon">${data.icon}</span>
      <div>
        <div class="material-name">${data.name}</div>
        <div class="material-count">${state.materials[id].toLocaleString("cs-CZ")}</div>
      </div>
    </div>
  `).join("");
}

function updateProgress() {
  const revealed = state.blocks.filter(block => block.revealed).length;
  revealedValueEl.textContent = revealed;
  progressFillEl.style.width = `${revealed / SIZE * 100}%`;

  if (revealed === SIZE) {
    unlockMessageEl.textContent = "🎉 Celý důl je odhalený!";
  } else {
    unlockMessageEl.textContent = "Těž bloky a odhaluj sousední políčka.";
  }
}

function startGame() {
  const enteredName = playerNameInput.value.trim();
  state.playerName = enteredName || "Miner";
  state.pickaxeStyle = pickaxeStyleInput.value;
  state.started = true;

  document.getElementById("playerLabel").textContent = state.playerName;
  lobby.classList.add("hidden");
  game.classList.remove("hidden");

  renderGrid();
  updateUI();
  saveGame();
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.classList.add("show");

  toastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 1300);
}

startBtn.addEventListener("click", startGame);
upgradeBtn.addEventListener("click", upgradePickaxe);

playerNameInput.addEventListener("keydown", event => {
  if (event.key === "Enter") startGame();
});

loadGame();

if (state.started) {
  playerNameInput.value = state.playerName;
  pickaxeStyleInput.value = state.pickaxeStyle || "wood";
  document.getElementById("playerLabel").textContent = state.playerName;
  lobby.classList.add("hidden");
  game.classList.remove("hidden");
  renderGrid();
  updateUI();
}

setInterval(saveGame, 5000);
