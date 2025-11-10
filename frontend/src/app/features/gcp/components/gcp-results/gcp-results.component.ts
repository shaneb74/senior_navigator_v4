import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CareFlag, CareRecommendation, CareTier, TierRanking, DeterministicResult, LLMResult } from '../../../../shared/models/contracts';
import * as GCPSelectors from '../../store/gcp.selectors';

@Component({
  selector: 'app-gcp-results',
  templateUrl: './gcp-results.component.html',
  styleUrls: ['./gcp-results.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class GcpResultsComponent implements OnInit {
  recommendation$: Observable<CareRecommendation | null>;

  constructor(private store: Store) {
    this.recommendation$ = this.store.select(GCPSelectors.selectRecommendation);
  }

  ngOnInit(): void {}

  getCareTypeLabel(tier: CareTier | string | null | undefined): string {
    const labels: Record<string, string> = {
      none: 'No Care Needed',
      in_home: 'In-Home Care',
      assisted_living: 'Assisted Living',
      memory_care: 'Memory Care',
      memory_care_high_acuity: 'Memory Care (High Acuity)',
    };
    if (!tier) {
      return 'Guided Plan';
    }
    return labels[tier] || this.toTitleCase(tier);
  }

  getConfidenceLabel(confidence: number): string {
    if (confidence >= 0.8) return 'High Confidence';
    if (confidence >= 0.6) return 'Moderate Confidence';
    return 'Lower Confidence';
  }

  trackTier = (_: number, item: { tier: CareTier }) => item?.tier;

  getFlagToneClass(flag: CareFlag): string {
    const tone = flag.tone ?? 'info';
    return `flag-card flag-${tone}`;
  }

  resolveTier(rec: CareRecommendation | null | undefined): CareTier | string | null {
    if (!rec) {
      return null;
    }
    return rec.tier ?? rec.recommendation ?? null;
  }

  getTierScore(rec: CareRecommendation | null | undefined): number | null {
    if (!rec) return null;
    const rawScores = (rec as any).raw_scores;
    return rec.tier_score ?? rawScores?.total_score ?? null;
  }

  getAllowedTiers(rec: CareRecommendation | null | undefined): CareTier[] {
    if (!rec) return [];
    return Array.isArray(rec.allowed_tiers) ? rec.allowed_tiers : [];
  }

  getTierRankings(rec: CareRecommendation | null | undefined): TierRanking[] {
    if (!rec) return [];
    return Array.isArray(rec.tier_rankings) ? rec.tier_rankings : [];
  }

  normalizeFlags(flags: CareRecommendation['flags'] | undefined): CareFlag[] {
    if (!flags) return [];
    if (Array.isArray(flags) && flags.length > 0 && typeof flags[0] === 'string') {
      return (flags as any).map((id: string) => ({
        id,
        label: this.toTitleCase(id),
        description: '',
        tone: 'info' as const,
        priority: 99,
      }));
    }
    return flags;
  }

  getConfidencePercent(rec: CareRecommendation | null | undefined): number {
    if (!rec) return 0;
    return Math.round((rec.confidence ?? 0) * 100);
  }

  getDeterministicResult(rec: CareRecommendation | null | undefined): DeterministicResult | null {
    if (!rec) return null;
    if (rec.deterministic_result) {
      return rec.deterministic_result;
    }
    if (rec.adjudication?.det) {
      return {
        tier: rec.adjudication.det,
        confidence: rec.adjudication.conf ?? rec.confidence ?? 0,
        score: this.getTierScore(rec) ?? 0,
      };
    }
    return null;
  }

  getLlmResult(rec: CareRecommendation | null | undefined): LLMResult | null {
    if (!rec) return null;
    if (rec.llm_result) {
      return rec.llm_result;
    }
    if (rec.llm_advice) {
      return {
        tier: rec.llm_advice.tier,
        confidence: rec.llm_advice.confidence,
        reasons: rec.llm_advice.reasons,
        navi_messages: rec.llm_advice.navi_messages,
      };
    }
    return null;
  }

  getAdjudication(rec: CareRecommendation | null | undefined) {
    return rec?.adjudication ?? null;
  }

  private toTitleCase(value: string): string {
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
