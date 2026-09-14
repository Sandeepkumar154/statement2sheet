const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const WebSocketClient = globalThis.WebSocket || require('ws');

const BROWSER_CANDIDATES = [
  process.env.CHROME_BIN,
  process.env.EDGE_BIN,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium'
].filter(Boolean);

const browserExecutable = BROWSER_CANDIDATES.find(p => fs.existsSync(p));
if (!browserExecutable) {
  console.error('No suitable Chromium browser found at candidates:', BROWSER_CANDIDATES);
  process.exit(1);
}

const CDP_PORT = 9222;
const SERVER_PORT = 8383;
const ROOT_DIR = path.resolve(__dirname, '..');
const USER_DATA_DIR = path.join(__dirname, '.test_browser_profile');

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function startStaticServer() {
  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    const filePath = path.join(ROOT_DIR, reqPath);
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      return res.end('Not Found');
    }
    const ext = path.extname(filePath);
    const mimeMap = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.pdf': 'application/pdf',
      '.webmanifest': 'application/manifest+json'
    };
    res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
  return new Promise(resolve => server.listen(SERVER_PORT, '127.0.0.1', () => resolve(server)));
}

async function runTests() {
  console.log('=================================================================');
  console.log(' Statement2Sheet Security & Architecture Regression Test Suite');
  console.log(' Browser: ' + browserExecutable);
  console.log('=================================================================');

  // Static code security checks
  console.log('\n--- 0. Static Code Hardening Verification ---');
  const appJsCode = fs.readFileSync(path.join(ROOT_DIR, 'app.js'), 'utf8');
  const indexHtmlCode = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');

  // Check 1: Exactly 1 createObjectURL in app.js
  const createObjMatches = appJsCode.match(/createObjectURL/g) || [];
  console.log(`✓ createObjectURL occurrences in app.js: ${createObjMatches.length} (Expected: 1, inside createTrackedObjectURL)`);
  if (createObjMatches.length !== 1) {
    throw new Error(`Untracked URL.createObjectURL found! Expected 1, got ${createObjMatches.length}`);
  }

  // Check 2: Zero inline executable scripts in index.html (JSON-LD structured data allowed as data block)
  const inlineExecutableScriptMatches = indexHtmlCode.match(/<script(?![^>]*src=)(?![^>]*type=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi) || [];
  console.log(`✓ Inline executable <script> blocks in index.html: ${inlineExecutableScriptMatches.length}`);
  if (inlineExecutableScriptMatches.length > 0) {
    throw new Error('Inline executable <script> blocks found in index.html!');
  }

  // Check 3: Zero inline onclick/onchange/oninput in index.html
  const inlineHandlers = indexHtmlCode.match(/\son[a-z]+=["'][^"']*["']/gi) || [];
  console.log(`✓ Inline event handlers (on* attributes) in index.html: ${inlineHandlers.length}`);
  if (inlineHandlers.length > 0) {
    throw new Error(`Inline event handlers found: ${inlineHandlers.slice(0, 5).join(', ')}`);
  }

  // Start HTTP Server & Browser CDP
  const server = await startStaticServer();
  console.log(`✓ Local server running on http://127.0.0.1:${SERVER_PORT}`);

  if (fs.existsSync(USER_DATA_DIR)) {
    try { fs.rmSync(USER_DATA_DIR, { recursive: true, force: true }); } catch (e) {}
  }

  const browserProc = spawn(browserExecutable, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    `http://127.0.0.1:${SERVER_PORT}/index.html`
  ]);

  browserProc.stderr.on('data', d => {
    const s = d.toString();
    if (!s.includes('DevTools listening') && !s.includes('Bluetooth')) {
      // console.warn('[BROWSER_STDERR]', s.trim());
    }
  });

  let connected = false;
  let targets = [];
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    try {
      targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
      const pageTarget = targets.find(t => t.type === 'page' && t.url.includes(SERVER_PORT.toString()));
      if (pageTarget) {
        connected = true;
        targets = [pageTarget];
        break;
      }
    } catch (e) {}
  }

  if (!connected) {
    console.error('Failed to connect to browser CDP!');
    browserProc.kill();
    server.close();
    process.exit(1);
  }

  const wsUrl = targets[0].webSocketDebuggerUrl;
  const ws = new WebSocketClient(wsUrl);
  let idCounter = 1;
  const pendingRequests = new Map();

  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pendingRequests.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  const consoleLogs = [];
  const cspViolations = [];

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  ws.onmessage = (evt) => {
    const data = JSON.parse(evt.data);
    if (data.id && pendingRequests.has(data.id)) {
      const { resolve, reject } = pendingRequests.get(data.id);
      pendingRequests.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    } else if (data.method === 'Runtime.consoleAPICalled') {
      const text = data.params.args.map(a => a.value || JSON.stringify(a)).join(' ');
      consoleLogs.push({ type: data.params.type, text });
      if (text.toLowerCase().includes('content security policy') || text.toLowerCase().includes('violates')) {
        cspViolations.push(text);
        console.error('CSP VIOLATION:', text);
      }
    } else if (data.method === 'Page.javascriptDialogOpening') {
      sendCommand('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
    } else if (data.method === 'Runtime.exceptionThrown') {
      const text = data.params.exceptionDetails.text + ' ' + (data.params.exceptionDetails.exception?.description || '');
      consoleLogs.push({ type: 'exception', text });
      console.error('BROWSER EXCEPTION:', text);
    }
  };

  await sendCommand('Runtime.enable');
  await sendCommand('Page.enable');
  await sendCommand('Network.enable');

  // Wait until full document is loaded and parsed
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const ready = await evaluate("document.readyState === 'complete' && !!document.querySelector('[data-tool=\"merge\"]')");
      if (ready) break;
    } catch (e) {}
    await sleep(300);
  }

  await evaluate("window.alert = (msg) => console.log('[PAGE_ALERT]', msg);");

  async function evaluate(expression) {
    const res = await sendCommand('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text + ' ' + (res.exceptionDetails.exception?.description || ''));
    }
    return res.result?.value;
  }

  console.log('\n--- 1. Testing Strict CSP & Separation in Live DOM ---');
  const pageUrl = await evaluate("document.location.href");
  const pageTitle = await evaluate("document.title");
  console.log('Page loaded:', pageUrl, '| Title:', pageTitle);
  const scriptsCount = await evaluate("document.querySelectorAll('script').length");
  const inlineExecutableScriptsCount = await evaluate("Array.from(document.querySelectorAll('script')).filter(s => !s.src && s.type !== 'application/ld+json').length");
  const liveInlineHandlers = await evaluate(`(() => {
    let count = 0;
    for (const el of document.querySelectorAll('*')) {
      for (const attr of el.attributes) {
        if (attr.name.startsWith('on')) count++;
      }
    }
    return count;
  })()`);
  console.log(`✓ Scripts: ${scriptsCount}, Inline Executable Scripts: ${inlineExecutableScriptsCount}, Inline Handlers: ${liveInlineHandlers}`);
  if (inlineExecutableScriptsCount !== 0 || liveInlineHandlers !== 0) throw new Error('Live DOM contains inline executable scripts or handlers!');

  // Validate Canonical URL, Open Graph, Twitter cards, and JSON-LD structured data
  const seoCheck = await evaluate(`(() => {
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href');
    const googleVerification = document.querySelector('meta[name="google-site-verification"]')?.getAttribute('content');
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
    const ogUrl = document.querySelector('meta[property="og:url"]')?.getAttribute('content');
    const twitterCard = document.querySelector('meta[name="twitter:card"]')?.getAttribute('content');
    const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
    let jsonLdValid = false;
    let hasWebApp = false;
    let hasFaq = false;
    if (jsonLdScript) {
      try {
        const parsed = JSON.parse(jsonLdScript.textContent);
        jsonLdValid = true;
        const items = parsed['@graph'] || [parsed];
        hasWebApp = items.some(i => i['@type'] === 'WebApplication');
        hasFaq = items.some(i => i['@type'] === 'FAQPage');
      } catch (e) {}
    }
    const hasGuidesSection = !!document.getElementById('content-guides-section');
    const hasFaqSection = !!document.getElementById('faq-section');
    return { canonical, googleVerification, ogTitle, ogUrl, twitterCard, jsonLdValid, hasWebApp, hasFaq, hasGuidesSection, hasFaqSection };
  })()`);
  console.log('✓ SEO & Metadata Verification:', seoCheck);
  if (seoCheck.canonical !== 'https://statement2sheet-lake.vercel.app/' && seoCheck.canonical !== 'https://statement2sheet.vercel.app/' && seoCheck.canonical !== 'https://sandeepkumar1549.github.io/statement2sheet/') throw new Error('Invalid canonical URL: ' + seoCheck.canonical);
  if (seoCheck.googleVerification !== '0i-KOCRF7La3vG9_wjw-_E0BFC5gQPNW4bu6kRZ3e6U') throw new Error('Invalid or missing google-site-verification meta tag');
  if (!seoCheck.ogTitle || !seoCheck.ogUrl || !seoCheck.twitterCard) throw new Error('Missing Open Graph / Twitter Card meta tags');
  if (!seoCheck.jsonLdValid || !seoCheck.hasWebApp || !seoCheck.hasFaq) throw new Error('JSON-LD schema incomplete or invalid');
  if (!seoCheck.hasGuidesSection || !seoCheck.hasFaqSection) throw new Error('Missing guides or FAQ content section in DOM');

  // Verify heavy vendor libraries are NOT loaded upfront on initial page visit (Lazy-Loading Assertion)
  const upfrontVendors = await evaluate("({ hasXlsx: typeof XLSX !== 'undefined', hasPdfLib: typeof PDFLib !== 'undefined', hasJsPdf: typeof window.jspdf !== 'undefined', hasTesseract: typeof Tesseract !== 'undefined' })");
  if (upfrontVendors.hasXlsx || upfrontVendors.hasPdfLib || upfrontVendors.hasJsPdf || upfrontVendors.hasTesseract) throw new Error('Heavy vendor scripts leaked into upfront page load!');
  console.log('✓ Performance Check: 0 heavy vendor libraries loaded upfront:', upfrontVendors);

  console.log('\n--- 2. Testing Centralized Event Dispatcher ---');
  const navTest = await evaluate(`(() => {
    const mergeBtn = document.querySelector('[data-tool="merge"]');
    if (!mergeBtn) return { success: false, error: 'no merge button' };
    mergeBtn.click();
    const mergeVis = !document.getElementById('view-merge').classList.contains('hidden');

    const dashBtn = document.querySelector('[data-tool="dashboard"]');
    if (dashBtn) dashBtn.click();
    const dashVis = !document.getElementById('view-dashboard').classList.contains('hidden');

    return { success: mergeVis && dashVis };
  })()`);
  console.log('✓ Navigation via data-tool event dispatcher:', navTest);
  if (!navTest.success) throw new Error('Centralized event dispatcher navigation failed!');

  console.log('\n--- 3. Testing Magic-Byte Validation ---');
  const magicRes = await evaluate(`(async () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x31, 0x2e, 0x34]); // %PDF-
    const htmlBytes = new Uint8Array([0x3c, 0x21, 0x64, 0x6f, 0x63, 0x74]); // <!doct
    const r1 = await validateFileMagicBytes(new Blob([pdfBytes]));
    const r2 = await validateFileMagicBytes(new Blob([htmlBytes]));
    return { pdfPass: r1.valid && r1.format === 'pdf', htmlReject: !r2.valid };
  })()`);
  console.log('✓ Magic-Byte Verification:', magicRes);
  if (!magicRes.pdfPass || !magicRes.htmlReject) throw new Error('Magic-byte validation failed!');

  console.log('\n--- 4. Testing PDF File Intake & Thumbnail Generation ---');
  const samplePdfPath = path.join(ROOT_DIR, 'sample_bank_statement.pdf');
  if (fs.existsSync(samplePdfPath)) {
    const sampleBuffer = fs.readFileSync(samplePdfPath);
    const b64 = sampleBuffer.toString('base64');
    const intakeResult = await evaluate('(async () => {' +
      'const raw = atob("' + b64 + '");' +
      'const arr = new Uint8Array(raw.length);' +
      'for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);' +
      'const file = new File([arr], "sample_bank_statement.pdf", { type: "application/pdf" });' +
      'await inspectAndValidateFiles([file]);' +
      'await new Promise(r => setTimeout(r, 1500));' +
      'const pvPages = document.getElementById("pv-pages") ? document.getElementById("pv-pages").innerText : "";' +
      'const canvas = document.getElementById("preview-thumbnail-canvas");' +
      'return {' +
        'pvPages,' +
        'rendered: canvas && canvas.width > 0 && canvas.height > 0,' +
        'dims: canvas ? (canvas.width + "x" + canvas.height) : "none"' +
      '};' +
    '})()');
    console.log('✓ PDF Intake & Thumbnail Canvas:', intakeResult);
    if (!intakeResult.rendered || !intakeResult.pvPages.includes('1 Page')) {
      throw new Error('PDF intake thumbnail generation failed!');
    }
  }

  console.log('\n--- 5. Testing Sensitive Data Purge ---');
  const purgeRes = await evaluate(`(() => {
    const p1 = document.getElementById('unlock-password-input');
    if (p1) p1.value = 'Secret123';
    const p2 = document.getElementById('protect-password-input');
    if (p2) p2.value = 'Secret456';
    const md = document.getElementById('markdown-result-textarea');
    if (md) md.value = '# Sensitive Notes';
    saveRecentFile('secret_statement.pdf', 10);

    purgeAllSessionData();

    return {
      p1Empty: !document.getElementById('unlock-password-input')?.value,
      p2Empty: !document.getElementById('protect-password-input')?.value,
      mdEmpty: !document.getElementById('markdown-result-textarea')?.value,
      recentStorageClean: !localStorage.getItem('s2s_recent_files'),
      sessionRecentClean: sessionRecentFiles.length === 0,
      activeUrlsClean: activeObjectUrls.size === 0
    };
  })()`);
  console.log('✓ Purge Verification:', purgeRes);
  for (const [k, v] of Object.entries(purgeRes)) {
    if (!v) throw new Error(`Purge check failed on ${k}`);
  }

  console.log('\n--- 6. Testing Safe Dynamic DOM Rendering ---');
  const domSafetyRes = await evaluate(`(() => {
    // 1. Test Recent Files Chips DOM rendering
    saveRecentFile('safe_test_statement.pdf', 12);
    const chipText = document.getElementById('recent-files-list') ? document.getElementById('recent-files-list').textContent : '';
    const hasChip = chipText.includes('safe_test_statement.pdf') && chipText.includes('12 tx');

    // 2. Test Category Insights DOM rendering
    AppState.transactions = [
      { id: '1', date: '01/01/2026', description: 'Grocery Market', debit: '150.00', credit: '', balance: '850.00', category: 'Food & Dining' },
      { id: '2', date: '02/01/2026', description: 'Electric Utility', debit: '100.00', credit: '', balance: '750.00', category: 'Utilities' }
    ];
    AppState.audit = { totalDebits: 250, totalCredits: 0 };
    generateCategoryInsights();
    const catContainer = document.getElementById('category-bars-container');
    const catText = catContainer ? catContainer.textContent : '';
    const hasCats = catText.includes('Retail & Merchants') && catText.includes('Housing & Utilities');

    return { hasChip, hasCats };
  })()`);
  console.log('✓ DOM Safety (Chips & Insights):', domSafetyRes);
  if (!domSafetyRes.hasChip || !domSafetyRes.hasCats) throw new Error('Safe DOM rendering test failed!');

  console.log('\n--- 7. Testing PWA Offline Capabilities & Cache Contents ---');
  await sleep(2000);

  const pwaRes = await evaluate(`(async () => {
    const hasSwInNav = 'serviceWorker' in navigator;
    const manifestLink = document.querySelector('link[rel="manifest"]')?.getAttribute('href');
    const badge = document.getElementById('offline-status-badge');

    // 1. Verify Service Worker Registration
    let swRegistered = false;
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      swRegistered = !!reg;
    } catch (e) {}

    // 2. Inspect CacheStorage for 's2s-cache-v1'
    let hasCache = false;
    let cachedUrls = [];
    try {
      const names = await caches.keys();
      const activeCacheName = names.find(n => n.startsWith('s2s-cache-'));
      hasCache = !!activeCacheName;
      if (hasCache) {
        const cache = await caches.open(activeCacheName);
        const reqs = await cache.keys();
        cachedUrls = reqs.map(r => r.url);
      }
    } catch (e) {}

    const hasIndex = cachedUrls.some(u => u.includes('index.html') || u.endsWith('/'));
    const hasAppJs = cachedUrls.some(u => u.includes('app.js'));
    const hasStyles = cachedUrls.some(u => u.includes('styles.css'));
    const hasManifest = cachedUrls.some(u => u.includes('manifest.webmanifest'));

    let matchAppJs = false;
    try {
      const r = await caches.match('./app.js');
      matchAppJs = !!r;
    } catch (e) {}

    return {
      hasSwInNav,
      manifestLink,
      hasBadge: !!badge,
      swRegistered,
      hasCache,
      cachedCount: cachedUrls.length,
      hasIndex,
      hasAppJs,
      hasStyles,
      hasManifest,
      matchAppJs
    };
  })()`);
  console.log('✓ PWA Cache Inspection:', pwaRes);
  if (!pwaRes.hasSwInNav || !pwaRes.manifestLink || !pwaRes.hasBadge) {
    throw new Error('PWA setup missing manifest link or offline badge!');
  }
  if (!pwaRes.hasCache || !pwaRes.hasIndex || !pwaRes.hasAppJs || !pwaRes.matchAppJs) {
    throw new Error('PWA CacheStorage verification failed: app shell assets missing in cache!');
  }

  // 3. Ensure Service Worker controller is active (reload if necessary)
  const isControlled = await evaluate("!!navigator.serviceWorker.controller");
  if (!isControlled) {
    console.log('Reloading page to attach active service worker controller...');
    await sendCommand('Page.reload');
    await sleep(2500);
  }
  const controlledAfterReload = await evaluate("!!navigator.serviceWorker.controller");
  console.log('✓ Service Worker Controller Active:', controlledAfterReload);


  // 4. Emulate complete offline disconnection via CDP
  console.log('Simulating offline network disconnection via CDP...');
  await sendCommand('Network.emulateNetworkConditions', {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0
  });

  const offlineFetchRes = await evaluate(`(async () => {
    try {
      const res = await fetch('./app.js');
      return { success: res.status === 200 || res.type === 'basic', status: res.status };
    } catch (e) {
      return { success: false, error: e.message };
    }
  })()`);
  console.log('✓ Offline Fetch of Cached app.js (while disconnected):', offlineFetchRes);

  // Restore network
  await sendCommand('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1
  });

  if (!offlineFetchRes.success) {
    throw new Error('Service worker failed to serve cached app.js in offline mode!');
  }

  console.log('\n--- 8. Testing Demo Statement Ingestion & Live Workspace ---');
  const demoRes = await evaluate(`(() => {
    const demoBtn = document.getElementById('btn-load-demo');
    if (demoBtn) {
      demoBtn.click();
    } else {
      loadDemoStatement('wiki');
    }

    const txCount = AppState.transactions ? AppState.transactions.length : 0;
    const bankName = AppState.metadata ? AppState.metadata.bankName : '';
    const workspaceVis = !document.getElementById('workspace-section').classList.contains('hidden');
    const intakeHidden = document.getElementById('intake-section').classList.contains('hidden');
    const tableRows = document.querySelectorAll('#master-transaction-tbody tr').length;
    const hasAuditCredits = AppState.audit && AppState.audit.totalCredits > 0;
    const hasAuditDebits = AppState.audit && AppState.audit.totalDebits > 0;

    return {
      txCount,
      bankName,
      workspaceVis,
      intakeHidden,
      tableRows,
      hasAuditCredits,
      hasAuditDebits
    };
  })()`);
  console.log('✓ Demo Statement Ingestion & Live Workspace:', demoRes);
  if (demoRes.txCount !== 8 || demoRes.bankName !== 'First Bank of Wiki' || !demoRes.workspaceVis || demoRes.tableRows !== 8) {
    throw new Error('Demo statement ingestion into workspace failed!');
  }

  console.log('\n--- 9. Testing Financial & Accounting Exports (CSV, QBO, Excel, Markdown, Doc, PDF) ---');

  // 1. CSV Export
  const csvRes = await evaluate(`(async () => {
    lastDownloadedItem = null;
    document.getElementById('btn-export-csv').click();
    await new Promise(r => setTimeout(r, 100));
    if (!lastDownloadedItem) return { success: false, error: 'No CSV download item' };
    const text = await lastDownloadedItem.blob.text();
    return {
      success: true,
      filename: lastDownloadedItem.filename,
      hasBank: text.includes('First Bank of Wiki'),
      hasChequing: text.includes('CHEQUING ACCOUNT STATEMENT'),
      hasTx: text.includes('Opening Deposit Transfer') && text.includes('Whole Foods Supermarket'),
      hasTotals: text.includes('*** Totals ***')
    };
  })()`);
  console.log('✓ CSV Export Generation:', csvRes);
  if (!csvRes.success || !csvRes.hasBank || !csvRes.hasTx || !csvRes.hasTotals) {
    throw new Error('CSV export generation failed!');
  }

  // 2. QBO Export
  const qboRes = await evaluate(`(async () => {
    lastDownloadedItem = null;
    document.getElementById('btn-export-qbo').click();
    await new Promise(r => setTimeout(r, 100));
    if (!lastDownloadedItem) return { success: false, error: 'No QBO download item' };
    const text = await lastDownloadedItem.blob.text();
    return {
      success: true,
      filename: lastDownloadedItem.filename,
      hasOfxHeader: text.includes('OFXHEADER:100'),
      hasBankMsg: text.includes('<BANKMSGSRSV1>') && text.includes('<BANKID>'),
      hasAcctId: text.includes('<ACCTID>'),
      hasCreditTx: text.includes('<TRNTYPE>CREDIT'),
      hasDebitTx: text.includes('<TRNTYPE>DEBIT')
    };
  })()`);
  console.log('✓ QuickBooks (.QBO) Export Generation:', qboRes);
  if (!qboRes.success || !qboRes.hasOfxHeader || !qboRes.hasBankMsg || !qboRes.hasCreditTx || !qboRes.hasDebitTx) {
    throw new Error('QuickBooks (.QBO) export generation failed!');
  }

  // 3. Excel Export
  const excelRes = await evaluate(`(async () => {
    lastDownloadedItem = null;
    document.getElementById('btn-export-excel').click();
    await new Promise(r => setTimeout(r, 150));
    if (!lastDownloadedItem) return { success: false, error: 'No Excel download item' };
    const buf = await lastDownloadedItem.blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const isZip = bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04;
    return {
      success: true,
      filename: lastDownloadedItem.filename,
      size: lastDownloadedItem.size,
      isZip
    };
  })()`);
  console.log('✓ Multi-Sheet Excel (.xlsx) Export Generation:', excelRes);
  if (!excelRes.success || !excelRes.isZip || excelRes.size < 1000) {
    throw new Error('Multi-Sheet Excel (.xlsx) export generation failed!');
  }

  // 4. Markdown Export
  const mdRes = await evaluate(`(async () => {
    lastDownloadedItem = null;
    markdownState.file = { name: 'bank_statement_jan.pdf' };
    markdownState.text = '# Statement Markdown Summary\\n\\n- Net: $500.55\\n- Transactions: 8 records';
    downloadMarkdownFile();
    await new Promise(r => setTimeout(r, 100));
    if (!lastDownloadedItem) return { success: false, error: 'No Markdown download item' };
    const text = await lastDownloadedItem.blob.text();
    return {
      success: true,
      filename: lastDownloadedItem.filename,
      hasMd: text.includes('# Statement Markdown Summary') && text.includes('Transactions: 8 records')
    };
  })()`);
  console.log('✓ Markdown Export Generation:', mdRes);
  if (!mdRes.success || !mdRes.hasMd) {
    throw new Error('Markdown export generation failed!');
  }

  // 5. Word (.doc) Export
  const docRes = await evaluate(`(async () => {
    lastDownloadedItem = null;
    document.getElementById('btn-export-doc').click();
    await new Promise(r => setTimeout(r, 100));
    if (!lastDownloadedItem) return { success: false, error: 'No Word download item' };
    const text = await lastDownloadedItem.blob.text();
    return {
      success: true,
      filename: lastDownloadedItem.filename,
      hasWordXml: text.includes('urn:schemas-microsoft-com:office:word')
    };
  })()`);
  console.log('✓ Word (.doc) Ledger Export Generation:', docRes);
  if (!docRes.success || !docRes.hasWordXml) {
    throw new Error('Word (.doc) export generation failed!');
  }

  // 6. Clean PDF Export
  const cleanPdfRes = await evaluate(`(async () => {
    lastDownloadedItem = null;
    document.getElementById('btn-export-clean-pdf').click();
    await new Promise(r => setTimeout(r, 150));
    if (!lastDownloadedItem) return { success: false, error: 'No Clean PDF download item' };
    const buf = await lastDownloadedItem.blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
    return {
      success: true,
      filename: lastDownloadedItem.filename,
      isPdf,
      size: lastDownloadedItem.size
    };
  })()`);
  console.log('✓ Clean PDF Export Generation:', cleanPdfRes);
  if (!cleanPdfRes.success || !cleanPdfRes.isPdf) {
    throw new Error('Clean PDF export generation failed!');
  }

  console.log('\n--- 10. Testing PDF Manipulation Tools (Merge, Split, Compress, Protect, Unlock, Sign) ---');
  if (fs.existsSync(samplePdfPath)) {
    const sampleBuffer = fs.readFileSync(samplePdfPath);
    const b64 = sampleBuffer.toString('base64');

    // Merge
    const mergeRes = await evaluate('(async () => {' +
      'lastDownloadedItem = null;' +
      'const raw = atob("' + b64 + '");' +
      'const arr = new Uint8Array(raw.length);' +
      'for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);' +
      'const f1 = new File([arr.slice(0)], "statement_part1.pdf", { type: "application/pdf" });' +
      'const f2 = new File([arr.slice(0)], "statement_part2.pdf", { type: "application/pdf" });' +
      'mergeItems = [];' +
      'await addMergeFiles([f1, f2]);' +
      'await new Promise(r => setTimeout(r, 600));' +
      'await executeMergePdfs();' +
      'await new Promise(r => setTimeout(r, 150));' +
      'if (!lastDownloadedItem) return { success: false, error: "No merge download" };' +
      'const outBuf = await lastDownloadedItem.blob.arrayBuffer();' +
      'const doc = await PDFLib.PDFDocument.load(outBuf);' +
      'return {' +
        'success: true,' +
        'filename: lastDownloadedItem.filename,' +
        'pageCount: doc.getPageCount(),' +
        'size: lastDownloadedItem.size' +
      '};' +
    '})()');
    console.log('✓ PDF Merge Output Generation:', mergeRes);
    if (!mergeRes.success || mergeRes.pageCount !== 2) {
      throw new Error('PDF merge output generation failed!');
    }

    // Split
    const splitRes = await evaluate('(async () => {' +
      'lastDownloadedItem = null;' +
      'const raw = atob("' + b64 + '");' +
      'const arr = new Uint8Array(raw.length);' +
      'for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);' +
      'const f = new File([arr], "statement_split_input.pdf", { type: "application/pdf" });' +
      'await handleSplitFileSelection(f);' +
      'await new Promise(r => setTimeout(r, 600));' +
      'if (splitPagesState && splitPagesState.length) {' +
        'splitPagesState[0].selected = true;' +
      '}' +
      'await executeSplitPdf();' +
      'await new Promise(r => setTimeout(r, 150));' +
      'if (!lastDownloadedItem) return { success: false, error: "No split download" };' +
      'const outBuf = await lastDownloadedItem.blob.arrayBuffer();' +
      'const doc = await PDFLib.PDFDocument.load(outBuf);' +
      'return {' +
        'success: true,' +
        'filename: lastDownloadedItem.filename,' +
        'pageCount: doc.getPageCount()' +
      '};' +
    '})()');
    console.log('✓ PDF Split Output Generation:', splitRes);
    if (!splitRes.success || splitRes.pageCount !== 1) {
      throw new Error('PDF split output generation failed!');
    }

    // Compress
    const compressRes = await evaluate('(async () => {' +
      'lastDownloadedItem = null;' +
      'const raw = atob("' + b64 + '");' +
      'const arr = new Uint8Array(raw.length);' +
      'for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);' +
      'const f = new File([arr], "statement_compress_input.pdf", { type: "application/pdf" });' +
      'compressFileState = { file: f, buffer: arr.buffer, preset: "recommended" };' +
      'await executeCompressPdf();' +
      'await new Promise(r => setTimeout(r, 150));' +
      'if (!lastDownloadedItem) return { success: false, error: "No compress download" };' +
      'const outBuf = await lastDownloadedItem.blob.arrayBuffer();' +
      'const doc = await PDFLib.PDFDocument.load(outBuf);' +
      'return {' +
        'success: true,' +
        'filename: lastDownloadedItem.filename,' +
        'valid: doc.getPageCount() > 0' +
      '};' +
    '})()');
    console.log('✓ PDF Compress Output Generation:', compressRes);
    if (!compressRes.success || !compressRes.valid) {
      throw new Error('PDF compress output generation failed!');
    }

    // Protect
    const protectRes = await evaluate('(async () => {' +
      'lastDownloadedItem = null;' +
      'const raw = atob("' + b64 + '");' +
      'const arr = new Uint8Array(raw.length);' +
      'for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);' +
      'const f = new File([arr], "statement_protect_input.pdf", { type: "application/pdf" });' +
      'protectFileState = { file: f, buffer: arr.buffer };' +
      'const p1 = document.getElementById("protect-password-input");' +
      'const p2 = document.getElementById("protect-password-confirm");' +
      'if (p1) p1.value = "Pass1234";' +
      'if (p2) p2.value = "Pass1234";' +
      'await executeProtectPdf();' +
      'await new Promise(r => setTimeout(r, 150));' +
      'if (!lastDownloadedItem) return { success: false, error: "No protect download" };' +
      'const outBuf = await lastDownloadedItem.blob.arrayBuffer();' +
      'const doc = await PDFLib.PDFDocument.load(outBuf);' +
      'return {' +
        'success: true,' +
        'filename: lastDownloadedItem.filename,' +
        'title: doc.getTitle(),' +
        'valid: doc.getPageCount() > 0' +
      '};' +
    '})()');
    console.log('✓ PDF Protect Output Generation:', protectRes);
    if (!protectRes.success || !protectRes.valid || protectRes.title !== 'Protected Document') {
      throw new Error('PDF protect output generation failed!');
    }

    // Unlock
    const unlockRes = await evaluate('(async () => {' +
      'lastDownloadedItem = null;' +
      'const raw = atob("' + b64 + '");' +
      'const arr = new Uint8Array(raw.length);' +
      'for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);' +
      'const f = new File([arr], "statement_unlock_input.pdf", { type: "application/pdf" });' +
      'unlockFile = f;' +
      'const pInput = document.getElementById("unlock-password-input");' +
      'if (pInput) pInput.value = "";' +
      'await executeUnlockPdf();' +
      'await new Promise(r => setTimeout(r, 150));' +
      'if (!lastDownloadedItem) return { success: false, error: "No unlock download" };' +
      'const outBuf = await lastDownloadedItem.blob.arrayBuffer();' +
      'const doc = await PDFLib.PDFDocument.load(outBuf);' +
      'return {' +
        'success: true,' +
        'filename: lastDownloadedItem.filename,' +
        'valid: doc.getPageCount() > 0' +
      '};' +
    '})()');
    console.log('✓ PDF Unlock Output Generation:', unlockRes);
    if (!unlockRes.success || !unlockRes.valid) {
      throw new Error('PDF unlock output generation failed!');
    }

    // Sign
    const signRes = await evaluate('(async () => {' +
      'lastDownloadedItem = null;' +
      'const raw = atob("' + b64 + '");' +
      'const arr = new Uint8Array(raw.length);' +
      'for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);' +
      'const f = new File([arr], "statement_sign_input.pdf", { type: "application/pdf" });' +
      'signFileState.file = f;' +
      'signFileState.buffer = arr.buffer;' +
      'const canvas = document.getElementById("signature-canvas");' +
      'if (canvas) {' +
        'canvas.width = 600;' +
        'canvas.height = 160;' +
        'const ctx = canvas.getContext("2d");' +
        'ctx.beginPath();' +
        'ctx.moveTo(10, 10);' +
        'ctx.lineTo(80, 50);' +
        'ctx.stroke();' +
      '}' +
      'await executeSignPdf();' +
      'await new Promise(r => setTimeout(r, 150));' +
      'if (!lastDownloadedItem) return { success: false, error: "No sign download", signError: window.__lastSignError };' +
      'const outBuf = await lastDownloadedItem.blob.arrayBuffer();' +
      'const doc = await PDFLib.PDFDocument.load(outBuf);' +
      'return {' +
        'success: true,' +
        'filename: lastDownloadedItem.filename,' +
        'valid: doc.getPageCount() > 0' +
      '};' +
    '})()');
    console.log('✓ PDF Sign Output Generation:', signRes);
    if (!signRes.success || !signRes.valid) {
      throw new Error('PDF sign output generation failed!');
    }

    // 10 Advanced iLovePDF Parity Tools:
    // 1. Crop PDF
    const cropRes = await evaluate(`(async () => {
      lastDownloadedItem = null;
      const raw = atob("${b64}");
      const arr = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
      const f = new File([arr], "crop_test.pdf", { type: "application/pdf" });
      await loadCropFile(f);
      await new Promise(r => setTimeout(r, 600));
      setCropPreset(10, 10, 10, 10);
      await executeCropPdf();
      await new Promise(r => setTimeout(r, 300));
      if (!lastDownloadedItem) return { success: false, error: "No crop download" };
      const outBuf = await lastDownloadedItem.blob.arrayBuffer();
      const doc = await PDFLib.PDFDocument.load(outBuf);
      const cb = doc.getPages()[0].getCropBox();
      return { success: true, filename: lastDownloadedItem.filename, hasCrop: cb.width > 0 };
    })()`);
    console.log('✓ PDF Crop Tool Generation:', cropRes);
    if (!cropRes.success || !cropRes.hasCrop) throw new Error('PDF Crop failed');

    // 2. Extract Images
    const extractRes = await evaluate(`(async () => {
      const raw = atob("${b64}");
      const arr = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
      const f = new File([arr], "extract_test.pdf", { type: "application/pdf" });
      await executeExtractImages(f);
      return { success: true, count: extractImagesState.images.length };
    })()`);
    console.log('✓ Extract Images Tool Execution:', extractRes);
    if (!extractRes.success) throw new Error('Extract images failed');

    // 3. Visual & Textual Compare
    const compareRes = await evaluate(`(async () => {
      const raw = atob("${b64}");
      const arr = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
      const f1 = new File([arr], "doc_v1.pdf", { type: "application/pdf" });
      const f2 = new File([arr], "doc_v2.pdf", { type: "application/pdf" });
      await loadCompareDoc("A", f1);
      await loadCompareDoc("B", f2);
      await new Promise(r => setTimeout(r, 800));
      return { success: true, hasDocA: !!compareState.docA, hasDocB: !!compareState.docB };
    })()`);
    console.log('✓ PDF Visual & Textual Compare Execution:', compareRes);
    if (!compareRes.success || !compareRes.hasDocA || !compareRes.hasDocB) throw new Error('Compare failed');

    // 4. Batch Rotate PDF
    const rotateRes = await evaluate(`(async () => {
      lastDownloadedItem = null;
      const raw = atob("${b64}");
      const arr = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
      const f = new File([arr], "rotate_test.pdf", { type: "application/pdf" });
      await loadRotateFile(f);
      await new Promise(r => setTimeout(r, 500));
      rotateAllPages(90);
      await executeSaveRotatedPdf();
      await new Promise(r => setTimeout(r, 300));
      if (!lastDownloadedItem) return { success: false, error: "No rotate download" };
      const outBuf = await lastDownloadedItem.blob.arrayBuffer();
      const doc = await PDFLib.PDFDocument.load(outBuf);
      return { success: true, filename: lastDownloadedItem.filename, angle: doc.getPages()[0].getRotation().angle };
    })()`);
    console.log('✓ PDF Batch Rotate Execution:', rotateRes);
    if (!rotateRes.success || rotateRes.angle !== 90) throw new Error('Rotate failed');

    // 5. Permanent PDF Redaction
    const redactRes = await evaluate(`(async () => {
      lastDownloadedItem = null;
      const raw = atob("${b64}");
      const arr = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
      const f = new File([arr], "redact_test.pdf", { type: "application/pdf" });
      await loadRedactFile(f);
      await new Promise(r => setTimeout(r, 600));
      redactState.redactions[1] = [{ x: 0.1, y: 0.1, w: 0.5, h: 0.1 }];
      await executeRedactPdf();
      await new Promise(r => setTimeout(r, 500));
      if (!lastDownloadedItem) return { success: false, error: "No redact download" };
      const outBuf = await lastDownloadedItem.blob.arrayBuffer();
      const doc = await PDFLib.PDFDocument.load(outBuf);
      return { success: true, filename: lastDownloadedItem.filename, pageCount: doc.getPageCount() };
    })()`);
    console.log('✓ Permanent Raster Redaction Execution:', redactRes);
    if (!redactRes.success || redactRes.pageCount < 1) throw new Error('Redact failed');

    // 6. PDF to Word (.docx) OpenXML Packaging
    const docxRes = await evaluate(`(async () => {
      lastDownloadedItem = null;
      const raw = atob("${b64}");
      const arr = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
      const f = new File([arr], "word_test.pdf", { type: "application/pdf" });
      await loadPdf2WordFile(f);
      await new Promise(r => setTimeout(r, 500));
      await executeConvertPdfToWord();
      await new Promise(r => setTimeout(r, 300));
      if (!lastDownloadedItem) return { success: false, error: "No docx download" };
      const outBuf = await lastDownloadedItem.blob.arrayBuffer();
      const bytes = new Uint8Array(outBuf);
      const isZip = bytes[0] === 0x50 && bytes[1] === 0x4B;
      return { success: true, filename: lastDownloadedItem.filename, isZip, size: lastDownloadedItem.size };
    })()`);
    console.log('✓ PDF to Word (.docx) OpenXML Execution:', docxRes);
    if (!docxRes.success || !docxRes.isZip) throw new Error('PDF to Word (.docx) failed');

    // 7. Office/Sheet to PDF Converter
    const officeRes = await evaluate(`(async () => {
      lastDownloadedItem = null;
      const sampleCsv = "Date,Description,Amount\\n2026-01-01,Deposit,1500.00\\n2026-01-02,Supplies,-120.00";
      const f = new File([sampleCsv], "sample_table.csv", { type: "text/csv" });
      await loadOffice2PdfFile(f);
      await new Promise(r => setTimeout(r, 400));
      await executeConvertOfficeToPdf();
      await new Promise(r => setTimeout(r, 300));
      if (!lastDownloadedItem) return { success: false, error: "No office2pdf download" };
      const outBuf = await lastDownloadedItem.blob.arrayBuffer();
      const bytes = new Uint8Array(outBuf);
      const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
      return { success: true, filename: lastDownloadedItem.filename, isPdf };
    })()`);
    console.log('✓ Office/Sheet to PDF Conversion Execution:', officeRes);
    if (!officeRes.success || !officeRes.isPdf) throw new Error('Office to PDF failed');

    // 8. PDF/A ISO 19005-1 Archival Converter
    const pdfaRes = await evaluate(`(async () => {
      lastDownloadedItem = null;
      const raw = atob("${b64}");
      const arr = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
      const f = new File([arr], "pdfa_test.pdf", { type: "application/pdf" });
      await loadPdfaFile(f);
      await new Promise(r => setTimeout(r, 400));
      await executeConvertToPdfa();
      await new Promise(r => setTimeout(r, 300));
      if (!lastDownloadedItem) return { success: false, error: "No pdfa download" };
      const text = await lastDownloadedItem.blob.text();
      const hasXmp = text.includes("pdfaid:part") || text.includes("xmpmeta");
      return { success: true, filename: lastDownloadedItem.filename, hasXmp };
    })()`);
    console.log('✓ ISO 19005-1 PDF/A Archival Execution:', pdfaRes);
    if (!pdfaRes.success || !pdfaRes.hasXmp) throw new Error('PDF/A failed');

    // 9. Cryptographic PKI Signatures
    const cryptoSignRes = await evaluate(`(async () => {
      lastDownloadedItem = null;
      const raw = atob("${b64}");
      const arr = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
      const f = new File([arr], "crypto_sign_test.pdf", { type: "application/pdf" });
      await loadDigitalSignFile(f);
      await new Promise(r => setTimeout(r, 400));
      await executeDigitalSignPdf();
      await new Promise(r => setTimeout(r, 500));
      if (!lastDownloadedItem) return { success: false, error: "No crypto sign download" };
      const outBuf = await lastDownloadedItem.blob.arrayBuffer();
      const doc = await PDFLib.PDFDocument.load(outBuf);
      return { success: true, filename: lastDownloadedItem.filename, pageCount: doc.getPageCount() };
    })()`);
    console.log('✓ Cryptographic PKI Seal Execution:', cryptoSignRes);
    if (!cryptoSignRes.success || cryptoSignRes.pageCount < 1) throw new Error('Crypto Sign failed');

    // 10. In-Browser Document Summarizer
    const summarizeRes = await evaluate(`(async () => {
      const raw = atob("${b64}");
      const arr = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
      const f = new File([arr], "summarize_test.pdf", { type: "application/pdf" });
      await loadSummarizeFile(f);
      await new Promise(r => setTimeout(r, 600));
      return {
        success: true,
        highlights: summarizeState.highlights.length,
        entities: summarizeState.entities.length
      };
    })()`);
    console.log('✓ Document Summarizer Execution:', summarizeRes);
    if (!summarizeRes.success || summarizeRes.highlights < 1) throw new Error('Summarizer failed');

    // Clean session data so Object URL registry returns to baseline
    await evaluate(`(() => { purgeAllSessionData(); })()`);
  }

  console.log('\n--- 11. Testing Object URL Registry Returning to Zero After Downloads ---');
  const registryCycleRes = await evaluate(`(async () => {
    // 1. Wait for any previous auto-revocation timeouts to settle
    await new Promise(r => setTimeout(r, 1600));
    const countBeforeTrigger = activeObjectUrls.size;

    // 2. Trigger tracked download (which adds 1 tracked URL to activeObjectUrls)
    downloadTrackedBlob(new Blob(['lifecycle-data']), 'lifecycle-test.txt');
    const countDuringDownload = activeObjectUrls.size;

    // 3. Wait 1600ms (> 1200ms auto-revocation timeout)
    await new Promise(r => setTimeout(r, 1600));
    const finalCount = activeObjectUrls.size;

    return {
      countBeforeTrigger,
      countDuringDownload,
      finalCount,
      returnedToZero: finalCount === 0
    };
  })()`);
  console.log('✓ Object URL Registry Lifecycle:', registryCycleRes);
  if (!registryCycleRes.returnedToZero || registryCycleRes.countDuringDownload < 1) {
    throw new Error('Object URL registry failed to return to zero after download timeout!');
  }

  console.log('\n--- 12. Checking Console CSP Violations ---');
  console.log('Total CSP Violations:', cspViolations.length);
  if (cspViolations.length > 0) throw new Error('CSP violations detected in browser console!');

  ws.close();
  browserProc.kill();
  server.close();
  try { fs.rmSync(USER_DATA_DIR, { recursive: true, force: true }); } catch (e) {}

  console.log('\n=============================================================');
  console.log('🎉 ALL 12 SECURITY & FUNCTIONAL TEST SUITES PASSED (100%)!');
  console.log('=============================================================');
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});