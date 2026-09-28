"use strict";

const SAVE_KEY = "capsule-rift-agent-v2";
const PULL_COST = 100;
const MAX_PARTY = 3;

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const ui = {
  coins: document.querySelector("#coins"),
  shards: document.querySelector("#shards"),
  stage: document.querySelector("#stage"),
  modeLabel: document.querySelector("#modeLabel"),
  prompt: document.querySelector("#interactionPrompt"),
  objectiveTitle: document.querySelector("#objectiveTitle"),
  objectiveText: document.querySelector("#objectiveText"),
  teamList: document.querySelector("#teamList"),
  rosterList: document.querySelector("#rosterList"),
  ownedCount: document.querySelector("#ownedCount"),
  openRosterButton: document.querySelector("#openRosterButton"),
  statsButton: document.querySelector("#statsButton"),
  guideButton: document.querySelector("#guideButton"),
  questChip: document.querySelector("#questChip"),
  questStep: document.querySelector("#questStep"),
  questTitle: document.querySelector("#questTitle"),
  touchInteractButton: document.querySelector("#touchInteractButton"),
  touchTeamButton: document.querySelector("#touchTeamButton"),
  touchMenuButton: document.querySelector("#touchMenuButton"),
  touchDirButtons: [...document.querySelectorAll("[data-dir]")],
  log: document.querySelector("#log"),
  battleActions: document.querySelector("#battleActions"),
  autoStatus: document.querySelector("#autoStatus"),
  speedButton: document.querySelector("#speedButton"),
  runAwayButton: document.querySelector("#runAwayButton"),
  healTeamButton: document.querySelector("#healTeamButton"),
  modal: document.querySelector("#modal"),
  modalKicker: document.querySelector("#modalKicker"),
  modalTitle: document.querySelector("#modalTitle"),
  modalBody: document.querySelector("#modalBody"),
  modalActions: document.querySelector("#modalActions"),
  closeModal: document.querySelector("#closeModal"),
};

const worldAtlas = loadImage("assets/space-world-atlas.png");
const characterAtlas = loadImage("assets/character-atlas.png");

const classes = {
  rock: {
    name: "Камень",
    tag: "class-rock",
    beats: "scissors",
    verb: "ломает",
    skill: "Глухой удар",
  },
  paper: {
    name: "Бумага",
    tag: "class-paper",
    beats: "rock",
    verb: "накрывает",
    skill: "Печать свитка",
  },
  scissors: {
    name: "Ножницы",
    tag: "class-scissors",
    beats: "paper",
    verb: "режут",
    skill: "Рваный выпад",
  },
};

const rarity = {
  common: { name: "Обычный", odds: 52, shards: 8 },
  rare: { name: "Редкий", odds: 32, shards: 18 },
  epic: { name: "Эпический", odds: 16, shards: 42 },
};

const templates = [
  {
    id: "moss-golem",
    name: "Моховой Голем",
    classId: "rock",
    rarity: "common",
    cell: [0, 0],
    hp: 142,
    atk: 24,
    def: 18,
    speed: 8,
    trait: "много HP, стабилен в долгом бою",
  },
  {
    id: "crystal-tortoise",
    name: "Кристальный Панцирь",
    classId: "rock",
    rarity: "rare",
    cell: [1, 0],
    hp: 132,
    atk: 29,
    def: 22,
    speed: 7,
    trait: "держит удар и больно отвечает",
  },
  {
    id: "amber-orbit",
    name: "Янтарный Орбит",
    classId: "rock",
    rarity: "epic",
    cell: [2, 0],
    hp: 118,
    atk: 35,
    def: 20,
    speed: 11,
    trait: "камень с высоким уроном",
  },
  {
    id: "scroll-fox",
    name: "Свитколис",
    classId: "paper",
    rarity: "common",
    cell: [0, 1],
    hp: 104,
    atk: 26,
    def: 12,
    speed: 16,
    trait: "быстрый маг поддержки",
  },
  {
    id: "paper-witch",
    name: "Бумажная Ведьма",
    classId: "paper",
    rarity: "rare",
    cell: [1, 1],
    hp: 96,
    atk: 32,
    def: 10,
    speed: 18,
    trait: "сильный прием и лечение",
  },
  {
    id: "origami-drake",
    name: "Оригами-Дрейк",
    classId: "paper",
    rarity: "epic",
    cell: [2, 1],
    hp: 112,
    atk: 34,
    def: 14,
    speed: 17,
    trait: "бумажная магия с хорошей защитой",
  },
  {
    id: "blade-rabbit",
    name: "Клинковый Заяц",
    classId: "scissors",
    rarity: "common",
    cell: [0, 2],
    hp: 102,
    atk: 30,
    def: 10,
    speed: 20,
    trait: "быстрые критические атаки",
  },
  {
    id: "shear-duelist",
    name: "Дуэлянтка Ножниц",
    classId: "scissors",
    rarity: "rare",
    cell: [1, 2],
    hp: 98,
    atk: 36,
    def: 9,
    speed: 22,
    trait: "самый острый одиночный урон",
  },
  {
    id: "prism-mantis",
    name: "Призмобогомол",
    classId: "scissors",
    rarity: "epic",
    cell: [2, 2],
    hp: 108,
    atk: 38,
    def: 12,
    speed: 21,
    trait: "элитный резак бумажных врагов",
  },
];

const templateMap = Object.fromEntries(templates.map((template) => [template.id, template]));

const hotspots = [
  {
    id: "gacha",
    title: "Капсульный док",
    shortTitle: "Капсулы",
    subtitle: "крутить героев за монеты",
    action: `${PULL_COST} монет`,
    icon: "capsule",
    color: "#f4b83e",
    accent: "#45c8ff",
    x: 0.18,
    y: 0.53,
    r: 0.075,
    objectX: 0.17,
    objectY: 0.36,
    objectR: 0.16,
    labelX: 0.18,
    labelY: 0.58,
    compactLabelX: 0.18,
    compactLabelY: 0.48,
  },
  {
    id: "fusion",
    title: "Лаборатория синтеза",
    shortTitle: "Синтез",
    subtitle: "3 копии = прокачка",
    action: "улучшить",
    icon: "crystal",
    color: "#8f7cff",
    accent: "#25bda9",
    x: 0.79,
    y: 0.58,
    r: 0.075,
    objectX: 0.84,
    objectY: 0.36,
    objectR: 0.16,
    labelX: 0.80,
    labelY: 0.58,
    compactLabelX: 0.82,
    compactLabelY: 0.49,
  },
  {
    id: "daily",
    title: "Терминал контрактов",
    shortTitle: "Контракты",
    subtitle: "3 дневных фарма монет",
    action: "мини-игра",
    icon: "terminal",
    color: "#25bda9",
    accent: "#4a9df0",
    x: 0.12,
    y: 0.79,
    r: 0.07,
    objectX: 0.10,
    objectY: 0.74,
    objectR: 0.12,
    labelX: 0.17,
    labelY: 0.80,
    compactLabelX: 0.17,
    compactLabelY: 0.70,
  },
  {
    id: "teleport",
    title: "Разлом-ворота",
    shortTitle: "Арена",
    subtitle: "автобой и награды",
    action: "войти",
    icon: "portal",
    color: "#4a9df0",
    accent: "#a36cff",
    x: 0.5,
    y: 0.54,
    r: 0.085,
    objectX: 0.5,
    objectY: 0.34,
    objectR: 0.17,
    labelX: 0.5,
    labelY: 0.64,
    compactLabelX: 0.5,
    compactLabelY: 0.59,
  },
];

const keys = new Set();
const pointer = { x: 0, y: 0 };

let save = loadSave();
let scene = "market";
let nearest = null;
let lastNearestId = null;
let last = performance.now();
let battle = null;
let modalOpen = false;
let marketPlayer = { x: 0.48, y: 0.76, bob: 0, moving: false };
let marketFrame = { x: 0, y: 0, w: 1, h: 1 };
let autoSpeed = 1;
let selectedPartySlot = 0;
const logs = [];
const portraits = new Map();
const battleFx = [];
const touchDirs = { up: false, down: false, left: false, right: false };
const telegramApp = window.Telegram?.WebApp || null;
let lastStatsPersist = performance.now();

function loadImage(src) {
  const img = new Image();
  img.src = src;
  img.addEventListener("load", () => {
    portraits.clear();
    renderAll();
  });
  return img;
}

function createStats() {
  const now = Date.now();
  return {
    createdAt: now,
    lastSeenAt: now,
    sessions: 0,
    telegramSessions: 0,
    activeSeconds: 0,
    pulls: 0,
    newHeroes: 0,
    duplicates: 0,
    coinsEarned: 0,
    coinsSpent: 0,
    shardsEarned: 0,
    battlesStarted: 0,
    battlesWon: 0,
    battlesLost: 0,
    battlesAbandoned: 0,
    wavesCleared: 0,
    enemiesDefeated: 0,
    damageDealt: 0,
    damageTaken: 0,
    ultsUsed: 0,
    dailyContracts: 0,
    dailyWins: 0,
    upgrades: 0,
    highestStage: 1,
  };
}

function normalizeStats(stats = {}) {
  return { ...createStats(), ...stats };
}

function createTutorial() {
  return {
    seenIntro: false,
    firstPull: false,
    firstUpgrade: false,
    firstBattle: false,
  };
}

function normalizeTutorial(tutorial = {}) {
  return { ...createTutorial(), ...tutorial };
}

