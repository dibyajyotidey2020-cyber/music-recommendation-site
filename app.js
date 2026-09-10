let tracks = [];
let activeTrack = 0;
let playing = false;
let selectedMood = null;
let userId;
let musicRequestId = 0;
let lastMusicResults = [];
let queue = [];

const DISCOVER_BATCH_SIZE = 20;
let currentSearchTerm = "";
let currentSearchOffset = 0;
let discoverSeenTrackIds = new Set();
let discoverLoading = false;
let currentPlayedTrackId = null;

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
  let tracks = JSON.parse(localStorage.getItem(libraryKey)) || [];
  
  // Sort newest first
  tracks.sort((a, b) => {
    if (a.savedAt && b.savedAt) return new Date(b.savedAt) - new Date(a.savedAt);
    if (a.savedAt) return -1;
    if (b.savedAt) return 1;
    return 0;
  });
  
  // Get active filter
  const filterVal = window.currentLibraryFilter || 'all';
  let filteredTracks = [];
  
  if (filterVal === 'queue') {
    filteredTracks = [...queue];
  } else {
    filteredTracks = tracks.filter(t => {
      if (filterVal === 'audius') return t.source === 'audius';
      if (filterVal === 'itunes') return t.source === 'itunes';
      return true;
    });
  }
  
  const filterHtml = `
    <div class="library-filter">
      <button data-filter="all" class="filter-btn ${filterVal === 'all' ? 'selected' : ''}">All</button>
      <button data-filter="audius" class="filter-btn ${filterVal === 'audius' ? 'selected' : ''}">Audius</button>
      <button data-filter="itunes" class="filter-btn ${filterVal === 'itunes' ? 'selected' : ''}">iTunes</button>
      <button data-filter="queue" class="filter-btn ${filterVal === 'queue' ? 'selected' : ''}">Queue</button>
    </div>
  `;

  if (filteredTracks.length === 0) {
    let emptyMsg = "Your library is empty. Save songs to see them here.";
    if (filterVal === 'queue') {
      emptyMsg = "Your queue is empty. Add songs from the player to hear them next.";
    } else if (tracks.length > 0) {
      emptyMsg = `No ${filterVal === 'audius' ? 'Audius' : 'iTunes'} tracks saved yet.`;
    }
    libraryList.innerHTML = filterHtml + `<p class="library-empty">${emptyMsg}</p>`;
  } else {
    libraryList.innerHTML = filterHtml + filteredTracks.map((track, idx) => `
      <div class="library-song" data-index="${idx}">
        ${track.artwork ? `<img src="${escapeHtml(track.artwork)}" alt="${escapeHtml(track.title)}" class="library-song-art" />` : `<span class="library-song-art art-velvet" aria-hidden="true"></span>`}
        <div class="library-song-info">
          <div class="library-song-title">${escapeHtml(track.title)}</div>
          <div class="library-song-artist">${escapeHtml(track.artist)}</div>
        </div>
        <button class="library-song-play" aria-label="Play ${escapeHtml(track.title)}"><span aria-hidden="true">▶</span></button>
        <button class="library-song-remove" aria-label="Remove ${escapeHtml(track.title)}">✕</button>
        <button class="library-song-more" aria-label="More options for ${escapeHtml(track.title)}">•••</button>
      </div>
    `).join("");
  }
  
  // Bind filter buttons
  libraryList.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      window.currentLibraryFilter = e.target.dataset.filter;
      openLibrary();
    });
  });

  if (filteredTracks.length > 0) {
    const libraryElements = libraryList.querySelectorAll(".library-song");
    filteredTracks.forEach((track, idx) => {
      const el = libraryElements[idx];
      if (!el) return;
      el.querySelector(".library-song-play").addEventListener("click", async () => {
        if (filterVal === 'queue') {
          // Play from queue
          const realIdx = queue.findIndex(t => t.id === track.id);
          if (realIdx > -1) {
            queue.splice(realIdx, 1);
            selectTrackForHome(track);
            if (track.previewUrl) {
              mainAudio.src = track.previewUrl;
              mainAudio.play().catch(() => {});
              playing = true;
            }
            renderUpNextDialog();
          }
        } else {
          mainAudio.pause();
          mainAudio.src = track.previewUrl;
          const t = {...track, isSaved: true};
          activeTrack = 0;
          window.tracks = [t]; // Make it the active track array context
          renderTrack(t);
          try {
            await mainAudio.play();
          } catch (err) {}
        }
        libraryDialog.close();
      });
      el.querySelector(".library-song-remove").addEventListener("click", async () => {
        if (filterVal === 'queue') {
          const realIdx = queue.findIndex(t => t.id === track.id);
          if (realIdx > -1) {
            removeFromQueue(realIdx);
            openLibrary(); // Re-render
          }
        } else {
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
        }
      });
      el.querySelector(".library-song-more")?.addEventListener("click", (e) => toggleMoreMenu(e, track));
    });
  }
}
// openLibrary implementation moved up

