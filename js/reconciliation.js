/* ==========================================================================
   Safeguarding internal reconciliation — data + pure calculation layer.

   All monetary amounts are held as INTEGER PENCE. Floating-point pounds are
   never used for arithmetic; pounds only ever appear at the formatting edge.

   This module is presentation-free: the screen calls
   `calculateReconciliation()` for every figure it renders.
   ========================================================================== */

/* ---------------------------------------------------------------------- */
/* Configuration                                                           */
/* ---------------------------------------------------------------------- */

/** Maximum insurance cover available to the business, in pence.
 *  Kept as a data value so it can be changed without touching the UI. */
const INSURANCE_AVAILABLE_PENCE = 1_950_000_000; // £19,500,000.00

/** A reconciliation counts as "Matched" when |difference| <= this tolerance.
 *  ASSUMPTION: the business currently expects an exact match to the penny.
 *  Kept configurable so the rule can change without rewriting the UI. */
const MATCH_TOLERANCE_PENCE = 0;

/** The point in time the balances are taken from. */
const RECONCILIATION_POINT = "00:00 UTC";

/* ---------------------------------------------------------------------- */
/* Scenarios (prototype data — development only)                           */
/* ---------------------------------------------------------------------- */

/**
 * Each scenario is a set of *inputs* only. Every total, outcome and message
 * shown in the UI is derived from these by `calculateReconciliation()`.
 *
 * A `null` balance means "unavailable" and must never be treated as zero.
 */
const RECONCILIATION_SCENARIOS = [
  {
    id: "matched",
    label: "Matched",
    date: "2026-09-21",
    isAssumption: false,
    requirement: {
      // ASSUMPTION: replace with confirmed source values. The live product
      // does not yet expose the requirement split separately; these two
      // components sum exactly to the published requirement.
      individualSafeguardingBalances: 1_691_422_035, // £16,914,220.35
      unknownOrUnallocatedFunds: 71_872_452, //         £718,724.52
      // Manual entries sit *inside* the unknown/unallocated component above.
      manualEntries: -116_075, //                        (£1,160.75)
      previousRequirement: 36_656_788, //               £366,567.88
      // ASSUMPTION: transient funds carried over from the existing summary.
      transientFunds: 29_725_252, //                    £297,252.52
    },
    safeguardedAccounts: {
      bankingCircle: 600_000_000, // £6,000,000.00
      citi: 400_000_000, //          £4,000,000.00
    },
    settlementAccounts: {
      bankingCircle: 120_000_000, // £1,200,000.00
      citi: 80_000_000, //             £800,000.00
    },
    insuranceAvailablePence: INSURANCE_AVAILABLE_PENCE,
  },
  {
    id: "shortfall-insurance-cap",
    label: "Shortfall — insurance cap reached",
    date: "2026-09-21",
    isAssumption: false,
    requirement: {
      // ASSUMPTION: replace with confirmed source values.
      individualSafeguardingBalances: 3_548_000_000, // £35,480,000.00
      unknownOrUnallocatedFunds: 152_000_000, //         £1,520,000.00
      manualEntries: -116_075, //                          (£1,160.75)
      previousRequirement: 36_656_788,
      transientFunds: 29_725_252,
    },
    safeguardedAccounts: {
      bankingCircle: 800_000_000, // £8,000,000.00
      citi: 500_000_000, //          £5,000,000.00
    },
    settlementAccounts: {
      bankingCircle: 200_000_000, // £2,000,000.00
      citi: 100_000_000, //          £1,000,000.00
    },
    insuranceAvailablePence: INSURANCE_AVAILABLE_PENCE,
  },
  {
    id: "excess",
    label: "Excess",
    date: "2026-09-21",
    // Bank balances alone exceed the requirement, so allocated insurance is
    // floored at £0 and the remainder is an excess.
    isAssumption: false,
    requirement: {
      // ASSUMPTION: replace with confirmed source values.
      individualSafeguardingBalances: 1_630_000_000, // £16,300,000.00
      unknownOrUnallocatedFunds: 70_000_000, //            £700,000.00
      manualEntries: -116_075,
      previousRequirement: 36_656_788,
      transientFunds: 29_725_252,
    },
    safeguardedAccounts: {
      bankingCircle: 700_000_000, // £7,000,000.00
      citi: 500_000_000, //          £5,000,000.00
    },
    settlementAccounts: {
      bankingCircle: 350_000_000, // £3,500,000.00
      citi: 250_000_000, //          £2,500,000.00
    },
    insuranceAvailablePence: INSURANCE_AVAILABLE_PENCE,
  },
  {
    id: "incomplete",
    label: "Incomplete — missing balance",
    date: "2026-09-21",
    isAssumption: false,
    requirement: {
      // ASSUMPTION: replace with confirmed source values.
      individualSafeguardingBalances: 1_691_422_035,
      unknownOrUnallocatedFunds: 71_872_452,
      manualEntries: -116_075,
      previousRequirement: 36_656_788,
      transientFunds: 29_725_252,
    },
    safeguardedAccounts: {
      bankingCircle: 600_000_000,
      citi: 400_000_000,
    },
    settlementAccounts: {
      bankingCircle: 120_000_000,
      citi: null, // Unavailable — must not be read as £0.00.
    },
    insuranceAvailablePence: INSURANCE_AVAILABLE_PENCE,
  },
];

