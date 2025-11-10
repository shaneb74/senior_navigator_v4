import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { FormlyFieldConfig } from '@ngx-formly/core';

interface LegacyCostPlannerConfig {
  version: string;
  metadata: {
    product_key: string;
    display_name: string;
    description: string;
  };
  modules: LegacyModule[];
}

interface LegacyModule {
  key: string;
  title: string;
  description?: string;
  estimated_time?: string;
  required?: boolean;
  sort_order?: number;
  sections: LegacySection[];
}

interface LegacySection {
  id: string;
  title: string;
  icon?: string;
  help_text?: string;
  fields?: LegacyField[];
}

interface LegacyField {
  key: string;
  label: string;
  type: string;
  description?: string;
  help?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  default?: any;
  options?: { value: string; label: string }[];
  placeholder?: string;
  visible_if?: {
    field: string;
    equals?: any;
    not_equals?: any;
    in?: any[];
  };
}

export interface ModuleConfig {
  module: {
    id: string;
    name: string;
    version: string;
    description: string;
    results_step_id: string;
    display: {
      title: string;
      subtitle: string;
      estimated_time: string;
      autosave: boolean;
      progress_weight: number;
    };
    navi_guidance?: any;
  };
  sections: Section[];
}

export interface Section {
  id: string;
  title: string;
  description?: string;
  type?: string;
  content?: string[];
  questions?: Question[];
  actions?: Action[];
  navi_guidance?: any;
}

export interface Question {
  id: string;
  type: string;
  select?: 'single' | 'multiple' | 'multi';
  label: string;
  required?: boolean;
  default?: any;
  options?: Option[];
  description?: string;
  ui?: {
    widget?: string;
    orientation?: string;
    [key: string]: any;
  };
  validation?: any;
  navi_guidance?: any;
  visible_if?: VisibleCondition;
}

export interface Option {
  label: string;
  value: string;
  flags?: string[];
  description?: string;
}

export interface Action {
  label: string;
  action: string;
  value?: string;
}