let discoverSectionsCache = null;

async function buildDiscoverSections() {
  const user = JSON.parse(localStorage.getItem('tva_demo_user'));
  const libraryKey = user && user.userId ? `tva_library_${user.userId}` : 'tva_library';
  const library = JSON.parse(localStorage.getItem(libraryKey)) || [];
  const tasteProfileStr = localStorage.getItem('tva_taste_profile');
  const recentInteractionsStr = localStorage.getItem('tva_recent_interactions');
  
  const tasteProfile = tasteProfileStr ? JSON.parse(tasteProfileStr) : { genres: {}, totalInteractions: 0 };
  const recentInteractions = recentInteractionsStr ? JSON.parse(recentInteractionsStr) : [];
  
  const sections = [];
  const maxTracksPerSection = 8;
  const excludeIds = new Set(discoverSeenTrackIds);
  
  // 1. Because You Saved [Genre]
  const savedGenres = {};
  library.forEach(t => {
    if (t.genre) {
      const g = t.genre.toLowerCase();
      savedGenres[g] = (savedGenres[g] || 0) + 1;
    }
  });
  let topSavedGenre = null;
  let maxSaved = 0;
  for (const [genre, count] of Object.entries(savedGenres)) {
    if (count >= 3 && count > maxSaved) {
      topSavedGenre = genre;
      maxSaved = count;
    }
  }
  if (topSavedGenre) {
    const res = await api(`/api/music/search?q=${encodeURIComponent(topSavedGenre)}&offset=0`);
    if (res && res.results) {
      const tracks = res.results.filter(t => !excludeIds.has(t.id) && !library.some(libT => libT.id === t.id)).slice(0, maxTracksPerSection);
      if (tracks.length > 0) {
        tracks.forEach(t => excludeIds.add(t.id));
        sections.push({
          id: 'saved-genre',
          title: `Because You Saved ${topSavedGenre.charAt(0).toUpperCase() + topSavedGenre.slice(1)}`,
          tracks
        });
      }
    }
  }

  // 2. Fresh Discoveries
  const interactionsCount = tasteProfile.totalInteractions || 0;
  const hasRecentSave = library.some(t => {
    if (!t.savedAt) return false;
    const days = (new Date() - new Date(t.savedAt)) / (1000 * 60 * 60 * 24);
    return days <= 7;
  });
  if (interactionsCount >= 5 && hasRecentSave) {
    const recentGenres = {};
    recentInteractions.forEach(int => {
      if (int.genre) {
        const g = int.genre.toLowerCase();
        recentGenres[g] = (recentGenres[g] || 0) + 1;
      }
    });
    let topRecentGenre = Object.keys(recentGenres).sort((a,b) => recentGenres[b] - recentGenres[a])[0] || 'indie';
    const res = await api(`/api/music/search?q=${encodeURIComponent(topRecentGenre)}&offset=20`);
    if (res && res.results) {
       const tracks = res.results.filter(t => !excludeIds.has(t.id)).slice(0, maxTracksPerSection);
       if (tracks.length > 0) {
         tracks.forEach(t => excludeIds.add(t.id));
         sections.push({
           id: 'fresh-discoveries',
           title: `Fresh Discoveries`,
           tracks
         });
       }
    }
  }

  // 3. Explore Something Different
  if (interactionsCount >= 10 && typeof calculateTasteDrift === 'function') {
    const drift = calculateTasteDrift();
    if (drift && drift.isDrifting && drift.driftPercentage >= 20 && drift.topRecentGenres.length > 0) {
      const targetGenre = drift.topRecentGenres[0].genre;
      const res = await api(`/api/music/search?q=${encodeURIComponent(targetGenre)}&offset=10`);
      if (res && res.results) {
         const tracks = res.results.filter(t => !excludeIds.has(t.id)).slice(0, maxTracksPerSection);
         if (tracks.length > 0) {
           tracks.forEach(t => excludeIds.add(t.id));
           sections.push({
             id: 'explore',
             title: `Explore Something Different`,
             tracks
           });
         }
      }
    }
  }

  return sections;
}

