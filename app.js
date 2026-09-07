let tracks = [];
let activeTrack = 0;
let playing = false;
let selectedMood = null;
let userId;
let musicRequestId = 0;
let lastMusicResults = [];
try {
  userId = localStorage.getItem("aura-user-id") || crypto.randomUUID();
  localStorage.setItem("aura-user-id", userId);
} catch { userId = "guest"; }

const $ = (selector) => document.querySelector(selector);
const trackTitle = $("#trackTitle");
const trackArtist = $("#trackArtist");
const trackTag = $("#trackTag");
const matchText = $("#matchText");
const trackLength = $("#trackLength");
const albumArt = $("#albumArt");
const artLabel = $("#artLabel");
const progressControl = $("#progressControl");
const currentTime = $("#currentTime");
const playButton = $("#playButton");
const helperText = $("#helperText");
const saveButton = $("#saveButton");
const profileButton = $(".profile-button");
const authDialog = $("#authDialog");
const authForm = $("#authForm");
const authStatus = $("#authStatus");
const authTitle = $("#authTitle");
const authSubtitle = $("#authSubtitle");
const authSubmit = $("#authSubmit");
const nameField = $("#nameField");
const nameInput = $("#nameInput");
const loginTab = $("#loginTab");
const signupTab = $("#signupTab");
const signedIn = $("#signedIn");
const logoutButton = $("#logoutButton");
const discoverDialog = $("#discoverDialog");
const libraryDialog = $("#libraryDialog");
const libraryList = $("#libraryList");
const musicSearchForm = $("#musicSearchForm");
const musicSearchInput = $("#musicSearchInput");
const musicResults = $("#musicResults");
const mainAudio = $("#mainAudio");
const tasteTitle = $("#taste-title");
const moodHelp = $("#moodHelp");
const productionDialog = $("#productionDialog");
const productionList = $("#productionList");
const greeting = $("#greeting");
const themeButton = $("#themeButton");
const splashScreen = $("#splashScreen");
const introAudio = $("#introAudio");
let authMode = "login";
let currentUser = null;

let splashClosed = false;
let introAudioEnd = 38;
const INTRO_AUDIO_START = 179;
const INTRO_AUDIO_END = 217;

function prepareIntroAudio() {
  if (!introAudio || !Number.isFinite(introAudio.duration) || introAudio.duration <= 0) return;
  const hasFullSource = introAudio.duration > INTRO_AUDIO_END + 1;
  introAudio.currentTime = hasFullSource ? INTRO_AUDIO_START : 0;
  introAudioEnd = hasFullSource ? INTRO_AUDIO_END : introAudio.duration;
}

function startIntroAudio() {
  if (!introAudio) return;
  prepareIntroAudio();
  introAudio.play().catch(() => {
    // Browsers may block sound until the first user gesture; the visual intro still plays.
  });
}

function closeSplash() {
  if (splashClosed || !splashScreen) return;
  splashClosed = true;
  introAudio?.pause();
  splashScreen.classList.add("is-hidden");
  window.setTimeout(() => splashScreen.remove(), 500);
}
// The cinematic opener runs for 38 seconds including its final fade to the app.
// There is intentionally no skip button: the sequence is short enough to play once
// and the TVA experience is revealed automatically at the end.
const revealSplash = () => window.setTimeout(closeSplash, 37_000);
if (document.readyState === "complete") revealSplash();
else window.addEventListener("load", revealSplash, { once: true });
// The opener has no visible skip control; any tap/click on the full-screen scene
// quietly takes the listener to TVA.
splashScreen?.addEventListener("pointerup", closeSplash, { passive: true });
introAudio?.addEventListener("loadedmetadata", prepareIntroAudio, { once: true });
introAudio?.addEventListener("timeupdate", () => {
  if (introAudio.currentTime >= introAudioEnd - 0.08) closeSplash();
});
startIntroAudio();

