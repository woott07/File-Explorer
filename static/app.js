// DocuScan & Inspector Application Controller

const state = {
  profile: null,
  activeSheet: null,
  globalSearch: '',
  columnFilters: [],
  sortBy: null,
  sortAsc: true,
  page: 1,
  pageSize: 25,
  targetColumns: [],
  visibleColumns: [],
  currentRowIndex: null,
  tableRows: [],
  totalFiltered: 0,
  totalPages: 1
};

// --- DOM ELEMENTS ---
const els = {
  btnOpenUpload: document.getElementById('btn-open-upload'),
  btnEmptyUpload: document.getElementById('btn-empty-upload'),
  btnViewSchema: document.getElementById('btn-view-schema'),
  btnCloseDocument: document.getElementById('btn-close-document'),
  documentBar: document.getElementById('document-bar'),
  activeFilename: document.getElementById('active-filename'),
  activeFiletypeBadge: document.getElementById('active-filetype-badge'),
  sheetPills: document.getElementById('sheet-pills'),
  emptyState: document.getElementById('empty-state-container'),
  appView: document.getElementById('app-view-container'),
  
  // Stats
  statTotalRows: document.getElementById('stat-total-rows'),
  statTotalCols: document.getElementById('stat-total-cols'),
  statFilteredRows: document.getElementById('stat-filtered-rows'),
  statMissingCells: document.getElementById('stat-missing-cells'),
  statDuplicateRows: document.getElementById('stat-duplicate-rows'),
  statMemory: document.getElementById('stat-memory'),

  // Search & Query
  inputGlobalSearch: document.getElementById('input-global-search'),
  btnClearSearch: document.getElementById('btn-clear-search'),
  btnToggleValueFinder: document.getElementById('btn-toggle-value-finder'),
  valueLocatorPanel: document.getElementById('value-locator-panel'),
  locatorColumnSelect: document.getElementById('locator-column-select'),
  locatorValueInput: document.getElementById('locator-value-input'),
  locatorExactMatch: document.getElementById('locator-exact-match'),
  btnRunLocator: document.getElementById('btn-run-locator'),
  locatorResultsBanner: document.getElementById('locator-results-banner'),
  locatorMatchSummary: document.getElementById('locator-match-summary'),
  btnIsolateLocatorMatches: document.getElementById('btn-isolate-locator-matches'),

  // Filter Chips
  activeFiltersContainer: document.getElementById('active-filters-container'),
  filterChipsList: document.getElementById('filter-chips-list'),
  btnClearAllFilters: document.getElementById('btn-clear-all-filters'),

  // Columns & Export Menus
  btnColumnsMenu: document.getElementById('btn-columns-menu'),
  columnsDropdown: document.getElementById('columns-dropdown'),
  columnsCheckboxes: document.getElementById('columns-checkboxes'),
  btnSelectAllColumns: document.getElementById('btn-select-all-columns'),
  btnExportMenu: document.getElementById('btn-export-menu'),
  exportDropdown: document.getElementById('export-dropdown'),

  // Table
  tableHeadRow: document.getElementById('table-head-row'),
  tableBody: document.getElementById('table-body'),
  tableLoadingOverlay: document.getElementById('table-loading-overlay'),
  noResultsBanner: document.getElementById('no-results-banner'),
  btnNoResultsClear: document.getElementById('btn-no-results-clear'),

  // Pagination
  pageStartIdx: document.getElementById('page-start-idx'),
  pageEndIdx: document.getElementById('page-end-idx'),
  pageTotalFiltered: document.getElementById('page-total-filtered'),
  pageTotalUnfilteredTag: document.getElementById('page-total-unfiltered-tag'),
  selectPageSize: document.getElementById('select-page-size'),
  currentPageNum: document.getElementById('current-page-num'),
  totalPageNum: document.getElementById('total-page-num'),
  btnPageFirst: document.getElementById('btn-page-first'),
  btnPagePrev: document.getElementById('btn-page-prev'),
  btnPageNext: document.getElementById('btn-page-next'),
  btnPageLast: document.getElementById('btn-page-last'),
  inputJumpRow: document.getElementById('input-jump-row'),
  btnJumpRow: document.getElementById('btn-jump-row'),

  // Drawer
  rowDrawer: document.getElementById('row-drawer'),
  rowDrawerBackdrop: document.getElementById('row-drawer-backdrop'),
  drawerRowIndex: document.getElementById('drawer-row-index'),
  drawerFieldsList: document.getElementById('drawer-fields-list'),
  btnCloseDrawer: document.getElementById('btn-close-drawer'),
  btnDrawerPrev: document.getElementById('btn-drawer-prev'),
  btnDrawerNext: document.getElementById('btn-drawer-next'),
  btnCopyEntireRow: document.getElementById('btn-copy-entire-row'),

  // Upload Modal
  modalUploadBackdrop: document.getElementById('modal-upload-backdrop'),
  btnCloseUploadModal: document.getElementById('btn-close-upload-modal'),
  dropZone: document.getElementById('drop-zone'),
  fileInput: document.getElementById('file-input'),

  // Filter Modal
  modalFilterBackdrop: document.getElementById('modal-filter-backdrop'),
  btnOpenFilterModal: document.getElementById('btn-open-filter-modal'),
  btnCloseFilterModal: document.getElementById('btn-close-filter-modal'),
  btnCancelFilterModal: document.getElementById('btn-cancel-filter-modal'),
  btnApplyFilterModal: document.getElementById('btn-apply-filter-modal'),
  modalFilterColumn: document.getElementById('modal-filter-column'),
  modalFilterOperator: document.getElementById('modal-filter-operator'),
  modalFilterValue: document.getElementById('modal-filter-value'),

  // Schema Modal
  modalSchemaBackdrop: document.getElementById('modal-schema-backdrop'),
  btnCloseSchemaModal: document.getElementById('btn-close-schema-modal'),
  btnSchemaModalCloseFooter: document.getElementById('btn-schema-modal-close-footer'),
  schemaColumnsList: document.getElementById('schema-columns-list'),

  // Toast
  toastContainer: document.getElementById('toast-container')
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  checkExistingDocument();
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// --- API ACTIONS ---
async function checkExistingDocument() {
  try {
    const res = await fetch('/api/profile');
    const data = await res.json();
    if (data.has_document && data.profile) {
      applyDocumentProfile(data.profile);
    }
  } catch (err) {
    console.warn("Could not check active document session:", err);
  }
}

async function uploadFile(file) {
  showLoading(true);
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Upload failed");
    }
    const data = await res.json();
    applyDocumentProfile(data.profile);
    closeUploadModal();
    showToast(`Uploaded and scanned ${file.name} successfully!`, "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    showLoading(false);
  }
}

