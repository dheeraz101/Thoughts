// Version info
const APP_VERSION = "2.3.5";
const APP_BUILD_NUMBER = "140202062026";
const APP_BUILD_DATE = "2026-06-02";
const INITIAL_RENDER_LIMIT = 30;
const RENDER_STEP = 30;
const SEARCH_DEBOUNCE_MS = 200;
const UPDATE_DISMISS_KEY = "dismissedUpdateVersion";
const PENDING_UPDATE_VERSION_KEY = "pendingUpdateVersion";
const BACKUP_SCHEMA_VERSION = "2.3.5";
const BACKUP_REMINDER_INTERVAL = 20;
const RECYCLE_RETENTION_DAYS = 30;
const FIRST_RUN_ONBOARDING_KEY = "hasSeenFirstRunOnboarding";
const LAST_BACKUP_AT_KEY = "lastBackupAt";
const LAST_BACKUP_COUNT_KEY = "lastBackupPostCount";
const LAST_BACKUP_REMINDER_COUNT_KEY = "lastBackupReminderPostCount";
const ENABLE_CELEBRATIONS_KEY = "enableCelebrations";
const SHARE_IMAGE_LIMITS = {
    titleChars: 90,
    maxHashtags: 3
};
const LANGUAGE_STORE_WEB_URL = "https://thoughtswebstore.netlify.app";
const LANGUAGE_STORE_RAW_BASE_URL = "https://raw.githubusercontent.com/dheeraz101/webstore-thoughts/main";
const LANGUAGE_STORE_MANIFEST_URL = `${LANGUAGE_STORE_RAW_BASE_URL}/languages.json`;
const LANGUAGE_NATIVE_NAMES = {
    english: "English",
    spanish: "Español",
    french: "Français",
    hindi: "हिन्दी",
    emojis: "Emojis",
    nnbabu: "NNBabu",
    hinglish: "Hinglish",
    tamil: "தமிழ்",
    telugu: "తెలుగు",
    bengali: "বাংলা",
    marathi: "मराठी",
    gujarati: "ગુજરાતી",
    kannada: "ಕನ್ನಡ",
    malayalam: "മലയാളം",
    punjabi: "ਪੰਜਾਬੀ",
    urdu: "اردو",
    arabic: "العربية",
    japanese: "日本語",
    chinese: "中文",
    korean: "한국어",
    german: "Deutsch",
    italian: "Italiano",
    portuguese: "Português",
    russian: "Русский"
};

const whatsNew = `
    <strong>Thoughts v2.3.5</strong><br>
    Share-as-image now keeps hashtags visible and wraps long notes cleanly onto new lines<br>
    Settings import and update icons have been refined for a clearer Apple-style look<br>
    Check for update now gives calmer visual feedback with a spinning update icon<br>
    English and Hinglish release-facing text has been refreshed for this public patch<br><br>
    <small>Stored locally in your browser. Export backups before clearing browser data.</small>
`;

const FINAL_RELEASE_CHANGELOG = `
    <strong>Thoughts v2.3.5</strong><br>
    Final public release patch: sharing reliability, settings polish, localization, and release metadata<br>
    Faster notes feed with smarter rendering and Load More<br>
    Safe markdown support in notes<br>
    Share-as-image now preserves hashtags, wraps long text, and expands the card height when needed<br>
    God Mode moved to hidden build-tap unlock (mobile friendly)<br>
    Update system upgraded with version checks, install flow, and spinning check feedback<br><br>
    <small>Always back up your notes from Settings before clearing browser data.</small>
`;

const CURRENT_RELEASE_CHANGELOG = `
    <strong>Thoughts v2.3.5</strong><br>
    Patch release for share-image reliability and settings detail<br>
    Image sharing now shows hashtag-only notes and long notes without cutting the text<br>
    Import and update rows in Settings now use cleaner icons<br>
    Check for update now spins the icon while checking and waits before showing the result<br>
    English and Hinglish text has been refreshed for the latest visible release copy<br><br>
    <small>Stored locally in your browser. Export backups before clearing browser data.</small>
`;

// Lazy audio setup: keeps sound optional and avoids forcing loud defaults.
let audioContext = null;
let gainNode = null;
let criticalSoundsPreloaded = false;

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
        const ctx = ensureAudioReady();
        if (!ctx) return;
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        soundBuffers.set(src, audioBuffer);
        console.log(`Preloaded sound: ${src}`);
    } catch (err) {
        console.warn(`Failed to preload sound (${src}):`, err);
    }
}

function ensureAudioReady() {
    if (!(window.AudioContext || window.webkitAudioContext)) return null;
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioContext.createGain();
        gainNode.gain.value = 0.35;
        gainNode.connect(audioContext.destination);
    }
    return audioContext;
}

// Play sound using Web Audio API with full volume
const throttledPlaySound = throttle(async (src) => {
    if (!isSoundEnabled) return;
    const ctx = ensureAudioReady();
    if (!ctx) return;

    if (!soundFiles.includes(src)) {
        console.warn(`Sound file ${src} not found in soundFiles array`);
        return;
    }

    // Ensure audio context is running
    if (ctx.state === "suspended") {
        await ctx.resume();
    }

    if (!criticalSoundsPreloaded) {
        criticalSoundsPreloaded = true;
        await Promise.all(criticalSounds.map(preloadSound));
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
    const source = ctx.createBufferSource();
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
    if (!gainNode) return;
    gainNode.gain.value = Math.max(0, Math.min(1, level)); // Clamp between 0 and 1
    console.log(`Volume set to: ${gainNode.gain.value}`);
}

//  Service Worker Registration
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

    // When the SW takes over, wait for the user to reload from the update popup.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        sessionStorage.setItem('sw-controller-updated', '1');
    });
}

//  Clean Update System

