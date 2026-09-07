# TVA music recommendation site

## Run locally

1. Install Node.js.
2. Double-click `start-aura.bat` (or open a terminal in this folder and run `npm start`).
3. Keep that window open while using the website.
4. Open `http://localhost:3000`.

The home player starts empty on purpose. Choose Chill, Focus, Energy, or Feel good to load real catalog recommendations. Saving requires an account; open Library to remove any saved song.

Each page load begins with a silent TVA opening animation. Tap anywhere to go straight to Home.

Use the appearance button in the top bar to cycle through Light, Dark, and Device. Device mode follows the operating system theme and updates automatically when it changes.

## Backend v2 API

- `POST /api/auth/register` — create an account with `email`, `password`, and optional `displayName`.
- `POST /api/auth/login` — start a 30-day session.
- `POST /api/auth/logout` — end the current session.
- `GET /api/me` — return the signed-in user.
- `GET /api/recommendations?mood=Chill` — return mood-matched tracks.
- `POST /api/preferences` — save `mood`, `genres`, and `artists`.
- `GET /api/library` and `POST /api/library` — read or update saved tracks.
- `GET /api/music/search?q=...` — search real songs and artists.
- `GET /api/music/featured?mood=...` — load real catalog suggestions for a mood.

The current storage is `data.json`, intentionally kept simple while the project is being learned. Before a public launch, move this data to an online database and add rate limiting, email verification, and password-reset flows.

## Real music

Discover now searches the iTunes Search API for real catalog metadata, artwork, store links, and previews where available. Previews and artwork are promotional content; keep the iTunes attribution and link users to the store rather than downloading or hosting the audio yourself.

The home player mirrors the selected catalog preview. Full-length playback requires a licensed provider player (for example Spotify Web Playback SDK or Apple MusicKit) and user authorization; the iTunes Search API does not provide full recordings.
