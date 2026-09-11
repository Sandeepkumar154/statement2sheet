# Universal Bank Statement Converter — Enterprise Core

A universal, client-side financial application designed to ingest bank statements from **any bank, country, layout, or currency**, normalize the data into standardized financial structures, mathematically audit and reconcile balances, and export to **3-sheet Excel (.xlsx)**, **CSV**, and **clean PDFs**.

---

## 🌟 Core Universal Features

### 1. Multi-Format Input Layer
* **PDFs:** Digital PDFs, multi-page statements, continuous multi-page transaction runs.
* **Scanned & Photographed Documents:** JPG, JPEG, PNG, multi-image camera uploads.
* **Canvas Preprocessing:** In-browser contrast stretching, binarization, and deskewing for faded ink or dark smartphone shadows.

### 2. Semantic Column & Layout Normalizer
* **Position-Independent:** Maps columns by semantic meaning (`Withdrawal`, `Debit`, `DR`, `Money Out` vs. `Deposit`, `Credit`, `CR`, `Money In`).
* **Single Amount Column Support:** Distinguishes debit vs. credit using trailing flags (`CR`/`DR`), negative signs, or transaction type heuristics.
* **Multi-Check Grid Splitter:** Automatically splits horizontal multi-column check registers into individual records.
* **Data Integrity (Golden Rule):** Strictly preserves original bank descriptions (e.g. `PREAUTHORIZED CREDIT`) while standardizing transaction type and inferred category.

### 3. Mathematical Balance Reconciliation Engine
* **Row-by-Row Auditing:** Validates that $\text{Previous Balance} + \text{Credit} - \text{Debit} = \text{Current Balance}$.
* **Statement-Level Scorecard:** Reconciles $\text{Opening Balance} + \sum \text{Credits} - \sum \text{Debits} = \text{Closing Balance}$.
* **Discrepancy Highlighting:** Flags balance variances with `⚠️` so users never export inaccurate financial data.

### 4. Enterprise 3-Sheet Excel Export (.xlsx)
1. **Sheet 1: `Transactions`** — Standardized 10-column financial ledger with frozen headers, formatted currency values, and audit status.
2. **Sheet 2: `Statement Details`** — Bank Institution, Account Holder, Masked Account Number (`******7890`), Period Dates, and Balances.
3. **Sheet 3: `Summary`** — Financial scorecard with total debits, total credits, net cashflow, and reconciliation variance.

### 5. 100% Client-Side Privacy Guarantee
* Zero document bytes, account numbers, or balances leave the browser.
* All parsing, OCR, and reconciliation execute in browser memory.

---

## 🚀 How to Run Locally

1. Open File Explorer to:
   `C:\Users\sande\.gemini\antigravity\scratch\statement2sheet`
2. Double-click **`index.html`** in any browser (Chrome, Edge, Firefox).
3. Drag and drop any statement (PDF or image).

---

## 🌐 1-Click Free Deployment

1. Go to **[Vercel.com](https://vercel.com)** or **[Cloudflare Pages](https://pages.cloudflare.com)**.
2. Upload the `statement2sheet` directory.
3. Your universal tool is live instantly at `$0` hosting cost.
