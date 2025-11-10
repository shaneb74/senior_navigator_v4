# GCP Testing Guide

## Overview

This guide covers testing strategies for the GCP (Guided Care Plan) module. While **comprehensive tests haven't been implemented yet**, this document outlines the testing approach, patterns, and examples to follow when adding tests.

**Current Test Coverage:** ~0%  
**Target Coverage:** 80%+ (reducers, selectors, services, components)

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Stack](#test-stack)
3. [Running Tests](#running-tests)
4. [Testing Patterns](#testing-patterns)
5. [NgRx Testing](#ngrx-testing)
6. [Component Testing](#component-testing)
7. [Service Testing](#service-testing)
8. [Backend Testing](#backend-testing)
9. [E2E Testing](#e2e-testing)
10. [Test Recipes](#test-recipes)

---

## Testing Philosophy

### Why Test?

1. **Confidence in Changes** - Refactor without fear
2. **Documentation** - Tests show how code should behave
3. **Regression Prevention** - Catch bugs before production
4. **Design Feedback** - Hard to test = poorly designed

### What to Test (Priority Order)

**Highest ROI:**
1. ✅ **Reducers** - Pure functions, easy to test, critical logic
2. ✅ **Selectors** - Pure functions, easy to test, used everywhere
3. ✅ **Services** - Business logic, API calls, scoring algorithms

**Medium ROI:**
4. ⚠️ **Components** - Integration tests for critical flows
5. ⚠️ **Effects** - Harder to test, but important for side effects

**Lower ROI (but still valuable):**
6. 📝 **E2E Tests** - Full user journeys (slow, brittle)
7. 📝 **Visual Regression** - UI consistency checks

---

## Test Stack

### Frontend Testing

```json
{
  "jasmine": "Core test framework (built into Angular)",
  "karma": "Test runner for unit tests",
  "@testing-library/angular": "User-centric testing utilities",
  "@ngneat/spectator": "Simplified Angular testing (optional)",
  "jasmine-marbles": "Testing observables/RxJS"
}
```

**Not yet installed!** See [Setup Instructions](#setup-instructions).

### Backend Testing

```json
{
  "jest": "Test framework and runner",
  "supertest": "HTTP assertion library"
}
```

---

## Running Tests

### Setup Instructions

**Install Frontend Test Dependencies:**
```bash
cd frontend
npm install --save-dev @testing-library/angular jasmine-marbles
```

**Run Tests:**
```bash
# Unit tests (watch mode)
npm test

# Unit tests (single run)
npm test -- --watch=false

# Unit tests with coverage
npm test -- --code-coverage

# Specific file
npm test -- --include='**/gcp.reducer.spec.ts'
```

**Install Backend Test Dependencies:**
```bash
cd backend
npm install --save-dev jest supertest
```

**Add to backend/package.json:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

**Run Backend Tests:**
```bash
cd backend
npm test
```

---

## Testing Patterns

### AAA Pattern (Arrange-Act-Assert)

```typescript
it('should calculate total score correctly', () => {
  // Arrange - Set up test data
  const formData = {
    fall_risk: 'yes',
    mobility_status: 'walker'
  };
  
  // Act - Execute the code under test
  const result = calculateScore(formData);
  
  // Assert - Verify the outcome
  expect(result.totalScore).toBe(6);
});
```

### Given-When-Then (BDD Style)

```typescript
describe('GCP Reducer', () => {
  describe('loadModuleConfigSuccess', () => {
    it('should store config when load succeeds', () => {
      // Given - Initial state
      const initialState = { config: null, loading: true };
      const config = { module: { id: 'gcp' } };
      
      // When - Action dispatched
      const action = GcpActions.loadModuleConfigSuccess({ config });
      const newState = gcpReducer(initialState, action);
      
      // Then - State updated correctly
      expect(newState.config).toBe(config);
      expect(newState.loading).toBe(false);
    });
  });
});
```

---

## NgRx Testing

### Testing Reducers

**Why Test Reducers?**
- Pure functions (no side effects)
- Easy to test
- Critical business logic
- Highest ROI

#### Pattern: Test Each Action

**File:** `frontend/src/app/features/gcp/store/gcp.reducer.spec.ts`

```typescript
import { gcpReducer, initialState } from './gcp.reducer';
import * as GcpActions from './gcp.actions';

describe('GCP Reducer', () => {
  describe('unknown action', () => {
    it('should return the previous state', () => {
      const action = {} as any;
      const result = gcpReducer(initialState, action);
      expect(result).toBe(initialState);
    });
  });

  describe('loadModuleConfig', () => {
    it('should set loading to true', () => {
      const action = GcpActions.loadModuleConfig({ moduleId: 'gcp' });
      const state = gcpReducer(initialState, action);
      
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('loadModuleConfigSuccess', () => {
    it('should store config and set loading to false', () => {
      const config = {
        module: { id: 'gcp', name: 'Test' },
        sections: []
      };
      const action = GcpActions.loadModuleConfigSuccess({ config });
      const state = gcpReducer(initialState, action);
      
      expect(state.config).toEqual(config);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('loadModuleConfigFailure', () => {
    it('should store error and set loading to false', () => {
      const error = 'Failed to load config';
      const action = GcpActions.loadModuleConfigFailure({ error });
      const state = gcpReducer(initialState, action);
      
      expect(state.error).toBe(error);
      expect(state.loading).toBe(false);
      expect(state.config).toBeNull();
    });
  });

  describe('updateFormData', () => {
    it('should merge new form data with existing data', () => {
      const initialWithData = {
        ...initialState,
        formData: { question1: 'answer1' }
      };
      
      const action = GcpActions.updateFormData({
        formData: { question2: 'answer2' }
      });
      const state = gcpReducer(initialWithData, action);
      
      expect(state.formData).toEqual({
        question1: 'answer1',
        question2: 'answer2'
      });
    });
  });

  describe('submitAssessmentSuccess', () => {
    it('should store recommendation and clear submitting flag', () => {
      const recommendation = {
        care_tier: 'assisted_living',
        deterministic: { /* ... */ },
        llm: { /* ... */ }
      };
      
      const action = GcpActions.submitAssessmentSuccess({ recommendation });
      const state = gcpReducer(initialState, action);
      
      expect(state.recommendation).toEqual(recommendation);
      expect(state.submitting).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
```

---

### Testing Selectors

**Why Test Selectors?**
- Pure functions
- Often contain derived logic
- Easy to test
- High reuse across components

#### Pattern: Test Each Selector

**File:** `frontend/src/app/features/gcp/store/gcp.selectors.spec.ts`

```typescript
import * as fromGcp from './gcp.reducer';
import * as GcpSelectors from './gcp.selectors';

describe('GCP Selectors', () => {
  const mockState: fromGcp.State = {
    config: {
      module: { id: 'gcp', name: 'Guided Care Plan' },
      sections: [
        { id: 'intro', title: 'Introduction', questions: [] },
        { id: 'cognition', title: 'Cognition', questions: [] }
      ]
    },
    formData: { question1: 'answer1' },
    currentStepId: 'cognition',
    recommendation: null,
    loading: false,
    submitting: false,
    error: null
  };

  describe('selectGcpState', () => {
    it('should select the GCP state slice', () => {
      const result = GcpSelectors.selectGcpState.projector(mockState);
      expect(result).toBe(mockState);
    });
  });

  describe('selectModuleConfig', () => {
    it('should select the module config', () => {
      const result = GcpSelectors.selectModuleConfig.projector(mockState);
      expect(result).toBe(mockState.config);
    });
  });

  describe('selectFormData', () => {
    it('should select form data', () => {
      const result = GcpSelectors.selectFormData.projector(mockState);
      expect(result).toEqual({ question1: 'answer1' });
    });
  });

  describe('selectCurrentStep', () => {
    it('should select the current section by ID', () => {
      const result = GcpSelectors.selectCurrentStep.projector(
        mockState.config,
        mockState.currentStepId
      );
      
      expect(result).toEqual({
        id: 'cognition',
        title: 'Cognition',
        questions: []
      });
    });

    it('should return null if no config loaded', () => {
      const result = GcpSelectors.selectCurrentStep.projector(null, 'intro');
      expect(result).toBeNull();
    });
  });

  describe('selectIsLoading', () => {
    it('should return true when loading or submitting', () => {
      const loadingState = { ...mockState, loading: true };
      expect(GcpSelectors.selectIsLoading.projector(
        loadingState.loading,
        loadingState.submitting
      )).toBe(true);

      const submittingState = { ...mockState, submitting: true };
      expect(GcpSelectors.selectIsLoading.projector(
        submittingState.loading,
        submittingState.submitting
      )).toBe(true);
    });

    it('should return false when neither loading nor submitting', () => {
      expect(GcpSelectors.selectIsLoading.projector(false, false)).toBe(false);
    });
  });

  describe('selectRecommendation', () => {
    it('should select the care recommendation', () => {
      const stateWithRec = {
        ...mockState,
        recommendation: {
          care_tier: 'assisted_living',
          deterministic: { tier: 'assisted_living', score: 18 },
          llm: null
        }
      };
      
      const result = GcpSelectors.selectRecommendation.projector(stateWithRec);
      expect(result.care_tier).toBe('assisted_living');
    });
  });
});
```

---

### Testing Effects

**Why Test Effects?**
- Orchestrate async operations
- Handle side effects (API calls, routing)
- More complex to test but critical

#### Pattern: Use Jasmine Marbles

**Install:**
```bash
npm install --save-dev jasmine-marbles
```

**File:** `frontend/src/app/features/gcp/store/gcp.effects.spec.ts`

```typescript
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError } from 'rxjs';
import { cold, hot } from 'jasmine-marbles';

import { GcpEffects } from './gcp.effects';
import * as GcpActions from './gcp.actions';
import { GcpService } from '../services/gcp.service';
import { ModuleConfigService } from '../../../core/services/module-config.service';

describe('GcpEffects', () => {
  let actions$: Observable<any>;
  let effects: GcpEffects;
  let gcpService: jasmine.SpyObj<GcpService>;
  let configService: jasmine.SpyObj<ModuleConfigService>;

  beforeEach(() => {
    const gcpServiceSpy = jasmine.createSpyObj('GcpService', ['submitAssessment']);
    const configServiceSpy = jasmine.createSpyObj('ModuleConfigService', ['loadModuleConfig']);

    TestBed.configureTestingModule({
      providers: [
        GcpEffects,
        provideMockActions(() => actions$),
        { provide: GcpService, useValue: gcpServiceSpy },
        { provide: ModuleConfigService, useValue: configServiceSpy }
      ]
    });

    effects = TestBed.inject(GcpEffects);
    gcpService = TestBed.inject(GcpService) as jasmine.SpyObj<GcpService>;
    configService = TestBed.inject(ModuleConfigService) as jasmine.SpyObj<ModuleConfigService>;
  });

  describe('loadModuleConfig$', () => {
    it('should return loadModuleConfigSuccess on success', () => {
      const config = { module: { id: 'gcp' }, sections: [] };
      const action = GcpActions.loadModuleConfig({ moduleId: 'gcp' });
      const outcome = GcpActions.loadModuleConfigSuccess({ config });

      actions$ = hot('-a', { a: action });
      const response = cold('-a|', { a: config });
      const expected = cold('--b', { b: outcome });
      configService.loadModuleConfig.and.returnValue(response);

      expect(effects.loadModuleConfig$).toBeObservable(expected);
    });

    it('should return loadModuleConfigFailure on error', () => {
      const action = GcpActions.loadModuleConfig({ moduleId: 'gcp' });
      const error = 'Load failed';
      const outcome = GcpActions.loadModuleConfigFailure({ error });

      actions$ = hot('-a', { a: action });
      const response = cold('-#|', {}, error);
      const expected = cold('--b', { b: outcome });
      configService.loadModuleConfig.and.returnValue(response);

      expect(effects.loadModuleConfig$).toBeObservable(expected);
    });
  });

  describe('submitAssessment$', () => {
    it('should return submitAssessmentSuccess on success', () => {
      const payload = { formData: {}, config: {} };
      const recommendation = { care_tier: 'assisted_living' };
      
      const action = GcpActions.submitAssessment(payload);
      const outcome = GcpActions.submitAssessmentSuccess({ recommendation });

      actions$ = hot('-a', { a: action });
      const response = cold('-a|', { a: recommendation });
      const expected = cold('--b', { b: outcome });
      gcpService.submitAssessment.and.returnValue(response);

      expect(effects.submitAssessment$).toBeObservable(expected);
    });
  });
});
```

---

## Component Testing

### Testing with Testing Library

**Why Testing Library?**
- Tests components like users interact with them
- Encourages accessible markup
- Less brittle than implementation details

#### Pattern: User-Centric Tests

**File:** `frontend/src/app/features/gcp/components/gcp-form/gcp-form.component.spec.ts`

```typescript
import { render, screen, fireEvent } from '@testing-library/angular';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { GcpFormComponent } from './gcp-form.component';
import * as GcpSelectors from '../../store/gcp.selectors';

describe('GcpFormComponent', () => {
  let store: MockStore;
  
  const mockConfig = {
    module: { id: 'gcp', name: 'GCP' },
    sections: [
      {
        id: 'intro',
        title: 'Introduction',
        questions: [
          {
            id: 'name',
            type: 'string',
            label: 'What is your name?',
            required: true,
            options: []
          }
        ]
      }
    ]
  };

  beforeEach(async () => {
    await render(GcpFormComponent, {
      providers: [
        provideMockStore({
          selectors: [
            { selector: GcpSelectors.selectModuleConfig, value: mockConfig },
            { selector: GcpSelectors.selectFormData, value: {} },
            { selector: GcpSelectors.selectCurrentStep, value: mockConfig.sections[0] }
          ]
        })
      ]
    });
    
    store = TestBed.inject(MockStore);
  });

  it('should display section title', () => {
    expect(screen.getByText('Introduction')).toBeInTheDocument();
  });

  it('should render form field for question', () => {
    expect(screen.getByLabelText('What is your name?')).toBeInTheDocument();
  });

  it('should dispatch updateFormData when field changes', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    const input = screen.getByLabelText('What is your name?');
    
    fireEvent.input(input, { target: { value: 'John' } });
    
    expect(dispatchSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        formData: jasmine.objectContaining({ name: 'John' })
      })
    );
  });

  it('should disable submit button when form is invalid', () => {
    const submitButton = screen.getByRole('button', { name: /next/i });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when form is valid', async () => {
    const input = screen.getByLabelText('What is your name?');
    fireEvent.input(input, { target: { value: 'John' } });
    
    const submitButton = screen.getByRole('button', { name: /next/i });
    expect(submitButton).not.toBeDisabled();
  });
});
```

---

### Testing Results Component

**File:** `frontend/src/app/features/gcp/components/gcp-results/gcp-results.component.spec.ts`

```typescript
import { render, screen } from '@testing-library/angular';
import { provideMockStore } from '@ngrx/store/testing';
import { GcpResultsComponent } from './gcp-results.component';
import * as GcpSelectors from '../../store/gcp.selectors';

describe('GcpResultsComponent', () => {
  const mockRecommendation = {
    care_tier: 'assisted_living',
    deterministic: {
      tier: 'assisted_living',
      score: 18,
      breakdown: { cognition: 8, adl: 6, safety: 4 },
      flags: ['fall_risk_high']
    },
    llm: {
      tier: 'assisted_living',
      confidence: 0.92,
      advice: 'Agrees with deterministic recommendation'
    },
    adjudication: {
      decision: 'agree',
      explanation: 'Both systems recommend assisted living'
    }
  };

  beforeEach(async () => {
    await render(GcpResultsComponent, {
      providers: [
        provideMockStore({
          selectors: [
            { selector: GcpSelectors.selectRecommendation, value: mockRecommendation }
          ]
        })
      ]
    });
  });

  it('should display care tier recommendation', () => {
    expect(screen.getByText(/assisted living/i)).toBeInTheDocument();
  });

  it('should display deterministic score', () => {
    expect(screen.getByText(/18/)).toBeInTheDocument();
  });

  it('should display score breakdown', () => {
    expect(screen.getByText(/cognition.*8/i)).toBeInTheDocument();
    expect(screen.getByText(/adl.*6/i)).toBeInTheDocument();
    expect(screen.getByText(/safety.*4/i)).toBeInTheDocument();
  });

  it('should display LLM confidence', () => {
    expect(screen.getByText(/92%/)).toBeInTheDocument();
  });

  it('should display flags', () => {
    expect(screen.getByText(/high fall risk/i)).toBeInTheDocument();
  });

  it('should show agreement message when systems agree', () => {
    expect(screen.getByText(/both systems recommend/i)).toBeInTheDocument();
  });
});
```

---

## Service Testing

### Testing GCP Service

**File:** `frontend/src/app/features/gcp/services/gcp.service.spec.ts`

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GcpService } from './gcp.service';

describe('GcpService', () => {
  let service: GcpService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GcpService]
    });
    
    service = TestBed.inject(GcpService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Ensure no outstanding requests
  });

  describe('submitAssessment', () => {
    it('should POST assessment data to backend', () => {
      const payload = {
        formData: { question1: 'answer1' },
        config: { module: { id: 'gcp' } },
        options: { llm_mode: 'assist' }
      };
      
      const mockResponse = {
        care_tier: 'assisted_living',
        deterministic: { tier: 'assisted_living', score: 18 }
      };

      service.submitAssessment(payload.formData, payload.config, payload.options)
        .subscribe(response => {
          expect(response).toEqual(mockResponse);
        });

      const req = httpMock.expectOne('/api/gcp/assess');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush(mockResponse);
    });

    it('should handle error response', () => {
      const payload = { formData: {}, config: {}, options: {} };
      const errorMessage = 'Server error';

      service.submitAssessment(payload.formData, payload.config)
        .subscribe(
          () => fail('Should have failed'),
          (error) => {
            expect(error.status).toBe(500);
            expect(error.error).toBe(errorMessage);
          }
        );

      const req = httpMock.expectOne('/api/gcp/assess');
      req.flush(errorMessage, { status: 500, statusText: 'Server Error' });
    });
  });
});
```

---

## Backend Testing

### Testing Scoring Engine

**File:** `backend/services/gcpScoring.test.js`

```javascript
const { assessGCP } = require('./gcpScoring');

describe('GCP Scoring Engine', () => {
  const mockConfig = {
    sections: [
      {
        id: 'cognition',
        questions: [
          {
            id: 'memory_changes',
            options: [
              { value: 'none', score: 0 },
              { value: 'mild', score: 2 },
              { value: 'moderate', score: 5 },
              { value: 'severe', score: 8 }
            ]
          }
        ]
      }
    ]
  };

  describe('calculateScore', () => {
    it('should calculate total score from form data', () => {
      const formData = { memory_changes: 'moderate' };
      const result = assessGCP(formData, mockConfig, { llm_mode: 'off' });
      
      expect(result.deterministic.score).toBe(5);
    });

    it('should sum scores from multiple questions', () => {
      const extendedConfig = {
        sections: [{
          questions: [
            {
              id: 'memory_changes',
              options: [{ value: 'moderate', score: 5 }]
            },
            {
              id: 'fall_risk',
              options: [{ value: 'yes', score: 3 }]
            }
          ]
        }]
      };
      
      const formData = { memory_changes: 'moderate', fall_risk: 'yes' };
      const result = assessGCP(formData, extendedConfig, { llm_mode: 'off' });
      
      expect(result.deterministic.score).toBe(8);
    });
  });

  describe('assignTier', () => {
    it('should assign correct tier based on score', () => {
      const formData = { memory_changes: 'moderate' }; // score = 5
      const result = assessGCP(formData, mockConfig, { llm_mode: 'off' });
      
      expect(result.deterministic.tier).toBe('none'); // 5 is in [0-8] range
    });

    it('should assign assisted_living for score 18', () => {
      // Mock higher score
      const formData = { score_input: 18 };
      const result = assessGCP(formData, mockConfig, { llm_mode: 'off' });
      
      expect(result.deterministic.tier).toBe('assisted_living');
    });
  });

  describe('flags', () => {
    it('should collect flags from selected options', () => {
      const configWithFlags = {
        sections: [{
          questions: [{
            id: 'behavior',
            options: [
              { value: 'wandering', score: 5, flags: ['wandering', 'cognitive_concern'] }
            ]
          }]
        }]
      };
      
      const formData = { behavior: 'wandering' };
      const result = assessGCP(formData, configWithFlags, { llm_mode: 'off' });
      
      expect(result.deterministic.flags).toContain('wandering');
      expect(result.deterministic.flags).toContain('cognitive_concern');
    });
  });

  describe('guardrails', () => {
    it('should apply cognitive gate for wandering flag', () => {
      const formData = {
        behavior: 'wandering',
        memory_changes: 'moderate'
      };
      
      // Expect cognitive gate to enforce minimum tier
      const result = assessGCP(formData, mockConfig, { llm_mode: 'off' });
      
      // Logic: wandering flag should trigger memory_care minimum
      expect(['memory_care', 'memory_care_high_acuity']).toContain(result.care_tier);
    });
  });
});
```

---

### Testing LLM Integration

**File:** `backend/services/gcpNaviEngine.test.js`

```javascript
const { adjudicateWithLLM } = require('./gcpNaviEngine');

// Mock OpenAI client
jest.mock('./llmClient', () => ({
  getLLMClient: () => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  })
}));

describe('GCP Navi Engine', () => {
  const mockDeterministicResult = {
    tier: 'assisted_living',
    score: 18,
    breakdown: { cognition: 8, adl: 6, safety: 4 },
    flags: ['fall_risk_high']
  };

  const mockFormData = {
    memory_changes: 'moderate',
    fall_risk: 'yes'
  };

  describe('adjudicateWithLLM', () => {
    it('should return agree decision when LLM matches deterministic', async () => {
      const mockLLMResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              recommendation: 'assisted_living',
              confidence: 0.9,
              advice: 'Agrees with deterministic recommendation'
            })
          }
        }]
      };

      const llmClient = require('./llmClient').getLLMClient();
      llmClient.chat.completions.create.mockResolvedValue(mockLLMResponse);

      const result = await adjudicateWithLLM(
        mockFormData,
        mockDeterministicResult,
        'assist'
      );

      expect(result.adjudication.decision).toBe('agree');
      expect(result.care_tier).toBe('assisted_living');
    });

    it('should return override decision when LLM suggests different tier', async () => {
      const mockLLMResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              recommendation: 'memory_care',
              confidence: 0.85,
              advice: 'Cognitive concerns warrant memory care'
            })
          }
        }]
      };

      const llmClient = require('./llmClient').getLLMClient();
      llmClient.chat.completions.create.mockResolvedValue(mockLLMResponse);

      const result = await adjudicateWithLLM(
        mockFormData,
        mockDeterministicResult,
        'assist'
      );

      expect(result.adjudication.decision).toBe('llm_override');
      expect(result.care_tier).toBe('memory_care');
    });

    it('should fallback to deterministic on low confidence', async () => {
      const mockLLMResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              recommendation: 'memory_care',
              confidence: 0.55, // Below threshold
              advice: 'Uncertain'
            })
          }
        }]
      };

      const llmClient = require('./llmClient').getLLMClient();
      llmClient.chat.completions.create.mockResolvedValue(mockLLMResponse);

      const result = await adjudicateWithLLM(
        mockFormData,
        mockDeterministicResult,
        'assist'
      );

      expect(result.adjudication.decision).toBe('confidence_too_low');
      expect(result.care_tier).toBe('assisted_living'); // Falls back to deterministic
    });

    it('should respect shadow mode by not overriding', async () => {
      const mockLLMResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              recommendation: 'memory_care',
              confidence: 0.9,
              advice: 'Would recommend memory care'
            })
          }
        }]
      };

      const llmClient = require('./llmClient').getLLMClient();
      llmClient.chat.completions.create.mockResolvedValue(mockLLMResponse);

      const result = await adjudicateWithLLM(
        mockFormData,
        mockDeterministicResult,
        'shadow' // Shadow mode
      );

      expect(result.care_tier).toBe('assisted_living'); // Keeps deterministic
      expect(result.llm.tier).toBe('memory_care'); // But logs LLM opinion
    });
  });
});
```

---

## E2E Testing

### Full User Journey

**File:** `frontend/e2e/gcp-assessment.e2e-spec.ts`

```typescript
import { browser, by, element } from 'protractor';

