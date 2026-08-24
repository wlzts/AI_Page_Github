const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

const STORAGE_KEY = "nova-park-2099-v3";
const freshState = () => ({
  xp: 0,
  bestGame: 0,
  playerName: "YOU",
  achievements: [],
  energyCount: 0,
  titleCount: 0,
  chatCount: 0,
  gameWins: 0,
  musicUsed: false,
  shipUsed: false,
  scanUsed: false,
  secretFragments: [],
  secretClaimed: false,
  flightMissions: [],
  flightKills: 0,
  flightSalvage: 0,
  arcadeStreak: 0,
  bestArcadeStreak: 0,
  trainingCompleted: [],
});

let state;
try {
  state = { ...freshState(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  if (!Array.isArray(state.achievements)) state.achievements = [];
  if (!Array.isArray(state.secretFragments)) state.secretFragments = [];
  if (!Array.isArray(state.flightMissions)) state.flightMissions = [];
  if (!Array.isArray(state.trainingCompleted)) state.trainingCompleted = [];
} catch {
  state = freshState();
}

const achievements = [
  { id: "arrival", icon: "✦", name: "入园许可", desc: "成功进入 NOVA FRONTIER" },
  { id: "energy", icon: "⚡", name: "别碰那个", desc: "无视警告释放一次能量" },
  { id: "identity", icon: "◇", name: "新身份已加载", desc: "生成一个未来称号" },
  { id: "arcade", icon: "⌁", name: "神经同步", desc: "完成一次随机小游戏" },
  { id: "chat", icon: "◎", name: "机器人朋友？", desc: "和 NOVA-7 对话" },
  { id: "pilot", icon: "△", name: "临时驾驶员", desc: "启动星舰巡航或跃迁" },
  { id: "music", icon: "♫", name: "耳机模式", desc: "启动园区科幻音乐" },
  { id: "secret", icon: "◉", name: "地图之外", desc: "发现幽灵星球 MIRA" },
  { id: "flight", icon: "✈", name: "真正的驾驶员", desc: "手动启动并驾驶 WAYFARER" },
  { id: "ace", icon: "✧", name: "边境王牌", desc: "完成全部三项飞行任务" },
  { id: "academy", icon: "⬡", name: "学院荣誉章", desc: "完成全部九项星舰训练" },
  { id: "streak", icon: "◆", name: "红线学员", desc: "随机挑战连续通关 5 次" },
];

const rankTable = [
  { xp: 0, name: "初来乍到的碳基游客" },
  { xp: 200, name: "量子通行证持有者" },
  { xp: 500, name: "霓虹街区常驻玩家" },
  { xp: 900, name: "轨道级麻烦制造者" },
  { xp: 1400, name: "星舰临时指挥官" },
  { xp: 2100, name: "NOVA FRONTIER 传奇游客" },
  { xp: 3000, name: "银河规则漏洞本人" },
];

const els = {
  xpTop: $("#xpTop"),
  levelHero: $("#levelHero"),
  achievementCountHero: $("#achievementCountHero"),
  levelNumber: $("#levelNumber"),
  rankName: $("#rankName"),
  xpFill: $("#xpFill"),
  xpCurrent: $("#xpCurrent"),
  xpNext: $("#xpNext"),
  achievementGrid: $("#achievementGrid"),
  leaderboardList: $("#leaderboardList"),
  toastStack: $("#toastStack"),
  gameStage: $("#gameStage"),
  gameLaunch: $("#gameLaunch"),
  gameType: $("#gameType"),
  gameScore: $("#gameScore"),
  arcadeStreak: $("#arcadeStreak"),
  bestArcadeStreak: $("#bestArcadeStreak"),
  trainingCompleteCount: $("#trainingCompleteCount"),
  academyWins: $("#academyWins"),
  academyProgressFill: $("#academyProgressFill"),
};

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function currentLevel() {
  let index = 0;
  rankTable.forEach((rank, i) => {
    if (state.xp >= rank.xp) index = i;
  });
  return index;
}

function renderProgress() {
  const levelIndex = currentLevel();
  const current = rankTable[levelIndex];
  const next = rankTable[levelIndex + 1];
  const displayLevel = String(levelIndex + 1).padStart(2, "0");
  const nextXp = next ? next.xp : current.xp;
  const progress = next ? ((state.xp - current.xp) / (next.xp - current.xp)) * 100 : 100;

  els.xpTop.textContent = state.xp.toLocaleString();
  els.levelHero.textContent = `LV.${displayLevel}`;
  els.achievementCountHero.textContent = state.achievements.length;
  els.levelNumber.textContent = displayLevel;
  els.rankName.textContent = current.name;
  els.xpCurrent.textContent = state.xp.toLocaleString();
  els.xpNext.textContent = next ? Math.max(0, nextXp - state.xp).toLocaleString() : "MAX";
  els.xpFill.style.width = `${clamp(progress, 0, 100)}%`;
  els.gameScore.textContent = `BEST ${String(state.bestGame).padStart(4, "0")}`;
  if (els.arcadeStreak) els.arcadeStreak.textContent = state.arcadeStreak || 0;
  if (els.bestArcadeStreak) els.bestArcadeStreak.textContent = state.bestArcadeStreak || 0;
  if (els.trainingCompleteCount) els.trainingCompleteCount.textContent = `${state.trainingCompleted?.length || 0}/9`;
  if (els.academyWins) els.academyWins.textContent = state.gameWins || 0;
  if (els.academyProgressFill) els.academyProgressFill.style.width = `${((state.trainingCompleted?.length || 0) / 9) * 100}%`;
  $$(".training-chip").forEach((chip) => chip.classList.toggle("complete", state.trainingCompleted?.includes(chip.dataset.training)));

  renderAchievements();
  renderLeaderboard();
}

function renderAchievements() {
  els.achievementGrid.replaceChildren();
  achievements.forEach((a) => {
    const unlocked = state.achievements.includes(a.id);
    const row = document.createElement("div");
    row.className = `achievement${unlocked ? " unlocked" : ""}`;

    const icon = document.createElement("div");
    icon.className = "achievement-icon";
    icon.textContent = unlocked ? a.icon : "·";

    const copy = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = a.name;
    const small = document.createElement("small");
    small.textContent = unlocked ? a.desc : "未解锁 · 继续探索园区";
    copy.append(strong, small);
    row.append(icon, copy);
    els.achievementGrid.append(row);
  });
}

function renderLeaderboard() {
  const seed = [
    { name: "VOID_KOI", title: "量子街机幽灵", xp: 2460 },
    { name: "MIRA?", title: "来源未知", xp: 1820 },
    { name: "NOVA-7", title: "NPC 坚称不参赛", xp: 1310 },
    { name: "BYTE_CAT", title: "自动售货机研究员", xp: 720 },
  ];
  const rows = [...seed, { name: state.playerName || "YOU", title: "本机游客", xp: state.xp, you: true }]
    .sort((a, b) => b.xp - a.xp);

  els.leaderboardList.replaceChildren();
  rows.forEach((entry, i) => {
    const row = document.createElement("div");
    row.className = `leader-row${entry.you ? " you" : ""}`;
    const place = document.createElement("span");
    place.className = "place";
    place.textContent = `#${String(i + 1).padStart(2, "0")}`;
    const player = document.createElement("div");
    player.className = "player";
    const name = document.createElement("strong");
    name.textContent = entry.you ? `${entry.name} · YOU` : entry.name;
    const title = document.createElement("small");
    title.textContent = entry.title;
    player.append(name, title);
    const score = document.createElement("span");
    score.className = "score";
    score.textContent = `${entry.xp.toLocaleString()} XP`;
    row.append(place, player, score);
    els.leaderboardList.append(row);
  });
}

function showToast(title, detail = "") {
  const toast = document.createElement("div");
  toast.className = "toast";
  const strong = document.createElement("strong");
  strong.textContent = title;
  toast.append(strong);
  if (detail) {
    const small = document.createElement("small");
    small.textContent = detail;
    toast.append(small);
  }
  els.toastStack.append(toast);
  setTimeout(() => toast.remove(), 3700);
}

function awardXP(amount, reason = "探索奖励") {
  if (!amount) return;
  const oldLevel = currentLevel();
  state.xp += amount;
  saveState();
  renderProgress();
  showToast(`+${amount} XP`, reason);
  if (currentLevel() > oldLevel) {
    setTimeout(() => showToast("等级提升", rankTable[currentLevel()].name), 260);
    playBeep(740, 0.12, 0.04);
  }
}

function unlockAchievement(id, bonus = 50, silent = false) {
  if (state.achievements.includes(id)) return false;
  const achievement = achievements.find((a) => a.id === id);
  if (!achievement) return false;
  state.achievements.push(id);
  state.xp += bonus;
  saveState();
  renderProgress();
  if (!silent) {
    showToast(`成就解锁 · ${achievement.name}`, `+${bonus} XP · ${achievement.desc}`);
    playBeep(880, 0.12, 0.035);
  }
  return true;
}

// ---------- Entrance, scroll reveal, cursor, tilt ----------
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
$$('.reveal').forEach((el, i) => {
  el.style.transitionDelay = `${Math.min((i % 4) * 70, 210)}ms`;
  revealObserver.observe(el);
});

const cursorOrb = $("#cursorOrb");
window.addEventListener("pointermove", (event) => {
  cursorOrb.style.left = `${event.clientX}px`;
  cursorOrb.style.top = `${event.clientY}px`;
}, { passive: true });

$$('.tilt-card').forEach((card) => {
  card.addEventListener("pointermove", (e) => {
    if (window.innerWidth < 900) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `rotateX(${y * -5}deg) rotateY(${x * 7}deg) translateY(-3px)`;
  });
  card.addEventListener("pointerleave", () => { card.style.transform = ""; });
});

// ---------- Web Audio: generated sci-fi ambient soundtrack ----------
let audioCtx = null;
let audioMaster = null;
let audioNodes = [];
let arpTimer = null;
let musicOn = false;
const musicToggle = $("#musicToggle");
const musicLabel = $("#musicLabel");
const musicIcon = $("#musicIcon");

function createOsc(type, frequency, gainValue, detune = 0) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  osc.detune.value = detune;
  gain.gain.value = gainValue;
  osc.connect(gain).connect(audioMaster);
  osc.start();
  audioNodes.push(osc, gain);
  return { osc, gain };
}

function startMusic() {
  if (musicOn) return;
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  audioMaster = audioCtx.createGain();
  audioMaster.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  audioMaster.gain.exponentialRampToValueAtTime(0.18, audioCtx.currentTime + 1.1);

  const filter = audioCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1250;
  filter.Q.value = 0.7;
  audioMaster.connect(filter).connect(audioCtx.destination);
  audioNodes.push(filter, audioMaster);

  const padA = createOsc("sine", 55, 0.16, -7);
  const padB = createOsc("triangle", 82.41, 0.06, 7);
  const padC = createOsc("sine", 110, 0.035, 0);
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 0.025;
  lfo.connect(lfoGain);
  lfoGain.connect(padA.gain.gain);
  lfoGain.connect(padB.gain.gain);
  lfo.start();
  audioNodes.push(lfo, lfoGain);

  const scale = [220, 246.94, 293.66, 329.63, 369.99, 440];
  let arpIndex = 0;
  arpTimer = setInterval(() => {
    if (!audioCtx || audioCtx.state !== "running") return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;
    osc.type = "sine";
    osc.frequency.value = scale[arpIndex++ % scale.length] / 2;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.028, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
    osc.connect(gain).connect(audioMaster);
    osc.start(now);
    osc.stop(now + 1.6);
  }, 1300);

  musicOn = true;
  musicToggle.setAttribute("aria-pressed", "true");
  musicLabel.textContent = "音乐 ON";
  musicIcon.textContent = "♫";
  if (!state.musicUsed) {
    state.musicUsed = true;
    saveState();
    unlockAchievement("music", 60);
  }
}

function stopMusic() {
  if (!musicOn || !audioCtx) return;
  const now = audioCtx.currentTime;
  if (audioMaster?.gain) {
    audioMaster.gain.cancelScheduledValues(now);
    audioMaster.gain.setValueAtTime(Math.max(audioMaster.gain.value, 0.0001), now);
    audioMaster.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  }
  clearInterval(arpTimer);
  setTimeout(() => {
    audioNodes.forEach((node) => {
      try { if (typeof node.stop === "function") node.stop(); } catch {}
      try { node.disconnect(); } catch {}
    });
    audioNodes = [];
  }, 500);
  musicOn = false;
  musicToggle.setAttribute("aria-pressed", "false");
  musicLabel.textContent = "音乐 OFF";
  musicIcon.textContent = "♪";
}

function playBeep(freq = 520, duration = 0.08, volume = 0.02) {
  if (!audioCtx || audioCtx.state !== "running") return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const now = audioCtx.currentTime;
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(freq * 1.18, now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

musicToggle.addEventListener("click", () => musicOn ? stopMusic() : startMusic());

// ---------- Energy core ----------
const energyButton = $("#energyButton");
const energyStatus = $("#energyStatus");
function burstAt(x, y, count = 30, danger = false) {
  const colors = danger ? ["#ff617c", "#ff9fbc", "#a884ff"] : ["#6ff7ff", "#a884ff", "#c7ff7a"];
  for (let i = 0; i < count; i++) {
    const particle = document.createElement("i");
    particle.className = "fx-particle";
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.background = colors[i % colors.length];
    const angle = Math.random() * Math.PI * 2;
    const distance = 70 + Math.random() * 180;
    particle.style.setProperty("--tx", `${Math.cos(angle) * distance}px`);
    particle.style.setProperty("--ty", `${Math.sin(angle) * distance}px`);
    particle.style.setProperty("--rot", `${Math.random() * 540 - 270}deg`);
    document.body.append(particle);
    setTimeout(() => particle.remove(), 950);
  }
}

energyButton.addEventListener("click", () => {
  const rect = energyButton.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  burstAt(x, y, 42, true);
  const wave = document.createElement("i");
  wave.className = "shockwave";
  wave.style.left = `${x}px`;
  wave.style.top = `${y}px`;
  document.body.append(wave);
  setTimeout(() => wave.remove(), 750);
  playBeep(120, 0.18, 0.05);

  state.energyCount += 1;
  const stability = Math.max(23, 100 - state.energyCount * 7);
  energyStatus.textContent = state.energyCount >= 8 ? "核心稳定度：我们不讨论这个数字" : `核心稳定度 ${stability}%`;
  if (state.energyCount <= 8) state.xp += 12;
  saveState();
  renderProgress();
  unlockAchievement("energy", 60);
  if (state.energyCount === 5) showToast("系统警告", "你已经连续按了五次。科学精神很可疑，但很坚定。");
});

// ---------- Identity forge ----------
const futureTitles = [
  "量子雨中的霓虹领航员",
  "第七轨道非法浪漫主义者",
  "星际售货机首席谈判官",
  "反重力区指定麻烦制造者",
  "凌晨三点的月球项目经理",
  "不按说明书驾驶的银河骑手",
  "时间线边缘的零号游客",
  "宇宙缓存清理委员会会长",
  "超光速碰碰车隐藏冠军",
  "NOVA-7 观察名单常驻成员",
];

function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

$("#titleButton").addEventListener("click", forgeTitle);
$("#nameInput").addEventListener("keydown", (e) => { if (e.key === "Enter") forgeTitle(); });

function forgeTitle() {
  const input = $("#nameInput");
  const name = input.value.trim() || "神秘游客";
  const title = futureTitles[(hashString(name) + state.titleCount) % futureTitles.length];
  const ticket = $("#titleTicket");
  ticket.replaceChildren();
  const small = document.createElement("small");
  small.textContent = `ID VERIFIED · ${String(hashString(name)).slice(0, 6)}`;
  const strong = document.createElement("strong");
  strong.textContent = `${name} · ${title}`;
  ticket.append(small, strong);

  state.playerName = name;
  state.titleCount += 1;
  if (state.titleCount <= 3) state.xp += 20;
  saveState();
  renderProgress();
  unlockAchievement("identity", 60);
  playBeep(660, 0.12, 0.025);
}

// ---------- Starship Academy: 9 random training simulations ----------
let gameBusy = false;
let cleanupGame = () => {};
let currentGameType = "";
let recentGames = [];

const trainingMeta = {
  reaction: { name: "神经反应测试", code: "REFLEX-01", difficulty: "CADET" },
  memory: { name: "脉冲记忆阵列", code: "MEMORY-02", difficulty: "CADET" },
  charge: { name: "反应堆快速充能", code: "POWER-03", difficulty: "CREW" },
  target: { name: "战术雷达锁敌", code: "TACTICAL-04", difficulty: "CREW" },
  cipher: { name: "舰桥密码译码", code: "LOGIC-05", difficulty: "OFFICER" },
  warp: { name: "跃迁场校准", code: "DRIVE-06", difficulty: "OFFICER" },
  shield: { name: "护盾象限调度", code: "DEFENSE-07", difficulty: "OFFICER" },
  dodge: { name: "小行星规避", code: "PILOT-08", difficulty: "PILOT" },
  anomaly: { name: "异常信号识别", code: "SCIENCE-09", difficulty: "SCIENCE" },
};

const trainingStarters = {
  reaction: startReactionGame,
  memory: startMemoryGame,
  charge: startChargeGame,
  target: startTargetGame,
  cipher: startCipherGame,
  warp: startWarpGame,
  shield: startShieldGame,
  dodge: startDodgeGame,
  anomaly: startAnomalyGame,
};

function chooseRandomTraining() {
  const all = Object.keys(trainingMeta);
  const pool = all.filter((key) => !recentGames.includes(key));
  const type = (pool.length ? pool : all)[Math.floor(Math.random() * (pool.length || all.length))];
  recentGames.push(type);
  recentGames = recentGames.slice(-3);
  return type;
}

function launchTraining(type = chooseRandomTraining()) {
  if (gameBusy) return;
  cleanupGame();
  currentGameType = type;
  $$(".training-chip").forEach((chip) => chip.classList.toggle("active", chip.dataset.training === type));
  const meta = trainingMeta[type];
  const title = $("#academyMissionTitle");
  if (title) title.textContent = meta.name;
  els.gameType.textContent = `${meta.code} / ${meta.difficulty}`;
  trainingStarters[type]?.();
}

els.gameLaunch.addEventListener("click", () => launchTraining());
$("#academyReroll")?.addEventListener("click", () => {
  if (gameBusy) return;
  playBeep(620, .06, .015);
  launchTraining();
});
$$('.training-chip').forEach((chip) => chip.addEventListener('click', () => {
  if (!gameBusy) launchTraining(chip.dataset.training);
}));

function setGameBusy(value) {
  gameBusy = value;
  els.gameLaunch.disabled = value;
  const reroll = $("#academyReroll");
  if (reroll) reroll.disabled = value;
  els.gameLaunch.textContent = value ? "训练进行中…" : "随机抽取下一训练";
}

function finishGame(score, message, xp = 60) {
  setGameBusy(false);
  cleanupGame = () => {};
  state.bestGame = Math.max(state.bestGame, score);
  state.gameWins += 1;
  state.arcadeStreak = (state.arcadeStreak || 0) + 1;
  state.bestArcadeStreak = Math.max(state.bestArcadeStreak || 0, state.arcadeStreak);
  if (currentGameType && !state.trainingCompleted.includes(currentGameType)) state.trainingCompleted.push(currentGameType);
  const streakBonus = Math.min(60, Math.max(0, state.arcadeStreak - 1) * 10);
  state.xp += xp + streakBonus;
  saveState();
  renderProgress();
  unlockAchievement("arcade", 80);
  if (state.trainingCompleted.length >= 9) unlockAchievement("academy", 220);
  if (state.arcadeStreak >= 5) unlockAchievement("streak", 120);
  const meta = trainingMeta[currentGameType] || { name: "训练项目" };
  els.gameStage.innerHTML = `
    <div class="game-result academy-result">
      <span class="kicker">SIMULATION PASSED · ${meta.name}</span>
      <div class="result-score">${String(score).padStart(4, "0")}</div>
      <p>${message}</p>
      <small>连胜 ${state.arcadeStreak} · +${xp + streakBonus} XP${streakBonus ? `（含连胜奖励 +${streakBonus}）` : ""}</small>
    </div>`;
  els.gameStage.classList.add("flash-success");
  setTimeout(() => els.gameStage.classList.remove("flash-success"), 400);
  playBeep(720, 0.13, 0.035);
}

function failGame(message) {
  setGameBusy(false);
  cleanupGame = () => {};
  const lost = state.arcadeStreak || 0;
  state.arcadeStreak = 0;
  saveState();
  renderProgress();
  els.gameStage.innerHTML = `
    <div class="game-result academy-result failed">
      <span class="kicker">SIMULATION FAILED</span>
      <div class="result-score">0000</div>
      <p>${message}</p>
      <small>${lost > 1 ? `连续 ${lost} 胜记录终止。` : "训练记录已归档，重新来过。"}</small>
    </div>`;
  playBeep(170, 0.16, 0.03);
}

function startReactionGame() {
  setGameBusy(true);
  els.gameStage.innerHTML = `
    <div class="game-instruction">舰桥即将收到跃迁许可。等待面板变成绿色后立即确认；提前操作视为误启动。</div>
    <div class="reaction-readout">AWAITING COMMAND AUTHORIZATION</div>
    <button class="reaction-pad" type="button">STANDBY</button>`;
  const pad = $(".reaction-pad", els.gameStage);
  let ready = false, startTime = 0, ended = false;
  const timer = setTimeout(() => {
    if (ended) return;
    ready = true;
    startTime = performance.now();
    pad.classList.add("ready");
    pad.textContent = "ENGAGE";
    $(".reaction-readout", els.gameStage).textContent = "COMMAND AUTHORIZED";
    playBeep(510, 0.05, 0.02);
  }, 1300 + Math.random() * 2200);
  pad.addEventListener("click", () => {
    if (ended) return;
    ended = true; clearTimeout(timer);
    if (!ready) return failGame("你在授权前启动了推进系统。模拟舰桥里响起了非常昂贵的警报声。");
    const reaction = Math.round(performance.now() - startTime);
    const score = clamp(Math.round(1700 - reaction * 1.9), 120, 1600);
    finishGame(score, `确认延迟 ${reaction} ms。${reaction < 260 ? "舰桥电脑怀疑你提前看过未来。" : reaction < 430 ? "反应符合战术值班标准。" : "许可有效，至少没有撞上空间站。"}`, reaction < 430 ? 120 : 80);
  });
  cleanupGame = () => { ended = true; clearTimeout(timer); };
}

async function startMemoryGame() {
  setGameBusy(true);
  els.gameStage.innerHTML = `
    <div class="game-instruction">记住六段舰桥脉冲，然后按相同顺序复现导航指令。</div>
    <div class="memory-board academy-memory">
      <button class="memory-cell" data-cell="0" aria-label="左舷"></button>
      <button class="memory-cell" data-cell="1" aria-label="舰首"></button>
      <button class="memory-cell" data-cell="2" aria-label="右舷"></button>
      <button class="memory-cell" data-cell="3" aria-label="舰尾"></button>
    </div>`;
  const cells = $$(".memory-cell", els.gameStage);
  const sequence = Array.from({ length: 6 }, () => Math.floor(Math.random() * 4));
  let accepting = false, cursor = 0, cancelled = false;
  cleanupGame = () => { cancelled = true; };
  await sleep(600);
  for (const index of sequence) {
    if (cancelled) return;
    cells[index].classList.add("active"); playBeep(300 + index * 90, .07, .015);
    await sleep(280); cells[index].classList.remove("active"); await sleep(130);
  }
  accepting = true;
  $(".game-instruction", els.gameStage).textContent = "NAV MEMORY READY · 复现六段脉冲。";
  cells.forEach((cell, index) => cell.addEventListener("click", () => {
    if (!accepting || cancelled) return;
    cell.classList.add("active"); setTimeout(() => cell.classList.remove("active"), 100);
    if (index !== sequence[cursor]) { accepting = false; return failGame(`第 ${cursor + 1} 段导航脉冲错误。模拟飞船正在礼貌地偏离航道。`); }
    playBeep(300 + index * 90, .05, .015); cursor += 1;
    if (cursor === sequence.length) { accepting = false; finishGame(1360, "六段导航脉冲全部正确。值班官把咖啡杯重新放回了控制台。", 135); }
  }));
}

function startChargeGame() {
  setGameBusy(true);
  const target = 22, totalTime = 5400;
  let clicks = 0, ended = false;
  const start = performance.now();
  els.gameStage.innerHTML = `
    <div class="game-instruction">5.4 秒内完成 ${target} 次磁约束脉冲。工程师把这称为“精密能源管理”。</div>
    <div class="charge-wrap"><button class="charge-core" type="button"><strong>0/${target}</strong></button><div class="charge-meter"><i></i></div></div>`;
  const core = $(".charge-core", els.gameStage), count = $(".charge-core strong", els.gameStage), meter = $(".charge-meter i", els.gameStage);
  const timeout = setTimeout(() => { if (!ended) { ended = true; failGame(`反应堆只完成 ${clicks}/${target} 次约束。工程部决定先关闭灯光以节省能源。`); } }, totalTime);
  core.addEventListener("click", () => {
    if (ended) return; clicks++; count.textContent = `${clicks}/${target}`; meter.style.width = `${clamp(clicks/target*100,0,100)}%`;
    core.animate([{transform:"scale(1)"},{transform:"scale(.93)"},{transform:"scale(1)"}],{duration:100}); playBeep(210+clicks*10,.03,.009);
    if (clicks >= target) { ended = true; clearTimeout(timeout); const elapsed = performance.now()-start; finishGame(clamp(Math.round(1750-elapsed*.14),600,1550), `主核心在 ${(elapsed/1000).toFixed(2)} 秒内达到跃迁输出。`, 130); }
  });
  cleanupGame = () => { ended = true; clearTimeout(timeout); };
}

function startTargetGame() {
  setGameBusy(true);
  let hits = 0, ended = false;
  const targetHits = 6, start = performance.now();
  els.gameStage.innerHTML = `<div class="game-instruction">战术雷达发现高速无人机。8 秒内完成 ${targetHits} 次锁定。</div><div class="target-field"><div class="radar-rings"></div><button class="lock-target" aria-label="锁定目标"><i></i></button><span class="target-counter">LOCK 0/${targetHits}</span></div>`;
  const field = $(".target-field", els.gameStage), target = $(".lock-target", field), counter=$(".target-counter", field);
  function move(){ const r=field.getBoundingClientRect(); const pad=42; target.style.left=`${pad+Math.random()*Math.max(20,r.width-pad*2)}px`; target.style.top=`${pad+Math.random()*Math.max(20,r.height-pad*2)}px`; }
  requestAnimationFrame(move);
  const timeout=setTimeout(()=>{ if(!ended){ended=true;failGame(`锁定完成 ${hits}/${targetHits}。目标已跳出传感器范围。`)}},8000);
  target.addEventListener('click',()=>{ if(ended)return; hits++; counter.textContent=`LOCK ${hits}/${targetHits}`; target.classList.add('ping'); setTimeout(()=>target.classList.remove('ping'),120); playBeep(480+hits*50,.04,.014); if(hits>=targetHits){ended=true;clearTimeout(timeout);const ms=performance.now()-start;finishGame(clamp(Math.round(1800-ms*.1),650,1550),`六次火控锁定完成，用时 ${(ms/1000).toFixed(2)} 秒。`,145)} else move(); });
  cleanupGame=()=>{ended=true;clearTimeout(timeout)};
}

function startCipherGame() {
  setGameBusy(true);
  const glyphs=["△","◇","○","⬡","✦","▣"];
  const shuffled=[...glyphs].sort(()=>Math.random()-.5).slice(0,4);
  const digits=[...Array(10).keys()].sort(()=>Math.random()-.5).slice(0,4);
  const map=Object.fromEntries(shuffled.map((g,i)=>[g,digits[i]]));
  const code=Array.from({length:5},()=>shuffled[Math.floor(Math.random()*shuffled.length)]);
  const answer=code.map(g=>map[g]).join('');
  els.gameStage.innerHTML=`<div class="game-instruction">根据舰桥译码表，把符号序列转换成数字授权码。</div><div class="cipher-map">${shuffled.map(g=>`<span><b>${g}</b><em>${map[g]}</em></span>`).join('')}</div><div class="cipher-code">${code.join(' ')}</div><form class="cipher-form"><input inputmode="numeric" maxlength="5" placeholder="输入 5 位授权码" autocomplete="off"><button>确认译码</button></form><small class="cipher-timer">SECURITY WINDOW · 12s</small>`;
  const form=$(".cipher-form",els.gameStage), input=$("input",form); let ended=false;
  const timeout=setTimeout(()=>{if(!ended){ended=true;failGame("安全窗口关闭。密码本开始假装自己从未见过你。")}},12000);
  form.addEventListener('submit',e=>{e.preventDefault();if(ended)return;ended=true;clearTimeout(timeout);if(input.value.trim()!==answer)return failGame(`译码错误。正确授权码是 ${answer}。`);finishGame(1420,"授权码通过。舰桥安全系统勉强承认你有操作权限。",150)});
  input.focus(); cleanupGame=()=>{ended=true;clearTimeout(timeout)};
}

function startWarpGame() {
  setGameBusy(true);
  let round=0,totalError=0,ended=false,raf=0,start=performance.now();
  els.gameStage.innerHTML=`<div class="game-instruction">让跃迁指针落入稳定窗口。连续完成 3 次场线校准。</div><div class="warp-calibrator"><div class="warp-track"><i class="warp-window"></i><b class="warp-needle"></b></div><button class="warp-lock">锁定场线</button><span class="warp-round">CALIBRATION 1/3</span></div>`;
  const track=$(".warp-track",els.gameStage), win=$(".warp-window",track),needle=$(".warp-needle",track), btn=$(".warp-lock",els.gameStage), roundEl=$(".warp-round",els.gameStage);
  let target=.5,phase=0,speed=1.4;
  function setup(){target=.16+Math.random()*.68;win.style.left=`${target*100}%`;phase=Math.random()*Math.PI*2;speed=1.4+round*.35;}
  function frame(t){if(ended)return;const pos=.5+.47*Math.sin(t/1000*speed+phase);needle.dataset.pos=pos;needle.style.left=`${pos*100}%`;raf=requestAnimationFrame(frame)}
  setup();raf=requestAnimationFrame(frame);
  btn.addEventListener('click',()=>{if(ended)return;const pos=Number(needle.dataset.pos||0);const err=Math.abs(pos-target);if(err>.095){ended=true;cancelAnimationFrame(raf);return failGame(`场线偏差 ${(err*100).toFixed(1)}%。跃迁泡沫拒绝形成。`)}totalError+=err;round++;playBeep(700+round*80,.07,.02);if(round>=3){ended=true;cancelAnimationFrame(raf);const score=clamp(Math.round(1580-totalError*1900),700,1580);return finishGame(score,`三次跃迁场校准完成，总偏差 ${(totalError*100).toFixed(1)}%。`,155)}roundEl.textContent=`CALIBRATION ${round+1}/3`;setup()});
  cleanupGame=()=>{ended=true;cancelAnimationFrame(raf)};
}

function startShieldGame() {
  setGameBusy(true);
  const dirs=[['FORE','舰首'],['PORT','左舷'],['STARBOARD','右舷'],['AFT','舰尾']];
  let wave=0,ended=false,timer=0,current=0,start=performance.now();
  els.gameStage.innerHTML=`<div class="game-instruction">传感器会报告来袭方向。立刻把护盾能量调度到正确象限，连续抵挡 7 波。</div><div class="shield-console"><div class="threat-callout">THREAT VECTOR · STANDBY</div><div class="shield-grid">${dirs.map((d,i)=>`<button data-dir="${i}"><b>${d[0]}</b><span>${d[1]}</span></button>`).join('')}</div><small class="shield-wave">WAVE 0/7</small></div>`;
  const call=$(".threat-callout",els.gameStage),waveEl=$(".shield-wave",els.gameStage);
  function next(){if(ended)return;current=Math.floor(Math.random()*4);call.textContent=`INCOMING FIRE · ${dirs[current][0]} / ${dirs[current][1]}`;call.classList.add('alert');waveEl.textContent=`WAVE ${wave+1}/7`;clearTimeout(timer);timer=setTimeout(()=>{ended=true;failGame(`第 ${wave+1} 波护盾响应超时。模拟舰体被打出了一个很有教育意义的洞。`)},1800)}
  $$(".shield-grid button",els.gameStage).forEach((b,i)=>b.addEventListener('click',()=>{if(ended)return;if(i!==current){ended=true;clearTimeout(timer);return failGame(`护盾调度到了 ${dirs[i][1]}，但攻击来自 ${dirs[current][1]}。`)}clearTimeout(timer);b.classList.add('hit');setTimeout(()=>b.classList.remove('hit'),160);playBeep(560+wave*45,.05,.015);wave++;if(wave>=7){ended=true;const ms=performance.now()-start;return finishGame(clamp(Math.round(1700-ms*.06),800,1550),"七波攻击全部被正确象限护盾吸收。舰体油漆保住了。",160)}setTimeout(next,260)}));
  setTimeout(next,650);cleanupGame=()=>{ended=true;clearTimeout(timer)};
}

function startDodgeGame() {
  setGameBusy(true);
  let shipX=.5,ended=false,raf=0,last=performance.now(),spawn=0,survival=0;
  const rocks=[]; const keys=new Set();
  els.gameStage.innerHTML=`<div class="game-instruction">坚持 9 秒。使用 A / D 或 ← / → 让训练艇避开小行星。</div><div class="dodge-field"><div class="dodge-stars"></div><div class="dodge-ship">▲</div><span class="dodge-time">09.0</span></div>`;
  const field=$(".dodge-field",els.gameStage),ship=$(".dodge-ship",field),timeEl=$(".dodge-time",field);
  function kd(e){if(['KeyA','KeyD','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();keys.add(e.code)}} function ku(e){keys.delete(e.code)}
  window.addEventListener('keydown',kd);window.addEventListener('keyup',ku);
  function addRock(){const el=document.createElement('i');el.className='dodge-rock';const size=18+Math.random()*30;const x=.04+Math.random()*.92;el.style.width=el.style.height=`${size}px`;field.append(el);rocks.push({el,x,y:-.08,size:size/field.clientWidth,speed:.28+Math.random()*.25});}
  function frame(now){if(ended)return;const dt=Math.min(.035,(now-last)/1000);last=now;survival+=dt;spawn-=dt;if(spawn<=0){spawn=.38+Math.random()*.25;addRock()}const dir=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);shipX=clamp(shipX+dir*dt*.72,.06,.94);ship.style.left=`${shipX*100}%`;for(let i=rocks.length-1;i>=0;i--){const r=rocks[i];r.y+=r.speed*dt;r.el.style.left=`${r.x*100}%`;r.el.style.top=`${r.y*100}%`;if(Math.abs(r.x-shipX)<.055+r.size*.25 && r.y>.76 && r.y<.94){ended=true;return finish(false)}if(r.y>1.1){r.el.remove();rocks.splice(i,1)}}timeEl.textContent=Math.max(0,9-survival).toFixed(1);if(survival>=9){ended=true;return finish(true)}raf=requestAnimationFrame(frame)}
  function finish(ok){cancelAnimationFrame(raf);window.removeEventListener('keydown',kd);window.removeEventListener('keyup',ku);rocks.forEach(r=>r.el.remove());if(ok)finishGame(1500,"训练艇穿过小行星带。没有划痕，维修主管显得有点失望。",170);else failGame("训练艇与小行星发生了非常具有教学价值的接触。")}
  raf=requestAnimationFrame(frame);cleanupGame=()=>{ended=true;cancelAnimationFrame(raf);window.removeEventListener('keydown',kd);window.removeEventListener('keyup',ku);rocks.forEach(r=>r.el.remove())};
}

function startAnomalyGame() {
  setGameBusy(true);
  let round=0,ended=false,start=performance.now();
  const baseSets=[["○","◉"],["△","▲"],["◇","◆"],["✦","✧"],["⬡","⬢"]];
  els.gameStage.innerHTML=`<div class="game-instruction">在传感器矩阵里找出唯一异常回波。连续识别 3 组。</div><div class="anomaly-panel"><div class="anomaly-grid"></div><span class="anomaly-round">SCAN 1/3</span></div>`;
  const grid=$(".anomaly-grid",els.gameStage),roundEl=$(".anomaly-round",els.gameStage);
  function renderRound(){grid.replaceChildren();const [normal,odd]=baseSets[Math.floor(Math.random()*baseSets.length)];const oddIndex=Math.floor(Math.random()*25);for(let i=0;i<25;i++){const b=document.createElement('button');b.textContent=i===oddIndex?odd:normal;b.dataset.odd=i===oddIndex?'1':'0';b.addEventListener('click',()=>{if(ended)return;if(b.dataset.odd!=='1'){ended=true;return failGame("你标记了正常回波。科学官默默把扫描仪说明书推到了你面前。")};b.classList.add('found');playBeep(820+round*70,.07,.018);round++;if(round>=3){ended=true;const ms=performance.now()-start;return finishGame(clamp(Math.round(1650-ms*.055),750,1580),`三组异常回波全部识别，用时 ${(ms/1000).toFixed(2)} 秒。`,165)}roundEl.textContent=`SCAN ${round+1}/3`;setTimeout(renderRound,260)});grid.append(b)}}renderRound();
  cleanupGame=()=>{ended=true};
}

// ---------- NOVA-7 local NPC ----------
const chatLog = $("#chatLog");
const chatForm = $("#chatForm");
const chatInput = $("#chatInput");
let lastIntent = "hello";

const npcReplies = {
  secret: [
    "既然你问了：地图外的东西通常会以很弱的粉色信号出现。英雄区、船坞、页脚——这三个地方我什么都没说。",
    "彩蛋？没有。绝对没有。尤其不要收集三个异常信号碎片。我们换个话题。",
  ],
  game: [
    "去量子街机厅。随机生成器不会考虑你的尊严，只考虑随机数。很公平。",
    "今天适合反应类挑战。这个判断没有科学依据，但听起来很像有。",
  ],
  ship: [
    "NX-09 的跃迁按钮已经通过了……某种形式的检查。你可以在船坞切换模式，维修单不归我签。",
    "飞船建议先用“巡航”，再碰“跃迁”。这个顺序是我刚刚根据生存本能制定的。",
  ],
  park: [
    "本园最大特色是：所有危险设备旁边都有一个很诱人的按钮。设计部门坚持说这是‘交互性’。",
    "园区有三大传统：发光、报警、假装报警属于视觉设计的一部分。",
  ],
  identity: [
    "称号锻造器会根据你的名字生成身份。它完全不靠谱，但打印出来很好看，所以大家都接受了。",
  ],
  music: [
    "右上角有音乐开关。音轨是浏览器实时合成的，所以没有哪位外星艺术家会来追版税。",
  ],
  hello: [
    "频道稳定。我是 NOVA-7。我的职责包括导览、风险提示，以及在游客无视风险提示后做记录。",
    "你好，游客。今天园区没有发生任何事故。至少在我开始这句话的时候没有。",
  ],
  tease: [
    "你想听吐槽？这个游乐园把“禁止触摸”做成了最大的按钮。设计师要么是天才，要么非常喜欢填事故报告。",
    "排行榜里有一个 NPC，而且那个 NPC 还坚称自己没有参赛。对，我说的是我。下一题。",
  ],
  unknown: [
    "这个问题超出了我的游客导览权限。换个说法，我或许能假装自己早就知道答案。",
    "我检索了 0.03 秒，然后决定给你一个专业结论：很有意思。请继续。",
    "收到。我的情绪模拟模块给出了一个“嗯？”——这已经是高级反馈了。",
  ],
};

function detectIntent(text) {
  const t = text.toLowerCase();
  if (/彩蛋|隐藏|秘密|线索|未知|mira/.test(t)) return "secret";
  if (/游戏|玩|挑战|街机|推荐/.test(t)) return "game";
  if (/飞船|星舰|驾驶|跃迁|船坞/.test(t)) return "ship";
  if (/乐园|园区|吐槽|这里/.test(t)) return /吐槽/.test(t) ? "tease" : "park";
  if (/名字|称号|身份/.test(t)) return "identity";
  if (/音乐|声音|歌/.test(t)) return "music";
  if (/你好|hello|hi|嗨|在吗/.test(t)) return "hello";
  if (/吐槽|笑话|好笑/.test(t)) return "tease";
  return "unknown";
}

function appendMessage(text, who = "bot") {
  const wrap = document.createElement("div");
  wrap.className = `message ${who === "user" ? "user-message" : "bot-message"}`;
  const label = document.createElement("span");
  label.textContent = who === "user" ? (state.playerName || "YOU") : "NOVA-7";
  const p = document.createElement("p");
  p.textContent = text;
  wrap.append(label, p);
  chatLog.append(wrap);
  chatLog.scrollTop = chatLog.scrollHeight;
  return wrap;
}

async function sendToNpc(text) {
  const clean = text.trim().slice(0, 120);
  if (!clean) return;
  appendMessage(clean, "user");
  chatInput.value = "";
  const typing = document.createElement("div");
  typing.className = "message bot-message typing";
  typing.innerHTML = `<span>NOVA-7</span><p><i></i><i></i><i></i></p>`;
  chatLog.append(typing);
  chatLog.scrollTop = chatLog.scrollHeight;

  const intent = detectIntent(clean);
  lastIntent = intent === "unknown" ? lastIntent : intent;
  await sleep(420 + Math.random() * 480);
  typing.remove();
  const pool = npcReplies[intent];
  let reply = pool[Math.floor(Math.random() * pool.length)];
  if (intent === "unknown" && Math.random() > 0.55) {
    const contextPool = npcReplies[lastIntent] || npcReplies.unknown;
    reply += ` 顺便说一句：${contextPool[Math.floor(Math.random() * contextPool.length)]}`;
  }
  appendMessage(reply, "bot");

  state.chatCount += 1;
  if (state.chatCount <= 6) state.xp += 8;
  saveState();
  renderProgress();
  unlockAchievement("chat", 60);
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  sendToNpc(chatInput.value);
});
$$('.prompt-chip').forEach((chip) => chip.addEventListener("click", () => sendToNpc(chip.dataset.prompt || chip.textContent)));

// ---------- Hidden egg ----------
const secretModal = $("#secretModal");
function collectFragment(id, message) {
  if (state.secretFragments.includes(id)) {
    showToast("信号已记录", "这段异常信号你已经收集过了。");
    return;
  }
  state.secretFragments.push(id);
  saveState();
  showToast(`异常信号 ${state.secretFragments.length}/3`, message);
  playBeep(980 - state.secretFragments.length * 80, 0.11, 0.025);
  if (state.secretFragments.length >= 3) setTimeout(openSecret, 500);
}

function openSecret() {
  if (!secretModal.open) secretModal.showModal();
  document.body.classList.add("modal-open");
}

$("#mysterySignal").addEventListener("click", () => collectFragment("hero", "英雄区捕获到一段粉色噪声。"));
$("#footerSecret").addEventListener("click", () => collectFragment("footer", "页脚协议里藏着第二段坐标。非常专业。"));
$("#planetScanButton").addEventListener("click", () => {
  collectFragment("hangar", "船坞雷达发现了一个不在星图里的轨道。" );
  state.scanUsed = true;
  saveState();
  if (shipAPI) shipAPI.scanPulse();
});
$("#scanButton").addEventListener("click", () => {
  showToast("扫描结果", state.secretFragments.length ? `已捕获 ${state.secretFragments.length}/3 段异常信号。继续检查不太像按钮的东西。` : "发现一段极弱的粉色信号。它似乎不喜欢被做成正常按钮。" );
  $("#mysterySignal").animate([{ transform: "scale(1)" }, { transform: "scale(1.8)" }, { transform: "scale(1)" }], { duration: 650 });
});
$("#secretClose").addEventListener("click", () => { secretModal.close(); document.body.classList.remove("modal-open"); });
$("#secretAccept").addEventListener("click", () => {
  if (!state.secretClaimed) {
    state.secretClaimed = true;
    state.xp += 500;
    saveState();
    unlockAchievement("secret", 0);
    renderProgress();
    burstAt(window.innerWidth / 2, window.innerHeight / 2, 70, false);
  } else {
    showToast("奖励已领取", "MIRA 仍然在那里，500 XP 不会复制。量子力学也有底线。" );
  }
  secretModal.close();
  document.body.classList.remove("modal-open");
});
secretModal.addEventListener("cancel", () => document.body.classList.remove("modal-open"));

// ---------- Ship controls / Three.js hooks ----------
let shipAPI = null;
$$('[data-ship-mode]').forEach((button) => {
  button.addEventListener("click", () => {
    $$('[data-ship-mode]').forEach((b) => b.classList.toggle("active", b === button));
    const mode = button.dataset.shipMode;
    shipAPI?.setMode(mode);
    if (mode !== "display") {
      state.shipUsed = true;
      saveState();
      unlockAchievement("pilot", 70);
    }
  });
});

// ---------- reset ----------
$("#resetProgress").addEventListener("click", () => {
  const ok = window.confirm("要重置本机 XP、成就、排行榜和隐藏进度吗？这个操作不能撤销。" );
  if (!ok) return;
  state = freshState();
  saveState();
  renderProgress();
  $("#titleTicket").innerHTML = "<small>身份系统待命</small><strong>等待录入游客代号</strong>";
  energyStatus.textContent = "核心稳定度 100%";
  showToast("本机进度已重置", "NOVA FRONTIER 假装从未见过你。" );
  unlockAchievement("arrival", 50, true);
});

// ---------- Three.js scenes (dynamic import so core UI still works if CDN is unavailable) ----------
async function initThreeScenes() {
  try {
    const THREE = await import("three");
    initSpaceScene(THREE);
    const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
    initShipScene(THREE, OrbitControls);
  } catch (error) {
    console.warn("Three.js could not load. Core UI remains available.", error);
    showToast("3D 引擎未连接", "请确认联网并通过本地 HTTP 服务打开页面。" );
    const canvas = $("#shipCanvas");
    const fallback = document.createElement("div");
    fallback.style.cssText = "position:absolute;inset:0;display:grid;place-items:center;color:#7e8aa0;font-family:var(--mono);font-size:12px;text-align:center;padding:30px;";
    fallback.textContent = "THREE.JS OFFLINE · 其余互动功能仍可使用";
    canvas.parentElement.append(fallback);
  }
}

function initSpaceScene(THREE) {
  const canvas = $("#spaceCanvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020405, 0.021);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 140);
  camera.position.set(-1.2, 0.55, 10.8);

  // Layered star field for film-like depth.
  function makeStars(count, radius, size, color, opacity) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 8 + Math.random() * radius;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true, opacity, depthWrite: false }));
  }
  const starsFar = makeStars(window.innerWidth < 700 ? 800 : 1700, 55, .025, 0xb9d2d8, .62);
  const starsNear = makeStars(window.innerWidth < 700 ? 180 : 420, 25, .055, 0xf1e6ce, .48);
  scene.add(starsFar, starsNear);

  // A large planet with a hard cinematic terminator and thin atmosphere.
  const planetGroup = new THREE.Group();
  planetGroup.position.set(5.4, -.35, -4.6);
  scene.add(planetGroup);
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(2.45, 72, 72),
    new THREE.MeshStandardMaterial({ color: 0x243237, roughness: .95, metalness: 0, emissive: 0x040708, emissiveIntensity: .35 })
  );
  planetGroup.add(planet);
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(2.53, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x86c3cf, transparent: true, opacity: .055, side: THREE.BackSide, depthWrite: false })
  );
  planetGroup.add(atmosphere);
  const thinRing = new THREE.Mesh(
    new THREE.RingGeometry(3.05, 3.55, 128),
    new THREE.MeshBasicMaterial({ color: 0x9c8061, transparent: true, opacity: .08, side: THREE.DoubleSide, depthWrite: false })
  );
  thinRing.rotation.x = Math.PI * .57;
  thinRing.rotation.z = -.18;
  planetGroup.add(thinRing);

  const moon = new THREE.Mesh(new THREE.SphereGeometry(.24, 28, 28), new THREE.MeshStandardMaterial({ color: 0x7c8586, roughness: 1 }));
  moon.position.set(-3.5, 1.55, .2);
  planetGroup.add(moon);

  scene.add(new THREE.AmbientLight(0x304048, .72));
  const coldKey = new THREE.DirectionalLight(0xb7ebf3, 4.6);
  coldKey.position.set(-3, 4, 7);
  scene.add(coldKey);
  const sun = new THREE.PointLight(0xe0a55b, 7.5, 40, 2);
  sun.position.set(9, 2.5, 1);
  scene.add(sun);

  // Procedural frontier cruiser silhouette: original geometry, no franchise asset.
  const cruiser = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x66747a, metalness: .62, roughness: .38 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x141b1e, metalness: .7, roughness: .34 });
  const windowMat = new THREE.MeshBasicMaterial({ color: 0xd2b46d, transparent: true, opacity: .88 });
  const engineMat = new THREE.MeshBasicMaterial({ color: 0x9ad9e4, transparent: true, opacity: .86 });

  const spine = new THREE.Mesh(new THREE.CylinderGeometry(.3, .58, 5.2, 14), hullMat);
  spine.rotation.z = Math.PI / 2;
  cruiser.add(spine);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(.58, 1.75, 14), hullMat);
  bow.rotation.z = -Math.PI / 2;
  bow.position.x = 3.45;
  cruiser.add(bow);
  const command = new THREE.Mesh(new THREE.SphereGeometry(.66, 24, 16), darkMat);
  command.scale.set(1.45, .34, .82);
  command.position.set(.9, .5, 0);
  cruiser.add(command);
  const wingGeo = new THREE.BoxGeometry(2.7, .12, 3.7);
  const wing = new THREE.Mesh(wingGeo, darkMat);
  wing.position.x = -.45;
  wing.rotation.y = .08;
  cruiser.add(wing);
  [-1, 1].forEach(side => {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(.19, .24, 3.15, 12), darkMat);
    pod.rotation.z = Math.PI / 2;
    pod.position.set(-.6, .12, side * 2.02);
    cruiser.add(pod);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(.16, 18), engineMat.clone());
    glow.rotation.y = -Math.PI / 2;
    glow.position.set(-2.18, .12, side * 2.02);
    cruiser.add(glow);
  });
  for (let i = 0; i < 9; i++) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(.025, .035, .055), windowMat);
    w.position.set(-1.45 + i * .36, .34, .52);
    cruiser.add(w);
  }
  cruiser.scale.setScalar(.33);
  cruiser.position.set(-5.8, 1.3, 1.2);
  cruiser.rotation.set(.05, -.2, -.04);
  scene.add(cruiser);

  const pointer = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth - .5) * 2;
    pointer.y = (e.clientY / window.innerHeight - .5) * 2;
  }, { passive: true });

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });

  const clock = new THREE.Clock();
  function frame() {
    const t = clock.getElapsedTime();
    starsFar.rotation.y = t * .003;
    starsNear.rotation.y = -t * .006;
    planet.rotation.y = t * .025;
    thinRing.rotation.z = -.18 + Math.sin(t * .13) * .018;
    moon.position.x = Math.cos(t * .11) * 3.5;
    moon.position.z = Math.sin(t * .11) * 3.5;

    // The hero cruiser visibly traverses the shot like a film establishing pass.
    const pass = (t * .095) % 1;
    cruiser.position.x = -6.4 + pass * 12.8;
    cruiser.position.y = 1.35 - pass * .72 + Math.sin(t * .4) * .06;
    cruiser.position.z = 1.8 - pass * 3.6;
    cruiser.rotation.y = -.22 + pass * .16;

    camera.position.x += ((-1.2 + pointer.x * .23) - camera.position.x) * .018;
    camera.position.y += ((.55 - pointer.y * .16) - camera.position.y) * .018;
    camera.lookAt(.55, -.08, -3.1);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();
}

