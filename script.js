// Version info
const APP_VERSION = "1.5.5";

const whatsNew = `
    <strong>What's New:</strong><br>
    - Multi-Language Support<br>
    - Improved cache handling for drafts and posts.<br>
    - Meet the <a href="thoughtswebstore.netlify.app" target="_blank" rel="noopener noreferrer" style="color: #1d9bf0; text-decoration: underline;">Thoughts Web Store</a>! Download extra language packs<br>
    - Minor bug fixes and performance tweaks.
`;

let languageData = {};
let selectedLanguage = localStorage.getItem("language") || "english";
let isGodMode = false;
let texts = {};
let editIndex = null;
let updateEditState;
let originalLanguageData = {};
const DEFAULT_CHAR_LIMIT = 500;
let currentCharLimit;

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
    createNotification("God Mode Unlocked", { background: "rgba(255, 215, 0, 0.9)", color: "#000", duration: 1500 });
}
function showSuccess(message) {
    createNotification(message, { duration: 4500 });
}
function showLanguageChangeNotification(language) {
    createNotification(`Language Changed to ${languageData[language].name}`, { duration: 1500 });
}

// Async fetch for languages
async function fetchLanguages() {
    try {
        const response = await fetch("/languages.json");
        originalLanguageData = await response.json();
        languageData = { ...originalLanguageData };
    } catch (err) {
        console.error("Failed to load languages:", err);
        originalLanguageData = languageData = { english: { appName: "Thoughts", addButton: "Add", charLimit: DEFAULT_CHAR_LIMIT } };
    }
    texts = languageData[selectedLanguage] || languageData["english"];
    currentCharLimit = isGodMode ? (texts.charLimit * 2) : texts.charLimit;
    texts.charCount = `{count}/${currentCharLimit}`;
    const splashTitle = document.getElementById("splash-title");
    splashTitle.textContent = texts.appName;
    splashTitle.classList.add("scale-110");
    setTimeout(() => splashTitle.classList.remove("scale-110"), 300);
}

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

    // Ensure God Mode state is applied correctly on init
    isGodMode = localStorage.getItem("isGodMode") === "true";
    if (isGodMode) {
        currentCharLimit = texts.charLimit * 2;
        texts.charCount = `{count}/${currentCharLimit}`;
        applyLanguage(selectedLanguage);
        renderPosts(); // Immediate render to reflect God Mode
    } else {
        currentCharLimit = texts.charLimit;
        texts.charCount = `{count}/${currentCharLimit}`;
        applyLanguage(selectedLanguage);
        renderPosts(); // Immediate render for normal mode
    }

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
            showCustomPopup("Error", "Failed to save post. Try again.", "OK", () => {}, false);
        }
    }

    function togglePin(index) {
        try {
            const posts = JSON.parse(localStorage.getItem("posts") || "[]");
            const isPinned = posts[index].pinned;
            posts.forEach(post => (post.pinned = false));
            if (!isPinned) posts[index].pinned = true;
            const postsString = JSON.stringify(posts);
            localStorage.setItem("posts", postsString);
            if ("serviceWorker" in navigator) {
                navigator.serviceWorker.ready.then(reg => {
                    reg.active?.postMessage({ type: "SAVE_POSTS", posts: postsString });
                });
            }
            renderPosts(); // Immediate render instead of debounced
        } catch (err) {
            console.error("Failed to toggle pin:", err);
        }
    }

    // Load initial data
    async function loadInitialData() {
        try {
            const cachedDraft = await caches.match("/draft");
            const localDraft = localStorage.getItem("draftNote") || "";
            let draft = cachedDraft ? await cachedDraft.text() : localDraft;
    
            // Discard secret key draft on load if not in God Mode
            if (simpleHash(draft) === SECRET_CODE_HASH && !isGodMode) {
                draft = "";
                forceClearDraft();
            }
    
            if (draft !== localDraft) localStorage.setItem("draftNote", draft);
            lastSavedDraft = draft;
            elements.inputWrapper.value = draft;
            adjustHeight();
            elements.charCount.textContent = (texts.charCount || "{count} characters").replace("{count}", draft.length).replace("{count}", currentCharLimit);
    
            const cachedPosts = await caches.match("/posts");
            if (cachedPosts) {
                const postsString = await cachedPosts.text();
                if (postsString !== localStorage.getItem("posts")) {
                    localStorage.setItem("posts", postsString);
                }
            }
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

    function showLanguageSelection() {
        const selectionDiv = document.getElementById("language-selection");
        const popupDiv = selectionDiv.querySelector(".twitter-popup");
        const chooseText = texts.chooseLanguage || "Choose Your Language";

        popupDiv.innerHTML = `
            <p class="mb-4 text-[1.375rem] font-bold text-white text-center md:text-[20px]">${chooseText}</p>
            <div id="language-list" class="language-list-container mb-6"></div>
            <button id="language-cancel" class="w-full bg-red-500 text-white font-semibold text-base py-2 px-6 rounded-[12px] shadow-lg hover:bg-red-600 transition-colors duration-300">${texts.cancelButton || "Cancel"}</button>
        `;

        const languageListDiv = popupDiv.querySelector("#language-list");
        const customLanguages = JSON.parse(localStorage.getItem("customLanguages") || "{}");
        const languages = { ...languageData, ...customLanguages };
        const langKeys = Object.keys(languages);

        langKeys.forEach(lang => {
            const langContainer = document.createElement("div");
            langContainer.className = "flex justify-between items-center mb-2";

            const button = document.createElement("button");
            button.className = "language-button text-left flex-1";
            button.textContent = languages[lang].name || lang;
            Object.assign(button.style, {
                "-webkit-tap-highlight-color": "transparent" // Suppress blue highlight
            });
            button.addEventListener("click", () => {
                selectedLanguage = lang;
                localStorage.setItem("language", lang);
                applyLanguage(lang);
                debouncedRenderPosts();
                selectionDiv.classList.add("hidden");
                document.body.style.overflow = "";
                showLanguageChangeNotification(lang);
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
                showCustomPopup(
                    texts.deleteLanguageTitle || "Delete Language?",
                    `${texts.deleteLanguageConfirm || "Are you sure you want to delete"} "${languages[lang].name || lang}"?`,
                    texts.confirmDeleteButton || "Delete",
                    () => {
                        delete customLanguages[lang];
                        delete languageData[lang];
                        localStorage.setItem("customLanguages", JSON.stringify(customLanguages));
                        if (selectedLanguage === lang) {
                            selectedLanguage = "english";
                            localStorage.setItem("language", "english");
                            applyLanguage("english");
                        }
                        debouncedRenderPosts();
                        showLanguageSelection();
                        showSuccess(`"${languages[lang].name || lang}" ${texts.deleted || "deleted"}!`);
                    },
                    true
                );
            });

            langContainer.appendChild(button);
            if (customLanguages[lang]) langContainer.appendChild(deleteButton);
            languageListDiv.appendChild(langContainer);
        });

        document.getElementById("language-cancel").addEventListener("click", () => {
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

    function applyLanguage(lang) {
        texts = { ...languageData[lang] || languageData["english"], ...JSON.parse(localStorage.getItem("customComponents") || "{}") };
        currentCharLimit = isGodMode ? (texts.charLimit * 2) : texts.charLimit;
        texts.charCount = `{count}/${currentCharLimit}`;
        console.log("Applying language:", lang, "texts:", texts);
    
        const headerTitle = document.querySelector("header h1");
        if (headerTitle) headerTitle.textContent = texts.appName;
        else console.warn("Header title element not found; skipping text update.");
    
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
    
        const footerRightsReserved = document.getElementById("footer-rights-reserved");
        if (footerRightsReserved) footerRightsReserved.textContent = texts.footerRightsReserved;
    
        updateDynamicText();
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
        localStorage.setItem("isGodMode", "true"); // Persist across sessions
        currentCharLimit = texts.charLimit * 2;
        texts.charCount = `{count}/${currentCharLimit}`;
        forceClearDraft(); // Clear draft when entering God Mode
        applyLanguage(selectedLanguage);
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
        setTimeout(() => popupDiv.style.opacity = "1", 10);
    
        const confirmBtn = document.getElementById("god-mode-confirm-btn");
        const cancelBtn = document.getElementById("god-mode-cancel-btn");
        const confirmInput = document.getElementById("god-mode-confirm-input");
    
        confirmBtn.onclick = () => {
            if (confirmInput.value.trim().toLowerCase() === "yes") {
                popupDiv.style.opacity = "0";
                setTimeout(() => {
                    forceClearDraft(); // Clear draft before activating
                    callback();
                    popupDiv.remove();
                    overlayDiv.remove();
                    document.body.style.overflow = "";
                }, 300);
            }
        };
    
        cancelBtn.onclick = () => {
            popupDiv.style.opacity = "0";
            setTimeout(() => {
                forceClearDraft(); // Clear draft on cancel
                popupDiv.remove();
                overlayDiv.remove();
                document.body.style.overflow = "";
            }, 300);
        };
    }

    function renderPosts(filterText = "") {
        try {
            const posts = JSON.parse(localStorage.getItem("posts") || "[]");
            elements.postContainer.innerHTML = "";
            console.log("Rendering posts:", posts);

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

    function updateDynamicText() {
        elements.charCount.textContent = (texts.charCount || "{count} characters").replace("{count}", elements.inputWrapper.value.length || "0").replace("{count}", currentCharLimit);
        updateEditState = function () {
            if (editIndex !== null) {
                elements.inputWrapper.classList.add("editing");
                elements.cancelEditButton.style.display = "inline-block";
                elements.postButton.textContent = texts.saveButton;
            } else {
                elements.inputWrapper.classList.remove("editing");
                elements.cancelEditButton.style.display = "none";
                elements.postButton.textContent = texts.addButton;
            }
        };
        updateEditState();
    }

    function checkForUpdates(forceReload = false) {
        if (!navigator.onLine) return;
        fetch("/manifest.json", { cache: "no-store", headers: { "Cache-Control": "no-cache" } })
            .then(response => {
                if (!response.ok) throw new Error("Manifest fetch failed");
                return response.json();
            })
            .then(manifest => {
                const cachedVersion = localStorage.getItem("appVersion") || APP_VERSION;
                if (manifest.version && manifest.version !== cachedVersion) {
                    if (forceReload) {
                        performUpdate(manifest.version);
                    } else {
                        showUpdateNotification(manifest.version);
                    }
                }
            })
            .catch(err => console.error("Update check failed:", err));
    }

    function showUpdateNotification(newVersion) {
        const notification = document.createElement("div");
        const isMobile = window.innerWidth <= 768;
        Object.assign(notification.style, {
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(20, 23, 26, 0.7)",
            borderRadius: "16px",
            padding: isMobile ? "20px" : "24px",
            maxWidth: isMobile ? "90vw" : "320px",
            width: "100%",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
            color: "#ffffff",
            textAlign: "center",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            minHeight: isMobile ? "100px" : "auto",
            zIndex: "100009"
        });
        const title = document.createElement("p");
        title.textContent = "New Update Available";
        Object.assign(title.style, { fontSize: isMobile ? "20px" : "18px", fontWeight: "700", marginBottom: "4px", lineHeight: "1.3" });
        const versionText = document.createElement("p");
        versionText.textContent = `Version ${newVersion}`;
        Object.assign(versionText.style, { fontSize: "16px", fontWeight: "400", color: "#b0b3b8", marginBottom: "12px", lineHeight: "1.4" });
        const updateButton = document.createElement("button");
        updateButton.textContent = "Update Now";
        Object.assign(updateButton.style, {
            background: "#28a745",
            color: "#ffffff",
            border: "none",
            padding: isMobile ? "14px 0" : "12px 16px",
            borderRadius: "9999px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s ease-in-out",
            width: "100%",
            textAlign: "center",
            marginTop: "8px"
        });
        updateButton.addEventListener("click", () => performUpdate(newVersion));
        notification.appendChild(title);
        notification.appendChild(versionText);
        notification.appendChild(updateButton);
        document.body.appendChild(notification);
    }

    function performUpdate(newVersion) {
        localStorage.setItem("appVersion", newVersion);
        sessionStorage.setItem("updateVersion", newVersion);
        caches.keys()
            .then(keys => Promise.all(keys.map(key => caches.delete(key))))
            .then(() => {
                fetch("/index.html", { cache: "no-store" });
                fetch("/script.js", { cache: "no-store" });
                fetch("/styles.css", { cache: "no-store" });
                fetch("/custom.css", { cache: "no-store" });
                fetch("/languages.json", { cache: "no-store" });
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
                }
                sessionStorage.setItem("justUpdated", "true");
                window.location.reload(true);
            })
            .catch(err => console.error("Update failed:", err));
    }

    function showUpdateConfirmation() {
        const updatedVersion = sessionStorage.getItem("updateVersion");
        if (!updatedVersion || updatedVersion !== APP_VERSION) return;
    
        showCustomPopup(
            updatedVersion,
            whatsNew,
            texts.okButton || "OK",
            () => {
                sessionStorage.removeItem("updateVersion");
            },
            false // No cancel button
        );
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

    // Footer Setup
    const versionElement = document.querySelector("#footer-version");
    if (versionElement) versionElement.textContent = `v${APP_VERSION}`;
    if (!localStorage.getItem("appVersion")) localStorage.setItem("appVersion", APP_VERSION);

    elements.footer.innerHTML += `
        <div class="backup-actions">
            <div class="import-export-buttons">
                <button id="export-notes">${texts.exportButton}</button>
                <input type="file" id="import-notes" accept=".json" style="display: none;">
                <button id="import-trigger">${texts.importButton}</button>
            </div>
            <input type="file" id="upload-language" accept=".json" style="display: none;">
            <button id="upload-language-trigger">${texts.uploadLanguage || "Upload Language"}</button>
            <button id="language-switch">${texts.selectLanguage || "Select Language"}</button>
        </div>
        <style>
            .backup-actions { display: flex; flex-direction: column; gap: 10px; justify-content: center; padding: 12px 0; margin-top: 16px; }
            .import-export-buttons { display: flex; gap: 10px; justify-content: center; width: 100%; }
            #export-notes, #import-trigger, #language-switch, #upload-language-trigger {
                padding: 6px 14px; font-size: 13px; font-weight: 500; letter-spacing: 0.02em; color: #ffffff; background: rgba(255, 255, 255, 0.08);
                border: none; border-radius: 10px; cursor: pointer; transition: background 0.2s ease, opacity 0.2s ease; backdrop-filter: blur(6px);
                -webkit-tap-highlight-color: transparent; flex: 1; min-width: 80px; text-align: center;
            }
            #export-notes:hover, #import-trigger:hover, #language-switch:hover, #upload-language-trigger:hover { background: rgba(255, 255, 255, 0.18); }
            #export-notes:active, #import-trigger:active, #language-switch:active, #upload-language-trigger:active { opacity: 0.8; }
            @media (max-width: 768px) {
                .backup-actions { gap: 8px; padding: 10px 0; }
                .import-export-buttons { gap: 8px; }
                #export-notes, #import-trigger { padding: 5px 12px; font-size: 18px; width: 50%; min-width: 0; }
                #language-switch, #upload-language-trigger { padding: 5px 12px; font-size: 18px; width: 100%; min-width: 0; }
            }
            @media (min-width: 769px) {
                .backup-actions { flex-direction: row; }
                .import-export-buttons { width: auto; flex: 2; }
                #export-notes, #import-trigger, #language-switch, #upload-language-trigger { width: auto; flex: 1; }
            }
        </style>
    `;

    // Event listener for uploading language
    document.getElementById("upload-language-trigger").addEventListener("click", () => document.getElementById("upload-language").click());
    document.getElementById("upload-language").addEventListener("change", event => {
        const file = event.target.files[0];
        if (!file || !file.name.endsWith(".json")) {
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
                    showCustomPopup(
                        texts.errorTitle || "Error",
                        texts.notThoughtsLanguage || "This is not a Thoughts app language file. Only official Thoughts language packs are allowed.",
                        texts.okButton || "OK",
                        () => {},
                        false
                    );
                    return;
                }

                const customLanguages = JSON.parse(localStorage.getItem("customLanguages") || "{}");
                let languagesToAdd = {};

                // Handle single language or multiple languages, excluding appId
                if (customLangData.name) {
                    // Single language pack
                    languagesToAdd[customLangData.name || file.name.replace(".json", "")] = { ...customLangData, appId: undefined };
                } else {
                    // Multiple language pack
                    languagesToAdd = Object.keys(customLangData)
                        .filter(key => key !== "appId") // Exclude appId
                        .reduce((obj, key) => {
                            obj[key] = customLangData[key];
                            return obj;
                        }, {});
                }

                Object.keys(languagesToAdd).forEach(lang => {
                    customLanguages[lang] = languageData[lang] = languagesToAdd[lang];
                });
                localStorage.setItem("customLanguages", JSON.stringify(customLanguages));

                const firstLang = Object.keys(languagesToAdd)[0];
                selectedLanguage = firstLang;
                localStorage.setItem("language", firstLang);
                applyLanguage(firstLang);
                renderPosts();
                showSuccess(
                    `${texts.languageUploaded || "Language"}${Object.keys(languagesToAdd).length > 1 ? "s" : ""} ${texts.uploadedAndApplied || "uploaded and"} "${firstLang}" ${texts.applied || "applied"}!`
                );
                event.target.value = "";
            } catch (err) {
                showCustomPopup(
                    texts.errorTitle || "Error",
                    texts.invalidJSONMessage || "Could not parse the JSON file. Please ensure it’s valid.",
                    texts.okButton || "OK",
                    () => {},
                    false
                );
                console.error("Upload error:", err);
            }
        };
        reader.readAsText(file);
    });

    // Add this function before the upload-language event listener
    function isThoughtsLanguagePack(data) {
        // Strict verification: Must have "appId": "thoughts-app"
        return data && typeof data === "object" && data.appId === "thoughts-app-langs";
    }

    // Import/Export Functions
    function exportNotes() {
        const posts = JSON.parse(localStorage.getItem("posts") || "[]");
        if (posts.length === 0) {
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
            showCustomPopup(texts.importErrorTitle, texts.importErrorInvalidFile, texts.okButton, () => {}, false);
            return;
        }
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.appId || data.appId !== "thoughts-app" || !Array.isArray(data.posts) || !data.posts.every(post => typeof post.text === "string" && typeof post.timestamp === "string" && typeof post.pinned === "boolean")) {
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
            const mergedPosts = mergePosts(existingPosts, newPosts);
            localStorage.setItem("posts", JSON.stringify(mergedPosts));
            debouncedRenderPosts();
            showSuccess(texts.importSuccessMerge);
            popupDiv.classList.add("hidden");
            document.body.style.overflow = "";
        };

        replaceBtn.onclick = () => {
            localStorage.setItem("posts", JSON.stringify(newPosts));
            debouncedRenderPosts();
            showSuccess(texts.importSuccessReplace);
            popupDiv.classList.add("hidden");
            document.body.style.overflow = "";
        };

        cancelBtn.onclick = () => {
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
        return combined;
    }

    // Footer Event Listeners
    document.getElementById("export-notes").addEventListener("click", exportNotes);
    document.getElementById("import-trigger").addEventListener("click", () => document.getElementById("import-notes").click());
    document.getElementById("import-notes").addEventListener("change", importNotes);
    document.getElementById("language-switch").addEventListener("click", showLanguageSelection);

    function renderPost(post, index, isPinned) {
        const [date, time] = post.timestamp.split(", ");
        const { title, content } = extractTitleAndContent(post.text);
        const postElement = document.createElement("div");
        postElement.className = `post ${editIndex === index ? "editing" : ""} ${isPinned ? "pinned" : ""}`;
        postElement.innerHTML = `
            ${title ? `<div class="post-title">${title}</div>` : ""}
            <div class="post-content ${title ? "with-title" : ""}">${highlightHashtags(content)}</div>
            <div class="post-meta">
                <span class="meta-badge">${date}</span>
                <span class="meta-badge">${time}</span>
                <span class="meta-badge">${post.text.length} chars</span>
                ${isPinned ? '<span class="meta-badge">Pinned</span>' : ''}
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
                renderPosts(); // Immediate render instead of debounced
                elements.inputWrapper.focus();
            }
        });

        postElement.querySelector(".pin-post").addEventListener("click", function () {
            const index = parseInt(this.getAttribute("data-index"));
            togglePin(index);
        });
    }

    // Event Listeners
    window.addEventListener("scroll", () => elements.scrollToTopButton.classList.toggle("visible", window.scrollY > 200));
    elements.scrollToTopButton.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    elements.inputWrapper.addEventListener("paste", adjustHeight);

    elements.postButton.addEventListener("click", () => {
        const text = elements.inputWrapper.value.trim();
        if (!text || text.length > currentCharLimit) return;
        if (editIndex !== null) {
            const posts = JSON.parse(localStorage.getItem("posts") || "[]");
            posts[editIndex].text = text;
            posts[editIndex].timestamp = new Date().toLocaleString();
            localStorage.setItem("posts", JSON.stringify(posts));
            if ("serviceWorker" in navigator) {
                navigator.serviceWorker.ready.then(reg => reg.active?.postMessage({ type: "SAVE_POSTS", posts: JSON.stringify(posts) }));
            }
            editIndex = null;
            updateEditState(); // Ensure state resets immediately
        } else {
            savePost(text);
        }
        elements.inputWrapper.value = "";
        saveDraft("");
        adjustHeight();
        elements.charCount.textContent = (texts.charCount || "{count} characters").replace("{count}", "0").replace("{count}", currentCharLimit);
        updateEditState();
        renderPosts(); // Immediate render instead of debounced
    });

    elements.cancelEditButton.addEventListener("click", () => {
        elements.inputWrapper.value = "";
        saveDraft("");
        editIndex = null;
        adjustHeight();
        elements.charCount.textContent = (texts.charCount || "{count} characters").replace("{count}", "0");
        elements.charCount.classList.remove("text-red-500");
        updateEditState();
        renderPosts(); // Immediate render instead of debounced
    });

    elements.deleteAllButton.addEventListener("click", () => {
        const posts = JSON.parse(localStorage.getItem("posts") || "[]");
        if (posts.length === 0) {
            showCustomPopup(texts.deleteAllConfirmTitle, texts.deleteAllEmptyMessage, texts.okButton, () => {}, false);
        } else {
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
    headerTitle.addEventListener("touchstart", e => {
        touchTimer = setTimeout(() => triggerNextEffect(), 500);
    }, { passive: true });
    headerTitle.addEventListener("touchend", () => clearTimeout(touchTimer));
    headerTitle.addEventListener("touchmove", () => clearTimeout(touchTimer), { passive: true });

    // Initialize App
    if (!sessionStorage.getItem("justUpdated")) {
        checkForUpdates(false);
    } else {
        showUpdateConfirmation();
        sessionStorage.removeItem("justUpdated");
    }
    setInterval(() => {
        if (!sessionStorage.getItem("justUpdated")) checkForUpdates(false);
    }, 5 * 60 * 1000);

    window.addEventListener("online", () => {
        updateOnlineStatus();
        setTimeout(() => {
            if (!sessionStorage.getItem("justUpdated")) checkForUpdates(false);
            debouncedRenderPosts();
        }, 1000);
    });
    window.addEventListener("offline", () => {
        updateOnlineStatus();
        debouncedRenderPosts();
    });

    elements.inputWrapper.addEventListener("input", function () {
        const text = this.value.trim();
        if (text.length > currentCharLimit) {
            this.value = text.slice(0, currentCharLimit);
            const limitMessage = (texts.charLimitMessage || "Whoa there! Only {count} characters are allowed. Extra characters? Poof—they’re gone!").replace("{count}", currentCharLimit);
            showCustomPopup(texts.charLimitTitle || "Character Limit Reached", limitMessage, texts.okButton || "OK", () => {}, false);
        }
        throttledSaveDraft(this.value); // Save draft normally unless God Mode is triggered
        adjustHeight();
        elements.charCount.textContent = (texts.charCount || "{count} characters").replace("{count}", this.value.length).replace("{count}", currentCharLimit);
    
        if (simpleHash(this.value) === SECRET_CODE_HASH && !isGodMode) {
            showGodModeConfirmation(() => {
                activateGodMode(); // Draft is cleared within activateGodMode
            });
        }
    });

    window.scrollTo(0, 0);
    if (!localStorage.getItem("language")) {
        applyLanguage("english");
        showLanguageSelection();
    } else {
        selectedLanguage = localStorage.getItem("language");
        applyLanguage(selectedLanguage);
        debouncedRenderPosts();
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
        setTimeout(() => {
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
                localStorage.setItem("installPromptDismissed", "true");
                installContainer.remove();
            });

            // Append buttons to container
            installContainer.appendChild(installButton);
            installContainer.appendChild(dismissButton);
            document.body.appendChild(installContainer);
            console.log("Install button and dismiss cross added to DOM");
        }, 5000); // 5-second delay
    } else {
        console.log("Install prompt skipped due to previous dismissal");
    }
});

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/service-worker.js")
            .then(registration => console.log("ServiceWorker registered with scope:", registration.scope))
            .catch(err => console.log("ServiceWorker registration failed:", err));
    });
}