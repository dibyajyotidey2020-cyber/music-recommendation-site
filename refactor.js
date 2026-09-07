const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

code = code.replace(
  /async function openAccount\(message = \"\"\) \{[\s\S]*?updateAuthView\(result\?.user \|\| null\);\n\}/,
  `function openAccount(message = "") {
  const user = JSON.parse(localStorage.getItem('tva_demo_user'));
  authMessage.textContent = message;
  authMessage.style.display = message ? 'block' : 'none';
  if (!user) {
    switchToLogin();
  }
  authModal.showModal();
  updateAuthView(user);
}`
);

code = code.replace(
  /async function ensureAuthenticated\(\) \{[\s\S]*?return false;\n\}/,
  `function ensureAuthenticated() {
  const user = JSON.parse(localStorage.getItem('tva_demo_user'));
  if (user) return true;
  openAccount('Create an account or log in before saving music.');
  return false;
}`
);

code = code.replace(
  /authForm\.addEventListener\(\"submit\", async \(e\) => \{[\s\S]*?\}\);/,
  `authForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const form = new FormData(authForm);
  const email = form.get("email").trim();
  const password = form.get("password");
  
  if (!email || !password) {
    authError.textContent = "Please fill out all fields.";
    return;
  }
  
  if (isLoginMode) {
    if (password.length < 4) {
      authError.textContent = "Invalid demo credentials.";
      return;
    }
  } else {
    if (password.length < 8) {
      authError.textContent = "Password must be at least 8 characters.";
      return;
    }
  }
  
  const user = { 
    userId: crypto.randomUUID(), 
    email, 
    displayName: form.get("displayName") || "Demo User" 
  };
  
  localStorage.setItem("tva_demo_user", JSON.stringify(user));
  updateAuthView(user);
  setTimeout(() => {
    authModal.close();
    authError.textContent = "";
    authForm.reset();
  }, 100);
});`
);

code = code.replace(
  /logoutButton\.addEventListener\(\"click\", async \(\) => \{[\s\S]*?\}\);/,
  `logoutButton.addEventListener("click", () => {
  localStorage.removeItem("tva_demo_user");
  updateAuthView(null);
  authModal.close();
  // Call openLibrary if it's currently open to close it
  try { libraryModal.close(); } catch(e) {}
});`
);

code = code.replace(
  /api\(\"\/api\/me\"\)\.then\(\(result\) => updateAuthView\(result\?\.user \|\| null\)\);/,
  `updateAuthView(JSON.parse(localStorage.getItem('tva_demo_user')));`
);

code = code.replace(
  /forgotForm\.addEventListener\(\"submit\", async \(e\) => \{[\s\S]*?\}\);/,
  `forgotForm.addEventListener("submit", (e) => {
  e.preventDefault();
  forgotError.style.color = "var(--text-secondary)";
  forgotError.textContent = "Password recovery is unavailable in Demo Mode.";
});`
);

code = code.replace(
  /resetForm\.addEventListener\(\"submit\", async \(e\) => \{[\s\S]*?\}\);/,
  `resetForm.addEventListener("submit", (e) => {
  e.preventDefault();
});`
);

// Library Replacements
code = code.replace(
  /saveButton\.addEventListener\(\"click\", async \(\) => \{[\s\S]*?\}\);/,
  `saveButton.addEventListener("click", async () => {
  if (!tracks[activeTrack]) return;
  const track = tracks[activeTrack];
  const willSave = !saveButton.classList.contains("saved");

  if (!(await ensureAuthenticated())) return;

  saveButton.disabled = true;
  const originalHtml = saveButton.innerHTML;
  saveButton.innerHTML = "<span aria-hidden='true'>⏳</span> Saving...";

  try {
    let library = JSON.parse(localStorage.getItem('tva_library')) || [];
    if (willSave) {
      if (!library.some(t => t.id === track.id)) {
        library.push({...track, isSaved: true});
      }
    } else {
      library = library.filter(t => t.id !== track.id);
    }
    localStorage.setItem('tva_library', JSON.stringify(library));
    
    track.isSaved = willSave;
    updateSaveButton(willSave);
  } finally {
    saveButton.disabled = false;
  }
});`
);

code = code.replace(
  /async function openLibrary\(\) \{[\s\S]*?\n\}/,
  `async function openLibrary() {
  if (!(await ensureAuthenticated())) return;
  libraryModal.showModal();
  
  const tracks = JSON.parse(localStorage.getItem('tva_library')) || [];
  
  if (tracks.length === 0) {
    libraryEmpty.style.display = "block";
    libraryTracks.innerHTML = "";
    return;
  }
  
  libraryEmpty.style.display = "none";
  libraryTracks.innerHTML = tracks.map(track => \`
    <div class="library-song">
      <img src="\${track.artwork}" alt="\${escapeHtml(track.title)}" class="library-song-art" />
      <div class="library-song-info">
        <div class="library-song-title">\${escapeHtml(track.title)}</div>
        <div class="library-song-artist">\${escapeHtml(track.artist)}</div>
      </div>
      <button class="library-song-play" aria-label="Play \${escapeHtml(track.title)}"><span aria-hidden="true">▶</span></button>
      <button class="library-song-remove" aria-label="Remove \${escapeHtml(track.title)} from library">✕</button>
    </div>
  \`).join("");
  
  const libraryElements = libraryTracks.querySelectorAll(".library-song");
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
        updatePlayButton(true);
      } catch (err) {}
      libraryModal.close();
    });
    el.querySelector(".library-song-remove").addEventListener("click", async () => {
      let lib = JSON.parse(localStorage.getItem('tva_library')) || [];
      lib = lib.filter(t => t.id !== track.id);
      localStorage.setItem('tva_library', JSON.stringify(lib));
      
      // Update UI if the deleted track is currently playing
      if (window.tracks && window.tracks[activeTrack] && window.tracks[activeTrack].id === track.id) {
         window.tracks[activeTrack].isSaved = false;
         updateSaveButton(false);
      }
      openLibrary(); // Re-render
    });
  });
}`
);

// Not for me skipping
code = code.replace(
  /\$\(\"\#passButton\"\)\.addEventListener\(\"click\", \(\) => moveTrack\(1, \"Got it — we’ll make the next recommendation closer to your taste\.\"\)\);/,
  `$("#passButton").addEventListener("click", () => {
    if (tracks[activeTrack]) {
       let skips = JSON.parse(localStorage.getItem('tva_skips')) || [];
       skips.push(tracks[activeTrack].id);
       localStorage.setItem('tva_skips', JSON.stringify(skips));
    }
    moveTrack(1, "Got it — we’ll make the next recommendation closer to your taste.");
  });`
);

// Second loadFeaturedMusic
code = code.replace(
  /const result = await api\(\"\/api\/music\/featured\?mood=Chill\"\);/,
  `const result = await api("/api/music/featured?mood=Chill");
  if (result.results) {
    const skips = JSON.parse(localStorage.getItem('tva_skips')) || [];
    result.results = result.results.filter(t => !skips.includes(t.id));
  }`
);

// Replace ALL occurrences of mood fetching to add skips logic.
code = code.replace(
  /const result = await api\(`\/api\/music\/featured\?mood=\$\{encodeURIComponent\(selectedMood\)\}`\);/g,
  `const result = await api(\`/api/music/featured?mood=\${encodeURIComponent(selectedMood)}\`);
  if (result.results) {
    const skips = JSON.parse(localStorage.getItem('tva_skips')) || [];
    result.results = result.results.filter(t => !skips.includes(t.id));
  }`
);


// Make save status sync from localStorage
code = code.replace(
  /function renderTrack\(track\) \{/,
  `function renderTrack(track) {
  const lib = JSON.parse(localStorage.getItem('tva_library')) || [];
  track.isSaved = lib.some(t => t.id === track.id);`
);

// Change label to Demo Mode
code = code.replace(
  /authSubtitle\.textContent = \"Welcome back\.\";/,
  `authSubtitle.textContent = "Welcome back to Demo Mode.";`
);
code = code.replace(
  /authSubtitle\.textContent = \"Join TVA today\.\";/,
  `authSubtitle.textContent = "Join TVA Demo today.";`
);

fs.writeFileSync('app.js', code);
