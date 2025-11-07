import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { 
  MCIPState, 
  ProductStatus, 
  CareRecommendation,
  FinancialProfile,
  PFMAOutcome 
} from '../../shared/models/contracts';

/**
 * MCIP Service - Multi-product Contract & Integration Protocol
 * 
 * Coordinates product completion and data handoff between products.
 * This is the Angular equivalent of core/mcip.py from v3.
 */
@Injectable({
  providedIn: 'root'
})
export class MCIPService {
  private state$ = new BehaviorSubject<MCIPState>(this.getInitialState());

  constructor() {
    // Load state from sessionStorage on init
    this.loadState();
  }

  /**
   * Get current MCIP state as observable
   */
  getState(): Observable<MCIPState> {
    return this.state$.asObservable();
  }

  /**
   * Get current state value (synchronous)
   */
  getCurrentState(): MCIPState {
    return this.state$.value;
  }

  /**
   * Mark a product as complete and store its output contract
   */
  markProductComplete(
    productId: 'gcp' | 'cost_planner' | 'pfma',
    outputContract: CareRecommendation | FinancialProfile | PFMAOutcome
  ): void {
    const currentState = this.getCurrentState();
    
    const updatedState: MCIPState = {
      ...currentState,
      products: {
        ...currentState.products,
        [productId]: {
          product_id: productId,
          completed: true,
          completion_timestamp: new Date().toISOString(),
          output_contract: outputContract,
        },
      },
    };

    this.setState(updatedState);
    this.saveState();
  }

  /**
   * Check if a product is complete
   */
  isProductComplete(productId: 'gcp' | 'cost_planner' | 'pfma'): boolean {
    return this.getCurrentState().products[productId]?.completed || false;
  }

  /**
   * Get a product's output contract
   */
  getProductContract<T = any>(productId: 'gcp' | 'cost_planner' | 'pfma'): T | null {
    const product = this.getCurrentState().products[productId];
    return product?.output_contract || null;
  }

  /**
   * Get GCP output (Care Recommendation)
   */
  getCareRecommendation(): CareRecommendation | null {
    return this.getProductContract<CareRecommendation>('gcp');
  }

  /**
   * Get Cost Planner output (Financial Profile)
   */
  getFinancialProfile(): FinancialProfile | null {
    return this.getProductContract<FinancialProfile>('cost_planner');
  }

  /**
   * Get PFMA output
   */
  getPFMAOutcome(): PFMAOutcome | null {
    return this.getProductContract<PFMAOutcome>('pfma');
  }

  /**
   * Set current active product
   */
  setCurrentProduct(productId: string): void {
    const currentState = this.getCurrentState();
    this.setState({
      ...currentState,
      current_product: productId,
    });
    this.saveState();
  }

  /**
   * Get current active product
   */
  getCurrentProduct(): string | undefined {
    return this.getCurrentState().current_product;
  }

  /**
   * Reset all product completions (for new session)
   */
  reset(): void {
    this.setState(this.getInitialState());
    this.saveState();
  }

  /**
   * Check if user can access a product (based on prerequisites)
   */
  canAccessProduct(productId: string): boolean {
    switch (productId) {
      case 'gcp':
        // GCP is always accessible
        return true;

      case 'cost_planner':
        // Cost Planner requires GCP completion
        return this.isProductComplete('gcp');

      case 'pfma':
        // PFMA requires Cost Planner completion
        return this.isProductComplete('cost_planner');

      default:
        return false;
    }
  }

  /**
   * Get next recommended product
   */
  getNextProduct(): string | null {
    if (!this.isProductComplete('gcp')) {
      return 'gcp';
    }
    if (!this.isProductComplete('cost_planner')) {
      return 'cost_planner';
    }
    if (!this.isProductComplete('pfma')) {
      return 'pfma';
    }
    return null; // All complete
  }

  /**
   * Get completion percentage (0-100)
   */
  getCompletionPercentage(): number {
    const products = this.getCurrentState().products;
    const completed = Object.values(products).filter(p => p.completed).length;
    const total = Object.keys(products).length;
    return Math.round((completed / total) * 100);
  }

  // Private methods

  private getInitialState(): MCIPState {
    return {
      products: {
        gcp: {
          product_id: 'gcp',
          completed: false,
        },
        cost_planner: {
          product_id: 'cost_planner',
          completed: false,
        },
        pfma: {
          product_id: 'pfma',
          completed: false,
        },
      },
      session_id: this.generateSessionId(),
    };
  }

  private setState(state: MCIPState): void {
    this.state$.next(state);
  }

  private saveState(): void {
    sessionStorage.setItem('mcip_state', JSON.stringify(this.getCurrentState()));
  }

  private loadState(): void {
    const saved = sessionStorage.getItem('mcip_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.setState(parsed);
      } catch (e) {
        console.error('Failed to load MCIP state:', e);
      }
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
