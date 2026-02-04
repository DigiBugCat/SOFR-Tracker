// NY Fed API client for SOFR and EFFR rates

const NY_FED_BASE = 'https://markets.newyorkfed.org';

interface NyFedRateObservation {
  effectiveDate: string;
  percentile1?: string;
  percentile25?: string;
  percentile75?: string;
  percentile99?: string;
  targetRateLow?: string;
  targetRateHigh?: string;
  rateType?: string;
  [key: string]: string | undefined;
}

interface NyFedResponse {
  refRates: NyFedRateObservation[];
}

interface RrpOperationResult {
  operationDate: string;
  totalAmtAccepted?: number;
  totalCounterpartyCount?: number;
  submittedParticipantsByType?: {
    participantType: string;
    totalAmtAccepted?: number;
  }[];
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

function parseRate(value: string | undefined): number | null {
  if (!value || value === '') return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
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
    rate: parseRate(obs.percentile50 || obs.rateType) ?? 0,
    p1: parseRate(obs.percentile1),
    p25: parseRate(obs.percentile25),
    p75: parseRate(obs.percentile75),
    p99: parseRate(obs.percentile99),
    volume_billions: parseRate(obs.tradingVolume)
      ? parseRate(obs.tradingVolume)! / 1_000_000_000
      : null,
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
    rate: parseRate(obs.percentile50 || obs.rateType) ?? 0,
    p1: parseRate(obs.percentile1),
    p25: parseRate(obs.percentile25),
    p75: parseRate(obs.percentile75),
    p99: parseRate(obs.percentile99),
    target_low: parseRate(obs.targetRateLow),
    target_high: parseRate(obs.targetRateHigh),
    volume_billions: parseRate(obs.tradingVolume)
      ? parseRate(obs.tradingVolume)! / 1_000_000_000
      : null,
  }));
}

export async function fetchRrpOperations(startDate: string, endDate: string): Promise<RrpData[]> {
  const url = new URL(`${NY_FED_BASE}/api/rp/reverserepo/all/results/search.json`);
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('endDate', endDate);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`NY Fed RRP API error: ${response.status}`);
  }

  const data = (await response.json()) as RrpResponse;
  const results = data.repoOperations?.results || [];

  return results.map((op) => {
    const participants = op.submittedParticipantsByType || [];
    const mmf = participants.find((p) => p.participantType === 'Money Market Fund');
    const gse = participants.find((p) => p.participantType === 'GSE');

    return {
      date: op.operationDate,
      total_accepted_billions: op.totalAmtAccepted
        ? op.totalAmtAccepted / 1_000_000_000
        : null,
      participating_counterparties: op.totalCounterpartyCount ?? null,
      mmf_accepted_billions: mmf?.totalAmtAccepted
        ? mmf.totalAmtAccepted / 1_000_000_000
        : null,
      gse_accepted_billions: gse?.totalAmtAccepted
        ? gse.totalAmtAccepted / 1_000_000_000
        : null,
    };
  });
}