const deviceTheme = window.matchMedia("(prefers-color-scheme: dark)");
let themeMode = "device";
try {
  themeMode = ["light", "dark", "device"].includes(localStorage.getItem("aura-theme-mode")) ? localStorage.getItem("aura-theme-mode") : "device";
} catch { themeMode = "device"; }

function applyTheme(mode, persist = true) {
  themeMode = ["light", "dark", "device"].includes(mode) ? mode : "device";
  const dark = themeMode === "dark" || (themeMode === "device" && deviceTheme.matches);
  document.body.dataset.theme = dark ? "dark" : "light";
  themeButton.textContent = themeMode === "dark" ? "☾" : themeMode === "light" ? "☀" : "◐";
  themeButton.setAttribute("aria-label", `Appearance: ${themeMode}. Change appearance`);
  themeButton.title = `Appearance: ${themeMode}`;
  if (persist) {
    try { localStorage.setItem("aura-theme-mode", themeMode); } catch { /* storage may be unavailable */ }
  }
}

applyTheme(themeMode, false);
deviceTheme.addEventListener("change", () => { if (themeMode === "device") applyTheme("device", false); });

function updateGreeting() {
  const hour = new Date().getHours();
  const period = hour >= 5 && hour < 12 ? "morning" : hour >= 12 && hour < 17 ? "afternoon" : hour >= 17 && hour < 21 ? "evening" : "hello";
  const name = currentUser?.displayName?.trim() || "listener";
  greeting.textContent = period === "hello" ? `HELLO, ${name}` : `GOOD ${period.toUpperCase()}, ${name}`;
}

async function api(path, options = {}) {
  try {
    const response = await fetch(path, { credentials: "same-origin", headers: { "Content-Type": "application/json" }, ...options });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return { _error: payload.error || "Something went wrong" };
    return payload;
  } catch { return { _error: "The backend is not running. Start it with npm start." }; }
}

function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === "signup";
  nameField.hidden = !signup;
  nameInput.required = signup;
  loginTab.classList.toggle("active", !signup);
  signupTab.classList.toggle("active", signup);
  loginTab.setAttribute("aria-selected", String(!signup));
  signupTab.setAttribute("aria-selected", String(signup));
  authTitle.textContent = signup ? "Join TVA" : "Welcome back";
  authSubtitle.textContent = signup ? "Create an account so your taste and library travel with you." : "Log in to keep your recommendations and library in sync.";
  authSubmit.textContent = signup ? "Create account" : "Log in";
  authStatus.textContent = "";
  authStatus.classList.remove("error");
}

function updateAuthView(user) {
  currentUser = user;
  updateGreeting();
  if (user) {
    const initials = (user.displayName || user.email || "A").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    profileButton.querySelector("span").textContent = initials;
    authTitle.textContent = `Hi, ${user.displayName || "listener"}`;
    authSubtitle.textContent = user.email;
    authForm.hidden = true;
    signedIn.hidden = false;
  } else {
    profileButton.querySelector("span").textContent = "A";
    authForm.hidden = false;
    signedIn.hidden = true;
    setAuthMode("login");
  }
}

async function openAccount(message = "") {
  const result = await api("/api/me");
  updateAuthView(result?.user || null);
  if (message) {
    authStatus.classList.add("error");
    authStatus.textContent = message;
  }
  if (typeof authDialog.showModal === "function") authDialog.showModal();
  else authDialog.setAttribute("open", "");
}

async function ensureAuthenticated() {
  if (currentUser) return true;
  const result = await api("/api/me");
  if (result?.user) { updateAuthView(result.user); return true; }
  await openAccount("Create an account or log in before saving music.");
  return false;
}

