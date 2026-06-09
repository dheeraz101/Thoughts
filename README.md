# Thoughts

Thoughts is a lightweight, production-ready progressive web app (PWA) for capturing short notes and ideas with offline-first behaviour and fast static performance.

Badges: [Visit the live site](https://writethoughts.netlify.app)

**Highlights**
- Offline support via a service worker
- Fast static assets (minified JS/CSS)
- Small footprint: no backend required for core functionality

---

## ☕ Support

If NoteKar helps you, you can support the project here:

[![Buy Me a Coffee](https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png)](https://www.buymeacoffee.com/dheeraz)

Your support helps keep NoteKar free, offline-first, and actively maintained.

---

## Table of Contents
- Overview
- Features
- Quick Start
- Development
- Build & Release
- Project Structure
- Contribution
- License

## Overview

Thoughts provides a focused UI for creating and browsing short notes. It is designed to be simple, resilient offline, and easy to deploy to any static hosting provider (Netlify, GitHub Pages, etc.).

## Features

- Offline-first PWA with `service-worker.js` and `offline.html`
- Minified production assets (`script.min.js`, `custom.min.css`)
- Simple build helpers in `package.json` for minification
- Static single-page UI optimized for mobile and desktop

## Quick Start

1. Clone the repository:

   ```bash
   git clone https://github.com/dheeraz101/Thoughts.git
   cd Thoughts
   ```

2. Install dev dependencies (used for minification):

   ```bash
   npm install
   ```

3. Build production assets (minify JS/CSS):

   ```bash
   npm run minify
   ```

4. Serve the site locally with any static server (for example `serve` or VS Code Live Server):

   ```bash
   npx serve . -p 5000
   # or use a preferred static server
   ```

Open the site at `http://localhost:5000`.

## Development

- Edit source files (`script.js`, `custom.css`, `index.html`) and test in the browser.
- Re-run `npm run minify` to update production artifacts.
- For quick CSS/JS tweaks you can use the unminified files during development.

## Build & Release

- `npm run sync-version` updates the `version.json` and related files.
- `npm run minify` runs JS/CSS minification (uses `terser` and `clean-css-cli`).
- Deploy the output to a static host (Netlify, GitHub Pages, S3, etc.).

## Project Structure (important files)

- `index.html` — application shell
- `script.js`, `script.min.js` — application logic
- `custom.css`, `custom.min.css` — styles
- `service-worker.js` — PWA service worker
- `offline.html` — fallback page when offline
- `package.json` — build scripts and metadata
- `LICENSE` — project license (MIT)

## Contributing

Contributions are welcome. Please open issues for bugs or feature requests, and submit pull requests for fixes. Keep changes small and focused. Include tests or reproduction steps where applicable.

When opening a pull request:

- Provide a clear description of the change
- Link to any related issues
- Ensure code and assets are formatted consistently

## License

This project is licensed under the MIT License — see the `LICENSE` file for details.

---

If you'd like, I can also add or expand documentation for any specific feature or workflow (deployment, CI, code style). Just tell me which area to prioritize.
