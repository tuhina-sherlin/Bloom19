const DEFAULT_HABITS = [
  { id: "read-pages", name: "Read 5 pages", category: "Mind & learning", emoji: "📚" },
  { id: "journal", name: "Write in my journal", category: "Mind & learning", emoji: "📓" },
  { id: "exercise", name: "Exercise for 15 minutes", category: "Health & wellness", emoji: "🌷" },
  { id: "water", name: "Drink enough water", category: "Health & wellness", emoji: "💧" },
  { id: "wake-time", name: "Wake up at a consistent time", category: "Daily routine", emoji: "☀️" },
  { id: "english-word", name: "Learn one English word", category: "Mind & learning", emoji: "📝" },
  { id: "coding", name: "Practice coding for 20 minutes", category: "Skills & career", emoji: "💻" },
  { id: "new-skill", name: "Learn a new skill", category: "Skills & career", emoji: "🎨" },
  { id: "save-money", name: "Save a little money", category: "Life skills", emoji: "💰" },
  { id: "photo", name: "Take one photo", category: "Memories & creativity", emoji: "📸" },
  { id: "comfort-zone", name: "Try something outside my comfort zone", category: "Confidence", emoji: "🦋" },
  { id: "less-scroll", name: "Reduce unnecessary scrolling", category: "Mindful living", emoji: "📵" },
  { id: "tidy-space", name: "Tidy my study space", category: "Daily routine", emoji: "🪴" },
  { id: "recipe", name: "Cook or learn a recipe", category: "Life skills", emoji: "🍓" },
  { id: "family-time", name: "Spend quality time with family", category: "Relationships", emoji: "🏡" },
  { id: "compliment", name: "Give someone a sincere compliment", category: "Kindness", emoji: "💗" },
  { id: "boundaries", name: "Respect my boundaries", category: "Confidence", emoji: "🛡️" },
  { id: "self-care", name: "Do something just for me", category: "Joy & self-care", emoji: "☕" },
  { id: "small-win", name: "Celebrate a small win", category: "Mindset", emoji: "✨" }
];

const STORAGE_KEY = "bloom19-data-v1";
const $ = selector => document.querySelector(selector);
const today = getDateKey(new Date());
let selectedDate = today;
let calendarMonth = new Date();
calendarMonth.setDate(1);
let database = loadDatabase();
let habits = loadHabitsAndMigrate();
let toastTimer;
let editingId = null;

