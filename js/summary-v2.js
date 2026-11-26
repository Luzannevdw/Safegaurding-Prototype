/* ==========================================================================
   Summary V2 — internal reconciliation page controller.

   Presentation only. Every figure comes from `calculateReconciliation()` in
   js/reconciliation.js.
   ========================================================================== */

const OUTCOME_META = {
  Matched: { icon: "check-circle", variant: "matched" },
  Surplus: { icon: "trend-up", variant: "surplus" },
  Shortfall: { icon: "trend-down", variant: "shortfall" },
  Incomplete: { icon: "warning-circle", variant: "incomplete" },
};

let activeScenarioId = RECONCILIATION_SCENARIOS[0].id;

function getActiveScenario() {
  return (
    RECONCILIATION_SCENARIOS.find((s) => s.id === activeScenarioId) ||
    RECONCILIATION_SCENARIOS[0]
  );
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/** Writes a monetary value and flags negatives for non-colour emphasis. */
function setMoney(id, pence, { withSymbol = false } = {}) {
  const el = document.getElementById(id);
  if (!el) return;
  const available = typeof pence === "number" && Number.isFinite(pence);
  el.textContent = withSymbol ? formatPoundsFromPence(pence) : formatPence(pence);
  el.classList.toggle("is-negative", available && pence < 0);
  el.classList.toggle("is-unavailable", !available);
  if (!available) el.title = "Unavailable — not treated as zero";
  else el.removeAttribute("title");
}

/* ---------------------------------------------------------------------- */
/* Rendering                                                               */
/* ---------------------------------------------------------------------- */

function render() {
  const scenario = getActiveScenario();
  const result = calculateReconciliation(scenario);

  renderReconciliationSection(result);
  renderRequirementSection(result);
  renderResourceSection(result);
  renderInsuranceSection(result);
  renderAccountSection(result);
  renderScenarioOptions();
}

function renderReconciliationSection(result) {
  const meta = OUTCOME_META[result.outcome] || OUTCOME_META.Incomplete;

  // ASSUMPTION (OPEX to confirm): one timestamp applies to every ledger data point.
  setText(
    "recon-point",
    `All ledger data points as at ${result.point} on ${formatDisplayDate(result.date)}`
  );

  const badge = document.getElementById("recon-outcome-badge");
  badge.className = `recon__outcome-badge recon__outcome-badge--${meta.variant}`;
  setPhosphorIcon(document.getElementById("recon-outcome-icon"), meta.icon);
  setText("recon-outcome-label", result.outcome);

  let message = result.message;
  if (result.isAssumption && result.assumptionNote) {
    message += ` ${result.assumptionNote}`;
  }
  setText("recon-outcome-message", message);

  setMoney("recon-requirement", result.requirement.total, { withSymbol: true });
  setMoney("recon-resource", result.resource.total, { withSymbol: true });
  setMoney("recon-difference", result.difference, { withSymbol: true });

  const differenceEl = document.getElementById("recon-difference");
  differenceEl.classList.remove("is-surplus", "is-shortfall");
  if (result.outcome === "Surplus") differenceEl.classList.add("is-surplus");
  if (result.outcome === "Shortfall") differenceEl.classList.add("is-shortfall");

  renderExceptions(result);

  // Requirement disclosure
  setMoney("rq-individual", result.requirement.individualSafeguardingBalances);
  setMoney("rq-unknown", result.requirement.unknownOrUnallocatedFunds);
  setMoney("rq-manual", result.requirement.manualEntries);
  setMoney("rq-total", result.requirement.total);

  // Resource disclosure
  setMoney("rs-safeguarded", result.resource.safeguardedAccounts.total);
  setMoney("rs-settlement", result.resource.settlementAccounts.total);
  setMoney("rs-insurance", result.resource.allocatedInsurance);
  setMoney("rs-sg-bc", result.resource.safeguardedAccounts.bankingCircle);
  setMoney("rs-sg-citi", result.resource.safeguardedAccounts.citi);
  setMoney("rs-st-bc", result.resource.settlementAccounts.bankingCircle);
  setMoney("rs-st-citi", result.resource.settlementAccounts.citi);
  setMoney("rs-total", result.resource.total);
}

/** Exceptions are rendered only when something needs attention. */
function renderExceptions(result) {
  const host = document.getElementById("recon-exceptions");
  host.innerHTML = "";

  const alerts = [];

  if (result.outcome === "Incomplete") {
    alerts.push({
      variant: "incomplete",
      icon: "warning-circle",
      title: "Reconciliation incomplete",
      body: `${result.message} Unavailable values are left blank rather than counted as £0.00.`,
      action: "Restore the missing balance feed, then re-run the reconciliation.",
    });
  }

  if (result.outcome === "Shortfall") {
    alerts.push({
      variant: "shortfall",
      icon: "trend-down",
      title: "Shortfall against requirement",
      body: `Safeguarding resource is ${formatPoundsFromPence(
        Math.abs(result.difference)
      )} below the requirement.`,
      action: "Fund the safeguarding account or increase cover to close the gap.",
    });
  }

  if (result.insurance.capReached) {
    alerts.push({
      variant: "shortfall",
      icon: "warning",
      title: "Insurance cap reached",
      body: `Available insurance is fully allocated. ${formatPoundsFromPence(
        result.insurance.uncovered
      )} remains uncovered.`,
      action: "Review the insurance limit with Treasury before the next cycle.",
    });
  }

  alerts.forEach((alert) => host.appendChild(buildAlert(alert)));
}

function buildAlert({ variant, icon, title, body, action }) {
  const el = document.createElement("div");
  el.className = `alert alert--${variant}`;
  el.setAttribute("role", "alert");

  const iconEl = document.createElement("span");
  iconEl.className = "alert__icon";
  iconEl.setAttribute("aria-hidden", "true");
  setPhosphorIcon(iconEl, icon);

  const content = document.createElement("div");
  const titleEl = document.createElement("p");
  titleEl.className = "alert__title";
  titleEl.textContent = title;
  const bodyEl = document.createElement("p");
  bodyEl.className = "alert__body";
  bodyEl.textContent = body;
  const actionEl = document.createElement("p");
  actionEl.className = "alert__action";
  actionEl.textContent = action;

  content.append(titleEl, bodyEl, actionEl);
  el.append(iconEl, content);
  return el;
}

function renderRequirementSection(result) {
  setMoney("sum-movement", result.requirement.movement);
  setMoney("sum-requirement", result.requirement.total);
  setMoney("sum-requirement-ex-transient", result.requirement.excludingTransientFunds);
  setMoney("sum-previous-requirement", result.requirement.previousRequirement);
  setMoney("sum-manual-movement", result.requirement.manualEntries);
  setMoney("sum-rq-individual", result.requirement.individualSafeguardingBalances);
  setMoney("sum-rq-unknown", result.requirement.unknownOrUnallocatedFunds);
  setMoney("sum-rq-manual", result.requirement.manualEntries);
  setMoney("timeline-manual-amount", result.requirement.manualEntries, {
    withSymbol: true,
  });
}

function renderResourceSection(result) {
  setMoney("res-safeguarded", result.resource.safeguardedAccounts.total);
  setMoney("res-settlement", result.resource.settlementAccounts.total);
  setMoney("res-insurance", result.resource.allocatedInsurance);
  setMoney("res-total", result.resource.total);
}

function renderInsuranceSection(result) {
  setMoney("ins-available", result.insurance.available);
  setMoney("ins-required", result.insurance.required);
  setMoney("ins-allocated", result.insurance.allocated);
  setMoney("ins-remaining", result.insurance.remaining);

  const host = document.getElementById("ins-cap-alert");
  host.innerHTML = "";
  if (result.insurance.capReached) {
    host.appendChild(
      buildAlert({
        variant: "shortfall",
        icon: "warning",
        title: "Insurance fully allocated",
        body: `Available insurance is fully allocated. ${formatPoundsFromPence(
          result.insurance.uncovered
        )} remains uncovered.`,
        action: "This uncovered amount is the shortfall shown in the reconciliation.",
      })
    );
  }
}

function renderAccountSection(result) {
  // ASSUMPTION: the safeguarding account must cover whatever the settlement
  // balances and allocated insurance do not.
  const settlement = result.resource.settlementAccounts.total;
  const allocated = result.resource.allocatedInsurance;
  const requirement = result.requirement.total;

  const canDerive = [settlement, allocated, requirement].every(
    (v) => typeof v === "number" && Number.isFinite(v)
  );
  const required = canDerive
    ? Math.max(requirement - settlement - allocated, 0)
    : null;
  const current = result.resource.safeguardedAccounts.total;
  const movement =
    typeof required === "number" && typeof current === "number"
      ? required - current
      : null;

  setMoney("acct-required", required);
  setMoney("acct-bc", result.resource.safeguardedAccounts.bankingCircle);
  setMoney("acct-citi", result.resource.safeguardedAccounts.citi);
  setMoney("acct-movement", movement);
}

function formatDisplayDate(iso) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

/* ---------------------------------------------------------------------- */
/* Scenario switcher (development only)                                    */
/* ---------------------------------------------------------------------- */

function renderScenarioOptions() {
  const host = document.getElementById("devbar-options");
  if (!host || host.dataset.built === "true") {
    if (host) {
      host.querySelectorAll("input").forEach((input) => {
        input.checked = input.value === activeScenarioId;
      });
    }
    return;
  }

  RECONCILIATION_SCENARIOS.forEach((scenario) => {
    const label = document.createElement("label");
    label.className = "devbar__option";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "scenario";
    input.value = scenario.id;
    input.checked = scenario.id === activeScenarioId;
    input.addEventListener("change", () => {
      activeScenarioId = scenario.id;
      render();
    });

    const text = document.createElement("span");
    text.textContent = scenario.label;

    label.append(input, text);
    host.appendChild(label);
  });

  host.dataset.built = "true";
}

/* ---------------------------------------------------------------------- */
/* Boot                                                                    */
/* ---------------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("currency-sync-time").textContent = nowFormatted(12);
  document.getElementById("entity-sync-time").textContent = nowFormatted(3);
  document.getElementById("account-checked-time").textContent = nowFormatted(12);

  const name = sessionStorage.getItem("safeguarding_user") || "Demo User";
  document.getElementById("current-user").textContent = name;

  document.getElementById("btn-logout").addEventListener("click", () => {
    sessionStorage.removeItem("safeguarding_user");
    window.location.href = "index.html";
  });

  // Cosmetic-only period navigation, matching the existing Summary page.
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

  const exportBtn = document.getElementById("btn-export");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      exportBtn.textContent = "Exporting…";
      setTimeout(() => {
        exportBtn.textContent = "Export";
      }, 900);
    });
  }

  const devToggle = document.getElementById("devbar-toggle");
  const devPanel = document.getElementById("devbar-panel");
  devToggle.addEventListener("click", () => {
    const open = devToggle.getAttribute("aria-expanded") === "true";
    devToggle.setAttribute("aria-expanded", String(!open));
    devPanel.hidden = open;
  });

  render();
  runReconciliationSelfTests();
});
