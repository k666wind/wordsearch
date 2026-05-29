// ============================================================
// APP STATE
// ============================================================
const App = {
  screen:     "home",     // home | setup | game | result | leaderboard
  difficulty: "easy",
  gridSize:   10,
  timerMode:  "countdown", // countdown | stopwatch
  wordSource: "builtin",   // builtin | custom
  grade:      "grade1",
  topic:      null,
  customWords:[],
  words:      [],
  engine:     null,
  score:      null,
  timeElapsed:0,
  timerInterval: null,
  foundWords: new Set(),
  selection:  [],          // [{r,c}] current drag
  isDragging: false,
  playerName: "",
};

// ============================================================
// NAVIGATION
// ============================================================
function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const el = document.getElementById(`screen-${name}`);
  if (el) { el.classList.add("active"); App.screen = name; }
}

// ============================================================
// SETUP SCREEN
// ============================================================
function initSetup() {
  showScreen("setup");
  renderGradeTopics();
  updateDifficultyUI();
  updateTimerModeUI();
  updateGridSizeUI();
  updateSourceUI();
}

function renderGradeTopics() {
  const gradeEl  = document.getElementById("grade-select");
  const topicEl  = document.getElementById("topic-select");
  gradeEl.innerHTML  = Object.entries(WORD_DATA).map(([k, v]) =>
    `<option value="${k}">${v.emoji} ${v.label}</option>`).join("");
  gradeEl.value = App.grade;
  refreshTopics();
}

function refreshTopics() {
  const topicEl = document.getElementById("topic-select");
  const topics  = Object.keys(WORD_DATA[App.grade].topics);
  topicEl.innerHTML = topics.map(t => `<option value="${t}">${t}</option>`).join("");
  App.topic = topics[0];
  topicEl.value = App.topic;
}

function updateDifficultyUI() {
  document.querySelectorAll(".diff-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.diff === App.difficulty);
  });
  // All difficulties now share the same 4 grid sizes
  const sizes = [8, 10, 12, 15];
  const sizeEl = document.getElementById("grid-size-select");
  const prev   = App.gridSize;
  sizeEl.innerHTML = sizes.map(s => `<option value="${s}">${s}×${s}</option>`).join("");
  // Keep previous selection if valid, else default to 10
  App.gridSize = sizes.includes(prev) ? prev : 10;
  sizeEl.value = App.gridSize;
  // Show word count hint
  const wc = DIFFICULTY[App.difficulty].wordCount;
  const hint = document.getElementById("word-count-hint");
  if (hint) hint.textContent = `🎯 ${wc} words will be picked randomly`;
}

function updateTimerModeUI() {
  document.querySelectorAll(".timer-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.timer === App.timerMode);
  });
}

function updateGridSizeUI() {
  const sizeEl = document.getElementById("grid-size-select");
  if (sizeEl) App.gridSize = parseInt(sizeEl.value);
}

function updateSourceUI() {
  document.getElementById("builtin-panel").style.display = App.wordSource === "builtin" ? "" : "none";
  document.getElementById("custom-panel").style.display  = App.wordSource === "custom"  ? "" : "none";
  document.querySelectorAll(".source-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.source === App.wordSource);
  });
}

// ============================================================
// GAME START
// ============================================================
function randomPick(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

function startGame() {
  const maxWords = DIFFICULTY[App.difficulty].wordCount;
  const maxLen   = App.gridSize;

  // Gather words
  if (App.wordSource === "builtin") {
    const pool = WORD_DATA[App.grade].topics[App.topic]
      .map(w => w.toUpperCase())
      .filter(w => w.length <= maxLen);
    App.words = randomPick(pool, maxWords);
  } else {
    const raw = document.getElementById("custom-input").value;
    const pool = raw.split(/[\n,]+/)
      .map(w => w.trim().toUpperCase())
      .filter(w => w.length >= 2 && w.length <= maxLen && /^[A-Z]+$/.test(w));
    if (pool.length < 3) { alert("Please enter at least 3 valid words (letters only)."); return; }
    App.words = randomPick(pool, maxWords);
  }

  // Build engine
  App.engine     = new WordSearchEngine(App.words, App.gridSize, App.difficulty);
  App.score      = new ScoreSystem(App.difficulty, DIFFICULTY[App.difficulty].timeLimit);
  App.foundWords = new Set();
  App.timeElapsed = 0;
  App.selection  = [];

  showScreen("game");
  renderGrid();
  renderWordList();
  startTimer();
  updateScoreDisplay();
}

// ============================================================
// GRID RENDERING
// ============================================================
function renderGrid() {
  const container = document.getElementById("grid-container");
  const grid = App.engine.grid;
  const size = App.gridSize;

  container.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  container.innerHTML = "";

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = document.createElement("div");
      cell.className = "grid-cell";
      cell.textContent = grid[r][c];
      cell.dataset.r = r;
      cell.dataset.c = c;
      container.appendChild(cell);
    }
  }

  // Touch / Mouse events
  container.addEventListener("mousedown",  onDragStart);
  container.addEventListener("mouseover",  onDragMove);
  container.addEventListener("mouseup",    onDragEnd);
  container.addEventListener("touchstart", onTouchStart, { passive: false });
  container.addEventListener("touchmove",  onTouchMove,  { passive: false });
  container.addEventListener("touchend",   onDragEnd);
}