const BIBLE_VERSES = [
  { text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
  { text: "Be strong and courageous. Do not be afraid; do not be discouraged.", ref: "Joshua 1:9" },
  { text: "The Lord is my strength and my shield; my heart trusts in him.", ref: "Psalm 28:7" },
  { text: "For I know the plans I have for you, declares the Lord.", ref: "Jeremiah 29:11" },
  { text: "Cast all your anxiety on him because he cares for you.", ref: "1 Peter 5:7" },
  { text: "Let all that you do be done in love.", ref: "1 Corinthians 16:14" },
  { text: "The Lord is my shepherd; I shall not want.", ref: "Psalm 23:1" },
  { text: "Those who hope in the Lord will renew their strength.", ref: "Isaiah 40:31" },
  { text: "Be still, and know that I am God.", ref: "Psalm 46:10" },
  { text: "Trust in the Lord with all your heart.", ref: "Proverbs 3:5" },
  { text: "Do not grow weary in doing good.", ref: "Galatians 6:9" },
  { text: "God is our refuge and strength, an ever-present help in trouble.", ref: "Psalm 46:1" }
];
let verseIndex = (new Date().getDate() - 1) % BIBLE_VERSES.length;

function getDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function shiftDate(dateKey, amount) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);
  return getDateKey(date);
}
function parseDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}
function loadDatabase() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    console.error("Could not load Bloom19 data:", error);
    return {};
  }
}
function saveDatabase() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
    return true;
  } catch (error) {
    console.error("Could not save Bloom19 data:", error);
    showToast("Saving failed. Check your browser storage.");
    return false;
  }
}
function loadHabitsAndMigrate() {
  if (Array.isArray(database.__habits) && database.__habits.length) {
    return database.__habits.filter(h => h && h.id && h.name).map(h => ({
      id: String(h.id), name: String(h.name), category: String(h.category || "My habits"), emoji: String(h.emoji || "🌷")
    }));
  }
  const migrated = DEFAULT_HABITS.map(h => ({ ...h }));
  // The previous version saved completion by habit array index. Convert those
  // indexes to stable IDs so editing/reordering tasks won't move checkmarks.
  Object.keys(database).forEach(dateKey => {
    if (dateKey.startsWith("__")) return;
    const day = database[dateKey];
    if (!day || typeof day !== "object" || !day.habits || typeof day.habits !== "object") return;
    const keys = Object.keys(day.habits);
    if (keys.some(key => /^\d+$/.test(key))) {
      const converted = {};
      keys.forEach(key => {
        if (day.habits[key] === true && DEFAULT_HABITS[Number(key)]) converted[DEFAULT_HABITS[Number(key)].id] = true;
        else if (!/^\d+$/.test(key) && day.habits[key] === true) converted[key] = true;
      });
      day.habits = converted;
    }
  });
  database.__habits = migrated;
  saveDatabase();
  return migrated;
}
function getDayData(dateKey) {
  const data = database[dateKey];
  if (!data || typeof data !== "object") return { habits: {}, note: "" };
  return { habits: data.habits && typeof data.habits === "object" ? data.habits : {}, note: typeof data.note === "string" ? data.note : "" };
}
function completedOn(dateKey) {
  const data = getDayData(dateKey);
  return habits.reduce((total, habit) => total + (data.habits[habit.id] === true ? 1 : 0), 0);
}
function formatDate(dateKey, options = {}) {
  return parseDate(dateKey).toLocaleDateString("en-IN", options);
}
function renderDate() {
  $("#todayDate").textContent = formatDate(today, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  $("#datePicker").value = selectedDate;
  $("#datePicker").max = today;
}
function renderBibleVerse() {
  const verse = BIBLE_VERSES[verseIndex];
  $("#bibleVerse").textContent = `“${verse.text}”`;
  $("#bibleReference").textContent = verse.ref;
}
function renderHabits() {
  const data = getDayData(selectedDate);
  const list = $("#habitList");
  list.innerHTML = "";
  habits.forEach(habit => {
    const isDone = data.habits[habit.id] === true;
    const item = document.createElement("button");
    item.type = "button";
    item.className = `habit-item${isDone ? " done" : ""}`;
    item.setAttribute("aria-pressed", String(isDone));
    item.setAttribute("aria-label", `${habit.name}, ${isDone ? "completed" : "not completed"}`);
    const check = document.createElement("span"); check.className = "habit-check"; check.textContent = isDone ? "✓" : "";
    const emoji = document.createElement("span"); emoji.className = "habit-emoji"; emoji.textContent = habit.emoji; emoji.setAttribute("aria-hidden", "true");
    const text = document.createElement("span"); text.className = "habit-text";
    const name = document.createElement("span"); name.className = "habit-name"; name.textContent = habit.name;
    const category = document.createElement("span"); category.className = "habit-category"; category.textContent = habit.category;
    text.append(name, category); item.append(check, emoji, text);
    item.addEventListener("click", () => {
      const current = getDayData(selectedDate);
      if (current.habits[habit.id] === true) delete current.habits[habit.id]; else current.habits[habit.id] = true;
      database[selectedDate] = current; saveDatabase(); renderAll();
      if (current.habits[habit.id]) showToast("One little win for today! ♡");
    });
    list.appendChild(item);
  });
  $("#habitToolbarCount").textContent = `${habits.length} ${habits.length === 1 ? "habit" : "habits"} in your personal list`;
  $("#habitTotal").textContent = habits.length;
}
function renderDailyNote() {
  const data = getDayData(selectedDate);
  $("#dailyNote").value = data.note;
  $("#noteLength").textContent = `${data.note.length} / 1000`;
  $("#noteStatus").textContent = "Your thoughts are saved automatically.";
}
function renderTodayStats() {
  const count = completedOn(selectedDate);
  const percent = habits.length ? Math.round((count / habits.length) * 100) : 0;
  $("#todayPercent").textContent = percent;
  $("#todayBar").style.width = `${percent}%`;
  $("#completedCount").textContent = count;
  $("#countBar").style.width = `${percent}%`;
  $("#habitCountLabel").textContent = `${count} of ${habits.length} completed`;
  if (count === habits.length && habits.length) $("#todaySummary").textContent = "You did it! All your habits. ✨";
  else if (count > 0) $("#todaySummary").textContent = `${habits.length - count} more little wins to go.`;
  else $("#todaySummary").textContent = "Your journey starts here.";
  const streak = calculateStreak();
  $("#streakCount").textContent = streak;
  $("#streakMessage").textContent = streak === 1 ? "A beautiful start. Keep going!" : streak > 1 ? "Look at you, showing up!" : "Start your own little streak.";
}
function calculateStreak() {
  let cursor = completedOn(today) > 0 ? today : shiftDate(today, -1);
  let streak = 0;
  while (cursor <= today && completedOn(cursor) > 0) { streak++; cursor = shiftDate(cursor, -1); }
  return streak;
}
function renderWeeklyChart() {
  const chart = $("#weeklyChart"); chart.innerHTML = "";
  const dayOfWeek = parseDate(today).getDay();
  const monday = shiftDate(today, -((dayOfWeek + 6) % 7));
  for (let i = 0; i < 7; i++) {
    const dateKey = shiftDate(monday, i), count = completedOn(dateKey);
    const percent = habits.length ? Math.round((count / habits.length) * 100) : 0;
    const day = document.createElement("div"); day.className = `chart-day${dateKey === today ? " today" : ""}`;
    const percentage = document.createElement("span"); percentage.className = "chart-percent"; percentage.textContent = `${percent}%`;
    const track = document.createElement("div"); track.className = "chart-track"; track.setAttribute("aria-label", `${percent}% completed`);
    const bar = document.createElement("div"); bar.className = "chart-bar"; bar.style.height = `${percent}%`; track.appendChild(bar);
    const label = document.createElement("span"); label.className = "chart-label"; label.textContent = formatDate(dateKey, { weekday: "short" });
    day.append(percentage, track, label); chart.appendChild(day);
  }
}
function renderCalendar() {
  const grid = $("#calendarGrid"); grid.innerHTML = "";
  const year = calendarMonth.getFullYear(), month = calendarMonth.getMonth();
  $("#calendarMonth").textContent = calendarMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const firstDay = new Date(year, month, 1), daysInMonth = new Date(year, month + 1, 0).getDate(), offset = (firstDay.getDay() + 6) % 7;
  for (let i = 0; i < offset; i++) { const empty = document.createElement("span"); empty.className = "calendar-day empty"; empty.setAttribute("aria-hidden", "true"); grid.appendChild(empty); }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = getDateKey(new Date(year, month, day)), isFuture = dateKey > today, count = completedOn(dateKey);
    const button = document.createElement("button"); button.type = "button"; button.className = "calendar-day"; button.textContent = day; button.disabled = isFuture;
    if (count > 0) button.classList.add("has-data"); if (dateKey === today) button.classList.add("is-today"); if (dateKey === selectedDate) button.classList.add("selected");
    button.setAttribute("aria-label", `${formatDate(dateKey, { day: "numeric", month: "long", year: "numeric" })}, ${count} habits completed`);
    button.addEventListener("click", () => { selectedDate = dateKey; showPage("today"); renderAll(); window.scrollTo({ top: 0, behavior: "smooth" }); });
    grid.appendChild(button);
  }
}
function renderProgressStats() {
  const activeDates = Object.keys(database).filter(dateKey => !dateKey.startsWith("__") && dateKey <= today && completedOn(dateKey) > 0);
  const totalCompleted = activeDates.reduce((total, dateKey) => total + completedOn(dateKey), 0);
  const totalPossible = activeDates.length * habits.length;
  const average = totalPossible ? Math.round((totalCompleted / totalPossible) * 100) : 0;
  $("#activeDays").textContent = activeDates.length; $("#allTimeCount").textContent = totalCompleted; $("#averagePercent").textContent = average;
  if (totalCompleted >= 100) { $("#progressMessage").textContent = "Look how much you've grown! 🌷"; $("#progressSubmessage").textContent = "You've collected over 100 little wins. Keep going."; }
  else if (totalCompleted > 0) { $("#progressMessage").textContent = "Every checkmark tells a story."; $("#progressSubmessage").textContent = `${totalCompleted} little wins so far. You're building something beautiful.`; }
  else { $("#progressMessage").textContent = "Your story is just beginning."; $("#progressSubmessage").textContent = "Come back each day and keep growing."; }
}
function renderSettings() {
  const list = $("#settingsTaskList"); list.innerHTML = "";
  habits.forEach(habit => {
    const row = document.createElement("div"); row.className = "settings-task-row";
    const icon = document.createElement("span"); icon.className = "settings-task-emoji"; icon.textContent = habit.emoji;
    const details = document.createElement("div"); details.className = "settings-task-details";
    const name = document.createElement("strong"); name.textContent = habit.name;
    const category = document.createElement("span"); category.textContent = habit.category;
    details.append(name, category);
    const actions = document.createElement("div"); actions.className = "task-actions";
    const edit = document.createElement("button"); edit.type = "button"; edit.className = "small-action"; edit.textContent = "Edit"; edit.setAttribute("aria-label", `Edit ${habit.name}`); edit.addEventListener("click", () => beginEdit(habit.id));
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "small-action delete-action"; remove.textContent = "Delete"; remove.setAttribute("aria-label", `Delete ${habit.name}`); remove.addEventListener("click", () => deleteHabit(habit.id));
    actions.append(edit, remove); row.append(icon, details, actions); list.appendChild(row);
  });
  $("#settingsTaskCount").textContent = `${habits.length} ${habits.length === 1 ? "task" : "tasks"}`;
}
function persistHabits() { database.__habits = habits; saveDatabase(); }
function clearTaskForm() {
  editingId = null; $("#taskId").value = ""; $("#taskForm").reset(); $("#taskEmoji").value = "🌷";
  $("#taskFormTitle").textContent = "Add a new task"; $("#saveTaskBtn").textContent = "＋ Add task"; $("#cancelEditBtn").classList.add("hidden");
}
function beginEdit(id) {
  const habit = habits.find(item => item.id === id); if (!habit) return;
  editingId = id; $("#taskId").value = id; $("#taskName").value = habit.name; $("#taskCategory").value = habit.category; $("#taskEmoji").value = habit.emoji;
  $("#taskFormTitle").textContent = "Edit your task"; $("#saveTaskBtn").textContent = "Save changes"; $("#cancelEditBtn").classList.remove("hidden");
  $("#taskName").focus(); window.scrollTo({ top: 0, behavior: "smooth" });
}
function deleteHabit(id) {
  const habit = habits.find(item => item.id === id); if (!habit) return;
  if (!window.confirm(`Delete “${habit.name}” from your habit list? Its saved completion history for this task will no longer count in your stats.`)) return;
  habits = habits.filter(item => item.id !== id);
  // Remove only this habit's checkmarks while preserving notes and other habits.
  Object.keys(database).forEach(dateKey => { if (dateKey.startsWith("__")) return; const day = database[dateKey]; if (day && day.habits) delete day.habits[id]; });
  persistHabits(); clearTaskForm(); renderAll(); renderSettings(); showToast("Task removed from your list.");
}
function showPage(page) {
  ["today", "progress", "settings", "before19"].forEach(name => {
    $(`#${name}Page`).classList.toggle("hidden", name !== page);
  });

  document.querySelectorAll(".nav-link").forEach(button => {
    const active = button.dataset.page === page;
    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });

  if (page === "progress") {
    renderWeeklyChart();
    renderCalendar();
    renderProgressStats();
  }

  if (page === "settings") {
    renderSettings();
  }

  if (page === "before19") {
    renderMemories();
  }
}
function renderAll() {
  renderDate(); renderBibleVerse(); renderHabits(); renderDailyNote(); renderTodayStats(); renderWeeklyChart(); renderCalendar(); renderProgressStats();
}
function showToast(message) {
  const toast = $("#toast"); toast.textContent = message; toast.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}

