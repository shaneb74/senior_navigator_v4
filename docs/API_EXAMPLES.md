# GCP API Examples

**Real curl commands you can run immediately to test the GCP assessment API.**

---

## Prerequisites

1. Backend running on `http://localhost:3000`
2. OpenAI API key configured in `backend/.env`
3. `curl` installed (comes with macOS/Linux)

Start backend:
```bash
cd backend
node server.js
```

---

## Example 1: Basic Assessment (Deterministic Only)

**Scenario:** Independent senior with mild forgetfulness

```bash
curl -X POST http://localhost:3000/api/gcp/assess \
  -H "Content-Type: application/json" \
  -d '{
    "formData": {
      "memory_changes": "mild",
      "fall_risk": "no",
      "adl_bathing": "independent",
      "adl_dressing": "independent",
      "support_availability": "family_nearby"
    },
    "config": {
      "tierThresholds": {
        "none": [0, 8],
        "in_home": [9, 16],
        "assisted_living": [17, 24],
        "memory_care": [25, 39],
        "memory_care_high_acuity": [40, 100]
      }
    },
    "options": {
      "llm_mode": "off"
    }
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "deterministic": {
      "tier": "none",
      "score": 5,
      "confidence": 0.95,
      "flags": [],
      "rationale": "Low cognitive concerns, independent ADLs, strong support"
    },
    "llm": null,
    "adjudication": {
      "final_tier": "none",
      "source": "deterministic",
      "override": false,
      "reason": "LLM disabled"
    }
  }
}
```

---

## Example 2: Moderate Needs (LLM Assist Mode)

**Scenario:** Senior with moderate memory issues and fall risk

```bash
curl -X POST http://localhost:3000/api/gcp/assess \
  -H "Content-Type: application/json" \
  -d '{
    "formData": {
      "memory_changes": "moderate",
      "fall_risk": "yes",
      "wandering": "no",
      "adl_bathing": "needs_help",
      "adl_dressing": "needs_help",
      "medication_management": "needs_reminders",
      "support_availability": "family_part_time"
    },
    "config": {
      "tierThresholds": {
        "none": [0, 8],
        "in_home": [9, 16],
        "assisted_living": [17, 24],
        "memory_care": [25, 39],
        "memory_care_high_acuity": [40, 100]
      }
    },
    "options": {
      "llm_mode": "assist"
    }
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "deterministic": {
      "tier": "assisted_living",
      "score": 18,
      "confidence": 0.85,
      "flags": ["fall_risk", "memory_moderate"],
      "rationale": "Moderate cognitive decline + ADL needs + fall risk"
    },
    "llm": {
      "tier": "assisted_living",
      "confidence": 0.88,
      "rationale": "Given memory issues, fall risk, and need for ADL assistance, assisted living provides appropriate 24/7 supervision and support. Family availability alone insufficient for safety needs.",
      "model": "gpt-4o-mini",
      "tokens_used": 245
    },
    "adjudication": {
      "final_tier": "assisted_living",
      "source": "deterministic",
      "override": false,
      "reason": "LLM agrees with deterministic recommendation"
    }
  }
}
```

---

## Example 3: LLM Override (High Acuity Case)

**Scenario:** Severe dementia with wandering, deterministic recommends memory care, LLM upgrades to high acuity