async function resetActiveDocument() {
  try {
    const res = await fetch('/api/reset', { method: 'POST' });
    if (!res.ok) throw new Error("Could not reset session");
    
    state.profile = null;
    state.tableRows = [];
    state.columnFilters = [];
    state.globalSearch = '';

    els.documentBar.classList.add('hidden');
    els.appView.classList.add('hidden');
    els.btnViewSchema.classList.add('hidden');
    els.btnCloseDocument.classList.add('hidden');
    els.emptyState.classList.remove('hidden');
    showToast("Document cleared. Ready for next upload.", "info");
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function switchSheet(sheetName) {
  showLoading(true);
  try {
    const res = await fetch('/api/switch-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheet_name: sheetName })
    });
    if (!res.ok) throw new Error("Could not switch sheet");
    const data = await res.json();
    applyDocumentProfile(data.profile);
    showToast(`Switched to sheet "${sheetName}"`, "info");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    showLoading(false);
  }
}

function applyDocumentProfile(profile) {
  state.profile = profile;
  state.activeSheet = profile.active_sheet;
  state.targetColumns = profile.columns.map(c => c.name);
  state.visibleColumns = [...state.targetColumns];
  state.page = 1;
  state.columnFilters = [];
  state.globalSearch = '';
  state.sortBy = null;
  state.sortAsc = true;

  // Render UI Components
  renderDocumentHeader();
  renderOverviewCards();
  renderColumnSelects();
  renderColumnsDropdown();
  renderActiveFilters();

  // Show App View, Hide Empty State
  els.emptyState.classList.add('hidden');
  els.appView.classList.remove('hidden');
  els.btnViewSchema.classList.remove('hidden');
  els.btnCloseDocument.classList.remove('hidden');

  // Trigger first page query
  fetchTableData();
}

async function fetchTableData() {
  if (!state.profile) return;
  showTableLoading(true);

  const payload = {
    global_search: state.globalSearch,
    column_filters: state.columnFilters,
    sort_by: state.sortBy,
    sort_asc: state.sortAsc,
    page: state.page,
    page_size: state.pageSize,
    target_columns: state.visibleColumns
  };

  try {
    const res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Query failed");
    }

    const data = await res.json();
    state.tableRows = data.rows;
    state.totalFiltered = data.total_filtered;
    state.totalPages = data.total_pages;
    state.page = data.page;

    renderTableRows();
    renderPagination();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    showTableLoading(false);
  }
}

