import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import * as CostPlannerActions from '../../store/cost-planner.actions';
import * as CostPlannerSelectors from '../../store/cost-planner.selectors';
import { CareRecommendation, CareTier } from '../../../../shared/models/contracts';
import { MCIPService } from '../../../../core/services/mcip.service';

type QuickEstimateValue = {
  monthlyBudget: number | null;
  careLevel: CareTier | null;
};

type QuickEstimateSummary = {
  careCost: number;
  gap: number;
  baseCost: number;
  modifierTotal: number;
  modifierNotes: string[];
};

type CareScenario = {
  tier: CareTier;
  label: string;
  baseCost: number;
  modifierTotal: number;
  totalCost: number;
  householdCost: number;
  gap: number;
  includesHome: boolean;
  modifierBreakdown: Array<{ label: string; amount: number }>;
};

interface FlagCostRule {
  ids: string[];
  summary: string;
  adjustments: Partial<Record<CareTier, number>>;
  hoursDelta?: number;
}

const CARE_LEVEL_COSTS: Record<CareTier, number> = {
  none: 0,
  in_home: 4200,
  assisted_living: 5800,
  memory_care: 7800,
  memory_care_high_acuity: 9500,
};

const BASE_IN_HOME_HOURS = 4;

const COMPARISON_LEVELS: Array<{ tier: CareTier; label: string }> = [
  { tier: 'in_home', label: 'In-Home Support' },
  { tier: 'assisted_living', label: 'Assisted Living' },
  { tier: 'memory_care', label: 'Memory Care' },
];

const CARE_FLAG_RULES: FlagCostRule[] = [
  {
    ids: ['high_dependence', 'adl_total_support'],
    summary: 'Extensive hands-on care',
    adjustments: {
      in_home: 600,
      assisted_living: 450,
      memory_care: 450,
      memory_care_high_acuity: 650,
    },
    hoursDelta: 4,
  },
  {
    ids: ['moderate_dependence', 'adl_support_needed'],
    summary: 'Regular help with ADLs',
    adjustments: {
      in_home: 350,
      assisted_living: 250,
      memory_care: 250,
    },
    hoursDelta: 2,
  },
  {
    ids: ['falls_multiple', 'high_safety_concern', 'moderate_safety_concern'],
    summary: 'Fall monitoring & safety checks',
    adjustments: {
      in_home: 300,
      assisted_living: 220,
    },
    hoursDelta: 2,
  },
  {
    ids: ['severe_cognitive_risk', 'wandering', 'aggression', 'severe_sundowning'],
    summary: 'Cognitive / behavioral supervision',
    adjustments: {
      in_home: 500,
      assisted_living: 400,
      memory_care: 700,
      memory_care_high_acuity: 900,
    },
    hoursDelta: 3,
  },
  {
    ids: ['moderate_cognitive_decline', 'memory_care_dx', 'likely_mc_no_dx'],
    summary: 'Memory support programming',
    adjustments: {
      in_home: 200,
      assisted_living: 200,
      memory_care: 300,
    },
    hoursDelta: 1,
  },
  {
    ids: ['high_mobility_dependence'],
    summary: 'Transfers & mobility equipment',
    adjustments: {
      in_home: 250,
      assisted_living: 300,
      memory_care: 200,
    },
    hoursDelta: 2,
  },
  {
    ids: ['medication_management_issue', 'chronic_present'],
    summary: 'Medication management & chronic care',
    adjustments: {
      in_home: 180,
      assisted_living: 150,
    },
    hoursDelta: 1,
  },
];

