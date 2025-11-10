import { gcpReducer, initialState, GCPState } from './gcp.reducer';
import * as GCPActions from './gcp.actions';
import { ModuleConfig } from '../../../core/services/module-config.service';
import { CareRecommendation } from '../../../shared/models/contracts';

describe('GCP Reducer', () => {
  describe('unknown action', () => {
    it('should return the previous state', () => {
      const action = {} as any;
      const result = gcpReducer(initialState, action);
      
      expect(result).toBe(initialState);
    });
  });

  describe('initialState', () => {
    it('should have correct initial values', () => {
      expect(initialState).toEqual({
        config: null,
        configLoading: false,
        configError: null,
        formData: {},
        currentSectionIndex: 0,
        submitting: false,
        submitError: null,
        recommendation: null,
        completed: false,
      });
    });
  });

  describe('loadModuleConfig', () => {
    it('should set configLoading to true and clear errors', () => {
      const previousState: GCPState = {
        ...initialState,
        configError: 'Previous error',
      };

      const action = GCPActions.loadModuleConfig();
      const state = gcpReducer(previousState, action);

      expect(state.configLoading).toBe(true);
      expect(state.configError).toBeNull();
    });
  });

  describe('loadModuleConfigSuccess', () => {
    it('should store config and set configLoading to false', () => {
      const config: ModuleConfig = {
        module: {
          id: 'gcp',
          name: 'Guided Care Plan',
          version: 'v2025.10',
          description: 'Test module',
          results_step_id: 'results',
          display: {
            title: 'Test',
            subtitle: 'Test subtitle',
            estimated_time: '2 min',
            autosave: true,
            progress_weight: 1.0,
          },
        },
        sections: [
          {
            id: 'intro',
            title: 'Introduction',
            questions: [],
          },
        ],
      };

      const previousState: GCPState = {
        ...initialState,
        configLoading: true,
      };

      const action = GCPActions.loadModuleConfigSuccess({ config });
      const state = gcpReducer(previousState, action);

      expect(state.config).toEqual(config);
      expect(state.configLoading).toBe(false);
      expect(state.configError).toBeNull();
    });
  });

  describe('loadModuleConfigFailure', () => {
    it('should store error and set configLoading to false', () => {
      const error = 'Failed to load config';
      const previousState: GCPState = {
        ...initialState,
        configLoading: true,
      };

      const action = GCPActions.loadModuleConfigFailure({ error });
      const state = gcpReducer(previousState, action);

      expect(state.configError).toBe(error);
      expect(state.configLoading).toBe(false);
      expect(state.config).toBeNull();
    });
  });

  describe('updateFormValue', () => {
    it('should add new field to formData', () => {
      const action = GCPActions.updateFormValue({ field: 'name', value: 'John' });
      const state = gcpReducer(initialState, action);

      expect(state.formData).toEqual({ name: 'John' });
    });

    it('should update existing field in formData', () => {
      const previousState: GCPState = {
        ...initialState,
        formData: { name: 'John', age: 65 },
      };

      const action = GCPActions.updateFormValue({ field: 'name', value: 'Jane' });
      const state = gcpReducer(previousState, action);

      expect(state.formData).toEqual({ name: 'Jane', age: 65 });
    });

    it('should preserve other fields when updating one field', () => {
      const previousState: GCPState = {
        ...initialState,
        formData: { field1: 'value1', field2: 'value2' },
      };

      const action = GCPActions.updateFormValue({ field: 'field3', value: 'value3' });
      const state = gcpReducer(previousState, action);

      expect(state.formData).toEqual({
        field1: 'value1',
        field2: 'value2',
        field3: 'value3',
      });
    });

    it('should handle different value types', () => {
      const previousState: GCPState = {
        ...initialState,
        formData: {},
      };

      // String value
      let action = GCPActions.updateFormValue({ field: 'name', value: 'John' });
      let state = gcpReducer(previousState, action);
      expect(state.formData['name']).toBe('John');

      // Number value
      action = GCPActions.updateFormValue({ field: 'age', value: 75 });
      state = gcpReducer(state, action);
      expect(state.formData['age']).toBe(75);

      // Boolean value
      action = GCPActions.updateFormValue({ field: 'hasPartner', value: true });
      state = gcpReducer(state, action);
      expect(state.formData['hasPartner']).toBe(true);

      // Array value
      action = GCPActions.updateFormValue({ field: 'adlChallenges', value: ['bathing', 'dressing'] });
      state = gcpReducer(state, action);
      expect(state.formData['adlChallenges']).toEqual(['bathing', 'dressing']);
    });
  });

  describe('setCurrentSection', () => {
    const mockConfig: ModuleConfig = {
      module: {
        id: 'gcp',
        name: 'Test',
        version: 'v1',
        description: 'Test',
        results_step_id: 'results',
        display: {
          title: 'Test',
          subtitle: 'Test',
          estimated_time: '2 min',
          autosave: true,
          progress_weight: 1.0,
        },
      },
      sections: [
        { id: 'intro', title: 'Introduction', questions: [] },
        { id: 'cognition', title: 'Cognition', questions: [] },
        { id: 'adl', title: 'ADL', questions: [] },
      ],
    };

    it('should update currentSectionIndex based on sectionId', () => {
      const previousState: GCPState = {
        ...initialState,
        config: mockConfig,
        currentSectionIndex: 0,
      };

      const action = GCPActions.setCurrentSection({ sectionId: 'cognition' });
      const state = gcpReducer(previousState, action);

      expect(state.currentSectionIndex).toBe(1);
    });

    it('should handle setting to first section', () => {
      const previousState: GCPState = {
        ...initialState,
        config: mockConfig,
        currentSectionIndex: 2,
      };

      const action = GCPActions.setCurrentSection({ sectionId: 'intro' });
      const state = gcpReducer(previousState, action);

      expect(state.currentSectionIndex).toBe(0);
    });

    it('should handle setting to last section', () => {
      const previousState: GCPState = {
        ...initialState,
        config: mockConfig,
        currentSectionIndex: 0,
      };

      const action = GCPActions.setCurrentSection({ sectionId: 'adl' });
      const state = gcpReducer(previousState, action);

      expect(state.currentSectionIndex).toBe(2);
    });

    it('should keep current index if sectionId not found', () => {
      const previousState: GCPState = {
        ...initialState,
        config: mockConfig,
        currentSectionIndex: 1,
      };

      const action = GCPActions.setCurrentSection({ sectionId: 'nonexistent' });
      const state = gcpReducer(previousState, action);

      expect(state.currentSectionIndex).toBe(1);
    });

    it('should return unchanged state if config is null', () => {
      const previousState: GCPState = {
        ...initialState,
        config: null,
        currentSectionIndex: 0,
      };

      const action = GCPActions.setCurrentSection({ sectionId: 'cognition' });
      const state = gcpReducer(previousState, action);

      expect(state).toBe(previousState);
    });
  });

  describe('nextSection', () => {
    const mockConfig: ModuleConfig = {
      module: {
        id: 'gcp',
        name: 'Test',
        version: 'v1',
        description: 'Test',
        results_step_id: 'results',
        display: {
          title: 'Test',
          subtitle: 'Test',
          estimated_time: '2 min',
          autosave: true,
          progress_weight: 1.0,
        },
      },
      sections: [
        { id: 'intro', title: 'Introduction', questions: [] },
        { id: 'cognition', title: 'Cognition', questions: [] },
        { id: 'adl', title: 'ADL', questions: [] },
      ],
    };

    it('should increment currentSectionIndex', () => {
      const previousState: GCPState = {
        ...initialState,
        config: mockConfig,
        currentSectionIndex: 0,
      };

      const action = GCPActions.nextSection();
      const state = gcpReducer(previousState, action);

      expect(state.currentSectionIndex).toBe(1);
    });

    it('should not exceed max section index', () => {
      const previousState: GCPState = {
        ...initialState,
        config: mockConfig,
        currentSectionIndex: 2, // Last section
      };

      const action = GCPActions.nextSection();
      const state = gcpReducer(previousState, action);

      expect(state.currentSectionIndex).toBe(2); // Should stay at 2
    });

    it('should return unchanged state if config is null', () => {
      const previousState: GCPState = {
        ...initialState,
        config: null,
        currentSectionIndex: 0,
      };

      const action = GCPActions.nextSection();
      const state = gcpReducer(previousState, action);

      expect(state).toBe(previousState);
    });
  });

  describe('previousSection', () => {
    it('should decrement currentSectionIndex', () => {
      const previousState: GCPState = {
        ...initialState,
        currentSectionIndex: 2,
      };

      const action = GCPActions.previousSection();
      const state = gcpReducer(previousState, action);

      expect(state.currentSectionIndex).toBe(1);
    });

    it('should not go below 0', () => {
      const previousState: GCPState = {
        ...initialState,
        currentSectionIndex: 0,
      };

      const action = GCPActions.previousSection();
      const state = gcpReducer(previousState, action);

      expect(state.currentSectionIndex).toBe(0);
    });
  });

  describe('submitAssessment', () => {
    it('should set submitting to true and clear errors', () => {
      const previousState: GCPState = {
        ...initialState,
        submitError: 'Previous error',
      };

      const action = GCPActions.submitAssessment({ formData: {} });
      const state = gcpReducer(previousState, action);

      expect(state.submitting).toBe(true);
      expect(state.submitError).toBeNull();
    });
  });

  describe('submitAssessmentSuccess', () => {
    it('should store recommendation, set completed to true, and clear submitting flag', () => {
      const recommendation: CareRecommendation = {
        tier: 'assisted_living',
        tier_score: 18,
        tier_rankings: [
          { tier: 'assisted_living', score: 18 },
          { tier: 'memory_care', score: 12 },
        ],
        confidence: 0.95,
        flags: [],
        rationale: ['High ADL support needs', 'Moderate cognitive decline'],
        suggested_next_product: 'cost_planner',
        allowed_tiers: ['in_home', 'assisted_living', 'memory_care'],
        generated_at: '2025-11-09T10:00:00Z',
        version: 'v2025.10',
        input_snapshot_id: 'test-snapshot-123',
        rule_set: 'gcp_v1',
        next_step: {
          product: 'cost_planner',
          label: 'Calculate Costs',
          description: 'Estimate monthly care costs',
        },
        status: 'complete',
        last_updated: '2025-11-09T10:00:00Z',
        needs_refresh: false,
        schema_version: 1,
        assessment_id: 'test-assessment-123',
        user_inputs: {},
        score_breakdown: { cognition: 8, adl: 6, safety: 4, mobility: 0, general: 0 },
        timestamp: '2025-11-09T10:00:00Z',
      };

      const previousState: GCPState = {
        ...initialState,
        submitting: true,
      };

      const action = GCPActions.submitAssessmentSuccess({ recommendation });
      const state = gcpReducer(previousState, action);

      expect(state.recommendation).toEqual(recommendation);
      expect(state.submitting).toBe(false);
      expect(state.completed).toBe(true);
      expect(state.submitError).toBeNull();
    });
  });

  describe('submitAssessmentFailure', () => {
    it('should store error and set submitting to false', () => {
      const error = 'Failed to submit assessment';
      const previousState: GCPState = {
        ...initialState,
        submitting: true,
      };

      const action = GCPActions.submitAssessmentFailure({ error });
      const state = gcpReducer(previousState, action);

      expect(state.submitError).toBe(error);
      expect(state.submitting).toBe(false);
      expect(state.completed).toBe(false);
      expect(state.recommendation).toBeNull();
    });
  });

  describe('resetGCP', () => {
    it('should reset state to initialState', () => {
      const previousState: GCPState = {
        config: {
          module: {
            id: 'gcp',
            name: 'Test',
            version: 'v1',
            description: 'Test',
            results_step_id: 'results',
            display: {
              title: 'Test',
              subtitle: 'Test',
              estimated_time: '2 min',
              autosave: true,
              progress_weight: 1.0,
            },
          },
          sections: [],
        },
        configLoading: false,
        configError: null,
        formData: { name: 'John', age: 75 },
        currentSectionIndex: 2,
        submitting: false,
        submitError: null,
        recommendation: {
          tier: 'assisted_living',
          tier_score: 18,
          tier_rankings: [{ tier: 'assisted_living', score: 18 }],
          confidence: 0.95,
          flags: [],
          rationale: [],
          suggested_next_product: 'cost_planner',
          allowed_tiers: ['assisted_living'],
          generated_at: '2025-11-09T10:00:00Z',
          version: 'v1',
          input_snapshot_id: 'snap-123',
          rule_set: 'gcp_v1',
          next_step: { product: 'cost_planner' },
          status: 'complete',
          last_updated: '2025-11-09T10:00:00Z',
          needs_refresh: false,
          schema_version: 1,
          assessment_id: 'assess-123',
          user_inputs: {},
          timestamp: '2025-11-09T10:00:00Z',
        },
        completed: true,
      };

      const action = GCPActions.resetGCP();
      const state = gcpReducer(previousState, action);

      expect(state).toEqual(initialState);
    });
  });

  describe('state immutability', () => {
    it('should not mutate original state when updating formData', () => {
      const originalState: GCPState = {
        ...initialState,
        formData: { field1: 'value1' },
      };

      const action = GCPActions.updateFormValue({ field: 'field2', value: 'value2' });
      const newState = gcpReducer(originalState, action);

      // Original state should be unchanged
      expect(originalState.formData).toEqual({ field1: 'value1' });
      // New state should have both fields
      expect(newState.formData).toEqual({ field1: 'value1', field2: 'value2' });
    });

    it('should not mutate original state when loading config', () => {
      const originalState: GCPState = { ...initialState };
      const config: ModuleConfig = {
        module: {
          id: 'gcp',
          name: 'Test',
          version: 'v1',
          description: 'Test',
          results_step_id: 'results',
          display: {
            title: 'Test',
            subtitle: 'Test',
            estimated_time: '2 min',
            autosave: true,
            progress_weight: 1.0,
          },
        },
        sections: [],
      };

      const action = GCPActions.loadModuleConfigSuccess({ config });
      const newState = gcpReducer(originalState, action);

      // Original state should be unchanged
      expect(originalState.config).toBeNull();
      expect(originalState.configLoading).toBe(false);
      // New state should have config
      expect(newState.config).toEqual(config);
      expect(newState.configLoading).toBe(false);
    });
  });
});
