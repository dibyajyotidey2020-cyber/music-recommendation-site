# 🎵 TVA — Taste Variance Algorithm

> A mood-driven music discovery platform designed to make discovering music more intentional, interactive, and personal.

TVA connects mood selection, taste fit, music recommendations, and interactive listening in one lightweight web experience.

---

## 🎯 Project Vision

**Choose how you feel → discover music that fits → listen → save or skip.**

TVA is built around mood-driven music discovery rather than simply browsing genres, charts, or popular tracks.

---

## ✨ Core Features

- 🧠 **Mood-Based Discovery** — Chill, Focus, Energy, Feel Good
- 🎯 **Match Score** — mood + taste fit
- 🎧 **Music Player** — play, pause, next, previous, progress & previews
- ♡ **Save for Later** — save and unsave tracks
- 📚 **Personal Library** — view, play & remove saved tracks
- 🚫 **Not For Me** — dismiss unwanted recommendations
- 🔎 **Music Search** — discover tracks & artists
- 👤 **User Account** — signup, login, logout & profile
- 🌗 **Theme System** — Light, Dark & Device modes
- 📱 **Responsive UI** — desktop & mobile support
- 📌 **Mobile Navigation** — Home, Discovery, Library & Profile

---

## 🏗️ Technology & Engineering

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript
- Responsive CSS
- CSS Custom Properties
- Browser Audio APIs

### Backend & API

- Node.js
- Vercel Serverless Functions
- REST-style API endpoints

### Music Data

- Apple iTunes Search API

### Storage

- Browser `localStorage`

### Deployment

- Vercel

---

## 🔄 Recommendation Flow

    Mood Selection
          ↓
    Music Catalog Search
          ↓
    TVA Recommendation Logic
          ↓
    Match Score
          ↓
    Play / Save / Not For Me

TVA currently uses lightweight mood-driven recommendation logic rather than machine-learning-based personalization.

---

## 🔌 API

- `GET /api/music/search` — searches the music catalog
- `GET /api/music/featured` — provides featured music suggestions

---

## 📁 Project Structure

    music-recommendation-site/
    ├── api/
    │   └── music/
    │       ├── featured.js
    │       └── search.js
    ├── assets/
    │   └── tva-intro.mpeg
    ├── app.js
    ├── index.html
    ├── styles.css
    ├── server.js
    ├── package.json
    ├── package-lock.json
    ├── vercel.json
    ├── .gitignore
    └── README.md

---

## ⚙️ Run Locally

    git clone https://github.com/dibyajyotidey2020-cyber/music-recommendation-site.git
    cd music-recommendation-site
    npm install
    npm run dev

Open:

    http://localhost:3001

---

## 🌐 Live Website

**[Launch TVA](https://music-recommendation-site-omega.vercel.app/)**

---

## ⚠️ Current Limitations

- User and library data are stored locally in the browser.
- Music playback uses available iTunes preview audio.
- TVA does not provide full-length commercial music streaming.
- The current recommendation system is mood-driven rather than ML-based.

---

## 🧪 Project Status

TVA is currently deployed and functional with mood-based discovery, recommendations, Match Score, music previews, Save for Later, Library, Not For Me, user accounts, profile information, themes, search, and responsive mobile navigation.

---

## 👤 Author

### Dibyajyoti Dey

**Solo project**

[GitHub](https://github.com/dibyajyotidey2020-cyber) · [LinkedIn](https://www.linkedin.com/in/dibyajyoti-dey/)

---

## 🔗 Project Links

🌐 **Live Website:** https://music-recommendation-site-omega.vercel.app/

💻 **Repository:** https://github.com/dibyajyotidey2020-cyber/music-recommendation-site

👤 **GitHub:** https://github.com/dibyajyotidey2020-cyber

💼 **LinkedIn:** https://www.linkedin.com/in/dibyajyoti-dey/