function renderContextualSections(sections) {
  const container = document.getElementById("discoverContextualSections");
  if (!container) return;
  container.innerHTML = "";
  if (!sections || sections.length === 0) return;
  
  const user = JSON.parse(localStorage.getItem('tva_demo_user'));
  const libraryKey = user && user.userId ? `tva_library_${user.userId}` : 'tva_library';
  const library = JSON.parse(localStorage.getItem(libraryKey)) || [];
  const savedIds = library.map(t => t.id);

  sections.forEach(sec => {
    const secEl = document.createElement("section");
    secEl.className = "discover-section";
    secEl.innerHTML = `<h3 class="discover-section-title">${escapeHtml(sec.title)}</h3>`;
    
    sec.tracks.forEach(track => {
      discoverSeenTrackIds.add(track.id);
      lastMusicResults.push(track);
      const result = document.createElement("div");
      result.className = "music-result";
      const alreadySaved = savedIds.includes(track.id);
      const artwork = track.artwork ? `<img src="${escapeHtml(track.artwork)}" alt="" loading="lazy">` : '<span class="library-song-art art-velvet" aria-hidden="true"></span>';
      result.innerHTML = `${artwork}<span><p class="music-result-title"></p><p class="music-result-artist"></p></span><span class="music-result-actions"><button type="button" class="preview-result" aria-label="Preview song">▶</button><button type="button" class="save-result${alreadySaved ? '" data-saved="true' : ''}" aria-label="${alreadySaved ? 'Remove song' : 'Save song'}">${alreadySaved ? '♥' : '♡'}</button><button type="button" class="more-result" aria-label="More options for this song">•••</button></span>`;
      result.querySelector(".music-result-title").textContent = track.title || "Unknown song";
      result.querySelector(".music-result-artist").textContent = `${track.artist || "Unknown artist"}${track.album ? ` · ${track.album}` : ""}`;
      result.querySelector(".more-result").addEventListener("click", (e) => toggleMoreMenu(e, track));
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
            lib.push({...track, isSaved: true, savedAt: new Date().toISOString()});
            recordTasteInteraction(track, 'save');
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
      secEl.append(result);
    });
    
    container.append(secEl);
  });
}

