// Version info (update this with each release)
const APP_VERSION = '1.5.1'; // Matches your footer

document.addEventListener("DOMContentLoaded", function () {
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
    let actionContext = null; // Replaces deleteIndex
    let editIndex = null;

    const hashtagList = document.getElementById("hashtag-list");
    let activeHashtag = null;

    // Modified highlightHashtags to also handle links
    function highlightHashtags(text) {
        // First, convert URLs to clickable links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        text = text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
        // Then, highlight hashtags
        return text.replace(/(\s|^)(#\w+)/g, '$1<span class="hashtag">$2</span>').replace(/\n/g, "<br>");
    }

    // Extract title (if any) and content from post text
    function extractTitleAndContent(text) {
        const titleMatch = text.match(/^@(\w+)/);
        if (titleMatch) {
            const title = titleMatch[0].substring(1); // Remove '@'
            const content = text.replace(/^@\w+\s*/, ""); // Remove title from content
            return { title, content };
        }
        return { title: null, content: text };
    }

    // Extract unique hashtags from posts
    function getUniqueHashtags(posts) {
        const hashtagSet = new Set();
        posts.forEach(post => {
            const hashtags = post.text.match(/#\w+/g) || [];
            hashtags.forEach(tag => hashtagSet.add(tag.substring(1))); // Remove '#'
        });
        return Array.from(hashtagSet);
    }

    // Update version display
    const versionElement = document.querySelector('.footer-section p.text-sm');
    if (versionElement) versionElement.textContent = `v${APP_VERSION}`;

    // Initialize appVersion if not set
    if (!localStorage.getItem('appVersion')) {
    localStorage.setItem('appVersion', APP_VERSION);
    }

    // Check online status and update availability
    function checkForUpdates() {
    if (navigator.onLine) {
        fetch('/manifest.json', { cache: 'no-store' })
        .then(response => response.json())
        .then(manifest => {
            const cachedVersion = localStorage.getItem('appVersion');
            if (manifest.version && manifest.version !== cachedVersion) {
            // New version detected
            showUpdateNotification(manifest.version);
            }
        })
        .catch(() => console.log('Offline or fetch failed'));
    } else {
        console.log('Offline mode: Using cached content');
    }
    }

    function showUpdateNotification(newVersion) {
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.background = '#1d9bf0';
        notification.style.color = '#fff';
        notification.style.padding = '12px 16px';
        notification.style.borderRadius = '12px';
        notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        notification.style.zIndex = '1000';
        notification.style.display = 'flex';
        notification.style.alignItems = 'center';
        notification.style.gap = '12px';
        notification.style.fontSize = '14px';
        notification.style.fontWeight = '500';
        notification.style.maxWidth = '90%';
        notification.style.whiteSpace = 'nowrap';
        notification.style.overflow = 'hidden';
        notification.style.textOverflow = 'ellipsis';
    
        const text = document.createElement('span');
        text.textContent = `New version ${newVersion} available!`;
        text.style.flex = '1';
        text.style.overflow = 'hidden';
        text.style.whiteSpace = 'nowrap';
        text.style.textOverflow = 'ellipsis';
    
        const updateButton = document.createElement('button');
        updateButton.textContent = 'Update';
        updateButton.style.background = '#fff';
        updateButton.style.color = '#1d9bf0';
        updateButton.style.border = 'none';
        updateButton.style.padding = '6px 12px';
        updateButton.style.borderRadius = '6px';
        updateButton.style.fontSize = '14px';
        updateButton.style.fontWeight = '600';
        updateButton.style.cursor = 'pointer';
        updateButton.style.transition = 'all 0.2s ease-in-out';
    
        updateButton.addEventListener('mouseover', () => {
            updateButton.style.background = 'rgba(255, 255, 255, 0.9)';
        });
        updateButton.addEventListener('mouseout', () => {
            updateButton.style.background = '#fff';
        });
        updateButton.addEventListener('click', () => {
            caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))))
                .then(() => {
                    if (navigator.serviceWorker.controller) {
                        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
                    }
                    localStorage.setItem('appVersion', newVersion);
                    window.location.reload(true);
                })
                .catch(err => console.error('Update failed:', err));
        });
    
        notification.appendChild(text);
        notification.appendChild(updateButton);
        document.body.appendChild(notification);
    }
    

    // Periodic update check (every 5 minutes when online)
    checkForUpdates();
    setInterval(checkForUpdates, 5 * 60 * 1000);

    // Show/hide button based on scroll position
    window.addEventListener("scroll", () => {
        if (window.scrollY > 200) { // Show after scrolling 200px
            scrollToTopButton.classList.add("visible");
        } else {
            scrollToTopButton.classList.remove("visible");
        }
    });

    // Scroll to top on click
    scrollToTopButton.addEventListener("click", () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth" // Smooth scroll like Apple/Twitter
        });
    });

    // Render hashtag list with scroll arrows
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
            badge.textContent = tag; // No '#' prefix
            badge.addEventListener("click", () => {
                activeHashtag = activeHashtag === tag ? null : tag;
                renderPosts(searchInput.value.trim());
            });
            hashtagList.appendChild(badge);
        });

        // Handle scroll arrows (only for desktop)
        if (window.innerWidth > 768) {
            // Show/hide arrows based on scroll position
            function updateArrows() {
                const scrollLeft = hashtagList.scrollLeft;
                const scrollWidth = hashtagList.scrollWidth;
                const clientWidth = hashtagList.clientWidth;
                const hasOverflow = scrollWidth > clientWidth;

                leftArrow.classList.toggle("hidden", !hasOverflow || scrollLeft <= 0);
                rightArrow.classList.toggle("hidden", !hasOverflow || scrollLeft + clientWidth >= scrollWidth - 1);
            }

            // Scroll functionality
            leftArrow.addEventListener("click", () => {
                hashtagList.scrollBy({ left: -200, behavior: "smooth" });
            });

            rightArrow.addEventListener("click", () => {
                hashtagList.scrollBy({ left: 200, behavior: "smooth" });
            });

            // Handle scroll and resize events
            hashtagList.addEventListener("scroll", updateArrows);
            window.addEventListener("resize", updateArrows);
            requestAnimationFrame(updateArrows); // Update after DOM render
        }
    }

    function adjustHeight() {
        inputWrapper.style.height = "auto";
        inputWrapper.style.height = `${inputWrapper.scrollHeight}px`;
    }

    function updateEditState() {
        if (editIndex !== null) {
            inputWrapper.classList.add("editing");
            cancelEditButton.style.display = "inline-block";
            postButton.textContent = "Save";
        } else {
            inputWrapper.classList.remove("editing");
            cancelEditButton.style.display = "none";
            postButton.textContent = "Add";
        }
    }

    inputWrapper.addEventListener("input", function () {
        const text = this.value;
        adjustHeight();
        charCount.textContent = `${text.length}/500`;
        charCount.classList.toggle("text-red-500", text.length > 500);
    });

    adjustHeight();
    inputWrapper.addEventListener("paste", adjustHeight);

    postButton.addEventListener("click", function () {
        const text = inputWrapper.value.trim();
        if (!text || text.length > 500) return;

        if (editIndex !== null) {
            let posts = JSON.parse(localStorage.getItem("posts")) || [];
            posts[editIndex].text = text;
            posts[editIndex].timestamp = new Date().toLocaleString();
            localStorage.setItem("posts", JSON.stringify(posts));
            editIndex = null;
        } else {
            savePost(text);
        }

        inputWrapper.value = "";
        adjustHeight();
        charCount.textContent = "0/500";
        charCount.classList.remove("text-red-500");
        updateEditState();
        renderPosts();
    });

    cancelEditButton.addEventListener("click", function () {
        inputWrapper.value = "";
        editIndex = null;
        adjustHeight();
        charCount.textContent = "0/500";
        charCount.classList.remove("text-red-500");
        updateEditState();
        renderPosts();
    });

    function savePost(text) {
        let posts = JSON.parse(localStorage.getItem("posts")) || [];
        posts.push({ text, timestamp: new Date().toLocaleString(), pinned: false });
        localStorage.setItem("posts", JSON.stringify(posts));
        renderPosts();
    }

    function togglePin(index) {
        let posts = JSON.parse(localStorage.getItem("posts")) || [];
        const isPinned = posts[index].pinned;
        posts = posts.map(post => ({ ...post, pinned: false })); // Unpin all
        if (!isPinned) {
            posts[index].pinned = true; // Pin the clicked one if it wasn't pinned
        }
        localStorage.setItem("posts", JSON.stringify(posts));
        renderPosts();
    }

    // Modified renderPosts to handle titles and hashtag filtering
    function renderPosts(filterText = "") {
        const posts = JSON.parse(localStorage.getItem("posts")) || [];
        postContainer.innerHTML = "";
        
        if (posts.length === 0) {
            postContainer.innerHTML = '<div class="no-posts">No notes available. Start by adding a new note above.</div>';
        } else {
            let filteredPosts = posts;
            if (activeHashtag) {
                filteredPosts = posts.filter(post => post.text.includes(`#${activeHashtag}`));
            } else {
                filteredPosts = posts.filter(post => post.text.toLowerCase().includes(filterText.toLowerCase()));
            }
    
            if (filteredPosts.length === 0) {
                postContainer.innerHTML = '<div class="no-results">No matching notes found. Try refining your search or adding a new note.</div>';
            } else {
                const pinnedPosts = filteredPosts.filter(post => post.pinned);
                const regularPosts = filteredPosts.filter(post => !post.pinned);
    
                pinnedPosts.forEach((post, index) => {
                    const originalIndex = posts.indexOf(post);
                    renderPost(post, originalIndex, true);
                });
    
                regularPosts.reverse().forEach((post, index) => {
                    const originalIndex = posts.indexOf(post);
                    renderPost(post, originalIndex, false);
                });
            }
        }
    
        renderHashtagList(posts);
    
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
                                <path d="M12 20h9"/>
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                            </svg>
                            <span>Edit</span>
                        </button>
                        <button class="delete-post" data-index="${index}" ${editIndex === index ? "disabled" : ""}>
                            <svg class="icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M3 6h18"/>
                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                <path d="M10 11v6"/>
                                <path d="M14 11v6"/>
                                <path d="M5 6h14l-1 14H6L5 6z"/>
                            </svg>
                            <span>Bin</span>
                        </button>
                        <button class="pin-post ${isPinned ? 'pinned' : ''}" data-index="${index}" ${editIndex === index ? "disabled" : ""} aria-label="${isPinned ? 'Unpin Post' : 'Pin Post'}">
                            <svg class="icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                ${isPinned ? `
                                    <path d="M6 3l12 12"/>
                                    <path d="M6 15l12-12"/>
                                    <path d="M12 22v-6"/>
                                ` : `
                                    <path d="M12 2v13"/>
                                    <path d="M5 15l7 7 7-7"/>
                                    <path d="M19 9H5"/>
                                `}
                            </svg>
                        </button>
                    </div>
                `;
                postContainer.appendChild(postElement);
            }

            document.querySelectorAll(".delete-post").forEach(button => {
                button.addEventListener("click", function () {
                    if (!this.disabled) {
                        actionContext = { type: "delete", index: this.getAttribute("data-index") };
                        deleteConfirmation.classList.remove("hidden");
                        scrollToTopButton.classList.remove("visible"); // Hide scroll-to-top
                        const popupText = deleteConfirmation.querySelector(".twitter-popup p:first-child");
                        const popupSubtext = deleteConfirmation.querySelector(".twitter-popup p:nth-child(2)");
                        const confirmButton = document.getElementById("confirm-delete");
                        popupText.textContent = "Delete Note?";
                        popupSubtext.textContent = "This can’t be undone and it will be removed from your timeline.";
                        confirmButton.textContent = "Delete";
                        confirmButton.classList.replace("bg-[#1d9bf0]", "bg-red-500");
                        confirmButton.classList.replace("hover:bg-[#1a8cd8]", "hover:bg-red-600");
                    }
                });
            });
            
            document.querySelectorAll(".edit-post").forEach(button => {
                button.addEventListener("click", function () {
                    if (!this.disabled) {
                        const newEditIndex = parseInt(this.getAttribute("data-index"));
                        const posts = JSON.parse(localStorage.getItem("posts")) || [];
                        const currentText = inputWrapper.value.trim();

                        // Check if there's an ongoing edit with changes
                        if (editIndex !== null && currentText && currentText !== posts[editIndex].text) {
                            // Show confirmation popup
                            deleteConfirmation.classList.remove("hidden");
                            scrollToTopButton.classList.remove("visible"); // Hide scroll-to-top
                            const popupText = deleteConfirmation.querySelector(".twitter-popup p:first-child");
                            const popupSubtext = deleteConfirmation.querySelector(".twitter-popup p:nth-child(2)");
                            const confirmButton = document.getElementById("confirm-delete");
                            popupText.textContent = "Discard Changes?";
                            popupSubtext.textContent = "You have unsaved changes. Discard them to edit this post?";
                            confirmButton.textContent = "Discard"; // Keep button text as "Discard"
                            // No need to change background—leave it as red (bg-red-500) from default state
                            actionContext = { type: "edit-switch", newIndex: newEditIndex };
                            return; // Wait for confirmation
                        }

                        // Proceed directly if no confirmation needed
                        editIndex = newEditIndex;
                        inputWrapper.value = posts[editIndex].text;
                        adjustHeight();
                        charCount.textContent = `${inputWrapper.value.length}/500`;
                        charCount.classList.toggle("text-red-500", inputWrapper.value.length > 500);
                        updateEditState();
                        renderPosts();
                        inputWrapper.focus(); // Add this line to focus the input are
                    }
                });
            });

        document.querySelectorAll(".pin-post").forEach(button => {
            button.addEventListener("click", function () {
                const index = parseInt(this.getAttribute("data-index"));
                togglePin(index);
            });
        });

        document.getElementById("footer").classList.remove("hidden");
    }

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
                charCount.textContent = `${inputWrapper.value.length}/500`;
                charCount.classList.toggle("text-red-500", inputWrapper.value.length > 500);
                updateEditState();
                renderPosts();
            }
            deleteConfirmation.classList.add("hidden");
            actionContext = null;
            // Restore scroll-to-top visibility based on scroll position
            if (window.scrollY > 200) {
                scrollToTopButton.classList.add("visible");
            }
        }
    });

    cancelDelete.addEventListener("click", function () {
        deleteConfirmation.classList.add("hidden");
        const confirmButton = document.getElementById("confirm-delete");
        confirmButton.classList.replace("bg-[#1d9bf0]", "bg-red-500"); // Reset to default
        confirmButton.classList.replace("hover:bg-[#1a8cd8]", "hover:bg-red-600");
        actionContext = null;
         // Restore scroll-to-top visibility based on scroll position
        if (window.scrollY > 200) {
            scrollToTopButton.classList.add("visible");
        }
    });

    deleteAllButton.addEventListener("click", function () {
        const posts = JSON.parse(localStorage.getItem("posts")) || [];
        if (posts.length === 0) return;

        deleteConfirmation.classList.remove("hidden");
        const popupText = deleteConfirmation.querySelector(".twitter-popup p:first-child");
        const popupSubtext = deleteConfirmation.querySelector(".twitter-popup p:nth-child(2)");
        const confirmButton = document.getElementById("confirm-delete");
        popupText.textContent = "Delete All Notes?";
        popupSubtext.textContent = "This can’t be undone and all your notes will be removed.";
        confirmButton.textContent = "Delete"; // Reset to default
        confirmButton.classList.replace("bg-[#1d9bf0]", "bg-red-500"); // Red for delete
        confirmButton.classList.replace("hover:bg-[#1a8cd8]", "hover:bg-red-600");
        actionContext = { type: "delete-all" };
    });

    searchInput.addEventListener("input", function () {
        const searchText = this.value.trim();
        const inputSection = document.querySelector(".input-section");
        renderPosts(searchText);
        clearSearch.style.display = searchText ? "block" : "none";
        // Hide input section when search is active, show when cleared
        if (searchText) {
            inputSection.classList.add("hidden-on-search");
        } else {
            inputSection.classList.remove("hidden-on-search");
        }
    });

    clearSearch.addEventListener("click", function () {
        searchInput.value = "";
        const inputSection = document.querySelector(".input-section");
        renderPosts();
        clearSearch.style.display = "none";
        inputSection.classList.remove("hidden-on-search");
    });   

    renderPosts();
    // Handle online/offline events
    window.addEventListener('online', () => {
        console.log('Back online');
        checkForUpdates();
        renderPosts();
    });
    window.addEventListener('offline', () => {
        console.log('Offline');
        renderPosts();
    });
});

// Install App Prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
e.preventDefault();
deferredPrompt = e;
setTimeout(() => {
    const installButton = document.createElement('button');
    installButton.textContent = 'Install App';
    installButton.style.cssText = 'background-color: #3b82f6; color: #ffffff; padding: 0.5rem 1rem; border-radius: 9999px; position: fixed; bottom: 1rem; right: 1rem;';
    installButton.addEventListener('mouseover', () => installButton.style.backgroundColor = '#2563eb');
    installButton.addEventListener('mouseout', () => installButton.style.backgroundColor = '#3b82f6');
    installButton.addEventListener('click', () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
            deferredPrompt = null;
        });
    });
    document.body.appendChild(installButton);
}, 5000);
});

if ('serviceWorker' in navigator) {
window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        })
        .catch(err => {
            console.log('ServiceWorker registration failed: ', err);
        });
});
}
