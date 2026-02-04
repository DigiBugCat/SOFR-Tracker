// Static assets embedded in worker

export const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SOFR Tracker</title>
  <link rel="stylesheet" href="/styles.css">
  <script src="https://unpkg.com/lightweight-charts@4.1.0/dist/lightweight-charts.standalone.production.js"></script>
</head>
<body>
  <div class="container">
    <header>
      <h1>SOFR Tracker</h1>
      <div class="controls">
        <div class="date-range">
          <label>
            Range:
            <select id="rangeSelect">
              <option value="1M">1 Month</option>
              <option value="3M" selected>3 Months</option>
              <option value="6M">6 Months</option>
              <option value="1Y">1 Year</option>
              <option value="2Y">2 Years</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <div id="customDates" class="hidden">
            <input type="date" id="startDate">
            <span>to</span>
            <input type="date" id="endDate">
            <button id="applyDates">Apply</button>
          </div>
        </div>
        <div class="status" id="status">Loading...</div>
      </div>
    </header>

    <nav class="tabs">
      <button class="tab active" data-view="corridor">Rate Corridor</button>
      <button class="tab" data-view="sofr-percentile">SOFR Percentile Spread</button>
      <button class="tab" data-view="sofr-bands">SOFR Percentile Bands</button>
      <button class="tab" data-view="sofr-rrp">SOFR-RRP Spread</button>
      <button class="tab" data-view="effr-rrp">EFFR-RRP Spread</button>
      <button class="tab" data-view="rrp-volume">RRP Volume</button>
      <button class="tab" data-view="sofr-volume">SOFR Volume</button>
    </nav>

    <main>
      <div id="chartContainer">
        <div id="chart"></div>
        <div id="legend"></div>
      </div>
      <div id="tooltip" class="tooltip hidden"></div>
    </main>

    <footer>
      <div class="sources">
        Data: <a href="https://www.newyorkfed.org/markets/reference-rates" target="_blank">NY Fed</a> |
        <a href="https://fred.stlouisfed.org/" target="_blank">FRED</a>
      </div>
      <div class="markers-legend">
        <span class="marker quarter-end"></span> Quarter End
        <span class="marker tax-deadline"></span> Tax Deadline
      </div>
    </footer>
  </div>

  <script src="/charts.js"></script>
</body>
</html>`;

export const CSS = `/* SOFR Tracker - TradingView-inspired Dark Theme */

:root {
  --bg-primary: #131722;
  --bg-secondary: #1e222d;
  --bg-tertiary: #2a2e39;
  --text-primary: #d1d4dc;
  --text-secondary: #787b86;
  --text-muted: #4c4e53;
  --accent-blue: #2962ff;
  --accent-green: #26a69a;
  --accent-red: #ef5350;
  --accent-orange: #ff9800;
  --accent-purple: #7c4dff;
  --accent-yellow: #ffeb3b;
  --border-color: #363a45;
  --sofr-color: #2962ff;
  --effr-color: #26a69a;
  --iorb-color: #ff9800;
  --srf-color: #ef5350;
  --rrp-color: #7c4dff;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 16px;
}

h1 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.controls {
  display: flex;
  align-items: center;
  gap: 20px;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 12px;
}

.date-range label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 13px;
}

select, input[type="date"] {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 13px;
}

select:focus, input[type="date"]:focus {
  outline: none;
  border-color: var(--accent-blue);
}

#customDates {
  display: flex;
  align-items: center;
  gap: 8px;
}

#customDates span {
  color: var(--text-secondary);
}

#customDates.hidden {
  display: none;
}

button {
  background: var(--accent-blue);
  border: none;
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover {
  background: #1e4bd8;
}

.status {
  color: var(--text-secondary);
  font-size: 12px;
}

.tabs {
  display: flex;
  gap: 4px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 16px;
  overflow-x: auto;
}

.tab {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  border-radius: 4px;
  white-space: nowrap;
  transition: all 0.2s;
}

.tab:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.tab.active {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

main {
  position: relative;
}

#chartContainer {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
  min-height: 500px;
}

#chart {
  width: 100%;
  height: 480px;
}

#legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
  margin-top: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.legend-color {
  width: 12px;
  height: 3px;
  border-radius: 1px;
}

.tooltip {
  position: absolute;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 12px;
  pointer-events: none;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.tooltip.hidden {
  display: none;
}

footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  margin-top: 16px;
  border-top: 1px solid var(--border-color);
  font-size: 12px;
  color: var(--text-secondary);
}

footer a {
  color: var(--accent-blue);
  text-decoration: none;
}