describe('GCP Assessment Flow', () => {
  beforeEach(() => {
    browser.get('/gcp');
  });

  it('should complete full assessment and show results', async () => {
    // Step 1: Enter name
    await element(by.css('[data-testid="name-input"]')).sendKeys('John');
    await element(by.buttonText('Next')).click();

    // Step 2: Answer cognitive questions
    await element(by.css('[data-testid="memory-changes-moderate"]')).click();
    await element(by.buttonText('Next')).click();

    // Step 3: Answer ADL questions
    await element(by.css('[data-testid="adl-bathing"]')).click();
    await element(by.buttonText('Next')).click();

    // Step 4: Submit assessment
    await element(by.buttonText('Get Recommendation')).click();

    // Wait for results
    await browser.wait(() => {
      return element(by.css('[data-testid="care-tier-result"]')).isPresent();
    }, 5000);

    // Verify results displayed
    const careTier = await element(by.css('[data-testid="care-tier-result"]')).getText();
    expect(['assisted living', 'memory care']).toContain(careTier.toLowerCase());
  });

  it('should show validation error for required fields', async () => {
    // Try to proceed without answering
    await element(by.buttonText('Next')).click();

    // Should see error message
    const errorMsg = await element(by.css('.mat-error')).getText();
    expect(errorMsg).toContain('required');
  });

  it('should autosave form data', async () => {
    // Fill in some data
    await element(by.css('[data-testid="name-input"]')).sendKeys('Jane');
    
    // Refresh page
    await browser.refresh();

    // Data should persist
    const savedName = await element(by.css('[data-testid="name-input"]')).getAttribute('value');
    expect(savedName).toBe('Jane');
  });
});
```

---

## Test Recipes

### Recipe 1: Test a Pure Function

```typescript
// Function to test
function calculateAgeScore(age: number): number {
  if (age < 65) return 0;
  if (age < 75) return 1;
  if (age < 85) return 2;
  return 3;
}

