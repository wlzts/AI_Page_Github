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
});

let state;
try {
  state = { ...freshState(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  if (!Array.isArray(state.achievements)) state.achievements = [];
  if (!Array.isArray(state.secretFragments)) state.secretFragments = [];
} catch {
  state = freshState();
}

const achievements = [
  { id: "arrival", icon: "✦", name: "入园许可", desc: "成功进入 NOVA PARK" },
  { id: "energy", icon: "⚡", name: "别碰那个", desc: "无视警告释放一次能量" },
  { id: "identity", icon: "◇", name: "新身份已加载", desc: "生成一个未来称号" },
  { id: "arcade", icon: "⌁", name: "神经同步", desc: "完成一次随机小游戏" },
  { id: "chat", icon: "◎", name: "机器人朋友？", desc: "和 NOVA-7 对话" },
  { id: "pilot", icon: "△", name: "临时驾驶员", desc: "启动星舰巡航或跃迁" },
  { id: "music", icon: "♫", name: "耳机模式", desc: "启动园区科幻音乐" },
  { id: "secret", icon: "◉", name: "地图之外", desc: "发现幽灵星球 MIRA" },
];

const rankTable = [
  { xp: 0, name: "初来乍到的碳基游客" },
  { xp: 200, name: "量子通行证持有者" },
  { xp: 500, name: "霓虹街区常驻玩家" },
  { xp: 900, name: "轨道级麻烦制造者" },
  { xp: 1400, name: "星舰临时指挥官" },
  { xp: 2100, name: "NOVA PARK 传奇游客" },
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

// ---------- Random mini games ----------
let gameBusy = false;
let cleanupGame = () => {};
let lastGame = "";

els.gameLaunch.addEventListener("click", () => {
  if (gameBusy) return;
  cleanupGame();
  const options = ["reaction", "memory", "charge"].filter((g) => g !== lastGame);
  const type = options[Math.floor(Math.random() * options.length)];
  lastGame = type;
  if (type === "reaction") startReactionGame();
  if (type === "memory") startMemoryGame();
  if (type === "charge") startChargeGame();
});

function setGameBusy(value) {
  gameBusy = value;
  els.gameLaunch.disabled = value;
  els.gameLaunch.textContent = value ? "挑战进行中…" : "生成下一项随机挑战";
}

function finishGame(score, message, xp = 60) {
  setGameBusy(false);
  state.bestGame = Math.max(state.bestGame, score);
  state.gameWins += 1;
  state.xp += xp;
  saveState();
  renderProgress();
  unlockAchievement("arcade", 80);
  els.gameStage.innerHTML = `
    <div class="game-result">
      <span class="kicker">MISSION COMPLETE</span>
      <div class="result-score">${String(score).padStart(4, "0")}</div>
      <p>${message}</p>
    </div>`;
  els.gameStage.classList.add("flash-success");
  setTimeout(() => els.gameStage.classList.remove("flash-success"), 400);
  playBeep(720, 0.13, 0.035);
}

function failGame(message) {
  setGameBusy(false);
  els.gameStage.innerHTML = `
    <div class="game-result">
      <span class="kicker">SYSTEM SHRUGGED</span>
      <div class="result-score">0000</div>
      <p>${message}</p>
    </div>`;
  playBeep(170, 0.16, 0.03);
}

function startReactionGame() {
  setGameBusy(true);
  els.gameType.textContent = "RANDOM / 神经反应测试";
  els.gameStage.innerHTML = `
    <div class="game-instruction">等待核心变成绿色后立刻点击。提前按会被系统无情记录。</div>
    <button class="reaction-pad" type="button">STANDBY</button>`;
  const pad = $(".reaction-pad", els.gameStage);
  let ready = false;
  let startTime = 0;
  let ended = false;
  const timer = setTimeout(() => {
    if (ended) return;
    ready = true;
    startTime = performance.now();
    pad.classList.add("ready");
    pad.textContent = "NOW";
    playBeep(510, 0.05, 0.02);
  }, 1300 + Math.random() * 2200);

  pad.addEventListener("click", () => {
    if (ended) return;
    ended = true;
    clearTimeout(timer);
    if (!ready) {
      failGame("抢跑。NOVA-7 已经把这次操作命名为“充满自信的误判”。");
      return;
    }
    const reaction = Math.round(performance.now() - startTime);
    const score = clamp(Math.round(1600 - reaction * 1.8), 100, 1500);
    finishGame(score, `反应时间 ${reaction} ms。${reaction < 260 ? "非常快，机器开始有点紧张了。" : reaction < 420 ? "不错，仍在星舰保险承保范围内。" : "成功就好，我们不问神经延迟。"}`, reaction < 420 ? 110 : 70);
  });
  cleanupGame = () => { ended = true; clearTimeout(timer); };
}

async function startMemoryGame() {
  setGameBusy(true);
  els.gameType.textContent = "RANDOM / 脉冲记忆阵列";
  els.gameStage.innerHTML = `
    <div class="game-instruction">记住发光顺序，然后按相同顺序点击四个面板。</div>
    <div class="memory-board">
      <button class="memory-cell" data-cell="0" aria-label="脉冲 1"></button>
      <button class="memory-cell" data-cell="1" aria-label="脉冲 2"></button>
      <button class="memory-cell" data-cell="2" aria-label="脉冲 3"></button>
      <button class="memory-cell" data-cell="3" aria-label="脉冲 4"></button>
    </div>`;
  const cells = $$(".memory-cell", els.gameStage);
  const sequence = Array.from({ length: 5 }, () => Math.floor(Math.random() * 4));
  let accepting = false;
  let cursor = 0;
  let cancelled = false;
  cleanupGame = () => { cancelled = true; };

  await sleep(650);
  for (const index of sequence) {
    if (cancelled) return;
    cells[index].classList.add("active");
    playBeep(300 + index * 90, 0.07, 0.015);
    await sleep(320);
    cells[index].classList.remove("active");
    await sleep(160);
  }
  accepting = true;
  $(".game-instruction", els.gameStage).textContent = "轮到你了。按刚才的顺序复现脉冲。";

  cells.forEach((cell, index) => {
    cell.addEventListener("click", async () => {
      if (!accepting || cancelled) return;
      cell.classList.add("active");
      setTimeout(() => cell.classList.remove("active"), 110);
      playBeep(300 + index * 90, 0.05, 0.015);
      if (index !== sequence[cursor]) {
        accepting = false;
        failGame(`第 ${cursor + 1} 个脉冲错了。别担心，宇宙也经常忘记自己把钥匙放哪。`);
        return;
      }
      cursor += 1;
      if (cursor === sequence.length) {
        accepting = false;
        finishGame(1250, "五段脉冲全部复现成功。短期记忆模块：比园区售票系统可靠。", 130);
      }
    });
  });
}

function startChargeGame() {
  setGameBusy(true);
  els.gameType.textContent = "RANDOM / 量子核心充能";
  const target = 18;
  const totalTime = 5200;
  let clicks = 0;
  let ended = false;
  const start = performance.now();
  els.gameStage.innerHTML = `
    <div class="game-instruction">5 秒内连续点击核心 ${target} 次。非常先进的科技，非常原始的操作。</div>
    <div class="charge-wrap">
      <button class="charge-core" type="button"><strong>0/${target}</strong></button>
      <div class="charge-meter"><i></i></div>
    </div>`;
  const core = $(".charge-core", els.gameStage);
  const count = $(".charge-core strong", els.gameStage);
  const meter = $(".charge-meter i", els.gameStage);

  const timeout = setTimeout(() => {
    if (ended) return;
    ended = true;
    failGame(`时间到：${clicks}/${target}。核心评价：“有参与感。”`);
  }, totalTime);

  core.addEventListener("click", () => {
    if (ended) return;
    clicks += 1;
    count.textContent = `${clicks}/${target}`;
    meter.style.width = `${clamp(clicks / target * 100, 0, 100)}%`;
    core.animate([{ transform: "scale(1)" }, { transform: "scale(.94)" }, { transform: "scale(1)" }], { duration: 120 });
    playBeep(210 + clicks * 12, 0.035, 0.01);
    if (clicks >= target) {
      ended = true;
      clearTimeout(timeout);
      const elapsed = performance.now() - start;
      const score = clamp(Math.round(1700 - elapsed * .15), 500, 1500);
      finishGame(score, `核心在 ${(elapsed / 1000).toFixed(2)} 秒内完成充能。维修部门已经开始关注你。`, 120);
    }
  });
  cleanupGame = () => { ended = true; clearTimeout(timeout); };
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
  showToast("本机进度已重置", "NOVA PARK 假装从未见过你。" );
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070f, 0.033);
  const camera = new THREE.PerspectiveCamera(56, 1, 0.1, 80);
  camera.position.set(0, 0.4, 8.5);

  const starCount = window.innerWidth < 700 ? 900 : 1900;
  const starGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    const radius = 9 + Math.random() * 38;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
    sizes[i] = Math.random();
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  starGeo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  const starMat = new THREE.PointsMaterial({ color: 0xaedcff, size: 0.032, transparent: true, opacity: 0.82, sizeAttenuation: true });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  const planetGroup = new THREE.Group();
  planetGroup.position.set(3.9, -0.15, -1.6);
  scene.add(planetGroup);
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(1.65, 64, 64),
    new THREE.MeshStandardMaterial({ color: 0x314281, roughness: 0.74, metalness: 0.12, emissive: 0x0a1230, emissiveIntensity: 1.2 })
  );
  planetGroup.add(planet);
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.73, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x6ff7ff, transparent: true, opacity: 0.055, side: THREE.BackSide })
  );
  planetGroup.add(atmosphere);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 3.0, 96),
    new THREE.MeshBasicMaterial({ color: 0x8e78c8, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
  );
  ring.rotation.x = Math.PI * 0.58;
  ring.rotation.z = 0.18;
  planetGroup.add(ring);

  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 24), new THREE.MeshStandardMaterial({ color: 0xb4c1da, roughness: 0.8 }));
  moon.position.set(-2.7, 1.2, 0.5);
  planetGroup.add(moon);

  scene.add(new THREE.AmbientLight(0x58648f, 1.15));
  const cyanLight = new THREE.PointLight(0x6ff7ff, 9, 18, 2);
  cyanLight.position.set(6, 3, 5);
  scene.add(cyanLight);
  const pinkLight = new THREE.PointLight(0xff6bd6, 5, 14, 2);
  pinkLight.position.set(-5, -3, 3);
  scene.add(pinkLight);

  // small procedural shuttle passing through hero
  const shuttle = new THREE.Group();
  shuttle.position.set(-4.5, 1.4, 1.4);
  const hull = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.95, 10), new THREE.MeshStandardMaterial({ color: 0xc8d5ea, metalness: .7, roughness: .25 }));
  hull.rotation.z = -Math.PI / 2;
  shuttle.add(hull);
  const trail = new THREE.PointLight(0x6ff7ff, 2.5, 2.2, 2);
  trail.position.x = -0.5;
  shuttle.add(trail);
  scene.add(shuttle);

  const pointer = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
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
    stars.rotation.y = t * 0.006;
    stars.rotation.x = Math.sin(t * 0.07) * 0.03;
    planet.rotation.y = t * 0.055;
    ring.rotation.z = 0.18 + Math.sin(t * 0.18) * 0.05;
    moon.position.x = Math.cos(t * .2) * 2.9;
    moon.position.z = Math.sin(t * .2) * 2.9;
    shuttle.position.x = ((t * .45) % 10) - 5;
    shuttle.position.y = 1.2 + Math.sin(t * .7) * .25;
    camera.position.x += (pointer.x * .18 - camera.position.x) * .025;
    camera.position.y += ((-.1 - pointer.y * .12) - camera.position.y) * .025;
    camera.lookAt(0.7, 0, -1.8);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();
}

