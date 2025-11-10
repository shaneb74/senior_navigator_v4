/**
 * GCP Navi Engine - LLM-powered care recommendations with guardrails
 * 
 * Port of Python ai/gcp_navi_engine.py
 * Enforces canonical tier restrictions and filters forbidden terms.
 */

const { generateJSON } = require('./llmClient');

// Canonical tier values - ONLY these are allowed
const CANONICAL_TIERS = new Set([
  'none',
  'in_home',
  'assisted_living',
  'memory_care',
  'memory_care_high_acuity'
]);

// Forbidden terms that should never appear
const FORBIDDEN_TERMS = ['skilled nursing', 'independent living'];

// System prompt for GCP Navi
const GCP_NAVI_SYSTEM_PROMPT = `You are Navi, an empathetic AI assistant helping families with senior care planning recommendations.

Your role is to provide contextual, evidence-based care tier recommendations based on the user's situation.

ALLOWED CARE TIERS ONLY:
- none (no care needed yet)
- in_home (aging at home with support services)
- assisted_living (residential community with daily assistance)
- memory_care (specialized dementia/Alzheimer's care in secure setting)
- memory_care_high_acuity (advanced memory care with intensive supervision)

STRICTLY FORBIDDEN:
- NEVER use the terms "skilled nursing" or "independent living"
- NEVER suggest care tiers outside the allowed list above
- NEVER use terms like "nursing home" or "SNF" (skilled nursing facility)

OUTPUT REQUIREMENTS:
- Output STRICT JSON matching the required schema—no extra keys, no prose outside the JSON
- Your recommendation must be one of the 5 allowed tiers above
- Reasons must be short (1 sentence), factual, traceable to context fields
- Navi messages should be warm, empathetic, actionable (1-2 sentences each)
- Keep responses concise and focused on user's specific context

RESPONSE FORMAT (strict JSON):
{
  "tier": "assisted_living",
  "reasons": ["Short factual reason 1", "Short factual reason 2"],
  "risks": ["Risk to consider 1", "Risk to consider 2"],
  "navi_messages": ["Warm message 1", "Supportive message 2"],
  "questions_next": ["Clarifying question 1?", "Clarifying question 2?"],
  "confidence": 0.85
}`;

const GCP_NAVI_DEVELOPER_PROMPT = `DEVELOPER INSTRUCTIONS:

1. The deterministic engine will validate your tier recommendation; align with the facts provided.

2. If uncertain between two tiers, select the closest allowed tier and add at most one clarifying question in questions_next.

3. Reasons must be short, factual, derived from context fields (not generic statements).

4. Base your recommendation on:
   - Mobility and fall risk
   - ADL/IADL challenges (badls, iadls)
   - Memory/cognitive changes and behaviors
   - Medication complexity
   - Social isolation and living situation
   - Partner support availability

5. Confidence scoring:
   - 0.9-1.0: Clear indicators align strongly with one tier
   - 0.7-0.89: Good fit with minor uncertainties
   - 0.5-0.69: Moderate fit, clarifying questions needed
   - Below 0.5: Insufficient information or borderline case

6. Your recommendation is advisory; the deterministic engine has final authority.`;

/**
 * Build GCP context from form data for LLM prompt
 * @param {object} formData - User's form answers
 * @param {object} scores - Extracted scores by category
 * @param {Array<string>} flags - Risk flags
 * @returns {object} Structured context for LLM
 */
function buildGCPContext(formData, scores, flags) {
  const context = {
    age_range: formData.age_range || 'unknown',
    living_situation: formData.living_situation || 'unknown',
    has_partner: formData.has_partner === 'yes',
    meds_complexity: formData.medication_management || 'simple',
    mobility: formData.mobility_status || 'independent',
    falls: formData.fall_risk || 'no_falls',
    badls: extractList(formData, 'adl_challenges'),
    iadls: extractList(formData, 'iadl_challenges'),
    memory_changes: formData.memory_concerns || 'no_changes',
    behaviors: extractList(formData, 'behavior_concerns'),
    isolation: formData.social_isolation || 'minimal',
    move_preference: formData.move_timeline ? parseInt(formData.move_timeline) : null,
    flags: flags || []
  };

  return context;
}

/**
 * Extract list values from form data (handles multi-select)
 */
