// ==============================
// GYMTRACK — DATA SOURCE
// ==============================
const DATA_URL =
  "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/data/exercises.json";
const MEDIA_BASE =
  "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/";

let allExercises = [];
let filteredExercises = [];
let visibleCount = 30;
let selectedCategory = "All";
let selectedEquipment = "All";
let currentDetail = null;
let todayLog = [];

// ==============================
// INIT
// ==============================
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("exerciseSearch")
    .addEventListener("input", applyFilters);
  loadExercises();
  loadTodayLog();
});

// ==============================
// FETCH EXERCISE DATA
// ==============================
async function loadExercises() {
  try {
    // Check if we already cached the data today
    const cached = localStorage.getItem("gymtrackExerciseCache");
    const cachedDate = localStorage.getItem("gymtrackExerciseCacheDate");
    const today = new Date().toDateString();

    if (cached && cachedDate === today) {
      allExercises = JSON.parse(cached);
    } else {
      const response = await fetch(DATA_URL);
      allExercises = await response.json();

      // Try to cache it — wrapped in try/catch since the file is large
      try {
        localStorage.setItem(
          "gymtrackExerciseCache",
          JSON.stringify(allExercises),
        );
        localStorage.setItem("gymtrackExerciseCacheDate", today);
      } catch (storageErr) {
        console.log(
          "Cache skipped — dataset too large for localStorage, that's okay!",
        );
      }
    }

    document.getElementById("loadingState").style.display = "none";
    renderCategoryFilters();
    renderEquipmentFilters();
    applyFilters();
  } catch (err) {
    document.getElementById("loadingState").innerHTML =
      "<p>⚠️ Could not load exercises. Check your internet connection and refresh.</p>";
    console.error(err);
  }
}

// ==============================
// FILTERS
// ==============================
function renderCategoryFilters() {
  const categories = [
    "All",
    ...new Set(allExercises.map((e) => e.category)),
  ].sort();
  const select = document.getElementById("categorySelect");
  select.innerHTML = categories
    .map(
      (cat) =>
        `<option value="${cat}" ${cat === selectedCategory ? "selected" : ""}>
            ${cat === "All" ? "All Muscle Groups" : cat}
        </option>`,
    )
    .join("");
}

function renderEquipmentFilters() {
  const equipment = [
    "All",
    ...new Set(allExercises.map((e) => e.equipment)),
  ].sort();
  const select = document.getElementById("equipmentSelect");
  select.innerHTML = equipment
    .map(
      (eq) =>
        `<option value="${eq}" ${eq === selectedEquipment ? "selected" : ""}>
            ${eq === "All" ? "All Equipment" : eq}
        </option>`,
    )
    .join("");
}

function setCategory(cat) {
  selectedCategory = cat;
  applyFilters();
}

function setEquipment(eq) {
  selectedEquipment = eq;
  applyFilters();
}

function applyFilters() {
  const query = document
    .getElementById("exerciseSearch")
    .value.toLowerCase()
    .trim();

  filteredExercises = allExercises.filter((ex) => {
    const matchesQuery = !query || ex.name.toLowerCase().includes(query);
    const matchesCategory =
      selectedCategory === "All" || ex.category === selectedCategory;
    const matchesEquipment =
      selectedEquipment === "All" || ex.equipment === selectedEquipment;
    return matchesQuery && matchesCategory && matchesEquipment;
  });

  visibleCount = 30;
  renderGrid();
}

// ==============================
// RENDER GRID
// ==============================
function renderGrid() {
  const grid = document.getElementById("exerciseGrid");
  const emptyState = document.getElementById("emptyState");
  const loadMoreBtn = document.getElementById("loadMoreBtn");

  if (!filteredExercises.length) {
    grid.innerHTML = "";
    emptyState.style.display = "block";
    loadMoreBtn.style.display = "none";
    return;
  }

  emptyState.style.display = "none";
  const toShow = filteredExercises.slice(0, visibleCount);

  grid.innerHTML = toShow
    .map(
      (ex) => `
        <div class="exercise-card" onclick="openDetail('${ex.id}')">
            <img src="${MEDIA_BASE}${ex.image}" alt="${ex.name}" loading="lazy">
            <div class="exercise-card-info">
                <div class="exercise-card-name">${ex.name}</div>
                <div class="exercise-card-meta">${ex.category} · ${ex.equipment}</div>
            </div>
        </div>
    `,
    )
    .join("");

  loadMoreBtn.style.display =
    visibleCount < filteredExercises.length ? "block" : "none";
}

function loadMore() {
  visibleCount += 30;
  renderGrid();
}

// ==============================
// EXERCISE DETAIL
// ==============================
function openDetail(id) {
  currentDetail = allExercises.find((e) => e.id === id);
  if (!currentDetail) return;

  document.getElementById("detailGif").src = MEDIA_BASE + currentDetail.gif_url;
  document.getElementById("detailName").textContent = currentDetail.name;
  document.getElementById("detailCategory").textContent =
    currentDetail.category;
  document.getElementById("detailEquipment").textContent =
    currentDetail.equipment;
  document.getElementById("detailTarget").textContent = currentDetail.target;
  document.getElementById("detailInstructions").textContent =
    currentDetail.instructions.en;

  document.getElementById("detailOverlay").classList.add("active");
}

