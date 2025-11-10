import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { Store } from '@ngrx/store';
import { FormlyFieldConfig, FormlyFormOptions, FormlyModule } from '@ngx-formly/core';
import { FormlyMaterialModule } from '@ngx-formly/material';
import { FormlyMatInputModule } from '@ngx-formly/material/input';
import { FormlyMatSelectModule } from '@ngx-formly/material/select';
import { FormlyMatRadioModule } from '@ngx-formly/material/radio';
import { FormlyMatCheckboxModule } from '@ngx-formly/material/checkbox';
import { FormlyMatTextAreaModule } from '@ngx-formly/material/textarea';
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

import * as CostPlannerActions from '../../store/cost-planner.actions';
import * as CostPlannerSelectors from '../../store/cost-planner.selectors';
import { ModuleConfig, Section } from '../../../../core/services/module-config.service';
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
    FormlyModule,
    FormlyMaterialModule,
    FormlyMatInputModule,
    FormlyMatSelectModule,
    FormlyMatRadioModule,
    FormlyMatCheckboxModule,
    FormlyMatTextAreaModule,
    MatButtonModule,
    MatCardModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    MatRadioModule,
  ],
})
export class CostPlannerFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private latestConfig: ModuleConfig | null = null;
  private contextName = '';
  private currentSectionRef: Section | null = null;

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
  options: FormlyFormOptions = {};
  fields: FormlyFieldConfig[] = [];
  currentSectionFields: FormlyFieldConfig[] = [];

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
          this.buildDynamicFields();
        }
      });

    this.store
      .select(CostPlannerSelectors.selectFormData)
      .pipe(takeUntil(this.destroy$))
      .subscribe((formData) => {
        this.model = { ...formData };
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
        if (!value) {
          return;
        }

        const formValue = value as Record<string, any>;

        if (formValue['care_recipient_name'] && formValue['care_recipient_name'] !== this.contextName) {
          this.contextName = formValue['care_recipient_name'];
          this.userContext.updateContext({ care_recipient_name: this.contextName });
          this.buildDynamicFields();
        }

        let nextModel = { ...this.model };
        let modelChanged = false;

        Object.keys(formValue).forEach((key) => {
          const fieldValue = formValue[key];
          if (nextModel[key] === fieldValue) {
            return;
          }
          nextModel = { ...nextModel, [key]: fieldValue };
          modelChanged = true;
          this.store.dispatch(
            CostPlannerActions.updateFormValue({
              field: key,
              value: fieldValue,
            })
          );
        });

        if (modelChanged) {
          this.model = nextModel;
        }

        this.applyDerivedFieldUpdates();
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

  private buildDynamicFields(): void {
    if (!this.latestConfig) {
      return;
    }
    const context = this.contextName ? { name: this.contextName } : undefined;
    this.fields = this.moduleConfigService.convertToFormlyFields(this.latestConfig, context);
    if (this.currentSectionRef) {
      this.updateCurrentSectionFields(this.currentSectionRef);
    }
    if (this.contextName && !this.model.care_recipient_name) {
      this.model = {
        ...this.model,
        care_recipient_name: this.contextName,
      };
    }
  }

  private updateCurrentSectionFields(section: Section): void {
    if (!section.questions) {
      this.currentSectionFields = [];
      return;
    }
    const context = this.contextName ? { name: this.contextName } : undefined;
    this.currentSectionFields = section.questions
      .map((q) => this.moduleConfigService.convertQuestionToFormlyField(q, context))
      .filter((field): field is FormlyFieldConfig => !!field);
  }

  private applyDerivedFieldUpdates(): void {
    this.syncVaDisabilityAmount();
    this.syncVaBenefitSummary();
    this.syncAssetAggregates();
  }

  private syncVaDisabilityAmount(): void {
    const status = this.model.has_va_disability;
    const shouldAutofill =
      status === true ||
      status === 'yes' ||
      status === 'applied' ||
      status === 'receiving';

    if (!shouldAutofill) {
      return;
    }

    const rating = this.model.va_disability_rating;
    const dependents = this.model.va_dependents || this.model.veteran_relationship;
    const amount = getVaDisabilityAmount(rating, dependents);

    this.updateDerivedField('va_disability_monthly', amount);

    const control = this.form.get('va_disability_monthly');
    if (control && control.value !== amount) {
      (control as any).patchValue(amount, { emitEvent: false });
    }
  }

  private syncVaBenefitSummary(): void {
    const totalVa =
      this.toNumber(this.model.va_disability_monthly) + this.toNumber(this.model.aid_attendance_monthly);
    this.updateDerivedField('va_benefit_amount', totalVa);

    const status = this.deriveVaBenefitStatus();
    this.updateDerivedField('va_benefit_status', status);
  }

  private syncAssetAggregates(): void {
    const liquid =
      this.toNumber(this.model.checking_savings) + this.toNumber(this.model.cds_money_market);
    this.updateDerivedField('liquid_assets', liquid);

    const investments =
      this.toNumber(this.model.stocks_bonds) +
      this.toNumber(this.model.mutual_funds) +
      this.toNumber(this.model.ira_traditional) +
      this.toNumber(this.model.ira_roth) +
      this.toNumber(this.model.k401_403b) +
      this.toNumber(this.model.other_retirement);
    this.updateDerivedField('investment_assets', investments);

    const homeEquity = Math.max(
      this.toNumber(this.model.primary_residence_value) -
        this.toNumber(this.model.primary_residence_mortgage),
      0
    );
    const realEstate = homeEquity + this.toNumber(this.model.investment_property);
    this.updateDerivedField('real_estate_assets', realEstate);

    const otherAssets =
      this.toNumber(this.model.business_value) + this.toNumber(this.model.other_assets_value);
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
}