```bash
curl -X POST http://localhost:3000/api/gcp/assess \
  -H "Content-Type: application/json" \
  -d '{
    "formData": {
      "memory_changes": "severe",
      "wandering": "yes",
      "aggression": "yes",
      "fall_risk": "yes",
      "adl_bathing": "needs_full_help",
      "adl_dressing": "needs_full_help",
      "adl_eating": "needs_help",
      "medication_management": "cannot_manage",
      "support_availability": "none"
    },
    "config": {
      "tierThresholds": {
        "none": [0, 8],
        "in_home": [9, 16],
        "assisted_living": [17, 24],
        "memory_care": [25, 39],
        "memory_care_high_acuity": [40, 100]
      }
    },
    "options": {
      "llm_mode": "assist"
    }
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "deterministic": {
      "tier": "memory_care",
      "score": 38,
      "confidence": 0.80,
      "flags": ["severe_cognitive", "wandering", "aggression", "fall_risk"],
      "rationale": "Severe cognitive decline + multiple safety flags + complete ADL dependence"
    },
    "llm": {
      "tier": "memory_care_high_acuity",
      "confidence": 0.92,
      "rationale": "Combination of severe dementia, wandering, aggressive behaviors, fall risk, and complete ADL dependence requires specialized high-acuity memory care with enhanced staffing ratios and behavioral expertise. Standard memory care insufficient for safety and behavioral management needs.",
      "model": "gpt-4o-mini",
      "tokens_used": 312
    },
    "adjudication": {
      "final_tier": "memory_care_high_acuity",
      "source": "llm",
      "override": true,
      "reason": "LLM identified need for higher acuity level with confidence 0.92; meets guardrail criteria (adjacent tier, severe flags present)"
    }
  }
}
```

---

## Example 4: LLM Fallback (Low Confidence)

**Scenario:** Borderline case where LLM is uncertain

```bash
curl -X POST http://localhost:3000/api/gcp/assess \
  -H "Content-Type: application/json" \
  -d '{
    "formData": {
      "memory_changes": "mild",
      "fall_risk": "no",
      "adl_bathing": "independent",
      "adl_dressing": "needs_help",
      "support_availability": "family_full_time"
    },
    "config": {
      "tierThresholds": {
        "none": [0, 8],
        "in_home": [9, 16],
        "assisted_living": [17, 24],
        "memory_care": [25, 39],
        "memory_care_high_acuity": [40, 100]
      }
    },
    "options": {
      "llm_mode": "assist"
    }
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "deterministic": {
      "tier": "in_home",
      "score": 10,
      "confidence": 0.75,
      "flags": [],
      "rationale": "Minimal cognitive issues, mostly independent, strong family support available"
    },
    "llm": {
      "tier": "none",
      "confidence": 0.55,
      "rationale": "With full-time family support and only minimal ADL needs, could potentially remain independent. However, uncertainty about long-term sustainability.",
      "model": "gpt-4o-mini",
      "tokens_used": 198
    },
    "adjudication": {
      "final_tier": "in_home",
      "source": "deterministic",
      "override": false,
      "reason": "LLM confidence below threshold (0.55 < 0.70); falling back to deterministic recommendation"
    }
  }
}
```

---

## Example 5: Guardrail Rejection (LLM Blocked)

**Scenario:** Severe wandering + aggression, LLM tries to downgrade (guardrail blocks it)

```bash
curl -X POST http://localhost:3000/api/gcp/assess \
  -H "Content-Type: application/json" \
  -d '{
    "formData": {
      "memory_changes": "severe",
      "wandering": "yes",
      "aggression": "yes",
      "fall_risk": "yes",
      "adl_bathing": "needs_full_help",
      "support_availability": "family_full_time"
    },
    "config": {
      "tierThresholds": {
        "none": [0, 8],
        "in_home": [9, 16],
        "assisted_living": [17, 24],
        "memory_care": [25, 39],
        "memory_care_high_acuity": [40, 100]
      },
      "guardrails": {
        "cognitive_gate": {
          "severe_cognitive": ["memory_care", "memory_care_high_acuity"],
          "moderate_cognitive": ["assisted_living", "memory_care", "memory_care_high_acuity"]
        },
        "behavior_gate": {
          "wandering": ["memory_care", "memory_care_high_acuity"],
          "aggression": ["memory_care", "memory_care_high_acuity"]
        }
      }
    },
    "options": {
      "llm_mode": "assist"
    }
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "deterministic": {
      "tier": "memory_care",
      "score": 35,
      "confidence": 0.90,
      "flags": ["severe_cognitive", "wandering", "aggression", "fall_risk"],
      "rationale": "Severe cognitive decline with wandering and aggressive behaviors require specialized memory care"
    },
    "llm": {
      "tier": "assisted_living",
      "confidence": 0.75,
      "rationale": "While cognitive issues are present, strong family support could enable assisted living with memory care programming.",
      "model": "gpt-4o-mini",
      "tokens_used": 215
    },
    "adjudication": {
      "final_tier": "memory_care",
      "source": "deterministic",
      "override": false,
      "reason": "LLM recommendation (assisted_living) rejected by guardrails; wandering + aggression flags require memory care minimum. Safety concerns override LLM suggestion."
    }
  }
}
```

