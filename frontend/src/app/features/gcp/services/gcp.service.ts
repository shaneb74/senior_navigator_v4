import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CareRecommendation } from '../../../shared/models/contracts';
import { environment } from '../../../../environments/environment';

/**
 * GCP Service
 * Handles communication with the GCP backend API
 */
@Injectable({
  providedIn: 'root'
})
export class GCPService {
  private readonly apiUrl = `${environment.apiBaseUrl}/gcp`;

  constructor(private http: HttpClient) {}

  /**
   * Submit assessment form data and get care recommendation
   */
  submitAssessment(formData: Record<string, any>): Observable<CareRecommendation> {
    console.log('[GCP Service] Submitting assessment:', formData);
    return this.http.post<CareRecommendation>(`${this.apiUrl}/submit`, formData);
  }

  /**
   * Get available care tiers and their descriptions
   */
  getCareTiers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/tiers`);
  }
}
