import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { FormGroup } from '@angular/forms';
import { FormlyFieldConfig, FormlyFormOptions } from '@ngx-formly/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import * as GCPActions from '../../store/gcp.actions';
import * as GCPSelectors from '../../store/gcp.selectors';
import { ModuleConfig, Section } from '../../../../core/services/module-config.service';
import { ModuleConfigService } from '../../../../core/services/module-config.service';

@Component({
  selector: 'app-gcp-form',
  templateUrl: './gcp-form.component.html',
  styleUrls: ['./gcp-form.component.scss'],
  standalone: false
})
export class GcpFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Observable state
  config$: Observable<ModuleConfig | null>;
  currentSection$: Observable<Section | null>;
  progress$: Observable<number>;
  submitting$: Observable<boolean>;
  canGoNext$: Observable<boolean>;
  canGoPrevious$: Observable<boolean>;
  isLastSection$: Observable<boolean>;

  // Form state
  form = new FormGroup({});
  model: any = {};
  options: FormlyFormOptions = {};
  fields: FormlyFieldConfig[] = [];

  // Current section fields
  currentSectionFields: FormlyFieldConfig[] = [];

  constructor(
    private store: Store,
    private moduleConfigService: ModuleConfigService
  ) {
    // Wire up observables
    this.config$ = this.store.select(GCPSelectors.selectModuleConfig);
    this.currentSection$ = this.store.select(GCPSelectors.selectCurrentSection);
    this.progress$ = this.store.select(GCPSelectors.selectProgress);
    this.submitting$ = this.store.select(GCPSelectors.selectSubmitting);
    this.canGoNext$ = this.store.select(GCPSelectors.selectCanGoNext);
    this.canGoPrevious$ = this.store.select(GCPSelectors.selectCanGoPrevious);
    this.isLastSection$ = this.store.select(GCPSelectors.selectIsLastSection);
  }

  ngOnInit(): void {
    // Load module configuration
    this.store.dispatch(GCPActions.loadModuleConfig());

    // Subscribe to config changes
    this.config$
      .pipe(takeUntil(this.destroy$))
      .subscribe(config => {
        if (config) {
          this.fields = this.moduleConfigService.convertToFormlyFields(config);
        }
      });

    // Subscribe to current section changes
    this.currentSection$
      .pipe(takeUntil(this.destroy$))
      .subscribe(section => {
        if (section) {
          this.updateCurrentSectionFields(section);
        }
      });

    // Subscribe to form value changes and update store
    this.form.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        // Update store with form values
        if (value) {
          Object.keys(value).forEach(key => {
            this.store.dispatch(GCPActions.updateFormValue({ 
              field: key, 
              value: (value as any)[key]
            }));
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
      this.store.dispatch(GCPActions.nextSection());
    }
  }

  onPrevious(): void {
    this.store.dispatch(GCPActions.previousSection());
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.store.dispatch(GCPActions.submitAssessment({ formData: this.model }));
    }
  }

  private updateCurrentSectionFields(section: Section): void {
    // Skip info sections
    if (section.type === 'info' || !section.questions) {
      this.currentSectionFields = [];
      return;
    }

    // Convert section questions to Formly fields
    this.currentSectionFields = section.questions.map(q => {
      const field = this.moduleConfigService['convertQuestionToFormlyField'](q);
      return field!;
    });
  }
}
