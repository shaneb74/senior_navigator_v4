# Senior Navigator v4

**Status**: ✅ **Ready for Developer Handoff**  
**Architecture**: Angular 20 + Node.js/Express + OpenAI  
**Test Coverage**: 71 passing tests, 100% coverage on NgRx store  
**Purpose**: Production-ready GCP care recommendation engine with deterministic + LLM scoring

---

## 🎯 For New Developers

**Start here to understand the GCP recommendation system:**

1. **[GETTING_STARTED.md](./GETTING_STARTED.md)** ⭐ Read this first - 5-minute overview
2. **[docs/DETERMINISTIC_VS_LLM.md](./docs/DETERMINISTIC_VS_LLM.md)** - How scoring & LLM adjudication works
3. **[docs/API_EXAMPLES.md](./docs/API_EXAMPLES.md)** - Test the API with real examples
4. **[docs/GCP_ARCHITECTURE.md](./docs/GCP_ARCHITECTURE.md)** - Complete system architecture

**Critical code files:**
- `backend/services/gcpScoring.js` - Deterministic scoring engine
- `backend/services/gcpNaviEngine.js` - LLM adjudication logic
- `frontend/src/app/features/gcp/store/` - NgRx state management
- `frontend/src/assets/configs/gcp_module.json` - Question configuration

---

## Overview

Senior Navigator v4 is a production-ready implementation of the GCP (Guided Care Plan) recommendation system:

- **Frontend**: Angular 20 with ngx-formly for JSON-driven forms
- **Backend**: Node.js/Express with OpenAI GPT-4o-mini integration
- **State Management**: NgRx (actions, reducers, effects, selectors)
- **Forms**: ngx-formly (renders forms from JSON configuration)
- **Scoring**: Dual-engine (deterministic + optional LLM adjudication)

---

## Key Principles

### 1. JSON-Driven Configuration
All questions, options, scores, and business rules live in JSON manifests. No hardcoded questions.

### 2. Deterministic + Optional LLM
Base system works 100% without AI. LLM enhances accuracy when available. Always falls back to deterministic.

### 3. Contract-Based Integration
Products communicate through typed contracts (`CareRecommendation`, `FinancialProfile`). Frontend consumes contracts, never raw scores.

### 4. Server-Side Business Logic
Scoring, gates, LLM mediation, and guardrails stay server-side. Frontend is a presentation layer.

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- OpenAI API key (for LLM features)

### Run the Application

```bash
# 1. Install dependencies
cd frontend && npm install
cd ../backend && npm install

# 2. Configure backend (create .env file)
cd backend
echo "OPENAI_API_KEY=your-key-here" > .env
echo "PORT=3000" >> .env
echo "LLM_MODE=assist" >> .env

# 3. Start backend (Terminal 1)
node server.js

# 4. Start frontend (Terminal 2)
cd frontend && npm start

# 5. Open browser
open http://localhost:4200
```

**Access points:**
- Frontend: http://localhost:4200
- Hub/Lobby: http://localhost:4200/hub
- GCP Assessment: http://localhost:4200/gcp
- Backend API: http://localhost:3000/api

---

## Project Structure

```
senior_navigator_v4/
├── docs/                   # 📚 Developer documentation
│   ├── DETERMINISTIC_VS_LLM.md      # How scoring works ⭐
│   ├── GCP_ARCHITECTURE.md          # System architecture
│   ├── CONFIGURATION_GUIDE.md       # JSON config reference
│   ├── TESTING_GUIDE.md             # Testing patterns
│   ├── DEPLOYMENT.md                # Production deployment
│   └── API_EXAMPLES.md              # API testing examples
│
├── frontend/               # Angular 20 application
│   ├── src/app/
│   │   ├── core/           # Services, guards, interceptors
│   │   ├── shared/         # Shared components, models, pipes
│   │   └── features/       # Feature modules
│   │       ├── gcp/        # 🎯 Guided Care Plan (primary feature)
│   │       ├── cost-planner/
│   │       ├── pfma/
│   │       └── hub/
│   └── src/assets/
│       └── configs/        # JSON manifests (gcp_module.json)
│
├── backend/                # Node.js/Express API
│   ├── server.js           # Express server
│   ├── routes/             # API endpoints
│   │   └── gcp.js          # POST /api/gcp/assess
│   └── services/           # Business logic
│       ├── gcpScoring.js   # 🎯 Deterministic scoring engine
│       ├── gcpNaviEngine.js # 🎯 LLM adjudication
│       └── llmClient.js    # OpenAI integration
│
└── GETTING_STARTED.md      # ⭐ Start here for onboarding
```

---

## Key Features

### 1. JSON-Driven Configuration
All questions, options, scores, and business rules live in `/frontend/src/assets/configs/gcp_module.json` (1066 lines). No hardcoded questions in components.

### 2. Dual-Engine Scoring System
- **Deterministic Engine**: Always runs, calculates scores from form data
- **LLM Engine** (optional): GPT-4o-mini provides AI-enhanced recommendations
- **Adjudication**: Sophisticated guardrail system decides final recommendation

### 3. Three LLM Policy Modes
- `off` - Deterministic only (no AI calls)
- `shadow` - LLM runs but doesn't override (logging/comparison only)
- `assist` - LLM can override deterministic if confidence > 70%

