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
const moreOptionsBtn = $("#moreOptionsBtn");
const moreMenu = $("#moreMenu");
const menuShare = $("#menuShare");
const menuApple = $("#menuApple");
const menuPass = $("#menuPass");
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
const forgotPasswordBtn = $("#forgotPasswordBtn");
const forgotDialog = $("#forgotDialog");
const forgotForm = $("#forgotForm");
const forgotStatus = $("#forgotStatus");
const closeForgot = $("#closeForgot");
const backToLoginBtn = $("#backToLoginBtn");
const resetDialog = $("#resetDialog");
const resetForm = $("#resetForm");
const resetStatus = $("#resetStatus");
const backToLoginFromResetBtn = $("#backToLoginFromResetBtn");
let currentResetToken = null;
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
let authMode = "login";
let currentUser = null;

let splashClosed = false;

const welcomeScreen = $("#welcomeScreen");
const enterButton = $("#enterButton");

function closeSplash() {
  if (splashClosed || !splashScreen) return;
  splashClosed = true;
  splashScreen.classList.add("is-hidden");
  window.setTimeout(() => splashScreen.remove(), 500);
}

const revealSplash = () => window.setTimeout(closeSplash, 8000);

function startExperience() {
  if (welcomeScreen) {
    welcomeScreen.classList.add("is-hidden");
    setTimeout(() => welcomeScreen.remove(), 600);
  }
  document.body.classList.remove("welcome-active");
  revealSplash();
}

enterButton?.addEventListener("click", startExperience);

// The opener has no visible skip control; any tap/click on the full-screen scene
// quietly takes the listener to TVA.
splashScreen?.addEventListener("pointerup", closeSplash, { passive: true });

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
  let name = "listener";
  if (currentUser) {
    let displayName = currentUser.displayName;
    if (!displayName || !displayName.trim()) {
      displayName = currentUser.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    name = displayName;
  }
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

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
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
    let displayName = user.displayName;
    if (!displayName || !displayName.trim()) {
      displayName = user.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    const initials = (displayName || "A").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    profileButton.querySelector("span").textContent = initials;
    authTitle.textContent = `Hi, ${displayName}`;
    authSubtitle.textContent = "Manage your account and library.";
    
    const profileNameDisplay = document.getElementById("profileNameDisplay");
    const profileEmailDisplay = document.getElementById("profileEmailDisplay");
    if (profileNameDisplay) profileNameDisplay.textContent = displayName;
    if (profileEmailDisplay) profileEmailDisplay.textContent = user.email;

    authForm.hidden = true;
    signedIn.hidden = false;
  } else {
    profileButton.querySelector("span").textContent = "A";
    authForm.hidden = false;
    signedIn.hidden = true;
    setAuthMode("login");
  }
}

function openAccount(message = "") {
  const user = JSON.parse(localStorage.getItem('tva_demo_user'));
  updateAuthView(user);
  if (message) {
    authStatus.classList.add("error");
    authStatus.textContent = message;
  }
  if (typeof authDialog.showModal === "function") authDialog.showModal();
  else authDialog.setAttribute("open", "");
}

function ensureAuthenticated() {
  const user = JSON.parse(localStorage.getItem('tva_demo_user'));
  if (user) return true;
  openAccount('Create an account or log in before saving music.');
  return false;
}

