import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import * as GCPActions from './gcp.actions';
import { ModuleConfigService } from '../../../core/services/module-config.service';
import { MCIPService } from '../../../core/services/mcip.service';
import { HttpClient } from '@angular/common/http';
import { CareRecommendation } from '../../../shared/models/contracts';
import { Router } from '@angular/router';

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
  )
};
