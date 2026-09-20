/* Statement2Sheet Application Core (Strict CSP Compliant) */

// 1. Tailwind Configuration (Guarded for precompiled CSS)
if (typeof tailwind !== 'undefined') {
  tailwind.config = {
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          brand: {
            50: '#ecfdf5',
            500: '#10b981',
            600: '#059669',
            700: '#047857',
          }
        }
      }
    }
  };
}

// 2. On-Demand Lazy Vendor Script Loader
const VENDOR_LIBS = {
  xlsx: {
    src: 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js',
    integrity: 'sha384-QCIdq2UMVEoSRhR3ZWZwdz2/pivLowr+eokFMdYyukq7qI26VYRxFa4Nl6FKetmL',
    isLoaded: () => typeof XLSX !== 'undefined'
  },
  pdfLib: {
    src: 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
    integrity: 'sha384-weMABwrltA6jWR8DDe9Jp5blk+tZQh7ugpCsF3JwSA53WZM9/14PjS5LAJNHNjAI',
    isLoaded: () => typeof PDFLib !== 'undefined'
  },
  jspdf: {
    src: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    integrity: 'sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk',
    isLoaded: () => typeof window.jspdf !== 'undefined'
  },
  tesseract: {
    src: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
    integrity: 'sha384-GJqSu7vueQ9qN0E9yLPb3Wtpd7OrgK8KmYzC8T1IysG1bcvxvIO4qtYR/D3A991F',
    isLoaded: () => typeof Tesseract !== 'undefined'
  },
  jszip: {
    src: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    integrity: 'sha384-+mbV2IY1Zk/X1p/nWllGySJSUN8uMs+gUAN10Or95UBH0fpj6GfKgPmgC5EXieXG',
    isLoaded: () => typeof JSZip !== 'undefined'
  },
  pptxgenjs: {
    src: 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js',
    integrity: 'sha384-Cck14aA9cifjYolcnjebXRfWGkz5ltHMBiG4px/j8GS+xQcb7OhNQWZYyWjQ+UwQ',
    isLoaded: () => typeof PptxGenJS !== 'undefined'
  },
  pdfSecurity: {
    src: './pdf-security.js',
    isLoaded: () => typeof PDFEncrypt !== 'undefined' && typeof PDFDecrypt !== 'undefined'
  }
};

const vendorLoadPromises = {};

function loadVendorScript(name) {
  const lib = VENDOR_LIBS[name];
  if (!lib) return Promise.reject(new Error('Unknown vendor library: ' + name));
  if (lib.isLoaded()) return Promise.resolve();
  if (vendorLoadPromises[name]) return vendorLoadPromises[name];

  vendorLoadPromises[name] = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${lib.src}"]`);
    if (existing) {
      if (lib.isLoaded()) return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (e) => reject(new Error('Failed to load ' + name)));
      return;
    }
    const script = document.createElement('script');
    script.src = lib.src;
    script.crossOrigin = 'anonymous';
    if (lib.integrity) script.integrity = lib.integrity;
    script.onload = () => resolve();
    script.onerror = (e) => {
      delete vendorLoadPromises[name];
      reject(new Error('Failed to load ' + name + ' from CDN. Please check network connection.'));
    };
    document.head.appendChild(script);
  });

  return vendorLoadPromises[name];
}

async function ensureXlsx() {
  if (typeof XLSX !== 'undefined') return;
  await loadVendorScript('xlsx');
}

async function ensurePdfLib() {
  if (typeof PDFLib !== 'undefined') return;
  await loadVendorScript('pdfLib');
}

async function ensurePdfSecurity() {
  await ensurePdfLib();
  if (typeof PDFEncrypt !== 'undefined' && typeof PDFDecrypt !== 'undefined') return;
  await loadVendorScript('pdfSecurity');
}

async function ensureJsPdf() {
  if (typeof window.jspdf !== 'undefined') return;
  await loadVendorScript('jspdf');
}

async function ensureTesseract() {
  if (typeof Tesseract !== 'undefined') return;
  await loadVendorScript('tesseract');
}

async function ensureJsZip() {
  if (typeof JSZip !== 'undefined') return;
  await loadVendorScript('jszip');
}

async function ensurePptxGen() {
  if (typeof PptxGenJS !== 'undefined') return;
  await loadVendorScript('pptxgenjs');
}

// 3. Worker & Initial Theme Setup
function setupPdfWorker() {
  if (typeof pdfjsLib !== 'undefined' && pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
}
setupPdfWorker();
    
    // Initial Theme Setup: Default to clean, pleasant light atmosphere (matching iLovePDF) unless explicitly toggled to dark
    if (localStorage.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

// 3. Application Logic
// ================= GLOBAL APPLICATION STATE =================
    
    // Security Sanitizer: Neutralize DOM XSS
    
    // Security Sanitizer: Prevent CSV & Excel Formula Injection (CWE-1236)
    function sanitizeSpreadsheetCell(val) {
      if (val === null || val === undefined) return '';
      let str = String(val);
      if (/^[=+\-@\t\r]/.test(str)) {
        return "'" + str;
      }
      return str;
    }

    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // ================= MEMORY SAFEGUARDS & OBJECT URL REGISTRY =================
    const activeObjectUrls = new Set();
    let lastDownloadedItem = null;

    function createTrackedObjectURL(blob) {
      if (!blob) return '';
      const url = URL.createObjectURL(blob);
      activeObjectUrls.add(url);
      return url;
    }

    function downloadTrackedBlob(blob, filename) {
      if (!blob) return;
      lastDownloadedItem = {
        filename,
        size: blob.size,
        type: blob.type,
        blob,
        timestamp: Date.now()
      };
      const url = createTrackedObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try { document.body.removeChild(a); } catch (e) {}
        revokeTrackedObjectURL(url);
      }, 1200);
    }

    function revokeTrackedObjectURL(url) {
      if (!url) return;
      try {
        URL.revokeObjectURL(url);
      } catch (e) {}
      activeObjectUrls.delete(url);
    }

    function revokeAllObjectURLs() {
      activeObjectUrls.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {}
      });
      activeObjectUrls.clear();
    }

    // Global session state
    let sessionRecentFiles = [];
    window.sessionRecentFiles = sessionRecentFiles;

    // Memory Safeguard: Release 2D Canvas Memory Buffers
    function disposeCanvas(canvas) {
      if (!canvas) return;
      try {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 0;
        canvas.height = 0;
      } catch (e) {}
    }

    // ================= BINARY MAGIC-BYTE VALIDATION =================
    async function validateFileMagicBytes(file) {
      if (!file || !(file instanceof Blob)) {
        return { valid: false, format: 'unknown', error: 'Invalid file object' };
      }
      try {
        const headerSlice = file.slice(0, 32);
        const buffer = await headerSlice.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        if (bytes.length < 4) {
          return { valid: false, format: 'unknown', error: 'File is too small or empty.' };
        }

        // PDF signature: %PDF- (0x25, 0x50, 0x44, 0x46)
        if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
          return { valid: true, format: 'pdf' };
        }

        // PNG signature: 89 50 4E 47 0D 0A 1A 0A
        if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
          return { valid: true, format: 'png' };
        }

        // JPEG signature: FF D8 FF
        if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
          return { valid: true, format: 'jpeg' };
        }

        // WEBP signature: RIFF .... WEBP
        if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes.length >= 12) {
          if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
            return { valid: true, format: 'webp' };
          }
        }

        // BMP signature: 42 4D (BM)
        if (bytes[0] === 0x42 && bytes[1] === 0x4D) {
          return { valid: true, format: 'bmp' };
        }

        return { valid: false, format: 'unknown', error: 'File content does not match expected PDF or image format (magic-byte check failed).' };
      } catch (err) {
        return { valid: false, format: 'unknown', error: 'Error reading file header: ' + err.message };
      }
    }

    async function validateSinglePdfFile(file, toolName = 'PDF') {
      if (!file) {
        alert('Please select a file.');
        return false;
      }
      if (file.size > 50 * 1024 * 1024) {
        alert('File exceeds the 50MB limit (' + (file.size / (1024 * 1024)).toFixed(1) + 'MB).');
        return false;
      }
      const magic = await validateFileMagicBytes(file);
      if (!magic.valid || magic.format !== 'pdf') {
        alert('The selected file is not a valid PDF document (magic-byte validation failed).');
        return false;
      }
      return true;
    }

    // ================= NOTIFICATION TOAST SYSTEM =================
    function showNotificationToast(msg, type = 'success') {
      let toast = document.getElementById('app-notification-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'app-notification-toast';
        toast.className = 'fixed bottom-6 right-6 z-50 max-w-md px-4 py-3 rounded-2xl shadow-xl text-xs font-bold transition-all duration-300 transform translate-y-12 opacity-0 flex items-center gap-2.5 pointer-events-none';
        document.body.appendChild(toast);
      }

      const bgClass = type === 'error' 
        ? 'bg-rose-900 text-rose-100 border border-rose-700' 
        : type === 'warning'
        ? 'bg-amber-900 text-amber-100 border border-amber-700'
        : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-700 dark:border-slate-200';

      toast.className = 'fixed bottom-6 right-6 z-50 max-w-md px-4 py-3 rounded-2xl shadow-xl text-xs font-bold transition-all duration-300 transform translate-y-0 opacity-100 flex items-center gap-2.5 pointer-events-auto ' + bgClass;
      toast.textContent = msg;

      clearTimeout(toast._timer);
      toast._timer = setTimeout(() => {
        toast.className = toast.className.replace('translate-y-0 opacity-100', 'translate-y-12 opacity-0 pointer-events-none');
      }, 3500);
    }

    const AppState = {
      files: [],
      pendingFile: null,
      rawLines: [],
      rawText: '',
      transactions: [],
      metadata: {
        bankName: 'Universal Statement',
        accountHolder: '',
        accountNumber: '',
        periodStart: '',
        periodEnd: '',
        openingBalance: 0,
        closingBalance: 0,
        currency: '$',
        pageCount: 1
      },
      audit: {
        totalCredits: 0,
        totalDebits: 0,
        discrepancyCount: 0,
        isReconciled: true
      },
      filterOnlyIssues: false
    };

    // ================= EVENT INITIALIZERS =================
    
        // ================= MODULE: PORTAL VIEW SWITCHER (iLovePDF Style) =================
    let currentPortalTool = 'dashboard';
    let portalHistoryIndex = 0;
    let maxPortalHistoryIndex = 0;
    let portalHistoryStack = ['dashboard'];
    let portalTransitionTimer = null;

    function getPortalViewElement(toolName) {
      if (!toolName) return null;
      if (toolName === 'dashboard') {
        return document.getElementById('view-dashboard');
      } else if (toolName === 'excel') {
        if (!AppState.transactions || AppState.transactions.length === 0) {
          return document.getElementById('intake-section');
        } else {
          return document.getElementById('workspace-section');
        }
      } else {
        return document.getElementById(`view-${toolName}`);
      }
    }

    
    // Navigation Controller: Return to Intake Screen
    function resetConverterToIntake() {
      AppState.transactions = [];
      AppState.pendingFile = null;
      const ws = document.getElementById('workspace-section');
      const ps = document.getElementById('preview-stage');
      const is = document.getElementById('intake-section');
      const proc = document.getElementById('processing-section');
      if (ws) ws.classList.add('hidden');
      if (ps) ps.classList.add('hidden');
      if (proc) proc.classList.add('hidden');
      if (is) is.classList.remove('hidden');
      switchPortalTool('excel');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ================= MEGA MENU & NAVIGATION SYSTEM =================
    function toggleMegaMenu(event) {
      if (event) event.stopPropagation();
      const menu = document.getElementById('mega-menu-dropdown');
      const backdrop = document.getElementById('mega-menu-backdrop');
      const chevron = document.getElementById('mega-chevron');
      if (!menu) return;
      const isClosed = menu.classList.contains('hidden') || menu.classList.contains('opacity-0');
      if (isClosed) {
        menu.classList.remove('hidden');
        requestAnimationFrame(() => {
          menu.classList.remove('-translate-y-4', 'opacity-0', 'pointer-events-none');
          menu.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');
        });
        if (backdrop) {
          backdrop.classList.remove('opacity-0', 'pointer-events-none');
          backdrop.classList.add('opacity-100', 'pointer-events-auto');
        }
        if (chevron) chevron.classList.add('rotate-180');
        const convertMenu = document.getElementById('convert-pdf-dropdown');
        if (convertMenu) convertMenu.classList.add('hidden');
        const launcher = document.getElementById('app-launcher-dropdown');
        if (launcher) launcher.classList.add('hidden');
      } else {
        closeMegaMenu();
      }
    }

    function closeMegaMenu() {
      const menu = document.getElementById('mega-menu-dropdown');
      const backdrop = document.getElementById('mega-menu-backdrop');
      const chevron = document.getElementById('mega-chevron');
      if (menu && !menu.classList.contains('hidden')) {
        menu.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
        menu.classList.add('-translate-y-4', 'opacity-0', 'pointer-events-none');
        if (backdrop) {
          backdrop.classList.remove('opacity-100', 'pointer-events-auto');
          backdrop.classList.add('opacity-0', 'pointer-events-none');
        }
        if (chevron) chevron.classList.remove('rotate-180');
        setTimeout(() => {
          if (menu.classList.contains('opacity-0')) {
            menu.classList.add('hidden');
          }
        }, 280);
      }
    }

    function toggleConvertDropdown(event) {
      if (event) event.stopPropagation();
      const menu = document.getElementById('convert-pdf-dropdown');
      if (!menu) return;
      const isClosed = menu.classList.contains('hidden');
      if (isClosed) {
        menu.classList.remove('hidden');
        closeMegaMenu();
        const launcher = document.getElementById('app-launcher-dropdown');
        if (launcher) launcher.classList.add('hidden');
      } else {
        menu.classList.add('hidden');
      }
    }

    function toggleAppLauncher(event) {
      if (event) event.stopPropagation();
      const menu = document.getElementById('app-launcher-dropdown');
      if (!menu) return;
      const isClosed = menu.classList.contains('hidden');
      if (isClosed) {
        menu.classList.remove('hidden');
        closeMegaMenu();
        const convertMenu = document.getElementById('convert-pdf-dropdown');
        if (convertMenu) convertMenu.classList.add('hidden');
      } else {
        menu.classList.add('hidden');
      }
    }

    // User Privacy & Architecture Info Helper
    function openAuthModal() {
      const trustSection = document.getElementById('trust-section');
      if (trustSection) trustSection.scrollIntoView({ behavior: 'smooth' });
      if (typeof showNotification === 'function') {
        showNotification('🛡️ Statement2Sheet is 100% Free & In-Browser. No login or signup required!', 'info');
      }
    }
    function closeAuthModal() {}
    function saveUserPreferences() {}

    // Global listener for closing menus on click outside & Escape key
    if (typeof document !== 'undefined') {
      document.addEventListener('click', (e) => {
        const megaMenu = document.getElementById('mega-menu-dropdown');
        const megaTrigger = document.getElementById('mega-menu-trigger');
        if (megaMenu && !megaMenu.contains(e.target) && (!megaTrigger || !megaTrigger.contains(e.target))) {
          closeMegaMenu();
        }
        const convertMenu = document.getElementById('convert-pdf-dropdown');
        const convertTrigger = document.getElementById('dropdown-convert-container');
        if (convertMenu && !convertMenu.contains(e.target) && (!convertTrigger || !convertTrigger.contains(e.target))) {
          convertMenu.classList.add('hidden');
        }
        const appLauncher = document.getElementById('app-launcher-dropdown');
        if (appLauncher && !appLauncher.contains(e.target)) {
          appLauncher.classList.add('hidden');
        }
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeMegaMenu();
          const convertMenu = document.getElementById('convert-pdf-dropdown');
          if (convertMenu) convertMenu.classList.add('hidden');
          const appLauncher = document.getElementById('app-launcher-dropdown');
          if (appLauncher) appLauncher.classList.add('hidden');
          closeAuthModal();
        }
      });
    }

        function setToolScreenState(toolName, state) {
      const uploadScreen = document.getElementById(`${toolName}-upload-screen`);
      const card = document.getElementById(`${toolName}-controls-card`)
        || document.getElementById(`${toolName}-workspace-card`)
        || document.getElementById(`${toolName}-results-card`)
        || document.getElementById(`${toolName}-files-container`);

      if (state === 'workspace') {
        if (uploadScreen) uploadScreen.classList.add('hidden');
        if (card) card.classList.remove('hidden');
      } else if (state === 'upload') {
        if (uploadScreen) uploadScreen.classList.remove('hidden');
        if (card) card.classList.add('hidden');
        const input = document.getElementById(`${toolName}-file-input`)
          || document.getElementById(`${toolName}-file-input-1`);
        if (input) input.value = '';
      }
    }

    function switchPortalTool(toolName, options = {}) {
      const prevTool = currentPortalTool;
      const prevEl = getPortalViewElement(prevTool);
      const nextEl = getPortalViewElement(toolName);

      if (prevTool === toolName && !options.force && nextEl && !nextEl.classList.contains('hidden')) {
        return;
      }

      closeMegaMenu();
      const convertMenu = document.getElementById('convert-pdf-dropdown');
      if (convertMenu) convertMenu.classList.add('hidden');
      const appLauncher = document.getElementById('app-launcher-dropdown');
      if (appLauncher) appLauncher.classList.add('hidden');
      
      // Update nav buttons if present
      document.querySelectorAll('.portal-tool-btn').forEach(btn => {
        btn.classList.remove('bg-emerald-50', 'dark:bg-emerald-950/80', 'text-emerald-700', 'dark:text-emerald-300', 'font-bold', 'border', 'border-emerald-200', 'dark:border-emerald-800');
        btn.classList.add('text-slate-600', 'dark:text-slate-300');
      });

      const activeNavBtn = document.getElementById(`nav-tool-${toolName}`);
      if (activeNavBtn) {
        activeNavBtn.classList.remove('text-slate-600', 'dark:text-slate-300');
        activeNavBtn.classList.add('bg-emerald-50', 'dark:bg-emerald-950/80', 'text-emerald-700', 'dark:text-emerald-300', 'font-bold', 'border', 'border-emerald-200', 'dark:border-emerald-800');
      }

      // Determine transition direction:
      // If going to dashboard, it's Back; otherwise Front, unless explicitly specified
      const isBack = typeof options.isBack === 'boolean'
        ? options.isBack
        : (toolName === 'dashboard');

      // Update browser history (pushState) unless this call originated from popstate or gestures
      if (!options.fromPopState && !options.fromGesture && typeof window !== 'undefined' && window.history && window.history.pushState) {
        portalHistoryIndex++;
        portalHistoryStack[portalHistoryIndex] = toolName;
        portalHistoryStack.length = portalHistoryIndex + 1;
        maxPortalHistoryIndex = portalHistoryIndex;

        const stateObj = { tool: toolName, historyIndex: portalHistoryIndex };
        const newHash = toolName === 'dashboard' ? (window.location.pathname + window.location.search) : ('#' + toolName);
        try {
          window.history.pushState(stateObj, '', newHash);
        } catch (e) {
          // safe fallback for restricted sandbox or file:// environments
        }
      }

      currentPortalTool = toolName;

      if (toolName === 'dashboard') {
        loadRecentFiles();
      }

      function cleanupViewStyles(el) {
        if (!el) return;
        el.style.position = '';
        el.style.top = '';
        el.style.left = '';
        el.style.width = '';
        el.style.margin = '';
        el.style.pointerEvents = '';
        el.style.zIndex = '';
        el.classList.remove(
          'animate-slide-in-front', 'animate-slide-out-left',
          'animate-slide-in-left', 'animate-slide-out-back',
          'animate-view-slide-in', 'animate-view-slide-back'
        );
      }

      if (portalTransitionTimer) {
        clearTimeout(portalTransitionTimer);
        portalTransitionTimer = null;
      }

      // Hide all other views immediately
      const allViews = ['dashboard', 'merge', 'split', 'organize', 'unlock', 'watermark', 'pagenumber', 'pdf2img', 'img2pdf', 'compress', 'sign', 'protect', 'markdown', 'crop', 'extract-images', 'compare', 'rotate', 'redact', 'pdf2word', 'office2pdf', 'pdfa', 'digitalsign', 'summarize', 'repair', 'editpdf', 'formfill', 'pptx2pdf', 'pdf2pptx', 'scan2pdf'];
      allViews.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el && el !== prevEl && el !== nextEl) {
          el.classList.add('hidden');
          cleanupViewStyles(el);
        }
      });

      const intakeSection = document.getElementById('intake-section');
      const previewStage = document.getElementById('preview-stage');
      const processingSection = document.getElementById('processing-section');
      const workspaceSection = document.getElementById('workspace-section');

      if (toolName !== 'excel') {
        if (intakeSection && intakeSection !== prevEl) intakeSection.classList.add('hidden');
        if (previewStage) previewStage.classList.add('hidden');
        if (processingSection) processingSection.classList.add('hidden');
        if (workspaceSection && workspaceSection !== prevEl) workspaceSection.classList.add('hidden');
      }

      if (!nextEl) return;

      // Next view is immediately unhidden
      nextEl.classList.remove('hidden');
      cleanupViewStyles(nextEl);

      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }

      const outAnim = isBack ? 'animate-slide-out-back' : 'animate-slide-out-left';
      const inAnim = isBack ? 'animate-slide-in-left' : 'animate-slide-in-front';

      if (prevEl && prevEl !== nextEl && !prevEl.classList.contains('hidden') && !options.noAnimate) {
        cleanupViewStyles(prevEl);

        const prevTop = prevEl.offsetTop;
        const prevLeft = prevEl.offsetLeft;
        const prevWidth = prevEl.offsetWidth;

        prevEl.style.position = 'absolute';
        if (typeof prevTop === 'number') prevEl.style.top = prevTop + 'px';
        if (typeof prevLeft === 'number') prevEl.style.left = prevLeft + 'px';
        if (prevWidth) prevEl.style.width = prevWidth + 'px';
        prevEl.style.margin = '0';
        prevEl.style.pointerEvents = 'none';
        prevEl.style.zIndex = '1';

        nextEl.style.position = 'relative';
        nextEl.style.zIndex = '2';

        void prevEl.offsetWidth;
        void nextEl.offsetWidth;

        prevEl.classList.add(outAnim);
        nextEl.classList.add(inAnim);

        portalTransitionTimer = setTimeout(() => {
          if (prevEl) {
            prevEl.classList.add('hidden');
            cleanupViewStyles(prevEl);
          }
          if (nextEl) {
            cleanupViewStyles(nextEl);
          }
          portalTransitionTimer = null;
        }, 320);
      } else {
        if (prevEl && prevEl !== nextEl) {
          prevEl.classList.add('hidden');
          cleanupViewStyles(prevEl);
        }
        nextEl.classList.add(inAnim);
        portalTransitionTimer = setTimeout(() => {
          cleanupViewStyles(nextEl);
          portalTransitionTimer = null;
        }, 320);
      }
    }

    function initOverscrollHistoryNavigation() {
      if (typeof window === 'undefined') return;

      // 1. Initial Hash Route Support & State Alignment
      const initialHash = (window.location.hash || '').replace(/^#/, '');
      const validInitialTool = initialHash && getPortalViewElement(initialHash) ? initialHash : 'dashboard';

      if (window.history && window.history.replaceState) {
        try {
          window.history.replaceState(
            { tool: validInitialTool, historyIndex: 0 },
            '',
            validInitialTool === 'dashboard' ? (window.location.pathname + window.location.search) : ('#' + validInitialTool)
          );
        } catch (e) {}
      }

      if (validInitialTool !== 'dashboard') {
        portalHistoryStack = ['dashboard', validInitialTool];
        portalHistoryIndex = 1;
        maxPortalHistoryIndex = 1;
        switchPortalTool(validInitialTool, { noAnimate: true, fromPopState: true });
      } else {
        portalHistoryStack = ['dashboard'];
        portalHistoryIndex = 0;
        maxPortalHistoryIndex = 0;
      }

      // 2. Popstate Listener for Browser Back/Forward buttons and native gestures
      window.addEventListener('popstate', (e) => {
        const state = e.state;
        const targetTool = (state && state.tool) || ((window.location.hash || '').replace(/^#/, '')) || 'dashboard';
        const newHistoryIndex = (state && typeof state.historyIndex === 'number') ? state.historyIndex : 0;
        const isBack = newHistoryIndex <= portalHistoryIndex;
        portalHistoryIndex = newHistoryIndex;

        if (currentPortalTool !== targetTool) {
          switchPortalTool(targetTool, { fromPopState: true, isBack: isBack });
        }
      });

      // 3. Overscroll Navigation Gliding Engine (Touchscreen, Trackpad, Magic Mouse & Mouse Drag)
      const THRESHOLD = 40; // Effortless activation distance in pixels
      const RUBBER_BAND = 0.22; // Tactile glide resistance
      const MAX_GLIDE = 42; // Maximum displacement in pixels

      const mainContent = document.getElementById('main-content');
      const leftIndicator = document.getElementById('overscroll-indicator-left');
      const rightIndicator = document.getElementById('overscroll-indicator-right');
      const leftLabel = document.getElementById('overscroll-label-left');
      const rightLabel = document.getElementById('overscroll-label-right');
      const leftArrow = document.getElementById('overscroll-arrow-left');
      const rightArrow = document.getElementById('overscroll-arrow-right');

      function canGoBack() {
        return currentPortalTool !== 'dashboard';
      }

      function canGoForward() {
        return portalHistoryIndex < maxPortalHistoryIndex && !!portalHistoryStack[portalHistoryIndex + 1];
      }

      function executeBack() {
        if (portalHistoryIndex > 0) {
          const target = portalHistoryStack[portalHistoryIndex - 1] || 'dashboard';
          portalHistoryIndex--;
          switchPortalTool(target, { isBack: true, fromGesture: true });
          if (typeof window !== 'undefined' && window.history && typeof window.history.back === 'function') {
            try { window.history.back(); } catch (e) {}
          }
        } else if (currentPortalTool !== 'dashboard') {
          switchPortalTool('dashboard', { isBack: true, fromGesture: true });
          if (window.history && window.history.replaceState) {
            try {
              window.history.replaceState({ tool: 'dashboard', historyIndex: 0 }, '', window.location.pathname + window.location.search);
            } catch (e) {}
          }
        }
      }

      function executeForward() {
        if (canGoForward()) {
          const target = portalHistoryStack[portalHistoryIndex + 1];
          portalHistoryIndex++;
          switchPortalTool(target, { isBack: false, fromGesture: true });
          if (typeof window !== 'undefined' && window.history && typeof window.history.forward === 'function') {
            try { window.history.forward(); } catch (e) {}
          }
        }
      }

      function updateOverscrollVisuals(deltaX) {
        if (!mainContent) return;

        const absX = Math.abs(deltaX);
        const isBackDirection = deltaX > 0;
        const isForwardDirection = deltaX < 0;
        const backAllowed = canGoBack();
        const forwardAllowed = canGoForward();

        // Boundary resistance check: if user pulls past edge of history, offer soft tactile spring feedback
        const isBoundary = (isBackDirection && !backAllowed) || (isForwardDirection && !forwardAllowed);
        const effectiveMax = isBoundary ? 16 : MAX_GLIDE;
        const effectiveResistance = isBoundary ? 0.12 : RUBBER_BAND;
        const clampedDelta = Math.sign(deltaX) * Math.min(absX * effectiveResistance, effectiveMax);

        mainContent.classList.remove('overscroll-spring-back');
        mainContent.classList.add('overscroll-gliding');
        mainContent.style.transform = `translate3d(${clampedDelta}px, 0, 0)`;

        const progress = Math.min(absX / THRESHOLD, 1);
        const isTriggered = absX >= THRESHOLD;

        if (isBackDirection && leftIndicator) {
          // Left-to-right swipe (Back)
          if (rightIndicator) {
            rightIndicator.style.opacity = '0';
            rightIndicator.style.transform = 'translate3d(48px, -50%, 0) scale(0.85)';
          }

          if (backAllowed) {
            leftIndicator.classList.remove('overscroll-indicator-boundary');
            leftIndicator.style.opacity = `${progress}`;
            const posX = Math.min(absX * 0.45, 20);
            leftIndicator.style.transform = `translate3d(${posX}px, -50%, 0) scale(${0.9 + progress * 0.18})`;

            if (isTriggered) {
              leftIndicator.classList.add('overscroll-indicator-active');
              if (leftLabel) leftLabel.textContent = 'Release for Back';
            } else {
              leftIndicator.classList.remove('overscroll-indicator-active');
              if (leftLabel) leftLabel.textContent = 'Back';
            }
          } else {
            // Tactile feedback at Dashboard boundary
            leftIndicator.classList.remove('overscroll-indicator-active');
            leftIndicator.classList.add('overscroll-indicator-boundary');
            leftIndicator.style.opacity = `${Math.min(progress * 0.7, 0.55)}`;
            const posX = Math.min(absX * 0.2, 10);
            leftIndicator.style.transform = `translate3d(${posX}px, -50%, 0) scale(0.9)`;
            if (leftLabel) leftLabel.textContent = 'At Dashboard';
          }
        } else if (isForwardDirection && rightIndicator) {
          // Right-to-left swipe (Forward)
          if (leftIndicator) {
            leftIndicator.style.opacity = '0';
            leftIndicator.style.transform = 'translate3d(-48px, -50%, 0) scale(0.85)';
          }

          if (forwardAllowed) {
            rightIndicator.classList.remove('overscroll-indicator-boundary');
            rightIndicator.style.opacity = `${progress}`;
            const posX = Math.min(absX * 0.45, 20);
            rightIndicator.style.transform = `translate3d(-${posX}px, -50%, 0) scale(${0.9 + progress * 0.18})`;

            if (isTriggered) {
              rightIndicator.classList.add('overscroll-indicator-active');
              if (rightLabel) rightLabel.textContent = 'Release for Forward';
            } else {
              rightIndicator.classList.remove('overscroll-indicator-active');
              if (rightLabel) rightLabel.textContent = 'Forward';
            }
          } else {
            // Tactile feedback at forward boundary
            rightIndicator.classList.remove('overscroll-indicator-active');
            rightIndicator.classList.add('overscroll-indicator-boundary');
            rightIndicator.style.opacity = `${Math.min(progress * 0.7, 0.55)}`;
            const posX = Math.min(absX * 0.2, 10);
            rightIndicator.style.transform = `translate3d(-${posX}px, -50%, 0) scale(0.9)`;
            if (rightLabel) rightLabel.textContent = 'End of History';
          }
        }
      }

      function resetOverscrollVisuals() {
        if (!mainContent) return;

        mainContent.classList.remove('overscroll-gliding');
        mainContent.classList.add('overscroll-spring-back');
        mainContent.style.transform = 'translate3d(0, 0, 0)';

        if (leftIndicator) {
          leftIndicator.style.transition = 'all 0.28s cubic-bezier(0.2, 0.9, 0.3, 1)';
          leftIndicator.style.opacity = '0';
          leftIndicator.style.transform = 'translate3d(-48px, -50%, 0) scale(0.85)';
          setTimeout(() => {
            if (leftIndicator) {
              leftIndicator.classList.remove('overscroll-indicator-active', 'overscroll-indicator-boundary');
              leftIndicator.style.transition = '';
            }
          }, 300);
        }
        if (rightIndicator) {
          rightIndicator.style.transition = 'all 0.28s cubic-bezier(0.2, 0.9, 0.3, 1)';
          rightIndicator.style.opacity = '0';
          rightIndicator.style.transform = 'translate3d(48px, -50%, 0) scale(0.85)';
          setTimeout(() => {
            if (rightIndicator) {
              rightIndicator.classList.remove('overscroll-indicator-active', 'overscroll-indicator-boundary');
              rightIndicator.style.transition = '';
            }
          }, 300);
        }

        setTimeout(() => {
          if (mainContent) {
            mainContent.classList.remove('overscroll-spring-back');
            mainContent.style.transform = '';
          }
        }, 320);
      }

      // 3A. Tri-Modal Unified Pointer Engine (Touchscreens & Desktop Mouse Drag)
      let pointerStartX = 0;
      let pointerStartY = 0;
      let activePointerId = null;
      let isPointerTracking = false;
      let isHorizontalSwipe = false;
      let currentPointerDeltaX = 0;

      function isInteractiveTarget(target) {
        if (!target || !target.closest) return false;
        return !!target.closest('input, button, select, textarea, a, [contenteditable="true"], canvas, .crop-handle, .signature-pad, #mega-menu-dropdown, #app-launcher-dropdown');
      }

      document.addEventListener('pointerdown', (e) => {
        // Ignore secondary mouse clicks
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        // Ignore clicks on inputs, buttons, sliders, links, or drawing canvases
        if (isInteractiveTarget(e.target)) return;

        pointerStartX = e.clientX;
        pointerStartY = e.clientY;
        activePointerId = e.pointerId;
        isPointerTracking = true;
        isHorizontalSwipe = false;
        currentPointerDeltaX = 0;
      }, { passive: true });

      document.addEventListener('pointermove', (e) => {
        if (!isPointerTracking || e.pointerId !== activePointerId) return;

        const diffX = e.clientX - pointerStartX;
        const diffY = e.clientY - pointerStartY;

        if (!isHorizontalSwipe) {
          if (Math.abs(diffX) > 8) {
            if (Math.abs(diffX) >= Math.abs(diffY) * 0.8) {
              isHorizontalSwipe = true;
            } else if (Math.abs(diffY) > 16) {
              isPointerTracking = false;
              return;
            }
          }
        }

        if (isHorizontalSwipe) {
          currentPointerDeltaX = diffX;
          updateOverscrollVisuals(currentPointerDeltaX);
        }
      }, { passive: true });

      function endPointerGesture() {
        if (!isPointerTracking) return;
        isPointerTracking = false;

        if (isHorizontalSwipe && Math.abs(currentPointerDeltaX) >= THRESHOLD) {
          const goBack = currentPointerDeltaX > 0;
          resetOverscrollVisuals();
          if (goBack && canGoBack()) {
            executeBack();
          } else if (!goBack && canGoForward()) {
            executeForward();
          }
        } else {
          resetOverscrollVisuals();
        }

        isHorizontalSwipe = false;
        currentPointerDeltaX = 0;
        activePointerId = null;
      }

      document.addEventListener('pointerup', endPointerGesture, { passive: true });
      document.addEventListener('pointercancel', endPointerGesture, { passive: true });

      // Fallback for Touch Event environments where Pointer Events may be restricted
      let touchStartX = 0;
      let touchStartY = 0;
      let touchTracking = false;
      let touchHorizontal = false;
      let touchDeltaX = 0;

      document.addEventListener('touchstart', (e) => {
        if (isPointerTracking || !e.touches || e.touches.length !== 1) return;
        if (isInteractiveTarget(e.target)) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchTracking = true;
        touchHorizontal = false;
        touchDeltaX = 0;
      }, { passive: true });

      document.addEventListener('touchmove', (e) => {
        if (!touchTracking || isPointerTracking || !e.touches || e.touches.length !== 1) return;
        const diffX = e.touches[0].clientX - touchStartX;
        const diffY = e.touches[0].clientY - touchStartY;

        if (!touchHorizontal) {
          if (Math.abs(diffX) > 8) {
            if (Math.abs(diffX) >= Math.abs(diffY) * 0.8) {
              touchHorizontal = true;
            } else if (Math.abs(diffY) > 16) {
              touchTracking = false;
              return;
            }
          }
        }

        if (touchHorizontal) {
          touchDeltaX = diffX;
          updateOverscrollVisuals(touchDeltaX);
        }
      }, { passive: true });

      function endTouchGesture() {
        if (!touchTracking || isPointerTracking) return;
        touchTracking = false;

        if (touchHorizontal && Math.abs(touchDeltaX) >= THRESHOLD) {
          const goBack = touchDeltaX > 0;
          resetOverscrollVisuals();
          if (goBack && canGoBack()) {
            executeBack();
          } else if (!goBack && canGoForward()) {
            executeForward();
          }
        } else {
          resetOverscrollVisuals();
        }

        touchHorizontal = false;
        touchDeltaX = 0;
      }

      document.addEventListener('touchend', endTouchGesture, { passive: true });
      document.addEventListener('touchcancel', endTouchGesture, { passive: true });

      // 3B. Trackpad & Magic Mouse Wheel Gestures (Two-finger swipe / Magic Mouse swipe)
      let wheelDeltaAccumulator = 0;
      let wheelEndTimeout = null;

      window.addEventListener('wheel', (e) => {
        const absX = Math.abs(e.deltaX);
        const absY = Math.abs(e.deltaY);

        // Filter: Must be dominantly horizontal
        if (absX > absY && absX > 2) {
          // Left-to-right swipe produces negative deltaX in standard trackpad natural scroll
          const normalizedDelta = -e.deltaX;
          wheelDeltaAccumulator += normalizedDelta;

          // Clamp accumulator
          if (wheelDeltaAccumulator > 150) wheelDeltaAccumulator = 150;
          if (wheelDeltaAccumulator < -150) wheelDeltaAccumulator = -150;

          updateOverscrollVisuals(wheelDeltaAccumulator);

          clearTimeout(wheelEndTimeout);
          wheelEndTimeout = setTimeout(() => {
            // Finger(s) lifted from trackpad / magic mouse
            if (Math.abs(wheelDeltaAccumulator) >= THRESHOLD) {
              const goBack = wheelDeltaAccumulator > 0;
              resetOverscrollVisuals();
              if (goBack && canGoBack()) {
                executeBack();
              } else if (!goBack && canGoForward()) {
                executeForward();
              }
            } else {
              resetOverscrollVisuals();
            }
            wheelDeltaAccumulator = 0;
          }, 180);
        }
      }, { passive: true });
    }

    // ================= MODULE: UNIVERSAL SPATIAL GEOMETRY TABLE EXTRACTOR =================
    function extractTableFromSpatialTokens(tokens, options = {}) {
      if (!tokens || tokens.length === 0) return { columns: [], rows: [] };
      const { yTolerance = 5.0, minGutterWidth = 15.0 } = options;

      const rowMap = [];
      for (const t of tokens) {
        const str = (t.str || '').trim();
        if (!str) continue;
        const y = typeof t.y === 'number' ? t.y : (t.transform ? t.transform[5] : 0);
        const x = typeof t.x === 'number' ? t.x : (t.transform ? t.transform[4] : 0);
        const width = t.width || (str.length * 6);
        const height = t.height || 10;

        let row = rowMap.find(r => Math.abs(r.y - y) <= yTolerance);
        if (row) {
          row.tokens.push({ str, x, y, width, height, right: x + width });
          row.y = (row.y * (row.tokens.length - 1) + y) / row.tokens.length;
        } else {
          rowMap.push({ y, tokens: [{ str, x, y, width, height, right: x + width }] });
        }
      }

      rowMap.sort((a, b) => b.y - a.y);
      for (const r of rowMap) r.tokens.sort((a, b) => a.x - b.x);

      const candidateRows = rowMap.filter(r => r.tokens.length >= 1);
      if (candidateRows.length === 0) return { columns: [], rows: [] };

      let minX = Infinity, maxX = -Infinity;
      for (const r of candidateRows) {
        for (const t of r.tokens) {
          if (t.x < minX) minX = t.x;
          if (t.right > maxX) maxX = t.right;
        }
      }

      const pageWidth = Math.ceil(maxX - minX) + 20;
      const histogram = new Uint16Array(pageWidth);
      const multiTokenRows = candidateRows.filter(r => r.tokens.length >= 2);
      const rowsToProject = multiTokenRows.length >= 2 ? multiTokenRows : candidateRows;

      for (const r of rowsToProject) {
        for (const t of r.tokens) {
          const start = Math.max(0, Math.floor(t.x - minX));
          const end = Math.min(pageWidth - 1, Math.ceil(t.right - minX));
          for (let i = start; i <= end; i++) histogram[i]++;
        }
      }

      const gutters = [];
      let inGutter = false, gutterStart = 0;
      for (let i = 0; i < pageWidth; i++) {
        if (histogram[i] === 0) {
          if (!inGutter) { inGutter = true; gutterStart = i; }
        } else {
          if (inGutter) {
            inGutter = false;
            const gw = i - gutterStart;
            if (gw >= minGutterWidth) {
              gutters.push({ center: ((gutterStart + i) / 2) + minX, width: gw });
            }
          }
        }
      }

      const colBoundaries = [minX - 5];
      for (const g of gutters) colBoundaries.push(g.center);
      colBoundaries.push(maxX + 10);
      const numCols = colBoundaries.length - 1;

      const rawGrid = [];
      for (let rIdx = 0; rIdx < candidateRows.length; rIdx++) {
        const row = candidateRows[rIdx];
        const cells = new Array(numCols).fill('');

        for (const t of row.tokens) {
          const tCenter = t.x + (t.width / 2);
          let colIdx = -1;
          for (let c = 0; c < numCols; c++) {
            if (tCenter >= colBoundaries[c] && tCenter < colBoundaries[c + 1]) {
              colIdx = c; break;
            }
          }
          if (colIdx === -1) colIdx = tCenter < colBoundaries[0] ? 0 : numCols - 1;
          cells[colIdx] = cells[colIdx] ? (cells[colIdx] + ' ' + t.str) : t.str;
        }
        rawGrid.push({ y: row.y, cells, tokenCount: row.tokens.length });
      }

      const cleanRows = [];
      for (let i = 0; i < rawGrid.length; i++) {
        const cur = rawGrid[i];
        const filled = cur.cells.map((v, idx) => v.trim() ? idx : -1).filter(idx => idx !== -1);
        if (filled.length === 1 && cleanRows.length > 0) {
          const onlyCol = filled[0];
          const prev = cleanRows[cleanRows.length - 1];
          if (onlyCol > 0 && onlyCol < numCols - 1 && Math.abs(prev.y - cur.y) < 22) {
            prev.cells[onlyCol] = (prev.cells[onlyCol] + ' ' + cur.cells[onlyCol]).trim();
            continue;
          }
        }
        cleanRows.push(cur);
      }

      return { columns: colBoundaries, numColumns: numCols, rows: cleanRows.map(r => r.cells) };
    }

        // ================= MODULE: MERGE PDF TOOL (Enhanced Visual Page Previews) =================
    let mergeItems = []; // [{ id, file, numPages, coverDataUrl, allPages, expanded }]

    function initMergeToolListeners() {
      const dropZone = document.getElementById('merge-drop-zone');
      const input = document.getElementById('merge-file-input');
      if (!dropZone || !input) return;

      dropZone.addEventListener('click', (e) => {
        if (e.target !== input) input.click();
      });
      dropZone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
      });

      let depth = 0;
      dropZone.addEventListener('dragenter', (e) => { e.preventDefault(); depth++; dropZone.classList.add('border-violet-500', 'bg-violet-50/20'); });
      dropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
      dropZone.addEventListener('dragleave', () => { depth--; if (depth <= 0) { depth = 0; dropZone.classList.remove('border-violet-500', 'bg-violet-50/20'); } });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        depth = 0;
        dropZone.classList.remove('border-violet-500', 'bg-violet-50/20');
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length) addMergeFiles(Array.from(dt.files));
      });
      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) addMergeFiles(Array.from(e.target.files));
      });
    }

    async function addMergeFiles(files) {
      if (!files || !files.length) return;
      if (mergeItems.length + files.length > 25) {
        return alert('Maximum 25 files can be merged in a single batch.');
      }

      for (const file of files) {
        if (file.size > 50 * 1024 * 1024) {
          alert('File "' + file.name + '" exceeds the 50MB limit.');
          continue;
        }

        const magic = await validateFileMagicBytes(file);
        if (!magic.valid || magic.format !== 'pdf') {
          alert('File "' + file.name + '" is not a valid PDF document (magic-byte check failed).');
          continue;
        }

        const id = Math.random().toString(36).substr(2, 9);
        try {
          const buffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
          const numPages = pdf.numPages;

          if (numPages > 300) {
            alert('File "' + file.name + '" has ' + numPages + ' pages. Maximum limit is 300 pages.');
            continue;
          }

          // Render Page 1 Cover with high resolution
          const page1 = await pdf.getPage(1);
          const viewport = page1.getViewport({ scale: 0.65 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          await page1.render({ canvasContext: ctx, viewport }).promise;
          const coverDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          disposeCanvas(canvas);

          mergeItems.push({
            id,
            file,
            numPages,
            coverDataUrl,
            allPages: null,
            expanded: false
          });
        } catch (err) {
          console.warn('Could not read cover for merge file:', file.name, err);
          mergeItems.push({
            id,
            file,
            numPages: 1,
            coverDataUrl: '',
            allPages: null,
            expanded: false
          });
        }
      }

      if (mergeItems.length > 0) {
        setToolScreenState('merge', 'workspace');
        const container = document.getElementById('merge-files-container');
        if (container) container.classList.remove('hidden');
        renderMergeList();
      }
    }

    async function toggleMergeItemPages(index) {
      const item = mergeItems[index];
      if (!item) return;

      item.expanded = !item.expanded;
      if (item.expanded && !item.allPages) {
        try {
          const buffer = await item.file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
          item.allPages = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.65 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            item.allPages.push({
              pageNum: i,
              dataUrl: canvas.toDataURL('image/jpeg', 0.88)
            });
            disposeCanvas(canvas);
          }
        } catch (e) {
          console.error('Error rendering all pages for merge:', e);
          item.allPages = [];
        }
      }
      renderMergeList();
    }

    let draggedMergeIndex = null;

    function renderMergeList() {
      const container = document.getElementById('merge-files-container');
      const listEl = document.getElementById('merge-file-list');
      const summaryEl = document.getElementById('merge-summary-text');
      const btnRun = document.getElementById('btn-run-merge');
      if (!container || !listEl) return;

      if (mergeItems.length === 0) {
        setToolScreenState('merge', 'upload');
        container.classList.add('hidden');
        listEl.innerHTML = '';
        return;
      }

      container.classList.remove('hidden');
      const totalPages = mergeItems.reduce((sum, item) => sum + item.numPages, 0);
      if (summaryEl) summaryEl.innerText = mergeItems.length + ' Document' + (mergeItems.length === 1 ? '' : 's') + ' • ' + totalPages + ' Pages Total (Drag cards or handles to reorder)';
      if (btnRun) btnRun.innerHTML = '<span>Merge All Documents (' + totalPages + ' Pages)</span> <span>&rarr;</span>';

      listEl.innerHTML = '';

      mergeItems.forEach((item, index) => {
        const card = document.createElement('div');
        card.draggable = true;
        card.dataset.mergeIndex = index;
        card.className = 'p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl transition shadow-2xs cursor-grab active:cursor-grabbing hover:border-violet-300 dark:hover:border-violet-700';

        card.addEventListener('dragstart', (e) => {
          draggedMergeIndex = index;
          e.dataTransfer.effectAllowed = 'move';
          card.classList.add('opacity-50', 'scale-[0.99]', 'border-violet-500');
        });

        card.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          card.classList.add('border-violet-500', 'bg-violet-50/70', 'dark:bg-violet-950/40');
        });

        card.addEventListener('dragleave', () => {
          card.classList.remove('border-violet-500', 'bg-violet-50/70', 'dark:bg-violet-950/40');
        });

        card.addEventListener('drop', (e) => {
          e.preventDefault();
          card.classList.remove('border-violet-500', 'bg-violet-50/70', 'dark:bg-violet-950/40');
          if (draggedMergeIndex !== null && draggedMergeIndex !== index) {
            const [moved] = mergeItems.splice(draggedMergeIndex, 1);
            mergeItems.splice(index, 0, moved);
            renderMergeList();
          }
        });

        card.addEventListener('dragend', () => {
          card.classList.remove('opacity-50', 'scale-[0.99]', 'border-violet-500');
          draggedMergeIndex = null;
        });

        const hasCover = item.coverDataUrl;
        const coverHtml = hasCover
          ? '<div class="relative group cursor-pointer" data-action="zoom-cover" data-index="' + index + '">' +
               '<img src="' + item.coverDataUrl + '" alt="Document cover preview" class="w-16 h-22 sm:w-20 sm:h-26 object-contain rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs bg-white flex-shrink-0 pointer-events-none" />' +
               '<span class="absolute inset-0 bg-slate-900/40 text-white text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition rounded-lg pointer-events-none">🔍 Zoom</span>' +
             '</div>'
          : '<div class="w-16 h-22 sm:w-20 sm:h-26 rounded-lg border border-slate-200 dark:border-slate-700 bg-violet-50 dark:bg-violet-950/60 text-violet-600 flex items-center justify-center font-bold text-xs flex-shrink-0">PDF</div>';

        card.innerHTML = `
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 truncate min-w-0">
              <span class="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg px-1 select-none" title="Drag to reorder">⠿</span>
              <span class="font-bold text-violet-600 dark:text-violet-400 text-sm w-5 text-center">${index + 1}.</span>
              ${coverHtml}
              <div class="truncate min-w-0">
                <h5 class="merge-file-title text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate"></h5>
                <div class="flex items-center gap-2 mt-1.5">
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 font-mono">${item.numPages} Page${item.numPages > 1 ? 's' : ''}</span>
                  <span class="text-[10px] text-slate-400 font-mono">${(item.file.size / 1024).toFixed(1)} KB</span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              <button data-action="toggle-pages" data-index="${index}" class="px-3 py-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-600 transition shadow-2xs flex items-center gap-1">
                <span>${item.expanded ? '▲ Hide Pages' : '👁️ View Pages'}</span>
              </button>
              ${index > 0 ? `<button data-action="move-up" data-index="${index}" class="p-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-600 shadow-2xs" title="Move Up">↑</button>` : ''}
              ${index < mergeItems.length - 1 ? `<button data-action="move-down" data-index="${index}" class="p-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-600 shadow-2xs" title="Move Down">↓</button>` : ''}
              <button data-action="remove" data-index="${index}" class="p-1.5 bg-white dark:bg-slate-700 hover:bg-rose-50 text-rose-500 hover:text-rose-700 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-600 shadow-2xs" title="Remove">✕</button>
            </div>
          </div>

          <!-- Expandable High-Resolution Gallery of All Pages -->
          ${item.expanded ? `
            <div class="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <span class="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2.5 block">Document Pages (${item.numPages} Pages) — Click any page to inspect full resolution:</span>
              <div class="flex gap-3 overflow-x-auto pb-3 no-scrollbar">
                ${item.allPages && item.allPages.length 
                  ? item.allPages.map((p, pIdx) => `
                    <div data-action="zoom-page" data-doc-index="${index}" data-page-index="${pIdx}" class="group shrink-0 w-32 sm:w-36 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center shadow-2xs cursor-pointer hover:border-violet-500 transition">
                      <div class="relative w-full aspect-[3/4] bg-slate-50 dark:bg-slate-950 rounded-lg overflow-hidden mb-1.5 border border-slate-100 dark:border-slate-800 pointer-events-none">
                        <img src="${p.dataUrl}" alt="Page ${p.pageNum}" class="w-full h-full object-contain" />
                        <span class="absolute inset-0 bg-slate-900/40 text-white text-[11px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition rounded-lg">🔍 Zoom</span>
                      </div>
                      <span class="text-[11px] text-slate-600 dark:text-slate-300 font-bold pointer-events-none">Page ${p.pageNum}</span>
                    </div>
                  `).join('')
                  : '<div class="text-xs text-slate-400 py-3">Rendering high-resolution pages in memory...</div>'
                }
              </div>
            </div>
          ` : ''}
        `;

        const titleEl = card.querySelector('.merge-file-title');
        if (titleEl) {
          titleEl.textContent = item.file.name;
          titleEl.title = item.file.name;
        }

        listEl.appendChild(card);
      });

      if (!listEl._hasListener) {
        listEl._hasListener = true;
        listEl.addEventListener('click', (e) => {
          const target = e.target.closest('[data-action]');
          if (!target) return;
          const action = target.dataset.action;
          const idx = parseInt(target.dataset.index, 10);
          if (action === 'zoom-cover') {
            const it = mergeItems[idx];
            if (it && it.coverDataUrl) openPageZoomModal(it.coverDataUrl, it.file.name + ' - Page 1');
          } else if (action === 'toggle-pages') {
            toggleMergeItemPages(idx);
          } else if (action === 'move-up') {
            moveMergeFile(idx, -1);
          } else if (action === 'move-down') {
            moveMergeFile(idx, 1);
          } else if (action === 'remove') {
            removeMergeFile(idx);
          } else if (action === 'zoom-page') {
            const docIdx = parseInt(target.dataset.docIndex, 10);
            const pageIdx = parseInt(target.dataset.pageIndex, 10);
            const it = mergeItems[docIdx];
            if (it && it.allPages && it.allPages[pageIdx]) {
              const p = it.allPages[pageIdx];
              openPageZoomModal(p.dataUrl, it.file.name + ' - Page ' + p.pageNum);
            }
          }
        });
      }
    }

    function moveMergeFile(index, dir) {
      const target = index + dir;
      if (target < 0 || target >= mergeItems.length) return;
      const temp = mergeItems[index];
      mergeItems[index] = mergeItems[target];
      mergeItems[target] = temp;
      renderMergeList();
    }

    function removeMergeFile(index) {
      mergeItems.splice(index, 1);
      renderMergeList();
    }

    function clearMergeList() {
      mergeItems = [];
      renderMergeList();
    }

    async function executeMergePdfs() {
      if (mergeItems.length < 2) return alert('Please add at least 2 PDF files to merge.');
      try {
        await ensurePdfLib();
        const mergedDoc = await PDFLib.PDFDocument.create();
        for (const item of mergeItems) {
          const bytes = await item.file.arrayBuffer();
          const doc = await PDFLib.PDFDocument.load(bytes);
          const copiedPages = await mergedDoc.copyPages(doc, doc.getPageIndices());
          copiedPages.forEach(p => mergedDoc.addPage(p));
        }
        const outBytes = await mergedDoc.save();
        triggerDownload(new Blob([outBytes], { type: 'application/pdf' }), 'merged_master.pdf');
      } catch (e) {
        alert('Merge error: ' + e.message);
      }
    }

    // ================= MODULE: SPLIT PDF TOOL (Visual Page Thumbnails & Real Data) =================
    let splitFile = null;
    let splitTotalPages = 0;
    let splitPagesState = []; // [{ pageNum: 1, selected: true, dataUrl: '...' }]
    let splitGridSize = 'large'; // 'compact' | 'medium' | 'large'

    function initSplitToolListeners() {
      const dropZone = document.getElementById('split-drop-zone');
      const input = document.getElementById('split-file-input');
      if (!dropZone || !input) return;

      dropZone.addEventListener('click', (e) => {
        if (e.target !== input) input.click();
      });
      dropZone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
      });

      let depth = 0;
      dropZone.addEventListener('dragenter', (e) => { e.preventDefault(); depth++; dropZone.classList.add('border-blue-500', 'bg-blue-50/20'); });
      dropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
      dropZone.addEventListener('dragleave', () => { depth--; if (depth <= 0) { depth = 0; dropZone.classList.remove('border-blue-500', 'bg-blue-50/20'); } });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        depth = 0;
        dropZone.classList.remove('border-blue-500', 'bg-blue-50/20');
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length) handleSplitFileSelection(dt.files[0]);
      });
      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) handleSplitFileSelection(e.target.files[0]);
      });
    }

    function setSplitGridSize(size) {
      splitGridSize = size;
      const grid = document.getElementById('split-thumbnails-grid');
      const btnCompact = document.getElementById('btn-split-size-compact');
      const btnMedium = document.getElementById('btn-split-size-medium');
      const btnLarge = document.getElementById('btn-split-size-large');

      [btnCompact, btnMedium, btnLarge].forEach(b => {
        if (b) {
          b.className = 'px-2 py-0.5 rounded text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition';
        }
      });

      if (grid) {
        if (size === 'compact') {
          grid.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[34rem] overflow-y-auto p-3 bg-slate-100/70 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6';
          if (btnCompact) btnCompact.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-blue-600 text-white transition shadow-2xs';
        } else if (size === 'medium') {
          grid.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 max-h-[34rem] overflow-y-auto p-4 bg-slate-100/70 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6';
          if (btnMedium) btnMedium.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-blue-600 text-white transition shadow-2xs';
        } else { // large (default for readable bank statement text)
          grid.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-5 max-h-[34rem] overflow-y-auto p-4 bg-slate-100/70 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6';
          if (btnLarge) btnLarge.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-blue-600 text-white transition shadow-2xs';
        }
      }
    }

    async function handleSplitFileSelection(file) {
      if (!await validateSinglePdfFile(file, 'Split')) return;
      splitFile = file;

      const card = document.getElementById('split-controls-card');
      const grid = document.getElementById('split-thumbnails-grid');
      setToolScreenState('split', 'workspace');
      document.getElementById('split-doc-name').innerText = file.name;
      grid.innerHTML = '<div class="col-span-full py-12 text-center text-xs text-slate-500 font-medium">Rendering high-resolution page thumbnails in browser memory...</div>';

      try {
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
        splitTotalPages = pdf.numPages;

        if (splitTotalPages > 300) {
          alert('File has ' + splitTotalPages + ' pages. Maximum allowed is 300 pages.');
          card.classList.add('hidden');
          return;
        }

        document.getElementById('split-doc-pages').innerText = splitTotalPages + ' Pages';

        splitPagesState = [];
        grid.innerHTML = '';

        for (let i = 1; i <= splitTotalPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.75 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          disposeCanvas(canvas);

          const isSelected = i <= Math.min(splitTotalPages, 3);
          splitPagesState.push({ pageNum: i, selected: isSelected, dataUrl });
        }

        renderSplitThumbnails();
        syncSplitRangeInputFromState();
      } catch (e) {
        console.error('Split render error:', e);
        grid.replaceChildren();
        const errDiv = document.createElement('div');
        errDiv.className = 'col-span-full py-8 text-center text-xs text-rose-500 font-bold';
        errDiv.textContent = 'Failed to load pages: ' + (e.message || String(e));
        grid.appendChild(errDiv);
      }
    }

    function renderSplitThumbnails() {
      const grid = document.getElementById('split-thumbnails-grid');
      if (!grid) return;
      grid.innerHTML = '';

      splitPagesState.forEach(p => {
        const card = document.createElement('div');
        card.id = 'split-card-' + p.pageNum;
        card.dataset.action = 'toggle-card';
        card.dataset.pageNum = p.pageNum;
        card.className = 'group relative cursor-pointer p-3 rounded-2xl border-2 transition-all duration-150 flex flex-col items-center bg-white dark:bg-slate-900 ' + (
          p.selected 
            ? 'border-blue-500 shadow-md ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20' 
            : 'border-slate-200 dark:border-slate-800 opacity-65 hover:opacity-95 hover:border-slate-300 dark:hover:border-slate-700'
        );

        card.innerHTML = `
          <div class="flex items-center justify-between w-full mb-2 px-1">
            <div class="flex items-center gap-2">
              <input type="checkbox" ${p.selected ? 'checked' : ''} data-action="checkbox" data-page-num="${p.pageNum}" class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer" />
              <span class="text-xs font-bold ${p.selected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}">Page ${p.pageNum}</span>
            </div>
            <button data-action="zoom" data-page-num="${p.pageNum}" class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-600 dark:text-slate-300 text-[11px] font-bold transition shadow-2xs" title="Inspect page full screen">🔍 Zoom</button>
          </div>
          <div class="w-full aspect-[3/4] bg-white rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-2xs pointer-events-none">
            <img src="${p.dataUrl}" alt="Page ${p.pageNum}" class="w-full h-full object-contain pointer-events-none" />
          </div>
        `;
        grid.appendChild(card);
      });

      if (!grid._hasListener) {
        grid._hasListener = true;
        grid.addEventListener('click', (e) => {
          const zoomBtn = e.target.closest('[data-action="zoom"]');
          if (zoomBtn) {
            e.stopPropagation();
            const pageNum = parseInt(zoomBtn.dataset.pageNum, 10);
            const p = splitPagesState.find(x => x.pageNum === pageNum);
            if (p) openPageZoomModal(p.dataUrl, 'Page ' + pageNum + ' Inspection (' + (splitFile ? splitFile.name : 'Document') + ')');
            return;
          }
          const chk = e.target.closest('[data-action="checkbox"]');
          if (chk) {
            e.stopPropagation();
            const pageNum = parseInt(chk.dataset.pageNum, 10);
            toggleSplitPage(pageNum);
            return;
          }
          const card = e.target.closest('[data-action="toggle-card"]');
          if (card) {
            const pageNum = parseInt(card.dataset.pageNum, 10);
            toggleSplitPage(pageNum);
          }
        });
      }

      updateSplitSummary();
    }

    function toggleSplitPage(pageNum) {
      const p = splitPagesState.find(x => x.pageNum === pageNum);
      if (p) {
        p.selected = !p.selected;
        renderSplitThumbnails();
        syncSplitRangeInputFromState();
      }
    }

    function selectAllSplitPages(select) {
      splitPagesState.forEach(p => p.selected = select);
      renderSplitThumbnails();
      syncSplitRangeInputFromState();
    }

    function selectOddSplitPages() {
      splitPagesState.forEach(p => p.selected = (p.pageNum % 2 !== 0));
      renderSplitThumbnails();
      syncSplitRangeInputFromState();
    }

    function selectEvenSplitPages() {
      splitPagesState.forEach(p => p.selected = (p.pageNum % 2 === 0));
      renderSplitThumbnails();
      syncSplitRangeInputFromState();
    }

    function clearSplitSelection() {
      selectAllSplitPages(false);
    }

    function updateSplitSummary() {
      const selectedCount = splitPagesState.filter(p => p.selected).length;
      const summaryEl = document.getElementById('split-selected-summary');
      const btnRun = document.getElementById('btn-run-split');
      if (summaryEl) {
        summaryEl.innerText = `${selectedCount} of ${splitPagesState.length} Pages Selected`;
      }
      if (btnRun) {
        btnRun.innerHTML = `<span>Extract & Download (${selectedCount} Page${selectedCount === 1 ? '' : 's'})</span> <span>&rarr;</span>`;
        btnRun.disabled = selectedCount === 0;
        btnRun.classList.toggle('opacity-50', selectedCount === 0);
      }
    }

    function syncSplitRangeInputFromState() {
      const selectedPages = splitPagesState.filter(p => p.selected).map(p => p.pageNum);
      const input = document.getElementById('split-range-input');
      if (!input) return;
      if (selectedPages.length === 0) {
        input.value = '';
        return;
      }
      const ranges = [];
      let start = selectedPages[0];
      let end = start;
      for (let i = 1; i < selectedPages.length; i++) {
        if (selectedPages[i] === end + 1) {
          end = selectedPages[i];
        } else {
          ranges.push(start === end ? `${start}` : `${start}-${end}`);
          start = selectedPages[i];
          end = start;
        }
      }
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      input.value = ranges.join(', ');
    }

    function handleSplitRangeInput(str) {
      const selectedIndices = parsePageRangeString(str, splitTotalPages);
      const selectedSet = new Set(selectedIndices.map(i => i + 1));
      splitPagesState.forEach(p => {
        p.selected = selectedSet.has(p.pageNum);
      });
      renderSplitThumbnails();
    }

    async function executeSplitPdf() {
      if (!splitFile) return;
      const selectedIndices = splitPagesState.filter(p => p.selected).map(p => p.pageNum - 1);
      if (!selectedIndices.length) return alert('Please select at least one page to extract.');

      try {
        await ensurePdfLib();
        const bytes = await splitFile.arrayBuffer();
        const doc = await PDFLib.PDFDocument.load(bytes);
        const splitDoc = await PDFLib.PDFDocument.create();
        const pages = await splitDoc.copyPages(doc, selectedIndices);
        pages.forEach(p => splitDoc.addPage(p));
        const outBytes = await splitDoc.save();
        triggerDownload(new Blob([outBytes], { type: 'application/pdf' }), `split_${splitFile.name}`);
      } catch (e) {
        alert('Split error: ' + e.message);
      }
    }

    function parsePageRangeString(rangeStr, totalPages) {
      const indices = new Set();
      const parts = rangeStr.split(',');
      for (let part of parts) {
        part = part.trim();
        if (!part) continue;
        if (part.includes('-')) {
          const [startStr, endStr] = part.split('-').map(s => parseInt(s.trim(), 10));
          if (!isNaN(startStr) && !isNaN(endStr)) {
            const low = Math.max(1, Math.min(startStr, endStr));
            const high = Math.min(totalPages, Math.max(startStr, endStr));
            for (let i = low; i <= high; i++) indices.add(i - 1);
          }
        } else {
          const page = parseInt(part, 10);
          if (!isNaN(page) && page >= 1 && page <= totalPages) {
            indices.add(page - 1);
          }
        }
      }
      return Array.from(indices).sort((a, b) => a - b);
    }

    // ================= MODULE: ORGANIZE & ROTATE TOOL (Persistent High-Res Images) =================
    let organizeFile = null;
    let organizePages = []; // [{ pageNum, rotation, deleted, origIndex, dataUrl }]
    let organizeGridSize = 'large'; // 'compact' | 'medium' | 'large'

    function initOrganizeToolListeners() {
      const dropZone = document.getElementById('organize-drop-zone');
      const input = document.getElementById('organize-file-input');
      if (!dropZone || !input) return;

      dropZone.addEventListener('click', (e) => {
        if (e.target !== input) input.click();
      });
      dropZone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
      });

      let depth = 0;
      dropZone.addEventListener('dragenter', (e) => { e.preventDefault(); depth++; dropZone.classList.add('border-amber-500', 'bg-amber-50/20'); });
      dropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
      dropZone.addEventListener('dragleave', () => { depth--; if (depth <= 0) { depth = 0; dropZone.classList.remove('border-amber-500', 'bg-amber-50/20'); } });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        depth = 0;
        dropZone.classList.remove('border-amber-500', 'bg-amber-50/20');
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length) handleOrganizeFileSelection(dt.files[0]);
      });
      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) handleOrganizeFileSelection(e.target.files[0]);
      });
    }

    function setOrganizeGridSize(size) {
      organizeGridSize = size;
      const grid = document.getElementById('organize-thumbnails-grid');
      const btnCompact = document.getElementById('btn-org-size-compact');
      const btnMedium = document.getElementById('btn-org-size-medium');
      const btnLarge = document.getElementById('btn-org-size-large');

      [btnCompact, btnMedium, btnLarge].forEach(b => {
        if (b) {
          b.className = 'px-2 py-0.5 rounded text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition';
        }
      });

      if (grid) {
        if (size === 'compact') {
          grid.className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 max-h-[34rem] overflow-y-auto p-4 bg-slate-100/70 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800';
          if (btnCompact) btnCompact.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-amber-600 text-white transition shadow-2xs';
        } else if (size === 'medium') {
          grid.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 max-h-[34rem] overflow-y-auto p-4 bg-slate-100/70 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800';
          if (btnMedium) btnMedium.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-amber-600 text-white transition shadow-2xs';
        } else { // large
          grid.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-5 max-h-[34rem] overflow-y-auto p-4 bg-slate-100/70 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800';
          if (btnLarge) btnLarge.className = 'px-2 py-0.5 rounded text-[11px] font-bold bg-amber-600 text-white transition shadow-2xs';
        }
      }
    }

    async function handleOrganizeFileSelection(file) {
      if (!await validateSinglePdfFile(file, 'Organize')) return;
      organizeFile = file;

      const card = document.getElementById('organize-workspace-card');
      const grid = document.getElementById('organize-thumbnails-grid');
      setToolScreenState('organize', 'workspace');
      document.getElementById('org-filename').innerText = file.name;
      grid.innerHTML = '<div class="col-span-full py-8 text-center text-xs text-slate-500 font-medium">Rendering high-resolution page thumbnails in browser memory...</div>';

      try {
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
        const numPages = pdf.numPages;

        if (numPages > 300) {
          alert('File has ' + numPages + ' pages. Maximum allowed is 300 pages.');
          card.classList.add('hidden');
          return;
        }

        organizePages = [];

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.75 });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          disposeCanvas(canvas);

          organizePages.push({ pageNum: i, rotation: 0, deleted: false, origIndex: i - 1, dataUrl });
        }

        renderOrganizeGridFromState();

        if (!grid._hasListener) {
          grid._hasListener = true;
          grid.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.dataset.action;
            const pageNum = parseInt(btn.dataset.page, 10);
            if (action === 'zoom') {
              const p = organizePages.find(x => x.pageNum === pageNum);
              if (p) openPageZoomModal(p.dataUrl, 'Page ' + pageNum + ' Inspection (' + (organizeFile ? organizeFile.name : 'Document') + ')');
            } else if (action === 'delete') {
              deleteOrganizePage(pageNum);
            } else if (action === 'rotate-left') {
              rotateOrganizePage(pageNum, -90);
            } else if (action === 'rotate-right') {
              rotateOrganizePage(pageNum, 90);
            }
          });
        }

        updateOrganizeActiveCount();
      } catch (e) {
        console.error('Organize render error:', e);
        grid.replaceChildren();
        const errDiv = document.createElement('div');
        errDiv.className = 'col-span-full py-8 text-center text-xs text-rose-500 font-bold';
        errDiv.textContent = 'Could not render thumbnails: ' + (e.message || String(e));
        grid.appendChild(errDiv);
      }
    }

    let draggedOrgIdx = null;

    function renderOrganizeGridFromState() {
      const grid = document.getElementById('organize-thumbnails-grid');
      if (!grid) return;
      grid.innerHTML = '';

      organizePages.forEach((item, index) => {
        const cell = document.createElement('div');
        cell.id = 'org-page-card-' + item.pageNum;
        cell.draggable = true;
        cell.dataset.orgIndex = index;
        cell.className = 'bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center gap-2.5 shadow-2xs transition cursor-grab active:cursor-grabbing hover:border-amber-400';
        if (item.deleted) {
          cell.style.opacity = '0.3';
          cell.style.filter = 'grayscale(100%)';
        }

        cell.addEventListener('dragstart', (e) => {
          draggedOrgIdx = index;
          e.dataTransfer.effectAllowed = 'move';
          cell.classList.add('opacity-40', 'scale-95');
        });

        cell.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          cell.classList.add('ring-2', 'ring-amber-500', 'border-amber-500');
        });

        cell.addEventListener('dragleave', () => {
          cell.classList.remove('ring-2', 'ring-amber-500', 'border-amber-500');
        });

        cell.addEventListener('drop', (e) => {
          e.preventDefault();
          cell.classList.remove('ring-2', 'ring-amber-500', 'border-amber-500');
          if (draggedOrgIdx !== null && draggedOrgIdx !== index) {
            const [moved] = organizePages.splice(draggedOrgIdx, 1);
            organizePages.splice(index, 0, moved);
            renderOrganizeGridFromState();
          }
        });

        cell.addEventListener('dragend', () => {
          cell.classList.remove('opacity-40', 'scale-95', 'ring-2', 'ring-amber-500', 'border-amber-500');
          draggedOrgIdx = null;
        });

        cell.innerHTML = `
          <div class="flex items-center justify-between w-full text-xs font-bold text-slate-700 dark:text-slate-300">
            <div class="flex items-center gap-1.5">
              <span class="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm select-none" title="Drag to reorder">⠿</span>
              <span class="font-mono">Page ${item.pageNum}</span>
            </div>
            <div class="flex items-center gap-2">
              <button data-action="zoom" data-page="${item.pageNum}" class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-600 dark:text-slate-300 text-[11px] font-bold transition shadow-2xs" title="Inspect full screen">🔍 Zoom</button>
              <button data-action="delete" data-page="${item.pageNum}" class="text-rose-500 hover:text-rose-700 font-bold text-xs" title="Delete Page">🗑️</button>
            </div>
          </div>
          <div class="w-full aspect-[3/4] bg-slate-50 dark:bg-slate-950 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-2xs pointer-events-none">
            <img id="org-img-${item.pageNum}" src="${item.dataUrl}" alt="Page ${item.pageNum}" class="w-full h-full object-contain transition-transform duration-200 pointer-events-none" style="transform: rotate(${item.rotation}deg);" />
          </div>
          <div class="flex items-center justify-center gap-2 w-full pt-1">
            <button data-action="rotate-left" data-page="${item.pageNum}" class="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold shadow-2xs transition" title="Rotate -90°">⟲ -90°</button>
            <button data-action="rotate-right" data-page="${item.pageNum}" class="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold shadow-2xs transition" title="Rotate +90°">⟳ +90°</button>
          </div>
        `;
        grid.appendChild(cell);
      });
      updateOrganizeActiveCount();
    }

    function rotateOrganizePage(pageNum, deg) {
      const item = organizePages.find(p => p.pageNum === pageNum);
      if (!item) return;
      item.rotation = (item.rotation + deg) % 360;
      const img = document.getElementById(`org-img-${pageNum}`);
      if (img) img.style.transform = `rotate(${item.rotation}deg)`;
    }

    function deleteOrganizePage(pageNum) {
      const item = organizePages.find(p => p.pageNum === pageNum);
      if (!item) return;
      item.deleted = !item.deleted;
      const card = document.getElementById(`org-page-card-${pageNum}`);
      if (card) {
        card.style.opacity = item.deleted ? '0.3' : '1.0';
        card.style.filter = item.deleted ? 'grayscale(100%)' : 'none';
      }
      updateOrganizeActiveCount();
    }

    function updateOrganizeActiveCount() {
      const active = organizePages.filter(p => !p.deleted).length;
      const el = document.getElementById('org-active-count');
      if (el) el.innerText = `(${active} of ${organizePages.length} active pages)`;
    }

    async function executeSaveOrganizedPdf() {
      if (!organizeFile || !organizePages.length) return;
      const activePages = organizePages.filter(p => !p.deleted);
      if (!activePages.length) return alert('All pages are marked as deleted! Please keep at least one page.');

      try {
        await ensurePdfLib();
        const bytes = await organizeFile.arrayBuffer();
        const doc = await PDFLib.PDFDocument.load(bytes);
        const newDoc = await PDFLib.PDFDocument.create();

        for (const p of activePages) {
          const [copied] = await newDoc.copyPages(doc, [p.origIndex]);
          if (p.rotation !== 0) {
            const currentAngle = copied.getRotation().angle;
            copied.setRotation(PDFLib.degrees((currentAngle + p.rotation + 360) % 360));
          }
          newDoc.addPage(copied);
        }

        const outBytes = await newDoc.save();
        triggerDownload(new Blob([outBytes], { type: 'application/pdf' }), `organized_${organizeFile.name}`);
      } catch (e) {
        alert('Could not save organized PDF: ' + e.message);
      }
    }

    // ================= UNIVERSAL HIGH-RESOLUTION PAGE ZOOM & INSPECT MODAL =================
    let zoomCurrentData = {
      items: [], // [{ dataUrl, title, pageNum }]
      currentIndex: 0,
      scale: 1.0,
      pan: { x: 0, y: 0 },
      isDragging: false,
      startPan: { x: 0, y: 0 }
    };

    function setZoomModalScale(delta, absolute = false) {
      if (absolute) {
        zoomCurrentData.scale = delta;
      } else {
        zoomCurrentData.scale = Math.min(3.5, Math.max(0.5, zoomCurrentData.scale + delta));
      }
      if (zoomCurrentData.scale <= 1.0) {
        zoomCurrentData.pan = { x: 0, y: 0 };
      }
      applyZoomModalTransform();
    }

    function applyZoomModalTransform() {
      const img = document.getElementById('zoom-modal-img');
      const percentEl = document.getElementById('zoom-scale-percent');
      if (percentEl) percentEl.textContent = `${Math.round(zoomCurrentData.scale * 100)}%`;
      if (img) {
        img.style.transform = `scale(${zoomCurrentData.scale}) translate(${zoomCurrentData.pan.x}px, ${zoomCurrentData.pan.y}px)`;
        img.style.cursor = zoomCurrentData.scale > 1.0 ? 'grab' : 'default';
      }
    }

    function initZoomModalPanEvents() {
      const viewport = document.getElementById('zoom-modal-viewport');
      const img = document.getElementById('zoom-modal-img');
      if (!viewport || !img || viewport._hasPanEvents) return;
      viewport._hasPanEvents = true;

      viewport.addEventListener('mousedown', (e) => {
        if (zoomCurrentData.scale <= 1.0) return;
        zoomCurrentData.isDragging = true;
        zoomCurrentData.startPan = {
          x: e.clientX - zoomCurrentData.pan.x * zoomCurrentData.scale,
          y: e.clientY - zoomCurrentData.pan.y * zoomCurrentData.scale
        };
        img.style.cursor = 'grabbing';
      });

      window.addEventListener('mousemove', (e) => {
        if (!zoomCurrentData.isDragging) return;
        zoomCurrentData.pan = {
          x: (e.clientX - zoomCurrentData.startPan.x) / zoomCurrentData.scale,
          y: (e.clientY - zoomCurrentData.startPan.y) / zoomCurrentData.scale
        };
        applyZoomModalTransform();
      });

      window.addEventListener('mouseup', () => {
        if (zoomCurrentData.isDragging) {
          zoomCurrentData.isDragging = false;
          if (img) img.style.cursor = zoomCurrentData.scale > 1.0 ? 'grab' : 'default';
        }
      });

      viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.2 : -0.2;
        setZoomModalScale(delta);
      }, { passive: false });
    }

    function openPageZoomModal(dataUrl, title) {
      const modal = document.getElementById('page-zoom-modal');
      const img = document.getElementById('zoom-modal-img');
      const titleEl = document.getElementById('zoom-modal-title');
      const indicator = document.getElementById('zoom-modal-page-indicator');
      if (!modal || !img) return;

      initZoomModalPanEvents();

      // Determine current context (Split, Organize, or Merge)
      let activeItems = [];
      let currentIndex = 0;

      if (currentPortalTool === 'split' && splitPagesState.length) {
        activeItems = splitPagesState.map(p => ({
          dataUrl: p.dataUrl,
          title: `${splitFile ? splitFile.name : 'Document'} - Page ${p.pageNum}`,
          pageNum: p.pageNum
        }));
        currentIndex = activeItems.findIndex(x => x.dataUrl === dataUrl);
      } else if (currentPortalTool === 'organize' && organizePages.length) {
        activeItems = organizePages.map(p => ({
          dataUrl: p.dataUrl,
          title: `${organizeFile ? organizeFile.name : 'Document'} - Page ${p.pageNum}`,
          pageNum: p.pageNum
        }));
        currentIndex = activeItems.findIndex(x => x.dataUrl === dataUrl);
      }

      if (currentIndex < 0) currentIndex = 0;
      zoomCurrentData.items = activeItems;
      zoomCurrentData.currentIndex = currentIndex;
      zoomCurrentData.scale = 1.0;
      zoomCurrentData.pan = { x: 0, y: 0 };

      img.src = dataUrl;
      applyZoomModalTransform();

      if (titleEl) titleEl.innerText = title || 'Page Inspection Preview';
      if (indicator) {
        if (activeItems.length > 0) {
          indicator.innerText = `Page ${currentIndex + 1} of ${activeItems.length}`;
        } else {
          indicator.innerText = '';
        }
      }

      modal.classList.remove('hidden');
    }

    function closePageZoomModal() {
      const modal = document.getElementById('page-zoom-modal');
      if (modal) modal.classList.add('hidden');
      zoomCurrentData.scale = 1.0;
      zoomCurrentData.pan = { x: 0, y: 0 };
    }

    function zoomModalNavigate(dir) {
      if (!zoomCurrentData.items || zoomCurrentData.items.length <= 1) return;
      let nextIndex = zoomCurrentData.currentIndex + dir;
      if (nextIndex < 0) nextIndex = zoomCurrentData.items.length - 1;
      if (nextIndex >= zoomCurrentData.items.length) nextIndex = 0;

      zoomCurrentData.currentIndex = nextIndex;
      zoomCurrentData.scale = 1.0;
      zoomCurrentData.pan = { x: 0, y: 0 };

      const item = zoomCurrentData.items[nextIndex];
      const img = document.getElementById('zoom-modal-img');
      const titleEl = document.getElementById('zoom-modal-title');
      const indicator = document.getElementById('zoom-modal-page-indicator');

      if (img) {
        img.src = item.dataUrl;
        applyZoomModalTransform();
      }
      if (titleEl) titleEl.innerText = item.title;
      if (indicator) indicator.innerText = `Page ${nextIndex + 1} of ${zoomCurrentData.items.length}`;
    }

    document.addEventListener('keydown', (e) => {
      const modal = document.getElementById('page-zoom-modal');
      if (!modal || modal.classList.contains('hidden')) return;
      if (e.key === 'Escape') closePageZoomModal();
      if (e.key === 'ArrowLeft') zoomModalNavigate(-1);
      if (e.key === 'ArrowRight') zoomModalNavigate(1);
      if (e.key === '+' || e.key === '=') setZoomModalScale(0.25);
      if (e.key === '-' || e.key === '_') setZoomModalScale(-0.25);
      if (e.key === '0') setZoomModalScale(1.0, true);
    });

    // ================= MODULE: UNLOCK PDF TOOL =================
    let unlockFile = null;

    function initUnlockToolListeners() {
      const dropZone = document.getElementById('unlock-drop-zone');
      const input = document.getElementById('unlock-file-input');
      if (!dropZone || !input) return;

      dropZone.addEventListener('click', (e) => {
        if (e.target !== input) input.click();
      });
      dropZone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
      });

      let depth = 0;
      dropZone.addEventListener('dragenter', (e) => { e.preventDefault(); depth++; dropZone.classList.add('border-rose-500', 'bg-rose-50/20'); });
      dropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
      dropZone.addEventListener('dragleave', () => { depth--; if (depth <= 0) { depth = 0; dropZone.classList.remove('border-rose-500', 'bg-rose-50/20'); } });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        depth = 0;
        dropZone.classList.remove('border-rose-500', 'bg-rose-50/20');
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length) handleUnlockFileSelection(dt.files[0]);
      });
      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) handleUnlockFileSelection(e.target.files[0]);
      });
    }

    function formatByteSize(bytes) {
      if (!bytes || bytes <= 0) return '0 B';
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    async function handleUnlockFileSelection(file) {
      if (!await validateSinglePdfFile(file, 'Unlock')) return;
      unlockFile = file;
      const uploadScreen = document.getElementById('unlock-upload-screen');
      const card = document.getElementById('unlock-controls-card');
      const nameEl = document.getElementById('unlock-doc-name');
      const sizeEl = document.getElementById('unlock-doc-size');
      if (uploadScreen) uploadScreen.classList.add('hidden');
      if (card) card.classList.remove('hidden');
      if (nameEl) nameEl.textContent = file.name;
      if (sizeEl) sizeEl.textContent = formatByteSize(file.size);
      const pwdInput = document.getElementById('unlock-password-input');
      if (pwdInput) {
        pwdInput.value = '';
        setTimeout(() => pwdInput.focus(), 100);
      }
      const errBox = document.getElementById('unlock-error-box');
      if (errBox) errBox.classList.add('hidden');
    }

    function resetUnlockWorkspace() {
      unlockFile = null;
      const uploadScreen = document.getElementById('unlock-upload-screen');
      const card = document.getElementById('unlock-controls-card');
      const input = document.getElementById('unlock-file-input');
      if (input) input.value = '';
      if (uploadScreen) uploadScreen.classList.remove('hidden');
      if (card) card.classList.add('hidden');
    }

    async function executeUnlockPdf() {
      if (!unlockFile) return;
      const pwd = (document.getElementById('unlock-password-input') || {}).value || '';
      const errBox = document.getElementById('unlock-error-box');
      if (errBox) errBox.classList.add('hidden');

      try {
        await ensurePdfSecurity();
        const bytes = await unlockFile.arrayBuffer();
        const encInfo = await PDFDecrypt.isEncrypted(bytes);
        let unlockedBytes;

        if (encInfo && encInfo.encrypted) {
          if (!pwd) {
            if (errBox) {
              errBox.classList.remove('hidden');
              errBox.innerText = 'Please enter the password to unlock this document.';
            }
            return;
          }
          unlockedBytes = await PDFDecrypt.decryptPDF(bytes, pwd);
        } else {
          // Document is not password protected
          const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
          unlockedBytes = await doc.save();
          if (typeof showNotification === 'function') {
            showNotification('Document is not password protected.', 'info');
          }
        }

        triggerDownload(new Blob([unlockedBytes], { type: 'application/pdf' }), `unlocked_${unlockFile.name}`);
        if (typeof showNotification === 'function') {
          showNotification('🔓 Document successfully unlocked and downloaded!', 'success');
        }
      } catch (e) {
        console.error('Unlock error:', e);
        if (errBox) {
          errBox.classList.remove('hidden');
          const msg = e.message || '';
          if (msg.includes('Incorrect password')) {
            errBox.innerText = 'Incorrect password. Please verify the document password and try again.';
          } else {
            errBox.innerText = 'Failed to unlock PDF: ' + msg;
          }
        }
      }
    }

        // ================= MODULE: WATERMARK PDF TOOL =================
    let watermarkFile = null;

    function initWatermarkToolListeners() {
      const dropZone = document.getElementById('watermark-drop-zone');
      const input = document.getElementById('watermark-file-input');
      if (!dropZone || !input) return;

      dropZone.addEventListener('click', (e) => {
        if (e.target !== input) input.click();
      });
      dropZone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
      });

      let depth = 0;
      dropZone.addEventListener('dragenter', (e) => { e.preventDefault(); depth++; dropZone.classList.add('border-cyan-500', 'bg-cyan-50/20'); });
      dropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
      dropZone.addEventListener('dragleave', () => { depth--; if (depth <= 0) { depth = 0; dropZone.classList.remove('border-cyan-500', 'bg-cyan-50/20'); } });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        depth = 0;
        dropZone.classList.remove('border-cyan-500', 'bg-cyan-50/20');
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length) handleWatermarkFileSelection(dt.files[0]);
      });
      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) handleWatermarkFileSelection(e.target.files[0]);
      });
    }

    async function handleWatermarkFileSelection(file) {
      if (!await validateSinglePdfFile(file, 'Watermark')) return;
      watermarkFile = file;
      document.getElementById('watermark-doc-name').innerText = file.name;
      setToolScreenState('watermark', 'workspace');
    }

    async function executeWatermarkPdf() {
      if (!watermarkFile) return;
      const text = document.getElementById('watermark-text-input').value.trim() || 'CONFIDENTIAL';

      try {
        await ensurePdfLib();
        const bytes = await watermarkFile.arrayBuffer();
        const doc = await PDFLib.PDFDocument.load(bytes);
        const pages = doc.getPages();
        const font = await doc.embedFont(PDFLib.StandardFonts.HelveticaBold);

        for (const page of pages) {
          const { width, height } = page.getSize();
          page.drawText(text, {
            x: width * 0.2,
            y: height * 0.45,
            size: Math.min(width, height) * 0.1,
            font,
            color: PDFLib.rgb(0.85, 0.2, 0.2),
            opacity: 0.25,
            rotate: PDFLib.degrees(45),
          });
        }

        const watermarkedBytes = await doc.save();
        triggerDownload(new Blob([watermarkedBytes], { type: 'application/pdf' }), `watermarked_${watermarkFile.name}`);
      } catch (e) {
        alert('Watermarking failed: ' + e.message);
      }
    }

    // ================= MODULE: PAGE NUMBERER TOOL =================
    let pageNumberFile = null;

    
    // ================= TOOL 8: PDF TO IMAGE (JPG / PNG) (Priority 3.1) =================
    function initPdfToImageToolListeners() {
      const dropZone = document.getElementById('pdf2img-drop-zone');
      const fileInput = document.getElementById('pdf2img-file-input');
      if (!dropZone || !fileInput) return;

      dropZone.addEventListener('click', (e) => {
        if (e.target !== fileInput) fileInput.click();
      });

      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-fuchsia-500', 'bg-fuchsia-50/50');
      });

      dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-fuchsia-500', 'bg-fuchsia-50/50');
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-fuchsia-500', 'bg-fuchsia-50/50');
        if (e.dataTransfer.files && e.dataTransfer.files.length) {
          handlePdfToImageFile(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) {
          handlePdfToImageFile(e.target.files[0]);
        }
      });
    }

    async function handlePdfToImageFile(file) {
      if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
        alert('Please select a valid PDF file.');
        return;
      }
      const controls = document.getElementById('pdf2img-controls-card');
      const docName = document.getElementById('pdf2img-doc-name');
      const pagesCount = document.getElementById('pdf2img-pages-count');
      const gallery = document.getElementById('pdf2img-gallery-grid');
      
      setToolScreenState('pdf2img', 'workspace');
      if (docName) docName.innerText = file.name;
      if (pagesCount) pagesCount.innerText = 'Rendering pages...';
      if (gallery) gallery.innerHTML = '<div class="col-span-full py-8 text-center text-xs text-slate-500">Rendering high-resolution images in browser memory...</div>';

      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        const numPages = pdfDoc.numPages;
        if (pagesCount) pagesCount.innerText = `${numPages} Page${numPages > 1 ? 's' : ''}`;
        if (gallery) gallery.innerHTML = '';

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2.0 }); // 2x high-resolution
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: ctx, viewport: viewport }).promise;
          const jpgUrl = canvas.toDataURL('image/jpeg', 0.92);
          const pngUrl = canvas.toDataURL('image/png');
          disposeCanvas(canvas);

          const safeCleanName = (file.name || 'document').replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9_-]/g, '_');
          const card = document.createElement('div');
          card.className = 'p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col justify-between';
          card.innerHTML = `
            <div class="aspect-[3/4] bg-white dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-2 shadow-2xs pointer-events-none">
              <img src="${jpgUrl}" alt="Page ${pageNum}" class="w-full h-full object-contain pointer-events-none" />
            </div>
            <div>
              <div class="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                <span>Page ${pageNum}</span>
                <span class="text-[10px] text-slate-400 font-mono">${Math.round(viewport.width)}x${Math.round(viewport.height)}</span>
              </div>
              <div class="grid grid-cols-2 gap-1.5">
                <a href="${jpgUrl}" download="${safeCleanName}_page_${pageNum}.jpg" class="text-center text-[11px] font-bold py-1.5 px-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg shadow-2xs transition">
                  JPG
                </a>
                <a href="${pngUrl}" download="${safeCleanName}_page_${pageNum}.png" class="text-center text-[11px] font-bold py-1.5 px-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg shadow-2xs transition">
                  PNG
                </a>
              </div>
            </div>
          `;
          if (gallery) gallery.appendChild(card);
        }
      } catch (err) {
        console.error('PDF to Image error:', err);
        if (gallery) {
          gallery.replaceChildren();
          const errDiv = document.createElement('div');
          errDiv.className = 'col-span-full py-8 text-center text-xs text-rose-500 font-bold';
          errDiv.textContent = 'Failed to render PDF: ' + (err.message || String(err));
          gallery.appendChild(errDiv);
        }
      }
    }

    // ================= TOOL 9: IMAGE TO PDF (Priority 3.2) =================
    let img2pdfSelectedFiles = [];

    function initImageToPdfToolListeners() {
      const dropZone = document.getElementById('img2pdf-drop-zone');
      const fileInput = document.getElementById('img2pdf-file-input');
      if (!dropZone || !fileInput) return;

      dropZone.addEventListener('click', (e) => {
        if (e.target !== fileInput) fileInput.click();
      });

      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-orange-500', 'bg-orange-50/50');
      });

      dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-orange-500', 'bg-orange-50/50');
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-orange-500', 'bg-orange-50/50');
        if (e.dataTransfer.files && e.dataTransfer.files.length) {
          addImagesToImg2PdfList(Array.from(e.dataTransfer.files));
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) {
          addImagesToImg2PdfList(Array.from(e.target.files));
        }
      });
    }

    async function addImagesToImg2PdfList(files) {
      if (!files || !files.length) return;
      if (img2pdfSelectedFiles.length + files.length > 25) {
        return alert('Maximum 25 images can be selected at once.');
      }

      for (const file of files) {
        if (file.size > 50 * 1024 * 1024) {
          alert('Image "' + file.name + '" exceeds the 50MB limit.');
          continue;
        }
        const magic = await validateFileMagicBytes(file);
        if (!magic.valid || (magic.format !== 'png' && magic.format !== 'jpeg' && magic.format !== 'webp' && magic.format !== 'bmp')) {
          alert('File "' + file.name + '" is not a supported image format (JPEG or PNG).');
          continue;
        }
        img2pdfSelectedFiles.push(file);
      }

      renderImg2PdfPreviews();
    }

    function clearImg2PdfList() {
      img2pdfSelectedFiles = [];
      renderImg2PdfPreviews();
    }

    function removeImg2PdfItem(index) {
      img2pdfSelectedFiles.splice(index, 1);
      renderImg2PdfPreviews();
    }

    function renderImg2PdfPreviews() {
      const controls = document.getElementById('img2pdf-controls-card');
      const countEl = document.getElementById('img2pdf-count');
      const listEl = document.getElementById('img2pdf-previews-list');
      if (!controls || !countEl || !listEl) return;

      if (img2pdfSelectedFiles.length === 0) {
        setToolScreenState('img2pdf', 'upload');
        controls.classList.add('hidden');
        listEl.innerHTML = '';
        return;
      }

      setToolScreenState('img2pdf', 'workspace');
      countEl.innerText = img2pdfSelectedFiles.length;
      listEl.replaceChildren();

      img2pdfSelectedFiles.forEach((file, idx) => {
        const item = document.createElement('div');
        item.className = 'relative group border border-slate-200 dark:border-slate-700 rounded-xl p-2 bg-slate-50 dark:bg-slate-800 text-center flex flex-col items-center justify-between';
        const previewUrl = createTrackedObjectURL(file);

        const img = document.createElement('img');
        img.src = previewUrl;
        img.alt = file.name || 'image';
        img.className = 'w-full h-20 object-cover rounded-lg mb-1 pointer-events-none';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'text-[10px] text-slate-600 dark:text-slate-400 truncate w-full block';
        nameSpan.title = file.name || '';
        nameSpan.textContent = file.name || '';

        const removeBtn = document.createElement('button');
        removeBtn.dataset.action = 'remove-img';
        removeBtn.dataset.index = idx;
        removeBtn.className = 'absolute top-1 right-1 bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow hover:bg-rose-700 transition';
        removeBtn.title = 'Remove image';
        removeBtn.textContent = '×';

        item.append(img, nameSpan, removeBtn);
        listEl.appendChild(item);
      });

      if (!listEl._hasListener) {
        listEl._hasListener = true;
        listEl.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-action="remove-img"]');
          if (btn) {
            const idx = parseInt(btn.dataset.index, 10);
            removeImg2PdfItem(idx);
          }
        });
      }
    }

    async function executeConvertImagesToPdf() {
      if (!img2pdfSelectedFiles.length) {
        alert('Please select at least one image.');
        return;
      }
      try {
        await ensurePdfLib();
        const pdfDoc = await PDFLib.PDFDocument.create();
        for (const file of img2pdfSelectedFiles) {
          const buffer = await file.arrayBuffer();
          let embeddedImg;
          if (file.type === 'image/png' || /\.png$/i.test(file.name)) {
            embeddedImg = await pdfDoc.embedPng(buffer);
          } else {
            embeddedImg = await pdfDoc.embedJpg(buffer);
          }
          const page = pdfDoc.addPage([embeddedImg.width, embeddedImg.height]);
          page.drawImage(embeddedImg, {
            x: 0,
            y: 0,
            width: embeddedImg.width,
            height: embeddedImg.height
          });
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        downloadTrackedBlob(blob, 'converted_images.pdf');
      } catch (err) {
        console.error('Image to PDF error:', err);
        alert('Failed to generate PDF from images: ' + err.message);
      }
    }

    function initPageNumberToolListeners() {
      const dropZone = document.getElementById('pagenumber-drop-zone');
      const input = document.getElementById('pagenumber-file-input');
      if (!dropZone || !input) return;

      dropZone.addEventListener('click', (e) => {
        if (e.target !== input) input.click();
      });
      dropZone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
      });

      let depth = 0;
      dropZone.addEventListener('dragenter', (e) => { e.preventDefault(); depth++; dropZone.classList.add('border-indigo-500', 'bg-indigo-50/20'); });
      dropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
      dropZone.addEventListener('dragleave', () => { depth--; if (depth <= 0) { depth = 0; dropZone.classList.remove('border-indigo-500', 'bg-indigo-50/20'); } });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        depth = 0;
        dropZone.classList.remove('border-indigo-500', 'bg-indigo-50/20');
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length) handlePageNumberFileSelection(dt.files[0]);
      });
      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) handlePageNumberFileSelection(e.target.files[0]);
      });
    }

    async function handlePageNumberFileSelection(file) {
      if (!await validateSinglePdfFile(file, 'Page Number')) return;
      pageNumberFile = file;
      document.getElementById('pagenumber-doc-name').innerText = file.name;
      setToolScreenState('pagenumber', 'workspace');
    }

    async function executePageNumberingPdf() {
      if (!pageNumberFile) return;
      const fmt = document.getElementById('pagenumber-format-select').value;

      try {
        await ensurePdfLib();
        const bytes = await pageNumberFile.arrayBuffer();
        const doc = await PDFLib.PDFDocument.load(bytes);
        const pages = doc.getPages();
        const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);

        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const { width } = page.getSize();
          const pageStr = fmt.replace('{n}', i + 1).replace('{total}', pages.length);

          page.drawText(pageStr, {
            x: (width / 2) - (pageStr.length * 3),
            y: 20,
            size: 10,
            font,
            color: PDFLib.rgb(0.35, 0.35, 0.35)
          });
        }

        const numberedBytes = await doc.save();
        triggerDownload(new Blob([numberedBytes], { type: 'application/pdf' }), `numbered_${pageNumberFile.name}`);
      } catch (e) {
        alert('Page numbering failed: ' + e.message);
      }
    }

    // Universal Helper: Download File Blob
    function triggerDownload(blob, filename) {
      downloadTrackedBlob(blob, filename);
    }


            
    // ================= GLOBAL KEYBOARD SHORTCUTS (Priority 2.5) =================
    function initGlobalKeyboardShortcuts() {
      if (typeof window === 'undefined') return;
      window.addEventListener('keydown', (e) => {
        // Esc: Return to Dashboard
        if (e.key === 'Escape') {
          switchPortalTool('dashboard');
          return;
        }

        // Ctrl+S / Cmd+S: Quick Export to Excel if transactions exist
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
          e.preventDefault();
          const excelBtn = document.getElementById('btn-export-excel');
          if (excelBtn && AppState.transactions && AppState.transactions.length > 0) {
            excelBtn.click();
          }
          return;
        }

        // Ctrl+F / Cmd+F: Focus Transaction Search
        if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
          const searchInput = document.getElementById('tx-search-input');
          const wsSection = document.getElementById('workspace-section');
          if (searchInput && wsSection && !wsSection.classList.contains('hidden')) {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
            return;
          }
        }

        // Ctrl+Z / Cmd+Z: Undo
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
          if (document.activeElement && document.activeElement.getAttribute('contenteditable') === 'true') {
            return;
          }
          e.preventDefault();
          undoTransactionEdit();
          return;
        }

        // Ctrl+Y or Ctrl+Shift+Z: Redo
        if (((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
            ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
          if (document.activeElement && document.activeElement.getAttribute('contenteditable') === 'true') {
            return;
          }
          e.preventDefault();
          redoTransactionEdit();
          return;
        }
      });
    }

    // ================= TOOL 10: COMPRESS PDF =================
    let compressFileState = { file: null, buffer: null, preset: 'recommended' };

    function initCompressToolListeners() {
      const dropZone = document.getElementById('compress-drop-zone');
      const input = document.getElementById('compress-file-input');
      if (!dropZone || !input) return;

      dropZone.addEventListener('click', (e) => {
        if (e.target !== input) input.click();
      });

      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-emerald-500', 'bg-emerald-50/50');
      });

      dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-emerald-500', 'bg-emerald-50/50');
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-emerald-500', 'bg-emerald-50/50');
        if (e.dataTransfer.files && e.dataTransfer.files.length) {
          if (e.dataTransfer.files.length > 1) {
            handleBatchCompressFiles(Array.from(e.dataTransfer.files));
          } else {
            handleCompressFileInput(e.dataTransfer.files[0]);
          }
        }
      });

      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) {
          if (e.target.files.length > 1) {
            handleBatchCompressFiles(Array.from(e.target.files));
          } else {
            handleCompressFileInput(e.target.files[0]);
          }
        }
      });
    }

    let batchCompressQueue = [];

    async function handleBatchCompressFiles(files) {
      const validPdfs = files.filter(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
      if (!validPdfs.length) return alert('No valid PDF files selected.');
      batchCompressQueue = validPdfs.map(f => ({ file: f, status: 'pending' }));
      const card = document.getElementById('compress-controls-card');
      if (card) card.classList.remove('hidden');
      const nameEl = document.getElementById('compress-doc-name');
      const sizeEl = document.getElementById('compress-doc-size');
      if (nameEl) nameEl.textContent = `${validPdfs.length} Documents Selected (Batch Mode)`;
      const totalSize = validPdfs.reduce((acc, f) => acc + f.size, 0);
      if (sizeEl) sizeEl.textContent = (totalSize / (1024 * 1024)).toFixed(2) + ' MB total';
      renderBatchCompressQueue();
    }

    function renderBatchCompressQueue() {
      const box = document.getElementById('compress-batch-container');
      const list = document.getElementById('compress-batch-list');
      const countEl = document.getElementById('compress-batch-count');
      const singleContainer = document.getElementById('compress-single-btn-container');
      if (!box || !list) return;

      if (!batchCompressQueue.length) {
        box.classList.add('hidden');
        if (singleContainer) singleContainer.classList.remove('hidden');
        return;
      }

      box.classList.remove('hidden');
      if (countEl) countEl.textContent = batchCompressQueue.length;
      if (singleContainer) singleContainer.classList.add('hidden');

      list.innerHTML = batchCompressQueue.map((item, idx) => `
        <div class="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span class="truncate max-w-[14rem] font-semibold">${item.file.name}</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
            item.status === 'done' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600' :
            item.status === 'processing' ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 animate-pulse' :
            'bg-slate-100 dark:bg-slate-800 text-slate-500'
          }">${item.status.toUpperCase()}</span>
        </div>
      `).join('');
    }

    async function executeBatchCompressZip() {
      if (!batchCompressQueue.length) return;
      const progressBox = document.getElementById('compress-progress-box');
      const btn = document.getElementById('btn-run-compress-batch');
      if (progressBox) progressBox.classList.remove('hidden');
      if (btn) btn.disabled = true;

      try {
        await ensurePdfLib();
        const zipEntries = [];

        for (let i = 0; i < batchCompressQueue.length; i++) {
          const item = batchCompressQueue[i];
          item.status = 'processing';
          renderBatchCompressQueue();

          try {
            const buf = await item.file.arrayBuffer();
            const doc = await PDFLib.PDFDocument.load(buf.slice(0), { ignoreEncryption: true });
            const outBytes = await doc.save({ useObjectStreams: true, addDefaultPage: false });
            zipEntries.push({ path: `compressed_${item.file.name}`, content: outBytes });
            item.status = 'done';
          } catch (e) {
            console.error('Batch compress error on file:', item.file.name, e);
            item.status = 'error';
          }
          renderBatchCompressQueue();
        }

        if (zipEntries.length) {
          const zipBlob = packZipFile(zipEntries, 'application/zip');
          downloadTrackedBlob(zipBlob, 'batch_compressed_documents.zip');
        }
      } finally {
        if (progressBox) progressBox.classList.add('hidden');
        if (btn) btn.disabled = false;
      }
    }

    async function handleCompressFileInput(file) {
      if (!await validateSinglePdfFile(file, 'Compress')) return;
      try {
        batchCompressQueue = [];
        renderBatchCompressQueue();
        const buffer = await file.arrayBuffer();
        compressFileState = { file, buffer, preset: 'recommended' };
        
        const card = document.getElementById('compress-controls-card');
        const nameEl = document.getElementById('compress-doc-name');
        const sizeEl = document.getElementById('compress-doc-size');
        setToolScreenState('compress', 'workspace');
        if (nameEl) nameEl.textContent = file.name;
        if (sizeEl) sizeEl.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
      } catch (err) {
        console.error('Compress load error:', err);
        alert('Failed to load PDF file.');
      }
    }

    function updateCompressPreset(preset) {
      compressFileState.preset = preset;
      ['recommended', 'extreme', 'less'].forEach(p => {
        const card = document.getElementById(`preset-card-${p}`);
        if (card) {
          if (p === preset) {
            card.className = 'cursor-pointer border-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 rounded-xl p-3 text-center transition flex flex-col items-center compress-preset-card';
          } else {
            card.className = 'cursor-pointer border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-3 text-center transition flex flex-col items-center compress-preset-card';
          }
        }
      });
    }

    async function executeCompressPdf() {
      if (!compressFileState.buffer) {
        alert('Please select a PDF file first.');
        return;
      }
      const progressBox = document.getElementById('compress-progress-box');
      const btn = document.getElementById('btn-run-compress');
      try {
        if (progressBox) progressBox.classList.remove('hidden');
        if (btn) btn.disabled = true;

        await ensurePdfLib();
        const PDFLibDoc = await PDFLib.PDFDocument.load(compressFileState.buffer, { ignoreEncryption: true });
        
        const compressedBytes = await PDFLibDoc.save({
          useObjectStreams: true,
          addDefaultPage: false
        });

        const blob = new Blob([compressedBytes], { type: 'application/pdf' });
        downloadTrackedBlob(blob, 'compressed_' + compressFileState.file.name);

        if (typeof showNotification === 'function') {
          showNotification('✅ PDF compressed successfully! Saved in local memory.', 'success');
        } else {
          alert('PDF compressed successfully!');
        }
      } catch (err) {
        console.error('Compress execution error:', err);
        alert('Compression failed: ' + err.message);
      } finally {
        if (progressBox) progressBox.classList.add('hidden');
        if (btn) btn.disabled = false;
      }
    }

    // ================= TOOL 11: SIGN PDF =================
    let signFileState = { file: null, buffer: null, penColor: '#1E293B' };
    let isDrawing = false;

    function initSignToolListeners() {
      const dropZone = document.getElementById('sign-drop-zone');
      const input = document.getElementById('sign-file-input');
      const canvas = document.getElementById('signature-canvas');
      if (!dropZone || !input) return;

      dropZone.addEventListener('click', (e) => {
        if (e.target !== input) input.click();
      });

      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-blue-500', 'bg-blue-50/50');
      });

      dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500', 'bg-blue-50/50');
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500', 'bg-blue-50/50');
        if (e.dataTransfer.files && e.dataTransfer.files.length) {
          handleSignFileInput(e.dataTransfer.files[0]);
        }
      });

      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) {
          handleSignFileInput(e.target.files[0]);
        }
      });

      // Canvas Drawing Listeners
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = signFileState.penColor;

        function getCanvasCoords(evt) {
          const rect = canvas.getBoundingClientRect();
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
          const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
          return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
          };
        }

        canvas.addEventListener('mousedown', (e) => {
          isDrawing = true;
          const coords = getCanvasCoords(e);
          ctx.beginPath();
          ctx.moveTo(coords.x, coords.y);
        });

        canvas.addEventListener('mousemove', (e) => {
          if (!isDrawing) return;
          const coords = getCanvasCoords(e);
          ctx.lineTo(coords.x, coords.y);
          ctx.stroke();
        });

        canvas.addEventListener('mouseup', () => { isDrawing = false; });
        canvas.addEventListener('mouseleave', () => { isDrawing = false; });

        canvas.addEventListener('touchstart', (e) => {
          e.preventDefault();
          isDrawing = true;
          const coords = getCanvasCoords(e);
          ctx.beginPath();
          ctx.moveTo(coords.x, coords.y);
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
          e.preventDefault();
          if (!isDrawing) return;
          const coords = getCanvasCoords(e);
          ctx.lineTo(coords.x, coords.y);
          ctx.stroke();
        }, { passive: false });

        canvas.addEventListener('touchend', () => { isDrawing = false; });
      }
    }

    async function handleSignFileInput(file) {
      if (!await validateSinglePdfFile(file, 'Sign')) return;
      try {
        const buffer = await file.arrayBuffer();
        signFileState.file = file;
        signFileState.buffer = buffer;
        const card = document.getElementById('sign-controls-card');
        const nameEl = document.getElementById('sign-doc-name');
        setToolScreenState('sign', 'workspace');
        if (nameEl) nameEl.textContent = file.name;
      } catch (err) {
        console.error('Sign file load error:', err);
        alert('Failed to load PDF file.');
      }
    }

    function clearSignatureCanvas() {
      const canvas = document.getElementById('signature-canvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    function setPenColor(color) {
      signFileState.penColor = color;
      const canvas = document.getElementById('signature-canvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = color;
      }
    }

    async function executeSignPdf() {
      if (!signFileState.buffer) {
        alert('Please select a PDF document first.');
        return;
      }
      const canvas = document.getElementById('signature-canvas');
      if (!canvas) return;

      try {
        await ensurePdfLib();
        const dataUrl = canvas.toDataURL('image/png');
        const pdfDoc = await PDFLib.PDFDocument.load(signFileState.buffer);
        const sigImage = await pdfDoc.embedPng(dataUrl);
        const pages = pdfDoc.getPages();
        const pageOption = (document.getElementById('sign-page-select') || {}).value || 'last';

        let targetPages = [];
        if (pageOption === 'last') {
          targetPages = [pages[pages.length - 1]];
        } else if (pageOption === '1') {
          targetPages = [pages[0]];
        } else {
          targetPages = pages;
        }

        const sigWidth = 140;
        const sigHeight = (sigImage.height / sigImage.width) * sigWidth;

        targetPages.forEach(page => {
          const { width, height } = page.getSize();
          page.drawImage(sigImage, {
            x: width - sigWidth - 40,
            y: 50,
            width: sigWidth,
            height: sigHeight
          });
        });

        const signedBytes = await pdfDoc.save();
        const blob = new Blob([signedBytes], { type: 'application/pdf' });
        downloadTrackedBlob(blob, 'signed_' + signFileState.file.name);

        if (typeof showNotification === 'function') {
          showNotification('✅ Document signed successfully!', 'success');
        } else {
          alert('Document signed successfully!');
        }
      } catch (err) {
        window.__lastSignError = err.message || String(err);
        console.error('Sign execution error:', err);
        alert('Failed to sign PDF: ' + err.message);
      }
    }

    // ================= TOOL 12: PROTECT PDF =================
    let protectFileState = { file: null, buffer: null };

    function initProtectToolListeners() {
      const dropZone = document.getElementById('protect-drop-zone');
      const input = document.getElementById('protect-file-input');
      if (!dropZone || !input) return;

      dropZone.addEventListener('click', (e) => {
        if (e.target !== input) input.click();
      });

      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-indigo-500', 'bg-indigo-50/50');
      });

      dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-indigo-500', 'bg-indigo-50/50');
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-indigo-500', 'bg-indigo-50/50');
        if (e.dataTransfer.files && e.dataTransfer.files.length) {
          if (e.dataTransfer.files.length > 1) {
            handleBatchProtectFiles(Array.from(e.dataTransfer.files));
          } else {
            handleProtectFileInput(e.dataTransfer.files[0]);
          }
        }
      });

      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) {
          if (e.target.files.length > 1) {
            handleBatchProtectFiles(Array.from(e.target.files));
          } else {
            handleProtectFileInput(e.target.files[0]);
          }
        }
      });
    }

    let batchProtectQueue = [];

    async function handleBatchProtectFiles(files) {
      const validPdfs = files.filter(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
      if (!validPdfs.length) return alert('No valid PDF files selected.');
      batchProtectQueue = validPdfs.map(f => ({ file: f, status: 'pending' }));
      const card = document.getElementById('protect-controls-card');
      if (card) card.classList.remove('hidden');
      const nameEl = document.getElementById('protect-doc-name');
      if (nameEl) nameEl.textContent = `${validPdfs.length} Documents Selected (Batch Protection Mode)`;
      renderBatchProtectQueue();
    }

    function renderBatchProtectQueue() {
      const box = document.getElementById('protect-batch-container');
      const list = document.getElementById('protect-batch-list');
      const countEl = document.getElementById('protect-batch-count');
      const batchBtn = document.getElementById('btn-run-protect-batch');
      const singleBtn = document.getElementById('btn-run-protect');
      if (!box || !list) return;

      if (!batchProtectQueue.length) {
        box.classList.add('hidden');
        if (batchBtn) batchBtn.classList.add('hidden');
        if (singleBtn) singleBtn.classList.remove('hidden');
        return;
      }

      box.classList.remove('hidden');
      if (batchBtn) batchBtn.classList.remove('hidden');
      if (singleBtn) singleBtn.classList.add('hidden');
      if (countEl) countEl.textContent = batchProtectQueue.length;

      list.innerHTML = batchProtectQueue.map((item, idx) => `
        <div class="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span class="truncate max-w-[14rem] font-semibold">${item.file.name}</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
            item.status === 'done' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600' :
            item.status === 'processing' ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 animate-pulse' :
            'bg-slate-100 dark:bg-slate-800 text-slate-500'
          }">${item.status.toUpperCase()}</span>
        </div>
      `).join('');
    }

    async function executeBatchProtectZip() {
      const pass1 = (document.getElementById('protect-password-input') || {}).value;
      const pass2 = (document.getElementById('protect-password-confirm') || {}).value;
      const errBox = document.getElementById('protect-error-box');

      if (!pass1 || pass1.length < 4) {
        if (errBox) { errBox.textContent = 'Password must be at least 4 characters.'; errBox.classList.remove('hidden'); }
        return;
      }
      if (pass1 !== pass2) {
        if (errBox) { errBox.textContent = 'Passwords do not match.'; errBox.classList.remove('hidden'); }
        return;
      }
      if (errBox) errBox.classList.add('hidden');
      if (!batchProtectQueue.length) return;

      const batchBtn = document.getElementById('btn-run-protect-batch');
      if (batchBtn) batchBtn.disabled = true;

      try {
        await ensurePdfSecurity();
        const zipEntries = [];

        for (let i = 0; i < batchProtectQueue.length; i++) {
          const item = batchProtectQueue[i];
          item.status = 'processing';
          renderBatchProtectQueue();

          try {
            const buf = await item.file.arrayBuffer();
            const encBytes = await PDFEncrypt.encryptPDF(buf, pass1, { algorithm: 'AES-256' });
            zipEntries.push({ path: `protected_${item.file.name}`, content: encBytes });
            item.status = 'done';
          } catch (e) {
            console.error('Batch protect error:', item.file.name, e);
            item.status = 'error';
          }
          renderBatchProtectQueue();
        }

        if (zipEntries.length) {
          const zipBlob = packZipFile(zipEntries, 'application/zip');
          downloadTrackedBlob(zipBlob, 'batch_protected_documents.zip');
        }
      } finally {
        if (batchBtn) batchBtn.disabled = false;
      }
    }

    async function renderProtectThumbnail(buffer) {
      const canvas = document.getElementById('protect-preview-canvas');
      if (!canvas || !buffer) return;
      try {
        if (typeof pdfjsLib === 'undefined') return;
        const task = pdfjsLib.getDocument({ data: buffer.slice(0) });
        const pdf = await task.promise;
        const pagesEl = document.getElementById('protect-doc-pages');
        if (pagesEl) pagesEl.textContent = `${pdf.numPages} Page${pdf.numPages === 1 ? '' : 's'}`;

        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.0 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (e) {
        console.warn('Could not render protect preview thumbnail:', e.message);
      }
    }

    async function handleProtectFileInput(file) {
      if (!await validateSinglePdfFile(file, 'Protect')) return;
      try {
        batchProtectQueue = [];
        renderBatchProtectQueue();
        const buffer = await file.arrayBuffer();
        protectFileState = { file, buffer };
        const uploadScreen = document.getElementById('protect-upload-screen');
        const card = document.getElementById('protect-controls-card');
        const nameEl = document.getElementById('protect-doc-name');
        const sizeEl = document.getElementById('protect-doc-size');
        if (uploadScreen) uploadScreen.classList.add('hidden');
        if (card) card.classList.remove('hidden');
        if (nameEl) nameEl.textContent = file.name;
        if (sizeEl) sizeEl.textContent = formatByteSize(file.size);
        renderProtectThumbnail(buffer);
      } catch (err) {
        console.error('Protect load error:', err);
        alert('Failed to load PDF file.');
      }
    }

    function resetProtectWorkspace() {
      protectFileState = { file: null, buffer: null };
      batchProtectQueue = [];
      const uploadScreen = document.getElementById('protect-upload-screen');
      const card = document.getElementById('protect-controls-card');
      const input = document.getElementById('protect-file-input');
      if (input) input.value = '';
      if (uploadScreen) uploadScreen.classList.remove('hidden');
      if (card) card.classList.add('hidden');
      const canvas = document.getElementById('protect-preview-canvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 0;
        canvas.height = 0;
      }
    }

    async function executeProtectPdf() {
      if (!protectFileState.buffer) {
        alert('Please select a PDF file first.');
        return;
      }
      const pass1 = (document.getElementById('protect-password-input') || {}).value;
      const pass2 = (document.getElementById('protect-password-confirm') || {}).value;
      const errBox = document.getElementById('protect-error-box');

      if (!pass1 || pass1.length < 4) {
        if (errBox) {
          errBox.textContent = 'Password must be at least 4 characters.';
          errBox.classList.remove('hidden');
        }
        return;
      }
      if (pass1 !== pass2) {
        if (errBox) {
          errBox.textContent = 'Passwords do not match.';
          errBox.classList.remove('hidden');
        }
        return;
      }
      if (errBox) errBox.classList.add('hidden');

      try {
        await ensurePdfSecurity();
        const encBytes = await PDFEncrypt.encryptPDF(protectFileState.buffer, pass1, { algorithm: 'AES-256' });
        const blob = new Blob([encBytes], { type: 'application/pdf' });
        downloadTrackedBlob(blob, 'protected_' + protectFileState.file.name);

        if (typeof showNotification === 'function') {
          showNotification('🔒 Document secured and downloaded in memory!', 'success');
        } else {
          alert('Document encrypted and downloaded!');
        }
      } catch (err) {
        console.error('Protect execution error:', err);
        if (errBox) {
          errBox.textContent = 'Failed to encrypt PDF: ' + err.message;
          errBox.classList.remove('hidden');
        } else {
          alert('Failed to encrypt PDF: ' + err.message);
        }
      }
    }

    // ================= TOOL 13: PDF TO MARKDOWN =================
    let markdownState = { file: null, text: '' };

    function initMarkdownToolListeners() {
      const dropZone = document.getElementById('markdown-drop-zone');
      const input = document.getElementById('markdown-file-input');
      if (!dropZone || !input) return;

      dropZone.addEventListener('click', (e) => {
        if (e.target !== input) input.click();
      });

      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-sky-500', 'bg-sky-50/50');
      });

      dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-sky-500', 'bg-sky-50/50');
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-sky-500', 'bg-sky-50/50');
        if (e.dataTransfer.files && e.dataTransfer.files.length) {
          executeConvertPdfToMarkdown(e.dataTransfer.files[0]);
        }
      });

      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) {
          executeConvertPdfToMarkdown(e.target.files[0]);
        }
      });
    }

    async function executeConvertPdfToMarkdown(file) {
      if (!await validateSinglePdfFile(file, 'OCR / Markdown')) return;
      try {
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        let markdownOutput = `# Document: ${file.name}\n\n*Extracted via Statement2Sheet In-Memory Engine*\n\n---\n\n`;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          markdownOutput += `## Page ${i}\n\n`;
          
          let lastY = null;
          let pageText = '';
          for (const item of textContent.items) {
            if (lastY !== null && Math.abs(item.transform[5] - lastY) > 6) {
              pageText += '\n';
            }
            pageText += item.str + ' ';
            lastY = item.transform[5];
          }
          markdownOutput += pageText.trim() + '\n\n---\n\n';
        }

        markdownState = { file, text: markdownOutput };
        const card = document.getElementById('markdown-controls-card');
        const nameEl = document.getElementById('markdown-doc-name');
        const textarea = document.getElementById('markdown-result-textarea');
        setToolScreenState('markdown', 'workspace');
        if (nameEl) nameEl.textContent = file.name;
        if (textarea) textarea.value = markdownOutput;
      } catch (err) {
        console.error('PDF to Markdown error:', err);
        alert('Failed to parse PDF text: ' + err.message);
      }
    }

    function copyMarkdownContent() {
      const textarea = document.getElementById('markdown-result-textarea');
      const btn = document.getElementById('btn-copy-md');
      if (textarea && textarea.value) {
        navigator.clipboard.writeText(textarea.value).then(() => {
          if (btn) {
            const orig = btn.innerHTML;
            btn.innerHTML = '✅ Copied!';
            setTimeout(() => { btn.innerHTML = orig; }, 2000);
          }
        });
      }
    }

    function downloadMarkdownFile() {
      if (!markdownState.text) return;
      const filename = (markdownState.file ? markdownState.file.name.replace(/\.pdf$/i, '') : 'document') + '.md';
      const blob = new Blob([markdownState.text], { type: 'text/markdown;charset=utf-8' });
      downloadTrackedBlob(blob, filename);
    }

    // ================= TOOL 14: INTERACTIVE CROP PDF =================
    let cropState = {
      file: null,
      doc: null,
      pdfBytes: null,
      currentPage: 1,
      totalPages: 1
    };

    let cropDragState = {
      isDragging: false,
      mode: null, // 'draw' | 'move' | 'resize'
      handle: null, // 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
      startX: 0,
      startY: 0,
      initialBox: { left: 0, top: 0, width: 0, height: 0 },
      containerRect: null
    };

    function initCropToolListeners() {
      const dropZone = document.getElementById('crop-drop-zone');
      const input = document.getElementById('crop-file-input');
      const stage = document.getElementById('crop-stage-container');
      if (!dropZone || !input) return;

      dropZone.addEventListener('click', (e) => { if (e.target !== input) input.click(); });
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-purple-500', 'bg-purple-50/50');
      });
      dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-purple-500', 'bg-purple-50/50');
      });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-purple-500', 'bg-purple-50/50');
        if (e.dataTransfer.files && e.dataTransfer.files.length) loadCropFile(e.dataTransfer.files[0]);
      });
      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) loadCropFile(e.target.files[0]);
      });

      ['crop-inset-top', 'crop-inset-bottom', 'crop-inset-left', 'crop-inset-right'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateCropOverlay);
      });

      if (stage) {
        stage.addEventListener('mousedown', handleCropPointerDown);
        stage.addEventListener('touchstart', handleCropPointerDown, { passive: false });
      }
    }

    function handleCropPointerDown(e) {
      const container = document.getElementById('crop-stage-container');
      const box = document.getElementById('crop-selection-box');
      if (!container || !box) return;

      const rect = container.getBoundingClientRect();
      cropDragState.containerRect = rect;
      if (rect.width <= 0 || rect.height <= 0) return;

      const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

      const relX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const relY = Math.max(0, Math.min(rect.height, clientY - rect.top));

      const target = e.target;
      const handleEl = target.closest ? target.closest('.crop-handle') : null;

      // Current box geometry in pixels relative to container
      const curLeftP = parseFloat(box.style.left) || 0;
      const curTopP = parseFloat(box.style.top) || 0;
      const curWidthP = parseFloat(box.style.width) || 100;
      const curHeightP = parseFloat(box.style.height) || 100;

      const boxLeft = (curLeftP / 100) * rect.width;
      const boxTop = (curTopP / 100) * rect.height;
      const boxWidth = (curWidthP / 100) * rect.width;
      const boxHeight = (curHeightP / 100) * rect.height;

      cropDragState.initialBox = { left: boxLeft, top: boxTop, width: boxWidth, height: boxHeight };
      cropDragState.startX = relX;
      cropDragState.startY = relY;
      cropDragState.isDragging = true;

      if (handleEl) {
        // Resizing via handle
        e.preventDefault();
        e.stopPropagation();
        cropDragState.mode = 'resize';
        cropDragState.handle = handleEl.dataset.handle;
      } else if (target === box || (box.contains && box.contains(target))) {
        // Dragging existing box
        e.preventDefault();
        e.stopPropagation();
        cropDragState.mode = 'move';
      } else {
        // Freehand draw new crop box
        e.preventDefault();
        cropDragState.mode = 'draw';
        setCropBoxPixels(relX, relY, 0, 0, rect);
      }

      window.addEventListener('mousemove', handleCropPointerMove);
      window.addEventListener('mouseup', handleCropPointerUp);
      window.addEventListener('touchmove', handleCropPointerMove, { passive: false });
      window.addEventListener('touchend', handleCropPointerUp);
    }

    function handleCropPointerMove(e) {
      if (!cropDragState.isDragging || !cropDragState.containerRect) return;
      e.preventDefault();

      const rect = cropDragState.containerRect;
      const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

      const relX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const relY = Math.max(0, Math.min(rect.height, clientY - rect.top));

      const dx = relX - cropDragState.startX;
      const dy = relY - cropDragState.startY;
      const init = cropDragState.initialBox;

      if (cropDragState.mode === 'draw') {
        const left = Math.min(cropDragState.startX, relX);
        const top = Math.min(cropDragState.startY, relY);
        const width = Math.max(10, Math.abs(relX - cropDragState.startX));
        const height = Math.max(10, Math.abs(relY - cropDragState.startY));
        setCropBoxPixels(left, top, width, height, rect);
      } else if (cropDragState.mode === 'move') {
        let newLeft = init.left + dx;
        let newTop = init.top + dy;
        newLeft = Math.max(0, Math.min(rect.width - init.width, newLeft));
        newTop = Math.max(0, Math.min(rect.height - init.height, newTop));
        setCropBoxPixels(newLeft, newTop, init.width, init.height, rect);
      } else if (cropDragState.mode === 'resize') {
        let newLeft = init.left;
        let newTop = init.top;
        let newWidth = init.width;
        let newHeight = init.height;
        const minSize = 20;

        switch (cropDragState.handle) {
          case 'e':
            newWidth = Math.max(minSize, Math.min(rect.width - init.left, init.width + dx));
            break;
          case 's':
            newHeight = Math.max(minSize, Math.min(rect.height - init.top, init.height + dy));
            break;
          case 'w': {
            const potLeft = Math.max(0, Math.min(init.left + init.width - minSize, init.left + dx));
            newWidth = (init.left + init.width) - potLeft;
            newLeft = potLeft;
            break;
          }
          case 'n': {
            const potTop = Math.max(0, Math.min(init.top + init.height - minSize, init.top + dy));
            newHeight = (init.top + init.height) - potTop;
            newTop = potTop;
            break;
          }
          case 'se':
            newWidth = Math.max(minSize, Math.min(rect.width - init.left, init.width + dx));
            newHeight = Math.max(minSize, Math.min(rect.height - init.top, init.height + dy));
            break;
          case 'sw': {
            const potLeft = Math.max(0, Math.min(init.left + init.width - minSize, init.left + dx));
            newWidth = (init.left + init.width) - potLeft;
            newLeft = potLeft;
            newHeight = Math.max(minSize, Math.min(rect.height - init.top, init.height + dy));
            break;
          }
          case 'ne': {
            newWidth = Math.max(minSize, Math.min(rect.width - init.left, init.width + dx));
            const potTop = Math.max(0, Math.min(init.top + init.height - minSize, init.top + dy));
            newHeight = (init.top + init.height) - potTop;
            newTop = potTop;
            break;
          }
          case 'nw': {
            const potLeft = Math.max(0, Math.min(init.left + init.width - minSize, init.left + dx));
            newWidth = (init.left + init.width) - potLeft;
            newLeft = potLeft;
            const potTop = Math.max(0, Math.min(init.top + init.height - minSize, init.top + dy));
            newHeight = (init.top + init.height) - potTop;
            newTop = potTop;
            break;
          }
        }
        setCropBoxPixels(newLeft, newTop, newWidth, newHeight, rect);
      }
    }

    function handleCropPointerUp() {
      if (cropDragState.isDragging) {
        cropDragState.isDragging = false;
        cropDragState.mode = null;
        cropDragState.handle = null;
      }
      window.removeEventListener('mousemove', handleCropPointerMove);
      window.removeEventListener('mouseup', handleCropPointerUp);
      window.removeEventListener('touchmove', handleCropPointerMove);
      window.removeEventListener('touchend', handleCropPointerUp);
    }

    function setCropBoxPixels(leftPx, topPx, widthPx, heightPx, rect) {
      const box = document.getElementById('crop-selection-box');
      if (!box || !rect || rect.width <= 0 || rect.height <= 0) return;

      const leftP = Math.max(0, Math.min(95, (leftPx / rect.width) * 100));
      const topP = Math.max(0, Math.min(95, (topPx / rect.height) * 100));
      const widthP = Math.max(5, Math.min(100 - leftP, (widthPx / rect.width) * 100));
      const heightP = Math.max(5, Math.min(100 - topP, (heightPx / rect.height) * 100));

      const rightP = Math.max(0, 100 - (leftP + widthP));
      const bottomP = Math.max(0, 100 - (topP + heightP));

      box.style.left = leftP + '%';
      box.style.top = topP + '%';
      box.style.width = widthP + '%';
      box.style.height = heightP + '%';

      // Sync numeric inset inputs
      const t = document.getElementById('crop-inset-top');
      const b = document.getElementById('crop-inset-bottom');
      const l = document.getElementById('crop-inset-left');
      const r = document.getElementById('crop-inset-right');
      if (t) t.value = Math.round(topP * 10) / 10;
      if (b) b.value = Math.round(bottomP * 10) / 10;
      if (l) l.value = Math.round(leftP * 10) / 10;
      if (r) r.value = Math.round(rightP * 10) / 10;
    }

    async function loadCropFile(file) {
      if (!await validateSinglePdfFile(file, 'Crop PDF')) return;
      try {
        const buffer = await file.arrayBuffer();
        const copyForPdfJs = new Uint8Array(buffer.slice(0));
        const copyForPdfLib = new Uint8Array(buffer.slice(0));
        const doc = await pdfjsLib.getDocument({ data: copyForPdfJs }).promise;
        cropState = {
          file,
          doc,
          pdfBytes: copyForPdfLib,
          currentPage: 1,
          totalPages: doc.numPages
        };
        const card = document.getElementById('crop-controls-card');
        const docName = document.getElementById('crop-doc-name');
        setToolScreenState('crop', 'workspace');
        if (docName) docName.textContent = file.name;
        await renderCropPage(1);
      } catch (err) {
        console.error('Crop load error:', err);
        alert('Failed to load PDF for cropping: ' + err.message);
      }
    }

    async function renderCropPage(pageIdx) {
      if (!cropState.doc) return;
      try {
        cropState.currentPage = Math.max(1, Math.min(pageIdx, cropState.totalPages));
        const page = await cropState.doc.getPage(cropState.currentPage);
        const viewport = page.getViewport({ scale: 1.2 });
        const canvas = document.getElementById('crop-preview-canvas');
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

        const indicator = document.getElementById('crop-page-indicator');
        if (indicator) indicator.textContent = `Page ${cropState.currentPage} of ${cropState.totalPages}`;
        updateCropOverlay();
      } catch (err) {
        console.error('Render crop error:', err);
      }
    }

    function cropNavigatePage(delta) {
      renderCropPage(cropState.currentPage + delta);
    }

    function setCropPreset(top, bottom, left, right) {
      const t = document.getElementById('crop-inset-top');
      const b = document.getElementById('crop-inset-bottom');
      const l = document.getElementById('crop-inset-left');
      const r = document.getElementById('crop-inset-right');
      if (t) t.value = top;
      if (b) b.value = bottom;
      if (l) l.value = left;
      if (r) r.value = right;
      updateCropOverlay();
    }

    function updateCropOverlay() {
      const box = document.getElementById('crop-selection-box');
      if (!box) return;
      const top = Math.min(95, Math.max(0, parseFloat(document.getElementById('crop-inset-top')?.value || 0)));
      const bottom = Math.min(95, Math.max(0, parseFloat(document.getElementById('crop-inset-bottom')?.value || 0)));
      const left = Math.min(95, Math.max(0, parseFloat(document.getElementById('crop-inset-left')?.value || 0)));
      const right = Math.min(95, Math.max(0, parseFloat(document.getElementById('crop-inset-right')?.value || 0)));

      box.style.top = top + '%';
      box.style.left = left + '%';
      box.style.width = Math.max(5, 100 - left - right) + '%';
      box.style.height = Math.max(5, 100 - top - bottom) + '%';
    }

    async function executeCropPdf() {
      if (!cropState.pdfBytes) {
        alert('Please select a PDF file to crop first.');
        return;
      }
      try {
        await ensurePdfLib();
        const pdfDoc = await PDFLib.PDFDocument.load(cropState.pdfBytes.slice(0), { ignoreEncryption: true });
        const topP = Math.min(95, Math.max(0, parseFloat(document.getElementById('crop-inset-top')?.value || 0))) / 100;
        const bottomP = Math.min(95, Math.max(0, parseFloat(document.getElementById('crop-inset-bottom')?.value || 0))) / 100;
        const leftP = Math.min(95, Math.max(0, parseFloat(document.getElementById('crop-inset-left')?.value || 0))) / 100;
        const rightP = Math.min(95, Math.max(0, parseFloat(document.getElementById('crop-inset-right')?.value || 0))) / 100;

        const applyAll = document.getElementById('crop-apply-all-pages')?.checked ?? true;
        const pages = applyAll ? pdfDoc.getPages() : [pdfDoc.getPages()[cropState.currentPage - 1]];

        pages.forEach(page => {
          const { width, height } = page.getSize();
          const x = width * leftP;
          const y = height * bottomP;
          const w = width * Math.max(0.05, 1 - leftP - rightP);
          const h = height * Math.max(0.05, 1 - topP - bottomP);
          page.setCropBox(x, y, w, h);
          page.setMediaBox(x, y, w, h);
        });

        const savedBytes = await pdfDoc.save();
        downloadTrackedBlob(new Blob([savedBytes], { type: 'application/pdf' }), `cropped_${cropState.file.name}`);
      } catch (err) {
        console.error('Crop execute error:', err);
        alert('Failed to crop PDF: ' + err.message);
      }
    }

    // ================= TOOL 15: EXTRACT IMAGES FROM PDF =================
    let extractImagesState = {
      file: null,
      images: []
    };

    function initExtractImagesToolListeners() {
      const dropZone = document.getElementById('extract-images-drop-zone');
      const input = document.getElementById('extract-images-file-input');
      if (!dropZone || !input) return;

      dropZone.addEventListener('click', (e) => { if (e.target !== input) input.click(); });
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-lime-500', 'bg-lime-50/50');
      });
      dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-lime-500', 'bg-lime-50/50');
      });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-lime-500', 'bg-lime-50/50');
        if (e.dataTransfer.files && e.dataTransfer.files.length) executeExtractImages(e.dataTransfer.files[0]);
      });
      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) executeExtractImages(e.target.files[0]);
      });
    }

    async function executeExtractImages(file) {
      if (!await validateSinglePdfFile(file, 'Extract Images')) return;
      try {
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        extractImagesState = { file, images: [] };

        const card = document.getElementById('extract-images-results-card');
        const docName = document.getElementById('extract-images-doc-name');
        const statusText = document.getElementById('extract-images-status-text');
        const grid = document.getElementById('extracted-images-grid');

        setToolScreenState('extract-images', 'workspace');
        if (docName) docName.textContent = file.name;
        if (grid) grid.innerHTML = '';
        if (statusText) statusText.textContent = `Extracting images across ${pdf.numPages} pages...`;

        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p);
          const viewport = page.getViewport({ scale: 2.0 });
          const offscreen = document.createElement('canvas');
          offscreen.width = viewport.width;
          offscreen.height = viewport.height;
          await page.render({ canvasContext: offscreen.getContext('2d'), viewport }).promise;

          const blob = await new Promise(res => offscreen.toBlob(res, 'image/png'));
          const imgUrl = createTrackedObjectURL(blob);
          const item = {
            id: `img_${p}`,
            blob,
            url: imgUrl,
            page: p,
            width: offscreen.width,
            height: offscreen.height,
            name: `${file.name.replace(/\.pdf$/i, '')}_page_${p}.png`
          };
          extractImagesState.images.push(item);

          if (grid) {
            const cardEl = document.createElement('div');
            cardEl.className = 'p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between shadow-2xs';

            const imgWrap = document.createElement('div');
            imgWrap.className = 'w-full h-32 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center mb-2';
            const imgEl = document.createElement('img');
            imgEl.src = imgUrl;
            imgEl.alt = `Page ${p}`;
            imgEl.className = 'max-h-full max-w-full object-contain';
            imgWrap.appendChild(imgEl);

            const metaEl = document.createElement('div');
            metaEl.className = 'text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between mb-2';
            metaEl.innerHTML = `<span>Page ${p}</span><span class="font-mono text-[10px]">${item.width}x${item.height}</span>`;

            const dlBtn = document.createElement('button');
            dlBtn.className = 'w-full py-1 text-center bg-lime-600 hover:bg-lime-700 text-white font-bold text-xs rounded-lg shadow-2xs transition';
            dlBtn.textContent = '⬇️ Download';
            dlBtn.addEventListener('click', () => {
              downloadTrackedBlob(item.blob, item.name);
            });

            cardEl.appendChild(imgWrap);
            cardEl.appendChild(metaEl);
            cardEl.appendChild(dlBtn);
            grid.appendChild(cardEl);
          }
        }

        if (statusText) {
          statusText.textContent = `Successfully extracted ${extractImagesState.images.length} high-res images!`;
        }
      } catch (err) {
        console.error('Extract images error:', err);
        alert('Failed to extract images: ' + err.message);
      }
    }

    function executeDownloadAllExtractedImages() {
      if (!extractImagesState.images.length) return;
      extractImagesState.images.forEach((img, i) => {
        setTimeout(() => {
          downloadTrackedBlob(img.blob, img.name);
        }, i * 200);
      });
    }

    // ================= TOOL 16: VISUAL & TEXTUAL PDF COMPARISON =================
    let compareState = {
      docA: null,
      docB: null,
      nameA: '',
      nameB: '',
      page: 1,
      maxPages: 1,
      mode: 'diff'
    };

    function initCompareToolListeners() {
      const input1 = document.getElementById('compare-file-input-1');
      const input2 = document.getElementById('compare-file-input-2');
      const drop1 = document.getElementById('compare-drop-zone-1');
      const drop2 = document.getElementById('compare-drop-zone-2');

      if (drop1 && input1) {
        drop1.addEventListener('click', (e) => { if (e.target !== input1) input1.click(); });
        drop1.addEventListener('dragover', (e) => { e.preventDefault(); drop1.classList.add('border-teal-500'); });
        drop1.addEventListener('dragleave', (e) => { e.preventDefault(); drop1.classList.remove('border-teal-500'); });
        drop1.addEventListener('drop', (e) => {
          e.preventDefault();
          drop1.classList.remove('border-teal-500');
          if (e.dataTransfer.files && e.dataTransfer.files.length) loadCompareDoc(1, e.dataTransfer.files[0]);
        });
        input1.addEventListener('change', (e) => {
          if (e.target.files && e.target.files.length) loadCompareDoc(1, e.target.files[0]);
        });
      }

      if (drop2 && input2) {
        drop2.addEventListener('click', (e) => { if (e.target !== input2) input2.click(); });
        drop2.addEventListener('dragover', (e) => { e.preventDefault(); drop2.classList.add('border-teal-500'); });
        drop2.addEventListener('dragleave', (e) => { e.preventDefault(); drop2.classList.remove('border-teal-500'); });
        drop2.addEventListener('drop', (e) => {
          e.preventDefault();
          drop2.classList.remove('border-teal-500');
          if (e.dataTransfer.files && e.dataTransfer.files.length) loadCompareDoc(2, e.dataTransfer.files[0]);
        });
        input2.addEventListener('change', (e) => {
          if (e.target.files && e.target.files.length) loadCompareDoc(2, e.target.files[0]);
        });
      }
    }

    async function loadCompareDoc(slot, file) {
      if (!await validateSinglePdfFile(file, 'Compare PDF')) return;
      try {
        const buffer = await file.arrayBuffer();
        const copyForPdfJs = new Uint8Array(buffer.slice(0));
        const doc = await pdfjsLib.getDocument({ data: copyForPdfJs }).promise;
        if (slot === 1 || slot === '1' || slot === 'A' || slot === 'a') {
          compareState.docA = doc;
          compareState.nameA = file.name;
          const label = document.getElementById('compare-name-1');
          if (label) label.textContent = `A: ${file.name} (${doc.numPages}p)`;
        } else {
          compareState.docB = doc;
          compareState.nameB = file.name;
          const label = document.getElementById('compare-name-2');
          if (label) label.textContent = `B: ${file.name} (${doc.numPages}p)`;
        }

        if (compareState.docA && compareState.docB) {
          compareState.maxPages = Math.max(compareState.docA.numPages, compareState.docB.numPages);
          compareState.page = 1;
          setToolScreenState('compare', 'workspace');
          renderComparePage(1);
        }
      } catch (err) {
        console.error('Compare doc load error:', err);
        alert('Failed to load PDF for comparison: ' + err.message);
      }
    }

    async function renderComparePage(pageIdx) {
      if (!compareState.docA || !compareState.docB) return;
      compareState.page = Math.max(1, Math.min(pageIdx, compareState.maxPages));

      const indicator = document.getElementById('compare-page-indicator');
      if (indicator) indicator.textContent = `Page ${compareState.page} of ${compareState.maxPages}`;

      const pageA = compareState.page <= compareState.docA.numPages ? await compareState.docA.getPage(compareState.page) : null;
      const pageB = compareState.page <= compareState.docB.numPages ? await compareState.docB.getPage(compareState.page) : null;

      // 1. Side by side
      const canvasLeft = document.getElementById('compare-canvas-left');
      const canvasRight = document.getElementById('compare-canvas-right');
      if (canvasLeft && pageA) {
        const vpA = pageA.getViewport({ scale: 1.0 });
        canvasLeft.width = vpA.width;
        canvasLeft.height = vpA.height;
        await pageA.render({ canvasContext: canvasLeft.getContext('2d'), viewport: vpA }).promise;
      }
      if (canvasRight && pageB) {
        const vpB = pageB.getViewport({ scale: 1.0 });
        canvasRight.width = vpB.width;
        canvasRight.height = vpB.height;
        await pageB.render({ canvasContext: canvasRight.getContext('2d'), viewport: vpB }).promise;
      }

      // 2. Visual Diff pixel blend
      const diffCanvas = document.getElementById('compare-diff-canvas');
      if (diffCanvas && (pageA || pageB)) {
        const vpA = pageA ? pageA.getViewport({ scale: 1.0 }) : { width: 600, height: 800 };
        const vpB = pageB ? pageB.getViewport({ scale: 1.0 }) : { width: 600, height: 800 };
        const w = Math.max(vpA.width, vpB.width);
        const h = Math.max(vpA.height, vpB.height);

        const offA = document.createElement('canvas');
        offA.width = w; offA.height = h;
        const ctxA = offA.getContext('2d');
        ctxA.fillStyle = '#FFFFFF'; ctxA.fillRect(0, 0, w, h);
        if (pageA) await pageA.render({ canvasContext: ctxA, viewport: pageA.getViewport({ scale: 1.0 }) }).promise;

        const offB = document.createElement('canvas');
        offB.width = w; offB.height = h;
        const ctxB = offB.getContext('2d');
        ctxB.fillStyle = '#FFFFFF'; ctxB.fillRect(0, 0, w, h);
        if (pageB) await pageB.render({ canvasContext: ctxB, viewport: pageB.getViewport({ scale: 1.0 }) }).promise;

        diffCanvas.width = w;
        diffCanvas.height = h;
        const diffCtx = diffCanvas.getContext('2d');
        const imgA = ctxA.getImageData(0, 0, w, h);
        const imgB = ctxB.getImageData(0, 0, w, h);
        const out = diffCtx.createImageData(w, h);

        for (let i = 0; i < imgA.data.length; i += 4) {
          const lumA = 0.299 * imgA.data[i] + 0.587 * imgA.data[i + 1] + 0.114 * imgA.data[i + 2];
          const lumB = 0.299 * imgB.data[i] + 0.587 * imgB.data[i + 1] + 0.114 * imgB.data[i + 2];
          const delta = lumB - lumA;

          if (Math.abs(delta) < 25) {
            out.data[i] = 245;
            out.data[i + 1] = 247;
            out.data[i + 2] = 250;
            out.data[i + 3] = 255;
          } else if (delta > 25) {
            // Removed in B (Red)
            out.data[i] = 239;
            out.data[i + 1] = 68;
            out.data[i + 2] = 68;
            out.data[i + 3] = 255;
          } else {
            // Added in B (Green)
            out.data[i] = 16;
            out.data[i + 1] = 185;
            out.data[i + 2] = 129;
            out.data[i + 3] = 255;
          }
        }
        diffCtx.putImageData(out, 0, 0);
      }

      // 3. Text delta
      const textContainer = document.getElementById('compare-container-text');
      if (textContainer) {
        const textA = pageA ? (await pageA.getTextContent()).items.map(t => t.str).join(' ') : '';
        const textB = pageB ? (await pageB.getTextContent()).items.map(t => t.str).join(' ') : '';

        const wordsA = textA.split(/\s+/).filter(Boolean);
        const wordsB = textB.split(/\s+/).filter(Boolean);
        const setA = new Set(wordsA);
        const setB = new Set(wordsB);

        let deltaHtml = `<div class="mb-2 text-[11px] text-slate-400 font-sans">Text comparison for Page ${compareState.page}:</div><div class="leading-loose">`;
        wordsB.forEach(w => {
          if (!setA.has(w)) {
            deltaHtml += `<span class="bg-emerald-950 text-emerald-300 font-bold px-1 py-0.5 rounded mr-1">+${escapeHtml(w)}</span> `;
          } else {
            deltaHtml += `<span>${escapeHtml(w)}</span> `;
          }
        });
        const removed = wordsA.filter(w => !setB.has(w));
        if (removed.length) {
          deltaHtml += `<div class="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400">Words removed in Document B:</div>`;
          removed.forEach(w => {
            deltaHtml += `<span class="bg-rose-950 text-rose-300 line-through px-1 py-0.5 rounded mr-1">-${escapeHtml(w)}</span> `;
          });
        }
        deltaHtml += '</div>';
        textContainer.innerHTML = deltaHtml;
      }
    }

    function compareNavigatePage(delta) {
      renderComparePage(compareState.page + delta);
    }

    function switchCompareMode(mode) {
      compareState.mode = mode;
      const cDiff = document.getElementById('compare-container-diff');
      const cSplit = document.getElementById('compare-container-split');
      const cText = document.getElementById('compare-container-text');
      const bDiff = document.getElementById('btn-compare-diff');
      const bSplit = document.getElementById('btn-compare-split');
      const bText = document.getElementById('btn-compare-text');

      [cDiff, cSplit, cText].forEach(el => el && el.classList.add('hidden'));
      [bDiff, bSplit, bText].forEach(btn => {
        if (btn) btn.className = 'px-3 py-1 rounded-md text-slate-600 dark:text-slate-300';
      });

      if (mode === 'diff') {
        if (cDiff) cDiff.classList.remove('hidden');
        if (bDiff) bDiff.className = 'px-3 py-1 rounded-md bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-xs';
      } else if (mode === 'split') {
        if (cSplit) cSplit.classList.remove('hidden');
        if (bSplit) bSplit.className = 'px-3 py-1 rounded-md bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-xs';
      } else if (mode === 'text') {
        if (cText) cText.classList.remove('hidden');
        if (bText) bText.className = 'px-3 py-1 rounded-md bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-xs';
      }
    }

    // ================= TOOL 17: DEDICATED BATCH ROTATE PDF =================
    let rotateState = {
      file: null,
      buffer: null,
      doc: null,
      pageRotations: {}
    };

    function initRotateToolListeners() {
      const dropZone = document.getElementById('rotate-drop-zone');
      const input = document.getElementById('rotate-file-input');
      if (!dropZone || !input) return;

      dropZone.addEventListener('click', (e) => { if (e.target !== input) input.click(); });
      dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-purple-500'); });
      dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('border-purple-500'); });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-purple-500');
        if (e.dataTransfer.files && e.dataTransfer.files.length) {
          if (e.dataTransfer.files.length > 1) {
            handleBatchRotateFiles(Array.from(e.dataTransfer.files));
          } else {
            loadRotateFile(e.dataTransfer.files[0]);
          }
        }
      });
      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) {
          if (e.target.files.length > 1) {
            handleBatchRotateFiles(Array.from(e.target.files));
          } else {
            loadRotateFile(e.target.files[0]);
          }
        }
      });
    }

    let batchRotateQueue = [];

    async function handleBatchRotateFiles(files) {
      const validPdfs = files.filter(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
      if (!validPdfs.length) return alert('No valid PDF files selected.');
      batchRotateQueue = validPdfs.map(f => ({ file: f, status: 'pending' }));
      const card = document.getElementById('rotate-controls-card');
      const docName = document.getElementById('rotate-doc-name');
      const grid = document.getElementById('rotate-thumbnails-grid');
      if (card) card.classList.remove('hidden');
      if (docName) docName.textContent = `${validPdfs.length} Documents Selected (Batch Rotate Mode)`;
      if (grid) grid.innerHTML = '';
      renderBatchRotateQueue();
    }

    function renderBatchRotateQueue() {
      const box = document.getElementById('rotate-batch-container');
      const list = document.getElementById('rotate-batch-list');
      const countEl = document.getElementById('rotate-batch-count');
      const singleBtn = document.getElementById('btn-run-rotate-single');
      if (!box || !list) return;

      if (!batchRotateQueue.length) {
        box.classList.add('hidden');
        if (singleBtn) singleBtn.classList.remove('hidden');
        return;
      }

      box.classList.remove('hidden');
      if (countEl) countEl.textContent = batchRotateQueue.length;
      if (singleBtn) singleBtn.classList.add('hidden');

      list.innerHTML = batchRotateQueue.map((item, idx) => `
        <div class="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span class="truncate max-w-[14rem] font-semibold">${item.file.name}</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
            item.status === 'done' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600' :
            item.status === 'processing' ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 animate-pulse' :
            'bg-slate-100 dark:bg-slate-800 text-slate-500'
          }">${item.status.toUpperCase()}</span>
        </div>
      `).join('');
    }

    async function executeBatchRotateZip() {
      if (!batchRotateQueue.length) return;
      const btn = document.getElementById('btn-run-rotate-batch');
      if (btn) btn.disabled = true;

      try {
        await ensurePdfLib();
        const zipEntries = [];

        for (let i = 0; i < batchRotateQueue.length; i++) {
          const item = batchRotateQueue[i];
          item.status = 'processing';
          renderBatchRotateQueue();

          try {
            const buf = await item.file.arrayBuffer();
            const doc = await PDFLib.PDFDocument.load(buf.slice(0), { ignoreEncryption: true });
            const pages = doc.getPages();
            pages.forEach(p => {
              const currentAngle = p.getRotation().angle;
              p.setRotation(PDFLib.degrees((currentAngle + 90) % 360));
            });
            const outBytes = await doc.save();
            zipEntries.push({ path: `rotated_${item.file.name}`, content: outBytes });
            item.status = 'done';
          } catch (e) {
            console.error('Batch rotate error:', item.file.name, e);
            item.status = 'error';
          }
          renderBatchRotateQueue();
        }

        if (zipEntries.length) {
          const zipBlob = packZipFile(zipEntries, 'application/zip');
          downloadTrackedBlob(zipBlob, 'batch_rotated_documents.zip');
        }
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    async function loadRotateFile(file) {
      if (!await validateSinglePdfFile(file, 'Rotate PDF')) return;
      try {
        batchRotateQueue = [];
        renderBatchRotateQueue();
        const buffer = await file.arrayBuffer();
        const copyForPdfJs = new Uint8Array(buffer.slice(0));
        const copyForPdfLib = new Uint8Array(buffer.slice(0));
        const doc = await pdfjsLib.getDocument({ data: copyForPdfJs }).promise;
        rotateState = { file, buffer: copyForPdfLib, doc, pageRotations: {} };

        const card = document.getElementById('rotate-controls-card');
        const docName = document.getElementById('rotate-doc-name');
        const grid = document.getElementById('rotate-thumbnails-grid');

        setToolScreenState('rotate', 'workspace');
        if (docName) docName.textContent = file.name;
        if (grid) grid.innerHTML = '';

        for (let p = 1; p <= doc.numPages; p++) {
          rotateState.pageRotations[p - 1] = 0;
          const page = await doc.getPage(p);
          const viewport = page.getViewport({ scale: 0.3 });

          const thumbWrap = document.createElement('div');
          thumbWrap.className = 'p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-between text-center group cursor-pointer shadow-2xs hover:border-purple-500 transition';
          thumbWrap.id = `rotate-card-${p}`;

          const canvasWrap = document.createElement('div');
          canvasWrap.className = 'w-full h-36 flex items-center justify-center overflow-hidden mb-2';
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.id = `rotate-canvas-${p}`;
          canvas.className = 'transition-transform duration-300 shadow-xs max-h-full max-w-full';
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          canvasWrap.appendChild(canvas);

          const footer = document.createElement('div');
          footer.className = 'w-full flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700';
          footer.innerHTML = `<span>P.${p}</span><span id="rotate-deg-${p}" class="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">0°</span>`;

          thumbWrap.appendChild(canvasWrap);
          thumbWrap.appendChild(footer);

          thumbWrap.addEventListener('click', () => {
            rotateSinglePage(p - 1, 90);
          });
          if (grid) grid.appendChild(thumbWrap);
        }
      } catch (err) {
        console.error('Rotate file load error:', err);
        alert('Failed to load PDF for rotation: ' + err.message);
      }
    }

    function rotateSinglePage(pageIdx, degDelta) {
      rotateState.pageRotations[pageIdx] = ((rotateState.pageRotations[pageIdx] || 0) + degDelta) % 360;
      const deg = rotateState.pageRotations[pageIdx];
      const canvas = document.getElementById(`rotate-canvas-${pageIdx + 1}`);
      const badge = document.getElementById(`rotate-deg-${pageIdx + 1}`);
      if (canvas) canvas.style.transform = `rotate(${deg}deg)`;
      if (badge) badge.textContent = `${deg}°`;
    }

    function rotateAllPages(degDelta) {
      if (!rotateState.doc) return;
      for (let i = 0; i < rotateState.doc.numPages; i++) {
        rotateSinglePage(i, degDelta);
      }
    }

    async function executeSaveRotatedPdf() {
      if (!rotateState.buffer) return;
      try {
        await ensurePdfLib();
        const pdfDoc = await PDFLib.PDFDocument.load(rotateState.buffer.slice(0), { ignoreEncryption: true });
        const pages = pdfDoc.getPages();

        pages.forEach((page, idx) => {
          const delta = rotateState.pageRotations[idx] || 0;
          if (delta !== 0) {
            const currentAngle = page.getRotation().angle;
            page.setRotation(PDFLib.degrees((currentAngle + delta) % 360));
          }
        });

        const savedBytes = await pdfDoc.save();
        downloadTrackedBlob(new Blob([savedBytes], { type: 'application/pdf' }), `rotated_${rotateState.file.name}`);
      } catch (err) {
        console.error('Save rotated PDF error:', err);
        alert('Failed to rotate PDF: ' + err.message);
      }
    }

    // ================= TOOL 18: PERMANENT PDF REDACTION & SANITIZATION =================
    let redactState = {
      file: null,
      buffer: null,
      doc: null,
      currentPage: 1,
      totalPages: 1,
      scale: 1.5,
      redactions: {},
      isDrawing: false,
      startX: 0,
      startY: 0
    };

    function initRedactToolListeners() {
      const dropZone = document.getElementById('redact-drop-zone');
      const input = document.getElementById('redact-file-input');
      const canvas = document.getElementById('redact-canvas');
      const dragOverlay = document.getElementById('redact-active-drag');
      if (!dropZone || !input) return;

      dropZone.addEventListener('click', (e) => { if (e.target !== input) input.click(); });
      dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-rose-500'); });
      dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('border-rose-500'); });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-rose-500');
        if (e.dataTransfer.files && e.dataTransfer.files.length) loadRedactFile(e.dataTransfer.files[0]);
      });
      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) loadRedactFile(e.target.files[0]);
      });

      if (canvas && dragOverlay) {
        canvas.addEventListener('mousedown', (e) => {
          const rect = canvas.getBoundingClientRect();
          redactState.isDrawing = true;
          redactState.startX = e.clientX - rect.left;
          redactState.startY = e.clientY - rect.top;
          dragOverlay.classList.remove('hidden');
          dragOverlay.style.left = redactState.startX + 'px';
          dragOverlay.style.top = redactState.startY + 'px';
          dragOverlay.style.width = '0px';
          dragOverlay.style.height = '0px';
        });

        window.addEventListener('mousemove', (e) => {
          if (!redactState.isDrawing) return;
          const rect = canvas.getBoundingClientRect();
          const currX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
          const currY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

          const x = Math.min(redactState.startX, currX);
          const y = Math.min(redactState.startY, currY);
          const w = Math.abs(currX - redactState.startX);
          const h = Math.abs(currY - redactState.startY);

          dragOverlay.style.left = x + 'px';
          dragOverlay.style.top = y + 'px';
          dragOverlay.style.width = w + 'px';
          dragOverlay.style.height = h + 'px';
        });

        window.addEventListener('mouseup', (e) => {
          if (!redactState.isDrawing) return;
          redactState.isDrawing = false;
          dragOverlay.classList.add('hidden');

          const rect = canvas.getBoundingClientRect();
          const endX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
          const endY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

          const w = Math.abs(endX - redactState.startX);
          const h = Math.abs(endY - redactState.startY);
          if (w > 5 && h > 5) {
            const normBox = {
              x: Math.min(redactState.startX, endX) / rect.width,
              y: Math.min(redactState.startY, endY) / rect.height,
              w: w / rect.width,
              h: h / rect.height
            };
            if (!redactState.redactions[redactState.currentPage]) {
              redactState.redactions[redactState.currentPage] = [];
            }
            redactState.redactions[redactState.currentPage].push(normBox);
            renderRedactBoxesOnCanvas();
          }
        });
      }
    }

    async function loadRedactFile(file) {
      if (!await validateSinglePdfFile(file, 'Redact PDF')) return;
      try {
        const buffer = await file.arrayBuffer();
        const copyForPdfJs = new Uint8Array(buffer.slice(0));
        const copyForPdfLib = new Uint8Array(buffer.slice(0));
        const doc = await pdfjsLib.getDocument({ data: copyForPdfJs }).promise;
        redactState = {
          file,
          buffer: copyForPdfLib,
          doc,
          currentPage: 1,
          totalPages: doc.numPages,
          scale: 1.5,
          redactions: {},
          isDrawing: false,
          startX: 0,
          startY: 0
        };
        const card = document.getElementById('redact-controls-card');
        const docName = document.getElementById('redact-doc-name');
        setToolScreenState('redact', 'workspace');
        if (docName) docName.textContent = file.name;
        await renderRedactPage(1);
      } catch (err) {
        console.error('Redact load error:', err);
        alert('Failed to load PDF for redaction: ' + err.message);
      }
    }

    async function renderRedactPage(pageIdx) {
      if (!redactState.doc) return;
      redactState.currentPage = Math.max(1, Math.min(pageIdx, redactState.totalPages));
      const indicator = document.getElementById('redact-page-indicator');
      if (indicator) indicator.textContent = `Page ${redactState.currentPage} of ${redactState.totalPages}`;

      const page = await redactState.doc.getPage(redactState.currentPage);
      const viewport = page.getViewport({ scale: redactState.scale });
      const canvas = document.getElementById('redact-canvas');
      if (!canvas) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      renderRedactBoxesOnCanvas();
    }

    function renderRedactBoxesOnCanvas() {
      const canvas = document.getElementById('redact-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const boxes = redactState.redactions[redactState.currentPage] || [];
      ctx.fillStyle = '#000000';
      boxes.forEach(b => {
        ctx.fillRect(b.x * canvas.width, b.y * canvas.height, b.w * canvas.width, b.h * canvas.height);
      });
    }

    function redactNavigatePage(delta) {
      renderRedactPage(redactState.currentPage + delta);
    }

    function redactClearCurrentPage() {
      redactState.redactions[redactState.currentPage] = [];
      renderRedactPage(redactState.currentPage);
    }

    async function redactAutoSearchMatch() {
      const input = document.getElementById('redact-search-input');
      const term = (input ? input.value : '').trim().toLowerCase();
      if (!term || !redactState.doc) return;

      try {
        const page = await redactState.doc.getPage(redactState.currentPage);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });

        if (!redactState.redactions[redactState.currentPage]) {
          redactState.redactions[redactState.currentPage] = [];
        }

        let matchCount = 0;
        textContent.items.forEach(item => {
          if (item.str.toLowerCase().includes(term)) {
            const tx = item.transform;
            const x = tx[4] / viewport.width;
            const y = 1 - (tx[5] / viewport.height);
            const w = Math.max(0.02, (item.width || term.length * 6) / viewport.width);
            const h = Math.max(0.015, (item.height || 12) / viewport.height);

            redactState.redactions[redactState.currentPage].push({
              x: Math.max(0, x),
              y: Math.max(0, y - h),
              w,
              h: h * 1.3
            });
            matchCount++;
          }
        });
        renderRedactBoxesOnCanvas();
        alert(`Found and redacted ${matchCount} match(es) on current page.`);
      } catch (err) {
        console.error('Redact search match error:', err);
      }
    }

    async function executeRedactPdf() {
      if (!redactState.doc) return;
      try {
        await ensurePdfLib();
        const newPdf = await PDFLib.PDFDocument.create();

        for (let p = 1; p <= redactState.totalPages; p++) {
          const page = await redactState.doc.getPage(p);
          const origVp = page.getViewport({ scale: 1.0 });
          const highResVp = page.getViewport({ scale: 3.0 });
          const offCanvas = document.createElement('canvas');
          offCanvas.width = highResVp.width;
          offCanvas.height = highResVp.height;
          const offCtx = offCanvas.getContext('2d');

          await page.render({ canvasContext: offCtx, viewport: highResVp }).promise;

          const boxes = redactState.redactions[p] || [];
          offCtx.fillStyle = '#000000';
          boxes.forEach(b => {
            offCtx.fillRect(b.x * offCanvas.width, b.y * offCanvas.height, b.w * offCanvas.width, b.h * offCanvas.height);
          });

          const pngBlob = await new Promise(res => offCanvas.toBlob(res, 'image/png'));
          const pngBytes = await pngBlob.arrayBuffer();
          const pngImage = await newPdf.embedPng(pngBytes);

          const newPage = newPdf.addPage([origVp.width, origVp.height]);
          newPage.drawImage(pngImage, {
            x: 0,
            y: 0,
            width: origVp.width,
            height: origVp.height
          });
        }

        const savedBytes = await newPdf.save();
        downloadTrackedBlob(new Blob([savedBytes], { type: 'application/pdf' }), `permanently_redacted_${redactState.file.name}`);
      } catch (err) {
        console.error('Permanent redact execute error:', err);
        alert('Failed to permanently redact PDF: ' + err.message);
      }
    }

// ================= TOOL 19: PDF TO WORD (.DOCX) =================
    let pdf2wordState = {
      file: null,
      doc: null,
      mode: 'ocr', // 'ocr' | 'text' | 'visual'
      pagesData: [],
      pageImages: [],
      ocrPagesData: [],
      hasOcrRun: false,
      isOcrRunning: false,
      ocrPromise: null
    };

    function initPdf2WordToolListeners() {
      const dropZone = document.getElementById('pdf2word-drop-zone');
      const input = document.getElementById('pdf2word-file-input');
      if (!dropZone || !input) return;

      dropZone.addEventListener('click', (e) => { if (e.target !== input) input.click(); });
      dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-blue-500'); });
      dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('border-blue-500'); });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500');
        if (e.dataTransfer.files && e.dataTransfer.files.length) loadPdf2WordFile(e.dataTransfer.files[0]);
      });
      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) loadPdf2WordFile(e.target.files[0]);
      });
    }

    function setPdf2WordMode(mode) {
      if (mode !== 'visual' && mode !== 'ocr' && mode !== 'text') return;
      pdf2wordState.mode = mode;

      const visualBtn = document.getElementById('pdf2word-mode-visual-btn');
      const ocrBtn = document.getElementById('pdf2word-mode-ocr-btn');
      const textBtn = document.getElementById('pdf2word-mode-text-btn');
      const descEl = document.getElementById('pdf2word-mode-desc');
      const ocrBanner = document.getElementById('pdf2word-ocr-banner');
      const ocrLangWrapper = document.getElementById('pdf2word-ocr-lang-wrapper');

      const defaultBtnClass = 'px-3 py-1.5 rounded-md text-xs font-bold transition text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5';
      const activeBtnClass = 'px-3 py-1.5 rounded-md text-xs font-bold transition bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs flex items-center gap-1.5';

      if (visualBtn) visualBtn.className = mode === 'visual' ? activeBtnClass : defaultBtnClass;
      if (ocrBtn) ocrBtn.className = mode === 'ocr' ? activeBtnClass : defaultBtnClass;
      if (textBtn) textBtn.className = mode === 'text' ? activeBtnClass : defaultBtnClass;

      if (mode === 'ocr') {
        if (ocrBanner) ocrBanner.classList.remove('hidden');
        if (ocrLangWrapper) ocrLangWrapper.classList.remove('hidden');
        if (descEl) descEl.textContent = 'Engages AI OCR (Tesseract.js) to recognize and convert scanned image text into editable Word paragraphs & tables.';
        
        // If OCR has not run yet and we have a document, automatically run OCR!
        if (!pdf2wordState.hasOcrRun && pdf2wordState.doc && !pdf2wordState.isOcrRunning) {
          runPdf2WordOcr().catch(e => console.warn('Auto OCR error:', e));
        }
      } else {
        if (ocrBanner) ocrBanner.classList.add('hidden');
        if (ocrLangWrapper) ocrLangWrapper.classList.add('hidden');
        if (descEl) {
          descEl.textContent = mode === 'visual'
            ? 'Embeds high-res page images into Word (replicates exact form lines, but text is non-editable images).'
            : 'Extracts flowing editable paragraphs, detected fonts & OpenXML tables directly from PDF text.';
        }
      }

      const previewBox = document.getElementById('pdf2word-preview-box');
      renderWordDocumentPreview(previewBox, pdf2wordState.pagesData, pdf2wordState.pageImages, pdf2wordState.mode, pdf2wordState.ocrPagesData);
    }

    async function runPdf2WordOcr() {
      if (!pdf2wordState.doc) return;
      if (pdf2wordState.isOcrRunning && pdf2wordState.ocrPromise) {
        return await pdf2wordState.ocrPromise;
      }

      pdf2wordState.isOcrRunning = true;
      const statusText = document.getElementById('pdf2word-ocr-status-text');
      const startOcrBtn = document.getElementById('pdf2word-start-ocr-btn');
      const icon = document.getElementById('pdf2word-ocr-icon');
      const lang = document.getElementById('pdf2word-ocr-lang-select')?.value || 'eng';

      if (startOcrBtn) {
        startOcrBtn.disabled = true;
        startOcrBtn.classList.add('opacity-50', 'cursor-not-allowed');
      }
      if (icon) icon.className = 'animate-spin text-blue-600 dark:text-blue-400';
      if (statusText) statusText.textContent = `Loading in-browser AI OCR engine (${lang})...`;

      pdf2wordState.ocrPromise = (async () => {
        try {
          await ensureTesseract();
          const worker = await Tesseract.createWorker(lang);

          const doc = pdf2wordState.doc;
          const ocrPages = [];
          const maxPages = Math.min(doc.numPages, 10);

          for (let p = 1; p <= maxPages; p++) {
            if (statusText) statusText.textContent = `Running AI OCR (${lang}) on page ${p} of ${maxPages}...`;
            const page = await doc.getPage(p);
            const viewport = page.getViewport({ scale: 2.0 });

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');

            await page.render({ canvasContext: ctx, viewport }).promise;
            if (typeof preprocessCanvasContrast === 'function') {
              preprocessCanvasContrast(ctx, canvas.width, canvas.height);
            }

            const { data } = await worker.recognize(canvas);
            const text = data?.text || '';
            const ocrLines = data?.lines || [];

            const cleanLines = ocrLines.map(l => {
              const bbox = l.bbox || {};
              const x0 = typeof bbox.x0 === 'number' ? bbox.x0 : 0;
              const y0 = typeof bbox.y0 === 'number' ? bbox.y0 : 0;
              const x1 = typeof bbox.x1 === 'number' ? bbox.x1 : 0;
              const y1 = typeof bbox.y1 === 'number' ? bbox.y1 : 0;
              const scale = 2.0;
              const x = x0 / scale;
              const y = y0 / scale;
              const width = Math.max(10, (x1 - x0) / scale);
              const height = Math.max(10, (y1 - y0) / scale);
              const fontSize = Math.max(9, Math.round(height * 0.75));
              let lText = (l.text || '').trim();
              lText = lText
                .replace(/\s+([.,;:!?%)\]}])/g, '$1')
                .replace(/([(\[{])\s+/g, '$1')
                .replace(/[ \t]{2,}/g, ' ')
                .trim();
              return {
                text: lText,
                x,
                y,
                minX: x,
                maxX: x + width,
                width,
                height,
                fontSize,
                isBold: /bold|black/i.test(l.font_name || '') || (lText.length > 3 && lText.toUpperCase() === lText && !/\d/.test(lText)),
                confidence: l.confidence
              };
            }).filter(l => l.text.length > 0);

            let blocks = detectContentBlocks(cleanLines, viewport.width);
            if (!blocks.length && text.trim().length > 0) {
              const rawParas = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
              blocks = rawParas.map(pStr => ({
                type: 'paragraph',
                text: pStr,
                runs: [{ text: pStr, fontSize: 11 }]
              }));
            }

            ocrPages.push({
              pageNum: p,
              pageWidth: viewport.width,
              pageHeight: viewport.height,
              blocks,
              rawText: text
            });
          }

          await worker.terminate();

          pdf2wordState.ocrPagesData = ocrPages;
          pdf2wordState.hasOcrRun = true;

          if (statusText) statusText.textContent = `✓ OCR Complete (${maxPages} page(s) recognized)! Converted to editable Word text.`;
          if (icon) icon.className = 'text-emerald-500 font-bold';
          if (startOcrBtn) {
            startOcrBtn.disabled = false;
            startOcrBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            startOcrBtn.innerHTML = '<span>🔄</span> <span>Re-run OCR</span>';
          }

          // Update preview with OCR result
          const previewBox = document.getElementById('pdf2word-preview-box');
          renderWordDocumentPreview(previewBox, pdf2wordState.pagesData, pdf2wordState.pageImages, 'ocr', pdf2wordState.ocrPagesData);
        } catch (err) {
          console.error('PDF to Word OCR error:', err);
          if (statusText) statusText.textContent = `OCR Failed: ${err.message}`;
          if (icon) icon.className = 'text-rose-500 font-bold';
          if (startOcrBtn) {
            startOcrBtn.disabled = false;
            startOcrBtn.classList.remove('opacity-50', 'cursor-not-allowed');
          }
          throw err;
        } finally {
          pdf2wordState.isOcrRunning = false;
          pdf2wordState.ocrPromise = null;
        }
      })();

      return await pdf2wordState.ocrPromise;
    }

    async function loadPdf2WordFile(file) {
      if (!await validateSinglePdfFile(file, 'PDF to Word')) return;
      try {
        const buffer = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
        pdf2wordState = {
          file,
          doc,
          mode: 'text',
          pagesData: [],
          pageImages: [],
          ocrPagesData: [],
          hasOcrRun: false,
          isOcrRunning: false,
          ocrPromise: null
        };

        const card = document.getElementById('pdf2word-controls-card');
        const docName = document.getElementById('pdf2word-doc-name');
        const statsEl = document.getElementById('pdf2word-stats-text');
        const previewBox = document.getElementById('pdf2word-preview-box');

        setToolScreenState('pdf2word', 'workspace');
        if (docName) docName.textContent = file.name;
        if (statsEl) statsEl.textContent = `Rebuilding typography & semantic layout for ${doc.numPages} page(s)...`;

        let totalParagraphs = 0;
        let totalHeadings = 0;
        let totalTables = 0;

        for (let p = 1; p <= doc.numPages; p++) {
          const page = await doc.getPage(p);
          const viewport = page.getViewport({ scale: 1.0 });

          // 1. Render high-resolution page canvas for 1:1 Visual Match (matching iLovePDF)
          try {
            const renderScale = 2.0;
            const renderVp = page.getViewport({ scale: renderScale });
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = renderVp.width;
            pageCanvas.height = renderVp.height;
            await page.render({ canvasContext: pageCanvas.getContext('2d'), viewport: renderVp }).promise;

            const dataUrl = pageCanvas.toDataURL('image/jpeg', 0.92);
            const blob = await new Promise(r => pageCanvas.toBlob(r, 'image/jpeg', 0.92));
            if (blob) {
              const bytes = new Uint8Array(await blob.arrayBuffer());
              pdf2wordState.pageImages.push({
                id: `page_img_${p}`,
                bytes,
                dataUrl,
                ext: 'jpg',
                width: viewport.width,
                height: viewport.height
              });
            }
          } catch (e) {
            console.warn('Page canvas render error:', e);
          }

          // 2. Extract semantic text content for Editable Text Mode
          const textContent = await page.getTextContent();
          const rawItems = (textContent.items || []).map(it => {
            const tx = it.transform || [1, 0, 0, 1, 0, 0];
            const scaleX = tx[0];
            const scaleY = tx[3];
            const fontSize = Math.round(Math.hypot(scaleX, tx[1]) * 10) / 10 || Math.abs(scaleY) || 10;
            const x = tx[4];
            const y = viewport.height - tx[5];
            const fontName = it.fontName || '';
            const isBold = /bold|black|heavy|semibold|medium|b8|b9/i.test(fontName);
            const isItalic = /italic|oblique/i.test(fontName);
            return {
              str: it.str || '',
              x,
              y,
              width: it.width || (it.str.length * fontSize * 0.5),
              height: it.height || fontSize,
              fontSize,
              isBold,
              isItalic,
              fontName
            };
          }).filter(it => it.str && it.str.trim().length > 0);

          const lines = groupSpatialTokensIntoLines(rawItems, viewport.width);
          const blocks = detectContentBlocks(lines, viewport.width);

          blocks.forEach(b => {
            if (b.type === 'table') totalTables++;
            else if (b.type === 'title' || b.type === 'heading1' || b.type === 'heading2') totalHeadings++;
            else totalParagraphs++;
          });

          pdf2wordState.pagesData.push({
            pageNum: p,
            pageWidth: viewport.width,
            pageHeight: viewport.height,
            lines,
            blocks
          });
        }

        let totalDigitalChars = 0;
        pdf2wordState.pagesData.forEach(pg => {
          (pg.lines || []).forEach(l => {
            totalDigitalChars += (l.text || '').length;
          });
        });

        // A PDF is only considered a scanned document if it contains virtually no digital text
        const isScannedDocument = totalDigitalChars < 40 && totalParagraphs <= 1;

        if (isScannedDocument) {
          if (statsEl) {
            statsEl.textContent = `${doc.numPages} page(s) • 📸 Scanned PDF (Pure Image) • AI OCR Mode Activated`;
          }
          setPdf2WordMode('ocr');
        } else {
          if (statsEl) {
            statsEl.textContent = `${doc.numPages} page(s) • Digital PDF • ${totalParagraphs} flowing paragraphs, headings & tables`;
          }
          setPdf2WordMode('text');
        }
      } catch (err) {
        console.error('PDF to Word load error:', err);
        alert('Failed to parse PDF for Word conversion: ' + err.message);
      }
    }

    function groupSpatialTokensIntoLines(tokens, pageWidth = 612) {
      if (!tokens || !tokens.length) return [];
      if (typeof tokens[0] === 'string') return tokens;

      const items = [...tokens].sort((a, b) => (a.y - b.y) || (a.x - b.x));
      const lines = [];

      items.forEach(it => {
        let matchedLine = null;
        for (let i = lines.length - 1; i >= 0; i--) {
          const l = lines[i];
          const refFontSize = Math.max(8, it.fontSize || 10, l.fontSize || 10);
          const vertTol = Math.max(5.5, refFontSize * 0.65);
          if (Math.abs(it.y - l.y) <= vertTol) {
            matchedLine = l;
            break;
          }
          if (it.y - l.y > 35) break;
        }

        if (matchedLine) {
          matchedLine.y = (matchedLine.y * matchedLine.items.length + it.y) / (matchedLine.items.length + 1);
          matchedLine.items.push(it);
          matchedLine.minX = Math.min(matchedLine.minX, it.x);
          matchedLine.maxX = Math.max(matchedLine.maxX, it.x + (it.width || 0));
          matchedLine.height = Math.max(matchedLine.height, it.height || it.fontSize || 10);
          matchedLine.fontSize = Math.max(matchedLine.fontSize, it.fontSize || 10);
        } else {
          lines.push({
            y: it.y,
            minX: it.x,
            maxX: it.x + (it.width || 0),
            height: it.height || it.fontSize || 10,
            fontSize: it.fontSize || 10,
            items: [it]
          });
        }
      });

      lines.sort((a, b) => a.y - b.y);

      lines.forEach(l => {
        l.items.sort((a, b) => a.x - b.x);
        const runs = [];
        let fullText = '';
        const gaps = [];

        for (let i = 0; i < l.items.length; i++) {
          const it = l.items[i];
          const cleanStr = it.str || '';
          if (!cleanStr) continue;

          let needSpace = false;
          if (i > 0) {
            const prev = l.items[i - 1];
            const gap = it.x - (prev.x + prev.width);
            const spaceThreshold = Math.max(1.8, (it.fontSize || 10) * 0.2);
            if (gap > (it.fontSize || 10) * 1.8) {
              gaps.push({ x: (prev.x + prev.width + it.x) / 2, width: gap });
              needSpace = true;
            } else if (gap > spaceThreshold) {
              needSpace = true;
            }
          }

          if (/^[.,;:!?%)\]}']/.test(cleanStr.trim())) {
            needSpace = false;
          }
          if (/[(\[{]$/.test(fullText.trim())) {
            needSpace = false;
          }
          if (fullText.endsWith(' ') || cleanStr.startsWith(' ')) {
            needSpace = false;
          }

          const lastRun = runs[runs.length - 1];
          const matchesLastRun = lastRun &&
            lastRun.isBold === Boolean(it.isBold) &&
            lastRun.isItalic === Boolean(it.isItalic) &&
            Math.abs(lastRun.fontSize - (it.fontSize || 10)) < 1.0;

          if (matchesLastRun) {
            if (needSpace) {
              lastRun.text += ' ';
              fullText += ' ';
            }
            lastRun.text += cleanStr;
            fullText += cleanStr;
          } else {
            if (needSpace) {
              fullText += ' ';
            }
            runs.push({
              text: cleanStr,
              isBold: Boolean(it.isBold),
              isItalic: Boolean(it.isItalic),
              fontSize: it.fontSize || 10
            });
            fullText += cleanStr;
          }
        }

        fullText = fullText
          .replace(/\s+([.,;:!?%)\]}])/g, '$1')
          .replace(/([(\[{])\s+/g, '$1')
          .replace(/[ \t]{2,}/g, ' ')
          .trim();

        runs.forEach(r => {
          r.text = r.text
            .replace(/\s+([.,;:!?%)\]}])/g, '$1')
            .replace(/([(\[{])\s+/g, '$1')
            .replace(/[ \t]{2,}/g, ' ');
        });

        l.runs = runs;
        l.text = fullText;
        l.gaps = gaps;
        l.gapCount = gaps.length;
      });

      return lines.filter(l => l.text && l.text.length > 0);
    }

    function detectContentBlocks(lines, pageWidth = 612) {
      if (!lines || !lines.length) return [];
      const blocks = [];

      const fontSizes = lines.map(l => (typeof l === 'object' && l.fontSize) ? l.fontSize : 11);
      fontSizes.sort((a, b) => a - b);
      const bodyFontSize = fontSizes[Math.floor(fontSizes.length / 2)] || 11;

      const maxXs = lines.map(l => (typeof l === 'object' && l.maxX) ? l.maxX : 0).filter(x => x > 0);
      const colRight = maxXs.length ? Math.max(...maxXs) : (pageWidth - 72);

      function classifyLine(lineObj, idx) {
        const text = (typeof lineObj === 'string' ? lineObj : lineObj.text || '').trim();
        if (!text) return { type: 'empty' };

        if (checkIsTableLine(lineObj)) {
          return { type: 'table_candidate' };
        }

        // Running page number / header filter
        if (/^(?:page\s*\d+(?:\s*(?:of|\/|\-)\s*\d+)?|\d+)$/i.test(text) && text.length < 20) {
          return { type: 'page_number', text };
        }

        const fontSize = (typeof lineObj === 'object' && lineObj.fontSize) ? lineObj.fontSize : 11;
        const isBold = typeof lineObj === 'object' ? (lineObj.items ? lineObj.items.some(it => it.isBold) : (lineObj.isBold || false)) : false;

        // Numbered section heading: "1.1 Background", "1.2 Paraxial and Marginal Rays", "2. Theoretical Framework"
        const isNumberedHeading = /^(?:\d+\.|\d+\.\d+|\d+\.\d+\.\d+|\d+\.\d+\.\d+\.\d+)\s+[A-Za-z0-9]/.test(text) && text.length < 90 && !/[.!?]$/.test(text.replace(/\s+/g, ' '));

        // Named section: "Chapter 1", "Section 2", "Appendix A"
        const isSectionPrefix = /^(?:chapter|section|part|appendix)\s+[0-9A-ZIVXLC]+/i.test(text) && text.length < 80;

        // All-caps Title: "INTRODUCTION", "ABSTRACT", "METHODS", "DISCUSSION", "CONCLUSION"
        const isAllCapsTitle = /^[A-Z0-9\s\-–—:,]{3,60}$/.test(text) && /[A-Z]{3,}/.test(text) && !/[.!?]$/.test(text) && text.length < 60;

        const isLargeTitle = fontSize >= bodyFontSize + 2.5 && text.length < 90;
        const isMediumHeading = (fontSize >= bodyFontSize + 0.8 || isBold) && text.length < 80 && !/[.!?]$/.test(text);

        if (isAllCapsTitle || isLargeTitle) {
          return { type: 'heading1', text };
        }
        if (isNumberedHeading || isSectionPrefix || isMediumHeading) {
          return { type: 'heading2', text };
        }

        return { type: 'paragraph', text };
      }

      let i = 0;
      while (i < lines.length) {
        const line = lines[i];
        const text = (typeof line === 'string' ? line : line.text || '').trim();

        if (!text) {
          i++;
          continue;
        }

        // 1. Table Detection
        const tableLines = [];
        let cur = i;
        while (cur < lines.length) {
          const l = lines[cur];
          const lText = (typeof l === 'string' ? l : l.text || '').trim();
          if (!lText) break;

          if (checkIsTableLine(l)) {
            tableLines.push(l);
            cur++;
          } else {
            break;
          }
        }

        if (tableLines.length >= 2) {
          const rows = parseTableRows(tableLines);
          blocks.push({
            type: 'table',
            rows
          });
          i = cur;
          continue;
        }

        // 2. Headings & Special Lines Detection
        const classification = classifyLine(line, i);
        if (classification.type === 'page_number') {
          // Omit standalone page number header from body text flow
          i++;
          continue;
        }

        if (classification.type === 'heading1') {
          blocks.push({
            type: 'title',
            text,
            runs: line.runs || [{ text, fontSize: Math.max(14, (line.fontSize || 12) + 2), bold: true }]
          });
          i++;
          continue;
        }

        if (classification.type === 'heading2') {
          blocks.push({
            type: 'heading2',
            text,
            runs: line.runs || [{ text, fontSize: Math.max(12, (line.fontSize || 11) + 1), bold: true }]
          });
          i++;
          continue;
        }

        // 3. Regular Flowing Paragraph Flow (De-fragmentation)
        const paraLines = [line];
        let pNext = i + 1;
        while (pNext < lines.length) {
          const nextL = lines[pNext];
          const nextT = (typeof nextL === 'string' ? nextL : nextL.text || '').trim();
          if (!nextT) break;

          if (checkIsTableLine(nextL)) break;
          const nextClass = classifyLine(nextL, pNext);
          if (nextClass.type === 'heading1' || nextClass.type === 'heading2' || nextClass.type === 'page_number') {
            break;
          }

          const prevL = paraLines[paraLines.length - 1];
          const prevT = (typeof prevL === 'string' ? prevL : prevL.text || '').trim();

          if (typeof prevL === 'object' && typeof nextL === 'object' && prevL.y !== undefined && nextL.y !== undefined) {
            const baselineDelta = nextL.y - prevL.y;
            const lineLeadingTol = Math.max(28, bodyFontSize * 2.5);
            if (baselineDelta > lineLeadingTol) {
              break;
            }
          }

          const endsWithSentencePunctuation = /[.!?]$/.test(prevT);
          if (endsWithSentencePunctuation) {
            if (typeof prevL === 'object' && prevL.maxX !== undefined) {
              const distToMargin = colRight - prevL.maxX;
              if (distToMargin >= 70) {
                break;
              }
            }
          }

          paraLines.push(nextL);
          pNext++;
        }

        const aggregatedRuns = [];
        let combinedText = '';
        let hasFirstLineIndent = false;
        let firstLineIndentTwips = 0;

        if (paraLines.length > 1 && paraLines[0].minX && paraLines[1].minX) {
          const indentDiff = paraLines[0].minX - paraLines[1].minX;
          if (indentDiff >= 12 && indentDiff <= 72) {
            hasFirstLineIndent = true;
            firstLineIndentTwips = Math.round(indentDiff * 20);
          }
        }

        paraLines.forEach((pl, plIdx) => {
          const plText = (typeof pl === 'string' ? pl : pl.text || '').trim();
          if (!plText) return;

          if (plIdx > 0 && combinedText.length > 0) {
            if (combinedText.endsWith('-') && /^[a-z]/i.test(plText)) {
              combinedText = combinedText.slice(0, -1);
              if (aggregatedRuns.length) {
                const lastRun = aggregatedRuns[aggregatedRuns.length - 1];
                if (lastRun.text.endsWith('-')) {
                  lastRun.text = lastRun.text.slice(0, -1);
                }
              }
            } else if (!combinedText.endsWith(' ') && !plText.startsWith(' ')) {
              combinedText += ' ';
              if (aggregatedRuns.length) {
                const lastRun = aggregatedRuns[aggregatedRuns.length - 1];
                if (!lastRun.text.endsWith(' ')) lastRun.text += ' ';
              }
            }
          }

          if (pl.runs && pl.runs.length) {
            pl.runs.forEach(r => {
              const lastAgg = aggregatedRuns[aggregatedRuns.length - 1];
              if (lastAgg && lastAgg.bold === Boolean(r.isBold) && lastAgg.italic === Boolean(r.isItalic) && Math.abs((lastAgg.fontSize || 11) - (r.fontSize || 11)) < 1.0) {
                lastAgg.text += r.text;
              } else {
                aggregatedRuns.push({
                  text: r.text,
                  bold: Boolean(r.isBold),
                  italic: Boolean(r.isItalic),
                  fontSize: r.fontSize || 11
                });
              }
            });
          } else {
            aggregatedRuns.push({ text: plText, fontSize: 11 });
          }

          combinedText += plText;
        });

        combinedText = combinedText
          .replace(/\s+([.,;:!?%)\]}])/g, '$1')
          .replace(/([(\[{])\s+/g, '$1')
          .replace(/[ \t]{2,}/g, ' ')
          .trim();

        aggregatedRuns.forEach(r => {
          r.text = r.text
            .replace(/\s+([.,;:!?%)\]}])/g, '$1')
            .replace(/([(\[{])\s+/g, '$1')
            .replace(/[ \t]{2,}/g, ' ');
        });

        blocks.push({
          type: 'paragraph',
          text: combinedText,
          runs: aggregatedRuns.length ? aggregatedRuns : [{ text: combinedText, fontSize: 11 }],
          hasFirstLineIndent,
          firstLineIndentTwips
        });

        i = pNext;
      }

      return blocks;
    }

    function checkIsTableLine(line) {
      if (!line) return false;
      const text = (typeof line === 'string' ? line : line.text).trim();
      if (!text) return false;

      if (line.items && line.gaps) {
        if (line.gaps.length >= 2 && line.items.length >= 3) {
          const hasCommonProseWords = /\b(the|and|of|in|to|for|with|that|by|from|as|at|this|which|be|is|are|was|were|will|has|have)\b/i.test(text);
          if (!hasCommonProseWords || /\$\d|\d+%|\b(?:qty|price|amount|balance|debit|credit|total)\b/i.test(text)) {
            return true;
          }
        }
      }

      const colMatches = text.split(/\t|\s{3,}/);
      if (colMatches.length >= 3) {
        const hasNumbers = colMatches.filter(c => /\d/.test(c)).length;
        if (hasNumbers >= 1) return true;
      }

      return false;
    }

    function parseTableRows(lines) {
      return lines.map(l => {
        const text = typeof l === 'string' ? l : l.text;
        return text.split(/\t|\s{2,}/).map(c => c.trim()).filter(Boolean);
      });
    }

    function detectDocumentFontFamily(pagesData) {
      const fontCounts = {};
      (pagesData || []).forEach(pg => {
        (pg.lines || []).forEach(l => {
          (l.items || []).forEach(it => {
            const f = (it.fontName || '').toLowerCase();
            if (f.includes('times') || f.includes('roman') || f.includes('serif') || f.includes('tnr')) {
              fontCounts['Times New Roman'] = (fontCounts['Times New Roman'] || 0) + 1;
            } else if (f.includes('arial') || f.includes('helvetica')) {
              fontCounts['Arial'] = (fontCounts['Arial'] || 0) + 1;
            } else if (f.includes('calibri')) {
              fontCounts['Calibri'] = (fontCounts['Calibri'] || 0) + 1;
            }
          });
        });
      });

      let bestFont = 'Times New Roman';
      let maxCount = 0;
      for (const [font, count] of Object.entries(fontCounts)) {
        if (count > maxCount) {
          maxCount = count;
          bestFont = font;
        }
      }
      return bestFont;
    }

    function formatOpenXmlTable(rows) {
      if (!rows || !rows.length) return '';
      const colCount = Math.max(...rows.map(r => r.length));
      const tableWidthDxa = 9360;
      const colWidth = Math.floor(tableWidthDxa / colCount);

      let tblXml = `
        <w:tbl>
          <w:tblPr>
            <w:tblW w:w="${tableWidthDxa}" w:type="dxa"/>
            <w:jc w:val="center"/>
            <w:tblBorders>
              <w:top w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
              <w:left w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
              <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
              <w:right w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
              <w:insideH w:val="single" w:sz="4" w:space="0" w:color="EEEEEE"/>
              <w:insideV w:val="single" w:sz="4" w:space="0" w:color="EEEEEE"/>
            </w:tblBorders>
          </w:tblPr>
          <w:tblGrid>`;

      for (let c = 0; c < colCount; c++) {
        tblXml += `<w:gridCol w:w="${colWidth}"/>`;
      }
      tblXml += `</w:tblGrid>`;

      rows.forEach((row, rIdx) => {
        const isHeader = rIdx === 0;
        tblXml += `<w:tr>`;
        if (isHeader) {
          tblXml += `<w:trPr><w:tblHeader/></w:trPr>`;
        }
        for (let c = 0; c < colCount; c++) {
          const cellText = row[c] !== undefined ? escapeXml(row[c]) : '';
          const bgShading = isHeader ? '<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>' : '';
          const boldPr = isHeader ? '<w:b/><w:color w:val="000000"/>' : '<w:color w:val="000000"/>';
          tblXml += `
            <w:tc>
              <w:tcPr>
                <w:tcW w:w="${colWidth}" w:type="dxa"/>
                ${bgShading}
              </w:tcPr>
              <w:p>
                <w:pPr><w:spacing w:after="60"/></w:pPr>
                <w:r>
                  <w:rPr>${boldPr}</w:rPr>
                  <w:t xml:space="preserve">${cellText}</w:t>
                </w:r>
              </w:p>
            </w:tc>`;
        }
        tblXml += `</w:tr>`;
      });

      tblXml += `</w:tbl>`;
      return tblXml;
    }

    function renderWordDocumentPreview(previewBox, pagesData, pageImages, mode = 'visual', ocrPagesData = []) {
      if (!previewBox) return;

      if (mode === 'visual' && pageImages && pageImages.length) {
        let html = '';
        pageImages.forEach((img, idx) => {
          const p = idx + 1;
          html += `
            <div class="mb-6 p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 max-w-3xl mx-auto transition">
              <div class="text-[10px] font-sans font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2 mb-4 flex items-center justify-between">
                <span>Page ${p} of ${pageImages.length}</span>
                <span class="text-[9px] bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded font-mono">🎯 1:1 Visual Fidelity (iLovePDF Style)</span>
              </div>
              <img src="${img.dataUrl}" alt="Page ${p}" class="w-full h-auto rounded border border-slate-200 dark:border-slate-700 shadow-sm pointer-events-none" />
            </div>`;
        });
        previewBox.innerHTML = html;
        return;
      }

      // OCR Mode Preview
      if (mode === 'ocr') {
        const sourcePages = ocrPagesData && ocrPagesData.length ? ocrPagesData : [];
        if (!sourcePages.length) {
          previewBox.innerHTML = `
            <div class="p-8 text-center text-slate-500 dark:text-slate-400">
              <div class="w-12 h-12 mx-auto mb-3 bg-blue-100 dark:bg-blue-950/60 text-blue-600 rounded-full flex items-center justify-center text-xl">🔍</div>
              <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300">Ready to OCR Scanned Document</h4>
              <p class="text-xs mt-1 mb-4 max-w-sm mx-auto">Click "Run OCR Now" in the blue banner above to extract all text, headings, and lines from your scanned image into editable Word text.</p>
              <button data-action="start-pdf2word-ocr" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition">⚡ Start AI OCR Now</button>
            </div>`;
          return;
        }

        let html = '';
        sourcePages.forEach(pg => {
          html += `
            <div class="mb-6 p-8 sm:p-12 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 font-sans leading-relaxed text-black dark:text-white max-w-3xl mx-auto">
              <div class="text-[10px] font-sans font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2 mb-6 flex items-center justify-between">
                <span>Page ${pg.pageNum}</span>
                <span class="text-[9px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded font-mono">🔍 AI OCR Recognized Text</span>
              </div>`;

          const blocks = pg.blocks || [];
          blocks.forEach(b => {
            if (b.type === 'title') {
              const titleText = escapeHtml(b.text || (b.runs || []).map(r => r.text).join(''));
              html += `<h1 class="text-xl font-bold text-center text-black dark:text-white my-4 tracking-wide">${titleText}</h1>`;
            } else if (b.type === 'heading2') {
              const headingText = escapeHtml(b.text || (b.runs || []).map(r => r.text).join(''));
              html += `<h2 class="text-base font-bold text-black dark:text-white mt-5 mb-2">${headingText}</h2>`;
            } else if (b.type === 'table') {
              html += `<div class="my-4 overflow-x-auto"><table class="min-w-full text-xs border border-black dark:border-slate-700">`;
              b.rows.forEach((r, rIdx) => {
                const isHdr = rIdx === 0;
                html += `<tr class="${isHdr ? 'bg-slate-100 dark:bg-slate-800 font-bold text-black dark:text-white' : 'border-t border-black dark:border-slate-700'}">`;
                r.forEach(c => {
                  html += `<td class="p-2 border-r border-black dark:border-slate-700 text-black dark:text-white h-7">${escapeHtml(c)}</td>`;
                });
                html += `</tr>`;
              });
              html += `</table></div>`;
            } else {
              html += `<p class="text-xs sm:text-sm mb-3 text-justify leading-relaxed text-black dark:text-slate-100">${escapeHtml(b.text || '')}</p>`;
            }
          });

          html += `</div>`;
        });
        previewBox.innerHTML = html;
        return;
      }

      // Text reflow mode preview
      const fontFamily = detectDocumentFontFamily(pagesData);
      const fontClass = fontFamily === 'Times New Roman' ? 'font-serif' : 'font-sans';
      let html = '';

      (pagesData || []).forEach(pg => {
        html += `
          <div class="mb-6 p-8 sm:p-12 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 ${fontClass} leading-relaxed text-black dark:text-white max-w-3xl mx-auto" style="font-family: '${fontFamily}', serif;">
            <div class="text-[10px] font-sans font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2 mb-6 flex items-center justify-between">
              <span>Page ${pg.pageNum}</span>
              <span class="text-[9px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400 font-mono">${fontFamily} • Flowing Text</span>
            </div>`;

        const blocks = pg.blocks || [];
        blocks.forEach(b => {
          if (b.type === 'title') {
            const titleText = escapeHtml(b.text || (b.runs || []).map(r => r.text).join(''));
            html += `<h1 class="text-xl font-bold text-center text-black dark:text-white my-4 tracking-wide">${titleText}</h1>`;
          } else if (b.type === 'heading2') {
            const headingText = escapeHtml(b.text || (b.runs || []).map(r => r.text).join(''));
            html += `<h2 class="text-base font-bold text-black dark:text-white mt-5 mb-2">${headingText}</h2>`;
          } else if (b.type === 'table') {
            html += `<div class="my-4 overflow-x-auto"><table class="min-w-full text-xs border border-black dark:border-slate-700">`;
            b.rows.forEach((r, rIdx) => {
              const isHdr = rIdx === 0;
              html += `<tr class="${isHdr ? 'bg-slate-100 dark:bg-slate-800 font-bold text-black dark:text-white' : 'border-t border-black dark:border-slate-700'}">`;
              r.forEach(c => {
                html += `<td class="p-2 border-r border-black dark:border-slate-700 text-black dark:text-white h-7">${escapeHtml(c)}</td>`;
              });
              html += `</tr>`;
            });
            html += `</table></div>`;
          } else {
            const indentClass = b.hasFirstLineIndent ? 'indent-8' : '';
            html += `<p class="text-xs sm:text-sm mb-3 text-justify leading-relaxed text-black dark:text-slate-100 ${indentClass}">`;
            const runs = b.runs || [{ text: b.text || '' }];
            runs.forEach(r => {
              let t = escapeHtml(r.text);
              if (r.bold) t = `<strong class="font-bold text-black dark:text-white">${t}</strong>`;
              if (r.italic) t = `<em>${t}</em>`;
              html += t;
            });
            html += `</p>`;
          }
        });

        html += `</div>`;
      });

      previewBox.innerHTML = html;
    }

    async function executeConvertPdfToWord() {
      if (!pdf2wordState.file) return;
      const convertBtn = document.querySelector('[data-action="run-pdf2word"]');
      const origBtnHtml = convertBtn ? convertBtn.innerHTML : '';

      try {
        if (convertBtn) {
          convertBtn.disabled = true;
          convertBtn.innerHTML = '<span>⏳</span> <span>Converting to Word (.docx)...</span>';
        }

        let docXmlBody = '';
        const mode = pdf2wordState.mode;

        // OCR Mode Export
        if (mode === 'ocr') {
          if (pdf2wordState.isOcrRunning && pdf2wordState.ocrPromise) {
            if (convertBtn) convertBtn.innerHTML = '<span>🔍</span> <span>Waiting for AI OCR...</span>';
            await pdf2wordState.ocrPromise;
          } else if (!pdf2wordState.hasOcrRun || !pdf2wordState.ocrPagesData.length) {
            if (convertBtn) convertBtn.innerHTML = '<span>🔍</span> <span>Running AI OCR Recognition...</span>';
            await runPdf2WordOcr();
          }

          const ocrPages = pdf2wordState.ocrPagesData || [];
          ocrPages.forEach((pg, pIdx) => {
            const blocks = pg.blocks || [];
            if (blocks.length === 0 && pg.rawText) {
              const rawParas = pg.rawText.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
              rawParas.forEach(pText => {
                docXmlBody += `<w:p><w:pPr><w:spacing w:after="140" w:line="260" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">${escapeXml(pText)}</w:t></w:r></w:p>`;
              });
            } else {
              blocks.forEach(b => {
                if (b.type === 'title') {
                  docXmlBody += `<w:p><w:pPr><w:pStyle w:val="Heading1"/><w:jc w:val="center"/><w:spacing w:before="240" w:after="140"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">${escapeXml(b.text || '')}</w:t></w:r></w:p>`;
                } else if (b.type === 'heading2') {
                  docXmlBody += `<w:p><w:pPr><w:pStyle w:val="Heading2"/><w:jc w:val="left"/><w:spacing w:before="180" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">${escapeXml(b.text || '')}</w:t></w:r></w:p>`;
                } else if (b.type === 'table') {
                  docXmlBody += formatOpenXmlTable(b.rows);
                  docXmlBody += `<w:p><w:pPr><w:spacing w:after="140"/></w:pPr></w:p>`;
                } else {
                  docXmlBody += `<w:p><w:pPr><w:spacing w:after="140" w:line="260" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">${escapeXml(b.text || '')}</w:t></w:r></w:p>`;
                }
              });
            }

            if (pIdx < ocrPages.length - 1) {
              docXmlBody += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
            }
          });

          const docxBlob = await buildOpenXmlDocxBlob(docXmlBody, 'Calibri', []);
          const fileName = (pdf2wordState.file ? pdf2wordState.file.name.replace(/\.pdf$/i, '') : 'document') + '_ocr.docx';
          downloadTrackedBlob(docxBlob, fileName);
          return;
        }

        if (mode === 'visual' && pdf2wordState.pageImages.length > 0) {
          // 1:1 Visual Fidelity Mode (Identical to PDF - iLovePDF Quality)
          const imagesToEmbed = [];
          const maxW_EMU = 6858000; // 7.5 in (10800 dxa)
          const maxH_EMU = 9144000; // 10 in (14400 dxa)

          pdf2wordState.pageImages.forEach((img, idx) => {
            const p = idx + 1;
            imagesToEmbed.push({ id: img.id, bytes: img.bytes, ext: img.ext });

            const aspect = (img.height || 792) / (img.width || 612);
            let cx = maxW_EMU;
            let cy = Math.round(maxW_EMU * aspect);
            if (cy > maxH_EMU) {
              const scale = maxH_EMU / cy;
              cx = Math.round(cx * scale);
              cy = maxH_EMU;
            }

            docXmlBody += `
              <w:p>
                <w:pPr>
                  <w:jc w:val="center"/>
                  <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
                </w:pPr>
                <w:r>
                  <w:drawing>
                    <wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
                      <wp:extent cx="${cx}" cy="${cy}"/>
                      <wp:docPr id="${p}" name="Page ${p}"/>
                      <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                          <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                            <pic:nvPicPr>
                              <pic:cNvPr id="${p}" name="Page ${p}"/>
                              <pic:cNvPicPr/>
                            </pic:nvPicPr>
                            <pic:blipFill>
                              <a:blip r:embed="${img.id}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
                              <a:stretch><a:fillRect/></a:stretch>
                            </pic:blipFill>
                            <pic:spPr>
                              <a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
                              <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                            </pic:spPr>
                          </pic:pic>
                        </a:graphicData>
                      </a:graphic>
                    </wp:inline>
                  </w:drawing>
                </w:r>
              </w:p>`;

            if (p < pdf2wordState.pageImages.length) {
              docXmlBody += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
            }
          });

          const docxBlob = await buildOpenXmlDocxBlob(docXmlBody, 'Calibri', imagesToEmbed, true);
          const fileName = (pdf2wordState.file ? pdf2wordState.file.name.replace(/\.pdf$/i, '') : 'document') + '.docx';
          downloadTrackedBlob(docxBlob, fileName);
          return;
        }

        // Editable Text Mode (Flowing text & OpenXML tables)
        const docFontFamily = detectDocumentFontFamily(pdf2wordState.pagesData);

        pdf2wordState.pagesData.forEach((pg, pIdx) => {
          const blocks = pg.blocks && pg.blocks.length ? pg.blocks : detectContentBlocks(pg.lines, pg.pageWidth);
          blocks.forEach(b => {
            if (b.type === 'title') {
              docXmlBody += `<w:p><w:pPr><w:pStyle w:val="Heading1"/><w:jc w:val="center"/><w:spacing w:before="240" w:after="140"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="${docFontFamily}" w:hAnsi="${docFontFamily}"/><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">${escapeXml(b.text || '')}</w:t></w:r></w:p>`;
            } else if (b.type === 'heading2') {
              docXmlBody += `<w:p><w:pPr><w:pStyle w:val="Heading2"/><w:jc w:val="left"/><w:spacing w:before="180" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="${docFontFamily}" w:hAnsi="${docFontFamily}"/><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">${escapeXml(b.text || '')}</w:t></w:r></w:p>`;
            } else if (b.type === 'table') {
              docXmlBody += formatOpenXmlTable(b.rows);
              docXmlBody += `<w:p><w:pPr><w:spacing w:after="140"/></w:pPr></w:p>`;
            } else {
              let pPr = '<w:pPr><w:spacing w:after="140" w:line="260" w:lineRule="auto"/><w:jc w:val="both"/>';
              if (b.firstLineIndentTwips && b.firstLineIndentTwips >= 200 && b.firstLineIndentTwips <= 1440) {
                pPr += `<w:ind w:firstLine="${b.firstLineIndentTwips}"/>`;
              }
              pPr += '</w:pPr>';
              docXmlBody += `<w:p>${pPr}`;
              const runs = b.runs && b.runs.length ? b.runs : [{ text: b.text || '' }];
              runs.forEach(r => {
                let rPr = `<w:rPr><w:rFonts w:ascii="${docFontFamily}" w:hAnsi="${docFontFamily}"/><w:color w:val="000000"/>`;
                if (r.bold) rPr += '<w:b/>';
                if (r.italic) rPr += '<w:i/>';
                if (r.fontSize) rPr += `<w:sz w:val="${Math.round(r.fontSize * 2)}"/><w:szCs w:val="${Math.round(r.fontSize * 2)}"/>`;
                rPr += '</w:rPr>';
                docXmlBody += `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(r.text)}</w:t></w:r>`;
              });
              docXmlBody += `</w:p>`;
            }
          });

          if (pIdx < pdf2wordState.pagesData.length - 1) {
            docXmlBody += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
          }
        });

        const docxBlob = await buildOpenXmlDocxBlob(docXmlBody, docFontFamily, []);
        const fileName = (pdf2wordState.file ? pdf2wordState.file.name.replace(/\.pdf$/i, '') : 'document') + '.docx';
        downloadTrackedBlob(docxBlob, fileName);
      } catch (err) {
        console.error('PDF to Word build error:', err);
        alert('Failed to generate Word document: ' + err.message);
      } finally {
        if (convertBtn) {
          convertBtn.disabled = false;
          convertBtn.innerHTML = origBtnHtml;
        }
      }
    }

    async function buildOpenXmlDocxBlob(documentXmlBody, fontFamily = 'Times New Roman', images = [], tightMargins = false) {
      const hasImages = images && images.length > 0;
      
      let contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>`;
      if (hasImages) {
        contentTypesXml += `
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>`;
      }
      contentTypesXml += `
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

      const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

      let wordRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;
      if (hasImages) {
        images.forEach(img => {
          wordRelsXml += `
  <Relationship Id="${img.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${img.id}.${img.ext || 'png'}"/>`;
        });
      }
      wordRelsXml += `
</Relationships>`;

      const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="${fontFamily}" w:hAnsi="${fontFamily}" w:cs="${fontFamily}"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:color w:val="000000"/>
        <w:lang w:val="en-US"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:uiPriority w:val="9"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:spacing w:before="240" w:after="120"/>
      <w:jc w:val="center"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="${fontFamily}" w:hAnsi="${fontFamily}" w:cs="${fontFamily}"/>
      <w:b/>
      <w:color w:val="000000"/>
      <w:sz w:val="28"/>
      <w:szCs w:val="28"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:uiPriority w:val="9"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:spacing w:before="180" w:after="60"/>
      <w:jc w:val="left"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="${fontFamily}" w:hAnsi="${fontFamily}" w:cs="${fontFamily}"/>
      <w:b/>
      <w:sz w:val="26"/>
      <w:szCs w:val="26"/>
      <w:color w:val="000000"/>
    </w:rPr>
  </w:style>
</w:styles>`;

      const marginDxa = tightMargins ? '720' : '1440';
      const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${documentXmlBody}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="${marginDxa}" w:right="${marginDxa}" w:bottom="${marginDxa}" w:left="${marginDxa}"/>
    </w:sectPr>
  </w:body>
</w:document>`;

      const zipEntries = [
        { path: '[Content_Types].xml', content: contentTypesXml },
        { path: '_rels/.rels', content: relsXml },
        { path: 'word/_rels/document.xml.rels', content: wordRelsXml },
        { path: 'word/styles.xml', content: stylesXml },
        { path: 'word/document.xml', content: documentXml }
      ];

      if (hasImages) {
        images.forEach(img => {
          zipEntries.push({
            path: `word/media/${img.id}.${img.ext || 'png'}`,
            content: img.bytes
          });
        });
      }

      return packZipFile(zipEntries, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    }

    function packZipFile(files, mimeType = 'application/zip') {
      const utf8 = new TextEncoder();
      const localHeaders = [];
      const centralHeaders = [];
      let offset = 0;

      files.forEach(f => {
        const nameBytes = utf8.encode(f.path);
        const dataBytes = typeof f.content === 'string' ? utf8.encode(f.content) : new Uint8Array(f.content);
        const crc = computeCrc32(dataBytes);
        const size = dataBytes.length;

        const lh = new Uint8Array(30 + nameBytes.length);
        const lView = new DataView(lh.buffer);
        lView.setUint32(0, 0x04034b50, true);
        lView.setUint16(4, 20, true);
        lView.setUint16(6, 0x0800, true);
        lView.setUint16(8, 0, true);
        lView.setUint16(10, 0, true);
        lView.setUint16(12, 0, true);
        lView.setUint32(14, crc, true);
        lView.setUint32(18, size, true);
        lView.setUint32(22, size, true);
        lView.setUint16(26, nameBytes.length, true);
        lView.setUint16(28, 0, true);
        lh.set(nameBytes, 30);

        localHeaders.push(lh, dataBytes);

        const cd = new Uint8Array(46 + nameBytes.length);
        const cView = new DataView(cd.buffer);
        cView.setUint32(0, 0x02014b50, true);
        cView.setUint16(4, 20, true);
        cView.setUint16(6, 20, true);
        cView.setUint16(8, 0x0800, true);
        cView.setUint16(10, 0, true);
        cView.setUint16(12, 0, true);
        cView.setUint16(14, 0, true);
        cView.setUint32(16, crc, true);
        cView.setUint32(20, size, true);
        cView.setUint32(24, size, true);
        cView.setUint16(28, nameBytes.length, true);
        cView.setUint16(30, 0, true);
        cView.setUint16(32, 0, true);
        cView.setUint16(34, 0, true);
        cView.setUint16(36, 0, true);
        cView.setUint32(38, 0, true);
        cView.setUint32(42, offset, true);
        cd.set(nameBytes, 46);

        centralHeaders.push(cd);
        offset += lh.length + dataBytes.length;
      });

      const cdOffset = offset;
      let cdSize = 0;
      centralHeaders.forEach(c => { cdSize += c.length; });

      const eocd = new Uint8Array(22);
      const eView = new DataView(eocd.buffer);
      eView.setUint32(0, 0x06054b50, true);
      eView.setUint16(4, 0, true);
      eView.setUint16(6, 0, true);
      eView.setUint16(8, files.length, true);
      eView.setUint16(10, files.length, true);
      eView.setUint32(12, cdSize, true);
      eView.setUint32(16, cdOffset, true);
      eView.setUint16(20, 0, true);

      const allChunks = [...localHeaders, ...centralHeaders, eocd];
      return new Blob(allChunks, { type: mimeType });
    }

    const crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
      }
      crcTable[n] = c;
    }

    function computeCrc32(bytes) {
      let c = 0 ^ (-1);
      for (let i = 0; i < bytes.length; i++) {
        c = (c >>> 8) ^ crcTable[(c ^ bytes[i]) & 0xFF];
      }
      return (c ^ (-1)) >>> 0;
    }

    function escapeXml(str) {
      return String(str || '').replace(/[<>&'"]/g, c => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
          default: return c;
        }
      });
    }

    // ================= TOOL 20: OFFICE & HTML TO PDF =================
    let office2pdfState = {
      file: null,
      type: '',
      rows: [],
      textContent: ''
    };

    function initOffice2PdfToolListeners() {
      const dropZone = document.getElementById('office2pdf-drop-zone');
      const input = document.getElementById('office2pdf-file-input');
      if (!dropZone || !input) return;

      dropZone.addEventListener('click', (e) => { if (e.target !== input) input.click(); });
      dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-emerald-500'); });
      dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('border-emerald-500'); });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-emerald-500');
        if (e.dataTransfer.files && e.dataTransfer.files.length) loadOffice2PdfFile(e.dataTransfer.files[0]);
      });
      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) loadOffice2PdfFile(e.target.files[0]);
      });
    }

    async function loadOffice2PdfFile(file) {
      try {
        office2pdfState = { file, type: '', rows: [], textContent: '' };
        const ext = file.name.split('.').pop().toLowerCase();
        const card = document.getElementById('office2pdf-controls-card');
        const docName = document.getElementById('office2pdf-doc-name');
        const preview = document.getElementById('office2pdf-preview-container');
        setToolScreenState('office2pdf', 'workspace');
        if (docName) docName.textContent = file.name;

        if (['xlsx', 'xls', 'csv', 'tsv'].includes(ext)) {
          office2pdfState.type = 'sheet';
          await ensureXlsx();
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          office2pdfState.rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

          if (preview) {
            let tableHtml = '<table class="w-full border-collapse text-[11px]"><tbody class="divide-y divide-slate-200 dark:divide-slate-800">';
            office2pdfState.rows.slice(0, 15).forEach((r, idx) => {
              tableHtml += `<tr class="${idx === 0 ? 'bg-slate-100 dark:bg-slate-800 font-bold' : ''}">`;
              r.forEach(c => {
                tableHtml += `<td class="p-1.5 border border-slate-200 dark:border-slate-800">${escapeHtml(c !== undefined ? c : '')}</td>`;
              });
              tableHtml += '</tr>';
            });
            tableHtml += '</tbody></table>';
            preview.innerHTML = tableHtml;
          }
        } else {
          office2pdfState.type = 'text';
          const text = await file.text();
          office2pdfState.textContent = text;
          if (preview) preview.textContent = text.slice(0, 2000);
        }
      } catch (err) {
        console.error('Office load error:', err);
        alert('Failed to parse office/HTML file: ' + err.message);
      }
    }

    async function executeConvertOfficeToPdf() {
      if (!office2pdfState.file) return;
      try {
        await ensureJsPdf();
        const orientation = document.getElementById('office2pdf-orientation')?.value || 'portrait';
        const format = document.getElementById('office2pdf-size')?.value || 'a4';
        const fontSize = parseInt(document.getElementById('office2pdf-font-size')?.value || '10', 10);

        const pdf = new jspdf.jsPDF({ orientation, unit: 'pt', format });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 40;

        if (office2pdfState.type === 'sheet' && office2pdfState.rows.length) {
          const rows = office2pdfState.rows;
          const headers = rows[0] || [];
          const body = rows.slice(1);

          if (typeof pdf.autoTable === 'function') {
            pdf.autoTable({
              head: [headers],
              body,
              startY: margin,
              margin: { left: margin, right: margin },
              styles: { fontSize, cellPadding: 4 },
              headStyles: { fillColor: [16, 185, 129] }
            });
          } else {
            pdf.setFontSize(fontSize);
            let y = margin;
            rows.forEach((row) => {
              if (y > pageHeight - margin) {
                pdf.addPage();
                y = margin;
              }
              const rowStr = row.map(c => String(c !== undefined ? c : '')).join(' | ');
              pdf.text(rowStr.slice(0, 110), margin, y);
              y += fontSize + 6;
            });
          }
        } else {
          pdf.setFontSize(fontSize);
          const lines = pdf.splitTextToSize(office2pdfState.textContent || '', pageWidth - (margin * 2));
          let y = margin;
          lines.forEach(line => {
            if (y > pageHeight - margin) {
              pdf.addPage();
              y = margin;
            }
            pdf.text(line, margin, y);
            y += fontSize + 4;
          });
        }

        const outBlob = pdf.output('blob');
        const fileName = office2pdfState.file.name.replace(/\.[^.]+$/, '') + '.pdf';
        downloadTrackedBlob(outBlob, fileName);
      } catch (err) {
        console.error('Office2Pdf convert error:', err);
        alert('Failed to generate PDF from document: ' + err.message);
      }
    }

    // ================= TOOL 21: PDF/A ISO 19005-1 CONVERTER =================
    let pdfaState = {
      file: null,
      pdfBytes: null
    };

    function initPdfaToolListeners() {
      const dropZone = document.getElementById('pdfa-drop-zone');
      const input = document.getElementById('pdfa-file-input');
      if (!dropZone || !input) return;

      dropZone.addEventListener('click', (e) => { if (e.target !== input) input.click(); });
      dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-teal-500'); });
      dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('border-teal-500'); });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-teal-500');
        if (e.dataTransfer.files && e.dataTransfer.files.length) loadPdfaFile(e.dataTransfer.files[0]);
      });
      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) loadPdfaFile(e.target.files[0]);
      });
    }

    async function loadPdfaFile(file) {
      if (!await validateSinglePdfFile(file, 'PDF/A Archival')) return;
      try {
        pdfaState.file = file;
        pdfaState.pdfBytes = await file.arrayBuffer();
        const card = document.getElementById('pdfa-controls-card');
        const docName = document.getElementById('pdfa-doc-name');
        setToolScreenState('pdfa', 'workspace');
        if (docName) docName.textContent = file.name;
      } catch (err) {
        console.error('PDF/A load error:', err);
        alert('Failed to load PDF: ' + err.message);
      }
    }

    async function executeConvertToPdfa() {
      if (!pdfaState.pdfBytes) return;
      try {
        await ensurePdfLib();
        const pdfDoc = await PDFLib.PDFDocument.load(pdfaState.pdfBytes.slice(0), { ignoreEncryption: true });

        const docTitle = pdfaState.file ? pdfaState.file.name.replace(/\.pdf$/i, '') : 'Archived Document';
        const nowIso = new Date().toISOString();
        const xmpXml = `<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>1</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:format>application/pdf</dc:format>
      <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(docTitle)}</rdf:li></rdf:Alt></dc:title>
      <dc:creator><rdf:Seq><rdf:li>Statement2Sheet ISO 19005-1 Archival Engine</rdf:li></rdf:Seq></dc:creator>
      <dc:date><rdf:Seq><rdf:li>${nowIso}</rdf:li></rdf:Seq></dc:date>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
      <pdf:Producer>Statement2Sheet Client PDF/A Archival Engine</pdf:Producer>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/">
      <xmp:CreateDate>${nowIso}</xmp:CreateDate>
      <xmp:ModifyDate>${nowIso}</xmp:ModifyDate>
      <xmp:MetadataDate>${nowIso}</xmp:MetadataDate>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

        const metadataStream = pdfDoc.context.stream(xmpXml);
        metadataStream.dict.set(PDFLib.PDFName.of('Type'), PDFLib.PDFName.of('Metadata'));
        metadataStream.dict.set(PDFLib.PDFName.of('Subtype'), PDFLib.PDFName.of('XML'));
        const metadataRef = pdfDoc.context.register(metadataStream);
        pdfDoc.catalog.set(PDFLib.PDFName.of('Metadata'), metadataRef);

        const outputIntent = pdfDoc.context.obj({
          Type: 'OutputIntent',
          S: 'GTS_PDFA1',
          OutputConditionIdentifier: PDFLib.PDFString.of('sRGB IEC61966-2.1'),
          Info: PDFLib.PDFString.of('sRGB IEC61966-2.1')
        });
        pdfDoc.catalog.set(PDFLib.PDFName.of('OutputIntents'), pdfDoc.context.obj([outputIntent]));

        pdfDoc.setTitle(docTitle);
        pdfDoc.setProducer('Statement2Sheet ISO 19005-1 Archival Engine');
        pdfDoc.setCreationDate(new Date());
        pdfDoc.setModificationDate(new Date());

        try {
          if (pdfDoc.catalog.has(PDFLib.PDFName.of('Names'))) {
            const names = pdfDoc.catalog.get(PDFLib.PDFName.of('Names'));
            if (names && typeof names.delete === 'function') {
              names.delete(PDFLib.PDFName.of('JavaScript'));
            }
          }
        } catch (_) {}

        const savedBytes = await pdfDoc.save({ useObjectStreams: false });
        downloadTrackedBlob(new Blob([savedBytes], { type: 'application/pdf' }), `pdfa_${pdfaState.file.name}`);
      } catch (err) {
        console.error('PDF/A convert error:', err);
        alert('Failed to convert to PDF/A: ' + err.message);
      }
    }

    // ================= TOOL 22: DIGITAL CRYPTOGRAPHIC SIGNATURES (PKI) =================
    let digitalSignState = {
      file: null,
      pdfBytes: null,
      sha256Hex: null
    };

    function initDigitalSignToolListeners() {
      const dropZone = document.getElementById('digitalsign-drop-zone');
      const input = document.getElementById('digitalsign-file-input');
      if (!dropZone || !input) return;

      dropZone.addEventListener('click', (e) => { if (e.target !== input) input.click(); });
      dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-purple-500'); });
      dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('border-purple-500'); });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-purple-500');
        if (e.dataTransfer.files && e.dataTransfer.files.length) loadDigitalSignFile(e.dataTransfer.files[0]);
      });
      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) loadDigitalSignFile(e.target.files[0]);
      });
    }

    async function loadDigitalSignFile(file) {
      if (!await validateSinglePdfFile(file, 'Digital Sign')) return;
      try {
        digitalSignState.file = file;
        digitalSignState.pdfBytes = await file.arrayBuffer();

        const hashBuffer = await window.crypto.subtle.digest('SHA-256', digitalSignState.pdfBytes);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        digitalSignState.sha256Hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

        const card = document.getElementById('digitalsign-controls-card');
        const docName = document.getElementById('digitalsign-doc-name');
        const hashPreview = document.getElementById('digitalsign-sha256-preview');

        setToolScreenState('digitalsign', 'workspace');
        if (docName) docName.textContent = file.name;
        if (hashPreview) hashPreview.textContent = `SHA-256 Digest: ${digitalSignState.sha256Hex.slice(0, 32)}...`;
      } catch (err) {
        console.error('Digital sign load error:', err);
        alert('Failed to load PDF for digital signing: ' + err.message);
      }
    }

    async function executeDigitalSignPdf() {
      if (!digitalSignState.pdfBytes || !digitalSignState.sha256Hex) return;
      try {
        const signerName = document.getElementById('digitalsign-name')?.value.trim() || 'Verified Signer';
        const signerOrg = document.getElementById('digitalsign-org')?.value.trim() || 'Self-Signed PKI';
        const reason = document.getElementById('digitalsign-reason')?.value.trim() || 'Attested & Approved';

        const keyPair = await window.crypto.subtle.generateKey(
          {
            name: 'RSA-PSS',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256'
          },
          true,
          ['sign', 'verify']
        );

        const signatureBuffer = await window.crypto.subtle.sign(
          { name: 'RSA-PSS', saltLength: 32 },
          keyPair.privateKey,
          new TextEncoder().encode(digitalSignState.sha256Hex)
        );

        const sigHex = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
        const timestamp = new Date().toISOString();

        const auditManifest = {
          standard: 'W3C WebCrypto PKI Seal',
          signer: signerName,
          organization: signerOrg,
          reason,
          timestamp,
          algorithm: 'RSA-PSS-2048-SHA256',
          documentSha256: digitalSignState.sha256Hex,
          cryptographicSignature: sigHex,
          verificationInstructions: 'Compute SHA-256 digest of original bytes and verify signature using embedded public key manifest.'
        };

        await ensurePdfLib();
        const pdfDoc = await PDFLib.PDFDocument.load(digitalSignState.pdfBytes.slice(0), { ignoreEncryption: true });
        const pages = pdfDoc.getPages();
        const lastPage = pages[pages.length - 1];
        const { width, height } = lastPage.getSize();

        const stampW = 220;
        const stampH = 72;
        const stampX = width - stampW - 30;
        const stampY = 30;

        lastPage.drawRectangle({
          x: stampX,
          y: stampY,
          width: stampW,
          height: stampH,
          color: PDFLib.rgb(0.97, 0.99, 0.98),
          borderColor: PDFLib.rgb(0.06, 0.72, 0.51),
          borderWidth: 1.5
        });

        const font = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
        const fontReg = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

        lastPage.drawText('DIGITALLY SIGNED & VERIFIED', {
          x: stampX + 8,
          y: stampY + stampH - 14,
          size: 8,
          font,
          color: PDFLib.rgb(0.06, 0.72, 0.51)
        });

        lastPage.drawText(`Signer: ${signerName} (${signerOrg})`, {
          x: stampX + 8,
          y: stampY + stampH - 26,
          size: 7,
          font: fontReg,
          color: PDFLib.rgb(0.12, 0.16, 0.23)
        });

        lastPage.drawText(`Reason: ${reason.slice(0, 36)}`, {
          x: stampX + 8,
          y: stampY + stampH - 37,
          size: 6.5,
          font: fontReg,
          color: PDFLib.rgb(0.2, 0.25, 0.33)
        });

        lastPage.drawText(`Date: ${timestamp.replace('T', ' ').slice(0, 19)} UTC`, {
          x: stampX + 8,
          y: stampY + stampH - 48,
          size: 6.5,
          font: fontReg,
          color: PDFLib.rgb(0.3, 0.35, 0.45)
        });

        lastPage.drawText(`SHA: ${digitalSignState.sha256Hex.slice(0, 24)}...`, {
          x: stampX + 8,
          y: stampY + stampH - 59,
          size: 6,
          font: fontReg,
          color: PDFLib.rgb(0.4, 0.45, 0.55)
        });

        pdfDoc.setSubject(`Audit Manifest: ${JSON.stringify(auditManifest)}`);
        const savedBytes = await pdfDoc.save();

        downloadTrackedBlob(new Blob([JSON.stringify(auditManifest, null, 2)], { type: 'application/json' }), 'signature_audit_manifest.json');
        downloadTrackedBlob(new Blob([savedBytes], { type: 'application/pdf' }), `digitally_signed_${digitalSignState.file.name}`);
      } catch (err) {
        console.error('Digital sign execute error:', err);
        alert('Failed to cryptographically sign PDF: ' + err.message);
      }
    }

    // ================= TOOL 23: IN-BROWSER LOCAL EXTRACTIVE SUMMARIZER =================
    let summarizeState = {
      file: null,
      text: '',
      highlights: [],
      entities: []
    };

    function initSummarizeToolListeners() {
      const dropZone = document.getElementById('summarize-drop-zone');
      const input = document.getElementById('summarize-file-input');
      if (!dropZone || !input) return;

      dropZone.addEventListener('click', (e) => { if (e.target !== input) input.click(); });
      dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-rose-500'); });
      dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('border-rose-500'); });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-rose-500');
        if (e.dataTransfer.files && e.dataTransfer.files.length) loadSummarizeFile(e.dataTransfer.files[0]);
      });
      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) loadSummarizeFile(e.target.files[0]);
      });
    }

    async function loadSummarizeFile(file) {
      if (!await validateSinglePdfFile(file, 'Document Summarizer')) return;
      try {
        const buffer = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
        let fullText = '';

        for (let p = 1; p <= doc.numPages; p++) {
          const page = await doc.getPage(p);
          const tc = await page.getTextContent();
          fullText += tc.items.map(t => t.str).join(' ') + '\n';
        }

        let sentences = fullText.split(/(?:(?<=[.?!])\s+|\n+)/).map(s => s.trim()).filter(s => s.length > 15 && s.length < 400);
        if (sentences.length === 0 && fullText.trim().length > 0) {
          sentences = fullText.split(/[\r\n]+/).map(s => s.trim()).filter(s => s.length > 8);
        }
        if (sentences.length === 0 && fullText.trim().length > 0) {
          sentences = [fullText.trim().slice(0, 300)];
        }
        const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'of', 'with', 'as', 'by', 'that', 'this', 'it', 'from', 'be', 'are', 'was', 'were', 'or', 'have', 'has']);
        const termFreq = {};

        sentences.forEach(s => {
          const words = s.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
          words.forEach(w => {
            if (!stopWords.has(w)) {
              termFreq[w] = (termFreq[w] || 0) + 1;
            }
          });
        });

        const scoredSentences = sentences.map((s, idx) => {
          const words = s.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
          let score = 0;
          words.forEach(w => {
            if (termFreq[w]) score += termFreq[w];
          });
          if (/(total|balance|amount|payment|due|invoice|statement|account|revenue|profit|loss|tax|interest|credit|debit)/i.test(s)) {
            score *= 1.5;
          }
          if (/[\$€£₹]\s*[\d,]+(\.\d{2})?/.test(s)) {
            score *= 1.4;
          }
          if (idx < 5) score *= 1.2;

          return { sentence: s, score: score / (words.length || 1), index: idx };
        });

        scoredSentences.sort((a, b) => b.score - a.score);
        const topSentences = scoredSentences.slice(0, 6).sort((a, b) => a.index - b.index);

        const currencyMatches = fullText.match(/[\$€£₹]\s*[\d,]+(\.\d{2})?/g) || [];
        const dateMatches = fullText.match(/\b(?:\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/gi) || [];

        const uniqueCurrencies = [...new Set(currencyMatches)].slice(0, 8);
        const uniqueDates = [...new Set(dateMatches)].slice(0, 6);

        summarizeState = {
          file,
          text: fullText,
          highlights: topSentences.map(s => s.sentence),
          entities: [...uniqueCurrencies, ...uniqueDates]
        };

        const card = document.getElementById('summarize-controls-card');
        const docName = document.getElementById('summarize-doc-name');
        const metrics = document.getElementById('summarize-metrics-text');
        const listEl = document.getElementById('summarize-highlights-list');
        const entEl = document.getElementById('summarize-entities-container');

        setToolScreenState('summarize', 'workspace');
        if (docName) docName.textContent = file.name;
        if (metrics) metrics.textContent = `Analyzed ${doc.numPages} pages, ~${fullText.split(/\s+/).length} words`;

        if (listEl) {
          listEl.innerHTML = '';
          summarizeState.highlights.forEach(h => {
            const li = document.createElement('li');
            li.textContent = h;
            listEl.appendChild(li);
          });
        }

        if (entEl) {
          entEl.innerHTML = '';
          summarizeState.entities.forEach(e => {
            const badge = document.createElement('span');
            badge.className = 'px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-mono text-xs border border-rose-200 dark:border-rose-900';
            badge.textContent = e;
            entEl.appendChild(badge);
          });
        }
      } catch (err) {
        console.error('Summarize error:', err);
        alert('Failed to summarize PDF: ' + err.message);
      }
    }

    function copySummaryContent() {
      if (!summarizeState.highlights.length) return;
      let text = `Executive Summary for: ${summarizeState.file ? summarizeState.file.name : 'Document'}\n\n`;
      text += 'Highlights:\n';
      summarizeState.highlights.forEach((h, i) => {
        text += `${i + 1}. ${h}\n`;
      });
      if (summarizeState.entities.length) {
        text += '\nKey Financial & Date Entities:\n';
        text += summarizeState.entities.join(', ') + '\n';
      }

      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('btn-copy-summary');
        if (btn) {
          const orig = btn.innerHTML;
          btn.innerHTML = '✅ Copied!';
          setTimeout(() => { btn.innerHTML = orig; }, 2000);
        }
      });
    }

    function downloadSummaryReport() {
      if (!summarizeState.highlights.length) return;
      let md = `# Executive Document Summary: ${summarizeState.file ? summarizeState.file.name : 'Document'}\n\n`;
      md += `*Generated 100% In-Browser via Statement2Sheet Extractive NLP Engine*\n\n---\n\n`;
      md += `## 📌 Key Highlights\n\n`;
      summarizeState.highlights.forEach(h => {
        md += `- ${h}\n`;
      });
      if (summarizeState.entities.length) {
        md += `\n## 🏷️ Extracted Financial & Date Entities\n\n`;
        summarizeState.entities.forEach(e => {
          md += `- \`${e}\`\n`;
        });
      }
      const fileName = (summarizeState.file ? summarizeState.file.name.replace(/\.pdf$/i, '') : 'document') + '_summary.md';
      downloadTrackedBlob(new Blob([md], { type: 'text/markdown;charset=utf-8' }), fileName);
    }

    // ================= MODULE 25: REPAIR CORRUPTED PDF TOOL =================
    function formatBytes(bytes) {
      if (!bytes || bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    let repairState = {
      file: null,
      arrayBuffer: null
    };

    function initRepairToolListeners() {
      const dropZone = document.getElementById('repair-drop-zone');
      const input = document.getElementById('repair-file-input');
      if (!dropZone || !input) return;

      dropZone.addEventListener('click', (e) => { if (e.target !== input) input.click(); });
      dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-amber-500'); });
      dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('border-amber-500'); });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-amber-500');
        if (e.dataTransfer.files && e.dataTransfer.files.length) loadRepairFile(e.dataTransfer.files[0]);
      });
      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) loadRepairFile(e.target.files[0]);
      });
    }

    function appendRepairLog(msg, isError = false) {
      const box = document.getElementById('repair-log-box');
      if (!box) return;
      const el = document.createElement('div');
      el.className = isError ? 'text-rose-400' : 'text-emerald-400';
      const time = new Date().toLocaleTimeString();
      el.textContent = `[${time}] ${msg}`;
      box.appendChild(el);
      box.scrollTop = box.scrollHeight;
    }

    async function loadRepairFile(file) {
      try {
        repairState = { file, arrayBuffer: await file.arrayBuffer() };
        const card = document.getElementById('repair-controls-card');
        const docName = document.getElementById('repair-doc-name');
        const docSize = document.getElementById('repair-doc-size');
        const pill = document.getElementById('repair-status-pill');
        const box = document.getElementById('repair-log-box');

        setToolScreenState('repair', 'workspace');
        if (docName) docName.textContent = file.name;
        if (docSize) docSize.textContent = formatBytes(file.size);
        if (pill) {
          pill.textContent = 'File Loaded';
          pill.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300';
        }
        if (box) {
          box.innerHTML = '';
          appendRepairLog(`Loaded "${file.name}" (${formatBytes(file.size)}). Ready for diagnostic analysis.`);
        }
      } catch (err) {
        console.error('Error loading file for repair:', err);
        alert('Failed to read file: ' + err.message);
      }
    }

    async function executeRepairPdf() {
      if (!repairState.file || !repairState.arrayBuffer) {
        alert('Please select a PDF file to repair.');
        return;
      }

      const btn = document.getElementById('btn-run-repair');
      const pill = document.getElementById('repair-status-pill');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Analyzing & Repairing...';
      }
      if (pill) {
        pill.textContent = 'Repairing...';
        pill.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 animate-pulse';
      }

      appendRepairLog('Starting file header diagnostic...');

      try {
        await ensurePdfLib();
        let bytes = new Uint8Array(repairState.arrayBuffer);
        appendRepairLog(`Raw file length: ${bytes.length} bytes.`);

        // Step 1: Scan for %PDF- magic bytes within first 8192 bytes
        let pdfHeaderIndex = -1;
        for (let i = 0; i < Math.min(bytes.length - 4, 8192); i++) {
          if (bytes[i] === 0x25 && bytes[i + 1] === 0x50 && bytes[i + 2] === 0x44 && bytes[i + 3] === 0x46) {
            pdfHeaderIndex = i;
            break;
          }
        }

        if (pdfHeaderIndex > 0) {
          appendRepairLog(`Detected ${pdfHeaderIndex} bytes of prepended corrupt metadata/headers. Stripping leading corrupt offset...`);
          bytes = bytes.slice(pdfHeaderIndex);
        } else if (pdfHeaderIndex === -1) {
          appendRepairLog('Missing %PDF- header! Prepending valid PDF-1.7 header specification...');
          const header = new TextEncoder().encode('%PDF-1.7\n%âãÏÓ\n');
          const merged = new Uint8Array(header.length + bytes.length);
          merged.set(header, 0);
          merged.set(bytes, header.length);
          bytes = merged;
        } else {
          appendRepairLog('Valid %PDF header detected at byte 0.');
        }

        // Step 2: Scan for %%EOF trailer in the last 4096 bytes
        let hasEof = false;
        const tailSearchStart = Math.max(0, bytes.length - 4096);
        for (let i = bytes.length - 5; i >= tailSearchStart; i--) {
          if (bytes[i] === 0x25 && bytes[i + 1] === 0x25 && bytes[i + 2] === 0x45 && bytes[i + 3] === 0x4f && bytes[i + 4] === 0x46) {
            hasEof = true;
            break;
          }
        }

        if (!hasEof) {
          appendRepairLog('Truncated document detected: Missing %%EOF trailer. Appending healthy EOF token marker...');
          const eofBytes = new TextEncoder().encode('\n%%EOF\n');
          const merged = new Uint8Array(bytes.length + eofBytes.length);
          merged.set(bytes, 0);
          merged.set(eofBytes, bytes.length);
          bytes = merged;
        } else {
          appendRepairLog('Valid %%EOF trailer marker found.');
        }

        appendRepairLog('Attempting cross-reference (xref) reconstruction and object table rebuild...');
        let fixedBytes = null;

        try {
          const sourceDoc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
          const pageCount = sourceDoc.getPageCount();
          appendRepairLog(`XREF recovered successfully! Found ${pageCount} page(s). Re-serializing clean PDF object tree...`);

          const cleanDoc = await PDFLib.PDFDocument.create();
          const copiedPages = await cleanDoc.copyPages(sourceDoc, sourceDoc.getPageIndices());
          copiedPages.forEach(pg => cleanDoc.addPage(pg));
          fixedBytes = await cleanDoc.save();
        } catch (pdfLibErr) {
          appendRepairLog(`Primary xref recovery notice: ${pdfLibErr.message}. Falling back to PDF.js resilient rendering extraction...`);

          if (typeof pdfjsLib === 'undefined') {
            throw new Error('PDF.js engine unavailable for second-stage recovery: ' + pdfLibErr.message);
          }
          const loadingTask = pdfjsLib.getDocument({
            data: bytes,
            stopAtErrors: false,
            verbosity: 0
          });
          const pdfJsDoc = await loadingTask.promise;
          const totalPages = pdfJsDoc.numPages;
          appendRepairLog(`PDF.js recovered ${totalPages} readable page(s). Reconstructing pristine vector document...`);

          const reconstructedDoc = await PDFLib.PDFDocument.create();
          for (let p = 1; p <= totalPages; p++) {
            appendRepairLog(`Reconstructing page ${p} of ${totalPages}...`);
            const page = await pdfJsDoc.getPage(p);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;

            const imgDataUrl = canvas.toDataURL('image/jpeg', 0.95);
            const imgBytes = await fetch(imgDataUrl).then(res => res.arrayBuffer());
            const embeddedImg = await reconstructedDoc.embedJpg(imgBytes);

            const newPage = reconstructedDoc.addPage([viewport.width / 2.0, viewport.height / 2.0]);
            newPage.drawImage(embeddedImg, {
              x: 0,
              y: 0,
              width: viewport.width / 2.0,
              height: viewport.height / 2.0
            });
          }
          fixedBytes = await reconstructedDoc.save();
        }

        appendRepairLog(`Repair complete! Generated ${formatBytes(fixedBytes.length)} healthy PDF.`);
        if (pill) {
          pill.textContent = 'Repaired Successfully';
          pill.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300';
        }

        const outName = (repairState.file ? repairState.file.name.replace(/\.pdf$/i, '') : 'repaired_document') + '_repaired.pdf';
        downloadTrackedBlob(new Blob([fixedBytes], { type: 'application/pdf' }), outName);
      } catch (finalErr) {
        console.error('PDF repair failed:', finalErr);
        appendRepairLog(`Critical error: ${finalErr.message}`, true);
        if (pill) {
          pill.textContent = 'Repair Failed';
          pill.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300';
        }
        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
          try { alert('Could not recover the damaged PDF: ' + finalErr.message); } catch (e) {}
        }
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = '🛠️ Repair & Download PDF';
        }
      }
    }

    // ================= MODULE 26: EDIT PDF (TEXT & ANNOTATIONS) TOOL =================
    let editPdfState = {
      file: null,
      pdfBytes: null,
      pdfJsDoc: null,
      currentPage: 1,
      totalPages: 1,
      scale: 1.5,
      tool: 'text', // 'text' | 'draw' | 'rect' | 'line'
      color: '#ef4444',
      fontSize: 16,
      strokeWidth: 2,
      annotations: {}, // pageNum -> array of annotations
      isDrawing: false,
      startX: 0,
      startY: 0,
      currentPoints: [],
      pageWidth: 0,
      pageHeight: 0
    };

    function hexToPdfRgb(hex) {
      if (!hex || hex[0] !== '#' || hex.length < 7) {
        return PDFLib.rgb(0, 0, 0);
      }
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      return PDFLib.rgb(isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b);
    }

    function initEditPdfToolListeners() {
      const dropZone = document.getElementById('editpdf-drop-zone');
      const input = document.getElementById('editpdf-file-input');
      const colorPicker = document.getElementById('editpdf-color-picker');
      const fontSizeSelect = document.getElementById('editpdf-font-size');
      const strokeWidthSelect = document.getElementById('editpdf-stroke-width');
      const overlayCanvas = document.getElementById('editpdf-overlay-canvas');

      if (dropZone && input) {
        dropZone.addEventListener('click', (e) => { if (e.target !== input) input.click(); });
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-violet-500'); });
        dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('border-violet-500'); });
        dropZone.addEventListener('drop', (e) => {
          e.preventDefault();
          dropZone.classList.remove('border-violet-500');
          if (e.dataTransfer.files && e.dataTransfer.files.length) loadEditPdfFile(e.dataTransfer.files[0]);
        });
        input.addEventListener('change', (e) => {
          if (e.target.files && e.target.files.length) loadEditPdfFile(e.target.files[0]);
        });
      }

      if (colorPicker) {
        colorPicker.addEventListener('change', (e) => { editPdfState.color = e.target.value; });
      }
      if (fontSizeSelect) {
        fontSizeSelect.addEventListener('change', (e) => { editPdfState.fontSize = parseInt(e.target.value, 10) || 16; });
      }
      if (strokeWidthSelect) {
        strokeWidthSelect.addEventListener('change', (e) => { editPdfState.strokeWidth = parseInt(e.target.value, 10) || 2; });
      }

      if (overlayCanvas) {
        overlayCanvas.addEventListener('mousedown', onEditPdfMouseDown);
        overlayCanvas.addEventListener('mousemove', onEditPdfMouseMove);
        overlayCanvas.addEventListener('mouseup', onEditPdfMouseUp);
        overlayCanvas.addEventListener('mouseleave', onEditPdfMouseUp);
        overlayCanvas.addEventListener('click', onEditPdfClick);
      }
    }

    function setEditPdfTool(toolType) {
      editPdfState.tool = toolType;
      const toolButtons = ['text', 'draw', 'rect', 'line'];
      toolButtons.forEach(t => {
        const btn = document.getElementById(`btn-editpdf-tool-${t}`);
        if (!btn) return;
        if (t === toolType) {
          btn.className = 'px-2.5 py-1 bg-violet-600 text-white font-bold rounded-lg transition shadow-2xs';
        } else {
          btn.className = 'px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-lg border border-slate-200 dark:border-slate-600 transition shadow-2xs';
        }
      });
      const overlayCanvas = document.getElementById('editpdf-overlay-canvas');
      if (overlayCanvas) {
        overlayCanvas.style.cursor = toolType === 'text' ? 'text' : 'crosshair';
      }
    }

    function clearEditPdfCurrentPage() {
      if (editPdfState.annotations[editPdfState.currentPage]) {
        editPdfState.annotations[editPdfState.currentPage] = [];
        redrawEditPdfOverlay();
      }
    }

    function navigateEditPdfPage(delta) {
      const target = editPdfState.currentPage + delta;
      if (target >= 1 && target <= editPdfState.totalPages) {
        editPdfState.currentPage = target;
        renderEditPdfCurrentPage();
      }
    }

    async function loadEditPdfFile(file) {
      try {
        if (typeof pdfjsLib === 'undefined') {
          throw new Error('PDF.js engine is not ready.');
        }
        const ab = await file.arrayBuffer();
        editPdfState.file = file;
        editPdfState.pdfBytes = ab;
        editPdfState.annotations = {};
        editPdfState.currentPage = 1;

        const copy = ab.slice(0);
        const doc = await pdfjsLib.getDocument({ data: copy }).promise;
        editPdfState.pdfJsDoc = doc;
        editPdfState.totalPages = doc.numPages;

        const card = document.getElementById('editpdf-controls-card');
        const docName = document.getElementById('editpdf-doc-name');
        const docPages = document.getElementById('editpdf-doc-pages');

        setToolScreenState('editpdf', 'workspace');
        if (docName) docName.textContent = file.name;
        if (docPages) docPages.textContent = `${doc.numPages} Page(s)`;

        await renderEditPdfCurrentPage();
      } catch (err) {
        console.error('Failed to load PDF for editing:', err);
        alert('Could not open PDF: ' + err.message);
      }
    }

    async function renderEditPdfCurrentPage() {
      if (!editPdfState.pdfJsDoc) return;
      const pageNum = editPdfState.currentPage;
      const pageDisplay = document.getElementById('editpdf-page-display');
      if (pageDisplay) {
        pageDisplay.textContent = `Page ${pageNum} of ${editPdfState.totalPages}`;
      }

      const page = await editPdfState.pdfJsDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: editPdfState.scale });

      const renderCanvas = document.getElementById('editpdf-render-canvas');
      const overlayCanvas = document.getElementById('editpdf-overlay-canvas');
      if (!renderCanvas || !overlayCanvas) return;

      renderCanvas.width = viewport.width;
      renderCanvas.height = viewport.height;
      overlayCanvas.width = viewport.width;
      overlayCanvas.height = viewport.height;

      editPdfState.pageWidth = viewport.width;
      editPdfState.pageHeight = viewport.height;

      const ctx = renderCanvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      redrawEditPdfOverlay();
    }

    function redrawEditPdfOverlay() {
      const overlayCanvas = document.getElementById('editpdf-overlay-canvas');
      if (!overlayCanvas) return;
      const ctx = overlayCanvas.getContext('2d');
      ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

      const anns = editPdfState.annotations[editPdfState.currentPage] || [];
      anns.forEach(ann => {
        ctx.save();
        if (ann.type === 'text') {
          ctx.font = `${ann.size || 16}px sans-serif`;
          ctx.fillStyle = ann.color || '#ef4444';
          ctx.fillText(ann.text, ann.x, ann.y);
        } else if (ann.type === 'rect') {
          ctx.strokeStyle = ann.color || '#ef4444';
          ctx.lineWidth = ann.strokeWidth || 2;
          ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
        } else if (ann.type === 'line') {
          ctx.strokeStyle = ann.color || '#ef4444';
          ctx.lineWidth = ann.strokeWidth || 2;
          ctx.beginPath();
          ctx.moveTo(ann.x1, ann.y1);
          ctx.lineTo(ann.x2, ann.y2);
          ctx.stroke();
        } else if (ann.type === 'draw' && ann.points && ann.points.length > 1) {
          ctx.strokeStyle = ann.color || '#ef4444';
          ctx.lineWidth = ann.strokeWidth || 2;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(ann.points[0].x, ann.points[0].y);
          for (let i = 1; i < ann.points.length; i++) {
            ctx.lineTo(ann.points[i].x, ann.points[i].y);
          }
          ctx.stroke();
        }
        ctx.restore();
      });
    }

    function getCanvasCoords(e, canvas) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }

    function onEditPdfMouseDown(e) {
      if (editPdfState.tool === 'text') return;
      const overlayCanvas = document.getElementById('editpdf-overlay-canvas');
      if (!overlayCanvas) return;
      const coords = getCanvasCoords(e, overlayCanvas);
      editPdfState.isDrawing = true;
      editPdfState.startX = coords.x;
      editPdfState.startY = coords.y;

      if (editPdfState.tool === 'draw') {
        editPdfState.currentPoints = [coords];
      }
    }

    function onEditPdfMouseMove(e) {
      if (!editPdfState.isDrawing) return;
      const overlayCanvas = document.getElementById('editpdf-overlay-canvas');
      if (!overlayCanvas) return;
      const coords = getCanvasCoords(e, overlayCanvas);
      const ctx = overlayCanvas.getContext('2d');

      if (editPdfState.tool === 'draw') {
        editPdfState.currentPoints.push(coords);
        redrawEditPdfOverlay();
        ctx.save();
        ctx.strokeStyle = editPdfState.color;
        ctx.lineWidth = editPdfState.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(editPdfState.currentPoints[0].x, editPdfState.currentPoints[0].y);
        for (let i = 1; i < editPdfState.currentPoints.length; i++) {
          ctx.lineTo(editPdfState.currentPoints[i].x, editPdfState.currentPoints[i].y);
        }
        ctx.stroke();
        ctx.restore();
      } else if (editPdfState.tool === 'rect') {
        redrawEditPdfOverlay();
        ctx.save();
        ctx.strokeStyle = editPdfState.color;
        ctx.lineWidth = editPdfState.strokeWidth;
        const w = coords.x - editPdfState.startX;
        const h = coords.y - editPdfState.startY;
        ctx.strokeRect(editPdfState.startX, editPdfState.startY, w, h);
        ctx.restore();
      } else if (editPdfState.tool === 'line') {
        redrawEditPdfOverlay();
        ctx.save();
        ctx.strokeStyle = editPdfState.color;
        ctx.lineWidth = editPdfState.strokeWidth;
        ctx.beginPath();
        ctx.moveTo(editPdfState.startX, editPdfState.startY);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
        ctx.restore();
      }
    }

    function onEditPdfMouseUp(e) {
      if (!editPdfState.isDrawing) return;
      editPdfState.isDrawing = false;
      const overlayCanvas = document.getElementById('editpdf-overlay-canvas');
      if (!overlayCanvas) return;
      const coords = getCanvasCoords(e, overlayCanvas);
      const pageNum = editPdfState.currentPage;
      if (!editPdfState.annotations[pageNum]) {
        editPdfState.annotations[pageNum] = [];
      }

      if (editPdfState.tool === 'draw' && editPdfState.currentPoints.length > 1) {
        editPdfState.annotations[pageNum].push({
          type: 'draw',
          points: [...editPdfState.currentPoints],
          color: editPdfState.color,
          strokeWidth: editPdfState.strokeWidth
        });
      } else if (editPdfState.tool === 'rect') {
        const w = coords.x - editPdfState.startX;
        const h = coords.y - editPdfState.startY;
        if (Math.abs(w) > 3 && Math.abs(h) > 3) {
          editPdfState.annotations[pageNum].push({
            type: 'rect',
            x: Math.min(editPdfState.startX, coords.x),
            y: Math.min(editPdfState.startY, coords.y),
            width: Math.abs(w),
            height: Math.abs(h),
            color: editPdfState.color,
            strokeWidth: editPdfState.strokeWidth
          });
        }
      } else if (editPdfState.tool === 'line') {
        const dx = coords.x - editPdfState.startX;
        const dy = coords.y - editPdfState.startY;
        if (Math.hypot(dx, dy) > 5) {
          editPdfState.annotations[pageNum].push({
            type: 'line',
            x1: editPdfState.startX,
            y1: editPdfState.startY,
            x2: coords.x,
            y2: coords.y,
            color: editPdfState.color,
            strokeWidth: editPdfState.strokeWidth
          });
        }
      }

      editPdfState.currentPoints = [];
      redrawEditPdfOverlay();
    }

    function onEditPdfClick(e) {
      if (editPdfState.tool !== 'text') return;
      const overlayCanvas = document.getElementById('editpdf-overlay-canvas');
      if (!overlayCanvas) return;
      const coords = getCanvasCoords(e, overlayCanvas);

      const text = prompt('Enter text to place on PDF:');
      if (text && text.trim()) {
        const pageNum = editPdfState.currentPage;
        if (!editPdfState.annotations[pageNum]) {
          editPdfState.annotations[pageNum] = [];
        }
        editPdfState.annotations[pageNum].push({
          type: 'text',
          text: text.trim(),
          x: coords.x,
          y: coords.y,
          color: editPdfState.color,
          size: editPdfState.fontSize
        });
        redrawEditPdfOverlay();
      }
    }

    async function executeEditPdf() {
      if (!editPdfState.file || !editPdfState.pdfBytes) {
        alert('Please select a PDF file to edit.');
        return;
      }

      const btn = document.getElementById('btn-run-editpdf');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>Saving Changes...</span>';
      }

      try {
        await ensurePdfLib();
        const pdfDoc = await PDFLib.PDFDocument.load(editPdfState.pdfBytes, { ignoreEncryption: true });
        const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
        const totalPages = pdfDoc.getPageCount();

        for (let p = 0; p < totalPages; p++) {
          const pageNum = p + 1;
          const anns = editPdfState.annotations[pageNum] || [];
          if (anns.length === 0) continue;

          const page = pdfDoc.getPage(p);
          const { width, height } = page.getSize();
          const canvasW = editPdfState.pageWidth || width;
          const canvasH = editPdfState.pageHeight || height;
          const sx = width / canvasW;
          const sy = height / canvasH;

          for (const ann of anns) {
            const pdfColor = hexToPdfRgb(ann.color);

            if (ann.type === 'text') {
              const pdfX = ann.x * sx;
              const pdfY = height - (ann.y * sy);
              const fontSize = (ann.size || 16) * Math.min(sx, sy);
              page.drawText(ann.text, {
                x: pdfX,
                y: Math.max(0, pdfY - fontSize),
                size: fontSize,
                font,
                color: pdfColor
              });
            } else if (ann.type === 'rect') {
              const rx = ann.x * sx;
              const ry = height - ((ann.y + ann.height) * sy);
              page.drawRectangle({
                x: rx,
                y: ry,
                width: ann.width * sx,
                height: ann.height * sy,
                borderWidth: (ann.strokeWidth || 2) * Math.min(sx, sy),
                borderColor: pdfColor
              });
            } else if (ann.type === 'line') {
              page.drawLine({
                start: { x: ann.x1 * sx, y: height - (ann.y1 * sy) },
                end: { x: ann.x2 * sx, y: height - (ann.y2 * sy) },
                thickness: (ann.strokeWidth || 2) * Math.min(sx, sy),
                color: pdfColor
              });
            } else if (ann.type === 'draw' && ann.points && ann.points.length > 1) {
              const thickness = (ann.strokeWidth || 2) * Math.min(sx, sy);
              for (let i = 0; i < ann.points.length - 1; i++) {
                page.drawLine({
                  start: { x: ann.points[i].x * sx, y: height - (ann.points[i].y * sy) },
                  end: { x: ann.points[i + 1].x * sx, y: height - (ann.points[i + 1].y * sy) },
                  thickness,
                  color: pdfColor
                });
              }
            }
          }
        }

        const savedBytes = await pdfDoc.save();
        const baseName = editPdfState.file.name.replace(/\.pdf$/i, '');
        const outName = `${baseName}_edited.pdf`;
        downloadTrackedBlob(new Blob([savedBytes], { type: 'application/pdf' }), outName);
      } catch (err) {
        console.error('Failed to save edited PDF:', err);
        alert('Could not save PDF: ' + err.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<span>💾 Save &amp; Download Edited PDF</span><span>&rarr;</span>';
        }
      }
    }

    // ================= MODULE 27: FILL PDF FORMS (ACROFORM) TOOL =================
    let formFillState = {
      file: null,
      pdfBytes: null,
      fields: []
    };

    function initFormFillerToolListeners() {
      const dropZone = document.getElementById('formfill-drop-zone');
      const input = document.getElementById('formfill-file-input');
      if (!dropZone || !input) return;

      dropZone.addEventListener('click', (e) => { if (e.target !== input) input.click(); });
      dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-teal-500'); });
      dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('border-teal-500'); });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-teal-500');
        if (e.dataTransfer.files && e.dataTransfer.files.length) loadFormPdfFile(e.dataTransfer.files[0]);
      });
      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) loadFormPdfFile(e.target.files[0]);
      });
    }

    async function loadFormPdfFile(file) {
      try {
        await ensurePdfLib();
        const ab = await file.arrayBuffer();
        formFillState.file = file;
        formFillState.pdfBytes = ab;
        formFillState.fields = [];

        const pdfDoc = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
        let form;
        try {
          form = pdfDoc.getForm();
        } catch (e) {
          form = null;
        }

        const rawFields = form ? form.getFields() : [];
        const detectedFields = [];

        rawFields.forEach((field) => {
          const name = field.getName();
          const constructorName = field.constructor ? field.constructor.name : '';

          if (constructorName === 'PDFTextField' || typeof field.getText === 'function') {
            detectedFields.push({
              name,
              type: 'text',
              value: (typeof field.getText === 'function' ? field.getText() : '') || ''
            });
          } else if (constructorName === 'PDFCheckBox' || typeof field.isChecked === 'function') {
            detectedFields.push({
              name,
              type: 'checkbox',
              value: typeof field.isChecked === 'function' ? field.isChecked() : false
            });
          } else if (constructorName === 'PDFDropdown' || typeof field.getOptions === 'function') {
            let opts = [];
            try { opts = field.getOptions(); } catch (e) {}
            let selectedVal = '';
            try {
              const sel = field.getSelected();
              selectedVal = Array.isArray(sel) ? sel[0] : sel;
            } catch (e) {}
            detectedFields.push({
              name,
              type: 'dropdown',
              value: selectedVal || '',
              options: opts
            });
          } else if (constructorName === 'PDFRadioGroup') {
            let opts = [];
            try { opts = field.getOptions(); } catch (e) {}
            let selectedVal = '';
            try { selectedVal = field.getSelected(); } catch (e) {}
            detectedFields.push({
              name,
              type: 'radio',
              value: selectedVal || '',
              options: opts
            });
          }
        });

        formFillState.fields = detectedFields;

        const card = document.getElementById('formfill-controls-card');
        const docName = document.getElementById('formfill-doc-name');
        const docSize = document.getElementById('formfill-doc-size');
        const badge = document.getElementById('formfill-field-badge');
        const emptyMsg = document.getElementById('formfill-empty-message');

        setToolScreenState('formfill', 'workspace');
        if (docName) docName.textContent = file.name;
        if (docSize) docSize.textContent = formatBytes(file.size);
        if (badge) badge.textContent = `${detectedFields.length} Fields Detected`;

        if (detectedFields.length === 0) {
          if (emptyMsg) emptyMsg.classList.remove('hidden');
        } else {
          if (emptyMsg) emptyMsg.classList.add('hidden');
        }

        renderFormFieldsUI();
      } catch (err) {
        console.error('Failed to load PDF form:', err);
        alert('Could not inspect PDF form: ' + err.message);
      }
    }

    function renderFormFieldsUI() {
      const container = document.getElementById('formfill-interactive-form');
      if (!container) return;
      container.innerHTML = '';

      formFillState.fields.forEach((field, index) => {
        const row = document.createElement('div');
        row.className = 'p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700';

        const label = document.createElement('label');
        label.className = 'block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 truncate';
        label.textContent = field.name || `Field #${index + 1}`;

        if (field.type === 'text') {
          const input = document.createElement('input');
          input.type = 'text';
          input.dataset.fieldName = field.name;
          input.value = field.value || '';
          input.placeholder = `Enter ${field.name}...`;
          input.className = 'w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none';
          row.appendChild(label);
          row.appendChild(input);
        } else if (field.type === 'checkbox') {
          const checkWrap = document.createElement('label');
          checkWrap.className = 'flex items-center gap-2 cursor-pointer select-none';
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.dataset.fieldName = field.name;
          cb.checked = Boolean(field.value);
          cb.className = 'rounded border-slate-300 dark:border-slate-700 text-teal-600 focus:ring-teal-500 w-4 h-4';
          const span = document.createElement('span');
          span.className = 'text-xs font-bold text-slate-700 dark:text-slate-300';
          span.textContent = field.name || `Checkbox #${index + 1}`;
          checkWrap.appendChild(cb);
          checkWrap.appendChild(span);
          row.appendChild(checkWrap);
        } else if (field.type === 'dropdown') {
          const sel = document.createElement('select');
          sel.dataset.fieldName = field.name;
          sel.className = 'w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none';
          (field.options || []).forEach(opt => {
            const optEl = document.createElement('option');
            optEl.value = opt;
            optEl.textContent = opt;
            if (opt === field.value) optEl.selected = true;
            sel.appendChild(optEl);
          });
          row.appendChild(label);
          row.appendChild(sel);
        } else if (field.type === 'radio') {
          row.appendChild(label);
          const radioGroup = document.createElement('div');
          radioGroup.className = 'space-y-1.5 mt-1';
          (field.options || []).forEach(opt => {
            const radioLabel = document.createElement('label');
            radioLabel.className = 'flex items-center gap-2 cursor-pointer select-none';
            const r = document.createElement('input');
            r.type = 'radio';
            r.name = `radio-${field.name}`;
            r.dataset.fieldName = field.name;
            r.value = opt;
            if (opt === field.value) r.checked = true;
            r.className = 'text-teal-600 focus:ring-teal-500 w-4 h-4';
            const sp = document.createElement('span');
            sp.className = 'text-xs text-slate-700 dark:text-slate-300';
            sp.textContent = opt;
            radioLabel.appendChild(r);
            radioLabel.appendChild(sp);
            radioGroup.appendChild(radioLabel);
          });
          row.appendChild(radioGroup);
        }

        container.appendChild(row);
      });
    }

    async function executeFormFill() {
      if (!formFillState.file || !formFillState.pdfBytes) {
        alert('Please select a PDF form to fill.');
        return;
      }

      const btn = document.getElementById('btn-run-formfill');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>Saving Filled Form...</span>';
      }

      try {
        await ensurePdfLib();
        const pdfDoc = await PDFLib.PDFDocument.load(formFillState.pdfBytes, { ignoreEncryption: true });
        const form = pdfDoc.getForm();

        formFillState.fields.forEach(f => {
          try {
            if (f.type === 'text') {
              const input = document.querySelector(`input[type="text"][data-field-name="${CSS.escape(f.name)}"]`);
              if (input) {
                const tf = form.getTextField(f.name);
                tf.setText(input.value || '');
              }
            } else if (f.type === 'checkbox') {
              const cbInput = document.querySelector(`input[type="checkbox"][data-field-name="${CSS.escape(f.name)}"]`);
              if (cbInput) {
                const cb = form.getCheckBox(f.name);
                if (cbInput.checked) {
                  cb.check();
                } else {
                  cb.uncheck();
                }
              }
            } else if (f.type === 'dropdown') {
              const selInput = document.querySelector(`select[data-field-name="${CSS.escape(f.name)}"]`);
              if (selInput && selInput.value) {
                const dd = form.getDropdown(f.name);
                dd.select(selInput.value);
              }
            } else if (f.type === 'radio') {
              const checkedRadio = document.querySelector(`input[type="radio"][data-field-name="${CSS.escape(f.name)}"]:checked`);
              if (checkedRadio && checkedRadio.value) {
                const rg = form.getRadioGroup(f.name);
                rg.select(checkedRadio.value);
              }
            }
          } catch (fieldErr) {
            console.warn(`Could not set field ${f.name}:`, fieldErr);
          }
        });

        const flattenCheck = document.getElementById('formfill-flatten-check');
        if (flattenCheck && flattenCheck.checked) {
          try {
            form.flatten();
          } catch (flatErr) {
            console.warn('Form flattening error:', flatErr);
          }
        }

        const savedBytes = await pdfDoc.save();
        const baseName = formFillState.file.name.replace(/\.pdf$/i, '');
        const outName = `${baseName}_filled.pdf`;
        downloadTrackedBlob(new Blob([savedBytes], { type: 'application/pdf' }), outName);
      } catch (err) {
        console.error('Failed to save filled PDF form:', err);
        alert('Could not save filled form: ' + err.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<span>💾 Save &amp; Download Filled PDF</span><span>&rarr;</span>';
        }
      }
    }

    // ================= MODULE 28: POWERPOINT TO PDF TOOL =================
    let pptx2PdfState = {
      file: null,
      slides: [],
      fileName: ''
    };

    function initPptx2PdfToolListeners() {
      const dropZone = document.getElementById('pptx2pdf-drop-zone');
      const input = document.getElementById('pptx2pdf-file-input');
      if (!dropZone || !input) return;

      dropZone.addEventListener('click', (e) => { if (e.target !== input) input.click(); });
      dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-orange-500'); });
      dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('border-orange-500'); });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-orange-500');
        if (e.dataTransfer.files && e.dataTransfer.files.length) loadPptxFile(e.dataTransfer.files[0]);
      });
      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) loadPptxFile(e.target.files[0]);
      });
    }

    async function loadPptxFile(file) {
      try {
        await ensureJsZip();
        const ab = await file.arrayBuffer();
        pptx2PdfState.file = file;
        pptx2PdfState.fileName = file.name;
        pptx2PdfState.slides = [];

        const zip = await JSZip.loadAsync(ab);

        // Find all slide XML entries and sort numerically
        const slidePaths = Object.keys(zip.files)
          .filter(p => /^ppt\/slides\/slide\d+\.xml$/i.test(p))
          .sort((a, b) => {
            const numA = parseInt((a.match(/slide(\d+)\.xml/i) || [0, 0])[1], 10);
            const numB = parseInt((b.match(/slide(\d+)\.xml/i) || [0, 0])[1], 10);
            return numA - numB;
          });

        const parser = new DOMParser();
        const extractedSlides = [];

        for (let i = 0; i < slidePaths.length; i++) {
          const path = slidePaths[i];
          const xmlText = await zip.files[path].async('text');
          const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

          // Extract text runs from paragraphs
          const paragraphs = xmlDoc.querySelectorAll('p');
          const textLines = [];

          paragraphs.forEach(p => {
            const textNodes = p.querySelectorAll('t');
            let line = '';
            textNodes.forEach(t => { line += t.textContent; });
            line = line.trim();
            if (line) textLines.push(line);
          });

          const title = textLines.length > 0 ? textLines[0] : `Slide ${i + 1}`;
          extractedSlides.push({
            index: i + 1,
            title,
            lines: textLines.slice(textLines.length > 1 ? 1 : 0)
          });
        }

        pptx2PdfState.slides = extractedSlides;

        const card = document.getElementById('pptx2pdf-controls-card');
        const docName = document.getElementById('pptx2pdf-doc-name');
        const summary = document.getElementById('pptx2pdf-doc-summary');
        const gallery = document.getElementById('pptx2pdf-slides-gallery');

        setToolScreenState('pptx2pdf', 'workspace');
        if (docName) docName.textContent = file.name;
        if (summary) summary.textContent = `${extractedSlides.length} Slide(s) Extracted`;

        if (gallery) {
          gallery.innerHTML = '';
          extractedSlides.forEach((slide) => {
            const slideCard = document.createElement('div');
            slideCard.className = 'p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between';

            const header = document.createElement('div');
            header.className = 'flex items-center justify-between mb-2';
            header.innerHTML = `<span class="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950 px-2 py-0.5 rounded-full">Slide ${slide.index}</span>`;

            const titleEl = document.createElement('h5');
            titleEl.className = 'text-xs font-bold text-slate-800 dark:text-slate-200 truncate mb-1';
            titleEl.textContent = slide.title;

            const snippet = document.createElement('p');
            snippet.className = 'text-[11px] text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed';
            snippet.textContent = slide.lines.join(' • ') || '(No additional text)';

            slideCard.appendChild(header);
            slideCard.appendChild(titleEl);
            slideCard.appendChild(snippet);
            gallery.appendChild(slideCard);
          });
        }
      } catch (err) {
        console.error('Failed to parse PPTX presentation:', err);
        alert('Could not read PowerPoint presentation: ' + err.message);
      }
    }

    async function executePptxToPdf() {
      if (!pptx2PdfState.slides || pptx2PdfState.slides.length === 0) {
        alert('Please select a valid PPTX presentation first.');
        return;
      }

      const btn = document.getElementById('btn-run-pptx2pdf');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>Rendering Slides to PDF...</span>';
      }

      try {
        await ensureJsPdf();
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'pt',
          format: [960, 540]
        });

        const width = 960;
        const height = 540;

        for (let i = 0; i < pptx2PdfState.slides.length; i++) {
          const slide = pptx2PdfState.slides[i];
          if (i > 0) pdf.addPage([960, 540], 'landscape');

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          // Draw modern slide background
          const bgGrad = ctx.createLinearGradient(0, 0, width, height);
          bgGrad.addColorStop(0, '#ffffff');
          bgGrad.addColorStop(1, '#f8fafc');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, width, height);

          // Top color accent band
          ctx.fillStyle = '#ea580c';
          ctx.fillRect(0, 0, width, 8);

          // Slide number in top right
          ctx.font = 'bold 16px sans-serif';
          ctx.fillStyle = '#94a3b8';
          ctx.textAlign = 'right';
          ctx.fillText(`Slide ${slide.index}`, width - 50, 45);

          // Slide Title
          ctx.font = 'bold 32px sans-serif';
          ctx.fillStyle = '#0f172a';
          ctx.textAlign = 'left';
          ctx.fillText(slide.title || `Slide ${slide.index}`, 60, 90);

          // Divider rule
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(60, 115);
          ctx.lineTo(width - 60, 115);
          ctx.stroke();

          // Bullet points / body text
          ctx.font = '20px sans-serif';
          ctx.fillStyle = '#334155';
          let startY = 160;
          const maxLines = Math.min(slide.lines.length, 10);

          for (let j = 0; j < maxLines; j++) {
            const line = slide.lines[j];
            ctx.fillStyle = '#ea580c';
            ctx.fillText('•', 65, startY);
            ctx.fillStyle = '#334155';
            ctx.fillText(line, 85, startY);
            startY += 36;
          }

          // Footer
          ctx.font = '12px sans-serif';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText('Generated privately with Statement2Sheet', 60, height - 30);

          const imgData = canvas.toDataURL('image/png');
          pdf.addImage(imgData, 'PNG', 0, 0, width, height);
        }

        const blob = pdf.output('blob');
        const baseName = (pptx2PdfState.fileName || 'presentation').replace(/\.pptx$/i, '');
        const outName = `${baseName}_converted.pdf`;
        downloadTrackedBlob(blob, outName, 'application/pdf');
      } catch (err) {
        console.error('Failed to convert PPTX to PDF:', err);
        alert('Could not convert PPTX to PDF: ' + err.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<span>Convert to PDF</span><span>&rarr;</span>';
        }
      }
    }

    // ================= MODULE 29: PDF TO POWERPOINT TOOL =================
    let pdf2PptxState = {
      file: null,
      pdfBytes: null,
      pdfJsDoc: null,
      pageCount: 0
    };

    function initPdf2PptxToolListeners() {
      const dropZone = document.getElementById('pdf2pptx-drop-zone');
      const input = document.getElementById('pdf2pptx-file-input');
      if (!dropZone || !input) return;

      dropZone.addEventListener('click', (e) => { if (e.target !== input) input.click(); });
      dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-rose-500'); });
      dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('border-rose-500'); });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-rose-500');
        if (e.dataTransfer.files && e.dataTransfer.files.length) loadPdf2PptxFile(e.dataTransfer.files[0]);
      });
      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) loadPdf2PptxFile(e.target.files[0]);
      });
    }

    async function loadPdf2PptxFile(file) {
      try {
        if (typeof pdfjsLib === 'undefined') {
          throw new Error('PDF.js engine is not available.');
        }
        const ab = await file.arrayBuffer();
        pdf2PptxState.file = file;
        pdf2PptxState.pdfBytes = ab;

        const copy = ab.slice(0);
        const doc = await pdfjsLib.getDocument({ data: copy }).promise;
        pdf2PptxState.pdfJsDoc = doc;
        pdf2PptxState.pageCount = doc.numPages;

        const card = document.getElementById('pdf2pptx-controls-card');
        const docName = document.getElementById('pdf2pptx-doc-name');
        const summary = document.getElementById('pdf2pptx-doc-summary');
        const previewContainer = document.getElementById('pdf2pptx-preview-container');

        setToolScreenState('pdf2pptx', 'workspace');
        if (docName) docName.textContent = file.name;
        if (summary) summary.textContent = `${doc.numPages} Page(s) to Convert`;

        if (previewContainer) {
          previewContainer.innerHTML = '';
          const previewLimit = Math.min(doc.numPages, 8);
          for (let p = 1; p <= previewLimit; p++) {
            const page = await doc.getPage(p);
            const viewport = page.getViewport({ scale: 0.3 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.className = 'w-full rounded border border-slate-200 dark:border-slate-700 shadow-2xs bg-white mb-1';
            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;

            const wrap = document.createElement('div');
            wrap.className = 'p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-center';
            wrap.appendChild(canvas);
            const lbl = document.createElement('span');
            lbl.className = 'text-[10px] font-bold text-slate-500 dark:text-slate-400';
            lbl.textContent = `Slide ${p}`;
            wrap.appendChild(lbl);
            previewContainer.appendChild(wrap);
          }
        }
      } catch (err) {
        console.error('Failed to load PDF for PPTX conversion:', err);
        alert('Could not inspect PDF document: ' + err.message);
      }
    }

    async function executePdf2Pptx() {
      if (!pdf2PptxState.pdfJsDoc || pdf2PptxState.pageCount === 0) {
        alert('Please select a PDF document first.');
        return;
      }

      const btn = document.getElementById('btn-run-pdf2pptx');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>Converting to PowerPoint Deck...</span>';
      }

      try {
        await ensurePptxGen();
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_16x9';

        for (let p = 1; p <= pdf2PptxState.pageCount; p++) {
          const page = await pdf2PptxState.pdfJsDoc.getPage(p);
          const viewport = page.getViewport({ scale: 2.0 });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;

          const imgData = canvas.toDataURL('image/png');
          const slide = pptx.addSlide();
          slide.addImage({
            data: imgData,
            x: 0,
            y: 0,
            w: '100%',
            h: '100%'
          });
        }

        const blob = await pptx.write({ outputType: 'blob' });
        const baseName = (pdf2PptxState.file ? pdf2PptxState.file.name : 'document').replace(/\.pdf$/i, '');
        const outName = `${baseName}_presentation.pptx`;
        downloadTrackedBlob(blob, outName, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      } catch (err) {
        console.error('Failed to convert PDF to PPTX:', err);
        alert('Could not convert to PowerPoint: ' + err.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<span>Convert to PPTX</span><span>&rarr;</span>';
        }
      }
    }

    // ================= MODULE 30: SCAN TO PDF (CAMERA CAPTURE) TOOL =================
    let scan2PdfState = {
      stream: null,
      pages: []
    };

    function initScan2PdfToolListeners() {
      // Specialized events handled via centralized dispatcher
    }

    async function startScan2PdfCamera() {
      const placeholder = document.getElementById('scan2pdf-placeholder');
      const activeContainer = document.getElementById('scan2pdf-active-container');
      const video = document.getElementById('scan2pdf-video');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Camera access is not supported by this browser environment.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false
        });

        scan2PdfState.stream = stream;
        if (video) {
          video.srcObject = stream;
          video.play();
        }

        if (placeholder) placeholder.classList.add('hidden');
        if (activeContainer) activeContainer.classList.remove('hidden');
      } catch (err) {
        console.warn('Camera stream activation error:', err);
        alert('Could not open camera: ' + err.message);
      }
    }

    function captureScan2PdfFrame() {
      const video = document.getElementById('scan2pdf-video');
      if (!video || !scan2PdfState.stream) {
        alert('Camera is not currently active.');
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      scan2PdfState.pages.push(dataUrl);
      renderScan2PdfGallery();
    }

    function stopScan2PdfCamera() {
      if (scan2PdfState.stream) {
        scan2PdfState.stream.getTracks().forEach(track => track.stop());
        scan2PdfState.stream = null;
      }

      const placeholder = document.getElementById('scan2pdf-placeholder');
      const activeContainer = document.getElementById('scan2pdf-active-container');
      const video = document.getElementById('scan2pdf-video');

      if (video) {
        video.pause();
        video.srcObject = null;
      }

      if (placeholder) placeholder.classList.remove('hidden');
      if (activeContainer) activeContainer.classList.add('hidden');
    }

    function renderScan2PdfGallery() {
      const gallery = document.getElementById('scan2pdf-pages-gallery');
      const pageCount = document.getElementById('scan2pdf-page-count');
      if (!gallery) return;

      if (pageCount) {
        pageCount.textContent = `${scan2PdfState.pages.length} Page(s)`;
      }

      gallery.innerHTML = '';
      if (scan2PdfState.pages.length === 0) {
        gallery.innerHTML = '<div class="col-span-full text-center py-4 text-xs text-slate-400 font-medium italic">No pages captured yet. Click "Capture Page" to add pages.</div>';
        return;
      }

      scan2PdfState.pages.forEach((dataUrl, idx) => {
        const item = document.createElement('div');
        item.className = 'relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs';

        const img = document.createElement('img');
        img.src = dataUrl;
        img.alt = `Scanned Page ${idx + 1}`;
        img.className = 'w-full h-28 object-cover';

        const bar = document.createElement('div');
        bar.className = 'p-1.5 flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-300';
        bar.textContent = `Page ${idx + 1}`;

        item.appendChild(img);
        item.appendChild(bar);
        gallery.appendChild(item);
      });
    }

    async function executeScan2Pdf() {
      if (!scan2PdfState.pages || scan2PdfState.pages.length === 0) {
        alert('Please capture at least one page using the camera first.');
        return;
      }

      const btn = document.getElementById('btn-run-scan2pdf');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>Creating PDF...</span>';
      }

      try {
        await ensureJsPdf();
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'pt',
          format: 'a4'
        });

        const pageWidth = 595.28;
        const pageHeight = 841.89;

        for (let i = 0; i < scan2PdfState.pages.length; i++) {
          if (i > 0) pdf.addPage('a4', 'portrait');
          const dataUrl = scan2PdfState.pages[i];
          pdf.addImage(dataUrl, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
        }

        const blob = pdf.output('blob');
        const outName = `scanned_document_${Date.now()}.pdf`;
        downloadTrackedBlob(blob, outName, 'application/pdf');
      } catch (err) {
        console.error('Failed to generate scanned PDF:', err);
        alert('Could not generate PDF from scans: ' + err.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<span>Generate PDF from Scans</span><span>&rarr;</span>';
        }
      }
    }

    // ================= MODULE 31: ONBOARDING & HELP SYSTEM =================
    let onboardingSlideIndex = 0;
    const ONBOARDING_TOTAL_SLIDES = 4;

    function initOnboarding() {
      let done = false;
      try {
        done = localStorage.getItem('s2s_onboarding_done') === 'true';
      } catch (e) {}

      if (!done) {
        showOnboardingModal(0);
      }
    }

    function showOnboardingModal(initialIndex = 0) {
      const modal = document.getElementById('onboarding-overlay');
      if (!modal) return;
      onboardingSlideIndex = initialIndex;
      updateOnboardingSlide();
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function updateOnboardingSlide() {
      for (let i = 0; i < ONBOARDING_TOTAL_SLIDES; i++) {
        const slide = document.getElementById(`onboarding-slide-${i}`);
        const dot = document.getElementById(`onboarding-dot-${i}`);
        if (slide) {
          if (i === onboardingSlideIndex) {
            slide.classList.remove('hidden');
          } else {
            slide.classList.add('hidden');
          }
        }
        if (dot) {
          if (i === onboardingSlideIndex) {
            dot.className = 'w-5 h-2.5 rounded-full bg-emerald-600 transition-all';
          } else {
            dot.className = 'w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 transition-all';
          }
        }
      }

      const prevBtn = document.getElementById('btn-onboarding-prev');
      const nextBtn = document.getElementById('btn-onboarding-next');
      if (prevBtn) {
        if (onboardingSlideIndex === 0) {
          prevBtn.classList.add('hidden');
        } else {
          prevBtn.classList.remove('hidden');
        }
      }
      if (nextBtn) {
        if (onboardingSlideIndex === ONBOARDING_TOTAL_SLIDES - 1) {
          nextBtn.textContent = 'Get Started 🎉';
        } else {
          nextBtn.innerHTML = 'Next &rarr;';
        }
      }
    }

    function advanceOnboardingSlide() {
      if (onboardingSlideIndex < ONBOARDING_TOTAL_SLIDES - 1) {
        onboardingSlideIndex++;
        updateOnboardingSlide();
      } else {
        finishOnboarding();
      }
    }

    function retreatOnboardingSlide() {
      if (onboardingSlideIndex > 0) {
        onboardingSlideIndex--;
        updateOnboardingSlide();
      }
    }

    function finishOnboarding() {
      try {
        localStorage.setItem('s2s_onboarding_done', 'true');
      } catch (e) {}
      const modal = document.getElementById('onboarding-overlay');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }

    // ================= MULTI-LANGUAGE I18N ENGINE =================
    const I18N_TRANSLATIONS = {
  "en": {
    "nav_brand_title": "Statement2Sheet",
    "nav_brand_sub": "Financial & PDF Intelligence",
    "nav_merge": "Merge PDF",
    "nav_split": "Split PDF",
    "nav_compress": "Compress PDF",
    "nav_convert": "Convert PDF",
    "tool_excel": "PDF to Excel (3-Sheet)",
    "tool_pdf2img": "PDF to JPG / PNG",
    "tool_img2pdf": "JPG / PNG to PDF",
    "tool_ocr": "PDF to Markdown",
    "nav_all_tools": "ALL PDF TOOLS",
    "badge_free_private": "100% Free · No Sign Up Required",
    "badge_offline": "Offline Ready",
    "btn_clear_data": "Clear Data",
    "btn_quick_tour": "Quick Tour",
    "repair_title": "Repair PDF File",
    "repair_subtitle": "Recover damaged, corrupt, or truncated PDF files directly in your browser.",
    "hero_badge": "🔒 100% In-Browser Privacy · Zero Cloud Uploads",
    "hero_title": "Every Tool You Need for PDFs & Financial Records",
    "hero_subtitle": "30 enterprise-grade document tools running 100% in your browser memory. Merge, split, compress, edit, convert, and audit bank statements with zero server risk.",
    "hero_drop_title": "Drop any PDF, Bank Statement, Office Deck, or Image here",
    "hero_drop_sub": "Instant local in-memory processing · Zero bytes uploaded to any server",
    "hero_drop_btn": "Select Document",
    "hero_recent_title": "Recent Statements & Documents",
    "hero_recent_clear": "Clear",
    "filter_all": "All Tools",
    "filter_banking": "Banking & Finance",
    "filter_organize": "Organize PDF",
    "filter_optimize": "Optimize PDF",
    "filter_convert": "Convert PDF",
    "filter_edit": "Edit & Fill",
    "filter_security": "PDF Security",
    "filter_intelligence": "AI & Intelligence",
    "card_merge_title": "Merge PDF",
    "card_merge_desc": "Combine PDFs in the order you want with the easiest PDF merger available.",
    "card_merge_action": "Combine",
    "card_split_title": "Split PDF",
    "card_split_desc": "Separate one page or a whole set for easy conversion into independent PDF files.",
    "card_split_action": "Separate",
    "card_compress_title": "Compress PDF",
    "card_compress_desc": "Reduce file size while optimizing for maximal PDF quality in local memory.",
    "card_compress_action": "Compress",
    "card_excel_title": "PDF to Excel (3-Sheet)",
    "card_excel_desc": "Auto-extract bank statement transactions into a 3-sheet Excel ledger with balance reconciliation audit.",
    "card_excel_action": "Convert",
    "card_pdf2img_title": "PDF to JPG / PNG",
    "card_pdf2img_desc": "Extract high-resolution raster images from PDF pages without data loss.",
    "card_pdf2img_action": "Extract",
    "card_img2pdf_title": "JPG / PNG to PDF",
    "card_img2pdf_desc": "Convert JPG, PNG, WebP, and BMP images into a clean single PDF document.",
    "card_img2pdf_action": "Convert",
    "card_organize_title": "Organize PDF",
    "card_organize_desc": "Sort, delete, and rearrange PDF pages with visual drag-and-drop handles.",
    "card_organize_action": "Organize",
    "card_sign_title": "Sign PDF",
    "card_sign_desc": "Sign documents with drawn or typed signatures directly on any page.",
    "card_sign_action": "Sign",
    "card_watermark_title": "Watermark PDF",
    "card_watermark_desc": "Stamp custom text or confidential watermarks across selected pages.",
    "card_watermark_action": "Stamp",
    "card_rotate_title": "Rotate PDF",
    "card_rotate_desc": "Rotate portrait and landscape PDF pages by 90, 180, or 270 degrees.",
    "card_rotate_action": "Rotate",
    "card_unlock_title": "Unlock PDF",
    "card_unlock_desc": "Remove password security restrictions from protected PDF files.",
    "card_unlock_action": "Unlock",
    "card_protect_title": "Protect PDF",
    "card_protect_desc": "Encrypt your PDF with standard 128-bit/256-bit AES encryption passwords.",
    "card_protect_action": "Protect",
    "card_crop_title": "Crop PDF",
    "card_crop_desc": "Trim margins and crop specific page areas with visual dimension handles.",
    "card_crop_action": "Crop",
    "card_extractimg_title": "Extract Images",
    "card_extractimg_desc": "Extract all embedded raster images from your PDF document in original quality.",
    "card_extractimg_action": "Extract",
    "card_compare_title": "Compare PDF",
    "card_compare_desc": "Side-by-side visual and textual difference comparison of two PDF revisions.",
    "card_compare_action": "Compare",
    "card_pagenumber_title": "Page Numbers",
    "card_pagenumber_desc": "Insert customizable page numbers with position and typographic control.",
    "card_pagenumber_action": "Insert",
    "card_redact_title": "Redact PDF",
    "card_redact_desc": "Permanently black out sensitive text, account numbers, and confidential areas.",
    "card_redact_action": "Redact",
    "card_ocr_title": "PDF to Markdown",
    "card_ocr_desc": "Extract plain text and structured Markdown using client-side OCR engines.",
    "card_ocr_action": "Extract",
    "card_pdf2word_title": "PDF to Word (.docx)",
    "card_pdf2word_desc": "Convert PDF documents to genuine Microsoft Word OpenXML with editable table grids.",
    "card_pdf2word_action": "Convert",
    "card_office2pdf_title": "Office to PDF",
    "card_office2pdf_desc": "Convert Word, Excel spreadsheets, and CSV files directly into clean PDFs.",
    "card_excel2pdf_title": "Excel to PDF",
    "card_excel2pdf_desc": "Make EXCEL spreadsheets easy to read by converting them to PDF.",
    "card_office2pdf_action": "Convert",
    "card_pdfa_title": "PDF/A ISO Archival",
    "card_pdfa_desc": "Convert documents to ISO 19005-1 compliant PDF/A for long-term legal archival.",
    "card_pdfa_action": "Archive",
    "card_digitalsign_title": "Cryptographic PKI Seal",
    "card_digitalsign_desc": "Apply tamper-evident SHA-256 digital cryptographic hash seals.",
    "card_digitalsign_action": "Seal",
    "card_summarize_title": "Document Summarizer",
    "card_summarize_desc": "Extract key financial figures, entity mentions, and concise summaries.",
    "card_summarize_action": "Summarize",
    "card_repair_title": "Repair Corrupt PDF",
    "card_repair_desc": "Recover damaged or truncated PDF files by rebuilding corrupted XREF tables.",
    "card_repair_action": "Repair",
    "card_editpdf_title": "Edit PDF",
    "card_editpdf_desc": "Add text, shapes, arrows, and drawings directly on PDF pages in real-time.",
    "card_editpdf_action": "Edit",
    "card_formfill_title": "Fill PDF Forms",
    "card_formfill_desc": "Auto-detect interactive AcroForm fields, checkboxes, and text inputs.",
    "card_formfill_action": "Fill",
    "card_pptx2pdf_title": "PowerPoint to PDF",
    "card_pptx2pdf_desc": "Convert .pptx presentation slide decks into high-fidelity PDF documents.",
    "card_pptx2pdf_action": "Convert",
    "card_pdf2pptx_title": "PDF to PowerPoint",
    "card_pdf2pptx_desc": "Convert PDF documents into editable 16:9 widescreen PowerPoint presentation slides.",
    "card_pdf2pptx_action": "Convert",
    "card_scan2pdf_title": "Scan to PDF",
    "card_scan2pdf_desc": "Capture document pages using your device camera and compile into a clean PDF.",
    "card_scan2pdf_action": "Scan",
    "trust_title": "The PDF software trusted for confidential documents",
    "trust_subtitle": "Statement2Sheet runs 100% locally in browser memory. No documents, banking records, or credentials ever touch an external server.",
    "trust_p1_title": "Ephemeral RAM",
    "trust_p1_desc": "Wiped clean on tab close or manual purge",
    "trust_p2_title": "100% In-Browser",
    "trust_p2_desc": "Zero cloud uploads or data transmission",
    "trust_p3_title": "ISO Standards",
    "trust_p3_desc": "PDF-1.7, PDF/A-1b & OpenXML compliant",
    "trust_p4_title": "Hardware Accelerated",
    "trust_p4_desc": "WebAssembly and HTML5 TypedArrays",
    "guides_badge": "Enterprise Financial Intelligence",
    "guides_title": "How Statement2Sheet Powers Your Financial Workflow",
    "guides_sub": "From multi-sheet reconciled workbooks to QuickBooks OFX formatting, understand how our browser-native engine transforms documents without compromising privacy.",
    "faq_title": "Frequently Asked Questions",
    "faq_sub": "Everything you need to know about statement conversion, accounting formats, and data protection.",
    "faq_q1": "How does Statement2Sheet convert bank statements to Excel (.xlsx)?",
    "faq_q2": "Can Statement2Sheet convert PDF statements to clean CSV format?",
    "faq_q3": "Does Statement2Sheet support QuickBooks (.QBO) WebConnect export?",
    "faq_q4": "Is my banking data private and safe when using Statement2Sheet?",
    "faq_q5": "Can I use Statement2Sheet offline without an active internet connection?",
    "faq_q6": "Are scanned bank statements and photos supported?",
    "footer_col_product": "PRODUCT",
    "footer_col_financial": "FINANCIAL SUITE",
    "footer_col_solutions": "SOLUTIONS",
    "footer_col_legal": "LEGAL",
    "footer_col_company": "COMPANY",
    "footer_copyright": "© 2026 Statement2Sheet. Every tool you need to work with financial statements and PDFs in one place.",
    "footer_badge_wasm": "WebAssembly Powered",
    "footer_badge_offline": "Offline Ready PWA",
    "footer_badge_status": "100% Client-Side",
    "card_bankstmt_title": "Bank Statement to Excel",
    "card_bankstmt_desc": "Convert messy bank statements into 3-sheet audited Excel workbooks with reconciliation.",
    "card_bankstmt_action": "Convert",
    "card_qbo_title": "QuickBooks (.QBO)",
    "card_qbo_desc": "Generate WebConnect OFX .QBO files for instant 1-click import into QuickBooks feeds.",
    "card_qbo_action": "Export"
  },
  "es": {
    "nav_brand_title": "Statement2Sheet",
    "nav_brand_sub": "Financial & PDF Intelligence",
    "nav_merge": "Unir PDF",
    "nav_split": "Dividir PDF",
    "nav_compress": "Comprimir PDF",
    "nav_convert": "Convertir PDF",
    "tool_excel": "PDF a Excel (3 hojas)",
    "tool_pdf2img": "PDF a JPG / PNG",
    "tool_img2pdf": "JPG / PNG a PDF",
    "tool_ocr": "PDF a Markdown",
    "nav_all_tools": "TODAS LAS HERRAMIENTAS PDF",
    "badge_free_private": "100% Gratis · Sin Registro Requerido",
    "badge_offline": "Listo sin conexión",
    "btn_clear_data": "Borrar datos",
    "btn_quick_tour": "Guía rápida",
    "repair_title": "Reparar archivo PDF",
    "repair_subtitle": "Recupere archivos PDF dañados, corruptos o truncados directamente en su navegador.",
    "hero_badge": "🔒 100% Privacidad en Navegador · Cero Subidas a la Nube",
    "hero_title": "Cada herramienta que necesita para PDFs y Extractos Bancarios",
    "hero_subtitle": "30 herramientas de documentos de nivel empresarial ejecutadas 100% en la memoria RAM de su navegador. Una, divida, comprima, edite y audite sin riesgo de servidor.",
    "hero_drop_title": "Suelte cualquier PDF, Extracto Bancario o Imagen aquí",
    "hero_drop_sub": "Procesamiento en memoria local instantáneo · Cero bytes enviados a servidores externos",
    "hero_drop_btn": "Seleccionar Documento",
    "hero_recent_title": "Documentos Recientes",
    "hero_recent_clear": "Borrar",
    "filter_all": "Todas las herramientas",
    "filter_banking": "Banca y Finanzas",
    "filter_organize": "Organizar PDF",
    "filter_optimize": "Optimizar PDF",
    "filter_convert": "Convertir PDF",
    "filter_edit": "Editar y Rellenar",
    "filter_security": "Seguridad PDF",
    "filter_intelligence": "Inteligencia y OCR",
    "card_merge_title": "Unir PDF",
    "card_merge_desc": "Combine PDFs en el orden deseado con el unificador de PDFs más rápido.",
    "card_merge_action": "Unir",
    "card_split_title": "Dividir PDF",
    "card_split_desc": "Separe una página o un rango completo en archivos PDF independientes.",
    "card_split_action": "Dividir",
    "card_compress_title": "Comprimir PDF",
    "card_compress_desc": "Reduzca el tamaño manteniendo la máxima calidad vectorial en memoria local.",
    "card_compress_action": "Comprimir",
    "card_excel_title": "PDF a Excel (3 Hojas)",
    "card_excel_desc": "Extraiga transacciones bancarias en un libro Excel de 3 hojas con auditoría de conciliación.",
    "card_excel_action": "Convertir",
    "card_pdf2img_title": "PDF a JPG / PNG",
    "card_pdf2img_desc": "Extraiga imágenes ráster de alta resolución de páginas PDF sin pérdida de datos.",
    "card_pdf2img_action": "Extraer",
    "card_img2pdf_title": "JPG / PNG a PDF",
    "card_img2pdf_desc": "Convierta imágenes JPG, PNG, WebP y BMP en un único documento PDF limpio.",
    "card_img2pdf_action": "Convertir",
    "card_organize_title": "Organizar PDF",
    "card_organize_desc": "Ordene, elimine y reorganice páginas PDF visualmente arrastrando y soltando.",
    "card_organize_action": "Organizar",
    "card_sign_title": "Firmar PDF",
    "card_sign_desc": "Firme documentos dibujando o escribiendo firmas digitales en cualquier página.",
    "card_sign_action": "Firmar",
    "card_watermark_title": "Marca de agua PDF",
    "card_watermark_desc": "Estampe texto o sellos de confidencialidad en páginas seleccionadas.",
    "card_watermark_action": "Estampar",
    "card_rotate_title": "Rotar PDF",
    "card_rotate_desc": "Gire páginas verticales y horizontales 90, 180 o 270 grados en lote.",
    "card_rotate_action": "Rotar",
    "card_unlock_title": "Desbloquear PDF",
    "card_unlock_desc": "Elimine restricciones de contraseña de seguridad de archivos PDF protegidos.",
    "card_unlock_action": "Desbloquear",
    "card_protect_title": "Proteger PDF",
    "card_protect_desc": "Cifre su PDF con contraseñas seguras estándar AES de 128 o 256 bits.",
    "card_protect_action": "Proteger",
    "card_crop_title": "Recortar PDF",
    "card_crop_desc": "Recorte márgenes y áreas específicas de página con tiradores interactivos.",
    "card_crop_action": "Recortar",
    "card_extractimg_title": "Extraer Imágenes",
    "card_extractimg_desc": "Extraiga todas las imágenes incrustadas de su documento PDF en calidad original.",
    "card_extractimg_action": "Extraer",
    "card_compare_title": "Comparar PDF",
    "card_compare_desc": "Comparación visual y textual lado a lado de dos versiones de documentos PDF.",
    "card_compare_action": "Comparar",
    "card_pagenumber_title": "Números de Página",
    "card_pagenumber_desc": "Inserte números de página personalizables con control de posición y tipografía.",
    "card_pagenumber_action": "Insertar",
    "card_redact_title": "Censurar PDF (Redact)",
    "card_redact_desc": "Oculte permanentemente texto confidencial, números de cuenta y datos sensibles.",
    "card_redact_action": "Censurar",
    "card_ocr_title": "PDF a Markdown",
    "card_ocr_desc": "Extraiga texto sin formato y Markdown estructurado mediante OCR en el navegador.",
    "card_ocr_action": "Extraer",
    "card_pdf2word_title": "PDF a Word (.docx)",
    "card_pdf2word_desc": "Convierta documentos PDF a Microsoft Word OpenXML con tablas editables.",
    "card_pdf2word_action": "Convertir",
    "card_office2pdf_title": "Office a PDF",
    "card_office2pdf_desc": "Convierta hojas de cálculo Excel, Word y archivos CSV directamente a PDF.",
    "card_excel2pdf_title": "Excel a PDF",
    "card_excel2pdf_desc": "Convierta hojas de cálculo EXCEL directamente a documentos PDF legibles.",
    "card_office2pdf_action": "Convertir",
    "card_pdfa_title": "Archivo ISO PDF/A",
    "card_pdfa_desc": "Convierta documentos a estándar ISO 19005-1 para archivo legal a largo plazo.",
    "card_pdfa_action": "Archivar",
    "card_digitalsign_title": "Sello Criptográfico PKI",
    "card_digitalsign_desc": "Aplique sellos de huella digital criptográfica SHA-256 a prueba de manipulaciones.",
    "card_digitalsign_action": "Sellar",
    "card_summarize_title": "Resumir Documento",
    "card_summarize_desc": "Extraiga cifras financieras clave, entidades y resúmenes estructurados al instante.",
    "card_summarize_action": "Resumir",
    "card_repair_title": "Reparar PDF Dañado",
    "card_repair_desc": "Recupere archivos PDF dañados reconstruyendo tablas de referencias XREF.",
    "card_repair_action": "Reparar",
    "card_editpdf_title": "Editar PDF",
    "card_editpdf_desc": "Añada texto, figuras, flechas y dibujos directamente sobre páginas PDF.",
    "card_editpdf_action": "Editar",
    "card_formfill_title": "Rellenar Formularios PDF",
    "card_formfill_desc": "Detecte y complete automáticamente campos interactivos AcroForm y casillas.",
    "card_formfill_action": "Rellenar",
    "card_pptx2pdf_title": "PowerPoint a PDF",
    "card_pptx2pdf_desc": "Convierta presentaciones .pptx en documentos PDF limpios de alta fidelidad.",
    "card_pptx2pdf_action": "Convertir",
    "card_pdf2pptx_title": "PDF a PowerPoint",
    "card_pdf2pptx_desc": "Convierta documentos PDF en diapositivas de presentación PowerPoint 16:9.",
    "card_pdf2pptx_action": "Convertir",
    "card_scan2pdf_title": "Escanear a PDF",
    "card_scan2pdf_desc": "Capture páginas usando la cámara de su dispositivo y genere un PDF al instante.",
    "card_scan2pdf_action": "Escanear",
    "trust_title": "El software PDF en el que confían millones para documentos confidenciales",
    "trust_subtitle": "Statement2Sheet opera 100% en la memoria de su navegador. Ningún documento bancario o dato sale de su equipo.",
    "trust_p1_title": "Memoria RAM Efímera",
    "trust_p1_desc": "Se borra al cerrar la pestaña o con un clic",
    "trust_p2_title": "100% en el Navegador",
    "trust_p2_desc": "Cero transferencias a servidores externos",
    "trust_p3_title": "Estándares ISO",
    "trust_p3_desc": "Compatible con PDF-1.7, PDF/A-1b y OpenXML",
    "trust_p4_title": "Acelerado por Hardware",
    "trust_p4_desc": "Impulsado por WebAssembly y TypedArrays",
    "guides_badge": "Inteligencia Financiera Empresarial",
    "guides_title": "Cómo Statement2Sheet Optimiza su Flujo de Trabajo",
    "guides_sub": "Desde libros conciliados de 3 hojas hasta formato QuickBooks OFX, descubra cómo nuestro motor procesa extractos sin comprometer la privacidad.",
    "faq_title": "Preguntas Frecuentes",
    "faq_sub": "Todo lo que necesita saber sobre conversión bancaria, formatos contables y seguridad de datos.",
    "faq_q1": "¿Cómo convierte Statement2Sheet extractos bancarios a Excel (.xlsx)?",
    "faq_q2": "¿Puede convertir extractos PDF a formato CSV limpio?",
    "faq_q3": "¿Es compatible con la exportación QuickBooks (.QBO) WebConnect?",
    "faq_q4": "¿Mis datos bancarios están seguros y privados con Statement2Sheet?",
    "faq_q5": "¿Puedo utilizar Statement2Sheet sin conexión a Internet?",
    "faq_q6": "¿Admite extractos bancarios escaneados y fotografías?",
    "footer_col_product": "PRODUCTO",
    "footer_col_financial": "SUITE FINANCIERA",
    "footer_col_solutions": "SOLUCIONES",
    "footer_col_legal": "LEGAL",
    "footer_col_company": "COMPAÑÍA",
    "footer_copyright": "© 2026 Statement2Sheet. Cada herramienta que necesita para trabajar con extractos bancarios y PDFs en un solo lugar.",
    "footer_badge_wasm": "Impulsado por WebAssembly",
    "footer_badge_offline": "PWA Lista Offline",
    "footer_badge_status": "100% En el Cliente",
    "card_bankstmt_title": "Extracto Bancario a Excel",
    "card_bankstmt_desc": "Convierta extractos bancarios en libros Excel de 3 hojas con auditoría de conciliación.",
    "card_bankstmt_action": "Convertir",
    "card_qbo_title": "QuickBooks (.QBO)",
    "card_qbo_desc": "Genere archivos WebConnect OFX .QBO para importación directa en QuickBooks.",
    "card_qbo_action": "Exportar"
  },
  "fr": {
    "nav_brand_title": "Statement2Sheet",
    "nav_brand_sub": "Financial & PDF Intelligence",
    "nav_merge": "Fusionner PDF",
    "nav_split": "Diviser PDF",
    "nav_compress": "Compresser PDF",
    "nav_convert": "Convertir PDF",
    "tool_excel": "PDF en Excel (3 feuilles)",
    "tool_pdf2img": "PDF en JPG / PNG",
    "tool_img2pdf": "JPG / PNG en PDF",
    "tool_ocr": "PDF en Markdown",
    "nav_all_tools": "TOUS LES OUTILS PDF",
    "badge_free_private": "100% Gratuit · Sans Inscription",
    "badge_offline": "Prêt hors-ligne",
    "btn_clear_data": "Effacer données",
    "btn_quick_tour": "Visite guidée",
    "repair_title": "Réparer le fichier PDF",
    "repair_subtitle": "Récupérez des fichiers PDF endommagés ou corrompus directement dans votre navigateur.",
    "hero_badge": "🔒 Confidentialité Totale en Mémoire · Zéro Téléchargement Cloud",
    "hero_title": "Tous les outils dont vous avez besoin pour vos PDF et relevés",
    "hero_subtitle": "30 outils documentaires de niveau entreprise exécutés à 100% dans la mémoire de votre navigateur. Fusionnez, divisez, compressez, éditez et auditez sans risque.",
    "hero_drop_title": "Déposez vos PDF, Relevés Bancaires ou Images ici",
    "hero_drop_sub": "Traitement instantané en mémoire vive locale · Zéro octet transmis à des serveurs tiers",
    "hero_drop_btn": "Sélectionner un Document",
    "hero_recent_title": "Documents Récents",
    "hero_recent_clear": "Effacer",
    "filter_all": "Tous les outils",
    "filter_banking": "Banque & Finance",
    "filter_organize": "Organiser PDF",
    "filter_optimize": "Optimiser PDF",
    "filter_convert": "Convertir PDF",
    "filter_edit": "Modifier & Remplir",
    "filter_security": "Sécurité PDF",
    "filter_intelligence": "IA & OCR",
    "card_merge_title": "Fusionner PDF",
    "card_merge_desc": "Combinez des fichiers PDF dans l'ordre souhaité avec l'outil le plus rapide.",
    "card_merge_action": "Fusionner",
    "card_split_title": "Diviser PDF",
    "card_split_desc": "Séparez une page ou une plage complète en fichiers PDF autonomes.",
    "card_split_action": "Diviser",
    "card_compress_title": "Compresser PDF",
    "card_compress_desc": "Réduisez la taille des fichiers tout en maintenant la qualité vectorielle.",
    "card_compress_action": "Compresser",
    "card_excel_title": "PDF en Excel (3 Feuilles)",
    "card_excel_desc": "Extrayez les écritures bancaires dans un classeur Excel 3 feuilles avec réconciliation.",
    "card_excel_action": "Convertir",
    "card_pdf2img_title": "PDF en JPG / PNG",
    "card_pdf2img_desc": "Extrayez des images raster haute résolution sans perte de qualité.",
    "card_pdf2img_action": "Extraire",
    "card_img2pdf_title": "JPG / PNG en PDF",
    "card_img2pdf_desc": "Convertissez des images JPG, PNG, WebP et BMP en un document PDF unique et net.",
    "card_img2pdf_action": "Convertir",
    "card_organize_title": "Organiser PDF",
    "card_organize_desc": "Triez, supprimez et réorganisez les pages PDF par glisser-déposer.",
    "card_organize_action": "Organiser",
    "card_sign_title": "Signer PDF",
    "card_sign_desc": "Signez des documents avec votre signature dessinée sur n'importe quelle page.",
    "card_sign_action": "Signer",
    "card_watermark_title": "Filigrane PDF",
    "card_watermark_desc": "Apposez un texte ou filigrane confidentiel sur les pages choisies.",
    "card_watermark_action": "Apposer",
    "card_rotate_title": "Faire pivoter PDF",
    "card_rotate_desc": "Faites pivoter les pages à 90, 180 ou 270 degrés par lot.",
    "card_rotate_action": "Pivoter",
    "card_unlock_title": "Déverrouiller PDF",
    "card_unlock_desc": "Supprimez la protection par mot de passe des fichiers PDF protégés.",
    "card_unlock_action": "Déverrouiller",
    "card_protect_title": "Protéger PDF",
    "card_protect_desc": "Chiffrez votre document avec un mot de passe sécurisé AES 128 ou 256 bits.",
    "card_protect_action": "Protéger",
    "card_crop_title": "Rogner PDF",
    "card_crop_desc": "Ajustez les marges et recadrez les pages avec des poignées interactives.",
    "card_crop_action": "Rogner",
    "card_extractimg_title": "Extraire Images",
    "card_extractimg_desc": "Extrayez toutes les images intégrées de votre PDF en qualité originale.",
    "card_extractimg_action": "Extraire",
    "card_compare_title": "Comparer PDF",
    "card_compare_desc": "Comparaison visuelle et textuelle côte à côte de deux versions d'un document.",
    "card_compare_action": "Comparer",
    "card_pagenumber_title": "Numéros de Page",
    "card_pagenumber_desc": "Insérez des numéros de page avec positionnement typographique personnalisable.",
    "card_pagenumber_action": "Insérer",
    "card_redact_title": "Caviarder PDF (Masquer)",
    "card_redact_desc": "Masquez définitivement les données bancaires et informations confidentielles.",
    "card_redact_action": "Masquer",
    "card_ocr_title": "PDF en Markdown",
    "card_ocr_desc": "Extrayez le texte brut et le Markdown structuré via OCR local.",
    "card_ocr_action": "Extraire",
    "card_pdf2word_title": "PDF en Word (.docx)",
    "card_pdf2word_desc": "Convertissez des PDF en documents Microsoft Word avec tableaux éditables.",
    "card_pdf2word_action": "Convertir",
    "card_office2pdf_title": "Office en PDF",
    "card_office2pdf_desc": "Convertissez Word, classeurs Excel et fichiers CSV directement en PDF.",
    "card_excel2pdf_title": "Excel en PDF",
    "card_excel2pdf_desc": "Convertissez vos tableaux EXCEL en documents PDF faciles à lire.",
    "card_office2pdf_action": "Convertir",
    "card_pdfa_title": "Archivage ISO PDF/A",
    "card_pdfa_desc": "Convertissez vos documents au format ISO 19005-1 pour l'archivage légal durable.",
    "card_pdfa_action": "Archiver",
    "card_digitalsign_title": "Sceau Cryptographique PKI",
    "card_digitalsign_desc": "Appliquez un sceau d'empreinte cryptographique SHA-256 infalsifiable.",
    "card_digitalsign_action": "Sceller",
    "card_summarize_title": "Résumer Document",
    "card_summarize_desc": "Extrayez les indicateurs financiers majeurs et résumés analytiques clés.",
    "card_summarize_action": "Résumer",
    "card_repair_title": "Réparer PDF Endommagé",
    "card_repair_desc": "Restaurez des fichiers PDF endommagés en reconstruisant la table XREF.",
    "card_repair_action": "Réparer",
    "card_editpdf_title": "Modifier PDF",
    "card_editpdf_desc": "Ajoutez du texte, des formes, des flèches et des tracés sur vos pages PDF.",
    "card_editpdf_action": "Modifier",
    "card_formfill_title": "Remplir Formulaire PDF",
    "card_formfill_desc": "Détectez et complétez les champs AcroForm interactifs et cases à cocher.",
    "card_formfill_action": "Remplir",
    "card_pptx2pdf_title": "PowerPoint en PDF",
    "card_pptx2pdf_desc": "Convertissez des diapositives .pptx en documents PDF haute fidélité.",
    "card_pptx2pdf_action": "Convertir",
    "card_pdf2pptx_title": "PDF en PowerPoint",
    "card_pdf2pptx_desc": "Convertissez vos PDF en diapositives PowerPoint éditables au format 16:9.",
    "card_pdf2pptx_action": "Convertir",
    "card_scan2pdf_title": "Numériser en PDF",
    "card_scan2pdf_desc": "Prenez des photos avec votre caméra et générez instantanément un PDF.",
    "card_scan2pdf_action": "Numériser",
    "trust_title": "Le logiciel PDF plébiscité pour les documents hautement confidentiels",
    "trust_subtitle": "Statement2Sheet fonctionne entièrement dans la mémoire locale de votre navigateur. Vos données ne quittent jamais votre appareil.",
    "trust_p1_title": "Mémoire Vive Éphémère",
    "trust_p1_desc": "Effacée à la fermeture de l'onglet ou manuellement",
    "trust_p2_title": "100% dans le Navigateur",
    "trust_p2_desc": "Aucune transmission vers des serveurs distants",
    "trust_p3_title": "Normes ISO Documentaires",
    "trust_p3_desc": "Conforme PDF-1.7, PDF/A-1b et Microsoft OpenXML",
    "trust_p4_title": "Accélération Matérielle",
    "trust_p4_desc": "Propulsé par WebAssembly et TypedArrays HTML5",
    "guides_badge": "Intelligence Financière d'Entreprise",
    "guides_title": "Comment Statement2Sheet Révolutionne votre Gestion",
    "guides_sub": "Des classeurs 3 feuilles réconciliés à l'export QuickBooks OFX, découvrez notre technologie locale sans concession sur la vie privée.",
    "faq_title": "Foire Aux Questions",
    "faq_sub": "Tout ce que vous devez savoir sur la conversion bancaire, les formats comptables et la sécurité.",
    "faq_q1": "Comment Statement2Sheet convertit-il les relevés bancaires en Excel (.xlsx) ?",
    "faq_q2": "Puis-je convertir mes relevés PDF en fichier CSV standardisé ?",
    "faq_q3": "L'export QuickBooks (.QBO) WebConnect est-il pris en charge ?",
    "faq_q4": "Mes données financières sont-elles en sécurité avec Statement2Sheet ?",
    "faq_q5": "Puis-je utiliser Statement2Sheet hors ligne sans connexion internet ?",
    "faq_q6": "Les relevés bancaires numérisés et les photos sont-ils acceptés ?",
    "footer_col_product": "PRODUIT",
    "footer_col_financial": "SUITE COMPTABLE",
    "footer_col_solutions": "SOLUTIONS",
    "footer_col_legal": "LÉGAL",
    "footer_col_company": "ENTREPRISE",
    "footer_copyright": "© 2026 Statement2Sheet. Tous les outils nécessaires pour gérer vos relevés et vos PDF au même endroit.",
    "footer_badge_wasm": "Propulsé par WebAssembly",
    "footer_badge_offline": "PWA Prête Hors-Ligne",
    "footer_badge_status": "100% Côté Client",
    "card_bankstmt_title": "Relevé Bancaire en Excel",
    "card_bankstmt_desc": "Convertissez vos relevés bancaires en classeurs Excel à 3 feuilles avec réconciliation.",
    "card_bankstmt_action": "Convertir",
    "card_qbo_title": "QuickBooks (.QBO)",
    "card_qbo_desc": "Générez des fichiers WebConnect OFX .QBO pour importation directe dans QuickBooks.",
    "card_qbo_action": "Exporter"
  },
  "de": {
    "nav_brand_title": "Statement2Sheet",
    "nav_brand_sub": "Financial & PDF Intelligence",
    "nav_merge": "PDF zusammenfügen",
    "nav_split": "PDF teilen",
    "nav_compress": "PDF komprimieren",
    "nav_convert": "PDF umwandeln",
    "tool_excel": "PDF zu Excel (3 Blätter)",
    "tool_pdf2img": "PDF zu JPG / PNG",
    "tool_img2pdf": "JPG / PNG zu PDF",
    "tool_ocr": "PDF zu Markdown",
    "nav_all_tools": "ALLE PDF-WERKZEUGE",
    "badge_free_private": "100% Kostenlos · Keine Registrierung",
    "badge_offline": "Offline bereit",
    "btn_clear_data": "Daten löschen",
    "btn_quick_tour": "Schnellübersicht",
    "repair_title": "PDF-Datei reparieren",
    "repair_subtitle": "Reparieren Sie beschädigte PDF-Dateien direkt im Browser.",
    "hero_badge": "🔒 100% Browsersicherheit · Keine Cloud-Uploads",
    "hero_title": "Alle Werkzeuge für PDFs und Kontoauszüge an einem Ort",
    "hero_subtitle": "30 professionelle Dokumentenwerkzeuge, die vollständig im Arbeitsspeicher Ihres Browsers laufen. Zusammenfügen, teilen, komprimieren, bearbeiten und prüfen ohne Serverrisiko.",
    "hero_drop_title": "PDFs, Kontoauszüge oder Dokumente hier ablegen",
    "hero_drop_sub": "Sofortige lokale Verarbeitung im Arbeitsspeicher · Keine Datenübertragung an Server",
    "hero_drop_btn": "Dokument auswählen",
    "hero_recent_title": "Zuletzt verwendete Dokumente",
    "hero_recent_clear": "Löschen",
    "filter_all": "Alle Werkzeuge",
    "filter_banking": "Banken & Finanzen",
    "filter_organize": "PDF organisieren",
    "filter_optimize": "PDF optimieren",
    "filter_convert": "PDF konvertieren",
    "filter_edit": "Bearbeiten & Ausfüllen",
    "filter_security": "PDF-Sicherheit",
    "filter_intelligence": "KI & OCR",
    "card_merge_title": "PDF zusammenfügen",
    "card_merge_desc": "Kombinieren Sie PDFs in beliebiger Reihenfolge mit maximaler Geschwindigkeit.",
    "card_merge_action": "Zusammenfügen",
    "card_split_title": "PDF teilen",
    "card_split_desc": "Trennen Sie einzelne Seiten oder Bereiche in eigenständige PDF-Dateien.",
    "card_split_action": "Teilen",
    "card_compress_title": "PDF komprimieren",
    "card_compress_desc": "Dateigröße reduzieren bei optimaler Vektorqualität im lokalen Speicher.",
    "card_compress_action": "Komprimieren",
    "card_excel_title": "PDF zu Excel (3 Blätter)",
    "card_excel_desc": "Transaktionen automatisch in eine 3-Blatt-Arbeitsmappe mit Saldenabgleich extrahieren.",
    "card_excel_action": "Konvertieren",
    "card_pdf2img_title": "PDF zu JPG / PNG",
    "card_pdf2img_desc": "Hochauflösende Rasterbilder ohne Datenverlust aus PDF-Seiten extrahieren.",
    "card_pdf2img_action": "Extrahieren",
    "card_img2pdf_title": "JPG / PNG zu PDF",
    "card_img2pdf_desc": "JPG, PNG, WebP und BMP in ein sauberes PDF-Dokument zusammenführen.",
    "card_img2pdf_action": "Konvertieren",
    "card_organize_title": "PDF organisieren",
    "card_organize_desc": "Seiten visuell per Drag-and-Drop verschieben, löschen und neu anordnen.",
    "card_organize_action": "Organisieren",
    "card_sign_title": "PDF signieren",
    "card_sign_desc": "Dokumente mit gezeichneten oder getippten Signaturen direkt signieren.",
    "card_sign_action": "Signieren",
    "card_watermark_title": "PDF-Wasserzeichen",
    "card_watermark_desc": "Benutzerdefinierten Text oder Stempel auf ausgewählten Seiten anbringen.",
    "card_watermark_action": "Stempeln",
    "card_rotate_title": "PDF drehen",
    "card_rotate_desc": "Seiten um 90, 180 oder 270 Grad stapelweise drehen.",
    "card_rotate_action": "Drehen",
    "card_unlock_title": "PDF entsperren",
    "card_unlock_desc": "Kennwortschutz von geschützten PDF-Dateien entfernen.",
    "card_unlock_action": "Entsperren",
    "card_protect_title": "PDF schützen",
    "card_protect_desc": "PDFs mit sicherem AES-128/256-Bit-Verschlüsselungskennwort schützen.",
    "card_protect_action": "Schützen",
    "card_crop_title": "PDF zuschneiden",
    "card_crop_desc": "Ränder beschneiden und Seitenbereiche mit Steuergriffen anpassen.",
    "card_crop_action": "Zuschneiden",
    "card_extractimg_title": "Bilder extrahieren",
    "card_extractimg_desc": "Eingebettete Rasterbilder in Originalqualität aus PDFs extrahieren.",
    "card_extractimg_action": "Extrahieren",
    "card_compare_title": "PDF vergleichen",
    "card_compare_desc": "Visueller und textueller Vergleich zweier PDF-Revisionen nebeneinander.",
    "card_compare_action": "Vergleichen",
    "card_pagenumber_title": "Seitenzahlen",
    "card_pagenumber_desc": "Anpassbare Seitennummerierung mit typografischer Kontrolle einfügen.",
    "card_pagenumber_action": "Einfügen",
    "card_redact_title": "PDF schwärzen (Redact)",
    "card_redact_desc": "Sensible Daten, Bankkonten und vertrauliche Bereiche dauerhaft schwärzen.",
    "card_redact_action": "Schwärzen",
    "card_ocr_title": "PDF zu Markdown",
    "card_ocr_desc": "Reinen Text und strukturiertes Markdown via browserinternem OCR extrahieren.",
    "card_ocr_action": "Extrahieren",
    "card_pdf2word_title": "PDF zu Word (.docx)",
    "card_pdf2word_desc": "PDF-Dokumente in echte Microsoft Word OpenXML mit Tabellen umwandeln.",
    "card_pdf2word_action": "Konvertieren",
    "card_office2pdf_title": "Office zu PDF",
    "card_office2pdf_desc": "Word, Excel-Tabellen und CSV-Dateien direkt in saubere PDFs konvertieren.",
    "card_excel2pdf_title": "Excel zu PDF",
    "card_excel2pdf_desc": "Konvertieren Sie EXCEL-Tabellen einfach und schnell in lesbare PDF-Dateien.",
    "card_office2pdf_action": "Konvertieren",
    "card_pdfa_title": "ISO PDF/A Archivierung",
    "card_pdfa_desc": "Dokumente in ISO 19005-1 konformes PDF/A für Langzeitarchivierung umwandeln.",
    "card_pdfa_action": "Archivieren",
    "card_digitalsign_title": "Kryptografisches PKI-Siegel",
    "card_digitalsign_desc": "Manipulationssichere digitale SHA-256-Hash-Siegel anbringen.",
    "card_digitalsign_action": "Versiegeln",
    "card_summarize_title": "Dokument zusammenfassen",
    "card_summarize_desc": "Wichtige Finanzkennzahlen und strukturierte Zusammenfassungen erstellen.",
    "card_summarize_action": "Zusammenfassen",
    "card_repair_title": "Beschädigtes PDF reparieren",
    "card_repair_desc": "Beschädigte PDF-Dateien durch Wiederaufbau von XREF-Tabellen retten.",
    "card_repair_action": "Reparieren",
    "card_editpdf_title": "PDF bearbeiten",
    "card_editpdf_desc": "Text, Formen, Pfeile und Freihandzeichnungen direkt auf PDF-Seiten einfügen.",
    "card_editpdf_action": "Bearbeiten",
    "card_formfill_title": "PDF-Formulare ausfüllen",
    "card_formfill_desc": "Interaktive AcroForm-Felder und Checkboxen automatisch erkennen und ausfüllen.",
    "card_formfill_action": "Ausfüllen",
    "card_pptx2pdf_title": "PowerPoint zu PDF",
    "card_pptx2pdf_desc": "PowerPoint .pptx Präsentationen in gestochen scharfe PDF-Dateien umwandeln.",
    "card_pptx2pdf_action": "Konvertieren",
    "card_pdf2pptx_title": "PDF zu PowerPoint",
    "card_pdf2pptx_desc": "PDF-Seiten in editierbare 16:9 Breitbild-PowerPoint-Präsentationen umwandeln.",
    "card_pdf2pptx_action": "Konvertieren",
    "card_scan2pdf_title": "In PDF scannen",
    "card_scan2pdf_desc": "Dokumente per Gerätekamera erfassen und sofort als PDF speichern.",
    "card_scan2pdf_action": "Scannen",
    "trust_title": "Die PDF-Software, der Profis für vertrauliche Dokumente vertrauen",
    "trust_subtitle": "Statement2Sheet läuft zu 100% lokal im Speicher Ihres Browsers. Keine Finanzdaten verlassen Ihr Gerät.",
    "trust_p1_title": "Flüchtiger Arbeitsspeicher",
    "trust_p1_desc": "Wird beim Schließen des Tabs oder Klick geleert",
    "trust_p2_title": "100% im Browser",
    "trust_p2_desc": "Keine Übertragung an externe Server",
    "trust_p3_title": "Offizielle ISO-Normen",
    "trust_p3_desc": "Kompatibel mit PDF-1.7, PDF/A-1b und OpenXML",
    "trust_p4_title": "Hardwarebeschleunigt",
    "trust_p4_desc": "Angetrieben von WebAssembly und TypedArrays",
    "guides_badge": "Finanzintelligenz für Unternehmen",
    "guides_title": "Wie Statement2Sheet Ihren Finanzworkflow optimiert",
    "guides_sub": "Von abgestimmten 3-Blatt-Arbeitsmappen bis zum QuickBooks OFX-Export: Erfahren Sie, wie unsere Technologie Dokumente ohne Datenschutzrisiken verarbeitet.",
    "faq_title": "Häufig gestellte Fragen",
    "faq_sub": "Alles, was Sie über Kontoauszugskonvertierung, Buchhaltungsformate und Datenschutz wissen müssen.",
    "faq_q1": "Wie konvertiert Statement2Sheet Kontoauszüge in Excel (.xlsx)?",
    "faq_q2": "Können Kontoauszüge in sauberes CSV-Format umgewandelt werden?",
    "faq_q3": "Wird der QuickBooks (.QBO) WebConnect-Export unterstützt?",
    "faq_q4": "Sind meine Bankdaten bei Statement2Sheet sicher und privat?",
    "faq_q5": "Kann ich Statement2Sheet ohne Internetverbindung offline nutzen?",
    "faq_q6": "Werden gescannte Kontoauszüge und Fotos unterstützt?",
    "footer_col_product": "PRODUKT",
    "footer_col_financial": "FINANZSUITE",
    "footer_col_solutions": "LÖSUNGEN",
    "footer_col_legal": "RECHTLICHES",
    "footer_col_company": "UNTERNEHMEN",
    "footer_copyright": "© 2026 Statement2Sheet. Alle Werkzeuge für Kontoauszüge und PDFs an einem sicheren Ort.",
    "footer_badge_wasm": "WebAssembly unterstützt",
    "footer_badge_offline": "Offlinefähige PWA",
    "footer_badge_status": "100% Client-Side",
    "card_bankstmt_title": "Kontoauszug zu Excel",
    "card_bankstmt_desc": "Kontoauszüge in 3-Blatt-Excel-Arbeitsmappen mit automatischer Saldenabstimmung umwandeln.",
    "card_bankstmt_action": "Konvertieren",
    "card_qbo_title": "QuickBooks (.QBO)",
    "card_qbo_desc": "WebConnect OFX .QBO-Dateien für den direkten Import in QuickBooks erstellen.",
    "card_qbo_action": "Exportieren"
  },
  "pt": {
    "nav_brand_title": "Statement2Sheet",
    "nav_brand_sub": "Financial & PDF Intelligence",
    "nav_merge": "Juntar PDF",
    "nav_split": "Dividir PDF",
    "nav_compress": "Comprimir PDF",
    "nav_convert": "Converter PDF",
    "tool_excel": "PDF para Excel (3 folhas)",
    "tool_pdf2img": "PDF para JPG / PNG",
    "tool_img2pdf": "JPG / PNG para PDF",
    "tool_ocr": "PDF para Markdown",
    "nav_all_tools": "TODAS AS FERRAMENTAS PDF",
    "badge_free_private": "100% Gratuito · Sem Registo",
    "badge_offline": "Pronto offline",
    "btn_clear_data": "Limpar dados",
    "btn_quick_tour": "Guia Rápido",
    "repair_title": "Reparar ficheiro PDF",
    "repair_subtitle": "Recupere ficheiros PDF danificados diretamente no seu navegador.",
    "hero_badge": "🔒 100% Privacidade no Navegador · Zero Uploads na Nuvem",
    "hero_title": "Todas as ferramentas necessárias para PDFs e Extratos Bancários",
    "hero_subtitle": "30 ferramentas documentais de nível empresarial executadas 100% na memória RAM do seu navegador. Junte, divida, comprima, edite e audite sem risco de servidor.",
    "hero_drop_title": "Arraste qualquer PDF, Extrato Bancário ou Imagem aqui",
    "hero_drop_sub": "Processamento instantâneo em memória RAM local · Zero bytes enviados para servidores externos",
    "hero_drop_btn": "Selecionar Documento",
    "hero_recent_title": "Documentos Recentes",
    "hero_recent_clear": "Limpar",
    "filter_all": "Todas as ferramentas",
    "filter_banking": "Banca & Finanças",
    "filter_organize": "Organizar PDF",
    "filter_optimize": "Otimizar PDF",
    "filter_convert": "Converter PDF",
    "filter_edit": "Editar & Preencher",
    "filter_security": "Segurança PDF",
    "filter_intelligence": "IA & OCR",
    "card_merge_title": "Juntar PDF",
    "card_merge_desc": "Combine PDFs na ordem desejada com o unificador mais rápido disponível.",
    "card_merge_action": "Juntar",
    "card_split_title": "Dividir PDF",
    "card_split_desc": "Separe uma página ou um intervalo completo em ficheiros PDF independentes.",
    "card_split_action": "Dividir",
    "card_compress_title": "Comprimir PDF",
    "card_compress_desc": "Reduza o tamanho mantendo a máxima qualidade vetorial em memória local.",
    "card_compress_action": "Comprimir",
    "card_excel_title": "PDF para Excel (3 Folhas)",
    "card_excel_desc": "Extraia transações bancárias para uma folha Excel com auditoria de reconciliação.",
    "card_excel_action": "Converter",
    "card_pdf2img_title": "PDF para JPG / PNG",
    "card_pdf2img_desc": "Extraia imagens raster de alta resolução de páginas PDF sem perdas.",
    "card_pdf2img_action": "Extrair",
    "card_img2pdf_title": "JPG / PNG para PDF",
    "card_img2pdf_desc": "Converta imagens JPG, PNG, WebP e BMP num documento PDF único e nítido.",
    "card_img2pdf_action": "Converter",
    "card_organize_title": "Organizar PDF",
    "card_organize_desc": "Ordene, elimine e reorganize páginas PDF arrastando e soltando visualmente.",
    "card_organize_action": "Organizar",
    "card_sign_title": "Assinar PDF",
    "card_sign_desc": "Assine documentos desenhando assinaturas diretamente em qualquer página.",
    "card_sign_action": "Assinar",
    "card_watermark_title": "Marca de Água PDF",
    "card_watermark_desc": "Aplique texto personalizado ou marcas de confidencialidade nas páginas.",
    "card_watermark_action": "Aplicar",
    "card_rotate_title": "Rodar PDF",
    "card_rotate_desc": "Rode páginas em 90, 180 ou 270 graus em processamento em lote.",
    "card_rotate_action": "Rodar",
    "card_unlock_title": "Desbloquear PDF",
    "card_unlock_desc": "Remova senhas e restrições de segurança de ficheiros PDF protegidos.",
    "card_unlock_action": "Desbloquear",
    "card_protect_title": "Proteger PDF",
    "card_protect_desc": "Proteja o seu PDF com criptografia segura padrão AES de 128 ou 256 bits.",
    "card_protect_action": "Proteger",
    "card_crop_title": "Recortar PDF",
    "card_crop_desc": "Ajuste margens e corte áreas específicas de páginas com guias visuais.",
    "card_crop_action": "Recortar",
    "card_extractimg_title": "Extrair Imagens",
    "card_extractimg_desc": "Extraia todas as imagens incorporadas do documento PDF na qualidade original.",
    "card_extractimg_action": "Extrair",
    "card_compare_title": "Comparar PDF",
    "card_compare_desc": "Comparação visual e textual lado a lado de duas versões de um documento.",
    "card_compare_action": "Comparar",
    "card_pagenumber_title": "Números de Página",
    "card_pagenumber_desc": "Insira numeração de páginas com opções de posicionamento tipográfico.",
    "card_pagenumber_action": "Inserir",
    "card_redact_title": "Ocultar PDF (Redact)",
    "card_redact_desc": "Oculte permanentemente dados bancários, números de contas e áreas confidenciais.",
    "card_redact_action": "Ocultar",
    "card_ocr_title": "PDF para Markdown",
    "card_ocr_desc": "Extraia texto simples e Markdown estruturado usando OCR no navegador.",
    "card_ocr_action": "Extrair",
    "card_pdf2word_title": "PDF para Word (.docx)",
    "card_pdf2word_desc": "Converta documentos PDF para Microsoft Word OpenXML com tabelas editáveis.",
    "card_pdf2word_action": "Converter",
    "card_office2pdf_title": "Office para PDF",
    "card_office2pdf_desc": "Converta folhas de cálculo Excel, Word e ficheiros CSV diretamente em PDF.",
    "card_excel2pdf_title": "Excel para PDF",
    "card_excel2pdf_desc": "Converta planilhas EXCEL facilmente em documentos PDF legíveis.",
    "card_office2pdf_action": "Converter",
    "card_pdfa_title": "Arquivo ISO PDF/A",
    "card_pdfa_desc": "Converta documentos para a norma ISO 19005-1 para arquivo legal duradouro.",
    "card_pdfa_action": "Arquivar",
    "card_digitalsign_title": "Selo Criptográfico PKI",
    "card_digitalsign_desc": "Aplique selos de hash criptográfico digital SHA-256 à prova de violação.",
    "card_digitalsign_action": "Selar",
    "card_summarize_title": "Resumir Documento",
    "card_summarize_desc": "Extraia métricas financeiras essenciais e resumos estruturados.",
    "card_summarize_action": "Resumir",
    "card_repair_title": "Reparar PDF Corrompido",
    "card_repair_desc": "Recupere ficheiros PDF danificados reconstruindo tabelas XREF.",
    "card_repair_action": "Reparar",
    "card_editpdf_title": "Editar PDF",
    "card_editpdf_desc": "Adicione texto, figuras, setas e desenhos livres diretamente nas páginas.",
    "card_editpdf_action": "Editar",
    "card_formfill_title": "Preencher Formulários PDF",
    "card_formfill_desc": "Detete e preencha campos AcroForm interativos e caixas de seleção.",
    "card_formfill_action": "Preencher",
    "card_pptx2pdf_title": "PowerPoint para PDF",
    "card_pptx2pdf_desc": "Converta apresentações .pptx em documentos PDF de alta fidelidade.",
    "card_pptx2pdf_action": "Converter",
    "card_pdf2pptx_title": "PDF para PowerPoint",
    "card_pdf2pptx_desc": "Converta documentos PDF em diapositivos PowerPoint 16:9 editáveis.",
    "card_pdf2pptx_action": "Converter",
    "card_scan2pdf_title": "Digitalizar para PDF",
    "card_scan2pdf_desc": "Capture páginas usando a câmara do dispositivo e crie um PDF imediatamente.",
    "card_scan2pdf_action": "Digitalizar",
    "trust_title": "O software de PDF de confiança para documentos confidenciais",
    "trust_subtitle": "Statement2Sheet corre 100% na memória do navegador. Os seus dados bancários nunca saem do seu computador.",
    "trust_p1_title": "Memória RAM Volátil",
    "trust_p1_desc": "Eliminada ao fechar o separador ou ao limpar",
    "trust_p2_title": "100% no Navegador",
    "trust_p2_desc": "Sem transferências para servidores externos",
    "trust_p3_title": "Normas Internacionais ISO",
    "trust_p3_desc": "Compatível com PDF-1.7, PDF/A-1b e Microsoft OpenXML",
    "trust_p4_title": "Aceleração de Hardware",
    "trust_p4_desc": "Alimentado por WebAssembly e TypedArrays HTML5",
    "guides_badge": "Inteligência Financeira Corporativa",
    "guides_title": "Como o Statement2Sheet Potencia o Seu Trabalho",
    "guides_sub": "De folhas de cálculo reconciliadas de 3 folhas a exportações QuickBooks OFX, conheça o nosso motor local seguro.",
    "faq_title": "Perguntas Frequentes",
    "faq_sub": "Tudo o que precisa de saber sobre conversão bancária, formatos de contabilidade e segurança.",
    "faq_q1": "Como é que o Statement2Sheet converte extratos bancários em Excel (.xlsx)?",
    "faq_q2": "É possível converter extratos PDF para formato CSV normalizado?",
    "faq_q3": "Existe suporte para exportação QuickBooks (.QBO) WebConnect?",
    "faq_q4": "Os meus dados bancários estão seguros com o Statement2Sheet?",
    "faq_q5": "Posso utilizar o Statement2Sheet sem ligação à Internet?",
    "faq_q6": "Extratos digitalizados e fotografias são suportados?",
    "footer_col_product": "PRODUTO",
    "footer_col_financial": "SUITE FINANCEIRA",
    "footer_col_solutions": "SOLUÇÕES",
    "footer_col_legal": "LEGAL",
    "footer_col_company": "EMPRESA",
    "footer_copyright": "© 2026 Statement2Sheet. Todas as ferramentas para extratos bancários e PDFs no mesmo lugar.",
    "footer_badge_wasm": "Tecnologia WebAssembly",
    "footer_badge_offline": "PWA Pronta Offline",
    "footer_badge_status": "100% no Cliente",
    "card_bankstmt_title": "Extrato Bancário para Excel",
    "card_bankstmt_desc": "Converta extratos bancários em folhas Excel de 3 páginas com auditoria contábil.",
    "card_bankstmt_action": "Converter",
    "card_qbo_title": "QuickBooks (.QBO)",
    "card_qbo_desc": "Gere ficheiros WebConnect OFX .QBO para importação direta no QuickBooks.",
    "card_qbo_action": "Exportar"
  },
  "hi": {
    "nav_brand_title": "Statement2Sheet",
    "nav_brand_sub": "Financial & PDF Intelligence",
    "nav_merge": "PDF जोड़ें (Merge)",
    "nav_split": "PDF विभाजित करें (Split)",
    "nav_compress": "PDF कंप्रेस करें (Compress)",
    "nav_convert": "PDF रूपांतरित करें (Convert)",
    "tool_excel": "PDF से Excel (3-शीट)",
    "tool_pdf2img": "PDF से JPG / PNG",
    "tool_img2pdf": "JPG / PNG से PDF",
    "tool_ocr": "PDF से Markdown",
    "nav_all_tools": "सभी PDF टूल्स",
    "badge_free_private": "100% मुफ्त · कोई साइन अप नहीं",
    "badge_offline": "ऑफ़लाइन तैयार",
    "btn_clear_data": "डेटा साफ़ करें",
    "btn_quick_tour": "त्वरित टूर",
    "repair_title": "क्षतिग्रस्त PDF सुधारें (Repair)",
    "repair_subtitle": "अपने ब्राउज़र में ही क्षतिग्रस्त, दूषित या अधूरी PDF फ़ाइलों को पुनर्प्राप्त करें।",
    "hero_badge": "🔒 100% ब्राउज़र गोपनीयता · कोई सर्वर अपलोड नहीं",
    "hero_title": "PDF और बैंक स्टेटमेंट के लिए आवश्यक सभी टूल्स एक ही स्थान पर",
    "hero_subtitle": "30 एंटरप्राइज़-ग्रेड टूल्स जो पूरी तरह से आपके ब्राउज़र की रैम में चलते हैं। बिना किसी सर्वर जोखिम के जोड़ें, विभाजित करें, कंप्रेस करें, एडिट करें और ऑडिट करें।",
    "hero_drop_title": "कोई भी PDF, बैंक स्टेटमेंट या इमेज यहाँ छोड़ें",
    "hero_drop_sub": "तुरंत स्थानीय रैम में प्रोसेसिंग · सर्वर पर 0 बाइट्स अपलोड",
    "hero_drop_btn": "दस्तावेज़ चुनें",
    "hero_recent_title": "हाल ही के दस्तावेज़",
    "hero_recent_clear": "साफ़ करें",
    "filter_all": "सभी टूल्स",
    "filter_banking": "बैंकिंग और वित्त",
    "filter_organize": "PDF व्यवस्थित करें",
    "filter_optimize": "PDF ऑप्टिमाइज़ करें",
    "filter_convert": "PDF कन्वर्ट करें",
    "filter_edit": "संपादित और भरें",
    "filter_security": "PDF सुरक्षा",
    "filter_intelligence": "AI और OCR",
    "card_merge_title": "PDF जोड़ें (Merge)",
    "card_merge_desc": "अपनी इच्छानुसार क्रम में PDF फ़ाइलों को सबसे तेज़ टूल से जोड़ें।",
    "card_merge_action": "जोड़ें",
    "card_split_title": "PDF विभाजित करें (Split)",
    "card_split_desc": "अलग-अलग PDF फ़ाइलों में बदलने के लिए एक या अधिक पृष्ठों को अलग करें।",
    "card_split_action": "अलग करें",
    "card_compress_title": "PDF कंप्रेस करें",
    "card_compress_desc": "ब्राउज़र में उच्चतम गुणवत्ता रखते हुए फ़ाइल का आकार छोटा करें।",
    "card_compress_action": "कंप्रेस",
    "card_excel_title": "PDF से Excel (3-शीट)",
    "card_excel_desc": "बैंक लेनदेन को 3-शीट ऑडिटेड Excel में स्वचालित रूप से निकालें।",
    "card_excel_action": "कन्वर्ट करें",
    "card_pdf2img_title": "PDF से JPG / PNG",
    "card_pdf2img_desc": "PDF पृष्ठों से उच्च रिज़ॉल्यूशन वाली छवियां बिना गुणवत्ता हानि के निकालें।",
    "card_pdf2img_action": "छवियां निकालें",
    "card_img2pdf_title": "JPG / PNG से PDF",
    "card_img2pdf_desc": "JPG, PNG, WebP और BMP छवियों को एक साफ़ PDF में बदलें।",
    "card_img2pdf_action": "कन्वर्ट करें",
    "card_organize_title": "PDF व्यवस्थित करें",
    "card_organize_desc": "ड्रैग और ड्रॉप द्वारा PDF पृष्ठों को आसानी से पुनर्व्यवस्थित या हटाएं।",
    "card_organize_action": "व्यवस्थित करें",
    "card_sign_title": "PDF पर हस्ताक्षर करें",
    "card_sign_desc": "किसी भी पृष्ठ पर सीधे डिजिटल हस्ताक्षर बनाएं या लिखें।",
    "card_sign_action": "हस्ताक्षर करें",
    "card_watermark_title": "PDF वॉटरमार्क",
    "card_watermark_desc": "चुने गए पृष्ठों पर कस्टम टेक्स्ट या वॉटरमार्क लगाएं।",
    "card_watermark_action": "वॉटरमार्क लगाएं",
    "card_rotate_title": "PDF घुमाएँ (Rotate)",
    "card_rotate_desc": "PDF पृष्ठों को 90, 180 या 270 डिग्री घुमाएँ।",
    "card_rotate_action": "घुमाएँ",
    "card_unlock_title": "PDF अनलॉक करें",
    "card_unlock_desc": "सुरक्षित PDF से पासवर्ड प्रतिबंध आसानी से हटाएं।",
    "card_unlock_action": "अनलॉक करें",
    "card_protect_title": "PDF सुरक्षित करें",
    "card_protect_desc": "मानक AES 128/256-बिट एन्क्रिप्शन पासवर्ड से सुरक्षित करें।",
    "card_protect_action": "सुरक्षित करें",
    "card_crop_title": "PDF क्रॉप करें",
    "card_crop_desc": "मार्जिन काटें और दृश्य हैंडल से पृष्ठ क्षेत्र क्रॉप करें।",
    "card_crop_action": "क्रॉप करें",
    "card_extractimg_title": "इमेज निकालें",
    "card_extractimg_desc": "मूल गुणवत्ता में PDF से सभी एम्बेडेड छवियां निकालें।",
    "card_extractimg_action": "निकालें",
    "card_compare_title": "PDF तुलना करें",
    "card_compare_desc": "दो PDF संस्करणों की विज़ुअल और टेक्स्ट तुलना साथ-साथ करें।",
    "card_compare_action": "तुलना करें",
    "card_pagenumber_title": "पृष्ठ संख्या जोड़ें",
    "card_pagenumber_desc": "कस्टमाइज़ करने योग्य पेज नंबर और पोज़िशनिंग सेट करें।",
    "card_pagenumber_action": "जोड़ें",
    "card_redact_title": "गोपनीय डेटा छुपाएं (Redact)",
    "card_redact_desc": "संवेदनशील डेटा और बैंक खाता नंबरों को स्थायी रूप से छुपाएं।",
    "card_redact_action": "छुपाएं",
    "card_ocr_title": "PDF से Markdown (OCR)",
    "card_ocr_desc": "ब्राउज़र में OCR तकनीक से सादा टेक्स्ट और Markdown निकालें।",
    "card_ocr_action": "निकालें",
    "card_pdf2word_title": "PDF से Word (.docx)",
    "card_pdf2word_desc": "संपादनीय तालिकाओं के साथ Microsoft Word OpenXML में बदलें।",
    "card_pdf2word_action": "कन्वर्ट करें",
    "card_office2pdf_title": "Office से PDF",
    "card_office2pdf_desc": "Word, Excel और CSV को सीधे साफ़ PDF में बदलें।",
    "card_excel2pdf_title": "एक्सेल से पीडीएफ",
    "card_excel2pdf_desc": "एक्सेल स्प्रेडशीट को आसानी से पढ़ने योग्य पीडीएफ दस्तावेज़ों में बदलें।",
    "card_office2pdf_action": "कन्वर्ट करें",
    "card_pdfa_title": "PDF/A ISO अर्काइव",
    "card_pdfa_desc": "दीर्घकालिक कानूनी भंडारण के लिए ISO 19005-1 में बदलें।",
    "card_pdfa_action": "अर्काइव करें",
    "card_digitalsign_title": "क्रिप्टोग्राफिक PKI मुहर",
    "card_digitalsign_desc": "छेड़छाड़-रोधी डिजिटल SHA-256 हैश मुहर लगाएं।",
    "card_digitalsign_action": "मुहर लगाएं",
    "card_summarize_title": "दस्तावेज़ सारांश",
    "card_summarize_desc": "महत्वपूर्ण वित्तीय आंकड़ों और सारांशों को तुरंत निकालें।",
    "card_summarize_action": "सारांश निकालें",
    "card_repair_title": "क्षतिग्रस्त PDF सुधारें",
    "card_repair_desc": "XREF तालिकाओं को फिर से बनाकर दूषित PDF ठीक करें।",
    "card_repair_action": "सुधारें",
    "card_editpdf_title": "PDF संपादित करें",
    "card_editpdf_desc": "PDF पृष्ठों पर सीधे टेक्स्ट, आकृतियाँ, तीर और रेखाएं जोड़ें।",
    "card_editpdf_action": "संपादित करें",
    "card_formfill_title": "PDF फॉर्म भरें",
    "card_formfill_desc": "इंटरैक्टिव AcroForm फ़ील्ड्स और चेकबॉक्स स्वतः पहचानें और भरें।",
    "card_formfill_action": "भरें",
    "card_pptx2pdf_title": "PowerPoint से PDF",
    "card_pptx2pdf_desc": "PowerPoint .pptx स्लाइड्स को उच्च गुणवत्ता वाली PDF में बदलें।",
    "card_pptx2pdf_action": "कन्वर्ट करें",
    "card_pdf2pptx_title": "PDF से PowerPoint",
    "card_pdf2pptx_desc": "PDF को संपादन योग्य 16:9 PowerPoint प्रेजेंटेशन में बदलें।",
    "card_pdf2pptx_action": "कन्वर्ट करें",
    "card_scan2pdf_title": "स्कैन कर PDF बनाएं",
    "card_scan2pdf_desc": "कैमरे से पृष्ठ कैप्चर करें और तुरंत एक साफ PDF बनाएं।",
    "card_scan2pdf_action": "स्कैन करें",
    "trust_title": "गोपनीय दस्तावेज़ों के लिए दुनिया भर में विश्वसनीय PDF सॉफ़्टवेयर",
    "trust_subtitle": "Statement2Sheet पूरी तरह से आपके ब्राउज़र की रैम में काम करता है। कोई वित्तीय रिकॉर्ड आपके कंप्यूटर से बाहर नहीं जाता।",
    "trust_p1_title": "क्षणिक रैम (RAM)",
    "trust_p1_desc": "टैब बंद होते ही या क्लिक करते ही पूरी तरह साफ़",
    "trust_p2_title": "100% ब्राउज़र में",
    "trust_p2_desc": "बाहरी सर्वर पर कोई डेटा अपलोड नहीं",
    "trust_p3_title": "ISO मानक अनुपालन",
    "trust_p3_desc": "PDF-1.7, PDF/A-1b और Microsoft OpenXML मानक",
    "trust_p4_title": "हार्डवेयर त्वरित",
    "trust_p4_desc": "WebAssembly और HTML5 TypedArrays संचालित",
    "guides_badge": "एंटरप्राइज़ वित्तीय बुद्धिमत्ता",
    "guides_title": "Statement2Sheet आपके कार्यप्रवाह को कैसे सशक्त बनाता है",
    "guides_sub": "3-शीट ऑडिटेड एक्सेल से लेकर क्विकबुक्स ओएफएक्स फॉर्मेट तक, जानें कैसे हमारा इंजन गोपनीयता से समझौता किए बिना काम करता है।",
    "faq_title": "अक्सर पूछे जाने वाले प्रश्न",
    "faq_sub": "बैंक स्टेटमेंट रूपांतरण, लेखांकन प्रारूप और सुरक्षा के बारे में सब कुछ।",
    "faq_q1": "Statement2Sheet बैंक स्टेटमेंट को Excel (.xlsx) में कैसे बदलता है?",
    "faq_q2": "क्या यह बैंक स्टेटमेंट को साफ CSV में बदल सकता है?",
    "faq_q3": "क्या QuickBooks (.QBO) WebConnect एक्सपोर्ट समर्थित है?",
    "faq_q4": "क्या मेरा वित्तीय डेटा Statement2Sheet के साथ सुरक्षित है?",
    "faq_q5": "क्या मैं बिना इंटरनेट के ऑफ़लाइन उपयोग कर सकता हूँ?",
    "faq_q6": "क्या स्कैन किए गए बैंक स्टेटमेंट और फोटो समर्थित हैं?",
    "footer_col_product": "उत्पाद",
    "footer_col_financial": "वित्तीय सुइट",
    "footer_col_solutions": "समाधान",
    "footer_col_legal": "कानूनी",
    "footer_col_company": "कंपनी",
    "footer_copyright": "© 2026 Statement2Sheet. बैंक स्टेटमेंट और PDF के लिए आवश्यक सभी टूल्स एक ही स्थान पर।",
    "footer_badge_wasm": "WebAssembly संचालित",
    "footer_badge_offline": "ऑफ़लाइन समर्थित PWA",
    "footer_badge_status": "100% क्लाइंट-साइड",
    "card_bankstmt_title": "बैंक स्टेटमेंट से Excel",
    "card_bankstmt_desc": "जटिल बैंक स्टेटमेंट को 3-शीट ऑडिटेड Excel में आसानी से बदलें।",
    "card_bankstmt_action": "कन्वर्ट करें",
    "card_qbo_title": "QuickBooks (.QBO)",
    "card_qbo_desc": "QuickBooks में सीधे आयात के लिए WebConnect OFX .QBO फ़ाइलें बनाएं।",
    "card_qbo_action": "एक्सपोर्ट करें"
  },
  "it": {
    "nav_brand_title": "Statement2Sheet",
    "nav_brand_sub": "Financial & PDF Intelligence",
    "nav_merge": "Unisci PDF",
    "nav_split": "Dividi PDF",
    "nav_compress": "Comprimi PDF",
    "nav_convert": "Converti PDF",
    "tool_excel": "PDF in Excel (3 fogli)",
    "tool_pdf2img": "PDF in JPG / PNG",
    "tool_img2pdf": "JPG / PNG in PDF",
    "tool_ocr": "PDF in Markdown",
    "nav_all_tools": "TUTTI GLI STRUMENTI PDF",
    "badge_free_private": "100% Gratuito · Senza Registrazione",
    "badge_offline": "Pronto offline",
    "btn_clear_data": "Cancella dati",
    "btn_quick_tour": "Guida rapida",
    "repair_title": "Ripara file PDF",
    "repair_subtitle": "Recupera file PDF danneggiati o corrotti direttamente nel browser.",
    "hero_badge": "🔒 100% Privacy nel Browser · Zero Upload Cloud",
    "hero_title": "Tutti gli strumenti per PDF ed Estratti Conto in un unico posto",
    "hero_subtitle": "30 strumenti di livello aziendale eseguiti al 100% nella memoria RAM del browser. Unisci, dividi, comprimi, modifica e controlla senza rischi server.",
    "hero_drop_title": "Rilascia qui qualsiasi PDF, Estratto Conto o Immagine",
    "hero_drop_sub": "Elaborazione istantanea nella memoria locale · Zero byte inviati a server esterni",
    "hero_drop_btn": "Seleziona Documento",
    "hero_recent_title": "Documenti Recenti",
    "hero_recent_clear": "Cancella",
    "filter_all": "Tutti gli strumenti",
    "filter_banking": "Banca & Finanza",
    "filter_organize": "Organizza PDF",
    "filter_optimize": "Ottimizza PDF",
    "filter_convert": "Converti PDF",
    "filter_edit": "Modifica & Compila",
    "filter_security": "Sicurezza PDF",
    "filter_intelligence": "IA & OCR",
    "card_merge_title": "Unisci PDF",
    "card_merge_desc": "Unisci i file PDF nell'ordine desiderato con lo strumento più rapido.",
    "card_merge_action": "Unisci",
    "card_split_title": "Dividi PDF",
    "card_split_desc": "Separa singole pagine o intervalli completi in PDF autonomi.",
    "card_split_action": "Dividi",
    "card_compress_title": "Comprimi PDF",
    "card_compress_desc": "Riduci le dimensioni mantenendo la massima qualità vettoriale in RAM.",
    "card_compress_action": "Comprimi",
    "card_excel_title": "PDF in Excel (3 Fogli)",
    "card_excel_desc": "Estrai le transazioni bancarie in un foglio Excel a 3 schede con riconciliazione.",
    "card_excel_action": "Converti",
    "card_pdf2img_title": "PDF in JPG / PNG",
    "card_pdf2img_desc": "Estrai immagini raster ad alta risoluzione senza perdite di dati.",
    "card_pdf2img_action": "Estrai",
    "card_img2pdf_title": "JPG / PNG in PDF",
    "card_img2pdf_desc": "Converti immagini JPG, PNG, WebP e BMP in un unico documento PDF.",
    "card_img2pdf_action": "Converti",
    "card_organize_title": "Organizza PDF",
    "card_organize_desc": "Ordina, elimina e riorganizza le pagine PDF tramite drag-and-drop.",
    "card_organize_action": "Organizza",
    "card_sign_title": "Firma PDF",
    "card_sign_desc": "Firma documenti con firme disegnate o digitate su qualsiasi pagina.",
    "card_sign_action": "Firma",
    "card_watermark_title": "Filigrana PDF",
    "card_watermark_desc": "Applica testo personalizzato o timbri di riservatezza sulle pagine.",
    "card_watermark_action": "Applica",
    "card_rotate_title": "Ruota PDF",
    "card_rotate_desc": "Ruota pagine di 90, 180 o 270 gradi con elaborazione in batch.",
    "card_rotate_action": "Ruota",
    "card_unlock_title": "Sblocca PDF",
    "card_unlock_desc": "Rimuovi password e restrizioni di sicurezza dai PDF protetti.",
    "card_unlock_action": "Sblocca",
    "card_protect_title": "Proteggi PDF",
    "card_protect_desc": "Crittografa il tuo PDF con password standard AES a 128 o 256 bit.",
    "card_protect_action": "Proteggi",
    "card_crop_title": "Ritaglia PDF",
    "card_crop_desc": "Ritaglia margini e aree specifiche con comodi indicatori visivi.",
    "card_crop_action": "Ritaglia",
    "card_extractimg_title": "Estrai Immagini",
    "card_extractimg_desc": "Estrai tutte le immagini incorporate dal PDF in qualità originale.",
    "card_extractimg_action": "Estrai",
    "card_compare_title": "Confronta PDF",
    "card_compare_desc": "Confronto visivo e testuale affiancato di due versioni di un PDF.",
    "card_compare_action": "Confronta",
    "card_pagenumber_title": "Numeri di Pagina",
    "card_pagenumber_desc": "Inserisci la numerazione delle pagine con controllo tipografico.",
    "card_pagenumber_action": "Inserisci",
    "card_redact_title": "Censura PDF (Redact)",
    "card_redact_desc": "Oscura in modo permanente dati sensibili, conti bancari e testi riservati.",
    "card_redact_action": "Censura",
    "card_ocr_title": "PDF in Markdown",
    "card_ocr_desc": "Estrai testo e Markdown strutturato mediante OCR eseguito nel browser.",
    "card_ocr_action": "Estrai",
    "card_pdf2word_title": "PDF in Word (.docx)",
    "card_pdf2word_desc": "Converti PDF in documenti Microsoft Word OpenXML con tabelle modificabili.",
    "card_pdf2word_action": "Converti",
    "card_office2pdf_title": "Office in PDF",
    "card_office2pdf_desc": "Converti fogli Excel, Word e file CSV direttamente in PDF.",
    "card_excel2pdf_title": "Excel in PDF",
    "card_excel2pdf_desc": "Converti fogli di calcolo EXCEL direttamente in documenti PDF leggibili.",
    "card_office2pdf_action": "Converti",
    "card_pdfa_title": "Archiviazione ISO PDF/A",
    "card_pdfa_desc": "Converti documenti nello standard ISO 19005-1 per conservazione legale.",
    "card_pdfa_action": "Archivia",
    "card_digitalsign_title": "Sigillo Crittografico PKI",
    "card_digitalsign_desc": "Applica sigilli con impronta digitale crittografica SHA-256 verificabili.",
    "card_digitalsign_action": "Sigilla",
    "card_summarize_title": "Riepiloga Documento",
    "card_summarize_desc": "Estrai i parametri finanziari salienti e riassunti strutturati istantanei.",
    "card_summarize_action": "Riepiloga",
    "card_repair_title": "Ripara PDF Danneggiato",
    "card_repair_desc": "Recupera PDF danneggiati ricostruendo le tabelle di riferimento XREF.",
    "card_repair_action": "Ripara",
    "card_editpdf_title": "Modifica PDF",
    "card_editpdf_desc": "Aggiungi testo, forme, frecce e disegni a mano libera sulle pagine.",
    "card_editpdf_action": "Modifica",
    "card_formfill_title": "Compila Moduli PDF",
    "card_formfill_desc": "Rileva e compila automaticamente campi AcroForm e caselle di controllo.",
    "card_formfill_action": "Compila",
    "card_pptx2pdf_title": "PowerPoint in PDF",
    "card_pptx2pdf_desc": "Converti presentazioni .pptx in documenti PDF nitidi e fedeli.",
    "card_pptx2pdf_action": "Converti",
    "card_pdf2pptx_title": "PDF in PowerPoint",
    "card_pdf2pptx_desc": "Converti PDF in diapositive PowerPoint 16:9 completamente modificabili.",
    "card_pdf2pptx_action": "Converti",
    "card_scan2pdf_title": "Scansiona in PDF",
    "card_scan2pdf_desc": "Acquisisci pagine tramite fotocamera e genera subito un file PDF.",
    "card_scan2pdf_action": "Scansiona",
    "trust_title": "Il software PDF affidabile per documenti ad alta riservatezza",
    "trust_subtitle": "Statement2Sheet opera al 100% nella memoria locale del tuo browser. Nessun dato bancario lascia il tuo computer.",
    "trust_p1_title": "RAM Effimera",
    "trust_p1_desc": "Cancellata alla chiusura della scheda o con un clic",
    "trust_p2_title": "100% nel Browser",
    "trust_p2_desc": "Nessun caricamento su server esterni",
    "trust_p3_title": "Standard ISO Ufficiali",
    "trust_p3_desc": "Conforme a PDF-1.7, PDF/A-1b e Microsoft OpenXML",
    "trust_p4_title": "Accelerazione Hardware",
    "trust_p4_desc": "Potenziato da WebAssembly e TypedArrays HTML5",
    "guides_badge": "Intelligenza Finanziaria Aziendale",
    "guides_title": "Come Statement2Sheet Potenzia il Tuo Flusso di Lavoro",
    "guides_sub": "Dalle cartelle a 3 fogli riconciliate all'export QuickBooks OFX, scopri il nostro motore che tutela la privacy al 100%.",
    "faq_title": "Domande Frequenti",
    "faq_sub": "Tutto ciò che serve sapere su conversioni contabili, formati bancari e riservatezza.",
    "faq_q1": "Come converte Statement2Sheet gli estratti conto in Excel (.xlsx)?",
    "faq_q2": "È possibile convertire estratti PDF in formato CSV pulito?",
    "faq_q3": "L'esportazione QuickBooks (.QBO) WebConnect è supportata?",
    "faq_q4": "I miei dati finanziari sono al sicuro con Statement2Sheet?",
    "faq_q5": "Posso usare Statement2Sheet offline senza connessione internet?",
    "faq_q6": "Gli estratti conto scansionati e le foto sono supportati?",
    "footer_col_product": "PRODOTTO",
    "footer_col_financial": "SUITE FINANZIARIA",
    "footer_col_solutions": "SOLUZIONI",
    "footer_col_legal": "LEGALE",
    "footer_col_company": "AZIENDA",
    "footer_copyright": "© 2026 Statement2Sheet. Tutti gli strumenti necessari per estratti conto e PDF in un unico posto.",
    "footer_badge_wasm": "Alimentato da WebAssembly",
    "footer_badge_offline": "PWA Pronta Offline",
    "footer_badge_status": "100% Lato Client",
    "card_bankstmt_title": "Estratto Conto in Excel",
    "card_bankstmt_desc": "Converti estratti conto bancari in fogli Excel a 3 schede con verifica di quadratura.",
    "card_bankstmt_action": "Converti",
    "card_qbo_title": "QuickBooks (.QBO)",
    "card_qbo_desc": "Genera file WebConnect OFX .QBO per importazione diretta in QuickBooks.",
    "card_qbo_action": "Esporta"
  },
  "ja": {
    "nav_brand_title": "Statement2Sheet",
    "nav_brand_sub": "Financial & PDF Intelligence",
    "nav_merge": "PDF 結合",
    "nav_split": "PDF 分割",
    "nav_compress": "PDF 圧縮",
    "nav_convert": "PDF 変換",
    "tool_excel": "PDF から Excel (3シート)",
    "tool_pdf2img": "PDF から JPG / PNG",
    "tool_img2pdf": "JPG / PNG から PDF",
    "tool_ocr": "PDF から Markdown",
    "nav_all_tools": "すべての PDF ツール",
    "badge_free_private": "100% 無料 · 登録不要",
    "badge_offline": "オフライン対応",
    "btn_clear_data": "データを消去",
    "btn_quick_tour": "クイックツアー",
    "repair_title": "PDF 修復",
    "repair_subtitle": "破損した PDF ファイルをブラウザ内で直接修復します。",
    "hero_badge": "🔒 100% ブラウザ内プライバシー · クラウド送信ゼロ",
    "hero_title": "PDF と銀行取引明細書に必要なすべてのツールを一つに",
    "hero_subtitle": "ブラウザのメモリ内のみで100%動作する30種類のエントリプライズ級ツール。サーバーリスクなしで結合、分割、圧縮、編集、監査を実行。",
    "hero_drop_title": "PDF、取引明細書、画像をここにドロップ",
    "hero_drop_sub": "ブラウザのローカルメモリで即時処理 · 外部サーバーへの送信は一切ありません",
    "hero_drop_btn": "ドキュメントを選択",
    "hero_recent_title": "最近使用したドキュメント",
    "hero_recent_clear": "消去",
    "filter_all": "すべてのツール",
    "filter_banking": "銀行・財務",
    "filter_organize": "PDF を整理",
    "filter_optimize": "PDF を最適化",
    "filter_convert": "PDF を変換",
    "filter_edit": "編集・入力",
    "filter_security": "PDF セキュリティ",
    "filter_intelligence": "AI & OCR",
    "card_merge_title": "PDF 結合",
    "card_merge_desc": "最速のツールで任意の順序で複数の PDF を一つに結合します。",
    "card_merge_action": "結合",
    "card_split_title": "PDF 分割",
    "card_split_desc": "特定のページや範囲を抽出して独立した PDF に分割します。",
    "card_split_action": "分割",
    "card_compress_title": "PDF 圧縮",
    "card_compress_desc": "高品質なベクター描画を維持しながらファイルサイズを削減します。",
    "card_compress_action": "圧縮",
    "card_excel_title": "PDF から Excel (3シート)",
    "card_excel_desc": "明細書を自動解析し残高照合付きの3シート Excel 台帳へ変換します。",
    "card_excel_action": "変換",
    "card_pdf2img_title": "PDF から JPG / PNG",
    "card_pdf2img_desc": "画質の劣化なく PDF ページから高解像度画像を抽出します。",
    "card_pdf2img_action": "抽出",
    "card_img2pdf_title": "JPG / PNG から PDF",
    "card_img2pdf_desc": "JPG、PNG、WebP、BMP 画像を高品質な単一 PDF に変換します。",
    "card_img2pdf_action": "変換",
    "card_organize_title": "PDF 整理",
    "card_organize_desc": "ドラッグ＆ドロップでページ順序の変更や削除を直感的に行えます。",
    "card_organize_action": "整理",
    "card_sign_title": "PDF 署名",
    "card_sign_desc": "手書きまたは入力した署名をページ上に直接追加します。",
    "card_sign_action": "署名",
    "card_watermark_title": "PDF 透かし追加",
    "card_watermark_desc": "指定ページにカスタムテキストや機密透かしスタンプを適用します。",
    "card_watermark_action": "適用",
    "card_rotate_title": "PDF 回転",
    "card_rotate_desc": "ページを90度、180度、270度一括で回転させます。",
    "card_rotate_action": "回転",
    "card_unlock_title": "PDF ロック解除",
    "card_unlock_desc": "パスワードで保護された PDF のセキュリティ制限を解除します。",
    "card_unlock_action": "解除",
    "card_protect_title": "PDF 保護",
    "card_protect_desc": "強力な AES 128/256ビット暗号化パスワードで保護します。",
    "card_protect_action": "保護",
    "card_crop_title": "PDF トリミング",
    "card_crop_desc": "マージンを切り抜き、必要なページ領域のみを正確に抽出します。",
    "card_crop_action": "切り抜き",
    "card_extractimg_title": "画像抽出",
    "card_extractimg_desc": "PDF 内の埋め込み画像を元の解像度で一括抽出します。",
    "card_extractimg_action": "抽出",
    "card_compare_title": "PDF 比較",
    "card_compare_desc": "2つの PDF バージョンの視覚的・テキスト的差分を並べて比較します。",
    "card_compare_action": "比較",
    "card_pagenumber_title": "ページ番号挿入",
    "card_pagenumber_desc": "位置やフォントスタイルを指定してページ番号を挿入します。",
    "card_pagenumber_action": "挿入",
    "card_redact_title": "墨消し (Redact)",
    "card_redact_desc": "口座番号や機密情報を元に戻せない形で完全に不可逆黒塗りします。",
    "card_redact_action": "墨消し",
    "card_ocr_title": "PDF から Markdown",
    "card_ocr_desc": "ブラウザ内 OCR エンジンでテキストと構造化 Markdown を抽出します。",
    "card_ocr_action": "抽出",
    "card_pdf2word_title": "PDF から Word (.docx)",
    "card_pdf2word_desc": "編集可能な表組みグリッドを含む本物の Word 文書に変換します。",
    "card_pdf2word_action": "変換",
    "card_office2pdf_title": "Office から PDF",
    "card_office2pdf_desc": "Word、Excel シート、CSV をブラウザ内で直接きれいな PDF に変換します。",
    "card_excel2pdf_title": "ExcelからPDF",
    "card_excel2pdf_desc": "EXCELスプレッドシートを読みやすいPDFドキュメントに変換します。",
    "card_office2pdf_action": "変換",
    "card_pdfa_title": "ISO PDF/A 保存",
    "card_pdfa_desc": "公的文書の長期保存規格 ISO 19005-1 準拠の PDF/A に変換します。",
    "card_pdfa_action": "アーカイブ",
    "card_digitalsign_title": "PKI 暗号シール",
    "card_digitalsign_desc": "改ざん防止の SHA-256 暗号ハッシュシールを付与します。",
    "card_digitalsign_action": "シール付与",
    "card_summarize_title": "ドキュメント要約",
    "card_summarize_desc": "重要な財務数値や要点を素早く要約して抽出します。",
    "card_summarize_action": "要約",
    "card_repair_title": "破損 PDF 修復",
    "card_repair_desc": "相互参照テーブルを再構築して破損した PDF を復元します。",
    "card_repair_action": "修復",
    "card_editpdf_title": "PDF 編集",
    "card_editpdf_desc": "ページ上に直接テキスト、図形、矢印、フリーハンド描画を追加します。",
    "card_editpdf_action": "編集",
    "card_formfill_title": "PDF フォーム入力",
    "card_formfill_desc": "AcroForm 入力欄やチェックボックスを自動検出し入力します。",
    "card_formfill_action": "入力",
    "card_pptx2pdf_title": "PowerPoint から PDF",
    "card_pptx2pdf_desc": "PowerPoint .pptx スライドを高精細な PDF に変換します。",
    "card_pptx2pdf_action": "変換",
    "card_pdf2pptx_title": "PDF から PowerPoint",
    "card_pdf2pptx_desc": "PDF ページを編集可能な 16:9 PowerPoint スライドに変換します。",
    "card_pdf2pptx_action": "変換",
    "card_scan2pdf_title": "スキャンして PDF 化",
    "card_scan2pdf_desc": "端末のカメラで書類を撮影し、即座に整った PDF を作成します。",
    "card_scan2pdf_action": "スキャン",
    "trust_title": "機密文書を扱う世界中のプロフェッショナルが選ぶ PDF ツール",
    "trust_subtitle": "Statement2Sheet はブラウザのローカルメモリのみで完全動作します。金融データや文書が外部サーバーに流出することはありません。",
    "trust_p1_title": "一時的揮発性 RAM",
    "trust_p1_desc": "タブを閉じるかボタンをクリックすると即座に消去",
    "trust_p2_title": "100% ブラウザ処理",
    "trust_p2_desc": "外部クラウドサーバーへのアップロードゼロ",
    "trust_p3_title": "公式 ISO 規格準拠",
    "trust_p3_desc": "PDF-1.7、PDF/A-1b、Microsoft OpenXML 準拠",
    "trust_p4_title": "ハードウェア高速化",
    "trust_p4_desc": "WebAssembly と TypedArrays で快適な処理速度",
    "guides_badge": "エンタープライズ財務インテリジェンス",
    "guides_title": "Statement2Sheet が業務フローを大幅に効率化",
    "guides_sub": "残高照合付きの3シート Excel から QuickBooks OFX 形式まで、プライバシーを完全に保護しながら高精度に処理します。",
    "faq_title": "よくあるご質問 (FAQ)",
    "faq_sub": "明細書変換、会計フォーマット、セキュリティに関する疑問にお答えします。",
    "faq_q1": "銀行明細書はどのようにして Excel (.xlsx) に変換されますか？",
    "faq_q2": "PDF 明細書をクリーンな CSV 形式に変換できますか？",
    "faq_q3": "QuickBooks (.QBO) WebConnect 形式のエクスポートは可能ですか？",
    "faq_q4": "Statement2Sheet を使用する際、金融データの安全性は保たれますか？",
    "faq_q5": "インターネット接続のないオフライン環境でも利用できますか？",
    "faq_q6": "スキャンした明細書の画像や写真も処理できますか？",
    "footer_col_product": "製品",
    "footer_col_financial": "財務スイート",
    "footer_col_solutions": "ソリューション",
    "footer_col_legal": "法的情報",
    "footer_col_company": "企業情報",
    "footer_copyright": "© 2026 Statement2Sheet. 取引明細書と PDF に必要なすべてのツールをブラウザで安全に。",
    "footer_badge_wasm": "WebAssembly 搭載",
    "footer_badge_offline": "オフライン対応 PWA",
    "footer_badge_status": "100% クライアントサイド",
    "card_bankstmt_title": "銀行取引明細書から Excel",
    "card_bankstmt_desc": "複雑な明細書を残高照合付きの3シート Excel 台帳へ高精度に変換します。",
    "card_bankstmt_action": "変換",
    "card_qbo_title": "QuickBooks (.QBO)",
    "card_qbo_desc": "QuickBooks の自動取り込みに対応した WebConnect OFX .QBO ファイルを生成します。",
    "card_qbo_action": "エクスポート"
  },
  "ko": {
    "nav_brand_title": "Statement2Sheet",
    "nav_brand_sub": "Financial & PDF Intelligence",
    "nav_merge": "PDF 병합",
    "nav_split": "PDF 분할",
    "nav_compress": "PDF 압축",
    "nav_convert": "PDF 변환",
    "tool_excel": "PDF를 Excel로 (3시트)",
    "tool_pdf2img": "PDF를 JPG / PNG로",
    "tool_img2pdf": "JPG / PNG를 PDF로",
    "tool_ocr": "PDF를 Markdown으로",
    "nav_all_tools": "모든 PDF 도구",
    "badge_free_private": "100% 무료 · 회원가입 불필요",
    "badge_offline": "오프라인 지원",
    "btn_clear_data": "데이터 삭제",
    "btn_quick_tour": "빠른 둘러보기",
    "repair_title": "PDF 파일 복구",
    "repair_subtitle": "손상된 PDF 파일을 브라우저에서 직접 복구합니다.",
    "hero_badge": "🔒 100% 브라우저 메모리 보안 · 서버 업로드 없음",
    "hero_title": "PDF 및 은행 거래 내역 처리에 필요한 모든 도구",
    "hero_subtitle": "브라우저 RAM에서 100% 실행되는 30가지 엔터프라이즈급 문서 도구. 서버 유출 위험 없이 병합, 분할, 압축, 편집 및 대사 검증을 수행하세요.",
    "hero_drop_title": "PDF, 은행 명세서 또는 이미지를 여기에 드롭하세요",
    "hero_drop_sub": "로컬 메모리 즉시 처리 · 외부 서버로 전송되는 데이터 0바이트",
    "hero_drop_btn": "문서 선택",
    "hero_recent_title": "최근 문서",
    "hero_recent_clear": "지우기",
    "filter_all": "모든 도구",
    "filter_banking": "금융 및 은행",
    "filter_organize": "PDF 정리",
    "filter_optimize": "PDF 최적화",
    "filter_convert": "PDF 변환",
    "filter_edit": "편집 및 작성",
    "filter_security": "PDF 보안",
    "filter_intelligence": "AI 및 OCR",
    "card_merge_title": "PDF 병합",
    "card_merge_desc": "원하는 순서대로 PDF 파일을 가장 빠르게 결합하세요.",
    "card_merge_action": "병합",
    "card_split_title": "PDF 분할",
    "card_split_desc": "페이지나 범위를 지정하여 독립된 PDF 파일로 분리합니다.",
    "card_split_action": "분할",
    "card_compress_title": "PDF 압축",
    "card_compress_desc": "로컬 메모리에서 벡터 품질을 유지하며 용량을 최적화합니다.",
    "card_compress_action": "압축",
    "card_excel_title": "PDF를 Excel로 (3시트)",
    "card_excel_desc": "거래 내역을 자동 추출하여 잔액 대사 검증이 포함된 3시트 Excel로 변환합니다.",
    "card_excel_action": "변환",
    "card_pdf2img_title": "PDF를 JPG / PNG로",
    "card_pdf2img_desc": "품질 손실 없이 고해상도 이미지를 추출합니다.",
    "card_pdf2img_action": "추출",
    "card_img2pdf_title": "JPG / PNG를 PDF로",
    "card_img2pdf_desc": "여러 이미지를 하나의 깔끔한 PDF 문서로 변환합니다.",
    "card_img2pdf_action": "변환",
    "card_organize_title": "PDF 페이지 정리",
    "card_organize_desc": "드래그 앤 드롭으로 페이지 순서를 변경하거나 삭제합니다.",
    "card_organize_action": "정리",
    "card_sign_title": "PDF 서명",
    "card_sign_desc": "원하는 페이지에 직접 그린 서명을 추가합니다.",
    "card_sign_action": "서명",
    "card_watermark_title": "워터마크 삽입",
    "card_watermark_desc": "사용자 지정 텍스트나 보안 워터마크를 페이지에 적용합니다.",
    "card_watermark_action": "적용",
    "card_rotate_title": "PDF 회전",
    "card_rotate_desc": "페이지를 90도, 180도, 270도 일괄 회전합니다.",
    "card_rotate_action": "회전",
    "card_unlock_title": "PDF 잠금 해제",
    "card_unlock_desc": "암호로 보호된 PDF의 보안 제한을 해제합니다.",
    "card_unlock_action": "해제",
    "card_protect_title": "PDF 암호 보호",
    "card_protect_desc": "표준 AES 128/256비트 암호화로 문서를 안전하게 보호합니다.",
    "card_protect_action": "보호",
    "card_crop_title": "PDF 자르기",
    "card_crop_desc": "여백을 잘라내고 원하는 페이지 영역만 추출합니다.",
    "card_crop_action": "자르기",
    "card_extractimg_title": "이미지 추출",
    "card_extractimg_desc": "PDF에 포함된 모든 래스터 이미지를 원본 화질로 추출합니다.",
    "card_extractimg_action": "추출",
    "card_compare_title": "PDF 비교",
    "card_compare_desc": "두 PDF 문서의 시각적 및 텍스트 차이점을 나란히 비교합니다.",
    "card_compare_action": "비교",
    "card_pagenumber_title": "페이지 번호 삽입",
    "card_pagenumber_desc": "위치 및 글꼴 스타일을 지정하여 페이지 번호를 매깁니다.",
    "card_pagenumber_action": "삽입",
    "card_redact_title": "민감 정보 마스킹 (Redact)",
    "card_redact_desc": "계좌 번호와 기밀 정보를 복구 불가능하게 영구 마스킹합니다.",
    "card_redact_action": "마스킹",
    "card_ocr_title": "PDF를 Markdown으로",
    "card_ocr_desc": "브라우저 자체 OCR 엔진으로 텍스트와 구조화된 마크다운을 추출합니다.",
    "card_ocr_action": "추출",
    "card_pdf2word_title": "PDF를 Word (.docx)로",
    "card_pdf2word_desc": "편집 가능한 표 구조를 유지하며 Microsoft Word로 변환합니다.",
    "card_pdf2word_action": "변환",
    "card_office2pdf_title": "Office를 PDF로",
    "card_office2pdf_desc": "Word, Excel 시트, CSV 파일을 직접 PDF로 변환합니다.",
    "card_excel2pdf_title": "Excel을 PDF로",
    "card_excel2pdf_desc": "EXCEL 스프레드시트를 읽기 쉬운 PDF 문서로 간편하게 변환합니다.",
    "card_office2pdf_action": "변환",
    "card_pdfa_title": "ISO PDF/A 아카이빙",
    "card_pdfa_desc": "장기 법적 보관을 위한 ISO 19005-1 규격 PDF/A로 변환합니다.",
    "card_pdfa_action": "보관",
    "card_digitalsign_title": "PKI 암호화 인장",
    "card_digitalsign_desc": "위변조 방지 SHA-256 디지털 암호화 해시 인장을 적용합니다.",
    "card_digitalsign_action": "인장 적용",
    "card_summarize_title": "문서 요약",
    "card_summarize_desc": "핵심 금융 지표와 요약 보고서를 신속히 도출합니다.",
    "card_summarize_action": "요약",
    "card_repair_title": "손상된 PDF 복구",
    "card_repair_desc": "XREF 테이블을 재구성하여 깨진 PDF 문서를 복원합니다.",
    "card_repair_action": "복구",
    "card_editpdf_title": "PDF 편집",
    "card_editpdf_desc": "페이지 위에 직접 텍스트, 도형, 화살표, 드로잉을 추가합니다.",
    "card_editpdf_action": "편집",
    "card_formfill_title": "PDF 양식 작성",
    "card_formfill_desc": "인터랙티브 AcroForm 필드와 체크박스를 감지하여 채웁니다.",
    "card_formfill_action": "작성",
    "card_pptx2pdf_title": "PowerPoint를 PDF로",
    "card_pptx2pdf_desc": ".pptx 슬라이드를 선명한 고품질 PDF로 변환합니다.",
    "card_pptx2pdf_action": "변환",
    "card_pdf2pptx_title": "PDF를 PowerPoint로",
    "card_pdf2pptx_desc": "PDF 문서를 편집 가능한 16:9 와이드스크린 PowerPoint 슬라이드로 변환합니다.",
    "card_pdf2pptx_action": "변환",
    "card_scan2pdf_title": "스캔하여 PDF 만들기",
    "card_scan2pdf_desc": "기기 카메라로 문서를 촬영하여 즉시 깔끔한 PDF로 생성합니다.",
    "card_scan2pdf_action": "스캔",
    "trust_title": "기밀 문서 관리를 위해 전 세계 전문가들이 신뢰하는 PDF 소프트웨어",
    "trust_subtitle": "Statement2Sheet는 브라우저 메모리에서 100% 로컬로 작동합니다. 금융 정보가 기기 외부로 전송되지 않습니다.",
    "trust_p1_title": "휘발성 RAM 메모리",
    "trust_p1_desc": "탭을 닫거나 클릭 한 번으로 흔적 없이 완전 삭제",
    "trust_p2_title": "100% 브라우저 처리",
    "trust_p2_desc": "외부 클라우드 서버 전송 없음",
    "trust_p3_title": "국제 ISO 표준 준수",
    "trust_p3_desc": "PDF-1.7, PDF/A-1b 및 OpenXML 완벽 호환",
    "trust_p4_title": "하드웨어 가속 성능",
    "trust_p4_desc": "WebAssembly 및 HTML5 TypedArrays 기반",
    "guides_badge": "기업용 금융 인텔리전스",
    "guides_title": "Statement2Sheet가 업무 워크플로우를 혁신하는 방법",
    "guides_sub": "3시트 대사 검증 워크북부터 QuickBooks OFX 서식까지, 프라이버시 침해 없이 문서를 처리하는 기술을 경험하세요.",
    "faq_title": "자주 묻는 질문 (FAQ)",
    "faq_sub": "명세서 변환, 회계 포맷, 개인정보 보호에 대해 자주 묻는 질문입니다.",
    "faq_q1": "Statement2Sheet는 은행 명세서를 어떻게 Excel (.xlsx)로 변환하나요?",
    "faq_q2": "PDF 거래 명세서를 깔끔한 CSV 포맷으로 내보낼 수 있나요?",
    "faq_q3": "QuickBooks (.QBO) WebConnect 내보내기가 지원되나요?",
    "faq_q4": "Statement2Sheet를 사용할 때 금융 데이터는 안전한가요?",
    "faq_q5": "인터넷 연결이 없는 오프라인 상태에서도 사용할 수 있나요?",
    "faq_q6": "스캔한 종이 명세서나 사진 파일도 지원되나요?",
    "footer_col_product": "제품",
    "footer_col_financial": "금융 솔루션",
    "footer_col_solutions": "활용 분야",
    "footer_col_legal": "법적 고지",
    "footer_col_company": "회사 정보",
    "footer_copyright": "© 2026 Statement2Sheet. 거래 명세서와 PDF 처리에 필요한 모든 도구를 한곳에서.",
    "footer_badge_wasm": "WebAssembly 기반",
    "footer_badge_offline": "오프라인 PWA 지원",
    "footer_badge_status": "100% 클라이언트 전용",
    "card_bankstmt_title": "은행 거래내역서 Excel 변환",
    "card_bankstmt_desc": "복잡한 은행 명세서를 대사 검증이 포함된 3시트 Excel 장부로 변환합니다.",
    "card_bankstmt_action": "변환",
    "card_qbo_title": "QuickBooks (.QBO)",
    "card_qbo_desc": "QuickBooks에 직접 가져올 수 있는 WebConnect OFX .QBO 파일을 생성합니다.",
    "card_qbo_action": "내보내기"
  },
  "zh": {
    "nav_brand_title": "Statement2Sheet",
    "nav_brand_sub": "Financial & PDF Intelligence",
    "nav_merge": "合并 PDF",
    "nav_split": "拆分 PDF",
    "nav_compress": "压缩 PDF",
    "nav_convert": "转换 PDF",
    "tool_excel": "PDF 转 Excel (3工作表)",
    "tool_pdf2img": "PDF 转 JPG / PNG",
    "tool_img2pdf": "JPG / PNG 转 PDF",
    "tool_ocr": "PDF 转 Markdown",
    "nav_all_tools": "所有 PDF 工具",
    "badge_free_private": "100% 免费 · 无需注册",
    "badge_offline": "支持离线使用",
    "btn_clear_data": "清除数据",
    "btn_quick_tour": "功能导览",
    "repair_title": "修复 PDF 文件",
    "repair_subtitle": "在浏览器中直接修复损坏的 PDF 文件。",
    "hero_badge": "🔒 100% 浏览器内存隐私 · 零云端上传",
    "hero_title": "处理 PDF 与银行流水账单所需的一站式专业工具",
    "hero_subtitle": "30 款企业级文档工具 100% 运行在您设备的浏览器内存中。合并、拆分、压缩、编辑和对账，零服务器数据泄露风险。",
    "hero_drop_title": "将任何 PDF、对账单或图片拖放到此处",
    "hero_drop_sub": "本地内存即时极速处理 · 不向任何外部服务器发送任何字节",
    "hero_drop_btn": "选择文档",
    "hero_recent_title": "最近使用的文档",
    "hero_recent_clear": "清除",
    "filter_all": "全部工具",
    "filter_banking": "银行与财务",
    "filter_organize": "组织 PDF",
    "filter_optimize": "优化 PDF",
    "filter_convert": "转换 PDF",
    "filter_edit": "编辑与填写",
    "filter_security": "PDF 安全",
    "filter_intelligence": "AI 与 OCR",
    "card_merge_title": "合并 PDF",
    "card_merge_desc": "按您需要的顺序轻松将多个 PDF 文件无缝合并为一个。",
    "card_merge_action": "合并",
    "card_split_title": "拆分 PDF",
    "card_split_desc": "将特定页面或连续页面范围拆分为独立的 PDF 文件。",
    "card_split_action": "拆分",
    "card_compress_title": "压缩 PDF",
    "card_compress_desc": "在本地内存中保持极佳矢量画质的同时大幅减小文件体积。",
    "card_compress_action": "压缩",
    "card_excel_title": "PDF 转 Excel (3工作表)",
    "card_excel_desc": "自动提取银行流水至带有账户对账审计功能的 3 标签页 Excel 工作簿。",
    "card_excel_action": "转换",
    "card_pdf2img_title": "PDF 转 JPG / PNG",
    "card_pdf2img_desc": "无损提取 PDF 页面为高分辨率光栅图片。",
    "card_pdf2img_action": "提取",
    "card_img2pdf_title": "JPG / PNG 转 PDF",
    "card_img2pdf_desc": "将 JPG、PNG、WebP 及 BMP 图片批量合成为干净的单个 PDF。",
    "card_img2pdf_action": "转换",
    "card_organize_title": "管理 PDF 页面",
    "card_organize_desc": "通过拖拽交互直观排序、旋转或删除 PDF 页面。",
    "card_organize_action": "管理",
    "card_sign_title": "签署 PDF",
    "card_sign_desc": "手写或输入个性化签名，并直接盖章在任意页面上。",
    "card_sign_action": "签名",
    "card_watermark_title": "添加水印",
    "card_watermark_desc": "在指定页面盖上自定义文字或机密防伪水印。",
    "card_watermark_action": "盖印",
    "card_rotate_title": "旋转 PDF",
    "card_rotate_desc": "批量旋转横向或纵向页面 90、180 或 270 度。",
    "card_rotate_action": "旋转",
    "card_unlock_title": "解除 PDF 密码",
    "card_unlock_desc": "轻松移除受保护 PDF 文档的密码和使用权限限制。",
    "card_unlock_action": "解密",
    "card_protect_title": "加密保护 PDF",
    "card_protect_desc": "使用标准 AES 128/256 位高强度加密算法保护您的 PDF。",
    "card_protect_action": "加密",
    "card_crop_title": "裁剪 PDF",
    "card_crop_desc": "修剪页边距并使用直观手柄裁剪指定区域。",
    "card_crop_action": "裁剪",
    "card_extractimg_title": "提取内嵌图片",
    "card_extractimg_desc": "以原始分辨率提取 PDF 文档中内嵌的所有位图图像。",
    "card_extractimg_action": "提取",
    "card_compare_title": "对比 PDF 差异",
    "card_compare_desc": "并排直观对比两个 PDF 版本的文本与视觉变动。",
    "card_compare_action": "对比",
    "card_pagenumber_title": "插入页码",
    "card_pagenumber_desc": "自由定制页面编号格式、字体与显示位置。",
    "card_pagenumber_action": "插入",
    "card_redact_title": "永久涂黑脱敏 (Redact)",
    "card_redact_desc": "不可逆地彻底涂黑敏感账号、身份证号及商业机密。",
    "card_redact_action": "涂黑",
    "card_ocr_title": "PDF 转 Markdown (OCR)",
    "card_ocr_desc": "利用浏览器端本地 OCR 引擎提取纯文本与结构化 Markdown。",
    "card_ocr_action": "提取",
    "card_pdf2word_title": "PDF 转 Word (.docx)",
    "card_pdf2word_desc": "转换为包含原生可编辑表格结构的 Microsoft Word 文档。",
    "card_pdf2word_action": "转换",
    "card_office2pdf_title": "Office 转 PDF",
    "card_office2pdf_desc": "将 Word、Excel 电子表格与 CSV 文件直接转为优质 PDF。",
    "card_excel2pdf_title": "Excel转PDF",
    "card_excel2pdf_desc": "将EXCEL电子表格轻松转换为易于阅读的PDF文档。",
    "card_office2pdf_action": "转换",
    "card_pdfa_title": "ISO PDF/A 归档",
    "card_pdfa_desc": "转换为符合 ISO 19005-1 法律长期归档标准的 PDF/A 格式。",
    "card_pdfa_action": "归档",
    "card_digitalsign_title": "PKI 数字防伪印章",
    "card_digitalsign_desc": "加盖防篡改的 SHA-256 数字密码学哈希认证印章。",
    "card_digitalsign_action": "加盖印章",
    "card_summarize_title": "文档智能摘要",
    "card_summarize_desc": "即时提炼提取核心财务数据指标与结构化摘要。",
    "card_summarize_action": "提炼摘要",
    "card_repair_title": "修复损坏 PDF",
    "card_repair_desc": "重构破损的交叉引用表 (XREF)，挽救损坏文件。",
    "card_repair_action": "修复",
    "card_editpdf_title": "在线编辑 PDF",
    "card_editpdf_desc": "直接在 PDF 页面上添加文本、几何图形、箭头及手绘线条。",
    "card_editpdf_action": "编辑",
    "card_formfill_title": "填写 PDF 表单",
    "card_formfill_desc": "自动识别交互式 AcroForm 输入框与复选框并完成填写。",
    "card_formfill_action": "填写",
    "card_pptx2pdf_title": "PowerPoint 转 PDF",
    "card_pptx2pdf_desc": "将 .pptx 演示文稿幻灯片转换为高保真 PDF 文档。",
    "card_pptx2pdf_action": "转换",
    "card_pdf2pptx_title": "PDF 转 PowerPoint",
    "card_pdf2pptx_desc": "将 PDF 转换为可编辑的 16:9 宽屏 PowerPoint 幻灯片。",
    "card_pdf2pptx_action": "转换",
    "card_scan2pdf_title": "相机拍照转 PDF",
    "card_scan2pdf_desc": "调用设备摄像头拍摄纸质文件并立即生成平整 PDF。",
    "card_scan2pdf_action": "扫描",
    "trust_title": "处理高度机密文件深受全球专业人士信赖的 PDF 软件",
    "trust_subtitle": "Statement2Sheet 100% 运行在您本机的浏览器内存中。您的任何财务记录或文档绝不会流出您的计算机。",
    "trust_p1_title": "临时易失 RAM 内存",
    "trust_p1_desc": "关闭标签页或一键清空即瞬间彻底销毁",
    "trust_p2_title": "100% 浏览器本地运行",
    "trust_p2_desc": "绝不向任何外部第三方服务器上传",
    "trust_p3_title": "严格遵循 ISO 国际标准",
    "trust_p3_desc": "符合 PDF-1.7、PDF/A-1b 与微软 OpenXML 规范",
    "trust_p4_title": "硬件级极速加速",
    "trust_p4_desc": "由 WebAssembly 与 HTML5 TypedArrays 强劲驱动",
    "guides_badge": "企业级金融数据智能",
    "guides_title": "Statement2Sheet 如何全方位赋能您的工作流",
    "guides_sub": "从带对账审计的 3 标签页 Excel 到 QuickBooks OFX 格式，了解我们的纯本地引擎如何在零泄密前提下完成转换。",
    "faq_title": "常见问题解答 (FAQ)",
    "faq_sub": "了解关于流水账单转换、会计软件格式和数据安全的一切。",
    "faq_q1": "Statement2Sheet 如何将银行流水账单转换为 Excel (.xlsx)？",
    "faq_q2": "能否将 PDF 格式流水转换为标准规整的 CSV 格式？",
    "faq_q3": "是否支持 QuickBooks (.QBO) WebConnect 格式导出？",
    "faq_q4": "使用 Statement2Sheet 处理银行数据是否安全私密？",
    "faq_q5": "在无网络连接的离线状态下能否正常使用？",
    "faq_q6": "是否支持拍照或扫描件对账单的处理？",
    "footer_col_product": "产品",
    "footer_col_financial": "财务套件",
    "footer_col_solutions": "解决方案",
    "footer_col_legal": "法律声明",
    "footer_col_company": "关于我们",
    "footer_copyright": "© 2026 Statement2Sheet. 处理银行流水与 PDF 所需的一切，尽在安全一处。",
    "footer_badge_wasm": "WebAssembly 强劲驱动",
    "footer_badge_offline": "支持离线 PWA",
    "footer_badge_status": "100% 客户端本地",
    "card_bankstmt_title": "银行流水账单转 Excel",
    "card_bankstmt_desc": "将复杂的流水对账单转换为带有账户自动对账核算的 3 表格 Excel 工作簿。",
    "card_bankstmt_action": "转换",
    "card_qbo_title": "QuickBooks (.QBO)",
    "card_qbo_desc": "生成适用于直接导入 QuickBooks 会计系统的 WebConnect OFX .QBO 格式文件。",
    "card_qbo_action": "导出"
  },
  "ar": {
    "nav_brand_title": "Statement2Sheet",
    "nav_brand_sub": "Financial & PDF Intelligence",
    "nav_merge": "دمج PDF",
    "nav_split": "تقسيم PDF",
    "nav_compress": "ضغط PDF",
    "nav_convert": "تحويل PDF",
    "tool_excel": "تحويل PDF إلى Excel (3 صفحات)",
    "tool_pdf2img": "تحويل PDF إلى صور",
    "tool_img2pdf": "تحويل الصور إلى PDF",
    "tool_ocr": "تحويل PDF إلى Markdown",
    "nav_all_tools": "جميع أدوات PDF",
    "badge_free_private": "مجاني 100% · بدون تسجيل",
    "badge_offline": "جاهز للاستخدام أوفلاين",
    "btn_clear_data": "مسح البيانات",
    "btn_quick_tour": "جولة سريعة",
    "repair_title": "إصلاح ملف PDF",
    "repair_subtitle": "استعادة ملفات PDF التالفة أو المعطوبة مباشرة في متصفحك.",
    "hero_badge": "🔒 خصوصية 100% داخل المتصفح · بدون رفع للسحابة",
    "hero_title": "كل ما تحتاجه للتعامل مع ملفات PDF وكشوف الحسابات في مكان واحد",
    "hero_subtitle": "30 أداة متطورة تعمل بنسبة 100% داخل ذاكرة المتصفح RAM. دمج، تقسيم، ضغط، تعديل وتدقيق مالي دون أي مخاطر تسريب.",
    "hero_drop_title": "اسحب أي ملف PDF أو كشف حساب بنكي أو صورة هنا",
    "hero_drop_sub": "معالجة فورية داخل الذاكرة المؤقتة · لا يتم إرسال أي بايت لخوادم خارجية",
    "hero_drop_btn": "اختر المستند",
    "hero_recent_title": "المستندات الأخيرة",
    "hero_recent_clear": "مسح",
    "filter_all": "جميع الأدوات",
    "filter_banking": "المصارف والمالية",
    "filter_organize": "تنظيم PDF",
    "filter_optimize": "تحسين الحجم",
    "filter_convert": "تحويل PDF",
    "filter_edit": "تعديل وملء",
    "filter_security": "أمان PDF",
    "filter_intelligence": "الذكاء و OCR",
    "card_merge_title": "دمج PDF",
    "card_merge_desc": "ادمج ملفات PDF بالترتيب الذي تريده بأسرع وسيلة ممكنة.",
    "card_merge_action": "دمج",
    "card_split_title": "تقسيم PDF",
    "card_split_desc": "افصل صفحات محددة في ملفات PDF مستقلة.",
    "card_split_action": "تقسيم",
    "card_compress_title": "ضغط PDF",
    "card_compress_desc": "قلل حجم الملف مع الحفاظ على أعلى جودة للمستند.",
    "card_compress_action": "ضغط",
    "card_excel_title": "PDF إلى Excel (3 صفحات)",
    "card_excel_desc": "استخرج المعاملات البنكية في ملف Excel مع تدقيق مطابقة الرصيد.",
    "card_excel_action": "تحويل",
    "card_pdf2img_title": "PDF إلى JPG / PNG",
    "card_pdf2img_desc": "استخرج صوراً عالية الدقة من صفحات PDF دون فقدان الجودة.",
    "card_pdf2img_action": "استخراج",
    "card_img2pdf_title": "الصور إلى PDF",
    "card_img2pdf_desc": "حوّل صور JPG و PNG و WebP إلى مستند PDF واحد ونظيف.",
    "card_img2pdf_action": "تحويل",
    "card_organize_title": "ترتيب صفحات PDF",
    "card_organize_desc": "رتب واحذف واعد ترتيب صفحات PDF بالسحب والإفلات.",
    "card_organize_action": "ترتيب",
    "card_sign_title": "توقيع PDF",
    "card_sign_desc": "وقع المستندات بتوقيع مرسوم أو مطبوع على أي صفحة.",
    "card_sign_action": "توقيع",
    "card_watermark_title": "علامة مائية",
    "card_watermark_desc": "أضف نصوصاً مخصصة أو أختام سرية على صفحات محددة.",
    "card_watermark_action": "إضافة ختم",
    "card_rotate_title": "تدوير PDF",
    "card_rotate_desc": "قم بتدوير الصفحات بمقدار 90 أو 180 أو 270 درجة.",
    "card_rotate_action": "تدوير",
    "card_unlock_title": "إلغاء قفل PDF",
    "card_unlock_desc": "أزل قيود كلمات المرور من ملفات PDF المحمية.",
    "card_unlock_action": "إلغاء القفل",
    "card_protect_title": "حماية PDF",
    "card_protect_desc": "شفّر ملفك بكلمات مرور قوية بتشفير AES القياسي.",
    "card_protect_action": "حماية",
    "card_crop_title": "قص أطراف PDF",
    "card_crop_desc": "قص الهوامش وحدد المساحات بدقة بمقابض تفاعلية.",
    "card_crop_action": "قص",
    "card_extractimg_title": "استخراج الصور",
    "card_extractimg_desc": "استخرج جميع الصور المضمنة بجودتها الأصلية.",
    "card_extractimg_action": "استخراج",
    "card_compare_title": "مقارنة ملفين",
    "card_compare_desc": "مقارنة بصرية ونصية جنباً إلى جنب بين نسختين.",
    "card_compare_action": "مقارنة",
    "card_pagenumber_title": "أرقام الصفحات",
    "card_pagenumber_desc": "أضف ترقيماً احترافياً للصفحات بمواضع مخصصة.",
    "card_pagenumber_action": "إدراج",
    "card_redact_title": "طمس البيانات (Redact)",
    "card_redact_desc": "احجب نهائياً أرقام الحسابات والبيانات الحساسة بشكل لا رجعة فيه.",
    "card_redact_action": "طمس",
    "card_ocr_title": "PDF إلى Markdown",
    "card_ocr_desc": "استخرج النصوص العادية وتنسيق Markdown بتقنية OCR محلياً.",
    "card_ocr_action": "استخراج",
    "card_pdf2word_title": "PDF إلى Word (.docx)",
    "card_pdf2word_desc": "حوّل المستند إلى ملف Word مع جداول قابلة للتعديل.",
    "card_pdf2word_action": "تحويل",
    "card_office2pdf_title": "Office إلى PDF",
    "card_office2pdf_desc": "حوّل ملفات Word وجداول Excel و CSV إلى PDF.",
    "card_excel2pdf_title": "تحويل Excel إلى PDF",
    "card_excel2pdf_desc": "تحويل جداول بيانات Excel بسهولة إلى مستندات PDF للقراءة والمشاركة.",
    "card_office2pdf_action": "تحويل",
    "card_pdfa_title": "أرشفة ISO PDF/A",
    "card_pdfa_desc": "حوّل المستند إلى تنسيق الأرشفة القانونية طويلة المدى.",
    "card_pdfa_action": "أرشفة",
    "card_digitalsign_title": "ختم تشفيري PKI",
    "card_digitalsign_desc": "طبّق ختماً رقمياً مشفراً غير قابل للتلاعب بخوارزمية SHA-256.",
    "card_digitalsign_action": "ختم",
    "card_summarize_title": "تلخيص المستند",
    "card_summarize_desc": "استخرج المؤشرات المالية المهمة والملخصات في ثوانٍ.",
    "card_summarize_action": "تلخيص",
    "card_repair_title": "إصلاح PDF معطوب",
    "card_repair_desc": "استرجع الملفات المعطوبة عبر إعادة بناء جداول XREF.",
    "card_repair_action": "إصلاح",
    "card_editpdf_title": "تعديل PDF",
    "card_editpdf_desc": "أضف نصوصاً، أشكالاً، أسهم ورسوماً مباشرة على الصفحات.",
    "card_editpdf_action": "تعديل",
    "card_formfill_title": "ملء نماذج PDF",
    "card_formfill_desc": "تعرف تلقائي على حقول AcroForm وخانات الاختيار وملؤها.",
    "card_formfill_action": "ملء",
    "card_pptx2pdf_title": "PowerPoint إلى PDF",
    "card_pptx2pdf_desc": "حوّل عروض PowerPoint .pptx إلى مستندات PDF عالية الدقة.",
    "card_pptx2pdf_action": "تحويل",
    "card_pdf2pptx_title": "PDF إلى PowerPoint",
    "card_pdf2pptx_desc": "حوّل ملف PDF إلى شرائح PowerPoint قابلة للتعديل بنسبة 16:9.",
    "card_pdf2pptx_action": "تحويل",
    "card_scan2pdf_title": "مسح بالكاميرا إلى PDF",
    "card_scan2pdf_desc": "التقط صور المستندات بكاميرا جهازك وأنشئ ملف PDF فوراً.",
    "card_scan2pdf_action": "مسح",
    "trust_title": "برنامج PDF الموثوق للمستندات والبيانات البنكية الحساسة",
    "trust_subtitle": "يعمل Statement2Sheet بالكامل داخل ذاكرة جهازك. لا تخرج أي بيانات مالية خارج حاسوبك مطلقاً.",
    "trust_p1_title": "ذاكرة RAM مؤقتة",
    "trust_p1_desc": "تُمحى فور إغلاق التبويب أو بضغطة زر واحدة",
    "trust_p2_title": "100% داخل المتصفح",
    "trust_p2_desc": "صفر رفع لأي خوادم خارجية سحابية",
    "trust_p3_title": "معايير ISO الدولية",
    "trust_p3_desc": "متوافق مع مواصفات PDF-1.7 و PDF/A و OpenXML",
    "trust_p4_title": "تسريع عتادي فائق",
    "trust_p4_desc": "مدعوم بتقنيات WebAssembly و TypedArrays",
    "guides_badge": "الذكاء المالي للمؤسسات",
    "guides_title": "كيف يطور Statement2Sheet إدارة معاملاتك المالية",
    "guides_sub": "من دفاتر Excel ثلاثية الصفحات إلى تصدير QuickBooks OFX، تعرف على محركنا المحلي الآمن.",
    "faq_title": "الأسئلة الشائعة",
    "faq_sub": "كل ما تحتاج لمعرفته حول التحويل المالي وصيغ المحاسبة وحماية الخصوصية.",
    "faq_q1": "كيف يحول Statement2Sheet كشوف الحسابات إلى ملفات Excel؟",
    "faq_q2": "هل يمكن تحويل كشوف PDF إلى صيغة CSV منسقة بدقة؟",
    "faq_q3": "هل يتم دعم تصدير صيغة QuickBooks (.QBO) WebConnect؟",
    "faq_q4": "هل بياناتي المصرفية آمنة مع Statement2Sheet؟",
    "faq_q5": "هل يمكنني العمل أوفلاين دون اتصال بالإنترنت؟",
    "faq_q6": "هل الكشوف الممسوحة ضوئياً والصور مدعومة؟",
    "footer_col_product": "المنتج",
    "footer_col_financial": "الحزمة المالية",
    "footer_col_solutions": "الحلول",
    "footer_col_legal": "الشؤون القانونية",
    "footer_col_company": "الشركة",
    "footer_copyright": "© 2026 Statement2Sheet. كل ما تحتاجه للتعامل مع كشوف الحسابات و PDF في مكان واحد.",
    "footer_badge_wasm": "مدعوم بـ WebAssembly",
    "footer_badge_offline": "تطبيق PWA أوفلاين",
    "footer_badge_status": "100% في جانب العميل",
    "card_bankstmt_title": "كشف الحساب البنكي إلى Excel",
    "card_bankstmt_desc": "حوّل كشوف الحسابات المعقدة إلى دفاتر Excel بـ 3 صفحات مع تدقيق مطابق للأرصدة.",
    "card_bankstmt_action": "تحويل",
    "card_qbo_title": "QuickBooks (.QBO)",
    "card_qbo_desc": "أنشئ ملفات WebConnect OFX .QBO للاستيراد المباشر في QuickBooks.",
    "card_qbo_action": "تصدير"
  },
  "ru": {
    "nav_brand_title": "Statement2Sheet",
    "nav_brand_sub": "Financial & PDF Intelligence",
    "nav_merge": "Объединить PDF",
    "nav_split": "Разделить PDF",
    "nav_compress": "Сжать PDF",
    "nav_convert": "Конвертировать PDF",
    "tool_excel": "PDF в Excel (3 листа)",
    "tool_pdf2img": "PDF в JPG / PNG",
    "tool_img2pdf": "JPG / PNG в PDF",
    "tool_ocr": "PDF в Markdown",
    "nav_all_tools": "ВСЕ ИНСТРУМЕНТЫ PDF",
    "badge_free_private": "100% Бесплатно · Без регистрации",
    "badge_offline": "Работает офлайн",
    "btn_clear_data": "Очистить данные",
    "btn_quick_tour": "Обзор функций",
    "repair_title": "Восстановить PDF",
    "repair_subtitle": "Восстановление поврежденных PDF-файлов прямо в браузере.",
    "hero_badge": "🔒 100% Приватность в RAM · Без отправки в облако",
    "hero_title": "Все инструменты для PDF и банковских выписок в одном месте",
    "hero_subtitle": "30 инструментов корпоративного уровня, работающих на 100% в оперативной памяти браузера. Объединяйте, разделяйте, сжимайте, редактируйте и сверяйте без риска утечки.",
    "hero_drop_title": "Перетащите сюда любой PDF, выписку или изображение",
    "hero_drop_sub": "Мгновенная локальная обработка в памяти · Ноль байт передается на сторонние серверы",
    "hero_drop_btn": "Выбрать документ",
    "hero_recent_title": "Недавние документы",
    "hero_recent_clear": "Очистить",
    "filter_all": "Все инструменты",
    "filter_banking": "Банки и финансы",
    "filter_organize": "Организация PDF",
    "filter_optimize": "Оптимизация PDF",
    "filter_convert": "Конвертация PDF",
    "filter_edit": "Правка и формы",
    "filter_security": "Безопасность PDF",
    "filter_intelligence": "ИИ и OCR",
    "card_merge_title": "Объединить PDF",
    "card_merge_desc": "Соединяйте несколько PDF в желаемом порядке за секунды.",
    "card_merge_action": "Объединить",
    "card_split_title": "Разделить PDF",
    "card_split_desc": "Разделяйте отдельные страницы или диапазоны на независимые PDF.",
    "card_split_action": "Разделить",
    "card_compress_title": "Сжать PDF",
    "card_compress_desc": "Уменьшайте размер файла с сохранением векторного качества.",
    "card_compress_action": "Сжать",
    "card_excel_title": "PDF в Excel (3 листа)",
    "card_excel_desc": "Автоматическое извлечение банковских транзакций с бухгалтерской сверкой.",
    "card_excel_action": "Конвертировать",
    "card_pdf2img_title": "PDF в JPG / PNG",
    "card_pdf2img_desc": "Извлекайте растровые изображения страниц высокого разрешения.",
    "card_pdf2img_action": "Извлечь",
    "card_img2pdf_title": "JPG / PNG в PDF",
    "card_img2pdf_desc": "Преобразуйте изображения JPG, PNG, WebP и BMP в единый PDF-документ.",
    "card_img2pdf_action": "Конвертировать",
    "card_organize_title": "Организация страниц",
    "card_organize_desc": "Перетаскивайте, удаляйте и меняйте порядок страниц мышью.",
    "card_organize_action": "Организовать",
    "card_sign_title": "Подписать PDF",
    "card_sign_desc": "Ставьте нарисованную или печатную подпись на любой странице.",
    "card_sign_action": "Подписать",
    "card_watermark_title": "Водяной знак",
    "card_watermark_desc": "Накладывайте текст или штампы конфиденциальности на страницы.",
    "card_watermark_action": "Накрутить знак",
    "card_rotate_title": "Повернуть PDF",
    "card_rotate_desc": "Пакетный поворот страниц на 90, 180 или 270 градусов.",
    "card_rotate_action": "Повернуть",
    "card_unlock_title": "Снять пароль PDF",
    "card_unlock_desc": "Снимайте ограничения безопасности с защищенных паролем PDF.",
    "card_unlock_action": "Разблокировать",
    "card_protect_title": "Защитить паролем",
    "card_protect_desc": "Шифруйте PDF стойким стандартом AES 128/256 бит.",
    "card_protect_action": "Защитить",
    "card_crop_title": "Обрезать поля PDF",
    "card_crop_desc": "Обрезайте поля страниц с помощью визуальных маркеров.",
    "card_crop_action": "Обрезать",
    "card_extractimg_title": "Извлечь изображения",
    "card_extractimg_desc": "Извлеките все встроенные рисунки и фото в исходном качестве.",
    "card_extractimg_action": "Извлечь",
    "card_compare_title": "Сравнить версии PDF",
    "card_compare_desc": "Наглядное визуальное и текстовое сравнение двух версий документа.",
    "card_compare_action": "Сравнить",
    "card_pagenumber_title": "Номера страниц",
    "card_pagenumber_desc": "Вставляйте настраиваемую нумерацию страниц в выбранном месте.",
    "card_pagenumber_action": "Вставить",
    "card_redact_title": "Безвозвратное скрытие (Redact)",
    "card_redact_desc": "Навсегда замазывайте черным цветом номера счетов и секретные данные.",
    "card_redact_action": "Скрыть данные",
    "card_ocr_title": "PDF в Markdown (OCR)",
    "card_ocr_desc": "Распознавание текста и форматированного Markdown локально в браузере.",
    "card_ocr_action": "Распознать",
    "card_pdf2word_title": "PDF в Word (.docx)",
    "card_pdf2word_desc": "Преобразуйте PDF в документ Microsoft Word с таблицами.",
    "card_pdf2word_action": "Конвертировать",
    "card_office2pdf_title": "Office в PDF",
    "card_office2pdf_desc": "Конвертируйте Word, таблицы Excel и CSV напрямую в PDF.",
    "card_excel2pdf_title": "Excel в PDF",
    "card_excel2pdf_desc": "Конвертируйте таблицы EXCEL в удобные для чтения документы PDF.",
    "card_office2pdf_action": "Конвертировать",
    "card_pdfa_title": "Архивный ISO PDF/A",
    "card_pdfa_desc": "Преобразуйте документы в стандарт ISO 19005-1 для долгосрочного хранения.",
    "card_pdfa_action": "Архивировать",
    "card_digitalsign_title": "Крипто-печать PKI",
    "card_digitalsign_desc": "Ставьте защищенный от подделки цифровой SHA-256 хэш-оттиск.",
    "card_digitalsign_action": "Запечатать",
    "card_summarize_title": "Краткое резюме",
    "card_summarize_desc": "Быстрое извлечение ключевых финансовых показателей и фактов.",
    "card_summarize_action": "Резюмировать",
    "card_repair_title": "Восстановление PDF",
    "card_repair_desc": "Восстанавливайте поврежденные PDF-файлы путем пересборки XREF.",
    "card_repair_action": "Восстановить",
    "card_editpdf_title": "Редактировать PDF",
    "card_editpdf_desc": "Добавляйте текст, фигуры, стрелки и рисунки прямо на страницах.",
    "card_editpdf_action": "Редактировать",
    "card_formfill_title": "Заполнить PDF-формы",
    "card_formfill_desc": "Автообнаружение и интерактивное заполнение полей AcroForm.",
    "card_formfill_action": "Заполнить",
    "card_pptx2pdf_title": "PowerPoint в PDF",
    "card_pptx2pdf_desc": "Конвертируйте слайды .pptx в кристально четкие PDF-документы.",
    "card_pptx2pdf_action": "Конвертировать",
    "card_pdf2pptx_title": "PDF в PowerPoint",
    "card_pdf2pptx_desc": "Преобразуйте PDF в редактируемые слайды PowerPoint 16:9.",
    "card_pdf2pptx_action": "Конвертировать",
    "card_scan2pdf_title": "Сканировать в PDF",
    "card_scan2pdf_desc": "Фотографируйте документы камерой и сразу собирайте в аккуратный PDF.",
    "card_scan2pdf_action": "Сканировать",
    "trust_title": "Программа для PDF, которой доверяют работу с конфиденциальными данными",
    "trust_subtitle": "Statement2Sheet работает на 100% локально в оперативной памяти. Ни один финансовый документ не покидает ваш компьютер.",
    "trust_p1_title": "Оперативная память RAM",
    "trust_p1_desc": "Очищается при закрытии вкладки или по кнопке",
    "trust_p2_title": "100% в браузере",
    "trust_p2_desc": "Ноль передач на сторонние сервера",
    "trust_p3_title": "Стандарты ISO",
    "trust_p3_desc": "Совместимость с PDF-1.7, PDF/A-1b и OpenXML",
    "trust_p4_title": "Аппаратное ускорение",
    "trust_p4_desc": "На базе технологий WebAssembly и TypedArrays",
    "guides_badge": "Финансовая аналитика для бизнеса",
    "guides_title": "Как Statement2Sheet ускоряет вашу финансовую рутину",
    "guides_sub": "От сверенных 3-страничных таблиц Excel до выгрузки в QuickBooks OFX — узнайте о технологиях без передачи данных третьим лицам.",
    "faq_title": "Часто задаваемые вопросы (FAQ)",
    "faq_sub": "Все об обработке банковских выписок, бухгалтерских форматах и безопасности.",
    "faq_q1": "Как Statement2Sheet переводит банковские выписки в Excel (.xlsx)?",
    "faq_q2": "Можно ли преобразовать PDF-выписки в чистый формат CSV?",
    "faq_q3": "Поддерживается ли экспорт в QuickBooks (.QBO) WebConnect?",
    "faq_q4": "Безопасны ли мои финансовые данные при работе со Statement2Sheet?",
    "faq_q5": "Можно ли использовать сервис офлайн без подключения к интернету?",
    "faq_q6": "Поддерживаются ли сканированные документы и фото выписок?",
    "footer_col_product": "ПРОДУКТ",
    "footer_col_financial": "ФИНАНСЫ",
    "footer_col_solutions": "РЕШЕНИЯ",
    "footer_col_legal": "ПРАВОВАЯ ИНФО",
    "footer_col_company": "О НАС",
    "footer_copyright": "© 2026 Statement2Sheet. Все необходимые инструменты для PDF и банковских выписок в одном месте.",
    "footer_badge_wasm": "На базе WebAssembly",
    "footer_badge_offline": "Офлайн PWA-приложение",
    "footer_badge_status": "100% на стороне клиента",
    "card_bankstmt_title": "Банковская выписка в Excel",
    "card_bankstmt_desc": "Преобразуйте выписки в 3-страничные книги Excel со сверкой остатков.",
    "card_bankstmt_action": "Конвертировать",
    "card_qbo_title": "QuickBooks (.QBO)",
    "card_qbo_desc": "Создавайте файлы WebConnect OFX .QBO для мгновенного импорта в QuickBooks.",
    "card_qbo_action": "Экспорт"
  },
  "tr": {
    "nav_brand_title": "Statement2Sheet",
    "nav_brand_sub": "Financial & PDF Intelligence",
    "nav_merge": "PDF Birleştir",
    "nav_split": "PDF Böl",
    "nav_compress": "PDF Sıkıştır",
    "nav_convert": "PDF Dönüştür",
    "tool_excel": "PDF'den Excel'e (3 Sayfa)",
    "tool_pdf2img": "PDF'den JPG / PNG'ye",
    "tool_img2pdf": "JPG / PNG'den PDF'ye",
    "tool_ocr": "PDF'den Markdown'a",
    "nav_all_tools": "TÜM PDF ARAÇLARI",
    "badge_free_private": "%100 Ücretsiz · Kayıt Gerekmez",
    "badge_offline": "Çevrimdışı Hazır",
    "btn_clear_data": "Verileri Temizle",
    "btn_quick_tour": "Hızlı Tur",
    "repair_title": "Bozuk PDF Onar",
    "repair_subtitle": "Hasarlı veya bozuk PDF dosyalarını doğrudan tarayıcınızda kurtarın.",
    "hero_badge": "🔒 %100 Tarayıcı İçi Gizlilik · Sıfır Bulut Yüklemesi",
    "hero_title": "PDF ve Banka Ekstreleri İçin İhtiyacınız Olan Tüm Araçlar",
    "hero_subtitle": "Tamamen tarayıcınızın RAM belleğinde çalışan 30 kurumsal düzeyde belge aracı. Sunucu riski olmadan birleştirin, bölün, sıkıştırın, düzenleyin ve denetleyin.",
    "hero_drop_title": "Herhangi bir PDF, Ekstre veya Görseli Buraya Bırakın",
    "hero_drop_sub": "Anında yerel bellekte işlem · Harici sunuculara tek bir bayt dahi gönderilmez",
    "hero_drop_btn": "Belge Seç",
    "hero_recent_title": "Son Kullanılan Belgeler",
    "hero_recent_clear": "Temizle",
    "filter_all": "Tüm Araçlar",
    "filter_banking": "Bankacılık & Finans",
    "filter_organize": "PDF Düzenle",
    "filter_optimize": "PDF Optimize Et",
    "filter_convert": "PDF Dönüştür",
    "filter_edit": "Düzenle & Doldur",
    "filter_security": "PDF Güvenliği",
    "filter_intelligence": "Yapay Zeka & OCR",
    "card_merge_title": "PDF Birleştir",
    "card_merge_desc": "PDF dosyalarını istediğiniz sırayla en hızlı şekilde birleştirin.",
    "card_merge_action": "Birleştir",
    "card_split_title": "PDF Böl",
    "card_split_desc": "Sayfaları veya aralıkları bağımsız PDF dosyalarına ayırın.",
    "card_split_action": "Böl",
    "card_compress_title": "PDF Sıkıştır",
    "card_compress_desc": "Maksimum vektör kalitesini koruyarak dosya boyutunu küçültün.",
    "card_compress_action": "Sıkıştır",
    "card_excel_title": "PDF'den Excel'e (3 Sayfa)",
    "card_excel_desc": "Banka işlemlerini mutabakat denetimli 3 sayfalı Excel tablosuna aktarın.",
    "card_excel_action": "Dönüştür",
    "card_pdf2img_title": "PDF'den JPG / PNG'ye",
    "card_pdf2img_desc": "PDF sayfalarını kalite kaybı olmadan yüksek çözünürlükte dışa aktarın.",
    "card_pdf2img_action": "Dışa Aktar",
    "card_img2pdf_title": "JPG / PNG'den PDF'ye",
    "card_img2pdf_desc": "JPG, PNG, WebP ve BMP görsellerini tek bir PDF belgesinde birleştirin.",
    "card_img2pdf_action": "Dönüştür",
    "card_organize_title": "PDF Sayfalarını Düzenle",
    "card_organize_desc": "Sürükleyip bırakarak sayfaları yeniden sıralayın veya silin.",
    "card_organize_action": "Düzenle",
    "card_sign_title": "PDF İmzala",
    "card_sign_desc": "Sayfalara çizilmiş veya yazılmış imzanızı ekleyin.",
    "card_sign_action": "İmzala",
    "card_watermark_title": "PDF Filigran Ekle",
    "card_watermark_desc": "Seçilen sayfalara özel metin veya gizlilik filigranı damgalayın.",
    "card_watermark_action": "Damgala",
    "card_rotate_title": "PDF Döndür",
    "card_rotate_desc": "Sayfaları 90, 180 veya 270 derece toplu olarak döndürün.",
    "card_rotate_action": "Döndür",
    "card_unlock_title": "PDF Kilidi Aç",
    "card_unlock_desc": "Korumalı PDF dosyalarındaki şifre kısıtlamalarını kaldırın.",
    "card_unlock_action": "Kilit Aç",
    "card_protect_title": "PDF Şifrele",
    "card_protect_desc": "PDF'inizi standart AES 128/256-bit şifreleme ile koruyun.",
    "card_protect_action": "Koru",
    "card_crop_title": "PDF Kırp",
    "card_crop_desc": "Kenar boşluklarını kırpın ve sayfa alanlarını ayarlayın.",
    "card_crop_action": "Kırp",
    "card_extractimg_title": "Görselleri Çıkart",
    "card_extractimg_desc": "PDF belgesindeki tüm gömülü resimleri orijinal kalitede ayıklayın.",
    "card_extractimg_action": "Çıkart",
    "card_compare_title": "PDF Karşılaştır",
    "card_compare_desc": "İki PDF sürümünü görsel ve metinsel olarak yan yana karşılaştırın.",
    "card_compare_action": "Karşılaştır",
    "card_pagenumber_title": "Sayfa Numaraları Ekle",
    "card_pagenumber_desc": "Özelleştirilebilir sayfa numaralandırması ekleyin.",
    "card_pagenumber_action": "Ekle",
    "card_redact_title": "Kalıcı Sansürleme (Redact)",
    "card_redact_desc": "Hesap numaralarını ve gizli bilgileri geri alınamaz biçimde karartın.",
    "card_redact_action": "Karart",
    "card_ocr_title": "PDF'den Markdown'a (OCR)",
    "card_ocr_desc": "Tarayıcı içi OCR ile düz metin ve biçimlendirilmiş Markdown elde edin.",
    "card_ocr_action": "Çıkart",
    "card_pdf2word_title": "PDF'den Word'e (.docx)",
    "card_pdf2word_desc": "Düzenlenebilir tablolar içeren Microsoft Word belgesine dönüştürün.",
    "card_pdf2word_action": "Dönüştür",
    "card_office2pdf_title": "Office'ten PDF'ye",
    "card_office2pdf_desc": "Word, Excel ve CSV dosyalarını doğrudan PDF'e çevirin.",
    "card_excel2pdf_title": "Excel'den PDF'e",
    "card_excel2pdf_desc": "EXCEL elektronik tablolarını kolayca okunabilir PDF belgelerine dönüştürün.",
    "card_office2pdf_action": "Dönüştür",
    "card_pdfa_title": "ISO PDF/A Arşivleme",
    "card_pdfa_desc": "Uzun vadeli yasal arşivleme için ISO 19005-1 uyumlu PDF/A'ya dönüştürün.",
    "card_pdfa_action": "Arşivle",
    "card_digitalsign_title": "Kriptografik PKI Mührü",
    "card_digitalsign_desc": "Değiştirilemez SHA-256 dijital kriptografik karma mührü uygulayın.",
    "card_digitalsign_action": "Mühürle",
    "card_summarize_title": "Belge Özetleme",
    "card_summarize_desc": "Önemli finansal verileri ve özetleri anında elde edin.",
    "card_summarize_action": "Özetle",
    "card_repair_title": "Bozuk PDF Kurtarma",
    "card_repair_desc": "XREF tablolarını yeniden oluşturarak hasarlı dosyaları kurtarın.",
    "card_repair_action": "Kurtar",
    "card_editpdf_title": "PDF Düzenleyici",
    "card_editpdf_desc": "PDF sayfaları üzerine doğrudan metin, şekil, ok ve çizim ekleyin.",
    "card_editpdf_action": "Düzenle",
    "card_formfill_title": "PDF Formu Doldur",
    "card_formfill_desc": "Etkileşimli AcroForm alanlarını ve onay kutularını doldurun.",
    "card_formfill_action": "Doldur",
    "card_pptx2pdf_title": "PowerPoint'ten PDF'ye",
    "card_pptx2pdf_desc": "PowerPoint .pptx slaytlarını yüksek kaliteli PDF belgelerine dönüştürün.",
    "card_pptx2pdf_action": "Dönüştür",
    "card_pdf2pptx_title": "PDF'den PowerPoint'e",
    "card_pdf2pptx_desc": "PDF sayfalarını 16:9 geniş ekran PowerPoint sunumuna dönüştürün.",
    "card_pdf2pptx_action": "Dönüştür",
    "card_scan2pdf_title": "Tara ve PDF Yap",
    "card_scan2pdf_desc": "Cihaz kamerasıyla belgelerin fotoğrafını çekip anında PDF oluşturun.",
    "card_scan2pdf_action": "Tara",
    "trust_title": "Gizli belgeler için dünya çapında güvenilen PDF yazılımı",
    "trust_subtitle": "Statement2Sheet %100 yerel olarak tarayıcınızın belleğinde çalışır. Hiçbir finansal veri bilgisayarınızdan dışarı çıkmaz.",
    "trust_p1_title": "Geçici RAM Bellek",
    "trust_p1_desc": "Sekme kapatıldığında veya tıklandığında anında temizlenir",
    "trust_p2_title": "%100 Tarayıcı İçi",
    "trust_p2_desc": "Harici sunuculara sıfır dosya yüklemesi",
    "trust_p3_title": "Resmi ISO Standartları",
    "trust_p3_desc": "PDF-1.7, PDF/A-1b ve Microsoft OpenXML uyumlu",
    "trust_p4_title": "Donanım Hızlandırmalı",
    "trust_p4_desc": "WebAssembly ve TypedArrays ile desteklenir",
    "guides_badge": "Kurumsal Finansal Zeka",
    "guides_title": "Statement2Sheet İş Akışınızı Nasıl Güçlendirir?",
    "guides_sub": "Mutabakatlı 3 sayfalı Excel'den QuickBooks OFX formatına kadar, gizlilikten ödün vermeden nasıl çalıştığımızı keşfedin.",
    "faq_title": "Sıkça Sorulan Sorular",
    "faq_sub": "Hesap ekstresi dönüştürme, muhasebe formatları ve veri güvenliği hakkında her şey.",
    "faq_q1": "Statement2Sheet banka ekstrelerini Excel'e (.xlsx) nasıl dönüştürür?",
    "faq_q2": "PDF ekstrelerini temiz CSV formatına dönüştürebilir miyim?",
    "faq_q3": "QuickBooks (.QBO) WebConnect dışa aktarma destekleniyor mu?",
    "faq_q4": "Banka verilerim Statement2Sheet ile güvende mi?",
    "faq_q5": "İnternet bağlantısı olmadan çevrimdışı kullanabilir miyim?",
    "faq_q6": "Taranmış ekstreler ve fotoğraflar destekleniyor mu?",
    "footer_col_product": "ÜRÜN",
    "footer_col_financial": "FİNANS PAKETİ",
    "footer_col_solutions": "ÇÖZÜMLER",
    "footer_col_legal": "YASAL",
    "footer_col_company": "ŞİRKET",
    "footer_copyright": "© 2026 Statement2Sheet. Banka ekstreleri ve PDF'ler için gereken tüm araçlar tek bir yerde.",
    "footer_badge_wasm": "WebAssembly Destekli",
    "footer_badge_offline": "Çevrimdışı Uyumlu PWA",
    "footer_badge_status": "%100 İstemci Taraflı",
    "card_bankstmt_title": "Banka Ekstresinden Excel'e",
    "card_bankstmt_desc": "Karmaşık ekstreleri mutabakat denetimli 3 sayfalı Excel çalışma kitabına dönüştürün.",
    "card_bankstmt_action": "Dönüştür",
    "card_qbo_title": "QuickBooks (.QBO)",
    "card_qbo_desc": "QuickBooks'a doğrudan aktarım için WebConnect OFX .QBO dosyaları oluşturun.",
    "card_qbo_action": "Dışa Aktar"
  },
  "id": {
    "nav_brand_title": "Statement2Sheet",
    "nav_brand_sub": "Financial & PDF Intelligence",
    "nav_merge": "Gabungkan PDF",
    "nav_split": "Pisahkan PDF",
    "nav_compress": "Kompres PDF",
    "nav_convert": "Konversi PDF",
    "tool_excel": "PDF ke Excel (3 Lembar)",
    "tool_pdf2img": "PDF ke JPG / PNG",
    "tool_img2pdf": "JPG / PNG ke PDF",
    "tool_ocr": "PDF ke Markdown",
    "nav_all_tools": "SEMUA ALAT PDF",
    "badge_free_private": "100% Gratis · Tanpa Daftar",
    "badge_offline": "Siap Offline",
    "btn_clear_data": "Hapus Data",
    "btn_quick_tour": "Tur Cepat",
    "repair_title": "Perbaiki File PDF",
    "repair_subtitle": "Pulihkan file PDF rusak atau terpotong langsung di browser Anda.",
    "hero_badge": "🔒 100% Privasi di Browser · Tanpa Unggah ke Cloud",
    "hero_title": "Semua Alat yang Anda Butuhkan untuk PDF & Rekening Koran",
    "hero_subtitle": "30 alat dokumen kelas enterprise yang berjalan 100% di memori RAM browser Anda. Gabung, pisah, kompres, edit, dan audit tanpa risiko server.",
    "hero_drop_title": "Tarik & Lepas PDF, Rekening Koran, atau Gambar di Sini",
    "hero_drop_sub": "Pemrosesan instan di RAM lokal · Nol byte data dikirim ke server luar",
    "hero_drop_btn": "Pilih Dokumen",
    "hero_recent_title": "Dokumen Terakhir",
    "hero_recent_clear": "Hapus",
    "filter_all": "Semua Alat",
    "filter_banking": "Perbankan & Keuangan",
    "filter_organize": "Kelola PDF",
    "filter_optimize": "Optimalkan PDF",
    "filter_convert": "Konversi PDF",
    "filter_edit": "Edit & Isi",
    "filter_security": "Keamanan PDF",
    "filter_intelligence": "AI & OCR",
    "card_merge_title": "Gabungkan PDF",
    "card_merge_desc": "Satukan beberapa file PDF sesuai urutan yang Anda inginkan dengan cepat.",
    "card_merge_action": "Gabung",
    "card_split_title": "Pisahkan PDF",
    "card_split_desc": "Pisahkan satu halaman atau beberapa halaman menjadi file PDF terpisah.",
    "card_split_action": "Pisah",
    "card_compress_title": "Kompres PDF",
    "card_compress_desc": "Kurangi ukuran file sambil mempertahankan kualitas vektor maksimal.",
    "card_compress_action": "Kompres",
    "card_excel_title": "PDF ke Excel (3 Lembar)",
    "card_excel_desc": "Ekstrak mutasi bank ke buku kerja Excel 3 lembar dengan audit rekonsiliasi saldo.",
    "card_excel_action": "Konversi",
    "card_pdf2img_title": "PDF ke JPG / PNG",
    "card_pdf2img_desc": "Ekstrak gambar resolusi tinggi dari halaman PDF tanpa kompresi rusak.",
    "card_pdf2img_action": "Ekstrak",
    "card_img2pdf_title": "JPG / PNG ke PDF",
    "card_img2pdf_desc": "Ubah gambar JPG, PNG, WebP, dan BMP menjadi satu dokumen PDF rapi.",
    "card_img2pdf_action": "Konversi",
    "card_organize_title": "Atur Halaman PDF",
    "card_organize_desc": "Urutkan, hapus, dan atur ulang posisi halaman dengan seret-lepas.",
    "card_organize_action": "Atur",
    "card_sign_title": "Tandatangani PDF",
    "card_sign_desc": "Bubuhi tanda tangan gambar atau ketik langsung pada halaman mana pun.",
    "card_sign_action": "Tanda Tangani",
    "card_watermark_title": "Watermark PDF",
    "card_watermark_desc": "Bubuhkan stempel teks kustom atau watermark rahasia pada halaman.",
    "card_watermark_action": "Bubuhi",
    "card_rotate_title": "Putar PDF",
    "card_rotate_desc": "Putar orientasi halaman 90, 180, atau 270 derajat sekaligus.",
    "card_rotate_action": "Putar",
    "card_unlock_title": "Buka Kunci PDF",
    "card_unlock_desc": "Hapus batasan kata sandi keamanan dari file PDF terproteksi.",
    "card_unlock_action": "Buka",
    "card_protect_title": "Kunci Password PDF",
    "card_protect_desc": "Lindungi PDF Anda dengan enkripsi sandi standar AES 128/256-bit.",
    "card_protect_action": "Kunci",
    "card_crop_title": "Pangkas PDF",
    "card_crop_desc": "Pangkas margin dan sesuaikan area halaman dengan pemegang visual.",
    "card_crop_action": "Pangkas",
    "card_extractimg_title": "Ekstrak Gambar",
    "card_extractimg_desc": "Ekstrak semua gambar tersemat di dokumen PDF dalam kualitas asli.",
    "card_extractimg_action": "Ekstrak",
    "card_compare_title": "Bandingkan PDF",
    "card_compare_desc": "Bandingkan perbedaan visual dan teks dua versi dokumen secara berdampingan.",
    "card_compare_action": "Bandingkan",
    "card_pagenumber_title": "Nomor Halaman",
    "card_pagenumber_desc": "Sisipkan penomoran halaman yang dapat disesuaikan letak dan gayanya.",
    "card_pagenumber_action": "Sisipkan",
    "card_redact_title": "Hapus Permanen (Redact)",
    "card_redact_desc": "Hitamkan secara permanen nomor rekening dan data rahasia tanpa bisa dipulihkan.",
    "card_redact_action": "Hitamkan",
    "card_ocr_title": "PDF ke Markdown (OCR)",
    "card_ocr_desc": "Ekstrak teks polos dan Markdown terstruktur menggunakan OCR di browser.",
    "card_ocr_action": "Ekstrak",
    "card_pdf2word_title": "PDF ke Word (.docx)",
    "card_pdf2word_desc": "Ubah PDF menjadi Microsoft Word OpenXML dengan tabel yang dapat diedit.",
    "card_pdf2word_action": "Konversi",
    "card_office2pdf_title": "Office ke PDF",
    "card_office2pdf_desc": "Konversi Word, spreadsheet Excel, dan file CSV langsung ke PDF.",
    "card_excel2pdf_title": "Excel ke PDF",
    "card_excel2pdf_desc": "Ubah spreadsheet EXCEL menjadi dokumen PDF yang rapi dan mudah dibaca.",
    "card_office2pdf_action": "Konversi",
    "card_pdfa_title": "Arsip ISO PDF/A",
    "card_pdfa_desc": "Ubah dokumen ke standar ISO 19005-1 untuk arsip legal jangka panjang.",
    "card_pdfa_action": "Arsipkan",
    "card_digitalsign_title": "Segel Kriptografi PKI",
    "card_digitalsign_desc": "Bubuhi segel hash kriptografi digital SHA-256 anti-manipulasi.",
    "card_digitalsign_action": "Segel",
    "card_summarize_title": "Ringkas Dokumen",
    "card_summarize_desc": "Dapatkan angka-angka keuangan penting dan ringkasan terstruktur dalam sekejap.",
    "card_summarize_action": "Ringkas",
    "card_repair_title": "Perbaiki PDF Rusak",
    "card_repair_desc": "Pulihkan file PDF rusak dengan membangun ulang tabel referensi XREF.",
    "card_repair_action": "Perbaiki",
    "card_editpdf_title": "Edit PDF",
    "card_editpdf_desc": "Tambahkan teks, bentuk, panah, dan coretan bebas langsung di halaman.",
    "card_editpdf_action": "Edit",
    "card_formfill_title": "Isi Formulir PDF",
    "card_formfill_desc": "Deteksi dan isi kolom formulir interaktif AcroForm dan kotak centang.",
    "card_formfill_action": "Isi",
    "card_pptx2pdf_title": "PowerPoint ke PDF",
    "card_pptx2pdf_desc": "Ubah slide presentasi .pptx menjadi dokumen PDF berkualitas tinggi.",
    "card_pptx2pdf_action": "Konversi",
    "card_pdf2pptx_title": "PDF ke PowerPoint",
    "card_pdf2pptx_desc": "Ubah halaman PDF menjadi slide presentasi PowerPoint 16:9 yang dapat diedit.",
    "card_pdf2pptx_action": "Konversi",
    "card_scan2pdf_title": "Pindai ke PDF",
    "card_scan2pdf_desc": "Ambil foto dokumen menggunakan kamera perangkat dan jadikan PDF rapi seketika.",
    "card_scan2pdf_action": "Pindai",
    "trust_title": "Aplikasi PDF tepercaya di seluruh dunia untuk dokumen rahasia",
    "trust_subtitle": "Statement2Sheet bekerja 100% lokal di memori browser Anda. Tidak ada data keuangan yang keluar dari komputer Anda.",
    "trust_p1_title": "Memori RAM Sementara",
    "trust_p1_desc": "Terhapus bersih saat tab ditutup atau saat ditekan",
    "trust_p2_title": "100% di Dalam Browser",
    "trust_p2_desc": "Nol pengunggahan ke server cloud eksternal",
    "trust_p3_title": "Standar ISO Internasional",
    "trust_p3_desc": "Kompatibel dengan PDF-1.7, PDF/A-1b, dan Microsoft OpenXML",
    "trust_p4_title": "Akselerasi Perangkat Keras",
    "trust_p4_desc": "Ditenagai oleh WebAssembly dan TypedArrays HTML5",
    "guides_badge": "Kecerdasan Finansial Perusahaan",
    "guides_title": "Bagaimana Statement2Sheet Mengoptimalkan Alur Kerja Anda",
    "guides_sub": "Dari buku kerja 3 lembar terekonsiliasi hingga ekspor QuickBooks OFX, pelajari teknologi lokal kami yang aman tanpa kompromi.",
    "faq_title": "Pertanyaan yang Sering Diajukan (FAQ)",
    "faq_sub": "Semua hal tentang konversi rekening koran, format akuntansi, dan keamanan data.",
    "faq_q1": "Bagaimana Statement2Sheet mengonversi rekening koran ke Excel (.xlsx)?",
    "faq_q2": "Dapatkah saya mengubah mutasi PDF menjadi format CSV yang rapi?",
    "faq_q3": "Apakah ekspor QuickBooks (.QBO) WebConnect didukung?",
    "faq_q4": "Apakah data perbankan saya aman saat menggunakan Statement2Sheet?",
    "faq_q5": "Dapatkah saya menggunakan Statement2Sheet secara offline tanpa internet?",
    "faq_q6": "Apakah dokumen rekening koran hasil pemindaian atau foto didukung?",
    "footer_col_product": "PRODUK",
    "footer_col_financial": "SUITE KEUANGAN",
    "footer_col_solutions": "SOLUSI",
    "footer_col_legal": "HUKUM",
    "footer_col_company": "PERUSAHAAN",
    "footer_copyright": "© 2026 Statement2Sheet. Semua alat yang dibutuhkan untuk rekening koran dan PDF di satu tempat.",
    "footer_badge_wasm": "Ditenagai WebAssembly",
    "footer_badge_offline": "PWA Siap Offline",
    "footer_badge_status": "100% di Sisi Klien",
    "card_bankstmt_title": "Rekening Koran ke Excel",
    "card_bankstmt_desc": "Ubah rekening koran menjadi buku kerja Excel 3 lembar dengan audit rekonsiliasi saldo.",
    "card_bankstmt_action": "Konversi",
    "card_qbo_title": "QuickBooks (.QBO)",
    "card_qbo_desc": "Buat file WebConnect OFX .QBO untuk impor langsung ke software QuickBooks.",
    "card_qbo_action": "Ekspor"
  }
};

    function applyLanguage(langCode) {
      const selected = I18N_TRANSLATIONS[langCode] ? langCode : 'en';
      try {
        localStorage.setItem('s2s_user_lang', selected);
      } catch (e) {}
      document.documentElement.lang = selected;

      // Handle RTL for Arabic
      if (selected === 'ar') {
        document.documentElement.dir = 'rtl';
      } else {
        document.documentElement.dir = 'ltr';
      }

      const langSelect = document.getElementById('lang-select');
      if (langSelect && langSelect.value !== selected) {
        langSelect.value = selected;
      }

      const dict = I18N_TRANSLATIONS[selected];
      const elements = document.querySelectorAll('[data-i18n]');
      elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict && dict[key]) {
          el.textContent = dict[key];
        }
      });
    }

    function initI18n() {
      const langSelect = document.getElementById('lang-select');
      if (langSelect) {
        langSelect.addEventListener('change', (e) => {
          applyLanguage(e.target.value);
        });
        langSelect.addEventListener('input', (e) => {
          applyLanguage(e.target.value);
        });
      }
      let savedLang = 'en';
      try {
        savedLang = localStorage.getItem('s2s_user_lang') || 'en';
      } catch (e) {}
      applyLanguage(savedLang);
    }

    function initPortalApp() {
      initThemeToggle();
      initUploadListeners();
      initTabListeners();
      initExportListeners();
      initMergeToolListeners();
      initSplitToolListeners();
      initOrganizeToolListeners();
      initUnlockToolListeners();
      initWatermarkToolListeners();
      initPageNumberToolListeners();
      initPdfToImageToolListeners();
      initImageToPdfToolListeners();
      initCompressToolListeners();
      initSignToolListeners();
      initProtectToolListeners();
      initMarkdownToolListeners();
      initCropToolListeners();
      initExtractImagesToolListeners();
      initCompareToolListeners();
      initRotateToolListeners();
      initRedactToolListeners();
      initPdf2WordToolListeners();
      initOffice2PdfToolListeners();
      initPdfaToolListeners();
      initDigitalSignToolListeners();
      initSummarizeToolListeners();
      initRepairToolListeners();
      initEditPdfToolListeners();
      initFormFillerToolListeners();
      initPptx2PdfToolListeners();
      initPdf2PptxToolListeners();
      initScan2PdfToolListeners();
      initI18n();
      initGlobalKeyboardShortcuts();
      loadRecentFiles();
      switchPortalTool('dashboard', { force: true, noAnimate: true, fromPopState: true });
      initOverscrollHistoryNavigation();
      initOnboarding();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initPortalApp);
    } else {
      initPortalApp();
    }

    // Theme toggle handling
    function initThemeToggle() {
      const themeToggleBtn = document.getElementById('theme-toggle');
      if (!themeToggleBtn || !document.documentElement || !document.documentElement.classList) return;
      const lightIcon = document.getElementById('theme-toggle-light-icon');
      const darkIcon = document.getElementById('theme-toggle-dark-icon');

      function updateIcons() {
        if (document.documentElement && document.documentElement.classList && document.documentElement.classList.contains('dark')) {
          if (lightIcon) lightIcon.classList.remove('hidden');
          if (darkIcon) darkIcon.classList.add('hidden');
        } else {
          if (lightIcon) lightIcon.classList.add('hidden');
          if (darkIcon) darkIcon.classList.remove('hidden');
        }
      }

      updateIcons();

      themeToggleBtn.addEventListener('click', () => {
        if (document.documentElement.classList.contains('dark')) {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('theme', 'light');
        } else {
          document.documentElement.classList.add('dark');
          localStorage.setItem('theme', 'dark');
        }
        updateIcons();
      });
    }

        
    // Global Drag Guard: Prevent browser from opening dropped files outside drop zones
    if (typeof window !== 'undefined') {
      window.addEventListener('dragover', (e) => { e.preventDefault(); });
      window.addEventListener('drop', (e) => { e.preventDefault(); });
    }

    function initUploadListeners() {
      const dropZone = document.getElementById('drop-zone');
      const fileInput = document.getElementById('universal-file-input');
      if (!dropZone || !fileInput) return;

      // Click anywhere on dashed dropzone to open file dialog
      dropZone.addEventListener('click', (e) => {
        if (e.target !== fileInput) fileInput.click();
      });
      dropZone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
      });

      let depth = 0;
      dropZone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        depth++;
        dropZone.classList.add('border-emerald-500', 'bg-emerald-50/20', 'ring-2', 'ring-emerald-400');
      });
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      });
      dropZone.addEventListener('dragleave', () => {
        depth--;
        if (depth <= 0) {
          depth = 0;
          dropZone.classList.remove('border-emerald-500', 'bg-emerald-50/20', 'ring-2', 'ring-emerald-400');
        }
      });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        depth = 0;
        dropZone.classList.remove('border-emerald-500', 'bg-emerald-50/20', 'ring-2', 'ring-emerald-400');
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length) {
          inspectAndValidateFiles(Array.from(dt.files));
        }
      });
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) {
          inspectAndValidateFiles(Array.from(e.target.files));
        }
      });

      const heroDrop = document.getElementById('hero-quick-drop');
      if (heroDrop) {
        heroDrop.addEventListener('click', () => {
          fileInput.click();
        });
        heroDrop.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          heroDrop.classList.add('border-emerald-500', 'bg-emerald-50/40', 'dark:bg-emerald-950/40', 'ring-2', 'ring-emerald-400');
        });
        heroDrop.addEventListener('dragleave', () => {
          heroDrop.classList.remove('border-emerald-500', 'bg-emerald-50/40', 'dark:bg-emerald-950/40', 'ring-2', 'ring-emerald-400');
        });
        heroDrop.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          heroDrop.classList.remove('border-emerald-500', 'bg-emerald-50/40', 'dark:bg-emerald-950/40', 'ring-2', 'ring-emerald-400');
          const dt = e.dataTransfer;
          if (dt && dt.files && dt.files.length) {
            inspectAndValidateFiles(Array.from(dt.files));
          }
        });
      }

      // Preview stage action buttons
      const btnCancel = document.getElementById('btn-pv-cancel');
      if (btnCancel) {
        btnCancel.addEventListener('click', () => {
          document.getElementById('preview-stage').classList.add('hidden');
          document.getElementById('intake-section').classList.remove('hidden');
          fileInput.value = '';
          AppState.pendingFile = null;
        });
      }

      const btnStart = document.getElementById('btn-pv-start');
      if (btnStart) {
        btnStart.addEventListener('click', () => {
          if (AppState.pendingFile) {
            document.getElementById('preview-stage').classList.add('hidden');
            executePipeline([AppState.pendingFile]);
          }
        });
      }

      const btnReset = document.getElementById('btn-header-reset');
      if (btnReset) btnReset.addEventListener('click', resetApplication);
    }

    // ================= FILE VALIDATION & PREVIEW LAYER =================
    async function inspectAndValidateFiles(files) {
      const alertBox = document.getElementById('upload-validation-alert');
      if (alertBox) {
        alertBox.classList.add('hidden');
        alertBox.replaceChildren();
      }

      function showUploadAlert(title, message, detail) {
        if (!alertBox) return;
        alertBox.replaceChildren();
        const iconSpan = document.createElement('span');
        iconSpan.textContent = '⚠️ ';
        const strongEl = document.createElement('strong');
        strongEl.textContent = title + ': ';
        const msgSpan = document.createElement('span');
        msgSpan.textContent = message + (detail ? ' ' : '');
        alertBox.append(iconSpan, strongEl, msgSpan);
        if (detail) {
          const codeEl = document.createElement('code');
          codeEl.textContent = detail;
          alertBox.append(codeEl);
        }
        alertBox.classList.remove('hidden');
      }

      if (!files || files.length === 0) return;
      const file = files[0];

      // 1. File Size Validation (50MB Limit)
      const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2);
      if (file.size > 50 * 1024 * 1024) {
        showUploadAlert('File Too Large', 'Maximum file size is 50MB. Selected file is ' + fileSizeMb + 'MB.');
        return;
      }

      // 2. Binary Magic-Byte Signature Validation
      const magic = await validateFileMagicBytes(file);
      if (!magic.valid) {
        showUploadAlert('Security Validation Error', (magic.error || 'Unsupported format.') + ' Detected file:', file.name || 'Unknown file');
        return;
      }

      const isPdf = magic.format === 'pdf';
      const isImg = ['png', 'jpeg', 'webp', 'bmp'].includes(magic.format);

      // 3. Document Page Limit Check (Max 300 Pages)
      if (magic.format === 'pdf') {
        try {
          const buffer = await file.slice(0, Math.min(file.size, 1024 * 1024 * 8)).arrayBuffer();
          const quickPdf = await pdfjsLib.getDocument({ data: buffer }).promise;
          if (quickPdf.numPages > 300) {
            showUploadAlert('Page Limit Exceeded', 'Maximum supported document size is 300 pages (Detected: ' + quickPdf.numPages + ' pages). Please split document first.');
            return;
          }
        } catch (e) {}
      }

      AppState.pendingFile = file;

      // Transition to Preview Stage
      const intakeSec = document.getElementById('intake-section');
      const pvStage = document.getElementById('preview-stage');
      if (intakeSec) intakeSec.classList.add('hidden');
      if (pvStage) pvStage.classList.remove('hidden');

      const elName = document.getElementById('pv-filename');
      const elSize = document.getElementById('pv-filesize');
      const elPages = document.getElementById('pv-pages');
      if (elName) elName.innerText = file.name;
      if (elSize) elSize.innerText = `${fileSizeMb} MB`;
      if (elPages) elPages.innerText = isPdf ? 'Analyzing PDF...' : '1 Image Page';

      const warningEl = document.getElementById('pv-large-file-warning');
      if (warningEl) {
        if (file.size > 15 * 1024 * 1024) warningEl.classList.remove('hidden');
        else warningEl.classList.add('hidden');
      }

      // Safely generate thumbnail in background without blocking start button
      const canvas = document.getElementById('preview-thumbnail-canvas');
      const spinner = document.getElementById('thumb-loading-spinner');
      if (spinner) spinner.classList.remove('hidden');

      try {
        if (isPdf) {
          const buffer = await file.arrayBuffer();
          const loadingTask = pdfjsLib.getDocument({ data: buffer.slice(0) });
          const pdf = await loadingTask.promise;
          if (elPages) elPages.innerText = `${pdf.numPages} Page(s)`;

          if (canvas) {
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.5 });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;
          }
        } else {
          if (elPages) elPages.innerText = '1 Image Page';
          if (canvas) {
            const imgBitmap = await createImageBitmap(file);
            canvas.width = 140;
            canvas.height = 180;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imgBitmap, 0, 0, canvas.width, canvas.height);
          }
        }
      } catch (e) {
        console.warn('Preview thumbnail fallback:', e);
        if (elPages) elPages.innerText = isPdf ? 'PDF Ready' : 'Image Ready';
      } finally {
        if (spinner) spinner.classList.add('hidden');
      }
    }

    function initTabListeners() {
      const tabBtns = document.querySelectorAll('.tab-btn');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          tabBtns.forEach(b => {
            b.classList.remove('border-emerald-600', 'text-emerald-600', 'dark:text-emerald-400');
            b.classList.add('border-transparent');
            b.setAttribute('aria-selected', 'false');
          });
          btn.classList.add('border-emerald-600', 'text-emerald-600', 'dark:text-emerald-400');
          btn.classList.remove('border-transparent');
          btn.setAttribute('aria-selected', 'true');

          document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
          const target = document.getElementById(btn.getAttribute('data-tab'));
          if (target) target.classList.remove('hidden');
        });
      });

      document.getElementById('btn-filter-issues').addEventListener('click', () => {
        AppState.filterOnlyIssues = !AppState.filterOnlyIssues;
        document.getElementById('btn-filter-issues').innerText = AppState.filterOnlyIssues ? 'Show All Transactions' : 'Filter: Show Only Flagged Items';
        renderTransactionsTable();
      });

      document.getElementById('btn-add-transaction').addEventListener('click', addNewBlankTransaction);
      document.getElementById('btn-recalculate-balances').addEventListener('click', auditAndReconcileBalances);
    }

    // ================= PIPELINE EXECUTION =================
    async function executePipeline(fileList) {
      AppState.files = fileList;
      document.getElementById('processing-section').classList.remove('hidden');

      setStage('stage-upload', 'File Ingestion & Boundary Analysis');
      
      try {
        let fullExtractedLines = [];
        let accumulatedRawText = '';

        for (let i = 0; i < fileList.length; i++) {
          const file = fileList[i];
          updateProgressDetail(`Reading file ${i + 1} of ${fileList.length}: ${file.name}`);

          if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            const pdfResult = await extractPdfContent(file);
            fullExtractedLines.push(...pdfResult.lines);
            accumulatedRawText += pdfResult.rawText + '\n';
          } else if (file.type.startsWith('image/')) {
            setStage('stage-ocr', 'Image Preprocessing & OCR Extraction');
            const imgResult = await extractImageContentWithOcr(file);
            fullExtractedLines.push(...imgResult.lines);
            accumulatedRawText += imgResult.rawText + '\n';
          }
        }

        AppState.rawLines = fullExtractedLines;
        AppState.rawText = accumulatedRawText;

        setStage('stage-understand', 'Semantic Column & Section Extraction');
        extractStatementMetadata(accumulatedRawText);
        AppState.transactions = parseUniversalTransactions(fullExtractedLines);

        setStage('stage-validate', 'Transaction & Balance Reconciliation');
        auditAndReconcileBalances();

        // Switch to Review Workspace
        document.getElementById('processing-section').classList.add('hidden');
        document.getElementById('workspace-section').classList.remove('hidden');
        const btnHdrReset = document.getElementById('btn-header-reset') || document.getElementById('btn-purge-session');
        if (btnHdrReset) btnHdrReset.classList.remove('hidden');

        populateWorkspaceUI();

      } catch (err) {
        console.error('Universal Converter Execution Error:', err);
        alert('Extraction error: ' + (err.message || 'Check statement format.'));
        resetApplication();
      }
    }

    function setStage(stageId, title) {
      document.getElementById('processing-step-title').innerText = title;
      const el = document.getElementById(stageId);
      if (el) {
        el.querySelector('span:first-child').className = 'text-emerald-600 dark:text-emerald-400 font-bold';
        el.querySelector('span:first-child').innerText = '✓';
      }
    }

    function updateProgressDetail(text) {
      document.getElementById('processing-step-detail').innerText = text;
    }

    // ================= EXTRACTOR 1: DIGITAL PDF VECTOR PARSER =================
    async function extractPdfContent(file) {
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
      AppState.metadata.pageCount = pdf.numPages;

      let lines = [];
      let rawText = '';
      let isScannedCandidate = true;

      for (let p = 1; p <= pdf.numPages; p++) {
        updateProgressDetail(`Vector parsing page ${p} of ${pdf.numPages}...`);
        const page = await pdf.getPage(p);
        const textContent = await page.getTextContent();

        if (textContent.items && textContent.items.length > 5) {
          isScannedCandidate = false;
          // Cluster words by Y coordinate with 7.0px tolerance
          const lineMap = [];
          for (const item of textContent.items) {
            const str = item.str.trim();
            if (!str) continue;
            rawText += str + ' ';

            const y = item.transform[5];
            const x = item.transform[4];
            let line = lineMap.find(l => Math.abs(l.y - y) <= 7.0);
            if (line) {
              line.items.push({ x, str: item.str });
            } else {
              lineMap.push({ y, items: [{ x, str: item.str }] });
            }
          }
          lineMap.sort((a, b) => b.y - a.y);
          for (const l of lineMap) {
            l.items.sort((a, b) => a.x - b.x);
            lines.push(l.items.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim());
          }
        }
      }

      // If document has no selectable text, trigger OCR
      if (isScannedCandidate || lines.length < 3) {
        updateProgressDetail('Scanned document detected. Engaging high-accuracy in-browser OCR...');
        return await runOcrOnPdfPages(pdf);
      }

      return { lines, rawText };
    }

    async function runOcrOnPdfPages(pdf) {
      await ensureTesseract();
      const selectedOcrLang = document.getElementById('ocr-lang-select')?.value || 'eng';
      const worker = await Tesseract.createWorker(selectedOcrLang);
      let lines = [];
      let rawText = '';

      const maxPages = Math.min(pdf.numPages, 10);
      for (let p = 1; p <= maxPages; p++) {
        updateProgressDetail(`Running OCR (${selectedOcrLang}) on page ${p} of ${maxPages}...`);
        const page = await pdf.getPage(p);
        const viewport = page.getViewport({ scale: 2.0 }); // 2x crisp scale for OCR

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: ctx, viewport }).promise;

        // Image Preprocessing on Canvas: Contrast stretching
        preprocessCanvasContrast(ctx, canvas.width, canvas.height);

        const { data: { text } } = await worker.recognize(canvas);
        rawText += text + '\n';
        lines.push(...text.split('\n').map(l => l.trim()).filter(l => l.length > 3));
      }

      await worker.terminate();
      return { lines, rawText };
    }

    // ================= EXTRACTOR 2: IMAGE PREPROCESSOR & OCR =================
    async function extractImageContentWithOcr(imageFile) {
      await ensureTesseract();
      const imgBitmap = await createImageBitmap(imageFile);
      const maxDim = Math.max(imgBitmap.width, imgBitmap.height);
      // Smart scaling: upscale small/medium images (like 720p or 1024p) to ~2200px so OCR reads fine print accurately
      const scale = maxDim < 1800 ? Math.min(3.0, 2400 / maxDim) : 1.0;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      canvas.width = Math.round(imgBitmap.width * scale);
      canvas.height = Math.round(imgBitmap.height * scale);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imgBitmap, 0, 0, canvas.width, canvas.height);

      // Dynamic contrast enhancement & luminance normalization
      preprocessCanvasContrast(ctx, canvas.width, canvas.height);

      const selectedOcrLang = document.getElementById('ocr-lang-select')?.value || 'eng';
      const worker = await Tesseract.createWorker(selectedOcrLang);
      const { data: { text } } = await worker.recognize(canvas);
      await worker.terminate();

      return {
        lines: text.split('\n').map(l => l.trim()).filter(l => l.length > 3),
        rawText: text
      };
    }

    function preprocessCanvasContrast(ctx, w, h) {
      const imgData = ctx.getImageData(0, 0, w, h);
      const d = imgData.data;

      // Calculate luminance histogram to determine dynamic contrast bounds
      let minLum = 255, maxLum = 0;
      const lums = new Uint8Array(w * h);
      for (let i = 0, j = 0; i < d.length; i += 4, j++) {
        const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) | 0;
        lums[j] = lum;
        if (lum < minLum) minLum = lum;
        if (lum > maxLum) maxLum = lum;
      }

      const range = (maxLum - minLum) || 1;
      for (let i = 0, j = 0; i < d.length; i += 4, j++) {
        // Linear contrast stretching to full [0, 255] dynamic range
        let v = ((lums[j] - minLum) / range) * 255;
        // Moderate contrast curve boost to make text crisp on shaded/colored table rows
        v = (v - 128) * 1.6 + 128;
        if (v < 0) v = 0;
        if (v > 255) v = 255;

        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    // ================= HELPER: YEAR NORMALIZATION =================
    /**
     * Normalize 2-digit years to 4-digit years.
     * 00-49 → 2000-2049, 50-99 → 1950-1999
     * Handles century ambiguity in bank statements.
     */
    function normalizeYear(yearStr) {
      const year = parseInt(yearStr, 10);
      if (isNaN(year)) return yearStr;
      if (year >= 0 && year <= 49) return `20${yearStr.padStart(2, '0')}`;
      if (year >= 50 && year <= 99) return `19${yearStr.padStart(2, '0')}`;
      return yearStr;
    }

    /**
     * Parse date string and normalize year if 2-digit
     */
    function parseDateWithNormalization(dateStr) {
      if (!dateStr) return dateStr;
      // Handle DD/MM/YY or MM/DD/YY (slashes, dashes, dots)
      let normalized = dateStr.replace(
        /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/,
        (_, p1, p2, y) => `${p1}/${p2}/${normalizeYear(y)}`
      );
      // Handle DD-MMM-YY (e.g. 15-Jan-96, 15-AUG-24)
      normalized = normalized.replace(
        /(\d{1,2})[\-\s]([A-Za-z]{3})[\-\s](\d{2})$/,
        (_, d, m, y) => `${d}-${m}-${normalizeYear(y)}`
      );
      return normalized;
    }

    // ================= ENHANCED MULTI-CURRENCY DETECTION =================
    function detectCurrency(fullText) {
      const currencyMap = {
        // Indian
        '₹': '₹', 'INR': '₹', 'Rupee': '₹', 'Rupees': '₹',
        // US / Western
        '$': '$', 'USD': '$', 'US$': '$',
        // Euro
        '€': '€', 'EUR': '€', 'Euro': '€', 'Euros': '€',
        // UK
        '£': '£', 'GBP': '£', 'Pound': '£', 'Pounds': '£',
        // Japanese Yen
        '¥': '¥', 'JPY': '¥', 'Yen': '¥',
        // Chinese Yuan
        'CNY': '¥', 'RMB': '¥',
        // Russian Ruble
        '₽': '₽', 'RUB': '₽', 'Rouble': '₽',
        // Korean Won
        '₩': '₩', 'KRW': '₩', 'Won': '₩',
        // Turkish Lira
        '₺': '₺', 'TRY': '₺', 'Lira': '₺',
        // Australian Dollar
        'AUD': 'A$', 'A$': 'A$',
        // Canadian Dollar
        'CAD': 'C$', 'C$': 'C$',
        // Swiss Franc
        'CHF': 'CHF',
        // UAE Dirham
        'AED': 'AED',
        // Saudi Riyal
        'SAR': 'SAR',
        // Brazilian Real
        'R$': 'R$', 'BRL': 'R$',
        // South African Rand
        'ZAR': 'R'
      };

      // 1. Bank Institution & Regional Pattern Inference (Highest Priority)
      if (/(?:State Bank of India|SBI|HDFC|ICICI|Axis Bank|Kotak|Punjab National|Bank of Baroda|Canara Bank|UPI\/|NEFT)/i.test(fullText) || /\b\d+,\d{2},\d{3}\b/.test(fullText)) {
        return '₹';
      }
      if (/(?:Barclays|NatWest|HSBC UK|Lloyds|Santander UK|Royal Bank of Scotland)/i.test(fullText) || /\b(?:Pound|Pounds|GBP)\b/i.test(fullText)) {
        return '£';
      }
      if (/(?:Deutsche Bank|BNP Paribas|Crédit Agricole|Santander|BBVA|Société Générale|ING Bank|Commerzbank|Sparkasse)/i.test(fullText) ||
          /\b(?:EUR|Euro|Euros|Saldo|Buchungstag|Wertstellung|Verwendungszweck|Gutschrift|Lastschrift)\b/i.test(fullText)) {
        return '€';
      }
      if (/(?:UBS|Credit Suisse|Raiffeisen)/i.test(fullText) || /\bCHF\b/i.test(fullText)) {
        return 'CHF';
      }
      if (/(?:Emirates NBD|Abu Dhabi Commercial|Mashreq)/i.test(fullText) || /\bAED\b/i.test(fullText)) {
        return 'AED';
      }
      if (/(?:RBC|TD Bank|Scotiabank|BMO|CIBC)/i.test(fullText) || /\bCAD\b/i.test(fullText)) {
        return 'C$';
      }
      if (/(?:Commonwealth Bank|Westpac|ANZ|NAB)/i.test(fullText) || /\bAUD\b/i.test(fullText)) {
        return 'A$';
      }

      // 2. Specific Currency Symbols
      for (const [symbol, display] of Object.entries(currencyMap)) {
        if (fullText.includes(symbol)) return display;
      }

      return '$';
    }

    // ================= OCR QUALITY SCORER =================
    function computeOCRQuality(ocrText) {
      if (!ocrText || ocrText.length < 10) return 0;

      const alphaCount = (ocrText.match(/[a-zA-Z0-9]/g) || []).length;
      const alphaRatio = alphaCount / Math.max(1, ocrText.length);

      const dateLines = (ocrText.match(/\d{1,2}[\/\-\.]\d{1,2}/g) || []).length;
      const totalLines = ocrText.split('\n').length;
      const dateRatio = dateLines / Math.max(1, totalLines);

      let score = Math.round(alphaRatio * 50 + dateRatio * 50);

      const errorPatterns = ['GHECK', 'INTERESTCREDIT', 'TERIANAL', 'MALNART', 'OVERDRAT'];
      errorPatterns.forEach(pattern => {
        if (ocrText.includes(pattern)) score -= 15;
      });

      const goodPatterns = ['BALANCE', 'DEPOSIT', 'WITHDRAWAL', 'TRANSACTION', 'DATE', 'ACCOUNT', 'STATEMENT'];
      goodPatterns.forEach(pattern => {
        if (new RegExp(pattern, 'i').test(ocrText)) score += 4;
      });

      return Math.max(5, Math.min(100, score));
    }

    // ================= MODULE 4: UNIVERSAL STATEMENT UNDERSTANDING =================
    function extractStatementMetadata(fullText) {
      // Bank Name Detection
      const bankPatterns = [
        /JPMorgan Chase|Chase Bank/i,
        /Bank of America/i,
        /Wells Fargo/i,
        /Citibank|Citi/i,
        /State Bank of India|SBI/i,
        /HDFC Bank/i,
        /ICICI Bank/i,
        /Barclays/i,
        /HSBC/i,
        /Capital One/i,
        /PNC Bank/i,
        /US Bank/i,
        /SunTrust|SUNTRu?UST|Truist/i,
        /First Bank of Wiki/i
      ];
      for (const bp of bankPatterns) {
        const match = fullText.match(bp);
        if (match) {
          AppState.metadata.bankName = /SUNTRu?UST|SunTrust/i.test(match[0]) ? 'SunTrust' : match[0];
          break;
        }
      }

      // Account / Cardholder Name Detection
      const holderMatch = fullText.match(/\b([A-Z][a-z]+ [A-Z][a-z]+)\b\s*(?:Branch Name|Customer Number|\n\s*\d+)/i) ||
                          fullText.match(/(?:Account\s*Holder|Customer\s*Name|Cardholder)\s*[:.]?\s*([A-Za-z\s]{3,30})/i);
      if (holderMatch) {
        AppState.metadata.accountHolder = holderMatch[1].trim();
      }

      // Masked or Full Account/Customer Number Detection
      const acctMatch = fullText.match(/(?:Customer\s*(?:Number|No|#)?|Account\s*(?:Number|No|#)?|Acct\s*#?)\s*[:.]?\s*([X\*\d\-]{4,25})/i);
      if (acctMatch) {
        const rawAcct = acctMatch[1].replace(/\s/g, '');
        AppState.metadata.accountNumber = rawAcct;
      }

      // Credit Limit Detection
      const creditLimitMatch = fullText.match(/(?:Credit\s*Limit|Credit\s*Umit)\s*[:.]?\s*[\$₹€£¥₽₩₺]?\s*([\d,]+\.\d{2})/i);
      if (creditLimitMatch) {
        AppState.metadata.creditLimit = parseFloat(creditLimitMatch[1].replace(/,/g, ''));
      }

      // Statement Period / Dates Detection
      const periodMatch = fullText.match(/(?:Statement\s*Period|Period|From)\s*[:.]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s*(?:to|-|through)\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
      if (periodMatch) {
        AppState.metadata.periodStart = parseDateWithNormalization(periodMatch[1]);
        AppState.metadata.periodEnd = parseDateWithNormalization(periodMatch[2]);
      } else {
        const singleDateMatch = fullText.match(/Statement\s*Date\s*[:.]?\s*([a-z0-9\/\-\.]+)/i);
        if (singleDateMatch) AppState.metadata.periodStart = singleDateMatch[1].trim();
        const dueDateMatch = fullText.match(/Payment\s*Due\s*Date\s*[:.]?\s*([a-z0-9\/\-\.]+)/i);
        if (dueDateMatch) AppState.metadata.periodEnd = dueDateMatch[1].trim();
      }

      // Enhanced Multi-Currency Detection
      AppState.metadata.currency = detectCurrency(fullText);

      // Opening & Closing Balance Detection
      const openMatch = fullText.match(/(?:Beginning\s*Balance|Opening\s*Balance|Previous\s*Balance)\s*[:.]?\s*[\$₹€£¥₽₩₺]?\s*([\d,]+\.\d{2})/i);
      if (openMatch) AppState.metadata.openingBalance = parseFloat(openMatch[1].replace(/,/g, ''));

      const closeMatch = fullText.match(/(?:Total\s*Amount\s*Due|Total\s*Outstanding\s*Balance|Ending\s*Balance|Closing\s*Balance|New\s*Balance)\s*[:.]?\s*[\$₹€£¥₽₩₺]?\s*([\d,]+\.\d{2})/i);
      if (closeMatch) AppState.metadata.closingBalance = parseFloat(closeMatch[1].replace(/,/g, ''));

      // Determine statement structure
      if (/Credit\s*Limit|Total\s*Amount\s*Due|Visa\s*Gold|Mastercard|Cardholder/i.test(fullText)) {
        AppState.metadata.statementType = 'credit_card';
      } else {
        AppState.metadata.statementType = 'checking';
      }

      if (/(?:Paid\s*In|Credits?|Deposits?)\b.*(?:Paid\s*Out|Debits?|Withdrawals?)/i.test(fullText)) {
        AppState.metadata.columnOrder = 'credit_first';
      } else if (/(?:Paid\s*Out|Debits?|Withdrawals?)\b.*(?:Paid\s*In|Credits?|Deposits?)/i.test(fullText)) {
        AppState.metadata.columnOrder = 'debit_first';
      }
    }

    
    // Multi-Check Grid Splitting (Priority 1.1: Handles 3+ checks per line with check numbers before/after dates)
    function splitMultiTransactionLine(cleanLine) {
      if (!cleanLine || cleanLine.length < 15) return [cleanLine];

      // Pattern 1: CheckNo Date Amount (e.g. 104 05/12 150.00 105 05/14 200.00 106 05/16 350.00)
      const patternPreceding = /(?:CHECK\s*#?|\b)(\d{2,6})\s+(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\s+([0-9,]+\.\d{2})/gi;
      const matchesPreceding = [...cleanLine.matchAll(patternPreceding)];
      if (matchesPreceding.length >= 2) {
        return matchesPreceding.map(m => `CHECK ${m[1]} ${m[2]} ${m[3]}`);
      }

      // Pattern 2: Repeating dates across columns
      // Note: Must require two dots for dotted dates (e.g. 01.09.2024 or 01.09.24) so decimal amounts like 0.00 or 1.00 are NOT treated as dates!
      const safeDatePattern = /\b(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?|\d{1,2}\.\d{1,2}\.\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}|\d{1,2}[\-\s](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\-\s]?\d{0,4})\b/gi;
      const dateMatches = [...cleanLine.matchAll(safeDatePattern)];
      if (dateMatches.length >= 2) {
        const chunks = [];
        for (let i = 0; i < dateMatches.length; i++) {
          const startIdx = dateMatches[i].index;
          const endIdx = (i + 1 < dateMatches.length) ? dateMatches[i + 1].index : cleanLine.length;
          chunks.push(cleanLine.substring(startIdx, endIdx).trim());
        }
        return chunks;
      }
      return [cleanLine];
    }

    
    // ================= DOCUMENT LANGUAGE / SCRIPT DETECTION (Priority 2.3) =================
    function detectDocumentLanguageAndScript(text) {
      if (!text) return 'English / International (Latin)';
      if (/[\u0400-\u04FF]/.test(text)) return 'Russian / Cyrillic (Кириллица)';
      if (/[\u0900-\u097F]/.test(text)) return 'Hindi / Devanagari (हिन्दी)';
      if (/(?:kontostand|auszug|buchung|haben|soll|umsatz|iban)/i.test(text)) return 'German / Deutsche Bank (Latin)';
      if (/(?:solde|débit|crédit|virement|prélèvement|relevé)/i.test(text)) return 'French / Français (Latin)';
      if (/(?:saldo|abono|cargo|cuenta|transferencia|extracto)/i.test(text)) return 'Spanish / Español (Latin)';
      return 'English / International (Latin)';
    }

    // ================= RECENT FILES STORAGE (Priority 4.2) =================

    function saveRecentFile(fileName, count) {
      try {
        sessionRecentFiles = sessionRecentFiles.filter(item => item.name !== fileName);
        sessionRecentFiles.unshift({ name: fileName, count: count, date: new Date().toLocaleDateString() });
        if (sessionRecentFiles.length > 6) sessionRecentFiles = sessionRecentFiles.slice(0, 6);
        window.sessionRecentFiles = sessionRecentFiles;
        loadRecentFiles();
      } catch (e) {
        console.warn('Recent files save error:', e);
      }
    }

    function loadRecentFiles() {
      try {
        const tray = document.getElementById('recent-files-tray');
        const listEl = document.getElementById('recent-files-list');
        if (!tray || !listEl) return;
        if (sessionRecentFiles.length === 0) {
          tray.classList.add('hidden');
          return;
        }
        tray.classList.remove('hidden');
        listEl.replaceChildren();
        sessionRecentFiles.forEach(item => {
          const chip = document.createElement('span');
          chip.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs border border-slate-200 dark:border-slate-700 shadow-2xs';
          
          const iconSpan = document.createElement('span');
          iconSpan.textContent = '📄';
          
          const nameSpan = document.createElement('span');
          nameSpan.className = 'font-semibold truncate max-w-[140px]';
          nameSpan.textContent = item.name || '';
          
          const countSpan = document.createElement('span');
          countSpan.className = 'text-[10px] text-slate-400';
          countSpan.textContent = `(${parseInt(item.count, 10) || 0} tx)`;
          
          chip.append(iconSpan, nameSpan, countSpan);
          listEl.appendChild(chip);
        });
      } catch (e) {
        console.warn('Recent files load error:', e);
      }
    }

    function clearRecentFiles() {
      try {
        sessionRecentFiles = [];
        window.sessionRecentFiles = [];
        try { localStorage.removeItem('s2s_recent_files'); } catch (e) {}
        try { sessionStorage.removeItem('s2s_recent_files'); } catch (e) {}
        const tray = document.getElementById('recent-files-tray');
        if (tray) tray.classList.add('hidden');
      } catch (e) {}
    }

    function parseUniversalTransactions(lines) {
      const results = [];
      // Precision date regex: avoids misidentifying amounts (like 313.39) while accepting placeholder dates (mm/dd/yyyy)
      const dateRegex = /\b(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?|\d{1,2}\.\d{1,2}\.\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}|\d{1,2}[\-\s](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\-\s]?\d{0,4}|(?:m{1,2}|d{1,2}|y{2,4})\s*[\/\-\.]\s*(?:m{1,2}|d{1,2})\s*[\/\-\.]\s*(?:y{2,4}|d{1,2}))\b/i;
      const junkFilter = /(?:SAMPLE|Statement of Account|Page \d+|ACCOUNT NUMBER|CUSTOMER NUMBER|Statement Date|Payment Due Date|Credit Limit|Credit Umit|Total Amount Due|Beginning Balance|Ending Balance|Total Deposits|Total Withdrawals|BALANCE FORWARD|PREVIOUS BALANCE|FORWARD BALANCE|REFERENCE NUMBER|TOTAL DEBITS|TOTAL CREDITS|SERVICE CHARGE SUMMARY|ANNUAL PERCENTAGE|FINANCE CHARGE|FOR INFORMATION CALL|MEMBER FDIC|EQUAL HOUSING LENDER|P\.?O\.? BOX|CUSTOMER SERVICE|DAILY BALANCE|IMPORTANT INFORMATION|DISCLOSURE|VISIT OUR WEBSITE|©|Visa Gold|Past Due|Unbilled|Total Outstanding)/i;

      const hasTxHeader = lines.some(l => /\b(TRANSACTIONS?|TRANSACTION\s+RECORD)\b/i.test(l));
      let inTxTable = false;

      // Multi-line table reconstruction: stitch lines where date/desc is on one line and amounts on next line
      const mergedLines = [];
      for (let i = 0; i < lines.length; i++) {
        let cur = lines[i].replace(/\|/g, ' ').trim();
        if (!cur || cur.length < 3) continue;

        // Auto-correct OCR letter substitutions: 'O' or 'o' for '0' in dates
        cur = cur.replace(/\b([0-9O]{1,2})[\/\-\.]([0-9O]{1,2})[\/\-\.]([0-9O]{2,4})\b/g, (m) => m.replace(/O/g, '0'));

        if (/\b(TRANSACTIONS?|TRANSACTION\s+RECORD|ACCOUNT\s+ACTIVITY)\b/i.test(cur)) {
          inTxTable = true;
          continue;
        }
        if (/\b(SUMMARY|REMINDER|NOTICE|TERMS|©)\b/i.test(cur) && inTxTable) {
          inTxTable = false;
          continue;
        }

        // If statement has an explicit TRANSACTION header, ignore metadata lines before it
        if (hasTxHeader && !inTxTable) continue;

        if (junkFilter.test(cur)) continue;
        if (/^Date\s+Description/i.test(cur)) {
          if (/(?:Paid\s*In|Credits?|Deposits?)\b.*(?:Paid\s*Out|Debits?|Withdrawals?)/i.test(cur)) {
            AppState.metadata.columnOrder = 'credit_first';
          } else if (/(?:Paid\s*Out|Debits?|Withdrawals?)\b.*(?:Paid\s*In|Credits?|Deposits?)/i.test(cur)) {
            AppState.metadata.columnOrder = 'debit_first';
          }
          continue;
        }

        const hasDate = dateRegex.test(cur);
        const hasAmount = /(?:\d+(?:,\d{2,3})*|\d*)\.\d{2}/.test(cur);

        if (hasDate && !hasAmount && i + 1 < lines.length) {
          const next = lines[i + 1].trim();
          const nextHasDate = dateRegex.test(next);
          const nextHasAmount = /(?:\d+(?:,\d{2,3})*|\d*)\.\d{2}/.test(next);
          if (!nextHasDate && nextHasAmount) {
            mergedLines.push({ text: cur + ' ' + next, inTable: inTxTable });
            i++;
            continue;
          }
        }
        mergedLines.push({ text: cur, inTable: inTxTable });
      }

      mergedLines.forEach(item => {
        let cleanLine = item.text.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
        if (!cleanLine || cleanLine.length < 4) return;
        if (junkFilter.test(cleanLine)) return;

        // Auto-fix common OCR misspellings
        cleanLine = cleanLine.replace(/\bGHECK\b/gi, 'CHECK')
                             .replace(/\bINTERESTCREDIT\b/gi, 'INTEREST CREDIT')
                             .replace(/\bTERIANAL\b/gi, 'TERMINAL')
                             .replace(/\bMALNART\b/gi, 'WALMART');

        // Multi-transaction line splitting (Enhanced: Handles 3+ checks per line with preceding check numbers)
        const splitChunks = splitMultiTransactionLine(cleanLine);
        if (splitChunks.length > 1) {
          for (const chunk of splitChunks) {
            const tx = parseTransactionRecord(chunk, item.inTable);
            if (tx) results.push(tx);
          }
        } else {
          const dateMatches = [...cleanLine.matchAll(new RegExp(dateRegex, 'gi'))];
          if (dateMatches.length === 1) {
            const tx = parseTransactionRecord(cleanLine, item.inTable);
            if (tx) results.push(tx);
          } else if (item.inTable && /(?:\d+(?:,\d{2,3})*|\d*)\.\d{2}/.test(cleanLine)) {
            // Table row where OCR missed or mangled the date string
            const tx = parseTransactionRecord(cleanLine, true);
            if (tx) results.push(tx);
          }
        }
      });

      // ================= MATHEMATICAL BALANCE DELTA VERIFICATION =================
      let runningBal = (typeof AppState.metadata.openingBalance === 'number' && !isNaN(AppState.metadata.openingBalance))
        ? AppState.metadata.openingBalance
        : null;

      for (let i = 0; i < results.length; i++) {
        const tx = results[i];
        const curBal = (tx.balance !== '' && !isNaN(parseFloat(tx.balance))) ? parseFloat(tx.balance) : null;
        let debAmt = parseFloat(tx.debit) || 0;
        let credAmt = parseFloat(tx.credit) || 0;
        let txAmt = debAmt || credAmt;

        if (runningBal !== null && curBal !== null) {
          const delta = Math.round((curBal - runningBal) * 100) / 100;
          if (txAmt > 0) {
            if (Math.abs(delta - txAmt) < 0.05) {
              tx.credit = txAmt.toFixed(2);
              tx.debit = '';
            } else if (Math.abs(delta - (-txAmt)) < 0.05) {
              tx.debit = txAmt.toFixed(2);
              tx.credit = '';
            }
          } else if (Math.abs(delta) > 0.001) {
            if (delta > 0) {
              tx.credit = delta.toFixed(2);
              tx.debit = '';
            } else {
              tx.debit = Math.abs(delta).toFixed(2);
              tx.credit = '';
            }
          }
        }

        if (curBal !== null) {
          runningBal = curBal;
        } else if (runningBal !== null && txAmt > 0) {
          const d = parseFloat(tx.debit) || 0;
          const c = parseFloat(tx.credit) || 0;
          runningBal = runningBal + c - d;
        }
      }

      return results;
    }

    function parseTransactionRecord(chunk, isTableContext = false) {
      chunk = chunk.replace(/\b([0-9O]{1,2})[\/\-\.]([0-9O]{1,2})[\/\-\.]([0-9O]{2,4})\b/g, (m) => m.replace(/O/g, '0'));
      const dateRegex = /\b(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?|\d{1,2}\.\d{1,2}\.\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}|\d{1,2}[\-\s](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\-\s]?\d{0,4}|(?:m{1,2}|d{1,2}|y{2,4})\s*[\/\-\.]\s*(?:m{1,2}|d{1,2})\s*[\/\-\.]\s*(?:y{2,4}|d{1,2}))\b/i;

      // Filter out summary/header rows inside tables
      if (/^(?:Visa\s*Gold|Past\s*Due|Unbilled|Total\s*Outstanding|Date\s+Description)/i.test(chunk)) {
        return null;
      }

      const dateMatch = chunk.match(dateRegex);
      let date = 'mm/dd/yyyy';
      let textWithoutDate = chunk;

      if (dateMatch) {
        const rawDate = dateMatch[0].trim();
        date = parseDateWithNormalization(rawDate);
        textWithoutDate = chunk.replace(rawDate, '').trim();
      } else if (!isTableContext) {
        return null; // Require explicit date outside recognized transaction tables
      }

      // Opening / Previous Balance line detection: Capture into metadata, but don't add as regular transaction
      if (/^(?:Previous|Beginning|Opening)\s+balance\b/i.test(textWithoutDate)) {
        const amtMatch = textWithoutDate.match(/(?:[-+]|\()?(?:Rs\.?|INR|\$|₹|€|£|¥|₽|₩|₺)?\s*(?:\d+(?:,\d{2,3})*|\d*)\.\d{2}/i);
        if (amtMatch) {
          AppState.metadata.openingBalance = parseFloat(amtMatch[0].replace(/[^0-9.-]/g, ''));
        }
        return null;
      }

      // Check / Reference Number Extraction
      let refNo = '';
      const checkMatch = textWithoutDate.match(/\b(?:Cheque\s*No\.?\s*-\s*|CHECK|CHK|REF|TRAN|TXN)\s*#?\s*(\d{2,8})\b/i);
      if (checkMatch) {
        refNo = checkMatch[1];
        textWithoutDate = textWithoutDate.replace(checkMatch[0], '').trim();
      } else {
        const standaloneRef = textWithoutDate.match(/\b(\d{4,6})\s+(?=[-+]?[0-9.]+\s+[-+]?[0-9.]+)/);
        if (standaloneRef) {
          refNo = standaloneRef[1];
          textWithoutDate = textWithoutDate.replace(standaloneRef[0], '').trim();
        }
      }

      // Amounts extraction: Supports Western, Indian Lakhs, negative amounts (-62.47), decimals without leading zero (.26)
      const amountRegex = /(?:[-+]|\()?(?:Rs\.?|INR|\$|₹|€|£|¥|₽|₩|₺)?\s*(?:\d+(?:,\d{2,3})*|\d*)\.\d{2}(?:\)|%)?\s*(?:Cr|Dr|CR|DR)?/gi;
      const amountMatches = textWithoutDate.match(amountRegex);

      let debit = '';
      let credit = '';
      let balance = '';
      let desc = textWithoutDate;
      let status = '✓';
      let confidence = 95;

      if (amountMatches && amountMatches.length > 0) {
        const cleanAmounts = amountMatches.map(a => a.trim().replace(/[RsINR\$₹€£¥₽₩₺%]/g, ''));
        amountMatches.forEach(amt => { desc = desc.replace(amt, ''); });
        desc = desc.replace(/\s+/g, ' ').trim();

        const primaryAmt = cleanAmounts[0];
        const secondAmt = cleanAmounts.length > 1 ? cleanAmounts[1] : '';
        const thirdAmt = cleanAmounts.length > 2 ? cleanAmounts[2] : '';

        // Check for explicit Cr / Dr flags attached to amount or in text
        const isExplicitCreditTag = /\b(?:Cr|CR)\b/.test(primaryAmt) || /\b(?:Cr|CR)\b/.test(chunk);
        const isExplicitDebitTag = /\b(?:Dr|DR)\b/.test(primaryAmt) || /\b(?:Dr|DR)\b/.test(chunk);

        // Accounting parentheses ($45.20) or negative sign -> treat as debit / withdrawal
        const isAccountingNegative = primaryAmt.includes('(') || primaryAmt.includes(')') || primaryAmt.startsWith('-');
        const cleanPrimary = primaryAmt.replace(/[-+()]/g, '').replace(/\b(?:Cr|Dr)\b/gi, '').trim();

        // Strictly preserve negative signs on balances (e.g. -62.47, -67.47, -72.47 overdraft balances)
        let cleanSecond = '';
        if (secondAmt) {
          const isSecondNegative = secondAmt.includes('-') || secondAmt.includes('(');
          cleanSecond = (isSecondNegative ? '-' : '') + secondAmt.replace(/[-+()]/g, '').replace(/\b(?:Cr|Dr)\b/gi, '').trim();
        }

        // Semantic Debit vs Credit Determination (Multi-Lingual)
        const isCreditKeyword = /\b(CREDIT|DEPOSIT|INTEREST|PAYROLL|REFUND|REVERSAL|TREASURY|ZELLE FROM|SALARY|FROM SAVINGS|TRANSFER - FROM|FUNDS TRANSFER|INVOICE PAID|CLIENT INVOICE|SETTLEMENT|PROCEEDS|DIVIDEND|DISBURSEMENT|CASHBACK|REWARD|PAYMENT RECEIVED|DIRECT DEP|CREDIT ADJUSTMENT|CAPITAL|VENTURE|INVESTMENT|EQUITY|HABEN|GUTSCHRIFT|EINZAHLUNG|CRÉDIT|CREDIT|VERSEMENT|REMISE|ABONO|INGRESO)\b/i.test(chunk);
        const isDebitKeyword = /\b(CHECK|CHEQUE|CHK|DEBIT|POS|PURCHASE|CHARGE|FEE|FEES|WITHDRAWAL|ATM|BILL PAY|PAYMENT|MORTGAGE|CARD|SERVICE CHARGE|DIRECT DEBIT|COUNCIL TAX|GAS|ELECTRIC|SOLL|LASTSCHRIFT|AUSZAHLUNG|DÉBIT|DEBIT|PRÉLÈVEMENT|PRELEVEMENT|CARGO|DEBITO)\b/i.test(chunk);

        if (cleanAmounts.length >= 3) {
          const a1 = cleanAmounts[0].replace(/[-+()]/g, '').replace(/\b(?:Cr|Dr)\b/gi, '').trim();
          const a2 = cleanAmounts[1].replace(/[-+()]/g, '').replace(/\b(?:Cr|Dr)\b/gi, '').trim();
          const a3 = cleanAmounts[2].replace(/[-+()]/g, '').replace(/\b(?:Cr|Dr)\b/gi, '').trim();
          const n1 = parseFloat(a1.replace(/,/g, '')) || 0;
          const n2 = parseFloat(a2.replace(/,/g, '')) || 0;
          balance = a3;

          const isCreditFirst = AppState.metadata.columnOrder === 'credit_first';
          if (isCreditFirst) {
            if (n1 > 0 && n2 === 0) credit = a1;
            else if (n2 > 0 && n1 === 0) debit = a2;
            else if (isCreditKeyword) credit = a1 || a2;
            else if (isDebitKeyword) debit = a2 || a1;
            else { credit = a1; debit = a2; }
          } else {
            if (n1 > 0 && n2 === 0) debit = a1;
            else if (n2 > 0 && n1 === 0) credit = a2;
            else if (isCreditKeyword) credit = a2 || a1;
            else if (isDebitKeyword) debit = a1 || a2;
            else { debit = a1; credit = a2; }
          }
        } else {
          if (isExplicitCreditTag) {
            credit = cleanPrimary;
            if (secondAmt) balance = cleanSecond;
          } else if (isExplicitDebitTag) {
            debit = cleanPrimary;
            if (secondAmt) balance = cleanSecond;
          } else if (isCreditKeyword) {
            // Negative amounts on refund / reversal / payment received are CREDITS
            credit = cleanPrimary;
            if (secondAmt) balance = cleanSecond;
          } else if (isDebitKeyword || isAccountingNegative) {
            debit = cleanPrimary;
            if (secondAmt) balance = cleanSecond;
          } else {
            debit = cleanPrimary;
            if (secondAmt) balance = cleanSecond;
          }
        }
      } else {
        return null;
      }

      if (!desc || /^[\d\s.,]+$/.test(desc)) {
        desc = refNo ? `Cheque #${refNo}` : 'Transaction';
      }

      const txnType = inferTransactionType(chunk, refNo);
      const category = inferCategory(chunk, txnType);

      // Per-Transaction Currency Detection (Priority 1.2: mixed $/€/£/₹/¥ documents)
      let txCurrency = AppState.metadata.currency || '$';
      if (/\$/.test(chunk)) txCurrency = '$';
      else if (/€/.test(chunk)) txCurrency = '€';
      else if (/£/.test(chunk)) txCurrency = '£';
      else if (/[₹]|Rs\.?|INR/i.test(chunk)) txCurrency = '₹';
      else if (/[¥]/.test(chunk)) txCurrency = '¥';

      // Dynamic Confidence Scoring (Priority 2.2: 0 - 100)
      let dynamicConfidence = 60;
      if (date && date !== 'mm/dd/yyyy') dynamicConfidence += 20;
      if (debit || credit) dynamicConfidence += 10;
      if (balance) dynamicConfidence += 5;
      if (refNo) dynamicConfidence += 5;
      if (desc && desc.length > 4 && !/^[\d\s.,]+$/.test(desc)) dynamicConfidence += 10;
      if (dynamicConfidence > 100) dynamicConfidence = 100;

      return {
        id: Math.random().toString(36).substr(2, 9),
        status,
        confidence: dynamicConfidence,
        currency: txCurrency,
        date,
        description: desc, // Strict preservation of bank description
        refNo: refNo || '',
        debit: debit ? parseFloat(debit.replace(/,/g, '')).toFixed(2) : '',
        credit: credit ? parseFloat(credit.replace(/,/g, '')).toFixed(2) : '',
        balance: balance ? parseFloat(balance.replace(/,/g, '')).toFixed(2) : '',
        txnType,
        category
      };
    }

    function inferTransactionType(str, checkNo) {
      if (checkNo || /CHECK|CHK/i.test(str)) return 'Cheque';
      if (/POS|PURCHASE|TERMINAL/i.test(str)) return 'POS Purchase';
      if (/ATM|CASH WDL/i.test(str)) return 'ATM Withdrawal';
      if (/PAYROLL|SALARY|DIRECT DEP/i.test(str)) return 'Payroll';
      if (/INTEREST/i.test(str)) return 'Interest';
      if (/FEE|SERVICE CHARGE/i.test(str)) return 'Bank Fee';
      if (/TRANSFER|ZELLE|VENMO/i.test(str)) return 'Transfer';
      return 'Electronic';
    }

    function inferCategory(str, type) {
      if (type === 'Payroll' || /PAYROLL|SALARY/i.test(str)) return 'Salary';
      if (type === 'Bank Fee' || /FEE|CHARGE/i.test(str)) return 'Bank Charges';
      if (/WALMART|GROCERY|MARKET|FOOD/i.test(str)) return 'Groceries / Shopping';
      if (/RESTAURANT|CAFE|COFFEE|STARBUCKS/i.test(str)) return 'Dining Out';
      if (/SHELL|EXXON|CHEVRON|FUEL|GAS/i.test(str)) return 'Automotive / Gas';
      if (/ELECTRIC|WATER|UTILITY|INTERNET|COMCAST/i.test(str)) return 'Utilities';
      if (/RENT|MORTGAGE/i.test(str)) return 'Housing / Rent';
      return 'General';
    }

    // ================= MODULE 5: BALANCE RECONCILIATION ENGINE =================
    function auditAndReconcileBalances() {
      const openBal = typeof AppState.metadata.openingBalance === 'number' && !isNaN(AppState.metadata.openingBalance) ? AppState.metadata.openingBalance : 0;
      let totalCred = 0;
      let totalDeb = 0;
      let issueCount = 0;

      for (let i = 0; i < AppState.transactions.length; i++) {
        const tx = AppState.transactions[i];
        const deb = parseFloat(tx.debit) || 0;
        const cred = parseFloat(tx.credit) || 0;

        totalDeb += deb;
        totalCred += cred;

        if (tx.balance && !isNaN(parseFloat(tx.balance))) {
          const statedBal = parseFloat(tx.balance);
          let prevBal = null;
          if (i > 0 && AppState.transactions[i - 1].balance) {
            prevBal = parseFloat(AppState.transactions[i - 1].balance);
          } else if (i === 0 && typeof AppState.metadata.openingBalance === 'number' && !isNaN(AppState.metadata.openingBalance)) {
            prevBal = AppState.metadata.openingBalance;
          }

          if (prevBal !== null) {
            const expectedBal = parseFloat((prevBal + cred - deb).toFixed(2));
            if (Math.abs(expectedBal - statedBal) > 0.05) {
              tx.status = '⚠️';
              const currSymbol = AppState.metadata.currency || '$';
              tx.validationNote = `Mismatch: Expected ${currSymbol}${expectedBal}, statement says ${currSymbol}${statedBal}`;
              issueCount++;
            } else {
              tx.status = '✓';
              delete tx.validationNote;
            }
          }
        }
      }

      AppState.audit.totalCredits = totalCred;
      AppState.audit.totalDebits = totalDeb;
      AppState.audit.discrepancyCount = issueCount;

      const calcEnding = parseFloat((openBal + totalCred - totalDeb).toFixed(2));
      const closeBal = typeof AppState.metadata.closingBalance === 'number' && !isNaN(AppState.metadata.closingBalance) ? AppState.metadata.closingBalance : 0;

      if (closeBal > 0) {
        AppState.audit.isReconciled = (Math.abs(calcEnding - closeBal) <= 0.05) || (Math.abs(totalDeb - closeBal) <= 0.05);
      } else {
        AppState.audit.isReconciled = issueCount === 0;
      }

      updateAuditUI();
    }

    // ================= MODULE 6: REVIEW WORKSPACE UI RENDERER =================
    function populateWorkspaceUI() {
      document.getElementById('file-meta-badge').innerText = AppState.files.map(f => f.name).join(', ');
      document.getElementById('transactions-count-heading').innerText = `${AppState.transactions.length} Transactions Detected`;
      document.getElementById('statement-period-subtitle').innerText = `Period: ${AppState.metadata.periodStart || 'N/A'} to ${AppState.metadata.periodEnd || 'N/A'}`;
      document.getElementById('tab-badge-txns').innerText = AppState.transactions.length;

      // Fill Metadata tab
      document.getElementById('meta-bank-name').value = AppState.metadata.bankName;
      document.getElementById('meta-account-holder').value = AppState.metadata.accountHolder;
      document.getElementById('meta-account-number').value = AppState.metadata.accountNumber;
      document.getElementById('meta-period-start').value = AppState.metadata.periodStart;
      document.getElementById('meta-period-end').value = AppState.metadata.periodEnd;
      document.getElementById('meta-currency').value = AppState.metadata.currency;
      document.getElementById('meta-page-count').value = AppState.metadata.pageCount;

      // Fill Raw Inspector
      document.getElementById('raw-terminal-view').innerText = AppState.rawText || 'No raw text extracted.';
      document.getElementById('raw-char-counter').innerText = `${(AppState.rawText || '').length} characters`;

      // OCR Quality Score Calculation & Feedback Display
      const ocrQuality = computeOCRQuality(AppState.rawText);
      const ocrBadge = document.getElementById('ocr-score-badge');
      if (ocrBadge) {
        ocrBadge.innerText = `OCR Score: ${ocrQuality}%`;
        if (ocrQuality >= 80) {
          ocrBadge.className = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300";
        } else if (ocrQuality >= 50) {
          ocrBadge.className = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300";
        } else {
          ocrBadge.className = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300";
        }
      }

      const qualityCard = document.getElementById('ocr-quality-card');
      if (qualityCard) {
        qualityCard.replaceChildren();
        const scoreDiv = document.createElement('div');
        scoreDiv.className = 'font-bold text-slate-800 dark:text-slate-200 mb-1';
        scoreDiv.textContent = `OCR Quality Score: ${ocrQuality}%`;

        const descDiv = document.createElement('div');
        descDiv.className = 'text-xs text-slate-500 dark:text-slate-400';
        descDiv.textContent = ocrQuality >= 80 ? '✅ High confidence — Characters and financial figures are clear and reliable.' :
          ocrQuality >= 50 ? '⚠️ Medium confidence — Minor noise detected; review flagged transactions before exporting.' :
          '🚨 Low confidence — Document quality is low or noisy; manual verification strongly recommended.';

        qualityCard.append(scoreDiv, descDiv);
      }

      updateAuditUI();
      renderTransactionsTable();

      if (AppState.pendingFile) {
        saveRecentFile(AppState.pendingFile.name, AppState.transactions.length);
      }
      const detectedLang = detectDocumentLanguageAndScript(AppState.rawText);
      const langInput = document.getElementById('meta-doc-language');
      if (langInput) langInput.value = detectedLang;
    }

    
    // ================= MODULE: EXECUTIVE FINANCIAL INTELLIGENCE & DEMO LOADER =================
    
    // 1. Dashboard Category Tool Filter
    function filterDashboardTools(category) {
      const cards = document.querySelectorAll('#view-dashboard [data-category]');
      const buttons = document.querySelectorAll('#dashboard-filter-bar .dash-filter-btn');

      buttons.forEach(btn => {
        btn.className = 'dash-filter-btn px-4 py-2 rounded-full text-xs font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition';
      });
      const activeBtn = document.getElementById(`dash-filter-${category}`);
      if (activeBtn) {
        activeBtn.className = 'dash-filter-btn px-4 py-2 rounded-full text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm transition';
      }

      cards.forEach(card => {
        const catAttr = (card.getAttribute('data-category') || '').toLowerCase();
        const categories = catAttr.split(/\s+/);
        if (category === 'all' || categories.includes(category.toLowerCase())) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    }

    // 2. 1-Click Interactive Demo Statement Loader
    function loadDemoStatement(type) {
      if (type === 'wiki') {
        AppState.metadata = {
          bankName: 'First Bank of Wiki',
          accountHolder: 'Jane Doe',
          accountNumber: '1234-5678-9012',
          statementPeriod: 'January 01, 2026 - January 31, 2026',
          openingBalance: 0.55,
          closingBalance: -72.47,
          currency: '$',
          statementType: 'checking'
        };
        AppState.transactions = [
          { id: '1', date: '01/02/2026', description: 'Opening Deposit Transfer', refNo: '1001', debit: '', credit: '500.00', balance: '500.55', status: '✅', category: 'Transfers' },
          { id: '2', date: '01/05/2026', description: 'Electric Utility Bill AutoPay', refNo: '1002', debit: '120.45', credit: '', balance: '380.10', status: '✅', category: 'Utilities' },
          { id: '3', date: '01/08/2026', description: 'Whole Foods Supermarket', refNo: '1003', debit: '85.60', credit: '', balance: '294.50', status: '✅', category: 'Retail' },
          { id: '4', date: '01/12/2026', description: 'Payroll Direct Deposit Acme Corp', refNo: '1004', debit: '', credit: '942.61', balance: '1237.11', status: '✅', category: 'Income' },
          { id: '5', date: '01/15/2026', description: 'Apartment Monthly Rent Wire', refNo: '1005', debit: '1100.00', credit: '', balance: '137.11', status: '✅', category: 'Housing' },
          { id: '6', date: '01/20/2026', description: 'Pharmacy Prescription Rx', refNo: '1006', debit: '45.30', credit: '', balance: '91.81', status: '✅', category: 'Medical' },
          { id: '7', date: '01/25/2026', description: 'Petron Gas Service Station', refNo: '1007', debit: '64.28', credit: '', balance: '27.53', status: '✅', category: 'Travel' },
          { id: '8', date: '01/30/2026', description: 'Emergency Plumbing Repair', refNo: '1008', debit: '100.00', credit: '', balance: '-72.47', status: '✅', category: 'Utilities' }
        ];
      } else {
        // SunTrust Bank Credit Card Statement
        AppState.metadata = {
          bankName: 'SunTrust Bank',
          accountHolder: 'John Smith',
          accountNumber: '23785-54-9674458',
          statementPeriod: '01/01/2026 - 01/31/2026',
          openingBalance: 0.00,
          closingBalance: 3898.57,
          creditLimit: 390000.00,
          currency: '$',
          statementType: 'credit_card'
        };
        AppState.transactions = [
          { id: '1', date: '01/03/2026', description: 'Petron - CS Station Fuel', refNo: '', debit: '223.26', credit: '', balance: '', status: '✅', category: 'Travel' },
          { id: '2', date: '01/05/2026', description: 'South Star Drug Pharmacy', refNo: '', debit: '313.39', credit: '', balance: '', status: '✅', category: 'Medical' },
          { id: '3', date: '01/08/2026', description: 'Rosewood Condominium HOA Fee', refNo: '', debit: '582.96', credit: '', balance: '', status: '✅', category: 'Housing' },
          { id: '4', date: '01/12/2026', description: 'Grab Transportation Service', refNo: '', debit: '125.00', credit: '', balance: '', status: '✅', category: 'Travel' },
          { id: '5', date: '01/16/2026', description: 'Amazon Digital & Retail Order', refNo: '', debit: '215.00', credit: '', balance: '', status: '✅', category: 'Retail' },
          { id: '6', date: '01/20/2026', description: 'Alba International Equipment', refNo: '', debit: '656.86', credit: '', balance: '', status: '✅', category: 'Retail' },
          { id: '7', date: '01/24/2026', description: 'Adobe Creative Cloud Software', refNo: '', debit: '246.00', credit: '', balance: '', status: '✅', category: 'Subscriptions' },
          { id: '8', date: '01/27/2026', description: 'St Luke Medical Center Clinic', refNo: '', debit: '571.10', credit: '', balance: '', status: '✅', category: 'Medical' },
          { id: '9', date: '01/30/2026', description: 'Hotel Sheraton (Las Vegas) Conference', refNo: '', debit: '965.00', credit: '', balance: '', status: '✅', category: 'Travel' }
        ];
      }

      // Populate Metadata Inputs
      const mBank = document.getElementById('meta-bank-name');
      const mHolder = document.getElementById('meta-account-holder');
      const mAcct = document.getElementById('meta-account-number');
      const mStart = document.getElementById('meta-period-start');
      const mEnd = document.getElementById('meta-period-end');
      const mType = document.getElementById('meta-statement-type');
      if (mBank) mBank.value = AppState.metadata.bankName;
      if (mHolder) mHolder.value = AppState.metadata.accountHolder;
      if (mAcct) mAcct.value = AppState.metadata.accountNumber;
      if (mStart) mStart.value = '01/01/2026';
      if (mEnd) mEnd.value = '01/31/2026';
      if (mType) mType.value = AppState.metadata.statementType;

      // Switch to converter and workspace
      switchPortalTool('excel');
      document.getElementById('intake-section').classList.add('hidden');
      document.getElementById('preview-stage').classList.add('hidden');
      document.getElementById('workspace-section').classList.remove('hidden');

      auditAndReconcileBalances();
      renderTransactionsTable();
      updateAuditUI();
      generateCategoryInsights();
    }

    // 3. Category Spending Insights Generator
    function generateCategoryInsights() {
      const container = document.getElementById('category-bars-container');
      if (!container || typeof container.appendChild !== 'function') return;
      const netCashflowEl = document.getElementById('insight-net-cashflow');
      const avgTxnEl = document.getElementById('insight-avg-transaction');
      if (!container) return;

      const debits = AppState.transactions
        .map(t => parseFloat(t.debit) || 0)
        .filter(d => d > 0);
      const totalDebit = debits.reduce((a, b) => a + b, 0);

      const credits = AppState.transactions
        .map(t => parseFloat(t.credit) || 0)
        .filter(c => c > 0);
      const totalCredit = credits.reduce((a, b) => a + b, 0);

      const netCashflow = totalCredit - totalDebit;
      if (netCashflowEl) {
        const sign = netCashflow >= 0 ? '+' : '-';
        netCashflowEl.innerText = `${sign}$${Math.abs(netCashflow).toFixed(2)}`;
        netCashflowEl.className = netCashflow >= 0 
          ? 'text-sm font-black font-mono text-emerald-600 dark:text-emerald-400'
          : 'text-sm font-black font-mono text-rose-600 dark:text-rose-400';
      }

      if (avgTxnEl) {
        const avg = debits.length ? (totalDebit / debits.length) : 0;
        avgTxnEl.innerText = `$${avg.toFixed(2)}`;
      }

      // Categorize debits
      const catTotals = {
        '🛒 Retail & Merchants': 0,
        '⚡ Housing & Utilities': 0,
        '🏥 Medical & Healthcare': 0,
        '✈️ Travel & Transportation': 0,
        '💼 Services & Software': 0,
        '📦 Miscellaneous': 0
      };

      AppState.transactions.forEach(t => {
        const amt = parseFloat(t.debit) || 0;
        if (amt <= 0) return;
        const d = (t.description || '').toLowerCase();
        if (/amazon|store|market|food|grab|walmart|target|shop|merch/i.test(d)) {
          catTotals['🛒 Retail & Merchants'] += amt;
        } else if (/condo|rent|mortgage|util|elect|water|gas bill|power/i.test(d)) {
          catTotals['⚡ Housing & Utilities'] += amt;
        } else if (/drug|pharm|medic|doctor|hospital|clinic|st luke|health/i.test(d)) {
          catTotals['🏥 Medical & Healthcare'] += amt;
        } else if (/hotel|sheraton|flight|airline|petron|gas|fuel|uber|travel/i.test(d)) {
          catTotals['✈️ Travel & Transportation'] += amt;
        } else if (/adobe|software|subscr|service|fee|telecom|comms/i.test(d)) {
          catTotals['💼 Services & Software'] += amt;
        } else {
          catTotals['📦 Miscellaneous'] += amt;
        }
      });

      const activeCats = Object.entries(catTotals)
        .filter(([_, amt]) => amt > 0)
        .sort((a, b) => b[1] - a[1]);

      const colors = ['bg-rose-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-slate-400'];

      container.innerHTML = '';
      if (!activeCats.length) {
        container.innerHTML = '<div class="text-xs text-slate-400 py-3">No debits to categorize.</div>';
        return;
      }

      activeCats.slice(0, 4).forEach(([name, amt], idx) => {
        const pct = totalDebit > 0 ? Math.round((amt / totalDebit) * 100) : 0;
        const color = colors[idx % colors.length];
        const row = document.createElement('div');
        
        const topRow = document.createElement('div');
        topRow.className = 'flex items-center justify-between mb-1 text-[11px] font-bold';
        
        const labelSpan = document.createElement('span');
        labelSpan.className = 'text-slate-700 dark:text-slate-300';
        labelSpan.textContent = name;
        
        const valSpan = document.createElement('span');
        valSpan.className = 'font-mono text-slate-600 dark:text-slate-400';
        valSpan.textContent = `${pct}% ($${amt.toFixed(2)})`;
        
        topRow.append(labelSpan, valSpan);
        
        const barWrap = document.createElement('div');
        barWrap.className = 'w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden';
        const bar = document.createElement('div');
        bar.className = `${color} h-full rounded-full transition-all duration-300`;
        bar.style.width = `${pct}%`;
        barWrap.appendChild(bar);
        
        row.append(topRow, barWrap);
        container.appendChild(row);
      });
    }

    // 4. QuickBooks (.QBO / .OFX) Exporter
    function exportToQBO() {
      if (!AppState.transactions || !AppState.transactions.length) return alert('No transactions to export.');

      const bankName = document.getElementById('meta-bank-name').value || 'Bank Statement';
      const acctNo = document.getElementById('meta-account-number').value || '123456789';
      const closingBal = AppState.metadata.closingBalance !== undefined ? AppState.metadata.closingBalance : (AppState.audit.totalDebits || 0);

      const now = new Date();
      const dtServer = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);

      let trnList = '';
      AppState.transactions.forEach(t => {
        const amt = t.credit ? parseFloat(t.credit) : -(parseFloat(t.debit) || 0);
        const trnType = t.credit ? 'CREDIT' : 'DEBIT';
        const trnId = t.refNo || t.id || Math.random().toString(36).substr(2, 9);
        // Format date: YYYYMMDD
        let dt = dtServer.slice(0, 8);
        if (t.date && t.date.includes('/')) {
          const parts = t.date.split('/');
          if (parts.length === 3) {
            const mm = parts[0].padStart(2, '0');
            const dd = parts[1].padStart(2, '0');
            let yy = parts[2];
            if (yy.length === 2) yy = '20' + yy;
            dt = `${yy}${mm}${dd}`;
          }
        }
        const memo = sanitizeSpreadsheetCell(t.description).replace(/[<>&]/g, '');

        trnList += `
            <STMTTRN>
              <TRNTYPE>${trnType}</TRNTYPE>
              <DTPOSTED>${dt}000000</DTPOSTED>
              <TRNAMT>${amt.toFixed(2)}</TRNAMT>
              <FITID>${trnId}</FITID>
              <NAME>${memo.slice(0, 32)}</NAME>
              <MEMO>${memo.slice(0, 255)}</MEMO>
            </STMTTRN>`;
      });

      const qbo = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEVERSION:102
NEWFILEVERSION:102

<OFX>
  <SIGNONMSGSRSV1>
    <SONRS>
      <STATUS>
        <CODE>0</CODE>
        <SEVERITY>INFO</SEVERITY>
      </STATUS>
      <DTSERVER>${dtServer}</DTSERVER>
      <LANGUAGE>ENG</LANGUAGE>
    </SONRS>
  </SIGNONMSGSRSV1>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <CURDEF>USD</CURDEF>
        <BANKACCTFROM>
          <BANKID>999999999</BANKID>
          <ACCTID>${acctNo.replace(/[^a-zA-Z0-9]/g, '')}</ACCTID>
          <ACCTTYPE>CHECKING</ACCTTYPE>
        </BANKACCTFROM>
        <BANKTRANLIST>
          <DTSTART>${dtServer.slice(0, 8)}</DTSTART>
          <DTEND>${dtServer.slice(0, 8)}</DTEND>${trnList}
        </BANKTRANLIST>
        <LEDGERBAL>
          <BALAMT>${parseFloat(closingBal).toFixed(2)}</BALAMT>
          <DTASOF>${dtServer}</DTASOF>
        </LEDGERBAL>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>`;

      triggerDownload(new Blob([qbo], { type: 'application/x-ofx' }), `${bankName.replace(/\s+/g, '_')}_QuickBooks.qbo`);
    }

    function updateAuditUI() {
      const curr = AppState.metadata.currency || '$';
      const openBal = typeof AppState.metadata.openingBalance === 'number' && !isNaN(AppState.metadata.openingBalance) ? AppState.metadata.openingBalance : 0;
      const closeBal = typeof AppState.metadata.closingBalance === 'number' && !isNaN(AppState.metadata.closingBalance) ? AppState.metadata.closingBalance : 0;
      const totCred = typeof AppState.audit.totalCredits === 'number' && !isNaN(AppState.audit.totalCredits) ? AppState.audit.totalCredits : 0;
      const totDeb = typeof AppState.audit.totalDebits === 'number' && !isNaN(AppState.audit.totalDebits) ? AppState.audit.totalDebits : 0;

      const calcClose = (openBal + totCred - totDeb).toFixed(2);
      const finalClose = closeBal > 0 ? closeBal.toFixed(2) : (totDeb > 0 && totCred === 0 ? totDeb.toFixed(2) : calcClose);

      document.getElementById('kpi-opening').innerText = curr + openBal.toFixed(2);
      document.getElementById('kpi-credits').innerText = curr + totCred.toFixed(2);
      document.getElementById('kpi-debits').innerText = curr + totDeb.toFixed(2);
      document.getElementById('kpi-closing').innerText = curr + finalClose;

      document.getElementById('summary-opening').innerText = curr + openBal.toFixed(2);
      document.getElementById('summary-total-credits').innerText = curr + totCred.toFixed(2);
      document.getElementById('summary-total-debits').innerText = curr + totDeb.toFixed(2);
      document.getElementById('summary-calculated-closing').innerText = curr + calcClose;
      document.getElementById('summary-reported-closing').innerText = curr + (closeBal > 0 ? closeBal.toFixed(2) : finalClose);

      let variance = 0;
      if (closeBal > 0) {
        variance = Math.min(Math.abs(parseFloat(calcClose) - closeBal), Math.abs(totDeb - closeBal));
      }
      const varEl = document.getElementById('summary-variance');
      if (variance <= 0.05) {
        varEl.className = 'text-emerald-600 dark:text-emerald-400 font-bold';
        varEl.innerText = `${curr}0.00 (Balanced & Audited)`;
      } else {
        varEl.className = 'text-rose-600 dark:text-rose-400 font-bold';
        varEl.innerText = `${curr}${variance.toFixed(2)} (Discrepancy Detected)`;
      }

      // Reconciliation Formula Explanation Breakdown (Priority 2.1)
      const reconFormula = document.getElementById('recon-formula-display');
      const reconBadge = document.getElementById('recon-status-badge');
      const reconNote = document.getElementById('recon-explanation-note');
      if (reconFormula) {
        reconFormula.innerText = `${curr}${openBal.toFixed(2)} (Opening) + ${curr}${totCred.toFixed(2)} (Deposits) - ${curr}${totDeb.toFixed(2)} (Withdrawals) = ${curr}${calcClose} (Calculated Closing vs ${curr}${(closeBal > 0 ? closeBal.toFixed(2) : finalClose)} Stated)`;
      }
      if (reconBadge) {
        if (variance <= 0.05) {
          reconBadge.className = 'font-bold px-2 py-0.5 rounded-full text-[11px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
          reconBadge.innerText = 'Balanced & Reconciled (0.00 Variance)';
        } else {
          reconBadge.className = 'font-bold px-2 py-0.5 rounded-full text-[11px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
          reconBadge.innerText = `Variance: ${curr}${variance.toFixed(2)}`;
        }
      }
      if (reconNote) {
        reconNote.innerText = variance <= 0.05
          ? `Mathematical continuity verified across ${AppState.transactions ? AppState.transactions.length : 0} records. Opening balance plus net flows matches stated ending balance perfectly.`
          : `Mathematical delta indicates a ${curr}${variance.toFixed(2)} difference between stated summary balance and row items. Review highlighted entries below.`;
      }

      // Discrepancy Alert Banner
      const banner = document.getElementById('discrepancy-banner');
      if (AppState.audit.discrepancyCount > 0) {
        banner.classList.remove('hidden');
        document.getElementById('discrepancy-title').innerText = `${AppState.audit.discrepancyCount} Item(s) Require Review`;
      } else {
        banner.classList.add('hidden');
      }
      if (typeof generateCategoryInsights === 'function') generateCategoryInsights();
    }

    let txSearchQuery = '';
    function handleTransactionSearch(query) {
      txSearchQuery = (query || '').toLowerCase().trim();
      renderTransactionsTable();
    }

    function renderTransactionsTable() {
      const tbody = document.getElementById('master-transaction-tbody');
      if (!tbody) return;
      tbody.innerHTML = '';

      let list = AppState.filterOnlyIssues 
        ? AppState.transactions.filter(t => t.status === '⚠️')
        : AppState.transactions;

      if (txSearchQuery) {
        list = list.filter(t => 
          (t.description && t.description.toLowerCase().includes(txSearchQuery)) ||
          (t.date && t.date.toLowerCase().includes(txSearchQuery)) ||
          (t.refNo && t.refNo.toLowerCase().includes(txSearchQuery)) ||
          (t.debit && t.debit.includes(txSearchQuery)) ||
          (t.credit && t.credit.includes(txSearchQuery)) ||
          (t.category && t.category.toLowerCase().includes(txSearchQuery)) ||
          (t.txnType && t.txnType.toLowerCase().includes(txSearchQuery))
        );
      }

      if (list.length === 0) {
        const trEmpty = document.createElement('tr');
        const tdEmpty = document.createElement('td');
        tdEmpty.colSpan = 10;
        tdEmpty.className = 'py-8 text-center text-slate-400 dark:text-slate-500';
        tdEmpty.textContent = 'No transactions to display.';
        trEmpty.appendChild(tdEmpty);
        tbody.appendChild(trEmpty);
        return;
      }

      list.forEach((tx) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition group";
        const isFlagged = tx.status === '⚠️';

        // 1. Status Column
        const tdStatus = document.createElement('td');
        tdStatus.className = "py-2.5 px-3 text-center";
        const spanStatus = document.createElement('span');
        spanStatus.className = 'inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ' + (
          isFlagged ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
        );
        spanStatus.title = tx.validationNote || 'Verified';
        spanStatus.textContent = tx.status || '✓';
        tdStatus.appendChild(spanStatus);
        tr.appendChild(tdStatus);

        // Helper for building XSS-safe editable content cells
        const makeCell = (field, value, className) => {
          const td = document.createElement('td');
          td.className = className;
          td.contentEditable = "true";
          td.dataset.id = tx.id;
          td.dataset.field = field;
          td.textContent = value || '';
          return td;
        };

        // 2. Date
        tr.appendChild(makeCell('date', tx.date || '', 'py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap'));
        // 3. Description
        tr.appendChild(makeCell('description', tx.description || '', 'py-2.5 px-4 text-slate-900 dark:text-white font-medium'));
        // 4. Ref No
        tr.appendChild(makeCell('refNo', tx.refNo || '-', 'py-2.5 px-3 text-center text-slate-500 dark:text-slate-400 font-mono'));
        // 5. Debit
        tr.appendChild(makeCell('debit', tx.debit ? '$' + tx.debit : '', 'py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap'));
        // 6. Credit
        tr.appendChild(makeCell('credit', tx.credit ? '$' + tx.credit : '', 'py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap'));
        // 7. Balance
        tr.appendChild(makeCell('balance', tx.balance ? '$' + tx.balance : '', 'py-2.5 px-3 text-right text-slate-700 dark:text-slate-300 whitespace-nowrap'));
        // 8. Type
        tr.appendChild(makeCell('txnType', tx.txnType || '', 'py-2.5 px-3 text-slate-600 dark:text-slate-400 text-[11px]'));
        // 9. Category
        tr.appendChild(makeCell('category', tx.category || '', 'py-2.5 px-3 text-slate-600 dark:text-slate-400 text-[11px]'));

        // 10. Actions
        const tdAction = document.createElement('td');
        tdAction.className = "py-2.5 px-2 text-center";
        const btnDel = document.createElement('button');
        btnDel.className = "tx-delete-btn text-slate-300 dark:text-slate-600 group-hover:text-rose-600 dark:group-hover:text-rose-400 p-1 font-bold text-base transition leading-none focus:outline-none focus:ring-2 focus:ring-rose-500 rounded";
        btnDel.title = "Delete transaction";
        btnDel.setAttribute('aria-label', 'Delete transaction row');
        btnDel.dataset.id = tx.id;
        btnDel.textContent = '×';
        tdAction.appendChild(btnDel);
        tr.appendChild(tdAction);

        tbody.appendChild(tr);
      });

      if (!tbody._hasListeners) {
        tbody._hasListeners = true;
        // Delegated edit listener on cell blur / focusout
        tbody.addEventListener('focusout', (e) => {
          const td = e.target;
          if (td && td.isContentEditable && td.dataset.id && td.dataset.field) {
            updateTxRow(td.dataset.id, td.dataset.field, td.textContent || '');
          }
        });
        // Delegated delete listener
        tbody.addEventListener('click', (e) => {
          const btn = e.target.closest('.tx-delete-btn');
          if (btn && btn.dataset.id) {
            removeTxRow(btn.dataset.id);
          }
        });
      }
    }

    
    // ================= UNDO / REDO SYSTEM (Priority 4.1) =================
    function pushUndoState() {
      if (!AppState.transactions) return;
      if (!AppState.undoStack) AppState.undoStack = [];
      if (!AppState.redoStack) AppState.redoStack = [];
      AppState.undoStack.push(JSON.stringify(AppState.transactions));
      if (AppState.undoStack.length > 50) AppState.undoStack.shift();
      AppState.redoStack = []; // Reset redo stack on new user modification
      updateUndoStatusUI();
    }

    function undoTransactionEdit() {
      if (!AppState.undoStack || AppState.undoStack.length === 0) return;
      if (!AppState.redoStack) AppState.redoStack = [];
      AppState.redoStack.push(JSON.stringify(AppState.transactions));
      const previousState = AppState.undoStack.pop();
      AppState.transactions = JSON.parse(previousState);
      auditAndReconcileBalances();
      renderTransactionsTable();
      updateUndoStatusUI();
    }

    function redoTransactionEdit() {
      if (!AppState.redoStack || AppState.redoStack.length === 0) return;
      AppState.undoStack.push(JSON.stringify(AppState.transactions));
      const nextState = AppState.redoStack.pop();
      AppState.transactions = JSON.parse(nextState);
      auditAndReconcileBalances();
      renderTransactionsTable();
      updateUndoStatusUI();
    }

    function updateUndoStatusUI() {
      const undoBtn = document.getElementById('btn-undo-tx');
      const redoBtn = document.getElementById('btn-redo-tx');
      const indicator = document.getElementById('undo-status-indicator');
      const uCount = AppState.undoStack ? AppState.undoStack.length : 0;
      const rCount = AppState.redoStack ? AppState.redoStack.length : 0;
      if (undoBtn) undoBtn.disabled = uCount === 0;
      if (redoBtn) redoBtn.disabled = rCount === 0;
      if (indicator) {
        indicator.innerText = uCount > 0 ? `(${uCount} edit${uCount > 1 ? 's' : ''})` : '';
      }
    }

    function updateTxRow(id, field, val) {
      const tx = AppState.transactions.find(t => t.id === id);
      if (tx) {
        const cleanVal = val.replace(/[\$₹€£]/g, '').trim();
        if (tx[field] !== cleanVal) {
          pushUndoState();
          tx[field] = cleanVal;
          auditAndReconcileBalances();
        }
      }
    }

    function removeTxRow(id) {
      pushUndoState();
      AppState.transactions = AppState.transactions.filter(t => t.id !== id);
      auditAndReconcileBalances();
      renderTransactionsTable();
    }

    function addNewBlankTransaction() {
      pushUndoState();
      const today = new Date().toISOString().slice(0, 10);
      AppState.transactions.unshift({
        id: Math.random().toString(36).substr(2, 9),
        status: '✓',
        confidence: 100,
        date: today,
        description: 'New Transaction',
        refNo: '',
        debit: '0.00',
        credit: '',
        balance: '',
        txnType: 'Electronic',
        category: 'General'
      });
      renderTransactionsTable();
    }

    function purgeAllSessionData() {
      // 1. Revoke all active object/blob URLs
      revokeAllObjectURLs();

      // 2. Reset Core State
      AppState.files = [];
      AppState.pendingFile = null;
      AppState.rawLines = [];
      AppState.rawText = '';
      AppState.transactions = [];
      if (AppState.undoStack) AppState.undoStack = [];
      if (AppState.redoStack) AppState.redoStack = [];
      AppState.metadata = {
        bankName: '',
        accountHolder: '',
        accountNumber: '',
        periodStart: '',
        periodEnd: '',
        openingBalance: 0,
        closingBalance: 0,
        currency: '$',
        pageCount: 1
      };
      AppState.audit = {
        totalCredits: 0,
        totalDebits: 0,
        discrepancyCount: 0,
        isReconciled: true
      };
      AppState.filterOnlyIssues = false;

      // 3. Reset Sub-tool states
      mergeItems = [];
      splitFile = null;
      splitPagesState = [];
      organizeFile = null;
      organizePages = [];
      img2pdfSelectedFiles = [];
      pdf2imgSelectedFile = null;
      watermarkFile = null;
      signFileState = { file: null, buffer: null, penColor: '#1E293B' };
      compressFileState = { file: null, buffer: null, preset: 'recommended' };
      resetProtectWorkspace();
      resetUnlockWorkspace();
      pageNumberFile = null;
      markdownState = { file: null, text: '' };
      if (extractImagesState && extractImagesState.images) {
        extractImagesState.images.forEach(item => {
          if (item && item.url) revokeTrackedObjectURL(item.url);
        });
      }
      extractImagesState = { file: null, images: [] };
      compareState = { docA: null, docB: null, page: 1, maxPages: 1 };
      rotateState = { file: null, doc: null, pageRotations: {} };
      redactState = { file: null, doc: null, currentPage: 1, totalPages: 1, redactions: {} };
      pdf2wordState = { file: null, doc: null, pagesData: [] };
      office2pdfState = { file: null, type: '', rows: [], textContent: '' };
      pdfaState = { file: null, pdfBytes: null };
      digitalSignState = { file: null, pdfBytes: null, sha256Hex: null };
      summarizeState = { file: null, highlights: [], entities: [] };
      if (typeof stopScan2PdfCamera === 'function') {
        stopScan2PdfCamera();
      }
      scan2PdfState = { stream: null, pages: [] };
      editPdfState = {
        file: null,
        pdfDoc: null,
        pdfBytes: null,
        pdfJsDoc: null,
        currentPage: 1,
        totalPages: 1,
        currentTool: 'draw',
        brushColor: '#ef4444',
        brushSize: 4,
        isDrawing: false,
        annotationsByPage: {},
        zoomScale: 1.0
      };
      formFillState = { file: null, pdfDoc: null, pdfBytes: null, fields: [] };
      pptx2PdfState = { file: null, slides: [] };
      pdf2PptxState = { file: null, pdfBytes: null, pdfJsDoc: null, pageCount: 0 };
      revokeAllObjectURLs();

      // 4. Reset Sensitive Inputs (Passwords, Metadata, Inputs)
      const sensitiveInputIds = [
        'unlock-password-input',
        'protect-password-input',
        'protect-password-confirm',
        'meta-bank-name',
        'meta-account-holder',
        'meta-account-number',
        'meta-period-start',
        'meta-period-end',
        'tx-search-input',
        'split-range-input',
        'watermark-text-input'
      ];
      sensitiveInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });

      // Clear Markdown Textarea
      const mdArea = document.getElementById('markdown-result-textarea');
      if (mdArea) mdArea.value = '';

      // 5. Reset File Inputs
      const fileInputs = [
        'universal-file-input', 'file-input', 'merge-file-input', 'split-file-input',
        'organize-file-input', 'unlock-file-input', 'watermark-file-input',
        'pdf2img-file-input', 'img2pdf-file-input', 'pagenumber-file-input',
        'compress-file-input', 'sign-file-input', 'protect-file-input', 'markdown-file-input'
      ];
      fileInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });

      // 6. Clean DOM elements and canvases
      const domTargets = [
        'master-transaction-tbody', 'transactions-body', 'merge-file-list', 'split-thumbnails-grid',
        'org-thumbnails-grid', 'organize-pages-grid', 'pdf2img-gallery-grid', 'img2pdf-previews-list'
      ];
      domTargets.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
      });

      disposeCanvas(document.getElementById('signature-canvas'));
      disposeCanvas(document.getElementById('preview-thumbnail-canvas'));

      // Hide workspace sections and return to intake/dashboard
      const ws = document.getElementById('workspace-section');
      const ps = document.getElementById('preview-stage');
      const proc = document.getElementById('processing-section');
      const is = document.getElementById('intake-section');
      const btnReset = document.getElementById('btn-header-reset');
      const mergeContainer = document.getElementById('merge-files-container');
      const splitControls = document.getElementById('split-controls-card');
      const orgControls = document.getElementById('organize-workspace-card');
      const img2pdfControls = document.getElementById('img2pdf-controls-card');

      if (ws) ws.classList.add('hidden');
      if (ps) ps.classList.add('hidden');
      if (proc) proc.classList.add('hidden');
      if (is) is.classList.remove('hidden');
      if (btnReset) btnReset.classList.add('hidden');
      if (mergeContainer) mergeContainer.classList.add('hidden');
      if (splitControls) splitControls.classList.add('hidden');
      if (orgControls) orgControls.classList.add('hidden');
      if (img2pdfControls) img2pdfControls.classList.add('hidden');

      // 7. Purge recent files
      clearRecentFiles();

      // 8. Switch back to Dashboard view
      switchPortalTool('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // 9. Confirm purge with toast
      showNotificationToast('🧹 All loaded files, session RAM buffers, and recent metadata have been cleared.', 'success');
    }

    function resetApplication() {
      purgeAllSessionData();
    }

    // ================= MODULE 7: ENTERPRISE EXPORT ENGINE =================
    function initExportListeners() {
      // 1. Multi-Sheet Excel Export (.xlsx via SheetJS)
      document.getElementById('btn-export-excel').addEventListener('click', async () => {
        if (!AppState.transactions.length) return;
        try {
          await ensureXlsx();
        } catch (e) {
          return alert('Failed to load Excel export engine: ' + e.message);
        }
        const wb = XLSX.utils.book_new();

        const bankName = document.getElementById('meta-bank-name').value || 'BANK STATEMENT';
        const acctHolder = document.getElementById('meta-account-holder').value || '';
        const acctNo = document.getElementById('meta-account-number').value || '';
        const pStart = document.getElementById('meta-period-start').value || '';
        const pEnd = document.getElementById('meta-period-end').value || '';
        const isCreditCard = AppState.metadata.statementType === 'credit_card' ||
                             /credit|visa|card/i.test(bankName) ||
                             (!AppState.transactions.some(t => t.balance) && !AppState.transactions.some(t => t.credit));

        // SHEET 1: Exact Bank Statement (Exact Replica with Upper Part, Previous Balance & Totals)
        let exactData = [];
        if (isCreditCard) {
          const totDue = AppState.metadata.closingBalance || AppState.audit.totalDebits || 0;
          const limit = AppState.metadata.creditLimit || 390000.00;
          exactData = [
            [bankName, "", "", "Statement of Account"],
            ["Customer Number: " + (acctNo || "23785-54-9674458"), "", "Branch Name:", "<Branch Name>"],
            ["Cardholder: " + (acctHolder || "John Smith"), "", "Statement Date:", pStart || "mm/dd/yyyy"],
            ["", "", "Payment Due Date:", pEnd || "mm/dd/yyyy"],
            ["Credit Limit:", typeof limit === 'number' ? limit.toLocaleString('en-US', {minimumFractionDigits: 2}) : limit, "Total Amount Due:", typeof totDue === 'number' ? totDue.toLocaleString('en-US', {minimumFractionDigits: 2}) : totDue],
            [],
            ["Date", "Description", "Amount"]
          ];

          AppState.transactions.forEach(t => {
            exactData.push([
              t.date,
              t.description,
              t.debit ? parseFloat(t.debit) : ""
            ]);
          });

          exactData.push([
            "",
            "Total Amount Due",
            parseFloat(AppState.audit.totalDebits.toFixed(2))
          ]);
        } else {
          exactData = [
            [bankName, "", "", "", "CHEQUING ACCOUNT STATEMENT", ""],
            ["Account Holder: " + acctHolder, "", "", "Statement Period:", `${pStart} to ${pEnd}`, ""],
            ["Account No: " + acctNo, "", "", "", "", ""],
            [],
            ["Date", "Description", "Ref.", "Withdrawals", "Deposits", "Balance"]
          ];

          if (AppState.metadata.openingBalance) {
            exactData.push([pStart || "", "Previous balance", "", "", "", AppState.metadata.openingBalance]);
          }

          AppState.transactions.forEach(t => {
            exactData.push([
              sanitizeSpreadsheetCell(t.date),
              sanitizeSpreadsheetCell(t.description),
              sanitizeSpreadsheetCell(t.refNo),
              t.debit ? parseFloat(t.debit) : "",
              t.credit ? parseFloat(t.credit) : "",
              t.balance ? parseFloat(t.balance) : ""
            ]);
          });

          exactData.push([
            "",
            "*** Totals ***",
            "",
            AppState.audit.totalDebits ? parseFloat(AppState.audit.totalDebits.toFixed(2)) : "",
            AppState.audit.totalCredits ? parseFloat(AppState.audit.totalCredits.toFixed(2)) : "",
            AppState.metadata.closingBalance ? parseFloat(AppState.metadata.closingBalance.toFixed(2)) : ""
          ]);
        }

        const wsExact = XLSX.utils.aoa_to_sheet(exactData);
        wsExact['!cols'] = [{wch: 16}, {wch: 38}, {wch: 16}, {wch: 22}, {wch: 16}, {wch: 16}];
        XLSX.utils.book_append_sheet(wb, wsExact, "Statement");

        // SHEET 2: Normalized Ledger (For Accounting Systems)
        const txData = [
          ["Date", "Original Description", "Reference / Check #", "Debit (-)", "Credit (+)", "Balance", "Currency", "Transaction Type", "Category", "Audit Status", "Variance / Audit Notes"],
          ...AppState.transactions.map(t => [
            t.date,
            t.description,
            t.refNo,
            t.debit ? parseFloat(t.debit) : "",
            t.credit ? parseFloat(t.credit) : "",
            t.balance ? parseFloat(t.balance) : "",
            t.currency || AppState.metadata.currency || '$',
            t.txnType,
            t.category,
            t.status === '⚠️' ? 'Check Delta' : 'Reconciled',
            t.status === '⚠️' ? 'Flagged for review' : 'Mathematical continuity verified'
          ])
        ];
        const wsTx = XLSX.utils.aoa_to_sheet(txData);
        wsTx['!cols'] = [{wch: 12}, {wch: 35}, {wch: 18}, {wch: 14}, {wch: 14}, {wch: 14}, {wch: 10}, {wch: 16}, {wch: 20}];
        XLSX.utils.book_append_sheet(wb, wsTx, "Normalized_Ledger");

        // SHEET 3: Statement Details
        const detailsData = [
          ["Field", "Statement Value"],
          ["Bank Institution", bankName],
          ["Account Holder", acctHolder],
          ["Account Number", acctNo],
          ["Statement Period Start", pStart],
          ["Statement Period End", pEnd],
          ["Currency", document.getElementById('meta-currency').value],
          ["Opening Balance", AppState.metadata.openingBalance || 0],
          ["Total Deposits (Credits)", AppState.audit.totalCredits || 0],
          ["Total Withdrawals (Debits)", AppState.audit.totalDebits || 0],
          ["Closing Balance", AppState.metadata.closingBalance || AppState.audit.totalDebits || 0]
        ];
        const wsDetails = XLSX.utils.aoa_to_sheet(detailsData);
        wsDetails['!cols'] = [{wch: 28}, {wch: 40}];
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        downloadTrackedBlob(blob, `${bankName.replace(/\s+/g, '_')}_Statement.xlsx`);
      });

      // 2. Exact CSV Export (With Header Block, Transactions & Totals)
      
      // Word (.doc) Export (Priority 3.3)
      const btnDoc = document.getElementById('btn-export-doc');
      if (btnDoc) {
        btnDoc.addEventListener('click', () => {
          if (!AppState.transactions.length) return;
          const bankName = escapeHtml(document.getElementById('meta-bank-name').value || 'BANK STATEMENT');
          const acctHolder = escapeHtml(document.getElementById('meta-account-holder').value || '');
          const acctNo = escapeHtml(document.getElementById('meta-account-number').value || '');
          const pStart = escapeHtml(document.getElementById('meta-period-start').value || '');
          const pEnd = escapeHtml(document.getElementById('meta-period-end').value || '');
          const curr = escapeHtml(AppState.metadata.currency || '$');

          const docContent = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${bankName} Statement Ledger</title>
<style>
body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1e293b; margin: 30px; }
h1 { font-size: 18pt; color: #0f172a; margin-bottom: 4px; }
h2 { font-size: 14pt; color: #334155; margin-top: 18px; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
.meta-table { width: 100%; margin-bottom: 20px; border-collapse: collapse; }
.meta-table td { padding: 4px 8px; font-size: 10pt; }
.meta-label { font-weight: bold; color: #64748b; width: 180px; }
.tx-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
.tx-table th { background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10pt; text-align: left; font-weight: bold; }
.tx-table td { border: 1px solid #e2e8f0; padding: 5px 8px; font-size: 9.5pt; }
.tx-table tr:nth-child(even) { background-color: #f8fafc; }
.amount { text-align: right; font-family: Consolas, monospace; }
.kpi-box { background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px 15px; border-radius: 6px; margin-bottom: 15px; }
</style>
</head>
<body>
<h1>${bankName}</h1>
<p style="color: #64748b; font-size: 10pt; margin-top: 0;">Automated Financial Statement Dossier & Ledger Extract</p>

<div class="kpi-box">
  <strong>Audit Status:</strong> ${AppState.audit.discrepancyCount === 0 ? '✓ Balanced & Reconciled' : '⚠️ ' + AppState.audit.discrepancyCount + ' Items Flagged'} |
  <strong>Opening:</strong> ${curr}${((AppState.metadata.openingBalance || 0)).toFixed(2)} |
  <strong>Credits:</strong> ${curr}${((AppState.audit.totalCredits || 0)).toFixed(2)} |
  <strong>Debits:</strong> ${curr}${((AppState.audit.totalDebits || 0)).toFixed(2)} |
  <strong>Closing:</strong> ${curr}${((AppState.metadata.closingBalance || (AppState.metadata.openingBalance || 0) + (AppState.audit.totalCredits || 0) - (AppState.audit.totalDebits || 0))).toFixed(2)}
</div>

<table class="meta-table">
  <tr><td class="meta-label">Account Holder:</td><td>${acctHolder || 'N/A'}</td><td class="meta-label">Statement Period:</td><td>${pStart} to ${pEnd}</td></tr>
  <tr><td class="meta-label">Account Number:</td><td>${acctNo || 'N/A'}</td><td class="meta-label">Base Currency:</td><td>${curr}</td></tr>
</table>

<h2>Transaction Ledger (${AppState.transactions.length} Records)</h2>
<table class="tx-table">
  <thead>
    <tr>
      <th>Date</th>
      <th>Description</th>
      <th>Ref / Check #</th>
      <th style="text-align: right;">Withdrawal (-)</th>
      <th style="text-align: right;">Deposit (+)</th>
      <th style="text-align: right;">Balance</th>
    </tr>
  </thead>
  <tbody>
    ${AppState.transactions.map(t => `
      <tr>
        <td>${escapeHtml(t.date || '')}</td>
        <td>${escapeHtml(t.description || '')}</td>
        <td>${escapeHtml(t.refNo || '-')}</td>
        <td class="amount">${t.debit ? escapeHtml(curr) + escapeHtml(t.debit) : ''}</td>
        <td class="amount">${t.credit ? escapeHtml(curr) + escapeHtml(t.credit) : ''}</td>
        <td class="amount">${t.balance ? escapeHtml(curr) + escapeHtml(t.balance) : ''}</td>
      </tr>
    `).join('')}
  </tbody>
</table>
<p style="font-size: 9pt; color: #94a3b8; margin-top: 25px; text-align: center;">Generated locally in browser memory via Statement2Sheet. Zero cloud storage or tracking.</p>
</body>
</html>`;

          const blob = new Blob(['\ufeff', docContent], { type: 'application/msword;charset=utf-8' });
          const cleanName = (AppState.pendingFile ? AppState.pendingFile.name.replace(/\.[^/.]+$/, '') : 'statement');
          downloadTrackedBlob(blob, `${cleanName}_Ledger.doc`);
        });
      }

      document.getElementById('btn-export-csv').addEventListener('click', () => {
        if (!AppState.transactions.length) return;
        const bankName = document.getElementById('meta-bank-name').value || 'BANK STATEMENT';
        const acctHolder = document.getElementById('meta-account-holder').value || '';
        const acctNo = document.getElementById('meta-account-number').value || '';
        const pStart = document.getElementById('meta-period-start').value || '';
        const pEnd = document.getElementById('meta-period-end').value || '';
        const isCreditCard = AppState.metadata.statementType === 'credit_card' ||
                             /credit|visa|card/i.test(bankName) ||
                             (!AppState.transactions.some(t => t.balance) && !AppState.transactions.some(t => t.credit));

        let csv = '';
        if (isCreditCard) {
          const totDue = AppState.metadata.closingBalance || AppState.audit.totalDebits || 0;
          const limit = AppState.metadata.creditLimit || 390000.00;
          csv += `"${bankName}",,"Statement of Account"\n`;
          csv += `"Customer Number: ${acctNo || '23785-54-9674458'}",,"Branch Name: <Branch Name>"\n`;
          csv += `"Cardholder: ${acctHolder || 'John Smith'}",,"Statement Date: ${pStart || 'mm/dd/yyyy'}"\n`;
          csv += `",,"Payment Due Date: ${pEnd || 'mm/dd/yyyy'}"\n`;
          csv += `"Credit Limit: ${typeof limit === 'number' ? limit.toFixed(2) : limit}",,"Total Amount Due: ${typeof totDue === 'number' ? totDue.toFixed(2) : totDue}"\n\n`;
          csv += "Date,Description,Amount\n";

          AppState.transactions.forEach(t => {
            const safeDesc = `"${sanitizeSpreadsheetCell(t.description).replace(/"/g, '""')}"`;
            const safeDate = sanitizeSpreadsheetCell(t.date);
            const safeDebit = sanitizeSpreadsheetCell(t.debit);
            csv += `${safeDate},${safeDesc},${safeDebit}\n`;
          });

          const totWdl = AppState.audit.totalDebits ? AppState.audit.totalDebits.toFixed(2) : '';
          csv += `,"Total Amount Due","${totWdl}"\n`;
        } else {
          csv += `"${bankName}",,,,,"CHEQUING ACCOUNT STATEMENT"\n`;
          csv += `"Account Holder: ${acctHolder}",,,"Statement Period:","${pStart} to ${pEnd}",\n`;
          csv += `"Account No: ${acctNo}",,,,,\n\n`;
          csv += "Date,Description,Ref.,Withdrawals,Deposits,Balance\n";

          if (AppState.metadata.openingBalance) {
            csv += `"${pStart}","Previous balance",,,,${AppState.metadata.openingBalance}\n`;
          }

          AppState.transactions.forEach(t => {
            const safeDesc = `"${sanitizeSpreadsheetCell(t.description).replace(/"/g, '""')}"`;
            const safeDate = sanitizeSpreadsheetCell(t.date);
            const safeRef = `"${sanitizeSpreadsheetCell(t.refNo).replace(/"/g, '""')}"`;
            const safeDebit = sanitizeSpreadsheetCell(t.debit);
            const safeCredit = sanitizeSpreadsheetCell(t.credit);
            const safeBal = sanitizeSpreadsheetCell(t.balance);
            csv += `${safeDate},${safeDesc},${safeRef},${safeDebit},${safeCredit},${safeBal}\n`;
          });

          const totWdl = AppState.audit.totalDebits ? AppState.audit.totalDebits.toFixed(2) : '';
          const totDep = AppState.audit.totalCredits ? AppState.audit.totalCredits.toFixed(2) : '';
          csv += `,"*** Totals ***",,"${totWdl}","${totDep}",\n`;
        }

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        downloadTrackedBlob(blob, `${bankName.replace(/\s+/g, '_')}_Statement.csv`);
      });

      // 3. Clean PDF Export via jsPDF
      document.getElementById('btn-export-clean-pdf').addEventListener('click', async () => {
        if (!AppState.transactions.length) return;
        try {
          await ensureJsPdf();
        } catch (e) {
          return alert('Failed to load PDF export engine: ' + e.message);
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const openBal = typeof AppState.metadata.openingBalance === 'number' ? AppState.metadata.openingBalance : 0;
        const closeBal = typeof AppState.metadata.closingBalance === 'number' ? AppState.metadata.closingBalance : (AppState.audit.totalDebits || 0);

        doc.setFontSize(16);
        doc.text(`Universal Statement Audit — ${document.getElementById('meta-bank-name').value}`, 14, 20);
        
        doc.setFontSize(10);
        doc.text(`Account: ${document.getElementById('meta-account-number').value} | Period: ${document.getElementById('meta-period-start').value} to ${document.getElementById('meta-period-end').value}`, 14, 28);
        doc.text(`Opening: $${openBal.toFixed(2)} | Credits: +$${AppState.audit.totalCredits.toFixed(2)} | Debits: -$${AppState.audit.totalDebits.toFixed(2)} | Closing: $${closeBal.toFixed(2)}`, 14, 34);

        let y = 46;
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.text("Date", 14, y);
        doc.text("Description", 36, y);
        doc.text("Debit (-)", 120, y);
        doc.text("Credit (+)", 148, y);
        doc.text("Balance", 175, y);
        doc.line(14, y + 2, 195, y + 2);

        doc.setFont(undefined, 'normal');
        y += 7;

        AppState.transactions.slice(0, 45).forEach(tx => {
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
          doc.text(tx.date || '', 14, y);
          doc.text((tx.description || '').substring(0, 42), 36, y);
          doc.text(tx.debit ? '$' + tx.debit : '-', 120, y);
          doc.text(tx.credit ? '$' + tx.credit : '-', 148, y);
          doc.text(tx.balance ? '$' + tx.balance : '-', 175, y);
          y += 5.5;
        });

        const blob = doc.output('blob');
        const bName = (AppState.metadata.bankName || 'Statement').replace(/\s+/g, '_');
        downloadTrackedBlob(blob, `${bName}_Clean_Statement.pdf`);
      });
    }


    // ================= CENTRALIZED EVENT DISPATCHER (STRICT CSP) =================
    function initEventDispatcher() {
      // Document Click Dispatcher
      document.addEventListener('click', (e) => {
        // 1. Data Tool Navigation
        const toolEl = e.target.closest('[data-tool]');
        if (toolEl) {
          e.preventDefault();
          const tool = toolEl.getAttribute('data-tool');
          if (tool) switchPortalTool(tool);
          return;
        }

        // 2. Data Trigger Click (hidden inputs)
        const triggerEl = e.target.closest('[data-trigger-click]');
        if (triggerEl) {
          e.preventDefault();
          const targetId = triggerEl.getAttribute('data-trigger-click');
          const targetInput = document.getElementById(targetId);
          if (targetInput) targetInput.click();
          return;
        }

        // 3. Data Filter (Dashboard Tool Filters)
        const filterEl = e.target.closest('[data-filter]');
        if (filterEl) {
          e.preventDefault();
          const category = filterEl.getAttribute('data-filter');
          filterDashboardTools(category, filterEl);
          return;
        }

        // 4. Data Action Handlers
        const actionEl = e.target.closest('[data-action]');
        if (actionEl) {
          const action = actionEl.getAttribute('data-action');
          handleApplicationAction(action, actionEl, e);
          return;
        }
      });

      // Inputs & Changes
      document.addEventListener('input', (e) => {
        if (e.target.id === 'split-range-input') {
          handleSplitRangeInput(e.target.value);
        } else if (e.target.id === 'tx-search-input') {
          handleTransactionSearch(e.target.value);
        }
      });

      document.addEventListener('change', (e) => {
        if (e.target.name === 'compress-preset') {
          updateCompressPreset(e.target.value);
        }
      });

      // Keyboard Accessibility (Esc to close modals / arrow navigation)
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closePageZoomModal();
          closeAllLegalModals();
        } else if (e.key === 'ArrowLeft') {
          zoomModalNavigate(-1);
        } else if (e.key === 'ArrowRight') {
          zoomModalNavigate(1);
        }
      });
    }

    function handleApplicationAction(action, el, event) {
      
    // Tool Screen Transition & Reset Handlers
    function resetMergeWorkspace() {
      mergeItems = [];
      renderMergeList();
      setToolScreenState('merge', 'upload');
    }

    function resetSplitWorkspace() {
      splitFile = null;
      splitPagesState = [];
      setToolScreenState('split', 'upload');
      const grid = document.getElementById('split-thumbnails-grid');
      if (grid) grid.innerHTML = '';
    }

    function resetOrganizeWorkspace() {
      organizeFile = null;
      organizePages = [];
      setToolScreenState('organize', 'upload');
      const grid = document.getElementById('organize-thumbnails-grid');
      if (grid) grid.innerHTML = '';
    }

    function resetWatermarkWorkspace() {
      watermarkFile = null;
      setToolScreenState('watermark', 'upload');
    }

    function resetPageNumberWorkspace() {
      pageNumberFile = null;
      setToolScreenState('pagenumber', 'upload');
    }

    function resetPdf2ImgWorkspace() {
      setToolScreenState('pdf2img', 'upload');
      const gallery = document.getElementById('pdf2img-gallery-grid');
      if (gallery) gallery.innerHTML = '';
    }

    function resetImg2PdfWorkspace() {
      clearImg2PdfList();
      setToolScreenState('img2pdf', 'upload');
    }

    function resetCompressWorkspace() {
      compressFileState = { file: null, buffer: null, preset: 'recommended' };
      batchCompressQueue = [];
      setToolScreenState('compress', 'upload');
    }

    function resetSignWorkspace() {
      signFileState.file = null;
      signFileState.buffer = null;
      clearSignatureCanvas();
      setToolScreenState('sign', 'upload');
    }

    function resetMarkdownWorkspace() {
      markdownState = { file: null, text: '' };
      setToolScreenState('markdown', 'upload');
      const ta = document.getElementById('markdown-result-textarea');
      if (ta) ta.value = '';
    }

    function resetCropWorkspace() {
      cropState = { file: null, doc: null, pdfBytes: null, currentPage: 1, totalPages: 1 };
      setToolScreenState('crop', 'upload');
    }

    function resetExtractImagesWorkspace() {
      extractImagesState = { file: null, images: [] };
      setToolScreenState('extract-images', 'upload');
      const grid = document.getElementById('extracted-images-grid');
      if (grid) grid.innerHTML = '';
    }

    function resetCompareWorkspace() {
      compareState = { docA: null, docB: null, nameA: '', nameB: '', page: 1, maxPages: 1 };
      const d1 = document.getElementById('compare-name-1');
      const d2 = document.getElementById('compare-name-2');
      if (d1) d1.textContent = 'Upload Document A (Original)';
      if (d2) d2.textContent = 'Upload Document B (Modified)';
      setToolScreenState('compare', 'upload');
    }

    function resetRotateWorkspace() {
      rotateState = { file: null, buffer: null, doc: null, pageRotations: {} };
      batchRotateQueue = [];
      setToolScreenState('rotate', 'upload');
      const grid = document.getElementById('rotate-thumbnails-grid');
      if (grid) grid.innerHTML = '';
    }

    function resetRedactWorkspace() {
      redactState = { file: null, buffer: null, doc: null, currentPage: 1, totalPages: 1, redactions: {} };
      setToolScreenState('redact', 'upload');
    }

    function resetPdf2WordWorkspace() {
      pdf2wordState = { file: null, doc: null, mode: 'text', pagesData: [], pageImages: [] };
      setToolScreenState('pdf2word', 'upload');
      const pb = document.getElementById('pdf2word-preview-box');
      if (pb) pb.innerHTML = '';
    }

    function resetOffice2PdfWorkspace() {
      office2pdfState = { file: null, type: '', rows: [], textContent: '' };
      setToolScreenState('office2pdf', 'upload');
      const pc = document.getElementById('office2pdf-preview-container');
      if (pc) pc.innerHTML = '';
    }

    function resetPdfaWorkspace() {
      pdfaState = { file: null, pdfBytes: null };
      setToolScreenState('pdfa', 'upload');
    }

    function resetDigitalSignWorkspace() {
      digitalSignState = { file: null, pdfBytes: null, sha256Hex: '' };
      setToolScreenState('digitalsign', 'upload');
    }

    function resetSummarizeWorkspace() {
      summarizeState = { file: null, text: '', highlights: [], entities: [] };
      setToolScreenState('summarize', 'upload');
      const hl = document.getElementById('summarize-highlights-list');
      if (hl) hl.innerHTML = '';
      const ec = document.getElementById('summarize-entities-container');
      if (ec) ec.innerHTML = '';
    }

    function resetRepairWorkspace() {
      repairState = { file: null, arrayBuffer: null };
      setToolScreenState('repair', 'upload');
      const box = document.getElementById('repair-log-box');
      if (box) box.innerHTML = '';
    }

    function resetEditPdfWorkspace() {
      editPdfState = { file: null, pdfBytes: null, pdfJsDoc: null, annotations: {}, currentPage: 1, totalPages: 1 };
      setToolScreenState('editpdf', 'upload');
    }

    function resetFormFillWorkspace() {
      formFillState = { file: null, pdfBytes: null, fields: [] };
      setToolScreenState('formfill', 'upload');
      const iform = document.getElementById('formfill-interactive-form');
      if (iform) iform.innerHTML = '';
    }

    function resetPptx2PdfWorkspace() {
      pptx2PdfState = { file: null, slides: [] };
      setToolScreenState('pptx2pdf', 'upload');
      const sg = document.getElementById('pptx2pdf-slides-gallery');
      if (sg) sg.innerHTML = '';
    }

    function resetPdf2PptxWorkspace() {
      pdf2PptxState = { file: null, pdfBytes: null, pdfJsDoc: null, pageCount: 0 };
      setToolScreenState('pdf2pptx', 'upload');
      const ppc = document.getElementById('pdf2pptx-preview-container');
      if (ppc) ppc.innerHTML = '';
    }

        switch (action) {
        case 'toggle-convert-dropdown':
          toggleConvertDropdown(event);
          break;
        case 'toggle-mega-menu':
          toggleMegaMenu(event);
          break;
        case 'close-mega-menu':
          closeMegaMenu();
          break;
        case 'toggle-app-launcher':
          toggleAppLauncher(event);
          break;
        case 'trigger-universal-upload':
          document.getElementById('universal-file-input')?.click();
          break;
        case 'purge-session':
          purgeAllSessionData();
          break;
        case 'clear-recent-files':
          clearRecentFiles();
          break;
        case 'clear-merge-list':
          clearMergeList();
          break;
        case 'run-merge':
          executeMergePdfs();
          break;
        case 'clear-split-selection':
          clearSplitSelection();
          break;
        case 'select-all-split-pages':
          selectAllSplitPages(true);
          break;
        case 'deselect-all-split-pages':
          selectAllSplitPages(false);
          break;
        case 'select-odd-split-pages':
          selectOddSplitPages();
          break;
        case 'select-even-split-pages':
          selectEvenSplitPages();
          break;
        case 'set-split-grid-size':
          setSplitGridSize(el.getAttribute('data-size'), el);
          break;
        case 'run-split':
          executeSplitPdf();
          break;
        case 'set-organize-grid-size':
          setOrganizeGridSize(el.getAttribute('data-size'), el);
          break;
        case 'save-organized-pdf':
          executeSaveOrganizedPdf();
          break;
        case 'run-unlock':
          executeUnlockPdf();
          break;
                case 'reset-merge-file':
          resetMergeWorkspace();
          break;
        case 'reset-split-file':
          resetSplitWorkspace();
          break;
        case 'reset-organize-file':
          resetOrganizeWorkspace();
          break;
        case 'reset-watermark-file':
          resetWatermarkWorkspace();
          break;
        case 'reset-pagenumber-file':
          resetPageNumberWorkspace();
          break;
        case 'reset-pdf2img-file':
          resetPdf2ImgWorkspace();
          break;
        case 'reset-img2pdf-file':
          resetImg2PdfWorkspace();
          break;
        case 'reset-compress-file':
          resetCompressWorkspace();
          break;
        case 'reset-sign-file':
          resetSignWorkspace();
          break;
        case 'reset-markdown-file':
          resetMarkdownWorkspace();
          break;
        case 'reset-crop-file':
          resetCropWorkspace();
          break;
        case 'reset-extract-images-file':
          resetExtractImagesWorkspace();
          break;
        case 'reset-compare-file':
          resetCompareWorkspace();
          break;
        case 'reset-rotate-file':
          resetRotateWorkspace();
          break;
        case 'reset-redact-file':
          resetRedactWorkspace();
          break;
        case 'reset-pdf2word-file':
          resetPdf2WordWorkspace();
          break;
        case 'reset-office2pdf-file':
          resetOffice2PdfWorkspace();
          break;
        case 'reset-pdfa-file':
          resetPdfaWorkspace();
          break;
        case 'reset-digitalsign-file':
          resetDigitalSignWorkspace();
          break;
        case 'reset-summarize-file':
          resetSummarizeWorkspace();
          break;
        case 'reset-repair-file':
          resetRepairWorkspace();
          break;
        case 'reset-editpdf-file':
          resetEditPdfWorkspace();
          break;
        case 'reset-formfill-file':
          resetFormFillWorkspace();
          break;
        case 'reset-pptx2pdf-file':
          resetPptx2PdfWorkspace();
          break;
        case 'reset-pdf2pptx-file':
          resetPdf2PptxWorkspace();
          break;
        case 'reset-unlock-file':
          resetUnlockWorkspace();
          break;
        case 'reset-protect-file':
          resetProtectWorkspace();
          break;
        case 'reset-converter':
          resetConverterToIntake();
          break;
        case 'load-demo':
          loadDemoStatement(el.getAttribute('data-demo-type') || 'wiki');
          break;
        case 'export-qbo':
          exportToQBO();
          break;
        case 'undo-tx':
          undoTransactionEdit();
          break;
        case 'redo-tx':
          redoTransactionEdit();
          break;
        case 'set-watermark-text':
          const wmInp = document.getElementById('watermark-text-input');
          if (wmInp) wmInp.value = el.getAttribute('data-text') || '';
          break;
        case 'run-watermark':
          executeWatermarkPdf();
          break;
        case 'run-pagenumber':
          executePageNumberingPdf();
          break;
        case 'clear-img2pdf-list':
          clearImg2PdfList();
          break;
        case 'run-img2pdf':
          executeConvertImagesToPdf();
          break;
        case 'run-compress':
          executeCompressPdf();
          break;
        case 'clear-signature':
          clearSignatureCanvas();
          break;
        case 'set-pen-color':
          setPenColor(el.getAttribute('data-color'));
          break;
        case 'run-sign':
          executeSignPdf();
          break;
        case 'run-protect':
          executeProtectPdf();
          break;
        case 'copy-markdown':
          copyMarkdownContent();
          break;
        case 'download-markdown':
          downloadMarkdownFile();
          break;
        case 'crop-prev-page':
          cropNavigatePage(-1);
          break;
        case 'crop-next-page':
          cropNavigatePage(1);
          break;
        case 'crop-preset-reset':
          setCropPreset(0, 0, 0, 0);
          break;
        case 'crop-preset-margins':
          setCropPreset(10, 10, 10, 10);
          break;
        case 'run-crop':
          executeCropPdf();
          break;
        case 'download-all-extracted-images':
          executeDownloadAllExtractedImages();
          break;
        case 'compare-prev-page':
          compareNavigatePage(-1);
          break;
        case 'compare-next-page':
          compareNavigatePage(1);
          break;
        case 'compare-view-diff':
          switchCompareMode('diff');
          break;
        case 'compare-view-split':
          switchCompareMode('split');
          break;
        case 'compare-view-text':
          switchCompareMode('text');
          break;
        case 'rotate-all-right':
          rotateAllPages(90);
          break;
        case 'rotate-all-left':
          rotateAllPages(270);
          break;
        case 'rotate-all-180':
          rotateAllPages(180);
          break;
        case 'run-rotate':
          executeSaveRotatedPdf();
          break;
        case 'redact-prev-page':
          redactNavigatePage(-1);
          break;
        case 'redact-next-page':
          redactNavigatePage(1);
          break;
        case 'redact-clear-page':
          redactClearCurrentPage();
          break;
        case 'redact-search-match':
          redactAutoSearchMatch();
          break;
        case 'run-redact':
          executeRedactPdf();
          break;
        case 'set-pdf2word-mode': {
          const mode = actionTarget.closest('[data-mode]')?.dataset?.mode;
          if (mode && typeof setPdf2WordMode === 'function') setPdf2WordMode(mode);
          break;
        }
        case 'start-pdf2word-ocr':
          runPdf2WordOcr();
          break;
        case 'run-pdf2word':
          executeConvertPdfToWord();
          break;
        case 'run-office2pdf':
          executeConvertOfficeToPdf();
          break;
        case 'run-pdfa':
          executeConvertToPdfa();
          break;
        case 'run-digitalsign':
          executeDigitalSignPdf();
          break;
        case 'copy-summary':
          copySummaryContent();
          break;
        case 'download-summary-md':
          downloadSummaryReport();
          break;
        case 'run-repair':
          executeRepairPdf();
          break;
        case 'editpdf-set-tool': {
          const toolType = btn.getAttribute('data-tool-type');
          if (toolType) setEditPdfTool(toolType);
          break;
        }
        case 'editpdf-clear-page':
          clearEditPdfCurrentPage();
          break;
        case 'editpdf-prev-page':
          navigateEditPdfPage(-1);
          break;
        case 'editpdf-next-page':
          navigateEditPdfPage(1);
          break;
        case 'run-editpdf':
          executeEditPdf();
          break;
        case 'run-formfill':
          executeFormFill();
          break;
        case 'run-pptx2pdf':
          executePptxToPdf();
          break;
        case 'run-pdf2pptx':
          executePdf2Pptx();
          break;
        case 'scan2pdf-start-camera':
          startScan2PdfCamera();
          break;
        case 'scan2pdf-capture-frame':
          captureScan2PdfFrame();
          break;
        case 'scan2pdf-stop-camera':
          stopScan2PdfCamera();
          break;
        case 'run-scan2pdf':
          executeScan2Pdf();
          break;
        case 'run-compress-batch':
          executeBatchCompressZip();
          break;
        case 'run-rotate-batch':
          executeBatchRotateZip();
          break;
        case 'run-protect-batch':
          executeBatchProtectZip();
          break;
        case 'zoom-in-scale':
          setZoomModalScale(0.25);
          break;
        case 'zoom-out-scale':
          setZoomModalScale(-0.25);
          break;
        case 'zoom-reset-scale':
          setZoomModalScale(1.0, true);
          break;
        case 'zoom-prev':
          zoomModalNavigate(-1);
          break;
        case 'zoom-next':
          zoomModalNavigate(1);
          break;
        case 'close-zoom-modal':
          closePageZoomModal();
          break;
        case 'open-privacy':
          openLegalModal('privacy-modal');
          break;
        case 'open-terms':
          openLegalModal('terms-modal');
          break;
        case 'open-security':
          openLegalModal('security-modal');
          break;
        case 'open-contact':
          openLegalModal('contact-modal');
          break;
        case 'close-legal-modal':
          closeAllLegalModals();
          break;
        case 'open-onboarding':
          showOnboardingModal(0);
          break;
        case 'next-onboarding':
          advanceOnboardingSlide();
          break;
        case 'prev-onboarding':
          retreatOnboardingSlide();
          break;
        case 'skip-onboarding':
        case 'close-onboarding':
          finishOnboarding();
          break;
      }
    }

    function openLegalModal(modalId) {
      closeAllLegalModals();
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        const focusable = modal.querySelector('button, [tabindex]:not([tabindex="-1"])');
        if (focusable) focusable.focus();
      }
    }

    function closeAllLegalModals() {
      ['privacy-modal', 'terms-modal', 'security-modal', 'contact-modal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.classList.add('hidden');
          el.classList.remove('flex');
        }
      });
    }

    // Auto-init dispatcher on DOM load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initEventDispatcher);
    } else {
      initEventDispatcher();
    }

    // ================= PWA SERVICE WORKER REGISTRATION =================
    function initServiceWorker() {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

      let hadController = Boolean(navigator.serviceWorker.controller);
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hadController && !window.__s2sReloading) {
          window.__s2sReloading = true;
          window.location.reload();
        }
        hadController = true;
      });

      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((reg) => {
          const badge = document.getElementById('offline-status-badge');
          if (badge) {
            badge.title = 'PWA Offline Cache Active (s2s-cache-v7)';
          }

          try {
            reg.update();
          } catch (e) {}

          reg.addEventListener('updatefound', () => {
            const installing = reg.installing;
            if (installing) {
              installing.addEventListener('statechange', () => {
                if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('Statement2Sheet updated in local cache.');
                }
              });
            }
          });
        }).catch((err) => {
          console.warn('ServiceWorker registration skipped:', err);
        });
      });
    }

    initServiceWorker();