document.querySelectorAll(".nav-link").forEach(button => button.addEventListener("click", () => { showPage(button.dataset.page); window.scrollTo({ top: 0, behavior: "smooth" }); }));
$("#manageTasksBtn").addEventListener("click", () => { showPage("settings"); window.scrollTo({ top: 0, behavior: "smooth" }); });
$("#nextVerseBtn").addEventListener("click", () => { verseIndex = (verseIndex + 1) % BIBLE_VERSES.length; renderBibleVerse(); });
$("#datePicker").addEventListener("change", event => {
  const chosen = event.target.value;
  if (!chosen || chosen > today) { event.target.value = selectedDate; showToast("Choose today or an earlier date."); return; }
  selectedDate = chosen; calendarMonth = parseDate(chosen); calendarMonth.setDate(1); renderAll();
});
$("#dailyNote").addEventListener("input", event => {
  const note = event.target.value.slice(0, 1000), data = getDayData(selectedDate); data.note = note; database[selectedDate] = data;
  $("#noteLength").textContent = `${note.length} / 1000`;
  $("#noteStatus").textContent = saveDatabase() ? "Saved automatically ♡" : "Could not save. Check browser storage.";
});
$("#resetDayBtn").addEventListener("click", () => {
  const data = getDayData(selectedDate), hasProgress = Object.values(data.habits).some(value => value === true);
  if (!hasProgress && !data.note) { showToast("This day is already clear."); return; }
  if (!window.confirm(`Reset all habits and the journal note for ${formatDate(selectedDate, { day: "numeric", month: "long", year: "numeric" })}? This cannot be undone.`)) return;
  delete database[selectedDate]; saveDatabase(); renderAll(); showToast("This day's entries have been reset.");
});
$("#prevMonth").addEventListener("click", () => { calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1); renderCalendar(); });
$("#nextMonth").addEventListener("click", () => {
  const nextMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
  if (getDateKey(nextMonth) > today) { showToast("Your future days are waiting for you. ♡"); return; }
  calendarMonth = nextMonth; renderCalendar();
});
$("#taskForm").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("#taskName").value.trim(), category = $("#taskCategory").value.trim(), emoji = $("#taskEmoji").value.trim() || "🌷";
  if (!name || !category) { showToast("Please fill in the task name and category."); return; }
  if (editingId) {
    const habit = habits.find(item => item.id === editingId);
    if (habit) Object.assign(habit, { name, category, emoji });
    showToast("Your task has been updated. ♡");
  } else {
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    habits.push({ id, name, category, emoji }); showToast("A new little habit has been added! ♡");
  }
  persistHabits(); clearTaskForm(); renderAll(); renderSettings();
});
$("#cancelEditBtn").addEventListener("click", clearTaskForm);
/* =================================
   BEFORE 19 - MEMORY JOURNAL
================================= */