footer a:hover {
  text-decoration: underline;
}

.markers-legend {
  display: flex;
  align-items: center;
  gap: 16px;
}

.marker {
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-right: 4px;
  vertical-align: middle;
}

.marker.quarter-end {
  background: rgba(255, 152, 0, 0.3);
  border-left: 2px solid var(--accent-orange);
}

.marker.tax-deadline {
  background: rgba(239, 83, 80, 0.3);
  border-left: 2px solid var(--accent-red);
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 480px;
  color: var(--text-secondary);
}

.loading::after {
  content: '';
  width: 24px;
  height: 24px;
  margin-left: 12px;
  border: 2px solid var(--border-color);
  border-top-color: var(--accent-blue);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .controls {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
  }

  .tabs {
    flex-wrap: nowrap;
    -webkit-overflow-scrolling: touch;
  }

  #chart {
    height: 350px;
  }

  footer {
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }
}`;

export const JS = `// SOFR Tracker Charts
const API_BASE = '';

const COLORS = {
  sofr: '#2962ff',
  effr: '#26a69a',
  iorb: '#ff9800',
  srf: '#ef5350',
  rrp: '#7c4dff',
  spread: '#26a69a',
  volume: '#2962ff',
  p1: 'rgba(41, 98, 255, 0.2)',
  p25: 'rgba(41, 98, 255, 0.4)',
  p75: 'rgba(41, 98, 255, 0.4)',
  p99: 'rgba(41, 98, 255, 0.2)',
};

let chart = null;
let series = [];
let currentView = 'corridor';
let cachedData = null;
let markers = null;
let dateRange = { start: null, end: null };

const VALID_VIEWS = ['corridor', 'sofr-percentile', 'sofr-bands', 'sofr-rrp', 'effr-rrp', 'rrp-volume', 'sofr-volume'];

function getViewFromPath() {
  var path = window.location.pathname.replace(/^\\//, '');
  return VALID_VIEWS.indexOf(path) !== -1 ? path : 'corridor';
}

function setActiveTab(view) {
  document.querySelectorAll('.tab').forEach(function(t) {
    if (t.dataset.view === view) {
      t.classList.add('active');
    } else {
      t.classList.remove('active');
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  currentView = getViewFromPath();
  setActiveTab(currentView);
  initDateRange();
  initTabs();
  await loadData();
  renderChart();
});

window.addEventListener('popstate', function() {
  currentView = getViewFromPath();
  setActiveTab(currentView);
  renderChart();
});

function initDateRange() {
  const rangeSelect = document.getElementById('rangeSelect');
  const customDates = document.getElementById('customDates');
  const startInput = document.getElementById('startDate');
  const endInput = document.getElementById('endDate');
  const applyBtn = document.getElementById('applyDates');

  setDateRange('3M');

  rangeSelect.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
      customDates.classList.remove('hidden');
      startInput.value = dateRange.start;
      endInput.value = dateRange.end;
    } else {
      customDates.classList.add('hidden');
      setDateRange(e.target.value);
      loadData().then(renderChart);
    }
  });

  applyBtn.addEventListener('click', () => {
    dateRange.start = startInput.value;
    dateRange.end = endInput.value;
    loadData().then(renderChart);
  });
}

function setDateRange(range) {
  const end = new Date();
  const start = new Date();

  switch (range) {
    case '1M': start.setMonth(start.getMonth() - 1); break;
    case '3M': start.setMonth(start.getMonth() - 3); break;
    case '6M': start.setMonth(start.getMonth() - 6); break;
    case '1Y': start.setFullYear(start.getFullYear() - 1); break;
    case '2Y': start.setFullYear(start.getFullYear() - 2); break;
  }

  dateRange.start = start.toISOString().split('T')[0];
  dateRange.end = end.toISOString().split('T')[0];
}

function initTabs() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      currentView = tab.dataset.view;
      var newPath = currentView === 'corridor' ? '/' : '/' + currentView;
      history.pushState({ view: currentView }, '', newPath);
      setActiveTab(currentView);
      renderChart();
    });
  });
}

async function loadData() {
  const status = document.getElementById('status');
  status.textContent = 'Loading...';

  try {
    const [ratesRes, markersRes] = await Promise.all([
      fetch(API_BASE + '/api/rates?start=' + dateRange.start + '&end=' + dateRange.end),
      fetch(API_BASE + '/api/markers'),
    ]);

    if (!ratesRes.ok || !markersRes.ok) throw new Error('Failed to fetch data');

    cachedData = await ratesRes.json();
    markers = await markersRes.json();
    status.textContent = (cachedData.sofr?.length || 0) + ' days loaded';
  } catch (err) {
    console.error('Error loading data:', err);
    status.textContent = 'Error loading data';
  }
}

