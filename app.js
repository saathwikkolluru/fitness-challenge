const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STORAGE_KEYS = {
  deviceId: "fitness_device_id",
  userId: "fitness_user_id"
};

const CRITERIA = [
  { key: "workout", label: "Workout (30+ mins)" },
  { key: "steps", label: "10,000 steps" },
  { key: "sleep", label: "7+ hours sleep" },
  { key: "protein", label: "Protein >= 1g/kg" },
  { key: "no_sugar_fried", label: "No refined sugar or fried food" },
  { key: "no_alcohol_smoking", label: "No alcohol or smoking" },
  { key: "water", label: "Water >= 2.5L" }
];

const elements = {
  tabs: document.querySelectorAll(".tab"),
  panels: document.querySelectorAll(".panel"),
  feedList: document.getElementById("feedList"),
  leaderboardList: document.getElementById("leaderboardList"),
  entryForm: document.getElementById("entryForm"),
  entryDate: document.getElementById("entryDate"),
  entryImages: document.getElementById("entryImages"),
  scorePreview: document.getElementById("scorePreview"),
  profileForm: document.getElementById("profileForm"),
  profileName: document.getElementById("profileName"),
  profileGoal: document.getElementById("profileGoal"),
  profilePhoto: document.getElementById("profilePhoto"),
  profileChip: document.getElementById("profileChip"),
  chipName: document.getElementById("chipName"),
  chipMeta: document.getElementById("chipMeta"),
  chipAvatar: document.getElementById("chipAvatar"),
  editProfileBtn: document.getElementById("editProfileBtn"),
  onboarding: document.getElementById("onboarding"),
  onboardingForm: document.getElementById("onboardingForm"),
  onboardingName: document.getElementById("onboardingName"),
  onboardingGoal: document.getElementById("onboardingGoal")
};

const state = {
  currentUser: null
};

const todayISO = new Date().toISOString().slice(0, 10);
if (elements.entryDate) {
  elements.entryDate.value = todayISO;
}

function hasConfig() {
  return (
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes("PASTE_") &&
    !SUPABASE_ANON_KEY.includes("PASTE_")
  );
}

function getDeviceId() {
  let deviceId = localStorage.getItem(STORAGE_KEYS.deviceId);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEYS.deviceId, deviceId);
  }
  return deviceId;
}

function getScore(entry) {
  return CRITERIA.reduce((total, criteria) => total + (entry[criteria.key] ? 1 : 0), 0);
}

function formatDate(dateStr) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function setActiveTab(tabId) {
  elements.tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabId);
  });
  elements.panels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabId);
  });
}

function updateChip() {
  if (!state.currentUser) return;
  elements.chipName.textContent = state.currentUser.name;
  elements.chipMeta.textContent = state.currentUser.goal || "Set your goal";
  if (state.currentUser.photo_url) {
    elements.chipAvatar.innerHTML = `<img src="${state.currentUser.photo_url}" alt="${state.currentUser.name}" />`;
  } else {
    elements.chipAvatar.textContent = state.currentUser.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
}

function updateProfileForm() {
  if (!state.currentUser) return;
  elements.profileName.value = state.currentUser.name || "";
  elements.profileGoal.value = state.currentUser.goal || "";
}

function updateScorePreview() {
  const formData = new FormData(elements.entryForm);
  const entry = {};
  CRITERIA.forEach((criteria) => {
    entry[criteria.key] = formData.get(criteria.key) === "on";
  });
  elements.scorePreview.textContent = getScore(entry);
}

async function ensureUser() {
  const deviceId = getDeviceId();
  const storedUserId = localStorage.getItem(STORAGE_KEYS.userId);

  if (storedUserId) {
    const { data } = await client.from("users").select("*").eq("id", storedUserId).single();
    if (data) {
      state.currentUser = data;
      return;
    }
  }

  const { data: existingUser } = await client
    .from("users")
    .select("*")
    .eq("device_id", deviceId)
    .single();

  if (existingUser) {
    state.currentUser = existingUser;
    localStorage.setItem(STORAGE_KEYS.userId, existingUser.id);
    return;
  }

  elements.onboarding.classList.add("show");
}

async function createUser(name, goal) {
  const deviceId = getDeviceId();
  const { data, error } = await client
    .from("users")
    .insert({
      name,
      goal: goal || null,
      device_id: deviceId
    })
    .select()
    .single();

  if (error) {
    alert("Could not create user. Please try again.");
    return;
  }

  state.currentUser = data;
  localStorage.setItem(STORAGE_KEYS.userId, data.id);
  elements.onboarding.classList.remove("show");
  updateChip();
  updateProfileForm();
  await refreshData();
}

async function uploadImages(files, folder) {
  if (!files || files.length === 0) return [];
  const uploads = [];

  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const filePath = `${folder}/${Date.now()}_${safeName}`;
    const { error } = await client.storage.from("entry-images").upload(filePath, file);
    if (error) continue;
    const { data } = client.storage.from("entry-images").getPublicUrl(filePath);
    uploads.push(data.publicUrl);
  }

  return uploads;
}

async function uploadAvatar(file) {
  if (!file || !state.currentUser) return null;
  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const filePath = `${state.currentUser.id}/${Date.now()}_${safeName}`;
  const { error } = await client.storage.from("avatars").upload(filePath, file);
  if (error) return null;
  const { data } = client.storage.from("avatars").getPublicUrl(filePath);
  return data.publicUrl;
}

