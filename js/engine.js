// ============================================================
// WORD SEARCH ENGINE
// ============================================================

const DIFFICULTY = {
  easy:   { label:"Easy",   gridSizes:[10], directions:["R","D"],                      timeLimit:180, multiplier:1 },
  medium: { label:"Medium", gridSizes:[10,12], directions:["R","D","DR","DL"],          timeLimit:150, multiplier:1.5 },
  hard:   { label:"Hard",   gridSizes:[12,15], directions:["R","D","DR","DL","L","U","UR","UL"], timeLimit:120, multiplier:2 }
};

const DIR_VECTORS = {
  R:  [0, 1], L:  [0,-1], D:  [1, 0], U:  [-1, 0],
  DR: [1, 1], DL: [1,-1], UR: [-1,1], UL: [-1,-1]
};

class WordSearchEngine {
  constructor(words, gridSize, difficulty) {
    this.words     = words.map(w => w.toUpperCase().replace(/[^A-Z]/g, ""));
    this.gridSize  = gridSize;
    this.difficulty = difficulty;
    this.grid      = [];
    this.placed    = []; // [{word, cells:[{r,c}]}]
    this.generate();
  }

  generate() {
    const maxAttempts = 20;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      this.grid   = this._emptyGrid();
      this.placed = [];
      const shuffled = [...this.words].sort(() => Math.random() - 0.5);
      let allPlaced = true;
      for (const word of shuffled) {
        if (!this._placeWord(word)) { allPlaced = false; }
      }
      if (allPlaced) break;
    }
    this._fillRandom();
  }

  _emptyGrid() {
    return Array.from({ length: this.gridSize }, () => Array(this.gridSize).fill(""));
  }

  _placeWord(word) {
    const dirs = DIFFICULTY[this.difficulty].directions;
    const attempts = 200;
    for (let i = 0; i < attempts; i++) {
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      const [dr, dc] = DIR_VECTORS[dir];
      const r = Math.floor(Math.random() * this.gridSize);
      const c = Math.floor(Math.random() * this.gridSize);
      if (this._canPlace(word, r, c, dr, dc)) {
        const cells = [];
        for (let j = 0; j < word.length; j++) {
          this.grid[r + dr * j][c + dc * j] = word[j];
          cells.push({ r: r + dr * j, c: c + dc * j });
        }
        this.placed.push({ word, cells });
        return true;
      }
    }
    return false;
  }

  _canPlace(word, r, c, dr, dc) {
    for (let i = 0; i < word.length; i++) {
      const nr = r + dr * i, nc = c + dc * i;
      if (nr < 0 || nr >= this.gridSize || nc < 0 || nc >= this.gridSize) return false;
      const existing = this.grid[nr][nc];
      if (existing !== "" && existing !== word[i]) return false;
    }
    return true;
  }

  _fillRandom() {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let r = 0; r < this.gridSize; r++)
      for (let c = 0; c < this.gridSize; c++)
        if (this.grid[r][c] === "")
          this.grid[r][c] = letters[Math.floor(Math.random() * 26)];
  }

  getWordCells(word) {
    const found = this.placed.find(p => p.word === word.toUpperCase());
    return found ? found.cells : null;
  }

  getAllWords() {
    return this.placed.map(p => p.word);
  }
}

// ============================================================
// SCORE SYSTEM
// ============================================================
class ScoreSystem {
  constructor(difficulty, timeLimit) {
    this.difficulty  = difficulty;
    this.timeLimit   = timeLimit;
    this.multiplier  = DIFFICULTY[difficulty].multiplier;
    this.basePerWord = 100;
    this.total       = 0;
  }

  addWord(timeElapsed, wordLength) {
    const timeBonus  = Math.max(0, Math.floor((this.timeLimit - timeElapsed) / this.timeLimit * 50));
    const lengthBonus = wordLength * 10;
    const pts = Math.floor((this.basePerWord + timeBonus + lengthBonus) * this.multiplier);
    this.total += pts;
    return pts;
  }

  finalScore(timeElapsed, totalWords, foundWords) {
    const completionBonus = foundWords === totalWords
      ? Math.floor(500 * this.multiplier)
      : 0;
    const speedBonus = Math.max(0, Math.floor((this.timeLimit - timeElapsed) * 2 * this.multiplier));
    return this.total + completionBonus + speedBonus;
  }
}

// ============================================================
// LEADERBOARD (localStorage)
// ============================================================
class Leaderboard {
  static KEY = "ws_leaderboard_v1";
  static MAX  = 20;

  static getAll() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
    catch { return []; }
  }

  static add(entry) {
    // entry: { name, score, time, difficulty, topic, date }
    const all = this.getAll();
    all.push(entry);
    all.sort((a, b) => b.score - a.score);
    const trimmed = all.slice(0, this.MAX);
    localStorage.setItem(this.KEY, JSON.stringify(trimmed));
    return trimmed.findIndex(e => e === entry || (e.name === entry.name && e.score === entry.score && e.date === entry.date)) + 1;
  }

  static clear() { localStorage.removeItem(this.KEY); }
}
