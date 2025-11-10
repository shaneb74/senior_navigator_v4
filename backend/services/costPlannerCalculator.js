const { calculateVaDisability, estimateAidAndAttendance } = require('./vaBenefits');

const CARE_LEVEL_COSTS = {
  none: 0,
  in_home: 4200,
  assisted_living: 5800,
  memory_care: 7800,
  memory_care_high_acuity: 9500,
};

const REGION_MAP = {
  0: 'National',
  1: 'Northeast',
  2: 'Midwest',
  3: 'South',
  4: 'South',
  5: 'West',
  6: 'West',
  7: 'West',
  8: 'West',
  9: 'West',
};

function normalizeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function sum(values = []) {
  return values.reduce((total, value) => total + normalizeNumber(value), 0);
}

function inferRegion(zip) {
  if (!zip) {
    return 'National';
  }
  const firstDigit = String(zip).trim()[0];
  const region = REGION_MAP[firstDigit];
  return region || 'National';
}

function createIncomeSources(formData) {
  const sources = [];
  const addSource = (type, amount) => {
    const value = normalizeNumber(amount);
    if (value > 0) {
      sources.push({ type, amount: value, frequency: 'monthly' });
    }
  };

  addSource('social_security', formData.ss_income);
  addSource('pension', formData.pension_income);
  addSource('employment', formData.employment_income);
  addSource('investment', formData.investment_income);
  addSource('other', formData.other_income);
  addSource('va_benefit', formData.va_benefit_amount);

  return sources;
}

function createAssetDetails(formData) {
  const details = [];
  const addAsset = (type, value, liquid = true) => {
    const amount = normalizeNumber(value);
    if (amount > 0) {
      details.push({ type, value: amount, liquid });
    }
  };

  addAsset('savings', formData.liquid_assets, true);
  addAsset('investment', formData.investment_assets, true);
  addAsset('real_estate', formData.real_estate_assets, false);
  addAsset('other', formData.other_assets, false);

  return details;
}

function calculateDebtTotal(formData) {
  return (
    normalizeNumber(formData.credit_card_debt) +
    normalizeNumber(formData.personal_loans) +
    normalizeNumber(formData.other_debt) +
    normalizeNumber(formData.primary_residence_mortgage)
  );
}

function buildAssetCategories(assetDetails) {
  const buckets = {
    liquid: {
      key: 'liquid',
      label: 'Liquid Savings',
      color: '#4f46e5',
      value: 0,
      accessible_value: 0,
      liquid: true,
    },
    investments: {
      key: 'investments',
      label: 'Investments',
      color: '#0ea5e9',
      value: 0,
      accessible_value: 0,
      liquid: true,
    },
    realEstate: {
      key: 'real_estate',
      label: 'Real Estate',
      color: '#f59e0b',
      value: 0,
      accessible_value: 0,
      liquid: false,
    },
    other: {
      key: 'other',
      label: 'Other Assets',
      color: '#10b981',
      value: 0,
      accessible_value: 0,
      liquid: false,
    },
  };

  assetDetails.forEach((asset) => {
    switch (asset.type) {
      case 'savings':
        buckets.liquid.value += asset.value;
        buckets.liquid.accessible_value += asset.value;
        break;
      case 'investment':
        buckets.investments.value += asset.value;
        buckets.investments.accessible_value += asset.value * 0.9;
        break;
      case 'real_estate':
        buckets.realEstate.value += asset.value;
        buckets.realEstate.accessible_value += asset.value * 0.7;
        break;
      default:
        buckets.other.value += asset.value;
        buckets.other.accessible_value += asset.value * 0.5;
    }
  });

  return Object.values(buckets).filter((bucket) => bucket.value > 0);
}

function calculateRunway(totalLiquidAssets, monthlyShortfall) {
  if (monthlyShortfall <= 0) {
    return 999; // effectively more than 80 years of runway
  }
  return Math.max(0, Math.round(totalLiquidAssets / monthlyShortfall));
}

function buildRunwayProjection(totalLiquidAssets, monthlyShortfall, months = 60) {
  const projection = [];
  let balance = totalLiquidAssets;

  for (let month = 1; month <= months; month++) {
    balance = Math.max(0, balance - monthlyShortfall);
    projection.push({ month, balance });
    if (balance <= 0) break;
  }

  return projection;
}

function buildCoverageSummary(monthlyGap, assetCategories) {
  const summary = {
    monthly_gap: Math.round(monthlyGap),
    asset_coverage_months: 0,
    total_coverage_months: 0,
    coverage_label: '',
    timeline: [],
  };

  if (monthlyGap <= 0) {
    summary.coverage_label = 'Income covers projected care costs';
    summary.total_coverage_months = 999;
    summary.timeline = [
      { label: 'Income Surplus', months: 999, color: '#10b981' },
    ];
    return summary;
  }

  const timeline = [];
  let totalMonths = 0;
  assetCategories.forEach((cat) => {
    if (!cat.accessible_value) return;
    const months = Math.floor(cat.accessible_value / monthlyGap);
    if (months <= 0) return;
    timeline.push({
      label: cat.label,
      months,
      color: cat.color,
    });
    totalMonths += months;
  });

  summary.asset_coverage_months = totalMonths;
  summary.total_coverage_months = totalMonths;
  summary.timeline = timeline;

  if (totalMonths >= 360) {
    summary.coverage_label = 'Resources cover care for 30+ years';
  } else if (totalMonths >= 180) {
    summary.coverage_label = 'Resources cover care for 15+ years';
  } else if (totalMonths >= 60) {
    summary.coverage_label = 'Coverage for ~5 years';
  } else if (totalMonths > 0) {
    summary.coverage_label = 'Limited runway—plan financing options';
  } else {
    summary.coverage_label = 'No assets earmarked for coverage';
  }

  return summary;
}

