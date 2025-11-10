# Getting Started with Senior Navigator GCP

**Time to understand:** 5-10 minutes  
**Goal:** Understand how GCP delivers deterministic + LLM care recommendations

---

## What is GCP?

**Guided Care Plan (GCP)** is an assessment tool that recommends the appropriate level of senior care based on:
- Cognitive function (memory, confusion, wandering)
- Activities of Daily Living (ADL) - bathing, dressing, eating
- Safety concerns (falls, medication management)
- Support availability (family, caregiver involvement)

**Output:** A care tier recommendation:
- `none` - Independent living
- `in_home` - Home care services
- `assisted_living` - Assisted living facility
- `memory_care` - Memory care facility
- `memory_care_high_acuity` - Advanced memory care

---

## How GCP Works (3-Step Process)

### Step 1: User Assessment (Frontend)
User answers questions via Angular form → Submitted to backend

**Key file:** `frontend/src/assets/configs/gcp_module.json`
- 1066 lines of JSON configuration
- Defines all questions, options, scores, and flags
- Forms render dynamically using ngx-formly

**Example question:**
```json
{
  "id": "memory_changes",
  "label": "Has {NAME} experienced memory changes?",
  "options": [
    { "value": "none", "label": "No changes", "score": 0 },
    { "value": "mild", "label": "Mild forgetfulness", "score": 2 },
    { "value": "moderate", "label": "Frequent confusion", "score": 5 },
    { "value": "severe", "label": "Severe memory loss", "score": 8 }
  ]
}
```

---

### Step 2: Deterministic Scoring (Backend)
Backend calculates scores and applies business rules

**Key file:** `backend/services/gcpScoring.js`

**Process:**
```
1. Calculate total score (sum all selected option scores)
2. Assign base tier based on score thresholds
3. Route through tier map (cognition × support matrix)
4. Apply guardrails (cognitive gate, behavior gate)
5. Return deterministic recommendation
```

**Example:**
- User scores: Cognition=8, ADL=6, Safety=4 → **Total: 18**
- Tier thresholds: 17-24 = `assisted_living`
- Guardrails: Check for wandering/aggression flags
- Result: `assisted_living` tier

**Tier Thresholds:**
```javascript
{
  none: [0, 8],                         // 0-8 points
  in_home: [9, 16],                     // 9-16 points
  assisted_living: [17, 24],            // 17-24 points
  memory_care: [25, 39],                // 25-39 points
  memory_care_high_acuity: [40, 100]    // 40+ points
}
```

---

### Step 3: LLM Adjudication (Optional)
GPT-4o-mini reviews deterministic result and can override if necessary

**Key file:** `backend/services/gcpNaviEngine.js`

**Process:**
```
1. Build context (user answers + deterministic result)
2. Send to OpenAI GPT-4o-mini with structured prompt
3. Receive LLM recommendation with confidence score
4. Apply 5-layer guardrail system
5. Decide: agree with deterministic OR override
```

**Adjudication Decision Tree:**
```
IF LLM agrees with deterministic → Return deterministic (high confidence)
ELSE IF LLM confidence < 0.7 → Return deterministic (low confidence fallback)
ELSE IF LLM tier not in allowed list → Return deterministic (guardrail rejection)
ELSE IF policy mode = "shadow" → Return deterministic (log LLM for comparison)
ELSE IF policy mode = "assist" → Return LLM tier (override)
```

**Three Policy Modes:**
- `off` - No LLM calls, deterministic only
- `shadow` - LLM runs but doesn't override (logging/comparison)
- `assist` - LLM can override if confidence > 70%

---

## Understanding the Code (10 Critical Files)

### Backend (Node.js/Express)
1. **`backend/server.js`** (80 lines)
   - Express server setup
   - Routes and middleware
   - **Start here** to see API structure

2. **`backend/routes/gcp.js`** (100 lines)
   - POST `/api/gcp/assess` endpoint
   - Request validation
   - Response formatting

3. **`backend/services/gcpScoring.js`** (400+ lines) ⭐ **MOST IMPORTANT**
   - Deterministic scoring engine
   - Tier assignment logic
   - Guardrail system (cognitive gate, behavior gate)
   - **Read this to understand core algorithm**

