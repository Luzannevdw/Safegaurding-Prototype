/* ==========================================================================
   Entities dashboard interactivity
   ========================================================================== */

const COLUMNS = [
  { key: "status", label: "Entity status", sticky: 1 },
  { key: "name", label: "Entity name", sticky: 2 },
  { key: "entityId", label: "Entity ID" },
  { key: "entityType", label: "Entity type" },
  { key: "market", label: "Market" },
  { key: "safeguardingRequirement", label: "Safeguarding requirement (£)", numeric: true },
  { key: "safeguardingMovement", label: "Safeguarding movement (£)", numeric: true },
  { key: "held", label: "Held (£)", numeric: true },
  { key: "released", label: "Released (£)", numeric: true },
  { key: "paymentsToSgAcct", label: "Payments to SG acct (£)", numeric: true },
  { key: "paymentsFromSgAcct", label: "Payments from SG acct (£)", numeric: true },
  { key: "heldReturns", label: "Held returns (£)", numeric: true },
  { key: "adjustments", label: "Adjustments (£)", numeric: true },
  { key: "heldExceptionTransactions", label: "Held exception transactions (£)", numeric: true },
  { key: "releasedExceptionTransactions", label: "Released exception transactions (£)", numeric: true },
  { key: "deferred", label: "Deferred (£)", numeric: true },
  { key: "schemeSettledNotAccrued", label: "Scheme settled, not accrued (£)", numeric: true },
  { key: "transientFundsPaidOut", label: "Transient funds paid out (£)", numeric: true },
  { key: "ageDays", label: "Age (days)" },
  { key: "reason", label: "Reason" },
];

const STATUS_DOT_CLASS = {
  Active: "status-dot--active",
  Closed: "status-dot--closed",
  "Pending Cancellation": "status-dot--pending-cancellation",
  "Cancelled - Awaiting Closure": "status-dot--cancelled",
};

const state = {
  search: "",
  excludeTransientFunds: false,
  hideZeroOrNegative: false,
  pageSize: 50,
  page: 1,
};

function getFilteredRows() {
  let rows = MOCK_ENTITIES.slice();

  if (state.search.trim()) {
    const term = state.search.trim().toLowerCase();
    rows = rows.filter(
      (row) =>
        row.name.toLowerCase().includes(term) ||
        row.entityId.toLowerCase().includes(term)
    );
  }

  if (state.excludeTransientFunds) {
    rows = rows.filter((row) => row.transientFundsPaidOut === 0);
  }

  if (state.hideZeroOrNegative) {
    rows = rows.filter((row) => row.safeguardingMovement > 0);
  }

  return rows;
}

function renderHeaderRow() {
  const headerRow = document.getElementById("table-header-row");
  headerRow.innerHTML = COLUMNS.map((col) => {
    const stickyClass = col.sticky ? ` col-sticky-${col.sticky}` : "";
    if (col.key === "reason") {
      // The real app nests the "Legend" trigger inside the Reason column header.
      return `<th class="${stickyClass.trim()}">
        <div class="th-with-action">
          <span>${col.label}</span>
          <button class="text-btn text-btn--small" type="button" id="btn-legend">Legend</button>
        </div>
      </th>`;
    }
    return `<th class="${stickyClass.trim()}">${col.label}</th>`;
  }).join("");
}

function renderTotalsRow(rows) {
  const totals = computeTotals(rows);
  const totalsRow = document.getElementById("totals-row");

  const cells = COLUMNS.map((col) => {
    if (col.key === "status") {
      return `<td class="col-sticky-1">Totals</td>`;
    }
    if (col.key === "name" || col.key === "entityId" || col.key === "entityType" || col.key === "market" || col.key === "ageDays" || col.key === "reason") {
      const stickyClass = col.sticky ? ` col-sticky-${col.sticky}` : "";
      return `<td class="${stickyClass.trim()}"></td>`;
    }
    if (col.numeric) {
      const value = totals[col.key];
      const negClass = value < 0 ? " is-negative" : "";
      return `<td class="num${negClass}">${formatNumber(value)}</td>`;
    }
    return `<td></td>`;
  }).join("");

  totalsRow.innerHTML = cells;
}