function loadSave() {
  const today = todayKey();
  const fallback = {
    coins: 260,
    shards: 0,
    stage: 1,
    daily: { date: today, contractsLeft: 3 },
    owned: {
      "moss-golem": { level: 1, copies: 1 },
      "scroll-fox": { level: 1, copies: 1 },
      "blade-rabbit": { level: 1, copies: 1 },
    },
    party: ["moss-golem", "scroll-fox", "blade-rabbit"],
    stats: createStats(),
    tutorial: createTutorial(),
  };

  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      ...fallback,
      ...parsed,
      daily: resetDailyIfNeeded(parsed.daily || fallback.daily),
      owned: { ...fallback.owned, ...(parsed.owned || {}) },
      party: sanitizeParty(parsed.party || fallback.party, parsed.owned || fallback.owned),
      stats: normalizeStats(parsed.stats),
      tutorial: normalizeTutorial(parsed.tutorial),
    };
  } catch {
    return fallback;
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function resetDailyIfNeeded(daily) {
  const today = todayKey();
  if (!daily || daily.date !== today) {
    return { date: today, contractsLeft: 3 };
  }
  return {
    date: today,
    contractsLeft: Number.isFinite(daily.contractsLeft) ? daily.contractsLeft : 3,
  };
}

function sanitizeParty(party, owned = save?.owned || {}) {
  const result = [];
  for (const id of party || []) {
    if (owned[id] && !result.includes(id)) result.push(id);
  }
  for (const id of Object.keys(owned)) {
    if (result.length >= MAX_PARTY) break;
    if (!result.includes(id)) result.push(id);
  }
  return result.slice(0, MAX_PARTY);
}

function persist() {
  save.party = sanitizeParty(save.party, save.owned);
  save.daily = resetDailyIfNeeded(save.daily);
  save.stats = normalizeStats(save.stats);
  save.tutorial = normalizeTutorial(save.tutorial);
  save.stats.highestStage = Math.max(save.stats.highestStage || 1, save.stage || 1);
  save.stats.lastSeenAt = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

function bumpStat(key, amount = 1) {
  save.stats = normalizeStats(save.stats);
  save.stats[key] = Math.max(0, (save.stats[key] || 0) + amount);
}

function setMaxStat(key, value) {
  save.stats = normalizeStats(save.stats);
  save.stats[key] = Math.max(save.stats[key] || 0, value);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function choice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function statsFor(template, level = 1) {
  return {
    maxHp: Math.round(template.hp + (level - 1) * (18 + template.def * 0.6)),
    atk: Math.round(template.atk + (level - 1) * 5),
    def: Math.round(template.def + (level - 1) * 3),
    speed: Math.round(template.speed + (level - 1) * 1.4),
  };
}

function unitLabel(id) {
  const template = templateMap[id];
  const owned = save.owned[id];
  if (!template || !owned) return "Пусто";
  return `${template.name} ур.${owned.level}`;
}

function classMultiplier(attackerClass, defenderClass) {
  if (classes[attackerClass].beats === defenderClass) return 1.55;
  if (classes[defenderClass].beats === attackerClass) return 0.62;
  return 1;
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(640, Math.floor(rect.width * dpr));
  canvas.height = Math.max(420, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  canvas.viewW = rect.width;
  canvas.viewH = rect.height;
}

function addLog(text) {
  logs.unshift(text);
  logs.splice(8);
  renderLog();
}

function renderLog() {
  ui.log.innerHTML = logs.map((entry) => `<p>${entry}</p>`).join("");
}

function setObjective(title, text) {
  ui.objectiveTitle.textContent = title;
  ui.objectiveText.textContent = text;
}

function ownedTotal() {
  return templates.filter((template) => save.owned[template.id]).length;
}

function hasUpgradeableUnit() {
  return templates.some((template) => (save.owned[template.id]?.copies || 0) >= 3);
}

function getCurrentTask() {
  save.tutorial = normalizeTutorial(save.tutorial);
  save.daily = resetDailyIfNeeded(save.daily);
  const party = sanitizeParty(save.party, save.owned);

  if (!save.tutorial.seenIntro) {
    return {
      step: "Брифинг",
      title: "Открой гайд агента",
      text: "В нем 5 коротких правил: где брать монеты, зачем капсулы, как работают копии, классы и арены.",
      station: null,
      action: "Открыть гайд",
    };
  }

  if (party.length < MAX_PARTY) {
    return {
      step: "Отряд",
      title: "Заполни 3 слота команды",
      text: "Открой отряд, выбери слот сверху и нажми героя из коллекции. В бой пойдут первые три персонажа.",
      station: null,
      action: "Собрать отряд",
    };
  }

  if (hasUpgradeableUnit()) {
    return {
      step: "Синтез",
      title: "Есть герой для прокачки",
      text: "Три одинаковые копии превращаются в уровень. Уровень поднимает HP, атаку и защиту для арен.",
      station: "fusion",
      action: "К синтезу",
    };
  }

  if (save.coins >= PULL_COST && ownedTotal() < templates.length) {
    return {
      step: "Капсула",
      title: `Есть ${PULL_COST} монет на крутку`,
      text: "Капсула дает нового героя или дубликат. Дубликаты нужны для синтеза, а новые классы помогают контрить волны.",
      station: "gacha",
      action: "К капсулам",
    };
  }

  if (save.coins < PULL_COST && save.daily.contractsLeft > 0) {
    return {
      step: "Фарм",
      title: "Добери монеты контрактом",
      text: "Терминал дает 3 попытки в день. Даже неудачный сигнал приносит монеты, чтобы быстрее накопить на капсулу.",
      station: "daily",
      action: "К контрактам",
    };
  }

  return {
    step: "Арена",
    title: `Фарми разлом этапа ${save.stage}`,
    text: "Арена дает основной доход: монеты на капсулы и осколки. Волны выходят группами, бой идет автоматически.",
    station: "teleport",
    action: "К арене",
  };
}

function getBattleTask() {
  if (!battle) return getCurrentTask();
  return {
    step: "Автобой",
    title: `Волна ${battle.waveIndex + 1}/${battle.waves.length}: врагов ${aliveUnits(battle.enemies).length}`,
    text: "Персонажи сами бьют цели с выгодным классом и тратят ульту при полной энергии. Кнопка меню меняет скорость или выводит в хаб.",
    station: null,
    action: "Меню боя",
  };
}

function renderGuidance() {
  const task = scene === "battle" ? getBattleTask() : getCurrentTask();
  ui.objectiveTitle.textContent = task.title;
  ui.objectiveText.textContent = task.text;
  ui.questStep.textContent = task.step;
  ui.questTitle.textContent = task.title;
  ui.questChip.title = task.text;
  ui.touchInteractButton.textContent = scene === "battle" ? "Бой" : nearest ? "E" : "?";
}

function setScene(nextScene) {
  scene = nextScene;
  ui.battleActions.classList.toggle("hidden", scene !== "battle");
  ui.modeLabel.textContent = scene === "market" ? "Агентский хаб" : "Разлом-арена";
  syncTelegramBackButton();
}

function renderAll() {
  ui.coins.textContent = save.coins;
  ui.shards.textContent = save.shards;
  ui.stage.textContent = save.stage;
  renderGuidance();
  renderTeam();
  renderRoster();
  renderLog();
  updateBattleButtons();
}

function initTelegramEnvironment() {
  if (!telegramApp) {
    document.body.classList.add("browser-mode");
    return;
  }

  document.body.classList.add("telegram-mode");
  updateTelegramViewport();

  try {
    telegramApp.ready?.();
    telegramApp.expand?.();
    telegramApp.setHeaderColor?.("#17202b");
    telegramApp.setBackgroundColor?.("#0d1624");
    telegramApp.setBottomBarColor?.("#17202b");
    if (telegramApp.isVersionAtLeast?.("7.7")) telegramApp.disableVerticalSwipes?.();
    if (telegramApp.isVersionAtLeast?.("8.0") && /android|ios|tdesktop/i.test(telegramApp.platform || "")) {
      telegramApp.requestFullscreen?.();
    }
  } catch {
    // Telegram clients can differ by platform; the game remains playable without these calls.
  }

  const refresh = () => {
    updateTelegramViewport();
    resizeCanvas();
  };
  telegramApp.onEvent?.("viewportChanged", refresh);
  telegramApp.onEvent?.("safeAreaChanged", refresh);
  telegramApp.onEvent?.("contentSafeAreaChanged", refresh);
  telegramApp.BackButton?.onClick?.(() => {
    if (modalOpen) {
      closeModal();
      return;
    }
    if (scene === "battle") leaveBattle();
  });
}

function updateTelegramViewport() {
  if (!telegramApp) return;
  const root = document.documentElement;
  if (telegramApp.viewportHeight) root.style.setProperty("--app-vh", `${telegramApp.viewportHeight}px`);
  if (telegramApp.viewportStableHeight) {
    root.style.setProperty("--app-stable-vh", `${telegramApp.viewportStableHeight}px`);
  }

  const safe = telegramApp.contentSafeAreaInset || telegramApp.safeAreaInset;
  if (safe) {
    root.style.setProperty("--tg-safe-area-inset-top", `${safe.top || 0}px`);
    root.style.setProperty("--tg-safe-area-inset-right", `${safe.right || 0}px`);
    root.style.setProperty("--tg-safe-area-inset-bottom", `${safe.bottom || 0}px`);
    root.style.setProperty("--tg-safe-area-inset-left", `${safe.left || 0}px`);
  }
}

function syncTelegramBackButton() {
  if (!telegramApp?.BackButton) return;
  if (modalOpen || scene === "battle") telegramApp.BackButton.show?.();
  else telegramApp.BackButton.hide?.();
}

function haptic(kind = "selection") {
  if (!telegramApp?.HapticFeedback) return;
  try {
    if (kind === "impact") telegramApp.HapticFeedback.impactOccurred?.("light");
    else telegramApp.HapticFeedback.selectionChanged?.();
  } catch {
    // Haptics are optional.
  }
}

function startStatsSession() {
  bumpStat("sessions");
  if (telegramApp) bumpStat("telegramSessions");
  setMaxStat("highestStage", save.stage);
  persist();
}

function classTag(template) {
  const klass = classes[template.classId];
  return `<span class="class-tag ${klass.tag}">${klass.name}</span>`;
}

function portraitDataUrl(template) {
  const key = template.id;
  if (portraits.has(key)) return portraits.get(key);
  const out = document.createElement("canvas");
  out.width = 144;
  out.height = 144;
  const g = out.getContext("2d");
  g.fillStyle = "#eaf7ff";
  g.fillRect(0, 0, out.width, out.height);
  if (characterAtlas.complete && characterAtlas.naturalWidth) {
    const [col, row] = template.cell;
    const sw = characterAtlas.naturalWidth / 3;
    const sh = characterAtlas.naturalHeight / 3;
    g.drawImage(characterAtlas, col * sw, row * sh, sw, sh, -10, -6, 164, 164);
  }
  const data = out.toDataURL("image/png");
  portraits.set(key, data);
  return data;
}

function renderTeam() {
  const party = sanitizeParty(save.party, save.owned);
  save.party = party;
  ui.teamList.innerHTML = "";

  for (let i = 0; i < MAX_PARTY; i += 1) {
    const id = party[i];
    if (!id) {
      const empty = document.createElement("button");
      empty.type = "button";
      empty.className = "team-slot";
      empty.innerHTML = `<div></div><div><strong>Пустой слот</strong><span>Выбери героя из коллекции</span></div>`;
      empty.addEventListener("click", () => openHeroPicker(i));
      ui.teamList.appendChild(empty);
      continue;
    }

    const template = templateMap[id];
    const owned = save.owned[id];
    const card = document.createElement("button");
    card.type = "button";
    card.className = `team-slot ${battle?.active === i ? "active" : ""}`;
    card.innerHTML = `
      <img class="unit-face" alt="" src="${portraitDataUrl(template)}" />
      <div class="unit-info">
        <strong>${template.name}</strong>
        <span>ур.${owned.level} · копии ${owned.copies}</span>
        <div class="hpbar"><i style="width:${battleHpPercent(i)}%"></i></div>
      </div>
      ${classTag(template)}
    `;
    card.addEventListener("click", () => {
      if (scene === "battle") {
        addLog("В автобое персонажи выходят сами, когда союзник выбит.");
      } else {
        openHeroPicker(i);
      }
    });
    ui.teamList.appendChild(card);
  }
}

function battleHpPercent(index) {
  if (!battle || !battle.party[index]) return 100;
  const unit = battle.party[index];
  return clamp((unit.hp / unit.stats.maxHp) * 100, 0, 100);
}

function renderRoster() {
  const ownedCount = templates.filter((template) => save.owned[template.id]).length;
  ui.ownedCount.textContent = `${ownedCount}/${templates.length}`;
  ui.rosterList.innerHTML = "";

  for (const template of templates) {
    const owned = save.owned[template.id];
    const partyIndex = save.party.indexOf(template.id);
    const card = document.createElement("button");
    card.type = "button";
    card.className = `unit-card ${partyIndex >= 0 ? "active" : ""} ${owned ? "" : "locked"}`;
    const level = owned?.level || 0;
    const stats = statsFor(template, Math.max(1, level));
    card.innerHTML = `
      <img class="unit-face" alt="" src="${portraitDataUrl(template)}" />
      <div class="unit-info">
        <strong>${owned ? template.name : "Не открыт"}</strong>
        <span>${owned ? `ур.${level} · копии ${owned.copies} · HP ${stats.maxHp} / ATK ${stats.atk}` : template.trait}</span>
      </div>
      ${classTag(template)}
    `;
    card.disabled = !owned || scene === "battle";
    card.addEventListener("click", () => openHeroPicker(Math.max(0, partyIndex)));
    ui.rosterList.appendChild(card);
  }
}

function openHeroPicker(slot = selectedPartySlot) {
  const party = sanitizeParty(save.party, save.owned);
  selectedPartySlot = clamp(Number.isFinite(slot) ? slot : 0, 0, MAX_PARTY - 1);

  const slotCards = Array.from({ length: MAX_PARTY }, (_, index) => {
    const id = party[index];
    const template = templateMap[id];
    const owned = id ? save.owned[id] : null;
    const slotName = index === 0 ? "Лидер" : `Слот ${index + 1}`;

    return `
      <button
        type="button"
        class="party-slot-card ${selectedPartySlot === index ? "selected" : ""}"
        data-slot="${index}"
        ${scene === "battle" ? "disabled" : ""}
      >
        ${
          template
            ? `<img class="unit-face" alt="" src="${portraitDataUrl(template)}" />`
            : `<div class="unit-face empty-face"></div>`
        }
        <div class="unit-info">
          <strong>${template ? template.name : "Пусто"}</strong>
          <span>${template ? `ур.${owned.level} · ${classes[template.classId].name}` : "Свободное место"}</span>
        </div>
        <span class="slot-index">${slotName}</span>
      </button>
    `;
  }).join("");

  const cards = templates
    .map((template) => {
      const owned = save.owned[template.id];
      const level = owned?.level || 1;
      const stats = statsFor(template, level);
      const partyIndex = party.indexOf(template.id);
      const inParty = partyIndex >= 0;
      const active = party[selectedPartySlot] === template.id;
      const status = owned
        ? active
          ? `В слоте ${selectedPartySlot + 1}`
          : inParty
            ? `В слоте ${partyIndex + 1}`
            : "Готов к отбору"
        : "Не открыт";
      const action = owned
        ? active
          ? "Уже выбран"
          : inParty
            ? `Переставить в слот ${selectedPartySlot + 1}`
            : `Поставить в слот ${selectedPartySlot + 1}`
        : "Крутить капсулу";

      return `
        <button
          type="button"
          class="hero-picker-card ${active ? "active" : ""} ${inParty ? "in-party" : ""} ${owned ? "" : "locked"}"
          data-pick="${template.id}"
          ${scene === "battle" ? "disabled" : ""}
        >
          <img class="hero-picker-portrait" alt="" src="${portraitDataUrl(template)}" />
          <div class="hero-picker-info">
            <strong>${owned ? template.name : "Сигнал не расшифрован"}</strong>
            <span>${classes[template.classId].name} · ${rarity[template.rarity].name} · ${status}</span>
            <small>${template.trait}</small>
          </div>
          <div class="hero-stats">
            <span>HP ${stats.maxHp}</span>
            <span>ATK ${stats.atk}</span>
            <span>SPD ${stats.speed}</span>
          </div>
          <div class="hero-card-footer">
            ${classTag(template)}
            <span class="pick-action">${action}</span>
          </div>
        </button>
      `;
    })
    .join("");

  openModal(
    "Коллекция агента",
    "Собрать отряд",
    `<div class="party-builder">
      <div class="picker-help">
        <strong>Выбран слот ${selectedPartySlot + 1}</strong>
        <p>Сначала нажми слот команды сверху, потом нажми героя ниже. В автобой попадут первые 3 героя, поэтому держи в команде разные классы.</p>
      </div>
      ${classRulesHtml()}
      <div class="party-slot-grid">${slotCards}</div>
      <div class="hero-picker-grid">${cards}</div>
    </div>`,
    [
      {
        label: `Крутить за ${PULL_COST} монет`,
        kind: "primary",
        disabled: save.coins < PULL_COST || scene === "battle",
        onClick: pullCapsule,
      },
      { label: "Закрыть", onClick: closeModal },
    ]
  );

  ui.modalBody.querySelectorAll("[data-slot]").forEach((button) => {
    button.addEventListener("click", () => openHeroPicker(Number(button.dataset.slot)));
  });

  ui.modalBody.querySelectorAll("[data-pick]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.pick;
      if (scene === "battle") {
        addLog("На арене состав уже зафиксирован до конца боя.");
        return;
      }
      if (!save.owned[id]) {
        openGacha();
        return;
      }
      setPartySlot(selectedPartySlot, id);
      openHeroPicker(selectedPartySlot);
    });
  });
}

function makeLead(id) {
  setPartySlot(0, id);
}

function setPartySlot(slot, id) {
  if (!save.owned[id]) return;
  if (scene === "battle") {
    addLog("На арене состав уже зафиксирован до конца боя.");
    return;
  }
  const nextParty = sanitizeParty(save.party, save.owned);
  const target = clamp(Number.isFinite(slot) ? slot : 0, 0, MAX_PARTY - 1);
  const current = nextParty.indexOf(id);

  if (current === target) {
    addLog(`${templateMap[id].name} уже стоит в слоте ${target + 1}.`);
    return;
  }

  if (current >= 0) {
    const replaced = nextParty[target];
    nextParty[target] = id;
    nextParty[current] = replaced;
  } else {
    nextParty[target] = id;
  }

  selectedPartySlot = target;
  save.party = nextParty.filter(Boolean);
  persist();
  addLog(`${templateMap[id].name} поставлен в слот ${target + 1}.`);
  renderAll();
}

function healTeam() {
  if (scene === "battle") {
    addLog("Во время боя лечиться на рынке нельзя.");
    return;
  }
  addLog("Команда отдохнула у торговцев рынка.");
}

function openStats() {
  save.stats = normalizeStats(save.stats);
  const ownedCount = templates.filter((template) => save.owned[template.id]).length;
  const winRate = save.stats.battlesStarted
    ? Math.round((save.stats.battlesWon / save.stats.battlesStarted) * 100)
    : 0;
  const dailyRate = save.stats.dailyContracts
    ? Math.round((save.stats.dailyWins / save.stats.dailyContracts) * 100)
    : 0;
  const platform = telegramApp
    ? `Telegram ${telegramApp.platform || ""}`.trim()
    : "Браузер";

  openModal(
    "Статистика агента",
    "Прогресс Capsule Rift",
    `
      <div class="stats-grid">
        ${statCell("Платформа", platform)}
        ${statCell("В игре", formatDuration(save.stats.activeSeconds))}
        ${statCell("Коллекция", `${ownedCount}/${templates.length}`)}
        ${statCell("Рекорд этапа", save.stats.highestStage)}
        ${statCell("Крутки", save.stats.pulls)}
        ${statCell("Новые герои", save.stats.newHeroes)}
        ${statCell("Дубликаты", save.stats.duplicates)}
        ${statCell("Улучшения", save.stats.upgrades)}
        ${statCell("Победы", save.stats.battlesWon)}
        ${statCell("Winrate", `${winRate}%`)}
        ${statCell("Волны", save.stats.wavesCleared)}
        ${statCell("Враги", save.stats.enemiesDefeated)}
      </div>
      ${statRow("Монет заработано", formatNumber(save.stats.coinsEarned))}
      ${statRow("Монет потрачено", formatNumber(save.stats.coinsSpent))}
      ${statRow("Осколков получено", formatNumber(save.stats.shardsEarned))}
      ${statRow("Нанесено урона", formatNumber(save.stats.damageDealt))}
      ${statRow("Получено урона", formatNumber(save.stats.damageTaken))}
      ${statRow("Ульты союзников", formatNumber(save.stats.ultsUsed))}
      ${statRow("Дневные контракты", `${save.stats.dailyContracts} · успех ${dailyRate}%`)}
      ${statRow("Сессии", `${save.stats.sessions}${save.stats.telegramSessions ? ` · Telegram ${save.stats.telegramSessions}` : ""}`)}
    `,
    [
      { label: "Собрать отряд", kind: "secondary", onClick: () => openHeroPicker(selectedPartySlot) },
      { label: "Закрыть", onClick: closeModal },
    ]
  );
}

function statCell(label, value) {
  return `<div class="stats-cell"><span>${label}</span><strong>${value}</strong></div>`;
}

function statRow(label, value) {
  return `<div class="stats-row"><span>${label}</span><strong>${value}</strong></div>`;
}

function formatNumber(value) {
  return Math.round(value || 0).toLocaleString("ru-RU");
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours) return `${hours}ч ${minutes}м`;
  return `${minutes || 1}м`;
}

