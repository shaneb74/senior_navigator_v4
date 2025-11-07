import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { FormlyFieldConfig } from '@ngx-formly/core';

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
  ui?: {
    widget?: string;
    orientation?: string;
    [key: string]: any;
  };
  validation?: any;
  navi_guidance?: any;
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

@Injectable({
  providedIn: 'root'
})
export class ModuleConfigService {
  constructor(private http: HttpClient) {}

  /**
   * Load module configuration from JSON file
   */
  loadModuleConfig(moduleId: string): Observable<ModuleConfig> {
    const configPath = `/assets/configs/${moduleId}_module.json`;
    return this.http.get<ModuleConfig>(configPath);
  }

  /**
   * Convert module config to Formly field configuration
   * This is the key method that transforms our JSON into Formly forms
   */
  convertToFormlyFields(moduleConfig: ModuleConfig): FormlyFieldConfig[] {
    const fields: FormlyFieldConfig[] = [];

    for (const section of moduleConfig.sections) {
      // Skip info-only sections (like intro)
      if (section.type === 'info' || !section.questions) {
        continue;
      }

      // Create a fieldGroup for each section
      const sectionFields: FormlyFieldConfig[] = [];

      for (const question of section.questions) {
        const field = this.convertQuestionToFormlyField(question);
        if (field) {
          sectionFields.push(field);
        }
      }

      // Add section wrapper if we have fields
      if (sectionFields.length > 0) {
        fields.push({
          key: section.id,
          wrappers: ['section'],
          props: {
            label: section.title,
            description: section.description,
          },
          fieldGroup: sectionFields,
        });
      }
    }

    return fields;
  }

  /**
   * Convert a single question to a Formly field
   */
  convertQuestionToFormlyField(question: Question): FormlyFieldConfig | null {
    const field: FormlyFieldConfig = {
      key: question.id,
      type: this.getFormlyType(question),
      props: {
        label: question.label,
        required: question.required || false,
        options: question.options?.map(opt => ({
          label: opt.label,
          value: opt.value,
        })) || [],
        description: question.navi_guidance?.tip,
        multiple: question.select === 'multi' || question.select === 'multiple',
      },
      defaultValue: question.default,
    };

    // Add validation
    if (question.required) {
      field.props = {
        ...field.props,
        required: true
      };
    }

    // Add custom attributes from UI config
    if (question.ui) {
      field.props = {
        ...field.props,
        ...question.ui,
      };
    }

    return field;
  }

  /**
   * Map our question types to Formly/Material field types
   */
  private getFormlyType(question: Question): string {
    // Handle widget overrides first
    if (question.ui?.widget) {
      switch (question.ui.widget) {
        case 'chip':
          return 'radio'; // Material chips for single select
        case 'slider':
          return 'slider';
        case 'textarea':
          return 'textarea';
        default:
          break;
      }
    }

    // Map based on type and select
    switch (question.type) {
      case 'string':
        if (question.select === 'single' && question.options) {
          return 'radio';
        }
        if ((question.select === 'multiple' || question.select === 'multi') && question.options) {
          return 'select';  // Use select for multi-select dropdown
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
