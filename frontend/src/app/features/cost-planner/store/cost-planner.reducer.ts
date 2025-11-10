import { createReducer, on } from '@ngrx/store';
import { ModuleConfig } from '../../../core/services/module-config.service';
import { CareTier, FinancialProfile } from '../../../shared/models/contracts';
import * as CostPlannerActions from './cost-planner.actions';

export interface QuickEstimate {
  care_level: CareTier;
  monthly_budget: number;
  estimated_cost: number;
  gap: number;
  base_cost: number;
  modifier_total: number;
  care_hours_per_day?: number;
}

export interface TriageAnswers {
  isOnMedicaid: boolean;
  isVeteran: boolean;
  isHomeowner: boolean;
}

export interface CostPlannerState {
  config: ModuleConfig | null;
  configLoading: boolean;
  configError: string | null;
  formData: Record<string, any>;
  currentSectionIndex: number;
  submitting: boolean;
  submitError: string | null;
  profile: FinancialProfile | null;
  completed: boolean;
  quickEstimate: QuickEstimate | null;
  triageAnswers: TriageAnswers;
}

export const initialState: CostPlannerState = {
  config: null,
  configLoading: false,
  configError: null,
  formData: {},
  currentSectionIndex: 0,
  submitting: false,
  submitError: null,
  profile: null,
  completed: false,
  quickEstimate: null,
  triageAnswers: {
    isOnMedicaid: false,
    isVeteran: false,
    isHomeowner: false,
  },
};

export const costPlannerReducer = createReducer(
  initialState,
  on(CostPlannerActions.loadModuleConfig, (state) => ({
    ...state,
    configLoading: true,
    configError: null,
  })),
  on(CostPlannerActions.loadModuleConfigSuccess, (state, { config }) => ({
    ...state,
    config,
    configLoading: false,
  })),
  on(CostPlannerActions.loadModuleConfigFailure, (state, { error }) => ({
    ...state,
    configLoading: false,
    configError: error,
  })),
  on(CostPlannerActions.updateFormValue, (state, { field, value }) => ({
    ...state,
    formData: {
      ...state.formData,
      [field]: value,
    },
  })),
  on(CostPlannerActions.setCurrentSection, (state, { sectionId }) => {
    if (!state.config) return state;
    const index = state.config.sections.findIndex((s) => s.id === sectionId);
    return {
      ...state,
      currentSectionIndex: index >= 0 ? index : state.currentSectionIndex,
    };
  }),
  on(CostPlannerActions.nextSection, (state) => {
    if (!state.config) return state;
    const maxIndex = state.config.sections.length - 1;
    return {
      ...state,
      currentSectionIndex: Math.min(state.currentSectionIndex + 1, maxIndex),
    };
  }),
  on(CostPlannerActions.previousSection, (state) => ({
    ...state,
    currentSectionIndex: Math.max(state.currentSectionIndex - 1, 0),
  })),
  on(CostPlannerActions.submitAssessment, (state) => ({
    ...state,
    submitting: true,
    submitError: null,
  })),
  on(CostPlannerActions.submitAssessmentSuccess, (state, { profile }) => ({
    ...state,
    submitting: false,
    profile,
    completed: true,
  })),
  on(CostPlannerActions.submitAssessmentFailure, (state, { error }) => ({
    ...state,
    submitting: false,
    submitError: error,
  })),
  on(CostPlannerActions.setQuickEstimate, (state, { estimate }) => ({
    ...state,
    quickEstimate: estimate,
  })),
  on(CostPlannerActions.setTriageAnswers, (state, { answers }) => ({
    ...state,
    triageAnswers: answers,
  })),
  on(CostPlannerActions.resetCostPlanner, () => initialState)
);