// --- RENDERING ROUTINES ---
function renderDocumentHeader() {
  els.documentBar.classList.remove('hidden');
  els.activeFilename.textContent = state.profile.filename;
  els.activeFiletypeBadge.textContent = state.profile.file_type.toUpperCase();

  // Sheets
  els.sheetPills.innerHTML = '';
  if (state.profile.sheets && state.profile.sheets.length > 1) {
    state.profile.sheets.forEach(sheet => {
      const pill = document.createElement('button');
      const isActive = sheet === state.activeSheet;
      pill.className = `px-2 py-0.5 rounded font-mono transition text-xs ${
        isActive ? 'bg-blue-600 text-white font-medium' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
      }`;
      pill.textContent = sheet;
      pill.addEventListener('click', () => switchSheet(sheet));
      els.sheetPills.appendChild(pill);
    });
  } else {
    els.sheetPills.innerHTML = `<span class="text-slate-400 font-mono text-[11px]">${state.activeSheet || 'Default'}</span>`;
  }
}

function renderOverviewCards() {
  const o = state.profile.overview;
  els.statTotalRows.textContent = o.total_rows.toLocaleString();
  els.statTotalCols.textContent = o.total_columns.toLocaleString();
  els.statFilteredRows.textContent = o.total_rows.toLocaleString();
  els.statMissingCells.textContent = `${o.missing_cells.toLocaleString()} (${o.missing_pct}%)`;
  els.statDuplicateRows.textContent = o.duplicate_rows.toLocaleString();
  els.statMemory.textContent = `${o.memory_usage_kb.toLocaleString()} KB`;
}

function renderColumnSelects() {
  const columns = state.profile.columns;

  // Filter Modal Column Select
  els.modalFilterColumn.innerHTML = columns.map(c => `
    <option value="${c.name}">${c.name} (${c.type})</option>
  `).join('');

  // Value Locator Column Select
  els.locatorColumnSelect.innerHTML = `<option value="">Across All Columns</option>` + columns.map(c => `
    <option value="${c.name}">${c.name}</option>
  `).join('');
}

function renderColumnsDropdown() {
  els.columnsCheckboxes.innerHTML = '';
  state.targetColumns.forEach(col => {
    const isChecked = state.visibleColumns.includes(col);
    const label = document.createElement('label');
    label.className = 'flex items-center space-x-2 p-1 rounded hover:bg-slate-50 cursor-pointer text-slate-700 select-none';
    label.innerHTML = `
      <input type="checkbox" value="${col}" ${isChecked ? 'checked' : ''} class="col-checkbox rounded text-blue-600 focus:ring-0">
      <span class="truncate" title="${col}">${col}</span>
    `;
    label.querySelector('input').addEventListener('change', (e) => {
      if (e.target.checked) {
        if (!state.visibleColumns.includes(col)) state.visibleColumns.push(col);
      } else {
        if (state.visibleColumns.length <= 1) {
          e.target.checked = true;
          showToast("At least one column must remain visible.", "warning");
          return;
        }
        state.visibleColumns = state.visibleColumns.filter(c => c !== col);
      }
      renderTableHeader();
      fetchTableData();
    });
    els.columnsCheckboxes.appendChild(label);
  });
}

