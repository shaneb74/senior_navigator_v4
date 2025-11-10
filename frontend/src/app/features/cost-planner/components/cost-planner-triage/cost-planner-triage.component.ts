import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import * as CostPlannerSelectors from '../../store/cost-planner.selectors';
import * as CostPlannerActions from '../../store/cost-planner.actions';

@Component({
  selector: 'app-cost-planner-triage',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './cost-planner-triage.component.html',
  styleUrls: ['./cost-planner-triage.component.scss'],
})
export class CostPlannerTriageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  readonly triageForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private router: Router
  ) {
    this.triageForm = this.fb.group({
      isOnMedicaid: [false],
      isVeteran: [false],
      isHomeowner: [false],
    });
  }

  ngOnInit(): void {
    this.store
      .select(CostPlannerSelectors.selectTriageAnswers)
      .pipe(takeUntil(this.destroy$))
      .subscribe((answers) => {
        if (!answers) {
          return;
        }
        this.triageForm.patchValue(
          {
            isOnMedicaid: answers.isOnMedicaid,
            isVeteran: answers.isVeteran,
            isHomeowner: answers.isHomeowner,
          },
          { emitEvent: false }
        );
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onBack(): void {
    this.router.navigate(['/cost-planner/quick-estimate']);
  }

  onContinue(): void {
    const { isOnMedicaid, isVeteran, isHomeowner } = this.triageForm.value;
    const answers = {
      isOnMedicaid: Boolean(isOnMedicaid),
      isVeteran: Boolean(isVeteran),
      isHomeowner: Boolean(isHomeowner),
    };
    this.store.dispatch(
      CostPlannerActions.setTriageAnswers({
        answers,
      })
    );
    this.store.dispatch(
      CostPlannerActions.updateFormValue({
        field: 'is_veteran',
        value: answers.isVeteran,
      })
    );
    this.store.dispatch(
      CostPlannerActions.updateFormValue({
        field: 'is_on_medicaid',
        value: answers.isOnMedicaid,
      })
    );
    this.store.dispatch(
      CostPlannerActions.updateFormValue({
        field: 'is_homeowner',
        value: answers.isHomeowner,
      })
    );
    this.router.navigate(['/cost-planner/assessments']);
  }
}
