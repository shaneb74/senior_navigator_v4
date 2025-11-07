import { createAction, props } from '@ngrx/store';
import { ModuleConfig } from '../../../core/services/module-config.service';
import { CareRecommendation } from '../../../shared/models/contracts';

// Load module configuration
export const loadModuleConfig = createAction(
  '[GCP] Load Module Config'
);

export const loadModuleConfigSuccess = createAction(
  '[GCP] Load Module Config Success',
  props<{ config: ModuleConfig }>()
);

export const loadModuleConfigFailure = createAction(
  '[GCP] Load Module Config Failure',
  props<{ error: string }>()
);

// Form interaction
export const updateFormValue = createAction(
  '[GCP] Update Form Value',
  props<{ field: string; value: any }>()
);

export const setCurrentSection = createAction(
  '[GCP] Set Current Section',
  props<{ sectionId: string }>()
);

export const nextSection = createAction(
  '[GCP] Next Section'
);

export const previousSection = createAction(
  '[GCP] Previous Section'
);

// Submit assessment
export const submitAssessment = createAction(
  '[GCP] Submit Assessment',
  props<{ formData: Record<string, any> }>()
);

export const submitAssessmentSuccess = createAction(
  '[GCP] Submit Assessment Success',
  props<{ recommendation: CareRecommendation }>()
);

export const submitAssessmentFailure = createAction(
  '[GCP] Submit Assessment Failure',
  props<{ error: string }>()
);

// Reset
export const resetGCP = createAction(
  '[GCP] Reset'
);
