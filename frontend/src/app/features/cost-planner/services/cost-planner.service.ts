import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { FinancialProfile } from '../../../shared/models/contracts';

@Injectable({ providedIn: 'root' })
export class CostPlannerService {
  private readonly apiUrl = `${environment.apiBaseUrl}/cost-planner`;

  constructor(private http: HttpClient) {}

  submitProfile(formData: Record<string, any>): Observable<FinancialProfile> {
    return this.http.post<FinancialProfile>(`${this.apiUrl}/submit`, formData);
  }
}
