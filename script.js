// Version info
const APP_VERSION = "2.1.0";

const whatsNew = `
    <strong>Thoughts v2.1.0</strong><br>
    🖼️ <strong>Share as Image</strong> — turn any note into a beautiful shareable card<br>
    ⏰ Smart dates — "2h ago", "yesterday" instead of raw timestamps<br>
    📖 Reading time & word count on every note<br>
    🔥 Writing streak tracker<br>
    📊 Live stats as you type<br>
    ✨ Smooth animations & glass effects<br>
    🔧 Fixed update system & PWA reliability<br><br>
    <small>Always back up your notes via Export at the bottom.</small>
`;

// Initialize the AudioContext
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Create a GainNode for volume control
const gainNode = audioContext.createGain();
gainNode.gain.value = 1.0; // Set to maximum volume (range: 0.0 to 1.0)
gainNode.connect(audioContext.destination); // Connect to output

// Define all sound files used in the app
const soundFiles = [
    '/sounds/click.ogg',
    '/sounds/error.ogg',
    '/sounds/success.ogg',
    '/sounds/stars.ogg',
    '/sounds/tone.ogg',
    '/sounds/long-touch.ogg',
    '/sounds/single-firework.ogg',
    '/sounds/fireworksschoolprid.ogg',
    '/sounds/shooting-stars.ogg',
    '/sounds/snow.ogg',
    '/sounds/fireworks.ogg'
];

// Define critical sounds for initial preload
const criticalSounds = ['/sounds/click.ogg', '/sounds/error.ogg', '/sounds/success.ogg'];

// Store decoded audio buffers
const soundBuffers = new Map();

// Preload sound files into buffers
async function preloadSound(src) {
    if (soundBuffers.has(src)) return; // Already preloaded
    try {
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        soundBuffers.set(src, audioBuffer);
        console.log(`Preloaded sound: ${src}`);
    } catch (err) {
        console.warn(`Failed to preload sound (${src}):`, err);
    }
}

// Unlock audio context and preload critical sounds on page load
document.addEventListener("DOMContentLoaded", () => {
    // Unlock audio context on first touch/click for mobile
    const unlockAudio = () => {
        if (audioContext.state === "suspended") {
            audioContext.resume().then(() => {
                console.log("Audio context resumed");
                // Preload critical sounds after unlocking
                criticalSounds.forEach(src => preloadSound(src));
            }).catch(err => console.warn("Audio resume failed:", err));
        }
        document.removeEventListener("touchstart", unlockAudio);
        document.removeEventListener("click", unlockAudio);
    };
    document.addEventListener("touchstart", unlockAudio, { once: true });
    document.addEventListener("click", unlockAudio, { once: true }); // Fallback for non-touch devices
});

// Play sound using Web Audio API with full volume
const throttledPlaySound = throttle(async (src) => {
    if (!soundFiles.includes(src)) {
        console.warn(`Sound file ${src} not found in soundFiles array`);
        return;
    }

    // Ensure audio context is running
    if (audioContext.state === "suspended") {
        await audioContext.resume();
    }

    // Lazy-load sound if not preloaded
    if (!soundBuffers.has(src)) {
        await preloadSound(src);
    }

    // If still not loaded (e.g., fetch failed), skip playback
    if (!soundBuffers.has(src)) {
        console.warn(`Sound (${src}) not available for playback`);
        return;
    }

    // Create and play the sound with full volume
    const source = audioContext.createBufferSource();
    source.buffer = soundBuffers.get(src);
    source.connect(gainNode); // Connect to gainNode instead of directly to destination
    source.start(0);
}, 100);

// Attach to button clicks
document.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
        console.log("Button clicked! Playing sound...");
        throttledPlaySound('/sounds/click.ogg');
    });
});

// Optional: Function to adjust volume dynamically if needed
function setVolume(level) {
    gainNode.gain.value = Math.max(0, Math.min(1, level)); // Clamp between 0 and 1
    console.log(`Volume set to: ${gainNode.gain.value}`);
}

// ── Service Worker Registration ──
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/service-worker.js")
            .then(registration => {
                console.log("ServiceWorker registered:", registration.scope);

                // When a new SW is found, it will install and go to 'waiting' state
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log("New version available (SW waiting)");
                            checkForUpdates();
                        }
                    });
                });
            })
            .catch(err => console.warn("ServiceWorker registration failed:", err));
    });

    // When the SW takes over, reload once to get fresh assets
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!sessionStorage.getItem('sw-reloaded')) {
            sessionStorage.setItem('sw-reloaded', '1');
            window.location.reload();
        }
    });
}

// ── Clean Update System ──

