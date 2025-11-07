# Senior Navigator v4 - Angular + Formly Setup Guide

**Created**: November 7, 2025  
**Architecture**: Angular 17+ with ngx-formly  
**Reference**: v3 Streamlit prototype (docs/ in cca_senior_navigator_v3)

---

## Overview

Senior Navigator v4 is a complete rebuild of the v3 prototype using:
- **Frontend**: Angular 17+ with ngx-formly for JSON-driven forms
- **Backend**: Node.js/NestJS or Python FastAPI (TBD)
- **State Management**: NgRx (mirrors Streamlit session_state)
- **Forms**: ngx-formly (mirrors module.json rendering)
- **Contracts**: MCIP-style typed contracts (CareRecommendation, FinancialProfile)

---

## Architecture Principles (from v3)

### 1. JSON-Driven Configuration
All questions, options, scores, and business rules live in JSON manifests:
- `module.json` defines questions, options, scores, flags
- Frontend reads JSON and generates forms dynamically
- Backend reads same JSON for scoring logic
- **No hardcoded questions** - everything configurable

### 2. Deterministic + Optional LLM
- Base system works 100% without AI
- LLM enhances accuracy when available
- Always falls back to deterministic
- Server-side only (never expose LLM to frontend)

### 3. Contract-Based Integration
Products communicate through typed contracts:
- `CareRecommendation` (from GCP)
- `FinancialProfile` (from Cost Planner/PFMA)
- MCIP coordinator publishes/retrieves contracts
- Frontend consumes contracts, never raw scores

### 4. Layered Architecture
```
┌─────────────────────────────────────────────┐
│           Angular Frontend                  │
│  - ngx-formly renders forms from JSON       │
│  - State management (NgRx)                  │
│  - Consumes contracts only                  │
└──────────────────┬──────────────────────────┘
                   │ HTTP/REST
                   ▼
┌─────────────────────────────────────────────┐
│           Backend API                       │
│  - Scoring engine (deterministic)           │
│  - LLM mediation (optional)                 │
│  - Guardrails & validation                  │
│  - Contract publishing                      │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│           Data Layer                        │
│  - PostgreSQL (persistence)                 │
│  - Redis (session cache)                    │
│  - S3/Cloud Storage (JSON configs)          │
└─────────────────────────────────────────────┘
```

---

## Project Structure