### 4. Guardrail System (5 layers)
1. Cognitive gate - Enforces memory care for severe cognitive issues
2. Behavior gate - Blocks low tiers for high-risk behaviors
3. Tier filtering - LLM can only suggest allowed tiers
4. Confidence threshold - Rejects low-confidence LLM suggestions
5. Fallback strategy - Always returns deterministic if LLM fails

---

## Architecture Highlights

### Frontend (Angular 20)
- **Standalone components** with inject() pattern
- **NgRx state management** - 71 tests, 100% coverage
- **ngx-formly** - Renders forms from JSON configuration
- **Material Design UI** - Responsive, accessible components
- **TypeScript strict mode** - Full type safety

### Backend (Node.js/Express)
- **Deterministic scoring** - Pure JavaScript, no dependencies
- **OpenAI integration** - GPT-4o-mini via official SDK
- **Tier map routing** - Cognition × Support matrix
- **Guardrails** - Server-side validation & safety checks
- **Contract-based API** - Returns `CareRecommendation` contract

### Test Coverage
- ✅ 71 passing tests (reducers, selectors)
- ✅ 100% coverage on NgRx store layer
- ✅ Edge cases and error handling tested
- ⏳ Component tests (planned)
- ⏳ E2E tests (planned)

---

## Documentation

### For Developers
- **[GETTING_STARTED.md](./GETTING_STARTED.md)** - Quick onboarding guide
- **[docs/GCP_ARCHITECTURE.md](./docs/GCP_ARCHITECTURE.md)** - Complete system architecture
- **[docs/DETERMINISTIC_VS_LLM.md](./docs/DETERMINISTIC_VS_LLM.md)** - Scoring algorithms explained
- **[docs/API_EXAMPLES.md](./docs/API_EXAMPLES.md)** - Test the API with curl

### For Configuration
- **[docs/CONFIGURATION_GUIDE.md](./docs/CONFIGURATION_GUIDE.md)** - Edit gcp_module.json

### For Testing
- **[docs/TESTING_GUIDE.md](./docs/TESTING_GUIDE.md)** - Test patterns and examples

### For Deployment
- **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Production deployment guide

---

## Implementation Status

### ✅ Completed (Production Ready)
- ✅ Full GCP assessment flow (intro → questions → results)
- ✅ JSON-driven forms with ngx-formly
- ✅ NgRx state management with effects
- ✅ Backend scoring API with deterministic engine
- ✅ LLM integration (OpenAI GPT-4o-mini)
- ✅ Guardrail system and adjudication logic
- ✅ Unit tests (71 tests, 100% store coverage)
- ✅ Comprehensive documentation (6 guides)
- ✅ Hub/lobby navigation
- ✅ MCIP product coordination
- ✅ Error handling and validation

### 🚧 Planned Enhancements
- ⏳ Component integration tests
- ⏳ E2E test suite
- ⏳ Sentry error tracking
- ⏳ Cost Planner module
- ⏳ PFMA module
- ⏳ Production deployment (AWS/GCP)

---

## Development Commands

### Run Application
```bash
# Backend (Terminal 1)
cd backend && node server.js

# Frontend (Terminal 2)
cd frontend && npm start
```

### Run Tests
```bash
# All tests
cd frontend && npm test

# Tests with coverage
npm test -- --code-coverage

# Specific tests
npm test -- --include='**/gcp.reducer.spec.ts'
```

### Build for Production
```bash
cd frontend && npm run build
# Output: dist/senior-navigator-v4/browser/
```

---

## API Endpoints

### POST /api/gcp/assess
Submit GCP assessment and receive care recommendation.

**Request:**
```json
{
  "formData": { "question_id": "answer_value" },
  "config": { "module": {...}, "sections": [...] },
  "options": { "llm_mode": "assist" }
}
```

**Response:**
```json
{
  "tier": "assisted_living",
  "tier_score": 18,
  "confidence": 0.95,
  "flags": [...],
  "rationale": [...],
  "deterministic_result": {...},
  "llm_result": {...},
  "adjudication": {...}
}
```

See [docs/API_EXAMPLES.md](./docs/API_EXAMPLES.md) for complete examples.

---

## Environment Variables

### Backend (.env)
```bash
# Required
OPENAI_API_KEY=sk-...              # OpenAI API key

# Optional
PORT=3000                          # Server port (default: 3000)
LLM_MODE=assist                    # off | shadow | assist (default: shadow)
CONFIDENCE_THRESHOLD=0.7           # LLM confidence threshold (default: 0.7)
OPENAI_MODEL=gpt-4o-mini          # OpenAI model (default: gpt-4o-mini)
```

### Frontend (environment.ts)
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  llm: { enabled: true, defaultMode: 'shadow' }
};
```

---

## Questions?

### Understanding the System
1. Read [GETTING_STARTED.md](./GETTING_STARTED.md) for 5-minute overview
2. Read [docs/DETERMINISTIC_VS_LLM.md](./docs/DETERMINISTIC_VS_LLM.md) for scoring logic
3. Review backend code: `backend/services/gcpScoring.js` and `gcpNaviEngine.js`
4. Test the API with [docs/API_EXAMPLES.md](./docs/API_EXAMPLES.md)

### Configuration Questions
- See [docs/CONFIGURATION_GUIDE.md](./docs/CONFIGURATION_GUIDE.md) for editing `gcp_module.json`

### Testing Questions
- See [docs/TESTING_GUIDE.md](./docs/TESTING_GUIDE.md) for test patterns

### Deployment Questions
- See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for production deployment

---

**Version**: 1.0.0  
**Created**: November 2025  
**License**: Proprietary
