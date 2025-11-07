import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'gcp',
    pathMatch: 'full'
  },
  {
    path: 'gcp',
    loadChildren: () => import('./features/gcp/gcp.routes').then(m => m.GCP_ROUTES)
  },
  {
    path: '**',
    redirectTo: 'gcp'
  }
];
