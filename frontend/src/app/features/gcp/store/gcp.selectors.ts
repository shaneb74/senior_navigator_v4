import { createFeatureSelector, createSelector } from '@ngrx/store';
import { GCPState } from './gcp.reducer';

export const selectGCPState = createFeatureSelector<GCPState>('gcp');

// Config selectors
export const selectModuleConfig = createSelector(
  selectGCPState,
  (state) => state.config
);

export const selectConfigLoading = createSelector(
  selectGCPState,
  (state) => state.configLoading
);

export const selectConfigError = createSelector(
  selectGCPState,
  (state) => state.configError
);

// Form selectors
export const selectFormData = createSelector(
  selectGCPState,
  (state) => state.formData
);

export const selectCurrentSectionIndex = createSelector(
  selectGCPState,
  (state) => state.currentSectionIndex
);

export const selectCurrentSection = createSelector(
  selectModuleConfig,
  selectCurrentSectionIndex,
  (config, index) => config?.sections[index] || null
);

export const selectSectionCount = createSelector(
  selectModuleConfig,
  (config) => config?.sections.length || 0
);

export const selectProgress = createSelector(
  selectCurrentSectionIndex,
  selectSectionCount,
  (current, total) => total > 0 ? Math.round(((current + 1) / total) * 100) : 0
);

// Submission selectors
export const selectSubmitting = createSelector(
  selectGCPState,
  (state) => state.submitting
);

export const selectSubmitError = createSelector(
  selectGCPState,
  (state) => state.submitError
);

export const selectRecommendation = createSelector(
  selectGCPState,
  (state) => state.recommendation
);

export const selectCompleted = createSelector(
  selectGCPState,
  (state) => state.completed
);

// Composite selectors
export const selectCanGoNext = createSelector(
  selectCurrentSectionIndex,
  selectSectionCount,
  (current, total) => current < total - 1
);

export const selectCanGoPrevious = createSelector(
  selectCurrentSectionIndex,
  (current) => current > 0
);

export const selectIsLastSection = createSelector(
  selectCurrentSectionIndex,
  selectSectionCount,
  (current, total) => current === total - 1
);
