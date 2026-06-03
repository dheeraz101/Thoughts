(function () {
  "use strict";

  const RELEASES_API = "https://api.github.com/repos/dheeraz101/Thoughts/releases?per_page=10";
  const POPUP_ID = "android-apk-popup";
  const CARD_ID = "android-apk-settings-card";
  const ROW_ID = "android-apk-settings-row";

  const downloadIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 3v12"></path>
      <path d="m7 10 5 5 5-5"></path>
      <path d="M5 21h14"></path>
    </svg>
  `;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatAssetSize(bytes) {
    const size = Number(bytes) || 0;
    if (!size) return "";
    const mb = size / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  function describeApkAsset(name) {
    const lower = String(name || "").toLowerCase();
    const parts = [];
    if (lower.includes("universal")) parts.push("Universal");
    if (lower.includes("arm64") || lower.includes("aarch64")) parts.push("ARM64");
    else if (lower.includes("armeabi") || lower.includes("armv7")) parts.push("ARMv7");
    else if (lower.includes("x86_64")) parts.push("x86_64");
    else if (lower.includes("x86")) parts.push("x86");
    if (lower.includes("android")) parts.push("Android");
    return parts.join(" - ") || "Android APK";
  }

  function setPopupOpen(open) {
    const popup = document.getElementById(POPUP_ID);
    if (!popup) return;
    popup.classList.toggle("hidden", !open);
    document.body.style.overflow = open ? "hidden" : "";
  }

  function renderApkState(message) {
    const list = document.getElementById("android-apk-list");
    if (!list) return;
    list.innerHTML = `<div class="android-apk-state">${escapeHtml(message)}</div>`;
  }

  function renderApkDownloads(release, assets) {
    const list = document.getElementById("android-apk-list");
    const msg = document.getElementById("android-apk-message");
    if (!list || !msg) return;

    const releaseName = release.name || release.tag_name || "Latest release";
    msg.innerHTML = `<strong>${escapeHtml(releaseName)}</strong> Direct APK downloads from the latest GitHub release. Choose the file that matches your Android device.`;
    list.innerHTML = assets.map((asset) => {
      const meta = [describeApkAsset(asset.name), formatAssetSize(asset.size)].filter(Boolean).join(" - ");
      return `
        <a class="android-apk-download" href="${escapeHtml(asset.browser_download_url)}" download="${escapeHtml(asset.name)}" rel="noopener">
          <span class="android-apk-file">
            <span class="android-apk-name">${escapeHtml(asset.name)}</span>
            <span class="android-apk-meta">${escapeHtml(meta)}</span>
          </span>
          <span class="android-apk-icon">${downloadIcon}</span>
        </a>
      `;
    }).join("");
  }

  async function loadApkDownloads() {
    const msg = document.getElementById("android-apk-message");
    if (!navigator.onLine) {
      if (msg) msg.innerHTML = "<strong>Offline.</strong> Connect to the internet to fetch APK downloads.";
      renderApkState("Offline. Connect to the internet and try again.");
      return;
    }

    if (msg) msg.innerHTML = "<strong>Android APK.</strong> Checking the latest GitHub release for APK files.";
    renderApkState("Loading latest release APKs...");

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 9000);
      const response = await fetch(`${RELEASES_API}&t=${Date.now()}`, {
        cache: "no-store",
        signal: controller.signal,
        headers: { Accept: "application/vnd.github+json" },
      });
      window.clearTimeout(timeout);
      if (!response.ok) throw new Error(`GitHub returned ${response.status}`);

      const releases = await response.json();
      const release = Array.isArray(releases) ? releases[0] : null;
      const assets = release && Array.isArray(release.assets)
        ? release.assets.filter((asset) => /\.apk$/i.test(asset.name || "") && asset.browser_download_url)
        : [];

      if (!release || !assets.length) {
        if (msg) msg.innerHTML = "<strong>No APK files found yet.</strong> The latest GitHub release does not include APK assets right now.";
        renderApkState("No APK download files are attached to the latest release yet.");
        return;
      }

      renderApkDownloads(release, assets);
    } catch (error) {
      if (msg) msg.innerHTML = "<strong>Could not load release files.</strong> Try again when GitHub is reachable.";
      renderApkState("Release APK files could not be loaded. Check your connection and try again.");
    }
  }

  function openAndroidApkPopup() {
    setPopupOpen(true);
    window.setTimeout(loadApkDownloads, 120);
  }

  function wirePopup() {
    const popup = document.getElementById(POPUP_ID);
    const close = document.getElementById("android-apk-close");
    if (!popup || popup.dataset.apkWired) return;
    popup.dataset.apkWired = "true";
    close?.addEventListener("click", () => setPopupOpen(false));
    popup.addEventListener("click", (event) => {
      if (event.target === popup) setPopupOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !popup.classList.contains("hidden")) setPopupOpen(false);
    });
  }

  function createSettingsRow() {
    const row = document.createElement("button");
    row.id = ROW_ID;
    row.type = "button";
    row.className = "settings-row settings-menu-row settings-link-row android-apk-settings-row";
    row.dataset.settingsIcon = "apk";
    row.innerHTML = `
      <div>
        <strong>Android APK</strong>
        <span>Install the latest APK for Android</span>
      </div>
    `;
    row.addEventListener("click", openAndroidApkPopup);
    return row;
  }

  function createSettingsCard() {
    const card = document.createElement("div");
    card.id = CARD_ID;
    card.className = "settings-group android-apk-settings-card";
    card.appendChild(createSettingsRow());
    return card;
  }

  function findSettingsInsertionPoint() {
    const settings = document.querySelector("#settings-panel-overlay .settings-content");
    if (!settings) return null;
    return settings.querySelector(".settings-check-update-card") ||
      settings.querySelector("[data-settings-icon='install']") ||
      settings.querySelector("#zoom-toggle") ||
      settings.lastElementChild;
  }

  function injectSettingsRow() {
    if (document.getElementById(CARD_ID) || document.getElementById(ROW_ID)) return;
    const target = findSettingsInsertionPoint();
    if (!target) return;
    const cardTarget = target.closest(".settings-group") || target;
    if (!cardTarget.parentElement) return;
    cardTarget.parentElement.insertBefore(createSettingsCard(), cardTarget.nextSibling);
  }

  function init() {
    wirePopup();
    injectSettingsRow();
    const observer = new MutationObserver(() => {
      wirePopup();
      injectSettingsRow();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
