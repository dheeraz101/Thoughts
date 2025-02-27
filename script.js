// Version info
const APP_VERSION = "1.5.4-beta-final_0";
let languageData = {};
let selectedLanguage = localStorage.getItem("language") || "english"; // Default to "english" if null
let texts = {};
let editIndex = null;
let updateEditState; // Define globally for updateDynamicText

// Utility: Debounce function
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Async fetch for languages
async function fetchLanguages() {
    try {
        const response = await fetch("/languages.json");
        languageData = await response.json();
        texts = languageData[selectedLanguage] || languageData["english"];
        const splashTitle = document.getElementById("splash-title");
        splashTitle.textContent = texts.appName;
        splashTitle.classList.add("scale-110");
        setTimeout(() => splashTitle.classList.remove("scale-110"), 300);
    } catch (err) {
        console.error("Failed to load languages:", err);
        languageData = { english: {} };
        texts = languageData["english"];
        const splashTitle = document.getElementById("splash-title");
        splashTitle.textContent = texts.appName;
        splashTitle.classList.add("scale-110");
        setTimeout(() => splashTitle.classList.remove("scale-110"), 300);
    }
}

// Main app initialization
document.addEventListener("DOMContentLoaded", async function () {
    // Wait for languages to load
    await fetchLanguages();

    // Initialize DOM elements
    const postButton = document.getElementById("post-button");
    const postContainer = document.getElementById("post-container");
    const inputWrapper = document.getElementById("public-input");
    const charCount = document.getElementById("char-count");
    const deleteAllButton = document.getElementById("delete-all");
    const deleteConfirmation = document.getElementById("delete-confirmation");
    const confirmDelete = document.getElementById("confirm-delete");
    const cancelDelete = document.getElementById("cancel-delete");
    const searchInput = document.getElementById("search-input");
    const scrollToTopButton = document.getElementById("scroll-to-top");
    const clearSearch = document.querySelector(".clear-search");
    const cancelEditButton = document.getElementById("cancel-edit");
    let actionContext = null;
    const hashtagList = document.getElementById("hashtag-list");
    let activeHashtag = null;

    // Utility Functions
    function highlightHashtags(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        text = text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
        return text.replace(/(\s|^)(#\w+)/g, '$1<span class="hashtag">$2</span>').replace(/\n/g, "<br>");
    }

    function extractTitleAndContent(text) {
        const titleMatch = text.match(/^@(\w+)/);
        if (titleMatch) {
            const title = titleMatch[0].substring(1);
            const content = text.replace(/^@\w+\s*/, "");
            return { title, content };
        }
        return { title: null, content: text };
    }

    function getUniqueHashtags(posts) {
        const hashtagSet = new Set();
        posts.forEach(post => {
            const hashtags = post.text.match(/#\w+/g) || [];
            hashtags.forEach(tag => hashtagSet.add(tag.substring(1)));
        });
        return Array.from(hashtagSet);
    }

    function adjustHeight() {
        inputWrapper.style.height = "auto";
        inputWrapper.style.height = `${inputWrapper.scrollHeight}px`;
    }

    function savePost(text) {
        let posts = JSON.parse(localStorage.getItem("posts")) || [];
        const newPost = { text, timestamp: new Date().toLocaleString(), pinned: false };
        posts.push(newPost);
        localStorage.setItem("posts", JSON.stringify(posts));
        console.log("Post saved:", newPost);
        renderPosts();
    }

    function togglePin(index) {
        let posts = JSON.parse(localStorage.getItem("posts")) || [];
        const isPinned = posts[index].pinned;
        posts = posts.map(post => ({ ...post, pinned: false }));
        if (!isPinned) posts[index].pinned = true;
        localStorage.setItem("posts", JSON.stringify(posts));
        renderPosts();
    }

    // Language Functions
    function showLanguageSelection() {
        const selectionDiv = document.getElementById("language-selection");
        const popupDiv = selectionDiv.querySelector(".twitter-popup");
        const chooseText = texts.chooseLanguage || "Choose Your Language";
        popupDiv.innerHTML = `
            <p class="mb-4 text-[1.375rem] font-bold text-white text-center md:text-[20px]">${chooseText}</p>
        `;

        Object.keys(languageData).forEach(lang => {
            const button = document.createElement("button");
            button.className = "bg-white text-black px-4 py-[12px] rounded-full font-bold w-full mb-4 hover:bg-gray-200 transition-colors -webkit-tap-highlight-color-transparent md:text-[16px] text-[1.125rem]";
            button.textContent = languageData[lang].name;
            button.addEventListener("click", () => {
                selectedLanguage = lang;
                localStorage.setItem("language", lang);
                applyLanguage(lang);
                renderPosts();
                selectionDiv.classList.add("hidden");
                document.body.style.overflow = "";
                showLanguageChangeNotification(lang);
            });
            popupDiv.appendChild(button);
        });

        selectionDiv.classList.remove("hidden");
        document.body.style.overflow = "hidden";
    }

    function applyLanguage(lang) {
        texts = languageData[lang] || languageData["english"];
        console.log("Applying language:", lang, texts);

        document.querySelector("header h1").textContent = texts.appName;
        deleteAllButton.textContent = texts.deleteAllButton;
        searchInput.placeholder = texts.searchPlaceholder;
        inputWrapper.placeholder = texts.inputPlaceholder;
        postButton.textContent = texts.addButton;
        cancelEditButton.textContent = texts.cancelEditButton;
        document.getElementById("export-notes").textContent = texts.exportButton;
        document.getElementById("import-trigger").textContent = texts.importButton;
        document.getElementById("export-pdf") && (document.getElementById("export-pdf").textContent = texts.exportPDFButton);
        document.getElementById("language-switch").textContent = texts.name;
        document.querySelector(".footer-section h3").textContent = texts.footerOfflineTitle;
        document.getElementById("footer-offline-text").textContent = texts.footerOfflineText;
        document.getElementById("footer-android-guide").textContent = texts.footerAndroidGuide;
        document.getElementById("footer-ios-guide").textContent = texts.footerIOSGuide;
        document.getElementById("footer-title").textContent = texts.appName;
        document.getElementById("crafted-by-text").textContent = texts.footerCraftedBy + " ";
        document.getElementById("footer-privacy").textContent = texts.footerPrivacy;
        document.getElementById("footer-made-with-love").textContent = texts.footerMadeWithLove;
        document.getElementById("footer-rights-reserved").textContent = texts.footerRightsReserved;

        updateDynamicText();
    }

    function renderPosts(filterText = "") {
        const posts = JSON.parse(localStorage.getItem("posts")) || [];
        postContainer.innerHTML = "";
        
        console.log("Rendering posts:", posts);
        
        if (posts.length === 0) {
            postContainer.innerHTML = `<div class="no-posts">${texts.noPostsMessage}</div>`;
        } else {
            const filteredPosts = activeHashtag 
                ? posts.filter(post => post.text.includes(`#${activeHashtag}`))
                : posts.filter(post => post.text.toLowerCase().includes(filterText.toLowerCase()));
        
            if (filteredPosts.length === 0) {
                postContainer.innerHTML = `<div class="no-results">${texts.noResultsMessage}</div>`;
            } else {
                const pinnedPosts = filteredPosts.filter(post => post.pinned);
                const regularPosts = filteredPosts.filter(post => !post.pinned);
                pinnedPosts.forEach((post, index) => renderPost(post, posts.indexOf(post), true));
                regularPosts.reverse().forEach((post, index) => renderPost(post, posts.indexOf(post), false));
            }
        }
        renderHashtagList(posts);
        document.getElementById("footer").classList.remove("hidden");
    }

    function showCustomPopup(title, message, confirmText, confirmAction, showCancel = true) {
        const popupDiv = document.getElementById("custom-popup");
        const titleEl = document.getElementById("custom-popup-title");
        const messageEl = document.getElementById("custom-popup-message");
        const confirmBtn = document.getElementById("custom-popup-confirm");
        const cancelBtn = document.getElementById("custom-popup-cancel");

        titleEl.textContent = title;
        messageEl.textContent = message;
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
        charCount.textContent = (texts.charCount || "{count} characters").replace("{count}", inputWrapper.value.length || "0");

        updateEditState = function () {
            if (editIndex !== null) {
                inputWrapper.classList.add("editing");
                cancelEditButton.style.display = "inline-block";
                postButton.textContent = texts.saveButton;
            } else {
                inputWrapper.classList.remove("editing");
                cancelEditButton.style.display = "none";
                postButton.textContent = texts.addButton;
            }
        };
        updateEditState();
    }

    deleteAllButton.addEventListener("click", function () {
        const posts = JSON.parse(localStorage.getItem("posts")) || [];
        if (posts.length === 0) {
            showCustomPopup(
                texts.deleteAllConfirmTitle,
                texts.deleteAllEmptyMessage,
                texts.okButton,
                () => {},
                false
            );
        } else {
            showCustomPopup(
                texts.deleteAllConfirmTitle,
                texts.deleteAllConfirmText,
                texts.confirmDeleteButton,
                () => {
                    localStorage.removeItem("posts");
                    renderPosts();
                },
                true
            );
        }
    });

    cancelDelete.addEventListener("click", function () {
        deleteConfirmation.classList.add("hidden");
        document.body.style.overflow = "";
        confirmDelete.classList.replace("bg-[#1d9bf0]", "bg-red-500");
        confirmDelete.classList.replace("hover:bg-[#1a8cd8]", "hover:bg-red-600");
        actionContext = null;
        if (window.scrollY > 200) scrollToTopButton.classList.add("visible");
    });

    // Update Functions
    function checkForUpdates(forceReload = false) {
        if (navigator.onLine) {
            fetch("/manifest.json", { cache: "no-store" })
                .then(response => {
                    if (!response.ok) throw new Error("Manifest fetch failed");
                    return response.json();
                })
                .then(manifest => {
                    const cachedVersion = localStorage.getItem("appVersion") || APP_VERSION;
                    if (manifest.version && manifest.version !== cachedVersion) {
                        showUpdateNotification(manifest.version, forceReload);
                    }
                })
                .catch(err => console.error("Update check failed:", err));
        }
    }

    function showUpdateNotification(newVersion, forceReload) {
        if (forceReload) {
            localStorage.setItem("appVersion", newVersion);
            sessionStorage.setItem("updateVersion", newVersion);
            caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))))
                .then(() => {
                    if (navigator.serviceWorker.controller) {
                        navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
                    }
                    sessionStorage.setItem("justUpdated", "true");
                    window.location.reload(true);
                })
                .catch(err => console.error("Update failed:", err));
            return;
        }

        const notification = document.createElement("div");
        Object.assign(notification.style, {
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1d9bf0",
            color: "#fff",
            padding: "12px 16px",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            zIndex: "1000",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "14px",
            fontWeight: "500",
            maxWidth: "90%",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
        });

        const text = document.createElement("span");
        text.textContent = `New version ${newVersion} available!`;
        text.style.flex = "1";
        notification.appendChild(text);

        const updateButton = document.createElement("button");
        updateButton.textContent = "Update";
        Object.assign(updateButton.style, {
            background: "#fff",
            color: "#1d9bf0",
            border: "none",
            padding: "6px 12px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s ease-in-out"
        });
        updateButton.addEventListener("click", () => {
            localStorage.setItem("appVersion", newVersion);
            sessionStorage.setItem("updateVersion", newVersion);
            caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))))
                .then(() => {
                    if (navigator.serviceWorker.controller) {
                        navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
                    }
                    sessionStorage.setItem("justUpdated", "true");
                    window.location.reload(true);
                });
        });
        notification.appendChild(updateButton);
        document.body.appendChild(notification);
    }

    function showUpdateConfirmation() {
        const updatedVersion = sessionStorage.getItem("updateVersion");
        if (!updatedVersion) return;

        const confirmation = document.createElement("div");
        Object.assign(confirmation.style, {
            position: "fixed",
            top: "10px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#22c55e",
            color: "#ffffff",
            padding: "8px 16px",
            borderRadius: "6px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            zIndex: "10000",
            fontSize: "14px",
            fontWeight: "500",
            maxWidth: "90vw",
            textAlign: "center",
            transition: "opacity 0.3s ease",
            opacity: "1"
        });
        confirmation.innerText = `Updated to version ${updatedVersion}`;
        document.body.appendChild(confirmation);

        setTimeout(() => {
            confirmation.style.opacity = "0";
            setTimeout(() => {
                confirmation.remove();
                sessionStorage.removeItem("updateVersion");
            }, 300);
        }, 2700);
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

    document.querySelector('#footer').innerHTML += `
        <div class="backup-actions">
            <div class="import-export-buttons">
                <button id="export-notes">${texts.exportButton}</button>
                <input type="file" id="import-notes" accept=".json" style="display: none;">
                <button id="import-trigger">${texts.importButton}</button>
            </div>
            <button id="language-switch">${texts.name}</button>
        </div>
        <style>
            .backup-actions {
                display: flex;
                flex-direction: column;
                gap: 10px;
                justify-content: center;
                padding: 12px 0;
                margin-top: 16px;
            }
            .import-export-buttons {
                display: flex;
                gap: 10px;
                justify-content: center;
                width: 100%;
            }
            #export-notes, #import-trigger, #language-switch {
                padding: 6px 14px;
                font-size: 13px;
                font-weight: 500;
                letter-spacing: 0.02em;
                color: #ffffff;
                background: rgba(255, 255, 255, 0.08);
                border: none;
                border-radius: 10px;
                cursor: pointer;
                transition: background 0.2s ease, opacity 0.2s ease;
                backdrop-filter: blur(6px);
                -webkit-tap-highlight-color: transparent;
                flex: 1;
                min-width: 80px;
                text-align: center;
            }
            #export-notes:hover, #import-trigger:hover, #language-switch:hover {
                background: rgba(255, 255, 255, 0.18);
            }
            #export-notes:active, #import-trigger:active, #language-switch:active {
                opacity: 0.8;
            }
            @media (max-width: 768px) {
                .backup-actions {
                    gap: 8px;
                    padding: 10px 0;
                }
                .import-export-buttons {
                    gap: 8px;
                }
                #export-notes, #import-trigger {
                    padding: 5px 12px;
                    font-size: 18px;
                    width: 50%;
                    min-width: 0;
                }
                #language-switch {
                    padding: 5px 12px;
                    font-size: 18px;
                    width: 100%;
                    min-width: 0;
                }
            }
            @media (min-width: 769px) {
                .backup-actions {
                    flex-direction: row;
                }
                .import-export-buttons {
                    width: auto;
                    flex: 2;
                }
                #export-notes, #import-trigger, #language-switch {
                    width: auto;
                    flex: 1;
                }
            }
        </style>
    `;

    // Import/Export Functions
    function exportNotes() {
        const posts = JSON.parse(localStorage.getItem("posts")) || [];
        if (posts.length === 0) {
            showCustomPopup(
                texts.exportNotesTitle,
                texts.exportEmptyMessage,
                texts.okButton,
                () => {},
                false
            );
            return;
        }
        const exportData = { appId: "thoughts-app", posts: posts };
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
            showCustomPopup("Import Error", texts.importErrorInvalidFile, texts.okButton, () => {}, false);
            return;
        }
    
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.appId || data.appId !== "thoughts-app") {
                    showCustomPopup("Import Error", texts.importErrorNotThoughts, texts.okButton, () => {}, false);
                    return;
                }
                if (!Array.isArray(data.posts) || !data.posts.every(post => 
                    typeof post.text === "string" && typeof post.timestamp === "string" && typeof post.pinned === "boolean")) {
                    showCustomPopup("Import Error", texts.importErrorInvalidFormat, texts.okButton, () => {}, false);
                    return;
                }
                const existingPosts = JSON.parse(localStorage.getItem("posts")) || [];
                if (existingPosts.length > 0) {
                    showImportConfirmation(data.posts, existingPosts);
                } else {
                    localStorage.setItem("posts", JSON.stringify(data.posts));
                    renderPosts();
                    showSuccess(texts.importSuccessFirst);
                }
            } catch (err) {
                showCustomPopup("Import Error", texts.importErrorInvalidJSON, texts.okButton, () => {}, false);
            }
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
            renderPosts();
            showSuccess(texts.importSuccessMerge);
            popupDiv.classList.add("hidden");
            document.body.style.overflow = "";
        };
    
        replaceBtn.onclick = () => {
            localStorage.setItem("posts", JSON.stringify(newPosts));
            renderPosts();
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

    function showSuccess(message) {
        const successDiv = document.createElement("div");
        successDiv.textContent = message;
        Object.assign(successDiv.style, {
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(20, 23, 26, 0.85)",
            backdropFilter: "blur(8px)",
            color: "#ffffff",
            padding: "14px 28px",
            borderRadius: "16px",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            boxShadow: "0 6px 16px rgba(0, 0, 0, 0.3)",
            zIndex: "3000",
            fontSize: "18px",
            fontWeight: "600",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            textAlign: "center",
            maxWidth: "90%",
            width: "auto",
            margin: "0 16px",
            opacity: "0",
            transition: "opacity 0.3s ease-in-out"
        });
    
        if (window.innerWidth <= 768) {
            Object.assign(successDiv.style, {
                fontSize: "16px",
                padding: "12px 20px",
                margin: "0 12px"
            });
        }
    
        document.body.appendChild(successDiv);
        setTimeout(() => successDiv.style.opacity = "1", 10);
        setTimeout(() => {
            successDiv.style.opacity = "0";
            setTimeout(() => successDiv.remove(), 300);
        }, 4500);
    }

    // Footer Event Listeners
    document.getElementById("export-notes").addEventListener("click", exportNotes);
    document.getElementById("import-trigger").addEventListener("click", () => document.getElementById("import-notes").click());
    document.getElementById("import-notes").addEventListener("change", importNotes);

    document.getElementById("language-switch").addEventListener("click", function () {
        const languages = Object.keys(languageData);
        const currentIndex = languages.indexOf(selectedLanguage);
        const nextIndex = (currentIndex + 1) % languages.length;
        const newLanguage = languages[nextIndex];
        selectedLanguage = newLanguage;
        localStorage.setItem("language", newLanguage);
        texts = languageData[newLanguage] || languageData["english"];
        applyLanguage(newLanguage);
        renderPosts();
        this.textContent = languageData[newLanguage].name;
        showLanguageChangeNotification(newLanguage);
    });

    function showLanguageChangeNotification(language) {
        const notificationDiv = document.createElement("div");
        notificationDiv.textContent = `Language Changed to ${languageData[language].name}`;
        Object.assign(notificationDiv.style, {
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(20, 23, 26, 0.85)",
            backdropFilter: "blur(8px)",
            color: "#ffffff",
            padding: "14px 28px",
            borderRadius: "16px",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            boxShadow: "0 6px 16px rgba(0, 0, 0, 0.3)",
            zIndex: "3000",
            fontSize: "18px",
            fontWeight: "600",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            textAlign: "center",
            maxWidth: "90%",
            width: "auto",
            margin: "0 16px",
            opacity: "0",
            transition: "opacity 0.3s ease-in-out"
        });
    
        if (window.innerWidth <= 768) {
            Object.assign(notificationDiv.style, {
                fontSize: "16px",
                padding: "12px 20px",
                margin: "0 12px"
            });
        }
    
        document.body.appendChild(notificationDiv);
        setTimeout(() => notificationDiv.style.opacity = "1", 10);
        setTimeout(() => {
            notificationDiv.style.opacity = "0";
            setTimeout(() => notificationDiv.remove(), 300);
        }, 1500);
    }

    // Render Post
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
                <button class="edit-post" data-index="${index}" ${editIndex === index ? "disabled" : ""}>
                    <svg class="icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                    <span>${texts.editButton || "Edit"}</span>
                </button>
                <button class="delete-post" data-index="${index}" ${editIndex === index ? "disabled" : ""}>
                    <svg class="icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M5 6h14l-1 14H6L5 6z"/>
                    </svg>
                    <span>${texts.deleteButton || "Bin"}</span>
                </button>
                <button class="pin-post ${isPinned ? "pinned" : ""}" data-index="${index}" ${editIndex === index ? "disabled" : ""} aria-label="${isPinned ? "Unpin Post" : "Pin Post"}">
                    <svg class="icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        ${isPinned ? `<path d="M6 3l12 12"/><path d="M6 15l12-12"/><path d="M12 22v-6"/>` : `<path d="M12 2v13"/><path d="M5 15l7 7 7-7"/><path d="M19 9H5"/>`}
                    </svg>
                </button>
            </div>
        `;
        postContainer.appendChild(postElement);

        postElement.querySelector(".delete-post").addEventListener("click", function () {
            if (!this.disabled) {
                actionContext = { type: "delete", index: this.getAttribute("data-index") };
                deleteConfirmation.classList.remove("hidden");
                scrollToTopButton.classList.remove("visible");
                document.body.style.overflow = "hidden";
                const popupText = deleteConfirmation.querySelector(".twitter-popup p:first-child");
                const popupSubtext = deleteConfirmation.querySelector(".twitter-popup p:nth-child(2)");
                confirmDelete.textContent = texts.confirmDeleteButton;
                cancelDelete.textContent = texts.cancelButton;
                popupText.textContent = texts.deletePostConfirmTitle;
                popupSubtext.textContent = texts.deletePostConfirmText;
                confirmDelete.classList.replace("bg-[#1d9bf0]", "bg-red-500");
                confirmDelete.classList.replace("hover:bg-[#1a8cd8]", "hover:bg-red-600");
            }
        });

        postElement.querySelector(".edit-post").addEventListener("click", function () {
            if (!this.disabled) {
                const newEditIndex = parseInt(this.getAttribute("data-index"));
                const posts = JSON.parse(localStorage.getItem("posts")) || [];
                const currentText = inputWrapper.value.trim();

                if (editIndex !== null && currentText && currentText !== posts[editIndex].text) {
                    deleteConfirmation.classList.remove("hidden");
                    scrollToTopButton.classList.remove("visible");
                    document.body.style.overflow = "hidden";
                    const popupText = deleteConfirmation.querySelector(".twitter-popup p:first-child");
                    const popupSubtext = deleteConfirmation.querySelector(".twitter-popup p:nth-child(2)");
                    confirmDelete.textContent = texts.discardButton;
                    cancelDelete.textContent = texts.cancelButton;
                    popupText.textContent = texts.discardConfirmTitle;
                    popupSubtext.textContent = texts.discardConfirmText;
                    actionContext = { type: "edit-switch", newIndex: newEditIndex };
                    return;
                }

                editIndex = newEditIndex;
                inputWrapper.value = posts[editIndex].text;
                adjustHeight();
                charCount.textContent = (texts.charCount || "{count} characters").replace("{count}", inputWrapper.value.length);
                charCount.classList.toggle("text-red-500", inputWrapper.value.length > 500);
                updateEditState();
                renderPosts();
                inputWrapper.focus();
            }
        });

        postElement.querySelector(".pin-post").addEventListener("click", function () {
            const index = parseInt(this.getAttribute("data-index"));
            togglePin(index);
        });
    }

    // Event Listeners
    window.addEventListener("scroll", () => {
        scrollToTopButton.classList.toggle("visible", window.scrollY > 200);
    });

    scrollToTopButton.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    inputWrapper.addEventListener("paste", adjustHeight);

    postButton.addEventListener("click", function () {
        const text = inputWrapper.value.trim();
        if (!text || text.length > 500) return;
    
        if (editIndex !== null) {
            let posts = JSON.parse(localStorage.getItem("posts")) || [];
            posts[editIndex].text = text;
            posts[editIndex].timestamp = new Date().toLocaleString();
            localStorage.setItem("posts", JSON.stringify(posts));
            console.log("Edited post saved:", posts[editIndex]);
            editIndex = null;
        } else {
            savePost(text);
        }
        inputWrapper.value = "";
        localStorage.removeItem("draftNote");
        console.log("Draft cleared after post");
        adjustHeight();
        charCount.textContent = (texts.charCount || "{count} characters").replace("{count}", "0");
        charCount.classList.remove("text-red-500");
        updateEditState();
        renderPosts();
    });

    cancelEditButton.addEventListener("click", function () {
        inputWrapper.value = "";
        editIndex = null;
        adjustHeight();
        charCount.textContent = (texts.charCount || "{count} characters").replace("{count}", "0");
        charCount.classList.remove("text-red-500");
        updateEditState();
        renderPosts();
    });

    confirmDelete.addEventListener("click", function () {
        const posts = JSON.parse(localStorage.getItem("posts")) || [];
        if (actionContext) {
            if (actionContext.type === "delete") {
                posts.splice(actionContext.index, 1);
                localStorage.setItem("posts", JSON.stringify(posts));
                renderPosts();
            } else if (actionContext.type === "delete-all") {
                localStorage.removeItem("posts");
                renderPosts();
            } else if (actionContext.type === "edit-switch") {
                editIndex = actionContext.newIndex;
                inputWrapper.value = posts[editIndex].text;
                adjustHeight();
                charCount.textContent = (texts.charCount || "{count} characters").replace("{count}", inputWrapper.value.length);
                charCount.classList.toggle("text-red-500", inputWrapper.value.length > 500);
                updateEditState();
                renderPosts();
            }
            deleteConfirmation.classList.add("hidden");
            document.body.style.overflow = "";
            actionContext = null;
            if (window.scrollY > 200) scrollToTopButton.classList.add("visible");
        }
    });

    searchInput.addEventListener("input", function () {
        const searchText = this.value.trim();
        const inputSection = document.querySelector(".input-section");
        renderPosts(searchText);
        clearSearch.style.display = searchText ? "block" : "none";
        inputSection.classList.toggle("hidden-on-search", !!searchText);
    });

    clearSearch.addEventListener("click", function () {
        searchInput.value = "";
        const inputSection = document.querySelector(".input-section");
        renderPosts();
        clearSearch.style.display = "none";
        inputSection.classList.remove("hidden-on-search");
    });

    // Hashtag List
    function renderHashtagList(posts) {
        const hashtags = getUniqueHashtags(posts);
        hashtagList.innerHTML = "";
        const leftArrow = document.querySelector(".hashtag-scroll-arrow.left");
        const rightArrow = document.querySelector(".hashtag-scroll-arrow.right");

        if (hashtags.length === 0) {
            hashtagList.classList.add("hidden");
            leftArrow.classList.add("hidden");
            rightArrow.classList.add("hidden");
            return;
        } else {
            hashtagList.classList.remove("hidden");
        }

        hashtags.forEach(tag => {
            const badge = document.createElement("span");
            badge.className = `hashtag-badge ${activeHashtag === tag ? "active" : ""}`;
            badge.textContent = tag;
            badge.addEventListener("click", () => {
                activeHashtag = activeHashtag === tag ? null : tag;
                renderPosts(searchInput.value.trim());
            });
            hashtagList.appendChild(badge);
        });

        if (window.innerWidth > 768) {
            function updateArrows() {
                const scrollLeft = hashtagList.scrollLeft;
                const scrollWidth = hashtagList.scrollWidth;
                const clientWidth = hashtagList.clientWidth;
                const hasOverflow = scrollWidth > clientWidth;
                leftArrow.classList.toggle("hidden", !hasOverflow || scrollLeft <= 0);
                rightArrow.classList.toggle("hidden", !hasOverflow || scrollLeft + clientWidth >= scrollWidth - 1);
            }
            leftArrow.addEventListener("click", () => hashtagList.scrollBy({ left: -200, behavior: "smooth" }));
            rightArrow.addEventListener("click", () => hashtagList.scrollBy({ left: 200, behavior: "smooth" }));
            hashtagList.addEventListener("scroll", updateArrows);
            window.addEventListener("resize", updateArrows);
            requestAnimationFrame(updateArrows);
        }
    }

    // Easter Egg: Confetti Effects
    const headerTitle = document.querySelector("header h1");
    let touchTimer;
    let currentEffectIndex = 0;
    let isEffectActive = false;

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
                confetti({
                    particleCount: 100,
                    startVelocity: 30,
                    spread: 360,
                    ticks: 60,
                    origin: { x: Math.random(), y: Math.random() - 0.2 }
                });
            }, 200);
        },
        () => {
            console.log("🎉 Easter Egg: Starfield Effect! 🎉");
            function randomInRange(min, max) {
                return Math.random() * (max - min) + min;
            }
            function createStarfield() {
                const starCount = 12;
                const container = document.createElement('div');
                container.style.position = 'fixed';
                container.style.top = '0';
                container.style.left = '0';
                container.style.width = '100%';
                container.style.height = '100%';
                container.style.pointerEvents = 'none';
                document.body.appendChild(container);
                const background = document.createElement('div');
                background.style.position = 'fixed';
                background.style.top = '0';
                background.style.left = '0';
                background.style.width = '100%';
                background.style.height = '100%';
                background.style.backgroundColor = '#000';
                background.style.zIndex = '-1';
                document.body.appendChild(background);
                const colors = ['#FFFFFF'];
                const starPoints = [
                    '50% 0%', '61% 35%', '98% 35%', '68% 57%', '79% 91%',
                    '50% 70%', '21% 91%', '32% 57%', '2% 35%', '39% 35%'
                ].join(', ');
                for (let i = 0; i < starCount; i++) {
                    const star = document.createElement('div');
                    star.style.position = 'absolute';
                    star.style.width = `${randomInRange(20, 30)}px`;
                    star.style.height = star.style.width;
                    star.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                    star.style.clipPath = `polygon(${starPoints})`;
                    star.style.left = `${randomInRange(0, 100)}%`;
                    star.style.top = '120%';
                    star.style.opacity = '0';
                    star.style.filter = 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.7))';
                    container.appendChild(star);
                    const delay = randomInRange(0, 500);
                    const speed = randomInRange(1, 2);
                    const rotation = (Math.random() - 0.5) * 720;
                    setTimeout(() => {
                        star.style.transition = `
                            top ${speed}s ease-out,
                            opacity ${speed/2}s ease-out,
                            transform ${speed}s ease-out
                        `;
                        star.style.opacity = '1';
                        star.style.top = '-50px';
                        star.style.transform = `rotate(${rotation}deg) scale(${randomInRange(0.3, 1)})`;
                    }, delay);
                    setTimeout(() => star.remove(), delay + (speed * 1000));
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
            var duration = 5 * 1000;
            var animationEnd = Date.now() + duration;
            var skew = 1;
            function randomInRange(min, max) {
                return Math.random() * (max - min) + min;
            }
            (function frame() {
                var timeLeft = animationEnd - Date.now();
                var ticks = Math.max(200, 500 * (timeLeft / duration));
                skew = Math.max(0.8, skew - 0.001);
                confetti({
                    particleCount: 1,
                    startVelocity: 0,
                    ticks: ticks,
                    origin: { x: Math.random(), y: (Math.random() * skew) - 0.2 },
                    colors: ['#ffffff'],
                    shapes: ['circle'],
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
                confetti({
                    particleCount: 25,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#ff0000', '#ffffff']
                });
                confetti({
                    particleCount: 25,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#ff0000', '#ffffff']
                });
            }, 250);
        },
        () => {
            console.log("🎉 Easter Egg: Custom Shapes! 🎉");
            var pumpkin = confetti.shapeFromPath({
                path: 'M449.4 142c-5 0-10 .3-15 1a183 183 0 0 0-66.9-19.1V87.5a17.5 17.5 0 1 0-35 0v36.4a183 183 0 0 0-67 19c-4.9-.6-9.9-1-14.8-1C170.3 142 105 219.6 105 315s65.3 173 145.7 173c5 0 10-.3 14.8-1a184.7 184.7 0 0 0 169 0c4.9.7 9.9 1 14.9 1 80.3 0 145.6-77.6 145.6-173s-65.3-173-145.7-173zm-220 138 27.4-40.4a11.6 11.6 0 0 1 16.4-2.7l54.7 40.3a11.3 11.3 0 0 1-7 20.3H239a11.3 11.3 0 0 1-9.6-17.5zM444 383.8l-43.7 17.5a17.7 17.7 0 0 1-13 0l-37.3-15-37.2 15a17.8 17.8 0 0 1-13 0L256 383.8a17.5 17.5 0 0 1 13-32.6l37.3 15 37.2-15c4.2-1.6 8.8-1.6 13 0l37.3 15 37.2-15a17.5 17.5 0 0 1 13 32.6zm17-86.3h-82a11.3 11.3 0 0 1-6.9-20.4l54.7-40.3a11.6 11.6 0 0 1 16.4 2.8l27.4 40.4a11.3 11.3 0 0 1-9.6 17.5z',
                matrix: [0.020491803278688523, 0, 0, 0.020491803278688523, -7.172131147540983, -5.9016393442622945]
            });
            var tree = confetti.shapeFromPath({
                path: 'M120 240c-41,14 -91,18 -120,1 29,-10 57,-22 81,-40 -18,2 -37,3 -55,-3 25,-14 48,-30 66,-51 -11,5 -26,8 -45,7 20,-14 40,-30 57,-49 -13,1 -26,2 -38,-1 18,-11 35,-25 51,-43 -13,3 -24,5 -35,6 21,-19 40,-41 53,-67 14,26 32,48 54,67 -11,-1 -23,-3 -35,-6 15,18 32,32 51,43 -13,3 -26,2 -38,1 17,19 36,35 56,49 -19,1 -33,-2 -45,-7 19,21 42,37 67,51 -19,6 -37,5 -56,3 25,18 53,30 82,40 -30,17 -79,13 -120,-1l0 41 -31 0 0 -41z',
                matrix: [0.03597122302158273, 0, 0, 0.03597122302158273, -4.856115107913669, -5.071942446043165]
            });
            var heart = confetti.shapeFromPath({
                path: 'M167 72c19,-38 37,-56 75,-56 42,0 76,33 76,75 0,76 -76,151 -151,227 -76,-76 -151,-151 -151,-227 0,-42 33,-75 75,-75 38,0 57,18 76,56z',
                matrix: [0.03333333333333333, 0, 0, 0.03333333333333333, -5.566666666666666, -5.533333333333333]
            });

            var defaults = {
                scalar: 2,
                spread: 180,
                particleCount: 30,
                origin: { y: -0.1 },
                startVelocity: -35
            };

            confetti({ ...defaults, shapes: [pumpkin], colors: ['#ff9a00', '#ff7400', '#ff4d00'] });
            confetti({ ...defaults, shapes: [tree], colors: ['#8d960f', '#be0f10', '#445404'] });
            confetti({ ...defaults, shapes: [heart], colors: ['#f93963', '#a10864', '#ee0b93'] });
        },
        () => {
            console.log("🎉 Easter Egg: Emoji - Frog! 🎉");
            var scalar = 2;
            var shape = confetti.shapeFromText({ text: '🐸', scalar });
            var defaults = { spread: 360, ticks: 120, gravity: 0, decay: 0.94, startVelocity: 15, shapes: [shape], scalar };
            function shoot() {
                confetti({ ...defaults, particleCount: 30 });
                confetti({ ...defaults, particleCount: 5, flat: true });
                confetti({ ...defaults, particleCount: 15, scalar: scalar / 2, shapes: ['circle'] });
            }
            setTimeout(shoot, 0);
            setTimeout(shoot, 300);
            setTimeout(shoot, 600);
        },
        () => {
            console.log("🎉 Easter Egg: Emoji - Dog! 🎉");
            var scalar = 2;
            var shape = confetti.shapeFromText({ text: '🐶', scalar });
            var defaults = { spread: 360, ticks: 120, gravity: 0, decay: 0.94, startVelocity: 15, shapes: [shape], scalar };
            function shoot() {
                confetti({ ...defaults, particleCount: 30 });
                confetti({ ...defaults, particleCount: 5, flat: true });
                confetti({ ...defaults, particleCount: 15, scalar: scalar / 2, shapes: ['circle'] });
            }
            setTimeout(shoot, 0);
            setTimeout(shoot, 300);
            setTimeout(shoot, 600);
        },
        () => {
            console.log("🎉 Easter Egg: Emoji - Panda! 🎉");
            var scalar = 2;
            var shape = confetti.shapeFromText({ text: '🐼', scalar });
            var defaults = { spread: 360, ticks: 120, gravity: 0, decay: 0.94, startVelocity: 15, shapes: [shape], scalar };
            function shoot() {
                confetti({ ...defaults, particleCount: 30 });
                confetti({ ...defaults, particleCount: 5, flat: true });
                confetti({ ...defaults, particleCount: 15, scalar: scalar / 2, shapes: ['circle'] });
            }
            setTimeout(shoot, 0);
            setTimeout(shoot, 300);
            setTimeout(shoot, 600);
        },
        () => {
            console.log("🎉 Easter Egg: Emoji - Alien! 🎉");
            var scalar = 2;
            var shape = confetti.shapeFromText({ text: '👾', scalar });
            var defaults = { spread: 360, ticks: 120, gravity: 0, decay: 0.94, startVelocity: 15, shapes: [shape], scalar };
            function shoot() {
                confetti({ ...defaults, particleCount: 30 });
                confetti({ ...defaults, particleCount: 5, flat: true });
                confetti({ ...defaults, particleCount: 15, scalar: scalar / 2, shapes: ['circle'] });
            }
            setTimeout(shoot, 0);
            setTimeout(shoot, 300);
            setTimeout(shoot, 600);
        },
        () => {
            console.log("🎉 Easter Egg: Emoji - Skull! 🎉");
            var scalar = 2;
            var shape = confetti.shapeFromText({ text: '💀', scalar });
            var defaults = { spread: 360, ticks: 120, gravity: 0, decay: 0.94, startVelocity: 15, shapes: [shape], scalar };
            function shoot() {
                confetti({ ...defaults, particleCount: 30 });
                confetti({ ...defaults, particleCount: 5, flat: true });
                confetti({ ...defaults, particleCount: 15, scalar: scalar / 2, shapes: ['circle'] });
            }
            setTimeout(shoot, 0);
            setTimeout(shoot, 300);
            setTimeout(shoot, 600);
        },
        () => {
            console.log("🎉 Easter Egg: Emoji - Snake! 🎉");
            var scalar = 2;
            var shape = confetti.shapeFromText({ text: '🐍', scalar });
            var defaults = { spread: 360, ticks: 120, gravity: 0, decay: 0.94, startVelocity: 15, shapes: [shape], scalar };
            function shoot() {
                confetti({ ...defaults, particleCount: 30 });
                confetti({ ...defaults, particleCount: 5, flat: true });
                confetti({ ...defaults, particleCount: 15, scalar: scalar / 2, shapes: ['circle'] });
            }
            setTimeout(shoot, 0);
            setTimeout(shoot, 300);
            setTimeout(shoot, 600);
        },
        () => {
            console.log("🎉 Easter Egg: Emoji - Pizza! 🎉");
            var scalar = 2;
            var shape = confetti.shapeFromText({ text: '🍕', scalar });
            var defaults = { spread: 360, ticks: 120, gravity: 0, decay: 0.94, startVelocity: 15, shapes: [shape], scalar };
            function shoot() {
                confetti({ ...defaults, particleCount: 30 });
                confetti({ ...defaults, particleCount: 5, flat: true });
                confetti({ ...defaults, particleCount: 15, scalar: scalar / 2, shapes: ['circle'] });
            }
            setTimeout(shoot, 0);
            setTimeout(shoot, 300);
            setTimeout(shoot, 600);
        },
        () => {
            console.log("🎉 Easter Egg: Emoji - Knife! 🎉");
            var scalar = 2;
            var shape = confetti.shapeFromText({ text: '🔪', scalar });
            var defaults = { spread: 360, ticks: 120, gravity: 0, decay: 0.94, startVelocity: 15, shapes: [shape], scalar };
            function shoot() {
                confetti({ ...defaults, particleCount: 30 });
                confetti({ ...defaults, particleCount: 5, flat: true });
                confetti({ ...defaults, particleCount: 15, scalar: scalar / 2, shapes: ['circle'] });
            }
            setTimeout(shoot, 0);
            setTimeout(shoot, 300);
            setTimeout(shoot, 600);
        },
        () => {
            console.log("🎉 Easter Egg: Emoji - Hallow! 🎉");
            var scalar = 2;
            var shape = confetti.shapeFromText({ text: '🎃', scalar });
            var defaults = { spread: 360, ticks: 120, gravity: 0, decay: 0.94, startVelocity: 15, shapes: [shape], scalar };
            function shoot() {
                confetti({ ...defaults, particleCount: 30 });
                confetti({ ...defaults, particleCount: 5, flat: true });
                confetti({ ...defaults, particleCount: 15, scalar: scalar / 2, shapes: ['circle'] });
            }
            setTimeout(shoot, 0);
            setTimeout(shoot, 300);
            setTimeout(shoot, 600);
        },
        () => {
            console.log("🎉 Easter Egg: Emoji - Ball! 🎉");
            var scalar = 2;
            var shape = confetti.shapeFromText({ text: '🏀', scalar });
            var defaults = { spread: 360, ticks: 120, gravity: 0, decay: 0.94, startVelocity: 15, shapes: [shape], scalar };
            function shoot() {
                confetti({ ...defaults, particleCount: 30 });
                confetti({ ...defaults, particleCount: 5, flat: true });
                confetti({ ...defaults, particleCount: 15, scalar: scalar / 2, shapes: ['circle'] });
            }
            setTimeout(shoot, 0);
            setTimeout(shoot, 300);
            setTimeout(shoot, 600);
        },
        () => {
            console.log("🎉 Easter Egg: Emoji - Leaf! 🎉");
            var scalar = 2;
            var shape = confetti.shapeFromText({ text: '🍀', scalar });
            var defaults = { spread: 360, ticks: 120, gravity: 0, decay: 0.94, startVelocity: 15, shapes: [shape], scalar };
            function shoot() {
                confetti({ ...defaults, particleCount: 30 });
                confetti({ ...defaults, particleCount: 5, flat: true });
                confetti({ ...defaults, particleCount: 15, scalar: scalar / 2, shapes: ['circle'] });
            }
            setTimeout(shoot, 0);
            setTimeout(shoot, 300);
            setTimeout(shoot, 600);
        },
        () => {
            console.log("🎉 Easter Egg: Emoji - Sun moon! 🎉");
            var scalar = 2;
            var shape = confetti.shapeFromText({ text: '🌞🌝', scalar });
            var defaults = { spread: 360, ticks: 120, gravity: 0, decay: 0.94, startVelocity: 15, shapes: [shape], scalar };
            function shoot() {
                confetti({ ...defaults, particleCount: 30 });
                confetti({ ...defaults, particleCount: 5, flat: true });
                confetti({ ...defaults, particleCount: 15, scalar: scalar / 2, shapes: ['circle'] });
            }
            setTimeout(shoot, 0);
            setTimeout(shoot, 300);
            setTimeout(shoot, 600);
        },
        () => {
            console.log("🎉 Easter Egg: Emoji - Earth! 🎉");
            var scalar = 2;
            var shape = confetti.shapeFromText({ text: '🌏', scalar });
            var defaults = { spread: 360, ticks: 120, gravity: 0, decay: 0.94, startVelocity: 15, shapes: [shape], scalar };
            function shoot() {
                confetti({ ...defaults, particleCount: 30 });
                confetti({ ...defaults, particleCount: 5, flat: true });
                confetti({ ...defaults, particleCount: 15, scalar: scalar / 2, shapes: ['circle'] });
            }
            setTimeout(shoot, 0);
            setTimeout(shoot, 300);
            setTimeout(shoot, 600);
        }
    ];

    function triggerNextEffect() {
        if (isEffectActive) return;
        isEffectActive = true;
        effects[currentEffectIndex]();
        setTimeout(() => { isEffectActive = false; }, 3000);
        currentEffectIndex = (currentEffectIndex + 1) % effects.length;
    }

    headerTitle.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        triggerNextEffect();
    });

    headerTitle.addEventListener("touchstart", (e) => {
        touchTimer = setTimeout(() => triggerNextEffect(), 500);
    });

    headerTitle.addEventListener("touchend", () => clearTimeout(touchTimer));
    headerTitle.addEventListener("touchmove", () => clearTimeout(touchTimer));

    // Initialize App
    if (!sessionStorage.getItem("justUpdated")) {
        checkForUpdates(true);
    } else {
        showUpdateConfirmation();
        sessionStorage.removeItem("justUpdated");
    }
    setInterval(() => {
        if (!sessionStorage.getItem("justUpdated")) checkForUpdates();
    }, 5 * 60 * 1000);

    window.addEventListener("online", () => {
        updateOnlineStatus();
        setTimeout(() => {
            if (!sessionStorage.getItem("justUpdated")) checkForUpdates(true);
            renderPosts();
        }, 1000);
    });
    
    window.addEventListener("offline", () => {
        updateOnlineStatus();
        renderPosts();
    });

    // Load posts and draft
    const posts = JSON.parse(localStorage.getItem("posts")) || [];
    const savedDraft = localStorage.getItem("draftNote") || "";
    const latestPost = posts.length > 0 ? posts[posts.length - 1] : null;

    if (savedDraft && (!latestPost || savedDraft !== latestPost.text) && editIndex === null) {
        inputWrapper.value = savedDraft;
        adjustHeight();
        charCount.textContent = (texts.charCount || "{count} characters").replace("{count}", savedDraft.length);
        charCount.classList.toggle("text-red-500", savedDraft.length > 500);
    } else {
        localStorage.removeItem("draftNote");
    }
    console.log("Loaded posts:", posts, "Draft:", savedDraft);

    const saveDraft = debounce(function (text) {
        localStorage.setItem("draftNote", text);
        console.log("Draft saved:", text);
    }, 500);

    inputWrapper.addEventListener("input", function () {
        const text = this.value.trim();
        saveDraft(text);
        adjustHeight();
        charCount.textContent = (texts.charCount || "{count} characters").replace("{count}", text.length);
        charCount.classList.toggle("text-red-500", text.length > 500);
    });

    if (!localStorage.getItem("language")) {
        applyLanguage("english");
        showLanguageSelection();
    } else {
        selectedLanguage = localStorage.getItem("language");
        applyLanguage(selectedLanguage);
        renderPosts();
    }
    document.getElementById("footer").classList.remove("hidden");

    const splashScreen = document.getElementById("splash-screen");
    splashScreen.style.opacity = "0";
    setTimeout(() => {
        splashScreen.style.display = "none";
    }, 700);
});

// PWA Support
let deferredPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    setTimeout(() => {
        const installButton = document.createElement("button");
        installButton.textContent = "Install App";
        Object.assign(installButton.style, {
            backgroundColor: "#3b82f6",
            color: "#ffffff",
            padding: "0.5rem 1rem",
            borderRadius: "9999px",
            position: "fixed",
            bottom: "1rem",
            right: "1rem"
        });
        installButton.addEventListener("mouseover", () => installButton.style.backgroundColor = "#2563eb");
        installButton.addEventListener("mouseout", () => installButton.style.backgroundColor = "#3b82f6");
        installButton.addEventListener("click", () => {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                console.log(choiceResult.outcome === "accepted" ? "User accepted install" : "User dismissed install");
                deferredPrompt = null;
            });
        });
        document.body.appendChild(installButton);
    }, 5000);
});

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/service-worker.js")
            .then(registration => console.log("ServiceWorker registered with scope:", registration.scope))
            .catch(err => console.log("ServiceWorker registration failed:", err));
    });
}