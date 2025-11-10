/**
 * GCP Scoring Engine - parity with Streamlit v3 implementation.
 *
 * Responsibilities:
 * - Read module configuration (JSON contract) and compute deterministic tier
 * - Apply cognitive/behavior guardrails + tier map routing
 * - Optionally blend with LLM adjudication using policy-first rules
 * - Emit a CareRecommendation contract identical to v3 MCIP payload
 */

const crypto = require('crypto');

const {
  generateGCPAdvice,
  chooseFinalTier,
  CANONICAL_TIERS,
} = require('./gcpNaviEngine');
const FLAG_METADATA = require('./gcpFlagMetadata.json');
const TIER_MAP = require('./gcpTierMap.json');

// Tier thresholds (canonical) used for score-based routing
const TIER_THRESHOLDS = {
  none: [0, 8],
  in_home: [9, 16],
  assisted_living: [17, 24],
  memory_care: [25, 39],
  memory_care_high_acuity: [40, 100],
};

const VALID_TIERS = Object.keys(TIER_THRESHOLDS);
const CARE_TIER_ORDER = ['none', 'in_home', 'assisted_living', 'memory_care', 'memory_care_high_acuity'];

const COGNITIVE_HIGH_RISK = new Set([
  'wandering',
  'elopement',
  'aggression',
  'severe_sundowning',
  'severe_cognitive_risk',
  'memory_support',
]);

const RULE_SET_ID = 'standard_2025_q4';

async function calculateRecommendation(formData = {}, moduleConfig = {}, llmMode = 'off') {
  console.log('[GCP Scoring] Starting recommendation pipeline');

  const answers = formData || {};
  const moduleData = moduleConfig || {};
  const {
    totalScore,
    scoringDetails,
    scoreByCategory,
    scoreEntries,
  } = scoreModule(answers, moduleData);

  console.log('[GCP Scoring] Total score:', totalScore);

  const flagIds = extractFlagsFromAnswers(answers, moduleData);
  const passesCognitiveGate = cognitiveGate(answers, flagIds);
  const cognitionBandValue = cognitionBand(answers, flagIds);
  const supportBandValue = supportBand(answers, flagIds);
  const supportBandForRouting = supportBandValue === '24h' ? 'high' : supportBandValue;
  const riskyBehaviors = cognitiveGateBehaviorsOnly(answers, flagIds);

  let allowedTiers = buildAllowedTiers(passesCognitiveGate);
  allowedTiers = applyBehaviorGate(
    allowedTiers,
    cognitionBandValue,
    supportBandForRouting,
    riskyBehaviors
  );

  const tierFromScore = determineTier(totalScore);
  const tierFromMapping = resolveTierFromMap(cognitionBandValue, supportBandForRouting);
  const detTier = selectDeterministicTier({
    tierFromMapping,
    tierFromScore,
    allowedTiers,
  });

  let finalTier = detTier;
  let llmAdvice = null;
  let adjudicationDecision = {
    det: detTier,
    llm: null,
    source: 'fallback',
    allowed: Array.from(allowedTiers).sort(),
    bands: { cog: cognitionBandValue, sup: supportBandForRouting },
    risky: riskyBehaviors,
    adjudication_reason: 'deterministic_only',
  };

  if (llmMode !== 'off') {
    console.log(`[GCP Scoring] LLM mode enabled (${llmMode}) - requesting advice`);
    const llmResult = await generateGCPAdvice(answers, scoreEntries, flagIds, llmMode, Array.from(allowedTiers));

    if (llmResult.success && llmResult.advice) {
      llmAdvice = llmResult.advice;
      const adjudication = chooseFinalTier(
        detTier,
        allowedTiers,
        llmAdvice.tier,
        llmAdvice.confidence,
        { cog: cognitionBandValue, sup: supportBandForRouting },
        riskyBehaviors
      );
      finalTier = adjudication.tier;
      adjudicationDecision = adjudication.decision;
      logAdjudication(detTier, finalTier, adjudicationDecision, llmAdvice);
    } else {
      console.log('[GCP Scoring] LLM advice unavailable - using deterministic tier');
    }
  }

  const tierRankings = buildTierRankings(totalScore, finalTier);
  const deterministicConfidence = calculateConfidence(scoringDetails, totalScore, detTier);
  const finalConfidence = typeof llmAdvice?.confidence === 'number'
    ? clamp(llmAdvice.confidence, 0, 1)
    : calculateConfidence(scoringDetails, totalScore, finalTier);
  const rationale = buildRationale(scoringDetails, finalTier, totalScore);
  const derived = buildDerivedData(answers);
  const allowedTierList = sortTiers(Array.from(allowedTiers));
  const flagObjects = buildFlagObjects(flagIds);
  const timestamp = new Date().toISOString();

  const legacyRawScores = {
    total_score: Number(totalScore.toFixed(1)),
    cognitive_score: Number((scoreByCategory.cognition || 0).toFixed(1)),
    adl_score: Number((scoreByCategory.adl || 0).toFixed(1)),
    safety_score: Number((scoreByCategory.safety || 0).toFixed(1)),
    mobility_score: Number((scoreByCategory.mobility || 0).toFixed(1)),
  };

  const deterministicResult = {
    tier: detTier,
    confidence: Number(deterministicConfidence.toFixed(2)),
    score: Number(totalScore.toFixed(1)),
  };

  const llmResult = llmAdvice
    ? {
        tier: llmAdvice.tier,
        confidence: Number(clamp(llmAdvice.confidence, 0, 1).toFixed(2)),
        reasons: llmAdvice.reasons || [],
        navi_messages: llmAdvice.navi_messages || [],
      }
    : null;

  const recommendation = {
    tier: finalTier,
    tier_score: Number(totalScore.toFixed(1)),
    tier_rankings: tierRankings,
    confidence: Number(finalConfidence.toFixed(2)),
    flags: flagObjects,
    rationale,
    suggested_next_product: determineNextProduct(finalTier, finalConfidence),
    derived,
    allowed_tiers: allowedTierList,
    generated_at: timestamp,
    version: moduleConfig?.module?.version || 'v2025.10',
    input_snapshot_id: generateSnapshotId(answers),
    rule_set: RULE_SET_ID,
    next_step: buildNextStep(finalTier, finalConfidence),
    status: 'complete',
    last_updated: timestamp,
    needs_refresh: false,
    schema_version: 2,
    assessment_id: `assess_${Date.now()}`,
    user_inputs: answers,
    score_breakdown: scoreByCategory,
    adjudication: adjudicationDecision,
    llm_advice: llmAdvice || undefined,
    timestamp,
    deterministic_result: deterministicResult,
    llm_result: llmResult || undefined,
  };

  // Legacy aliases for backward compatibility
  recommendation.recommendation = finalTier;
  recommendation.raw_scores = legacyRawScores;

  console.log('[GCP Scoring] Final recommendation:', recommendation);
  return recommendation;
}

