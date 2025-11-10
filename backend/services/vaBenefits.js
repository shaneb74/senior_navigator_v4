const path = require('path');
const fs = require('fs');

let VA_RATES = null;

const MAPR_MONTHLY = {
  veteran_only: 2379,
  veteran_spouse: 2829,
  surviving_spouse: 1537,
};

function loadVaRates() {
  if (VA_RATES) {
    return VA_RATES;
  }

  try {
    const ratesPath = path.join(__dirname, '..', 'data', 'va_disability_rates_2025.json');
    const raw = fs.readFileSync(ratesPath, 'utf-8');
    const parsed = JSON.parse(raw);
    VA_RATES = parsed.rates || parsed;
    return VA_RATES;
  } catch (err) {
    console.error('[VA_BENEFITS] Failed to load rates file:', err);
    VA_RATES = {};
    return VA_RATES;
  }
}

function normalizeRating(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = Number(String(value).replace('%', '').trim());
  if (!Number.isFinite(numeric)) {
    return null;
  }
  const clamped = Math.min(100, Math.max(0, Math.round(numeric / 10) * 10));
  return clamped;
}

function normalizeDependents(value) {
  if (!value) {
    return 'veteran_alone';
  }
  const normalized = String(value).trim();
  return normalized;
}

function calculateVaDisability(rating, dependents) {
  const normalizedRating = normalizeRating(rating);
  if (normalizedRating === null) {
    return null;
  }

  const normalizedDependents = normalizeDependents(dependents);
  const rates = loadVaRates();
  const bucket = rates[String(normalizedRating)];

  if (!bucket) {
    return null;
  }

  const amount = bucket[normalizedDependents];
  if (typeof amount !== 'number') {
    return null;
  }

  return {
    amount,
    source: normalizedRating === 100 ? '100% rating table' : 'VA rating table',
    rating: normalizedRating,
    dependents: normalizedDependents,
  };
}

function estimateAidAndAttendance({
  receivesStatus,
  eligible,
  monthlyIncome,
  householdStatus,
}) {
  const normalizedStatus = String(receivesStatus || 'no').toLowerCase();
  const hasBenefit = normalizedStatus === 'yes';
  const isApplying = normalizedStatus === 'applied' || normalizedStatus === 'considering';

  const statusKey = householdStatus && MAPR_MONTHLY[householdStatus]
    ? householdStatus
    : 'veteran_only';
  const cap = MAPR_MONTHLY[statusKey];

  const income = Number(monthlyIncome) || 0;
  const estimated = Math.max(0, cap - income);

  return {
    householdStatus: statusKey,
    maxBenefit: cap,
    estimatedBenefit: estimated,
    eligible: Boolean(eligible),
    highlight: hasBenefit || (eligible && (isApplying || estimated > 0)),
  };
}

module.exports = {
  calculateVaDisability,
  estimateAidAndAttendance,
};
