const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 3001;
const ROOT = __dirname;

const moodSearchTerms = { Chill: "chill indie", Focus: "focus ambient", Energy: "upbeat pop", "Feel good": "feel good pop" };

const AUDIUS_APP_NAME = "TVA_Taste_Variance_Algorithm";
const AUDIUS_API_KEY = process.env.AUDIUS_API_KEY || ""; 

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

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.round(Number(milliseconds || 0) / 1000));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 8000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function searchAudius(term, limit) {
  try {
    const endpoint = new URL("https://api.audius.co/v1/tracks/search");
    endpoint.searchParams.set("query", term);
    endpoint.searchParams.set("app_name", AUDIUS_APP_NAME);
    const response = await fetchWithTimeout(endpoint, { timeout: 5000 });
    if (!response.ok) return null;
    const payload = await response.json();
    if (!payload.data || payload.data.length === 0) return null;
    
    // Check streamable status
    let validTracks = payload.data.filter(t => t.is_streamable !== false);
    if (validTracks.length === 0) return null;
    
    return validTracks.slice(0, limit).map((track) => {
      const art = track.artwork || {};
      const artwork = art['480x480'] || art['150x150'] || art['1000x1000'] || track.cover_art?.['480x480'] || track.cover_art?.['150x150'] || null;
      return {
        id: `audius-${track.id}`,
        title: track.title,
        artist: track.user ? track.user.name : "Unknown Artist",
        album: "Audius Release",
        artwork: artwork,
        previewUrl: `https://api.audius.co/v1/tracks/${track.id}/stream?app_name=${AUDIUS_APP_NAME}`,
        duration: track.duration * 1000,
        length: formatDuration(track.duration * 1000),
        storeUrl: track.permalink ? `https://audius.co${track.permalink}` : null,
        genre: track.genre || "Electronic",
        source: "audius"
      };
    });
  } catch (err) {
    return null;
  }
}

async function searchITunes(term, limit) {
  const endpoint = new URL("https://itunes.apple.com/search");
  endpoint.searchParams.set("term", term);
  endpoint.searchParams.set("media", "music");
  endpoint.searchParams.set("entity", "song");
  endpoint.searchParams.set("limit", String(limit));
  const response = await fetchWithTimeout(endpoint, { timeout: 6000 });
  if (!response.ok) throw new Error("Music catalog is temporarily unavailable");
  const payload = await response.json();
  if (!payload.results || payload.results.length === 0) return [];
  return payload.results.map((item) => ({ 
    id: String(item.trackId), 
    title: item.trackName, 
    artist: item.artistName, 
    album: item.collectionName, 
    artwork: item.artworkUrl100, 
    previewUrl: item.previewUrl || null, 
    duration: item.trackTimeMillis || null, 
    length: formatDuration(item.trackTimeMillis), 
    storeUrl: item.trackViewUrl, 
    genre: item.primaryGenreName, 
    source: "itunes" 
  }));
}

async function handleApi(req, res, url) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});

  if (req.method === "GET" && url.pathname === "/api/health") {
    return sendJson(res, 200, { ok: true, service: "tva-api" });
  }

  if (req.method === "GET" && url.pathname === "/api/music/search") {
    const term = (url.searchParams.get("q") || "").trim().slice(0, 80);
    if (term.length < 2) return sendJson(res, 400, { error: "Enter at least two characters to search" });
    try {
      let results = await searchAudius(term, 12);
      let attribution = "Music provided by Audius";
      
      if (!results || results.length === 0) {
        results = await searchITunes(term, 12);
        attribution = "Music previews provided courtesy of iTunes";
      }
      return sendJson(res, 200, { query: term, results, attribution });
    } catch (error) { 
      return sendJson(res, 502, { error: error.message }); 
    }
  }

  if (req.method === "GET" && url.pathname === "/api/music/featured") {
    const term = moodSearchTerms[url.searchParams.get("mood")] || moodSearchTerms.Chill;
    try {
      let results = await searchAudius(term, 6);
      let attribution = "Music provided by Audius";
      
      if (!results || results.length === 0) {
        results = await searchITunes(term, 6);
        attribution = "Music previews provided courtesy of iTunes";
      }
      return sendJson(res, 200, { results, attribution });
    } catch (error) { 
      return sendJson(res, 502, { error: error.message }); 
    }
  }

  // All other API routes removed for Demo architecture
  return sendJson(res, 404, { error: "API route not found" });
}

function contentType(filePath) {
  return { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".mpeg": "audio/mpeg", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg" }[path.extname(filePath)] || "application/octet-stream";
}

const serverHandler = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/")) return handleApi(req, res, url);
  if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, { error: "Method not allowed" });

  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.resolve(ROOT, `.${requested}`);
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return sendJson(res, 404, { error: "Page not found" });
  
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, {start, end});
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": contentType(filePath)
    });
    if (req.method === "HEAD") return res.end();
    file.pipe(res);
  } else {
    res.writeHead(200, { "Content-Length": fileSize, "Content-Type": contentType(filePath) });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(filePath).pipe(res);
  }
};

if (require.main === module) {
  const server = http.createServer(serverHandler);
  server.listen(PORT, () => console.log(`TVA is running at http://localhost:${PORT}`));
} else {
  module.exports = serverHandler;
  module.exports.handleApi = handleApi;
}
