/**
 * Contract Interfaces for Senior Navigator v4
 * 
 * These interfaces define the data contracts between products.
 * They match the v3 Python dataclasses and ensure type safety.
 */

/**
 * Care Recommendation Contract
 * Output from GCP → Input to Cost Planner
 */
export interface CareRecommendation {
  // Core recommendation
  recommendation: CareLevel;
  confidence: number; // 0.0 - 1.0
  
  // Supporting data
  raw_scores: {
    safety_risk: number;
    adl_dependency: number;
    cognitive_impairment: number;
    social_isolation: number;
  };
  
  // Risk flags
  flags: string[];
  
  // User inputs (for context)
  user_inputs: Record<string, any>;
  
  // Metadata
  assessment_id: string;
  timestamp: string;
  version: string;
}

export type CareLevel = 
  | 'independent_living'
  | 'assisted_living'
  | 'memory_care'
  | 'memory_care_high_acuity'
  | 'skilled_nursing';

/**
 * Financial Profile Contract
 * Output from Cost Planner → Input to PFMA
 */
export interface FinancialProfile {
  // Income
  monthly_income: number;
  income_sources: IncomeSource[];
  
  // Assets
  total_liquid_assets: number;
  total_real_estate: number;
  asset_details: AssetDetail[];
  
  // Expenses
  estimated_monthly_care_cost: number;
  current_monthly_expenses: number;
  
  // Geography
  zip_code: string;
  region: string;
  
  // Care context (from GCP)
  care_level: CareLevel;
  care_recipient_name: string;
  
  // Metadata
  profile_id: string;
  timestamp: string;
}

export interface IncomeSource {
  type: 'social_security' | 'pension' | 'investment' | 'other';
  amount: number;
  frequency: 'monthly' | 'annual';
}

export interface AssetDetail {
  type: 'savings' | 'investment' | 'real_estate' | 'other';
  value: number;
  liquid: boolean;
}

/**
 * PFMA Outcome Contract
 * Output from PFMA → Final product
 */
export interface PFMAOutcome {
  // Affordability assessment
  affordability_score: number; // 0.0 - 1.0
  monthly_shortfall: number; // Negative = surplus
  months_of_coverage: number;
  
  // Recommendations
  recommended_actions: string[];
  assistance_programs: AssistanceProgram[];
  
  // Financial strategy
  spend_down_plan?: SpendDownPlan;
  
  // Metadata
  outcome_id: string;
  timestamp: string;
}

export interface AssistanceProgram {
  name: string;
  description: string;
  estimated_benefit: number;
  eligibility_likelihood: 'high' | 'medium' | 'low';
  application_url?: string;
}

export interface SpendDownPlan {
  months_until_medicaid: number;
  assets_to_spend: number;
  monthly_burn_rate: number;
  recommendations: string[];
}

/**
 * Product Completion Status
 * Tracked by MCIP Service
 */
export interface ProductStatus {
  product_id: string;
  completed: boolean;
  completion_timestamp?: string;
  output_contract?: any; // The specific contract for this product
}

/**
 * MCIP State
 * Central state tracking all product completions and contracts
 */
export interface MCIPState {
  products: {
    gcp: ProductStatus;
    cost_planner: ProductStatus;
    pfma: ProductStatus;
  };
  current_product?: string;
  session_id: string;
}

/**
 * User Context
 * Information about the care recipient (replaces Streamlit session_state)
 */
export interface UserContext {
  // Care recipient
  care_recipient_name: string;
  care_recipient_relationship?: string;
  
  // User (advisor/family member)
  user_id?: string;
  user_name?: string;
  
  // Session
  session_id: string;
  started_at: string;
  last_active: string;
}