function renderMusicResults(results, attribution = "", append = false, skipClear = false) {
  if (!append) {
    lastMusicResults = [];
    if (!skipClear) {
      discoverSeenTrackIds.clear();
      discoverSectionsCache = null;
      const sectionsContainer = document.getElementById("discoverContextualSections");
      if (sectionsContainer) sectionsContainer.innerHTML = "";
    }
    musicResults.innerHTML = "";
    renderTasteTracks();
  } else {
    const oldBtn = musicResults.querySelector(".load-more-btn");
    if (oldBtn) oldBtn.remove();
    const oldAttr = musicResults.querySelector(".music-attribution");
    if (oldAttr) oldAttr.remove();
  }

  if (!results?.length && !append) {
    musicResults.innerHTML = '<p class="library-empty">No songs found. Try another artist or title.</p>';
    return;
  }
  const user = JSON.parse(localStorage.getItem('tva_demo_user'));
  const libraryKey = user && user.userId ? `tva_library_${user.userId}` : 'tva_library';
  const library = JSON.parse(localStorage.getItem(libraryKey)) || [];
  const savedIds = library.map(t => t.id);
  
  (results || []).forEach((track) => {
    if (discoverSeenTrackIds.has(track.id)) return;
    discoverSeenTrackIds.add(track.id);
    lastMusicResults.push(track);
    const result = document.createElement("div");
    result.className = "music-result";
    const alreadySaved = savedIds.includes(track.id);
    const artwork = track.artwork ? `<img src="${escapeHtml(track.artwork)}" alt="" loading="lazy">` : '<span class="library-song-art art-velvet" aria-hidden="true"></span>';
    result.innerHTML = `${artwork}<span><p class="music-result-title"></p><p class="music-result-artist"></p></span><span class="music-result-actions"><button type="button" class="preview-result" aria-label="Preview song">▶</button><button type="button" class="save-result${alreadySaved ? '" data-saved="true' : ''}" aria-label="${alreadySaved ? 'Remove song' : 'Save song'}">${alreadySaved ? '♥' : '♡'}</button><button type="button" class="more-result" aria-label="More options for this song">•••</button></span>`;
    result.querySelector(".music-result-title").textContent = track.title || "Unknown song";
    result.querySelector(".music-result-artist").textContent = `${track.artist || "Unknown artist"}${track.album ? ` · ${track.album}` : ""}`;
    result.querySelector(".more-result").addEventListener("click", (e) => toggleMoreMenu(e, track));
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
          lib.push({...track, isSaved: true, savedAt: new Date().toISOString()});
          recordTasteInteraction(track, 'save');
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
  
  if (!append) renderTasteTracks();

  if (results && results.length >= DISCOVER_BATCH_SIZE) {
    const loadMoreBtn = document.createElement("button");
    loadMoreBtn.className = "text-button load-more-btn";
    loadMoreBtn.style.margin = "20px auto";
    loadMoreBtn.style.display = "block";
    loadMoreBtn.textContent = "Load more";
    loadMoreBtn.addEventListener("click", loadMoreDiscover);
    musicResults.append(loadMoreBtn);
  }

  if (attribution) {
    const note = document.createElement("p");
    note.className = "music-attribution";
    note.textContent = attribution;
    musicResults.append(note);
  }
}

async function loadFeaturedMusic() {
  const requestId = ++musicRequestId;
  
  if (!discoverSectionsCache) {
    discoverSeenTrackIds.clear(); // Reset before building sections
    discoverSectionsCache = await buildDiscoverSections();
  }
  if (requestId === musicRequestId) {
    renderContextualSections(discoverSectionsCache);
  }
  
  const result = await api(`/api/music/featured?mood=${encodeURIComponent(selectedMood || 'Chill')}`);
  if (result.results) {
    const skips = JSON.parse(localStorage.getItem('tva_skips')) || [];
    result.results = result.results.filter(t => !skips.includes(t.id));
  }
  
  if (result?.results && requestId === musicRequestId) renderMusicResults(result.results, "Music previews and artwork provided courtesy of iTunes.", false, true);
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

function getTasteProfile() {
  try {
    const profile = JSON.parse(localStorage.getItem('tva_taste_profile'));
    if (profile && profile.plays && profile.saves && profile.skips) return profile;
  } catch (e) {}
  return { plays: { genres: {}, artists: {} }, saves: { genres: {}, artists: {} }, skips: { genres: {}, artists: {} } };
}

function saveTasteProfile(profile) {
  localStorage.setItem('tva_taste_profile', JSON.stringify(profile));
}

function normalizeTasteString(str) {
  if (!str) return null;
  return String(str).trim().toLowerCase();
}

function recordTasteInteraction(track, type) {
  if (!track || !['play', 'save', 'skip'].includes(type)) return;
  const profile = getTasteProfile();
  const typeKey = type + 's';
  
  const genre = normalizeTasteString(track.genre);
  if (genre) {
    profile[typeKey].genres[genre] = (profile[typeKey].genres[genre] || 0) + 1;
  }
  
  const artist = normalizeTasteString(track.artist);
  if (artist) {
    profile[typeKey].artists[artist] = (profile[typeKey].artists[artist] || 0) + 1;
  }
  
  saveTasteProfile(profile);
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
  const genre = normalizeTasteString(track.genre) || "";
  const artist = normalizeTasteString(track.artist) || "";
  const aligned = moodGenres[selectedMood] || [];
  
  if (aligned.some(g => genre.includes(g))) score += 10;
  else score += 3;
  
  const hash = [...(track.id || "")].reduce((s, c) => s + c.charCodeAt(0), 0);
  score += (hash % 7) - 2;

  const profile = getTasteProfile();
  
  if (genre) {
    const playG = profile.plays.genres[genre] || 0;
    const saveG = profile.saves.genres[genre] || 0;
    const skipG = profile.skips.genres[genre] || 0;
    
    if (saveG > 0 || playG > 5) score += Math.min(8, saveG * 2 + Math.floor(playG / 2));
    if (skipG > 0) score -= Math.min(15, skipG * 3);
    
    const totalInteractions = playG + saveG + skipG;
    if (totalInteractions === 0 && (!aligned.some(g => genre.includes(g)))) score += 4;
  }

  if (artist) {
    const playA = profile.plays.artists[artist] || 0;
    const saveA = profile.saves.artists[artist] || 0;
    const skipA = profile.skips.artists[artist] || 0;
    
    if (saveA > 0 || playA > 2) score += Math.min(6, saveA * 3 + playA);
    if (skipA > 0) score -= Math.min(20, skipA * 5);
  }

  return `${Math.min(99, Math.max(10, score))}% match`;
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
  if (!track || !track.previewUrl) {
    helperText.textContent = track && track.source === 'audius' ? "This track is not streamable." : "This catalog entry has no playable preview. Full playback requires a connected music service.";
    return;
  }
  if (mainAudio.paused) {
    if (mainAudio.src !== track.previewUrl) mainAudio.src = track.previewUrl;
    mainAudio.play().catch(() => {});
  } else {
    mainAudio.pause();
  }
});

mainAudio.addEventListener("play", () => {
  playing = true;
  playButton.classList.add("playing");
  const track = tracks[activeTrack];
  if (track) playButton.setAttribute("aria-label", `Pause ${track.title}`);
});

mainAudio.addEventListener("pause", () => {
  playing = false;
  playButton.classList.remove("playing");
  const track = tracks[activeTrack];
  if (track) playButton.setAttribute("aria-label", `Play ${track.title}`);
  helperText.textContent = track && track.source === 'audius' ? "Track paused." : "Preview paused.";
});

mainAudio.addEventListener("ended", () => {
  currentPlayedTrackId = null;

  if (queue.length > 0) {
    playNextQueuedTrack();
  } else {
    moveTrack(1);
    const nt = tracks[activeTrack];
    if (nt && nt.previewUrl) {
      mainAudio.src = nt.previewUrl;
      mainAudio.play().catch(() => {
        helperText.textContent = "Autoplay blocked. Press play to start.";
      });
    }
  }
});

mainAudio.addEventListener("playing", () => {
  const active = tracks[activeTrack] || (window.tracks && window.tracks[0]);
  if (active && active.id !== currentPlayedTrackId) {
    currentPlayedTrackId = active.id;
    recordTasteInteraction(active, 'play');
  }
  helperText.textContent = (active && active.source === 'audius') ? "Playing full track..." : "Playing a preview...";
  updateMediaSession(active);
});

mainAudio.addEventListener("waiting", () => {
  helperText.textContent = "Buffering...";
});

mainAudio.addEventListener("stalled", () => {
  helperText.textContent = "Network issue, retrying...";
});

mainAudio.addEventListener("canplay", () => {
  if (helperText.textContent === "Buffering..." || helperText.textContent === "Network issue, retrying...") {
    const active = tracks[activeTrack];
    helperText.textContent = active ? (active.source === 'audius' ? "Playing full track..." : "Playing a preview...") : "";
  }
});
mainAudio.addEventListener("loadedmetadata", syncProgress);
mainAudio.addEventListener("timeupdate", syncProgress);
progressControl.addEventListener("input", () => {
  mainAudio.currentTime = Number(progressControl.value);
  syncProgress();
});

function playNextQueuedTrack() {
  if (queue.length === 0) return false;
  const nextTrack = queue.shift();
  selectTrackForHome(nextTrack);
  if (nextTrack.previewUrl) {
    mainAudio.src = nextTrack.previewUrl;
    mainAudio.play().catch(() => {
      helperText.textContent = "Playback blocked by browser. Press play to start.";
    });
    playing = true;
    playButton.classList.add("playing");
    playButton.setAttribute("aria-label", `Pause ${nextTrack.title}`);
  }
  renderUpNextDialog();
  return true;
}

$("#nextButton").addEventListener("click", () => {
  if (queue.length > 0) {
    playNextQueuedTrack();
  } else {
    moveTrack(1);
    const nt = tracks[activeTrack];
    if (nt && nt.previewUrl) {
      mainAudio.src = nt.previewUrl;
      mainAudio.play().catch(() => {});
    }
  }
});

$("#backButton").addEventListener("click", () => {
  moveTrack(-1);
  const nt = tracks[activeTrack];
  if (nt && nt.previewUrl) {
    mainAudio.src = nt.previewUrl;
    mainAudio.play().catch(() => {});
  }
});
$("#passButton").addEventListener("click", () => {
    if (tracks[activeTrack]) {
       let skips = JSON.parse(localStorage.getItem('tva_skips')) || [];
       skips.push(tracks[activeTrack].id);
       localStorage.setItem('tva_skips', JSON.stringify(skips));
       recordTasteInteraction(tracks[activeTrack], 'skip');
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
        library.push({...track, isSaved: true, savedAt: new Date().toISOString()});
        recordTasteInteraction(track, 'save');
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
let currentMenuTrack = null; // null means activeTrack

const closeMoreMenu = () => {
  if (!moreMenu) return;
  moreMenu.hidden = true;
  moreOptionsBtn?.setAttribute("aria-expanded", "false");
};

const toggleMoreMenu = (e, track = null) => {
  if (!moreMenu) return;
  e.stopPropagation();
  const isHidden = moreMenu.hidden;
  const t = track || tracks[activeTrack];
  
  if (track) {
    currentMenuTrack = track;
    e.currentTarget.parentElement.appendChild(moreMenu);
    moreMenu.style.top = '100%';
    moreMenu.style.right = '0';
  } else {
    currentMenuTrack = null;
    const trackInfo = document.querySelector('.track-info');
    if (trackInfo && moreMenu.parentElement !== trackInfo) {
      trackInfo.appendChild(moreMenu);
    }
    moreMenu.style.top = '40px';
    moreMenu.style.right = '18px';
  }

  moreMenu.hidden = !isHidden;
  if (!track) moreOptionsBtn?.setAttribute("aria-expanded", String(!isHidden));
};

moreOptionsBtn?.addEventListener("click", toggleMoreMenu);

document.addEventListener("click", (e) => {
  if (moreMenu && !moreMenu.hidden && !moreMenu.contains(e.target) && !e.target.closest('.more-button') && !e.target.closest('.more-result') && !e.target.closest('.library-song-more')) {
    closeMoreMenu();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && moreMenu && !moreMenu.hidden) {
    closeMoreMenu();
    if (!currentMenuTrack) moreOptionsBtn?.focus();
  }
});

menuPass?.addEventListener("click", () => {
  if (currentMenuTrack) {
    // For a card
    recordTasteInteraction(currentMenuTrack, 'skip');
    helperText.textContent = `Skipped ${currentMenuTrack.title}`;
  } else {
    // For main player
    $("#passButton")?.click(); 
  }
  closeMoreMenu();
});

menuShare?.addEventListener("click", async () => {
  const track = currentMenuTrack || tracks[activeTrack];
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

const menuAddQueue = $("#menuAddQueue");
menuAddQueue?.addEventListener("click", () => {
  const track = currentMenuTrack || tracks[activeTrack];
  if (track) addToQueue(track);
  closeMoreMenu();
});

const menuSaveTrack = $("#menuSaveTrack");
menuSaveTrack?.addEventListener("click", async () => {
  const track = currentMenuTrack || tracks[activeTrack];
  if (!track) return;
  if (!(await ensureAuthenticated())) return;
  
  const currentUser = JSON.parse(localStorage.getItem('tva_demo_user'));
  const libKey = currentUser && currentUser.userId ? `tva_library_${currentUser.userId}` : 'tva_library';
  let lib = JSON.parse(localStorage.getItem(libKey)) || [];
  
  if (!lib.some(t => t.id === track.id)) {
    lib.push({...track, isSaved: true, savedAt: new Date().toISOString()});
    recordTasteInteraction(track, 'save');
    localStorage.setItem(libKey, JSON.stringify(lib));
    helperText.textContent = `${track.title} was saved to your library.`;
    
    // Update main save button if the saved track is currently playing
    if (tracks[activeTrack] && tracks[activeTrack].id === track.id) {
       tracks[activeTrack].isSaved = true;
       saveButton.classList.toggle("saved", true);
       saveButton.innerHTML = '<span aria-hidden="true">♥</span> Saved to library';
    }
  } else {
    helperText.textContent = `${track.title} is already in your library.`;
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

async function loadMoreDiscover() {
  if (discoverLoading || !currentSearchTerm) return;
  const btn = document.querySelector(".load-more-btn");
  if (btn) btn.textContent = "Loading...";
  discoverLoading = true;
  const requestId = ++musicRequestId;
  currentSearchOffset += DISCOVER_BATCH_SIZE;
  const result = await api(`/api/music/search?q=${encodeURIComponent(currentSearchTerm)}&offset=${currentSearchOffset}`);
  if (requestId !== musicRequestId) return;
  discoverLoading = false;
  if (result?._error) {
    if (btn) btn.textContent = "Error. Try again.";
    return;
  }
  renderMusicResults(result.results, result.attribution, true);
}

musicSearchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const term = musicSearchInput.value.trim();
  if (!term) return;
  const requestId = ++musicRequestId;
  currentSearchTerm = term;
  currentSearchOffset = 0;
  discoverSeenTrackIds.clear();
  discoverSectionsCache = null;
  const sectionsContainer = document.getElementById("discoverContextualSections");
  if (sectionsContainer) sectionsContainer.innerHTML = "";
  discoverLoading = true;
  musicResults.innerHTML = '<p class="library-empty">Searching the music catalog…</p>';
  const result = await api(`/api/music/search?q=${encodeURIComponent(term)}&offset=${currentSearchOffset}`);
  if (requestId !== musicRequestId) return;
  discoverLoading = false;
  if (result?._error) { musicResults.innerHTML = `<p class="library-empty">${result._error}</p>`; return; }
  renderMusicResults(result.results, result.attribution, false);
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

// --- Queue & Up Next Logic ---
function addToQueue(track) {
  if (queue.some(t => t.id === track.id)) {
    helperText.textContent = "Already in queue";
    return;
  }
  queue.push({...track});
  helperText.textContent = "Added to queue";
  renderUpNextDialog();
}

function removeFromQueue(index) {
  queue.splice(index, 1);
  renderUpNextDialog();
}

function clearQueue() {
  queue = [];
  renderUpNextDialog();
}

const upNextDialog = $("#upNextDialog");
const upNextList = $("#upNextList");

$("#upNextBtn")?.addEventListener("click", () => {
  renderUpNextDialog();
  showDialog(upNextDialog);
});

$("#closeUpNext")?.addEventListener("click", () => upNextDialog.close());
$("#clearQueueBtn")?.addEventListener("click", clearQueue);

function renderUpNextDialog() {
  if (!upNextList) return;
  if (queue.length === 0) {
    upNextList.innerHTML = '<p class="library-empty">No tracks in queue.</p>';
    return;
  }
  upNextList.innerHTML = queue.map((track, i) => `
    <div class="library-song queue-item">
      ${track.artwork ? `<img src="${escapeHtml(track.artwork)}" alt="" class="library-song-art" />` : `<span class="library-song-art art-velvet" aria-hidden="true"></span>`}
      <div class="library-song-info">
        <div class="library-song-title">${escapeHtml(track.title)}</div>
        <div class="library-song-artist">${escapeHtml(track.artist)}</div>
      </div>
      <button class="library-song-play queue-item-play" data-index="${i}" aria-label="Play ${escapeHtml(track.title)}"><span aria-hidden="true">▶</span></button>
      <button class="library-song-remove queue-item-remove" data-index="${i}" aria-label="Remove ${escapeHtml(track.title)}">✕</button>
    </div>
  `).join("");

  upNextList.querySelectorAll(".queue-item-play").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.currentTarget.dataset.index, 10);
      const track = queue[idx];
      queue.splice(idx, 1);
      selectTrackForHome(track);
      if (track.previewUrl) {
        mainAudio.src = track.previewUrl;
        mainAudio.play().catch(() => {});
        playing = true;
        playButton.classList.add("playing");
      }
      renderUpNextDialog();
      upNextDialog.close();
    });
  });

  upNextList.querySelectorAll(".queue-item-remove").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.currentTarget.dataset.index, 10);
      removeFromQueue(idx);
    });
  });
}