function renderTableHeader() {
  els.tableHeadRow.innerHTML = `
    <th class="py-3 px-3 w-14 text-center sticky-first-col bg-slate-100 border-r border-slate-200">#</th>
  `;

  state.visibleColumns.forEach(col => {
    const th = document.createElement('th');
    th.className = 'py-3 px-3.5 hover:bg-slate-100/80 cursor-pointer transition whitespace-nowrap border-r border-slate-200/60';
    
    const isSorted = state.sortBy === col;
    const sortIcon = isSorted ? (state.sortAsc ? '▲' : '▼') : '↕';
    const sortColor = isSorted ? 'text-blue-600 font-bold' : 'text-slate-300';

    th.innerHTML = `
      <div class="flex items-center justify-between space-x-2">
        <span class="truncate max-w-[200px]" title="${col}">${col}</span>
        <span class="${sortColor} text-[10px]">${sortIcon}</span>
      </div>
    `;

    th.addEventListener('click', () => {
      if (state.sortBy === col) {
        if (state.sortAsc) {
          state.sortAsc = false;
        } else {
          state.sortBy = null;
          state.sortAsc = true;
        }
      } else {
        state.sortBy = col;
        state.sortAsc = true;
      }
      renderTableHeader();
      fetchTableData();
    });

    els.tableHeadRow.appendChild(th);
  });
}

function renderTableRows() {
  renderTableHeader();
  els.tableBody.innerHTML = '';

  if (!state.tableRows || state.tableRows.length === 0) {
    els.noResultsBanner.classList.remove('hidden');
    return;
  }
  els.noResultsBanner.classList.add('hidden');

  state.tableRows.forEach(row => {
    const tr = document.createElement('tr');
    tr.className = 'table-row-hover cursor-pointer border-b border-slate-100 transition';

    // Click row to open Inspector Drawer
    tr.addEventListener('click', () => {
      openRowDrawer(row._row_index);
    });

    // Row index cell
    const indexTd = document.createElement('td');
    indexTd.className = 'py-2.5 px-3 text-center text-slate-400 font-medium sticky-first-col bg-white border-r border-slate-100 text-[11px]';
    indexTd.textContent = row._row_index;
    tr.appendChild(indexTd);

    // Columns cells
    state.visibleColumns.forEach(col => {
      const td = document.createElement('td');
      td.className = 'py-2.5 px-3.5 whitespace-nowrap border-r border-slate-100/50 max-w-[280px] truncate';
      
      const val = row[col];
      let displayHtml = '';

      if (val === null || val === undefined || val === '') {
        displayHtml = '<span class="text-slate-300 italic text-[11px]">—</span>';
      } else {
        const valStr = String(val);
        // Highlight search keyword if active
        let highlighted = escapeHtml(valStr);
        if (state.globalSearch && state.globalSearch.trim()) {
          const regex = new RegExp(`(${escapeRegExp(state.globalSearch.trim())})`, 'gi');
          highlighted = highlighted.replace(regex, '<mark class="search-highlight">$1</mark>');
        }

        // Special Badge styling for common categorical statuses
        const lowerVal = valStr.toLowerCase();
        if (['paid', 'success', 'active', 'true', 'yes', 'completed'].includes(lowerVal)) {
          displayHtml = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">${highlighted}</span>`;
        } else if (['unpaid', 'pending', 'failed', 'false', 'no', 'overdue'].includes(lowerVal)) {
          displayHtml = `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">${highlighted}</span>`;
        } else {
          displayHtml = `<span>${highlighted}</span>`;
        }
      }

      td.innerHTML = displayHtml;
      tr.appendChild(td);
    });

    els.tableBody.appendChild(tr);
  });
}

