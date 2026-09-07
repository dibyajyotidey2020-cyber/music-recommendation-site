const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, "data.json");

const tracks = [
  { id: "velvet-hours", title: "Velvet Hours", artist: "Maya Sol & The Atlas", tag: "LATE-NIGHT INDIE", length: "3:42", art: "VELVET<br>HOURS", style: "art-velvet", progress: "20%", moods: ["Chill", "Feel good"], genres: ["indie", "dreamy"] },
  { id: "slow-motion", title: "Slow Motion", artist: "Kei Rivers", tag: "SOFT ELECTRONICA", length: "3:18", art: "SLOW<br>MOTION", style: "art-drift", progress: "12%", moods: ["Chill", "Focus"], genres: ["electronica", "dreamy"] },
  { id: "golden-sound", title: "Golden Sound", artist: "Milo June", tag: "SUNLIT POP", length: "2:57", art: "GOLDEN<br>SOUND", style: "art-spark", progress: "28%", moods: ["Energy", "Feel good"], genres: ["pop", "indie"] }
];

const moodSearchTerms = { Chill: "chill indie", Focus: "focus ambient", Energy: "upbeat pop", "Feel good": "feel good pop" };

function readData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { return { users: {}, libraries: {} }; }
}

let data = readData();
data.users ||= {};
data.libraries ||= {};
data.sessions ||= {};
data.catalog ||= {};

function persist() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function sendJson(res, status, payload, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    ...extraHeaders
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 100_000) reject(new Error("Request body is too large"));
    });
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error("Request body must be valid JSON")); }
    });
    req.on("error", reject);
  });
}

function userIdFrom(value) {
  return typeof value === "string" && value.length > 0 && value.length < 120 ? value : "guest";
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, 120_000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

function passwordMatches(password, storedHash) {
  if (typeof storedHash !== "string" || !storedHash.includes(":")) return false;
  const [salt, expected] = storedHash.split(":");
  const actual = hashPassword(password, salt).split(":")[1];
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || "").split(";").filter(Boolean).map((part) => {
    const [key, ...rest] = part.trim().split("=");
    return [key, decodeURIComponent(rest.join("="))];
  }));
}

function sessionUserId(req) {
  const sessionId = parseCookies(req).aura_session;
  const session = sessionId && data.sessions[sessionId];
  if (!session || session.expiresAt < Date.now()) return null;
  return data.users[session.userId] ? session.userId : null;
}