function checkForUpdates(options = {}) {
    if (!navigator.onLine) return Promise.resolve({ status: "offline" });

    return fetch(`/manifest.json?t=${Date.now()}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(manifest => {
            const storedVersion = localStorage.getItem('appVersion');
            const currentVersion = storedVersion || APP_VERSION;
            const dismissedVersion = localStorage.getItem(UPDATE_DISMISS_KEY);
            const isLocalDevelopmentHost = ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
            if (manifest.version !== currentVersion) {
                localStorage.setItem(PENDING_UPDATE_VERSION_KEY, manifest.version);
                if (!options.forceNotify && isLocalDevelopmentHost) return { status: "local-dev", version: manifest.version };
                if (!options.forceNotify && dismissedVersion === manifest.version) return { status: "dismissed", version: manifest.version };
                if (!options.suppressNotify) showUpdateNotification(manifest.version, getCurrentDraftForUpdate, saveDraftForUpdate);
                return { status: "available", version: manifest.version };
            }
            localStorage.setItem('appVersion', APP_VERSION);
            localStorage.removeItem(PENDING_UPDATE_VERSION_KEY);
            localStorage.removeItem(UPDATE_DISMISS_KEY);
            return { status: "current", version: manifest.version };
        })
        .catch(() => ({ status: "error" }));
}

function showUpdateNotification(newVersion, getDraftFn, saveDraftFn) {
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
        title.textContent = textFor("newUpdateTitle", "Update Available");
    Object.assign(title.style, {
        fontSize: '17px',
        fontWeight: '700',
        margin: '0',
        lineHeight: '1.3'
    });

    const versionText = document.createElement('p');
    versionText.textContent = `${textFor("versionLabel", "Version")} ${newVersion}`;
    Object.assign(versionText.style, {
        fontSize: '14px',
        color: '#aaa',
        margin: '0'
    });

    const updateButton = document.createElement('button');
    updateButton.textContent = textFor("updateNowButton", "Update Now");
    const laterButton = document.createElement('button');
    laterButton.textContent = textFor("laterButton", "Later");

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
    Object.assign(laterButton.style, {
        background: 'transparent',
        color: '#c4c4c4',
        border: '1px solid rgba(255,255,255,0.2)',
        padding: '10px 0',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        width: '100%'
    });

    updateButton.onmouseover = () => updateButton.style.background = '#2db84d';
    updateButton.onmouseout = () => updateButton.style.background = '#34c759';

    updateButton.addEventListener('click', () => {
        throttledPlaySound('/sounds/click.ogg');
        const currentDraft = (typeof getDraftFn === "function" ? getDraftFn() : "") || "";
        if (currentDraft && typeof saveDraftFn === "function") saveDraftFn(currentDraft);
        localStorage.removeItem(UPDATE_DISMISS_KEY);
        performUpdate(newVersion, getDraftFn, saveDraftFn, notification);
    });
    laterButton.addEventListener('click', () => {
        throttledPlaySound('/sounds/click.ogg');
        localStorage.setItem(UPDATE_DISMISS_KEY, newVersion);
        localStorage.setItem(PENDING_UPDATE_VERSION_KEY, newVersion);
        notification.remove();
    });

    notification.appendChild(title);
    notification.appendChild(versionText);
    notification.appendChild(updateButton);
    notification.appendChild(laterButton);
    document.body.appendChild(notification);
}

async function performUpdate(newVersion, getDraftFn, saveDraftFn, notificationEl) {
    console.log(`Updating to version ${newVersion}...`);

    try {
        const currentDraft = (typeof getDraftFn === "function" ? getDraftFn() : "") || "";
        if (currentDraft && typeof saveDraftFn === "function") saveDraftFn(currentDraft);
        const progressEl = showUpdateProgressPopup(newVersion, notificationEl);
        const startedAt = Date.now();

        const reg = await navigator.serviceWorker.ready;
        await reg.update();

        if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        } else {
            const started = Date.now();
            while (!reg.waiting && Date.now() - started < 4000) {
                await new Promise(resolve => setTimeout(resolve, 250));
                await reg.update();
            }
            if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        const keys = await caches.keys();
        await Promise.all(
            keys
                .filter(k => k !== `thoughts-v${newVersion}` && k.startsWith('thoughts-v'))
                .map(k => caches.delete(k))
        );

        const elapsed = Date.now() - startedAt;
        if (elapsed < 2000) await new Promise(resolve => setTimeout(resolve, 2000 - elapsed));
        localStorage.setItem('appVersion', newVersion);
        localStorage.removeItem(UPDATE_DISMISS_KEY);
        localStorage.removeItem(PENDING_UPDATE_VERSION_KEY);
        showUpdateReloadState(progressEl, newVersion);

    } catch (e) {
        console.warn('Update failed:', e);
        createNotification(textFor("updateFailedTrySettings", "Update failed. Try again from Settings."), { background: "#ef4444" });
    }
}

function showUpdateProgressPopup(newVersion, notificationEl) {
    if (notificationEl?.classList?.contains("settings-overlay")) {
        closeModalOverlay(notificationEl);
    } else if (notificationEl) {
        notificationEl.remove();
    }
    document.querySelectorAll('.update-progress-popup').forEach(el => el.remove());
    const popup = document.createElement('div');
    popup.className = 'update-progress-popup';
    popup.innerHTML = `
        <div class="update-progress-card">
            <div class="update-progress-track" aria-hidden="true"><span></span></div>
            <h2>${textFor("updateInstallingTitle", "Installing update")}</h2>
            <p>${textFor("updateInstallingMessage", "Preparing version {version}. Your current draft is kept safe.", { version: newVersion })}</p>
        </div>
    `;
    document.body.appendChild(popup);
    return popup;
}

function showUpdateReloadState(popup, newVersion) {
    const target = popup || showUpdateProgressPopup(newVersion);
    target.innerHTML = `
        <div class="update-progress-card">
            <h2>${textFor("updateReadyTitle", "Update ready")}</h2>
            <p>${textFor("updateReadyMessage", "Version {version} is installed. Reload to finish switching over.", { version: newVersion })}</p>
            <button type="button" data-update-reload>${textFor("reloadButton", "Reload")}</button>
        </div>
    `;
    target.querySelector("[data-update-reload]").addEventListener("click", () => window.location.reload());
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
let hasRenderedPostSkeleton = false;
const DEFAULT_CHAR_LIMIT = 500;
const GOD_MODE_TAP_TARGET = 7;
let currentCharLimit;
let hasSeenVolumeNotification = localStorage.getItem("hasSeenVolumeNotification") === "true";
let isZoomEnabled = localStorage.getItem("isZoomEnabled") === "true" || false;
let isSoundEnabled = localStorage.getItem("isSoundEnabled") === "true";
let getCurrentDraftForUpdate = () => {
    const input = document.getElementById("public-input");
    return input ? input.value.trim() : "";
};
let saveDraftForUpdate = (draft) => {
    localStorage.setItem("draftNote", draft || "");
};

function textFor(key, fallback, replacements = {}) {
    let value = texts?.[key] || languageData?.english?.[key] || fallback || "";
    Object.entries(replacements).forEach(([name, replacement]) => {
        value = value.replaceAll(`{${name}}`, replacement);
    });
    return value;
}

function subtleHaptic() {
    if (!isSoundEnabled || !navigator.vibrate) return;
    navigator.vibrate(8);
}

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

// Escape user-written text before putting it inside innerHTML
function escapeHTML(str = "") {
    return String(str).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[char]));
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
    const { background = "rgba(20, 23, 26, 0.85)", color = "#ffffff", duration = 1500, top = "20px", zIndex = "4200" } = options;
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
        width: "min(92vw, 760px)",
        maxWidth: "760px",
        opacity: "0",
        transition: "opacity 0.3s ease-in-out",
        ...(window.innerWidth <= 768 && { fontSize: "16px", padding: "12px 20px", width: "calc(100vw - 28px)" })
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
    createNotification(textFor("godModeUnlocked", "God Mode Unlocked"), { background: "rgba(255, 215, 0, 0.9)", color: "#000", duration: 1500 });
}
function showSuccess(message) {
    throttledPlaySound('/sounds/success.ogg');
    createNotification(message, { duration: 4500 });
}

function getBuildInfoLabel() {
    return `Build ${APP_BUILD_NUMBER} - ${APP_BUILD_DATE}`;
}

function getStoredPosts() {
    return normalizePosts(JSON.parse(localStorage.getItem("posts") || "[]"));
}

function persistPosts(posts) {
    const normalizedPosts = normalizePosts(posts);
    const postsString = JSON.stringify(normalizedPosts);
    localStorage.setItem("posts", postsString);
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready
            .then(reg => reg.active?.postMessage({ type: "SAVE_POSTS", posts: postsString }))
            .catch(err => console.warn("SW posts save failed:", err));
    }
    return normalizedPosts;
}

function formatRelativeBackupAge(timestamp) {
    if (!timestamp) return "No backup yet";
    const diffMs = Date.now() - Date.parse(timestamp);
    if (!Number.isFinite(diffMs) || diffMs < 0) return "Backup date unknown";
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "Backed up just now";
    if (minutes < 60) return `Backed up ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Backed up ${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `Backed up ${days}d ago`;
}

function lockPageScrollForModal(overlay, panel) {
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.dataset.previousOverflow = document.body.style.overflow || "";
    document.body.dataset.previousPosition = document.body.style.position || "";
    document.body.dataset.previousTop = document.body.style.top || "";
    document.body.dataset.previousWidth = document.body.style.width || "";
    document.body.dataset.modalScrollY = String(scrollY);
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    overlay.addEventListener("wheel", event => {
        if (!panel) return;
        event.preventDefault();
        panel.scrollTop += event.deltaY * 2.2;
    }, { passive: false });
    let lastTouchY = 0;
    overlay.addEventListener("touchstart", event => {
        lastTouchY = event.touches[0]?.clientY || 0;
    }, { passive: true });
    overlay.addEventListener("touchmove", event => {
        if (!panel) return;
        const currentY = event.touches[0]?.clientY || lastTouchY;
        event.preventDefault();
        panel.scrollTop += (lastTouchY - currentY) * 1.7;
        lastTouchY = currentY;
    }, { passive: false });
}

function closeModalOverlay(overlay) {
    overlay.remove();
    const scrollY = Number.parseInt(document.body.dataset.modalScrollY || "0", 10);
    document.body.style.overflow = document.body.dataset.previousOverflow || "";
    document.body.style.position = document.body.dataset.previousPosition || "";
    document.body.style.top = document.body.dataset.previousTop || "";
    document.body.style.width = document.body.dataset.previousWidth || "";
    delete document.body.dataset.previousOverflow;
    delete document.body.dataset.previousPosition;
    delete document.body.dataset.previousTop;
    delete document.body.dataset.previousWidth;
    delete document.body.dataset.modalScrollY;
    window.scrollTo(0, Number.isFinite(scrollY) ? scrollY : 0);
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
        let posts = normalizePosts(JSON.parse(localStorage.getItem("posts") || "[]"));
        localStorage.setItem("posts", JSON.stringify(posts));
        const postCount = posts.length;
        headerTitle.textContent = `${texts.appName} ${toRoman(postCount)}`;
    }
}

function normalizePosts(posts) {
    return posts.map(post => {
        const parsedDate = new Date(post.timestamp);

        return {
            text: String(post.text || ""),
            timestamp: isNaN(parsedDate.getTime())
                ? new Date().toISOString()
                : parsedDate.toISOString(),
            pinned: Boolean(post.pinned)
        };
    });
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

        texts = { ...(languageData["english"] || {}), ...(languageData[selectedLanguage] || {}) };
        const baseCharLimit = Number(texts.charLimit) || DEFAULT_CHAR_LIMIT;
        currentCharLimit = isGodMode ? baseCharLimit * 2 : baseCharLimit;
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
        texts = { ...(languageData["english"] || {}), ...(languageData[selectedLanguage] || {}) };
        const baseCharLimit = Number(texts.charLimit) || DEFAULT_CHAR_LIMIT;
        currentCharLimit = isGodMode ? baseCharLimit * 2 : baseCharLimit;
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
        createNotification(textFor("appInitFailed", "App initialization failed"), { background: "#ef4444", duration: 5000 });
        return;
    }

    let actionContext = null;
    let activeHashtag = null;
    let visiblePostCount = INITIAL_RENDER_LIMIT;
    let lastRenderFilter = "";
    let lastRenderHashtag = null;
    let noteSearchIndex = [];
    let lastSavedDraft = localStorage.getItem("draftNote") || "";
    let isSavingOnClose = false;
    let deferredInstallPrompt = null;

    await loadInitialData();
    applyZoomStateSilently();

    // Ensure God Mode state is applied correctly on init
    isGodMode = localStorage.getItem("isGodMode") === "true";
    {
        const baseCharLimit = Number(texts.charLimit) || DEFAULT_CHAR_LIMIT;
        currentCharLimit = isGodMode ? baseCharLimit * 2 : baseCharLimit;
        texts.charCount = `{count}/${currentCharLimit}`;
        applyLanguage(selectedLanguage);
        renderPosts();
    }

    //
    // TIER 1 + TIER 3: Power Features
    //

    //  Smart relative date ("2h ago", "yesterday")
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

    function formatPostDate(timestamp) {
        const parsed = new Date(timestamp);
        if (isNaN(parsed.getTime())) return "";
        return parsed.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    //  Reading time estimate
    function getReadingTime(text) {
        const words = text.trim().split(/\s+/).length;
        const minutes = Math.ceil(words / 200); // 200 wpm average
        return minutes < 1
            ? textFor("readingTimeUnderMinute", "< 1 min read")
            : textFor("readingTimeMinutes", "{count} min read", { count: String(minutes) });
    }

    //  Word count
    function getWordCount(text) {
        return text.trim().split(/\s+/).filter(w => w.length > 0).length;
    }

    // Writing streak feature removed

    //  Generate shareable image from post
    function generatePostImage(post, index) {
        const { title, content } = extractTitleAndContent(post.text);
        const cleanTitle = title ? title.replace(/^@/, '').slice(0, SHARE_IMAGE_LIMITS.titleChars) : null;
        const cleanContent = (content || post.text || "").trim();
        const words = getWordCount(post.text);
        const readTime = getReadingTime(post.text);
        const relativeDate = timeAgo(post.timestamp);
        const compactNote = cleanContent.length <= 110 && words <= 16;
        const shortNote = cleanContent.length <= 190 && words <= 28;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const scale = 2; // retina
        const w = 600;
        const maxTextWidth = w - 60;
        const titleFontSize = compactNote ? 36 : shortNote ? 30 : 22;
        const titleLineHeight = compactNote ? 42 : shortNote ? 36 : 28;
        const contentFontSize = compactNote ? 30 : shortNote ? 25 : 16;
        const contentLineHeight = compactNote ? 40 : shortNote ? 34 : 24;
        ctx.font = `bold ${titleFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        const titleLines = cleanTitle ? wrapText(ctx, cleanTitle, maxTextWidth) : [];
        ctx.font = `${contentFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        const contentLines = wrapText(ctx, cleanContent, maxTextWidth);
        const hashtags = (post.text.match(/#\w+/g) || []).slice(0, SHARE_IMAGE_LIMITS.maxHashtags);
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        const hashtagLines = hashtags.length ? wrapText(ctx, hashtags.join('  '), maxTextWidth) : [];
        const topPadding = 40;
        const titleBlockHeight = titleLines.length ? titleLines.length * titleLineHeight + (compactNote ? 16 : shortNote ? 12 : 8) : 0;
        const contentBlockHeight = Math.max(contentLineHeight, contentLines.length * contentLineHeight);
        const metaBlockHeight = 86 + (hashtagLines.length ? hashtagLines.length * 18 + 6 : 0);
        const h = Math.max(cleanTitle ? 380 : 320, topPadding + titleBlockHeight + contentBlockHeight + metaBlockHeight);
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
            ctx.font = `bold ${titleFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
            titleLines.forEach(line => {
                ctx.fillText(line, 30, y);
                y += titleLineHeight;
            });
            y += compactNote ? 16 : shortNote ? 12 : 8;
        }

        // Content
        ctx.fillStyle = '#b0b3b8';
        ctx.font = `${contentFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        contentLines.forEach(line => {
            ctx.fillText(line, 30, y);
            y += contentLineHeight;
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
        ctx.fillText(`${relativeDate}    ${words} words    ${readTime}`, 30, y);

        // Branding
        ctx.fillStyle = '#1d9bf0';
        ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Thoughts', w - 50, y);
        ctx.textAlign = 'left';
        drawThoughtsSpark(ctx, w - 38, y - 5, '#1d9bf0');

        // Hashtags at bottom
        if (hashtags.length > 0) {
            y += 24;
            ctx.fillStyle = '#1d9bf0';
            ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            hashtagLines.forEach(line => {
                ctx.fillText(line, 30, y);
                y += 18;
            });
        }

        return canvas;
    }

    function drawThoughtsSpark(ctx, x, y, color) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x, y + 8);
        ctx.moveTo(x - 8, y);
        ctx.lineTo(x + 8, y);
        ctx.moveTo(x - 5, y - 5);
        ctx.lineTo(x + 5, y + 5);
        ctx.moveTo(x + 5, y - 5);
        ctx.lineTo(x - 5, y + 5);
        ctx.stroke();
        ctx.restore();
    }

    function wrapText(ctx, text, maxWidth, maxLines) {
        const lines = [];
        const paragraphs = String(text || "").split(/\r?\n/);

        const trimToMaxLines = () => {
            if (!maxLines || lines.length < maxLines) return false;
            lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\.*$/, '')}...`;
            lines.length = maxLines;
            return true;
        };

        const pushLine = (line) => {
            lines.push(line);
            return trimToMaxLines();
        };

        const breakLongWord = (word) => {
            const chunks = [];
            let chunk = "";
            Array.from(word).forEach(char => {
                const testChunk = chunk + char;
                if (ctx.measureText(testChunk).width > maxWidth && chunk) {
                    chunks.push(chunk);
                    chunk = char;
                } else {
                    chunk = testChunk;
                }
            });
            if (chunk) chunks.push(chunk);
            return chunks;
        };

        for (const paragraph of paragraphs) {
            if (!paragraph.trim()) {
                if (pushLine("")) return lines;
                continue;
            }

            let currentLine = "";
            const words = paragraph.trim().split(/\s+/);

            for (const word of words) {
                const chunks = ctx.measureText(word).width > maxWidth ? breakLongWord(word) : [word];
                for (const chunk of chunks) {
                    const testLine = currentLine ? `${currentLine} ${chunk}` : chunk;
                    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
                        if (pushLine(currentLine)) return lines;
                        currentLine = chunk;
                    } else {
                        currentLine = testLine;
                    }
                }
            }

            if (currentLine && pushLine(currentLine)) return lines;
        }

        return lines;
    }

    //  Share as image
    async function sharePostAsImage(post, index) {
        const canvas = await new Promise(resolve => {
            const run = () => resolve(generatePostImage(post, index));
            if ("requestIdleCallback" in window) {
                requestIdleCallback(run, { timeout: 800 });
            } else {
                setTimeout(run, 0);
            }
        });
        if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
            createNotification(textFor("imageGeneratorUnavailable", "Image generator unavailable"), { background: '#ef4444' });
            return;
        }

        canvas.toBlob(async (blob) => {
            if (!blob) {
                createNotification(textFor("imageShareFailed", "Failed to generate image"), { background: '#ef4444' });
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
                    createNotification(textFor("sharedMessage", "Shared!"), { background: 'rgba(34,197,94,0.9)', color: '#fff' });
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
        createNotification(textFor("imageSavedMessage", "Image saved!"), { background: 'rgba(34,197,94,0.9)', color: '#fff' });
    }

    //  Share menu (text or image)
    function showShareMenu(post, index, shareBadge) {
        document.querySelectorAll('.share-menu-popup').forEach(el => el.remove());
        document.querySelectorAll('.share-menu-overlay').forEach(el => el.remove());

        const rect = shareBadge.getBoundingClientRect();
        const isMobileShareMenu = window.innerWidth <= 768;
        const menu = document.createElement('div');
        menu.className = `share-menu-popup ${isMobileShareMenu ? "share-menu-centered" : ""}`;
        Object.assign(menu.style, {
            position: 'fixed',
            top: isMobileShareMenu ? '50%' : (rect.bottom + 8) + 'px',
            left: isMobileShareMenu ? '50%' : Math.min(rect.left, window.innerWidth - 200) + 'px',
            transform: isMobileShareMenu ? 'translate(-50%, -50%)' : 'none',
            background: 'rgba(20, 23, 26, 0.9)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            zIndex: '99999',
            overflow: 'hidden',
            minWidth: '180px',
            animation: isMobileShareMenu ? 'none' : 'menuSlideIn 0.15s ease-out'
        });
        let overlay = null;
        if (isMobileShareMenu) {
            overlay = document.createElement('div');
            overlay.className = 'share-menu-overlay';
            document.body.appendChild(overlay);
        }

        menu.innerHTML = `
            <button class="share-menu-item" data-action="text">
                <svg class="menu-icon" viewBox="0 0 24 24"><path d="M5 4h14"/><path d="M5 8h14"/><path d="M5 12h10"/><path d="M5 16h7"/></svg>
                <span>${textFor("shareAsText", "Share as Text")}</span>
            </button>
            <button class="share-menu-item" data-action="image">
                <svg class="menu-icon" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="m8 15 3-3 3 3 2-2 3 3"/><circle cx="9" cy="9" r="1.2"/></svg>
                <span>${textFor("shareAsImage", "Share as Image")}</span>
            </button>
            <button class="share-menu-item" data-action="copy">
                <svg class="menu-icon" viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 15V6a1 1 0 0 1 1-1h9"/></svg>
                <span>${textFor("copyToClipboard", "Copy to Clipboard")}</span>
            </button>
        `;

        document.body.appendChild(menu);

        // Close on outside click
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && e.target !== shareBadge) {
                menu.remove();
                overlay?.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        overlay?.addEventListener('click', () => {
            menu.remove();
            overlay.remove();
            document.removeEventListener('click', closeMenu);
        });
        setTimeout(() => document.addEventListener('click', closeMenu), 10);

        menu.querySelector('[data-action="text"]').onclick = () => {
            menu.remove();
            overlay?.remove();
            sharePostAsText(post);
        };

        menu.querySelector('[data-action="image"]').onclick = () => {
            menu.remove();
            overlay?.remove();
            sharePostAsImage(post, index);
        };

        menu.querySelector('[data-action="copy"]').onclick = () => {
            menu.remove();
            overlay?.remove();
            const { title, content } = extractTitleAndContent(post.text);
            const cleanTitle = title ? title.replace(/^@/, '') : '';
            const text = cleanTitle ? `${cleanTitle}\n${content}` : content;
            navigator.clipboard.writeText(text).then(() => {
                createNotification(textFor("copiedMessage", "Copied!"), { background: 'rgba(34,197,94,0.9)', color: '#fff', duration: 1500 });
            });
        };
    }

    function sharePostAsText(post) {
        const { title, content } = extractTitleAndContent(post.text);
        const cleanTitle = title ? title.replace(/^@/, '') : '';
        const shareTextContent = cleanTitle ? `*${cleanTitle}*\n${content}` : content;
        const shareText = `${shareTextContent}\n\n${textFor("shareSignature", "from Thoughts")}`;

        if (navigator.share) {
            navigator.share({ title: 'Thoughts', text: shareText })
                .then(() => createNotification(textFor("sharedMessage", "Shared!"), { background: 'rgba(34,197,94,0.9)', color: '#fff' }))
                .catch(() => {});
        } else {
            navigator.clipboard.writeText(shareText).then(() => {
                createNotification(textFor("copiedMessage", "Copied!"), { background: 'rgba(34,197,94,0.9)', color: '#fff' });
            });
        }
    }

    //  Input section live stats
    function updateInputStats() {
        return;
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
            <span style="color:#444"></span>
            <span>${readTime}</span>
            <span style="color:#444"></span>
            <span>${text.length} chars</span>
        `;
    }

    // Streak badge removed

    //  Keyboard shortcut: Ctrl+N = focus input
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            elements.inputWrapper.focus();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            elements.postButton.click();
        }
        if (e.key === 'Escape') {
            if (editIndex !== null || elements.inputWrapper.value.trim()) {
                elements.cancelEditButton.click();
            }
            if (elements.searchInput.value.trim()) {
                elements.searchInput.value = "";
                elements.clearSearch.click();
            }
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'g' && !isGodMode) {
            e.preventDefault();
            showGodModeConfirmation(() => activateGodMode());
        }
    });

    // Utility Functions
    function formatNoteContent(text) {
        const safeText = escapeHTML(text || "");
        const codeBlocks = [];
        const inlineCodes = [];

        let html = safeText
            .replace(/&lt;(b|strong)&gt;([\s\S]*?)&lt;\/?\1&gt;/gi, '<strong>$2</strong>')
            .replace(/&lt;(i|em)&gt;([\s\S]*?)&lt;\/?\1&gt;/gi, '<em>$2</em>')
            .replace(/&lt;u&gt;([\s\S]*?)&lt;\/?u&gt;/gi, '<u>$1</u>')
            .replace(/&lt;(s|strike|del)&gt;([\s\S]*?)&lt;\/?\1&gt;/gi, '<del>$2</del>')
            .replace(/&lt;mark&gt;([\s\S]*?)&lt;\/?mark&gt;/gi, '<mark>$1</mark>')
            .replace(/```([\s\S]*?)```/g, (_, code) => {
                const token = `__CODE_BLOCK_${codeBlocks.length}__`;
                codeBlocks.push(`<pre class="md-code-block"><code>${code}</code></pre>`);
                return token;
            })
            .replace(/`([^`]+)`/g, (_, code) => {
                const token = `__INLINE_CODE_${inlineCodes.length}__`;
                inlineCodes.push(`<code class="md-inline-code">${code}</code>`);
                return token;
            })
            .replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>')
            .replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>')
            .replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>')
            .replace(/^> (.+)$/gm, '<blockquote class="md-quote">$1</blockquote>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/__([^_]+)__/g, '<u>$1</u>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/_([^_]+)_/g, '<em>$1</em>')
            .replace(/~~([^~]+)~~/g, '<del>$1</del>')
            .replace(/~([^~]+)~/g, '<del>$1</del>')
            .replace(/==([^=]+)==/g, '<mark>$1</mark>')
            .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
            .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>')
            .replace(/(^|\s)(#[\w\u00C0-\uFFFF]+)/g, '$1<span class="hashtag">$2</span>')
            .replace(/\n/g, "<br>");

        html = html.replace(/__CODE_BLOCK_(\d+)__/g, (_, i) => codeBlocks[Number(i)] || "");
        html = html.replace(/__INLINE_CODE_(\d+)__/g, (_, i) => inlineCodes[Number(i)] || "");
        return html;
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
        localStorage.setItem("hasSeenVolumeNotification", "true");
        hasSeenVolumeNotification = true;
    }

    // Save post function
    function savePost(text) {
        try {
            const posts = getStoredPosts();
            const newPost = {
                text,
                timestamp: new Date().toISOString(),
                pinned: false
            };
            posts.push(newPost);
            try {
                persistPosts(posts);
            } catch (e) {
                if (e.name === "QuotaExceededError") {
                    throttledPlaySound('/sounds/error.ogg')
                    showCustomPopup(textFor("storageFullTitle", "Storage Full"), textFor("storageFullMessage", "Cannot save note: storage limit reached. Delete some notes to free space."), textFor("okButton", "OK"), () => {}, false);
                    return;
                }
                throw e; // Re-throw other errors
            }
            maybeShowBackupReminder(posts);
            updateBackupHealthUI();
            debouncedRenderPosts();
        } catch (err) {
            console.error("Failed to save post:", err);
            throttledPlaySound('/sounds/error.ogg')
            showCustomPopup(textFor("savePostErrorTitle", textFor("errorTitle", "Error")), textFor("savePostFailed", "Failed to save note. Try again."), textFor("okButton", "OK"), () => {}, false);
        }
    }

    function togglePin(index) {
        try {
            const posts = getStoredPosts();
            const isPinned = posts[index].pinned;
            if (!isPinned && posts.some((post, postIndex) => post.pinned && postIndex !== index)) {
                createNotification(textFor("pinLimitMessage", "One note is already pinned. Unpin it first."), { duration: 2200 });
                return;
            }
            posts[index].pinned = !isPinned;
            persistPosts(posts);
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
            lastSavedDraft = draft;
            elements.inputWrapper.value = draft;
            adjustHeight();
            updateCharCount(draft.length);

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
            lastSavedDraft = draft;
            elements.inputWrapper.value = draft;
            adjustHeight();
            updateCharCount(draft.length);
        }
    }

    // Closure save function
    function saveOnClose() {
        if (isSavingOnClose) return;
        isSavingOnClose = true;
        const text = elements.inputWrapper.value.trim();
        saveDraft(text);

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
    const throttledSaveDraft = throttle(saveDraft, 2500); // Quiet autosave every few seconds
    const debouncedRenderPosts = debounce(renderPosts, 100); // Generic rerender
    const debouncedSearchRender = debounce(renderPosts, SEARCH_DEBOUNCE_MS);

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
            langContainer.className = "language-choice-row";
            if (!originalLanguageData[lang]) langContainer.classList.add("is-custom-language");

            const button = document.createElement("button");
            button.className = "language-button";
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
                showVolumeNotification();
            });

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.innerHTML = `
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 7h16"/>
                    <path d="M10 11v6"/>
                    <path d="M14 11v6"/>
                    <path d="M9 7V5.75A1.75 1.75 0 0 1 10.75 4h2.5A1.75 1.75 0 0 1 15 5.75V7"/>
                    <path d="M6.5 7 7.4 19a2 2 0 0 0 2 1.85h5.2a2 2 0 0 0 2-1.85L17.5 7"/>
                </svg>
            `;
            Object.assign(deleteButton.style, { "-webkit-tap-highlight-color": "transparent" });
            deleteButton.className = "language-delete-button";
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
          footerRightsReserved.innerHTML = ` ${dateString}. ${texts.footerRightsReserved || "All Rights Reserved"}`;
        }
    }

    function ensureBuildInfoElement() {
        const footerPrivacy = document.getElementById("footer-privacy");
        const footerRightsReserved = document.getElementById("footer-rights-reserved");
        if (!footerPrivacy || !footerRightsReserved) return null;

        let buildInfoEl = document.getElementById("footer-build-info");
        if (!buildInfoEl) {
            buildInfoEl = document.createElement("p");
            buildInfoEl.id = "footer-build-info";
            buildInfoEl.style.fontSize = "0.85rem";
            buildInfoEl.style.color = "#8b98a5";
            buildInfoEl.style.marginTop = "8px";
            buildInfoEl.style.marginBottom = "8px";
            buildInfoEl.style.cursor = "pointer";
            buildInfoEl.style.userSelect = "none";
            buildInfoEl.style.webkitTapHighlightColor = "transparent";
            footerRightsReserved.parentNode.insertBefore(buildInfoEl, footerRightsReserved);
        }
        buildInfoEl.textContent = getBuildInfoLabel();
        return buildInfoEl;
    }

    function setupGodModeBuildTapUnlock() {
        const buildInfoEl = ensureBuildInfoElement();
        if (!buildInfoEl) return;
        if (buildInfoEl.dataset.godModeTapInit === "1") return;
        buildInfoEl.dataset.godModeTapInit = "1";

        let tapCount = 0;
        let tapTimeout = null;

        buildInfoEl.addEventListener("click", () => {
            if (isGodMode) {
                createNotification(textFor("godModeAlreadyUnlocked", "God Mode already unlocked"), { duration: 1200 });
                return;
            }

            tapCount += 1;
            if (tapTimeout) clearTimeout(tapTimeout);
            tapTimeout = setTimeout(() => {
                tapCount = 0;
            }, 1800);

            if (tapCount >= GOD_MODE_TAP_TARGET) {
                tapCount = 0;
                activateGodMode();
                return;
            }

            if (tapCount >= 2) {
                const remaining = GOD_MODE_TAP_TARGET - tapCount;
                createNotification(textFor("godModeTapsRemaining", "{count} more taps to unlock God Mode", { count: String(remaining) }), { duration: 900 });
            }
        });
    }

    function updateBackupHealthUI() {
        const posts = getStoredPosts();
        const lastBackupAt = localStorage.getItem(LAST_BACKUP_AT_KEY);
        const badgeText = textFor("backupHealthStatus", "{age} • {count} notes", { age: formatRelativeBackupAge(lastBackupAt), count: String(posts.length) });
        document.querySelectorAll("[data-backup-health]").forEach(el => {
            el.textContent = badgeText;
        });
        const status = document.getElementById("local-first-status");
        if (status) {
            status.textContent = textFor("localFirstStatus", "Stored locally in your browser. {status}.", { status: badgeText });
        }
    }

    function maybeShowFirstRunOnboarding() {
        if (localStorage.getItem(FIRST_RUN_ONBOARDING_KEY) === "true") return;
        const existing = document.getElementById("first-run-onboarding");
        if (existing) return;

        const card = document.createElement("section");
        card.id = "first-run-onboarding";
        card.className = "first-run-card";
        card.innerHTML = `
            <div>
                <strong>${textFor("onboardingLocalOnly", "Local only.")}</strong>
                <span>${textFor("onboardingExportBackup", "Export backup.")}</span>
                <span>${textFor("onboardingOffline", "Works offline.")}</span>
                <span>${textFor("instantCaptureMarkdownHint", "Markdown: **bold**, *italic*, __underline__, ~~strike~~, ==mark==, links.")}</span>
            </div>
            <button type="button" aria-label="${textFor("dismissOnboardingLabel", "Dismiss onboarding")}">${textFor("gotItButton", "Got it")}</button>
        `;
        const inputSection = document.querySelector(".input-section");
        inputSection?.parentNode.insertBefore(card, inputSection);
        card.querySelector("button").addEventListener("click", () => {
            localStorage.setItem(FIRST_RUN_ONBOARDING_KEY, "true");
            card.remove();
        });
    }

    function maybeShowBackupReminder(posts) {
        const count = posts.length;
        if (count === 0) return;
        const lastReminderCount = Number(localStorage.getItem(LAST_BACKUP_REMINDER_COUNT_KEY) || "0");
        const lastBackupCount = Number(localStorage.getItem(LAST_BACKUP_COUNT_KEY) || "0");
        const growthSinceBackup = count - lastBackupCount;
        if (growthSinceBackup < BACKUP_REMINDER_INTERVAL || lastReminderCount >= count) return;
        localStorage.setItem(LAST_BACKUP_REMINDER_COUNT_KEY, String(count));
        showCustomPopup(
            textFor("backupReminderTitle", "Backup reminder"),
            textFor("backupReminderMessage", "You have {count} notes stored locally in your browser. Export a backup before clearing browser data or switching devices.", { count: String(count) }),
            textFor("exportButton", "Export"),
            exportNotes,
            true
        );
    }

    function renderEmptyState() {
        const examples = [
            textFor("emptyExampleIdea", "@Idea Build local file sharing PWA #project"),
            textFor("emptyExampleMemory", "@Memory Something I learned today #life"),
            textFor("emptyExampleTask", "@Task Fix homepage layout #work")
        ];
        elements.postContainer.innerHTML = `
            <div class="empty-state">
                <p>${textFor("noPostsMessage", "No notes yet.")}</p>
                <div class="empty-examples">
                    ${examples.map(example => `<button type="button" data-example="${escapeHTML(example)}">${escapeHTML(example)}</button>`).join("")}
                </div>
            </div>
        `;
        elements.postContainer.querySelectorAll("[data-example]").forEach(button => {
            button.addEventListener("click", () => {
                elements.inputWrapper.value = button.dataset.example || "";
                adjustHeight();
                updateCharCount();
                updateEditState();
                elements.inputWrapper.focus();
            });
        });
    }

    function getRecycleBin() {
        try {
            const cutoff = Date.now() - RECYCLE_RETENTION_DAYS * 86400000;
            const items = JSON.parse(localStorage.getItem("recycleBin") || "[]")
                .filter(item => Date.parse(item.deletedAt) >= cutoff);
            localStorage.setItem("recycleBin", JSON.stringify(items));
            return items;
        } catch {
            localStorage.setItem("recycleBin", "[]");
            return [];
        }
    }

    function saveRecycleBin(items) {
        localStorage.setItem("recycleBin", JSON.stringify(items));
    }

    function movePostToRecycleBin(post) {
        const items = getRecycleBin();
        items.unshift({ ...post, deletedAt: new Date().toISOString() });
        saveRecycleBin(items.slice(0, 100));
    }

    function showUndoDelete(post) {
        showUndoToast(
            textFor("undoDeleteMessage", "Note moved to Recently Deleted."),
            () => {
                const posts = getStoredPosts();
                persistPosts([post, ...posts]);
                renderPosts(elements.searchInput.value.trim());
                updateBackupHealthUI();
            }
        );
    }

    function showUndoToast(message, undoAction, duration = 6500) {
        const undo = document.createElement("div");
        undo.className = "undo-toast";
        undo.innerHTML = `<span>${escapeHTML(message)}</span><button type="button">${textFor("undoButton", "Undo")}</button>`;
        document.body.appendChild(undo);
        const timer = setTimeout(() => undo.remove(), duration);
        undo.querySelector("button").addEventListener("click", () => {
            clearTimeout(timer);
            undoAction?.();
            undo.remove();
        });
    }

    function openSettingsPanel() {
        const existing = document.getElementById("settings-panel-overlay");
        if (existing) closeModalOverlay(existing);
        const recycleCount = getRecycleBin().length;
        const celebrationsEnabled = localStorage.getItem(ENABLE_CELEBRATIONS_KEY) === "true";
        const soundEnabled = localStorage.getItem("isSoundEnabled") === "true";
        const storedPendingUpdateVersion = localStorage.getItem(PENDING_UPDATE_VERSION_KEY);
        const pendingUpdateVersion = storedPendingUpdateVersion && storedPendingUpdateVersion !== APP_VERSION ? storedPendingUpdateVersion : "";
        if (storedPendingUpdateVersion && !pendingUpdateVersion) localStorage.removeItem(PENDING_UPDATE_VERSION_KEY);
        const showZoomSettings = !isPC();
        const zoomSettingsRow = showZoomSettings ? `
                        <div class="settings-row settings-row-control settings-menu-row" data-settings-icon="zoom">
                            <div>
                                <strong>${textFor("pageZoomTitle", "Page Zoom")}</strong>
                                <span>${isZoomEnabled ? textFor("pageZoomOn", "Browser zoom is available when you need larger text.") : textFor("pageZoomOff", "Kept locked for an app-like layout on this device.")}</span>
                            </div>
                            <button type="button" data-zoom-settings>${isZoomEnabled ? textFor("turnOffButton", "Turn off") : textFor("turnOnButton", "Turn on")}</button>
                        </div>
        ` : "";
        const deletedText = recycleCount
            ? textFor("recentlyDeletedCount", "{count} note{plural} can be restored.", { count: String(recycleCount), plural: recycleCount === 1 ? "" : "s" })
            : textFor("recentlyDeletedEmpty", "No deleted notes. Items stay here for {days} days.", { days: String(RECYCLE_RETENTION_DAYS) });
        const panel = document.createElement("div");
        panel.id = "settings-panel-overlay";
        panel.className = "settings-overlay";
        panel.innerHTML = `
            <div class="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
                <div class="settings-panel-header">
                    <div>
                        <p class="panel-kicker">${texts.appName || "Thoughts"}</p>
                        <h2 id="settings-title">${textFor("settingsTitle", "Settings")}</h2>
                        <p class="panel-subtitle">${textFor("settingsSubtitle", "Local-first controls for privacy, backups, and the writing feel.")}</p>
                    </div>
                    <button type="button" data-close-settings aria-label="${textFor("closeSettingsLabel", "Close settings")}">&times;</button>
                </div>
                <div class="settings-content">
                    <section class="settings-group settings-hero-card">
                        <p class="settings-eyebrow">${textFor("settingsStoredOnDevice", "Stored on this device")}</p>
                        <strong>${textFor("settingsPrivateDefault", "Private by default.")}</strong>
                        <span id="local-first-status"></span>
                    </section>
                    <section class="settings-group">
                        <div class="settings-group-title">
                            <p>${textFor("settingsBackupRecovery", "Backup and recovery")}</p>
                            <span>${textFor("settingsBackupRecoveryTagline", "Keep notes portable and recover from mistakes.")}</span>
                        </div>
                        <div class="settings-row settings-row-control settings-menu-row" data-settings-icon="export">
                            <div>
                                <strong>${textFor("settingsExportBackup", "Export backup")}</strong>
                                <span data-backup-health></span>
                            </div>
                            <button type="button" data-export-settings-secondary>${textFor("exportButton", "Export")}</button>
                        </div>
                        <div class="settings-row settings-row-control settings-menu-row" data-settings-icon="trash">
                            <div>
                                <strong>${textFor("settingsRecentlyDeleted", "Recently Deleted")}</strong>
                                <span>${deletedText}</span>
                            </div>
                            <div class="settings-inline-actions">
                                <button type="button" data-restore-latest ${recycleCount ? "" : "disabled"}>${textFor("settingsRestore", "Restore")}</button>
                                <button type="button" data-clear-deleted ${recycleCount ? "" : "disabled"}>${textFor("settingsClear", "Clear")}</button>
                            </div>
                        </div>
                        <div class="settings-row settings-row-control settings-menu-row" data-settings-icon="import">
                            <div>
                                <strong>${textFor("importButton", "Import")}</strong>
                                <span>${textFor("settingsImportTagline", "Bring notes back from a Thoughts backup file.")}</span>
                            </div>
                            <button type="button" data-import-settings>${textFor("importButton", "Import")}</button>
                        </div>
                    </section>
                    <section class="settings-group">
                        <div class="settings-group-title">
                            <p>${textFor("settingsLanguageTitle", "Language")}</p>
                            <span>${textFor("settingsLanguageTagline", "Change the interface or add your own language pack.")}</span>
                        </div>
                        <div class="settings-actions-grid">
                            <button type="button" data-language-settings>${textFor("settingsChooseLanguage", "Choose language")}</button>
                            <button type="button" data-language-store>${textFor("settingsLanguageStore", "Language store")}</button>
                            <button type="button" data-upload-language-settings>${textFor("settingsUploadLanguage", "Upload language")}</button>
                        </div>
                    </section>
                    <section class="settings-group">
                        <div class="settings-group-title">
                            <p>${textFor("settingsExperience", "Experience")}</p>
                            <span>${textFor("settingsExperienceTagline", "Quiet optional details that stay out of your writing.")}</span>
                        </div>
${zoomSettingsRow}
                        <label class="settings-row settings-toggle settings-menu-row" data-settings-icon="spark">
                            <div>
                                <strong>${textFor("settingsCelebrations", "Celebrations")}</strong>
                                <span>${textFor("settingsCelebrationsTagline", "Small visual rewards after milestones. Off by default.")}</span>
                            </div>
                            <input class="ios-switch" type="checkbox" data-celebrations-toggle ${celebrationsEnabled ? "checked" : ""}>
                        </label>
                        <label class="settings-row settings-toggle settings-menu-row" data-settings-icon="sound">
                            <div>
                                <strong>${textFor("settingsSoundEffects", "Sound Effects")}</strong>
                                <span>${textFor("settingsSoundEffectsTagline", "Soft interface sounds for feedback. Off by default.")}</span>
                            </div>
                            <input class="ios-switch" type="checkbox" data-sound-toggle ${soundEnabled ? "checked" : ""}>
                        </label>
                    </section>
                    <section class="settings-group">
                        <div class="settings-row settings-row-control settings-menu-row" data-settings-icon="install">
                            <div>
                                <strong>${textFor("settingsInstallThoughts", "Install Thoughts")}</strong>
                                <span>${textFor("settingsInstallThoughtsTagline", "Launch faster from your home screen and keep offline access close.")}</span>
                            </div>
                            <button type="button" data-install-app ${deferredInstallPrompt ? "" : "disabled"}>${textFor("settingsInstall", "Install")}</button>
                        </div>
                    </section>
                    ${pendingUpdateVersion ? `
                    <section class="settings-group settings-update-card">
                        <div class="settings-row settings-row-control settings-menu-row" data-settings-icon="update">
                            <div>
                                <strong>${textFor("settingsUpdateAvailable", "Update available")}</strong>
                                <span>${textFor("settingsUpdateAvailableTagline", "Version {version} is ready. Install now and reload when you choose.", { version: pendingUpdateVersion })}</span>
                            </div>
                            <button type="button" data-install-update>${textFor("settingsInstall", "Install")}</button>
                        </div>
                    </section>
                    ` : `
                    <section class="settings-group settings-check-update-card">
                        <div class="settings-row settings-row-control settings-menu-row" data-settings-icon="update">
                            <div>
                                <strong data-update-check-title>${textFor("settingsCheckUpdates", "Check for updates")}</strong>
                                <span data-update-check-status>${textFor("settingsCurrentVersion", "Current version {version}", { version: APP_VERSION })}</span>
                            </div>
                            <button type="button" data-check-update>${textFor("settingsCheck", "Check")}</button>
                        </div>
                    </section>
                    `}
                    <section class="settings-group settings-about-card">
                        <div class="settings-row settings-row-control settings-menu-row settings-link-row" data-open-guides data-settings-icon="guide">
                            <div>
                                <strong>${textFor("settingsGuidesTitle", "Guides")}</strong>
                                <span>${textFor("settingsGuidesTagline", "Markdown, shortcuts, backup, sharing, and daily use tips.")}</span>
                            </div>
                        </div>
                    </section>
                    <section class="settings-group settings-about-card">
                        <div class="settings-row settings-row-control settings-menu-row settings-link-row" data-open-about data-settings-icon="info">
                            <div>
                                <strong>${textFor("settingsAboutThoughts", "About Thoughts")}</strong>
                                <span>${textFor("settingsAboutTagline", "Privacy, offline details, release build, and creator links.")}</span>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
        const settingsPanel = panel.querySelector(".settings-panel");
        lockPageScrollForModal(panel, settingsPanel);
        updateBackupHealthUI();
        panel.querySelector("[data-close-settings]").addEventListener("click", () => closeModalOverlay(panel));
        panel.addEventListener("click", event => {
            if (event.target === panel) closeModalOverlay(panel);
        });
        panel.querySelector("[data-export-settings-secondary]").addEventListener("click", exportNotes);
        panel.querySelector("[data-import-settings]").addEventListener("click", () => document.getElementById("import-notes")?.click());
        panel.querySelector("[data-upload-language-settings]").addEventListener("click", () => document.getElementById("upload-language")?.click());
        panel.querySelector("[data-language-settings]").addEventListener("click", () => {
            closeModalOverlay(panel);
            showLanguageSelection(false);
        });
        panel.querySelector("[data-language-store]").addEventListener("click", openLanguageStorePanel);
        panel.querySelector("[data-zoom-settings]")?.addEventListener("click", () => {
            toggleZoom();
            closeModalOverlay(panel);
        });
        panel.querySelector("[data-celebrations-toggle]").addEventListener("change", event => {
            localStorage.setItem(ENABLE_CELEBRATIONS_KEY, event.target.checked ? "true" : "false");
        });
        panel.querySelector("[data-sound-toggle]").addEventListener("change", event => {
            isSoundEnabled = event.target.checked;
            localStorage.setItem("isSoundEnabled", isSoundEnabled ? "true" : "false");
        });
        panel.querySelector("[data-restore-latest]")?.addEventListener("click", () => {
            const items = getRecycleBin();
            const latest = items.shift();
            if (!latest) return;
            saveRecycleBin(items);
            const { deletedAt, ...post } = latest;
            persistPosts([post, ...getStoredPosts()]);
            renderPosts(elements.searchInput.value.trim());
            updateBackupHealthUI();
            closeModalOverlay(panel);
        });
        panel.querySelector("[data-clear-deleted]")?.addEventListener("click", () => {
            const previous = getRecycleBin();
            saveRecycleBin([]);
            showUndoToast(
                textFor("clearDeletedMessage", "Recently Deleted cleared."),
                () => {
                    saveRecycleBin(previous);
                    createNotification(textFor("clearDeletedUndoMessage", "Recently Deleted restored."), { duration: 1600 });
                }
            );
            closeModalOverlay(panel);
        });
        panel.querySelector("[data-install-app]")?.addEventListener("click", async () => {
            if (!deferredInstallPrompt) return;
            deferredInstallPrompt.prompt();
            await deferredInstallPrompt.userChoice;
            deferredInstallPrompt = null;
            closeModalOverlay(panel);
        });
        panel.querySelector("[data-install-update]")?.addEventListener("click", () => {
            const version = localStorage.getItem(PENDING_UPDATE_VERSION_KEY);
            if (!version) return;
            performUpdate(version, getCurrentDraftForUpdate, saveDraftForUpdate, panel);
        });
        panel.querySelector("[data-check-update]")?.addEventListener("click", async event => {
            const button = event.currentTarget;
            const updateRow = button.closest("[data-settings-icon='update']");
            const title = panel.querySelector("[data-update-check-title]");
            const status = panel.querySelector("[data-update-check-status]");
            const originalTitle = title.textContent;
            const originalStatus = status.textContent;
            button.disabled = true;
            button.classList.add("is-checking");
            updateRow?.classList.add("is-checking-icon");
            button.textContent = textFor("settingsChecking", "Checking...");
            const startedAt = Date.now();
            const result = await checkForUpdates({ forceNotify: true, suppressNotify: true });
            const elapsed = Date.now() - startedAt;
            if (elapsed < 5000) await new Promise(resolve => setTimeout(resolve, 5000 - elapsed));
            if (result.status === "available") {
                updateRow?.classList.remove("is-checking-icon");
                closeModalOverlay(panel);
                showUpdateNotification(result.version, getCurrentDraftForUpdate, saveDraftForUpdate);
                return;
            }
            title.textContent = textFor("settingsUpToDate", "You're up to date!");
            status.textContent = result.status === "offline" ? textFor("settingsOfflineUpdate", "Connect to the internet and try again.") : textFor("settingsNoUpdate", "No update is available.");
            button.classList.remove("is-checking");
            updateRow?.classList.remove("is-checking-icon");
            button.classList.add("is-update-current");
            button.textContent = textFor("settingsDone", "Done");
            setTimeout(() => {
                if (!document.body.contains(panel)) return;
                title.textContent = originalTitle;
                status.textContent = originalStatus;
                button.disabled = false;
                button.classList.remove("is-update-current");
                button.textContent = textFor("settingsCheck", "Check");
            }, 45000);
        });
        panel.querySelector("[data-open-guides]")?.addEventListener("click", openGuidesPanel);
        panel.querySelector("[data-open-about]")?.addEventListener("click", openAboutPanel);
    }

    function normalizeLanguageStoreItems(payload) {
        const normalizeLanguageKey = value => String(value || "")
            .toLowerCase()
            .replace(/\.json$/i, "")
            .replace(/^languages[/-]/, "")
            .replace(/[_\s]+/g, "-")
            .replace(/[^a-z0-9-]/g, "");
        const nativeNameFor = item => {
            const candidates = [
                item.nativeName,
                item.native,
                item.localName,
                item.displayNativeName,
                item.native_language,
                item.nativeLanguage
            ].filter(Boolean);
            if (candidates.length) return candidates[0];
            const keyCandidates = [item.id, item.key, item.slug, item.code, item.name, item.title, item.language, item.file, item.fileName, item.filename, item.path]
                .map(normalizeLanguageKey);
            for (const key of keyCandidates) {
                if (LANGUAGE_NATIVE_NAMES[key]) return LANGUAGE_NATIVE_NAMES[key];
                const compactKey = key.replace(/-/g, "");
                if (LANGUAGE_NATIVE_NAMES[compactKey]) return LANGUAGE_NATIVE_NAMES[compactKey];
            }
            return item.name || item.title || item.language || item.id || "";
        };
        const formatStoreSize = size => {
            if (size === undefined || size === null || size === "") return "";
            if (typeof size === "number") {
                if (size < 1024) return `${size} B`;
                if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
                return `${(size / 1024 / 1024).toFixed(1)} MB`;
            }
            return String(size);
        };
        const rawItems = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.languages)
                ? payload.languages
                : Array.isArray(payload?.items)
                    ? payload.items
                    : payload && typeof payload === "object"
                        ? Object.entries(payload)
                            .filter(([key]) => !["appId", "version", "updated"].includes(key))
                            .map(([id, value]) => {
                                if (typeof value === "string") return { id, name: id, file: value };
                                return { id, ...(typeof value === "object" ? value : { name: String(value) }) };
                            })
                        : [];

        return rawItems
            .map((item, index) => {
                const id = item.id || item.key || item.slug || item.code || `language-${index + 1}`;
                const name = item.name || item.title || item.language || id;
                const nativeName = nativeNameFor(item) || name;
                const file = item.file || item.fileName || item.filename || item.path || item.json;
                const url = item.url || item.downloadUrl || item.rawUrl || item.href || file;
                const absoluteUrl = url
                    ? (/^https?:\/\//i.test(url) ? url : new URL(String(url).replace(/^\/+/, ""), `${LANGUAGE_STORE_RAW_BASE_URL}/`).toString())
                    : "";
                const size = formatStoreSize(item.size || item.fileSize || item.filesize || item.bytes || item.length || "");
                const price = item.price || item.cost || (item.free === false ? textFor("languageStorePaidPill", "Paid") : textFor("languageStoreFreePill", "Free"));
                return {
                    id,
                    name,
                    nativeName,
                    description: item.description || item.tagline || item.locale || textFor("languageStoreDefaultDescription", "Download and use this language in Thoughts."),
                    size,
                    price,
                    url: absoluteUrl,
                    pack: item.data || item.pack || item.languagePack || null
                };
            })
            .filter(item => item.url || item.pack);
    }

    async function fetchLanguageStoreItems() {
        try {
            const response = await fetch(`${LANGUAGE_STORE_MANIFEST_URL}?t=${Date.now()}`, { cache: "no-store" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return normalizeLanguageStoreItems(await response.json());
        } catch (err) {
            console.warn("Language store source failed:", LANGUAGE_STORE_MANIFEST_URL, err);
        }
        return [];
    }

    function normalizeLanguagePack(customLangData, fallbackName = "language") {
        if (!isThoughtsLanguagePack(customLangData)) return null;
        if (customLangData.name && customLangData.appId) {
            const { appId, ...languagePack } = customLangData;
            return { [customLangData.name || fallbackName]: languagePack };
        }
        return Object.keys(customLangData)
            .filter(key => key !== "appId")
            .reduce((obj, key) => {
                obj[key] = customLangData[key];
                return obj;
            }, {});
    }

    async function installLanguagePackFromData(customLangData, fallbackName = "language") {
        const languagesToAdd = normalizeLanguagePack(customLangData, fallbackName);
        if (!languagesToAdd || Object.keys(languagesToAdd).length === 0) {
            throw new Error("Invalid Thoughts language pack");
        }
        Object.assign(languageData, languagesToAdd);
        await saveLanguagesToCache();
        const firstLang = Object.keys(languagesToAdd)[0];
        selectedLanguage = firstLang;
        applyLanguage(firstLang);
        return firstLang;
    }

    async function installLanguageFromStore(item, button) {
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = textFor("languageStoreInstalling", "Installing...");
        try {
            let pack = item.pack;
            if (!pack) {
                const response = await fetch(`${item.url}${item.url.includes("?") ? "&" : "?"}t=${Date.now()}`, { cache: "no-store" });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                pack = await response.json();
            }
            const installedName = await installLanguagePackFromData(pack, item.id);
            createNotification(textFor("languageStoreInstalled", "{name} installed.", { name: installedName }), { duration: 1800 });
            button.textContent = textFor("languageStoreInstalledButton", "Installed");
        } catch (err) {
            console.error("Language store install failed:", err);
            throttledPlaySound('/sounds/error.ogg');
            button.disabled = false;
            button.textContent = originalText;
            createNotification(textFor("languageStoreInstallFailed", "Could not install this language."), { background: "#ef4444", duration: 2200 });
        }
    }

    function formatBytes(bytes) {
        const value = Number(bytes);
        if (!Number.isFinite(value) || value <= 0) return "";
        if (value < 1024) return `${value} B`;
        if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
        return `${(value / 1024 / 1024).toFixed(1)} MB`;
    }

    async function hydrateLanguageStoreSizes(items, panel) {
        const sizePills = panel.querySelectorAll("[data-language-size-index]");
        await Promise.all(Array.from(sizePills).map(async pill => {
            const item = items[Number(pill.dataset.languageSizeIndex)];
            if (!item?.url || item.size) return;
            try {
                const response = await fetch(item.url, { method: "HEAD", cache: "no-store" });
                const size = formatBytes(response.headers.get("content-length"));
                if (size && document.body.contains(panel)) pill.textContent = size;
            } catch (err) {
                console.warn("Language size lookup failed:", item.url, err);
            }
        }));
    }

    async function openLanguageStorePanel() {
        const existing = document.getElementById("language-store-overlay");
        if (existing) closeModalOverlay(existing);
        const panel = document.createElement("div");
        panel.id = "language-store-overlay";
        panel.className = "settings-overlay";
        panel.innerHTML = `
            <div class="settings-panel language-store-panel" role="dialog" aria-modal="true" aria-labelledby="language-store-title">
                <div class="settings-panel-header">
                    <div>
                        <p class="panel-kicker">${texts.appName || "Thoughts"}</p>
                        <h2 id="language-store-title">${textFor("languageStoreTitle", "Language store")}</h2>
                        <p class="panel-subtitle">${textFor("languageStoreSubtitle", "Browse webstore language packs and install them directly.")}</p>
                    </div>
                    <button type="button" data-close-language-store aria-label="${textFor("closeLanguageStoreLabel", "Close language store")}">&times;</button>
                </div>
                <div class="settings-content">
                    <section class="settings-group language-store-hero">
                        <strong>${textFor("languageStoreWebTitle", "Thoughts Web Store")}</strong>
                        <span>${textFor("languageStoreWebSubtitle", "Browse curated language packs and install them directly into Thoughts.")}</span>
                        <a href="${LANGUAGE_STORE_WEB_URL}" target="_blank" rel="noopener noreferrer">${textFor("languageStoreOpenWeb", "Open webstore")}</a>
                    </section>
                    <section class="settings-group language-store-list" data-language-store-list>
                        <p class="settings-eyebrow">${textFor("languageStoreLoading", "Loading languages...")}</p>
                    </section>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
        const storePanel = panel.querySelector(".settings-panel");
        lockPageScrollForModal(panel, storePanel);
        panel.querySelector("[data-close-language-store]").addEventListener("click", () => closeModalOverlay(panel));
        panel.addEventListener("click", event => {
            if (event.target === panel) closeModalOverlay(panel);
        });

        const list = panel.querySelector("[data-language-store-list]");
        const items = await fetchLanguageStoreItems();
        if (!document.body.contains(panel)) return;
        if (!items.length) {
            list.innerHTML = `
                <p class="settings-eyebrow">${textFor("languageStoreUnavailableTitle", "Store list unavailable")}</p>
                <span>${textFor("languageStoreUnavailableMessage", "Open the webstore to download a language pack, then use Upload language from Settings.")}</span>
            `;
            return;
        }
        list.innerHTML = items.map((item, index) => `
            <div class="language-store-item">
                <div class="language-store-main">
                    <div class="language-store-title-row">
                        <strong>${escapeHTML(item.name)}</strong>
                        <span>${escapeHTML(item.nativeName)}</span>
                    </div>
                    <p>${escapeHTML(item.description)}</p>
                    <div class="language-store-pills">
                        <span ${item.size ? "" : `data-language-size-index="${index}"`}>${escapeHTML(item.size || textFor("languageStoreUnknownSize", "Size unknown"))}</span>
                        <span>${escapeHTML(item.price || textFor("languageStoreFreePill", "Free"))}</span>
                    </div>
                </div>
                <div class="language-store-actions">
                    <button type="button" data-language-store-install="${index}">${textFor("languageStoreInstall", "Install")}</button>
                </div>
            </div>
        `).join("");
        list.querySelectorAll("[data-language-store-install]").forEach(button => {
            button.addEventListener("click", () => installLanguageFromStore(items[Number(button.dataset.languageStoreInstall)], button));
        });
        hydrateLanguageStoreSizes(items, panel);
    }

    function renderPostSkeletons(count = 4) {
        elements.postContainer.innerHTML = Array.from({ length: count }, () => `
            <article class="post post-skeleton" aria-hidden="true">
                <div class="skeleton-line skeleton-title"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line skeleton-short"></div>
                <div class="skeleton-actions">
                    <span></span><span></span><span></span>
                </div>
            </article>
        `).join("");
    }

    function openAboutPanel() {
        const existing = document.getElementById("about-panel-overlay");
        if (existing) closeModalOverlay(existing);
        const panel = document.createElement("div");
        panel.id = "about-panel-overlay";
        panel.className = "settings-overlay";
        panel.innerHTML = `
            <div class="settings-panel about-panel" role="dialog" aria-modal="true" aria-labelledby="about-title">
                <div class="settings-panel-header">
                    <div>
                        <p class="panel-kicker">${textFor("aboutKicker", "About")}</p>
                        <h2 id="about-title">${texts.appName || "Thoughts"}</h2>
                        <p class="panel-subtitle">${textFor("aboutSubtitle", "A fast local notebook for private thoughts, tasks, memories, and ideas.")}</p>
                    </div>
                    <button type="button" data-close-about aria-label="${textFor("closeAboutLabel", "Close about")}">&times;</button>
                </div>
                <div class="about-copy">
                    <section class="about-hero">
                        <p class="settings-eyebrow">${textFor("aboutEyebrow", "Local-first PWA")}</p>
                        <h3>${textFor("aboutHeroTitle", "Capture now. Keep control later.")}</h3>
                        <p>${texts.footerDescription || "A local-first notes PWA designed for fast capture, backup confidence, and offline use."}</p>
                    </section>
                    <section class="about-grid">
                        <div>
                            <h3>${textFor("aboutPrivateStorageTitle", "Private storage")}</h3>
                            <p>${textFor("aboutPrivateStorageText", "Notes are stored locally in your browser on this device.")}</p>
                        </div>
                        <div>
                            <h3>${textFor("aboutOfflineReadyTitle", "Offline ready")}</h3>
                            <p>${texts.footerOfflineText || "Install Thoughts for offline use."}</p>
                        </div>
                    </section>
                    <section>
                        <h3>${textFor("aboutPrivacyTitle", "Privacy")}</h3>
                        <p>${textFor("aboutPrivacyText", "Clearing browser data can delete your notes. Export a backup regularly before resetting the browser, changing devices, or clearing storage.")}</p>
                    </section>
                    <section>
                        <h3>${texts.webStoreTitle || "Web Store"}</h3>
                        <p>${texts.webStoreNote || "Download your favorite language from the site and upload it in Settings."}</p>
                        <p><a href="https://thoughtswebstore.netlify.app" target="_blank" rel="noopener noreferrer">${texts.webStoreLinkText || "Visit Web Store"}</a></p>
                    </section>
                    <section>
                        <h3>${texts.footerOfflineTitle || "Go Offline"}</h3>
                        <p>${texts.footerAndroidGuide || "Android: Menu > Add to Home screen."}</p>
                        <p>${texts.footerIOSGuide || "iOS: Share > Add to Home Screen."}</p>
                    </section>
                    <section class="about-meta-section">
                        <h3>${textFor("aboutReleaseTitle", "Release")}</h3>
                        <div class="about-meta-pills">
                            <p class="about-version">${textFor("versionLabel", "Version")} ${APP_VERSION}</p>
                            <button type="button" class="about-build" data-about-build>${getBuildInfoLabel()}</button>
                        </div>
                    </section>
                    <section>
                        <h3>${texts.footerCraftedBy || "Crafted by"}</h3>
                        <p><a href="https://dheeraz.netlify.app" target="_blank" rel="noopener noreferrer">Dheeraz</a></p>
                    </section>
                    <div class="about-legacy-copy" aria-hidden="true">
                    <p>${texts.footerDescription || "A local-first notes PWA designed for fast capture, backup confidence, and offline use."}</p>
                    <p>${textFor("footerPrivacy", "Stored locally in your browser. Clearing browser data can delete notes unless you export a backup.")}</p>
                    <p>${texts.footerOfflineText || "Install Thoughts for offline use."}</p>
                    <p>${texts.footerAndroidGuide || "Android: Menu > Add to Home screen."}</p>
                    <p>${texts.footerIOSGuide || "iOS: Share > Add to Home Screen."}</p>
                    <button type="button" class="about-build" data-about-build>${getBuildInfoLabel()}</button>
                    <p class="about-version">${textFor("versionLabel", "Version")} ${APP_VERSION}</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
        const aboutPanel = panel.querySelector(".settings-panel");
        lockPageScrollForModal(panel, aboutPanel);
        panel.querySelector("[data-close-about]").addEventListener("click", () => closeModalOverlay(panel));
        panel.addEventListener("click", event => {
            if (event.target === panel) closeModalOverlay(panel);
        });

        let tapCount = 0;
        let tapTimeout = null;
        panel.querySelector("[data-about-build]").addEventListener("click", () => {
            if (isGodMode) {
                createNotification(textFor("godModeAlreadyUnlocked", "God Mode already unlocked"), { duration: 1200 });
                return;
            }
            tapCount += 1;
            if (tapTimeout) clearTimeout(tapTimeout);
            tapTimeout = setTimeout(() => {
                tapCount = 0;
            }, 1800);
            if (tapCount >= GOD_MODE_TAP_TARGET) {
                tapCount = 0;
                closeModalOverlay(panel);
                activateGodMode();
                return;
            }
            if (tapCount >= 2) {
                createNotification(textFor("godModeTapsRemaining", "{count} more taps to unlock God Mode", { count: String(GOD_MODE_TAP_TARGET - tapCount) }), { duration: 900 });
            }
        });
    }

    function openGuidesPanel() {
        const existing = document.getElementById("guides-panel-overlay");
        if (existing) closeModalOverlay(existing);
        const desktopShortcuts = [
            ["Ctrl/Cmd + N", textFor("guideShortcutNew", "Focus the note input")],
            ["Ctrl/Cmd + Enter", textFor("guideShortcutSave", "Save the current note")],
            ["Esc", textFor("guideShortcutEscape", "Cancel edit or clear search")],
            ["#tag", textFor("guideShortcutTagSearch", "Search or filter by hashtag")],
            ["@title", textFor("guideShortcutTitleSearch", "Find notes by title")]
        ];
        const mobileShortcuts = [
            [textFor("guideMobileNewTitle", "Bottom + button"), textFor("guideMobileNew", "Jump to the note input")],
            [textFor("guideMobileShareTitle", "Share action"), textFor("guideMobileShare", "Share notes as text, image, or clipboard copy")],
            [textFor("guideMobilePinTitle", "Pin action"), textFor("guideMobilePin", "Keep one important note at the top")],
            [textFor("guideMobileSettingsTitle", "Settings button"), textFor("guideMobileSettings", "Open backups, language, updates, guides, and About")],
            [textFor("guideMobileBuildTitle", "Build tap"), textFor("guideMobileBuild", "Tap the build label 7 times to unlock God Mode")]
        ];
        const shortcutRows = (isPC() ? desktopShortcuts : mobileShortcuts)
            .map(([label, detail]) => `<li><kbd>${escapeHTML(label)}</kbd><span>${escapeHTML(detail)}</span></li>`)
            .join("");

        const panel = document.createElement("div");
        panel.id = "guides-panel-overlay";
        panel.className = "settings-overlay";
        panel.innerHTML = `
            <div class="settings-panel about-panel guides-panel" role="dialog" aria-modal="true" aria-labelledby="guides-title">
                <div class="settings-panel-header">
                    <div>
                        <p class="panel-kicker">${textFor("guidesKicker", "Guide")}</p>
                        <h2 id="guides-title">${textFor("guidesTitle", "Use Thoughts well")}</h2>
                        <p class="panel-subtitle">${textFor("guidesSubtitle", "Fast capture, local backups, markdown, search, sharing, and shortcuts.")}</p>
                    </div>
                    <button type="button" data-close-guides aria-label="${textFor("closeGuidesLabel", "Close guides")}">&times;</button>
                </div>
                <div class="about-copy guides-copy">
                    <section class="about-hero">
                        <p class="settings-eyebrow">${textFor("guideSectionCaptureEyebrow", "Capture")}</p>
                        <h3>${textFor("guideCaptureTitle", "Write first. Organize lightly.")}</h3>
                        <p>${textFor("guideCaptureText", "Use @title for a quick title and #hashtags for projects, memories, tasks, or themes. Drafts save quietly while you type.")}</p>
                    </section>
                    <section>
                        <h3>${textFor("guideMarkdownTitle", "Markdown formats")}</h3>
                        <ul class="guide-list">
                            <li><kbd>**bold**</kbd><span>${textFor("guideMarkdownBold", "Bold text")}</span></li>
                            <li><kbd>*italic*</kbd><span>${textFor("guideMarkdownItalic", "Italic text")}</span></li>
                            <li><kbd>__underline__</kbd><span>${textFor("guideMarkdownUnderline", "Underline text")}</span></li>
                            <li><kbd>~~strike~~</kbd><span>${textFor("guideMarkdownStrike", "Strikethrough text")}</span></li>
                            <li><kbd>==mark==</kbd><span>${textFor("guideMarkdownMark", "Highlighted text")}</span></li>
                            <li><kbd>\`code\`</kbd><span>${textFor("guideMarkdownCode", "Inline code")}</span></li>
                            <li><kbd>[text](https://...)</kbd><span>${textFor("guideMarkdownLink", "Clickable links")}</span></li>
                        </ul>
                    </section>
                    <section>
                        <h3>${isPC() ? textFor("guidePcShortcutsTitle", "PC shortcuts") : textFor("guideMobileShortcutsTitle", "Mobile actions")}</h3>
                        <ul class="guide-list">${shortcutRows}</ul>
                    </section>
                    <section>
                        <h3>${textFor("guideSearchTitle", "Search")}</h3>
                        <p>${textFor("guideSearchText", "Use #tag, @title, quoted exact phrases, or recent to quickly narrow notes.")}</p>
                    </section>
                    <section>
                        <h3>${textFor("guideBackupTitle", "Backups and recovery")}</h3>
                        <p>${textFor("guideBackupText", "Notes are stored locally in your browser. Export backups regularly, especially before clearing browser data or changing devices. Deleted notes can be restored from Recently Deleted.")}</p>
                    </section>
                    <section>
                        <h3>${textFor("guideShareTitle", "Sharing")}</h3>
                        <p>${textFor("guideShareText", "Use each note's Share action to share plain text, copy to clipboard, or generate a clean image card.")}</p>
                    </section>
                    <section>
                        <h3>${textFor("guideLanguageTitle", "Languages")}</h3>
                        <p>${textFor("guideLanguageText", "Choose a built-in language, upload a language pack, or install packs directly from the Language Store.")}</p>
                    </section>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
        const guidesPanel = panel.querySelector(".settings-panel");
        lockPageScrollForModal(panel, guidesPanel);
        panel.querySelector("[data-close-guides]").addEventListener("click", () => closeModalOverlay(panel));
        panel.addEventListener("click", event => {
            if (event.target === panel) closeModalOverlay(panel);
        });
    }

    function setupBottomNavigation() {
        if (document.getElementById("bottom-nav")) return;
        const nav = document.createElement("nav");
        nav.id = "bottom-nav";
        nav.className = "bottom-nav";
        nav.setAttribute("aria-label", textFor("primaryNavigationLabel", "Primary"));
        nav.innerHTML = `
            <button type="button" data-nav-search aria-label="${textFor("searchLabel", "Search")}"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg></button>
            <button type="button" data-nav-new aria-label="${textFor("newNoteLabel", "New note")}"><svg viewBox="0 0 24 24"><path d="M12 5v14"/><path d="M5 12h14"/></svg></button>
            <button type="button" data-nav-settings aria-label="${textFor("settingsTitle", "Settings")}"><svg viewBox="0 0 24 24" class="settings-sliders-icon"><path d="M5 8h5"/><path d="M14 8h5"/><circle cx="12" cy="8" r="2.25"/><path d="M5 16h9"/><path d="M18 16h1"/><circle cx="16" cy="16" r="2.25"/></svg></button>
        `;
        document.body.appendChild(nav);
        nav.querySelector("[data-nav-search]").addEventListener("click", () => elements.searchInput.focus());
        nav.querySelector("[data-nav-new]").addEventListener("click", () => {
            elements.inputWrapper.focus();
            document.querySelector(".input-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        nav.querySelector("[data-nav-settings]").addEventListener("click", openSettingsPanel);
    }

      // Initial call to set footer
      updateFooterCopyright();
      setupGodModeBuildTapUnlock();
      maybeShowFirstRunOnboarding();
      setupBottomNavigation();
      updateBackupHealthUI();

    function applyLanguage(lang) {
        saveAppSettings(lang, undefined);
        setTimeout(() => {
            texts = { ...(languageData["english"] || {}), ...(languageData[lang] || {}), ...JSON.parse(localStorage.getItem("customComponents") || "{}") };
            const baseCharLimit = Number(texts.charLimit) || DEFAULT_CHAR_LIMIT;
            currentCharLimit = isGodMode ? baseCharLimit * 2 : baseCharLimit;
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
            if (elements.searchInput) elements.searchInput.placeholder = textFor("searchPlaceholderAdvanced", texts.searchPlaceholder || "Search #tag, @title, \"exact\", recent...");
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
            if (footerPrivacy) footerPrivacy.textContent = textFor("footerPrivacy", "Stored locally in your browser. Clearing browser data can delete notes unless you export a backup.");
            ensureBuildInfoElement();
            setupGodModeBuildTapUnlock();
            updateBackupHealthUI();

            const footerMadeWithLove = document.getElementById("footer-made-with-love");
            if (footerMadeWithLove) footerMadeWithLove.textContent = texts.footerMadeWithLove;

            updateFooterCopyright();
            // Persist immediately
            localStorage.setItem("language", lang);
            localStorage.setItem("isGodMode", isGodMode.toString());
            saveLanguagesToCache(); // Asynchronous cache backup
            updateDynamicText();
            if (elements?.postContainer) {
                hasRenderedPostSkeleton = true;
                renderPosts(elements.searchInput?.value?.trim() || "");
            }
        }, 50);
        // Removed: showLanguageChangeNotification(lang); // No automatic notification here
    }

    // Utility to force-clear draft across all storage mechanisms
    function forceClearDraft() {
        localStorage.removeItem("draftNote");
        lastSavedDraft = "";
        elements.inputWrapper.value = "";
        updateCharCount(0);
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
        currentCharLimit = (Number(texts.charLimit) || DEFAULT_CHAR_LIMIT) * 2;
        texts.charCount = `{count}/${currentCharLimit}`;
        localStorage.setItem("isGodMode", "true");
        forceClearDraft();
        updateCharCount(0);
        updateDynamicText();
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

    function getFilteredPosts(posts, filterText = "") {
        noteSearchIndex = posts.map(post => ({
            post,
            text: post.text.toLowerCase(),
            title: (extractTitleAndContent(post.text).title || "").toLowerCase(),
            tags: (post.text.match(/#[\w\u00C0-\uFFFF]+/g) || []).map(tag => tag.toLowerCase()),
            timestampMs: Date.parse(post.timestamp) || 0
        }));
        const normalizedFilter = (filterText || "").toLowerCase();
        const phraseMatches = [...normalizedFilter.matchAll(/"([^"]+)"/g)].map(match => match[1].trim()).filter(Boolean);
        const tagMatches = [...normalizedFilter.matchAll(/(^|\s)#([\w\u00C0-\uFFFF]+)/g)].map(match => `#${match[2]}`);
        const titleMatches = [...normalizedFilter.matchAll(/(^|\s)@([\w\u00C0-\uFFFF]+)/g)].map(match => match[2]);
        const wantsRecent = /\brecent\b|recent:7d/.test(normalizedFilter);
        const plainQuery = normalizedFilter
            .replace(/"[^"]+"/g, "")
            .replace(/(^|\s)[#@][\w\u00C0-\uFFFF]+/g, " ")
            .replace(/\brecent(?::7d)?\b/g, " ")
            .trim();
        const recentCutoff = Date.now() - 7 * 86400000;
        const filteredPosts = activeHashtag
            ? noteSearchIndex.filter(entry => entry.tags.includes(`#${activeHashtag}`)).map(entry => entry.post)
            : noteSearchIndex.filter(entry => {
                if (tagMatches.length && !tagMatches.every(tag => entry.tags.includes(tag))) return false;
                if (titleMatches.length && !titleMatches.every(title => entry.title.includes(title))) return false;
                if (phraseMatches.length && !phraseMatches.every(phrase => entry.text.includes(phrase))) return false;
                if (wantsRecent && entry.timestampMs < recentCutoff) return false;
                if (plainQuery && !entry.text.includes(plainQuery)) return false;
                return true;
            }).map(entry => entry.post);

        const pinnedPosts = filteredPosts.filter(post => post.pinned);
        const regularPosts = filteredPosts.filter(post => !post.pinned).reverse();
        return [...pinnedPosts, ...regularPosts];
    }

    function renderLoadMoreControl(totalCount, renderedCount, filterText) {
        const existing = document.getElementById("load-more-posts");
        if (existing) existing.remove();
        if (renderedCount >= totalCount) return;

        const button = document.createElement("button");
        button.id = "load-more-posts";
        button.className = "load-more-posts";
        button.textContent = `Load more (${totalCount - renderedCount} remaining)`;
        button.addEventListener("click", () => {
            throttledPlaySound('/sounds/click.ogg');
            visiblePostCount += RENDER_STEP;
            renderPosts(filterText);
        });
        elements.postContainer.appendChild(button);
    }

    function renderPosts(filterText = "") {
        try {
            const posts = normalizePosts(JSON.parse(localStorage.getItem("posts") || "[]"));
            localStorage.setItem("posts", JSON.stringify(posts));
            if (!hasRenderedPostSkeleton && posts.length > 0 && !filterText && !activeHashtag) {
                hasRenderedPostSkeleton = true;
                renderPostSkeletons(Math.min(4, posts.length));
                setTimeout(() => renderPosts(filterText), 120);
                return;
            }
            elements.postContainer.innerHTML = "";
            console.log("Rendering posts:", posts);
            const normalizedFilter = (filterText || "").trim().toLowerCase();

            if (normalizedFilter !== lastRenderFilter || activeHashtag !== lastRenderHashtag) {
                visiblePostCount = INITIAL_RENDER_LIMIT;
                lastRenderFilter = normalizedFilter;
                lastRenderHashtag = activeHashtag;
            }

            // Update header title with post count
            const headerTitle = document.querySelector("header h1");
            if (headerTitle) {
                headerTitle.textContent = `${texts.appName} ${toRoman(posts.length)}`;
            }

            if (posts.length === 0) {
                renderEmptyState();
            } else {
                const filteredPosts = getFilteredPosts(posts, normalizedFilter);
                if (filteredPosts.length === 0) {
                    elements.postContainer.innerHTML = `<div class="no-results">${texts.noResultsMessage}</div>`;
                } else {
                    const fragment = document.createDocumentFragment();
                    const postsToRender = filteredPosts.slice(0, visiblePostCount);
                    postsToRender.forEach((post) => renderPost(post, posts.indexOf(post), post.pinned, fragment));
                    elements.postContainer.appendChild(fragment);
                    renderLoadMoreControl(filteredPosts.length, postsToRender.length, normalizedFilter);
                }
            }
            renderHashtagList(posts);
            updateBackupHealthUI();
            elements.footer.classList.remove("hidden");
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

        const safeTitle = typeof title === "string" && title.trim() ? title : "Notice";
        const safeMessage = typeof message === "string" && message.trim() ? message : "Please check this and try again.";
        const safeConfirmText = typeof confirmText === "string" && confirmText.trim() ? confirmText : "OK";
        const safeCancelText = typeof texts.cancelButton === "string" && texts.cancelButton.trim() ? texts.cancelButton : "Cancel";
        const safeConfirmAction = typeof confirmAction === "function" ? confirmAction : () => {};

        titleEl.textContent = safeTitle;
        messageEl.innerHTML = safeMessage;
        confirmBtn.textContent = safeConfirmText;
        cancelBtn.textContent = safeCancelText;
        cancelBtn.style.display = showCancel ? "block" : "none";

        popupDiv.classList.remove("hidden");
        document.body.style.overflow = "hidden";

        confirmBtn.onclick = () => {
            safeConfirmAction();
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
        updateCharCount();
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
        status.textContent = navigator.onLine ? "" : "";
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

    function updateCharCount(count = elements.inputWrapper.value.length) {
        elements.charCount.textContent = (texts.charCount || "{count}/{currentCharLimit}")
            .replace("{count}", count)
            .replace("{currentCharLimit}", currentCharLimit);
    }
    getCurrentDraftForUpdate = () => elements.inputWrapper?.value?.trim() || "";
    saveDraftForUpdate = saveDraft;

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
                CURRENT_RELEASE_CHANGELOG,
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
        reader.onload = async e => {
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

                const firstLang = await installLanguagePackFromData(customLangData, file.name.replace(".json", ""));

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
        const posts = getStoredPosts();
        if (posts.length === 0) {
            throttledPlaySound('/sounds/error.ogg');
            showCustomPopup(texts.exportNotesTitle, texts.exportEmptyMessage, texts.okButton, () => {}, false);
            return;
        }
        const exportedAt = new Date().toISOString();
        const exportData = {
            appId: "thoughts-app",
            version: BACKUP_SCHEMA_VERSION,
            exportedAt,
            posts
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `thoughts-backup-${exportedAt.slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        localStorage.setItem(LAST_BACKUP_AT_KEY, exportedAt);
        localStorage.setItem(LAST_BACKUP_COUNT_KEY, String(posts.length));
        updateBackupHealthUI();
    }

    function readBackupPayload(data) {
        if (!data || data.appId !== "thoughts-app") return null;
        const posts = Array.isArray(data.posts) ? data.posts : null;
        if (!posts) return null;
        const normalizedPosts = normalizePosts(posts);
        const migrationLog = JSON.parse(localStorage.getItem("backupMigrationLog") || "[]");
        migrationLog.push({
            fromVersion: data.version || "legacy",
            importedAt: new Date().toISOString(),
            postCount: normalizedPosts.length
        });
        localStorage.setItem("backupMigrationLog", JSON.stringify(migrationLog.slice(-20)));
        return normalizedPosts;
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
                const importedPosts = readBackupPayload(data);
                if (!importedPosts) {
                    throttledPlaySound('/sounds/error.ogg');
                    showCustomPopup(texts.importErrorTitle, data?.appId !== "thoughts-app" ? texts.importErrorNotThoughts : texts.importErrorInvalidFormat, texts.okButton, () => {}, false);
                    return;
                }
                const existingPosts = getStoredPosts();
                if (existingPosts.length > 0) {
                    showImportConfirmation(importedPosts, existingPosts);
                } else {
                    persistPosts(importedPosts);
                    debouncedRenderPosts();
                    updateBackupHealthUI();
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
        const duplicateCount = newPosts.filter(newPost => existingPosts.some(post => post.text === newPost.text && post.timestamp === newPost.timestamp)).length;
        const addCount = Math.max(0, newPosts.length - duplicateCount);
        titleEl.textContent = textFor("importConfirmTitle", "Import Notes?");
        messageEl.textContent = textFor(
            "importPreviewText",
            "Adds {addCount} notes, skips {skipCount} duplicates. Merge keeps existing notes; Replace overwrites the current list.",
            { addCount: String(addCount), skipCount: String(duplicateCount) }
        );
        mergeBtn.textContent = texts.mergeButton;
        replaceBtn.textContent = texts.replaceButton;
        cancelBtn.textContent = texts.cancelButton;

        popupDiv.classList.remove("hidden");
        document.body.style.overflow = "hidden";

        mergeBtn.onclick = () => {
            throttledPlaySound('/sounds/click.ogg')
            const mergedPosts = mergePosts(existingPosts, newPosts);
            persistPosts(mergedPosts);
            debouncedRenderPosts();
            updateBackupHealthUI();
            showSuccess(texts.importSuccessMerge);
            popupDiv.classList.add("hidden");
            document.body.style.overflow = "";
        };

        replaceBtn.onclick = () => {
            throttledPlaySound('/sounds/click.ogg')
            const previousPosts = [...existingPosts];
            persistPosts(newPosts);
            debouncedRenderPosts();
            updateBackupHealthUI();
            showUndoToast(
                textFor("importSuccessReplace", "Notes replaced."),
                () => {
                    persistPosts(previousPosts);
                    renderPosts(elements.searchInput.value.trim());
                    updateBackupHealthUI();
                    createNotification(textFor("importReplaceUndoMessage", "Previous notes restored."), { duration: 1600 });
                },
                9000
            );
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

    function renderPost(post, index, isPinned, targetContainer = elements.postContainer) {
        const formattedDate = formatPostDate(post.timestamp);
        const { title, content } = extractTitleAndContent(post.text);
        const relativeDate = timeAgo(post.timestamp);
        const readTime = getReadingTime(post.text);
        const wordCount = getWordCount(post.text);

        const postElement = document.createElement("div");
        postElement.className = `post ${editIndex === index ? "editing" : ""} ${isPinned ? "pinned" : ""}`;
        postElement.innerHTML = `
            ${title ? `<div class="post-title">${escapeHTML(title)}</div>` : ""}
            <div class="post-content">${formatNoteContent(content)}</div>
            <div class="post-meta">
                <span class="meta-badge" title="${formattedDate}">${relativeDate}</span>
                <span class="meta-badge">${textFor("wordCountLabel", "{count} words", { count: String(wordCount) })}</span>
                <span class="meta-badge">${readTime}</span>
                ${isPinned ? `<span class="meta-badge">${textFor("pinnedMetaLabel", "Pinned")}</span>` : ''}
                <span class="meta-badge share-post" data-index="${index}" style="cursor: pointer; ${editIndex === index ? 'opacity: 0.5; pointer-events: none;' : ''}">${textFor("shareButton", "Share")}</span>
            </div>
            <div class="post-actions">
                <button class="edit-post" data-index="${index}" ${editIndex === index ? "disabled" : ""} style="-webkit-tap-highlight-color: transparent;">
                    <svg class="icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                    <span>${textFor("editButton", "Edit")}</span>
                </button>
                <button class="delete-post" data-index="${index}" ${editIndex === index ? "disabled" : ""} style="-webkit-tap-highlight-color: transparent;">
                    <svg class="icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M5 6h14l-1 14H6L5 6z"/>
                    </svg>
                    <span>${textFor("deleteButton", "Bin")}</span>
                </button>
                <button class="pin-post ${isPinned ? "pinned" : ""}" data-index="${index}" ${editIndex === index ? "disabled" : ""} aria-label="${isPinned ? textFor("unpinPostLabel", "Unpin Post") : textFor("pinPostLabel", "Pin Post")}" style="-webkit-tap-highlight-color: transparent;">
                    <svg class="icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        ${isPinned ? `<path d="M6 4l14 14"/><path d="M14 4l4 4-5 5"/><path d="M8 16l-4 4"/><path d="M9 9l6 6"/>` : `<path d="M14 4l6 6"/><path d="M12 6 6 12l6 6 6-6-6-6Z"/><path d="M8 16l-4 4"/>`}
                    </svg>
                    <span>${isPinned ? textFor("unpinButton", "Unpin") : textFor("pinButton", "Pin")}</span>
                </button>
                <button class="share-post-action" data-index="${index}" ${editIndex === index ? "disabled" : ""} aria-label="${textFor("sharePostLabel", "Share Post")}" style="-webkit-tap-highlight-color: transparent;">
                    <svg class="icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/>
                        <path d="M16 6l-4-4-4 4"/>
                        <path d="M12 2v13"/>
                    </svg>
                    <span>${textFor("shareButton", "Share")}</span>
                </button>
            </div>
        `;
        targetContainer.appendChild(postElement);

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
                updateCharCount();
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

        // Share button  shows menu with Text / Image / Copy options
        postElement.querySelector(".share-post-action").addEventListener("click", function () {
            throttledPlaySound('/sounds/click.ogg')
            if (!this.disabled) {
                const posts = getStoredPosts();
                const postToShare = posts[index];
                showShareMenu(postToShare, index, this);
            }
        });
        postElement.addEventListener("contextmenu", event => {
            event.preventDefault();
            if (editIndex !== null) return;
            const posts = getStoredPosts();
            showShareMenu(posts[index], index, postElement.querySelector(".share-post-action"));
        });
        let pressTimer = null;
        postElement.addEventListener("touchstart", () => {
            if (editIndex !== null) return;
            pressTimer = setTimeout(() => {
                const posts = getStoredPosts();
                showShareMenu(posts[index], index, postElement.querySelector(".share-post-action"));
            }, 520);
        }, { passive: true });
        postElement.addEventListener("touchend", () => clearTimeout(pressTimer));
        postElement.addEventListener("touchmove", () => clearTimeout(pressTimer), { passive: true });
    }

    // Event Listeners
    window.addEventListener("scroll", () => elements.scrollToTopButton.classList.toggle("visible", window.scrollY > 200));
    elements.scrollToTopButton.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    elements.inputWrapper.addEventListener("paste", adjustHeight);

    elements.postButton.addEventListener("click", () => {
        const text = elements.inputWrapper.value.trim();
        if (!text) {
            throttledPlaySound('/sounds/error.ogg');
            showCustomPopup(
                textFor("emptyNoteTitle", textFor("emptyPostTitle", "Nothing to add")),
                textFor("emptyNoteMessage", textFor("emptyPostMessage", "Write a thought first, then tap Add.")),
                textFor("okButton", "OK"),
                () => {},
                false
            );
            return;
        }
        if (!text || text.length > currentCharLimit) {
            throttledPlaySound('/sounds/error.ogg');
            const limitMessage = (texts.charLimitMessage || "Keep notes under {count} characters.").replace("{count}", currentCharLimit);
            showCustomPopup(
                texts.charLimitTitle || "Note is too long",
                limitMessage,
                texts.okButton || "OK",
                () => {},
                false
            );
            return;
        }
        if (editIndex !== null) {
            // Edit existing post
            const posts = getStoredPosts();
            posts[editIndex].text = text;
            posts[editIndex].timestamp = new Date().toISOString();
            persistPosts(posts);
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
            updateCharCount(0);
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
        updateCharCount(0);
        elements.charCount.classList.remove("text-red-500");
        updateEditState();
        renderPosts();
    });

    elements.deleteAllButton.addEventListener("click", () => {
        const posts = getStoredPosts();
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
                    const previousPosts = [...posts];
                    const previousRecycleBin = getRecycleBin();
                    posts.forEach(movePostToRecycleBin);
                    persistPosts([]);
                    updateBackupHealthUI();
                    debouncedRenderPosts();
                    showUndoToast(
                        textFor("deleteAllUndoMessage", "All notes moved to Recently Deleted."),
                        () => {
                            persistPosts(previousPosts);
                            saveRecycleBin(previousRecycleBin);
                            renderPosts(elements.searchInput.value.trim());
                            updateBackupHealthUI();
                        },
                        9000
                    );
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
        const posts = getStoredPosts();
        if (actionContext) {
            if (actionContext.type === "delete") {
                const [deletedPost] = posts.splice(actionContext.index, 1);
                if (deletedPost) {
                    movePostToRecycleBin(deletedPost);
                    showUndoDelete(deletedPost);
                }
                persistPosts(posts);
                updateBackupHealthUI();
                renderPosts();
            } else if (actionContext.type === "edit-switch") {
                editIndex = actionContext.newIndex;
                elements.inputWrapper.value = posts[editIndex].text;
                adjustHeight();
                updateCharCount();
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
        debouncedSearchRender(searchText);
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
        console.log(` Easter Egg: Emoji - ${emoji}! `);
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
            console.log(" Easter Egg: Realistic! ");
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
            console.log(" Easter Egg: Fireworks! ");
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
            console.log(" Easter Egg: Starfield Effect! ");
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
            console.log(" Easter Egg: Snow! ");
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
            console.log(" Easter Egg: School Pride! ");
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
            console.log(" Easter Egg: Custom Shapes! ");
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
        () => createEmojiConfettiEffect(""),
        () => createEmojiConfettiEffect(""),
        () => createEmojiConfettiEffect(""),
        () => createEmojiConfettiEffect(""),
        () => createEmojiConfettiEffect(""),
        () => createEmojiConfettiEffect(""),
        () => createEmojiConfettiEffect(""),
        () => createEmojiConfettiEffect(""),
        () => createEmojiConfettiEffect(""),
        () => createEmojiConfettiEffect(""),
        () => createEmojiConfettiEffect(""),
        () => createEmojiConfettiEffect(""),
        () => createEmojiConfettiEffect("")
    ];

    function triggerNextEffect() {
        if (localStorage.getItem(ENABLE_CELEBRATIONS_KEY) !== "true") {
            createNotification(textFor("celebrationsOffMessage", "Celebrations are off. Enable them in Settings."), { duration: 1400 });
            return;
        }
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
    window.addEventListener("beforeinstallprompt", event => {
        event.preventDefault();
        deferredInstallPrompt = event;
        createNotification(textFor("installPromptMessage", "Thoughts can be installed for offline use"), { duration: 2500 });
    });

    elements.inputWrapper.addEventListener("input", function () {
        const text = this.value.trim();
        if (text.length > currentCharLimit) {
            this.value = text.slice(0, currentCharLimit);
        }
        throttledSaveDraft(this.value);
        adjustHeight();
        updateCharCount(this.value.length);
        updateEditState();
        updateInputStats(); // Live word count + reading time

    });

    if (navigator.share || window.location.search) {
        const urlParams = new URLSearchParams(window.location.search);
        const sharedText = urlParams.get("text") || urlParams.get("title") || urlParams.get("url");
        if (sharedText) {
            elements.inputWrapper.value = sharedText;
            adjustHeight();
            updateCharCount(sharedText.length);
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
window.addEventListener("thoughts-legacy-beforeinstallprompt-disabled", e => {
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
            installButton.textContent = textFor("installAppButton", "Install App");
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
            dismissButton.textContent = ""; // Cross symbol
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
