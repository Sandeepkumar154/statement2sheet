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
  await evaluate(`(async () => {
    if ('serviceWorker' in navigator) {
      try {
        await Promise.race([
          navigator.serviceWorker.ready,
          new Promise(r => setTimeout(r, 4000))
        ]);
      } catch (e) {}
    }
  })()`);

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
    await evaluate(`(async () => {
      if ('serviceWorker' in navigator) {
        try {
          await Promise.race([
            navigator.serviceWorker.ready,
            new Promise(r => setTimeout(r, 4000))
          ]);
        } catch (e) {}
      }
    })()`);
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

    // Protect: Genuinely AES-256 encrypt PDF with password
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
      'await new Promise(r => setTimeout(r, 250));' +
      'if (!lastDownloadedItem) return { success: false, error: "No protect download" };' +
      'const outBuf = await lastDownloadedItem.blob.arrayBuffer();' +
      'const encCheck = await PDFDecrypt.isEncrypted(outBuf);' +
      'let loadRejected = false;' +
      'try {' +
      '  await PDFLib.PDFDocument.load(outBuf);' +
      '} catch (e) {' +
      '  loadRejected = e.message.includes("encrypted");' +
      '}' +
      'return {' +
        'success: true,' +
        'filename: lastDownloadedItem.filename,' +
        'isEncrypted: encCheck.encrypted,' +
        'algorithm: encCheck.algorithm,' +
        'loadRejected' +
      '};' +
    '})()');
    console.log('✓ PDF Protect Output Generation:', protectRes);
    if (!protectRes.success || !protectRes.isEncrypted || !protectRes.loadRejected) {
      throw new Error('PDF protect output generation failed: document is not genuinely encrypted!');
    }

    // Unlock: Test unlocking the genuinely encrypted PDF with real password
    const unlockRes = await evaluate('(async () => {' +
      'const protectedBlob = lastDownloadedItem.blob;' +
      'lastDownloadedItem = null;' +
      'const protectedFile = new File([protectedBlob], "statement_locked.pdf", { type: "application/pdf" });' +
      'unlockFile = protectedFile;' +
      'const pInput = document.getElementById("unlock-password-input");' +
      'const errBox = document.getElementById("unlock-error-box");' +
      'if (pInput) pInput.value = "WrongPass999";' +
      'await executeUnlockPdf();' +
      'await new Promise(r => setTimeout(r, 150));' +
      'const wrongPassFailed = !errBox.classList.contains("hidden") && errBox.innerText.includes("Incorrect password");' +
      'if (pInput) pInput.value = "Pass1234";' +
      'await executeUnlockPdf();' +
      'await new Promise(r => setTimeout(r, 250));' +
      'if (!lastDownloadedItem) return { success: false, error: "No unlock download on correct password" };' +
      'const outBuf = await lastDownloadedItem.blob.arrayBuffer();' +
      'const encCheck = await PDFDecrypt.isEncrypted(outBuf);' +
      'const doc = await PDFLib.PDFDocument.load(outBuf);' +
      'return {' +
        'success: true,' +
        'filename: lastDownloadedItem.filename,' +
        'wrongPassFailed,' +
        'isUnencrypted: !encCheck.encrypted,' +
        'pageCount: doc.getPageCount()' +
      '};' +
    '})()');
    console.log('✓ PDF Unlock Output Generation:', unlockRes);
    if (!unlockRes.success || !unlockRes.wrongPassFailed || !unlockRes.isUnencrypted || unlockRes.pageCount < 1) {
      throw new Error('PDF unlock output generation failed to decrypt encrypted document!');
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

    // 11. Tool 25: Corrupted & Damaged PDF In-Browser Repair
    const repairRes = await evaluate(`(async () => {
      lastDownloadedItem = null;
      const raw = atob("${b64}");
      // Create a corrupted byte array with prepended HTML garbage
      const prependedGarbage = "<html><body>502 Bad Gateway Server Error Proxy Error</body></html>\\n\\n";
      const garbageBytes = new TextEncoder().encode(prependedGarbage);
      const rawBytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) rawBytes[i] = raw.charCodeAt(i);

      const corruptBuffer = new Uint8Array(garbageBytes.length + rawBytes.length);
      corruptBuffer.set(garbageBytes, 0);
      corruptBuffer.set(rawBytes, garbageBytes.length);

      const f = new File([corruptBuffer], "corrupt_damaged_test.pdf", { type: "application/pdf" });
      await loadRepairFile(f);
      await new Promise(r => setTimeout(r, 400));
      await executeRepairPdf();
      await new Promise(r => setTimeout(r, 1000));

      if (!lastDownloadedItem) {
        const box = document.getElementById('repair-log-box');
        return { success: false, error: "No repair download", log: box ? box.innerText : '' };
      }
      const outBuf = await lastDownloadedItem.blob.arrayBuffer();
      const repairedDoc = await PDFLib.PDFDocument.load(outBuf);
      return {
        success: true,
        filename: lastDownloadedItem.filename,
        pageCount: repairedDoc.getPageCount(),
        size: outBuf.byteLength
      };
    })()`);
    console.log('✓ Corrupt PDF In-Browser Recovery Execution:', repairRes);
    if (!repairRes.success || repairRes.pageCount < 1) throw new Error('PDF Repair failed: ' + (repairRes.log || repairRes.error));

    // 12. Batch Queues with Multi-file ZIP Packing
    const batchRes = await evaluate(`(async () => {
      lastDownloadedItem = null;
      const raw = atob("${b64}");
      const arr1 = new Uint8Array(raw.length);
      const arr2 = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) {
        arr1[i] = raw.charCodeAt(i);
        arr2[i] = raw.charCodeAt(i);
      }
      const f1 = new File([arr1], "batch_doc_1.pdf", { type: "application/pdf" });
      const f2 = new File([arr2], "batch_doc_2.pdf", { type: "application/pdf" });
      await handleBatchRotateFiles([f1, f2]);
      await new Promise(r => setTimeout(r, 500));
      await executeBatchRotateZip();
      await new Promise(r => setTimeout(r, 800));

      if (!lastDownloadedItem) return { success: false, error: "No batch zip download" };
      const outBuf = await lastDownloadedItem.blob.arrayBuffer();
      const bytes = new Uint8Array(outBuf);
      const isZip = bytes[0] === 0x50 && bytes[1] === 0x4B; // PK magic bytes
      return {
        success: true,
        filename: lastDownloadedItem.filename,
        isZip,
        size: outBuf.byteLength
      };
    })()`);
    console.log('✓ Multi-File Batch Queue & ZIP Bundling:', batchRes);
    if (!batchRes.success || !batchRes.isZip) throw new Error('Batch ZIP generation failed');

    // 13. OpenXML Native Table Grid Detection
    const tableDetectRes = await evaluate(`(() => {
      const sampleLines = [
        "Description              Quantity    Price       Total",
        "Cloud Storage Subscription      1        $50.00      $50.00",
        "Domain Registration             2        $15.00      $30.00",
        "This is a standalone paragraph at the bottom of the invoice."
      ];
      const blocks = detectContentBlocks(sampleLines);
      const tblBlock = blocks.find(b => b.type === 'table');
      const pBlock = blocks.find(b => b.type === 'paragraph');
      const tableXml = tblBlock ? formatOpenXmlTable(tblBlock.rows) : '';
      return {
        hasTableBlock: !!tblBlock,
        rowCount: tblBlock ? tblBlock.rows.length : 0,
        hasParagraphBlock: !!pBlock,
        hasTblTags: tableXml.includes('<w:tbl>') && tableXml.includes('<w:tc>')
      };
    })()`);
    console.log('✓ PDF to Word OpenXML Table Grid Detection:', tableDetectRes);
    if (!tableDetectRes.hasTableBlock || !tableDetectRes.hasTblTags) throw new Error('OpenXML table detection failed');

    // 14. Multi-Language i18n Switching
    const i18nRes = await evaluate(`(() => {
      applyLanguage('es');
      const esMerge = document.querySelector('[data-i18n="nav_merge"]').textContent;
      applyLanguage('fr');
      const frMerge = document.querySelector('[data-i18n="nav_merge"]').textContent;
      applyLanguage('hi');
      const hiMerge = document.querySelector('[data-i18n="nav_merge"]').textContent;
      applyLanguage('en');
      const enMerge = document.querySelector('[data-i18n="nav_merge"]').textContent;
      return {
        esMerge,
        frMerge,
        hiMerge,
        enMerge,
        valid: esMerge === 'Unir PDF' && frMerge === 'Fusionner PDF' && enMerge === 'Merge PDF'
      };
    })()`);
    console.log('✓ Multi-Language i18n Engine Switch:', i18nRes);
    if (!i18nRes.valid) throw new Error('i18n Language switching failed');

    // 15. Universal High-Resolution Page Zoom Lightbox Modal
    const zoomRes = await evaluate(`(() => {
      openPageZoomModal('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'Test Page 1');
      const modal = document.getElementById('page-zoom-modal');
      const initialScale = zoomCurrentData.scale;
      setZoomModalScale(0.25);
      const zoomedScale = zoomCurrentData.scale;
      setZoomModalScale(1.0, true);
      const resetScale = zoomCurrentData.scale;
      closePageZoomModal();
      return {
        modalOpened: !modal.classList.contains('hidden'),
        zoomedIn: zoomedScale > initialScale,
        resetCorrect: resetScale === 1.0
      };
    })()`);
    console.log('✓ Universal High-Resolution Zoom Lightbox:', zoomRes);
    if (!zoomRes.zoomedIn || !zoomRes.resetCorrect) throw new Error('Zoom modal controls failed');

    // 16. Inline PDF Text & Shape Editor Execution
    const editPdfRes = await evaluate(`(async () => {
      let downloadIntercept = null;
      const origDownload = downloadTrackedBlob;
      window.downloadTrackedBlob = (blob, name) => { downloadIntercept = { blob, name, size: blob.size }; };

      try {
        const bin = atob("${b64}");
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const file = new File([bytes], 'sample_to_edit.pdf', { type: 'application/pdf' });

        await loadEditPdfFile(file);

        // Add text and rect annotations on page 1
        editPdfState.annotations[1] = [
          { type: 'text', text: 'CONFIDENTIAL AUDIT NOTE', x: 50, y: 100, color: '#ef4444', size: 18 },
          { type: 'rect', x: 45, y: 85, width: 250, height: 40, color: '#2563eb', strokeWidth: 2 }
        ];

        await executeEditPdf();

        return {
          success: Boolean(downloadIntercept && downloadIntercept.size > 0),
          filename: downloadIntercept ? downloadIntercept.name : null,
          hasAnnotations: Boolean(editPdfState.annotations[1] && editPdfState.annotations[1].length === 2)
        };
      } finally {
        window.downloadTrackedBlob = origDownload;
      }
    })()`);
    console.log('✓ Inline PDF Text & Shape Editor Execution:', editPdfRes);
    if (!editPdfRes.success || !editPdfRes.filename.includes('edited.pdf')) {
      throw new Error('Edit PDF execution failed');
    }

    // 17. Interactive PDF Form Filler Execution
    const formFillRes = await evaluate(`(async () => {
      let downloadIntercept = null;
      const origDownload = downloadTrackedBlob;
      window.downloadTrackedBlob = (blob, name) => { downloadIntercept = { blob, name, size: blob.size }; };

      try {
        await ensurePdfLib();
        // Create a PDF with an AcroForm text field and checkbox
        const testPdfDoc = await PDFLib.PDFDocument.create();
        const testPage = testPdfDoc.addPage([400, 400]);
        const testForm = testPdfDoc.getForm();
        const testTextField = testForm.createTextField('account_holder_name');
        testTextField.setText('John Doe');
        testTextField.addToPage(testPage, { x: 50, y: 300, width: 200, height: 25 });

        const testCheckField = testForm.createCheckBox('tax_verified');
        testCheckField.addToPage(testPage, { x: 50, y: 250, width: 20, height: 20 });

        const testPdfBytes = await testPdfDoc.save();
        const testFile = new File([testPdfBytes], 'w9_tax_form.pdf', { type: 'application/pdf' });

        await loadFormPdfFile(testFile);
        const fieldsDetected = formFillState.fields.length;

        // Change the text field value and check the checkbox in DOM
        const textInput = document.querySelector('input[data-field-name="account_holder_name"]');
        if (textInput) textInput.value = 'Jane Smith (Audited)';

        const checkInput = document.querySelector('input[data-field-name="tax_verified"]');
        if (checkInput) checkInput.checked = true;

        await executeFormFill();

        return {
          success: Boolean(downloadIntercept && downloadIntercept.size > 0),
          filename: downloadIntercept ? downloadIntercept.name : null,
          fieldsDetected,
          flattenSupported: typeof testForm.flatten === 'function'
        };
      } finally {
        window.downloadTrackedBlob = origDownload;
      }
    })()`);
    console.log('✓ Interactive PDF Form Filler Execution:', formFillRes);
    if (!formFillRes.success || formFillRes.fieldsDetected < 2 || !formFillRes.filename.includes('filled.pdf')) {
      throw new Error('Form Filler execution failed');
    }

    // 18. PowerPoint (.pptx) to PDF Execution
    const pptx2PdfRes = await evaluate(`(async () => {
      let downloadIntercept = null;
      const origDownload = downloadTrackedBlob;
      window.downloadTrackedBlob = (blob, name) => { downloadIntercept = { blob, name, size: blob.size }; };

      try {
        await ensureJsZip();
        const zip = new JSZip();
        zip.file('ppt/slides/slide1.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Quarterly Financial Overview</a:t></a:r></a:p><a:p><a:r><a:t>Net Operating Revenue: $2,450,000</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>');
        const buffer = await zip.generateAsync({ type: 'uint8array' });
        const file = new File([buffer], 'financial_deck.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });

        await loadPptxFile(file);
        const slidesCount = pptx2PdfState.slides.length;

        await executePptxToPdf();

        return {
          success: Boolean(downloadIntercept && downloadIntercept.size > 0),
          filename: downloadIntercept ? downloadIntercept.name : null,
          slidesCount
        };
      } finally {
        window.downloadTrackedBlob = origDownload;
      }
    })()`);
    console.log('✓ PowerPoint (.pptx) to PDF Execution:', pptx2PdfRes);
    if (!pptx2PdfRes.success || pptx2PdfRes.slidesCount < 1 || !pptx2PdfRes.filename.includes('converted.pdf')) {
      throw new Error('PowerPoint to PDF execution failed');
    }

    // 19. PDF to PowerPoint (.pptx) Execution
    const pdf2PptxRes = await evaluate(`(async () => {
      let downloadIntercept = null;
      const origDownload = downloadTrackedBlob;
      window.downloadTrackedBlob = (blob, name) => { downloadIntercept = { blob, name, size: blob.size }; };

      try {
        const bin = atob("${b64}");
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const file = new File([bytes], 'annual_report.pdf', { type: 'application/pdf' });

        await loadPdf2PptxFile(file);
        const pagesToConvert = pdf2PptxState.pageCount;

        await executePdf2Pptx();

        // Verify PPTX is a zip file (first 2 bytes = PK = 0x50, 0x4B)
        let isZip = false;
        if (downloadIntercept && downloadIntercept.blob) {
          const ab = await downloadIntercept.blob.arrayBuffer();
          const u8 = new Uint8Array(ab);
          isZip = u8.length > 2 && u8[0] === 0x50 && u8[1] === 0x4B;
        }

        return {
          success: Boolean(downloadIntercept && downloadIntercept.size > 0),
          filename: downloadIntercept ? downloadIntercept.name : null,
          pagesToConvert,
          isZip
        };
      } finally {
        window.downloadTrackedBlob = origDownload;
      }
    })()`);
    console.log('✓ PDF to PowerPoint (.pptx) Execution:', pdf2PptxRes);
    if (!pdf2PptxRes.success || pdf2PptxRes.pagesToConvert < 1 || !pdf2PptxRes.isZip || !pdf2PptxRes.filename.includes('.pptx')) {
      throw new Error('PDF to PowerPoint execution failed');
    }

    // 20. Scan to PDF Execution
    const scan2PdfRes = await evaluate(`(async () => {
      let downloadIntercept = null;
      const origDownload = downloadTrackedBlob;
      window.downloadTrackedBlob = (blob, name) => { downloadIntercept = { blob, name, size: blob.size }; };

      try {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 400, 600);
        ctx.fillStyle = '#1e293b';
        ctx.font = '24px sans-serif';
        ctx.fillText('Scanned Document Page 1', 30, 80);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        scan2PdfState.pages = [dataUrl];
        renderScan2PdfGallery();

        const galleryChildren = document.getElementById('scan2pdf-pages-gallery').children.length;
        const countText = document.getElementById('scan2pdf-page-count').textContent;

        await executeScan2Pdf();

        return {
          success: Boolean(downloadIntercept && downloadIntercept.size > 0),
          filename: downloadIntercept ? downloadIntercept.name : null,
          galleryChildren,
          countText
        };
      } finally {
        window.downloadTrackedBlob = origDownload;
      }
    })()`);
    console.log('✓ Scan to PDF Execution:', scan2PdfRes);
    if (!scan2PdfRes.success || scan2PdfRes.galleryChildren !== 1 || !scan2PdfRes.filename.includes('scanned_document')) {
      throw new Error('Scan to PDF execution failed');
    }

    // 21. Multi-Language i18n & Arabic RTL Toggle (Full-Site Verification)
    const i18nRtlRes = await evaluate(`(() => {
      // Test Italian
      applyLanguage('it');
      const itMerge = document.querySelector('[data-i18n="nav_merge"]')?.textContent;
      const itHeroTitle = document.querySelector('[data-i18n="hero_title"]')?.textContent;
      const itCardMergeTitle = document.querySelector('[data-i18n="card_merge_title"]')?.textContent;
      const itFaqTitle = document.querySelector('[data-i18n="faq_title"]')?.textContent;

      // Test Spanish
      applyLanguage('es');
      const esHeroTitle = document.querySelector('[data-i18n="hero_title"]')?.textContent;
      const esCardMergeTitle = document.querySelector('[data-i18n="card_merge_title"]')?.textContent;
      const esFaqTitle = document.querySelector('[data-i18n="faq_title"]')?.textContent;

      // Test Arabic + RTL
      applyLanguage('ar');
      const arDir = document.documentElement.dir;
      const arLang = document.documentElement.lang;
      const arMerge = document.querySelector('[data-i18n="nav_merge"]')?.textContent;
      const arHeroTitle = document.querySelector('[data-i18n="hero_title"]')?.textContent;
      const arCardMergeTitle = document.querySelector('[data-i18n="card_merge_title"]')?.textContent;
      const arFaqTitle = document.querySelector('[data-i18n="faq_title"]')?.textContent;

      // Test Reset to English + LTR
      applyLanguage('en');
      const enDir = document.documentElement.dir;
      const enMerge = document.querySelector('[data-i18n="nav_merge"]')?.textContent;
      const enHeroTitle = document.querySelector('[data-i18n="hero_title"]')?.textContent;
      const enCardMergeTitle = document.querySelector('[data-i18n="card_merge_title"]')?.textContent;
      const enFaqTitle = document.querySelector('[data-i18n="faq_title"]')?.textContent;

      return {
        itMerge,
        itHeroTitle,
        itCardMergeTitle,
        itFaqTitle,
        esHeroTitle,
        esCardMergeTitle,
        esFaqTitle,
        arDir,
        arLang,
        arMerge,
        arHeroTitle,
        arCardMergeTitle,
        arFaqTitle,
        enDir,
        enMerge,
        enHeroTitle,
        enCardMergeTitle,
        enFaqTitle,
        rtlActiveInArabic: arDir === 'rtl',
        ltrActiveInEnglish: enDir === 'ltr'
      };
    })()`);
    console.log('✓ Multi-Language i18n & Arabic RTL Toggle (Full-Site):', i18nRtlRes);
    if (
      !i18nRtlRes.rtlActiveInArabic ||
      !i18nRtlRes.ltrActiveInEnglish ||
      !i18nRtlRes.arMerge ||
      !i18nRtlRes.itMerge ||
      !i18nRtlRes.itHeroTitle?.includes('Tutti gli strumenti') ||
      !i18nRtlRes.esHeroTitle?.includes('Cada herramienta') ||
      !i18nRtlRes.arHeroTitle?.includes('كل ما تحتاجه') ||
      !i18nRtlRes.enHeroTitle?.includes('Every Tool You Need')
    ) {
      throw new Error('i18n full-site & RTL toggle failed');
    }

    // 22. Interactive Onboarding Modal & Multi-Step Carousel
    const onboardingRes = await evaluate(`(() => {
      // Trigger onboarding modal
      showOnboardingModal(0);
      const modal = document.getElementById('onboarding-overlay');
      const isVisibleInitial = !modal.classList.contains('hidden');
      const initialSlideIndex = onboardingSlideIndex;

      // Advance slides
      advanceOnboardingSlide();
      const slide1Active = onboardingSlideIndex === 1;

      advanceOnboardingSlide();
      const slide2Active = onboardingSlideIndex === 2;

      advanceOnboardingSlide();
      const slide3Active = onboardingSlideIndex === 3;
      const nextBtnText = document.getElementById('btn-onboarding-next')?.textContent;

      // Finish / complete
      finishOnboarding();
      const isHiddenAfterFinish = modal.classList.contains('hidden');
      const storedDone = localStorage.getItem('s2s_onboarding_done');

      return {
        isVisibleInitial,
        initialSlideIndex,
        slide1Active,
        slide2Active,
        slide3Active,
        nextBtnText,
        isHiddenAfterFinish,
        storedDone
      };
    })()`);
    console.log('✓ Interactive Onboarding Modal & Carousel:', onboardingRes);
    if (!onboardingRes.isVisibleInitial || !onboardingRes.slide3Active || !onboardingRes.isHiddenAfterFinish || onboardingRes.storedDone !== 'true') {
      throw new Error('Onboarding modal & carousel test failed');
    }

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

  console.log('\n--- 12. Testing Overscroll History Navigation (Swipe-to-Navigate) & History Sync ---');
  const overscrollRes = await evaluate(`(async () => {
    const mc = document.getElementById('main-content');
    const leftInd = document.getElementById('overscroll-indicator-left');
    const rightInd = document.getElementById('overscroll-indicator-right');
    const leftLabel = document.getElementById('overscroll-label-left');

    // 0. Ensure clean baseline at Dashboard:
    const dashBtn = document.querySelector('[data-tool="dashboard"]');
    if (dashBtn) dashBtn.click();
    await new Promise(r => setTimeout(r, 400));

    // 1. Boundary check on Dashboard:
    document.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 101, clientX: 50, clientY: 200, bubbles: true }));
    document.dispatchEvent(new PointerEvent('pointermove', { pointerId: 101, clientX: 120, clientY: 200, bubbles: true }));
    const boundaryTransform = mc.style.transform;
    const boundaryOpacity = leftInd ? leftInd.style.opacity : '0';
    const isBoundaryClass = leftInd ? leftInd.classList.contains('overscroll-indicator-boundary') : false;
    const boundaryLabel = leftLabel ? leftLabel.textContent : '';
    document.dispatchEvent(new PointerEvent('pointerup', { pointerId: 101, clientX: 120, clientY: 200, bubbles: true }));
    await new Promise(r => setTimeout(r, 200));

    // 2. Click tool 'merge'
    const mergeBtn = document.querySelector('[data-tool="merge"]');
    if (mergeBtn) mergeBtn.click();
    await new Promise(r => setTimeout(r, 500));
    const isMergeOpen = !document.getElementById('view-merge').classList.contains('hidden');

    // 3. Mouse/pointer swipe Back from merge
    document.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 102, pointerType: 'mouse', button: 0, clientX: 50, clientY: 250, bubbles: true }));
    document.dispatchEvent(new PointerEvent('pointermove', { pointerId: 102, pointerType: 'mouse', clientX: 150, clientY: 250, bubbles: true }));
    const activeClassDuring = leftInd ? leftInd.classList.contains('overscroll-indicator-active') : false;
    document.dispatchEvent(new PointerEvent('pointerup', { pointerId: 102, pointerType: 'mouse', clientX: 150, clientY: 250, bubbles: true }));
    await new Promise(r => setTimeout(r, 600));
    const isBackOnDash = !document.getElementById('view-dashboard').classList.contains('hidden');

    // 4. Trackpad Wheel forward gesture
    window.dispatchEvent(new WheelEvent('wheel', { deltaX: 35, deltaY: 0, bubbles: true }));
    window.dispatchEvent(new WheelEvent('wheel', { deltaX: 35, deltaY: 0, bubbles: true }));
    await new Promise(r => setTimeout(r, 700));
    const isForwardOnMerge = !document.getElementById('view-merge').classList.contains('hidden');

    // 5. Mobile Touch swipe back gesture
    const touch1 = new Touch({ identifier: 103, target: document.body, clientX: 40, clientY: 200 });
    const touch2 = new Touch({ identifier: 103, target: document.body, clientX: 140, clientY: 200 });
    document.dispatchEvent(new TouchEvent('touchstart', { touches: [touch1], changedTouches: [touch1], bubbles: true }));
    document.dispatchEvent(new TouchEvent('touchmove', { touches: [touch2], changedTouches: [touch2], bubbles: true }));
    document.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touch2], bubbles: true }));
    await new Promise(r => setTimeout(r, 600));
    const isFinallyOnDash = !document.getElementById('view-dashboard').classList.contains('hidden');

    return {
      boundaryOk: isBoundaryClass && !!boundaryTransform,
      boundaryLabel,
      isMergeOpen,
      activeClassDuring,
      isBackOnDash,
      isForwardOnMerge,
      isFinallyOnDash
    };
  })()`);
  console.log('✓ Overscroll History Navigation (Swipe-to-Navigate):', overscrollRes);
  if (!overscrollRes.boundaryOk || !overscrollRes.isBackOnDash || !overscrollRes.isForwardOnMerge || !overscrollRes.isFinallyOnDash) {
    throw new Error('Overscroll History Navigation verification failed!');
  }

  console.log('\n--- 13. Checking Console CSP Violations ---');
  console.log('Total CSP Violations:', cspViolations.length);
  if (cspViolations.length > 0) throw new Error('CSP violations detected in browser console!');

  ws.close();
  browserProc.kill();
  server.close();
  try { fs.rmSync(USER_DATA_DIR, { recursive: true, force: true }); } catch (e) {}

  console.log('\n=============================================================');
  console.log('🎉 ALL 13 SECURITY & FUNCTIONAL TEST SUITES PASSED (100%)!');
  console.log('=============================================================');
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});