```
senior_navigator_v4/
├── README.md
├── SETUP_GUIDE.md (this file)
│
├── frontend/                      # Angular application
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/              # Singleton services
│   │   │   │   ├── services/
│   │   │   │   │   ├── mcip.service.ts           # Contract coordinator
│   │   │   │   │   ├── module-config.service.ts  # JSON manifest loader
│   │   │   │   │   └── api.service.ts            # HTTP client
│   │   │   │   └── guards/
│   │   │   │
│   │   │   ├── shared/            # Shared components/pipes
│   │   │   │   ├── components/
│   │   │   │   ├── pipes/
│   │   │   │   └── models/        # TypeScript interfaces
│   │   │   │       ├── contracts.ts               # CareRecommendation, FinancialProfile
│   │   │   │       └── module-config.ts           # ModuleConfig interface
│   │   │   │
│   │   │   ├── features/          # Feature modules
│   │   │   │   ├── gcp/           # Guided Care Plan
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── gcp-form/
│   │   │   │   │   │   ├── gcp-result/
│   │   │   │   │   │   └── gcp-summary/
│   │   │   │   │   ├── services/
│   │   │   │   │   │   └── gcp.service.ts
│   │   │   │   │   ├── store/     # NgRx for GCP state
│   │   │   │   │   │   ├── gcp.actions.ts
│   │   │   │   │   │   ├── gcp.reducer.ts
│   │   │   │   │   │   ├── gcp.selectors.ts
│   │   │   │   │   │   └── gcp.effects.ts
│   │   │   │   │   └── gcp-routing.module.ts
│   │   │   │   │
│   │   │   │   ├── cost-planner/  # Cost Planner
│   │   │   │   │   ├── components/
│   │   │   │   │   ├── services/
│   │   │   │   │   └── store/
│   │   │   │   │
│   │   │   │   ├── pfma/          # Personal Financial & Medical Assessment
│   │   │   │   │   ├── components/
│   │   │   │   │   ├── services/
│   │   │   │   │   └── store/
│   │   │   │   │
│   │   │   │   └── hub/           # Navigation hub
│   │   │   │       ├── components/
│   │   │   │       └── services/
│   │   │   │
│   │   │   └── app-routing.module.ts
│   │   │
│   │   ├── assets/
│   │   │   ├── configs/           # JSON manifests (loaded at runtime)
│   │   │   │   ├── gcp_module.json
│   │   │   │   ├── cost_planner_modules.json
│   │   │   │   └── regional_cost_config.json
│   │   │   ├── images/
│   │   │   └── styles/
│   │   │
│   │   └── environments/
│   │
│   ├── angular.json
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                       # Backend API (NestJS or FastAPI)
│   ├── src/
│   │   ├── modules/
│   │   │   ├── gcp/
│   │   │   │   ├── gcp.controller.ts
│   │   │   │   ├── gcp.service.ts           # Scoring logic
│   │   │   │   ├── gcp-llm.service.ts       # LLM mediation
│   │   │   │   └── dto/
│   │   │   │       ├── gcp-answers.dto.ts
│   │   │   │       └── care-recommendation.dto.ts
│   │   │   │
│   │   │   ├── cost-planner/
│   │   │   │   ├── cost-planner.controller.ts
│   │   │   │   ├── cost-planner.service.ts
│   │   │   │   └── dto/
│   │   │   │
│   │   │   └── mcip/              # Contract coordinator
│   │   │       ├── mcip.controller.ts
│   │   │       ├── mcip.service.ts
│   │   │       └── contracts/
│   │   │           ├── care-recommendation.contract.ts
│   │   │           └── financial-profile.contract.ts
│   │   │
│   │   ├── common/
│   │   │   ├── config/            # JSON manifest loader
│   │   │   ├── guards/
│   │   │   └── interceptors/
│   │   │
│   │   └── main.ts
│   │
│   ├── configs/                   # JSON manifests (server-side copy)
│   │   ├── gcp_module.json
│   │   └── cost_planner_modules.json
│   │
│   ├── package.json
│   └── tsconfig.json
│
├── shared/                        # Shared types (frontend + backend)
│   ├── contracts/
│   │   ├── care-recommendation.interface.ts
│   │   └── financial-profile.interface.ts
│   └── module-config.interface.ts
│
└── docs/                          # Architecture docs
    ├── ARCHITECTURE.md
    ├── API_SPEC.md
    └── MIGRATION_FROM_V3.md
```

---

## Step 1: Initialize Angular Project

```bash
cd /Users/shane/Desktop/senior_navigator_v4

# Create Angular workspace
ng new frontend --routing --style=scss --skip-git

cd frontend

# Install core dependencies
npm install @ngx-formly/core @ngx-formly/material
npm install @angular/material @angular/cdk
npm install @ngrx/store @ngrx/effects @ngrx/store-devtools

# Install dev dependencies
npm install -D @types/node
```

---

## Step 2: Configure ngx-formly

Add to `app.config.ts` or `app.module.ts`:

```typescript
import { FormlyModule } from '@ngx-formly/core';
import { FormlyMaterialModule } from '@ngx-formly/material';

@NgModule({
  imports: [
    // ...
    FormlyModule.forRoot({
      validationMessages: [
        { name: 'required', message: 'This field is required' },
      ],
    }),
    FormlyMaterialModule,
  ],
})
export class AppModule { }
```

---

## Step 3: Create Core Services

### ModuleConfigService (loads JSON manifests)