function nextSpeed() {
  return autoSpeed === 1 ? 2 : autoSpeed === 2 ? 3 : 1;
}

function cycleAutoSpeed() {
  autoSpeed = nextSpeed();
  updateBattleButtons();
  addLog(`Скорость автобоя x${autoSpeed}.`);
  renderGuidance();
}

function focusHotspot(id) {
  if (scene !== "market") return;
  const spot = hotspots.find((item) => item.id === id);
  if (!spot) return;
  marketPlayer.x = clamp(spot.x, 0.08, 0.92);
  marketPlayer.y = clamp(spot.y + spot.r * 0.72, 0.34, 0.9);
  nearest = spot;
  lastNearestId = spot.id;
  closeModal();
  renderGuidance();
  addLog(`Маршрут проложен: ${spot.title}. Нажми E или большую кнопку действия.`);
}

function runTaskAction(task = getCurrentTask()) {
  if (scene === "battle") {
    openQuickMenu();
    return;
  }
  if (task.station) {
    focusHotspot(task.station);
    return;
  }
  if (!save.tutorial.seenIntro) {
    openGuide();
    return;
  }
  openHeroPicker(selectedPartySlot);
}

function classRulesHtml() {
  return `
    <div class="class-rule-grid" aria-label="Преимущества классов">
      <div class="class-rule class-rock">Камень бьет Ножницы</div>
      <div class="class-rule class-scissors">Ножницы бьют Бумагу</div>
      <div class="class-rule class-paper">Бумага бьет Камень</div>
    </div>
  `;
}

function stationLinksHtml() {
  return `
    <div class="station-link-grid">
      <button type="button" class="station-link" data-station="gacha">
        <strong>Капсулы</strong><span>новые герои и дубликаты</span>
      </button>
      <button type="button" class="station-link" data-station="fusion">
        <strong>Синтез</strong><span>3 копии = +1 уровень</span>
      </button>
      <button type="button" class="station-link" data-station="daily">
        <strong>Контракты</strong><span>3 дневные попытки на монеты</span>
      </button>
      <button type="button" class="station-link" data-station="teleport">
        <strong>Арена</strong><span>волны автобоя и главный фарм</span>
      </button>
    </div>
  `;
}

function bindStationLinks() {
  ui.modalBody.querySelectorAll("[data-station]").forEach((button) => {
    button.addEventListener("click", () => focusHotspot(button.dataset.station));
  });
}

function openGuide() {
  save.tutorial = normalizeTutorial(save.tutorial);
  if (!save.tutorial.seenIntro) {
    save.tutorial.seenIntro = true;
    persist();
  }
  const task = scene === "battle" ? getBattleTask() : getCurrentTask();

  openModal(
    "Брифинг агента",
    "Как играть в Capsule Rift",
    `
      <div class="guide-flow">
        <div class="current-task">
          <span class="eyebrow">Сейчас лучше сделать</span>
          <strong>${task.title}</strong>
          <p>${task.text}</p>
        </div>
        ${classRulesHtml()}
        <div class="guide-grid">
          <div class="guide-card">
            <strong>1. Рынок</strong>
            <p>Это главный хаб агента. Ходи к станциям, тапай по ним или открывай меню на телефоне.</p>
          </div>
          <div class="guide-card">
            <strong>2. Капсулы</strong>
            <p>За 100 монет выпадает герой. Новый расширяет коллекцию, дубликат дает копию и осколки.</p>
          </div>
          <div class="guide-card">
            <strong>3. Отряд</strong>
            <p>В бой идут первые 3 героя. Подбирай классы, чтобы закрывать слабости друг друга.</p>
          </div>
          <div class="guide-card">
            <strong>4. Синтез</strong>
            <p>Три одинаковые копии улучшают героя. Это нужно, чтобы выдерживать поздние волны арены.</p>
          </div>
          <div class="guide-card">
            <strong>5. Фарм</strong>
            <p>Арены дают основной доход, контракты помогают добрать монеты 3 раза в день.</p>
          </div>
          <div class="guide-card">
            <strong>6. Автобой</strong>
            <p>Герои сами атакуют, копят энергию и включают ульты. Ты управляешь составом и прогрессом.</p>
          </div>
        </div>
      </div>
    `,
    [
      { label: task.action || "К текущей цели", kind: "primary", onClick: () => runTaskAction(task) },
      { label: "Собрать отряд", kind: "secondary", onClick: () => openHeroPicker(selectedPartySlot) },
      { label: "Закрыть", onClick: closeModal },
    ]
  );
  renderGuidance();
}