---

## Example 6: Shadow Mode (LLM Runs But Doesn't Override)

**Scenario:** Testing LLM without affecting production results

```bash
curl -X POST http://localhost:3000/api/gcp/assess \
  -H "Content-Type: application/json" \
  -d '{
    "formData": {
      "memory_changes": "moderate",
      "fall_risk": "yes",
      "adl_bathing": "needs_help",
      "support_availability": "family_part_time"
    },
    "config": {
      "tierThresholds": {
        "none": [0, 8],
        "in_home": [9, 16],
        "assisted_living": [17, 24],
        "memory_care": [25, 39],
        "memory_care_high_acuity": [40, 100]
      }
    },
    "options": {
      "llm_mode": "shadow"
    }
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "deterministic": {
      "tier": "assisted_living",
      "score": 18,
      "confidence": 0.85,
      "flags": ["memory_moderate", "fall_risk"],
      "rationale": "Moderate memory issues + fall risk + ADL needs"
    },
    "llm": {
      "tier": "in_home",
      "confidence": 0.82,
      "rationale": "With part-time family support and only moderate needs, in-home care services could provide adequate support while maintaining independence.",
      "model": "gpt-4o-mini",
      "tokens_used": 201
    },
    "adjudication": {
      "final_tier": "assisted_living",
      "source": "deterministic",
      "override": false,
      "reason": "Shadow mode enabled; LLM ran for logging/comparison but did not override deterministic result"
    }
  }
}
```

**Use Case for Shadow Mode:**
- Compare LLM vs deterministic without affecting production
- Tune LLM prompts and test changes safely
- Gather data on LLM agreement/disagreement rates

---

## Example 7: Validation Error (Missing Required Field)

**Scenario:** Missing critical assessment data

```bash
curl -X POST http://localhost:3000/api/gcp/assess \
  -H "Content-Type: application/json" \
  -d '{
    "formData": {
      "memory_changes": "moderate"
    },
    "config": {},
    "options": {}
  }'
```

**Expected Response:**
```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Missing required assessment fields: adl_bathing, fall_risk, support_availability",
    "fields": ["adl_bathing", "fall_risk", "support_availability"]
  }
}
```

---

## Example 8: OpenAI API Error (Graceful Fallback)

**Scenario:** OpenAI API is down or quota exceeded

```bash
# Set invalid API key to simulate error
export OPENAI_API_KEY="invalid-key"

curl -X POST http://localhost:3000/api/gcp/assess \
  -H "Content-Type: application/json" \
  -d '{
    "formData": {
      "memory_changes": "moderate",
      "fall_risk": "yes",
      "adl_bathing": "needs_help",
      "support_availability": "family_part_time"
    },
    "config": {
      "tierThresholds": {
        "none": [0, 8],
        "in_home": [9, 16],
        "assisted_living": [17, 24],
        "memory_care": [25, 39],
        "memory_care_high_acuity": [40, 100]
      }
    },
    "options": {
      "llm_mode": "assist"
    }
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "deterministic": {
      "tier": "assisted_living",
      "score": 18,
      "confidence": 0.85,
      "flags": ["memory_moderate", "fall_risk"],
      "rationale": "Moderate memory issues + fall risk + ADL needs"
    },
    "llm": {
      "error": "OpenAI API error: Invalid API key",
      "fallback": true
    },
    "adjudication": {
      "final_tier": "assisted_living",
      "source": "deterministic",
      "override": false,
      "reason": "LLM unavailable; gracefully fell back to deterministic recommendation"
    }
  }
}
```