function closeDetail() {
  document.getElementById("detailOverlay").classList.remove("active");
}

function handleDetailOverlayClick(e) {
  if (e.target === document.getElementById("detailOverlay")) closeDetail();
}

// ==============================
// LOG EXERCISE
// ==============================
function openLogForm() {
  document.getElementById("logExerciseName").textContent = currentDetail.name;
  document.getElementById("logWeight").value = "";
  document.getElementById("logReps").value = "";
  document.getElementById("logSets").value = 1;
  closeDetail();
  document.getElementById("logOverlay").classList.add("active");
}

function closeLogForm() {
  document.getElementById("logOverlay").classList.remove("active");
}

function handleLogOverlayClick(e) {
  if (e.target === document.getElementById("logOverlay")) closeLogForm();
}

function saveExerciseLog() {
  const weight = parseFloat(document.getElementById("logWeight").value) || 0;
  const reps = parseInt(document.getElementById("logReps").value);
  const sets = parseInt(document.getElementById("logSets").value) || 1;

  if (!reps || reps < 1) {
    alert("Please enter how many reps!");
    return;
  }

  todayLog.push({
    id: Date.now(),
    name: currentDetail.name,
    category: currentDetail.category,
    weight,
    reps,
    sets,
  });

  saveTodayLog();
  renderTodayLog();
  closeLogForm();
  showToast(`✅ ${currentDetail.name} logged!`);
}

function removeLogEntry(id) {
  todayLog = todayLog.filter((e) => e.id !== id);
  saveTodayLog();
  renderTodayLog();
}

function clearTodayLog() {
  if (!todayLog.length) return;
  if (confirm("Clear today's entire workout log?")) {
    todayLog = [];
    saveTodayLog();
    renderTodayLog();
  }
}

// ==============================
// TODAY'S LOG — RENDER & STORAGE
// ==============================
function renderTodayLog() {
  const list = document.getElementById("todayLogList");

  if (!todayLog.length) {
    list.innerHTML =
      '<p class="empty-log">No exercises logged yet — browse above to get started!</p>';
    return;
  }

  list.innerHTML = todayLog
    .map(
      (entry) => `
        <div class="workout-log-item">
            <div>
                <div class="workout-log-name">${entry.name}</div>
                <div class="workout-log-details">
                    ${entry.sets} sets × ${entry.reps} reps ${entry.weight > 0 ? `@ ${entry.weight}kg` : "(bodyweight)"}
                </div>
            </div>
            <button class="remove-log-btn" onclick="removeLogEntry(${entry.id})">✕</button>
        </div>
    `,
    )
    .join("");
}

function saveTodayLog() {
  const today = new Date().toDateString();
  localStorage.setItem("gymtrackTodayLog", JSON.stringify(todayLog));
  localStorage.setItem("gymtrackTodayDate", today);

  // Also save into full history
  let history = JSON.parse(localStorage.getItem("gymtrackHistory") || "{}");
  history[today] = todayLog;
  localStorage.setItem("gymtrackHistory", JSON.stringify(history));
}

function loadTodayLog() {
  const savedDate = localStorage.getItem("gymtrackTodayDate");
  const today = new Date().toDateString();

  if (savedDate === today) {
    todayLog = JSON.parse(localStorage.getItem("gymtrackTodayLog") || "[]");
  } else {
    todayLog = [];
  }
  renderTodayLog();
}

// ==============================
// WORKOUT HISTORY
// ==============================
function openHistory() {
  const history = JSON.parse(localStorage.getItem("gymtrackHistory") || "{}");
  const dates = Object.keys(history).sort((a, b) => new Date(b) - new Date(a));
  const list = document.getElementById("historyList");

  if (!dates.length) {
    list.innerHTML =
      '<p class="empty-log">No workout history yet — log your first exercise!</p>';
  } else {
    list.innerHTML = dates
      .map((date) => {
        const entries = history[date];
        if (!entries.length) return "";
        return `
                <div class="history-day">
                    <div class="history-day-title">${date}</div>
                    ${entries
                      .map(
                        (e) => `
                        <div class="workout-log-item">
                            <div>
                                <div class="workout-log-name">${e.name}</div>
                                <div class="workout-log-details">${e.sets} sets × ${e.reps} reps ${e.weight > 0 ? `@ ${e.weight}kg` : ""}</div>
                            </div>
                        </div>
                    `,
                      )
                      .join("")}
                </div>
            `;
      })
      .join("");
  }

  document.getElementById("historyOverlay").classList.add("active");
}

function closeHistory() {
  document.getElementById("historyOverlay").classList.remove("active");
}

function handleHistoryOverlayClick(e) {
  if (e.target === document.getElementById("historyOverlay")) closeHistory();
}

// ==============================
// TOAST
// ==============================
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}
