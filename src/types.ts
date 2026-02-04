// Database row types
export interface SofrRate {
  date: string;
  rate: number;
  p1: number | null;
  p25: number | null;
  p75: number | null;
  p99: number | null;
  volume_billions: number | null;
}

export interface EffrRate {
  date: string;
  rate: number;
  p1: number | null;
  p25: number | null;
  p75: number | null;
  p99: number | null;
  target_low: number | null;
  target_high: number | null;
  volume_billions: number | null;
}

export interface PolicyRate {
  date: string;
  iorb: number | null;
  srf: number | null;
  rrp: number | null;
}

export interface RrpOperation {
  date: string;
  total_accepted_billions: number | null;
  participating_counterparties: number | null;
  mmf_accepted_billions: number | null;
  gse_accepted_billions: number | null;
}

// API response types
export interface RatesResponse {
  sofr: SofrRate[];
  effr: EffrRate[];
  policy: PolicyRate[];
}

export interface SpreadData {
  date: string;
  value: number;
}

export interface MarkersResponse {
  quarterEnds: string[];
  taxDeadlines: string[];
}

// Cloudflare bindings
export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
}

// NY Fed API response types
export interface NyFedRateObservation {
  effectiveDate: string;
  percentile1: string;
  percentile25: string;
  percentile75: string;
  percentile99: string;
  targetRateLow?: string;
  targetRateHigh?: string;
  averageRate?: string;
  medianRate?: string;
  volumeWeightedMedian?: string;
  rateType?: string;
}

export interface NyFedRateResponse {
  refRates: NyFedRateObservation[];
}

// FRED CSV parsed row
export interface FredDataPoint {
  date: string;
  value: number | null;
}
