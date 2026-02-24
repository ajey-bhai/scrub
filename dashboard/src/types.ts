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
}

export interface OutreachData {
  outreachCohortDistribution: { cohort: string; customers: number }[];
}