function openQuickMenu() {
  const task = scene === "battle" ? getBattleTask() : getCurrentTask();

  if (scene === "battle") {
    openModal(
      "Меню боя",
      "Автобой идет сам",
      `
        <div class="guide-flow">
          <div class="current-task">
            <span class="eyebrow">Состояние арены</span>
            <strong>${task.title}</strong>
            <p>${battle?.lastAction || task.text}</p>
          </div>
          ${classRulesHtml()}
        </div>
      `,
      [
        { label: `Скорость x${nextSpeed()}`, kind: "primary", onClick: () => { cycleAutoSpeed(); openQuickMenu(); } },
        { label: "Вернуться в хаб", kind: "secondary", onClick: () => { closeModal(); leaveBattle(); } },
        { label: "Статы", onClick: openStats },
        { label: "Закрыть", onClick: closeModal },
      ]
    );
    return;
  }

  openModal(
    "Карта рынка",
    "Куда идти дальше",
    `
      <div class="guide-flow">
        <div class="current-task">
          <span class="eyebrow">Текущая цель</span>
          <strong>${task.title}</strong>
          <p>${task.text}</p>
        </div>
        ${stationLinksHtml()}
      </div>
    `,
    [
      { label: task.action || "К цели", kind: "primary", onClick: () => runTaskAction(task) },
      { label: "Отряд", kind: "secondary", onClick: () => openHeroPicker(selectedPartySlot) },
      { label: "Гайд", onClick: openGuide },
      { label: "Статы", onClick: openStats },
      { label: "Закрыть", onClick: closeModal },
    ]
  );
  bindStationLinks();
}

function openModal(kicker, title, body, actions = []) {
  modalOpen = true;
  ui.modalKicker.textContent = kicker;
  ui.modalTitle.textContent = title;
  ui.modalBody.innerHTML = body;
  ui.modalActions.innerHTML = "";
  for (const action of actions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = action.kind || "";
    button.textContent = action.label;
    button.disabled = Boolean(action.disabled);
    button.addEventListener("click", action.onClick);
    ui.modalActions.appendChild(button);
  }
  ui.modal.classList.remove("hidden");
  syncTelegramBackButton();
}

function closeModal() {
  modalOpen = false;
  ui.modal.classList.add("hidden");
  syncTelegramBackButton();
}

function interact() {
  if (scene !== "market" || modalOpen || !nearest) return;
  if (nearest.id === "gacha") openGacha();
  if (nearest.id === "fusion") openFusion();
  if (nearest.id === "daily") openDailyContracts();
  if (nearest.id === "teleport") openTeleport();
}

function pickCapsuleTemplate() {
  const roll = rand(0, 100);
  let sum = 0;
  let pickedRarity = "common";
  for (const [id, data] of Object.entries(rarity)) {
    sum += data.odds;
    if (roll <= sum) {
      pickedRarity = id;
      break;
    }
  }
  return choice(templates.filter((template) => template.rarity === pickedRarity));
}

function openGacha(resultTemplate = null, duplicate = false, shards = 0) {
  const result = resultTemplate
    ? `
      <div class="result-card">
        <img alt="" src="${portraitDataUrl(resultTemplate)}" />
        <div>
          <span class="eyebrow">${duplicate ? "Дубликат" : "Новый персонаж"}</span>
          <strong>${resultTemplate.name}</strong>
          <p>${classes[resultTemplate.classId].name} · ${rarity[resultTemplate.rarity].name}. ${duplicate ? `+${shards} осколков и +1 копия. Когда будет 3 копии, герой прокачается в синтезе.` : "Добавлен в коллекцию и может попасть в отряд."}</p>
        </div>
      </div>
    `
    : `
      <div class="station-guide">
        <div class="station-tip">
          <strong>Зачем крутить</strong>
          <p>Капсула стоит ${PULL_COST} монет и дает случайного героя. Новый герой расширяет выбор команды, дубликат дает копию для прокачки и осколки.</p>
        </div>
        ${classRulesHtml()}
      </div>
    `;

  openModal("Капсульный док", "Крутить капсулу", result, [
    {
      label: `Крутить за ${PULL_COST} монет`,
      kind: "primary",
      disabled: save.coins < PULL_COST,
      onClick: pullCapsule,
    },
    { label: "Закрыть", onClick: closeModal },
  ]);
}

function pullCapsule() {
  if (save.coins < PULL_COST) {
    addLog("Не хватает монет. Побеждай на арене или выполни дневной контракт у терминала.");
    return;
  }
  save.coins -= PULL_COST;
  bumpStat("pulls");
  bumpStat("coinsSpent", PULL_COST);
  const template = pickCapsuleTemplate();
  const duplicate = Boolean(save.owned[template.id]);
  let shards = 0;

  if (duplicate) {
    save.owned[template.id].copies += 1;
    shards = rarity[template.rarity].shards;
    save.shards += shards;
    bumpStat("duplicates");
    bumpStat("shardsEarned", shards);
    addLog(`Дубликат: ${template.name}. Получено ${shards} осколков.`);
  } else {
    save.owned[template.id] = { level: 1, copies: 1 };
    save.party = sanitizeParty([template.id, ...save.party], save.owned);
    bumpStat("newHeroes");
    addLog(`Открыт новый персонаж: ${template.name}.`);
  }

  save.tutorial = normalizeTutorial(save.tutorial);
  save.tutorial.firstPull = true;
  persist();
  renderAll();
  openGacha(template, duplicate, shards);
}

function openDailyContracts(result = null) {
  save.daily = resetDailyIfNeeded(save.daily);
  const left = save.daily.contractsLeft;
  const resultHtml = result
    ? `
      <div class="result-card">
        <div class="unit-face" style="display:grid;place-items:center;font-size:2rem;">${result.icon}</div>
        <div>
          <span class="eyebrow">${result.success ? "Контракт выполнен" : "Сигнал сорвался"}</span>
          <strong>${result.title}</strong>
          <p>${result.text}</p>
        </div>
      </div>
    `
    : "";

  openModal(
    "Терминал контрактов",
    "Дневная мини-игра на монеты",
    `
      <div class="station-guide">
        <div class="station-tip">
          <strong>Зачем контракты</strong>
          <p>Это запасной фарм монет, если не хватает на капсулу. В день доступно 3 попытки: угадаешь стабильный сигнал, получишь повышенную награду.</p>
        </div>
        <p><b>Осталось сегодня:</b> ${left}/3</p>
      </div>
      ${resultHtml}
      <div class="contract-grid">
        <button data-contract="alpha" ${left <= 0 ? "disabled" : ""}>Альфа-сигнал</button>
        <button data-contract="beta" ${left <= 0 ? "disabled" : ""}>Бета-сигнал</button>
        <button data-contract="gamma" ${left <= 0 ? "disabled" : ""}>Гамма-сигнал</button>
      </div>
    `,
    [{ label: "Закрыть", onClick: closeModal }]
  );

  ui.modalBody.querySelectorAll("[data-contract]").forEach((button) => {
    button.addEventListener("click", () => playDailyContract(button.dataset.contract));
  });
}

function playDailyContract(signal) {
  save.daily = resetDailyIfNeeded(save.daily);
  if (save.daily.contractsLeft <= 0) {
    addLog("Дневные контракты закончились. Возвращайся завтра или фарми победами.");
    openDailyContracts();
    return;
  }

  save.daily.contractsLeft -= 1;
  const stable = choice(["alpha", "beta", "gamma"]);
  const success = signal === stable;
  const coins = success ? Math.round(rand(95, 145)) : Math.round(rand(42, 76));
  const shards = success && Math.random() < 0.35 ? 4 : 0;
  save.coins += coins;
  save.shards += shards;
  bumpStat("dailyContracts");
  if (success) bumpStat("dailyWins");
  bumpStat("coinsEarned", coins);
  bumpStat("shardsEarned", shards);
  persist();
  renderAll();

  const label = signal === "alpha" ? "Альфа" : signal === "beta" ? "Бета" : "Гамма";
  const stableLabel = stable === "alpha" ? "Альфа" : stable === "beta" ? "Бета" : "Гамма";
  addLog(`Контракт: выбран ${label}, стабильный был ${stableLabel}. +${coins} монет${shards ? `, +${shards} осколков` : ""}.`);
  openDailyContracts({
    success,
    icon: success ? "✦" : "◇",
    title: success ? `Стабильный ${label}-сигнал` : `Нестабильный ${label}-сигнал`,
    text: success
      ? `Отличная калибровка. +${coins} монет${shards ? ` и +${shards} осколков` : ""}.`
      : `Часть сигнала потеряна, но агентство выплатило +${coins} монет.`,
  });
}

function openFusion() {
  const rows = templates
    .filter((template) => save.owned[template.id])
    .map((template) => {
      const owned = save.owned[template.id];
      const canUpgrade = owned.copies >= 3;
      return `
        <div class="result-card">
          <img alt="" src="${portraitDataUrl(template)}" />
          <div>
            <span class="eyebrow">${classes[template.classId].name}</span>
            <strong>${template.name} · ур.${owned.level}</strong>
            <p>Копии: ${owned.copies}/3. ${canUpgrade ? "Можно улучшить." : "Нужно 3 одинаковых копии."}</p>
            <button data-fuse="${template.id}" ${canUpgrade ? "" : "disabled"}>Слить копии</button>
          </div>
        </div>
      `;
    })
    .join("");

  openModal(
    "Лаборатория синтеза",
    "Улучшение одинаковых",
    `
      <div class="station-guide">
        <div class="station-tip">
          <strong>Зачем прокачка</strong>
          <p>Каждый уровень увеличивает HP, атаку и защиту. Без синтеза поздние волны будут выбивать отряд быстрее, чем он успеет зарядить ульты.</p>
        </div>
        <p><b>Правило:</b> 3 одинаковые копии одного героя = +1 уровень и 5 осколков.</p>
      </div>
      ${rows || `<p>Пока нет открытых героев для синтеза. Крути капсулы, чтобы получать копии.</p>`}
    `,
    [{ label: "Закрыть", onClick: closeModal }]
  );

  ui.modalBody.querySelectorAll("[data-fuse]").forEach((button) => {
    button.addEventListener("click", () => fuseUnit(button.dataset.fuse));
  });
}

function fuseUnit(id) {
  const owned = save.owned[id];
  if (!owned || owned.copies < 3) return;
  owned.copies -= 3;
  owned.level += 1;
  save.shards += 5;
  bumpStat("upgrades");
  bumpStat("shardsEarned", 5);
  save.tutorial = normalizeTutorial(save.tutorial);
  save.tutorial.firstUpgrade = true;
  persist();
  renderAll();
  addLog(`${templateMap[id].name} улучшен до уровня ${owned.level}.`);
  openFusion();
}

function openTeleport() {
  const party = sanitizeParty(save.party, save.owned);
  const partyRows = party
    .map((id) => {
      const template = templateMap[id];
      const owned = save.owned[id];
      const stats = statsFor(template, owned.level);
      return `<p><b>${template.name}</b> · ${classes[template.classId].name} · ур.${owned.level} · HP ${stats.maxHp} · ATK ${stats.atk}</p>`;
    })
    .join("");

  openModal(
    "Разлом-ворота",
    "Отправить отряд",
    `
      <div class="station-guide">
        <div class="station-tip">
          <strong>Зачем арены</strong>
          <p>Арена - основной фарм. За победу дают монеты на новые капсулы и осколки, а этап повышается, открывая более сложные волны.</p>
        </div>
        <p>В бой пойдут первые 3 персонажа из команды. Бой автоматический: герои сами атакуют, копят ульту и выбирают цели по классовому преимуществу.</p>
        ${classRulesHtml()}
      </div>
      ${partyRows}
    `,
    [
      { label: "Начать бой", kind: "primary", onClick: startBattle },
      { label: "Закрыть", onClick: closeModal },
    ]
  );
}

