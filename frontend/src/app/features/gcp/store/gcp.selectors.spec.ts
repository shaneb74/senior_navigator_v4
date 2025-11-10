import { GCPState } from './gcp.reducer';
import * as GCPSelectors from './gcp.selectors';
import { ModuleConfig } from '../../../core/services/module-config.service';
import { CareRecommendation } from '../../../shared/models/contracts';

describe('GCP Selectors', () => {
  const mockConfig: ModuleConfig = {
    module: {
      id: 'gcp',
      name: 'Guided Care Plan',
      version: 'v2025.10',
      description: 'Test module',
      results_step_id: 'results',
      display: {
        title: 'Find the Right Senior Care',
        subtitle: 'Test subtitle',
        estimated_time: '≈2 min',
        autosave: true,
        progress_weight: 1.0,
      },
    },
    sections: [
      { id: 'intro', title: 'Introduction', questions: [] },
      { id: 'cognition', title: 'Memory & Thinking', questions: [] },
      { id: 'adl', title: 'Daily Activities', questions: [] },
      { id: 'results', title: 'Results', questions: [] },
    ],
  };

  const mockRecommendation: CareRecommendation = {
    tier: 'assisted_living',
    tier_score: 18,
    tier_rankings: [{ tier: 'assisted_living', score: 18 }],
    confidence: 0.95,
    flags: [],
    rationale: ['Test rationale'],
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
  };

  const mockState: GCPState = {
    config: mockConfig,
    configLoading: false,
    configError: null,
    formData: { name: 'John', age: 75 },
    currentSectionIndex: 1,
    submitting: false,
    submitError: null,
    recommendation: mockRecommendation,
    completed: false,
  };

  describe('selectGCPState', () => {
    it('should select the GCP state slice', () => {
      const result = GCPSelectors.selectGCPState.projector(mockState);
      expect(result).toBe(mockState);
    });
  });

  describe('selectModuleConfig', () => {
    it('should select the module config', () => {
      const result = GCPSelectors.selectModuleConfig.projector(mockState);
      expect(result).toBe(mockConfig);
    });

    it('should return null if config not loaded', () => {
      const stateWithoutConfig = { ...mockState, config: null };
      const result = GCPSelectors.selectModuleConfig.projector(stateWithoutConfig);
      expect(result).toBeNull();
    });
  });

  describe('selectConfigLoading', () => {
    it('should return true when config is loading', () => {
      const loadingState = { ...mockState, configLoading: true };
      const result = GCPSelectors.selectConfigLoading.projector(loadingState);
      expect(result).toBe(true);
    });

    it('should return false when config is not loading', () => {
      const result = GCPSelectors.selectConfigLoading.projector(mockState);
      expect(result).toBe(false);
    });
  });

  describe('selectConfigError', () => {
    it('should return error message when present', () => {
      const errorState = { ...mockState, configError: 'Failed to load' };
      const result = GCPSelectors.selectConfigError.projector(errorState);
      expect(result).toBe('Failed to load');
    });

    it('should return null when no error', () => {
      const result = GCPSelectors.selectConfigError.projector(mockState);
      expect(result).toBeNull();
    });
  });

  describe('selectFormData', () => {
    it('should select form data', () => {
      const result = GCPSelectors.selectFormData.projector(mockState);
      expect(result).toEqual({ name: 'John', age: 75 });
    });

    it('should return empty object when no form data', () => {
      const emptyState = { ...mockState, formData: {} };
      const result = GCPSelectors.selectFormData.projector(emptyState);
      expect(result).toEqual({});
    });
  });

  describe('selectCurrentSectionIndex', () => {
    it('should select current section index', () => {
      const result = GCPSelectors.selectCurrentSectionIndex.projector(mockState);
      expect(result).toBe(1);
    });

    it('should return 0 for first section', () => {
      const firstSectionState = { ...mockState, currentSectionIndex: 0 };
      const result = GCPSelectors.selectCurrentSectionIndex.projector(firstSectionState);
      expect(result).toBe(0);
    });
  });

  describe('selectCurrentSection', () => {
    it('should select the current section based on index', () => {
      const result = GCPSelectors.selectCurrentSection.projector(
        mockConfig,
        1
      );
      expect(result).toEqual({
        id: 'cognition',
        title: 'Memory & Thinking',
        questions: [],
      });
    });

    it('should select first section when index is 0', () => {
      const result = GCPSelectors.selectCurrentSection.projector(
        mockConfig,
        0
      );
      expect(result).toEqual({
        id: 'intro',
        title: 'Introduction',
        questions: [],
      });
    });

    it('should select last section', () => {
      const result = GCPSelectors.selectCurrentSection.projector(
        mockConfig,
        3
      );
      expect(result).toEqual({
        id: 'results',
        title: 'Results',
        questions: [],
      });
    });

    it('should return null if config is null', () => {
      const result = GCPSelectors.selectCurrentSection.projector(null, 0);
      expect(result).toBeNull();
    });

    it('should return undefined if index is out of bounds', () => {
      const result = GCPSelectors.selectCurrentSection.projector(
        mockConfig,
        10
      );
      // The selector uses optional chaining which returns undefined for out-of-bounds
      // But the || null makes it return null when sections[index] is undefined
      expect(result).toBeNull();
    });
  });

  describe('selectSectionCount', () => {
    it('should return total number of sections', () => {
      const result = GCPSelectors.selectSectionCount.projector(mockConfig);
      expect(result).toBe(4);
    });

    it('should return 0 when config is null', () => {
      const result = GCPSelectors.selectSectionCount.projector(null);
      expect(result).toBe(0);
    });

    it('should return 0 for empty sections array', () => {
      const emptyConfig = { ...mockConfig, sections: [] };
      const result = GCPSelectors.selectSectionCount.projector(emptyConfig);
      expect(result).toBe(0);
    });
  });

  describe('selectProgress', () => {
    it('should calculate progress percentage correctly', () => {
      // Section 1 of 4 = 50% (because (1 + 1) / 4 * 100 = 50)
      const result = GCPSelectors.selectProgress.projector(1, 4);
      expect(result).toBe(50);
    });

    it('should return 25% for first section of 4', () => {
      const result = GCPSelectors.selectProgress.projector(0, 4);
      expect(result).toBe(25);
    });

    it('should return 100% for last section', () => {
      const result = GCPSelectors.selectProgress.projector(3, 4);
      expect(result).toBe(100);
    });

    it('should return 0% when no sections', () => {
      const result = GCPSelectors.selectProgress.projector(0, 0);
      expect(result).toBe(0);
    });

    it('should handle single section', () => {
      const result = GCPSelectors.selectProgress.projector(0, 1);
      expect(result).toBe(100);
    });
  });

  describe('selectSubmitting', () => {
    it('should return true when submitting', () => {
      const submittingState = { ...mockState, submitting: true };
      const result = GCPSelectors.selectSubmitting.projector(submittingState);
      expect(result).toBe(true);
    });

    it('should return false when not submitting', () => {
      const result = GCPSelectors.selectSubmitting.projector(mockState);
      expect(result).toBe(false);
    });
  });

  describe('selectSubmitError', () => {
    it('should return error message when present', () => {
      const errorState = { ...mockState, submitError: 'Submission failed' };
      const result = GCPSelectors.selectSubmitError.projector(errorState);
      expect(result).toBe('Submission failed');
    });

    it('should return null when no error', () => {
      const result = GCPSelectors.selectSubmitError.projector(mockState);
      expect(result).toBeNull();
    });
  });

  describe('selectRecommendation', () => {
    it('should select the care recommendation', () => {
      const result = GCPSelectors.selectRecommendation.projector(mockState);
      expect(result).toEqual(mockRecommendation);
    });

    it('should return null when no recommendation', () => {
      const noRecState = { ...mockState, recommendation: null };
      const result = GCPSelectors.selectRecommendation.projector(noRecState);
      expect(result).toBeNull();
    });
  });

  describe('selectCompleted', () => {
    it('should return true when assessment is completed', () => {
      const completedState = { ...mockState, completed: true };
      const result = GCPSelectors.selectCompleted.projector(completedState);
      expect(result).toBe(true);
    });

    it('should return false when assessment is not completed', () => {
      const result = GCPSelectors.selectCompleted.projector(mockState);
      expect(result).toBe(false);
    });
  });

  describe('selectCanGoNext', () => {
    it('should return true when not on last section', () => {
      const result = GCPSelectors.selectCanGoNext.projector(1, 4);
      expect(result).toBe(true);
    });

    it('should return true on first section', () => {
      const result = GCPSelectors.selectCanGoNext.projector(0, 4);
      expect(result).toBe(true);
    });

    it('should return false on last section', () => {
      const result = GCPSelectors.selectCanGoNext.projector(3, 4);
      expect(result).toBe(false);
    });

    it('should return false when only one section', () => {
      const result = GCPSelectors.selectCanGoNext.projector(0, 1);
      expect(result).toBe(false);
    });
  });

  describe('selectCanGoPrevious', () => {
    it('should return false on first section', () => {
      const result = GCPSelectors.selectCanGoPrevious.projector(0);
      expect(result).toBe(false);
    });

    it('should return true on second section', () => {
      const result = GCPSelectors.selectCanGoPrevious.projector(1);
      expect(result).toBe(true);
    });

    it('should return true on last section', () => {
      const result = GCPSelectors.selectCanGoPrevious.projector(3);
      expect(result).toBe(true);
    });
  });

  describe('selectIsLastSection', () => {
    it('should return true on last section', () => {
      const result = GCPSelectors.selectIsLastSection.projector(3, 4);
      expect(result).toBe(true);
    });

    it('should return false on first section', () => {
      const result = GCPSelectors.selectIsLastSection.projector(0, 4);
      expect(result).toBe(false);
    });

    it('should return false on middle section', () => {
      const result = GCPSelectors.selectIsLastSection.projector(1, 4);
      expect(result).toBe(false);
    });

    it('should return true when only one section', () => {
      const result = GCPSelectors.selectIsLastSection.projector(0, 1);
      expect(result).toBe(true);
    });
  });

  describe('selector composition', () => {
    it('should derive current section from config and index', () => {
      // Simulate selector chain
      const config = GCPSelectors.selectModuleConfig.projector(mockState);
      const index = GCPSelectors.selectCurrentSectionIndex.projector(mockState);
      const currentSection = GCPSelectors.selectCurrentSection.projector(config, index);

      expect(currentSection).toEqual({
        id: 'cognition',
        title: 'Memory & Thinking',
        questions: [],
      });
    });

    it('should calculate progress from section count and current index', () => {
      const index = GCPSelectors.selectCurrentSectionIndex.projector(mockState);
      const count = GCPSelectors.selectSectionCount.projector(mockConfig);
      const progress = GCPSelectors.selectProgress.projector(index, count);

      expect(progress).toBe(50); // Section 2 of 4
    });

    it('should determine navigation capabilities', () => {
      const index = GCPSelectors.selectCurrentSectionIndex.projector(mockState);
      const count = GCPSelectors.selectSectionCount.projector(mockConfig);
      
      const canGoNext = GCPSelectors.selectCanGoNext.projector(index, count);
      const canGoPrevious = GCPSelectors.selectCanGoPrevious.projector(index);
      const isLastSection = GCPSelectors.selectIsLastSection.projector(index, count);

      expect(canGoNext).toBe(true);      // Can move forward from section 1
      expect(canGoPrevious).toBe(true);  // Can go back from section 1
      expect(isLastSection).toBe(false); // Not on last section
    });
  });
});
