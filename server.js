const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 3001;
const ROOT = __dirname;

const moodSearchTerms = { Chill: "chill indie", Focus: "focus ambient", Energy: "upbeat pop", "Feel good": "feel good pop" };

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

async function handleApi(req, res, url) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});

  if (req.method === "GET" && url.pathname === "/api/health") {
    return sendJson(res, 200, { ok: true, service: "tva-api" });
  }

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
