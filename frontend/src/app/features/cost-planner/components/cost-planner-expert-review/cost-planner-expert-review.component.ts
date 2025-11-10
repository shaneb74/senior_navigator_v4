import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';

import * as CostPlannerSelectors from '../../store/cost-planner.selectors';
import { FinancialProfile } from '../../../../shared/models/contracts';
import { QuickEstimate } from '../../store/cost-planner.reducer';

@Component({
  selector: 'app-cost-planner-expert-review',
  templateUrl: './cost-planner-expert-review.component.html',
  styleUrls: ['./cost-planner-expert-review.component.scss'],
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, RouterModule],
})
export class CostPlannerExpertReviewComponent {
  profile$: Observable<FinancialProfile | null>;
  quickEstimate$: Observable<QuickEstimate | null>;

  constructor(private store: Store) {
    this.profile$ = this.store.select(CostPlannerSelectors.selectFinancialProfile);
    this.quickEstimate$ = this.store.select(CostPlannerSelectors.selectQuickEstimate);
  }

  formatCurrency(value?: number): string {
    if (value === undefined || value === null) {
      return '$0';
    }
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  }

  runwayLabel(profile: FinancialProfile): string {
    const runway = profile.months_of_coverage ?? 0;
    if (runway >= 120) return 'More than 10 years of coverage';
    if (runway >= 60) return '5+ years of coverage';
    if (runway >= 24) return '2+ years of coverage';
    return `${runway} months of coverage`;
  }

  getRecommendations(profile: FinancialProfile): string[] {
    if (profile.insights && profile.insights.length) {
      return profile.insights;
    }
    const tips: string[] = [];
    if ((profile.monthly_shortfall || 0) > 0) {
      tips.push('Monthly shortfall suggests planning for supplemental income or asset drawdown.');
    }
    if ((profile.total_liquid_assets || 0) < 100000) {
      tips.push('Limited liquid savings—evaluate downsizing, benefits, or insurance options.');
    }
    if (profile.has_va_benefit && (profile.va_benefit_amount || 0) === 0) {
      tips.push('Eligible for VA benefits—consider applying for Aid & Attendance.');
    }
    if (tips.length === 0) {
      tips.push('Finances look strong relative to projected care costs.');
    }
    return tips;
  }

  hasCoverageSummary(profile: FinancialProfile): boolean {
    return Boolean(profile.coverage_summary && profile.coverage_summary.timeline?.length);
  }

  formatMonths(months: number): string {
    if (months >= 999) {
      return 'Indefinite';
    }
    const years = Math.floor(months / 12);
    const remainder = months % 12;
    if (years > 0) {
      return remainder > 0 ? `${years} yr ${remainder} mo` : `${years} yr`;
    }
    return `${months} mo`;
  }
}
