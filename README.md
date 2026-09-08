# 🎵 TVA — Taste Variance Algorithm

[![Frontend](https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20JavaScript-blue)](https://github.com/dibyajyotidey2020-cyber/music-recommendation-site)
[![Backend](https://img.shields.io/badge/Backend-Node.js-green)](https://nodejs.org/)
[![Deployment](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://vercel.com/)
[![Music API](https://img.shields.io/badge/Music%20Data-iTunes%20Search%20API-lightgrey)](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/)

> **A mood-driven music discovery platform designed to make discovering music more intentional, interactive, and personal.**

TVA — **Taste Variance Algorithm** — is a lightweight music discovery web application built around the idea that music discovery should respond to how a listener feels, not only what they usually listen to.

Users choose a mood, receive music recommendations, evaluate mood and taste fit through a Match Score, preview tracks, save music for later, manage their library, and explore music through a responsive listening interface.

---

## 🎯 Project Vision

Traditional music discovery often depends heavily on genres, charts, popularity, or predefined playlists.

TVA approaches discovery from another direction:

**Start with the listener's current mood → discover music that fits that mood → interact with the recommendation → save or dismiss it.**

The goal is to create a more intentional discovery experience while keeping the application lightweight and accessible.

---

# ✨ Core Features

## 1. 🧠 Mood-Based Music Discovery

TVA begins the discovery process with mood selection.

Available moods:

- ❄️ Chill
- ○ Focus
- ↗ Energy
- ☼ Feel Good

The selected mood guides the recommendation process and determines the type of music presented to the listener.

---

## 2. 🎯 Match Score

Each recommendation includes a **Match Score** representing the application's current evaluation of:

**Mood + Taste Fit**

This gives users an immediate indication of how well a recommendation fits the current discovery context.

---

## 3. 🎧 Interactive Music Player

TVA includes an integrated music preview player supporting:

- Play
- Pause
- Resume
- Previous
- Next
- Progress control
- Track selection
- Audio preview playback

The application uses preview audio provided through the music catalog API rather than full-length commercial streaming.

---

## 4. ♡ Save for Later

Users can save tracks directly from the recommendation interface.

Saved tracks can later be accessed through the Library.

The save state is reflected directly in the interface and persists in browser storage.

---

## 5. 📚 Personal Library

The Library provides a dedicated space for saved music.

Users can:

- View saved tracks
- Play saved tracks
- Remove saved tracks
- Maintain saved state after refreshing the page

Library data is stored locally in the browser.

---

## 6. 🚫 Not For Me

Users can dismiss recommendations that do not match their preferences.

This allows the current recommendation flow to account for tracks the listener does not want to hear again.

---

## 7. 🔎 Music Search & Discovery

TVA provides music search functionality for discovering tracks and artists beyond the generated recommendation feed.

Search results are retrieved from the connected music catalog API.

---

## 8. 👤 User Account & Profile

TVA includes an account experience with:

- Sign Up
- Login
- Logout
- Profile information
- User name
- Gmail / Email

The account interface keeps user information separate from saved music and updates based on the currently active user.

---

## 9. 🌗 Theme System

TVA supports multiple appearance modes:

- Light Mode
- Dark Mode
- Device / System Preference

The interface uses a centralized theme system to maintain consistent styling across the application.

---

## 10. 📱 Responsive Mobile Experience

The interface is designed to work across desktop and mobile screen sizes.

The mobile experience includes a persistent bottom navigation for:

- Home
- Discovery
- Library
- Profile

The navigation remains accessible while scrolling through the main content.

---

# 🧠 Recommendation Flow

TVA currently follows a lightweight mood-driven discovery model:

```text
User
  │
  ▼
Select Mood
  │
  ▼
Mood-specific Recommendation Request
  │
  ▼
Music Catalog Search
  │
  ▼
Candidate Tracks
  │
  ▼
TVA Recommendation Logic
  │
  ▼
Match Score
  │
  ▼
Recommendation
  │
  ├── Play
  ├── Save for Later
  └── Not For Me
