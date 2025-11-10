# GCP Module Configuration Guide

## Overview

The GCP assessment is **100% JSON-driven** - no code changes needed to add, modify, or remove questions. This guide explains how to edit `/frontend/src/assets/configs/gcp_module.json` to customize the assessment.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Module Structure](#module-structure)
3. [Question Types](#question-types)
4. [Scoring Configuration](#scoring-configuration)
5. [Flags & Risk Indicators](#flags--risk-indicators)
6. [Conditional Logic](#conditional-logic)
7. [UI Customization](#ui-customization)
8. [Testing Changes](#testing-changes)
9. [Common Recipes](#common-recipes)

---

## Quick Start

### Making Your First Change

**Example: Change a question label**

1. Open `/frontend/src/assets/configs/gcp_module.json`

2. Find the question (search for its ID):
```json
{
  "id": "fall_risk",
  "label": "Has {NAME} fallen in the past 6 months?"
}
```

3. Update the label:
```json
{
  "id": "fall_risk",
  "label": "Has {NAME} experienced any falls recently?"
}
```

4. Save the file

5. Reload the browser - changes appear immediately! (No rebuild needed)

---

## Module Structure

### Top-Level Schema

```json
{
  "module": {
    "id": "gcp_care_recommendation",
    "name": "Guided Care Plan",
    "version": "v2025.10",
    "description": "...",
    "results_step_id": "results",
    "display": { ... },
    "navi_guidance": { ... }
  },
  "sections": [
    {
      "id": "intro",
      "title": "",
      "type": "info",
      "content": ["..."]
    },
    {
      "id": "cognition",
      "title": "Memory & Thinking",
      "questions": [...]
    }
  ]
}
```

### Module Metadata

```json
"module": {
  "id": "gcp_care_recommendation",        // Unique module identifier
  "name": "Guided Care Plan",             // Display name
  "version": "v2025.10",                  // Version for tracking
  "description": "...",                   // Short description
  "results_step_id": "results",           // Where to show results
  
  "display": {
    "title": "Find the Right Senior Care",         // Hero title
    "subtitle": "We'll match {NAME} to...",        // Hero subtitle
    "estimated_time": "≈2 min",                    // Time estimate
    "autosave": true,                              // Enable autosave
    "progress_weight": 1.0                         // For multi-module progress
  }
}
```

### Sections Array

Each section represents a step in the assessment:

```json
{
  "id": "cognition",                    // Unique section ID
  "title": "Memory & Thinking",         // Section heading
  "description": "Let's assess...",     // Optional description
  "type": "questions",                  // "info" or "questions" (default)
  "questions": [...]                    // Array of question objects
}
```

**Section Types:**
- `"questions"` (default) - Standard question section
- `"info"` - Informational only, no questions (like intro/conclusion)

---

## Question Types

### Basic Question Structure

```json
{
  "id": "question_id",              // Unique ID (used in formData)
  "type": "string",                 // Data type (string|number|boolean)
  "select": "single",               // Selection type (see below)
  "label": "Question text?",        // Question label
  "required": true,                 // Is answer required?
  "default": null,                  // Default value
  "options": [],                    // Answer choices
  "ui": {},                         // UI customization
  "visible_if": {},                 // Conditional visibility
  "navi_guidance": {}               // Help text
}
```

---

### 1. Single-Select (Radio Buttons)

**Use Case:** Pick one option from a list

```json
{
  "id": "living_situation",
  "type": "string",
  "select": "single",
  "label": "Where does {NAME} currently live?",
  "required": true,
  "options": [
    { "value": "alone", "label": "Alone", "score": 2 },
    { "value": "with_family", "label": "With family", "score": 0 },
    { "value": "with_spouse", "label": "With spouse/partner", "score": 1 }
  ],
  "ui": {
    "widget": "radio"              // Default for single select
  }
}
```

**Rendered As:**
```
○ Alone
○ With family
○ With spouse/partner
```

---

### 2. Multi-Select (Checkboxes)

**Use Case:** Select multiple options

```json
{
  "id": "adl_challenges",
  "type": "string",
  "select": "multi",
  "label": "Which daily activities does {NAME} need help with?",
  "required": false,
  "options": [
    { "value": "bathing", "label": "Bathing/showering", "score": 2 },
    { "value": "dressing", "label": "Getting dressed", "score": 2 },
    { "value": "eating", "label": "Eating", "score": 3 },
    { "value": "toileting", "label": "Using the toilet", "score": 3 },
    { "value": "transferring", "label": "Getting in/out of bed", "score": 2 }
  ],
  "ui": {
    "widget": "multi_chip",         // Chip-style multi-select
    "orientation": "vertical"
  }
}
```

**Rendered As:**
```
☐ Bathing/showering
☐ Getting dressed
☐ Eating
☐ Using the toilet
☐ Getting in/out of bed
```

**Note:** For multi-select, scores are **summed** for each selected option.

---

### 3. Dropdown Select

**Use Case:** Pick from long list of options

```json
{
  "id": "age_range",
  "type": "string",
  "select": "single",
  "label": "What is {NAME}'s age?",
  "required": true,
  "options": [
    { "value": "60-64", "label": "60-64 years", "score": 0 },
    { "value": "65-69", "label": "65-69 years", "score": 0 },
    { "value": "70-74", "label": "70-74 years", "score": 1 },
    { "value": "75-79", "label": "75-79 years", "score": 1 },
    { "value": "80-84", "label": "80-84 years", "score": 2 },
    { "value": "85+", "label": "85+ years", "score": 3 }
  ],
  "ui": {
    "widget": "select"              // Dropdown
  }
}
```

**Rendered As:**
```
[Select age...          ▼]
```

---

### 4. Number Input

**Use Case:** Numeric value with scoring multiplier

```json
{
  "id": "falls_count",
  "type": "number",
  "label": "How many times has {NAME} fallen in the past year?",
  "required": false,
  "default": 0,
  "score_multiplier": 1.5,          // Score = value × multiplier
  "ui": {
    "min": 0,
    "max": 20,
    "step": 1
  }
}
```

**Scoring Example:**
- User enters: `3`
- Score: `3 × 1.5 = 4.5 points`

---

### 5. Yes/No (Boolean)

**Use Case:** Simple binary choice

```json
{
  "id": "has_partner",
  "type": "boolean",
  "label": "Does {NAME} have a spouse or partner?",
  "required": true,
  "options": [
    { "value": "yes", "label": "Yes", "score": 0 },
    { "value": "no", "label": "No", "score": 2 }
  ]
}
```

---

### 6. Text Input

**Use Case:** Free-form text (not scored)

```json
{
  "id": "additional_notes",
  "type": "string",
  "label": "Any other concerns or observations?",
  "required": false,
  "ui": {
    "widget": "textarea",
    "rows": 4,
    "placeholder": "Optional notes..."
  }
}
```

---

## Scoring Configuration

### How Scoring Works

1. Each option can have a `score` value
2. Selected option scores are summed
3. Backend uses total to determine care tier

### Score Assignment

```json
{
  "id": "mobility_status",
  "options": [
    { "value": "independent", "label": "Walks independently", "score": 0 },
    { "value": "cane", "label": "Uses cane", "score": 1 },
    { "value": "walker", "label": "Uses walker", "score": 2 },
    { "value": "wheelchair", "label": "Uses wheelchair", "score": 4 },
    { "value": "bedbound", "label": "Bedbound", "score": 6 }
  ]
}
```

### Scoring Guidelines

| Score Range | Meaning | Examples |
|-------------|---------|----------|
| 0 | No concern | Independent, no issues |
| 1-2 | Mild concern | Occasional help needed |
| 3-4 | Moderate concern | Regular assistance required |
| 5-7 | Significant concern | Daily/extensive help needed |
| 8+ | High concern | Intensive/constant care |

### Multi-Select Scoring

For multi-select questions, scores are **added**:

```json
{
  "id": "iadl_challenges",
  "select": "multi",
  "options": [
    { "value": "medications", "label": "Managing medications", "score": 2 },
    { "value": "transportation", "label": "Transportation", "score": 1 },
    { "value": "finances", "label": "Managing finances", "score": 1 }
  ]
}
```

**If user selects all three:**
- Total score: `2 + 1 + 1 = 4 points`

### Score Categories

Scores are grouped by category for analysis:

```javascript
// Automatically categorized by question ID pattern
{
  cognition: sum of memory/cognitive questions,
  adl: sum of ADL/IADL questions,
  safety: sum of fall/risk questions,
  mobility: sum of mobility questions,
  general: everything else
}
```

**Category Detection (in backend):**
```javascript
function getCategoryFromQuestion(question) {
  const id = question.id.toLowerCase();
  if (id.includes('memory') || id.includes('cogn')) return 'cognition';
  if (id.includes('adl') || id.includes('daily')) return 'adl';
  if (id.includes('fall') || id.includes('safety')) return 'safety';
  if (id.includes('mobil')) return 'mobility';
  return 'general';
}
```

---

## Flags & Risk Indicators

### What Are Flags?

Flags are risk indicators attached to specific answer choices. They trigger special handling in the backend (guardrails, tier routing, display in results).

### Adding Flags to Options

```json
{
  "id": "behavior_concerns",
  "select": "multi",
  "options": [
    {
      "value": "wandering",
      "label": "Wandering or getting lost",
      "score": 5,
      "flags": ["wandering", "cognitive_concern", "safety_risk"]
    },
    {
      "value": "aggression",
      "label": "Aggressive or combative behavior",
      "score": 6,
      "flags": ["aggression", "cognitive_concern", "behavior_risk"]
    },
    {
      "value": "sundowning",
      "label": "Increased confusion in evening",
      "score": 3,
      "flags": ["sundowning", "cognitive_concern"]
    }
  ]
}
```

### Flag Purposes

| Flag | Purpose | Effect |
|------|---------|--------|
| `cognitive_concern` | General cognitive issue | Considered in cognitive gate |
| `wandering` | Elopement risk | Triggers cognitive gate, affects tier map |
| `fall_risk_high` | Significant fall risk | Increases support band |
| `isolation_risk` | Social isolation | Flagged in results |
| `medication_complexity` | Med management issue | Increases support band |

### Flag Metadata

Flags have display metadata in `/backend/services/gcpFlagMetadata.json`:

```json
{
  "fall_risk_high": {
    "label": "High Fall Risk",
    "description": "Multiple falls or significant mobility issues indicate elevated risk",
    "tone": "warning",
    "priority": 1,
    "cta": {
      "label": "Learn about fall prevention",
      "route": "/resources/fall-prevention"
    }
  }
}
```

**Tone Options:**
- `"info"` - Blue, informational
- `"warning"` - Orange, caution
- `"critical"` - Red, urgent

### Creating New Flags

1. Add flag to option in `gcp_module.json`:
```json
{
  "value": "new_concern",
  "label": "New concern description",
  "score": 4,
  "flags": ["new_flag_id", "cognitive_concern"]
}
```

2. Add metadata to `/backend/services/gcpFlagMetadata.json`:
```json
{
  "new_flag_id": {
    "label": "New Flag Label",
    "description": "What this flag means",
    "tone": "warning",
    "priority": 5
  }
}
```

3. (Optional) Update guardrails if flag should trigger special logic

---

## Conditional Logic

### Visible If (Show/Hide Questions)

Questions can be conditionally shown based on previous answers:

```json
{
  "id": "diagnosis_details",
  "label": "What type of dementia was diagnosed?",
  "visible_if": {
    "key": "cognitive_dx_confirm",
    "eq": "dx_yes"
  },
  "options": [
    { "value": "alzheimers", "label": "Alzheimer's disease" },
    { "value": "vascular", "label": "Vascular dementia" },
    { "value": "other", "label": "Other type" }
  ]
}
```

**This question only appears if user answered "dx_yes" to `cognitive_dx_confirm`**

### Condition Types

#### Equals (`eq`)

```json
"visible_if": {
  "key": "living_situation",
  "eq": "alone"
}
```
Shows if `living_situation === "alone"`

#### In (`in`)

```json
"visible_if": {
  "key": "memory_changes",
  "in": ["moderate", "severe"]
}
```
Shows if `memory_changes` is "moderate" OR "severe"

#### Combined with Multi-Select

```json
"visible_if": {
  "key": "adl_challenges",
  "in": ["bathing", "dressing"]
}
```
Shows if user selected bathing OR dressing (or both)

### Advanced Conditional Logic

**Multiple Conditions (AND logic):**

Currently not directly supported. Workaround: Create intermediate calculated field in backend or use nested visible_if:

```json
// Show question 1 if A is true
{
  "id": "question1",
  "visible_if": { "key": "A", "eq": "yes" }
}

// Show question 2 if B is true AND question1 is visible
{
  "id": "question2",
  "visible_if": { "key": "B", "eq": "yes" }
}
```

---

## UI Customization

### Widget Types

| Widget | Use For | Rendered As |
|--------|---------|-------------|
| `radio` | Single select (short list) | Radio buttons |
| `select` | Single select (long list) | Dropdown |
| `chip` | Single select (visual) | Material chips |
| `multi_chip` | Multi-select | Checkboxes as chips |
| `checkbox` | Multi-select | Standard checkboxes |
| `input` | Text/number entry | Text field |
| `textarea` | Long text | Multi-line text area |
| `slider` | Numeric range | Slider control |

### Orientation

```json
"ui": {
  "orientation": "vertical"    // or "horizontal"
}
```

**Vertical:**
```
○ Option 1
○ Option 2
○ Option 3
```

**Horizontal:**
```
○ Option 1    ○ Option 2    ○ Option 3
```

### Placeholder Text

```json
"ui": {
  "placeholder": "Select an option..."
}
```

### Min/Max/Step (Numbers)

```json
{
  "type": "number",
  "ui": {
    "min": 0,
    "max": 100,
    "step": 5
  }
}
```

### Help Text (Navi Guidance)

```json
"navi_guidance": {
  "tip": "Count all falls, including minor ones that didn't cause injury",
  "why_ask": "Fall history helps us assess safety needs",
  "example": "Example: Tripped on rug, fell getting out of bed, etc."
}
```

**Renders as:** ℹ️ icon with tooltip

---

## Dynamic Placeholders

Replace placeholders in text with personalized data:

### Available Placeholders

| Placeholder | Replaced With | Example |
|-------------|---------------|---------|
| `{NAME}` | Care recipient's first name | "John" |
| `{NAME_POS}` | Possessive form | "John's" |
| `{NAME_POSS}` | Possessive form (alt) | "John's" |

### Usage

```json
{
  "label": "Does {NAME} need help with bathing?",
  "description": "This assesses {NAME_POS} ability to bathe safely"
}
```

**Rendered (for "John"):**
```
Does John need help with bathing?
This assesses John's ability to bathe safely
```

### Where Placeholders Work

- ✅ Section titles
- ✅ Section descriptions
- ✅ Question labels
- ✅ Question descriptions
- ✅ Option labels
- ✅ Navi guidance text
- ✅ Content blocks

---

## Testing Changes

### Local Testing Workflow

1. **Edit JSON:**
```bash
# Open in your editor
code frontend/src/assets/configs/gcp_module.json
```

2. **Validate JSON Syntax:**
```bash
# Use online validator or:
node -e "console.log(JSON.parse(require('fs').readFileSync('frontend/src/assets/configs/gcp_module.json')))"
```

3. **Reload Browser:**
- Hit refresh (Cmd+R / Ctrl+R)
- Or clear cache (Cmd+Shift+R / Ctrl+Shift+R)
- Changes appear immediately (no rebuild needed!)

4. **Test the Flow:**
- Fill out form
- Check scoring in backend logs
- Review results page

### Validation Checklist

- [ ] JSON is valid (no syntax errors)
- [ ] All question IDs are unique
- [ ] All section IDs are unique
- [ ] Required fields have `"required": true`
- [ ] Scores are reasonable (0-10 range typically)
- [ ] Flags match those in `gcpFlagMetadata.json`
- [ ] Conditional logic (`visible_if`) references existing question IDs
- [ ] Placeholders use correct syntax (`{NAME}`, not `{name}`)

### Testing Scoring

```bash
# Start backend with debug logging
cd backend
DEBUG_LLM=on node server.js

# Submit assessment via frontend
# Check backend logs for score breakdown
```

**Example Log Output:**
```
[GCP Scoring] Total score: 22
[GCP Scoring] Score breakdown:
  cognition: 8
  adl: 6
  safety: 5
  mobility: 3
[GCP Scoring] Flags: ['wandering', 'fall_risk_high']
```

---

## Common Recipes

### Recipe 1: Add a New Question

```json
{
  "id": "new_question_id",
  "type": "string",
  "select": "single",
  "label": "New question text?",
  "required": false,
  "options": [
    { "value": "option1", "label": "Option 1", "score": 0 },
    { "value": "option2", "label": "Option 2", "score": 2 }
  ]
}
```

**Steps:**
1. Find appropriate section in `sections` array
2. Add to `questions` array
3. Assign unique `id`
4. Set scores based on severity
5. Test by filling out form

---

### Recipe 2: Reorder Questions

Simply drag/drop in JSON array:

```json
"questions": [
  { "id": "question_c" },   // Was third, now first
  { "id": "question_a" },   // Was first, now second
  { "id": "question_b" }    // Was second, now third
]
```

**Order in JSON = Order in UI**

---

### Recipe 3: Change Scoring

```json
// Old scoring
{ "value": "moderate", "label": "Moderate concern", "score": 3 }

// New scoring (increased severity)
{ "value": "moderate", "label": "Moderate concern", "score": 5 }
```

**Impact:** Changes tier thresholds - test thoroughly!

---

### Recipe 4: Add Conditional Question

```json
{
  "id": "parent_question",
  "label": "Has {NAME} been diagnosed with dementia?",
  "options": [
    { "value": "yes", "label": "Yes" },
    { "value": "no", "label": "No" }
  ]
},
{
  "id": "child_question",
  "label": "What type of dementia?",
  "visible_if": {
    "key": "parent_question",
    "eq": "yes"
  },
  "options": [
    { "value": "alzheimers", "label": "Alzheimer's" },
    { "value": "other", "label": "Other" }
  ]
}
```

---

### Recipe 5: Create Question Group

```json
{
  "id": "new_section",
  "title": "New Topic Area",
  "description": "We'll ask about...",
  "questions": [
    { "id": "question1", "label": "..." },
    { "id": "question2", "label": "..." },
    { "id": "question3", "label": "..." }
  ]
}
```

---

### Recipe 6: Add Flag and Metadata

**In gcp_module.json:**
```json
{
  "value": "new_risk",
  "label": "New risk factor",
  "score": 4,
  "flags": ["new_risk_flag"]
}
```

**In backend/services/gcpFlagMetadata.json:**
```json
{
  "new_risk_flag": {
    "label": "New Risk Detected",
    "description": "This indicates...",
    "tone": "warning",
    "priority": 3
  }
}
```

---

### Recipe 7: Update Tier Thresholds

**In backend/services/gcpScoring.js:**

```javascript
// Current thresholds
const TIER_THRESHOLDS = {
  none: [0, 8],
  in_home: [9, 16],
  assisted_living: [17, 24],
  memory_care: [25, 39],
  memory_care_high_acuity: [40, 100],
};

// Adjusted thresholds (example)
const TIER_THRESHOLDS = {
  none: [0, 10],              // Increased
  in_home: [11, 18],          // Shifted up
  assisted_living: [19, 26],  // Shifted up
  memory_care: [27, 42],      // Shifted up
  memory_care_high_acuity: [43, 100],
};
```

⚠️ **Warning:** Changing thresholds affects all assessments. Test extensively!

---

### Recipe 8: Update Tier Map

**In backend/services/gcpTierMap.json:**

```json
{
  "moderate": {
    "low": "none",
    "moderate": "assisted_living",
    "high": "assisted_living",
    "24h": "memory_care"
  }
}
```

Change routing logic for specific cognition×support combinations.

---

## Advanced Topics

### Multi-Module Consistency

If creating multiple modules (Cost Planner, PFMA), maintain consistency:

**Question Structure:**
- Use same patterns for similar questions
- Consistent scoring scales
- Similar section organization

**Naming Conventions:**
- Question IDs: `{topic}_{aspect}` (e.g., `mobility_status`, `fall_risk`)
- Section IDs: `{domain}` (e.g., `cognition`, `safety`)

### Version Management

Update version when making significant changes:

```json
"module": {
  "version": "v2025.11"    // Incremented from v2025.10
}
```

**Track in git:**
```bash
git add frontend/src/assets/configs/gcp_module.json
git commit -m "Updated fall risk scoring (v2025.11)"
```

### A/B Testing Configurations

Create variant configs for testing:

```
gcp_module.json         # Production config
gcp_module_variant_a.json   # Test variant A
gcp_module_variant_b.json   # Test variant B
```

**Load different config based on feature flag:**
```typescript
const variant = featureFlags.gcpVariant || 'default';
this.moduleConfigService.loadModuleConfig(`gcp_${variant}`);
```

---

## Troubleshooting

### JSON Syntax Errors

**Symptom:** Frontend shows "Failed to load module configuration"

**Common Causes:**
- Missing comma
- Extra comma (trailing comma in last item)
- Mismatched brackets `[]` or braces `{}`
- Unescaped quotes in strings

**Solution:** Use JSON validator:
```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('gcp_module.json')))"
```

---

### Question Not Showing

**Possible Causes:**
1. **Conditional logic:** Check `visible_if` - parent answer may not match
2. **Section type:** Ensure section is not `"type": "info"`
3. **Syntax error:** Question object malformed

**Debug:**
```javascript
// In browser console
localStorage.getItem('gcp_formData')  // Check stored answers
```

---

### Scoring Not Working

**Possible Causes:**
1. **Option missing `score`:** Check all options have score values
2. **Type mismatch:** Ensure `"type": "number"` for numeric scores
3. **Backend not updated:** Restart backend after JSON changes

**Debug:**
```bash
# Check backend logs
cd backend
node server.js

# Look for score calculation output
[GCP Scoring] Total score: X
```

---

### Flags Not Appearing in Results

**Possible Causes:**
1. **Flag ID mismatch:** Check spelling in both places
2. **Metadata missing:** Add to `gcpFlagMetadata.json`
3. **Option not selected:** User must select option with flag

---

## Best Practices

### Question Design

✅ **DO:**
- Use clear, simple language
- Ask one thing per question
- Provide examples in help text
- Use consistent tone
- Order questions logically (general → specific)

❌ **DON'T:**
- Use medical jargon without explanation
- Ask compound questions
- Use negative phrasing ("not", "never")
- Assume prior knowledge

### Scoring Design

✅ **DO:**
- Use consistent scoring scale
- Document reasoning for scores
- Test edge cases
- Review with clinical experts
- Consider score distributions

❌ **DON'T:**
- Assign scores arbitrarily
- Create huge score gaps between options
- Change scores without testing
- Use negative scores

### Flag Design

✅ **DO:**
- Use descriptive flag IDs
- Provide helpful descriptions
- Set appropriate tone (info/warning/critical)
- Link to resources when possible

❌ **DON'T:**
- Create too many flags (overwhelming)
- Use cryptic flag names
- Forget to add metadata

---

## Cheat Sheet

### Quick Reference

```json
// Minimal question
{
  "id": "question_id",
  "type": "string",
  "label": "Question?",
  "options": [
    { "value": "val", "label": "Label" }
  ]
}

// Full-featured question
{
  "id": "question_id",
  "type": "string",
  "select": "single",
  "label": "Question for {NAME}?",
  "required": true,
  "default": null,
  "options": [
    {
      "value": "option1",
      "label": "Option 1",
      "score": 0,
      "flags": ["flag_id"],
      "description": "More info"
    }
  ],
  "ui": {
    "widget": "radio",
    "orientation": "vertical",
    "placeholder": "Choose..."
  },
  "visible_if": {
    "key": "other_question",
    "eq": "yes"
  },
  "navi_guidance": {
    "tip": "Helpful hint",
    "why_ask": "Why we ask this"
  }
}
```

---

## Related Documentation

- [GCP Architecture Guide](./GCP_ARCHITECTURE.md) - System overview
- [Deterministic vs LLM Guide](./DETERMINISTIC_VS_LLM.md) - Scoring logic
- [contracts.ts](../frontend/src/app/shared/models/contracts.ts) - TypeScript types

---

**Last Updated:** November 9, 2025  
**Version:** 1.0  
**Authors:** Senior Navigator Engineering Team
