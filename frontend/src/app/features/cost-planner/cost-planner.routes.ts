import { Routes } from '@angular/router';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { ModuleConfigService } from '../../core/services/module-config.service';
import { costPlannerReducer } from './store/cost-planner.reducer';
import { costPlannerEffects } from './store/cost-planner.effects';

export const COST_PLANNER_ROUTES: Routes = [
  {
    path: '',
    providers: [
      provideState('costPlanner', costPlannerReducer),
      provideEffects(costPlannerEffects),
      ModuleConfigService,
    ],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'intro',
      },
      {
        path: 'intro',
        loadComponent: () =>
          import('./components/cost-planner-intro/cost-planner-intro.component').then(
            (m) => m.CostPlannerIntroComponent
          ),
      },
      {
        path: 'quick-estimate',
        loadComponent: () =>
          import('./components/cost-planner-quick-estimate/cost-planner-quick-estimate.component').then(
            (m) => m.CostPlannerQuickEstimateComponent
          ),
      },
      {
        path: 'triage',
        loadComponent: () =>
          import('./components/cost-planner-triage/cost-planner-triage.component').then(
            (m) => m.CostPlannerTriageComponent
          ),
      },
      {
        path: 'assessments',
        loadComponent: () =>
          import('./components/cost-planner-form/cost-planner-form.component').then(
            (m) => m.CostPlannerFormComponent
          ),
      },
      {
        path: 'expert-review',
        loadComponent: () =>
          import('./components/cost-planner-expert-review/cost-planner-expert-review.component').then(
            (m) => m.CostPlannerExpertReviewComponent
          ),
      },
      { path: '**', redirectTo: 'intro' },
    ],
  },
];
