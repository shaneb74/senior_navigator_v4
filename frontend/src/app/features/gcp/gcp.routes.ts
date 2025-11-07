import { Routes } from '@angular/router';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { gcpReducer } from './store/gcp.reducer';
import { gcpEffects } from './store/gcp.effects';
import { ModuleConfigService } from '../../core/services/module-config.service';
import { MCIPService } from '../../core/services/mcip.service';

export const GCP_ROUTES: Routes = [
  {
    path: '',
    providers: [
      provideState('gcp', gcpReducer),
      provideEffects(gcpEffects),
      ModuleConfigService,
      MCIPService
    ],
    children: [
      {
        path: '',
        loadComponent: () => import('./components/gcp-form/gcp-form.component').then(m => m.GcpFormComponent)
      },
      {
        path: 'results',
        loadComponent: () => import('./components/gcp-results/gcp-results.component').then(m => m.GcpResultsComponent)
      }
    ]
  }
];
