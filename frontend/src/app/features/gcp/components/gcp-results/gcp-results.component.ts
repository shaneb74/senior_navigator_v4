import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { CareRecommendation } from '../../../../shared/models/contracts';
import * as GCPSelectors from '../../store/gcp.selectors';

@Component({
  selector: 'app-gcp-results',
  templateUrl: './gcp-results.component.html',
  styleUrls: ['./gcp-results.component.scss'],
  standalone: false
})
export class GcpResultsComponent implements OnInit {
  recommendation$: Observable<CareRecommendation | null>;

  constructor(private store: Store) {
    this.recommendation$ = this.store.select(GCPSelectors.selectRecommendation);
  }

  ngOnInit(): void {}

  getCareTypeLabel(recommendation: string): string {
    const labels: Record<string, string> = {
      'independent_living': 'Independent Living',
      'assisted_living': 'Assisted Living',
      'memory_care': 'Memory Care',
      'memory_care_high_acuity': 'Memory Care (High Acuity)',
      'skilled_nursing': 'Skilled Nursing',
    };
    return labels[recommendation] || recommendation;
  }

  getConfidenceLabel(confidence: number): string {
    if (confidence >= 0.8) return 'High Confidence';
    if (confidence >= 0.6) return 'Moderate Confidence';
    return 'Lower Confidence';
  }
}
