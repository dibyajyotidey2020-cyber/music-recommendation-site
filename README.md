# 🎵 TVA — Taste Variance Algorithm
<p align="left">
  <img src="https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20JavaScript-0A66C2?style=flat-square">
  <img src="https://img.shields.io/badge/Backend-Node.js-339933?style=flat-square&logo=node.js&logoColor=white">
  <img src="https://img.shields.io/badge/API-iTunes%20Search%20API-555555?style=flat-square">
  <img src="https://img.shields.io/badge/Deployment-Vercel-000000?style=flat-square&logo=vercel&logoColor=white">
  <img src="https://img.shields.io/badge/Storage-localStorage-7B61FF?style=flat-square">
</p>

> A mood-driven music discovery platform designed to make discovering music more intentional, interactive, and personal.

TVA — **Taste Variance Algorithm** — is a lightweight music discovery web application built around mood-based discovery. Users select how they feel, receive recommendations, evaluate mood and taste fit through a Match Score, preview tracks, save music, manage their library, and explore music through a responsive listening experience.

---

## 🎯 Project Vision

TVA follows a simple discovery idea:

**Choose a mood → discover music that fits → listen → save or skip.**

The project focuses on making music discovery more guided and interactive instead of relying only on genres, charts, or popular tracks.

---

## 🛠️ Tech Stack & Engineering

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **UI:** Responsive CSS, CSS Custom Properties, Browser Audio APIs
- **Backend:** Node.js
- **Serverless:** Vercel Functions
- **Music Data:** Apple iTunes Search API
- **Storage:** Browser `localStorage`
- **Deployment:** Vercel

The frontend is framework-free, while the `/api/music/` routes provide server-side access to the external music catalog.

---

## ✨ Core Features & Technical Highlights

### 1. 🧠 Mood-Based Music Discovery

Users can select from four moods:

**Chill • Focus • Energy • Feel Good**

The selected mood guides the recommendation process and determines the type of music presented.

### 2. 🎯 Match Score

Recommendations include a **Match Score** representing the application's current **mood + taste fit** evaluation.

### 3. 🎧 Interactive Music Player

Integrated preview playback with:

- Play / Pause
- Resume
- Next / Previous
- Progress control
- Track selection
- Audio previews

### 4. ♡ Save for Later & Library

Users can save tracks, access them through their personal Library, play saved tracks, and remove them when required.

### 5. 🚫 Not For Me

Users can dismiss recommendations that do not fit their preferences.

### 6. 🔎 Music Search

Search tracks and artists through the connected music catalog.

### 7. 👤 User Account & Profile

Includes:

- Sign Up
- Login
- Logout
- User profile
- User name
- Gmail / Email

### 8. 🌗 Theme System

Supports:

**Light • Dark • Device**

### 9. 📱 Responsive Mobile Experience

Responsive desktop/mobile interface with persistent mobile navigation for:

**Home • Discovery • Library • Profile**

---

## 🔌 API Layer

- `GET /api/music/search` — music and artist search
- `GET /api/music/featured` — featured music suggestions

These endpoints connect the application to the Apple iTunes Search API.

---

## 📁 Project Structure

    music-recommendation-site/
    ├── api/music/
    │   ├── featured.js
    │   └── search.js
    ├── assets/
    │   └── tva-intro.mpeg
    ├── app.js
    ├── index.html
    ├── styles.css
    ├── server.js
    ├── package.json
    ├── package-lock.json
    ├── vercel.json
    └── README.md

---

## ⚙️ Run Locally

    git clone https://github.com/dibyajyotidey2020-cyber/music-recommendation-site.git
    cd music-recommendation-site
    npm install
    npm run dev

Open `http://localhost:3001`

---

## 🌐 Live Project

<a href="https://music-recommendation-site-omega.vercel.app/">
  <img src="https://img.shields.io/badge/LIVE%20WEBSITE-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Website">
</a>

---

## ⚠️ Current Limitations

- User and library data are stored locally in the browser.
- Music playback uses available iTunes preview audio.
- Full-length commercial music streaming is not provided.
- The current recommendation system is mood-driven rather than machine-learning-based.

---

## 👤 Author

### Dibyajyoti Dey

**Solo project**

<a href="mailto:dibyajyotidey2020@gmail.com">
  <img src="https://img.shields.io/badge/GMAIL-EA4335?style=for-the-badge&logo=gmail&logoColor=white" alt="Gmail">
</a>
<a href="https://www.linkedin.com/in/dibyajyoti-dey/">
  <img src="https://img.shields.io/badge/LINKEDIN-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn">
</a>
<a href="https://github.com/dibyajyotidey2020-cyber">
  <img src="https://img.shields.io/badge/GITHUB-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
</a>

---

## 🔗 Repository

<a href="https://github.com/dibyajyotidey2020-cyber/music-recommendation-site">
  <img src="https://img.shields.io/badge/VIEW%20REPOSITORY-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Repository">
</a>
