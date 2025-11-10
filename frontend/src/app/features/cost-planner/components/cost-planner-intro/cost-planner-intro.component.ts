import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, switchMap, takeUntil } from 'rxjs/operators';

import * as CostPlannerActions from '../../store/cost-planner.actions';
import * as CostPlannerSelectors from '../../store/cost-planner.selectors';
import { HomeCostService } from '../../services/home-cost.service';

@Component({
  selector: 'app-cost-planner-intro',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatIconModule,
  ],
  templateUrl: './cost-planner-intro.component.html',
  styleUrls: ['./cost-planner-intro.component.scss'],
})
export class CostPlannerIntroComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private homeCarryUserSet = false;
  private suppressHomeCarryPatch = false;

  readonly introForm: FormGroup;
  homeCarryMessage = 'Enter a ZIP to estimate typical household costs.';

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private router: Router,
    private snackBar: MatSnackBar,
    private homeCostService: HomeCostService
  ) {
    this.introForm = this.fb.group({
      zipCode: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
      homeCarry: [0, [Validators.min(0)]],
    });
  }

  ngOnInit(): void {
    this.store
      .select(CostPlannerSelectors.selectFormData)
      .pipe(takeUntil(this.destroy$))
      .subscribe((formData) => {
        const zip = formData?.['zip_code'];
        const expenses = formData?.['current_expenses'];
        const patch: Record<string, any> = {};
        if (zip && zip !== this.introForm.value.zipCode) {
          patch['zipCode'] = zip;
        }
        if (
          typeof expenses === 'number' &&
          expenses !== this.introForm.value.homeCarry
        ) {
          patch['homeCarry'] = expenses;
        }
        if (Object.keys(patch).length) {
          this.introForm.patchValue(patch, { emitEvent: false });
        }
      });

    this.setupZipLookup();
    this.trackHomeCarryEdits();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onContinue(): void {
    if (this.introForm.invalid) {
      this.snackBar.open('Please provide a 5-digit ZIP code to continue.', 'Dismiss', {
        duration: 3500,
      });
      this.introForm.markAllAsTouched();
      return;
    }

    const { zipCode, homeCarry } = this.introForm.value;
    this.store.dispatch(
      CostPlannerActions.updateFormValue({
        field: 'zip_code',
        value: zipCode,
      })
    );
    this.store.dispatch(
      CostPlannerActions.updateFormValue({
        field: 'current_expenses',
        value: Number(homeCarry) || 0,
      })
    );

    this.router.navigate(['/cost-planner/quick-estimate']);
  }

  private setupZipLookup(): void {
    const zipControl = this.introForm.get('zipCode');
    if (!zipControl) {
      return;
    }

    zipControl.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        map((value) => (value || '').toString().trim()),
        distinctUntilChanged(),
        switchMap((zip) =>
          /^\d{5}$/.test(zip) ? this.homeCostService.lookup(zip) : of(null)
        )
      )
      .subscribe((result) => {
        if (!result) {
          this.homeCarryMessage = 'Enter a ZIP to estimate typical household costs.';
          return;
        }

        this.homeCarryMessage =
          result.source === 'zip'
            ? 'Using ZIP median household expense.'
            : 'Using regional median household expense.';

        if (this.homeCarryUserSet) {
          return;
        }

        this.patchHomeCarry(Math.round(result.amount));
      });
  }

  private trackHomeCarryEdits(): void {
    const control = this.introForm.get('homeCarry');
    if (!control) {
      return;
    }

    control.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.suppressHomeCarryPatch) {
          return;
        }
        this.homeCarryUserSet = true;
      });
  }

  private patchHomeCarry(amount: number): void {
    this.suppressHomeCarryPatch = true;
    this.introForm.patchValue({ homeCarry: amount }, { emitEvent: false });
    this.suppressHomeCarryPatch = false;
  }
}