// ------------------------------------------------------------------ //
// Deterministic scoring helpers
// ------------------------------------------------------------------ //

function scoreModule(answers, moduleConfig) {
  const scoringDetails = {
    by_section: {},
    by_question: {},
    required_answered: 0,
    required_total: 0,
    optional_answered: 0,
  };

  const scoreByCategory = {
    cognition: 0,
    adl: 0,
    safety: 0,
    mobility: 0,
    general: 0,
  };

  const scoreEntries = [];
  let totalScore = 0;

  for (const section of moduleConfig.sections || []) {
    if (section.type === 'info' || !section.questions) {
      continue;
    }

    const sectionDetails = [];
    let sectionScore = 0;

    for (const question of section.questions) {
      const questionId = question.id;
      const answer = answers[questionId];
      const required = Boolean(question.required);
      const answered = hasAnswer(answer);

      if (required) {
        scoringDetails.required_total += 1;
        if (answered) scoringDetails.required_answered += 1;
      } else if (answered) {
        scoringDetails.optional_answered += 1;
      }

      if (!answered) {
        scoringDetails.by_question[questionId] = 0;
        continue;
      }

      let questionScore = 0;
      const category = getCategoryFromQuestion(question);

      let handled = false;

      if (Array.isArray(answer)) {
        for (const option of question.options || []) {
          if (answer.includes(option.value)) {
            const score = Number(option.score || 0);
            questionScore += score;
            sectionDetails.push(buildSectionDetail(question, option, score));
            scoreEntries.push(buildScoreEntry(questionId, option.value, score, category, option.flags));
            scoreByCategory[category] = (scoreByCategory[category] || 0) + score;
          }
        }
        handled = true;
      } else if (question.options && question.options.length) {
        const option = (question.options || []).find((opt) => opt.value === answer);
        if (option) {
          const score = Number(option.score || 0);
          questionScore += score;
          sectionDetails.push(buildSectionDetail(question, option, score));
          scoreEntries.push(buildScoreEntry(questionId, option.value, score, category, option.flags));
          scoreByCategory[category] = (scoreByCategory[category] || 0) + score;
          handled = true;
        }
      }

      if (
        !handled &&
        question.type === 'number' &&
        typeof answer === 'number' &&
        question.score_multiplier
      ) {
        const score = Number(answer) * Number(question.score_multiplier);
        questionScore += score;
        scoreEntries.push(buildScoreEntry(questionId, answer, score, category, question.flags));
        scoreByCategory[category] = (scoreByCategory[category] || 0) + score;
      }

      scoringDetails.by_question[questionId] = questionScore;
      sectionScore += questionScore;
    }

    scoringDetails.by_section[section.id] = {
      score: sectionScore,
      details: sectionDetails,
    };
    totalScore += sectionScore;
  }

  scoringDetails.answer_count = scoringDetails.required_answered;
  scoringDetails.total_questions = scoringDetails.required_total;

  return { totalScore, scoringDetails, scoreByCategory, scoreEntries };
}