function renderDataRows(rows) {
  const tbody = document.getElementById("table-body");

  if (rows.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="${COLUMNS.length}">No entities match the current filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map((row) => {
      const cells = COLUMNS.map((col) => {
        if (col.key === "status") {
          const dotClass = STATUS_DOT_CLASS[row.status] || "status-dot--closed";
          return `<td class="col-sticky-1"><span class="status-dot-label"><span class="status-dot ${dotClass}"></span>${row.status}</span></td>`;
        }
        if (col.key === "name") {
          return `<td class="col-sticky-2">${row.name}</td>`;
        }
        if (col.key === "reason") {
          const tags = row.reasons
            .map((r) => `<span class="reason-tag">${r}</span>`)
            .join("");
          return `<td>${tags}</td>`;
        }
        if (col.numeric) {
          const value = row[col.key];
          const negClass = value < 0 ? " is-negative" : "";
          return `<td class="num${negClass}">${formatNumber(value)}</td>`;
        }
        return `<td>${row[col.key]}</td>`;
      }).join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
}

function renderMetrics(rows) {
  const totals = computeTotals(rows);

  const manualMovement = totals.adjustments; // proxy for "manual" movement
  const manualRequirement = totals.heldReturns + totals.heldExceptionTransactions; // proxy for manual requirement
  const totalMovement = totals.safeguardingMovement;
  const totalRequirement = totals.safeguardingRequirement;

  setMetric("metric-manual-movement", manualMovement);
  setMetric("metric-manual-requirement", manualRequirement);
  setMetric("metric-total-movement", totalMovement);
  setMetric("metric-total-requirement", totalRequirement);

  document.getElementById("entity-count").textContent = rows.length;
}

function setMetric(elementId, value) {
  const el = document.getElementById(elementId);
  el.textContent = formatCurrency(value);
  el.classList.toggle("is-negative", value < 0);
}

function renderPagination(totalRows) {
  const totalPages = Math.max(1, Math.ceil(totalRows / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;

  const start = totalRows === 0 ? 0 : (state.page - 1) * state.pageSize + 1;
  const end = Math.min(state.page * state.pageSize, totalRows);

  document.getElementById("pagination-info").textContent =
    totalRows === 0 ? "0 results" : `${start}–${end} of ${totalRows}`;

  document.getElementById("btn-first").disabled = state.page <= 1;
  document.getElementById("btn-prev").disabled = state.page <= 1;
  document.getElementById("btn-next").disabled = state.page >= totalPages;
  document.getElementById("btn-last").disabled = state.page >= totalPages;
}

function getPageRows(rows) {
  const start = (state.page - 1) * state.pageSize;
  return rows.slice(start, start + state.pageSize);
}

function renderAll() {
  const filtered = getFilteredRows();
  renderMetrics(filtered);
  renderTotalsRow(filtered);
  renderPagination(filtered.length);
  renderDataRows(getPageRows(filtered));
}

function setupSyncStatus() {
  document.getElementById("currency-sync-time").textContent = nowFormatted(12);
  document.getElementById("entity-sync-time").textContent = nowFormatted(3);
}

function setupUserInfo() {
  const name = sessionStorage.getItem("safeguarding_user") || "Demo User";
  document.getElementById("current-user").textContent = name;
}

function setupPeriodNav() {
  // Cosmetic-only period navigation for this design prototype.
  const periodDate = document.getElementById("period-date");
  const prevBtn = document.getElementById("btn-period-prev");
  const nextBtn = document.getElementById("btn-period-next");
  if (periodDate && prevBtn && nextBtn) {
    const step = (days) => {
      const current = periodDate.valueAsDate || new Date();
      current.setDate(current.getDate() + days);
      periodDate.valueAsDate = current;
    };
    prevBtn.addEventListener("click", () => step(-1));
    nextBtn.addEventListener("click", () => step(1));
  }
}

function setupEventHandlers() {
  document.getElementById("search-input").addEventListener("input", (e) => {
    state.search = e.target.value;
    state.page = 1;
    renderAll();
  });

  document.getElementById("chk-exclude-transient").addEventListener("change", (e) => {
    state.excludeTransientFunds = e.target.checked;
    state.page = 1;
    renderAll();
  });

  document.getElementById("chk-hide-zero-negative").addEventListener("change", (e) => {
    state.hideZeroOrNegative = e.target.checked;
    state.page = 1;
    renderAll();
  });

  document.getElementById("btn-reset").addEventListener("click", () => {
    state.search = "";
    state.excludeTransientFunds = false;
    state.hideZeroOrNegative = false;
    state.page = 1;

    document.getElementById("search-input").value = "";
    document.getElementById("chk-exclude-transient").checked = false;
    document.getElementById("chk-hide-zero-negative").checked = false;
    document.getElementById("filter-status").textContent = "All entity statuses";
    document.getElementById("filter-reason").textContent = "All reasons";

    renderAll();
  });

  document.getElementById("page-size-select").addEventListener("change", (e) => {
    state.pageSize = Number(e.target.value);
    state.page = 1;
    renderAll();
  });

  document.getElementById("btn-first").addEventListener("click", () => {
    state.page = 1;
    renderAll();
  });

  document.getElementById("btn-prev").addEventListener("click", () => {
    state.page = Math.max(1, state.page - 1);
    renderAll();
  });

  document.getElementById("btn-next").addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(getFilteredRows().length / state.pageSize));
    state.page = Math.min(totalPages, state.page + 1);
    renderAll();
  });

  document.getElementById("btn-last").addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(getFilteredRows().length / state.pageSize));
    state.page = totalPages;
    renderAll();
  });

  document.getElementById("btn-legend").addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("legend-popover").classList.toggle("is-visible");
  });

  document.addEventListener("click", (e) => {
    const popover = document.getElementById("legend-popover");
    if (!popover.contains(e.target) && e.target.id !== "btn-legend") {
      popover.classList.remove("is-visible");
    }
  });

  document.getElementById("btn-logout").addEventListener("click", () => {
    sessionStorage.removeItem("safeguarding_user");
    window.location.href = "index.html";
  });

  document.getElementById("split-btn-main").addEventListener("click", () => {
    alert("Export with transient funds — this would trigger a download in the live app.");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupSyncStatus();
  setupUserInfo();
  setupPeriodNav();
  renderHeaderRow();
  setupEventHandlers();
  renderAll();
});