function makeBattleUnit(id, enemyLevel = null) {
  const template = templateMap[id];
  const level = enemyLevel ?? save.owned[id].level;
  const stats = statsFor(template, level);
  return {
    template,
    level,
    stats,
    hp: stats.maxHp,
    guard: 0,
    energy: rand(0, 25),
    cooldown: rand(0.25, 1.1),
    windup: 0,
    hit: 0,
    entrance: 1,
  };
}

function startBattle() {
  closeModal();
  const partyIds = sanitizeParty(save.party, save.owned);
  if (!partyIds.length) return;

  const waves = buildEnemyWaves();
  bumpStat("battlesStarted");
  save.tutorial = normalizeTutorial(save.tutorial);
  save.tutorial.firstBattle = true;
  persist();

  battle = {
    party: partyIds.map((id) => makeBattleUnit(id)),
    waves,
    waveIndex: 0,
    enemies: waves[0],
    active: 0,
    timer: 0,
    busy: false,
    fx: 0,
    startedAt: performance.now(),
    lastAction: "Автобой начался",
  };
  battleFx.length = 0;
  setScene("battle");
  setObjective("Автобой на арене", "Герои и враги атакуют сами. Ульты срабатывают при полной энергии. Камень > Ножницы > Бумага > Камень.");
  addLog(`Разлом-ворота открыли арену этапа ${save.stage}. Волна 1: ${battle.enemies.length} врага.`);
  renderAll();
}

function buildEnemyWaves() {
  const waveCount = 2 + Math.min(2, Math.floor(save.stage / 3));
  const waves = [];
  for (let wave = 0; wave < waveCount; wave += 1) {
    const count = Math.min(5, 2 + wave + Math.floor(save.stage / 4));
    const units = [];
    for (let i = 0; i < count; i += 1) {
      const pool = templates.filter((template) => template.rarity !== "epic" || save.stage > 1 || Math.random() < 0.35);
      const unit = makeBattleUnit(choice(pool).id, Math.max(1, save.stage + wave));
      unit.energy = rand(0, 20);
      unit.cooldown = rand(0.4, 1.4) + i * 0.28;
      units.push(unit);
    }
    waves.push(units);
  }
  return waves;
}

function currentPlayer() {
  if (!battle) return null;
  return battle.party[battle.active] || battle.party.find(alive);
}

function currentEnemy() {
  if (!battle) return null;
  return battle.enemies.find(alive);
}

function alive(unit) {
  return unit && unit.hp > 0;
}

function aliveUnits(units) {
  return units.filter(alive);
}

function dealDamage(attacker, defender, skill = false) {
  const mult = classMultiplier(attacker.template.classId, defender.template.classId);
  const spread = rand(0.9, 1.08);
  const skillMult = skill ? 1.42 : 1;
  const raw = attacker.stats.atk * skillMult * spread - defender.stats.def * 0.45;
  const damage = Math.max(6, Math.round(raw * mult * (defender.guard ? 0.62 : 1)));
  defender.hp = clamp(defender.hp - damage, 0, defender.stats.maxHp);
  defender.guard = 0;
  defender.hit = 0.45;

  if (skill && attacker.template.classId === "paper") {
    attacker.hp = clamp(attacker.hp + Math.round(attacker.stats.maxHp * 0.15), 0, attacker.stats.maxHp);
  }
  if (skill && attacker.template.classId === "rock") {
    attacker.guard = 1;
  }
  if (skill && attacker.template.classId === "scissors" && Math.random() < 0.35) {
    const extra = Math.round(damage * 0.45);
    defender.hp = clamp(defender.hp - extra, 0, defender.stats.maxHp);
    return { damage: damage + extra, mult, crit: true };
  }

  return { damage, mult, crit: false };
}

function actionText(attacker, defender, result, skill) {
  const name = attacker.template.name;
  const target = defender.template.name;
  const move = skill ? `УЛЬТА: ${classes[attacker.template.classId].skill}` : "Атака";
  const advantage =
    result.mult > 1 ? " Преимущество класса!" : result.mult < 1 ? " Урон снижен из-за класса." : "";
  const crit = result.crit ? " Критический рез!" : "";
  return `${name}: ${move} по ${target} на ${result.damage}.${advantage}${crit}`;
}

function updateAutoBattle(dt) {
  if (!battle || scene !== "battle") return;
  const step = dt * autoSpeed;
  battle.timer += step;

  for (const unit of [...battle.party, ...battle.enemies]) {
    unit.cooldown = Math.max(0, unit.cooldown - step);
    unit.windup = Math.max(0, unit.windup - step * 3.2);
    unit.hit = Math.max(0, unit.hit - step * 2.4);
    unit.entrance = Math.max(0, unit.entrance - step * 1.6);
  }

  updateFx(step);
  autoSwitchActive();
  if (!aliveUnits(battle.party).length) {
    loseBattle();
    return;
  }
  if (!aliveUnits(battle.enemies).length) {
    advanceWaveOrWin();
    return;
  }

  const actors = [...aliveUnits(battle.party).map((unit) => [unit, "party"]), ...aliveUnits(battle.enemies).map((unit) => [unit, "enemy"])]
    .filter(([unit]) => unit.cooldown <= 0)
    .sort((a, b) => b[0].stats.speed - a[0].stats.speed);

  if (!actors.length) return;
  const [actor, side] = actors[0];
  performAutoAction(actor, side);
}

function autoSwitchActive() {
  if (!battle || alive(battle.party[battle.active])) return;
  const next = battle.party.findIndex(alive);
  if (next >= 0 && next !== battle.active) {
    battle.active = next;
    addLog(`${battle.party[next].template.name} автоматически выходит в бой.`);
  }
}

function performAutoAction(attacker, side) {
  const defenders = side === "party" ? aliveUnits(battle.enemies) : aliveUnits(battle.party);
  if (!defenders.length) return;
  const defender = chooseTarget(attacker, defenders);
  const useUlt = attacker.energy >= 100;
  const result = dealDamage(attacker, defender, useUlt);
  if (side === "party") {
    bumpStat("damageDealt", result.damage);
    if (useUlt) bumpStat("ultsUsed");
  } else {
    bumpStat("damageTaken", result.damage);
  }
  attacker.energy = useUlt ? 0 : clamp(attacker.energy + 34, 0, 100);
  attacker.cooldown = Math.max(0.72, 2.2 - attacker.stats.speed * 0.035) + (useUlt ? 0.35 : 0);
  attacker.windup = useUlt ? 1 : 0.68;
  battle.fx = 1;
  battle.lastAction = actionText(attacker, defender, result, useUlt);
  addBattleFx(attacker, defender, result, useUlt, side);
  addLog(battle.lastAction);

  if (!alive(defender)) {
    if (side === "party") bumpStat("enemiesDefeated");
    addLog(`${defender.template.name} выбыл.`);
  }
  renderAll();
}

function chooseTarget(attacker, defenders) {
  const advantaged = defenders.filter((unit) => classes[attacker.template.classId].beats === unit.template.classId);
  const weak = defenders.filter((unit) => classMultiplier(attacker.template.classId, unit.template.classId) === 1);
  const pool = advantaged.length ? advantaged : weak.length ? weak : defenders;
  return pool.sort((a, b) => a.hp / a.stats.maxHp - b.hp / b.stats.maxHp)[0];
}

function advanceWaveOrWin() {
  bumpStat("wavesCleared");
  if (battle.waveIndex >= battle.waves.length - 1) {
    winBattle();
    return;
  }
  battle.waveIndex += 1;
  battle.enemies = battle.waves[battle.waveIndex];
  battle.enemies.forEach((unit, index) => {
    unit.entrance = 1 + index * 0.12;
    unit.cooldown = 0.8 + index * 0.28;
  });
  battle.fx = 1;
  addLog(`Новая группа вышла из портала: волна ${battle.waveIndex + 1}, ${battle.enemies.length} врага.`);
  renderAll();
}

function addBattleFx(attacker, defender, result, ult, side) {
  battleFx.push({
    side,
    from: attacker,
    to: defender,
    life: ult ? 0.92 : 0.56,
    maxLife: ult ? 0.92 : 0.56,
    damage: result.damage,
    mult: result.mult,
    ult,
    classId: attacker.template.classId,
  });
  battleFx.splice(0, Math.max(0, battleFx.length - 16));
}

function updateFx(dt) {
  for (const fx of battleFx) {
    fx.life -= dt;
  }
  for (let i = battleFx.length - 1; i >= 0; i -= 1) {
    if (battleFx[i].life <= 0) battleFx.splice(i, 1);
  }
}

function winBattle() {
  const coins = 155 + save.stage * 44;
  const shards = 14 + Math.floor(save.stage * 1.5);
  save.coins += coins;
  save.shards += shards;
  bumpStat("battlesWon");
  bumpStat("coinsEarned", coins);
  bumpStat("shardsEarned", shards);
  save.stage += 1;
  setMaxStat("highestStage", save.stage);
  persist();
  addLog(`Победа! +${coins} монет, +${shards} осколков.`);
  battle = null;
  battleFx.length = 0;
  setScene("market");
  setObjective("Победа на арене", "Можно крутить капсулы, улучшать дубликатов, выполнить дневной контракт или идти дальше через разлом.");
  renderAll();
}

function loseBattle() {
  const coins = 35 + save.stage * 9;
  save.coins += coins;
  bumpStat("battlesLost");
  bumpStat("coinsEarned", coins);
  persist();
  addLog(`Команда проиграла, но агентство оплатило разведданные: +${coins} монет.`);
  battle = null;
  battleFx.length = 0;
  setScene("market");
  setObjective("Отряд вернулся в хаб", "Можно попробовать другой состав, улучшить копии или добрать монеты контрактами.");
  renderAll();
}

function leaveBattle() {
  if (battle) {
    bumpStat("battlesAbandoned");
    persist();
  }
  addLog("Ты вышел из арены через разлом-ворота.");
  battle = null;
  battleFx.length = 0;
  setScene("market");
  setObjective("Агентский хаб", "Поменяй лидера, крути капсулы, выполни контракт или возвращайся на арену.");
  renderAll();
}

function updateBattleButtons() {
  ui.autoStatus.textContent = battle
    ? `Волна ${battle.waveIndex + 1}/${battle.waves.length} · врагов ${aliveUnits(battle.enemies).length}/${battle.enemies.length}`
    : "Автобой выключен";
  ui.speedButton.textContent = `Скорость x${autoSpeed}`;
  ui.runAwayButton.disabled = !battle;
}

function update(dt) {
  updateActiveStats(dt);
  if (scene === "market") updateMarket(dt);
  if (scene === "battle") updateAutoBattle(dt);
  if (battle?.fx) battle.fx = Math.max(0, battle.fx - dt * 2.6);
}

function updateActiveStats(dt) {
  if (document.hidden) return;
  save.stats = normalizeStats(save.stats);
  save.stats.activeSeconds += dt;
  const now = performance.now();
  if (now - lastStatsPersist > 12000) {
    lastStatsPersist = now;
    persist();
  }
}