function buildScoreEntry(questionId, answer, score, category, flags = []) {
  return {
    question_id: questionId,
    answer,
    score,
    category,
    flags: flags || [],
  };
}

function hasAnswer(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.some((item) => hasAnswer(item));
  if (typeof value === 'number') return true;
  if (typeof value === 'boolean') return true;
  return false;
}

function buildSectionDetail(question, option, score) {
  return {
    question: question.label || question.id,
    answer: option.label || option.value,
    score,
  };
}

function getCategoryFromQuestion(question) {
  const id = (question.id || '').toLowerCase();
  if (id.includes('memory') || id.includes('cogn')) return 'cognition';
  if (id.includes('adl') || id.includes('daily')) return 'adl';
  if (id.includes('fall') || id.includes('safety')) return 'safety';
  if (id.includes('mobil')) return 'mobility';
  return 'general';
}

function determineTier(totalScore) {
  for (const [tier, [min, max]] of Object.entries(TIER_THRESHOLDS)) {
    if (totalScore >= min && totalScore <= max) {
      return tier;
    }
  }
  return 'memory_care_high_acuity';
}

function resolveTierFromMap(cognitionBandValue, supportBandValue) {
  if (!cognitionBandValue || !supportBandValue) return null;
  return TIER_MAP?.[cognitionBandValue]?.[supportBandValue] || null;
}

function selectDeterministicTier({ tierFromMapping, tierFromScore, allowedTiers }) {
  if (tierFromMapping && allowedTiers.has(tierFromMapping)) {
    console.log('[GCP Scoring] Tier map selected:', tierFromMapping);
    return tierFromMapping;
  }

  if (tierFromScore && allowedTiers.has(tierFromScore)) {
    console.log('[GCP Scoring] Score-based tier selected:', tierFromScore);
    return tierFromScore;
  }

  for (const candidate of ['assisted_living', 'in_home', 'none', 'memory_care', 'memory_care_high_acuity']) {
    if (allowedTiers.has(candidate)) {
      console.log('[GCP Scoring] Fallback tier selected:', candidate);
      return candidate;
    }
  }

  return 'assisted_living';
}

function buildTierRankings(totalScore, winningTier) {
  const rankings = CARE_TIER_ORDER.map((tier) => {
    if (tier === winningTier) {
      return { tier, score: Number(totalScore.toFixed(1)) };
    }

    const [min, max] = TIER_THRESHOLDS[tier];
    const midpoint = (min + max) / 2;
    return { tier, score: Number(midpoint.toFixed(1)) };
  });

  return rankings.sort((a, b) => b.score - a.score);
}

function calculateConfidence(scoringDetails, totalScore, tier) {
  const requiredTotal = scoringDetails.required_total || 1;
  const completeness = scoringDetails.required_answered / requiredTotal;
  const [min, max] = TIER_THRESHOLDS[tier] || [0, 1];
  const distFromBoundary = Math.min(totalScore - min, max - totalScore);
  const boundaryConfidence = Math.min(distFromBoundary / 3, 1);
  const confidence = (completeness * 0.6) + (boundaryConfidence * 0.4);
  return clamp(confidence, 0.5, 0.99);
}