const MEMORY_STORAGE_KEY = "bloom19-before19-v1";

let memories = loadMemories();
let currentMemoryPhoto = "";
let removeCurrentMemoryPhoto = false;


// Load saved memories
function loadMemories() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(MEMORY_STORAGE_KEY) || "[]"
    );

    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.error("Could not load memories:", error);
    return [];
  }
}


// Save memories to browser storage
function saveMemories() {
  try {
    localStorage.setItem(
      MEMORY_STORAGE_KEY,
      JSON.stringify(memories)
    );

    return true;
  } catch (error) {
    console.error("Could not save memories:", error);
    showToast("Storage is full. Try using a smaller photo.");
    return false;
  }
}


// Reset the memory form
function resetMemoryForm() {
  $("#memoryForm").reset();

  $("#memoryId").value = "";
  $("#memoryFormTitle").textContent = "What I did ✨";
  $("#saveMemoryBtn").textContent = "＋ Save my memory";

  $("#cancelMemoryEdit").classList.add("hidden");
  $("#memoryPhotoPreview").classList.add("hidden");
  $("#memoryPreviewImage").removeAttribute("src");
  $("#memoryPhoto").value = "";

  currentMemoryPhoto = "";
  removeCurrentMemoryPhoto = false;
}


// Display photo preview
function showMemoryPhoto(data) {
  currentMemoryPhoto = data;

  $("#memoryPreviewImage").src = data;
  $("#memoryPhotoPreview").classList.toggle("hidden", !data);
}


