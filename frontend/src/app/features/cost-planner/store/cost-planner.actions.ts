import { createAction, props } from '@ngrx/store';
import { ModuleConfig } from '../../../core/services/module-config.service';
import { FinancialProfile } from '../../../shared/models/contracts';
import { QuickEstimate, TriageAnswers } from './cost-planner.reducer';

export const loadModuleConfig = createAction('[Cost Planner] Load Module Config');

export const loadModuleConfigSuccess = createAction(
  '[Cost Planner] Load Module Config Success',
  props<{ config: ModuleConfig }>()
);

export const loadModuleConfigFailure = createAction(
  '[Cost Planner] Load Module Config Failure',
  props<{ error: string }>()
);

export const updateFormValue = createAction(
  '[Cost Planner] Update Form Value',
  props<{ field: string; value: any }>()
);

export const setCurrentSection = createAction(
  '[Cost Planner] Set Current Section',
  props<{ sectionId: string }>()
);

export const nextSection = createAction('[Cost Planner] Next Section');
export const previousSection = createAction('[Cost Planner] Previous Section');

export const submitAssessment = createAction(
  '[Cost Planner] Submit Assessment',
  props<{ formData: Record<string, any> }>()
);

export const submitAssessmentSuccess = createAction(
  '[Cost Planner] Submit Assessment Success',
  props<{ profile: FinancialProfile }>()
);

export const submitAssessmentFailure = createAction(
  '[Cost Planner] Submit Assessment Failure',
  props<{ error: string }>()
);

export const resetCostPlanner = createAction('[Cost Planner] Reset');

export const setQuickEstimate = createAction(
  '[Cost Planner] Set Quick Estimate',
  props<{ estimate: QuickEstimate }>()
);

export const setTriageAnswers = createAction(
  '[Cost Planner] Set Triage Answers',
  props<{ answers: TriageAnswers }>()
);