function buildRationale(scoringDetails, tier, totalScore) {
  const labels = {
    none: 'No Care Needed',
    in_home: 'In-Home Care',
    assisted_living: 'Assisted Living',
    memory_care: 'Memory Care',
    memory_care_high_acuity: 'Memory Care (High Acuity)',
  };

  const rationale = [
    `Based on ${Math.round(totalScore)} points, we recommend: ${labels[tier] || tier}`,
  ];

  const sections = Object.entries(scoringDetails.by_section || {})
    .sort(([, a], [, b]) => b.score - a.score)
    .slice(0, 3);

  for (const [sectionId, data] of sections) {
    if (data.score <= 0) continue;
    const sectionLabel = sectionId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    rationale.push(`${sectionLabel}: ${Math.round(data.score)} points`);
    if (data.details?.length) {
      const topDetail = data.details.reduce((best, current) => (current.score > (best?.score || 0) ? current : best), null);
      if (topDetail?.score > 0) {
        rationale.push(`• ${topDetail.answer}`);
      }
    }
  }

  if (tier === 'none') {
    rationale.push('✓ No formal care is needed right now. Return if circumstances change.');
  }

  return rationale.slice(0, 6);
}

// ------------------------------------------------------------------ //
// Guardrail helpers
// ------------------------------------------------------------------ //

function extractFlagsFromAnswers(answers, moduleData) {
  const flags = new Set();

  for (const section of moduleData.sections || []) {
    if (section.type === 'info' || !section.questions) continue;
    for (const question of section.questions) {
      const response = answers[question.id];
      if (!hasAnswer(response)) continue;

      if (Array.isArray(response)) {
        for (const option of question.options || []) {
          if (response.includes(option.value)) {
            (option.flags || []).forEach((flag) => flags.add(flag));
          }
        }
      } else {
        const option = (question.options || []).find((opt) => opt.value === response);
        (option?.flags || []).forEach((flag) => flags.add(flag));
      }
    }
  }

  return Array.from(flags);
}

function buildAllowedTiers(passesCognitiveGate) {
  const allowed = new Set(CANONICAL_TIERS);
  if (!passesCognitiveGate) {
    allowed.delete('memory_care');
    allowed.delete('memory_care_high_acuity');
    console.log('[GCP Scoring] Cognitive gate failed - removing memory care tiers');
  }
  return allowed;
}

function applyBehaviorGate(allowedTiers, cognitionBandValue, supportBandValue, riskyBehaviors) {
  const enabled = mcBehaviorGateEnabled();
  if (
    enabled &&
    cognitionBandValue === 'moderate' &&
    supportBandValue === 'high' &&
    !riskyBehaviors
  ) {
    allowedTiers.delete('memory_care');
    allowedTiers.delete('memory_care_high_acuity');
    console.log('[GCP Scoring] Behavior gate active (moderate×high without risky behaviors)');
  }
  return allowedTiers;
}

function cognitiveGate(answers, flags) {
  const dx = (answers.cognitive_dx_confirm || '').toLowerCase();
  if (dx !== 'dx_yes') {
    return false;
  }

  const mem = (answers.memory_changes || '').toLowerCase();
  if (mem === 'moderate' || mem === 'severe') {
    return true;
  }

  const behaviors = Array.isArray(answers.behaviors) ? answers.behaviors : [];
  const hasRiskyBehavior = behaviors.some((b) => COGNITIVE_HIGH_RISK.has((b || '').toLowerCase()));
  if (hasRiskyBehavior) {
    return true;
  }

  const flagSet = new Set((flags || []).map((flag) => flag.toLowerCase()));
  return Array.from(COGNITIVE_HIGH_RISK).some((flag) => flagSet.has(flag));
}

function cognitionBand(answers, flags) {
  const mem = (answers.memory_changes || '').toLowerCase();
  const behaviors = Array.isArray(answers.behaviors) ? answers.behaviors : [];
  const riskyCount = behaviors.reduce((count, entry) => {
    const key = (entry || '').toLowerCase();
    return count + (COGNITIVE_HIGH_RISK.has(key) ? 1 : 0);
  }, 0);

  if (mem === 'severe' || riskyCount >= 2) return 'high';
  if (mem === 'moderate' || riskyCount >= 1) return 'moderate';
  if (mem === 'mild') return 'mild';
  return 'none';
}