function updateMarket(dt) {
  let dx = 0;
  let dy = 0;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) dx -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) dx += 1;
  if (keys.has("KeyW") || keys.has("ArrowUp")) dy -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) dy += 1;
  if (touchDirs.left) dx -= 1;
  if (touchDirs.right) dx += 1;
  if (touchDirs.up) dy -= 1;
  if (touchDirs.down) dy += 1;
  const len = Math.hypot(dx, dy) || 1;
  const moving = dx || dy;
  marketPlayer.moving = Boolean(moving);
  if (moving) {
    marketPlayer.x = clamp(marketPlayer.x + (dx / len) * dt * 0.22, 0.08, 0.92);
    marketPlayer.y = clamp(marketPlayer.y + (dy / len) * dt * 0.22, 0.34, 0.9);
    marketPlayer.bob += dt * 8;
  } else {
    marketPlayer.bob += dt * 2;
  }

  nearest = findNearestHotspot();
  if (nearest) {
    ui.prompt.textContent = `E - ${nearest.shortTitle}: ${nearest.subtitle}`;
    ui.prompt.classList.add("active");
  } else {
    ui.prompt.textContent = "Иди к станции, тапни объект или открой меню";
    ui.prompt.classList.remove("active");
  }
  const nearestId = nearest?.id || null;
  if (nearestId !== lastNearestId) {
    lastNearestId = nearestId;
    renderGuidance();
  }
}

function findNearestHotspot() {
  const w = canvas.viewW || canvas.clientWidth;
  const h = canvas.viewH || canvas.clientHeight;
  const frame = { x: 0, y: 0, w, h };
  const player = framePoint(frame, marketPlayer.x, marketPlayer.y);
  for (const spot of hotspots) {
    const pad = framePoint(frame, spot.x, spot.y);
    const distance = Math.hypot(player.x - pad.x, player.y - pad.y);
    if (distance < hotspotRadius(spot, frame)) return spot;
  }
  return null;
}

function draw() {
  const w = canvas.viewW || canvas.clientWidth;
  const h = canvas.viewH || canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  if (scene === "market") drawMarket(w, h);
  else drawBattle(w, h);
}

function drawImageCover(img, sx, sy, sw, sh, dx, dy, dw, dh) {
  if (!img.complete || !img.naturalWidth) {
    ctx.fillStyle = "#96d8f0";
    ctx.fillRect(dx, dy, dw, dh);
    return;
  }
  const scale = Math.max(dw / sw, dh / sh);
  const cropW = dw / scale;
  const cropH = dh / scale;
  const cropX = sx + (sw - cropW) / 2;
  const cropY = sy + (sh - cropH) / 2;
  ctx.drawImage(img, cropX, cropY, cropW, cropH, dx, dy, dw, dh);
}

function containFrame(sw, sh, dw, dh) {
  const scale = Math.min(dw / sw, dh / sh);
  const w = sw * scale;
  const h = sh * scale;
  return { x: (dw - w) / 2, y: (dh - h) / 2, w, h };
}

function drawImageContain(img, sx, sy, sw, sh, dx, dy, dw, dh) {
  const frame = containFrame(sw, sh, dw, dh);
  if (!img.complete || !img.naturalWidth) {
    ctx.fillStyle = "#96d8f0";
    ctx.fillRect(dx, dy, dw, dh);
    return { x: dx + frame.x, y: dy + frame.y, w: frame.w, h: frame.h };
  }
  drawImageCover(img, sx, sy, sw, sh, dx, dy, dw, dh);
  ctx.save();
  ctx.globalAlpha = 0.96;
  ctx.drawImage(img, sx, sy, sw, sh, dx + frame.x, dy + frame.y, frame.w, frame.h);
  ctx.restore();
  return { x: dx + frame.x, y: dy + frame.y, w: frame.w, h: frame.h };
}

function drawMarket(w, h) {
  const half = worldAtlas.naturalHeight ? worldAtlas.naturalHeight / 2 : 627;
  drawImageCover(worldAtlas, 0, 0, worldAtlas.naturalWidth || 1254, half, 0, 0, w, h);
  marketFrame = { x: 0, y: 0, w, h };
  drawHubPaths(marketFrame);
  drawHotspots(marketFrame);
  drawMarketPlayer(marketFrame);
  drawAtmosphere(w, h);
}

function framePoint(frame, x, y) {
  return {
    x: frame.x + x * frame.w,
    y: frame.y + y * frame.h,
  };
}

function hotspotRadius(spot, frame, key = "r") {
  return (spot[key] || spot.r) * Math.min(frame.w, frame.h);
}

function hitTestHotspot(spot, x, y, frame) {
  const pad = framePoint(frame, spot.x, spot.y);
  const padRadius = hotspotRadius(spot, frame) * 1.25;
  if (Math.hypot(x - pad.x, y - pad.y) < padRadius) return true;

  if (Number.isFinite(spot.objectX) && Number.isFinite(spot.objectY)) {
    const object = framePoint(frame, spot.objectX, spot.objectY);
    const objectRadius = hotspotRadius(spot, frame, "objectR");
    if (Math.hypot(x - object.x, y - object.y) < objectRadius) return true;
  }

  return false;
}