4. **`backend/services/gcpNaviEngine.js`** (300+ lines) ⭐ **MOST IMPORTANT**
   - LLM integration (OpenAI GPT-4o-mini)
   - Prompt engineering
   - Adjudication logic (agree/override/fallback)
   - **Read this to understand LLM enhancement**

5. **`backend/services/llmClient.js`** (50 lines)
   - OpenAI SDK wrapper
   - API key management
   - Error handling

### Frontend (Angular 20)
6. **`frontend/src/app/features/gcp/store/gcp.reducer.ts`** (100 lines)
   - NgRx state management
   - Form data, config, recommendation state
   - 44 unit tests, 100% coverage

7. **`frontend/src/app/features/gcp/store/gcp.effects.ts`** (150 lines)
   - Side effects (API calls, routing)
   - Config loading, assessment submission
   - Error handling

8. **`frontend/src/app/features/gcp/components/gcp-form/`** (400+ lines)
   - Renders assessment form from JSON
   - ngx-formly integration
   - Multi-step navigation

9. **`frontend/src/app/features/gcp/components/gcp-results/`** (300+ lines)
   - Displays care recommendation
   - Shows deterministic vs LLM comparison
   - Displays flags, rationale, adjudication decision

10. **`frontend/src/assets/configs/gcp_module.json`** (1066 lines) ⭐
    - **ALL business logic lives here**
    - Questions, options, scores, flags
    - No hardcoded questions in components
    - **Edit this to change assessment**

---

## Running GCP Locally (5 Minutes)

### Step 1: Install Dependencies
```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

### Step 2: Configure Backend
```bash
cd backend

# Create .env file
echo "OPENAI_API_KEY=sk-your-key-here" > .env
echo "PORT=3000" >> .env
echo "LLM_MODE=assist" >> .env
```

**Get OpenAI API Key:** https://platform.openai.com/api-keys

### Step 3: Start Backend (Terminal 1)
```bash
cd backend
node server.js

# You should see:
# Server running on port 3000
# OpenAI client initialized
```

### Step 4: Start Frontend (Terminal 2)
```bash
cd frontend
npm start

# You should see:
# Angular Live Development Server is listening on localhost:4200
```

### Step 5: Test It!
1. Open browser: http://localhost:4200
2. Click "Get Started" on Hub
3. Click "Guided Care Plan"
4. Fill out assessment
5. See results with deterministic + LLM comparison

---

## Testing the System

### Run Unit Tests
```bash
cd frontend
npm test

# Results:
# Chrome: Executed 71 of 71 SUCCESS
# Coverage: 100% (62/62 statements)
```

### Test API Directly
```bash
# Example: Submit assessment via curl
curl -X POST http://localhost:3000/api/gcp/assess \
  -H "Content-Type: application/json" \
  -d '{
    "formData": {
      "memory_changes": "moderate",
      "fall_risk": "yes",
      "adl_bathing": "needs_help"
    },
    "config": {...},
    "options": { "llm_mode": "assist" }
  }'
