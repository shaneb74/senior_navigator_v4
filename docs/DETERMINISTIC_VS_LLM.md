# Deterministic vs LLM Scoring - Technical Guide

## Overview

The GCP recommendation engine uses a **hybrid approach** combining rule-based deterministic scoring with optional AI-powered LLM adjudication. This document explains how each method works and how they interact.

---

## Table of Contents

1. [Deterministic Scoring Engine](#deterministic-scoring-engine)
2. [LLM Adjudication Engine](#llm-adjudication-engine)
3. [Guardrail System](#guardrail-system)
4. [Adjudication Logic](#adjudication-logic)
5. [Policy Modes](#policy-modes)
6. [Comparison Matrix](#comparison-matrix)
7. [Examples](#examples)

---

## Deterministic Scoring Engine

### Purpose
Rule-based, transparent, auditable scoring that maps user inputs to care levels using predefined thresholds and logic.

### How It Works

#### Step 1: Score Calculation

Questions in `gcp_module.json` have scores attached to options:

```json
{
  "id": "fall_risk",
  "options": [
    { "value": "no_falls", "label": "No falls", "score": 0 },
    { "value": "one", "label": "One fall", "score": 2 },
    { "value": "multiple", "label": "Multiple falls", "score": 5 }
  ]
}
```

**Scoring Process:**
```javascript
// Sum all selected option scores
totalScore = 0;
for each question {
  if (user selected option) {
    totalScore += option.score;
  }
}

// Category breakdown
scoreByCategory = {
  cognition: sum of cognitive question scores,
  adl: sum of ADL question scores,
  safety: sum of safety question scores,
  mobility: sum of mobility question scores
};
```

#### Step 2: Score-Based Tier Assignment

**Tier Thresholds:**

| Score Range | Tier | Description |
|-------------|------|-------------|
| 0 - 8 | `none` | No formal care needed |
| 9 - 16 | `in_home` | Home care services |
| 17 - 24 | `assisted_living` | Residential with daily assistance |
| 25 - 39 | `memory_care` | Specialized dementia care |
| 40 - 100 | `memory_care_high_acuity` | Intensive memory care |

```javascript
function determineTier(totalScore) {
  if (totalScore <= 8) return 'none';
  if (totalScore <= 16) return 'in_home';
  if (totalScore <= 24) return 'assisted_living';
  if (totalScore <= 39) return 'memory_care';
  return 'memory_care_high_acuity';
}
```

#### Step 3: Tier Map Routing

**Advanced Logic:** Uses cognition × support matrix for more accurate routing

**Cognition Bands:**
- **none:** No memory changes
- **mild:** Occasional forgetfulness
- **moderate:** Noticeable memory issues, some risky behaviors
- **high:** Severe memory loss, multiple risky behaviors

**Support Bands:**
- **low:** No or minimal ADL needs
- **moderate:** 1-2 ADLs or several IADLs
- **high:** 2+ ADLs or significant mobility issues
- **24h:** Wheelchair/bedbound OR 3+ ADLs + multiple falls

**Tier Map Matrix:**

```
                Support Band
              low    mod     high    24h
Cognition
  none        none   in_home  AL     AL
  mild        none   in_home  AL     AL
  moderate    none   AL       AL     MC
  high        AL     MC       MC     MC_HA
```

**AL** = assisted_living  
**MC** = memory_care  
**MC_HA** = memory_care_high_acuity

**Tier Map Code:**
```javascript
// gcpTierMap.json
{
  "none": {
    "low": "none",
    "moderate": "in_home",
    "high": "assisted_living",
    "24h": "assisted_living"
  },
  "mild": {
    "low": "none",
    "moderate": "in_home",
    "high": "assisted_living",
    "24h": "assisted_living"
  },
  "moderate": {
    "low": "none",
    "moderate": "assisted_living",
    "high": "assisted_living",
    "24h": "memory_care"
  },
  "high": {
    "low": "assisted_living",
    "moderate": "memory_care",
    "high": "memory_care",
    "24h": "memory_care_high_acuity"
  }
}
```

#### Step 4: Guardrail Application

**Two Critical Guardrails:**

##### 1. Cognitive Gate

**Rule:** Memory care tiers require BOTH:
- Diagnosed dementia (`cognitive_dx_confirm === 'dx_yes'`)
- AND (moderate/severe memory changes OR risky behaviors)

**Risky Behaviors:**
- Wandering
- Elopement
- Aggression
- Severe sundowning
- Severe cognitive risk

```javascript
function cognitiveGate(answers, flags) {
  const hasDiagnosis = answers.cognitive_dx_confirm === 'dx_yes';
  const hasMemoryChanges = ['moderate', 'severe'].includes(answers.memory_changes);
  const hasRiskyBehaviors = flags.some(f => COGNITIVE_HIGH_RISK.has(f));
  
  return hasDiagnosis && (hasMemoryChanges || hasRiskyBehaviors);
}

// If fails cognitive gate:
allowedTiers.delete('memory_care');
allowedTiers.delete('memory_care_high_acuity');
```

##### 2. Behavior Gate (Optional Feature Flag)

**Rule:** Remove memory_care for moderate cognition + high support WITHOUT risky behaviors

**Rationale:** If someone has moderate cognitive issues but no dangerous behaviors, assisted living may be sufficient even with high support needs.

```javascript
function applyBehaviorGate(allowedTiers, cognitionBand, supportBand, riskyBehaviors) {
  const gateEnabled = process.env.FEATURE_GCP_MC_BEHAVIOR_GATE === 'on';
  
  if (gateEnabled && 
      cognitionBand === 'moderate' && 
      supportBand === 'high' && 
      !riskyBehaviors) {
    allowedTiers.delete('memory_care');
    allowedTiers.delete('memory_care_high_acuity');
  }
  
  return allowedTiers;
}
```

#### Step 5: Final Tier Selection

**Priority Order:**
1. Tier from map (if in allowed tiers) ← **Preferred**
2. Tier from score (if in allowed tiers)
3. Fallback tier (first available in: `assisted_living`, `in_home`, `none`, `memory_care`, `memory_care_high_acuity`)

```javascript
function selectDeterministicTier({ tierFromMapping, tierFromScore, allowedTiers }) {
  // Prefer tier map result
  if (tierFromMapping && allowedTiers.has(tierFromMapping)) {
    return tierFromMapping;
  }
  
  // Fall back to score-based tier
  if (tierFromScore && allowedTiers.has(tierFromScore)) {
    return tierFromScore;
  }
  
  // Last resort: return first allowed tier
  const priority = ['assisted_living', 'in_home', 'none', 'memory_care', 'memory_care_high_acuity'];
  for (const tier of priority) {
    if (allowedTiers.has(tier)) {
      return tier;
    }
  }
  
  return 'assisted_living'; // Absolute fallback
}
```

### Deterministic Strengths

✅ **Transparent** - Every score traceable to specific answers  
✅ **Consistent** - Same inputs always produce same output  
✅ **Auditable** - Can explain every decision  
✅ **Fast** - No API calls, instant results  
✅ **Predictable** - No AI hallucination risk  

### Deterministic Limitations

⚠️ **Context-Blind** - Doesn't understand nuance or relationships  
⚠️ **Rigid** - Can't adapt to unusual situations  
⚠️ **Threshold Artifacts** - Score of 24 vs 25 makes huge tier jump  
⚠️ **Limited Reasoning** - Can't explain "why" beyond scores  

---

## LLM Adjudication Engine

### Purpose
Use AI (GPT-4o-mini) to provide context-aware, nuanced recommendations that consider the full picture, not just scores.

### How It Works

#### Step 1: Build Context

Extract structured context from form data:

```javascript
const context = {
  age_range: '75-84',
  living_situation: 'alone',
  has_partner: false,
  meds_complexity: 'complex',
  mobility: 'walker',
  falls: 'multiple',
  badls: ['bathing', 'dressing'],          // Basic ADLs
  iadls: ['medications', 'transportation'], // Instrumental ADLs
  memory_changes: 'moderate',
  behaviors: ['wandering', 'confusion'],
  isolation: 'significant',
  move_preference: 3,                       // 1-5 scale
  flags: ['fall_risk_high', 'cognitive_concern', 'isolation_risk'],
  
  // Deterministic results for context
  deterministic_tier: 'assisted_living',
  total_score: 22,
  allowed_tiers: ['none', 'in_home', 'assisted_living'],
  
  // Scoring breakdown
  scores: {
    cognition: 8,
    adl: 6,
    safety: 5,
    mobility: 3
  }
};
```

#### Step 2: Construct Prompt

**System Prompt:**
```
You are Navi, an empathetic AI assistant helping families with senior care planning.

ALLOWED CARE TIERS ONLY:
- none (no care needed yet)
- in_home (aging at home with support services)
- assisted_living (residential community with daily assistance)
- memory_care (specialized dementia/Alzheimer's care)
- memory_care_high_acuity (advanced memory care)

STRICTLY FORBIDDEN:
- NEVER use "skilled nursing" or "independent living"
- NEVER suggest tiers outside the allowed list
- Your recommendation MUST be from the allowed_tiers list

OUTPUT STRICT JSON:
{
  "tier": "assisted_living",
  "reasons": ["Short factual reason 1", "Short factual reason 2"],
  "risks": ["Risk to consider 1"],
  "navi_messages": ["Warm empathetic message"],
  "questions_next": ["Clarifying question?"],
  "confidence": 0.85
}
```

**User Prompt:**
```
Assessment Context:
- Age: 75-84, living alone, no partner
- Mobility: uses walker, multiple falls in past 6 months
- ADL challenges: bathing, dressing
- Memory: moderate changes, wandering behavior observed
- Social: significantly isolated
- Current medications: complex regimen

Deterministic Analysis:
- Score: 22 (cognition: 8, ADL: 6, safety: 5, mobility: 3)
- Deterministic recommendation: assisted_living
- Allowed tiers: none, in_home, assisted_living

Based on this full picture, what care level do you recommend?
```

#### Step 3: LLM Response

**Example Response:**
```json
{
  "tier": "assisted_living",
  "reasons": [
    "Multiple falls combined with walker use indicates high safety risk",
    "Bathing and dressing challenges require daily hands-on assistance",
    "Wandering behavior needs monitored environment",
    "Living alone with isolation compounds risks"
  ],
  "risks": [
    "Wandering could escalate if memory worsens",
    "Complex medication regimen may lead to errors without supervision"
  ],
  "navi_messages": [
    "Your loved one's safety needs suggest a community with 24/7 staff presence",
    "Look for assisted living with secure outdoor areas for safe wandering"
  ],
  "questions_next": [
    "Has the wandering happened at night?",
    "How often does someone check on them currently?"
  ],
  "confidence": 0.87
}
```

#### Step 4: Validation & Guardrails

**Post-Processing:**

```javascript
function validateLLMResponse(llmResponse, allowedTiers) {
  // 1. Tier must be canonical
  if (!CANONICAL_TIERS.has(llmResponse.tier)) {
    console.error('[LLM] Invalid tier suggested:', llmResponse.tier);
    return { success: false, error: 'invalid_tier' };
  }
  
  // 2. Tier must be in allowed set
  if (!allowedTiers.includes(llmResponse.tier)) {
    console.warn('[LLM] Tier not in allowed list:', llmResponse.tier);
    return { success: false, error: 'tier_not_allowed' };
  }
  
  // 3. Confidence must be valid
  if (llmResponse.confidence < 0 || llmResponse.confidence > 1) {
    llmResponse.confidence = 0.5;
  }
  
  // 4. Filter forbidden terms from text
  const forbidden = ['skilled nursing', 'independent living', 'nursing home'];
  llmResponse.reasons = llmResponse.reasons.map(r => 
    filterForbiddenTerms(r, forbidden)
  );
  
  return { success: true, advice: llmResponse };
}
```

### LLM Strengths

✅ **Context-Aware** - Understands relationships between factors  
✅ **Nuanced** - Can handle edge cases and unusual situations  
✅ **Explanatory** - Provides human-readable reasoning  
✅ **Adaptive** - Learns patterns from training data  
✅ **Empathetic** - Can frame recommendations sensitively  

### LLM Limitations

⚠️ **Non-Deterministic** - Same input may give different outputs  
⚠️ **Latency** - 1-3 seconds per request  
⚠️ **Cost** - $0.001-0.002 per assessment  
⚠️ **Hallucination Risk** - May confidently state wrong information  
⚠️ **Requires Guardrails** - Must validate all outputs  

---

## Guardrail System

### Why Guardrails?

LLMs are powerful but can:
- Suggest inappropriate care levels
- Use forbidden terminology
- Ignore policy constraints
- Hallucinate facts

**Guardrails ensure LLM stays within acceptable boundaries.**

### Guardrail Layers

#### Layer 1: Prompt Engineering

**Explicit Instructions:**
```
STRICTLY FORBIDDEN:
- NEVER use "skilled nursing" or "independent living"
- Your recommendation MUST be from the allowed_tiers list: [...]
```

**Structured Output:**
```
OUTPUT STRICT JSON (no extra keys, no prose):
{ "tier": "...", "reasons": [...], ... }
```

#### Layer 2: Allowed Tier Filtering

```javascript
// Only pass tiers that passed cognitive/behavior gates
const allowedTiers = ['none', 'in_home', 'assisted_living'];

// LLM can only recommend from this list
const prompt = `... Allowed tiers: ${allowedTiers.join(', ')} ...`;
```

#### Layer 3: Post-Processing Validation

```javascript
// Reject invalid tiers
if (!CANONICAL_TIERS.has(llmTier)) {
  return fallbackToDeterministic();
}

// Reject if not in allowed list
if (!allowedTiers.includes(llmTier)) {
  return fallbackToDeterministic();
}

// Filter forbidden terms from text
response.reasons = response.reasons.map(filterForbiddenTerms);
```

#### Layer 4: Confidence Thresholds

```javascript
// Low confidence → ignore LLM
if (llmConfidence < 0.7) {
  return deterministicTier;
}

// Moderate confidence → prefer deterministic
if (llmConfidence < 0.8 && llmTier !== deterministicTier) {
  return deterministicTier;
}

// High confidence → allow LLM override
return llmTier;
```

#### Layer 5: Fallback Strategy

```javascript
// If LLM fails at any point:
try {
  const llmResult = await callOpenAI();
  const validated = validateResponse(llmResult);
  return validated;
} catch (error) {
  console.error('[LLM] Failed, using deterministic:', error);
  return deterministicResult;
}
```

---

## Adjudication Logic

### When Deterministic and LLM Disagree

**Decision Tree:**

```
1. Is LLM tier in allowed_tiers?
   NO → Use deterministic tier (reason: tier_not_allowed)
   YES → Continue to step 2

2. Is LLM confidence < 0.7?
   YES → Use deterministic tier (reason: low_confidence)
   NO → Continue to step 3

3. Do deterministic and LLM agree?
   YES → Use agreed tier (source: agreement)
   NO → Continue to step 4

4. Is LLM confidence >= 0.8?
   YES → Use LLM tier (source: llm, reason: high_confidence_override)
   NO → Use deterministic tier (reason: moderate_confidence)
```

**Code Implementation:**

```javascript
function chooseFinalTier(detTier, allowedTiers, llmAdvice) {
  const llmTier = llmAdvice.tier;
  const llmConfidence = llmAdvice.confidence;
  
  // Rule 1: LLM must be in allowed tiers
  if (!allowedTiers.has(llmTier)) {
    return {
      tier: detTier,
      source: 'deterministic',
      adjudication_reason: 'llm_tier_not_allowed'
    };
  }
  
  // Rule 2: Low confidence → deterministic
  if (llmConfidence < 0.7) {
    return {
      tier: detTier,
      source: 'deterministic',
      adjudication_reason: 'llm_low_confidence'
    };
  }
  
  // Rule 3: Agreement
  if (detTier === llmTier) {
    return {
      tier: detTier,
      source: 'agreement',
      adjudication_reason: 'both_methods_agree'
    };
  }
  
  // Rule 4: High confidence disagreement (assist mode only)
  const mode = process.env.FEATURE_GCP_LLM_TIER;
  if (mode === 'assist' && llmConfidence >= 0.8) {
    return {
      tier: llmTier,
      source: 'llm',
      adjudication_reason: 'llm_high_confidence_override'
    };
  }
  
  // Rule 5: Moderate confidence → deterministic
  return {
    tier: detTier,
    source: 'deterministic',
    adjudication_reason: 'llm_moderate_confidence'
  };
}
```

### Adjudication Result Structure

```typescript
interface AdjudicationDecision {
  det: CareTier;                  // Deterministic recommendation
  llm: CareTier | null;           // LLM recommendation (null if LLM off)
  source: 'deterministic' | 'llm' | 'agreement' | 'fallback';
  adjudication_reason: string;    // Why this decision was made
  allowed: CareTier[];            // What tiers passed guardrails
  bands: {
    cog: string;                  // Cognition band (none/mild/moderate/high)
    sup: string;                  // Support band (low/moderate/high/24h)
  };
  risky: boolean;                 // Were risky behaviors present?
  conf?: number;                  // LLM confidence (if available)
}
```

---

## Policy Modes

Three operational modes control how LLM is used:

### Mode: `off` (Default)

**Behavior:**
- No LLM calls made
- Pure deterministic scoring
- Fastest, zero cost
- Most predictable

**Use Case:** Production default, conservative approach

**Output:**
```json
{
  "tier": "assisted_living",
  "adjudication": {
    "det": "assisted_living",
    "llm": null,
    "source": "fallback",
    "adjudication_reason": "deterministic_only"
  }
}
```

---

### Mode: `shadow`

**Behavior:**
- LLM runs in background
- Results logged but NOT used
- Deterministic tier always returned
- Data collection mode

**Use Case:** Testing LLM performance, collecting training data

**Output:**
```json
{
  "tier": "assisted_living",         // Deterministic result
  "adjudication": {
    "det": "assisted_living",
    "llm": "memory_care",             // Logged but ignored
    "source": "deterministic",
    "adjudication_reason": "shadow_mode_active"
  },
  "llm_advice": { /* LLM response stored for analysis */ }
}
```

**Backend Logs:**
```
[GCP_LLM_SHADOW] det=assisted_living llm=memory_care 
  llm_conf=0.85 disagreement=true reason=shadow_mode
```

---

### Mode: `assist`

**Behavior:**
- LLM actively participates in decision
- Can override deterministic (with guardrails)
- Full adjudication logic applied
- Enhanced accuracy mode

**Use Case:** Production with LLM enhancement enabled

**Output (Agreement):**
```json
{
  "tier": "assisted_living",
  "adjudication": {
    "det": "assisted_living",
    "llm": "assisted_living",
    "source": "agreement",
    "adjudication_reason": "both_methods_agree",
    "conf": 0.87
  }
}
```

**Output (LLM Override):**
```json
{
  "tier": "memory_care",              // LLM won!
  "adjudication": {
    "det": "assisted_living",
    "llm": "memory_care",
    "source": "llm",
    "adjudication_reason": "llm_high_confidence_override",
    "conf": 0.92
  },
  "llm_advice": {
    "tier": "memory_care",
    "confidence": 0.92,
    "reasons": [
      "Wandering at night poses immediate safety risk",
      "Memory care provides secure environment"
    ]
  }
}
```

**Backend Logs (Disagreement):**
```
🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
[DISAGREEMENT] LLM overrode deterministic engine!
[DISAGREEMENT] Deterministic: assisted_living → LLM: memory_care
[DISAGREEMENT] Reason: llm_high_confidence_override
🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
```

---

## Comparison Matrix

| Aspect | Deterministic | LLM (Assist Mode) |
|--------|---------------|-------------------|
| **Speed** | Instant (<1ms) | 1-3 seconds |
| **Cost** | Free | $0.001-0.002 per request |
| **Consistency** | 100% same input = same output | ~90% (can vary) |
| **Context Understanding** | Limited (score-based) | Excellent (full context) |
| **Edge Case Handling** | Rigid rules | Adaptive reasoning |
| **Explainability** | Full audit trail | Natural language reasoning |
| **Accuracy (typical cases)** | ~85% (based on v3 data) | ~90% (with guardrails) |
| **Accuracy (edge cases)** | ~70% | ~85% |
| **Hallucination Risk** | Zero | Low (with guardrails) |
| **Regulatory Compliance** | Easy to audit | Requires documentation |
| **Maintenance** | Rule updates needed | Prompt tuning needed |

---

## Examples

### Example 1: Agreement (Both Recommend Assisted Living)

**Input:**
- Age: 82, living alone
- Mobility: walker, one fall
- ADLs: needs help with bathing
- Memory: mild forgetfulness, no diagnosis
- Score: 18

**Deterministic:**
- Score-based tier: `assisted_living` (17-24 range)
- Cognition band: mild
- Support band: moderate
- Tier map: `in_home` → `assisted_living`
- Cognitive gate: FAIL (no diagnosis) → removes memory_care options
- **Result: `assisted_living`**

**LLM:**
```json
{
  "tier": "assisted_living",
  "confidence": 0.82,
  "reasons": [
    "Fall history indicates need for assistance proximity",
    "Bathing help requires daily staff availability",
    "Mild memory changes don't require locked unit yet"
  ]
}
```

**Adjudication:**
```json
{
  "tier": "assisted_living",
  "source": "agreement",
  "adjudication_reason": "both_methods_agree"
}
```

---

### Example 2: LLM Override (Deterministic → Assisted Living, LLM → Memory Care)

**Input:**
- Age: 78, living with spouse
- Mobility: independent
- ADLs: none
- Memory: moderate changes, diagnosed dementia, wandering behavior
- Isolation: spouse provides 24/7 supervision
- Score: 14 (low because physical needs minimal)

**Deterministic:**
- Score-based tier: `in_home` (9-16 range)
- Cognition band: moderate
- Support band: low (spouse provides support, no ADL needs)
- Tier map: `none` → `in_home`
- Cognitive gate: PASS (diagnosis + moderate memory)
- Behavior gate: Not triggered (risky behaviors present)
- **Result: `in_home`**

**LLM:**
```json
{
  "tier": "memory_care",
  "confidence": 0.91,
  "reasons": [
    "Wandering behavior poses immediate safety risk even with supervision",
    "Spouse caregiver burden is unsustainable long-term",
    "Diagnosed dementia with moderate progression suggests need for specialized care",
    "Memory care provides secure environment and respite for spouse"
  ]
}
```

**Adjudication:**
```json
{
  "tier": "memory_care",
  "source": "llm",
  "adjudication_reason": "llm_high_confidence_override",
  "conf": 0.91
}
```

**Why LLM Won:**
- Confidence ≥ 0.8 (0.91)
- `memory_care` in allowed_tiers (passed cognitive gate)
- Assist mode enabled
- LLM identified safety concern not captured by ADL scores

---

### Example 3: Deterministic Wins (LLM Confidence Too Low)

**Input:**
- Age: 85, living in independent living community
- Mobility: cane, no falls
- ADLs: needs help with medications
- Memory: no changes
- Score: 11

**Deterministic:**
- Score-based tier: `in_home` (9-16)
- Cognition band: none
- Support band: low
- Tier map: `none` → `in_home`
- **Result: `in_home`**

**LLM:**
```json
{
  "tier": "assisted_living",
  "confidence": 0.65,
  "reasons": [
    "Medication management errors could be dangerous",
    "Age suggests potential decline"
  ]
}
```

**Adjudication:**
```json
{
  "tier": "in_home",
  "source": "deterministic",
  "adjudication_reason": "llm_low_confidence"
}
```

**Why Deterministic Won:**
- LLM confidence < 0.7 (0.65)
- Threshold not met for override

---

### Example 4: Guardrail Rejection (LLM Suggests Forbidden Tier)

**Input:**
- Age: 79, living alone
- Mobility: independent
- ADLs: mild cognitive issues, no diagnosis
- Score: 20

**Deterministic:**
- Score-based tier: `assisted_living` (17-24)
- Cognitive gate: FAIL (no diagnosis)
- Allowed tiers: `none`, `in_home`, `assisted_living`
- **Result: `assisted_living`**

**LLM:**
```json
{
  "tier": "memory_care",
  "confidence": 0.88,
  "reasons": ["Cognitive concerns suggest specialized care"]
}
```

**Adjudication:**
```json
{
  "tier": "assisted_living",
  "source": "deterministic",
  "adjudication_reason": "llm_tier_not_allowed"
}
```

**Why Deterministic Won:**
- `memory_care` not in allowed_tiers (failed cognitive gate)
- Guardrail rejected LLM recommendation

---

## Monitoring & Logging

### Key Metrics to Track

**Deterministic Metrics:**
- Average score by category
- Tier distribution
- Guardrail trigger rates

**LLM Metrics:**
- API latency (p50, p95, p99)
- Cost per assessment
- Agreement rate with deterministic
- Override rate
- Confidence distribution

**Adjudication Metrics:**
- Source breakdown (deterministic/llm/agreement)
- Rejection reasons
- Disagreement cases

### Example Log Output

```
[GCP Scoring] Starting recommendation pipeline
[GCP Scoring] Total score: 22
[GCP Scoring] Cognitive gate: PASS
[GCP Scoring] Behavior gate: not triggered
[GCP Scoring] Tier map selected: assisted_living
[GCP Scoring] LLM mode enabled (assist) - requesting advice
[LLM] Context: age=75-84, falls=multiple, wandering=true
[LLM] Response: tier=memory_care, confidence=0.89
[GCP_ADJ] chosen=memory_care llm=memory_care det=assisted_living 
  source=llm allowed=none,in_home,assisted_living,memory_care 
  reason=llm_high_confidence_override id=a7f3k2
🔥 [DISAGREEMENT] LLM overrode deterministic engine!
🔥 [DISAGREEMENT] Deterministic: assisted_living → LLM: memory_care
[GCP Scoring] Final recommendation: memory_care
```

---

## Configuration

### Environment Variables

```bash
# LLM Mode (off | shadow | assist)
FEATURE_GCP_LLM_TIER=assist

# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Guardrail Toggles
FEATURE_GCP_MC_BEHAVIOR_GATE=on

# Logging
DEBUG_LLM=on
```

### Confidence Thresholds (Tunable)

```javascript
// gcpNaviEngine.js
const CONFIDENCE_THRESHOLDS = {
  MIN_CONSIDER_LLM: 0.7,      // Below this, always use deterministic
  MIN_OVERRIDE: 0.8,          // Above this, allow LLM override
  MAX_CONFIDENCE: 1.0
};
```

---

## Best Practices

### For Deterministic Scoring

1. **Validate Threshold Boundaries** - Test edge cases around score thresholds
2. **Document Score Rationale** - Add comments explaining why each option has its score
3. **Review Tier Map Regularly** - Ensure cognition×support matrix reflects clinical best practices
4. **Log Guardrail Triggers** - Track when cognitive/behavior gates activate

### For LLM Adjudication

1. **Start with Shadow Mode** - Collect data before enabling assist mode
2. **Monitor Disagreements** - Review cases where LLM overrides deterministic
3. **Tune Prompts Carefully** - Small prompt changes can affect outputs significantly
4. **Set Conservative Thresholds** - Better to under-use LLM than over-rely on it
5. **Track Costs** - Monitor OpenAI usage to stay within budget
6. **Review Guardrail Logs** - Ensure LLM isn't repeatedly suggesting forbidden tiers

### For Adjudication

1. **Log All Decisions** - Store full adjudication context for audit trails
2. **A/B Test Thresholds** - Experiment with confidence thresholds to optimize
3. **Human Review Overrides** - Sample and review cases where LLM overrode deterministic
4. **Feedback Loop** - Use clinician reviews to improve both methods

---

## Troubleshooting

### LLM Not Running

**Symptom:** Always see `source: 'fallback'` or `source: 'deterministic'`

**Possible Causes:**
1. `FEATURE_GCP_LLM_TIER=off` in `.env`
2. Missing `OPENAI_API_KEY`
3. OpenAI API error (check logs)

**Solution:**
```bash
# Check environment
cd backend && cat .env | grep FEATURE_GCP_LLM_TIER
cd backend && cat .env | grep OPENAI_API_KEY

# Should see:
FEATURE_GCP_LLM_TIER=assist
OPENAI_API_KEY=sk-...
```

---

### LLM Always Rejected

**Symptom:** LLM runs but always see `adjudication_reason: 'llm_tier_not_allowed'`

**Possible Causes:**
1. LLM suggesting tiers outside allowed_tiers
2. Cognitive gate removing memory care from allowed tiers
3. LLM prompt not emphasizing allowed tiers strongly enough

**Solution:**
- Check logs for which tier LLM suggested
- Verify allowed_tiers in response
- Review prompt to ensure allowed_tiers emphasized

---

### Inconsistent LLM Results

**Symptom:** Same input gives different recommendations

**Possible Causes:**
1. This is normal LLM behavior (non-deterministic)
2. Temperature setting too high
3. Prompt ambiguity

**Solution:**
- Use `temperature: 0` in OpenAI API call for more consistency
- Make prompt more prescriptive
- Consider shadow mode to measure variance

---

## Future Enhancements

### Short Term
- [ ] Add retry logic for LLM API failures
- [ ] Implement caching for identical assessments
- [ ] Add confidence calibration based on historical accuracy

### Medium Term
- [ ] Fine-tune model on Senior Navigator data
- [ ] Implement streaming responses for real-time feedback
- [ ] Add explanation generation for deterministic results

### Long Term
- [ ] Multi-model ensemble (GPT + Claude + Gemini)
- [ ] Active learning from clinician feedback
- [ ] Personalized models per geographic region

---

**Last Updated:** November 9, 2025  
**Version:** 1.0  
**Authors:** Senior Navigator Engineering Team