function supportBand(answers) {
  const badls = Array.isArray(answers.badls) ? answers.badls.length : 0;
  const iadls = Array.isArray(answers.iadls) ? answers.iadls.length : 0;
  const mobility = (answers.mobility || answers.mobility_status || '').toLowerCase();
  const falls = (answers.falls || '').toLowerCase();
  const meds = (answers.meds_complexity || '').toLowerCase();

  if (mobility === 'wheelchair' || mobility === 'bedbound' || (badls >= 3 && falls === 'multiple')) {
    return '24h';
  }
  if (badls >= 2 || (['walker', 'cane'].includes(mobility) && ['one', 'multiple'].includes(falls))) {
    return 'high';
  }
  if (iadls >= 2 || badls >= 1 || ['moderate', 'complex'].includes(meds)) {
    return 'moderate';
  }
  return 'low';
}

function cognitiveGateBehaviorsOnly(answers, flags) {
  const behaviors = new Set((answers.behaviors || []).map((b) => (b || '').toLowerCase()));
  const flagSet = new Set((flags || []).map((flag) => (flag || '').toLowerCase()));
  return Array.from(COGNITIVE_HIGH_RISK).some(
    (flag) => behaviors.has(flag) || flagSet.has(flag)
  );
}

function mcBehaviorGateEnabled() {
  const flag = process.env.FEATURE_GCP_MC_BEHAVIOR_GATE || 'off';
  return flag.toLowerCase() === 'on';
}

// ------------------------------------------------------------------ //
// Contract helpers
// ------------------------------------------------------------------ //

function determineNextProduct(tier, confidence) {
  if (confidence < 0.7 || tier === 'none') {
    return 'gcp';
  }
  return 'cost_planner';
}

function buildNextStep(tier, confidence) {
  if (determineNextProduct(tier, confidence) === 'cost_planner') {
    return {
      product: 'cost_planner',
      label: 'Estimate Care Costs',
      description: 'Use Cost Planner to understand monthly costs and affordability.',
    };
  }
  return {
    product: 'gcp',
    label: 'Review Guided Care Plan',
    description: 'Provide more detail so Navi can refine this recommendation.',
  };
}

function buildDerivedData(answers) {
  const movePreference = deriveMovePreference(answers);
  if (movePreference === null) return {};
  return {
    move_preference: movePreference,
    is_move_flexible: movePreference >= 3,
  };
}

function deriveMovePreference(answers) {
  const pref = answers.move_preference ?? answers.move_timeline ?? null;
  if (pref === null || pref === undefined) return null;
  const numeric = Number(pref);
  return Number.isNaN(numeric) ? null : numeric;
}

function buildFlagObjects(flagIds) {
  if (!Array.isArray(flagIds) || flagIds.length === 0) return [];
  return flagIds
    .map((id) => ({
      id,
      ...(FLAG_METADATA[id] || {
        label: id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        description: 'Important consideration from your answers.',
        tone: 'info',
        priority: 99,
      }),
    }))
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
}

function sortTiers(tiers) {
  return [...tiers].sort(
    (a, b) => CARE_TIER_ORDER.indexOf(a) - CARE_TIER_ORDER.indexOf(b)
  );
}

function generateSnapshotId(answers) {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(answers || {}));
  return hash.digest('hex').slice(0, 16);
}

function logAdjudication(detTier, finalTier, decision, llmAdvice) {
  const source = decision?.source || 'unknown';
  const reason = decision?.adjudication_reason || 'unknown';
  if (finalTier !== detTier && source === 'llm') {
    console.log('\n' + '🔥'.repeat(40));
    console.log('[DISAGREEMENT] LLM overrode deterministic engine!');
    console.log(`[DISAGREEMENT] Deterministic: ${detTier} → LLM: ${finalTier}`);
    console.log(`[DISAGREEMENT] Reason: ${reason}`);
    console.log('🔥'.repeat(40) + '\n');
  }

  const corrId = Math.random().toString(36).substring(2, 14);
  console.log(
    `[GCP_ADJ] chosen=${finalTier} llm=${llmAdvice?.tier || 'none'} det=${detTier} `
      + `source=${source} allowed=${(decision.allowed || []).join(',')} `
      + `reason=${reason} id=${corrId}`
  );
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

module.exports = {
  calculateRecommendation,
  TIER_THRESHOLDS,
  VALID_TIERS,
};
