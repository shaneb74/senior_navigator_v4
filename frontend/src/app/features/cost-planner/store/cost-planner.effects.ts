import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import * as CostPlannerActions from './cost-planner.actions';
import { ModuleConfigService } from '../../../core/services/module-config.service';
import { CostPlannerService } from '../services/cost-planner.service';
import { MCIPService } from '../../../core/services/mcip.service';

export const costPlannerEffects = {
  loadModuleConfig$: createEffect(
    (
      actions$ = inject(Actions),
      moduleConfigService = inject(ModuleConfigService)
    ) => {
      return actions$.pipe(
        ofType(CostPlannerActions.loadModuleConfig),
        switchMap(() =>
          moduleConfigService.loadModuleConfig('cost_planner').pipe(
            map((config) => CostPlannerActions.loadModuleConfigSuccess({ config })),
            catchError((error) =>
              of(
                CostPlannerActions.loadModuleConfigFailure({
                  error: error.message || 'Failed to load cost planner config',
                })
              )
            )
          )
        )
      );
    },
    { functional: true }
  ),

  submitAssessment$: createEffect(
    (
      actions$ = inject(Actions),
      costPlannerService = inject(CostPlannerService),
      mcipService = inject(MCIPService),
      router = inject(Router)
    ) => {
      return actions$.pipe(
        ofType(CostPlannerActions.submitAssessment),
        switchMap(({ formData }) =>
          costPlannerService.submitProfile(formData).pipe(
            tap((profile) => mcipService.markProductComplete('cost_planner', profile)),
            tap(() => router.navigate(['/cost-planner/expert-review'])),
            map((profile) => CostPlannerActions.submitAssessmentSuccess({ profile })),
            catchError((error) =>
              of(
                CostPlannerActions.submitAssessmentFailure({
                  error: error.message || 'Failed to calculate financial profile',
                })
              )
            )
          )
        )
      );
    },
    { functional: true }
  ),
};