// Compress photos to save browser storage
function compressMemoryPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Could not read this photo."));
    };

    reader.onload = () => {
      const image = new Image();

      image.onerror = () => {
        reject(new Error("Could not open this photo."));
      };

      image.onload = () => {
        const maxSize = 900;

        const scale = Math.min(
          1,
          maxSize / Math.max(image.width, image.height)
        );

        const canvas = document.createElement("canvas");

        canvas.width = Math.max(
          1,
          Math.round(image.width * scale)
        );

        canvas.height = Math.max(
          1,
          Math.round(image.height * scale)
        );

        const context = canvas.getContext("2d");

        context.drawImage(
          image,
          0,
          0,
          canvas.width,
          canvas.height
        );

        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };

      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}


// Display all saved memories
function renderMemories() {
  const list = $("#memoryList");

  list.innerHTML = "";

  $("#memoryCount").textContent = memories.length;

  $("#emptyMemories").classList.toggle(
    "hidden",
    memories.length > 0
  );

  const sortedMemories = [...memories].sort(
    (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
  );

  sortedMemories.forEach(memory => {
    const card = document.createElement("article");

    card.className = "memory-card";

    // Photo
    if (memory.photo) {
      const photo = document.createElement("img");

      photo.className = "memory-card-photo";
      photo.src = memory.photo;
      photo.alt = `Photo for ${memory.title}`;

      card.appendChild(photo);
    }

    const content = document.createElement("div");

    content.className = "memory-card-content";

    // Date
    const date = document.createElement("div");

    date.className = "memory-card-date";

    date.textContent = memory.date
      ? formatDate(memory.date, {
          day: "numeric",
          month: "long",
          year: "numeric"
        })
      : "";

    // Title
    const title = document.createElement("h3");

    title.textContent = memory.title;

    content.append(date, title);

    // Description
    if (memory.description) {
      const description = document.createElement("p");

      description.className = "memory-card-description";
      description.textContent = memory.description;

      content.appendChild(description);
    }

    // Edit and delete buttons
    const actions = document.createElement("div");

    actions.className = "memory-card-actions";

    const edit = document.createElement("button");

    edit.type = "button";
    edit.className = "small-action";
    edit.textContent = "Edit";

    edit.addEventListener("click", () => {
      editMemory(memory.id);
    });

    const remove = document.createElement("button");

    remove.type = "button";
    remove.className = "small-action delete-action";
    remove.textContent = "Delete";

    remove.addEventListener("click", () => {
      deleteMemory(memory.id);
    });

    actions.append(edit, remove);

    content.appendChild(actions);
    card.appendChild(content);
    list.appendChild(card);
  });
}


// Edit a memory
function editMemory(id) {
  const memory = memories.find(item => item.id === id);

  if (!memory) return;

  $("#memoryId").value = memory.id;
  $("#memoryTitle").value = memory.title;
  $("#memoryDescription").value = memory.description || "";

  $("#memoryFormTitle").textContent = "Edit your memory ✎";
  $("#saveMemoryBtn").textContent = "Save changes";

  $("#cancelMemoryEdit").classList.remove("hidden");

  $("#memoryPhoto").value = "";

  currentMemoryPhoto = memory.photo || "";
  removeCurrentMemoryPhoto = false;

  if (currentMemoryPhoto) {
    showMemoryPhoto(currentMemoryPhoto);
  } else {
    $("#memoryPhotoPreview").classList.add("hidden");
  }

  $("#memoryForm").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  $("#memoryTitle").focus();
}


// Delete a memory
function deleteMemory(id) {
  const memory = memories.find(item => item.id === id);

  if (!memory) return;

  if (!window.confirm(`Delete the memory "${memory.title}"?`)) {
    return;
  }

  const previousMemories = memories;

  memories = memories.filter(item => item.id !== id);

  if (!saveMemories()) {
    memories = previousMemories;
    return;
  }

  renderMemories();

  showToast("Memory deleted. ♡");
}


// Choose and preview a photo
$("#memoryPhoto").addEventListener("change", async event => {
  const file = event.target.files[0];

  if (!file) return;

  if (file.size > 10 * 1024 * 1024) {
    showToast("Choose a photo smaller than 10 MB.");

    event.target.value = "";
    return;
  }

  try {
    const compressed = await compressMemoryPhoto(file);

    showMemoryPhoto(compressed);

    removeCurrentMemoryPhoto = false;
  } catch (error) {
    showToast(error.message || "Could not load this photo.");

    event.target.value = "";
  }
});


// Remove a photo
$("#removeMemoryPhoto").addEventListener("click", () => {
  currentMemoryPhoto = "";
  removeCurrentMemoryPhoto = true;

  $("#memoryPhoto").value = "";
  $("#memoryPreviewImage").removeAttribute("src");
  $("#memoryPhotoPreview").classList.add("hidden");
});


// Cancel editing
$("#cancelMemoryEdit").addEventListener("click", resetMemoryForm);


// Save a new memory or update an existing one
$("#memoryForm").addEventListener("submit", event => {
  event.preventDefault();

  const title = $("#memoryTitle").value.trim();

  const description = $("#memoryDescription").value.trim();

  const editingId = $("#memoryId").value;

  if (!title) {
    showToast("Please write what you did.");
    return;
  }

  const existing = memories.find(
    item => item.id === editingId
  );

  const memory = {
    id: existing
      ? existing.id
      : `memory-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,

    title,
    description,

    photo: removeCurrentMemoryPhoto
      ? ""
      : currentMemoryPhoto,

    date: existing
      ? existing.date
      : getDateKey(new Date()),

    createdAt: existing
      ? existing.createdAt
      : Date.now()
  };

  const previousMemories = memories;

  if (existing) {
    memories = memories.map(item =>
      item.id === editingId ? memory : item
    );
  } else {
    memories.push(memory);
  }

  if (!saveMemories()) {
    memories = previousMemories;
    return;
  }

  resetMemoryForm();
  renderMemories();

  showToast(
    existing
      ? "Memory updated! ♡"
      : "A new memory saved! ♡"
  );
});


// Keep these as the final two lines of script.js
renderAll();
showPage("today");