function renderChart() {
  const container = document.getElementById('chart');
  const legendContainer = document.getElementById('legend');

  container.innerHTML = '';
  legendContainer.innerHTML = '';
  series = [];

  if (!cachedData) {
    container.innerHTML = '<div class="loading">Loading data</div>';
    return;
  }

  chart = LightweightCharts.createChart(container, {
    width: container.clientWidth,
    height: 480,
    layout: {
      background: { type: 'solid', color: '#1e222d' },
      textColor: '#d1d4dc',
    },
    grid: {
      vertLines: { color: '#2a2e39' },
      horzLines: { color: '#2a2e39' },
    },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    rightPriceScale: { borderColor: '#363a45' },
    timeScale: { borderColor: '#363a45', timeVisible: false },
  });

  var viewPromise;
  switch (currentView) {
    case 'corridor': renderCorridorChart(); break;
    case 'sofr-percentile': viewPromise = renderSpreadChart('sofr-percentile', 'SOFR 1st-99th Percentile Spread'); break;
    case 'sofr-bands': renderBandsChart(); break;
    case 'sofr-rrp': viewPromise = renderSpreadChart('sofr-rrp', 'SOFR - RRP Spread'); break;
    case 'effr-rrp': viewPromise = renderSpreadChart('effr-rrp', 'EFFR - RRP Spread'); break;
    case 'rrp-volume': viewPromise = renderVolumeChart('rrp'); break;
    case 'sofr-volume': viewPromise = renderVolumeChart('sofr'); break;
  }

  if (viewPromise) {
    viewPromise.then(function() { chart.timeScale().fitContent(); });
  }

  window.addEventListener('resize', () => {
    chart.applyOptions({ width: container.clientWidth });
  });

  chart.timeScale().fitContent();
}

function renderCorridorChart() {
  const { sofr, effr, policy } = cachedData;

  const sofrSeries = chart.addLineSeries({ color: COLORS.sofr, lineWidth: 2, title: 'SOFR' });
  sofrSeries.setData(sofr.map((d) => ({ time: d.date, value: d.rate })));
  series.push({ name: 'SOFR', color: COLORS.sofr });

  const effrSeries = chart.addLineSeries({ color: COLORS.effr, lineWidth: 2, title: 'EFFR' });
  effrSeries.setData(effr.map((d) => ({ time: d.date, value: d.rate })));
  series.push({ name: 'EFFR', color: COLORS.effr });

  const iorbSeries = chart.addLineSeries({ color: COLORS.iorb, lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dashed, title: 'IORB' });
  iorbSeries.setData(policy.filter((d) => d.iorb !== null).map((d) => ({ time: d.date, value: d.iorb })));
  series.push({ name: 'IORB', color: COLORS.iorb });

  const srfSeries = chart.addLineSeries({ color: COLORS.srf, lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dotted, title: 'SRF (Ceiling)' });
  srfSeries.setData(policy.filter((d) => d.srf !== null).map((d) => ({ time: d.date, value: d.srf })));
  series.push({ name: 'SRF (Ceiling)', color: COLORS.srf });

  const rrpSeries = chart.addLineSeries({ color: COLORS.rrp, lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dotted, title: 'RRP (Floor)' });
  rrpSeries.setData(policy.filter((d) => d.rrp !== null).map((d) => ({ time: d.date, value: d.rrp })));
  series.push({ name: 'RRP (Floor)', color: COLORS.rrp });

  addEventMarkers(sofrSeries, sofr.map((d) => d.date));
  renderLegend();
}

async function renderSpreadChart(type, title) {
  try {
    const res = await fetch(API_BASE + '/api/spreads?type=' + type + '&start=' + dateRange.start + '&end=' + dateRange.end);
    const data = await res.json();

    const spreadSeries = chart.addLineSeries({ color: COLORS.spread, lineWidth: 2, title: title });
    spreadSeries.setData(data.map((d) => ({ time: d.date, value: d.value })));
    series.push({ name: title, color: COLORS.spread });

    const zeroLine = chart.addLineSeries({ color: '#787b86', lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false });
    if (data.length > 0) {
      zeroLine.setData([{ time: data[0].date, value: 0 }, { time: data[data.length - 1].date, value: 0 }]);
    }

    addEventMarkers(spreadSeries, data.map((d) => d.date));
    renderLegend();
  } catch (err) {
    console.error('Error loading spread data:', err);
  }
}