function renderPagination() {
  const total = state.totalFiltered;
  const start = total === 0 ? 0 : (state.page - 1) * state.pageSize + 1;
  const end = Math.min(state.page * state.pageSize, total);

  els.pageStartIdx.textContent = start.toLocaleString();
  els.pageEndIdx.textContent = end.toLocaleString();
  els.pageTotalFiltered.textContent = total.toLocaleString();
  els.statFilteredRows.textContent = total.toLocaleString();

  if (state.profile && state.profile.overview.total_rows !== total) {
    els.pageTotalUnfilteredTag.textContent = `(filtered from ${state.profile.overview.total_rows.toLocaleString()} total rows)`;
  } else {
    els.pageTotalUnfilteredTag.textContent = '';
  }

  els.currentPageNum.textContent = state.page;
  els.totalPageNum.textContent = state.totalPages;

  els.btnPageFirst.disabled = state.page <= 1;
  els.btnPagePrev.disabled = state.page <= 1;
  els.btnPageNext.disabled = state.page >= state.totalPages;
  els.btnPageLast.disabled = state.page >= state.totalPages;
}

function renderActiveFilters() {
  els.filterChipsList.innerHTML = '';
  if (state.columnFilters.length === 0) {
    els.activeFiltersContainer.classList.add('hidden');
    return;
  }

  els.activeFiltersContainer.classList.remove('hidden');
  state.columnFilters.forEach((f, idx) => {
    const chip = document.createElement('div');
    chip.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-medium';
    chip.innerHTML = `
      <span><strong>${f.column}</strong> ${f.operator} <em>"${f.value}"</em></span>
      <button class="hover:text-blue-950 font-bold ml-1 text-slate-400 hover:text-slate-700">✕</button>
    `;
    chip.querySelector('button').addEventListener('click', () => {
      state.columnFilters.splice(idx, 1);
      renderActiveFilters();
      state.page = 1;
      fetchTableData();
    });
    els.filterChipsList.appendChild(chip);
  });
}

// --- VALUE LOCATOR ---
async function runValueLocator() {
  const targetVal = els.locatorValueInput.value.trim();
  if (!targetVal) {
    showToast("Please enter a value to locate.", "warning");
    return;
  }

  const col = els.locatorColumnSelect.value || null;
  const exact = els.locatorExactMatch.checked;

  try {
    const res = await fetch('/api/find-value', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_value: targetVal,
        column: col,
        exact: exact
      })
    });
    if (!res.ok) throw new Error("Search failed");
    const data = await res.json();
    
    els.locatorResultsBanner.classList.remove('hidden');
    els.locatorMatchSummary.textContent = `Found ${data.total_matches} cell match(es) for "${targetVal}" in ${col || 'all columns'}.`;

    if (data.total_matches > 0) {
      els.btnIsolateLocatorMatches.onclick = () => {
        // Add as a column filter
        state.columnFilters = [{
          column: col || state.targetColumns[0],
          operator: exact ? 'exact' : 'contains',
          value: targetVal
        }];
        renderActiveFilters();
        state.page = 1;
        fetchTableData();
      };
    }
  } catch (err) {
    showToast(err.message, "error");
  }
}

// --- ROW INSPECTOR DRAWER ---
async function openRowDrawer(rowIndex) {
  state.currentRowIndex = rowIndex;
  els.drawerRowIndex.textContent = rowIndex;
  els.drawerFieldsList.innerHTML = `<div class="p-6 text-center text-slate-400"><i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto mb-2"></i>Loading details...</div>`;
  refreshIcons();

  els.rowDrawerBackdrop.classList.remove('hidden');
  els.rowDrawer.classList.remove('translate-x-full');

  try {
    const res = await fetch(`/api/row/${rowIndex}`);
    if (!res.ok) throw new Error("Could not fetch row details");
    const data = await res.json();

    renderDrawerDetails(data.data);
  } catch (err) {
    showToast(err.message, "error");
    closeRowDrawer();
  }
}