/* ---------------------------------------------------------------------- */
/* Formatting helpers                                                      */
/* ---------------------------------------------------------------------- */

/** Formats integer pence as a GBP amount without a currency symbol.
 *  Negative values are shown in parentheses, matching the existing product. */
function formatPence(pence) {
  if (!isAvailable(pence)) return "—";
  const magnitude = Math.abs(pence) / 100;
  const text = magnitude.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return pence < 0 ? `(${text})` : text;
}

/** Formats integer pence as a GBP amount including the £ symbol. */
function formatPoundsFromPence(pence) {
  if (!isAvailable(pence)) return "—";
  const magnitude = Math.abs(pence) / 100;
  const text = magnitude.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return pence < 0 ? `(£${text})` : `£${text}`;
}

function isAvailable(value) {
  return typeof value === "number" && Number.isFinite(value);
}

/** Adds a list of pence values, returning null if any input is unavailable. */
function sumPence(values) {
  let total = 0;
  for (const value of values) {
    if (!isAvailable(value)) return null;
    total += value;
  }
  return total;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/* ---------------------------------------------------------------------- */
/* Pure calculation                                                        */
/* ---------------------------------------------------------------------- */

/**
 * Derives every figure, outcome and message for a scenario.
 * Pure: no DOM access, no side effects, same input -> same output.
 */
function calculateReconciliation(scenario, options = {}) {
  const tolerance = isAvailable(options.tolerancePence)
    ? options.tolerancePence
    : MATCH_TOLERANCE_PENCE;

  const missingInputs = [];
  const req = scenario.requirement;

  // --- Requirement -----------------------------------------------------
  const requirementTotal = sumPence([
    req.individualSafeguardingBalances,
    req.unknownOrUnallocatedFunds,
  ]);
  if (!isAvailable(requirementTotal)) {
    missingInputs.push("Safeguarding requirement components");
  }

  // ASSUMPTION: movement is the period-on-period change in the requirement.
  const movement = isAvailable(requirementTotal)
    ? requirementTotal - req.previousRequirement
    : null;

  // ASSUMPTION: transient funds are carried over from the existing summary.
  const requirementExcludingTransientFunds = isAvailable(requirementTotal)
    ? requirementTotal - req.transientFunds
    : null;

  // --- Resource components ---------------------------------------------
  const safeguarded = scenario.safeguardedAccounts;
  const settlement = scenario.settlementAccounts;

  if (!isAvailable(safeguarded.bankingCircle)) {
    missingInputs.push("Banking Circle safeguarded account balance");
  }
  if (!isAvailable(safeguarded.citi)) {
    missingInputs.push("Citi safeguarded account balance");
  }
  if (!isAvailable(settlement.bankingCircle)) {
    missingInputs.push("Banking Circle settlement account balance");
  }
  if (!isAvailable(settlement.citi)) {
    missingInputs.push("Citi settlement account balance");
  }

  const safeguardedTotal = sumPence([safeguarded.bankingCircle, safeguarded.citi]);
  const settlementTotal = sumPence([settlement.bankingCircle, settlement.citi]);

  // --- Insurance --------------------------------------------------------
  const insuranceAvailable = isAvailable(scenario.insuranceAvailablePence)
    ? scenario.insuranceAvailablePence
    : INSURANCE_AVAILABLE_PENCE;

  let insuranceRequired = null;
  let insuranceAllocated = null;
  let insuranceRemaining = null;

  if (
    isAvailable(requirementTotal) &&
    isAvailable(safeguardedTotal) &&
    isAvailable(settlementTotal)
  ) {
    insuranceRequired = Math.max(
      requirementTotal - safeguardedTotal - settlementTotal,
      0
    );
    // ASSUMPTION (OPEX to confirm): allocated insurance is derived dynamically
    // from the relevant bank account balances, floored at £0 and capped at
    // the available insurance limit.
    insuranceAllocated = clamp(insuranceRequired, 0, insuranceAvailable);
    insuranceRemaining = insuranceAvailable - insuranceAllocated;
  }

  const insuranceCapReached =
    isAvailable(insuranceRequired) &&
    isAvailable(insuranceAllocated) &&
    insuranceRequired > insuranceAllocated;

  // --- Resource and difference -----------------------------------------
  const resourceTotal = sumPence([
    safeguardedTotal,
    settlementTotal,
    insuranceAllocated,
  ]);

  const difference =
    isAvailable(resourceTotal) && isAvailable(requirementTotal)
      ? resourceTotal - requirementTotal
      : null;

  // --- Outcome ----------------------------------------------------------
  let outcome = "Incomplete";
  if (missingInputs.length === 0 && isAvailable(difference)) {
    if (Math.abs(difference) <= tolerance) outcome = "Matched";
    else if (difference > 0) outcome = "Excess";
    else outcome = "Shortfall";
  }

  const uncovered =
    insuranceCapReached && isAvailable(difference) ? Math.abs(difference) : null;

  return {
    scenarioId: scenario.id,
    scenarioLabel: scenario.label,
    isAssumption: Boolean(scenario.isAssumption),
    assumptionNote: scenario.assumptionNote || null,
    date: scenario.date,
    point: RECONCILIATION_POINT,
    tolerancePence: tolerance,

    requirement: {
      individualSafeguardingBalances: req.individualSafeguardingBalances,
      unknownOrUnallocatedFunds: req.unknownOrUnallocatedFunds,
      manualEntries: req.manualEntries,
      total: requirementTotal,
      movement,
      excludingTransientFunds: requirementExcludingTransientFunds,
      previousRequirement: req.previousRequirement,
    },

    resource: {
      safeguardedAccounts: {
        bankingCircle: safeguarded.bankingCircle,
        citi: safeguarded.citi,
        total: safeguardedTotal,
      },
      settlementAccounts: {
        bankingCircle: settlement.bankingCircle,
        citi: settlement.citi,
        total: settlementTotal,
      },
      allocatedInsurance: insuranceAllocated,
      total: resourceTotal,
    },

    insurance: {
      available: insuranceAvailable,
      required: insuranceRequired,
      allocated: insuranceAllocated,
      remaining: insuranceRemaining,
      capReached: insuranceCapReached,
      uncovered,
    },

    difference,
    outcome,
    missingInputs,
    message: buildOutcomeMessage(outcome, difference, missingInputs),
  };
}

/** One concise sentence explaining the outcome. */
function buildOutcomeMessage(outcome, difference, missingInputs) {
  switch (outcome) {
    case "Matched":
      return "Safeguarding resource exactly meets the safeguarding requirement.";
    case "Excess":
      return `Safeguarding resource exceeds the requirement by ${formatPoundsFromPence(
        Math.abs(difference)
      )}.`;
    case "Shortfall":
      return `Safeguarding resource is ${formatPoundsFromPence(
        Math.abs(difference)
      )} below the requirement.`;
    default:
      return `The reconciliation cannot be completed because ${listInputs(
        missingInputs
      )} ${missingInputs.length === 1 ? "is" : "are"} unavailable.`;
  }
}

function listInputs(inputs) {
  if (inputs.length === 0) return "a required input";
  if (inputs.length === 1) return inputs[0];
  return `${inputs.slice(0, -1).join(", ")} and ${inputs[inputs.length - 1]}`;
}

/* ---------------------------------------------------------------------- */
/* Development self-checks                                                 */
/* ---------------------------------------------------------------------- */

/**
 * Lightweight assertions covering the rules that matter most: insurance
 * clamping, the insurance-cap shortfall and missing-data handling. The repo
 * has no test runner, so these run in the browser and report to the console.
 */
function runReconciliationSelfTests() {
  const results = [];
  const check = (name, condition) => results.push({ name, pass: Boolean(condition) });

  const byId = (id) => RECONCILIATION_SCENARIOS.find((s) => s.id === id);

  const matched = calculateReconciliation(byId("matched"));
  check("matched: outcome is Matched", matched.outcome === "Matched");
  check("matched: difference is zero", matched.difference === 0);
  check(
    "matched: requirement equals £17,632,944.87",
    matched.requirement.total === 1_763_294_487
  );
  check(
    "matched: resource equals requirement",
    matched.resource.total === matched.requirement.total
  );
  check(
    "matched: allocated insurance equals required",
    matched.insurance.allocated === matched.insurance.required
  );

  const shortfall = calculateReconciliation(byId("shortfall-insurance-cap"));
  check("cap: outcome is Shortfall", shortfall.outcome === "Shortfall");
  check(
    "cap: allocation is capped at available",
    shortfall.insurance.allocated === shortfall.insurance.available
  );
  check(
    "cap: allocation never exceeds available",
    shortfall.insurance.allocated <= shortfall.insurance.available
  );
  check("cap: remaining is zero", shortfall.insurance.remaining === 0);
  check("cap: shortfall is £1,500,000.00", shortfall.difference === -150_000_000);
  check(
    "cap: uncovered equals shortfall",
    shortfall.insurance.uncovered === Math.abs(shortfall.difference)
  );

  const excess = calculateReconciliation(byId("excess"));
  check("excess: outcome is Excess", excess.outcome === "Excess");
  check("excess: difference is £1,000,000.00", excess.difference === 100_000_000);
  check("excess: allocated insurance floored at zero", excess.insurance.allocated === 0);

  const incomplete = calculateReconciliation(byId("incomplete"));
  check("incomplete: outcome is Incomplete", incomplete.outcome === "Incomplete");
  check("incomplete: no resource total", incomplete.resource.total === null);
  check("incomplete: no difference", incomplete.difference === null);
  check(
    "incomplete: names the missing balance",
    incomplete.missingInputs.some((i) => i.includes("Citi settlement"))
  );

  const failed = results.filter((r) => !r.pass);
  if (failed.length > 0) {
    console.error(
      `Reconciliation self-tests: ${failed.length} of ${results.length} failed`,
      failed
    );
  } else {
    console.info(`Reconciliation self-tests: ${results.length}/${results.length} passed`);
  }
  return results;
}