function renderBandsChart() {
  const { sofr } = cachedData;

  const p99Series = chart.addAreaSeries({ topColor: COLORS.p99, bottomColor: 'transparent', lineColor: 'transparent', lineWidth: 0 });
  p99Series.setData(sofr.filter((d) => d.p99 !== null).map((d) => ({ time: d.date, value: d.p99 })));

  const p1Series = chart.addAreaSeries({ topColor: 'transparent', bottomColor: COLORS.p1, lineColor: 'transparent', lineWidth: 0, invertFilledArea: true });
  p1Series.setData(sofr.filter((d) => d.p1 !== null).map((d) => ({ time: d.date, value: d.p1 })));

  const p75Series = chart.addAreaSeries({ topColor: COLORS.p75, bottomColor: 'transparent', lineColor: 'transparent', lineWidth: 0 });
  p75Series.setData(sofr.filter((d) => d.p75 !== null).map((d) => ({ time: d.date, value: d.p75 })));

  const p25Series = chart.addAreaSeries({ topColor: 'transparent', bottomColor: COLORS.p25, lineColor: 'transparent', lineWidth: 0, invertFilledArea: true });
  p25Series.setData(sofr.filter((d) => d.p25 !== null).map((d) => ({ time: d.date, value: d.p25 })));

  const medianSeries = chart.addLineSeries({ color: COLORS.sofr, lineWidth: 2, title: 'SOFR' });
  medianSeries.setData(sofr.map((d) => ({ time: d.date, value: d.rate })));

  series.push({ name: 'SOFR (Median)', color: COLORS.sofr }, { name: 'P25-P75', color: 'rgba(41, 98, 255, 0.4)' }, { name: 'P1-P99', color: 'rgba(41, 98, 255, 0.2)' });
  addEventMarkers(medianSeries, sofr.map((d) => d.date));
  renderLegend();
}

async function renderVolumeChart(type) {
  let data, title, color;

  if (type === 'rrp') {
    const res = await fetch(API_BASE + '/api/rrp?start=' + dateRange.start + '&end=' + dateRange.end);
    const rrpData = await res.json();
    data = rrpData.filter((d) => d.total_accepted_billions !== null).map((d) => ({ time: d.date, value: d.total_accepted_billions }));
    title = 'RRP Volume ($B)';
    color = COLORS.rrp;
  } else {
    const res = await fetch(API_BASE + '/api/volume?start=' + dateRange.start + '&end=' + dateRange.end);
    data = await res.json();
    data = data.map((d) => ({ time: d.date, value: d.value }));
    title = 'SOFR Volume ($B)';
    color = COLORS.volume;
  }

  const volumeSeries = chart.addHistogramSeries({ color: color, priceFormat: { type: 'volume' } });
  volumeSeries.setData(data);
  series.push({ name: title, color: color });
  addEventMarkers(volumeSeries, data.map((d) => d.time));
  renderLegend();
}

function addEventMarkers(targetSeries, dataDates) {
  if (!markers || !targetSeries || !dataDates || dataDates.length === 0) return;

  var dateSet = {};
  dataDates.forEach(function(d) { dateSet[d] = true; });
  var sorted = dataDates.slice().sort();

  function findClosest(target) {
    if (dateSet[target]) return target;
    for (var i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i] <= target) return sorted[i];
    }
    return null;
  }

  var seen = {};
  var all = [];

  markers.quarterEnds.forEach(function(d) {
    if (d < dateRange.start || d > dateRange.end) return;
    var closest = findClosest(d);
    if (closest && !seen[closest + 'qe']) {
      seen[closest + 'qe'] = true;
      all.push({ time: closest, position: 'aboveBar', color: '#ff9800', shape: 'square', text: 'QE' });
    }
  });

  markers.taxDeadlines.forEach(function(d) {
    if (d < dateRange.start || d > dateRange.end) return;
    var closest = findClosest(d);
    if (closest && !seen[closest + 'tx']) {
      seen[closest + 'tx'] = true;
      all.push({ time: closest, position: 'aboveBar', color: '#ef5350', shape: 'square', text: 'Tax' });
    }
  });

  all.sort(function(a, b) { return a.time < b.time ? -1 : a.time > b.time ? 1 : 0; });
  targetSeries.setMarkers(all);
}

function renderLegend() {
  document.getElementById('legend').innerHTML = series.map((s) =>
    '<div class="legend-item"><span class="legend-color" style="background: ' + s.color + '"></span><span>' + s.name + '</span></div>'
  ).join('');
}`;