// --- Keyboard Controls ---
document.addEventListener("keydown", (e) => {
  // Ignore if typing in input/textarea
  const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
  const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select' || document.activeElement.isContentEditable;
  const isButton = activeTag === 'button' || (document.activeElement && document.activeElement.getAttribute("role") === "button");
  
  if (isInput) return;

  if (e.code === "Enter") {
    if (document.body.classList.contains("welcome-active")) {
      e.preventDefault();
      enterButton?.click();
    }
  } else if (e.code === "Space") {
    if (document.body.classList.contains("welcome-active")) {
      e.preventDefault();
      enterButton?.click();
    } else if (!isButton) {
      e.preventDefault();
      playButton.click();
    }
  } else if (e.code === "ArrowRight") {
    $("#nextButton").click();
  } else if (e.code === "ArrowLeft") {
    $("#backButton").click();
  } else if (e.code === "Escape") {
    if (moreMenu && !moreMenu.hidden) {
      closeMoreMenu();
      e.preventDefault();
    }
  }
});

// --- Media Session API ---
function updateMediaSession(track) {
  if (!track || !('mediaSession' in navigator)) return;
  
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title || 'Unknown song',
    artist: track.artist || 'Unknown artist',
    album: track.album || '',
    artwork: track.artwork ? [
      { src: track.artwork, sizes: '512x512', type: 'image/jpeg' }
    ] : []
  });

  navigator.mediaSession.setActionHandler('play', () => {
    if (!playing) playButton.click();
  });
  navigator.mediaSession.setActionHandler('pause', () => {
    if (playing) playButton.click();
  });
  navigator.mediaSession.setActionHandler('previoustrack', () => {
    $("#backButton").click();
  });
  navigator.mediaSession.setActionHandler('nexttrack', () => {
    $("#nextButton").click();
  });
}

// --- Desktop Click-Outside Modal Close ---
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('click', (e) => {
    if (window.innerWidth >= 1024) {
      if (e.target === dialog) {
        dialog.close();
      }
    }
  });
});