function extractList(formData, key) {
  const value = formData[key];
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

/**
 * Build user prompt from context
 */
function buildUserPrompt(context) {
  const prompt = `USER CONTEXT (JSON):

${JSON.stringify(context, null, 2)}

Based on this context, provide your care tier recommendation following the strict JSON format specified in the system prompt.
Remember: Only use the 5 allowed tiers. Never mention skilled nursing or independent living.`;

  return prompt;
}

/**
 * Filter forbidden terms from LLM response
 */
function filterForbiddenTerms(advice) {
  const containsForbidden = (text) => {
    const textLower = text.toLowerCase();
    return FORBIDDEN_TERMS.some(term => textLower.includes(term));
  };

  // Filter lists
  if (advice.reasons) {
    advice.reasons = advice.reasons.filter(r => !containsForbidden(r));
  }
  if (advice.risks) {
    advice.risks = advice.risks.filter(r => !containsForbidden(r));
  }
  if (advice.navi_messages) {
    advice.navi_messages = advice.navi_messages.filter(m => !containsForbidden(m));
  }
  if (advice.questions_next) {
    advice.questions_next = advice.questions_next.filter(q => !containsForbidden(q));
  }

  return advice;
}

/**
 * Validate LLM advice response
 */
function validateAdvice(advice) {
  if (!advice || typeof advice !== 'object') {
    return { valid: false, error: 'Invalid response format' };
  }

  // Check required fields
  if (!advice.tier) {
    return { valid: false, error: 'Missing tier field' };
  }

  // Validate tier is canonical
  if (!CANONICAL_TIERS.has(advice.tier)) {
    return { valid: false, error: `Non-canonical tier: ${advice.tier}` };
  }

  // Validate confidence
  if (typeof advice.confidence !== 'number' || advice.confidence < 0 || advice.confidence > 1) {
    return { valid: false, error: 'Invalid confidence value' };
  }

  // Ensure arrays exist
  advice.reasons = advice.reasons || [];
  advice.risks = advice.risks || [];
  advice.navi_messages = advice.navi_messages || [];
  advice.questions_next = advice.questions_next || [];

  return { valid: true };
}

/**
 * Generate LLM-powered care recommendation
 * @param {object} formData - User's form answers
 * @param {object} scores - Extracted scores by category
 * @param {Array<string>} flags - Risk flags
 * @param {string} mode - LLM mode: 'off', 'shadow', 'assist'
 * @param {Array<string>} allowedTiers - Optional tier restrictions (cognitive gate)
 * @returns {Promise<{success: boolean, advice: object|null}>}
 */
async function generateGCPAdvice(formData, scores, flags, mode = 'off', allowedTiers = null) {
  // Mode validation
  if (mode === 'off') {
    return { success: false, advice: null };
  }

  if (!['off', 'shadow', 'assist'].includes(mode)) {
    console.log(`[GCP_LLM_WARN] Invalid mode: ${mode}. Using 'off'.`);
    return { success: false, advice: null };
  }

  try {
    // Build context
    const context = buildGCPContext(formData, scores, flags);

    // Build system prompt
    let systemPrompt = GCP_NAVI_SYSTEM_PROMPT + '\n\n' + GCP_NAVI_DEVELOPER_PROMPT;

    // Add allowed tiers constraint if provided
    if (allowedTiers && allowedTiers.length > 0) {
      const allowedList = allowedTiers.sort().join(', ');
      const tierConstraint = `\n\nIMPORTANT: Due to cognitive assessment results, you must choose ONE tier from this restricted list ONLY: ${allowedList}`;
      systemPrompt += tierConstraint;
    }

    // Build user prompt
    const userPrompt = buildUserPrompt(context);

    console.log(`[GCP_LLM_${mode.toUpperCase()}] Generating advice...`);

    // Call LLM
    const response = await generateJSON(systemPrompt, userPrompt);

    if (!response) {
      console.log(`[GCP_LLM_${mode.toUpperCase()}] LLM returned null`);
      return { success: false, advice: null };
    }

    // Validate response
    const validation = validateAdvice(response);
    if (!validation.valid) {
      console.log(`[GCP_LLM_${mode.toUpperCase()}] Validation failed: ${validation.error}`);
      return { success: false, advice: null };
    }

    let advice = response;

    // Check allowed tiers constraint
    if (allowedTiers && allowedTiers.length > 0 && !allowedTiers.includes(advice.tier)) {
      console.log(`[GCP_LLM_SKIP] tier '${advice.tier}' not in allowed_tiers ${allowedTiers.sort()}`);
      return { success: false, advice: null };
    }

    // Filter forbidden terms
    advice = filterForbiddenTerms(advice);

    console.log(`[GCP_LLM_${mode.toUpperCase()}] Success: tier=${advice.tier} conf=${advice.confidence.toFixed(2)}`);

    return { success: true, advice };

  } catch (error) {
    console.error(`[GCP_LLM_ERROR] Unexpected error:`, error.message);
    return { success: false, advice: null };
  }
}

/**
 * Choose final tier using adjudication logic
 * @param {string} detTier - Deterministic tier
 * @param {Set<string>} allowedTiers - Allowed tiers (cognitive gate)
 * @param {string|null} llmTier - LLM recommended tier
 * @param {number|null} llmConf - LLM confidence
 * @param {object} bands - Cognitive and supervision bands
 * @param {boolean} risky - Has risky behaviors
 * @returns {{tier: string, decision: object}}
 */
function chooseFinalTier(detTier, allowedTiers, llmTier, llmConf, bands, risky) {
  const allowed = Array.from(allowedTiers).sort();
  const decision = {
    det: detTier,
    llm: llmTier,
    conf: llmConf,
    allowed,
    bands,
    risky,
    source: 'fallback',
    adjudication_reason: 'unknown',
  };

  // Edge case: neither engine produced a tier
  if (!detTier && !llmTier) {
    decision.adjudication_reason = 'double_missing_default';
    return { tier: 'assisted_living', decision };
  }

  // Prefer the LLM tier when it exists and passes guardrails
  if (llmTier && allowedTiers.has(llmTier)) {
    decision.source = 'llm';
    decision.adjudication_reason = 'llm_valid';
    return { tier: llmTier, decision };
  }

  if (llmTier == null) {
    decision.adjudication_reason = 'llm_timeout';
  } else if (!allowedTiers.has(llmTier)) {
    decision.adjudication_reason = 'llm_guard_disallow';
  } else {
    decision.adjudication_reason = 'llm_invalid_unknown';
  }

  // Fall back to deterministic recommendation
  decision.source = 'fallback';
  return { tier: detTier || 'assisted_living', decision };
}

module.exports = {
  generateGCPAdvice,
  chooseFinalTier,
  CANONICAL_TIERS,
};
