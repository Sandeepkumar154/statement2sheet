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
| 0 | **Static Code Hardening** | Exactly 1 `createObjectURL` in `app.js`, 0 inline executable `<script>`, 0 inline `on*` | 1 occurrence, 0 executable inline scripts, 0 handlers | **PASS** |
| 1 | **Live DOM Script Separation & SEO Metadata** | 0 inline executable scripts, valid canonical tag, OG/Twitter tags, JSON-LD schema, guides & FAQ sections in DOM | 0 inline executable scripts, canonical verified, OG/Twitter verified, WebApp & FAQPage schema valid, guides & FAQ rendered | **PASS** |
| 2 | **Centralized Event Dispatcher** | Navigation via `data-tool` toggles views | Switched `view-merge` and `view-dashboard` cleanly | **PASS** |
| 3 | **Magic-Byte Binary Inspection** | Accepts `%PDF-`, rejects spoofed HTML / binaries | Valid PDF: true, Fake HTML: rejected | **PASS** |
| 4 | **PDF Intake & Thumbnail** | Parses page count and renders preview canvas | `1 Page(s)` detected, `300x400` canvas rendered | **PASS** |
| 5 | **Sensitive Data Purge** | Inputs, textareas, session filenames, active URLs cleared | Passwords, metadata, markdown, URLs all wiped | **PASS** |
| 6 | **Safe Dynamic DOM Rendering** | Chips and Category Insights rendered via safe DOM nodes | `hasChip: true`, `hasCats: true` | **PASS** |
| 7 | **PWA Cache Contents & Offline Fetch** | All 13 shell & library assets in `s2s-cache-v1`; offline fetch succeeds with status 200 while network is disconnected | Cache verified, controller active, offline fetch status 200 | **PASS** |
| 8 | **Demo Statement → Workspace** | Ingests demo statement, populates metadata, switches to workspace, computes audit balances, renders 8 table rows | Ingested `First Bank of Wiki`, 8 transactions rendered, audit passed | **PASS** |
| 9 | **Financial Exports Output Generation** | Generates valid CSV, QuickBooks (.QBO OFX), Multi-Sheet Excel (.xlsx ZIP), Markdown (.md), Word (.doc), Clean PDF | 6 formats verified with exact headers, structures, and binary magic bytes | **PASS** |
| 10 | **PDF Manipulation Tools Output** | Functional PDF generation for Merge (2 pages), Split (1 page), Compress, Protect, Unlock, Sign | All 6 tools generate valid `%PDF-` binaries with exact page counts | **PASS** |
| 11 | **Object URL Registry Lifecycle** | Registry tracks active downloads and returns to exactly zero after timeout | Initial: 0, During: 1, Final: 0 (`returnedToZero: true`) | **PASS** |
| 12 | **Browser Console CSP Violations** | Zero CSP violations logged in browser console across all tests | 0 violations | **PASS** |

```
=============================================================
🎉 ALL 12 SECURITY & FUNCTIONAL TEST SUITES PASSED (100%)!
=============================================================
```

---

## 4. SEO, Discoverability & Structured Data Architecture

### A. Robots Exclusion & XML Sitemap
- [`robots.txt`](robots.txt): Configured to allow all crawlers (`User-agent: *`, `Allow: /`) and points directly to the canonical XML sitemap:
  ```txt
  User-agent: *
  Allow: /

  Sitemap: https://sandeepkumar154.github.io/statement2sheet/sitemap.xml
  ```
- [`sitemap.xml`](sitemap.xml): Formatted per the standard Sitemaps 0.9 XML schema referencing canonical origin `https://sandeepkumar154.github.io/statement2sheet/` with `changefreq: weekly` and `priority: 1.0`.

### B. Canonical & Social Graph Metadata
- **Canonical URL**: `<link rel="canonical" href="https://sandeepkumar154.github.io/statement2sheet/" />` in `<head>` preventing duplicate content indexing across protocol or query variants.
- **Open Graph**: Formatted with `og:type: website`, `og:site_name`, `og:title`, `og:description`, `og:url`, and `og:image` pointing to `https://sandeepkumar154.github.io/statement2sheet/icon.svg`.
- **Twitter Card**: Formatted with `twitter:card: summary`, `twitter:title`, `twitter:description`, and `twitter:image`.

