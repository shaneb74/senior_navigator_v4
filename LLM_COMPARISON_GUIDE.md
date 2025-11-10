# GCP Comparison Feature - Deterministic vs LLM

## Overview

The GCP assessment now displays **both** the rule-based (deterministic) and AI (LLM) recommendations side-by-side, allowing you to compare how each method analyzes the same data.

## How It Works

### Three LLM Modes

The backend supports three modes via the `FEATURE_GCP_LLM_TIER` environment variable:

1. **`off`** (default)
   - Only uses deterministic scoring
   - No LLM calls made
   - No comparison shown on results page
   - Fastest, no API costs

2. **`shadow`** ⭐ Recommended for development
   - Runs both deterministic AND LLM
   - LLM results are shown for comparison
   - **Deterministic always wins** (final recommendation)
   - LLM runs in "shadow mode" - visible but not used
   - Great for testing and comparing

3. **`assist`**
   - Runs both deterministic AND LLM
   - Adjudication logic chooses the best recommendation
   - LLM can override deterministic if confidence is high
   - Most advanced, but requires LLM API access

## Enabling Comparison View

### Option 1: Environment Variable
```bash
# In backend directory
FEATURE_GCP_LLM_TIER=shadow node server.js
```

### Option 2: .env File
```bash
# backend/.env
FEATURE_GCP_LLM_TIER=shadow
```

### Option 3: Inline (Current Method)
```bash
FEATURE_GCP_LLM_TIER=shadow node server.js
```

## What You See

### Without LLM (mode=off)
- Single recommendation
- Score breakdown
- Risk flags
- No comparison section

### With LLM (mode=shadow or assist)
- **Primary recommendation** (top section)
- **Score breakdown**
- **Risk flags**
- **Comparison section** (NEW!) showing:
  - **Rule-Based Engine Card**
    - Deterministic tier recommendation
    - Confidence score
    - Total score
  - **AI Analysis Card**
    - LLM tier recommendation
    - LLM confidence score
    - AI reasoning (if provided)
  - **Final Decision Box**
    - Which method was selected
    - Reason for selection
    - Agreement/disagreement indicator
  - **LLM Mode Badge**
    - Shows current mode (shadow/assist)

## Visual Design

### Rule-Based Card
- Blue color scheme (#2196f3)
- "Account Tree" icon
- Shows deterministic calculation

### AI Analysis Card
- Purple color scheme (#9c27b0)
- "Psychology" icon
- Shows LLM reasoning

### Agreement Indicators
- ✅ **Green box**: Both methods agreed
- ⚠️ **Orange box**: Methods disagreed (shows which was selected)

## Example Scenarios

### Scenario 1: Agreement (Shadow Mode)
```
Deterministic: assisted_living (74%)
LLM: assisted_living (82%)
→ Final: assisted_living (uses deterministic in shadow mode)
→ Shows: Green "Both methods agreed" message
```

### Scenario 2: Disagreement (Shadow Mode)
```
Deterministic: in_home (65%)
LLM: assisted_living (88%)
→ Final: in_home (shadow mode always uses deterministic)
→ Shows: Orange "Methods disagreed - Rule-based selected" message
```

### Scenario 3: Disagreement (Assist Mode)
```
Deterministic: in_home (65%)
LLM: assisted_living (92%)
→ Final: assisted_living (LLM high confidence overrides)
→ Shows: Orange "Methods disagreed - AI selected" message
→ Reason: "LLM confidence > 0.90 and within allowed tiers"
```

## Implementation Details

### Backend Response Structure

When LLM mode is enabled, the API response includes:

```json
{
  "recommendation": "assisted_living",
  "confidence": 0.74,
  "raw_scores": { ... },
  "flags": [ ... ],
  "comparison": {
    "deterministic": {
      "tier": "assisted_living",
      "confidence": 0.74,
      "score": 22
    },
    "llm": {
      "tier": "assisted_living",
      "confidence": 0.82,
      "reasoning": "Based on ADL dependencies and cognitive factors..."
    },
    "adjudication": {
      "source": "deterministic",
      "adjudication_reason": "Shadow mode - deterministic always used",
      "allowed": ["no_care_needed", "in_home", "assisted_living"]
    },
    "llm_mode": "shadow"
  }
}
```

### Frontend Detection

The results component automatically detects if comparison data is present:

```typescript
*ngIf="recommendation.comparison && recommendation.comparison.llm"
```

If present, it displays the full comparison section. If not, only shows the standard results.

## Development Tips

### Testing Different Modes

```bash
# Test with shadow mode
FEATURE_GCP_LLM_TIER=shadow node server.js

# Complete assessment → See comparison

# Test with assist mode
FEATURE_GCP_LLM_TIER=assist node server.js

# Complete assessment → See adjudication in action

# Test without LLM
FEATURE_GCP_LLM_TIER=off node server.js

# Complete assessment → No comparison shown
```

### Debugging

Backend logs show:
```
[GCP Scoring] LLM mode: shadow
[GCP Scoring] Attempting LLM generation...
[GCP Scoring] LLM recommendation: tier=assisted_living conf=0.82
[GCP_ADJ] chosen=assisted_living llm=assisted_living det=assisted_living ...
```

Look for:
- `[GCP Scoring] LLM mode:` - Confirms mode
- `[DISAGREEMENT]` - Flags when methods differ
- `[GCP_ADJ]` - Shows adjudication decision

### Styling Customization

Colors can be adjusted in:
```scss
// frontend/src/app/features/gcp/components/gcp-results/gcp-results.component.scss

.comparison-card.deterministic {
  border-color: #2196f3; // Change blue
}

.comparison-card.llm {
  border-color: #9c27b0; // Change purple
}
```

## Benefits

### For Development
- Compare scoring methods in real-time
- Validate LLM output against known rules
- Identify edge cases where methods disagree
- Test adjudication logic

### For Production
- Transparency for users/advisors
- Confidence building (show AI reasoning)
- Gradual LLM rollout (shadow → assist)
- Quality assurance and auditing

### For Research
- Analyze agreement rates
- Study disagreement patterns
- Improve adjudication rules
- Optimize confidence thresholds

## Security & Performance

### LLM API Calls
- Only made when mode != 'off'
- Cached at backend level (optional)
- Timeout configured (10s default)
- Fallback to deterministic on failure

### Data Privacy
- User data sent to LLM API (if enabled)
- Review LLM provider terms
- Consider PHI/HIPAA requirements
- Audit logs recommended

### Performance
- Shadow mode adds ~2-5s per assessment
- Assist mode same timing
- Off mode is instant (no LLM call)
- Consider async processing for scale

## Next Steps

1. ✅ Backend returns comparison data
2. ✅ Frontend displays comparison UI
3. ✅ Mode detection working
4. 🔄 Test with real LLM API
5. 🔄 Add comparison analytics
6. 🔄 Implement caching layer

## Troubleshooting

### "No comparison section showing"
- Check backend LLM mode: `echo $FEATURE_GCP_LLM_TIER`
- Verify backend logs show LLM attempt
- Check browser console for errors
- Confirm API response includes `comparison` field

### "LLM always returns null"
- Check LLM API credentials
- Verify `gcpNaviEngine.js` is working
- Check backend logs for LLM errors
- Test with mock LLM response first

### "Comparison cards look broken"
- Clear browser cache
- Check console for CSS errors
- Verify Material icons loading
- Test responsive breakpoints

---

**Feature Version**: 1.0  
**Last Updated**: November 7, 2025  
**Status**: ✅ Ready for testing with shadow mode
