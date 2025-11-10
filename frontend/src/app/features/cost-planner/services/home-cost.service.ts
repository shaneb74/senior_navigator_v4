import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

interface HomeCostLookup {
  exact: Map<string, number>;
  prefix: Map<string, number>;
}

export interface HomeCostResult {
  amount: number;
  source: 'zip' | 'prefix';
  confidence: number;
}

@Injectable({ providedIn: 'root' })
export class HomeCostService {
  private readonly csvPath = 'assets/data/monthly_median_cost.csv';
  private cache$?: Observable<HomeCostLookup | null>;

  constructor(private http: HttpClient) {}

  lookup(zip: string): Observable<HomeCostResult | null> {
    const normalized = this.normalizeZip(zip);
    if (!normalized) {
      return of(null);
    }

    return this.loadData().pipe(
      map((data) => {
        if (!data) {
          return null;
        }

        const exact = data.exact.get(normalized);
        if (typeof exact === 'number') {
          return {
            amount: exact,
            source: 'zip' as const,
            confidence: 1,
          };
        }

        const prefix = data.prefix.get(normalized.slice(0, 3));
        if (typeof prefix === 'number') {
          return {
            amount: prefix,
            source: 'prefix' as const,
            confidence: 0.7,
          };
        }

        return null;
      })
    );
  }

  private loadData(): Observable<HomeCostLookup | null> {
    if (!this.cache$) {
      this.cache$ = this.http
        .get(this.csvPath, { responseType: 'text' })
        .pipe(
          map((text) => this.parseCsv(text)),
          shareReplay(1)
        );
    }
    return this.cache$;
  }

  private parseCsv(text: string): HomeCostLookup | null {
    if (!text) {
      return null;
    }

    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      return null;
    }

    const header = lines[0]
      .replace(/^\uFEFF/, '')
      .split(',')
      .map((h) => h.trim().toLowerCase());

    const zipIndex = header.findIndex((col) =>
      ['zipcode', 'zip', 'postal', 'zip_code', 'postalcode'].includes(col)
    );
    const valueIndex = header.findIndex((col) =>
      ['medianmonthlycost', 'medianmonthly', 'median_monthly_cost', 'medianmonthlycost', 'medianmonthlycost($)', 'medianmonthlycost_usd', 'medianmonthlycostusd', 'medianmonthlycost_value', 'medianmonthlycostvalue', 'medianmonthlycost($usd)'].includes(
        col.replace(/[^a-z]/g, '')
      )
    );

    // Fallback if the headers are simply ZipCode, MedianMonthlyCost
    const resolvedZipIndex = zipIndex >= 0 ? zipIndex : 0;
    const resolvedValueIndex = valueIndex >= 0 ? valueIndex : 1;

    const exact = new Map<string, number>();
    const prefixBuckets = new Map<string, number[]>();

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length <= resolvedValueIndex) {
        continue;
      }

      const rawZip = cols[resolvedZipIndex]?.trim();
      const rawValue = cols[resolvedValueIndex]?.trim();
      const normalizedZip = this.normalizeZip(rawZip);
      if (!normalizedZip) {
        continue;
      }

      const value = Number(rawValue);
      if (!Number.isFinite(value) || value <= 0) {
        continue;
      }

      exact.set(normalizedZip, value);

      const prefix = normalizedZip.slice(0, 3);
      const bucket = prefixBuckets.get(prefix) ?? [];
      bucket.push(value);
      prefixBuckets.set(prefix, bucket);
    }

    const prefix = new Map<string, number>();
    prefixBuckets.forEach((values, key) => {
      if (!values.length) {
        return;
      }
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median =
        sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
      prefix.set(key, median);
    });

    return { exact, prefix };
  }

  private normalizeZip(zip: string | null | undefined): string | null {
    if (!zip) {
      return null;
    }
    const cleaned = zip.toString().trim().replace(/\D/g, '');
    if (cleaned.length < 3) {
      return null;
    }
    return cleaned.padStart(5, '0').slice(0, 5);
  }
}
