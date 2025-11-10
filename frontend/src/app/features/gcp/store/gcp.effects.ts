import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import * as GCPActions from './gcp.actions';
import { ModuleConfigService } from '../../../core/services/module-config.service';
import { MCIPService } from '../../../core/services/mcip.service';
import { GCPService } from '../services/gcp.service';

export const gcpEffects = {
  // Load module configuration
  loadModuleConfig$: createEffect(
    (
      actions$ = inject(Actions),
      moduleConfigService = inject(ModuleConfigService)
    ) => {
      console.log('[GCP Effects] Registering loadModuleConfig effect');
      return actions$.pipe(
        ofType(GCPActions.loadModuleConfig),
        tap(() => console.log('[GCP Effects] loadModuleConfig action received')),
        switchMap(() => {
          console.log('[GCP Effects] Calling moduleConfigService.loadModuleConfig');
          return moduleConfigService.loadModuleConfig('gcp').pipe(
            tap(config => console.log('[GCP Effects] Config loaded:', config)),
            map(config => GCPActions.loadModuleConfigSuccess({ config })),
            catchError(error => {
              console.error('[GCP Effects] Error loading config:', error);
              return of(GCPActions.loadModuleConfigFailure({ 
                error: error.message || 'Failed to load module configuration' 
              }));
            })
          );
        })
      );
    },
    { functional: true }
  ),

  // Submit assessment to backend API
  submitAssessment$: createEffect(
    (
      actions$ = inject(Actions),
      gcpService = inject(GCPService),
      mcipService = inject(MCIPService)
    ) => {
      console.log('[GCP Effects] Registering submitAssessment effect');
      return actions$.pipe(
        ofType(GCPActions.submitAssessment),
        tap(({ formData }) => console.log('[GCP Effects] Submitting assessment:', formData)),
        switchMap(({ formData }) => {
          return gcpService.submitAssessment(formData).pipe(
            tap(recommendation => console.log('[GCP Effects] Received recommendation:', recommendation)),
            map(recommendation => {
              // Store in MCIP for other products to use
              mcipService.markProductComplete('gcp', recommendation);
              console.log('[GCP Effects] Stored in MCIP');
              return GCPActions.submitAssessmentSuccess({ recommendation });
            }),
            catchError(error => {
              console.error('[GCP Effects] Error submitting assessment:', error);
              return of(GCPActions.submitAssessmentFailure({
                error: error.message || 'Failed to submit assessment'
              }));
            })
          );
        })
      );
    },
    { functional: true }
  ),

  // Navigate to results after successful submission
  navigateAfterSubmit$: createEffect(
    (
      actions$ = inject(Actions),
      router = inject(Router)
    ) => {
      return actions$.pipe(
        ofType(GCPActions.submitAssessmentSuccess),
        tap(() => {
          console.log('[GCP Effects] Navigating to results');
          router.navigate(['/gcp/results']);
        })
      );
    },
    { functional: true, dispatch: false }
  )
};