function initShipScene(THREE, OrbitControls) {
  const canvas = $("#shipCanvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030611);
  scene.fog = new THREE.Fog(0x030611, 12, 31);
  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 80);
  camera.position.set(5.6, 2.7, 7.4);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = .055;
  controls.enablePan = false;
  controls.minDistance = 4.5;
  controls.maxDistance = 12;
  controls.target.set(0, .1, 0);

  scene.add(new THREE.HemisphereLight(0x8aaaff, 0x120d2b, 2.2));
  const key = new THREE.DirectionalLight(0x9eefff, 7);
  key.position.set(4, 5, 6);
  scene.add(key);
  const rim = new THREE.PointLight(0xff6bd6, 18, 12, 2);
  rim.position.set(-4, .5, -3);
  scene.add(rim);

  const dock = new THREE.GridHelper(22, 22, 0x244d66, 0x101d2d);
  dock.position.y = -1.8;
  scene.add(dock);
  const dockRing = new THREE.Mesh(new THREE.TorusGeometry(3.4, .025, 8, 100), new THREE.MeshBasicMaterial({ color: 0x36566d, transparent: true, opacity: .8 }));
  dockRing.rotation.x = Math.PI / 2;
  dockRing.position.y = -1.76;
  scene.add(dockRing);

  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(600 * 3);
  for (let i = 0; i < 600; i++) {
    starPos[i * 3] = (Math.random() - .5) * 30;
    starPos[i * 3 + 1] = Math.random() * 13 - 1;
    starPos[i * 3 + 2] = (Math.random() - .5) * 30;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x84bddd, size: .025, opacity: .65, transparent: true })));

  const ship = new THREE.Group();
  scene.add(ship);
  const metal = new THREE.MeshStandardMaterial({ color: 0x8da3b7, roughness: .28, metalness: .82 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x172034, roughness: .32, metalness: .78, side: THREE.DoubleSide });
  const glass = new THREE.MeshStandardMaterial({ color: 0x6ff7ff, emissive: 0x126675, emissiveIntensity: 1.1, roughness: .12, metalness: .25, transparent: true, opacity: .82 });
  const hot = new THREE.MeshBasicMaterial({ color: 0x8cfaff, transparent: true, opacity: .9 });

  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(.62, .36, 3.8, 16), metal);
  fuselage.rotation.z = Math.PI / 2;
  ship.add(fuselage);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(.61, 1.45, 16), metal);
  nose.rotation.z = -Math.PI / 2;
  nose.position.x = 2.62;
  ship.add(nose);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(.34, .56, 1.15, 14), darkMetal);
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -2.36;
  ship.add(tail);
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(.58, 24, 18), glass);
  cockpit.scale.set(1.1, .52, .78);
  cockpit.position.set(.7, .46, 0);
  ship.add(cockpit);

  function wing(side = 1) {
    const geo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      .9, 0, .28 * side,
      -.7, -.08, .38 * side,
      -1.55, -.15, 2.4 * side,
      .25, -.05, 1.3 * side,
    ]);
    geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geo.setIndex([0,1,2,0,2,3]);
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, darkMetal);
  }
  ship.add(wing(1), wing(-1));

  [-.31, .31].forEach((z) => {
    const engine = new THREE.Mesh(new THREE.CylinderGeometry(.21, .25, .9, 12), darkMetal);
    engine.rotation.z = Math.PI / 2;
    engine.position.set(-2.42, -.05, z);
    ship.add(engine);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(.17, 20), hot.clone());
    glow.rotation.y = -Math.PI / 2;
    glow.position.set(-2.9, -.05, z);
    glow.userData.thruster = true;
    ship.add(glow);
  });

  const fin = new THREE.Mesh(new THREE.BoxGeometry(1.0, .95, .08), darkMetal);
  fin.position.set(-1.55, .52, 0);
  fin.rotation.z = -.32;
  ship.add(fin);
  ship.rotation.y = -.35;
  ship.rotation.z = .04;

  // holographic scan planet
  const scanGroup = new THREE.Group();
  scanGroup.position.set(-5.4, 1.9, -4.2);
  const scanPlanet = new THREE.Mesh(new THREE.SphereGeometry(.55, 24, 24), new THREE.MeshBasicMaterial({ color: 0xff6bd6, wireframe: true, transparent: true, opacity: .17 }));
  scanGroup.add(scanPlanet);
  const scanRing = new THREE.Mesh(new THREE.TorusGeometry(.92, .015, 6, 60), new THREE.MeshBasicMaterial({ color: 0xff6bd6, transparent: true, opacity: .28 }));
  scanRing.rotation.x = 1.1;
  scanGroup.add(scanRing);
  scene.add(scanGroup);

  let mode = "display";
  let velocity = 0;
  let scanBoost = 0;
  const velocityReadout = $("#velocityReadout");
  const modeReadout = $("#shipModeReadout");

  shipAPI = {
    setMode(next) {
      mode = next;
      modeReadout.textContent = `MODE · ${next.toUpperCase()}`;
      if (next === "boost") playBeep(95, .25, .05);
    },
    scanPulse() {
      scanBoost = 1;
    }
  };

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
  function animate() {
    const dt = Math.min(clock.getDelta(), .04);
    const t = clock.elapsedTime;
    controls.update();

    let targetVelocity = 0;
    if (mode === "display") {
      ship.rotation.y += (.18 * Math.sin(t * .22) - ship.rotation.y) * .012;
      ship.position.y += (Math.sin(t * .9) * .08 - ship.position.y) * .035;
      targetVelocity = 0;
    } else if (mode === "orbit") {
      ship.rotation.y += dt * .38;
      ship.position.y += (Math.sin(t * 1.4) * .16 - ship.position.y) * .05;
      targetVelocity = 46;
    } else if (mode === "boost") {
      ship.rotation.y += dt * .65;
      ship.rotation.z = Math.sin(t * 1.7) * .09;
      ship.position.y += (Math.sin(t * 2.4) * .22 - ship.position.y) * .08;
      targetVelocity = 820;
    }
    velocity += (targetVelocity - velocity) * .04;
    velocityReadout.textContent = `${String(Math.round(velocity)).padStart(3, "0")} km/s`;
    ship.children.filter((c) => c.userData?.thruster).forEach((thruster) => {
      thruster.material.opacity = mode === "boost" ? .95 : mode === "orbit" ? .7 : .45;
      const scale = mode === "boost" ? 1.65 + Math.sin(t * 16) * .25 : 1 + Math.sin(t * 8) * .08;
      thruster.scale.setScalar(scale);
    });

    scanGroup.rotation.y += dt * .25;
    scanPlanet.rotation.y -= dt * .4;
    scanRing.rotation.z += dt * .35;
    scanBoost = Math.max(0, scanBoost - dt * .45);
    scanGroup.scale.setScalar(1 + scanBoost * .38);
    scanPlanet.material.opacity = .17 + scanBoost * .45;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
}

// ---------- boot ----------
renderProgress();
if (!state.achievements.includes("arrival")) unlockAchievement("arrival", 50, true);
renderProgress();
setTimeout(() => {
  if (state.xp === 50 && state.achievements.length === 1) showToast("入园许可已激活", "+50 XP · 现在去做点不那么安全的事。" );
}, 900);
initThreeScenes();
