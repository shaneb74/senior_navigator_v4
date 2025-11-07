import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

// NgRx
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { gcpReducer } from './store/gcp.reducer';
import { GCPEffects } from './store/gcp.effects';

// Material
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';

// Formly
import { FormlyModule } from '@ngx-formly/core';
import { FormlyMaterialModule } from '@ngx-formly/material';

// Components
import { GcpFormComponent } from './components/gcp-form/gcp-form.component';
import { GcpResultsComponent } from './components/gcp-results/gcp-results.component';

const routes: Routes = [
  {
    path: '',
    component: GcpFormComponent,
  },
  {
    path: 'results',
    component: GcpResultsComponent,
  },
];

@NgModule({
  declarations: [
    GcpFormComponent,
    GcpResultsComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    
    // NgRx
    StoreModule.forFeature('gcp', gcpReducer),
    EffectsModule.forFeature([GCPEffects]),
    
    // Material
    MatButtonModule,
    MatCardModule,
    MatProgressBarModule,
    MatIconModule,
    
    // Formly
    FormlyModule.forChild(),
    FormlyMaterialModule,
  ],
})
export class GcpModule {}
