
const DAILY_GOAL = 600;

const DEFAULT_REQUIRED_DAYS = [0, 6];

let requiredDays = [...DEFAULT_REQUIRED_DAYS];
let calendarDate = new Date();

// -----------------------------
// FORMAT TIME
// -----------------------------

function formatTime(seconds) {
    const safeSeconds = Math.max(0, seconds || 0);
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = Math.floor(safeSeconds % 60);

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(remainingSeconds).padStart(2, "0")
    );
}

// -----------------------------
// DATE HELPERS
// -----------------------------

function getToday() {
    return getDateKey(new Date());
}

function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// -----------------------------
// REQUIRED DAYS
// -----------------------------

function getDayNames(days) {
    const names = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
    ];

    return [...days]
        .sort((a, b) => {
            // Display Monday through Sunday.
            const orderA = a === 0 ? 7 : a;
            const orderB = b === 0 ? 7 : b;
            return orderA - orderB;
        })
        .map(day => names[day])
        .join(" + ");
}

function updateSelectedDaysText() {
    const element = document.getElementById("selectedDaysText");

    if (element) {
        element.textContent = getDayNames(requiredDays) || "None";
    }
}

function loadRequiredDays() {
    chrome.storage.local.get(["requiredDays"], (data) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
            return;
        }

        const savedDays = data.requiredDays;

        requiredDays = Array.isArray(savedDays)
            ? savedDays.filter(
                day => Number.isInteger(day) && day >= 0 && day <= 6
            )
            : [...DEFAULT_REQUIRED_DAYS];

        document.querySelectorAll(
            'input[name="requiredDay"]'
        ).forEach((checkbox) => {
            checkbox.checked = requiredDays.includes(
                Number(checkbox.value)
            );
        });

        updateSelectedDaysText();
        loadCalendar();
    });
}

function saveRequiredDays() {
    const selectedDays = Array.from(
        document.querySelectorAll(
            'input[name="requiredDay"]:checked'
        )
    ).map(checkbox => Number(checkbox.value));

    const status = document.getElementById("daysSaveStatus");

    if (selectedDays.length === 0) {
        status.textContent = "Please select at least one day.";
        return;
    }

    chrome.storage.local.set(
        { requiredDays: selectedDays },
        () => {
            if (chrome.runtime.lastError) {
                status.textContent = "Could not save days. Try again.";
                console.error(chrome.runtime.lastError.message);
                return;
            }

            requiredDays = selectedDays;

            status.textContent = "Days saved successfully! ✅";

            updateSelectedDaysText();
            loadCalendar();

            // Notify the background tracker that the settings changed.
            chrome.runtime.sendMessage({
                type: "REQUIRED_DAYS_UPDATED",
                requiredDays: selectedDays
            }).catch(() => {
                // Storage is saved even if no listener handles this message yet.
            });
        }
    );
}

// -----------------------------
// MAIN DASHBOARD
// -----------------------------

function loadDashboard() {
    chrome.storage.local.get(
        [
            "dailyTime",
            "dailyCompleted",
            "currentStreak",
            "bestStreak"
        ],
        (data) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                return;
            }

            const today = getToday();
            const dailyTime = data.dailyTime || {};
            const dailyCompleted = data.dailyCompleted || {};

            const todayTime = dailyTime[today] || 0;
            const completed = dailyCompleted[today] === true;

            document.getElementById("dailyTime").textContent =
                `${formatTime(todayTime)} / 10:00`;

            document.getElementById("progressBar").value =
                Math.min(todayTime, DAILY_GOAL);

            document.getElementById("currentStreak").textContent =
                `${data.currentStreak || 0} days`;

            document.getElementById("bestStreak").textContent =
                `${data.bestStreak || 0} days`;

            document.getElementById("dailyStatus").textContent =
                completed ? "✅ Complete" : "❌ Not Complete";
        }
    );
}

// -----------------------------
// CALENDAR
// -----------------------------