// Test
describe('calculateAgeScore', () => {
  it('should return 0 for age under 65', () => {
    expect(calculateAgeScore(60)).toBe(0);
  });

  it('should return 1 for age 65-74', () => {
    expect(calculateAgeScore(70)).toBe(1);
  });

  it('should return 2 for age 75-84', () => {
    expect(calculateAgeScore(80)).toBe(2);
  });

  it('should return 3 for age 85+', () => {
    expect(calculateAgeScore(90)).toBe(3);
  });
});
```

---

### Recipe 2: Test an Observable

```typescript
import { of } from 'rxjs';

describe('GcpService', () => {
  it('should emit assessment result', (done) => {
    const mockResult = { care_tier: 'assisted_living' };
    service.submitAssessment({}, {}).subscribe(result => {
      expect(result).toEqual(mockResult);
      done();
    });
  });
});
```

---

### Recipe 3: Test with MockStore

```typescript
import { provideMockStore, MockStore } from '@ngrx/store/testing';

let store: MockStore;

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      provideMockStore({
        initialState: { gcp: initialState },
        selectors: [
          { selector: selectFormData, value: {} }
        ]
      })
    ]
  });
  
  store = TestBed.inject(MockStore);
});

it('should dispatch action', () => {
  const spy = spyOn(store, 'dispatch');
  component.onSubmit();
  expect(spy).toHaveBeenCalled();
});
```

---

### Recipe 4: Test Error Handling

```typescript
it('should handle API error gracefully', () => {
  const errorResponse = { status: 500, error: 'Server error' };
  
  service.submitAssessment({}, {}).subscribe(
    () => fail('Should have failed'),
    (error) => {
      expect(error.status).toBe(500);
    }
  );

  const req = httpMock.expectOne('/api/gcp/assess');
  req.flush('Server error', errorResponse);
});
```

---

### Recipe 5: Test Conditional Rendering

```typescript
it('should show results when recommendation exists', () => {
  store.overrideSelector(selectRecommendation, mockRecommendation);
  store.refreshState();
  
  fixture.detectChanges();
  
  expect(screen.getByTestId('results-section')).toBeInTheDocument();
});