```

See [docs/API_EXAMPLES.md](./docs/API_EXAMPLES.md) for complete curl examples with real responses.

---

## Learning Path for New Developers

### Day 1: Understand the Concepts (2 hours)
1. ✅ Read this GETTING_STARTED.md (you're here!)
2. ✅ Read [docs/DETERMINISTIC_VS_LLM.md](./docs/DETERMINISTIC_VS_LLM.md)
3. ✅ Run the app locally and test it
4. ✅ Test API with [docs/API_EXAMPLES.md](./docs/API_EXAMPLES.md)

### Day 2: Dive Into Code (4 hours)
1. Read `backend/services/gcpScoring.js` line-by-line
   - Understand score calculation
   - Understand tier thresholds
   - Understand guardrails

2. Read `backend/services/gcpNaviEngine.js` line-by-line
   - Understand LLM prompt construction
   - Understand adjudication logic
   - Understand fallback strategy

3. Explore frontend store: `frontend/src/app/features/gcp/store/`
   - Actions (what can happen)
   - Reducers (state updates)
   - Effects (side effects)
   - Selectors (derived state)

### Day 3: Make Your First Change (2 hours)
1. **Easy:** Edit `gcp_module.json` to add a new question
   - See [docs/CONFIGURATION_GUIDE.md](./docs/CONFIGURATION_GUIDE.md)
   - No code changes needed!

2. **Medium:** Adjust tier thresholds in `gcpScoring.js`
   - Change score ranges
   - Test with different inputs

3. **Advanced:** Modify LLM prompt in `gcpNaviEngine.js`
   - Change how GPT-4o-mini is instructed
   - Test adjudication decisions

---

## Key Architectural Decisions

### Why JSON-Driven Forms?
- **Flexibility:** Change questions without code changes
- **Business control:** Non-developers can edit assessments
- **Version control:** Easy to track question changes over time
- **Testing:** Can test different configurations

### Why Dual-Engine (Deterministic + LLM)?
- **Reliability:** Deterministic always works (no API dependencies)
- **Accuracy:** LLM can catch edge cases deterministic misses
- **Cost control:** Only call LLM when needed (shadow/assist modes)
- **Auditability:** Always show both results for comparison

### Why Guardrails?
- **Safety:** Prevent dangerous recommendations (e.g., independent living for severe dementia)
- **Compliance:** Enforce business rules and regulations
- **Trust:** Limit LLM to sensible recommendations only
- **Fallback:** Always return deterministic if LLM fails or low confidence

### Why NgRx?
- **Predictability:** Single source of truth for state
- **Testability:** Pure functions (reducers/selectors) easy to test
- **DevTools:** Time-travel debugging, action replay
- **Scalability:** Pattern scales to multiple products (Cost Planner, PFMA)

---

## Common Questions

### Q: Can GCP run without LLM?
**A:** Yes! Set `LLM_MODE=off` in backend `.env` file. System runs purely on deterministic scoring.

### Q: How do I change tier thresholds?
**A:** Edit `TIER_THRESHOLDS` constant in `backend/services/gcpScoring.js`

### Q: How do I add a new question?
**A:** Edit `frontend/src/assets/configs/gcp_module.json` - see [CONFIGURATION_GUIDE.md](./docs/CONFIGURATION_GUIDE.md)

### Q: What happens if OpenAI API is down?
**A:** System automatically falls back to deterministic recommendation. LLM is optional enhancement, not requirement.

### Q: Can LLM recommend any tier?
**A:** No. Guardrails limit LLM to "allowed tiers" based on deterministic score and flags. LLM can't override severe cognitive concerns.

### Q: How confident must LLM be to override?
**A:** Default: 70% confidence. Configurable via `CONFIDENCE_THRESHOLD` environment variable.

---

## Next Steps

Now that you understand the basics:

1. **Deep dive:** Read [docs/DETERMINISTIC_VS_LLM.md](./docs/DETERMINISTIC_VS_LLM.md) for detailed algorithms
2. **Architecture:** Read [docs/GCP_ARCHITECTURE.md](./docs/GCP_ARCHITECTURE.md) for complete system design
3. **Test it:** Use [docs/API_EXAMPLES.md](./docs/API_EXAMPLES.md) to test API with real examples
4. **Configure:** Read [docs/CONFIGURATION_GUIDE.md](./docs/CONFIGURATION_GUIDE.md) to edit questions
5. **Deploy:** Read [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for production deployment

---

## Support

**Questions about the code?**
- Check inline comments in `gcpScoring.js` and `gcpNaviEngine.js`
- Review test files: `gcp.reducer.spec.ts` and `gcp.selectors.spec.ts`
- Read comprehensive docs in `/docs` folder

**Want to make changes?**
- Start with JSON config (`gcp_module.json`) - easiest
- Then backend scoring logic (`gcpScoring.js`)
- Finally LLM integration (`gcpNaviEngine.js`)

---

**Ready to build? Welcome to Senior Navigator GCP!** 🚀

**Last Updated:** November 9, 2025  
**Version:** 1.0
