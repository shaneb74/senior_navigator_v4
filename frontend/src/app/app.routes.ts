import { Routes } from '@angular/router';
import { productAccessGuard } from './core/guards/product-access.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'hub',
    pathMatch: 'full'
  },
  {
    path: 'hub',
    loadChildren: () => import('./features/hub/hub.routes').then(m => m.HUB_ROUTES)
  },
  {
    path: 'gcp',
    loadChildren: () => import('./features/gcp/gcp.routes').then(m => m.GCP_ROUTES)
  },
  {
    path: 'cost-planner',
    canActivate: [productAccessGuard],
    data: { productId: 'cost_planner' },
    loadChildren: () => import('./features/cost-planner/cost-planner.routes').then(m => m.COST_PLANNER_ROUTES)
  },
  {
    path: '**',
    redirectTo: 'hub'
  }
];