function cellAt(r, c) {
  return document.querySelector(`.grid-cell[data-r="${r}"][data-c="${c}"]`);
}

function highlightSelection(cells, cls = "selecting") {
  cells.forEach(({ r, c }) => cellAt(r, c)?.classList.add(cls));
}

function clearSelectionHighlight() {
  document.querySelectorAll(".grid-cell.selecting").forEach(el => el.classList.remove("selecting"));
}

function markFound(cells, colorIdx) {
  const colors = ["found-1","found-2","found-3","found-4","found-5","found-6","found-7","found-8"];
  const cls = colors[colorIdx % colors.length];
  cells.forEach(({ r, c }) => {
    const el = cellAt(r, c);
    el?.classList.remove("selecting");
    el?.classList.add("found", cls);
  });
}

// ============================================================
// DRAG / SELECTION LOGIC
// ============================================================
function getCell(el) {
  const t = el.closest(".grid-cell");
  if (!t) return null;
  return { r: parseInt(t.dataset.r), c: parseInt(t.dataset.c) };
}

function buildLine(start, end) {
  const dr = end.r - start.r, dc = end.c - start.c;
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  if (steps === 0) return [start];
  // Only allow 8 directions
  const okDR = dr === 0 ? 0 : dr / Math.abs(dr);
  const okDC = dc === 0 ? 0 : dc / Math.abs(dc);
  if (Math.abs(dr) !== Math.abs(dc) && dr !== 0 && dc !== 0) return [start];
  const cells = [];
  for (let i = 0; i <= steps; i++) cells.push({ r: start.r + okDR * i, c: start.c + okDC * i });
  return cells;
}

function onDragStart(e) {
  if (e.button !== 0) return;
  const cell = getCell(e.target);
  if (!cell) return;
  App.isDragging = true;
  App.selection  = [cell];
  clearSelectionHighlight();
  highlightSelection(App.selection);
}

function onDragMove(e) {
  if (!App.isDragging) return;
  const cell = getCell(e.target);
  if (!cell) return;
  clearSelectionHighlight();
  App.selection = buildLine(App.selection[0], cell);
  highlightSelection(App.selection);
}

function onTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const el    = document.elementFromPoint(touch.clientX, touch.clientY);
  const cell  = getCell(el);
  if (!cell) return;
  App.isDragging = true;
  App.selection  = [cell];
  clearSelectionHighlight();
  highlightSelection(App.selection);
}

function onTouchMove(e) {
  e.preventDefault();
  if (!App.isDragging) return;
  const touch = e.touches[0];
  const el    = document.elementFromPoint(touch.clientX, touch.clientY);
  const cell  = getCell(el);
  if (!cell) return;
  clearSelectionHighlight();
  App.selection = buildLine(App.selection[0], cell);
  highlightSelection(App.selection);
}

function onDragEnd(e) {
  if (!App.isDragging) return;
  App.isDragging = false;
  checkSelection();
  clearSelectionHighlight();
  App.selection = [];
}

function checkSelection() {
  const selected = App.selection.map(({ r, c }) => App.engine.grid[r][c]).join("");
  const reversed = selected.split("").reverse().join("");

  for (const word of App.engine.getAllWords()) {
    if (App.foundWords.has(word)) continue;
    if (word === selected || word === reversed) {
      const colorIdx = App.foundWords.size;
      App.foundWords.add(word);
      markFound(App.engine.getWordCells(word), colorIdx);
      const pts = App.score.addWord(App.timeElapsed, word.length);
      updateScoreDisplay();
      markWordFound(word, pts);
      celebrateWord();
      if (App.foundWords.size === App.engine.getAllWords().length) {
        setTimeout(endGame, 600);
      }
      return;
    }
  }
}

