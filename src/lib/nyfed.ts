// NY Fed API client for SOFR and EFFR rates

const NY_FED_BASE = 'https://markets.newyorkfed.org';

interface NyFedRateObservation {
  effectiveDate: string;
  type: string;
  percentRate: number;
  percentPercentile1?: number;
  percentPercentile25?: number;
  percentPercentile75?: number;
  percentPercentile99?: number;
  targetRateFrom?: number;
  targetRateTo?: number;
  volumeInBillions?: number;
}

interface NyFedResponse {
  refRates: NyFedRateObservation[];
}

interface RrpOperationResult {
  operationDate: string;
  totalAmtAccepted?: number;
  totalCounterpartyCount?: number;
}

interface RrpResponse {
  repoOperations?: {
    results: RrpOperationResult[];
  };
}

export interface SofrData {
  date: string;
  rate: number;
  p1: number | null;
  p25: number | null;
  p75: number | null;
  p99: number | null;
  volume_billions: number | null;
}

export interface EffrData {
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

export interface RrpData {
  date: string;
  total_accepted_billions: number | null;
  participating_counterparties: number | null;
  mmf_accepted_billions: number | null;
  gse_accepted_billions: number | null;
}

export async function fetchSofr(startDate: string, endDate: string): Promise<SofrData[]> {
  const url = new URL(`${NY_FED_BASE}/api/rates/secured/sofr/search.json`);
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('endDate', endDate);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`NY Fed SOFR API error: ${response.status}`);
  }

  const data = (await response.json()) as NyFedResponse;

  return (data.refRates || []).map((obs) => ({
    date: obs.effectiveDate,
    rate: obs.percentRate ?? 0,
    p1: obs.percentPercentile1 ?? null,
    p25: obs.percentPercentile25 ?? null,
    p75: obs.percentPercentile75 ?? null,
    p99: obs.percentPercentile99 ?? null,
    volume_billions: obs.volumeInBillions ?? null,
  }));
}

export async function fetchEffr(startDate: string, endDate: string): Promise<EffrData[]> {
  const url = new URL(`${NY_FED_BASE}/api/rates/unsecured/effr/search.json`);
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('endDate', endDate);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`NY Fed EFFR API error: ${response.status}`);
  }

  const data = (await response.json()) as NyFedResponse;

  return (data.refRates || []).map((obs) => ({
    date: obs.effectiveDate,
    rate: obs.percentRate ?? 0,
    p1: obs.percentPercentile1 ?? null,
    p25: obs.percentPercentile25 ?? null,
    p75: obs.percentPercentile75 ?? null,
    p99: obs.percentPercentile99 ?? null,
    target_low: obs.targetRateFrom ?? null,
    target_high: obs.targetRateTo ?? null,
    volume_billions: obs.volumeInBillions ?? null,
  }));
}

export async function fetchRrpOperations(startDate: string, endDate: string): Promise<RrpData[]> {
  const url = new URL(`${NY_FED_BASE}/api/rp/reverserepo/propositions/search.json`);
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('endDate', endDate);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`NY Fed RRP API error: ${response.status}`);
  }

  const data = (await response.json()) as RrpResponse;
  const results = data.repoOperations?.results || [];

  return results.map((op) => ({
    date: op.operationDate,
    total_accepted_billions: op.totalAmtAccepted
      ? op.totalAmtAccepted / 1_000_000_000
      : null,
    participating_counterparties: op.totalCounterpartyCount ?? null,
    mmf_accepted_billions: null,
    gse_accepted_billions: null,
  }));
}