function drawHubPaths(frame) {
  const center = framePoint(frame, 0.5, 0.54);
  const t = performance.now() * 0.001;
  ctx.save();
  ctx.globalAlpha = 0.58;
  ctx.strokeStyle = "rgba(255,253,245,0.72)";
  ctx.lineWidth = Math.max(2, Math.min(frame.w, frame.h) * 0.006);
  ctx.setLineDash([14, 12]);
  ctx.lineDashOffset = -t * 18;

  for (const spot of hotspots) {
    if (spot.id === "teleport") continue;
    const pad = framePoint(frame, spot.x, spot.y);
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.quadraticCurveTo((center.x + pad.x) / 2, center.y + Math.min(frame.w, frame.h) * 0.07, pad.x, pad.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHotspots(frame) {
  const t = performance.now() * 0.001;
  const suggestedStation = scene === "market" ? getCurrentTask().station : null;
  for (const spot of hotspots) {
    const active = nearest?.id === spot.id;
    const suggested = suggestedStation === spot.id;
    drawStationConnector(spot, frame, active, suggested);
  }
  for (const spot of hotspots) {
    const active = nearest?.id === spot.id;
    const suggested = suggestedStation === spot.id;
    drawStationPad(spot, frame, active, suggested, t);
  }
  for (const spot of hotspots) {
    const active = nearest?.id === spot.id;
    const suggested = suggestedStation === spot.id;
    drawStationSign(spot, frame, active, suggested);
  }
}

function drawStationConnector(spot, frame, active, suggested) {
  if (!Number.isFinite(spot.objectX) || !Number.isFinite(spot.objectY)) return;
  const pad = framePoint(frame, spot.x, spot.y);
  const object = framePoint(frame, spot.objectX, spot.objectY);
  ctx.save();
  ctx.globalAlpha = active ? 0.9 : suggested ? 0.72 : 0.42;
  ctx.strokeStyle = active ? spot.color : "rgba(255,253,245,0.86)";
  ctx.lineWidth = active ? 4 : 2;
  ctx.setLineDash([7, 8]);
  ctx.beginPath();
  ctx.moveTo(object.x, object.y);
  ctx.lineTo(pad.x, pad.y);
  ctx.stroke();
  ctx.restore();

  drawStationIcon(spot.icon, object.x, object.y, Math.max(17, Math.min(frame.w, frame.h) * 0.032), spot.color, spot.accent, active || suggested);
}

function drawStationPad(spot, frame, active, suggested, t) {
  const pad = framePoint(frame, spot.x, spot.y);
  const radius = hotspotRadius(spot, frame);
  ctx.save();
  ctx.globalAlpha = active ? 0.96 : suggested ? 0.82 : 0.58;
  ctx.fillStyle = active ? "rgba(255,244,199,0.58)" : "rgba(255,253,245,0.28)";
  ctx.strokeStyle = active ? spot.color : suggested ? spot.accent : "rgba(255,255,255,0.88)";
  ctx.lineWidth = active ? 5 : 3;
  ctx.setLineDash(active ? [12, 8] : []);
  ctx.lineDashOffset = -t * 22;
  ctx.beginPath();
  ctx.ellipse(pad.x, pad.y, radius * 1.05, radius * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  if (active || suggested) {
    ctx.save();
    ctx.font = `${Math.max(10, Math.min(frame.w, frame.h) * 0.018)}px Inter, sans-serif`;
    ctx.fillStyle = "#fffdf5";
    ctx.strokeStyle = "#17202b";
    ctx.lineWidth = 4;
    ctx.textAlign = "center";
    const label = active ? "НАЖМИ E" : "ЦЕЛЬ";
    ctx.strokeText(label, pad.x, pad.y + radius * 0.09);
    ctx.fillText(label, pad.x, pad.y + radius * 0.09);
    ctx.restore();
  }
}

function drawStationSign(spot, frame, active, suggested) {
  const compact = frame.w < 680 || frame.h < 620;
  const labelX = compact && Number.isFinite(spot.compactLabelX) ? spot.compactLabelX : spot.labelX;
  const labelY = compact && Number.isFinite(spot.compactLabelY) ? spot.compactLabelY : spot.labelY;
  const label = framePoint(frame, labelX, labelY);
  const signW = compact ? clamp(frame.w * 0.36, 126, 148) : clamp(frame.w * 0.17, 160, 220);
  const signH = compact ? 50 : 64;
  const x = clamp(label.x - signW / 2, frame.x + 8, frame.x + frame.w - signW - 8);
  const y = clamp(label.y - signH / 2, frame.y + 78, frame.y + frame.h - signH - 12);
  const stroke = active ? spot.color : suggested ? spot.accent : "#17202b";
  const fill = active ? "rgba(255,244,199,0.96)" : suggested ? "rgba(223,249,243,0.94)" : "rgba(255,253,245,0.88)";

  ctx.save();
  roundRect(x, y, signW, signH, 10, fill, stroke, active || suggested ? 3 : 2);
  drawStationIcon(spot.icon, x + (compact ? 22 : 27), y + signH / 2, compact ? 14 : 17, spot.color, spot.accent, active || suggested);

  const textX = x + (compact ? 42 : 52);
  const textW = signW - (compact ? 50 : 64);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#17202b";
  ctx.font = `950 ${compact ? 13 : 16}px Inter, sans-serif`;
  ctx.fillText(spot.shortTitle, textX, y + (compact ? 20 : 26), textW);
  ctx.fillStyle = "#637181";
  ctx.font = `850 ${compact ? 10 : 12}px Inter, sans-serif`;
  ctx.fillText(compact ? spot.action : spot.subtitle, textX, y + (compact ? 37 : 46), textW);

  if (suggested) {
    const badgeW = compact ? 38 : 46;
    const badgeH = compact ? 16 : 18;
    roundRect(x + signW - badgeW - 6, y - badgeH * 0.5, badgeW, badgeH, 7, spot.accent, "#17202b", 2);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = `950 ${compact ? 8 : 9}px Inter, sans-serif`;
    ctx.fillText("ЦЕЛЬ", x + signW - badgeW / 2 - 6, y + (compact ? 5 : 6));
  }
  ctx.restore();
}

function drawStationIcon(icon, x, y, size, color, accent, lit = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = lit ? color : "transparent";
  ctx.shadowBlur = lit ? size * 0.8 : 0;
  circle(0, 0, size * 1.08, "rgba(255,253,245,0.94)", "#17202b", Math.max(2, size * 0.13));
  ctx.shadowBlur = 0;

  if (icon === "capsule") {
    ctx.rotate(-0.48);
    roundRect(-size * 0.72, -size * 0.36, size * 1.44, size * 0.72, size * 0.36, color, "#17202b", Math.max(2, size * 0.11));
    ctx.fillStyle = accent;
    ctx.fillRect(-size * 0.04, -size * 0.28, size * 0.08, size * 0.56);
  } else if (icon === "crystal") {
    drawDiamond(0, 0, size * 0.7, accent, "#17202b", Math.max(2, size * 0.11));
    drawDiamond(0, -size * 0.02, size * 0.38, color, null, 0);
  } else if (icon === "terminal") {
    roundRect(-size * 0.64, -size * 0.46, size * 1.28, size * 0.92, size * 0.14, "#163049", "#17202b", Math.max(2, size * 0.11));
    roundRect(-size * 0.42, -size * 0.28, size * 0.84, size * 0.3, size * 0.08, accent, null, 0);
    circle(-size * 0.26, size * 0.22, size * 0.08, color, null, 0);
    circle(size * 0.04, size * 0.22, size * 0.08, color, null, 0);
  } else {
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(3, size * 0.16);
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.54, 0.18 * Math.PI, 1.82 * Math.PI);
    ctx.stroke();
    circle(0, 0, size * 0.16, color, null, 0);
  }
  ctx.restore();
}

function drawMarketPlayer(frame) {
  const id = save.party[0] || Object.keys(save.owned)[0];
  const template = templateMap[id] || templates[0];
  const x = frame.x + marketPlayer.x * frame.w;
  const y = frame.y + marketPlayer.y * frame.h + Math.sin(marketPlayer.bob) * 5;
  const size = Math.min(frame.w, frame.h) * 0.22;
  drawBlobShadow(x, y + size * 0.34, size * 0.3, size * 0.07, 0.26);
  drawAnimatedCharacter(template, x, y, size, false, {
    alive: true,
    energy: 70,
    moving: marketPlayer.moving,
    phase: marketPlayer.bob * 0.21,
  });
}

function drawBattle(w, h) {
  const half = worldAtlas.naturalHeight ? worldAtlas.naturalHeight / 2 : 627;
  drawImageCover(worldAtlas, 0, half, worldAtlas.naturalWidth || 1254, half, 0, 0, w, h);
  drawBattleUnits(w, h);
  drawBattleStatus(w, h);
  drawAtmosphere(w, h);
}

function drawBattleUnits(w, h) {
  if (!battle) return;
  const party = battle.party;
  const enemies = battle.enemies;

  party.forEach((unit, index) => {
    const pos = getBattlePosition("party", index, party.length, w, h);
    drawBattleUnit(unit, pos, Math.min(w, h) * 0.24, false, w, h);
  });

  enemies.forEach((unit, index) => {
    const pos = getBattlePosition("enemy", index, enemies.length, w, h);
    drawBattleUnit(unit, pos, Math.min(w, h) * 0.2, true, w, h);
  });

  drawBattleEffects(w, h);
}

function drawBattleStatus(w, h) {
  if (!battle) return;
  ctx.save();
  roundRect(w * 0.28, h * 0.08, w * 0.44, 86, 16, "rgba(255,253,245,0.92)", "#17202b", 3);
  ctx.fillStyle = "#17202b";
  ctx.font = "900 18px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`Автобой · волна ${battle.waveIndex + 1}/${battle.waves.length}`, w * 0.5, h * 0.08 + 28);
  ctx.font = "800 13px Inter, sans-serif";
  ctx.fillStyle = "#637181";
  ctx.fillText("Камень > Ножницы > Бумага > Камень", w * 0.5, h * 0.08 + 50);
  ctx.fillText(battle.lastAction || "Персонажи выбирают цели сами", w * 0.5, h * 0.08 + 70);
  ctx.restore();
}

function getBattlePosition(side, index, total, w, h) {
  if (side === "party") {
    const slots = [
      [0.21, 0.62],
      [0.34, 0.73],
      [0.18, 0.81],
    ];
    const [x, y] = slots[index] || [0.22 + index * 0.08, 0.72];
    return { x: w * x, y: h * y };
  }

  const layouts = {
    1: [[0.72, 0.55]],
    2: [
      [0.68, 0.49],
      [0.82, 0.65],
    ],
    3: [
      [0.65, 0.48],
      [0.8, 0.55],
      [0.72, 0.72],
    ],
    4: [
      [0.62, 0.46],
      [0.78, 0.47],
      [0.67, 0.68],
      [0.84, 0.69],
    ],
    5: [
      [0.6, 0.44],
      [0.75, 0.43],
      [0.88, 0.54],
      [0.66, 0.68],
      [0.82, 0.72],
    ],
  };
  const [x, y] = (layouts[total] || layouts[5])[index] || [0.72, 0.55];
  return { x: w * x, y: h * y };
}

function drawBattleUnit(unit, pos, size, flip, w, h) {
  const aliveNow = alive(unit);
  const entranceDir = flip ? 1 : -1;
  const entrance = unit.entrance ? entranceDir * unit.entrance * w * 0.22 : 0;
  const lunge = unit.windup ? Math.sin(unit.windup * Math.PI) * (flip ? -26 : 26) : 0;
  const hitPower = clamp(unit.hit / 0.45, 0, 1);
  const shake = hitPower ? Math.sin(hitPower * Math.PI) * size * 0.032 * (flip ? 1 : -1) : 0;
  const bob = Math.sin(performance.now() * 0.0028 + pos.x * 0.01) * 2.2;
  const x = pos.x + entrance + lunge + shake;
  const y = pos.y + bob;
  const dim = aliveNow ? 1 : 0.28;

  ctx.save();
  ctx.globalAlpha = dim;
  drawBlobShadow(x, y + size * 0.34, size * 0.32, size * 0.07, aliveNow ? 0.22 : 0.1);
  drawAnimatedCharacter(unit.template, x, y, aliveNow ? size : size * 0.9, flip, {
    alive: aliveNow,
    energy: unit.energy,
    guard: unit.guard,
    hit: unit.hit,
    moving: false,
    phase: pos.x * 0.013 + pos.y * 0.007,
    windup: unit.windup,
  });
  drawFloatingUnitStatus(unit, x, y, size, flip);
  ctx.restore();
}

function drawFloatingUnitStatus(unit, x, y, size) {
  const hpPct = clamp(unit.hp / unit.stats.maxHp, 0, 1);
  const energyPct = clamp(unit.energy / 100, 0, 1);
  const width = size * 0.58;
  const top = y - size * 0.45;
  const klass = classes[unit.template.classId];

  ctx.save();
  roundRect(x - width / 2, top, width, 38, 10, "rgba(255,253,245,0.9)", "#17202b", 2);
  ctx.fillStyle = "#17202b";
  ctx.font = `900 ${Math.max(10, size * 0.045)}px Inter, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(klass.name, x, top + 13);
  roundRect(x - width / 2 + 7, top + 19, width - 14, 8, 5, "#ffe1da", "#17202b", 1);
  roundRect(x - width / 2 + 8, top + 20, (width - 16) * hpPct, 6, 4, "#6fc35f", null, 0);
  roundRect(x - width / 2 + 7, top + 29, width - 14, 5, 3, "#d8e8f6", null, 0);
  roundRect(x - width / 2 + 7, top + 29, (width - 14) * energyPct, 5, 3, "#f4b83e", null, 0);
  ctx.restore();
}

function drawBattleEffects(w, h) {
  for (const fx of battleFx) {
    const pct = 1 - fx.life / fx.maxLife;
    const fromSide = fx.side === "party" ? "party" : "enemy";
    const toSide = fx.side === "party" ? "enemy" : "party";
    const fromList = fromSide === "party" ? battle.party : battle.enemies;
    const toList = toSide === "party" ? battle.party : battle.enemies;
    const fromIndex = fromList.indexOf(fx.from);
    const toIndex = toList.indexOf(fx.to);
    const a = getBattlePosition(fromSide, Math.max(0, fromIndex), fromList.length, w, h);
    const b = getBattlePosition(toSide, Math.max(0, toIndex), toList.length, w, h);
    const x = a.x + (b.x - a.x) * pct;
    const y = a.y + (b.y - a.y) * pct - Math.sin(pct * Math.PI) * 80;
    const color = fx.classId === "rock" ? "#b58b4c" : fx.classId === "paper" ? "#25bda9" : "#ef6a5f";

    ctx.save();
    ctx.globalAlpha = clamp(fx.life / fx.maxLife, 0, 1);
    if (fx.ult) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(b.x, b.y - 20, 40 + pct * 90, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawTravellingAttackFx(fx, x, y, b, pct, color);
    circle(x, y, fx.ult ? 18 : 10, color, "#17202b", 3);
    ctx.font = `900 ${fx.ult ? 30 : 22}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = fx.mult > 1 ? "#f4b83e" : fx.mult < 1 ? "#7e8a96" : "#ffffff";
    ctx.strokeStyle = "#17202b";
    ctx.lineWidth = 5;
    const text = `${fx.damage}${fx.ult ? "!" : ""}`;
    ctx.strokeText(text, b.x, b.y - 110 - pct * 46);
    ctx.fillText(text, b.x, b.y - 110 - pct * 46);
    ctx.restore();
  }
}

function drawTravellingAttackFx(fx, x, y, target, pct, color) {
  ctx.save();
  if (fx.classId === "rock") {
    for (let i = 0; i < 5; i += 1) {
      const angle = pct * Math.PI * 4 + i * 1.35;
      const radius = fx.ult ? 22 + i * 4 : 12 + i * 2;
      drawDiamond(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius * 0.65,
        fx.ult ? 10 : 6,
        i % 2 ? "#f4b83e" : color,
        "#17202b",
        2
      );
    }
  }

  if (fx.classId === "paper") {
    for (let i = 0; i < 4; i += 1) {
      ctx.save();
      ctx.translate(x + Math.cos(pct * 5 + i) * 18, y + Math.sin(pct * 6 + i * 1.4) * 14);
      ctx.rotate(pct * Math.PI * 3 + i);
      roundRect(-9, -12, 18, 24, 4, i % 2 ? "#f8fff9" : "#dff9f3", "#17202b", 2);
      ctx.strokeStyle = "#25bda9";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4, -4);
      ctx.lineTo(5, -4);
      ctx.moveTo(-5, 3);
      ctx.lineTo(4, 3);
      ctx.stroke();
      ctx.restore();
    }
  }

  if (fx.classId === "scissors") {
    const slash = Math.sin(pct * Math.PI);
    ctx.strokeStyle = color;
    ctx.lineWidth = fx.ult ? 8 : 5;
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i += 1) {
      const offset = (i - 1) * 18;
      ctx.beginPath();
      ctx.moveTo(target.x - 54 * slash, target.y - 42 + offset);
      ctx.quadraticCurveTo(target.x - 10, target.y - 72 + offset, target.x + 58 * slash, target.y - 16 + offset);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawUnitStatus(unit, x, y, width) {
  const template = unit.template;
  const klass = classes[template.classId];
  const hpPct = clamp(unit.hp / unit.stats.maxHp, 0, 1);
  ctx.save();
  roundRect(x, y, width, 92, 16, "rgba(255,253,245,0.92)", "#17202b", 3);
  ctx.fillStyle = "#17202b";
  ctx.font = "900 20px Inter, sans-serif";
  ctx.fillText(`${template.name} ур.${unit.level}`, x + 16, y + 28);
  ctx.font = "800 13px Inter, sans-serif";
  ctx.fillStyle = "#637181";
  ctx.fillText(`${klass.name} · HP ${Math.ceil(unit.hp)}/${unit.stats.maxHp}`, x + 16, y + 50);
  roundRect(x + 16, y + 62, width - 32, 16, 8, "#ffe1da", "#17202b", 2);
  const grad = ctx.createLinearGradient(x + 16, 0, x + width - 16, 0);
  grad.addColorStop(0, "#6fc35f");
  grad.addColorStop(1, "#25bda9");
  roundRect(x + 18, y + 64, (width - 36) * hpPct, 12, 6, grad, null, 0);
  ctx.restore();
}

function drawAnimatedCharacter(template, x, y, size, flip = false, pose = {}) {
  const t = performance.now() * 0.001 + (pose.phase || 0);
  const aliveNow = pose.alive !== false;
  const windup = clamp(pose.windup || 0, 0, 1);
  const hit = clamp(pose.hit || 0, 0, 1);
  const energy = clamp((pose.energy || 0) / 100, 0, 1);
  const moving = pose.moving ? 1 : 0;
  const pulse = Math.sin(t * 2.8);
  const step = Math.sin(t * 6.5);
  const hop = aliveNow ? Math.abs(step) * moving * size * 0.022 : 0;
  const attack = Math.sin(windup * Math.PI);
  const recoil = Math.sin(clamp(hit / 0.45, 0, 1) * Math.PI);
  const breathe = aliveNow ? pulse * 0.012 : 0;
  const lean = aliveNow ? Math.sin(t * 1.65) * 0.018 + attack * 0.12 - recoil * 0.09 : -0.38;
  const squashX = aliveNow ? 1 + breathe + recoil * 0.055 - attack * 0.025 + Math.abs(step) * moving * 0.026 : 1.05;
  const squashY = aliveNow ? 1 - breathe - recoil * 0.04 + attack * 0.03 - Math.abs(step) * moving * 0.022 : 0.84;

  ctx.save();
  ctx.translate(x, y - hop);
  if (flip) ctx.scale(-1, 1);
  if (aliveNow) {
    drawClassAura(template, size, t, energy, windup, hit);
    if (pose.guard) drawGuardShell(size, t);
    if (energy > 0.82) drawUltCharge(template, size, t, energy);
  }
  if (windup > 0.04 || hit > 0.04) {
    drawMotionTrail(template, size, windup, hit);
  }
  ctx.rotate(lean);
  ctx.scale(squashX, squashY);
  if (aliveNow) {
    drawCharacterMotionLines(template, size, t, windup, hit, moving, energy);
  }

  const oldFilter = ctx.filter;
  if (hit > 0.02) {
    ctx.filter = `brightness(${1 + clamp(hit / 0.45, 0, 1) * 0.28}) saturate(${1 + clamp(hit / 0.45, 0, 1) * 0.22})`;
  }
  drawCharacterImageAtOrigin(template, size);
  ctx.filter = oldFilter;
  ctx.restore();
}

function drawMotionTrail(template, size, windup, hit) {
  const power = clamp(Math.sin(windup * Math.PI) + clamp(hit / 0.45, 0, 1) * 0.35, 0, 1);
  for (let i = 2; i >= 1; i -= 1) {
    ctx.save();
    ctx.globalAlpha *= power * (0.11 / i);
    ctx.translate(-size * (0.045 + i * 0.035), size * 0.008 * i);
    ctx.scale(1 + i * 0.012, 1 - i * 0.008);
    drawCharacterImageAtOrigin(template, size);
    ctx.restore();
  }
}

function drawCharacterMotionLines(template, size, t, windup, hit, moving, energy) {
  const burst = Math.max(Math.sin(windup * Math.PI), clamp(hit / 0.45, 0, 1) * 0.55);
  const color = template.classId === "rock" ? "#b58b4c" : template.classId === "paper" ? "#25bda9" : "#ef6a5f";
  ctx.save();
  ctx.globalAlpha *= clamp(0.24 + burst + energy * 0.24, 0, 1);

  if (template.classId === "rock") {
    for (let i = 0; i < 4; i += 1) {
      const dx = size * (0.12 + i * 0.075 + burst * 0.1);
      const dy = size * (0.24 + Math.sin(t * 4 + i) * 0.025);
      drawDiamond(dx, dy, size * (0.022 + burst * 0.018), i % 2 ? "#f4b83e" : color, "#17202b", 2);
    }
  }

  if (template.classId === "paper") {
    for (let i = 0; i < 3; i += 1) {
      ctx.save();
      ctx.translate(size * (0.22 + i * 0.055), size * (-0.18 + i * 0.09));
      ctx.rotate(t * 1.6 + i * 0.8 + burst);
      roundRect(-size * 0.032, -size * 0.043, size * 0.064, size * 0.086, 4, "#f8fff9", "#17202b", 2);
      ctx.restore();
    }
  }

  if (template.classId === "scissors") {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(3, size * 0.026);
    ctx.lineCap = "round";
    for (let i = 0; i < 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(size * (0.08 + i * 0.05), size * (-0.22 + i * 0.18));
      ctx.quadraticCurveTo(size * (0.28 + burst * 0.14), size * (-0.12 + i * 0.16), size * (0.42 + burst * 0.22), size * (0.04 + i * 0.18));
      ctx.stroke();
    }
  }

  if (moving) {
    ctx.globalAlpha *= 0.45;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(2, size * 0.014);
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-size * (0.34 + i * 0.08), size * (0.25 - i * 0.04));
      ctx.lineTo(-size * (0.2 + i * 0.04), size * (0.24 - i * 0.04 + Math.sin(t * 8) * 0.02));
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawClassAura(template, size, t, energy, windup, hit) {
  const intensity = clamp(0.42 + energy * 0.42 + windup * 0.34 + hit * 0.2, 0, 1);
  ctx.save();
  ctx.globalAlpha *= intensity;

  if (template.classId === "rock") {
    for (let i = 0; i < 6; i += 1) {
      const angle = t * 0.9 + i * (Math.PI * 2) / 6;
      const radius = size * (0.33 + Math.sin(t * 1.7 + i) * 0.035);
      drawDiamond(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.34, size * 0.026, "#c39a55", "#17202b", 2);
    }
  }

  if (template.classId === "paper") {
    for (let i = 0; i < 5; i += 1) {
      const angle = -t * 0.75 + i * 1.25;
      const x = Math.cos(angle) * size * 0.35;
      const y = Math.sin(angle) * size * 0.25 - size * 0.02;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI * 0.18);
      roundRect(-size * 0.026, -size * 0.04, size * 0.052, size * 0.08, 4, "#f8fff9", "#17202b", 2);
      ctx.restore();
    }
  }

  if (template.classId === "scissors") {
    ctx.strokeStyle = "#ef6a5f";
    ctx.lineWidth = Math.max(2, size * 0.012);
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(0, 0, size * (0.28 + i * 0.055), t * 1.3 + i, t * 1.3 + i + 1.15);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawGuardShell(size, t) {
  ctx.save();
  ctx.globalAlpha *= 0.58 + Math.sin(t * 8) * 0.12;
  ctx.strokeStyle = "#86d0f0";
  ctx.lineWidth = Math.max(3, size * 0.018);
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.38, size * 0.46, Math.sin(t * 1.5) * 0.08, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawUltCharge(template, size, t, energy) {
  const color = template.classId === "rock" ? "#f4b83e" : template.classId === "paper" ? "#25bda9" : "#ef6a5f";
  ctx.save();
  ctx.globalAlpha *= (energy - 0.82) * 2.2;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(3, size * 0.016);
  ctx.setLineDash([size * 0.06, size * 0.035]);
  ctx.lineDashOffset = -t * 36;
  ctx.beginPath();
  ctx.ellipse(0, size * 0.03, size * 0.44, size * 0.49, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawCharacterImageAtOrigin(template, size) {
  if (!characterAtlas.complete || !characterAtlas.naturalWidth) {
    drawFallbackCharacterAtOrigin(template, size);
    return;
  }
  const [col, row] = template.cell;
  const sw = characterAtlas.naturalWidth / 3;
  const sh = characterAtlas.naturalHeight / 3;
  ctx.drawImage(characterAtlas, col * sw, row * sh, sw, sh, -size / 2, -size / 2, size, size);
}

function drawCharacter(template, x, y, size, flip = false) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  drawCharacterImageAtOrigin(template, size);
  ctx.restore();
}

function drawFallbackCharacter(template, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  drawFallbackCharacterAtOrigin(template, size);
  ctx.restore();
}

function drawFallbackCharacterAtOrigin(template, size) {
  const color = template.classId === "rock" ? "#8a8376" : template.classId === "paper" ? "#25bda9" : "#ef6a5f";
  circle(0, -size * 0.12, size * 0.22, color, "#17202b", 4);
  circle(-size * 0.07, -size * 0.16, size * 0.028, "#fff", "#17202b", 2);
  circle(size * 0.07, -size * 0.16, size * 0.028, "#fff", "#17202b", 2);
}

function drawAtmosphere(w, h) {
  const glow = ctx.createRadialGradient(w * 0.5, h * 0.52, 40, w * 0.5, h * 0.52, Math.max(w, h) * 0.62);
  glow.addColorStop(0, "rgba(255,255,255,0.18)");
  glow.addColorStop(0.42, "rgba(37,189,169,0.04)");
  glow.addColorStop(1, "rgba(12,23,34,0.14)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}

function roundRect(x, y, w, h, radius, fill, stroke, line = 2) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(0, w), Math.max(0, h), radius);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = line;
    ctx.stroke();
  }
  ctx.restore();
}

function circle(x, y, radius, fill, stroke, line = 2) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = line;
    ctx.stroke();
  }
  ctx.restore();
}

function drawDiamond(x, y, radius, fill, stroke, line = 2) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y - radius);
  ctx.lineTo(x + radius * 0.78, y);
  ctx.lineTo(x, y + radius);
  ctx.lineTo(x - radius * 0.78, y);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = line;
    ctx.stroke();
  }
  ctx.restore();
}

function drawBlobShadow(x, y, rx, ry, alpha) {
  ctx.save();
  ctx.fillStyle = `rgba(11,24,35,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function loop(now) {
  const dt = Math.min(0.04, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function handleKeyDown(event) {
  keys.add(event.code);
  if (event.code === "KeyE") {
    event.preventDefault();
    haptic("impact");
    interact();
  }
  if (event.code === "Escape" && modalOpen) {
    closeModal();
  }
}

function handleCanvasClick(event) {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
  if (scene !== "market") return;
  const w = canvas.viewW || canvas.clientWidth;
  const h = canvas.viewH || canvas.clientHeight;
  const frame = { x: 0, y: 0, w, h };
  const clicked = hotspots.find((spot) => hitTestHotspot(spot, pointer.x, pointer.y, frame));
  if (clicked) {
    nearest = clicked;
    haptic("impact");
    interact();
  } else {
    marketPlayer.x = clamp((pointer.x - frame.x) / frame.w, 0.08, 0.92);
    marketPlayer.y = clamp((pointer.y - frame.y) / frame.h, 0.34, 0.9);
  }
}

function bindTouchControls() {
  for (const button of ui.touchDirButtons) {
    const dir = button.dataset.dir;
    const setPressed = (pressed) => {
      touchDirs[dir] = pressed;
      button.classList.toggle("pressed", pressed);
      if (pressed) haptic();
    };

    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      setPressed(true);
    });
    for (const eventName of ["pointerup", "pointercancel", "lostpointercapture", "pointerleave"]) {
      button.addEventListener(eventName, (event) => {
        event.preventDefault();
        setPressed(false);
      });
    }
  }

  ui.touchInteractButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    haptic("impact");
    if (scene === "battle" || !nearest) {
      openQuickMenu();
      return;
    }
    interact();
  });

  ui.touchTeamButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    haptic();
    if (scene === "battle") {
      openQuickMenu();
      return;
    }
    openHeroPicker(selectedPartySlot);
  });

  ui.touchMenuButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    haptic();
    openQuickMenu();
  });
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", (event) => keys.delete(event.code));
canvas.addEventListener("pointerdown", handleCanvasClick);
ui.closeModal.addEventListener("click", closeModal);
ui.speedButton.addEventListener("click", cycleAutoSpeed);
ui.runAwayButton.addEventListener("click", leaveBattle);
ui.healTeamButton.addEventListener("click", healTeam);
ui.openRosterButton.addEventListener("click", openHeroPicker);
ui.statsButton.addEventListener("click", openStats);
ui.guideButton.addEventListener("click", openGuide);
ui.questChip.addEventListener("click", () => runTaskAction(scene === "battle" ? getBattleTask() : getCurrentTask()));
bindTouchControls();

initTelegramEnvironment();
startStatsSession();
resizeCanvas();
setScene("market");
setObjective("Агентский хаб Capsule Rift", "Ты космический агент: собирай героев из капсул, усиливай копии, фарми монеты контрактами и отправляй отряд в разлом.");
addLog("Добро пожаловать в Capsule Rift. Победы и дневные контракты дают монеты для новых капсул.");
renderAll();
if (!save.tutorial.seenIntro) openGuide();
requestAnimationFrame(loop);
