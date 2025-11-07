import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'gcp',
    pathMatch: 'full'
  },
  {
    path: 'gcp',
    loadChildren: () => import('./features/gcp/gcp.module').then(m => m.GcpModule)
  },
  {
    path: '**',
    redirectTo: 'gcp'
  }
];
