
console.log("🔥 YOUTUBE TRACKER STARTED");

let lastPlaying = false;
let attachedVideo = null;

function checkVideo() {
    const video = document.querySelector("video");

    if (!video) {
        return;
    }

    const visible =
        document.visibilityState === "visible";

    const playing =
        visible &&
        !video.paused &&
        !video.ended &&
        video.readyState >= 2;

    chrome.runtime.sendMessage({
        type: "VIDEO_STATE",
        playing: playing,
        visible: visible
    }).catch(() => {});

    if (playing !== lastPlaying) {
        lastPlaying = playing;

        console.log(
            "Video playing:",
            playing,
            "| Visible:",
            visible
        );
    }
}


// Attach listeners to the current YouTube video element.
function attachVideoListeners() {
    const video = document.querySelector("video");

    if (!video || video === attachedVideo) {
        return;
    }

    attachedVideo = video;

    [
        "play",
        "playing",
        "pause",
        "ended",
        "waiting",
        "canplay",
        "loadeddata"
    ].forEach((eventName) => {
        video.addEventListener(eventName, checkVideo);
    });

    console.log("🎬 Video event listeners attached");

    checkVideo();
}


// Detect when YouTube replaces its video element.
const videoObserver = new MutationObserver(() => {
    attachVideoListeners();
});

videoObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
});


// Check periodically as a fallback.
setInterval(() => {
    attachVideoListeners();
    checkVideo();
}, 1000);


// Re-check after visibility or page lifecycle changes.
document.addEventListener("visibilitychange", checkVideo);
window.addEventListener("pageshow", checkVideo);

document.addEventListener("resume", checkVideo);


// Initial setup.
attachVideoListeners();
checkVideo();