```typescript
// frontend/src/app/core/services/module-config.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

export interface ModuleConfig {
  module_id: string;
  version: string;
  metadata: {
    title: string;
    description: string;
  };
  sections: Section[];
  tier_thresholds?: Record<string, TierThreshold>;
}

export interface Section {
  section_id: string;
  title: string;
  description?: string;
  order: number;
  fields: Field[];
}

export interface Field {
  field_id: string;
  type: 'radio' | 'checkbox' | 'text' | 'number' | 'select';
  label: string;
  help_text?: string;
  required: boolean;
  order: number;
  options?: Option[];
  conditional?: {
    field: string;
    values: string[];
  };
}

export interface Option {
  value: string;
  label: string;
  score: number;
  flags: string[];
}

export interface TierThreshold {
  min: number;
  max: number;
  label: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class ModuleConfigService {
  private configCache = new Map<string, Observable<ModuleConfig>>();

  constructor(private http: HttpClient) {}

  /**
   * Load module configuration from JSON manifest
   * Caches result to avoid repeated HTTP calls
   */
  loadConfig(moduleId: string): Observable<ModuleConfig> {
    if (!this.configCache.has(moduleId)) {
      const config$ = this.http
        .get<ModuleConfig>(`/assets/configs/${moduleId}_module.json`)
        .pipe(
          shareReplay(1) // Cache the result
        );
      this.configCache.set(moduleId, config$);
    }
    return this.configCache.get(moduleId)!;
  }

  /**
   * Convert ModuleConfig to Formly field configuration
   * This mirrors the logic in v3's navi_module.py render_module()
   */
  toFormlyConfig(config: ModuleConfig): any[] {
    const formlyFields: any[] = [];

    for (const section of config.sections) {
      // Section header (just display, not a field)
      formlyFields.push({
        template: `<h3>${section.title}</h3>`,
      });

      if (section.description) {
        formlyFields.push({
          template: `<p class="section-description">${section.description}</p>`,
        });
      }

      // Convert each field
      for (const field of section.fields) {
        formlyFields.push(this.fieldToFormly(field));
      }
    }

    return formlyFields;
  }

  private fieldToFormly(field: Field): any {
    const formlyField: any = {
      key: field.field_id,
      type: this.mapFieldType(field.type),
      templateOptions: {
        label: field.label,
        description: field.help_text,
        required: field.required,
        options: field.options?.map(opt => ({
          value: opt.value,
          label: opt.label,
        })),
      },
    };

    // Conditional logic (mirrors v3's should_show_field)
    if (field.conditional) {
      formlyField.hideExpression = (model: any) => {
        const dependsOnValue = model[field.conditional!.field];
        return !field.conditional!.values.includes(dependsOnValue);
      };
    }

    return formlyField;
  }

  private mapFieldType(type: string): string {
    const typeMap: Record<string, string> = {
      radio: 'radio',
      checkbox: 'multicheckbox',
      text: 'input',
      number: 'input',
      select: 'select',
    };
    return typeMap[type] || 'input';
  }
}
```

---

## Step 4: Create Contract Interfaces

```typescript
// frontend/src/app/shared/models/contracts.ts

/**
 * CareRecommendation contract
 * Mirrors v3's CareRecommendation in core/mcip.py
 */
export interface CareRecommendation {
  tier: 'independent' | 'in_home' | 'assisted_living' | 'memory_care' | 'memory_care_high_acuity';
  tier_score: number;           // LLM confidence or deterministic score
  confidence: number;           // % of questions answered
  flags: string[];              // Collected from option.flags
  rationale: string[];          // Human-readable explanations
  source: 'deterministic' | 'llm' | 'fallback';
  deterministic_tier: string;   // Always present
  llm_tier?: string;            // Present if LLM ran
  allowed_tiers: string[];      // Post-gate allowed options
  bands?: {
    cognitive: string;
    support: string;
  };
  timestamp: string;            // ISO 8601
}

/**
 * FinancialProfile contract
 * Mirrors v3's FinancialProfile in core/mcip.py
 */
export interface FinancialProfile {
  income_monthly: number;
  assets_liquid: number;
  expenses_monthly: number;
  debt_monthly: number;
  runway_months: number;        // Calculated field
  affordability_tier: string;
  recommendations: string[];
  timestamp: string;
}

/**
 * MCIP Contract wrapper
 * All contracts flow through this structure
 */
export interface MCIPContract<T> {
  contract_type: string;
  version: string;
  data: T;
  metadata: {
    created_at: string;
    updated_at: string;
    session_id: string;
    user_id?: string;
  };
}
```

---

## Step 5: Create MCIP Service