function buildInsights({
  monthlyGap,
  coverageSummary,
  debtTotal,
  totalLiquidAssets,
  netAssets,
  hasVaBenefit,
  formData,
}) {
  const insights = [];

  if (monthlyGap > 0 && coverageSummary.asset_coverage_months < 36) {
    insights.push('Coverage is under 3 years — consider VA benefits, LTC insurance, or home equity strategies.');
  }

  if (monthlyGap <= 0) {
    insights.push('Monthly income currently covers projected care costs. Monitor expenses to maintain surplus.');
  }

  if (totalLiquidAssets < 50000) {
    insights.push('Liquid savings are limited; evaluate which assets could be repurposed for care.');
  }

  if (debtTotal > 0.25 * Math.max(netAssets, 1)) {
    insights.push('Debt load is meaningful compared to assets. Explore refinancing or payoff strategies.');
  }

  if (!hasVaBenefit && formData.is_veteran) {
    insights.push('Veteran status detected — Aid & Attendance could offset care costs.');
  }

  if (insights.length === 0) {
    insights.push('Finances appear well-aligned with projected care costs.');
  }

  return insights;
}

function calculateFinancialProfile(formData = {}) {
  const incomeSources = createIncomeSources(formData);
  const monthlyIncome = sum(incomeSources.map((s) => s.amount));

  const totalLiquidAssets = normalizeNumber(formData.liquid_assets) + normalizeNumber(formData.investment_assets);
  const totalRealEstate = normalizeNumber(formData.real_estate_assets);
  const assetDetails = createAssetDetails(formData);
  const assetCategories = buildAssetCategories(assetDetails);

  const careLevel = formData.care_level || 'in_home';
  const estimatedMonthlyCareCost = CARE_LEVEL_COSTS[careLevel] || CARE_LEVEL_COSTS.in_home;

  const currentExpenses = normalizeNumber(formData.current_expenses);
  const monthlyGap = Math.round(estimatedMonthlyCareCost + currentExpenses - monthlyIncome);
  const monthlyShortfall = Math.max(0, monthlyGap);
  const runwayMonths = calculateRunway(totalLiquidAssets, monthlyShortfall);

  const hasVaBenefit = Boolean(formData.va_benefit_status && formData.va_benefit_status !== 'none');
  const vaDisabilityDetails = calculateVaDisability(
    formData.va_disability_rating,
    formData.va_dependents
  );

  let vaDisabilityAmount = normalizeNumber(formData.va_disability_monthly);
  if (vaDisabilityDetails?.amount) {
    vaDisabilityAmount = vaDisabilityDetails.amount;
  }

  const aidAttendanceMeta = estimateAidAndAttendance({
    receivesStatus: formData.has_aid_attendance,
    eligible: formData.eligible_aid_attendance,
    monthlyIncome,
    householdStatus: formData.aanda_household_status,
  });

  let aidAttendanceAmount = normalizeNumber(formData.aid_attendance_monthly);
  if (!aidAttendanceAmount && aidAttendanceMeta.eligible) {
    aidAttendanceAmount = aidAttendanceMeta.estimatedBenefit;
  }
  const totalDebt = calculateDebtTotal(formData);
  const totalAssets = assetCategories.reduce((sum, cat) => sum + cat.value, 0);
  const netAssets = totalAssets - totalDebt;
  const coverageSummary = buildCoverageSummary(monthlyGap, assetCategories);
  const insights = buildInsights({
    monthlyGap,
    coverageSummary,
    debtTotal: totalDebt,
    totalLiquidAssets,
    netAssets,
    hasVaBenefit,
    formData,
  });

  const profile = {
    monthly_income: Math.round(monthlyIncome),
    income_sources: incomeSources,
    total_liquid_assets: Math.round(totalLiquidAssets),
    total_real_estate: Math.round(totalRealEstate),
    asset_details: assetDetails,
    asset_categories: assetCategories,
    estimated_monthly_care_cost: Math.round(estimatedMonthlyCareCost),
    current_monthly_expenses: Math.round(currentExpenses),
    zip_code: formData.zip_code || '',
    region: inferRegion(formData.zip_code),
    care_level: careLevel,
    care_recipient_name: formData.care_recipient_name || '',
    profile_id: `cp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    monthly_gap: monthlyGap,
    monthly_shortfall: Math.round(monthlyShortfall),
    months_of_coverage: runwayMonths,
    has_va_benefit: hasVaBenefit || Boolean(vaDisabilityAmount) || Boolean(aidAttendanceAmount),
    va_benefit_amount: Math.round(vaDisabilityAmount + aidAttendanceAmount),
    runway_projection: buildRunwayProjection(totalLiquidAssets, monthlyShortfall),
    total_debt: Math.round(totalDebt),
    net_assets: Math.round(netAssets),
    coverage_summary: coverageSummary,
    insights,
    va_disability: vaDisabilityDetails
      ? {
          amount: Math.round(vaDisabilityDetails.amount),
          rating: vaDisabilityDetails.rating,
          dependents: vaDisabilityDetails.dependents,
          source: vaDisabilityDetails.source,
        }
      : null,
    aid_and_attendance: {
      amount: Math.round(aidAttendanceAmount),
      household_status: aidAttendanceMeta.householdStatus,
      eligible: aidAttendanceMeta.eligible,
      max_benefit: aidAttendanceMeta.maxBenefit,
      estimated_amount: aidAttendanceMeta.estimatedBenefit,
      highlight: aidAttendanceMeta.highlight,
    },
  };

  return profile;
}

module.exports = {
  calculateFinancialProfile,
};