### C. JSON-LD Structured Data Schema
- Formatted as `<script type="application/ld+json">` utilizing Schema.org `@graph` syntax:
  - **`WebApplication`**: Categorized as `FinanceApplication`, declaring browser requirements (Canvas, Web Workers, WebAssembly), free pricing tier (`Offer: price 0`), and complete feature listings.
  - **`FAQPage`**: Rich-results eligible Q&A schema answering statement parsing mechanics, CSV compliance, QuickBooks OFX export, and zero-knowledge privacy.

### D. Semantic Content & FAQ Sections
- Added `#content-guides-section` containing comprehensive educational content articles:
  1. **Bank Statement to Excel (.xlsx)**: Detailing the 3-sheet workbook architecture (Sheet 1: Master Ledger, Sheet 2: Mathematical Reconciliation Audit, Sheet 3: Monthly Breakdown & Category Analytics).
  2. **PDF to Clean CSV**: Explaining RFC 4180 normalization, table extraction, and accounting software compatibility.
  3. **QuickBooks (.QBO / WebConnect) Export**: Detailing OFX 1.02 envelopes, FITID deduplication, and bank feeds integration.
  4. **Privacy, Client-Side Security & Offline Mode**: Emphasizing zero server roundtrips, memory-safe TypedArrays, and PWA offline availability.
- Added `#faq-section` utilizing native HTML5 `<details class="group">` and `<summary>` elements for zero-script, fully accessible accordion interaction.

---

## 5. Google Search Console & Indexing Submission Guide

To submit the newly deployed sitemap and request homepage indexing:

1. **Access Google Search Console**:
   - Navigate to [Google Search Console](https://search.google.com/search-console).
   - Select the property: `https://sandeepkumar154.github.io/statement2sheet/` (or add as URL prefix property).
2. **Submit Sitemap**:
   - Go to **Indexing > Sitemaps** in the left navigation.
   - Enter `sitemap.xml` under "Add a new sitemap".
   - Click **Submit** and confirm status changes to **Success**.
3. **Request Homepage Indexing**:
   - Paste `https://sandeepkumar154.github.io/statement2sheet/` into the top **URL Inspection** search bar.
   - Click **Test Live URL** to verify Googlebot fetches the page and validates the JSON-LD structured data without errors.
   - Click **Request Indexing**.
4. **Rich Results Validation**:
   - Test the URL in the [Google Rich Results Test](https://search.google.com/test/rich-results) to confirm valid detection of the `WebApplication` and `FAQPage` structured data items.

---

## 6. Remote Deployment & CI Modernization

- **Commits**:
  - `3d7c590`: Strict cache-first SW, connect-src 'self', verified offline CDP suite, and accurate spec claims.
  - `3b4aebf`: Upgraded GitHub Actions CI workflow to Node.js 22 LTS (`node-version: 22`).
  - `44a7862`: Added `walkthrough.md` to repository root and upgraded actions to v7 (`actions/checkout@v7`, `actions/setup-node@v7`).
  - `efad1e3`: Added functional assertions for demo ingestion, financial exports, PDF tools, and Object URL registry lifecycle.
  - `e49b484`: Added `--disable-dev-shm-usage` and CDP timeout expansion for Linux CI runner stability.
  - `f459c44`: Synchronized walkthrough with 12-suite assertions.
- **Pushed Branches**: `origin/main` and `origin/master` (both kept strictly in sync)
- **Live Endpoint Verification**:
  - `https://sandeepkumar154.github.io/statement2sheet/` ➔ `HTTP 200 OK`
  - `https://sandeepkumar154.github.io/statement2sheet/robots.txt` ➔ `HTTP 200 OK`
  - `https://sandeepkumar154.github.io/statement2sheet/sitemap.xml` ➔ `HTTP 200 OK`
  - `https://sandeepkumar154.github.io/statement2sheet/manifest.webmanifest` ➔ `HTTP 200 OK`
  - `https://sandeepkumar154.github.io/statement2sheet/sw.js` ➔ `HTTP 200 OK`
  - `https://sandeepkumar154.github.io/statement2sheet/app.js` ➔ `HTTP 200 OK`
  - `https://sandeepkumar154.github.io/statement2sheet/styles.css` ➔ `HTTP 200 OK`
  - `https://sandeepkumar154.github.io/statement2sheet/icon.svg` ➔ `HTTP 200 OK`

---

## 7. Next Milestone: Performance Testing with Large PDFs & Scanned Statements

- **Objectives**:
  - Benchmark client-side parsing speed and RAM consumption across 50-page, 100-page, and 300-page bank statements.
  - Test memory stability during high-resolution multi-page PDF thumbnail rendering.
  - Evaluate Tesseract.js Web Worker background thread offloading to prevent main thread frame drops during heavy OCR passes.