function showDialog(dialog) {
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

async function openLibrary() {
  if (!(await ensureAuthenticated())) return;
  libraryDialog.showModal();
  
  const user = JSON.parse(localStorage.getItem('tva_demo_user'));
  const libraryKey = user && user.userId ? `tva_library_${user.userId}` : 'tva_library';
  const tracks = JSON.parse(localStorage.getItem(libraryKey)) || [];
  
  if (tracks.length === 0) {
    libraryList.innerHTML = '<p class="library-empty">Your library is empty. Save songs to see them here.</p>';
    return;
  }
  
  libraryList.innerHTML = tracks.map(track => `
    <div class="library-song">
      <img src="${escapeHtml(track.artwork)}" alt="${escapeHtml(track.title)}" class="library-song-art" />
      <div class="library-song-info">
        <div class="library-song-title">${escapeHtml(track.title)}</div>
        <div class="library-song-artist">${escapeHtml(track.artist)}</div>
      </div>
      <button class="library-song-play" aria-label="Play ${escapeHtml(track.title)}"><span aria-hidden="true">▶</span></button>
      <button class="library-song-remove" aria-label="Remove ${escapeHtml(track.title)} from library">✕</button>
    </div>
  `).join("");
  
  const libraryElements = libraryList.querySelectorAll(".library-song");
  tracks.forEach((track, idx) => {
    const el = libraryElements[idx];
    el.querySelector(".library-song-play").addEventListener("click", async () => {
      mainAudio.pause();
      mainAudio.src = track.previewUrl;
      const t = {...track, isSaved: true};
      activeTrack = 0;
      window.tracks = [t]; // Make it the active track array context
      renderTrack(t);
      try {
        await mainAudio.play();
        updatePlayButton && updatePlayButton(true);
        playButton.classList.add("playing");
      } catch (err) {}
      libraryDialog.close();
    });
    el.querySelector(".library-song-remove").addEventListener("click", async () => {
      let lib = JSON.parse(localStorage.getItem(libraryKey)) || [];
      lib = lib.filter(t => t.id !== track.id);
      localStorage.setItem(libraryKey, JSON.stringify(lib));
      
      // Update UI if the deleted track is currently playing
      if (window.tracks && window.tracks[activeTrack] && window.tracks[activeTrack].id === track.id) {
         window.tracks[activeTrack].isSaved = false;
         saveButton.classList.toggle("saved", false);
         saveButton.innerHTML = '<span aria-hidden="true">♡</span> Save for later';
      }
      openLibrary(); // Re-render
    });
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
  const user = JSON.parse(localStorage.getItem('tva_demo_user'));
  const libraryKey = user && user.userId ? `tva_library_${user.userId}` : 'tva_library';
  const library = JSON.parse(localStorage.getItem(libraryKey)) || [];
  const savedIds = library.map(t => t.id);
  
  results.forEach((track) => {
    const result = document.createElement("div");
    result.className = "music-result";
    const alreadySaved = savedIds.includes(track.id);
    const artwork = track.artwork ? `<img src="${escapeHtml(track.artwork)}" alt="" loading="lazy">` : '<span class="library-song-art art-velvet" aria-hidden="true"></span>';
    result.innerHTML = `${artwork}<span><p class="music-result-title"></p><p class="music-result-artist"></p></span><span class="music-result-actions"><button type="button" class="preview-result" aria-label="Preview song">▶</button><button type="button" class="save-result${alreadySaved ? '" data-saved="true' : ''}" aria-label="${alreadySaved ? 'Remove song' : 'Save song'}">${alreadySaved ? '♥' : '♡'}</button>${track.storeUrl ? `<a href="${escapeHtml(track.storeUrl)}" target="_blank" rel="noopener" aria-label="Open song page">↗</a>` : ""}</span>`;
    result.querySelector(".music-result-title").textContent = track.title || "Unknown song";
    result.querySelector(".music-result-artist").textContent = `${track.artist || "Unknown artist"}${track.album ? ` · ${track.album}` : ""}`;
    result.querySelector(".preview-result").addEventListener("click", async () => {
      selectTrackForHome(track);
      if (!track.previewUrl) { helperText.textContent = track.source === 'audius' ? "This track is not streamable." : "A preview is not available for this song."; return; }
      mainAudio.src = track.previewUrl;
      await mainAudio.play().catch(() => {});
      playing = true;
      playButton.classList.add("playing");
      playButton.setAttribute("aria-label", `Pause ${track.title}`);
      helperText.textContent = track.source === 'audius' ? `Playing full track: ${track.title} in your home player.` : `Playing a preview of ${track.title} in your home player.`;
    });
    result.querySelector(".save-result").addEventListener("click", async (event) => {
      const button = event.currentTarget;
      if (!(await ensureAuthenticated())) return;
      const saved = button.dataset.saved === "true";
      
      const currentUser = JSON.parse(localStorage.getItem('tva_demo_user'));
      const libKey = currentUser && currentUser.userId ? `tva_library_${currentUser.userId}` : 'tva_library';
      let lib = JSON.parse(localStorage.getItem(libKey)) || [];
      
      if (saved) {
        lib = lib.filter(t => t.id !== track.id);
      } else {
        if (!lib.some(t => t.id === track.id)) {
          lib.push({...track, isSaved: true});
        }
      }
      localStorage.setItem(libKey, JSON.stringify(lib));
      
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
  if (result.results) {
    const skips = JSON.parse(localStorage.getItem('tva_skips')) || [];
    result.results = result.results.filter(t => !skips.includes(t.id));
  }
  if (result?.results && requestId === musicRequestId) renderMusicResults(result.results, "Music previews and artwork provided courtesy of iTunes.");
}

async function loadIntroArtwork() {
  const result = await api("/api/music/featured?mood=Chill");
  if (result.results) {
    const skips = JSON.parse(localStorage.getItem('tva_skips')) || [];
    result.results = result.results.filter(t => !skips.includes(t.id));
  }
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
  
  const user = JSON.parse(localStorage.getItem('tva_demo_user'));
  const libraryKey = user && user.userId ? `tva_library_${user.userId}` : 'tva_library';
  const library = JSON.parse(localStorage.getItem(libraryKey)) || [];
  const saved = library.some(t => t.id === track.id);
  
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
  if (result.results) {
    const skips = JSON.parse(localStorage.getItem('tva_skips')) || [];
    result.results = result.results.filter(t => !skips.includes(t.id));
  }
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
    helperText.textContent = track.source === 'audius' ? "This track is not streamable." : "This catalog entry has no playable preview. Full playback requires a connected music service.";
    return;
  }
  playing = !playing;
  playButton.classList.toggle("playing", playing);
  playButton.setAttribute("aria-label", `${playing ? "Pause" : "Play"} ${track.title}`);
  if (playing) {
    if (mainAudio.src !== track.previewUrl) mainAudio.src = track.previewUrl;
    mainAudio.play().catch(() => {});
  } else mainAudio.pause();
  helperText.textContent = playing ? (track.source === 'audius' ? `Playing full track: ${track.title}.` : `Playing a preview of ${track.title}.`) : (track.source === 'audius' ? "Track paused." : "Preview paused.");
});

mainAudio.addEventListener("ended", () => {
  playing = false;
  playButton.classList.remove("playing");
  playButton.setAttribute("aria-label", `Play ${tracks[activeTrack]?.title || "song"}`);
  helperText.textContent = tracks[activeTrack]?.source === 'audius' ? "Track ended." : "Preview ended. Full playback requires a connected music service.";
});
mainAudio.addEventListener("loadedmetadata", syncProgress);
mainAudio.addEventListener("timeupdate", syncProgress);
progressControl.addEventListener("input", () => {
  mainAudio.currentTime = Number(progressControl.value);
  syncProgress();
});

$("#nextButton").addEventListener("click", () => moveTrack(1));
$("#backButton").addEventListener("click", () => moveTrack(-1));
$("#passButton").addEventListener("click", () => {
    if (tracks[activeTrack]) {
       let skips = JSON.parse(localStorage.getItem('tva_skips')) || [];
       skips.push(tracks[activeTrack].id);
       localStorage.setItem('tva_skips', JSON.stringify(skips));
    }
    moveTrack(1, "Got it — we’ll make the next recommendation closer to your taste.");
  });

saveButton.addEventListener("click", async () => {
  if (!tracks[activeTrack]) return;
  const track = tracks[activeTrack];
  const willSave = !saveButton.classList.contains("saved");

  if (!(await ensureAuthenticated())) return;

  saveButton.disabled = true;
  const originalHtml = saveButton.innerHTML;
  saveButton.innerHTML = "<span aria-hidden='true'>⏳</span> Saving...";

  try {
    const user = JSON.parse(localStorage.getItem('tva_demo_user'));
    const libraryKey = user && user.userId ? `tva_library_${user.userId}` : 'tva_library';
    let library = JSON.parse(localStorage.getItem(libraryKey)) || [];
    
    if (willSave) {
      if (!library.some(t => t.id === track.id)) {
        library.push({...track, isSaved: true});
      }
    } else {
      library = library.filter(t => t.id !== track.id);
    }
    localStorage.setItem(libraryKey, JSON.stringify(library));
    
    track.isSaved = willSave;
    saveButton.classList.toggle("saved", willSave);
    saveButton.innerHTML = willSave ? '<span aria-hidden="true">♥</span> Saved to library' : '<span aria-hidden="true">♡</span> Save for later';
  } finally {
    saveButton.disabled = false;
  }
});

// More Options Menu Logic
const closeMoreMenu = () => {
  if (!moreMenu) return;
  moreMenu.hidden = true;
  moreOptionsBtn?.setAttribute("aria-expanded", "false");
};

const toggleMoreMenu = (e) => {
  if (!moreMenu) return;
  e.stopPropagation();
  const isHidden = moreMenu.hidden;
  moreMenu.hidden = !isHidden;
  moreOptionsBtn?.setAttribute("aria-expanded", String(isHidden));
};

moreOptionsBtn?.addEventListener("click", toggleMoreMenu);

document.addEventListener("click", (e) => {
  if (moreMenu && !moreMenu.hidden && !moreMenu.contains(e.target) && e.target !== moreOptionsBtn) {
    closeMoreMenu();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && moreMenu && !moreMenu.hidden) {
    closeMoreMenu();
    moreOptionsBtn?.focus();
  }
});


menuPass?.addEventListener("click", () => { $("#passButton")?.click(); closeMoreMenu(); });

menuApple?.addEventListener("click", () => {
  const track = tracks[activeTrack];
  if (track && track.storeUrl) {
    window.open(track.storeUrl, "_blank");
  } else {
    helperText.textContent = "Apple Music link not available for this track.";
  }
  closeMoreMenu();
});

menuShare?.addEventListener("click", async () => {
  const track = tracks[activeTrack];
  if (!track) return;
  const shareUrl = track.storeUrl || window.location.href;
  try {
    if (navigator.share) {
      await navigator.share({
        title: track.title,
        text: `Listen to ${track.title} by ${track.artist} on TVA`,
        url: shareUrl
      });
    } else {
      await navigator.clipboard.writeText(shareUrl);
      helperText.textContent = "Link copied to clipboard!";
    }
  } catch (err) {
    if (err.name !== "AbortError") console.error("Error sharing:", err);
  }
  closeMoreMenu();
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
closeForgot?.addEventListener("click", () => forgotDialog.close());
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
  
  const email = form.get("email").trim();
  const password = form.get("password");
  
  if (!email || !password) {
    authStatus.classList.add("error");
    authStatus.textContent = "Please fill out all fields.";
    authSubmit.disabled = false;
    return;
  }
  
  const user = { 
    userId: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(), 
    email, 
    displayName: form.get("displayName") || "" 
  };
  
  localStorage.setItem("tva_demo_user", JSON.stringify(user));
  authSubmit.disabled = false;
  
  updateAuthView(user);
  await refreshRecommendations();
  helperText.textContent = `Welcome to TVA, ${user.displayName || user.email.split('@')[0] || "listener"}.`;
});

logoutButton.addEventListener("click", () => {
  localStorage.removeItem("tva_demo_user");
  updateAuthView(null);
  try { authDialog.close(); } catch(e) {}
  // Call openLibrary if it's currently open to close it
  try { libraryDialog.close(); } catch(e) {}
});


renderTrack();
updateGreeting();
updateAuthView(JSON.parse(localStorage.getItem('tva_demo_user')));
setInterval(updateGreeting, 60_000);
loadIntroArtwork();
refreshRecommendations();

forgotPasswordBtn?.addEventListener("click", () => {
  authDialog.close();
  showDialog(forgotDialog);
});

backToLoginBtn?.addEventListener("click", () => {
  forgotDialog.close();
  showDialog(authDialog);
});

backToLoginFromResetBtn?.addEventListener("click", () => {
  resetDialog.close();
  showDialog(authDialog);
});

forgotForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitBtn = forgotForm.querySelector("button[type='submit']");
  submitBtn.disabled = true;
  forgotStatus.classList.remove("error");
  forgotStatus.textContent = "Sending...";
  const email = new FormData(forgotForm).get("email");
  const result = await api("/api/auth/forgot", { method: "POST", body: JSON.stringify({ email }) });
  submitBtn.disabled = false;
  if (result?._error) {
    forgotStatus.classList.add("error");
    forgotStatus.textContent = result._error;
  } else {
    forgotStatus.textContent = result.message || "Instructions sent.";
  }
});

resetForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(resetForm);
  const password = form.get("password");
  const confirm = form.get("confirmPassword");
  
  if (password !== confirm) {
    resetStatus.classList.add("error");
    resetStatus.textContent = "Passwords do not match.";
    return;
  }
  
  const submitBtn = resetForm.querySelector("button[type='submit']");
  submitBtn.disabled = true;
  resetStatus.classList.remove("error");
  resetStatus.textContent = "Updating password...";
  
  const result = await api("/api/auth/reset", { method: "POST", body: JSON.stringify({ token: currentResetToken, password }) });
  submitBtn.disabled = false;
  
  if (result?._error) {
    resetStatus.classList.add("error");
    resetStatus.textContent = result._error;
  } else {
    resetStatus.textContent = result.message || "Password updated successfully.";
    backToLoginFromResetBtn.hidden = false;
    submitBtn.hidden = true;
  }
});

// Check for reset token in URL on load
const urlParams = new URLSearchParams(window.location.search);
const resetTokenParam = urlParams.get("reset");
if (resetTokenParam) {
  currentResetToken = resetTokenParam;
  // remove token from URL
  window.history.replaceState({}, document.title, window.location.pathname);
  setTimeout(() => showDialog(resetDialog), 500);
}
