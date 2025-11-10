import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { FormlyFieldConfig, FormlyFormOptions, FormlyModule } from '@ngx-formly/core';
import { FormlyMaterialModule } from '@ngx-formly/material';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Material
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import * as GCPActions from '../../store/gcp.actions';
import * as GCPSelectors from '../../store/gcp.selectors';
import { ModuleConfig, Section } from '../../../../core/services/module-config.service';
import { ModuleConfigService } from '../../../../core/services/module-config.service';
import { UserContextService } from '../../../../core/services/user-context.service';

@Component({
  selector: 'app-gcp-form',
  templateUrl: './gcp-form.component.html',
  styleUrls: ['./gcp-form.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormlyModule,
    FormlyMaterialModule,
    MatButtonModule,
    MatCardModule,
    MatProgressBarModule,
    MatIconModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule
  ]
})
export class GcpFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private latestConfig: ModuleConfig | null = null;

  // Observable state
  config$: Observable<ModuleConfig | null>;
  currentSection$: Observable<Section | null>;
  progress$: Observable<number>;
  submitting$: Observable<boolean>;
  canGoNext$: Observable<boolean>;
  canGoPrevious$: Observable<boolean>;
  isLastSection$: Observable<boolean>;
  submitError$: Observable<string | null>;

  // Form state
  form = new FormGroup({});
  model: any = {};
  options: FormlyFormOptions = {};
  fields: FormlyFieldConfig[] = [];

  // Current section fields
  currentSectionFields: FormlyFieldConfig[] = [];
  private currentSectionRef: Section | null = null;

  nameForm = new FormGroup({
    careRecipientName: new FormControl('', Validators.required),
  });
  hasUserName = false;
  personalizedIntro: string[] = [];
  careRecipientName = '';

  constructor(
    private store: Store,
    private moduleConfigService: ModuleConfigService,
    private snackBar: MatSnackBar,
    private userContext: UserContextService
  ) {
    // Wire up observables
    this.config$ = this.store.select(GCPSelectors.selectModuleConfig);
    this.currentSection$ = this.store.select(GCPSelectors.selectCurrentSection);
    this.progress$ = this.store.select(GCPSelectors.selectProgress);
    this.submitting$ = this.store.select(GCPSelectors.selectSubmitting);
    this.canGoNext$ = this.store.select(GCPSelectors.selectCanGoNext);
    this.canGoPrevious$ = this.store.select(GCPSelectors.selectCanGoPrevious);
    this.isLastSection$ = this.store.select(GCPSelectors.selectIsLastSection);
    this.submitError$ = this.store.select(GCPSelectors.selectSubmitError);

    const existingContext = this.userContext.getContext();
    if (existingContext?.care_recipient_name) {
      this.hasUserName = true;
      this.careRecipientName = existingContext.care_recipient_name;
      this.nameForm.patchValue({ careRecipientName: this.careRecipientName });
    }
  }

  ngOnInit(): void {
    console.log('[GCP] Component initialized, dispatching loadModuleConfig');
    
    // Load module configuration
    this.store.dispatch(GCPActions.loadModuleConfig());

    // Subscribe to config changes
    this.config$
      .pipe(takeUntil(this.destroy$))
      .subscribe(config => {
        console.log('[GCP] Config received:', config);
        if (config) {
          this.latestConfig = config;
          this.buildDynamicFields();
        }
      });

    // Subscribe to current section changes
    this.currentSection$
      .pipe(takeUntil(this.destroy$))
      .subscribe(section => {
        if (section) {
          this.currentSectionRef = section;
          this.updateIntroContent(section);
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

    // Subscribe to submit errors
    this.submitError$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        if (error) {
          this.snackBar.open(
            `Error: ${error}`,
            'Dismiss',
            { duration: 5000, panelClass: ['error-snackbar'] }
          );
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
    } else {
      this.snackBar.open(
        'Please complete all required fields before continuing',
        'Dismiss',
        { duration: 3000 }
      );
    }
  }

  onPrevious(): void {
    this.store.dispatch(GCPActions.previousSection());
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.store.dispatch(GCPActions.submitAssessment({ formData: this.model }));
    } else {
      this.snackBar.open(
        'Please complete all required fields before submitting',
        'Dismiss',
        { duration: 3000 }
      );
      // Mark all fields as touched to show validation errors
      Object.keys(this.form.controls).forEach(key => {
        this.form.get(key)?.markAsTouched();
      });
    }
  }

  confirmName(): void {
    if (this.nameForm.invalid) {
      this.nameForm.markAllAsTouched();
      return;
    }
    const name = this.nameForm.value.careRecipientName?.trim();
    if (!name) return;

    this.userContext.updateContext({ care_recipient_name: name });
    this.hasUserName = true;
    this.careRecipientName = name;
    this.buildDynamicFields();
    if (this.currentSectionRef?.type === 'info') {
      this.updateIntroContent(this.currentSectionRef);
    }
  }

  handleInfoAction(action: any): void {
    if (action.action === 'next') {
      this.onNext();
      return;
    }
    if (action.action === 'route' && action.value) {
      this.store.dispatch(GCPActions.setCurrentSection({ sectionId: action.value }));
      return;
    }
    this.onNext();
  }

  renderText(text?: string): string {
    if (!text) {
      return '';
    }
    if (!this.careRecipientName) {
      return text;
    }
    return this.moduleConfigService.replacePlaceholders(text, { name: this.careRecipientName });
  }

  private buildDynamicFields(): void {
    if (!this.latestConfig) {
      return;
    }
    const contextName = this.userContext.getContext()?.care_recipient_name;
    this.fields = this.moduleConfigService.convertToFormlyFields(
      this.latestConfig,
      contextName ? { name: contextName } : undefined
    );
    if (this.currentSectionRef && this.currentSectionRef.type !== 'info') {
      this.updateCurrentSectionFields(this.currentSectionRef);
    }
  }

  private updateIntroContent(section: Section): void {
    if (section.type !== 'info') {
      this.personalizedIntro = [];
      return;
    }

    const content = section.content || [];
    if (this.careRecipientName) {
      this.personalizedIntro = content.map(text => this.renderText(text));
    } else {
      this.personalizedIntro = content;
    }
  }

  private updateCurrentSectionFields(section: Section): void {
    console.log('[GCP] Updating section fields for:', section.id, section);
    
    // Skip info sections
    if (section.type === 'info' || !section.questions) {
      console.log('[GCP] Skipping info section or section without questions');
      this.currentSectionFields = [];
      return;
    }

    console.log('[GCP] Converting', section.questions.length, 'questions to Formly fields');
    
    const context = this.careRecipientName ? { name: this.careRecipientName } : undefined;
    this.currentSectionFields = section.questions.map(q => {
      const field = this.moduleConfigService.convertQuestionToFormlyField(q, context);
      console.log('[GCP] Question:', q.id, '→ Field:', field);
      return field!;
    }).filter(f => f !== null);
    
    console.log('[GCP] Current section fields:', this.currentSectionFields);
  }
}
