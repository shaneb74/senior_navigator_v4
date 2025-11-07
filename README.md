# Senior Navigator v4

**Status**: 🚧 In Development  
**Architecture**: Angular 17+ with ngx-formly  
**Purpose**: Production rebuild of Senior Navigator v3 prototype

---

## Overview

Senior Navigator v4 is a complete rewrite of the v3 Streamlit prototype using modern web technologies:

- **Frontend**: Angular 17+ with ngx-formly for JSON-driven forms
- **Backend**: NestJS or FastAPI (TBD)
- **State Management**: NgRx (mirrors Streamlit session_state)
- **Forms**: ngx-formly (mirrors module.json rendering)
- **Contracts**: MCIP-style typed contracts

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

- Node.js 18+ 
- npm 9+
- Angular CLI 17+

### Setup

```bash
# Run the setup script
./setup.sh

# Or manually:
cd frontend
ng serve

# Open browser
open http://localhost:4200
```

---

## Project Structure

```
senior_navigator_v4/
├── frontend/           # Angular application
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/           # Services, guards
│   │   │   ├── shared/         # Components, models
│   │   │   └── features/       # GCP, Cost Planner, PFMA, Hub
│   │   └── assets/
│   │       └── configs/        # JSON manifests
│   └── package.json
│
├── backend/            # Backend API (coming soon)
├── docs/               # Architecture documentation
└── shared/             # Shared TypeScript types
```

---

## Architecture

### Frontend (Angular)

- **ngx-formly**: Renders forms from JSON manifests (mirrors v3's `navi_module.py`)
- **NgRx**: State management (mirrors v3's `session_state`)
- **MCIP Service**: Contract coordinator (mirrors v3's `mcip.py`)

### Backend (NestJS/FastAPI)

- **Scoring Engine**: Deterministic scoring from JSON (mirrors v3's `logic.py`)
- **LLM Mediation**: Optional AI enhancement (mirrors v3's `gcp_navi_engine.py`)
- **Contract Publishing**: Typed contracts (mirrors v3's MCIP)

### JSON Manifests

- **`gcp_module.json`**: Questions, options, scores, flags
- **`cost_planner_modules.json`**: Cost assessment modules
- **`regional_cost_config.json`**: Regional pricing data

---

## Implementation Status

### ✅ Completed
- Project structure defined
- Setup script created
- Core service interfaces designed

### 🚧 In Progress
- Angular application setup
- ngx-formly integration
- NgRx store setup

### ⏳ Planned
- GCP feature module
- Cost Planner module
- Backend API
- LLM integration
- Testing suite

---

## Documentation

- **`SETUP_GUIDE.md`**: Complete setup and implementation guide
- **`docs/ARCHITECTURE.md`**: System architecture (coming soon)
- **`docs/MIGRATION_FROM_V3.md`**: Migration notes (coming soon)

---

## Reference: v3 Prototype

All architecture decisions are based on the v3 Streamlit prototype:

- **Repository**: `cca_senior_navigator_v3`
- **Branch**: `feature/refactor-gcp-cost-planner`
- **Documentation**: See `docs/` directory in v3

Key v3 reference documents:
- `ARCHITECT_QUESTIONS_ANSWERED.md` - How scoring/LLM/JSON works
- `JSON_CONFIG_AND_LLM_GUIDE.md` - Complete pipeline explanation
- `ARCHITECTURE_FOR_REPLATFORM.md` - System architecture
- `CODE_REFERENCE_MAP.md` - v3 code locations

---

## Development

### Run Development Server

```bash
cd frontend
ng serve
```

### Run Tests

```bash
cd frontend
ng test
```

### Build for Production

```bash
cd frontend
ng build --configuration production
```

---

## Contributing

See `SETUP_GUIDE.md` for:
- Architecture principles
- Code organization
- Service patterns
- State management approach

---

## Questions?

This is a direct port of the v3 prototype architecture. For architectural questions, refer to:

1. v3 documentation in `cca_senior_navigator_v3/docs/`
2. `SETUP_GUIDE.md` in this repo
3. Code comments in core services

---

**Version**: 0.1.0  
**Created**: November 7, 2025  
**License**: Proprietary
