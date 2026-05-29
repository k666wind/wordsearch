# 🔍 Word Search PWA

A fun, mobile-first word search game for kids and EFL learners.

## ✨ Features

- 📚 Built-in vocabulary by Grade Level (Grade 1–6)
- ✏️ Custom word entry
- ⚡ Three difficulty levels (Easy / Medium / Hard)
- ⏱ Countdown or Stopwatch timer
- 🏆 Local leaderboard (localStorage)
- 📱 Installable PWA — works offline
- 🎨 Soft milky UI, touch-friendly, kid-safe

## 🚀 Play Online

> `https://<your-username>.github.io/<repo-name>/`

## 🛠 Deploy to GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set source to **GitHub Actions**
4. The workflow in `.github/workflows/deploy.yml` will auto-deploy on every push to `main`

## 📁 Project Structure

```
├── index.html          # Main app (all screens)
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker (offline)
├── css/
│   └── style.css       # All styles
├── js/
│   ├── engine.js       # Word search engine + scoring + leaderboard
│   └── app.js          # UI controller
├── data/
│   └── words.js        # Grade 1–6 vocabulary data
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── .github/
    └── workflows/
        └── deploy.yml  # Auto-deploy to GitHub Pages
```

## 🎮 How to Play

1. Choose difficulty and word list (built-in grade or custom)
2. Find all hidden words in the grid by dragging
3. Race against the timer for bonus points
4. Save your score to the leaderboard!

## 📜 License

MIT
