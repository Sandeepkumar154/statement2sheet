# Statement2Sheet Architecture & Security Hardening Walkthrough

This document records the architectural boundaries, security implementation details, and automated verification status for Statement2Sheet.

---

## 1. Architectural Boundaries & Environment Realities

### A. GitHub Pages vs. GitHub Actions CI
- **GitHub Pages**: Only publishes static web assets (`index.html`, `app.js`, `styles.css`, `manifest.webmanifest`, `sw.js`, `icon.svg`). It does **not** serve `.github/workflows/` files, as these belong exclusively to source control and GitHub Actions.
- **GitHub Actions CI**: Automated regression suite configured in [`.github/workflows/security-ci.yml`](.github/workflows/security-ci.yml) executes on pushes and pull requests to `main` and `master`, running headless Chromium across all 8 security test suites via `npm test`.

### B. Production CSP Boundaries
- **GitHub Pages Limitation**: GitHub Pages serves static files and does not support custom HTTP response headers. Consequently, on the live GitHub Pages site, Content Security Policy is enforced via the HTML `<meta http-equiv="Content-Security-Policy">` element.
- **HTTP Header Support**: For deployments on platforms that support custom HTTP response headers (such as Vercel and Cloudflare Pages), matching strict CSP headers, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: strict-origin-when-cross-origin` are provided in [`vercel.json`](vercel.json) and [`_headers`](_headers).
- **Policy Directives**:
  ```
  default-src 'self' data: blob: https:;
  script-src 'self' 'wasm-unsafe-eval' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://cdn.sheetjs.com blob:;
  style-src 'self' 'unsafe-inline' https:;
  img-src 'self' data: blob: https:;
  font-src 'self' data: https:;
  connect-src 'self' blob: data: https:;
  worker-src 'self' blob:;
  manifest-src 'self';
  object-src 'none';
  ```
  - `script-src`: Completely free of `'unsafe-inline'` (`app.js` is external; 0 inline `<script>` tags).
  - `style-src`: Retains `'unsafe-inline'` solely because the Tailwind Play CDN JIT engine injects dynamic runtime style rules.
  - `connect-src`: Configured with `'self' blob: data: https:;` allowing local fetch requests under service worker interception.

### C. Third-Party Library & SRI Boundaries
- **Pinned SRI Libraries**: Critical binary/document processing libraries (PDF.js, SheetJS, jsPDF, PDF-Lib, Tesseract.js) are version-pinned with Subresource Integrity (`integrity="sha384-..."`) attributes.
- **Tailwind CDN**: Loaded via `https://cdn.tailwindcss.com`. Because Tailwind Play CDN is an interactive JIT engine intended for browser compilation and updates dynamically, it does not provide a fixed static SRI hash. External libraries are downloaded on the initial visit and subsequently served locally from the cache.

---

## 2. Core Implementation Hardening

### A. Universal Object URL Tracking & Automated Revocation
- **Zero Untracked URLs**: All download and preview operations route through `downloadTrackedBlob(blob, filename)` and `createTrackedObjectURL(blob)`.
- **Verified Codebase Count**: `git grep -n "createObjectURL"` returns **exactly 1 occurrence** across the entire codebase (line 60 of [`app.js`](app.js) inside the registry helper).
- **Automated Revocation**: Every created object URL is tracked in `activeObjectUrls` and revoked after triggering download (with a 1.2s timeout), preventing memory bloat.

### B. Safe User Data Rendering
- **Controlled Renderers**: Sensitive user-controlled values (filenames, transaction descriptions, OCR quality scores, and validation error messages) are set strictly via `.textContent` or safe DOM node creation:
  - `generateCategoryInsights()` constructs category rows with `document.createElement`, setting names and amounts via `.textContent`.
  - `loadRecentFiles()` builds chips using `span.textContent = item.name`.
  - `inspectAndValidateFiles()` uses `showUploadAlert()` with `.replaceChildren()` and `.textContent`.
  - `ocr-quality-card` creates score cards dynamically with `.textContent`.
  - PDF thumbnails and galleries interpolate controlled HTML templates where user strings (e.g. document titles) are bound via `.textContent` or sanitized.
  - Transactions table rows are generated entirely using `document.createElement('td')` with `td.textContent = value || ''`.