function checkForUpdates() {
    if (!navigator.onLine) return;

    fetch(`/manifest.json?t=${Date.now()}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(manifest => {
            const currentVersion = localStorage.getItem('appVersion') || APP_VERSION;
            if (manifest.version !== currentVersion) {
                showUpdateNotification(manifest.version);
            }
        })
        .catch(() => {});
}

function showUpdateNotification(newVersion) {
    if (document.querySelector('.update-notification')) return;

    const isMobile = window.innerWidth <= 768;
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    Object.assign(notification.style, {
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(20, 23, 26, 0.85)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        borderRadius: '20px',
        padding: isMobile ? '20px' : '24px',
        maxWidth: isMobile ? '90vw' : '340px',
        width: '100%',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        color: '#ffffff',
        textAlign: 'center',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        zIndex: '99999'
    });

    const title = document.createElement('p');
    title.textContent = texts.newUpdateTitle || 'Update Available';
    Object.assign(title.style, { fontSize: '17px', fontWeight: '700', margin: '0', lineHeight: '1.3' });

    const versionText = document.createElement('p');
    versionText.textContent = `Version ${newVersion}`;
    Object.assign(versionText.style, { fontSize: '14px', color: '#aaa', margin: '0' });

    const updateButton = document.createElement('button');
    updateButton.textContent = texts.updateNowButton || 'Update Now';
    Object.assign(updateButton.style, {
        background: '#34c759',
        color: '#fff',
        border: 'none',
        padding: '12px 0',
        borderRadius: '14px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        width: '100%',
        transition: 'background 0.2s ease'
    });
    updateButton.onmouseover = () => updateButton.style.background = '#2db84d';
    updateButton.onmouseout = () => updateButton.style.background = '#34c759';

    updateButton.addEventListener('click', () => {
        throttledPlaySound('/sounds/click.ogg');
        const currentDraft = elements.inputWrapper.value.trim();
        if (currentDraft) saveDraft(currentDraft);
        performUpdate(newVersion);
    });

    notification.appendChild(title);
    notification.appendChild(versionText);
    notification.appendChild(updateButton);
    document.body.appendChild(notification);
}

async function performUpdate(newVersion) {
    console.log(`Updating to version ${newVersion}...`);

    // 1. Save new version
    localStorage.setItem('appVersion', newVersion);

    // 2. Tell SW to skip waiting (takes over immediately)
    try {
        const reg = await navigator.serviceWorker.ready;
        if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
    } catch (e) {
        console.warn('SW skipWaiting failed:', e);
    }

    // 3. Delete old caches (but NOT the new one)
    try {
        const keys = await caches.keys();
        await Promise.all(
            keys
                .filter(k => k !== `thoughts-v${newVersion}` && k.startsWith('thoughts-v'))
                .map(k => caches.delete(k))
        );
    } catch (e) {
        console.warn('Cache cleanup failed:', e);
    }

    // 4. Reload — the new SW will serve fresh assets
    window.location.reload();
}

// Check for updates on load + every 30 minutes
checkForUpdates();
setInterval(checkForUpdates, 30 * 60 * 1000);

// Check when coming back online
window.addEventListener('online', () => setTimeout(checkForUpdates, 2000));

let languageData = {};
let selectedLanguage = localStorage.getItem("language") || "english";
let isGodMode = localStorage.getItem("isGodMode") === "true";
let texts = {};
let editIndex = null;
let updateEditState;
let originalLanguageData = {};
const DEFAULT_CHAR_LIMIT = 500;
let currentCharLimit;
let hasSeenVolumeNotification = localStorage.getItem("hasSeenVolumeNotification") === "true";
let isZoomEnabled = localStorage.getItem("isZoomEnabled") === "true" || false;

// Simple hash function (djb2 variant)
function simpleHash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return hash >>> 0;
}

// Precomputed hash of the secret code
const SECRET_CODE_HASH = 3912020992;

// Utility: Throttle function (optimized)
function throttle(func, limit) {
    let inThrottle;
    let lastArgs;
    return function (...args) {
        lastArgs = args;
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
                if (lastArgs !== args) func.apply(this, lastArgs); // Catch final call
            }, limit);
        }
    };
}

// Utility: Debounce function (for rendering)
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Function to detect if the user is on a PC
function isPC() {
    const userAgent = navigator.userAgent.toLowerCase();
    // Common PC identifiers: Windows, Mac, Linux (excluding mobile versions)
    const pcPatterns = /(windows nt|macintosh|linux (?!.*android))/i;
    const mobilePatterns = /(android|iphone|ipad|mobile|tablet)/i;
    
    // If it matches a PC pattern and does NOT match a mobile pattern, it's a PC
    return pcPatterns.test(userAgent) && !mobilePatterns.test(userAgent);
}

// Notification creation function (consolidated)
function createNotification(message, options = {}) {
    const { background = "rgba(20, 23, 26, 0.85)", color = "#ffffff", duration = 1500, top = "20px", zIndex = "3000" } = options;
    const notificationDiv = document.createElement("div");
    notificationDiv.textContent = message;
    Object.assign(notificationDiv.style, {
        position: "fixed",
        top,
        left: "50%",
        transform: "translateX(-50%)",
        background,
        color,
        padding: "14px 28px",
        borderRadius: "16px",
        boxShadow: "0 6px 16px rgba(0, 0, 0, 0.3)",
        zIndex,
        fontSize: "18px",
        fontWeight: "600",
        textAlign: "center",
        maxWidth: "90%",
        opacity: "0",
        transition: "opacity 0.3s ease-in-out",
        ...(window.innerWidth <= 768 && { fontSize: "16px", padding: "12px 20px", margin: "0 12px" })
    });
    if (background === "rgba(20, 23, 26, 0.85)") {
        Object.assign(notificationDiv.style, {
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        });
    }
    document.body.appendChild(notificationDiv);
    setTimeout(() => notificationDiv.style.opacity = "1", 10);
    setTimeout(() => {
        notificationDiv.style.opacity = "0";
        setTimeout(() => notificationDiv.remove(), 300);
    }, duration);
}

// Specific notification types
function showGodModeNotification() {
    throttledPlaySound('/sounds/stars.ogg');
    createNotification("God Mode Unlocked", { background: "rgba(255, 215, 0, 0.9)", color: "#000", duration: 1500 });
}
function showSuccess(message) {
    throttledPlaySound('/sounds/success.ogg');
    createNotification(message, { duration: 4500 });
}
function showLanguageChangeNotification(language, showWelcome = false) {
    const langName = languageData[language].name || language;
    let message;
    
    if (showWelcome) {
        message = (texts.welcomeMessage || "Welcome! Language set to \"{name}\".").replace("{name}", langName);
    } else {
        message = (texts.applyingLanguageMessage || "Language switched to \"{name}\".").replace("{name}", langName);
    }
    
    createNotification(message, { duration: 1500 });
}

function toRoman(num) {
    if (num === 0) return "";
    const romanValues = [
        { value: 1000, numeral: "M" },
        { value: 900, numeral: "CM" },
        { value: 500, numeral: "D" },
        { value: 400, numeral: "CD" },
        { value: 100, numeral: "C" },
        { value: 90, numeral: "XC" },
        { value: 50, numeral: "L" },
        { value: 40, numeral: "XL" },
        { value: 10, numeral: "X" },
        { value: 9, numeral: "IX" },
        { value: 5, numeral: "V" },
        { value: 4, numeral: "IV" },
        { value: 1, numeral: "I" }
    ];
    let result = "";
    for (const { value, numeral } of romanValues) {
        while (num >= value) {
            result += numeral;
            num -= value;
        }
    }
    return result;
}

function updateHeaderTitle() {
    const headerTitle = document.querySelector("header h1");
    if (headerTitle) {
        const posts = JSON.parse(localStorage.getItem("posts") || "[]");
        const postCount = posts.length;
        headerTitle.textContent = `${texts.appName} ${toRoman(postCount)}`;
    }
}

// Async fetch for languages
async function fetchLanguages() {
    try {
        // Load from localStorage first (instant)
        const storedLanguages = JSON.parse(localStorage.getItem("customLanguages") || "{}");
        const storedOriginal = JSON.parse(localStorage.getItem("originalLanguageData") || "{}");
        
        // Fetch from server as a fallback or initial setup
        const response = await fetch("/languages.json");
        originalLanguageData = await response.json();
        localStorage.setItem("originalLanguageData", JSON.stringify(originalLanguageData)); // Save instantly

        // Merge with custom languages
        languageData = { ...originalLanguageData, ...storedLanguages };

        // Check cache for newer custom languages
        const cachedLanguages = await caches.match("/languages");
        if (cachedLanguages) {
            const cachedData = JSON.parse(await cachedLanguages.text());
            if (cachedData.timestamp > (localStorage.getItem("languageTimestamp") || 0)) {
                Object.assign(languageData, cachedData.data);
                localStorage.setItem("customLanguages", JSON.stringify(cachedData.data));
                localStorage.setItem("languageTimestamp", cachedData.timestamp);
            }
        }

        // Ensure selected language exists, fallback to english
        if (!languageData[selectedLanguage]) {
            selectedLanguage = "english";
            localStorage.setItem("language", "english");
        }

        texts = languageData[selectedLanguage];
        currentCharLimit = isGodMode ? (texts.charLimit * 2 - 1) : texts.charLimit;
        texts.charCount = `{count}/${currentCharLimit}`;

        const splashTitle = document.getElementById("splash-title");
        splashTitle.textContent = texts.appName;
        splashTitle.classList.add("scale-110");
        setTimeout(() => splashTitle.classList.remove("scale-110"), 300);
    } catch (err) {
        console.error("Failed to load languages:", err);
        languageData = JSON.parse(localStorage.getItem("customLanguages") || "{}") || { english: { appName: "Thoughts", addButton: "Add", charLimit: DEFAULT_CHAR_LIMIT } };
        selectedLanguage = "english";
        localStorage.setItem("language", "english");
        texts = languageData[selectedLanguage];
        currentCharLimit = isGodMode ? (texts.charLimit * 2 - 1) : texts.charLimit;
    }
    // Backup to service worker cache asynchronously
    saveLanguagesToCache();
}

function saveLanguagesToCache() {
    const languagePayload = {
        data: Object.keys(languageData)
            .filter(key => !originalLanguageData[key]) // Only custom languages
            .reduce((obj, key) => {
                obj[key] = languageData[key];
                return obj;
            }, {}),
        timestamp: Date.now()
    };
    localStorage.setItem("customLanguages", JSON.stringify(languagePayload.data));
    localStorage.setItem("languageTimestamp", languagePayload.timestamp);
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then(reg => {
            reg.active?.postMessage({
                type: "SAVE_LANGUAGES",
                languages: JSON.stringify(languagePayload)
            });
        }).catch(err => console.warn("Failed to save languages to cache:", err));
    }
}

function getLocalizedDateString() {
    const today = new Date();
    const dayIndex = today.getDay();
    const date = today.getDate();
    const monthIndex = today.getMonth();
    const year = today.getFullYear();
  
    const currentTexts = languageData[selectedLanguage] || languageData["english"];
    let dayName, monthName;
  
    if (currentTexts.days && currentTexts.months) {
      dayName = currentTexts.days[dayIndex];
      monthName = currentTexts.months[monthIndex];
    } else {
      // Fallback to browser's locale formatting
      const locale = selectedLanguage === "english" ? "en-US" : selectedLanguage;
      dayName = today.toLocaleDateString(locale, { weekday: "long" });
      monthName = today.toLocaleDateString(locale, { month: "long" });
    }
  
    return `${dayName}, ${monthName} ${date}, ${year}`;
}

// Add this new function to apply zoom state silently
function applyZoomStateSilently() {
    const metaViewport = document.querySelector('meta[name="viewport"]');
    if (!metaViewport) {
        const newMeta = document.createElement("meta");
        newMeta.name = "viewport";
        newMeta.content = isZoomEnabled 
            ? "width=device-width, initial-scale=1.0" 
            : "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
        document.head.appendChild(newMeta);
    } else {
        metaViewport.content = isZoomEnabled 
            ? "width=device-width, initial-scale=1.0" 
            : "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
    }
    const zoomToggleBtn = document.getElementById("zoom-toggle");
    if (zoomToggleBtn) {
        zoomToggleBtn.textContent = isZoomEnabled 
            ? (texts.zoomEnabledText || "Zoom: On") 
            : (texts.zoomDisabledText || "Zoom: Off");
    }
}

// Update toggleZoom to only handle user interaction
function saveAppSettings(lang, zoomEnabled) {
    if (lang) localStorage.setItem("language", lang);
    if (zoomEnabled !== undefined) localStorage.setItem("isZoomEnabled", zoomEnabled.toString());
}

// Update toggleZoom to only handle user interaction
function toggleZoom() {
    isZoomEnabled = !isZoomEnabled;
    saveAppSettings(null, isZoomEnabled); // Save immediately

    // Add a small delay to ensure data is persisted
    setTimeout(() => {
        applyZoomStateSilently(); // Apply the state
        createNotification(
            isZoomEnabled
                ? (texts.zoomEnabledNotification || "Zoom Enabled")
                : (texts.zoomDisabledNotification || "Zoom Disabled"),
            { duration: 1500 }
        );
    }, 50); // Small delay
}

// Modify the initial zoom application in DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
    applyZoomStateSilently(); // Apply initial state silently
});

// Main app initialization
document.addEventListener("DOMContentLoaded", async () => {
    await fetchLanguages();

    const customLanguages = JSON.parse(localStorage.getItem("customLanguages") || "{}");
    Object.assign(languageData, customLanguages);

    // DOM elements
    const elements = {
        postButton: document.getElementById("post-button"),
        postContainer: document.getElementById("post-container"),
        inputWrapper: document.getElementById("public-input"),
        charCount: document.getElementById("char-count"),
        deleteAllButton: document.getElementById("delete-all"),
        deleteConfirmation: document.getElementById("delete-confirmation"),
        confirmDelete: document.getElementById("confirm-delete"),
        cancelDelete: document.getElementById("cancel-delete"),
        searchInput: document.getElementById("search-input"),
        scrollToTopButton: document.getElementById("scroll-to-top"),
        clearSearch: document.querySelector(".clear-search"),
        cancelEditButton: document.getElementById("cancel-edit"),
        hashtagList: document.getElementById("hashtag-list"),
        footer: document.getElementById("footer")
    };

    // Validate critical elements
    if (!elements.inputWrapper || !elements.postContainer || !elements.footer) {
        console.error("Critical DOM elements missing");
        createNotification("App initialization failed", { background: "#ef4444", duration: 5000 });
        return;
    }

    let actionContext = null;
    let activeHashtag = null;
    let lastSavedDraft = localStorage.getItem("draftNote") || "";
    let isSavingOnClose = false;

    await loadInitialData();
    applyZoomStateSilently();

    // Ensure God Mode state is applied correctly on init
    isGodMode = localStorage.getItem("isGodMode") === "true";
    if (isGodMode) {
        currentCharLimit = texts.charLimit * 2;
        texts.charCount = `{count}/${currentCharLimit}`;
        applyLanguage(selectedLanguage);
        renderPosts();
    } else {
        currentCharLimit = texts.charLimit;
        texts.charCount = `{count}/${currentCharLimit}`;
        applyLanguage(selectedLanguage);
        renderPosts();
    }

    // ═══════════════════════════════════════════════
    // TIER 1 + TIER 3: Power Features
    // ═══════════════════════════════════════════════

    // ── Smart relative date ("2h ago", "yesterday") ──
    function timeAgo(timestamp) {
        const now = new Date();
        const then = new Date(timestamp);
        const seconds = Math.floor((now - then) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 172800) return 'yesterday';
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;

        // Fallback to formatted date
        return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    // ── Reading time estimate ──
    function getReadingTime(text) {
        const words = text.trim().split(/\s+/).length;
        const minutes = Math.ceil(words / 200); // 200 wpm average
        return minutes < 1 ? '< 1 min read' : `${minutes} min read`;
    }

    // ── Word count ──
    function getWordCount(text) {
        return text.trim().split(/\s+/).filter(w => w.length > 0).length;
    }

    // ── Writing streak tracker ──
    function getWritingStreak() {
        const posts = JSON.parse(localStorage.getItem('posts') || '[]');
        if (posts.length === 0) return { current: 0, best: 0 };

        // Get unique days with posts
        const days = new Set();
        posts.forEach(p => {
            const d = new Date(p.timestamp);
            days.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
        });

        const sortedDays = [...days].map(d => {
            const [y, m, dd] = d.split('-').map(Number);
            return new Date(y, m, dd).getTime();
        }).sort((a, b) => b - a); // newest first

        let current = 1;
        let best = 1;
        let streak = 1;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if today or yesterday has a post for current streak
        const newest = sortedDays[0];
        const dayDiff = Math.floor((today.getTime() - newest) / 86400000);
        if (dayDiff > 1) {
            current = 0; // streak broken
        }

        for (let i = 0; i < sortedDays.length - 1; i++) {
            const diff = Math.floor((sortedDays[i] - sortedDays[i + 1]) / 86400000);
            if (diff === 1) {
                streak++;
                best = Math.max(best, streak);
                if (i === 0 || (current > 0 && i < sortedDays.length - 1)) current = streak;
            } else {
                streak = 1;
            }
        }

        // Recalculate current streak properly
        current = 1;
        for (let i = 0; i < sortedDays.length - 1; i++) {
            const diff = Math.floor((sortedDays[i] - sortedDays[i + 1]) / 86400000);
            if (diff === 1) {
                current++;
            } else {
                break;
            }
        }

        // Reset if no post today or yesterday
        const newestDay = Math.floor((today.getTime() - sortedDays[0]) / 86400000);
        if (newestDay > 1) current = 0;

        return { current, best: Math.max(best, current) };
    }

    // ── Generate shareable image from post ──
    function generatePostImage(post, index) {
        const { title, content } = extractTitleAndContent(post.text);
        const cleanTitle = title ? title.replace(/^@/, '') : null;
        const words = getWordCount(post.text);
        const readTime = getReadingTime(post.text);
        const relativeDate = timeAgo(post.timestamp);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const scale = 2; // retina
        const w = 600;
        const h = cleanTitle ? 380 : 320;
        canvas.width = w * scale;
        canvas.height = h * scale;
        ctx.scale(scale, scale);

        // Background gradient
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#0a0a0f');
        grad.addColorStop(0.5, '#111118');
        grad.addColorStop(1, '#0a0a0f');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(0, 0, w, h, 20);
        ctx.fill();

        // Subtle border
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(0.5, 0.5, w - 1, h - 1, 20);
        ctx.stroke();

        // Accent line at top
        const accentGrad = ctx.createLinearGradient(0, 0, w, 0);
        accentGrad.addColorStop(0, '#1d9bf0');
        accentGrad.addColorStop(0.5, '#7c6fff');
        accentGrad.addColorStop(1, '#f4212e');
        ctx.fillStyle = accentGrad;
        ctx.beginPath();
        ctx.roundRect(20, 0, w - 40, 3, [0, 0, 3, 3]);
        ctx.fill();

        let y = 40;

        // Title (if exists)
        if (cleanTitle) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            const titleLines = wrapText(ctx, cleanTitle, w - 60);
            titleLines.forEach(line => {
                ctx.fillText(line, 30, y);
                y += 28;
            });
            y += 8;
        }

        // Content
        ctx.fillStyle = '#b0b3b8';
        ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        const contentLines = wrapText(ctx, content.replace(/#\w+/g, '').trim(), w - 60, 6); // max 6 lines
        contentLines.forEach(line => {
            ctx.fillText(line, 30, y);
            y += 24;
        });

        // Divider
        y = h - 80;
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(w - 30, y);
        ctx.stroke();

        // Meta row
        y += 24;
        ctx.fillStyle = '#666';
        ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillText(`${relativeDate}  •  ${words} words  •  ${readTime}`, 30, y);

        // Branding
        ctx.fillStyle = '#1d9bf0';
        ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Thoughts ✦', w - 30, y);
        ctx.textAlign = 'left';

        // Hashtags at bottom
        const hashtags = (post.text.match(/#\w+/g) || []).slice(0, 3);
        if (hashtags.length > 0) {
            y += 24;
            ctx.fillStyle = '#1d9bf0';
            ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.fillText(hashtags.join('  '), 30, y);
        }

        return canvas;
    }

    function wrapText(ctx, text, maxWidth, maxLines) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            if (ctx.measureText(testLine).width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
                if (maxLines && lines.length >= maxLines) {
                    lines[lines.length - 1] += '...';
                    return lines;
                }
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);
        return lines;
    }

    // ── Share as image ──
    async function sharePostAsImage(post, index) {
        const canvas = generatePostImage(post, index);

        canvas.toBlob(async (blob) => {
            if (!blob) {
                createNotification('Failed to generate image', { background: '#ef4444' });
                return;
            }

            const file = new File([blob], 'thought.png', { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'Thoughts',
                        text: post.text.substring(0, 100)
                    });
                    createNotification('Shared as image!', { background: 'rgba(34,197,94,0.9)', color: '#fff' });
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        downloadImage(canvas);
                    }
                }
            } else {
                downloadImage(canvas);
            }
        }, 'image/png');
    }

    function downloadImage(canvas) {
        const link = document.createElement('a');
        link.download = `thought-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        createNotification('Image saved!', { background: 'rgba(34,197,94,0.9)', color: '#fff' });
    }

    // ── Share menu (text or image) ──
    function showShareMenu(post, index, shareBadge) {
        // Remove existing share menu
        document.querySelectorAll('.share-menu-popup').forEach(el => el.remove());

        const rect = shareBadge.getBoundingClientRect();
        const menu = document.createElement('div');
        menu.className = 'share-menu-popup';
        Object.assign(menu.style, {
            position: 'fixed',
            top: (rect.bottom + 8) + 'px',
            left: Math.min(rect.left, window.innerWidth - 200) + 'px',
            background: 'rgba(20, 23, 26, 0.9)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            zIndex: '99999',
            overflow: 'hidden',
            minWidth: '180px',
            animation: 'menuSlideIn 0.15s ease-out'
        });

        menu.innerHTML = `
            <button class="share-menu-item" data-action="text" style="
                display:flex;align-items:center;gap:10px;width:100%;
                padding:12px 16px;background:none;border:none;color:#fff;
                font-size:14px;cursor:pointer;text-align:left;
            ">
                <span style="font-size:18px;">📝</span>
                <span>Share as Text</span>
            </button>
            <button class="share-menu-item" data-action="image" style="
                display:flex;align-items:center;gap:10px;width:100%;
                padding:12px 16px;background:none;border:none;color:#fff;
                font-size:14px;cursor:pointer;text-align:left;
                border-top:1px solid rgba(255,255,255,0.06);
            ">
                <span style="font-size:18px;">🖼️</span>
                <span>Share as Image</span>
            </button>
            <button class="share-menu-item" data-action="copy" style="
                display:flex;align-items:center;gap:10px;width:100%;
                padding:12px 16px;background:none;border:none;color:#fff;
                font-size:14px;cursor:pointer;text-align:left;
                border-top:1px solid rgba(255,255,255,0.06);
            ">
                <span style="font-size:18px;">📋</span>
                <span>Copy to Clipboard</span>
            </button>
        `;

        document.body.appendChild(menu);

        // Close on outside click
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && e.target !== shareBadge) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 10);

        menu.querySelector('[data-action="text"]').onclick = () => {
            menu.remove();
            sharePostAsText(post);
        };

        menu.querySelector('[data-action="image"]').onclick = () => {
            menu.remove();
            sharePostAsImage(post, index);
        };

        menu.querySelector('[data-action="copy"]').onclick = () => {
            menu.remove();
            const { title, content } = extractTitleAndContent(post.text);
            const cleanTitle = title ? title.replace(/^@/, '') : '';
            const text = cleanTitle ? `${cleanTitle}\n${content}` : content;
            navigator.clipboard.writeText(text).then(() => {
                createNotification('Copied!', { background: 'rgba(34,197,94,0.9)', color: '#fff', duration: 1500 });
            });
        };
    }

    function sharePostAsText(post) {
        const { title, content } = extractTitleAndContent(post.text);
        const cleanTitle = title ? title.replace(/^@/, '') : '';
        const shareTextContent = cleanTitle ? `*${cleanTitle}*\n${content}` : content;
        const shareText = `${shareTextContent}\n\n— from Thoughts`;

        if (navigator.share) {
            navigator.share({ title: 'Thoughts', text: shareText })
                .then(() => createNotification('Shared!', { background: 'rgba(34,197,94,0.9)', color: '#fff' }))
                .catch(() => {});
        } else {
            navigator.clipboard.writeText(shareText).then(() => {
                createNotification('Copied to clipboard!', { background: 'rgba(34,197,94,0.9)', color: '#fff' });
            });
        }
    }

    // ── Input section live stats ──
    function updateInputStats() {
        const text = elements.inputWrapper.value;
        let statsEl = document.getElementById('input-live-stats');
        if (!statsEl) {
            statsEl = document.createElement('div');
            statsEl.id = 'input-live-stats';
            Object.assign(statsEl.style, {
                display: 'flex', gap: '12px', padding: '8px 4px 0',
                fontSize: '12px', color: '#666',
                fontFamily: 'system-ui, sans-serif',
                transition: 'opacity 0.2s ease'
            });
            elements.inputWrapper.parentElement.appendChild(statsEl);
        }

        if (text.trim().length === 0) {
            statsEl.style.opacity = '0';
            return;
        }

        statsEl.style.opacity = '1';
        const words = getWordCount(text);
        const readTime = getReadingTime(text);
        statsEl.innerHTML = `
            <span>${words} words</span>
            <span style="color:#444">•</span>
            <span>${readTime}</span>
            <span style="color:#444">•</span>
            <span>${text.length} chars</span>
        `;
    }

    // ── Streak badge in header ──
    function renderStreakBadge() {
        const streak = getWritingStreak();
        if (streak.current === 0 && streak.best === 0) return;

        let badge = document.getElementById('streak-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.id = 'streak-badge';
            Object.assign(badge.style, {
                fontSize: '13px', color: '#f39c12', marginLeft: '10px',
                fontWeight: '600', cursor: 'default', transition: 'all 0.3s ease'
            });
            const header = document.querySelector('header h1');
            if (header) header.parentElement.appendChild(badge);
        }

        if (streak.current > 0) {
            badge.textContent = `🔥 ${streak.current}d`;
            badge.title = `Writing streak: ${streak.current} day${streak.current > 1 ? 's' : ''} (best: ${streak.best})`;
        } else {
            badge.textContent = `💤`;
            badge.title = `Streak broken. Best was ${streak.best} days.`;
        }
    }

    // ── Keyboard shortcut: Ctrl+N = focus input ──
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            elements.inputWrapper.focus();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // Utility Functions
    function highlightHashtags(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text
            .replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
            .replace(/(\s|^)(#\w+)/g, '$1<span class="hashtag">$2</span>')
            .replace(/\n/g, "<br>");
    }

    function extractTitleAndContent(text) {
        const titleMatch = text.match(/^@(\w+)/);
        return titleMatch ? { title: titleMatch[0].substring(1), content: text.replace(/^@\w+\s*/, "") } : { title: null, content: text };
    }

    function getUniqueHashtags(posts) {
        const hashtagSet = new Set();
        posts.forEach(post => (post.text.match(/#\w+/g) || []).forEach(tag => hashtagSet.add(tag.substring(1))));
        return Array.from(hashtagSet);
    }

    function adjustHeight() {
        elements.inputWrapper.style.height = "auto";
        elements.inputWrapper.style.height = `${elements.inputWrapper.scrollHeight}px`;
    }

    // Save draft function
    function saveDraft(text) {
        if (text === lastSavedDraft) return; // Skip if unchanged
        localStorage.setItem("draftNote", text); // Synchronous primary storage
        lastSavedDraft = text;
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.ready.then(reg => {
                reg.active?.postMessage({ type: "SAVE_DRAFT", draft: text });
            }).catch(err => console.warn("SW draft save failed:", err));
        }
    }

    function showVolumeNotification() {
        if (hasSeenVolumeNotification) return; // Skip if already shown
    
        showCustomPopup(
            texts.volumeNotificationTitle || "Enhance Your Experience",
            texts.volumeNotificationMessage || "For the best experience with sound effects, please turn your device volume to maximum.",
            texts.okButton || "OK",
            () => {
                localStorage.setItem("hasSeenVolumeNotification", "true");
                hasSeenVolumeNotification = true;
            },
            false // No cancel button
        );
    }

    // Save post function
    function savePost(text) {
        try {
            const posts = JSON.parse(localStorage.getItem("posts") || "[]");
            const newPost = { text, timestamp: new Date().toLocaleString(), pinned: false };
            posts.push(newPost);
            const postsString = JSON.stringify(posts);
            try {
                localStorage.setItem("posts", postsString);
            } catch (e) {
                if (e.name === "QuotaExceededError") {
                    throttledPlaySound('/sounds/error.ogg')
                    showCustomPopup("Storage Full", "Cannot save post: storage limit reached. Delete some posts to free space.", "OK", () => {}, false);
                    return;
                }
                throw e; // Re-throw other errors
            }
            if ("serviceWorker" in navigator) {
                navigator.serviceWorker.ready.then(reg => {
                    reg.active?.postMessage({ type: "SAVE_POSTS", posts: postsString });
                }).catch(err => console.warn("SW posts save failed:", err));
            }
            debouncedRenderPosts();
        } catch (err) {
            console.error("Failed to save post:", err);
            throttledPlaySound('/sounds/error.ogg')
            showCustomPopup("Error", "Failed to save post. Try again.", "OK", () => {}, false);
        }
    }

    function togglePin(index) {
        try {
            const posts = JSON.parse(localStorage.getItem("posts") || "[]");
            const isPinned = posts[index].pinned;
            posts.forEach(post => (post.pinned = false)); // Unpin all
            if (!isPinned) posts[index].pinned = true;    // Pin the selected one
            const postsString = JSON.stringify(posts);
            localStorage.setItem("posts", postsString);
            if ("serviceWorker" in navigator) {
                navigator.serviceWorker.ready.then(reg => {
                    reg.active?.postMessage({ type: "SAVE_POSTS", posts: postsString });
                });
            }
            // Pass the current search filter to renderPosts
            const searchText = elements.searchInput.value.trim();
            renderPosts(searchText); // Preserve search filter
        } catch (err) {
            console.error("Failed to toggle pin:", err);
        }
    }

    // Load initial data
    async function loadInitialData() {
        try {
            // Load draft
            let draft = localStorage.getItem("draftNote") || "";
            const cachedDraft = await caches.match("/draft");
            if (cachedDraft) {
                const cachedText = await cachedDraft.text();
                if (cachedText && (!draft || new Date().getTime() - Date.parse(localStorage.getItem("draftTimestamp") || "0") < 0)) {
                    draft = cachedText;
                    localStorage.setItem("draftNote", draft);
                }
            }
            if (simpleHash(draft) === SECRET_CODE_HASH && !isGodMode) {
                draft = "";
                forceClearDraft();
            }
            lastSavedDraft = draft;
            elements.inputWrapper.value = draft;
            adjustHeight();
            elements.charCount.textContent = (texts.charCount || "{count} characters").replace("{count}", draft.length).replace("{count}", currentCharLimit);
    
            // Load posts
            const postsString = localStorage.getItem("posts") || "[]";
            const cachedPosts = await caches.match("/posts");
            if (cachedPosts) {
                const cachedPostsString = await cachedPosts.text();
                if (cachedPostsString && cachedPostsString !== postsString) {
                    localStorage.setItem("posts", cachedPostsString);
                }
            }
    
            // Load languages (already handled by fetchLanguages, just apply)
            applyLanguage(selectedLanguage);
        } catch (err) {
            console.error("Failed to load initial data:", err);
            const draft = localStorage.getItem("draftNote") || "";
            if (simpleHash(draft) === SECRET_CODE_HASH && !isGodMode) {
                forceClearDraft();
            }
            lastSavedDraft = draft;
            elements.inputWrapper.value = draft;
            adjustHeight();
            elements.charCount.textContent = (texts.charCount || "{count} characters").replace("{count}", draft.length).replace("{count}", currentCharLimit);
        }
    }

    // Closure save function
    function saveOnClose() {
        if (isSavingOnClose) return;
        isSavingOnClose = true;
        const text = elements.inputWrapper.value.trim();
        if (text && simpleHash(text) !== SECRET_CODE_HASH) { // Skip saving if it's the secret key
            saveDraft(text);
        } else if (simpleHash(text) === SECRET_CODE_HASH) {
            forceClearDraft(); // Clear secret key if detected during close
        }

            // Persist language and zoom state immediately
        localStorage.setItem("language", selectedLanguage);
        localStorage.setItem("isZoomEnabled", isZoomEnabled.toString());
        setTimeout(() => (isSavingOnClose = false), 100);
    }

    // Event listeners for closure
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") saveOnClose();
    });
    window.addEventListener("pagehide", saveOnClose);
    window.addEventListener("beforeunload", saveOnClose);

    // Throttled save for draft
    const throttledSaveDraft = throttle(saveDraft, 200); // Save every 200ms max
    const debouncedRenderPosts = debounce(renderPosts, 100); // Reduce DOM thrashing

    function showLanguageSelection(isNewUser = false) {
        const selectionDiv = document.getElementById("language-selection");
        if (!selectionDiv) {
            console.error("Language selection element not found in DOM");
            return;
        }
        const popupDiv = selectionDiv.querySelector(".twitter-popup");
        const chooseText = texts.chooseLanguage || "Choose Your Language";
    
        popupDiv.innerHTML = `
            <p class="mb-4 text-[1.375rem] font-bold text-white text-center md:text-[20px]">${chooseText}</p>
            <div id="language-list" class="language-list-container mb-6"></div>
            <button id="language-cancel" class="w-full bg-red-500 text-white font-semibold text-base py-2 px-6 rounded-[12px] shadow-lg hover:bg-red-600 transition-colors duration-300">${texts.cancelButton || "Cancel"}</button>
        `;
    
        const languageListDiv = popupDiv.querySelector("#language-list");
        const languages = { ...languageData };
        const langKeys = Object.keys(languages);
    
        langKeys.forEach(lang => {
            const langContainer = document.createElement("div");
            langContainer.className = "flex justify-between items-center mb-2";
    
            const button = document.createElement("button");
            button.className = "language-button text-left flex-1";
            button.textContent = languages[lang].name || lang;
            Object.assign(button.style, { "-webkit-tap-highlight-color": "transparent" });
            button.addEventListener("click", () => {
                throttledPlaySound('/sounds/click.ogg');
                selectedLanguage = lang;
                localStorage.setItem("language", lang);
                localStorage.setItem("hasSeenLanguagePrompt", "true");
                applyLanguage(lang);
                selectionDiv.classList.add("hidden");
                document.body.style.overflow = "";
                // Show welcome message only for new users, switch message for returning users
                showLanguageChangeNotification(lang, isNewUser && !hasSeenLanguagePrompt);
                showVolumeNotification(lang, isNewUser && !hasSeenVolumeNotification);
            });
    
            const deleteButton = document.createElement("button");
            deleteButton.innerHTML = `
                <svg class="w-5 h-5" viewBox="0 0 24 24" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M5 6h14l-1 14H6L5 6z"/>
                </svg>
            `;
            Object.assign(deleteButton.style, {
                marginLeft: "8px",
                width: "28px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                borderRadius: "50%",
                padding: "0",
                border: "none",
                cursor: "pointer",
                transition: "background-color 0.3s ease",
                "-webkit-tap-highlight-color": "transparent"
            });
            deleteButton.className = "hover:bg-[rgba(255,0,0,0.2)]";
            deleteButton.title = texts.deleteButton || "Delete";
            deleteButton.addEventListener("click", () => {
                throttledPlaySound('/sounds/tone.ogg');
                showCustomPopup(
                    texts.deleteLanguageTitle || "Delete Language?",
                    `${texts.deleteLanguageConfirm || "Are you sure you want to delete"} "${languages[lang].name || lang}"? ${texts.refreshMessage || "The app will refresh to apply changes."}`,
                    texts.confirmDeleteButton || "Delete",
                    () => {
                        delete languageData[lang];
                        if (selectedLanguage === lang) {
                            selectedLanguage = "english";
                            localStorage.setItem("language", "english");
                            applyLanguage("english");
                        } else {
                            applyLanguage(selectedLanguage);
                        }
                        if ("serviceWorker" in navigator) {
                            navigator.serviceWorker.ready.then(reg => {
                                reg.active?.postMessage({ type: "SAVE_LANGUAGES", languages: JSON.stringify({
                                    data: Object.keys(languageData)
                                        .filter(key => !originalLanguageData[key])
                                        .reduce((obj, key) => {
                                            obj[key] = languageData[key];
                                            return obj;
                                        }, {}),
                                    timestamp: Date.now()
                                }) });
                            });
                        }
                        selectionDiv.classList.add("hidden");
                        document.body.style.overflow = "";
                        window.location.reload();
                    },
                    true
                );
            });
    
            langContainer.appendChild(button);
            if (!originalLanguageData[lang]) langContainer.appendChild(deleteButton);
            languageListDiv.appendChild(langContainer);
        });
    
        document.getElementById("language-cancel").addEventListener("click", () => {
            throttledPlaySound('/sounds/click.ogg');
            selectionDiv.classList.add("hidden");
            document.body.style.overflow = "";
        });
    
        if (langKeys.length > 5) {
            languageListDiv.classList.add("scrolling-enabled");
            setInterval(() => languageListDiv.scrollBy({ top: 40, behavior: "smooth" }), 2500);
        }
    
        selectionDiv.classList.remove("hidden");
        document.body.style.overflow = "hidden";
    }

    function updateFooterCopyright() {
        const footerRightsReserved = document.getElementById("footer-rights-reserved");
        if (footerRightsReserved) {
          const dateString = getLocalizedDateString();
          footerRightsReserved.innerHTML = `© ${dateString}. ${texts.footerRightsReserved || "All Rights Reserved"}`;
        }
    }
    
      // Initial call to set footer
      updateFooterCopyright();

    function applyLanguage(lang) {
        saveAppSettings(lang, undefined);
        setTimeout(() => { 
            texts = { ...languageData[lang] || languageData["english"], ...JSON.parse(localStorage.getItem("customComponents") || "{}") };
            currentCharLimit = isGodMode ? (texts.charLimit * 2 - 1) : texts.charLimit;
            texts.charCount = `{count}/${currentCharLimit}`;
            selectedLanguage = lang;

            localStorage.setItem("language", lang);
        
            const headerTitle = document.querySelector("header h1");
            if (headerTitle) {
                const posts = JSON.parse(localStorage.getItem("posts") || "[]");
                const postCount = posts.length;
                headerTitle.textContent = `${texts.appName} ${toRoman(postCount)}`;
            } else {
                console.warn("Header title element not found; skipping text update.");
            }

            // Update zoom toggle button text without notification
            const zoomToggleBtn = document.getElementById("zoom-toggle");
            if (zoomToggleBtn) {
                zoomToggleBtn.textContent = isZoomEnabled 
                    ? (texts.zoomEnabledText || "Zoom: On") 
                    : (texts.zoomDisabledText || "Zoom: Off");
            }

            // Update notification texts
            if (texts.zoomEnabledNotification) {
                toggleZoom.notificationEnabledText = texts.zoomEnabledNotification;
            }
            if (texts.zoomDisabledNotification) {
                toggleZoom.notificationDisabledText = texts.zoomDisabledNotification;
            }

            // Add footer description
            const footerDescription = document.getElementById("footer-description");
            if (footerDescription) {
                footerDescription.textContent = texts.footerDescription || "Efficiently crafted: Entire app under 1MB, including all assets.";
            }
        
            if (elements.deleteAllButton) elements.deleteAllButton.textContent = texts.deleteAllButton;
            if (elements.searchInput) elements.searchInput.placeholder = texts.searchPlaceholder;
            if (elements.inputWrapper) elements.inputWrapper.placeholder = texts.inputPlaceholder;
            if (elements.postButton) elements.postButton.textContent = texts.addButton;
            if (elements.cancelEditButton) elements.cancelEditButton.textContent = texts.cancelEditButton;
        
            const exportNotesBtn = document.getElementById("export-notes");
            if (exportNotesBtn) exportNotesBtn.textContent = texts.exportButton;
        
            const importTriggerBtn = document.getElementById("import-trigger");
            if (importTriggerBtn) importTriggerBtn.textContent = texts.importButton;
        
            const languageSwitchBtn = document.getElementById("language-switch");
            if (languageSwitchBtn) languageSwitchBtn.textContent = texts.name;
        
            const uploadLanguageTriggerBtn = document.getElementById("upload-language-trigger");
            if (uploadLanguageTriggerBtn) uploadLanguageTriggerBtn.textContent = texts.uploadLanguage || "Upload Language";
        
            const footerOfflineTitle = document.getElementById("footer-offline-title");
            if (footerOfflineTitle) footerOfflineTitle.textContent = texts.footerOfflineTitle;
        
            const footerOfflineText = document.getElementById("footer-offline-text");
            if (footerOfflineText) footerOfflineText.textContent = texts.footerOfflineText;
        
            const footerAndroidGuide = document.getElementById("footer-android-guide");
            if (footerAndroidGuide) footerAndroidGuide.textContent = texts.footerAndroidGuide;
        
            const footerIosGuide = document.getElementById("footer-ios-guide");
            if (footerIosGuide) footerIosGuide.textContent = texts.footerIOSGuide;
        
            const footerTitle = document.getElementById("footer-title");
            if (footerTitle) footerTitle.textContent = texts.appName;
        
            const craftedByText = document.getElementById("crafted-by-text");
            if (craftedByText) craftedByText.textContent = texts.footerCraftedBy + " ";
        
            const footerWebstoreTitle = document.getElementById("footer-webstore-title");
            if (footerWebstoreTitle) footerWebstoreTitle.textContent = texts.webStoreTitle || "Web Store";
        
            const footerWebstoreLink = document.getElementById("footer-webstore-link");
            if (footerWebstoreLink) footerWebstoreLink.textContent = texts.webStoreLinkText || "Visit Web Store";
        
            const footerWebstoreNote = document.getElementById("footer-webstore-note");
            if (footerWebstoreNote) footerWebstoreNote.textContent = texts.webStoreNote || "Download your favorite language from the site and upload it to the app using the Upload Language option.";
        
            const footerPrivacy = document.getElementById("footer-privacy");
            if (footerPrivacy) footerPrivacy.textContent = texts.footerPrivacy;
        
            const footerMadeWithLove = document.getElementById("footer-made-with-love");
            if (footerMadeWithLove) footerMadeWithLove.textContent = texts.footerMadeWithLove;
        
            updateFooterCopyright();
            // Persist immediately
            localStorage.setItem("language", lang);
            localStorage.setItem("isGodMode", isGodMode.toString());
            saveLanguagesToCache(); // Asynchronous cache backup
            updateDynamicText();
        }, 50);
        // Removed: showLanguageChangeNotification(lang); // No automatic notification here
    }

    // Utility to force-clear draft across all storage mechanisms
    function forceClearDraft() {
        localStorage.removeItem("draftNote");
        lastSavedDraft = "";
        elements.inputWrapper.value = "";
        elements.charCount.textContent = (texts.charCount || "{count} characters").replace("{count}", "0").replace("{count}", currentCharLimit);
        elements.charCount.classList.remove("text-red-500");
    
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.ready.then(reg => {
                reg.active?.postMessage({ type: "CLEAR_DRAFT" });
            }).catch(err => console.warn("Failed to notify SW to clear draft:", err));
        }
    
        if ("caches" in window) {
            caches.open("thoughts-app-cache").then(cache => {
                cache.delete("/draft").catch(err => console.warn("Failed to delete cached draft:", err));
            });
        }
    }    

    async function activateGodMode() {
        isGodMode = true;
        currentCharLimit = texts.charLimit * 2;
        texts.charCount = `{count}/${currentCharLimit}`;
        forceClearDraft();
        applyLanguage(selectedLanguage); // This will persist isGodMode
        debouncedRenderPosts();
        showGodModeNotification();
    }

    function showGodModeConfirmation(callback) {
        document.body.style.overflow = "hidden";
        const overlayDiv = document.createElement("div");
        overlayDiv.className = "fixed inset-0 bg-[rgba(0,0,0,0.4)] backdrop-blur-[6px] z-[3999]";
        const popupDiv = document.createElement("div");
        popupDiv.className = "fixed inset-0 flex items-center justify-center z-[4000] px-4 transition-opacity duration-300";
        popupDiv.style.opacity = "0";
        popupDiv.innerHTML = `
            <div class="bg-[rgba(0,0,0,0.95)] backdrop-blur-[8px] rounded-[16px] p-6 w-full max-w-[320px] shadow-lg border-[rgba(255,255,255,0.1)]">
                <p class="text-lg md:text-[20px] font-semibold text-white mb-3 text-center">Unlock God Mode?</p>
                <p class="text-sm text-[#d9d9d9] mb-4 text-center">Enter 'yes' to confirm</p>
                <input type="text" id="god-mode-confirm-input" class="w-full p-4 text-base text-white bg-[rgba(20,23,26,0.7)] rounded-[16px] border-[#333639] mb-4 focus:outline-none focus:border-[#1d9bf0] transition-colors duration-300" placeholder="Type 'yes' here">
                <div class="flex justify-between gap-3">
                    <button id="god-mode-confirm-btn" class="flex-1 bg-[#1d9bf0] text-white font-semibold text-base py-[10px] px-4 rounded-full hover:bg-[#1a8cd8] transition-colors duration-300">Confirm</button>
                    <button id="god-mode-cancel-btn" class="flex-1 bg-red-500 text-white font-semibold text-base py-[10px] px-4 rounded-full hover:bg-red-600 transition-colors duration-300">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlayDiv);
        document.body.appendChild(popupDiv);
        
        // Show popup with animation
        setTimeout(() => popupDiv.style.opacity = "1", 10);
        
        // Get elements
        const confirmBtn = document.getElementById("god-mode-confirm-btn");
        const cancelBtn = document.getElementById("god-mode-cancel-btn");
        const confirmInput = document.getElementById("god-mode-confirm-input");
        
        // Auto-focus the input field
        setTimeout(() => {
            confirmInput.focus();
            confirmInput.select(); // Optional: selects any existing text
        }, 50); // Small delay to ensure popup is rendered
        
        confirmBtn.onclick = () => {
            throttledPlaySound('/sounds/click.ogg');
            if (confirmInput.value.trim().toLowerCase() === "yes") {
                popupDiv.style.opacity = "0";
                setTimeout(() => {
                    forceClearDraft();
                    callback();
                    popupDiv.remove();
                    overlayDiv.remove();
                    document.body.style.overflow = "";
                }, 300);
            }
        };
        
        cancelBtn.onclick = () => {
            throttledPlaySound('/sounds/click.ogg');
            popupDiv.style.opacity = "0";
            setTimeout(() => {
                forceClearDraft();
                popupDiv.remove();
                overlayDiv.remove();
                document.body.style.overflow = "";
            }, 300);
        };
        
        // Optional: Allow Enter key to confirm
        confirmInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter" && confirmInput.value.trim().toLowerCase() === "yes") {
                confirmBtn.click();
            }
        });
    }

    function renderPosts(filterText = "") {
        try {
            const posts = JSON.parse(localStorage.getItem("posts") || "[]");
            elements.postContainer.innerHTML = "";
            console.log("Rendering posts:", posts);
    
            // Update header title with post count
            const headerTitle = document.querySelector("header h1");
            if (headerTitle) {
                headerTitle.textContent = `${texts.appName} ${toRoman(posts.length)}`;
            }
    
            if (posts.length === 0) {
                elements.postContainer.innerHTML = `<div class="no-posts">${texts.noPostsMessage}</div>`;
            } else {
                const filteredPosts = activeHashtag
                    ? posts.filter(post => post.text.includes(`#${activeHashtag}`))
                    : posts.filter(post => post.text.toLowerCase().includes(filterText.toLowerCase()));
                if (filteredPosts.length === 0) {
                    elements.postContainer.innerHTML = `<div class="no-results">${texts.noResultsMessage}</div>`;
                } else {
                    const pinnedPosts = filteredPosts.filter(post => post.pinned);
                    const regularPosts = filteredPosts.filter(post => !post.pinned);
                    pinnedPosts.forEach((post, index) => renderPost(post, posts.indexOf(post), true));
                    regularPosts.reverse().forEach((post, index) => renderPost(post, posts.indexOf(post), false));
                }
            }
            renderHashtagList(posts);
            elements.footer.classList.remove("hidden");
            renderStreakBadge(); // Tier 3: writing streak
        } catch (err) {
            console.error("Failed to render posts:", err);
            elements.postContainer.innerHTML = `<div class="no-posts">Error loading posts</div>`;
        }
    }

    function showCustomPopup(title, message, confirmText, confirmAction, showCancel = true) {
        const popupDiv = document.getElementById("custom-popup");
        const titleEl = document.getElementById("custom-popup-title");
        const messageEl = document.getElementById("custom-popup-message");
        const confirmBtn = document.getElementById("custom-popup-confirm");
        const cancelBtn = document.getElementById("custom-popup-cancel");

        titleEl.textContent = title;
        messageEl.innerHTML = message;
        confirmBtn.textContent = confirmText;
        cancelBtn.textContent = texts.cancelButton;
        cancelBtn.style.display = showCancel ? "block" : "none";

        popupDiv.classList.remove("hidden");
        document.body.style.overflow = "hidden";

        confirmBtn.onclick = () => {
            confirmAction();
            popupDiv.classList.add("hidden");
            document.body.style.overflow = "";
        };
        cancelBtn.onclick = () => {
            popupDiv.classList.add("hidden");
            document.body.style.overflow = "";
        };
    }

    // Update system is now handled above (clean version)

    function showApplyPopup(title, message) {
        const popupDiv = document.getElementById("custom-popup");
        const titleEl = document.getElementById("custom-popup-title");
        const messageEl = document.getElementById("custom-popup-message");
        const confirmBtn = document.getElementById("custom-popup-confirm");
        const cancelBtn = document.getElementById("custom-popup-cancel");

        titleEl.textContent = title;
        messageEl.innerHTML = message;
        confirmBtn.textContent = texts.applyButton || "Apply";
        cancelBtn.style.display = "none"; // Always hide cancel for Apply popup

        popupDiv.classList.remove("hidden");
        document.body.style.overflow = "hidden";

        confirmBtn.onclick = () => {
            throttledPlaySound('/sounds/click.ogg');
            popupDiv.classList.add("hidden");
            document.body.style.overflow = "";
            window.location.reload(); // Refresh the app
        };
    }

    function updateDynamicText() {
        elements.charCount.textContent = (texts.charCount || "{count} characters").replace("{count}", elements.inputWrapper.value.length || "0").replace("{count}", currentCharLimit);
        updateEditState = function () {
            if (editIndex !== null) {
                elements.inputWrapper.classList.add("editing");
                elements.cancelEditButton.style.display = "inline-block";
                elements.postButton.textContent = texts.saveButton || "Save";
                elements.cancelEditButton.textContent = texts.cancelEditButton || "Cancel";
            } else {
                elements.inputWrapper.classList.remove("editing");
                elements.cancelEditButton.style.display = elements.inputWrapper.value ? "inline-block" : "none";
                elements.postButton.textContent = texts.addButton || "Add";
                elements.cancelEditButton.textContent = texts.clearButton || "Clear";
            }
        };
        updateEditState();
    }    


    function updateOnlineStatus() {
        const existingStatus = document.querySelector(".online-status");
        if (existingStatus) existingStatus.remove();
        const status = document.createElement("div");
        status.className = "online-status";
        status.textContent = navigator.onLine ? "↑" : "↓";
        Object.assign(status.style, {
            position: "fixed",
            top: "8px",
            right: "8px",
            width: "20px",
            height: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: navigator.onLine ? "#22c55e" : "#ef4444",
            color: "#fff",
            fontSize: "12px",
            fontWeight: "bold",
            borderRadius: "50%",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            zIndex: "1000"
        });
        document.body.appendChild(status);
        setTimeout(() => status.remove(), 1500);
    }  

    elements.footer.innerHTML += `
        <div class="backup-actions">
            <div class="import-export-buttons">
                <button id="export-notes">${texts.exportButton}</button>
                <input type="file" id="import-notes" accept=".json" style="display: none;">
                <button id="import-trigger">${texts.importButton}</button>
            </div>
            <input type="file" id="upload-language" accept=".json" style="display: none;">
            <button id="upload-language-trigger">${texts.uploadLanguage || "Upload Language"}</button>
            <div class="language-zoom-container">
                <button id="language-switch" style="text-wrap: nowrap; text-overflow: ellipsis;">${texts.selectLanguage || "Select Language"}</button>
                <button id="zoom-toggle">${isZoomEnabled ? (texts.zoomEnabledText || "Zoom Enabled") : (texts.zoomDisabledText || "Zoom Disabled")}</button>
            </div>
        </div>
        <style>
            .backup-actions { display: flex; flex-direction: column; gap: 10px; justify-content: center; padding: 12px 0; margin-top: 16px; }
            .import-export-buttons { display: flex; gap: 10px; justify-content: center; width: 100%; }
            .language-zoom-container { display: flex; gap: 10px; justify-content: center; width: 100%; }
            #export-notes, #import-trigger, #language-switch, #upload-language-trigger, #zoom-toggle {
                padding: 6px 14px; font-size: 13px; font-weight: 500; letter-spacing: 0.02em; color: #ffffff; background: rgba(255, 255, 255, 0.08);
                border: none; border-radius: 10px; cursor: pointer; transition: background 0.2s ease, opacity 0.2s ease; backdrop-filter: blur(6px);
                -webkit-tap-highlight-color: transparent; flex: 1; min-width: 80px; text-align: center;
                text-wrap: nowrap; /* Prevent wrapping */
                overflow: hidden; /* Hide overflowing text */
                text-overflow: ellipsis; /* Show ellipsis */
            }
            #export-notes:hover, #import-trigger:hover, #language-switch:hover, #upload-language-trigger:hover, #zoom-toggle:hover { background: rgba(255, 255, 255, 0.18); }
            #export-notes:active, #import-trigger:active, #language-switch:active, #upload-language-trigger:active, #zoom-toggle:active { opacity: 0.8; }
            @media (max-width: 768px) {
                .backup-actions { gap: 8px; padding: 10px 0; }
                .import-export-buttons { gap: 8px; }
                .language-zoom-container { gap: 8px; }
                #export-notes, #import-trigger { padding: 5px 12px; font-size: 18px; width: 50%; min-width: 0; }
                #language-switch, #zoom-toggle { padding: 5px 12px; font-size: 18px; width: 50%; min-width: 0; }
                #upload-language-trigger { padding: 5px 12px; font-size: 18px; width: 100%; min-width: 0; }
                .language-zoom-container:has(#zoom-toggle[style*="display: none"]) #language-switch { width: 100%; } /* Full width if zoom-toggle is hidden */
            }
            @media (min-width: 769px) {
                .backup-actions { flex-direction: row; flex-wrap: wrap; }
                .import-export-buttons { width: auto; flex: 2; }
                .language-zoom-container { display: flex; gap: 10px; justify-content: center; width: auto; flex: 1; }
                #export-notes, #import-trigger, #language-switch, #upload-language-trigger, #zoom-toggle { width: auto; flex: 1; }
                .language-zoom-container:has(#zoom-toggle[style*="display: none"]) #language-switch { flex: 2; } /* Adjust flex if zoom-toggle is hidden */
            }
        </style>
    `;

    // Hide zoom toggle for PC users
    const zoomToggleBtn = document.getElementById("zoom-toggle");
    if (zoomToggleBtn && isPC()) {
        zoomToggleBtn.style.display = "none"; // Hide the button entirely
        console.log("Zoom toggle hidden for PC users");
    } else if (zoomToggleBtn) {
        console.log("Zoom toggle shown for non-PC users");
    }

    const versionElement = document.querySelector("#footer-version");
    if (versionElement) {
        versionElement.textContent = `v${APP_VERSION}`;
        versionElement.style.cursor = "pointer";
        versionElement.style.color = "#1d9bf0"; // Twitter blue
        versionElement.style.transition = "color 0.2s ease";
        versionElement.style.zIndex = "1";
        versionElement.style.position = "relative";
        
        // Add click event listener
        versionElement.addEventListener("click", () => {
            throttledPlaySound('/sounds/click.ogg');
            showCustomPopup(
                texts.whatsNewTitle ? texts.whatsNewTitle.replace("{version}", APP_VERSION) : `What's New in v${APP_VERSION}`, // Ensure version is substituted
                whatsNew,
                texts.okButton || "OK",
                () => {}, // No action needed on confirm
                false // No cancel button
            );
        });

        // Add hover effects
        versionElement.addEventListener("mouseover", () => {
            versionElement.style.color = "#1a8cd8"; // Darker blue on hover
        });

        versionElement.addEventListener("mouseout", () => {
            versionElement.style.color = "#1d9bf0"; // Return to original color
        });
    }
    if (!localStorage.getItem("appVersion")) localStorage.setItem("appVersion", APP_VERSION);

    function isThoughtsLanguagePack(data) {
        return data && typeof data === "object" && data.appId === "thoughts-app-langs";
    }

    // Event listener for uploading language
    document.getElementById("upload-language-trigger").addEventListener("click", () => document.getElementById("upload-language").click(throttledPlaySound('/sounds/click.ogg')));
    document.getElementById("upload-language").addEventListener("change", event => {
        const file = event.target.files[0];
        if (!file || !file.name.endsWith(".json")) {
            throttledPlaySound('/sounds/error.ogg');
            showCustomPopup(
                texts.errorTitle || "Error",
                texts.invalidFileMessage || "Please upload a valid JSON file.",
                texts.okButton || "OK",
                () => {},
                false
            );
            return;
        }
    
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const customLangData = JSON.parse(e.target.result);
                if (!isThoughtsLanguagePack(customLangData)) {
                    throttledPlaySound('/sounds/error.ogg');
                    showCustomPopup(
                        texts.errorTitle || "Error",
                        texts.notThoughtsLanguage || "This is not a Thoughts app language file.",
                        texts.okButton || "OK",
                        () => {},
                        false
                    );
                    return;
                }
    
                let languagesToAdd = {};
                if (customLangData.name) {
                    languagesToAdd[customLangData.name || file.name.replace(".json", "")] = { ...customLangData, appId: undefined };
                } else {
                    languagesToAdd = Object.keys(customLangData)
                        .filter(key => key !== "appId")
                        .reduce((obj, key) => {
                            obj[key] = customLangData[key];
                            return obj;
                        }, {});
                }
    
                Object.assign(languageData, languagesToAdd);
                const firstLang = Object.keys(languagesToAdd)[0];
                selectedLanguage = firstLang;
                applyLanguage(firstLang); // Apply without notification
                
                // Fixed string construction
                const baseMessage = texts.addingLanguageMessage || "Language uploaded: \"{name}\".";
                const refreshMessage = texts.refreshMessage || "The app will refresh to apply changes.";
                const fullMessage = baseMessage.replace("{name}", firstLang) + " " + refreshMessage;
                showApplyPopup(
                    texts.addingLanguageTitle || "Language Added",
                    fullMessage
                );
                event.target.value = "";
            } catch (err) {
                throttledPlaySound('/sounds/error.ogg');
                showCustomPopup(
                    texts.errorTitle || "Error",
                    texts.invalidJSONMessage || "Could not parse the JSON file.",
                    texts.okButton || "OK",
                    () => {},
                    false
                );
                console.error("Upload error:", err);
            }
        };
        reader.readAsText(file);
    });

    // Import/Export Functions
    function exportNotes() {
        const posts = JSON.parse(localStorage.getItem("posts") || "[]");
        if (posts.length === 0) {
            throttledPlaySound('/sounds/error.ogg');
            showCustomPopup(texts.exportNotesTitle, texts.exportEmptyMessage, texts.okButton, () => {}, false);
            return;
        }
        const exportData = { appId: "thoughts-app", posts };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "thoughts-backup.json";
        a.click();
        URL.revokeObjectURL(url);
    }

    function importNotes(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (!file.name.endsWith(".json")) {
            throttledPlaySound('/sounds/error.ogg');
            showCustomPopup(texts.importErrorTitle, texts.importErrorInvalidFile, texts.okButton, () => {}, false);
            return;
        }
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.appId || data.appId !== "thoughts-app" || !Array.isArray(data.posts) || !data.posts.every(post => typeof post.text === "string" && typeof post.timestamp === "string" && typeof post.pinned === "boolean")) {
                    throttledPlaySound('/sounds/error.ogg');
                    showCustomPopup(texts.importErrorTitle, data.appId !== "thoughts-app" ? texts.importErrorNotThoughts : texts.importErrorInvalidFormat, texts.okButton, () => {}, false);
                    return;
                }
                const existingPosts = JSON.parse(localStorage.getItem("posts") || "[]");
                if (existingPosts.length > 0) {
                    showImportConfirmation(data.posts, existingPosts);
                } else {
                    localStorage.setItem("posts", JSON.stringify(data.posts));
                    debouncedRenderPosts();
                    showSuccess(texts.importSuccessFirst);
                }
            } catch (err) {
                throttledPlaySound('/sounds/error.ogg');
                showCustomPopup(texts.importErrorTitle, texts.importErrorInvalidJSON, texts.okButton, () => {}, false);
            }
            event.target.value = "";
        };
        reader.readAsText(file);
    }

    function showImportConfirmation(newPosts, existingPosts) {
        const popupDiv = document.getElementById("import-confirmation");
        const mergeBtn = document.getElementById("merge-import");
        const replaceBtn = document.getElementById("replace-import");
        const cancelBtn = document.getElementById("cancel-import");

        const titleEl = popupDiv.querySelector(".twitter-popup p:first-child");
        const messageEl = popupDiv.querySelector(".twitter-popup p:nth-child(2)");
        titleEl.textContent = texts.importConfirmTitle;
        messageEl.textContent = texts.importConfirmText;
        mergeBtn.textContent = texts.mergeButton;
        replaceBtn.textContent = texts.replaceButton;
        cancelBtn.textContent = texts.cancelButton;

        popupDiv.classList.remove("hidden");
        document.body.style.overflow = "hidden";

        mergeBtn.onclick = () => {
            throttledPlaySound('/sounds/click.ogg')
            const mergedPosts = mergePosts(existingPosts, newPosts);
            localStorage.setItem("posts", JSON.stringify(mergedPosts));
            debouncedRenderPosts();
            showSuccess(texts.importSuccessMerge);
            popupDiv.classList.add("hidden");
            document.body.style.overflow = "";
        };

        replaceBtn.onclick = () => {
            throttledPlaySound('/sounds/click.ogg')
            localStorage.setItem("posts", JSON.stringify(newPosts));
            debouncedRenderPosts();
            showSuccess(texts.importSuccessReplace);
            popupDiv.classList.add("hidden");
            document.body.style.overflow = "";
        };

        cancelBtn.onclick = () => {
            throttledPlaySound('/sounds/click.ogg')
            popupDiv.classList.add("hidden");
            document.body.style.overflow = "";
        };
    }

    function mergePosts(existingPosts, newPosts) {
        const combined = [...existingPosts];
        newPosts.forEach(newPost => {
            if (!combined.some(post => post.text === newPost.text && post.timestamp === newPost.timestamp)) {
                combined.push(newPost);
            }
        });
        const pinnedPosts = combined.filter(post => post.pinned);
        if (pinnedPosts.length > 1) {
            const latestPinned = pinnedPosts.reduce((latest, current) =>
                new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
            );
            combined.forEach(post => post.pinned = post === latestPinned);
        }
        return combined;
    }

    // Footer Event Listeners
    document.getElementById("export-notes").addEventListener("click", () => { throttledPlaySound('/sounds/click.ogg'); exportNotes(); });
    document.getElementById("import-trigger").addEventListener("click", () => { throttledPlaySound('/sounds/click.ogg'); document.getElementById("import-notes").click(); });
    document.getElementById("import-notes").addEventListener("change", (event) => { throttledPlaySound('/sounds/click.ogg'); importNotes(event); });
    document.getElementById("language-switch").addEventListener("click", () => { throttledPlaySound('/sounds/click.ogg'); showLanguageSelection(false); });
    document.getElementById("zoom-toggle").addEventListener("click", () => {
        throttledPlaySound('/sounds/click.ogg');
        toggleZoom();
    });

    function renderPost(post, index, isPinned) {
        const [date, time] = post.timestamp.split(", ");
        const { title, content } = extractTitleAndContent(post.text);
        const relativeDate = timeAgo(post.timestamp);
        const readTime = getReadingTime(post.text);
        const wordCount = getWordCount(post.text);

        const postElement = document.createElement("div");
        postElement.className = `post ${editIndex === index ? "editing" : ""} ${isPinned ? "pinned" : ""}`;
        postElement.innerHTML = `
            ${title ? `<div class="post-title">${title}</div>` : ""}
            <div class="post-content ${title ? "with-title" : ""}">${highlightHashtags(content)}</div>
            <div class="post-meta">
                <span class="meta-badge" title="${date} at ${time}">${relativeDate}</span>
                <span class="meta-badge">${wordCount} words</span>
                <span class="meta-badge">${readTime}</span>
                ${isPinned ? '<span class="meta-badge">Pinned</span>' : ''}
                <span class="meta-badge share-post" data-index="${index}" style="cursor: pointer; ${editIndex === index ? 'opacity: 0.5; pointer-events: none;' : ''}">Share ▾</span>
            </div>
            <div class="post-actions">
                <button class="edit-post" data-index="${index}" ${editIndex === index ? "disabled" : ""} style="-webkit-tap-highlight-color: transparent;">
                    <svg class="icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                    <span>${texts.editButton || "Edit"}</span>
                </button>
                <button class="delete-post" data-index="${index}" ${editIndex === index ? "disabled" : ""} style="-webkit-tap-highlight-color: transparent;">
                    <svg class="icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M5 6h14l-1 14H6L5 6z"/>
                    </svg>
                    <span>${texts.deleteButton || "Bin"}</span>
                </button>
                <button class="pin-post ${isPinned ? "pinned" : ""}" data-index="${index}" ${editIndex === index ? "disabled" : ""} aria-label="${isPinned ? "Unpin Post" : "Pin Post"}" style="-webkit-tap-highlight-color: transparent;">
                    <svg class="icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        ${isPinned ? `<path d="M6 3l12 12"/><path d="M6 15l12-12"/><path d="M12 22v-6"/>` : `<path d="M12 2v13"/><path d="M5 15l7 7 7-7"/><path d="M19 9H5"/>`}
                    </svg>
                </button>
            </div>
        `;
        elements.postContainer.appendChild(postElement);

        postElement.querySelector(".delete-post").addEventListener("click", function () {
            throttledPlaySound('/sounds/tone.ogg')
            if (!this.disabled) {
                actionContext = { type: "delete", index: this.getAttribute("data-index") };
                elements.deleteConfirmation.classList.remove("hidden");
                elements.scrollToTopButton.classList.remove("visible");
                document.body.style.overflow = "hidden";
                const popupText = elements.deleteConfirmation.querySelector(".twitter-popup p:first-child");
                const popupSubtext = elements.deleteConfirmation.querySelector(".twitter-popup p:nth-child(2)");
                elements.confirmDelete.textContent = texts.confirmDeleteButton;
                elements.cancelDelete.textContent = texts.cancelButton;
                popupText.textContent = texts.deletePostConfirmTitle;
                popupSubtext.textContent = texts.deletePostConfirmText;
                elements.confirmDelete.classList.replace("bg-[#1d9bf0]", "bg-red-500");
                elements.confirmDelete.classList.replace("hover:bg-[#1a8cd8]", "hover:bg-red-600");
            }
        });

        postElement.querySelector(".edit-post").addEventListener("click", function () {
            throttledPlaySound('/sounds/click.ogg')
            if (!this.disabled) {
                const newEditIndex = parseInt(this.getAttribute("data-index"));
                const posts = JSON.parse(localStorage.getItem("posts") || "[]");
                const currentText = elements.inputWrapper.value.trim();
        
                if (editIndex !== null && currentText && currentText !== posts[editIndex].text) {
                    elements.deleteConfirmation.classList.remove("hidden");
                    elements.scrollToTopButton.classList.remove("visible");
                    document.body.style.overflow = "hidden";
                    const popupText = elements.deleteConfirmation.querySelector(".twitter-popup p:first-child");
                    const popupSubtext = elements.deleteConfirmation.querySelector(".twitter-popup p:nth-child(2)");
                    elements.confirmDelete.textContent = texts.discardButton;
                    elements.cancelDelete.textContent = texts.cancelButton;
                    popupText.textContent = texts.discardConfirmTitle;
                    popupSubtext.textContent = texts.discardConfirmText;
                    actionContext = { type: "edit-switch", newIndex: newEditIndex };
                    return;
                }
        
                editIndex = newEditIndex;
                elements.inputWrapper.value = posts[editIndex].text;
                adjustHeight();
                elements.charCount.textContent = (texts.charCount || "{count} characters").replace("{count}", elements.inputWrapper.value.length);
                elements.charCount.classList.toggle("text-red-500", elements.inputWrapper.value.length > currentCharLimit);
                updateEditState();
                renderPosts(elements.searchInput.value.trim());
                elements.inputWrapper.focus();
            }
        });

        postElement.querySelector(".pin-post").addEventListener("click", function () {
            throttledPlaySound('/sounds/click.ogg')
            const index = parseInt(this.getAttribute("data-index"));
            togglePin(index);
        });

        // Share button — shows menu with Text / Image / Copy options
        postElement.querySelector(".share-post").addEventListener("click", function () {
            throttledPlaySound('/sounds/click.ogg')
            if (!this.disabled) {
                const posts = JSON.parse(localStorage.getItem("posts") || "[]");
                const postToShare = posts[index];
                showShareMenu(postToShare, index, this);
            }
        });
    }

    // Event Listeners
    window.addEventListener("scroll", () => elements.scrollToTopButton.classList.toggle("visible", window.scrollY > 200));
    elements.scrollToTopButton.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    elements.inputWrapper.addEventListener("paste", adjustHeight);

    elements.postButton.addEventListener("click", () => {
        const text = elements.inputWrapper.value.trim();
        if (!text) {
            throttledPlaySound('/sounds/error.ogg');
            showCustomPopup(texts.emptyNoteTitle, texts.emptyNoteMessage, texts.okButton, () => { }, false);
            return;
        }
        if (!text || text.length > currentCharLimit) {
            throttledPlaySound('/sounds/error.ogg');
            showCustomPopup(texts.charLimitTitle, texts.charLimitMessage, texts.okButton, () => { }, false);
            return;
        }
        if (editIndex !== null) {
            // Edit existing post
            const posts = JSON.parse(localStorage.getItem("posts") || "[]");
            posts[editIndex].text = text;
            posts[editIndex].timestamp = new Date().toLocaleString();
            localStorage.setItem("posts", JSON.stringify(posts));
            if ("serviceWorker" in navigator) {
                navigator.serviceWorker.ready.then(reg => {
                    reg.active?.postMessage({ type: "SAVE_POSTS", posts: JSON.stringify(posts) });
                });
            }
            editIndex = null;
            elements.cancelEditButton.style.display = "none";
            elements.postButton.textContent = texts.addButton;
        } else {
            // Save new post
            savePost(text);
        }
    
        // Clear the input and draft *after* saving the post
        setTimeout(() => {
            elements.inputWrapper.value = "";
            forceClearDraft();
            adjustHeight();
            elements.charCount.textContent = (texts.charCount || "{count} characters").replace("{count}", "0").replace("{count}", currentCharLimit);
            updateEditState();
            renderPosts(); // Immediate render instead of debounced
        }, 50); // Small delay
    });

    elements.cancelEditButton.addEventListener("click", () => {
        if (editIndex !== null) {
            // Cancel edit mode (revert changes)
            const posts = JSON.parse(localStorage.getItem("posts") || "[]");
            elements.inputWrapper.value = "";
            saveDraft("");
            editIndex = null;
        } else {
            // Clear input in normal mode
            elements.inputWrapper.value = "";
            saveDraft("");
        }
        adjustHeight();
        elements.charCount.textContent = (texts.charCount || "{count} characters").replace("{count}", "0");
        elements.charCount.classList.remove("text-red-500");
        updateEditState();
        renderPosts();
    });

    elements.deleteAllButton.addEventListener("click", () => {
        const posts = JSON.parse(localStorage.getItem("posts") || "[]");
        if (posts.length === 0) {
            throttledPlaySound('/sounds/error.ogg');
            showCustomPopup(texts.deleteAllConfirmTitle, texts.deleteAllEmptyMessage, texts.okButton, () => {}, false);
        } else {
            throttledPlaySound('/sounds/tone.ogg');
            showCustomPopup(
                texts.deleteAllConfirmTitle,
                texts.deleteAllConfirmText,
                texts.confirmDeleteButton,
                () => {
                    localStorage.removeItem("posts");
                    if ("serviceWorker" in navigator) {
                        navigator.serviceWorker.ready.then(reg => reg.active?.postMessage({ type: "SAVE_POSTS", posts: "[]" }));
                    }
                    debouncedRenderPosts();
                },
                true
            );
        }
    });

    elements.cancelDelete.addEventListener("click", () => {
        elements.deleteConfirmation.classList.add("hidden");
        document.body.style.overflow = "";
        elements.confirmDelete.classList.replace("bg-[#1d9bf0]", "bg-red-500");
        elements.confirmDelete.classList.replace("hover:bg-[#1a8cd8]", "hover:bg-red-600");
        actionContext = null;
        if (window.scrollY > 200) elements.scrollToTopButton.classList.add("visible");
    });

    elements.confirmDelete.addEventListener("click", () => {
        const posts = JSON.parse(localStorage.getItem("posts") || "[]");
        if (actionContext) {
            if (actionContext.type === "delete") {
                posts.splice(actionContext.index, 1);
                localStorage.setItem("posts", JSON.stringify(posts));
                if ("serviceWorker" in navigator) {
                    navigator.serviceWorker.ready.then(reg => reg.active?.postMessage({ type: "SAVE_POSTS", posts: JSON.stringify(posts) }));
                }
                renderPosts();
            } else if (actionContext.type === "edit-switch") {
                editIndex = actionContext.newIndex;
                elements.inputWrapper.value = posts[editIndex].text;
                adjustHeight();
                elements.charCount.textContent = (texts.charCount || "{count} characters").replace("{count}", elements.inputWrapper.value.length);
                elements.charCount.classList.toggle("text-red-500", elements.inputWrapper.value.length > currentCharLimit);
                updateEditState();
                renderPosts(); // Immediate render instead of debounced
            }
            elements.deleteConfirmation.classList.add("hidden");
            document.body.style.overflow = "";
            actionContext = null;
            if (window.scrollY > 200) elements.scrollToTopButton.classList.add("visible");
        }
    });

    elements.searchInput.addEventListener("input", function () {
        const searchText = this.value.trim();
        const inputSection = document.querySelector(".input-section");
        debouncedRenderPosts(searchText);
        elements.clearSearch.style.display = searchText ? "block" : "none";
        inputSection.classList.toggle("hidden-on-search", !!searchText);
    });

    elements.clearSearch.addEventListener("click", () => {
        throttledPlaySound('/sounds/click.ogg');
        elements.searchInput.value = "";
        const inputSection = document.querySelector(".input-section");
        debouncedRenderPosts();
        elements.clearSearch.style.display = "none";
        inputSection.classList.remove("hidden-on-search");
    });

    function renderHashtagList(posts) {
        const hashtags = getUniqueHashtags(posts);
        elements.hashtagList.innerHTML = "";
        const leftArrow = document.querySelector(".hashtag-scroll-arrow.left");
        const rightArrow = document.querySelector(".hashtag-scroll-arrow.right");

        if (hashtags.length === 0) {
            elements.hashtagList.classList.add("hidden");
            leftArrow.classList.add("hidden");
            rightArrow.classList.add("hidden");
            return;
        } else {
            elements.hashtagList.classList.remove("hidden");
        }

        hashtags.forEach(tag => {
            const badge = document.createElement("span");
            badge.className = `hashtag-badge ${activeHashtag === tag ? "active" : ""}`;
            badge.textContent = tag;
            badge.addEventListener("click", () => {
                activeHashtag = activeHashtag === tag ? null : tag;
                debouncedRenderPosts(elements.searchInput.value.trim());
            });
            elements.hashtagList.appendChild(badge);
        });

        if (window.innerWidth > 768) {
            function updateArrows() {
                const scrollLeft = elements.hashtagList.scrollLeft;
                const scrollWidth = elements.hashtagList.scrollWidth;
                const clientWidth = elements.hashtagList.clientWidth;
                const hasOverflow = scrollWidth > clientWidth;
                leftArrow.classList.toggle("hidden", !hasOverflow || scrollLeft <= 0);
                rightArrow.classList.toggle("hidden", !hasOverflow || scrollLeft + clientWidth >= scrollWidth - 1);
            }
            leftArrow.addEventListener("click", () => elements.hashtagList.scrollBy({ left: -200, behavior: "smooth" }));
            rightArrow.addEventListener("click", () => elements.hashtagList.scrollBy({ left: 200, behavior: "smooth" }));
            elements.hashtagList.addEventListener("scroll", updateArrows);
            window.addEventListener("resize", updateArrows);
            requestAnimationFrame(updateArrows);
        }
    }

    // Easter Egg: Confetti Effects
    const headerTitle = document.querySelector("header h1");
    let touchTimer;
    let currentEffectIndex = 0;
    let isEffectActive = false;

    function createEmojiConfettiEffect(emoji) {
        console.log(`🎉 Easter Egg: Emoji - ${emoji}! 🎉`);
        throttledPlaySound('/sounds/long-touch.ogg');
        const scalar = 2;
        const shape = confetti.shapeFromText({ text: emoji, scalar });
        const defaults = { spread: 360, ticks: 120, gravity: 0, decay: 0.94, startVelocity: 15, shapes: [shape], scalar };
        function shoot() {
            confetti({ ...defaults, particleCount: 30 });
            confetti({ ...defaults, particleCount: 5, flat: true });
            confetti({ ...defaults, particleCount: 15, scalar: scalar / 2, shapes: ["circle"] });
        }
        setTimeout(shoot, 0);
        setTimeout(shoot, 300);
        setTimeout(shoot, 600);
    }

    const effects = [
        () => {
            console.log("🎉 Easter Egg: Realistic! 🎉");
            throttledPlaySound('/sounds/single-firework.ogg');
            const count = 200;
            const defaults = { origin: { y: 0.7 } };
            function fire(particleRatio, opts) {
                confetti({ ...defaults, ...opts, particleCount: Math.floor(count * particleRatio) });
            }
            fire(0.25, { spread: 26, startVelocity: 55 });
            fire(0.2, { spread: 60 });
            fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
            fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
            fire(0.1, { spread: 120, startVelocity: 45 });
        },
        () => {
            console.log("🎉 Easter Egg: Fireworks! 🎉");
            throttledPlaySound('/sounds/fireworksschoolprid.ogg');
            const duration = 5 * 1000;
            const end = Date.now() + duration;
            const interval = setInterval(() => {
                if (Date.now() > end) {
                    clearInterval(interval);
                    isEffectActive = false;
                    return;
                }
                confetti({ particleCount: 100, startVelocity: 30, spread: 360, ticks: 60, origin: { x: Math.random(), y: Math.random() - 0.2 } });
            }, 200);
        },
        () => {
            console.log("🎉 Easter Egg: Starfield Effect! 🎉");
            throttledPlaySound('/sounds/shooting-stars.ogg');
            function randomInRange(min, max) {
                return Math.random() * (max - min) + min;
            }
            function createStarfield() {
                const starCount = 12;
                const container = document.createElement("div");
                container.style.position = "fixed";
                container.style.top = "0";
                container.style.left = "0";
                container.style.width = "100%";
                container.style.height = "100%";
                container.style.pointerEvents = "none";
                document.body.appendChild(container);
                const background = document.createElement("div");
                background.style.position = "fixed";
                background.style.top = "0";
                background.style.left = "0";
                background.style.width = "100%";
                background.style.height = "100%";
                background.style.backgroundColor = "#000";
                background.style.zIndex = "-1";
                document.body.appendChild(background);
                const colors = ["#FFFFFF"];
                const starPoints = ["50% 0%", "61% 35%", "98% 35%", "68% 57%", "79% 91%", "50% 70%", "21% 91%", "32% 57%", "2% 35%", "39% 35%"].join(", ");
                for (let i = 0; i < starCount; i++) {
                    const star = document.createElement("div");
                    star.style.position = "absolute";
                    star.style.width = `${randomInRange(20, 30)}px`;
                    star.style.height = star.style.width;
                    star.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                    star.style.clipPath = `polygon(${starPoints})`;
                    star.style.left = `${randomInRange(0, 100)}%`;
                    star.style.top = "120%";
                    star.style.opacity = "0";
                    star.style.filter = "drop-shadow(0 0 2px rgba(255, 255, 255, 0.7))";
                    container.appendChild(star);
                    const delay = randomInRange(0, 500);
                    const speed = randomInRange(1, 2);
                    const rotation = (Math.random() - 0.5) * 720;
                    setTimeout(() => {
                        star.style.transition = `top ${speed}s ease-out, opacity ${speed / 2}s ease-out, transform ${speed}s ease-out`;
                        star.style.opacity = "1";
                        star.style.top = "-50px";
                        star.style.transform = `rotate(${rotation}deg) scale(${randomInRange(0.3, 1)})`;
                    }, delay);
                    setTimeout(() => star.remove(), delay + speed * 1000);
                }
                setTimeout(() => {
                    background.remove();
                    container.remove();
                    isEffectActive = false;
                }, 2500);
            }
            createStarfield();
        },
        () => {
            console.log("🎉 Easter Egg: Snow! 🎉");
            throttledPlaySound('/sounds/snow.ogg');
            const duration = 5 * 1000;
            const animationEnd = Date.now() + duration;
            let skew = 1;
            function randomInRange(min, max) {
                return Math.random() * (max - min) + min;
            }
            (function frame() {
                const timeLeft = animationEnd - Date.now();
                const ticks = Math.max(200, 500 * (timeLeft / duration));
                skew = Math.max(0.8, skew - 0.001);
                confetti({
                    particleCount: 1,
                    startVelocity: 0,
                    ticks: ticks,
                    origin: { x: Math.random(), y: Math.random() * skew - 0.2 },
                    colors: ["#ffffff"],
                    shapes: ["circle"],
                    gravity: randomInRange(0.4, 0.6),
                    scalar: randomInRange(0.4, 1),
                    drift: randomInRange(-0.4, 0.4)
                });
                if (timeLeft > 0) {
                    requestAnimationFrame(frame);
                } else {
                    isEffectActive = false;
                }
            })();
        },
        () => {
            console.log("🎉 Easter Egg: School Pride! 🎉");
            throttledPlaySound('/sounds/fireworks.ogg');
            const duration = 5 * 1000;
            const end = Date.now() + duration;
            const interval = setInterval(() => {
                if (Date.now() > end) {
                    clearInterval(interval);
                    isEffectActive = false;
                    return;
                }
                confetti({ particleCount: 25, angle: 60, spread: 55, origin: { x: 0 }, colors: ["#ff0000", "#ffffff"] });
                confetti({ particleCount: 25, angle: 120, spread: 55, origin: { x: 1 }, colors: ["#ff0000", "#ffffff"] });
            }, 250);
        },
        () => {
            console.log("🎉 Easter Egg: Custom Shapes! 🎉");
            throttledPlaySound('/sounds/stars.ogg');
            const pumpkin = confetti.shapeFromPath({
                path: "M449.4 142c-5 0-10 .3-15 1a183 183 0 0 0-66.9-19.1V87.5a17.5 17.5 0 1 0-35 0v36.4a183 183 0 0 0-67 19c-4.9-.6-9.9-1-14.8-1C170.3 142 105 219.6 105 315s65.3 173 145.7 173c5 0 10-.3 14.8-1a184.7 184.7 0 0 0 169 0c4.9.7 9.9 1 14.9 1 80.3 0 145.6-77.6 145.6-173s-65.3-173-145.7-173zm-220 138 27.4-40.4a11.6 11.6 0 0 1 16.4-2.7l54.7 40.3a11.3 11.3 0 0 1-7 20.3H239a11.3 11.3 0 0 1-9.6-17.5zM444 383.8l-43.7 17.5a17.7 17.7 0 0 1-13 0l-37.3-15-37.2 15a17.8 17.8 0 0 1-13 0L256 383.8a17.5 17.5 0 0 1 13-32.6l37.3 15 37.2-15c4.2-1.6 8.8-1.6 13 0l37.3 15 37.2-15a17.5 17.5 0 0 1 13 32.6zm17-86.3h-82a11.3 11.3 0 0 1-6.9-20.4l54.7-40.3a11.6 11.6 0 0 1 16.4 2.8l27.4 40.4a11.3 11.3 0 0 1-9.6 17.5z",
                matrix: [0.020491803278688523, 0, 0, 0.020491803278688523, -7.172131147540983, -5.9016393442622945]
            });
            const tree = confetti.shapeFromPath({
                path: "M120 240c-41,14 -91,18 -120,1 29,-10 57,-22 81,-40 -18,2 -37,3 -55,-3 25,-14 48,-30 66,-51 -11,5 -26,8 -45,7 20,-14 40,-30 57,-49 -13,1 -26,2 -38,-1 18,-11 35,-25 51,-43 -13,3 -24,5 -35,6 21,-19 40,-41 53,-67 14,26 32,48 54,67 -11,-1 -23,-3 -35,-6 15,18 32,32 51,43 -13,3 -26,2 -38,1 17,19 36,35 56,49 -19,1 -33,-2 -45,-7 19,21 42,37 67,51 -19,6 -37,5 -56,3 25,18 53,30 82,40 -30,17 -79,13 -120,-1l0 41 -31 0 0 -41z",
                matrix: [0.03597122302158273, 0, 0, 0.03597122302158273, -4.856115107913669, -5.071942446043165]
            });
            const heart = confetti.shapeFromPath({
                path: "M167 72c19,-38 37,-56 75,-56 42,0 76,33 76,75 0,76 -76,151 -151,227 -76,-76 -151,-151 -151,-227 0,-42 33,-75 75,-75 38,0 57,18 76,56z",
                matrix: [0.03333333333333333, 0, 0, 0.03333333333333333, -5.566666666666666, -5.533333333333333]
            });
            const defaults = { scalar: 2, spread: 180, particleCount: 30, origin: { y: -0.1 }, startVelocity: -35 };
            confetti({ ...defaults, shapes: [pumpkin], colors: ["#ff9a00", "#ff7400", "#ff4d00"] });
            confetti({ ...defaults, shapes: [tree], colors: ["#8d960f", "#be0f10", "#445404"] });
            confetti({ ...defaults, shapes: [heart], colors: ["#f93963", "#a10864", "#ee0b93"] });
        },
        () => createEmojiConfettiEffect("🐸"),
        () => createEmojiConfettiEffect("🐶"),
        () => createEmojiConfettiEffect("🐼"),
        () => createEmojiConfettiEffect("👾"),
        () => createEmojiConfettiEffect("💀"),
        () => createEmojiConfettiEffect("🐍"),
        () => createEmojiConfettiEffect("🍕"),
        () => createEmojiConfettiEffect("🔪"),
        () => createEmojiConfettiEffect("🎃"),
        () => createEmojiConfettiEffect("🏀"),
        () => createEmojiConfettiEffect("🍀"),
        () => createEmojiConfettiEffect("🌞🌝"),
        () => createEmojiConfettiEffect("🌏")
    ];

    function triggerNextEffect() {
        if (isEffectActive) return;
        isEffectActive = true;
        effects[currentEffectIndex]();
        setTimeout(() => (isEffectActive = false), 3000);
        currentEffectIndex = (currentEffectIndex + 1) % effects.length;
    }

    headerTitle.addEventListener("contextmenu", e => {
        e.preventDefault();
        triggerNextEffect();
    });
    headerTitle.addEventListener("click", () => {
        throttledPlaySound('/sounds/click.ogg'); // Sound for single tap
    });
    headerTitle.addEventListener("touchstart", e => {
        touchTimer = setTimeout(() => triggerNextEffect(), 500);
    }, { passive: true });
    headerTitle.addEventListener("touchend", () => clearTimeout(touchTimer));
    headerTitle.addEventListener("touchmove", () => clearTimeout(touchTimer), { passive: true });


    window.addEventListener("online", () => {
        updateOnlineStatus();
        setTimeout(debouncedRenderPosts, 1000);
    });
    window.addEventListener("offline", () => {
        updateOnlineStatus();
        debouncedRenderPosts();
    });

    elements.inputWrapper.addEventListener("input", function () {
        const text = this.value.trim();
        if (text.length > currentCharLimit) {
            throttledPlaySound('/sounds/error.ogg');
            this.value = text.slice(0, currentCharLimit);
            const limitMessage = (texts.charLimitMessage || "Whoa there! Only {count} characters are allowed. Extra characters? Poof—they’re gone!").replace("{count}", currentCharLimit);
            showCustomPopup(texts.charLimitTitle || "Character Limit Reached", limitMessage, texts.okButton || "OK", () => {}, false);
        }
        throttledSaveDraft(this.value);
        adjustHeight();
        elements.charCount.textContent = (texts.charCount || "{count} characters").replace("{count}", this.value.length).replace("{count}", currentCharLimit);
        updateEditState();
        updateInputStats(); // Live word count + reading time
        
        if (simpleHash(this.value) === SECRET_CODE_HASH && !isGodMode) {
            showGodModeConfirmation(() => {
                activateGodMode();
            });
        }
    });

    if (navigator.share || window.location.search) {
        const urlParams = new URLSearchParams(window.location.search);
        const sharedText = urlParams.get("text") || urlParams.get("title") || urlParams.get("url");
        if (sharedText) {
            elements.inputWrapper.value = sharedText;
            adjustHeight();
            elements.charCount.textContent = (texts.charCount || "{count} characters").replace("{count}", sharedText.length).replace("{count}", currentCharLimit);
            saveDraft(sharedText);
            updateEditState();
            // Clear URL params to prevent re-processing on refresh
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    // Replace the existing initialization logic with this:
    window.scrollTo(0, 0);
    console.log("Checking new user status:", {
        language: localStorage.getItem("language"),
        isNewUser: localStorage.getItem("hasSeenLanguagePrompt")
    });
    
    const hasSeenLanguagePrompt = localStorage.getItem("hasSeenLanguagePrompt") === "true";
    const storedLanguage = localStorage.getItem("language");
    
    if (!hasSeenLanguagePrompt || !storedLanguage || !languageData[storedLanguage]) {
        console.log("New user detected or invalid language, showing selection");
        showLanguageSelection(true); // Show selection for new users, welcome message after
        localStorage.setItem("hasSeenLanguagePrompt", "true");
    } else {
        console.log("Returning user, applying stored language");
        selectedLanguage = storedLanguage;
        applyLanguage(selectedLanguage); // No notification on load
        renderPosts();
    }
    elements.footer.classList.remove("hidden");
    
    const splashScreen = document.getElementById("splash-screen");
    splashScreen.style.opacity = "0";
    setTimeout(() => (splashScreen.style.display = "none"), 700);
});