```typescript
// frontend/src/app/core/services/mcip.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { CareRecommendation, FinancialProfile, MCIPContract } from '@shared/models/contracts';

/**
 * MCIP Coordinator Service
 * Mirrors v3's MCIP class in core/mcip.py
 * 
 * Responsibilities:
 * - Publish/retrieve contracts
 * - Track product completion
 * - Coordinate cross-product communication
 */
@Injectable({
  providedIn: 'root'
})
export class MCIPService {
  private apiUrl = '/api/mcip';
  
  // Local state mirrors session_state in v3
  private careRecommendation$ = new BehaviorSubject<CareRecommendation | null>(null);
  private financialProfile$ = new BehaviorSubject<FinancialProfile | null>(null);
  private productCompletion$ = new BehaviorSubject<Set<string>>(new Set());

  constructor(private http: HttpClient) {
    this.loadState();
  }

  /**
   * Publish CareRecommendation contract
   * Called when GCP completes
   */
  publishCareRecommendation(care: CareRecommendation): Observable<void> {
    return this.http.post<MCIPContract<CareRecommendation>>(
      `${this.apiUrl}/contracts/care-recommendation`,
      { data: care }
    ).pipe(
      tap(contract => {
        this.careRecommendation$.next(contract.data);
        this.markProductComplete('gcp');
      }),
      map(() => void 0)
    );
  }

  /**
   * Retrieve CareRecommendation contract
   * Used by Cost Planner to get tier information
   */
  getCareRecommendation(): Observable<CareRecommendation | null> {
    return this.careRecommendation$.asObservable();
  }

  /**
   * Publish FinancialProfile contract
   * Called when Cost Planner or PFMA completes
   */
  publishFinancialProfile(profile: FinancialProfile): Observable<void> {
    return this.http.post<MCIPContract<FinancialProfile>>(
      `${this.apiUrl}/contracts/financial-profile`,
      { data: profile }
    ).pipe(
      tap(contract => {
        this.financialProfile$.next(contract.data);
        this.markProductComplete('cost_planner');
      }),
      map(() => void 0)
    );
  }

  /**
   * Get FinancialProfile contract
   */
  getFinancialProfile(): Observable<FinancialProfile | null> {
    return this.financialProfile$.asObservable();
  }

  /**
   * Mark product as complete
   * Mirrors v3's MCIP.mark_product_complete()
   */
  markProductComplete(productKey: string): void {
    const completed = this.productCompletion$.value;
    completed.add(this.normalizeProductKey(productKey));
    this.productCompletion$.next(completed);
    this.saveState();
  }

  /**
   * Check if product is complete
   */
  isProductComplete(productKey: string): Observable<boolean> {
    return this.productCompletion$.pipe(
      map(completed => completed.has(this.normalizeProductKey(productKey)))
    );
  }

  /**
   * Normalize product keys (gcp_v4 → gcp, cost_v2 → cost_planner)
   * Mirrors v3's MCIP normalization logic
   */
  private normalizeProductKey(key: string): string {
    const normalizationMap: Record<string, string> = {
      'gcp_v4': 'gcp',
      'gcp_v3': 'gcp',
      'cost_v2': 'cost_planner',
      'cost_planner_v2': 'cost_planner',
      'pfma_v3': 'pfma',
    };
    return normalizationMap[key] || key;
  }

  /**
   * Load state from localStorage (mirrors session persistence)
   */
  private loadState(): void {
    const saved = localStorage.getItem('mcip_state');
    if (saved) {
      const state = JSON.parse(saved);
      if (state.careRecommendation) {
        this.careRecommendation$.next(state.careRecommendation);
      }
      if (state.financialProfile) {
        this.financialProfile$.next(state.financialProfile);
      }
      if (state.completed) {
        this.productCompletion$.next(new Set(state.completed));
      }
    }
  }

  /**
   * Save state to localStorage
   */
  private saveState(): void {
    const state = {
      careRecommendation: this.careRecommendation$.value,
      financialProfile: this.financialProfile$.value,
      completed: Array.from(this.productCompletion$.value),
    };
    localStorage.setItem('mcip_state', JSON.stringify(state));
  }

  /**
   * Clear all contracts (for testing or reset)
   */
  clearAll(): void {
    this.careRecommendation$.next(null);
    this.financialProfile$.next(null);
    this.productCompletion$.next(new Set());
    localStorage.removeItem('mcip_state');
  }
}
```

---

## Next Steps

1. **Initialize Angular project** (Step 1)
2. **Copy JSON manifests** from v3 to v4 `assets/configs/`
3. **Create GCP feature module** with Formly form
4. **Set up NgRx store** for GCP state
5. **Create backend API** for scoring and LLM mediation
6. **Implement MCIP contract flow**

---

## References

All architecture decisions are based on v3 documentation:
- `ARCHITECT_QUESTIONS_ANSWERED.md` - Key questions answered
- `JSON_CONFIG_AND_LLM_GUIDE.md` - Complete pipeline explanation
- `ARCHITECTURE_FOR_REPLATFORM.md` - System architecture
- `CODE_REFERENCE_MAP.md` - v3 code locations

---

**Ready to proceed?** Let me know which step you'd like to tackle first!
