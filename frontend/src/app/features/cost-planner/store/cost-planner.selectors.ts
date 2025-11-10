import { createFeatureSelector, createSelector } from '@ngrx/store';
import { CostPlannerState } from './cost-planner.reducer';

export const selectCostPlannerState = createFeatureSelector<CostPlannerState>('costPlanner');

export const selectModuleConfig = createSelector(
  selectCostPlannerState,
  (state) => state.config
);

export const selectCurrentSectionIndex = createSelector(
  selectCostPlannerState,
  (state) => state.currentSectionIndex
);

export const selectCurrentSection = createSelector(
  selectModuleConfig,
  selectCurrentSectionIndex,
  (config, index) => config?.sections[index] || null
);

export const selectProgress = createSelector(
  selectCurrentSectionIndex,
  selectModuleConfig,
  (current, config) => {
    if (!config || config.sections.length === 0) {
      return 0;
    }
    return Math.round(((current + 1) / config.sections.length) * 100);
  }
);

export const selectFormData = createSelector(
  selectCostPlannerState,
  (state) => state.formData
);

export const selectSubmitting = createSelector(
  selectCostPlannerState,
  (state) => state.submitting
);

export const selectSubmitError = createSelector(
  selectCostPlannerState,
  (state) => state.submitError
);

export const selectFinancialProfile = createSelector(
  selectCostPlannerState,
  (state) => state.profile
);

export const selectQuickEstimate = createSelector(
  selectCostPlannerState,
  (state) => state.quickEstimate
);

export const selectTriageAnswers = createSelector(
  selectCostPlannerState,
  (state) => state.triageAnswers
);

export const selectCanGoNext = createSelector(
  selectCurrentSectionIndex,
  selectModuleConfig,
  (current, config) => {
    if (!config) return false;
    return current < config.sections.length - 1;
  }
);

export const selectCanGoPrevious = createSelector(
  selectCurrentSectionIndex,
  (current) => current > 0
);

export const selectIsLastSection = createSelector(
  selectCurrentSectionIndex,
  selectModuleConfig,
  (current, config) => {
    if (!config) return false;
    return current === config.sections.length - 1;
  }
);
