// SOFR Tracker Charts
// Uses Lightweight Charts library

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8787'
  : '';

// Chart colors
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
  quarterEnd: 'rgba(255, 152, 0, 0.3)',
  taxDeadline: 'rgba(239, 83, 80, 0.3)',
};

// Chart instance
let chart = null;
let series = [];
let currentView = 'corridor';
let cachedData = null;
let markers = null;

// Date range state
let dateRange = {
  start: null,
  end: null,
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  initDateRange();
  initTabs();
  await loadData();
  renderChart();
});

function initDateRange() {
  const rangeSelect = document.getElementById('rangeSelect');
  const customDates = document.getElementById('customDates');
  const startInput = document.getElementById('startDate');
  const endInput = document.getElementById('endDate');
  const applyBtn = document.getElementById('applyDates');

  // Set default range (3 months)
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
    case '1M':
      start.setMonth(start.getMonth() - 1);
      break;
    case '3M':
      start.setMonth(start.getMonth() - 3);
      break;
    case '6M':
      start.setMonth(start.getMonth() - 6);
      break;
    case '1Y':
      start.setFullYear(start.getFullYear() - 1);
      break;
    case '2Y':
      start.setFullYear(start.getFullYear() - 2);
      break;
  }

  dateRange.start = start.toISOString().split('T')[0];
  dateRange.end = end.toISOString().split('T')[0];
}

function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentView = tab.dataset.view;
      renderChart();
    });
  });
}

async function loadData() {
  const status = document.getElementById('status');
  status.textContent = 'Loading...';

  try {
    const [ratesRes, markersRes] = await Promise.all([
      fetch(`${API_BASE}/api/rates?start=${dateRange.start}&end=${dateRange.end}`),
      fetch(`${API_BASE}/api/markers`),
    ]);

    if (!ratesRes.ok || !markersRes.ok) {
      throw new Error('Failed to fetch data');
    }

    cachedData = await ratesRes.json();
    markers = await markersRes.json();

    const count = cachedData.sofr?.length || 0;
    status.textContent = `${count} days loaded`;
  } catch (err) {
    console.error('Error loading data:', err);
    status.textContent = 'Error loading data';
  }
}

function renderChart() {
  const container = document.getElementById('chart');
  const legendContainer = document.getElementById('legend');

  // Clear previous chart
  container.innerHTML = '';
  legendContainer.innerHTML = '';
  series = [];

  if (!cachedData) {
    container.innerHTML = '<div class="loading">Loading data</div>';
    return;
  }

  // Create chart
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
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
    },
    rightPriceScale: {
      borderColor: '#363a45',
    },
    timeScale: {
      borderColor: '#363a45',
      timeVisible: false,
    },
  });

  // Render based on view
  switch (currentView) {
    case 'corridor':
      renderCorridorChart();
      break;
    case 'sofr-percentile':
      renderSpreadChart('sofr-percentile', 'SOFR 1st-99th Percentile Spread');
      break;
    case 'sofr-bands':
      renderBandsChart();
      break;
    case 'sofr-rrp':
      renderSpreadChart('sofr-rrp', 'SOFR - RRP Spread');
      break;
    case 'effr-rrp':
      renderSpreadChart('effr-rrp', 'EFFR - RRP Spread');
      break;
    case 'rrp-volume':
      renderVolumeChart('rrp');
      break;
    case 'sofr-volume':
      renderVolumeChart('sofr');
      break;
  }

  // Add markers
  addMarkers();

  // Handle resize
  window.addEventListener('resize', () => {
    chart.applyOptions({ width: container.clientWidth });
  });

  chart.timeScale().fitContent();
}

function renderCorridorChart() {
  const { sofr, effr, policy } = cachedData;

  // SOFR line
  const sofrSeries = chart.addLineSeries({
    color: COLORS.sofr,
    lineWidth: 2,
    title: 'SOFR',
  });
  sofrSeries.setData(sofr.map((d) => ({ time: d.date, value: d.rate })));
  series.push({ series: sofrSeries, name: 'SOFR', color: COLORS.sofr });

  // EFFR line
  const effrSeries = chart.addLineSeries({
    color: COLORS.effr,
    lineWidth: 2,
    title: 'EFFR',
  });
  effrSeries.setData(effr.map((d) => ({ time: d.date, value: d.rate })));
  series.push({ series: effrSeries, name: 'EFFR', color: COLORS.effr });

  // IORB line
  const iorbSeries = chart.addLineSeries({
    color: COLORS.iorb,
    lineWidth: 1,
    lineStyle: LightweightCharts.LineStyle.Dashed,
    title: 'IORB',
  });
  iorbSeries.setData(
    policy.filter((d) => d.iorb !== null).map((d) => ({ time: d.date, value: d.iorb }))
  );
  series.push({ series: iorbSeries, name: 'IORB', color: COLORS.iorb });

  // SRF line (ceiling)
  const srfSeries = chart.addLineSeries({
    color: COLORS.srf,
    lineWidth: 1,
    lineStyle: LightweightCharts.LineStyle.Dotted,
    title: 'SRF (Ceiling)',
  });
  srfSeries.setData(
    policy.filter((d) => d.srf !== null).map((d) => ({ time: d.date, value: d.srf }))
  );
  series.push({ series: srfSeries, name: 'SRF (Ceiling)', color: COLORS.srf });

  // RRP line (floor)
  const rrpSeries = chart.addLineSeries({
    color: COLORS.rrp,
    lineWidth: 1,
    lineStyle: LightweightCharts.LineStyle.Dotted,
    title: 'RRP (Floor)',
  });
  rrpSeries.setData(
    policy.filter((d) => d.rrp !== null).map((d) => ({ time: d.date, value: d.rrp }))
  );
  series.push({ series: rrpSeries, name: 'RRP (Floor)', color: COLORS.rrp });

  renderLegend();
}