async function submitEntry(event) {
  event.preventDefault();
  if (!state.currentUser) return;

  const formData = new FormData(elements.entryForm);
  const entryDate = formData.get("entryDate");
  if (!entryDate) return;

  const entry = { user_id: state.currentUser.id, entry_date: entryDate };
  CRITERIA.forEach((criteria) => {
    entry[criteria.key] = formData.get(criteria.key) === "on";
  });

  const images = await uploadImages(elements.entryImages.files, `${state.currentUser.id}/${entryDate}`);
  if (images.length > 0) {
    entry.images = images;
  }

  const { error } = await client.from("daily_entries").upsert(entry, {
    onConflict: "user_id,entry_date"
  });

  if (error) {
    alert("Unable to save entry. Please try again.");
    return;
  }

  elements.entryImages.value = "";
  await refreshData();
  setActiveTab("feed");
}

async function saveProfile(event) {
  event.preventDefault();
  if (!state.currentUser) return;

  const updates = {
    name: elements.profileName.value.trim(),
    goal: elements.profileGoal.value.trim() || null
  };

  if (!updates.name) {
    alert("Please enter a name.");
    return;
  }

  const photoFile = elements.profilePhoto.files[0];
  if (photoFile) {
    const photoUrl = await uploadAvatar(photoFile);
    if (photoUrl) {
      updates.photo_url = photoUrl;
    }
  }

  const { data, error } = await client
    .from("users")
    .update(updates)
    .eq("id", state.currentUser.id)
    .select()
    .single();

  if (error) {
    alert("Unable to update profile.");
    return;
  }

  state.currentUser = data;
  elements.profilePhoto.value = "";
  updateChip();
  updateProfileForm();
  await refreshData();
}

function renderFeed(entries) {
  if (!entries || entries.length === 0) {
    elements.feedList.innerHTML = `<div class="card">No entries yet. Be the first to post today.</div>`;
    return;
  }

  elements.feedList.innerHTML = entries
    .map((entry) => {
      const score = getScore(entry);
      const user = entry.users || {};
      const initials = (user.name || "?")
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      const badges = CRITERIA.map((criteria) => {
        const done = entry[criteria.key];
        return `<span class="badge ${done ? "" : "missed"}">${criteria.label}</span>`;
      }).join("");

      const images = Array.isArray(entry.images)
        ? `<div class="image-grid">${entry.images
            .map((url) => `<img src="${url}" alt="entry image" />`)
            .join("")}</div>`
        : "";

      return `
        <div class="card feed-card">
          <div class="feed-header">
            <div class="feed-user">
              <div class="avatar">${user.photo_url ? `<img src="${user.photo_url}" alt="${user.name}" />` : initials}</div>
              <div>
                <div>${user.name || "Anonymous"}</div>
                <div class="feed-meta">${formatDate(entry.entry_date)}</div>
              </div>
            </div>
            <div class="score-preview">${score}/7</div>
          </div>
          <div class="badges">${badges}</div>
          ${images}
        </div>
      `;
    })
    .join("");
}

function renderLeaderboard(entries) {
  const totals = new Map();

  entries.forEach((entry) => {
    const user = entry.users || {};
    if (!user.id) return;
    const current = totals.get(user.id) || {
      id: user.id,
      name: user.name,
      photo_url: user.photo_url,
      score: 0
    };
    current.score += getScore(entry);
    totals.set(user.id, current);
  });

  const ranked = Array.from(totals.values()).sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    elements.leaderboardList.innerHTML = `<div class="card">No scores yet. Start by posting today.</div>`;
    return;
  }

  elements.leaderboardList.innerHTML = ranked
    .map((user, index) => {
      const initials = (user.name || "?")
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      return `
        <div class="leaderboard-row">
          <div class="leaderboard-left">
            <div class="rank">#${index + 1}</div>
            <div class="avatar">${user.photo_url ? `<img src="${user.photo_url}" alt="${user.name}" />` : initials}</div>
            <div>${user.name}</div>
          </div>
          <div class="total-score">${user.score} pts</div>
        </div>
      `;
    })
    .join("");
}

async function refreshData() {
  const { data } = await client
    .from("daily_entries")
    .select("id, entry_date, workout, steps, sleep, protein, no_sugar_fried, no_alcohol_smoking, water, images, created_at, users(id, name, photo_url)")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  renderFeed(data || []);
  renderLeaderboard(data || []);
}

function bindEvents() {
  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => setActiveTab(tab.dataset.tab));
  });

  elements.entryForm.addEventListener("change", updateScorePreview);
  elements.entryForm.addEventListener("submit", submitEntry);
  elements.profileForm.addEventListener("submit", saveProfile);
  elements.editProfileBtn.addEventListener("click", () => setActiveTab("profile"));

  elements.onboardingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = elements.onboardingName.value.trim();
    const goal = elements.onboardingGoal.value.trim();
    if (!name) return;
    createUser(name, goal);
  });
}

async function init() {
  if (!hasConfig()) {
    alert("Add your Supabase URL and anon key in config.js before using the app.");
    return;
  }

  bindEvents();
  updateScorePreview();
  await ensureUser();

  if (state.currentUser) {
    updateChip();
    updateProfileForm();
  }

  await refreshData();
}

init();