export interface VisibleCondition {
  key: string;
  eq?: any;
  in?: any[];
  neq?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ModuleConfigService {
  constructor(private http: HttpClient) {}

  /**
   * Load module configuration from JSON file
   */
  loadModuleConfig(moduleId: string): Observable<ModuleConfig> {
    const filename = moduleId === 'cost_planner'
      ? 'cost_planner_modules.json'
      : `${moduleId}_module.json`;
    const configPath = `/assets/configs/${filename}`;
    return this.http.get<any>(configPath).pipe(
      map((config) => {
        if (moduleId === 'cost_planner' && config?.modules) {
          return this.transformLegacyCostPlannerConfig(config as LegacyCostPlannerConfig);
        }
        return config as ModuleConfig;
      })
    );
  }

  /**
   * Convert module config to Formly field configuration
   * This is the key method that transforms our JSON into Formly forms
   */
  convertToFormlyFields(moduleConfig: ModuleConfig, context?: { name: string }): FormlyFieldConfig[] {
    const fields: FormlyFieldConfig[] = [];

    for (const section of moduleConfig.sections) {
      // Skip info-only sections (like intro)
      if (section.type === 'info' || !section.questions) {
        continue;
      }

      // Create a fieldGroup for each section
      const sectionFields: FormlyFieldConfig[] = [];

      for (const question of section.questions) {
        const field = this.convertQuestionToFormlyField(question, context);
        if (field) {
          sectionFields.push(field);
        }
      }

      // Add section wrapper if we have fields
      if (sectionFields.length > 0) {
        const header: FormlyFieldConfig[] = [];
        if (section.title || section.description) {
          header.push({
            template: `
              <div class="form-section-header">
                ${section.title ? `<h3>${context?.name ? this.replacePlaceholders(section.title, context) : section.title}</h3>` : ''}
                ${section.description ? `<p>${context?.name ? this.replacePlaceholders(section.description, context) : section.description}</p>` : ''}
              </div>
            `,
          });
        }

        fields.push({
          key: section.id,
          fieldGroupClassName: 'form-section',
          fieldGroup: [...header, ...sectionFields],
        });
      }
    }

    return fields;
  }

  /**
   * Convert a single question to a Formly field
   */
  convertQuestionToFormlyField(question: Question, context?: { name: string }): FormlyFieldConfig | null {
    const label = context?.name ? this.replacePlaceholders(question.label, context) : question.label;
    const selection = this.normalizeSelection(question.select) || this.inferSelection(question);

    const field: FormlyFieldConfig = {
      key: question.id,
      type: 'input',
      props: {
        label,
        required: question.required || false,
        options: question.options?.map(opt => ({
          label: context?.name ? this.replacePlaceholders(opt.label, context) : opt.label,
          value: opt.value,
        })) || [],
        description: (() => {
          const rawDescription = question.description || question.navi_guidance?.tip;
          if (!rawDescription) return undefined;
          return context?.name ? this.replacePlaceholders(rawDescription, context) : rawDescription;
        })(),
      },
      defaultValue: question.default,
    };

    field.type = this.getFormlyType(question, selection);

    if (selection === 'multi') {
      field.props = {
        ...field.props,
        multiple: true,
      };
    }

    // Add validation
    if (question.required) {
      field.props = {
        ...field.props,
        required: true
      };
    }

    if (question.type === 'number') {
      field.props = {
        ...field.props,
        type: 'number'
      };
    }

    // Add custom attributes from UI config
    if (question.ui) {
      const { widget, ...rest } = question.ui;
      field.props = {
        ...field.props,
        ...rest,
      };
    }

    if (question.visible_if) {
      const evaluator = this.buildVisibleEvaluator(question.visible_if);
      if (evaluator) {
        field.hideExpression = (model: any) => !evaluator(model);
      }
    }

    return field;
  }

  /**
   * Map our question types to Formly/Material field types
   */
  private getFormlyType(question: Question, selection?: 'single' | 'multi'): string {
    // Map based on type and select
    switch (question.type) {
      case 'string':
        if (question.options?.length) {
          if (selection === 'multi') {
            return 'select';
          }
          if (selection === 'single') {
            return 'select';
          }
        }
        return 'input';

      case 'number':
        return 'input';

      case 'boolean':
        return 'checkbox';

      case 'array':
        return 'repeat';

      default:
        return 'input';
    }
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

  private inferSelection(question: Question): 'single' | 'multi' | undefined {
    if (!question.options || question.options.length === 0) {
      return undefined;
    }
    if (Array.isArray(question.default)) {
      return 'multi';
    }
    return 'single';
  }

  private buildVisibleEvaluator(condition: VisibleCondition | undefined) {
    if (!condition || !condition.key) {
      return null;
    }

    const checkEq = (value: any) => {
      if (Array.isArray(value)) {
        return value.includes(condition.eq);
      }
      return value === condition.eq;
    };

    const checkIn = (value: any) => {
      if (!Array.isArray(condition.in) || condition.in.length === 0) {
        return false;
      }
      if (Array.isArray(value)) {
        return value.some(v => condition.in!.includes(v));
      }
      return condition.in!.includes(value);
    };

    const checkNeq = (value: any) => {
      if (Array.isArray(value)) {
        return !value.includes(condition.neq);
      }
      return value !== condition.neq;
    };

    return (model: any) => {
      const value = model ? model[condition.key] : undefined;
      if (condition.eq !== undefined) {
        return checkEq(value);
      }
      if (condition.in) {
        return checkIn(value);
      }
      if (condition.neq !== undefined) {
        return checkNeq(value);
      }
      return value !== undefined && value !== null && value !== '';
    };
  }

  private transformLegacyCostPlannerConfig(config: LegacyCostPlannerConfig): ModuleConfig {
    const sections: Section[] = [];
    const sortedModules = [...config.modules].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );

    for (const mod of sortedModules) {
      for (const section of mod.sections || []) {
        const questions = (section.fields || [])
          .map((field) => this.mapLegacyFieldToQuestion(field))
          .filter((q): q is Question => !!q);

        if (questions.length === 0) {
          continue;
        }

        sections.push({
          id: `${mod.key}.${section.id}`,
          title: section.title || mod.title,
          description: section.help_text || mod.description,
          questions,
        });
      }
    }

    return {
      module: {
        id: config.metadata?.product_key || 'cost_planner',
        name: config.metadata?.display_name || 'Cost Planner',
        version: config.version || 'v1',
        description: config.metadata?.description || '',
        results_step_id: 'results',
        display: {
          title: config.metadata?.display_name || 'Financial Assessment',
          subtitle: config.metadata?.description || '',
          estimated_time: '≈5 min',
          autosave: true,
          progress_weight: 1,
        },
      },
      sections,
    };
  }

  private mapLegacyFieldToQuestion(field: LegacyField): Question | null {
    const skipTypes = [
      'calculated',
      'display_currency',
      'info',
      'success',
      'warning',
      'display'
    ];
    if (!field || skipTypes.includes(field.type)) {
      return null;
    }

    const typeMapping: Record<string, string> = {
      currency: 'number',
      number: 'number',
      text: 'string',
      textarea: 'string',
      select: 'string',
      radio: 'string',
      multiselect: 'string',
      checkbox: 'boolean',
      boolean: 'boolean',
    };

    const question: Question = {
      id: field.key,
      type: typeMapping[field.type] || 'string',
      label: field.label,
      required: field.required || false,
      default: field.default,
      description: field.help || field.description,
      options: field.options
        ? field.options.map((opt) => ({ label: opt.label, value: opt.value }))
        : undefined,
      ui: {},
    };

    if (field.type === 'multiselect' && !Array.isArray(question.default)) {
      question.default = [];
    }

    if (field.type === 'textarea') {
      question.ui = { ...(question.ui || {}), widget: 'textarea', rows: 3 };
    }

    if (field.type === 'currency') {
      question.ui = {
        ...(question.ui || {}),
        prefix: '$',
        min: field.min,
        max: field.max,
        step: field.step,
      };
    } else if (field.type === 'number') {
      question.ui = {
        ...(question.ui || {}),
        min: field.min,
        max: field.max,
        step: field.step,
      };
    }

    if (field.placeholder) {
      question.ui = { ...(question.ui || {}), placeholder: field.placeholder };
    }

    if (field.visible_if) {
      question.visible_if = {
        key: field.visible_if.field,
        eq: field.visible_if.equals,
        in: field.visible_if.in,
        neq: field.visible_if.not_equals,
      };
    }

    return question;
  }

  /**
   * Get intro section for display
   */
  getIntroSection(moduleConfig: ModuleConfig): Section | undefined {
    return moduleConfig.sections.find(s => s.id === 'intro' || s.type === 'info');
  }

  /**
   * Get results section ID
   */
  getResultsStepId(moduleConfig: ModuleConfig): string {
    return moduleConfig.module.results_step_id;
  }

  /**
   * Replace name placeholders in text
   * {NAME}, {NAME_POS}, etc.
   */
  replacePlaceholders(text: string, context: { name: string }): string {
    return text
      .replace(/{NAME}/g, context.name)
      .replace(/{NAME_POS}/g, `${context.name}'s`)
      .replace(/{NAME_POSS}/g, `${context.name}'s`);
  }
}