async function renderSpreadChart(type, title) {
  try {
    const res = await fetch(
      `${API_BASE}/api/spreads?type=${type}&start=${dateRange.start}&end=${dateRange.end}`
    );
    const data = await res.json();

    const spreadSeries = chart.addLineSeries({
      color: COLORS.spread,
      lineWidth: 2,
      title: title,
    });
    spreadSeries.setData(data.map((d) => ({ time: d.date, value: d.value })));
    series.push({ series: spreadSeries, name: title, color: COLORS.spread });

    // Add zero line for reference
    const zeroLine = chart.addLineSeries({
      color: '#787b86',
      lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const dates = data.map((d) => d.date);
    if (dates.length > 0) {
      zeroLine.setData([
        { time: dates[0], value: 0 },
        { time: dates[dates.length - 1], value: 0 },
      ]);
    }

    renderLegend();
  } catch (err) {
    console.error('Error loading spread data:', err);
  }
}

function renderBandsChart() {
  const { sofr } = cachedData;

  // P1-P99 area (lightest)
  const p99Series = chart.addAreaSeries({
    topColor: COLORS.p99,
    bottomColor: 'transparent',
    lineColor: 'transparent',
    lineWidth: 0,
  });
  p99Series.setData(
    sofr.filter((d) => d.p99 !== null).map((d) => ({ time: d.date, value: d.p99 }))
  );

  const p1Series = chart.addAreaSeries({
    topColor: 'transparent',
    bottomColor: COLORS.p1,
    lineColor: 'transparent',
    lineWidth: 0,
    invertFilledArea: true,
  });
  p1Series.setData(
    sofr.filter((d) => d.p1 !== null).map((d) => ({ time: d.date, value: d.p1 }))
  );

  // P25-P75 area (darker)
  const p75Series = chart.addAreaSeries({
    topColor: COLORS.p75,
    bottomColor: 'transparent',
    lineColor: 'transparent',
    lineWidth: 0,
  });
  p75Series.setData(
    sofr.filter((d) => d.p75 !== null).map((d) => ({ time: d.date, value: d.p75 }))
  );

  const p25Series = chart.addAreaSeries({
    topColor: 'transparent',
    bottomColor: COLORS.p25,
    lineColor: 'transparent',
    lineWidth: 0,
    invertFilledArea: true,
  });
  p25Series.setData(
    sofr.filter((d) => d.p25 !== null).map((d) => ({ time: d.date, value: d.p25 }))
  );

  // Median line
  const medianSeries = chart.addLineSeries({
    color: COLORS.sofr,
    lineWidth: 2,
    title: 'SOFR',
  });
  medianSeries.setData(sofr.map((d) => ({ time: d.date, value: d.rate })));

  series.push(
    { name: 'SOFR (Median)', color: COLORS.sofr },
    { name: 'P25-P75', color: 'rgba(41, 98, 255, 0.4)' },
    { name: 'P1-P99', color: 'rgba(41, 98, 255, 0.2)' }
  );

  renderLegend();
}

async function renderVolumeChart(type) {
  let data;
  let title;
  let color;

  if (type === 'rrp') {
    const res = await fetch(
      `${API_BASE}/api/rrp?start=${dateRange.start}&end=${dateRange.end}`
    );
    const rrpData = await res.json();
    data = rrpData
      .filter((d) => d.total_accepted_billions !== null)
      .map((d) => ({
        time: d.date,
        value: d.total_accepted_billions,
      }));
    title = 'RRP Volume ($B)';
    color = COLORS.rrp;
  } else {
    const res = await fetch(
      `${API_BASE}/api/volume?start=${dateRange.start}&end=${dateRange.end}`
    );
    data = await res.json();
    data = data.map((d) => ({ time: d.date, value: d.value }));
    title = 'SOFR Volume ($B)';
    color = COLORS.volume;
  }

  const volumeSeries = chart.addHistogramSeries({
    color: color,
    priceFormat: {
      type: 'volume',
    },
  });
  volumeSeries.setData(data);
  series.push({ series: volumeSeries, name: title, color: color });

  renderLegend();
}

function addMarkers() {
  if (!markers || !chart) return;

  // Filter markers within date range
  const filterInRange = (dates) =>
    dates.filter((d) => d >= dateRange.start && d <= dateRange.end);

  const quarterEnds = filterInRange(markers.quarterEnds);
  const taxDeadlines = filterInRange(markers.taxDeadlines);

  // Note: Lightweight Charts doesn't have built-in vertical line support
  // We would need to use markers on a series or custom rendering
  // For now, we'll use the crosshair to show these dates
}

function renderLegend() {
  const legendContainer = document.getElementById('legend');
  legendContainer.innerHTML = series
    .map(
      (s) => `
      <div class="legend-item">
        <span class="legend-color" style="background: ${s.color}"></span>
        <span>${s.name}</span>
      </div>
    `
    )
    .join('');
}