function safeUser(user) {
  if (!user) return null;
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

function findUserByEmail(email) {
  return Object.values(data.users).find((user) => user.email === email);
}

function createSession(userId) {
  const sessionId = crypto.randomBytes(32).toString("hex");
  data.sessions[sessionId] = { userId, expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30 };
  persist();
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `aura_session=${encodeURIComponent(sessionId)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${secure}`;
}

function publicTrack(track, savedIds, match) {
  return { ...track, match: match || track.match || "90% match", isSaved: savedIds.includes(track.id) };
}

function matchFor(track, mood, preferences = {}) {
  let score = 90;
  if (track.moods?.includes(mood)) score += 8;
  if (track.genres?.some((genre) => preferences.genres?.includes(genre))) score += 1;
  return `${Math.min(99, score)}% match`;
}

function libraryTracks(ids) {
  return ids.map((id) => tracks.find((track) => track.id === id) || data.catalog[id]).filter(Boolean);
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.round(Number(milliseconds || 0) / 1000));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

async function handleApi(req, res, url) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  const authenticatedUserId = sessionUserId(req);
  const userId = authenticatedUserId || userIdFrom(url.searchParams.get("userId"));
  const savedIds = data.libraries[userId] || [];

  if (req.method === "GET" && url.pathname === "/api/health") return sendJson(res, 200, { ok: true, service: "aura-api" });

  if (req.method === "GET" && url.pathname === "/api/music/search") {
    const term = (url.searchParams.get("q") || "").trim().slice(0, 80);
    if (term.length < 2) return sendJson(res, 400, { error: "Enter at least two characters to search" });
    try {
      const endpoint = new URL("https://itunes.apple.com/search");
      endpoint.searchParams.set("term", term);
      endpoint.searchParams.set("media", "music");
      endpoint.searchParams.set("entity", "song");
      endpoint.searchParams.set("limit", "12");
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Music catalog is temporarily unavailable");
      const payload = await response.json();
      const results = (payload.results || []).map((item) => ({ id: String(item.trackId), title: item.trackName, artist: item.artistName, album: item.collectionName, artwork: item.artworkUrl100, previewUrl: item.previewUrl || null, duration: item.trackTimeMillis || null, length: formatDuration(item.trackTimeMillis), storeUrl: item.trackViewUrl, genre: item.primaryGenreName, source: "itunes" }));
      return sendJson(res, 200, { query: term, results, attribution: "Music previews and artwork provided courtesy of iTunes" });
    } catch (error) { return sendJson(res, 502, { error: error.message }); }
  }

  if (req.method === "GET" && url.pathname === "/api/music/featured") {
    const term = moodSearchTerms[url.searchParams.get("mood")] || moodSearchTerms.Chill;
    const endpoint = new URL("https://itunes.apple.com/search");
    endpoint.searchParams.set("term", term);
    endpoint.searchParams.set("media", "music");
    endpoint.searchParams.set("entity", "song");
    endpoint.searchParams.set("limit", "6");
    try {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Music catalog is temporarily unavailable");
      const payload = await response.json();
      return sendJson(res, 200, { results: (payload.results || []).map((item) => ({ id: String(item.trackId), title: item.trackName, artist: item.artistName, album: item.collectionName, artwork: item.artworkUrl100, previewUrl: item.previewUrl || null, duration: item.trackTimeMillis || null, length: formatDuration(item.trackTimeMillis), storeUrl: item.trackViewUrl, genre: item.primaryGenreName, source: "itunes" })) });
    } catch (error) { return sendJson(res, 502, { error: error.message }); }
  }

  if (req.method === "GET" && url.pathname === "/api/me") {
    return sendJson(res, 200, { user: safeUser(authenticatedUserId ? data.users[authenticatedUserId] : null) });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/register") {
    try {
      const body = await readBody(req);
      const email = normalizeEmail(body.email);
      const password = typeof body.password === "string" ? body.password : "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJson(res, 400, { error: "Enter a valid email address" });
      if (password.length < 8) return sendJson(res, 400, { error: "Password must be at least 8 characters" });
      if (findUserByEmail(email)) return sendJson(res, 409, { error: "An account with this email already exists" });
      const id = crypto.randomUUID();
      data.users[id] = { userId: id, email, displayName: typeof body.displayName === "string" && body.displayName.trim() ? body.displayName.trim().slice(0, 80) : "TVA listener", passwordHash: hashPassword(password), mood: "Chill", genres: [], artists: [], createdAt: new Date().toISOString() };
      data.libraries[id] = [];
      const cookie = createSession(id);
      return sendJson(res, 201, { user: safeUser(data.users[id]) }, { "Set-Cookie": cookie });
    } catch (error) { return sendJson(res, 400, { error: error.message }); }
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    try {
      const body = await readBody(req);
      const user = findUserByEmail(normalizeEmail(body.email));
      if (!user || !passwordMatches(typeof body.password === "string" ? body.password : "", user.passwordHash)) return sendJson(res, 401, { error: "Email or password is incorrect" });
      const cookie = createSession(user.userId);
      return sendJson(res, 200, { user: safeUser(user) }, { "Set-Cookie": cookie });
    } catch (error) { return sendJson(res, 400, { error: error.message }); }
  }

  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    const sessionId = parseCookies(req).aura_session;
    if (sessionId) delete data.sessions[sessionId];
    persist();
    return sendJson(res, 200, { ok: true }, { "Set-Cookie": "aura_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0" });
  }

  if (req.method === "GET" && url.pathname === "/api/preferences") {
    return sendJson(res, 200, data.users[userId] || { userId, mood: "Chill", genres: [], artists: [] });
  }

  if (req.method === "GET" && url.pathname === "/api/recommendations") {
    const mood = url.searchParams.get("mood") || data.users[userId]?.mood || "Chill";
    const preferences = data.users[userId] || {};
    const preferred = tracks.filter((track) => track.moods.includes(mood));
    const remaining = tracks.filter((track) => !track.moods.includes(mood));
    return sendJson(res, 200, { mood, recommendations: [...preferred, ...remaining].map((track) => publicTrack(track, savedIds, matchFor(track, mood, preferences))) });
  }

  if (req.method === "GET" && url.pathname === "/api/library") {
    return sendJson(res, 200, { tracks: libraryTracks(savedIds).map((track) => publicTrack(track, savedIds)) });
  }

  if (req.method === "POST" && url.pathname === "/api/preferences") {
    try {
      const body = await readBody(req);
      const id = authenticatedUserId || userIdFrom(body.userId || userId);
      data.users[id] = { userId: id, mood: typeof body.mood === "string" ? body.mood : "Chill", genres: Array.isArray(body.genres) ? body.genres.slice(0, 20) : [], artists: Array.isArray(body.artists) ? body.artists.slice(0, 20) : [], updatedAt: new Date().toISOString() };
      persist();
      return sendJson(res, 200, data.users[id]);
    } catch (error) { return sendJson(res, 400, { error: error.message }); }
  }

  if (req.method === "POST" && url.pathname === "/api/library") {
    try {
      if (!authenticatedUserId) return sendJson(res, 401, { error: "Create an account or log in before saving music" });
      const body = await readBody(req);
      const id = authenticatedUserId || userIdFrom(body.userId || userId);
      let track = tracks.find((item) => item.id === body.trackId) || data.catalog[body.trackId];
      if (!track && body.track && body.track.id === body.trackId) {
        track = { id: String(body.track.id), title: String(body.track.title || "Unknown song").slice(0, 200), artist: String(body.track.artist || "Unknown artist").slice(0, 200), album: String(body.track.album || "").slice(0, 200), artwork: typeof body.track.artwork === "string" ? body.track.artwork : null, previewUrl: typeof body.track.previewUrl === "string" ? body.track.previewUrl : null, duration: Number(body.track.duration || 0) || null, length: String(body.track.length || "").slice(0, 12), storeUrl: typeof body.track.storeUrl === "string" ? body.track.storeUrl : null, genre: String(body.track.genre || "").slice(0, 80), source: "itunes" };
        data.catalog[track.id] = track;
      }
      if (!track) return sendJson(res, 404, { error: "Track not found" });
      const library = new Set(data.libraries[id] || []);
      if (body.action === "remove") library.delete(track.id); else library.add(track.id);
      data.libraries[id] = [...library];
      persist();
      return sendJson(res, 200, { tracks: libraryTracks([...library]).map((item) => publicTrack(item, [...library])) });
    } catch (error) { return sendJson(res, 400, { error: error.message }); }
  }

  sendJson(res, 404, { error: "API route not found" });
}

function contentType(filePath) {
  return { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".mpeg": "audio/mpeg", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg" }[path.extname(filePath)] || "application/octet-stream";
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/")) return handleApi(req, res, url);
  if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, { error: "Method not allowed" });

  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.resolve(ROOT, `.${requested}`);
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return sendJson(res, 404, { error: "Page not found" });
  res.writeHead(200, { "Content-Type": contentType(filePath) });
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => console.log(`TVA is running at http://localhost:${PORT}`));