function initShipScene(THREE, OrbitControls) {
  const canvas = $("#shipCanvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.55));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07131d);
  scene.fog = new THREE.FogExp2(0x07131d, 0.012);
  const camera = new THREE.PerspectiveCamera(58, 1, .1, 240);
  camera.position.set(-9, 4.8, 0);

  scene.add(new THREE.HemisphereLight(0xa9d7e5, 0x263343, 2.4));
  const sun = new THREE.DirectionalLight(0xffe4b0, 5.8); sun.position.set(12, 14, 9); scene.add(sun);
  const rim = new THREE.DirectionalLight(0x79dfff, 4.5); rim.position.set(-8, 3, -10); scene.add(rim);

  // Dense, brighter starfield + colored nebula points.
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(1800 * 3);
  for (let i = 0; i < 1800; i++) {
    starPos[i*3] = (Math.random()-.5)*180;
    starPos[i*3+1] = (Math.random()-.5)*90;
    starPos[i*3+2] = (Math.random()-.5)*180;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos,3));
  const stars = new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xd9f3ff,size:.07,transparent:true,opacity:.78,depthWrite:false}));
  scene.add(stars);

  // Planetary landmarks make free flight readable and colorful.
  const planetMat = new THREE.MeshStandardMaterial({color:0x2d7ba0,roughness:.82,emissive:0x0e2737,emissiveIntensity:.8});
  const planet = new THREE.Mesh(new THREE.SphereGeometry(10,48,48),planetMat); planet.position.set(34,-12,-44); scene.add(planet);
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(10.4,36,36),new THREE.MeshBasicMaterial({color:0x8ee9ff,transparent:true,opacity:.08,side:THREE.BackSide})); atmosphere.position.copy(planet.position); scene.add(atmosphere);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(3.2,28,28),new THREE.MeshStandardMaterial({color:0xc7a979,roughness:.9})); moon.position.set(-32,12,-52); scene.add(moon);

  // Orbital station.
  const station = new THREE.Group(); station.position.set(0,0,-35); scene.add(station);
  const stationMat = new THREE.MeshStandardMaterial({color:0x526875,metalness:.75,roughness:.34});
  const stationRing = new THREE.Mesh(new THREE.TorusGeometry(8,.42,12,96),stationMat); stationRing.rotation.x=Math.PI/2; station.add(stationRing);
  const stationCore = new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.8,12,12),stationMat); station.add(stationCore);
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2; const lamp=new THREE.PointLight(i%2?0xffc46c:0x6bdfff,1.6,6); lamp.position.set(Math.cos(a)*8,0,Math.sin(a)*8); station.add(lamp);}

  // Original playable ship. Nose points +X.
  const ship = new THREE.Group(); scene.add(ship);
  const metal = new THREE.MeshStandardMaterial({color:0x92aab5,roughness:.25,metalness:.78});
  const dark = new THREE.MeshStandardMaterial({color:0x172b36,roughness:.33,metalness:.82,side:THREE.DoubleSide});
  const glass = new THREE.MeshStandardMaterial({color:0x7bdff4,emissive:0x175f74,emissiveIntensity:1.15,roughness:.07,metalness:.18,transparent:true,opacity:.82});
  const glowMat = new THREE.MeshBasicMaterial({color:0x9ef1ff,transparent:true,opacity:.9,depthWrite:false});
  const fuselage=new THREE.Mesh(new THREE.CylinderGeometry(.58,.78,5.2,18),metal); fuselage.rotation.z=Math.PI/2; ship.add(fuselage);
  const nose=new THREE.Mesh(new THREE.ConeGeometry(.77,1.7,18),metal); nose.rotation.z=-Math.PI/2; nose.position.x=3.42; ship.add(nose);
  const cockpit=new THREE.Mesh(new THREE.SphereGeometry(.85,28,18),glass); cockpit.scale.set(1.5,.38,.9); cockpit.position.set(.9,.68,0); ship.add(cockpit);
  function makeWing(side){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array([1.2,0,.35*side,-.8,-.08,.5*side,-2,-.12,3.1*side,.25,0,1.85*side]),3));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();return new THREE.Mesh(g,dark)}
  ship.add(makeWing(1),makeWing(-1));
  const enginePlumes=[];
  [-1,1].forEach(side=>{const pod=new THREE.Mesh(new THREE.CylinderGeometry(.22,.3,3.2,14),dark);pod.rotation.z=Math.PI/2;pod.position.set(-.8,0,side*2.3);ship.add(pod);const plume=new THREE.Mesh(new THREE.ConeGeometry(.2,1.8,14,1,true),glowMat.clone());plume.rotation.z=Math.PI/2;plume.position.set(-2.55,0,side*2.3);ship.add(plume);enginePlumes.push(plume)});
  ship.scale.setScalar(.72);

  // Mission entities.
  const checkpointGroup = new THREE.Group(); scene.add(checkpointGroup);
  const checkpoints=[];
  [[12,2,-10],[22,5,-24],[8,-3,-40],[-12,3,-48],[-24,8,-30],[-10,1,-12]].forEach((p,i)=>{const ring=new THREE.Mesh(new THREE.TorusGeometry(2.6,.15,8,48),new THREE.MeshBasicMaterial({color:i===0?0xffd47c:0x5fa7b8,transparent:true,opacity:i===0?.95:.3}));ring.position.set(...p);ring.rotation.y=Math.PI/2;ring.userData={index:i,done:false};checkpointGroup.add(ring);checkpoints.push(ring)});
  const salvage=[]; const salvageGroup=new THREE.Group(); scene.add(salvageGroup);
  [[18,-4,-18],[-18,4,-20],[25,8,-44],[-8,-7,-55],[-28,2,-42]].forEach((p,i)=>{const core=new THREE.Mesh(new THREE.OctahedronGeometry(.8,0),new THREE.MeshStandardMaterial({color:0xffcd76,emissive:0x8c4b0b,emissiveIntensity:1.5,metalness:.4,roughness:.25}));core.position.set(...p);core.userData={taken:false,index:i};salvageGroup.add(core);salvage.push(core)});
  const drones=[]; const droneGroup=new THREE.Group(); scene.add(droneGroup);
  [[15,6,-28],[-16,-2,-34],[28,-4,-48],[-24,7,-58]].forEach((p,i)=>{const d=new THREE.Group();const body=new THREE.Mesh(new THREE.SphereGeometry(.9,14,10),new THREE.MeshStandardMaterial({color:0x7c4e47,emissive:0x4b1713,emissiveIntensity:.9,metalness:.6,roughness:.35}));d.add(body);const r=new THREE.Mesh(new THREE.TorusGeometry(1.3,.08,6,28),new THREE.MeshBasicMaterial({color:0xff7f68}));r.rotation.x=Math.PI/2;d.add(r);d.position.set(...p);d.userData={alive:true,index:i,hp:2,base:new THREE.Vector3(...p)};droneGroup.add(d);drones.push(d)});
  const asteroidGroup=new THREE.Group();scene.add(asteroidGroup);const asteroidGeo=new THREE.DodecahedronGeometry(1,0);for(let i=0;i<45;i++){const a=new THREE.Mesh(asteroidGeo,new THREE.MeshStandardMaterial({color:0x53606a,roughness:1}));a.scale.setScalar(.5+Math.random()*2.2);a.position.set((Math.random()-.5)*90,(Math.random()-.5)*45,-10-Math.random()*90);a.rotation.set(Math.random()*3,Math.random()*3,Math.random()*3);asteroidGroup.add(a)}

  const projectiles=[];
  const keys=new Set(); let flightActive=false; let speed=0; let throttle=0; let energy=100; let hull=100; let boost=100; let fireCooldown=0; let scanCooldown=0;
  let currentMission='rings'; let missionCount=0; const missionTargets={rings:6,salvage:5,combat:4}; const missionNames={rings:'导航训练',salvage:'深空打捞',combat:'无人机拦截'}; const missionXP={rings:180,salvage:240,combat:320};
  const missionName=$("#missionName"),missionFill=$("#missionFill"),missionProgressText=$("#missionProgressText"),objectiveReadout=$("#objectiveReadout"),flightMessage=$("#flightMessage"),flightStart=$("#flightStart");
  const hullBar=$("#hullBar"),energyBar=$("#energyBar"),boostBar=$("#boostBar"),hullText=$("#hullText"),energyText=$("#energyText"),boostText=$("#boostText"),velocityReadout=$("#velocityReadout"),flightStatus=$("#flightStatus");

  function message(text){flightMessage.textContent=`舰载电脑：${text}`}
  function updateMissionUI(){const target=missionTargets[currentMission];missionName.textContent=missionNames[currentMission];missionProgressText.textContent=`${missionCount} / ${target}`;missionFill.style.width=`${clamp(missionCount/target*100,0,100)}%`;objectiveReadout.textContent=`${missionNames[currentMission]} · ${missionCount}/${target}`}
  function resetMissionVisuals(){checkpoints.forEach((r,i)=>{r.userData.done=false;r.visible=currentMission==='rings';r.material.opacity=i===0?.95:.3;r.material.color.set(i===0?0xffd47c:0x5fa7b8)});salvage.forEach(c=>{c.userData.taken=false;c.visible=currentMission==='salvage'});drones.forEach(d=>{d.userData.alive=true;d.userData.hp=2;d.visible=currentMission==='combat';d.position.copy(d.userData.base)});missionCount=0;updateMissionUI()}
  $$('.mission-card').forEach(card=>card.addEventListener('click',()=>{currentMission=card.dataset.mission;$$('.mission-card').forEach(c=>c.classList.toggle('active',c===card));resetMissionVisuals();message(`${missionNames[currentMission]} 已载入。`) }));
  resetMissionVisuals();

  function completeMission(){if(missionCount < missionTargets[currentMission]) return; const card=$(`.mission-card[data-mission="${currentMission}"]`);card.classList.add('done');card.querySelector('em').textContent='COMPLETE';if(!state.flightMissions.includes(currentMission)){state.flightMissions.push(currentMission);state.xp+=missionXP[currentMission];saveState();renderProgress();showToast(`任务完成 · ${missionNames[currentMission]}`,`+${missionXP[currentMission]} XP`)}message(`${missionNames[currentMission]} 完成。舰长，干得漂亮。`);playBeep(900,.16,.04);if(state.flightMissions.length>=3)unlockAchievement('ace',180)}

  function fire(){if(!flightActive||energy<6||fireCooldown>0)return;energy-=6;fireCooldown=.16;const bolt=new THREE.Mesh(new THREE.SphereGeometry(.09,8,8),new THREE.MeshBasicMaterial({color:0xffdf8d}));bolt.position.copy(ship.position);const dir=new THREE.Vector3(1,0,0).applyQuaternion(ship.quaternion).normalize();bolt.position.addScaledVector(dir,3);bolt.userData={velocity:dir.multiplyScalar(48),life:2};scene.add(bolt);projectiles.push(bolt);playBeep(420,.035,.012)}
  function scan(){if(!flightActive||scanCooldown>0)return;scanCooldown=2;message(currentMission==='salvage'?'扫描锁定：能量核心正在琥珀色闪烁。':currentMission==='combat'?'扫描锁定：敌对靶机已标红。':'扫描锁定：下一航行门已高亮。');playBeep(760,.12,.02)}

  function setKey(code,on){if(on)keys.add(code);else keys.delete(code);if(on&&code==='Space')fire();if(on&&code==='KeyR')scan()}
  window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&flightActive)e.preventDefault();setKey(e.code,true)});
  window.addEventListener('keyup',e=>setKey(e.code,false));
  $$('.touch-flight-controls [data-flight-key]').forEach(btn=>{const code=btn.dataset.flightKey;['pointerdown','touchstart'].forEach(ev=>btn.addEventListener(ev,e=>{e.preventDefault();setKey(code,true)}));['pointerup','pointercancel','pointerleave','touchend'].forEach(ev=>btn.addEventListener(ev,e=>{e.preventDefault();setKey(code,false)}))});

  flightStart.addEventListener('click',()=>{flightActive=!flightActive;flightStart.classList.toggle('running',flightActive);flightStart.textContent=flightActive?'暂停飞行':'继续飞行';flightStatus.textContent=flightActive?'MANUAL FLIGHT':'PAUSED';if(flightActive){unlockAchievement('flight',80);state.shipUsed=true;saveState();message('手动控制已移交。W 推力，A/D 转向，方向键俯仰。')}else message('飞行控制暂停。')});

  function resize(){const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix()}
  resize();window.addEventListener('resize',resize,{passive:true});

  const localForward=new THREE.Vector3(),localUp=new THREE.Vector3(),localRight=new THREE.Vector3(),tmp=new THREE.Vector3();
  const clock=new THREE.Clock();
  function animate(){
    const dt=Math.min(clock.getDelta(),.033),t=clock.elapsedTime; fireCooldown=Math.max(0,fireCooldown-dt);scanCooldown=Math.max(0,scanCooldown-dt);
    station.rotation.y+=dt*.08;stationRing.rotation.z+=dt*.03;planet.rotation.y+=dt*.012;moon.rotation.y-=dt*.02;stars.rotation.y+=dt*.0005;
    asteroidGroup.children.forEach((a,i)=>{a.rotation.x+=dt*(.04+i%3*.02);a.rotation.y+=dt*.05});
    salvage.forEach((c,i)=>{c.rotation.y+=dt*(.8+i*.06);c.rotation.x+=dt*.35});
    drones.forEach((d,i)=>{if(!d.userData.alive)return;d.rotation.y+=dt*.7;d.position.y=d.userData.base.y+Math.sin(t*1.1+i)*1.2;d.position.x=d.userData.base.x+Math.cos(t*.45+i)*1.5});

    if(flightActive){
      throttle += ((keys.has('KeyW')?1:keys.has('KeyS')?-0.45:0)-throttle)*dt*2.8;
      const boosting=(keys.has('ShiftLeft')||keys.has('ShiftRight'))&&boost>0&&throttle>.1;
      const targetSpeed=throttle*18+(boosting?24:0); speed+=(targetSpeed-speed)*dt*2.2;
      if(boosting)boost=Math.max(0,boost-dt*22);else boost=Math.min(100,boost+dt*9); energy=Math.min(100,energy+dt*7);
      const yaw=(keys.has('KeyA')?1:0)-(keys.has('KeyD')?1:0)+(keys.has('ArrowLeft')?1:0)-(keys.has('ArrowRight')?1:0);
      const pitch=(keys.has('ArrowDown')?1:0)-(keys.has('ArrowUp')?1:0);
      const roll=(keys.has('KeyQ')?1:0)-(keys.has('KeyE')?1:0);
      const dq=new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch*dt*1.15,yaw*dt*1.25,roll*dt*1.4,'XYZ'));ship.quaternion.multiply(dq).normalize();
      localForward.set(1,0,0).applyQuaternion(ship.quaternion).normalize();ship.position.addScaledVector(localForward,speed*dt);
      // soft world wrap so player can never get lost forever
      ['x','y','z'].forEach(axis=>{if(ship.position[axis]>78)ship.position[axis]=-78;if(ship.position[axis]<-78)ship.position[axis]=78});
      if(keys.has('Space'))fire(); if(keys.has('KeyR'))scan();
    } else { speed*=.94; }

    // mission interactions
    if(currentMission==='rings')checkpoints.forEach((r,i)=>{if(r.userData.done)return;r.lookAt(ship.position);if(ship.position.distanceTo(r.position)<3.1){r.userData.done=true;r.material.color.set(0x7ae6a1);r.material.opacity=.2;missionCount++;if(i+1<checkpoints.length){checkpoints[i+1].material.color.set(0xffd47c);checkpoints[i+1].material.opacity=.95}updateMissionUI();message(`航行门 ${missionCount}/${checkpoints.length} 通过。`);playBeep(680,.08,.02);completeMission()}});
    if(currentMission==='salvage')salvage.forEach(c=>{if(c.userData.taken)return;if(ship.position.distanceTo(c.position)<2.4){c.userData.taken=true;c.visible=false;missionCount++;state.flightSalvage=(state.flightSalvage||0)+1;updateMissionUI();message(`能量核心已回收 ${missionCount}/5。`);playBeep(840,.09,.02);completeMission()}});

    projectiles.forEach((b,i)=>{b.position.addScaledVector(b.userData.velocity,dt);b.userData.life-=dt;if(currentMission==='combat')drones.forEach(d=>{if(!d.userData.alive)return;if(b.position.distanceTo(d.position)<1.25){d.userData.hp-=1;b.userData.life=0;if(d.userData.hp<=0){d.userData.alive=false;d.visible=false;missionCount++;state.flightKills=(state.flightKills||0)+1;updateMissionUI();message(`靶机击毁 ${missionCount}/4。`);completeMission()}playBeep(150,.06,.02)}});if(b.userData.life<=0){scene.remove(b);projectiles.splice(i,1)}});

    // Camera chase: because ship nose is +X, camera sits behind local -X and slightly above.
    localForward.set(1,0,0).applyQuaternion(ship.quaternion).normalize();localUp.set(0,1,0).applyQuaternion(ship.quaternion).normalize();localRight.set(0,0,1).applyQuaternion(ship.quaternion).normalize();
    const camWanted=ship.position.clone().addScaledVector(localForward,-9.5).addScaledVector(localUp,3.6).addScaledVector(localRight,0.4);camera.position.lerp(camWanted,flightActive?.095:.045);tmp.copy(ship.position).addScaledVector(localForward,8);camera.lookAt(tmp);
    const plumeScale=1+Math.abs(speed)*.08+(keys.has('ShiftLeft')?1.6:0);enginePlumes.forEach(p=>{p.scale.x=plumeScale;p.material.opacity=.35+Math.min(1,Math.abs(speed)/22)*.6});

    hullBar.style.width=`${hull}%`;energyBar.style.width=`${energy}%`;boostBar.style.width=`${boost}%`;hullText.textContent=`${Math.round(hull)}%`;energyText.textContent=`${Math.round(energy)}%`;boostText.textContent=`${Math.round(boost)}%`;velocityReadout.textContent=String(Math.round(Math.abs(speed)*68)).padStart(3,'0');
    renderer.render(scene,camera);requestAnimationFrame(animate)
  }
  animate();

  shipAPI={setMode(){},scanPulse(){scan();},start(){flightActive=true}};
}

// ---------- boot ----------
renderProgress();
if (!state.achievements.includes("arrival")) unlockAchievement("arrival", 50, true);
renderProgress();
setTimeout(() => {
  if (state.xp === 50 && state.achievements.length === 1) showToast("入园许可已激活", "+50 XP · 现在去做点不那么安全的事。" );
}, 900);
initThreeScenes();
