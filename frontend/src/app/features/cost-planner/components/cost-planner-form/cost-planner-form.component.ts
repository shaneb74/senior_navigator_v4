import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';

import * as CostPlannerActions from '../../store/cost-planner.actions';
import * as CostPlannerSelectors from '../../store/cost-planner.selectors';
import { ModuleConfig, Question, Section } from '../../../../core/services/module-config.service';
import { ModuleConfigService } from '../../../../core/services/module-config.service';
import { UserContextService } from '../../../../core/services/user-context.service';
import { getVaDisabilityAmount } from '../../constants/va-disability-rates';

@Component({
  selector: 'app-cost-planner-form',
  templateUrl: './cost-planner-form.component.html',
  styleUrls: ['./cost-planner-form.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    MatRadioModule,
    MatInputModule,
    MatFormFieldModule,
    MatOptionModule,
  ],
})
export class CostPlannerFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private latestConfig: ModuleConfig | null = null;
  private contextName = '';
  private currentSectionRef: Section | null = null;
  private modelInitialized = false;
  private suppressValueSync = false;

  config$: Observable<ModuleConfig | null>;
  currentSection$: Observable<Section | null>;
  progress$: Observable<number>;
  submitting$: Observable<boolean>;
  canGoNext$: Observable<boolean>;
  canGoPrevious$: Observable<boolean>;
  isLastSection$: Observable<boolean>;
  submitError$: Observable<string | null>;

  form = new FormGroup({});
  model: any = {};
  currentQuestions: Question[] = [];

  constructor(
    private store: Store,
    private moduleConfigService: ModuleConfigService,
    private snackBar: MatSnackBar,
    private userContext: UserContextService
  ) {
    this.config$ = this.store.select(CostPlannerSelectors.selectModuleConfig);
    this.currentSection$ = this.store.select(CostPlannerSelectors.selectCurrentSection);
    this.progress$ = this.store.select(CostPlannerSelectors.selectProgress);
    this.submitting$ = this.store.select(CostPlannerSelectors.selectSubmitting);
    this.canGoNext$ = this.store.select(CostPlannerSelectors.selectCanGoNext);
    this.canGoPrevious$ = this.store.select(CostPlannerSelectors.selectCanGoPrevious);
    this.isLastSection$ = this.store.select(CostPlannerSelectors.selectIsLastSection);
    this.submitError$ = this.store.select(CostPlannerSelectors.selectSubmitError);

    const existingContext = this.userContext.getContext();
    if (existingContext?.care_recipient_name) {
      this.contextName = existingContext.care_recipient_name;
    }
  }

  ngOnInit(): void {
    this.store.dispatch(CostPlannerActions.loadModuleConfig());

    this.config$
      .pipe(takeUntil(this.destroy$))
      .subscribe((config) => {
        if (config) {
          this.latestConfig = config;
          this.initializeFormControls(config);
          this.updateCurrentSectionFields(this.currentSectionRef ?? config.sections[0]);
        }
      });

    this.store
      .select(CostPlannerSelectors.selectFormData)
      .pipe(takeUntil(this.destroy$))
      .subscribe((formData) => {
        if (!formData) {
          return;
        }

        this.model = { ...formData };

        if (!this.modelInitialized) {
          this.modelInitialized = true;
        }

        Object.entries(formData).forEach(([key, value]) => {
          const control = this.form.get(key);
          if (control && control.value !== value) {
            this.suppressValueSync = true;
            control.patchValue(value, { emitEvent: false });
            this.suppressValueSync = false;
          }
        });
      });

    this.currentSection$
      .pipe(takeUntil(this.destroy$))
      .subscribe((section) => {
        if (section) {
          this.currentSectionRef = section;
          this.updateCurrentSectionFields(section);
        }
      });

    this.form.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        if (!value || this.suppressValueSync) {
          return;
        }

        const formValue = value as Record<string, any>;

        if (formValue['care_recipient_name'] && formValue['care_recipient_name'] !== this.contextName) {
          this.contextName = formValue['care_recipient_name'];
          this.userContext.updateContext({ care_recipient_name: this.contextName });
          this.initializeFormControls(this.latestConfig);
          this.updateCurrentSectionFields(this.currentSectionRef);
        }

        const changedEntries = Object.entries(formValue).filter(
          ([key, fieldValue]) => this.model[key] !== fieldValue
        );

        if (changedEntries.length === 0) {
          return;
        }

        changedEntries.forEach(([key, fieldValue]) => {
          this.model[key] = fieldValue;
          this.store.dispatch(
            CostPlannerActions.updateFormValue({
              field: key,
              value: fieldValue,
            })
          );
        });

        this.applyDerivedFieldUpdates(formValue);
      });

    this.submitError$
      .pipe(takeUntil(this.destroy$))
      .subscribe((error) => {
        if (error) {
          this.snackBar.open(`Error: ${error}`, 'Dismiss', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onNext(): void {
    if (this.form.valid) {
      this.store.dispatch(CostPlannerActions.nextSection());
    } else {
      this.snackBar.open('Please complete all required fields before continuing', 'Dismiss', {
        duration: 3000,
      });
    }
  }

  onPrevious(): void {
    this.store.dispatch(CostPlannerActions.previousSection());
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.applyDerivedFieldUpdates();
      const payload = this.buildSubmissionPayload();
      this.store.dispatch(CostPlannerActions.submitAssessment({ formData: payload }));
    } else {
      this.snackBar.open('Please complete all required fields before submitting', 'Dismiss', {
        duration: 3000,
      });
      Object.keys(this.form.controls).forEach((key) => {
        this.form.get(key)?.markAsTouched();
      });
    }
  }

  renderText(text?: string): string {
    if (!text) return '';
    if (!this.contextName) return text;
    return this.moduleConfigService.replacePlaceholders(text, { name: this.contextName });
  }

  private initializeFormControls(config: ModuleConfig | null): void {
    if (!config) {
      return;
    }

    config.sections.forEach((section) => {
      (section.questions || []).forEach((question) => {
        if (this.form.get(question.id)) {
          return;
        }

        const initialValue =
          this.model[question.id] ??
          question.default ??
          (this.isMultiSelect(question) ? [] : question.type === 'boolean' ? false : '');

        const validators = [];
        if (question.required) {
          validators.push(Validators.required);
        }
        if (question.type === 'number') {
          if (question.ui?.['min'] !== undefined) {
            validators.push(Validators.min(question.ui['min']));
          }
          if (question.ui?.['max'] !== undefined) {
            validators.push(Validators.max(question.ui['max']));
          }
        }

        this.form.addControl(question.id, new FormControl(initialValue, validators));
      });
    });

    const careControl = this.form.get('care_recipient_name');
    if (this.contextName && careControl && !careControl.value) {
      (careControl as any).patchValue(this.contextName, { emitEvent: false });
      this.model['care_recipient_name'] = this.contextName;
    }
  }

  private updateCurrentSectionFields(section: Section | null): void {
    if (!section) {
      this.currentQuestions = [];
      return;
    }
    this.currentSectionRef = section;
    this.currentQuestions = section.questions || [];
  }

  private applyDerivedFieldUpdates(source?: Record<string, any>): void {
    const snapshot = source ?? this.model;
    this.syncVaDisabilityAmount(snapshot);
    this.syncVaBenefitSummary(snapshot);
    this.syncAssetAggregates(snapshot);
  }

  private normalizeVaDependentKey(value: any): string | null {
    if (!value) {
      return null;
    }
    const map: Record<string, string> = {
      veteran_with_spouse: 'with_spouse',
      spouse_of_veteran: 'with_spouse',
      surviving_spouse: 'veteran_alone',
      veteran_alone: 'veteran_alone',
      veteran_with_spouse_one_child: 'with_spouse_one_child',
      veteran_with_spouse_two_plus_children: 'with_spouse_two_plus_children',
    };
    return map[value] || value;
  }

  private syncVaDisabilityAmount(data: Record<string, any>): void {
    const status = data['has_va_disability'];
    const shouldAutofill =
      status === true ||
      status === 'yes' ||
      status === 'applied' ||
      status === 'receiving';

    if (!shouldAutofill) {
      this.updateDerivedField('va_disability_monthly', this.toNumber(data['va_disability_monthly'] || 0));
      return;
    }

    const rating = data['va_disability_rating'];
    const dependents =
      this.normalizeVaDependentKey(data['va_dependents']) ||
      this.normalizeVaDependentKey(data['veteran_relationship']);

    if (!rating || !dependents) {
      // If we have rating but no dependents, default to veteran_alone
      if (rating && !dependents) {
        const amount = getVaDisabilityAmount(rating, 'veteran_alone');
        this.updateDerivedField('va_disability_monthly', amount);
        const control = this.form.get('va_disability_monthly');
        if (control && control.value !== amount) {
          (control as any).patchValue(amount, { emitEvent: false });
        }
      }
      return;
    }

    const amount = getVaDisabilityAmount(rating, dependents);

    this.updateDerivedField('va_disability_monthly', amount);

    const control = this.form.get('va_disability_monthly');
    if (control && control.value !== amount) {
      (control as any).patchValue(amount, { emitEvent: false });
    }
  }

  private syncVaBenefitSummary(data: Record<string, any>): void {
    const totalVa =
      this.toNumber(data['va_disability_monthly']) + this.toNumber(data['aid_attendance_monthly']);
    this.updateDerivedField('va_benefit_amount', totalVa);

    const status = this.deriveVaBenefitStatus();
    this.updateDerivedField('va_benefit_status', status);
  }

  private syncAssetAggregates(data: Record<string, any>): void {
    const liquid =
      this.toNumber(data['checking_savings']) + this.toNumber(data['cds_money_market']);
    this.updateDerivedField('liquid_assets', liquid);

    const investments =
      this.toNumber(data['stocks_bonds']) +
      this.toNumber(data['mutual_funds']) +
      this.toNumber(data['ira_traditional']) +
      this.toNumber(data['ira_roth']) +
      this.toNumber(data['k401_403b']) +
      this.toNumber(data['other_retirement']);
    this.updateDerivedField('investment_assets', investments);

    const homeEquity = Math.max(
      this.toNumber(data['primary_residence_value']) -
        this.toNumber(data['primary_residence_mortgage']),
      0
    );
    const realEstate = homeEquity + this.toNumber(data['investment_property']);
    this.updateDerivedField('real_estate_assets', realEstate);

    const otherAssets =
      this.toNumber(data['business_value']) + this.toNumber(data['other_assets_value']);
    this.updateDerivedField('other_assets', otherAssets);
  }

  private updateDerivedField(field: string, value: any): void {
    if (this.model[field] === value) {
      return;
    }
    this.model = {
      ...this.model,
      [field]: value,
    };

    this.store.dispatch(CostPlannerActions.updateFormValue({ field, value }));
  }

  private deriveVaBenefitStatus(model: Record<string, any> = this.model): 'none' | 'eligible' | 'receiving' {
    const isVeteran = Boolean(model['is_veteran']);
    if (!isVeteran) {
      return 'none';
    }

    const receivesBenefit = model['has_va_disability'] === 'yes' || model['has_aid_attendance'] === 'yes';
    if (receivesBenefit) {
      return 'receiving';
    }

    const isPursuingBenefit =
      ['applied', 'considering'].includes(model['has_va_disability']) ||
      ['applied', 'considering'].includes(model['has_aid_attendance']);

    return 'eligible';
  }

  private toNumber(value: any): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  private buildSubmissionPayload(): Record<string, any> {
    const baseModel = { ...this.model };

    const payload = {
      ...baseModel,
      liquid_assets:
        this.toNumber(baseModel.checking_savings) + this.toNumber(baseModel.cds_money_market),
      investment_assets:
        this.toNumber(baseModel.stocks_bonds) +
        this.toNumber(baseModel.mutual_funds) +
        this.toNumber(baseModel.ira_traditional) +
        this.toNumber(baseModel.ira_roth) +
        this.toNumber(baseModel.k401_403b) +
        this.toNumber(baseModel.other_retirement),
      real_estate_assets:
        Math.max(
          this.toNumber(baseModel.primary_residence_value) -
            this.toNumber(baseModel.primary_residence_mortgage),
          0
        ) + this.toNumber(baseModel.investment_property),
      other_assets:
        this.toNumber(baseModel.business_value) + this.toNumber(baseModel.other_assets_value),
      va_benefit_amount:
        this.toNumber(baseModel.va_disability_monthly) + this.toNumber(baseModel.aid_attendance_monthly),
      va_benefit_status: this.deriveVaBenefitStatus(baseModel),
    };

    return payload;
  }

  isCurrentSectionValid(): boolean {
    if (!this.currentQuestions?.length) {
      return true;
    }
    return this.currentQuestions
      .filter((question) => question?.required && this.isQuestionVisible(question))
      .every((question) => this.form.get(question.id)?.valid);
  }

  isQuestionVisible(question: Question): boolean {
    const condition = question?.visible_if;
    if (!condition) {
      return true;
    }
    const formValue = this.form.value as Record<string, any>;
    const value = formValue?.[condition.key];
    if (condition.eq !== undefined) {
      return this.compareValue(value, condition.eq);
    }
    if (condition.neq !== undefined) {
      return !this.compareValue(value, condition.neq);
    }
    if (condition.in) {
      if (Array.isArray(value)) {
        return value.some((v) => condition.in!.includes(v));
      }
      return condition.in.includes(value);
    }
    return value !== null && value !== undefined && value !== '';
  }

  private compareValue(value: any, expected: any): boolean {
    if (Array.isArray(value)) {
      return value.includes(expected);
    }
    return value === expected;
  }

  getControlType(question: Question): 'text' | 'select' | 'radio' | 'checkbox' | 'textarea' {
    if (question.type === 'boolean') {
      return 'checkbox';
    }
    if (question.ui?.widget === 'textarea') {
      return 'textarea';
    }
    if (question.options?.length) {
      if (question.ui?.widget === 'radio') {
        return 'radio';
      }
      return 'select';
    }
    return 'text';
  }

  isMultiSelect(question: Question): boolean {
    const selection = this.normalizeSelection(question.select);
    if (selection) {
      return selection === 'multi';
    }
    return Array.isArray(question.default);
  }

  private normalizeSelection(value: 'single' | 'multiple' | 'multi' | undefined): 'single' | 'multi' | undefined {
    if (!value) {
      return undefined;
    }
    if (value === 'multiple') {
      return 'multi';
    }
    return value;
  }
}