function showDialog(dialog) {
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

async function openLibrary() {
  libraryList.innerHTML = '<p class="library-empty">Loading your library…</p>';
  showDialog(libraryDialog);
  const result = await api(`/api/library?userId=${encodeURIComponent(userId)}`);
  if (result?._error) {
    libraryList.innerHTML = `<p class="library-empty">${result._error}</p>`;
    return;
  }
  if (!result?.tracks?.length) {
    libraryList.innerHTML = '<p class="library-empty">Nothing saved yet. Tap “Save for later” on a recommendation.</p>';
    return;
  }
  libraryList.innerHTML = "";
  result.tracks.forEach((track) => {
    const song = document.createElement("div");
    song.className = "library-song";
    const artwork = track.artwork ? `<img class="library-song-art-img" src="${track.artwork}" alt="" loading="lazy">` : `<span class="library-song-art ${track.style || "art-velvet"}" aria-hidden="true"></span>`;
    song.innerHTML = `${artwork}<span><p class="library-song-title"></p><p class="library-song-artist"></p></span><span class="library-song-actions"><span class="library-song-match"></span><button class="library-song-remove" type="button" aria-label="Remove song">×</button></span>`;
    song.querySelector(".library-song-title").textContent = track.title;
    song.querySelector(".library-song-artist").textContent = track.artist;
    song.querySelector(".library-song-match").textContent = track.match;
    song.querySelector(".library-song-remove").addEventListener("click", async () => {
      if (!(await ensureAuthenticated())) return;
      const response = await api("/api/library", { method: "POST", body: JSON.stringify({ userId, trackId: track.id, action: "remove", track }) });
      if (response?._error) { helperText.textContent = response._error; return; }
      helperText.textContent = `${track.title} was removed from your library.`;
      await openLibrary();
    });
    libraryList.append(song);
  });
}

function renderMusicResults(results, attribution = "") {
  lastMusicResults = results || [];
  renderTasteTracks();
  musicResults.innerHTML = "";
  if (!results?.length) {
    musicResults.innerHTML = '<p class="library-empty">No songs found. Try another artist or title.</p>';
    return;
  }
  const savedIds = tracks.filter(t => t.isSaved).map(t => t.id);
  results.forEach((track) => {
    const result = document.createElement("div");
    result.className = "music-result";
    const alreadySaved = savedIds.includes(track.id);
    const artwork = track.artwork ? `<img src="${track.artwork}" alt="" loading="lazy">` : '<span class="library-song-art art-velvet" aria-hidden="true"></span>';
    result.innerHTML = `${artwork}<span><p class="music-result-title"></p><p class="music-result-artist"></p></span><span class="music-result-actions"><button type="button" class="preview-result" aria-label="Preview song">▶</button><button type="button" class="save-result${alreadySaved ? '" data-saved="true' : ''}" aria-label="${alreadySaved ? 'Remove song' : 'Save song'}">${alreadySaved ? '♥' : '♡'}</button>${track.storeUrl ? `<a href="${track.storeUrl}" target="_blank" rel="noopener" aria-label="Open song page">↗</a>` : ""}</span>`;
    result.querySelector(".music-result-title").textContent = track.title || "Unknown song";
    result.querySelector(".music-result-artist").textContent = `${track.artist || "Unknown artist"}${track.album ? ` · ${track.album}` : ""}`;
    result.querySelector(".preview-result").addEventListener("click", async () => {
      selectTrackForHome(track);
      if (!track.previewUrl) { helperText.textContent = "A preview is not available for this song."; return; }
      mainAudio.src = track.previewUrl;
      await mainAudio.play().catch(() => {});
      playing = true;
      playButton.classList.add("playing");
      playButton.setAttribute("aria-label", `Pause ${track.title}`);
      helperText.textContent = `Playing a preview of ${track.title} in your home player.`;
    });
    result.querySelector(".save-result").addEventListener("click", async (event) => {
      const button = event.currentTarget;
      if (!(await ensureAuthenticated())) return;
      const saved = button.dataset.saved === "true";
      const response = await api("/api/library", { method: "POST", body: JSON.stringify({ userId, trackId: track.id, action: saved ? "remove" : "save", track }) });
      if (response?._error) { helperText.textContent = response._error; return; }
      button.dataset.saved = String(!saved);
      button.textContent = saved ? "♡" : "♥";
      button.setAttribute("aria-label", saved ? "Save song" : "Remove song");
      button.classList.add("save-flash");
      setTimeout(() => button.classList.remove("save-flash"), 800);
      helperText.textContent = saved ? `${track.title} was removed from your library.` : `${track.title} was saved to your library.`;
    });
    musicResults.append(result);
  });
  if (attribution) {
    const note = document.createElement("p");
    note.className = "music-attribution";
    note.textContent = attribution;
    musicResults.append(note);
  }
}

async function loadFeaturedMusic() {
  const requestId = ++musicRequestId;
  const result = await api(`/api/music/featured?mood=${encodeURIComponent(selectedMood)}`);
  if (result?.results && requestId === musicRequestId) renderMusicResults(result.results, "Music previews and artwork provided courtesy of iTunes.");
}

async function loadIntroArtwork() {
  const result = await api("/api/music/featured?mood=Chill");
  const artwork = (result?.results || [])
    .map((track) => track.artwork)
    .filter((url) => {
      try { return /^https?:$/.test(new URL(url).protocol); } catch { return false; }
    });
  if (!artwork.length) return;
  const cards = [...document.querySelectorAll(".mosaic-card"), ...document.querySelectorAll(".ride-poster")];
  cards.forEach((card, index) => {
    const url = artwork[index % artwork.length];
    card.style.backgroundImage = `linear-gradient(180deg, rgba(20,12,43,.08), rgba(7,4,20,.78)), url(${JSON.stringify(url)})`;
    card.style.backgroundSize = "cover";
    card.style.backgroundPosition = "center";
  });
}

async function openDiscover() {
  showDialog(discoverDialog);
  if (!musicResults.querySelector(".music-result")) await loadFeaturedMusic();
}

function renderProductionList() {
  const sourceTracks = lastMusicResults.length ? lastMusicResults : tracks;
  productionList.innerHTML = "";
  if (!sourceTracks.length) {
    productionList.innerHTML = '<p class="library-empty">Choose a mood or search for a song first.</p>';
    return;
  }
  sourceTracks.forEach((track) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "production-item";
    item.innerHTML = `<span class="production-item-art" aria-hidden="true"></span><span><p class="production-item-artist"></p><p class="production-item-song"></p></span><span class="production-item-play">▶</span>`;
    const art = item.querySelector(".production-item-art");
    if (track.artwork) { art.style.backgroundImage = `url("${track.artwork}")`; }
    else art.classList.add(track.style || "art-velvet");
    item.querySelector(".production-item-artist").textContent = track.artist || "Unknown artist";
    item.querySelector(".production-item-song").textContent = `${track.title || "Unknown song"}${track.album ? ` · ${track.album}` : ""}`;
    item.addEventListener("click", () => {
      productionDialog.close();
      selectTrackForHome(track);
      if (track.previewUrl) {
        mainAudio.src = track.previewUrl;
        mainAudio.play().catch(() => {});
        playing = true;
        playButton.classList.add("playing");
      }
      helperText.textContent = `${track.title} by ${track.artist} is now playing in your home player.`;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    productionList.append(item);
  });
}

async function openProductions() {
  showDialog(productionDialog);
  if (!lastMusicResults.length && !tracks.length) await loadFeaturedMusic();
  renderProductionList();
}

function selectTrackForHome(track) {
  if (!track) return;
  mainAudio.pause();
  playing = false;
  playButton.classList.remove("playing");
  const selected = normalizeMusicTrack(track);
  tracks = [selected, ...tracks.filter((item) => item.id !== selected.id)];
  activeTrack = 0;
  renderTrack();
}

function computeMatch(track) {
  if (!selectedMood) return "— match";
  const moodGenres = {
    Chill: ["alternative", "indie", "r&b/soul", "singer/songwriter", "ambient", "jazz", "electronic"],
    Focus: ["ambient", "electronic", "classical", "instrumental", "soundtrack", "new age"],
    Energy: ["pop", "hip-hop/rap", "dance", "rock", "electronic", "latin"],
    "Feel good": ["pop", "indie pop", "soul", "funk", "reggae", "r&b/soul"]
  };
  let score = 82;
  const genre = (track.genre || "").toLowerCase();
  const aligned = moodGenres[selectedMood] || [];
  if (aligned.some(g => genre.includes(g))) score += 10;
  else score += 3;
  const hash = [...(track.id || "")].reduce((s, c) => s + c.charCodeAt(0), 0);
  score += (hash % 7) - 2;
  return `${Math.min(99, Math.max(75, score))}% match`;
}

function normalizeMusicTrack(track) {
  return { ...track, tag: track.tag || (track.genre ? track.genre.toUpperCase() : "FROM DISCOVER"), style: track.style || "art-velvet", progress: "0%", match: track.match || computeMatch(track) };
}

function renderTrack() {
  const track = tracks[activeTrack] || { id: "empty", title: "Choose a mood", artist: "Start by choosing Chill, Focus, Energy, or Feel good", tag: "YOUR MIX STARTS HERE", match: "0% match", length: "—", art: "CHOOSE<br>A MOOD", style: "art-velvet", progress: "0%" };
  trackTitle.textContent = track.title;
  trackArtist.textContent = track.artist;
  trackTag.textContent = track.tag || (track.genre ? track.genre.toUpperCase() : "SELECTED FROM DISCOVER");
  matchText.textContent = track.match || "—";
  trackLength.textContent = track.length || "—";
  if (track.art) artLabel.innerHTML = track.art;
  else artLabel.textContent = String(track.title || "SELECTED").toUpperCase().split(" ").slice(0, 3).join("\n");
  albumArt.className = `album-art ${track.style || "art-velvet"}`;
  albumArt.style.backgroundImage = track.artwork ? `linear-gradient(135deg, rgba(25,18,55,.24), rgba(25,18,55,.1)), url("${track.artwork}")` : "";
  albumArt.append(artLabel);
  progressControl.value = "0";
  progressControl.max = "1";
  progressControl.disabled = !track.previewUrl;
  progressControl.style.setProperty("--progress", "0%");
  currentTime.textContent = "0:00";
  playButton.setAttribute("aria-label", `${playing ? "Pause" : "Play"} ${track.title}`);
  const saved = Boolean(track.isSaved);
  saveButton.classList.toggle("saved", saved);
  saveButton.innerHTML = saved ? '<span aria-hidden="true">♥</span> Saved to library' : '<span aria-hidden="true">♡</span> Save for later';
  renderTasteTracks();
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function syncProgress() {
  const duration = Number.isFinite(mainAudio.duration) ? mainAudio.duration : 0;
  const value = Number.isFinite(mainAudio.currentTime) ? mainAudio.currentTime : 0;
  progressControl.max = duration || 1;
  progressControl.value = value;
  progressControl.disabled = !duration;
  progressControl.style.setProperty("--progress", `${duration ? (value / duration) * 100 : 0}%`);
  currentTime.textContent = formatTime(value);
  if (duration) trackLength.textContent = formatTime(duration);
}

function renderTasteTracks() {
  const sourceTracks = lastMusicResults.length ? lastMusicResults : tracks;
  const miniTracks = document.querySelectorAll(".mini-track");
  if (!sourceTracks.length) {
    tasteTitle.textContent = "Choose a mood to discover";
    miniTracks.forEach((button) => { button.hidden = true; });
    return;
  }
  const moodTitles = { Chill: "Mellow & relaxed", Focus: "Steady & clear", Energy: "Upbeat & moving", "Feel good": "Bright & uplifting" };
  if (selectedMood) tasteTitle.textContent = moodTitles[selectedMood] || selectedMood;
  else if (sourceTracks[0]?.source === "itunes") tasteTitle.textContent = `${sourceTracks[0].artist} · ${sourceTracks[0].album || "Selected songs"}`;
  else tasteTitle.textContent = "Dreamy production";
  miniTracks.forEach((button, index) => {
    button.hidden = false;
    const track = sourceTracks[index % sourceTracks.length];
    if (!track) return;
    button.classList.toggle("selected", index === activeTrack % 3);
    const art = button.querySelector(".mini-art");
    if (art) {
      art.className = `mini-art ${track.style || "mini-art-one"}`;
      if (track.artwork) {
        art.style.backgroundImage = `url("${track.artwork}")`;
        art.style.backgroundSize = "cover";
      } else art.style.backgroundImage = "";
    }
    button.querySelector("b").textContent = track.title;
    button.querySelector("small").textContent = track.artist;
    button.dataset.trackId = track.id;
    button.setAttribute("aria-label", `Choose ${track.title}`);
  });
}

function moveTrack(direction, message) {
  if (!tracks.length) return;
  activeTrack = (activeTrack + direction + tracks.length) % tracks.length;
  playing = false;
  mainAudio.pause();
  playButton.classList.remove("playing");
  renderTrack();
  helperText.textContent = message || `A new ${selectedMood ? selectedMood.toLowerCase() : "mood"} pick is ready for you.`;
}

async function refreshRecommendations() {
  if (!selectedMood) return;
  const result = await api(`/api/music/featured?mood=${encodeURIComponent(selectedMood)}`);
  if (result?.results?.length) {
    tracks = result.results.map(normalizeMusicTrack);
    lastMusicResults = [...tracks];
    activeTrack = 0;
    renderTrack();
  } else {
    tracks = [];
    lastMusicResults = [];
    renderTrack();
  }
}

document.querySelectorAll(".mood-chip").forEach((chip) => {
  chip.addEventListener("click", async () => {
    mainAudio.pause();
    playing = false;
    playButton.classList.remove("playing");
    document.querySelector(".mood-chip.active")?.classList.remove("active");
    chip.classList.add("active");
    selectedMood = chip.dataset.mood;
    const explanations = { Chill: "Chill finds mellow, relaxed songs for winding down.", Focus: "Focus finds steady, low-distraction songs for work or study.", Energy: "Energy finds upbeat songs for movement and momentum.", "Feel good": "Feel good finds bright, uplifting songs for a lift." };
    moodHelp.textContent = explanations[selectedMood];
    helperText.textContent = `Refreshing recommendations for a ${selectedMood.toLowerCase()} mood…`;
    await api("/api/preferences", { method: "POST", body: JSON.stringify({ userId, mood: selectedMood }) });
    await refreshRecommendations();
    helperText.textContent = `A ${selectedMood.toLowerCase()} pick, matched to your taste.`;
  });
});

playButton.addEventListener("click", () => {
  const track = tracks[activeTrack];
  if (!track.previewUrl) {
    helperText.textContent = "This catalog entry has no playable preview. Full playback requires a connected music service.";
    return;
  }
  playing = !playing;
  playButton.classList.toggle("playing", playing);
  playButton.setAttribute("aria-label", `${playing ? "Pause" : "Play"} ${track.title}`);
  if (playing) {
    if (mainAudio.src !== track.previewUrl) mainAudio.src = track.previewUrl;
    mainAudio.play().catch(() => {});
  } else mainAudio.pause();
  helperText.textContent = playing ? `Playing a preview of ${track.title}.` : "Preview paused.";
});

mainAudio.addEventListener("ended", () => {
  playing = false;
  playButton.classList.remove("playing");
  playButton.setAttribute("aria-label", `Play ${tracks[activeTrack]?.title || "song"}`);
  helperText.textContent = "Preview ended. Full playback requires a connected music service.";
});
mainAudio.addEventListener("loadedmetadata", syncProgress);
mainAudio.addEventListener("timeupdate", syncProgress);
progressControl.addEventListener("input", () => {
  mainAudio.currentTime = Number(progressControl.value);
  syncProgress();
});

$("#nextButton").addEventListener("click", () => moveTrack(1));
$("#backButton").addEventListener("click", () => moveTrack(-1));
$("#passButton").addEventListener("click", () => moveTrack(1, "Got it — we’ll make the next recommendation closer to your taste."));

saveButton.addEventListener("click", async () => {
  const track = tracks[activeTrack];
  if (!track || track.id === "empty") return;
  if (!(await ensureAuthenticated())) return;
  const willSave = !track.isSaved;
  const result = await api("/api/library", { method: "POST", body: JSON.stringify({ userId, trackId: track.id, action: willSave ? "save" : "remove", track }) });
  if (result?._error) { helperText.textContent = result._error; return; }
  track.isSaved = willSave;
  renderTrack();
  if (result?.tracks) tracks.forEach((item) => { item.isSaved = result.tracks.some((saved) => saved.id === item.id); });
  helperText.textContent = willSave ? `${track.title} was saved to your library.` : "Removed from your saved music.";
});

document.querySelectorAll(".mini-track").forEach((track) => {
  track.addEventListener("click", () => {
    const selected = [...tracks, ...lastMusicResults].find((item) => item.id === track.dataset.trackId);
    if (!selected) return;
    selectTrackForHome(selected);
    if (selected.previewUrl) {
      mainAudio.src = selected.previewUrl;
      mainAudio.play().catch(() => {});
      playing = true;
      playButton.classList.add("playing");
    }
    helperText.textContent = `${selected.title} is now playing in your home player.`;
  });
});

profileButton.addEventListener("click", () => openAccount());
$("#profileNav").addEventListener("click", () => openAccount());
$("#discoverNav").addEventListener("click", openDiscover);
$("#libraryNav").addEventListener("click", openLibrary);
$("#closeAuth").addEventListener("click", () => authDialog.close());
$("#closeDiscover").addEventListener("click", () => discoverDialog.close());
$("#closeLibrary").addEventListener("click", () => libraryDialog.close());
$("#tasteSeeAll").addEventListener("click", openProductions);
$("#closeProduction").addEventListener("click", () => productionDialog.close());
themeButton.addEventListener("click", () => {
  const next = { device: "light", light: "dark", dark: "device" }[themeMode];
  applyTheme(next);
});
loginTab.addEventListener("click", () => setAuthMode("login"));
signupTab.addEventListener("click", () => setAuthMode("signup"));

document.querySelectorAll("[data-discover-mood]").forEach((choice) => {
  choice.addEventListener("click", () => {
    const moodChip = document.querySelector(`[data-mood="${choice.dataset.discoverMood}"]`);
    discoverDialog.close();
    moodChip?.click();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

musicSearchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const term = musicSearchInput.value.trim();
  const requestId = ++musicRequestId;
  musicResults.innerHTML = '<p class="library-empty">Searching the music catalog…</p>';
  const result = await api(`/api/music/search?q=${encodeURIComponent(term)}`);
  if (requestId !== musicRequestId) return;
  if (result?._error) { musicResults.innerHTML = `<p class="library-empty">${result._error}</p>`; return; }
  renderMusicResults(result.results, result.attribution);
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authSubmit.disabled = true;
  authStatus.classList.remove("error");
  authStatus.textContent = authMode === "signup" ? "Creating your account…" : "Signing you in…";
  const form = new FormData(authForm);
  const endpoint = authMode === "signup" ? "/api/auth/register" : "/api/auth/login";
  const result = await api(endpoint, { method: "POST", body: JSON.stringify({ email: form.get("email"), password: form.get("password"), displayName: form.get("displayName") }) });
  authSubmit.disabled = false;
  if (result?._error) {
    authStatus.classList.add("error");
    authStatus.textContent = result._error;
    return;
  }
  updateAuthView(result.user);
  await refreshRecommendations();
  helperText.textContent = `Welcome to TVA, ${result.user.displayName || "listener"}.`;
});

logoutButton.addEventListener("click", async () => {
  await api("/api/auth/logout", { method: "POST" });
  updateAuthView(null);
  authDialog.close();
  helperText.textContent = "You’re signed out. Your guest recommendations are still available.";
});

renderTrack();
updateGreeting();
api("/api/me").then((result) => updateAuthView(result?.user || null));
setInterval(updateGreeting, 60_000);
loadIntroArtwork();
refreshRecommendations();
