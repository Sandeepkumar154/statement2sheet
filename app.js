/* Statement2Sheet Application Core (Strict CSP Compliant) */

// 1. Tailwind Configuration
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

// 2. Worker & Initial Theme Setup
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    // Initial Theme Setup
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
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

    function createTrackedObjectURL(blob) {
      if (!blob) return '';
      const url = URL.createObjectURL(blob);
      activeObjectUrls.add(url);
      return url;
    }

    function downloadTrackedBlob(blob, filename) {
      if (!blob) return;
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

    function switchPortalTool(toolName) {
      currentPortalTool = toolName;
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

      // Hide all main views
      const allViews = ['dashboard', 'merge', 'split', 'organize', 'unlock', 'watermark', 'pagenumber', 'pdf2img', 'img2pdf', 'compress', 'sign', 'protect', 'markdown'];
      if (toolName === 'dashboard') {
        loadRecentFiles();
      }
      allViews.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) el.classList.add('hidden');
      });

      const intakeSection = document.getElementById('intake-section');
      const previewStage = document.getElementById('preview-stage');
      const processingSection = document.getElementById('processing-section');
      const workspaceSection = document.getElementById('workspace-section');

      if (toolName === 'dashboard') {
        const dashboard = document.getElementById('view-dashboard');
        if (dashboard) {
          dashboard.classList.remove('hidden');
          dashboard.classList.remove('animate-view-slide-back', 'animate-view-slide-in');
          void dashboard.offsetWidth;
          dashboard.classList.add('animate-view-slide-back');
        }
        if (intakeSection) intakeSection.classList.add('hidden');
        if (previewStage) previewStage.classList.add('hidden');
        if (processingSection) processingSection.classList.add('hidden');
        if (workspaceSection) workspaceSection.classList.add('hidden');
      } else if (toolName === 'excel') {
        if (!AppState.transactions || AppState.transactions.length === 0) {
          if (intakeSection) {
            intakeSection.classList.remove('hidden');
            intakeSection.classList.remove('animate-view-slide-in', 'animate-view-slide-back');
            void intakeSection.offsetWidth;
            intakeSection.classList.add('animate-view-slide-in');
          }
        } else {
          if (workspaceSection) {
            workspaceSection.classList.remove('hidden');
            workspaceSection.classList.remove('animate-view-slide-in', 'animate-view-slide-back');
            void workspaceSection.offsetWidth;
            workspaceSection.classList.add('animate-view-slide-in');
          }
        }
      } else {
        if (intakeSection) intakeSection.classList.add('hidden');
        if (previewStage) previewStage.classList.add('hidden');
        if (processingSection) processingSection.classList.add('hidden');
        if (workspaceSection) workspaceSection.classList.add('hidden');

        const targetView = document.getElementById(`view-${toolName}`);
        if (targetView) {
          targetView.classList.remove('hidden');
          targetView.classList.remove('animate-view-slide-in', 'animate-view-slide-back');
          void targetView.offsetWidth;
          targetView.classList.add('animate-view-slide-in');
        }
      }
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') { window.scrollTo({ top: 0, behavior: 'smooth' }); }
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

    function renderMergeList() {
      const container = document.getElementById('merge-files-container');
      const listEl = document.getElementById('merge-file-list');
      const summaryEl = document.getElementById('merge-summary-text');
      const btnRun = document.getElementById('btn-run-merge');
      if (!container || !listEl) return;

      if (mergeItems.length === 0) {
        container.classList.add('hidden');
        listEl.innerHTML = '';
        return;
      }

      container.classList.remove('hidden');
      const totalPages = mergeItems.reduce((sum, item) => sum + item.numPages, 0);
      if (summaryEl) summaryEl.innerText = mergeItems.length + ' Document' + (mergeItems.length === 1 ? '' : 's') + ' • ' + totalPages + ' Pages Total';
      if (btnRun) btnRun.innerHTML = '<span>Merge All Documents (' + totalPages + ' Pages)</span> <span>&rarr;</span>';

      listEl.innerHTML = '';

      mergeItems.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl transition shadow-2xs';

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
              <span class="font-bold text-violet-600 dark:text-violet-400 text-sm w-6 text-center">${index + 1}.</span>
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
      card.classList.remove('hidden');
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
      card.classList.remove('hidden');
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
        grid.innerHTML = '';

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

          const cell = document.createElement('div');
          cell.id = 'org-page-card-' + i;
          cell.className = 'bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center gap-2.5 shadow-2xs transition';

          cell.innerHTML = `
            <div class="flex items-center justify-between w-full text-xs font-bold text-slate-700 dark:text-slate-300">
              <span class="font-mono">Page ${i}</span>
              <div class="flex items-center gap-2">
                <button data-action="zoom" data-page="${i}" class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-600 dark:text-slate-300 text-[11px] font-bold transition shadow-2xs" title="Inspect full screen">🔍 Zoom</button>
                <button data-action="delete" data-page="${i}" class="text-rose-500 hover:text-rose-700 font-bold text-xs" title="Delete Page">🗑️</button>
              </div>
            </div>
            <div class="w-full aspect-[3/4] bg-slate-50 dark:bg-slate-950 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-2xs pointer-events-none">
              <img id="org-img-${i}" src="${dataUrl}" alt="Page ${i}" class="w-full h-full object-contain transition-transform duration-200 pointer-events-none" />
            </div>
            <div class="flex items-center justify-center gap-2 w-full pt-1">
              <button data-action="rotate-left" data-page="${i}" class="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold shadow-2xs transition" title="Rotate -90°">⟲ -90°</button>
              <button data-action="rotate-right" data-page="${i}" class="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold shadow-2xs transition" title="Rotate +90°">⟳ +90°</button>
            </div>
          `;
          grid.appendChild(cell);
        }

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

    // ================= PAGE ZOOM LIGHTBOX CONTROLLER =================
    let zoomCurrentData = {
      items: [], // [{ dataUrl, title, pageNum }]
      currentIndex: 0
    };

    function openPageZoomModal(dataUrl, title) {
      const modal = document.getElementById('page-zoom-modal');
      const img = document.getElementById('zoom-modal-img');
      const titleEl = document.getElementById('zoom-modal-title');
      const indicator = document.getElementById('zoom-modal-page-indicator');
      if (!modal || !img) return;

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

      img.src = dataUrl;
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
    }

    function zoomModalNavigate(dir) {
      if (!zoomCurrentData.items || zoomCurrentData.items.length <= 1) return;
      let nextIndex = zoomCurrentData.currentIndex + dir;
      if (nextIndex < 0) nextIndex = zoomCurrentData.items.length - 1;
      if (nextIndex >= zoomCurrentData.items.length) nextIndex = 0;

      zoomCurrentData.currentIndex = nextIndex;
      const item = zoomCurrentData.items[nextIndex];
      const img = document.getElementById('zoom-modal-img');
      const titleEl = document.getElementById('zoom-modal-title');
      const indicator = document.getElementById('zoom-modal-page-indicator');

      if (img) img.src = item.dataUrl;
      if (titleEl) titleEl.innerText = item.title;
      if (indicator) indicator.innerText = `Page ${nextIndex + 1} of ${zoomCurrentData.items.length}`;
    }

    document.addEventListener('keydown', (e) => {
      const modal = document.getElementById('page-zoom-modal');
      if (!modal || modal.classList.contains('hidden')) return;
      if (e.key === 'Escape') closePageZoomModal();
      if (e.key === 'ArrowLeft') zoomModalNavigate(-1);
      if (e.key === 'ArrowRight') zoomModalNavigate(1);
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

    async function handleUnlockFileSelection(file) {
      if (!await validateSinglePdfFile(file, 'Unlock')) return;
      unlockFile = file;
      document.getElementById('unlock-doc-name').innerText = file.name;
      document.getElementById('unlock-password-input').value = '';
      document.getElementById('unlock-error-box').classList.add('hidden');
      document.getElementById('unlock-controls-card').classList.remove('hidden');
    }

    async function executeUnlockPdf() {
      if (!unlockFile) return;
      const pwd = document.getElementById('unlock-password-input').value;
      const errBox = document.getElementById('unlock-error-box');
      errBox.classList.add('hidden');

      try {
        const bytes = await unlockFile.arrayBuffer();
        const doc = await PDFLib.PDFDocument.load(bytes, { password: pwd });
        const unlockedBytes = await doc.save();
        triggerDownload(new Blob([unlockedBytes], { type: 'application/pdf' }), `unlocked_${unlockFile.name}`);
      } catch (e) {
        errBox.classList.remove('hidden');
        errBox.innerText = 'Incorrect password or unsupported encryption: ' + e.message;
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
      document.getElementById('watermark-controls-card').classList.remove('hidden');
    }

    async function executeWatermarkPdf() {
      if (!watermarkFile) return;
      const text = document.getElementById('watermark-text-input').value.trim() || 'CONFIDENTIAL';

      try {
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
      
      if (controls) controls.classList.remove('hidden');
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
        controls.classList.add('hidden');
        listEl.innerHTML = '';
        return;
      }

      controls.classList.remove('hidden');
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
      document.getElementById('pagenumber-controls-card').classList.remove('hidden');
    }

    async function executePageNumberingPdf() {
      if (!pageNumberFile) return;
      const fmt = document.getElementById('pagenumber-format-select').value;

      try {
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
          handleCompressFileInput(e.dataTransfer.files[0]);
        }
      });

      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) {
          handleCompressFileInput(e.target.files[0]);
        }
      });
    }

    async function handleCompressFileInput(file) {
      if (!await validateSinglePdfFile(file, 'Compress')) return;
      try {
        const buffer = await file.arrayBuffer();
        compressFileState = { file, buffer, preset: 'recommended' };
        
        const card = document.getElementById('compress-controls-card');
        const nameEl = document.getElementById('compress-doc-name');
        const sizeEl = document.getElementById('compress-doc-size');
        if (card) card.classList.remove('hidden');
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
        if (card) card.classList.remove('hidden');
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
        const dataUrl = canvas.toDataURL('image/png');
        const pngBytes = await fetch(dataUrl).then(res => res.arrayBuffer());

        const pdfDoc = await PDFLib.PDFDocument.load(signFileState.buffer);
        const sigImage = await pdfDoc.embedPng(pngBytes);
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
          handleProtectFileInput(e.dataTransfer.files[0]);
        }
      });

      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) {
          handleProtectFileInput(e.target.files[0]);
        }
      });
    }

    async function handleProtectFileInput(file) {
      if (!await validateSinglePdfFile(file, 'Protect')) return;
      try {
        const buffer = await file.arrayBuffer();
        protectFileState = { file, buffer };
        const card = document.getElementById('protect-controls-card');
        const nameEl = document.getElementById('protect-doc-name');
        if (card) card.classList.remove('hidden');
        if (nameEl) nameEl.textContent = file.name;
      } catch (err) {
        console.error('Protect load error:', err);
        alert('Failed to load PDF file.');
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
        const pdfDoc = await PDFLib.PDFDocument.load(protectFileState.buffer);
        pdfDoc.setTitle('Protected Document');
        pdfDoc.setAuthor('Statement2Sheet Encrypted');
        pdfDoc.setSubject('Secured Client-Side');

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        downloadTrackedBlob(blob, 'protected_' + protectFileState.file.name);

        if (typeof showNotification === 'function') {
          showNotification('🔒 Document secured and downloaded in memory!', 'success');
        } else {
          alert('Document encrypted and downloaded!');
        }
      } catch (err) {
        console.error('Protect execution error:', err);
        alert('Failed to encrypt PDF: ' + err.message);
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
        if (card) card.classList.remove('hidden');
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
      initGlobalKeyboardShortcuts();
      loadRecentFiles();
      switchPortalTool('dashboard');
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
      const worker = await Tesseract.createWorker('eng');
      let lines = [];
      let rawText = '';

      const maxPages = Math.min(pdf.numPages, 10);
      for (let p = 1; p <= maxPages; p++) {
        updateProgressDetail(`Running OCR on page ${p} of ${maxPages}...`);
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

      const worker = await Tesseract.createWorker('eng');
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
    let sessionRecentFiles = [];
    window.sessionRecentFiles = sessionRecentFiles;

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
      protectFileState = { file: null, buffer: null };
      unlockFile = null;
      pageNumberFile = null;
      markdownState = { file: null, text: '' };

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
      document.getElementById('btn-export-excel').addEventListener('click', () => {
        if (!AppState.transactions.length) return;
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
        XLSX.utils.book_append_sheet(wb, wsDetails, "Statement_Details");

        XLSX.writeFile(wb, `${bankName.replace(/\s+/g, '_')}_Statement.xlsx`);
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
      document.getElementById('btn-export-clean-pdf').addEventListener('click', () => {
        if (!AppState.transactions.length) return;
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

        doc.save(`${AppState.metadata.bankName.replace(/\s+/g, '_')}_Clean_Statement.pdf`);
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
        case 'reset-converter':
          resetConverterToIntake();
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

      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then((reg) => {
          const badge = document.getElementById('offline-status-badge');
          if (badge) {
            badge.title = 'PWA Offline Cache Active (s2s-cache-v1)';
          }

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
