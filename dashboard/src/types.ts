export interface OverviewData {
  totalCustomers: number;
  avgTradelinesPerCustomer: number;
  serviceableBase: number;
  plPenetrationRate: number;
  goldenWindowCurveA: number;
  goldenWindowCurveB: number;
  customersInGoldenWindowNow: number;
  bureauDate: string;
}

export interface DataQualityRow {
  metric: string;
  value: number | string;
  status: string;
}

export interface DataQualityData {
  totalCustomers: number;
  avgTradelinesPerCustomer: number;
  anchorSummary: {
    confirmed: number;
    inferred: number;
    none: number;
    ambiguous: number;
  };
  month0PctOnDemandCurve: number;
  preExistingPLPct: number;
  bureauFreshnessDays: number;
  bureauFreshPctUnder90Days: number;
  repaymentBucketConsistency: {
    pass: boolean;
    bucketDHighQualityPct: number;
  };
  month36Spike: {
    month35: number;
    month36: number;
    month37: number;
  };
  table: DataQualityRow[];
}

export interface PopulationData {
  bucketDistribution: { bucket: string; customers: number; pct: number }[];
  lenderTypeDistribution: { lenderType: string; customers: number }[];
  productMix: { mix: string; customers: number }[];
  acctTypeDistribution: { acctType: string; tradelines: number }[];
}

export interface BehaviourData {
  timeToNextPLCurveA: { months: number; count: number }[];
  timeToNextPLCurveB: { months: number; count: number }[];
  repaymentQualityDistribution: { bucket: string; customers: number }[];
  creditVelocity: { segment: string; customers: number }[];
}

export interface RiskData {
  riskTierDistribution: { tier: string; customers: number }[];
  affordabilityDistribution: { tier: string; customers: number }[];
}

export interface TimingData {
  timingFlagDistribution: { flag: string; customers: number }[];
  monthsSinceCarLoan: { months: number; customers: number }[];
  seasonalIndex: { month: number; monthName: string; index: number }[];
}

export interface MonetisationData {
  tamWaterfall: { stage: string; value: number; type: string }[];
  samSegments?: {
    plEligible: number;
    lacEligible: number;
    deferred: number;
    excluded: number;
  };
  revenueModel?: {
    pl: {
      avgTicketInr: number;
      avgTenorMonths: number;
      yieldPct: number;
      creditCostPct: number;
      netMarginPct: number;
      prepaymentAdj: number;
      disbursalsCount: number;
      aumYear1Inr: number;
      revenueYear1Inr: number;
    };
    lac: {
      avgTicketInr: number;
      avgTenorMonths: number;
      yieldPct: number;
      creditCostPct: number;
      netMarginPct: number;
      prepaymentAdj: number;
      disbursalsCount: number;
      aumYear1Inr: number;
      revenueYear1Inr: number;
    };
    totalAumYear1Inr: number;
    totalNetRevenueYear1Inr: number;
  };
  aumProjection?: { month: number; aumInr: number; label: string }[];
}

export interface OutreachData {
  outreachCohortDistribution: { cohort: string; customers: number }[];
}
