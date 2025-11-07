import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import * as GCPActions from './gcp.actions';
import { ModuleConfigService } from '../../../core/services/module-config.service';
import { MCIPService } from '../../../core/services/mcip.service';
import { HttpClient } from '@angular/common/http';
import { CareRecommendation } from '../../../shared/models/contracts';
import { Router } from '@angular/router';

@Injectable()
export class GCPEffects {
  constructor(
    private actions$: Actions,
    private moduleConfigService: ModuleConfigService,
    private mcipService: MCIPService,
    private http: HttpClient,
    private router: Router
  ) {}

  // Load module configuration
  loadModuleConfig$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GCPActions.loadModuleConfig),
      switchMap(() =>
        this.moduleConfigService.loadModuleConfig('gcp').pipe(
          map(config => GCPActions.loadModuleConfigSuccess({ config })),
          catchError(error =>
            of(GCPActions.loadModuleConfigFailure({ 
              error: error.message || 'Failed to load module configuration' 
            }))
          )
        )
      )
    )
  );

  // Submit assessment to backend
  submitAssessment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GCPActions.submitAssessment),
      switchMap(({ formData }) =>
        // TODO: Replace with actual backend API endpoint
        // For now, we'll create a mock recommendation
        this.mockSubmitAssessment(formData).pipe(
          map(recommendation => {
            // Store in MCIP
            this.mcipService.markProductComplete('gcp', recommendation);
            return GCPActions.submitAssessmentSuccess({ recommendation });
          }),
          catchError(error =>
            of(GCPActions.submitAssessmentFailure({
              error: error.message || 'Failed to submit assessment'
            }))
          )
        )
      )
    )
  );

  // Navigate to results or next product after successful submission
  navigateAfterSubmit$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GCPActions.submitAssessmentSuccess),
      tap(() => {
        // Navigate to results page
        this.router.navigate(['/gcp/results']);
      })
    ),
    { dispatch: false }
  );

  // Mock submission (replace with real API call)
  private mockSubmitAssessment(formData: Record<string, any>) {
    // Simulate API delay
    return of({
      recommendation: 'assisted_living' as const,
      confidence: 0.85,
      raw_scores: {
        safety_risk: 0.6,
        adl_dependency: 0.5,
        cognitive_impairment: 0.3,
        social_isolation: 0.4,
      },
      flags: ['needs_help_with_adls', 'social_isolation_risk'],
      user_inputs: formData,
      assessment_id: `assess_${Date.now()}`,
      timestamp: new Date().toISOString(),
      version: 'v2025.10',
    } as CareRecommendation);
  }
}
