// FRED CSV parser for policy rates

const FRED_BASE = 'https://fred.stlouisfed.org/graph/fredgraph.csv';

export interface FredDataPoint {
  date: string;
  value: number | null;
}

export interface PolicyRateData {
  date: string;
  iorb: number | null;
  srf: number | null;
  rrp: number | null;
}

function parseCsv(csv: string): FredDataPoint[] {
  const lines = csv.trim().split('\n');
  // Skip header row
  const dataLines = lines.slice(1);

  return dataLines
    .map((line) => {
      const [date, valueStr] = line.split(',');
      if (!date) return null;

      // FRED uses "." for missing values
      const value = valueStr === '.' || valueStr === '' ? null : parseFloat(valueStr);

      return {
        date: date.trim(),
        value: isNaN(value as number) ? null : value,
      };
    })
    .filter((point): point is FredDataPoint => point !== null);
}

async function fetchFredSeries(
  seriesId: string,
  startDate: string,
  endDate: string
): Promise<FredDataPoint[]> {
  const url = new URL(FRED_BASE);
  url.searchParams.set('id', seriesId);
  url.searchParams.set('cosd', startDate);
  url.searchParams.set('coed', endDate);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`FRED API error for ${seriesId}: ${response.status}`);
  }

  const csv = await response.text();
  return parseCsv(csv);
}

export async function fetchIorb(startDate: string, endDate: string): Promise<FredDataPoint[]> {
  return fetchFredSeries('IORB', startDate, endDate);
}

export async function fetchSrf(startDate: string, endDate: string): Promise<FredDataPoint[]> {
  // Standing Repo Facility rate (overnight)
  return fetchFredSeries('SRFTSYD', startDate, endDate);
}

export async function fetchRrpRate(startDate: string, endDate: string): Promise<FredDataPoint[]> {
  // Overnight Reverse Repo award rate (in percent, e.g. 4.25)
  return fetchFredSeries('RRPONTSYAWARD', startDate, endDate);
}

export async function fetchPolicyRates(
  startDate: string,
  endDate: string
): Promise<PolicyRateData[]> {
  // Fetch all three series in parallel
  const [iorbData, srfData, rrpData] = await Promise.all([
    fetchIorb(startDate, endDate),
    fetchSrf(startDate, endDate),
    fetchRrpRate(startDate, endDate),
  ]);

  // Create a map of dates to values
  const dateMap = new Map<string, PolicyRateData>();

  // Initialize with all unique dates
  const allDates = new Set([
    ...iorbData.map((d) => d.date),
    ...srfData.map((d) => d.date),
    ...rrpData.map((d) => d.date),
  ]);

  for (const date of allDates) {
    dateMap.set(date, { date, iorb: null, srf: null, rrp: null });
  }

  // Fill in values
  for (const point of iorbData) {
    const entry = dateMap.get(point.date);
    if (entry) entry.iorb = point.value;
  }

  for (const point of srfData) {
    const entry = dateMap.get(point.date);
    if (entry) entry.srf = point.value;
  }

  for (const point of rrpData) {
    const entry = dateMap.get(point.date);
    if (entry) entry.rrp = point.value;
  }

  // Return sorted by date
  return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}
