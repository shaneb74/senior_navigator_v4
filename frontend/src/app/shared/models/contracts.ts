/**
 * Contract Interfaces for Senior Navigator v4
 * 
 * These interfaces define the data contracts between products.
 * They match the v3 Python dataclasses and ensure type safety.
 */

export type CareTier =
  | 'none'
  | 'in_home'
  | 'assisted_living'
  | 'memory_care'
  | 'memory_care_high_acuity';

export interface TierRanking {
  tier: CareTier;
  score: number;
}

export interface CareFlagCTA {
  label: string;
  route: string;
  filter?: string;
}

export interface CareFlag {
  id: string;
  label: string;
  description?: string;
  tone?: 'info' | 'warning' | 'critical';
  priority?: number;
  cta?: CareFlagCTA;
}

export interface AdjudicationDecision {
  det?: CareTier;
  llm?: CareTier | null;
  source?: string;
  adjudication_reason?: string;
  allowed?: CareTier[];
  bands?: { cog?: string; sup?: string };
  risky?: boolean;
  conf?: number;
}

export interface LLMAdvice {
  tier: CareTier;
  reasons?: string[];
  risks?: string[];
  navi_messages?: string[];
  questions_next?: string[];
  confidence: number;
}

export interface DeterministicResult {
  tier: CareTier;
  confidence: number;
  score: number;
}

export interface LLMResult {
  tier: CareTier;
  confidence: number;
  reasons?: string[];
  navi_messages?: string[];
}

/**
 * Care Recommendation Contract
 * Output from GCP → Input to Cost Planner
 */
export interface CareRecommendation {
  tier: CareTier;
  tier_score: number;
  tier_rankings: TierRanking[];
  confidence: number;
  flags: CareFlag[];
  rationale: string[];
  suggested_next_product: string;
  derived?: Record<string, any>;
  allowed_tiers: CareTier[];
  generated_at: string;
  version: string;
  input_snapshot_id: string;
  rule_set: string;
  next_step: {
    product: string;
    label?: string;
    description?: string;
  };
  status: 'new' | 'in_progress' | 'complete' | 'needs_update';
  last_updated: string;
  needs_refresh: boolean;
  schema_version: number;
  assessment_id: string;
  user_inputs: Record<string, any>;
  score_breakdown?: Record<string, number>;
  adjudication?: AdjudicationDecision;
  llm_advice?: LLMAdvice;
  deterministic_result?: DeterministicResult;
  llm_result?: LLMResult;
  timestamp: string;
  
  // Legacy aliases for backward compatibility
  recommendation?: CareTier;
  raw_scores?: {
    total_score: number;
    cognitive_score: number;
    adl_score: number;
    safety_score: number;
    mobility_score?: number;
  };
}

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
  asset_categories?: AssetCategory[];
  total_debt?: number;
  net_assets?: number;
  
  // Expenses
  estimated_monthly_care_cost: number;
  current_monthly_expenses: number;
  
  // Geography
  zip_code: string;
  region: string;
  
  // Care context (from GCP)
  care_level: CareTier;
  care_recipient_name: string;
  
  // Metadata
  profile_id: string;
  timestamp: string;
  monthly_gap?: number;
  monthly_shortfall?: number;
  months_of_coverage?: number;
  has_va_benefit?: boolean;
  va_benefit_amount?: number;
  runway_projection?: Array<{ month: number; balance: number }>;
  coverage_summary?: CoverageSummary;
  insights?: string[];
  va_disability?: VaDisabilityDetails | null;
  aid_and_attendance?: AidAttendanceDetails | null;
}

export interface IncomeSource {
  type: 'social_security' | 'pension' | 'employment' | 'investment' | 'va_benefit' | 'other';
  amount: number;
  frequency: 'monthly' | 'annual';
}

export interface AssetDetail {
  type: 'savings' | 'investment' | 'real_estate' | 'other';
  value: number;
  liquid: boolean;
}

export interface VaDisabilityDetails {
  amount: number;
  rating: number;
  dependents: string;
  source?: string;
}

export interface AidAttendanceDetails {
  amount: number;
  household_status: string;
  eligible: boolean;
  max_benefit: number;
  estimated_amount: number;
  highlight: boolean;
}

export interface AssetCategory {
  key: string;
  label: string;
  value: number;
  accessible_value: number;
  liquid: boolean;
  color?: string;
}

export interface CoverageTimelineSegment {
  label: string;
  months: number;
  color?: string;
}

export interface CoverageSummary {
  monthly_gap: number;
  asset_coverage_months: number;
  total_coverage_months: number;
  coverage_label: string;
  timeline: CoverageTimelineSegment[];
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