it('should show loading spinner when submitting', () => {
  store.overrideSelector(selectIsLoading, true);
  store.refreshState();
  
  fixture.detectChanges();
  
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});
```

---

## Best Practices

### DO:

✅ **Write tests first for new features** (TDD)  
✅ **Test behavior, not implementation**  
✅ **Use descriptive test names** (`it('should X when Y')`)  
✅ **Keep tests simple and focused** (one assertion per test)  
✅ **Use test data builders** for complex objects  
✅ **Test edge cases** (null, undefined, empty, boundary values)  
✅ **Mock external dependencies** (HTTP, time, random)  

### DON'T:

❌ **Test framework internals** (Angular change detection, etc.)  
❌ **Test third-party libraries** (assume they work)  
❌ **Share state between tests** (use `beforeEach`)  
❌ **Write brittle tests** (tied to DOM structure)  
❌ **Skip tests** (fix or delete them)  
❌ **Test private methods** (test public API only)  

---

## Next Steps

### Immediate Priorities

1. **Add Reducer Tests** (2-4 hours)
   - All actions in `gcp.reducer.ts`
   - Edge cases and state transitions

2. **Add Selector Tests** (1-2 hours)
   - All selectors in `gcp.selectors.ts`
   - Derived selectors with complex logic

3. **Add Backend Scoring Tests** (4-6 hours)
   - Core scoring algorithm
   - Tier assignment
   - Guardrail logic
   - Flag collection

4. **Add Service Tests** (2-3 hours)
   - GcpService HTTP calls
   - Error handling

5. **Add Component Tests** (6-8 hours)
   - GcpFormComponent user interactions
   - GcpResultsComponent rendering

### Long-Term Goals

- **80%+ Code Coverage** for reducers, selectors, services
- **Integration Tests** for critical user journeys
- **E2E Tests** for full assessment flow
- **Visual Regression Tests** for UI consistency
- **Performance Tests** for large form configs

---

## Related Documentation

- [GCP Architecture Guide](./GCP_ARCHITECTURE.md) - System overview
- [Deterministic vs LLM Guide](./DETERMINISTIC_VS_LLM.md) - Scoring logic
- [Configuration Guide](./CONFIGURATION_GUIDE.md) - JSON configuration

---

**Last Updated:** November 9, 2025  
**Version:** 1.0  
**Authors:** Senior Navigator Engineering Team