function renderDrawerDetails(data) {
  els.drawerFieldsList.innerHTML = '';
  Object.entries(data).forEach(([key, val]) => {
    const card = document.createElement('div');
    card.className = 'p-3 bg-slate-50 rounded-lg border border-slate-200/80 hover:border-blue-300 transition group';
    
    const displayVal = val === null || val === undefined ? '<span class="text-slate-300 italic font-normal">null</span>' : escapeHtml(String(val));
    
    card.innerHTML = `
      <div class="flex items-center justify-between text-[11px] text-slate-500 font-sans mb-1">
        <span class="font-semibold text-slate-700">${key}</span>
        <button class="btn-copy-field opacity-0 group-hover:opacity-100 text-blue-600 hover:underline flex items-center gap-1 transition">
          <i data-lucide="copy" class="w-3 h-3"></i>
          <span>Copy</span>
        </button>
      </div>
      <div class="text-slate-900 font-mono text-xs break-all select-all font-medium">${displayVal}</div>
    `;

    card.querySelector('.btn-copy-field').addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(String(val || ''));
      showToast(`Copied "${key}" to clipboard!`, "info");
    });

    els.drawerFieldsList.appendChild(card);
  });
  refreshIcons();
}

function closeRowDrawer() {
  els.rowDrawer.classList.add('translate-x-full');
  els.rowDrawerBackdrop.classList.add('hidden');
  state.currentRowIndex = null;
}