function loadCalendar() {
    chrome.storage.local.get(
        [
            "dailyTime",
            "dailyCompleted",
            "requiredDays"
        ],
        (data) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                return;
            }

            const dailyTime = data.dailyTime || {};
            const dailyCompleted = data.dailyCompleted || {};

            const selectedDays = Array.isArray(data.requiredDays)
                ? data.requiredDays
                : [...DEFAULT_REQUIRED_DAYS];

            const calendar = document.getElementById("calendar");
            calendar.innerHTML = "";

            const year = calendarDate.getFullYear();
            const month = calendarDate.getMonth();

            const monthName = calendarDate.toLocaleString(
                "default",
                { month: "long" }
            );

            document.getElementById("calendarMonth").textContent =
                `${monthName} ${year}`;

            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            // Empty cells before the first day of the month.
            for (let i = 0; i < firstDay; i++) {
                const empty = document.createElement("div");
                empty.className = "calendar-day calendar-empty";
                calendar.appendChild(empty);
            }

            // Calendar dates.
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const key = getDateKey(date);
                const weekday = date.getDay();

                const cell = document.createElement("div");
                cell.className = "calendar-day";
                cell.textContent = day;

                const time = dailyTime[key] || 0;
                const completed = dailyCompleted[key] === true;
                const isRequiredDay = selectedDays.includes(weekday);

                if (isRequiredDay) {
                    cell.title = completed
                        ? `${key}: Goal completed`
                        : `${key}: Required day — goal incomplete`;

                    if (completed) {
                        cell.classList.add("calendar-complete");
                        cell.textContent = "🔥";
                    } else if (time > 0) {
                        cell.classList.add("calendar-incomplete");
                    }
                } else {
                    cell.title = `${key}: Not a required day`;
                }

                if (key === getToday()) {
                    cell.classList.add("calendar-today");
                }

                cell.addEventListener("click", () => {
                    const dayDetails = document.getElementById("dayDetails");

                    dayDetails.textContent = "";

                    const dateLabel = document.createElement("strong");
                    dateLabel.textContent = key;
                    dayDetails.appendChild(dateLabel);

                    dayDetails.appendChild(document.createElement("br"));

                    const timeLabel = document.createElement("span");
                    timeLabel.textContent =
                        `⏱️ Watch Time: ${formatTime(time)}`;
                    dayDetails.appendChild(timeLabel);

                    dayDetails.appendChild(document.createElement("br"));

                    const statusLabel = document.createElement("span");

                    if (!isRequiredDay) {
                        statusLabel.textContent = "ℹ️ Not a selected streak day";
                    } else {
                        statusLabel.textContent = completed
                            ? "✅ Goal Completed"
                            : "❌ Goal Not Completed";
                    }

                    dayDetails.appendChild(statusLabel);
                });

                calendar.appendChild(cell);
            }
        }
    );
}

// -----------------------------
// MONTH NAVIGATION
// -----------------------------

document.getElementById("previousMonth").addEventListener(
    "click",
    () => {
        calendarDate.setDate(1);
        calendarDate.setMonth(calendarDate.getMonth() - 1);
        loadCalendar();
    }
);

document.getElementById("nextMonth").addEventListener(
    "click",
    () => {
        calendarDate.setDate(1);
        calendarDate.setMonth(calendarDate.getMonth() + 1);
        loadCalendar();
    }
);

// -----------------------------
// EVENT LISTENERS
// -----------------------------

document.getElementById("saveRequiredDays").addEventListener(
    "click",
    saveRequiredDays
);

// Refresh the popup when stored data changes.
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
        return;
    }

    if (changes.requiredDays) {
        const newDays = changes.requiredDays.newValue;

        requiredDays = Array.isArray(newDays)
            ? newDays
            : [...DEFAULT_REQUIRED_DAYS];

        document.querySelectorAll(
            'input[name="requiredDay"]'
        ).forEach((checkbox) => {
            checkbox.checked = requiredDays.includes(
                Number(checkbox.value)
            );
        });

        updateSelectedDaysText();
        loadCalendar();
    }

    if (
        changes.dailyTime ||
        changes.dailyCompleted ||
        changes.currentStreak ||
        changes.bestStreak
    ) {
        loadDashboard();
        loadCalendar();
    }
});



// -----------------------------
// START
// -----------------------------

loadRequiredDays();
loadDashboard();



function refreshLiveTrackingStatus() {
    chrome.runtime.sendMessage(
        { type: "GET_TRACKER_STATE" },
        (state) => {
            const statusElement =
                document.getElementById("liveTrackingStatus");

            const detailsElement =
                document.getElementById("liveTrackingDetails");

            if (chrome.runtime.lastError || !state) {
                statusElement.textContent = "Unavailable";
                detailsElement.textContent =
                    "Unable to read tracker state.";
                return;
            }

            statusElement.textContent = state.counting
                ? "🟢 COUNTING"
                : "🟡 PAUSED";

            detailsElement.textContent =
                `Video: ${state.videoPlaying ? "Playing" : "Not playing"} | ` +
                `Tab visible: ${state.tabVisible ? "Yes" : "No"} | ` +
                `Window focused: ${state.windowFocused ? "Yes" : "No"} | ` +
                `User active: ${state.userActive ? "Yes" : "No"}`;
        }
    );
}

refreshLiveTrackingStatus();
setInterval(refreshLiveTrackingStatus, 1000);