let deferredPrompt;
window.addEventListener("beforeinstallprompt", e => {
    console.log("beforeinstallprompt event fired");
    e.preventDefault(); // Prevent the default browser prompt
    deferredPrompt = e;

    if (!localStorage.getItem("installPromptDismissed")) {
            // Container for install button and dismiss cross
            const installContainer = document.createElement("div");
            Object.assign(installContainer.style, {
                position: "fixed",
                bottom: "1.25rem", // Slightly more spacing from edge
                right: "1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "12px", // Increased for better whitespace
                zIndex: "1000"
            });

            // Install Button
            const installButton = document.createElement("button");
            installButton.textContent = "Install App";
            Object.assign(installButton.style, {
                backgroundColor: "#ffffff", // White background
                color: "#000000", // Black text
                padding: "10px 20px", // Comfortable padding
                borderRadius: "100px", // Softer, Twitter-like rounding
                border: "1px solid rgba(0, 0, 0, 0.1)", // Subtle border for definition
                fontSize: "16px", // Perfect readability (Apple-inspired)
                fontWeight: "600", // Slightly bold for emphasis
                lineHeight: "1.2", // Tight line height for alignment
                textAlign: "center",
                cursor: "pointer",
                transition: "background-color 0.2s ease, box-shadow 0.2s ease, transform 0.1s ease",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)", // Material Design elevation
                backdropFilter: "blur(4px)", // Twitter-inspired subtle blur
                outline: "none", // Remove default focus outline
                "-webkit-tap-highlight-color": "transparent"
            });
            installButton.addEventListener("mouseover", () => {
                installButton.style.backgroundColor = "#f5f5f5"; // Light gray hover
                installButton.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)"; // Elevated shadow
            });
            installButton.addEventListener("mouseout", () => {
                installButton.style.backgroundColor = "#ffffff";
                installButton.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.15)";
            });
            installButton.addEventListener("mousedown", () => {
                installButton.style.transform = "scale(0.98)"; // Subtle press effect
            });
            installButton.addEventListener("mouseup", () => {
                installButton.style.transform = "scale(1)";
            });
            installButton.addEventListener("click", () => {
                throttledPlaySound('/sounds/click.ogg');
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then(choiceResult => {
                        console.log(choiceResult.outcome === "accepted" ? "User accepted install" : "User dismissed install");
                        deferredPrompt = null;
                        installContainer.remove();
                    });
                } else {
                    console.warn("Install prompt unavailable");
                }
            });

            // Dismiss Button (Cross)
            const dismissButton = document.createElement("button");
            dismissButton.textContent = "✕"; // Cross symbol
            Object.assign(dismissButton.style, {
                backgroundColor: "#ffffff", // White background
                color: "#000000", // Black text
                width: "32px", // Slightly larger for balance
                height: "32px",
                borderRadius: "50%", // Circular, Apple-inspired
                border: "1px solid rgba(0, 0, 0, 0.1)", // Subtle border
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px", // Slightly larger for clarity
                fontWeight: "700", // Bold for emphasis
                cursor: "pointer",
                transition: "background-color 0.2s ease, box-shadow 0.2s ease, transform 0.1s ease",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)", // Material Design elevation
                backdropFilter: "blur(4px)", // Twitter-inspired blur
                outline: "none",
                padding: "0", // No extra padding needed
                "-webkit-tap-highlight-color": "transparent"
            });
            dismissButton.addEventListener("mouseover", () => {
                dismissButton.style.backgroundColor = "#f5f5f5"; // Light gray hover
                dismissButton.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)"; // Elevated shadow
            });
            dismissButton.addEventListener("mouseout", () => {
                dismissButton.style.backgroundColor = "#ffffff";
                dismissButton.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.15)";
            });
            dismissButton.addEventListener("mousedown", () => {
                dismissButton.style.transform = "scale(0.9)"; // Press effect
            });
            dismissButton.addEventListener("mouseup", () => {
                dismissButton.style.transform = "scale(1)";
            });
            dismissButton.addEventListener("click", () => {
                throttledPlaySound('/sounds/click.ogg');
                localStorage.setItem("installPromptDismissed", "true");
                installContainer.remove();
            });

            // Append buttons to container
            installContainer.appendChild(installButton);
            installContainer.appendChild(dismissButton);
            document.body.appendChild(installContainer);
            console.log("Install button and dismiss cross added to DOM");
    } else {
        console.log("Install prompt skipped due to previous dismissal");
    }
});

const isDev = window.location.hostname === "localhost";
console.log = isDev ? console.log.bind(console) : () => {};