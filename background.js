
console.log("🔥 BACKGROUND TRACKER STARTED");

const DAILY_GOAL = 600;
const DEFAULT_REQUIRED_DAYS = [0, 6];

let REQUIRED_DAYS = [...DEFAULT_REQUIRED_DAYS];

const TEST_DATE = null;

let videoPlaying = false;
let tabVisible = false;
let windowFocused = true;
let userActive = true;

let lastUpdate = Date.now();


// -----------------------------
// DATE HELPERS
// -----------------------------

function getToday() {
    if (TEST_DATE) {
        return TEST_DATE;
    }

    return getDateKey(new Date());
}

function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getValidDays(days) {
    if (!Array.isArray(days)) {
        return [...DEFAULT_REQUIRED_DAYS];
    }

    return [...new Set(days)].filter(
        day => Number.isInteger(day) && day >= 0 && day <= 6
    );
}


// -----------------------------
// LOAD REQUIRED DAYS
// -----------------------------

chrome.storage.local.get(["requiredDays"], (data) => {
    REQUIRED_DAYS = getValidDays(data.requiredDays);

    console.log("📅 REQUIRED DAYS:", REQUIRED_DAYS);

    recalculateStreak();
});


// -----------------------------
// CALCULATE CURRENT STREAK
// -----------------------------

function calculateStreak(dailyCompleted) {
    let streak = 0;

    const date = TEST_DATE
        ? new Date(`${TEST_DATE}T12:00:00`)
        : new Date();

    // If today is a required day and is incomplete,
    // check the previous required day instead.
    if (
        REQUIRED_DAYS.includes(date.getDay()) &&
        dailyCompleted[getDateKey(date)] !== true
    ) {
        date.setDate(date.getDate() - 1);
    }

    while (true) {
        const day = date.getDay();

        if (REQUIRED_DAYS.includes(day)) {
            const dateKey = getDateKey(date);

            if (dailyCompleted[dateKey] !== true) {
                break;
            }

            streak++;
        }

        date.setDate(date.getDate() - 1);
    }

    return streak;
}


// -----------------------------
// RECALCULATE STREAK AFTER
// REQUIRED DAYS CHANGE
// -----------------------------

function recalculateStreak() {
    chrome.storage.local.get(
        ["dailyCompleted", "bestStreak"],
        (data) => {
            const dailyCompleted = data.dailyCompleted || {};

            const currentStreak =
                calculateStreak(dailyCompleted);

            const previousBest = data.bestStreak || 0;

            const bestStreak = Math.max(
                previousBest,
                currentStreak
            );

            chrome.storage.local.set({
                currentStreak,
                bestStreak
            });

            console.log("🔥 CURRENT STREAK:", currentStreak);
            console.log("🏆 BEST STREAK:", bestStreak);
        }
    );
}


// -----------------------------
// CUSTOM DAYS UPDATED
// -----------------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.type === "REQUIRED_DAYS_UPDATED") {
        const selectedDays = getValidDays(message.requiredDays);

        if (selectedDays.length === 0) {
            console.log("⚠️ At least one required day must be selected.");
            return;
        }

        chrome.storage.local.set(
            { requiredDays: selectedDays },
            () => {
                console.log("📅 Custom days saved:", selectedDays);
            }
        );

        return;
    }

    
if (message.type === "GET_TRACKER_STATE") {
    sendResponse({
        videoPlaying,
        tabVisible,
        windowFocused,
        userActive,
        counting:
            videoPlaying &&
            tabVisible &&
            windowFocused &&
            userActive
    });
    return;
}

    // -----------------------------
    // VIDEO STATE FROM YOUTUBE
    // -----------------------------

    if (message.type === "VIDEO_STATE") {
        updateTimer();

        videoPlaying = message.playing;
        tabVisible = message.visible;

        console.log("Video playing:", videoPlaying);
        console.log("YouTube tab visible:", tabVisible);
    }
});


// Also react if requiredDays is changed directly in storage.
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes.requiredDays) {
        return;
    }

    REQUIRED_DAYS = getValidDays(changes.requiredDays.newValue);

    console.log("📅 REQUIRED DAYS UPDATED:", REQUIRED_DAYS);

    recalculateStreak();
});


// -----------------------------
// IDLE DETECTION
// -----------------------------

chrome.idle.setDetectionInterval(60);

chrome.idle.onStateChanged.addListener((state) => {
    updateTimer();

    userActive = state === "active";

    console.log("USER STATE:", state);
});


// -----------------------------
// TAB SWITCHING
// -----------------------------

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    updateTimer();

    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);

        tabVisible =
            !!tab.url &&
            tab.url.startsWith("https://www.youtube.com/watch");

        console.log("YouTube tab active:", tabVisible);

    } catch (error) {
        console.log("Could not read active tab");
    }
});


// -----------------------------
// BROWSER WINDOW FOCUS
// -----------------------------

chrome.windows.onFocusChanged.addListener((windowId) => {
    updateTimer();

    windowFocused =
        windowId !== chrome.windows.WINDOW_ID_NONE;

    console.log("Browser focused:", windowFocused);
});


// -----------------------------
// TIMER
// -----------------------------

function updateTimer() {
    const now = Date.now();
    const elapsed = (now - lastUpdate) / 1000;

    const shouldTrack =
        videoPlaying &&
        tabVisible &&
        windowFocused &&
        userActive;

    lastUpdate = now;

    if (!shouldTrack || elapsed <= 0) {
        return;
    }

    const today = getToday();

    chrome.storage.local.get(
        ["dailyTime", "dailyCompleted", "bestStreak"],
        (data) => {
            const dailyTime = data.dailyTime || {};
            const dailyCompleted = data.dailyCompleted || {};

            const updated =
                (dailyTime[today] || 0) + elapsed;

            dailyTime[today] = updated;

            const completed = updated >= DAILY_GOAL;

            dailyCompleted[today] = completed;

            const currentStreak =
                calculateStreak(dailyCompleted);

            const previousBest = data.bestStreak || 0;

            const bestStreak = Math.max(
                previousBest,
                currentStreak
            );

            chrome.storage.local.set({
                dailyTime,
                dailyCompleted,
                currentStreak,
                bestStreak
            });

            console.log(
                "⏱️ TODAY:",
                updated.toFixed(1),
                "seconds"
            );

            console.log(
                "🎯 DAILY GOAL:",
                completed ? "COMPLETED ✅" : "NOT COMPLETED ❌"
            );

            console.log("🔥 CURRENT STREAK:", currentStreak);
            console.log("🏆 BEST STREAK:", bestStreak);
        }
    );
}


// -----------------------------
// RUN TIMER EVERY SECOND
// -----------------------------

setInterval(() => {
    updateTimer();
}, 1000);