// ============================================================
// WORD LIST
// ============================================================
function renderWordList() {
  const el = document.getElementById("word-list");
  el.innerHTML = App.engine.getAllWords().map(w =>
    `<span class="word-chip" id="chip-${w}">${w}</span>`
  ).join("");
}

function markWordFound(word, pts) {
  const chip = document.getElementById(`chip-${word}`);
  if (chip) {
    chip.classList.add("found");
    chip.innerHTML = `${word} <span class="pts">+${pts}</span>`;
  }
}

// ============================================================
// TIMER
// ============================================================
function startTimer() {
  clearInterval(App.timerInterval);
  App.timeElapsed = 0;
  const isCountdown = App.timerMode === "countdown";
  const limit = DIFFICULTY[App.difficulty].timeLimit;

  App.timerInterval = setInterval(() => {
    App.timeElapsed++;
    const display = isCountdown ? Math.max(0, limit - App.timeElapsed) : App.timeElapsed;
    document.getElementById("timer-display").textContent = formatTime(display);
    if (isCountdown && App.timeElapsed >= limit) {
      clearInterval(App.timerInterval);
      endGame(true);
    }
  }, 1000);

  const init = isCountdown ? limit : 0;
  document.getElementById("timer-display").textContent = formatTime(init);
}

function formatTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

function stopTimer() { clearInterval(App.timerInterval); }

// ============================================================
// SCORE DISPLAY
// ============================================================
function updateScoreDisplay() {
  document.getElementById("score-display").textContent = App.score.total;
  document.getElementById("found-count").textContent   =
    `${App.foundWords.size} / ${App.engine.getAllWords().length}`;
}

// ============================================================
// CELEBRATION
// ============================================================
function celebrateWord() {
  const el = document.getElementById("celebrate");
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 900);
}

// ============================================================
// END GAME
// ============================================================
function endGame(timeout = false) {
  stopTimer();
  const total   = App.engine.getAllWords().length;
  const found   = App.foundWords.size;
  const final   = App.score.finalScore(App.timeElapsed, total, found);
  App.lastScore = { final, found, total, time: App.timeElapsed, timeout };

  // Show result
  showScreen("result");
  document.getElementById("result-found").textContent = `${found} / ${total}`;
  document.getElementById("result-time").textContent  = formatTime(App.timeElapsed);
  document.getElementById("result-score").textContent = final;
  document.getElementById("result-diff").textContent  = DIFFICULTY[App.difficulty].label;
  document.getElementById("result-timeout").style.display = timeout ? "" : "none";

  const missing = App.engine.getAllWords().filter(w => !App.foundWords.has(w));
  const missEl  = document.getElementById("result-missed");
  if (missing.length) {
    missEl.innerHTML = "<strong>Missed:</strong> " + missing.map(w => `<span class="word-chip">${w}</span>`).join("");
    missEl.style.display = "";
  } else {
    missEl.style.display = "none";
  }
}

function submitScore() {
  const name = document.getElementById("player-name").value.trim() || "Player";
  const entry = {
    name,
    score:      App.lastScore.final,
    found:      App.lastScore.found,
    total:      App.lastScore.total,
    time:       App.lastScore.time,
    difficulty: App.difficulty,
    topic:      App.wordSource === "builtin" ? `${WORD_DATA[App.grade].label} — ${App.topic}` : "Custom",
    date:       new Date().toLocaleDateString()
  };
  const rank = Leaderboard.add(entry);
  document.getElementById("rank-badge").textContent = `🏆 Rank #${rank}`;
  document.getElementById("rank-badge").style.display = "";
  document.getElementById("submit-score-btn").disabled = true;
}

// ============================================================
// LEADERBOARD SCREEN
// ============================================================
function showLeaderboard() {
  showScreen("leaderboard");
  renderLeaderboard();
}

function renderLeaderboard() {
  const data = Leaderboard.getAll();
  const tbody = document.getElementById("lb-body");
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:2rem">No scores yet — go play! 🎮</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map((e, i) => `
    <tr class="${i < 3 ? "top-" + (i+1) : ""}">
      <td>${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</td>
      <td><strong>${escHtml(e.name)}</strong></td>
      <td class="score-val">${e.score.toLocaleString()}</td>
      <td><span class="diff-tag ${e.difficulty}">${e.difficulty}</span></td>
      <td>${escHtml(e.topic)}</td>
      <td class="date-val">${e.date}</td>
    </tr>`).join("");
}

function escHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
