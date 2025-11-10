import { Routes } from '@angular/router';

export const HUB_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/hub-lobby/hub-lobby.component').then(m => m.HubLobbyComponent)
  }
];
