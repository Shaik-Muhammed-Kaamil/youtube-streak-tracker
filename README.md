# 🔥 YouTube Streak Tracker

A personal Chrome extension that tracks active YouTube watch time and helps build consistent viewing habits through daily goals and streak tracking.

## ✨ Features

* **Active Watch-Time Tracking:** Tracks time when a YouTube video is playing and the required activity conditions are met.
* **Daily Goal:** A 10-minute watch-time target.
* **Custom Streak Days:** Select which days of the week count toward your streak.
* **Current and Best Streaks:** Monitor your consistency over time.
* **Calendar Dashboard:** Review daily progress and goal completion.
* **Persistent Storage:** Saves tracking data locally using Chrome Storage.

## 🛠️ Built With

* JavaScript
* HTML5
* CSS3
* Chrome Extensions API
* Manifest V3

## 🚀 Installation (Developer Mode)

1. Download or clone this repository.
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the project folder containing `manifest.json`.
6. Open YouTube and start playing a video.
7. Click the extension icon to view your watch time and streak dashboard.

## ⚙️ How It Works

The extension monitors video playback, tab visibility, browser focus, and user activity. Eligible watching time contributes toward the daily goal. Completed goals are used to calculate streaks on your selected days.

## 🧪 Current Status

Personal project / prototype. Some tracking scenarios, such as resuming playback after the YouTube page has been inactive, may require further testing and improvement.

## 🔮 Future Improvements

* Improve automatic recovery after playback resumes.
* Add a standalone dashboard window.
* Improve tracking reliability and edge-case handling.
* Add a demonstration video.

## 🔒 Privacy

This project is intended to store watch-time and streak data locally in Chrome storage. Review the source code and verify its behavior before relying on this statement for a public release.

## 👨‍💻 Author

Built as a hands-on project to explore browser APIs, event-driven programming, persistent storage, and productivity tools.