### C. Authentic PWA Offline Architecture & Strict Cache-First Fetch
- **PWA Manifest & Icon**: [`manifest.webmanifest`](manifest.webmanifest) and [`icon.svg`](icon.svg) configure `standalone` mode and theme color `#0f172a`.
- **Service Worker ([`sw.js`](sw.js))**:
  - Cache: `s2s-cache-v1`.
  - Pre-caches local app shell (`index.html`, `styles.css`, `app.js`, `manifest.webmanifest`, `icon.svg`) and pinned CDN dependencies during the `install` event.
  - **Strict Cache-First Behavior**: Once an asset is cached, requests return immediately from `CacheStorage` without calling background network `fetch()`, ensuring zero background transmission for cached assets.
- **Accurate Spec Claims**:
  - "Cleared on Window Close" ➔ "Cleared on tab close or manual purge"
  - "ISO 32000 PDF Compliant" ➔ "Uses PDF.js & PDF-Lib"
  - "Sub-second Speed" ➔ "Optimized for browser processing"

---

## 3. Automated Regression Test Suite

The automated test suite in [`tests/security-regression.test.js`](tests/security-regression.test.js) was executed via `npm test` against headless Edge using Chrome DevTools Protocol (CDP):

| # | Test Suite Item | Expected | Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| 0 | **Static Code Hardening** | Exactly 1 `createObjectURL` in `app.js`, 0 inline `<script>`, 0 inline `on*` | 1 occurrence, 0 inline scripts, 0 handlers | **PASS** |
| 1 | **Live DOM Script Separation** | 0 inline scripts or event attributes in live DOM | 0 inline scripts, 0 inline handlers | **PASS** |
| 2 | **Centralized Event Dispatcher** | Navigation via `data-tool` toggles views | Switched `view-merge` and `view-dashboard` cleanly | **PASS** |
| 3 | **Magic-Byte Binary Inspection** | Accepts `%PDF-`, rejects spoofed HTML / binaries | Valid PDF: true, Fake HTML: rejected | **PASS** |
| 4 | **PDF Intake & Thumbnail** | Parses page count and renders preview canvas | `1 Page(s)` detected, `300x400` canvas rendered | **PASS** |
| 5 | **Sensitive Data Purge** | Inputs, textareas, session filenames, active URLs cleared | Passwords, metadata, markdown, URLs all wiped | **PASS** |
| 6 | **Safe Dynamic DOM Rendering** | Chips and Category Insights rendered via safe DOM nodes | `hasChip: true`, `hasCats: true` | **PASS** |
| 7 | **PWA Cache Contents & Offline Fetch** | All 13 shell & library assets in `s2s-cache-v1`; offline fetch succeeds with status 200 while network is disconnected | Cache verified, controller active, offline fetch status 200 | **PASS** |
| 8 | **Browser Console CSP Violations** | Zero CSP violations logged in browser console | 0 violations | **PASS** |

```
=============================================================
🎉 ALL 8 SECURITY REGRESSION TEST SUITES PASSED (100%)!
=============================================================
```

---

## 4. Remote Deployment & CI Modernization

- **Commits**:
  - `3d7c590`: Strict cache-first SW, connect-src 'self', verified offline CDP suite, and accurate spec claims.
  - `3b4aebf`: Upgraded GitHub Actions CI workflow to Node.js 22 LTS (`node-version: 22`).
- **Pushed Branches**: `origin/main` and `origin/master` (both in sync)
- **Live Endpoint Verification**:
  - `https://sandeepkumar154.github.io/statement2sheet/` ➔ `HTTP 200 OK`
  - `https://sandeepkumar154.github.io/statement2sheet/manifest.webmanifest` ➔ `HTTP 200 OK`
  - `https://sandeepkumar154.github.io/statement2sheet/sw.js` ➔ `HTTP 200 OK`
  - `https://sandeepkumar154.github.io/statement2sheet/app.js` ➔ `HTTP 200 OK`
  - `https://sandeepkumar154.github.io/statement2sheet/styles.css` ➔ `HTTP 200 OK`
  - `https://sandeepkumar154.github.io/statement2sheet/icon.svg` ➔ `HTTP 200 OK`

