import { createReducer, on } from '@ngrx/store';
import * as GCPActions from './gcp.actions';
import { ModuleConfig } from '../../../core/services/module-config.service';
import { CareRecommendation } from '../../../shared/models/contracts';

export interface GCPState {
  // Module configuration
  config: ModuleConfig | null;
  configLoading: boolean;
  configError: string | null;

  // Form state
  formData: Record<string, any>;
  currentSectionIndex: number;
  
  // Submission
  submitting: boolean;
  submitError: string | null;
  recommendation: CareRecommendation | null;
  
  // Completion
  completed: boolean;
}

export const initialState: GCPState = {
  config: null,
  configLoading: false,
  configError: null,
  
  formData: {},
  currentSectionIndex: 0,
  
  submitting: false,
  submitError: null,
  recommendation: null,
  
  completed: false,
};

export const gcpReducer = createReducer(
  initialState,

  // Load module config
  on(GCPActions.loadModuleConfig, (state) => ({
    ...state,
    configLoading: true,
    configError: null,
  })),

  on(GCPActions.loadModuleConfigSuccess, (state, { config }) => ({
    ...state,
    config,
    configLoading: false,
  })),

  on(GCPActions.loadModuleConfigFailure, (state, { error }) => ({
    ...state,
    configLoading: false,
    configError: error,
  })),

  // Form updates
  on(GCPActions.updateFormValue, (state, { field, value }) => ({
    ...state,
    formData: {
      ...state.formData,
      [field]: value,
    },
  })),

  on(GCPActions.setCurrentSection, (state, { sectionId }) => {
    if (!state.config) return state;
    
    const sectionIndex = state.config.sections.findIndex(s => s.id === sectionId);
    return {
      ...state,
      currentSectionIndex: sectionIndex >= 0 ? sectionIndex : state.currentSectionIndex,
    };
  }),

  on(GCPActions.nextSection, (state) => {
    if (!state.config) return state;
    
    const maxIndex = state.config.sections.length - 1;
    return {
      ...state,
      currentSectionIndex: Math.min(state.currentSectionIndex + 1, maxIndex),
    };
  }),

  on(GCPActions.previousSection, (state) => ({
    ...state,
    currentSectionIndex: Math.max(state.currentSectionIndex - 1, 0),
  })),

  // Submit assessment
  on(GCPActions.submitAssessment, (state) => ({
    ...state,
    submitting: true,
    submitError: null,
  })),

  on(GCPActions.submitAssessmentSuccess, (state, { recommendation }) => ({
    ...state,
    submitting: false,
    recommendation,
    completed: true,
  })),

  on(GCPActions.submitAssessmentFailure, (state, { error }) => ({
    ...state,
    submitting: false,
    submitError: error,
  })),

  // Reset
  on(GCPActions.resetGCP, () => initialState)
);