@Component({
  selector: 'app-cost-planner-quick-estimate',
  templateUrl: './cost-planner-quick-estimate.component.html',
  styleUrls: ['./cost-planner-quick-estimate.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
})
export class CostPlannerQuickEstimateComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  comparisons: CareScenario[] = [];
  homeCarry = 0;
  selectedTier: CareTier = 'in_home';
  careHoursPerDay = BASE_IN_HOME_HOURS;
  careHoursSummary = 'Baseline support';
  private destroy$ = new Subject<void>();
  private careRecommendation: CareRecommendation | null = null;
  private matchedRules: FlagCostRule[] = [];

  estimate: QuickEstimateSummary = {
    careCost: CARE_LEVEL_COSTS.in_home,
    gap: CARE_LEVEL_COSTS.in_home - 4000,
    baseCost: CARE_LEVEL_COSTS.in_home,
    modifierTotal: 0,
    modifierNotes: [],
  };

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private router: Router,
    private mcipService: MCIPService
  ) {
    this.form = this.createForm();
    this.loadCareContext();
  }

  ngOnInit(): void {
    this.form.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value: QuickEstimateValue) => this.updateEstimate(value));

    this.store
      .select(CostPlannerSelectors.selectFormData)
      .pipe(takeUntil(this.destroy$))
      .subscribe((formData) => {
        const expenses = Number(formData?.['current_expenses']) || 0;
        if (this.homeCarry !== expenses) {
          this.homeCarry = expenses;
          this.updateEstimate(this.form.value as QuickEstimateValue);
        }
      });

    // Initial calculations
    this.updateEstimate(this.form.value as QuickEstimateValue);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      monthlyBudget: [4000],
      careLevel: ['in_home' as CareTier],
    });
  }

  private updateEstimate(value: QuickEstimateValue): void {
    const careLevel = value.careLevel || 'in_home';
    const budget = value.monthlyBudget ?? 0;
    const scenarios = this.buildScenarios(budget);
    this.comparisons = scenarios;

    const focus = scenarios.find((scenario) => scenario.tier === careLevel) ?? scenarios[0];
    this.selectedTier = focus.tier;
    const subtotal = focus.baseCost + focus.modifierTotal;

    this.estimate = {
      careCost: subtotal,
      gap: subtotal - budget,
      baseCost: focus.baseCost,
      modifierTotal: focus.modifierTotal,
      modifierNotes: focus.modifierBreakdown.map((entry) => entry.label),
    };
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
  }

  focusScenario(tier: CareTier): void {
    const control = this.form.get('careLevel');
    if (control) {
      control.setValue(tier);
    }
  }

  continueToAssessment(): void {
    const value = this.form.value as QuickEstimateValue;
    const careLevel = value.careLevel || 'in_home';
    const budget = value.monthlyBudget ?? 0;
    const focus = this.comparisons.find((scenario) => scenario.tier === careLevel);
    const baseCost = focus?.baseCost ?? CARE_LEVEL_COSTS[careLevel];
    const modifierTotal = focus?.modifierTotal ?? 0;
    const subtotal = baseCost + modifierTotal;

    this.store.dispatch(
      CostPlannerActions.setQuickEstimate({
        estimate: {
          care_level: careLevel,
          monthly_budget: budget,
          estimated_cost: subtotal,
          gap: subtotal - budget,
          base_cost: baseCost,
          modifier_total: modifierTotal,
          care_hours_per_day: this.careHoursPerDay,
        },
      })
    );

    this.router.navigate(['/cost-planner/triage']);
  }

  private loadCareContext(): void {
    this.careRecommendation = this.mcipService.getCareRecommendation();
    this.recomputeFlagEffects();
  }

  private recomputeFlagEffects(): void {
    const flagIds = new Set(
      (this.careRecommendation?.flags || []).map((flag) => (flag.id || '').toLowerCase())
    );
    this.matchedRules = CARE_FLAG_RULES.filter((rule) =>
      rule.ids.some((id) => flagIds.has(id))
    );
    this.careHoursPerDay = this.calculateCareHours();
    const highlights = this.matchedRules.map((rule) => rule.summary);
    this.careHoursSummary = highlights.length
      ? `Based on ${highlights.join(', ')}`
      : 'Baseline support';
  }

  private calculateCareHours(): number {
    const extra = this.matchedRules.reduce((sum, rule) => sum + (rule.hoursDelta ?? 0), 0);
    const total = BASE_IN_HOME_HOURS + extra;
    return Math.max(2, Math.min(24, Math.round(total)));
  }

  private buildScenarios(budget: number): CareScenario[] {
    return COMPARISON_LEVELS.map((level) => this.calculateScenario(level, budget));
  }

  private calculateScenario(
    level: { tier: CareTier; label: string },
    budget: number
  ): CareScenario {
    const baseCost = CARE_LEVEL_COSTS[level.tier] ?? CARE_LEVEL_COSTS.in_home;
    const { modifierTotal, breakdown } = this.calculateModifiersForTier(level.tier);
    const householdCost = level.tier === 'in_home' ? this.homeCarry : 0;
    const totalCost = baseCost + modifierTotal + householdCost;

    return {
      tier: level.tier,
      label: level.label,
      baseCost,
      modifierTotal,
      totalCost,
      householdCost,
      includesHome: householdCost > 0,
      gap: totalCost - budget,
      modifierBreakdown: breakdown,
    };
  }

  private calculateModifiersForTier(tier: CareTier): {
    modifierTotal: number;
    breakdown: Array<{ label: string; amount: number }>;
  } {
    const breakdown: Array<{ label: string; amount: number }> = [];
    let modifierTotal = 0;

    this.matchedRules.forEach((rule) => {
      const amount = rule.adjustments[tier];
      if (!amount) {
        return;
      }
      modifierTotal += amount;
      breakdown.push({ label: rule.summary, amount });
    });

    return { modifierTotal, breakdown };
  }
}