// --- SCHEMA & ANALYTICS MODAL ---
function openSchemaModal() {
  if (!state.profile) return;
  els.schemaColumnsList.innerHTML = '';

  state.profile.columns.forEach(col => {
    const card = document.createElement('div');
    card.className = 'p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2';

    // Type badge color
    const typeColors = {
      numeric: 'bg-emerald-100 text-emerald-800',
      text: 'bg-blue-100 text-blue-800',
      category: 'bg-purple-100 text-purple-800',
      datetime: 'bg-amber-100 text-amber-800',
      boolean: 'bg-slate-200 text-slate-800'
    };
    const badgeColor = typeColors[col.type] || 'bg-slate-100 text-slate-700';

    let statsHtml = `
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div class="flex items-center space-x-2">
          <span class="font-semibold text-slate-900 text-sm font-sans">${col.name}</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase ${badgeColor}">${col.type}</span>
        </div>
        <div class="text-slate-500 text-[11px] space-x-3">
          <span>Distinct: <strong class="text-slate-800">${col.unique_count.toLocaleString()}</strong></span>
          <span>Missing: <strong class="${col.null_count > 0 ? 'text-amber-600' : 'text-slate-800'}">${col.null_count} (${col.null_pct}%)</strong></span>
        </div>
      </div>
    `;

    // Numeric min/max/mean stats
    if (col.type === 'numeric' && col.min !== undefined && col.min !== null) {
      statsHtml += `
        <div class="grid grid-cols-4 gap-2 pt-1 text-[11px] text-slate-600">
          <div>Min: <strong class="text-slate-900">${col.min}</strong></div>
          <div>Max: <strong class="text-slate-900">${col.max}</strong></div>
          <div>Mean: <strong class="text-slate-900">${col.mean}</strong></div>
          <div>Median: <strong class="text-slate-900">${col.median}</strong></div>
        </div>
      `;
    }

    // Categorical distribution bars
    if (col.distribution && col.distribution.length > 0) {
      const maxCount = Math.max(...col.distribution.map(d => d.count), 1);
      statsHtml += `
        <div class="space-y-1 pt-1">
          <span class="text-[10px] text-slate-400 font-semibold uppercase">Top Frequencies</span>
          ${col.distribution.slice(0, 5).map(d => {
            const pct = Math.round((d.count / maxCount) * 100);
            return `
              <div class="space-y-0.5">
                <div class="flex justify-between text-[11px]">
                  <span class="font-mono truncate max-w-[200px] text-slate-800">${d.value || '(empty)'}</span>
                  <span class="text-slate-500">${d.count.toLocaleString()}</span>
                </div>
                <div class="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div class="bg-blue-600 h-1.5 rounded-full" style="width: ${pct}%"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    card.innerHTML = statsHtml;
    els.schemaColumnsList.appendChild(card);
  });

  els.modalSchemaBackdrop.classList.remove('hidden');
}

function closeSchemaModal() {
  els.modalSchemaBackdrop.classList.add('hidden');
}

// --- EXPORT DATA ---
async function exportFilteredData(format) {
  if (!state.profile) return;
  showToast(`Preparing ${format.toUpperCase()} export...`, "info");

  try {
    const payload = {
      export_format: format,
      global_search: state.globalSearch,
      column_filters: state.columnFilters,
      sort_by: state.sortBy,
      sort_asc: state.sortAsc
    };

    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ext = format === 'excel' ? 'xlsx' : format;
    a.download = `docscan_export_${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    showToast(`Downloaded ${a.download}`, "success");
  } catch (err) {
    showToast(err.message, "error");
  }
}

// --- UTILITY & MODAL HELPERS ---
function openUploadModal() {
  els.modalUploadBackdrop.classList.remove('hidden');
}
function closeUploadModal() {
  els.modalUploadBackdrop.classList.add('hidden');
}
function openFilterModal() {
  els.modalFilterBackdrop.classList.remove('hidden');
}
function closeFilterModal() {
  els.modalFilterBackdrop.classList.add('hidden');
  els.modalFilterValue.value = '';
}

function showLoading(show) {
  // Whole-page loading indicator hook
}
function showTableLoading(show) {
  if (show) els.tableLoadingOverlay.classList.remove('hidden');
  else els.tableLoadingOverlay.classList.add('hidden');
}

function showToast(msg, type = "info") {
  const toast = document.createElement('div');
  const bgColors = {
    success: 'bg-emerald-800 text-white border-emerald-700',
    error: 'bg-rose-800 text-white border-rose-700',
    warning: 'bg-amber-800 text-white border-amber-700',
    info: 'bg-[#1E3A5F] text-white border-blue-900'
  };
  toast.className = `px-4 py-2.5 rounded-lg text-xs font-medium border shadow-lg flex items-center space-x-2 pointer-events-auto transition-all transform duration-200 ${bgColors[type] || bgColors.info}`;
  toast.innerHTML = `<span>${msg}</span>`;
  els.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
  // Upload Modal Triggers
  els.btnOpenUpload.addEventListener('click', openUploadModal);
  els.btnEmptyUpload.addEventListener('click', openUploadModal);
  els.btnCloseUploadModal.addEventListener('click', closeUploadModal);

  // Clear / Close Document
  els.btnCloseDocument.addEventListener('click', resetActiveDocument);

  // Drag & Drop
  els.dropZone.addEventListener('click', () => els.fileInput.click());
  els.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) uploadFile(e.target.files[0]);
  });
  els.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    els.dropZone.classList.add('border-blue-500', 'bg-blue-50/50');
  });
  els.dropZone.addEventListener('dragleave', () => {
    els.dropZone.classList.remove('border-blue-500', 'bg-blue-50/50');
  });
  els.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    els.dropZone.classList.remove('border-blue-500', 'bg-blue-50/50');
    if (e.dataTransfer.files.length > 0) uploadFile(e.dataTransfer.files[0]);
  });

  // Schema Modal
  els.btnViewSchema.addEventListener('click', openSchemaModal);
  els.btnCloseSchemaModal.addEventListener('click', closeSchemaModal);
  els.btnSchemaModalCloseFooter.addEventListener('click', closeSchemaModal);

  // Global Search Debounce
  let searchDebounceTimer = null;
  els.inputGlobalSearch.addEventListener('input', (e) => {
    const val = e.target.value;
    if (val) els.btnClearSearch.classList.remove('hidden');
    else els.btnClearSearch.classList.add('hidden');

    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      state.globalSearch = val;
      state.page = 1;
      fetchTableData();
    }, 280);
  });
  els.btnClearSearch.addEventListener('click', () => {
    els.inputGlobalSearch.value = '';
    els.btnClearSearch.classList.add('hidden');
    state.globalSearch = '';
    state.page = 1;
    fetchTableData();
  });

  // Value Locator Toggle
  els.btnToggleValueFinder.addEventListener('click', () => {
    els.valueLocatorPanel.classList.toggle('hidden');
  });
  els.btnRunLocator.addEventListener('click', runValueLocator);
  els.locatorValueInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runValueLocator();
  });

  // Filter Modal
  els.btnOpenFilterModal.addEventListener('click', openFilterModal);
  els.btnCloseFilterModal.addEventListener('click', closeFilterModal);
  els.btnCancelFilterModal.addEventListener('click', closeFilterModal);
  els.btnApplyFilterModal.addEventListener('click', () => {
    const col = els.modalFilterColumn.value;
    const op = els.modalFilterOperator.value;
    const val = els.modalFilterValue.value.trim();

    if (!['is_null', 'not_null'].includes(op) && !val) {
      showToast("Please enter a filter value", "warning");
      return;
    }

    state.columnFilters.push({ column: col, operator: op, value: val });
    renderActiveFilters();
    closeFilterModal();
    state.page = 1;
    fetchTableData();
  });
  els.btnClearAllFilters.addEventListener('click', () => {
    state.columnFilters = [];
    renderActiveFilters();
    state.page = 1;
    fetchTableData();
  });
  els.btnNoResultsClear.addEventListener('click', () => {
    state.globalSearch = '';
    els.inputGlobalSearch.value = '';
    els.btnClearSearch.classList.add('hidden');
    state.columnFilters = [];
    renderActiveFilters();
    state.page = 1;
    fetchTableData();
  });

  // Columns Menu Dropdown Toggle
  els.btnColumnsMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    els.columnsDropdown.classList.toggle('hidden');
    els.exportDropdown.classList.add('hidden');
  });
  els.btnSelectAllColumns.addEventListener('click', () => {
    state.visibleColumns = [...state.targetColumns];
    renderColumnsDropdown();
    renderTableHeader();
    fetchTableData();
  });

  // Export Menu Dropdown Toggle
  els.btnExportMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    els.exportDropdown.classList.toggle('hidden');
    els.columnsDropdown.classList.add('hidden');
  });
  document.querySelectorAll('.btn-export-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const format = btn.getAttribute('data-format');
      els.exportDropdown.classList.add('hidden');
      exportFilteredData(format);
    });
  });

  // Dismiss dropdowns on outside click
  document.addEventListener('click', () => {
    els.columnsDropdown.classList.add('hidden');
    els.exportDropdown.classList.add('hidden');
  });

  // Pagination Handlers
  els.selectPageSize.addEventListener('change', (e) => {
    state.pageSize = parseInt(e.target.value, 10);
    state.page = 1;
    fetchTableData();
  });
  els.btnPageFirst.addEventListener('click', () => { state.page = 1; fetchTableData(); });
  els.btnPagePrev.addEventListener('click', () => { if (state.page > 1) { state.page--; fetchTableData(); } });
  els.btnPageNext.addEventListener('click', () => { if (state.page < state.totalPages) { state.page++; fetchTableData(); } });
  els.btnPageLast.addEventListener('click', () => { state.page = state.totalPages; fetchTableData(); });

  // Jump to Row
  els.btnJumpRow.addEventListener('click', () => {
    const rowNum = parseInt(els.inputJumpRow.value, 10);
    if (!isNaN(rowNum) && rowNum >= 0 && rowNum < state.profile.overview.total_rows) {
      openRowDrawer(rowNum);
    } else {
      showToast(`Invalid row number. Range is 0 to ${state.profile.overview.total_rows - 1}`, "warning");
    }
  });

  // Drawer Handlers
  els.btnCloseDrawer.addEventListener('click', closeRowDrawer);
  els.rowDrawerBackdrop.addEventListener('click', closeRowDrawer);
  els.btnDrawerPrev.addEventListener('click', () => {
    if (state.currentRowIndex > 0) openRowDrawer(state.currentRowIndex - 1);
  });
  els.btnDrawerNext.addEventListener('click', () => {
    if (state.currentRowIndex < state.profile.overview.total_rows - 1) {
      openRowDrawer(state.currentRowIndex + 1);
    }
  });
  els.btnCopyEntireRow.addEventListener('click', async () => {
    if (state.currentRowIndex !== null) {
      const res = await fetch(`/api/row/${state.currentRowIndex}`);
      const data = await res.json();
      navigator.clipboard.writeText(JSON.stringify(data.data, null, 2));
      showToast("Copied full record JSON to clipboard!", "success");
    }
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeRowDrawer();
      closeFilterModal();
      closeUploadModal();
      closeSchemaModal();
    }
  });
}