**Key Point:** System NEVER fails completely. Deterministic engine always returns a valid recommendation.

---

## Testing Patterns

### Pattern 1: Test All Tiers
Run assessments with increasing severity to see tier progression:
- Score 5 → `none`
- Score 12 → `in_home`
- Score 20 → `assisted_living`
- Score 30 → `memory_care`
- Score 45 → `memory_care_high_acuity`

### Pattern 2: Test Guardrails
Trigger each guardrail to see blocking behavior:
- Severe cognitive + wandering → Must be memory care minimum
- Aggression flag → Must be memory care minimum
- High fall risk + no support → Upgrade tier

### Pattern 3: Test LLM Modes
Run same assessment with different modes:
- `off` - No LLM call
- `shadow` - LLM runs but doesn't override
- `assist` - LLM can override if confident

### Pattern 4: Test Edge Cases
- Borderline scores (8-9, 16-17, 24-25, 39-40)
- Conflicting signals (low score but high-risk flags)
- Missing optional data
- All worst-case answers

---

## Response Structure Reference

```typescript
{
  status: "success" | "error",
  
  // Success case
  data?: {
    deterministic: {
      tier: string,              // Care tier recommendation
      score: number,             // Total points (0-100)
      confidence: number,        // Confidence (0.0-1.0)
      flags: string[],          // Warning flags triggered
      rationale: string         // Human-readable explanation
    },
    
    llm?: {
      tier: string,              // LLM care tier recommendation
      confidence: number,        // LLM confidence (0.0-1.0)
      rationale: string,        // LLM explanation
      model: string,            // "gpt-4o-mini"
      tokens_used: number       // OpenAI tokens consumed
    } | null,                   // null if LLM disabled
    
    adjudication: {
      final_tier: string,        // Final recommendation returned to user
      source: "deterministic" | "llm",  // Which engine provided final tier
      override: boolean,         // Did LLM override deterministic?
      reason: string            // Why this decision was made
    }
  },
  
  // Error case
  error?: {
    code: string,               // Error code
    message: string,           // Human-readable error
    fields?: string[]          // Invalid fields (validation errors)
  }
}
```

---

## Performance Benchmarks

**Average Response Times (localhost):**
- Deterministic only (`llm_mode: "off"`): ~15ms
- LLM assist (`llm_mode: "assist"`): ~1200ms (depends on OpenAI API)
- Shadow mode (`llm_mode: "shadow"`): ~1200ms (same as assist)

**OpenAI Token Usage:**
- Typical assessment: 200-300 tokens (~$0.0003 at GPT-4o-mini pricing)
- Complex assessment: 400-500 tokens (~$0.0007)

**Cost Estimate:**
- 1,000 assessments/month with LLM assist: ~$0.30/month
- 10,000 assessments/month: ~$3.00/month

---

## Debugging Tips

### Enable Verbose Logging
```bash
# In backend/.env
DEBUG=true
LOG_LEVEL=verbose
```

### Check Backend Logs
```bash
# Watch logs in real-time
cd backend
node server.js | tee logs.txt
```

### Test Deterministic Scoring Manually
```javascript
// In Node.js REPL
const gcpScoring = require('./backend/services/gcpScoring');

const result = gcpScoring.calculateScore({
  memory_changes: 'moderate',
  fall_risk: 'yes',
  adl_bathing: 'needs_help'
});

console.log(result);
```

### Test LLM Adjudication Manually
```javascript
const gcpNaviEngine = require('./backend/services/gcpNaviEngine');

const result = await gcpNaviEngine.adjudicate(
  { /* formData */ },
  { /* deterministic result */ },
  { llm_mode: 'assist' }
);

console.log(result);
```

---

## Next Steps

1. **Run these examples** to understand API behavior
2. **Modify inputs** to test different scenarios
3. **Read the code** in `backend/services/` to see implementation
4. **Check logs** to see LLM prompts and responses
5. **Test production** use cases with real data

---

**Ready to integrate GCP into your application?** Use these examples as templates! 🚀

**Last Updated:** November 9, 2025  
**Version:** 1.0
