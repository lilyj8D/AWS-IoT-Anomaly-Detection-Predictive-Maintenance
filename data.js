// ============================================================
// Simulated asset fleet & SiteWise metadata
// All data below is synthetic/illustrative for demo purposes only.
// ============================================================

const ASSETS = [
  {
    id: "M-114",
    name: "Motor M-114",
    line: "Line A — Assembly",
    siteWiseAssetId: "Motor_M114",
    alias: "/plant/lineA/m114/vibration",
    metric: "Vibration (mm/s RMS)",
    baseline: 2.1,
    unit: "mm/s",
    status: "normal",
    mlScore: 0.06,
  },
  {
    id: "P-208",
    name: "Hydraulic Pump P-208",
    line: "Line A — Press Shop",
    siteWiseAssetId: "Pump_P208",
    alias: "/plant/lineA/p208/pressure",
    metric: "Pressure (bar)",
    baseline: 145,
    unit: "bar",
    status: "normal",
    mlScore: 0.09,
  },
  {
    id: "C-301",
    name: "Compressor C-301",
    line: "Line A — Utilities",
    siteWiseAssetId: "Compressor_C301",
    alias: "/plant/lineA/c301/temperature",
    metric: "Bearing Temp (°C)",
    baseline: 61,
    unit: "°C",
    status: "warn",
    mlScore: 0.42,
  },
  {
    id: "G-405",
    name: "Gearbox G-405",
    line: "Line A — Conveyor",
    siteWiseAssetId: "Gearbox_G405",
    alias: "/plant/lineA/g405/vibration",
    metric: "Vibration (mm/s RMS)",
    baseline: 1.8,
    unit: "mm/s",
    status: "normal",
    mlScore: 0.11,
  },
];

// Number of historical points to render on the chart (simulated 10-min window at 1 pt / 20s)
const HISTORY_POINTS = 30;

// Generates a plausible looking noisy sensor series around a baseline.
// If `anomaly` is true, injects a rising trend + noise spike in the final third.
function generateSeries(baseline, points, anomaly) {
  const series = [];
  for (let i = 0; i < points; i++) {
    let noise = (Math.random() - 0.5) * baseline * 0.08;
    let value = baseline + noise;
    if (anomaly) {
      const progress = i / points;
      if (progress > 0.55) {
        const rampProgress = (progress - 0.55) / 0.45;
        value += baseline * 0.9 * rampProgress * rampProgress;
        value += (Math.random() - 0.3) * baseline * 0.15;
      }
    }
    series.push(Math.round(value * 100) / 100);
  }
  return series;
}

// ML anomaly score series (0-1) paired with the sensor reading.
function generateMlScoreSeries(points, anomaly) {
  const series = [];
  for (let i = 0; i < points; i++) {
    let base = 0.05 + Math.random() * 0.04;
    if (anomaly) {
      const progress = i / points;
      if (progress > 0.55) {
        const rampProgress = (progress - 0.55) / 0.45;
        base += 0.85 * rampProgress * rampProgress;
      }
    }
    series.push(Math.min(0.98, Math.round(base * 100) / 100));
  }
  return series;
}

function generateTimeLabels(points) {
  const labels = [];
  const now = new Date();
  for (let i = points - 1; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 20000);
    labels.push(t.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  }
  return labels;
}

// ---------- Rolling ("live scroll") advance helpers ----------
function advanceSeries(prevSeries, baseline) {
  const last = prevSeries[prevSeries.length - 1];
  const step = (Math.random() - 0.5) * baseline * 0.06;
  let next = last + step;
  next += (baseline - next) * 0.15;
  const rounded = Math.round(next * 100) / 100;
  return [...prevSeries.slice(1), rounded];
}

function advanceMlScoreSeries(prevSeries) {
  const last = prevSeries[prevSeries.length - 1];
  const step = (Math.random() - 0.5) * 0.02;
  const next = Math.max(0.02, Math.min(0.15, last + step));
  const rounded = Math.round(next * 100) / 100;
  return [...prevSeries.slice(1), rounded];
}

function advanceTimeLabels(prevLabels) {
  const now = new Date();
  const label = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return [...prevLabels.slice(1), label];
}

// ============================================================
// SageMaker-style prediction payloads keyed by asset id
// ============================================================
const PREDICTIONS = {
  "M-114": {
    failureMode: "Bearing wear — inner race spalling",
    confidence: 0.87,
    windowDays: [16, 24],
    recommendedAction: "Schedule bearing replacement; order SKF 6208-2RS bearing kit",
    partNumber: "SKF-6208-2RS",
    severity: "critical",
  },
  "C-301": {
    failureMode: "Compressor bearing overheating — lubrication degradation",
    confidence: 0.63,
    windowDays: [20, 30],
    recommendedAction: "Inspect lubrication system; monitor for 48 hrs before scheduling",
    partNumber: "N/A — monitor",
    severity: "warn",
  },
};

// ============================================================
// Bedrock-style natural-language explanations keyed by asset id
// ============================================================
const BEDROCK_EXPLANATIONS = {
  "M-114": [
    "Motor M-114's vibration signature has been climbing steadily over the past 6 hours — up 42% from its 30-day baseline.",
    "The pattern (rising amplitude concentrated around the bearing frequency band) matches historical failure signatures we've seen with inner-race bearing spalling.",
    "Based on the degradation curve, our model predicts a 2–4 week window before this progresses to a functional failure if left unaddressed.",
    "Recommendation: schedule a bearing replacement during the next planned downtime window. A work order and parts request have already been drafted for your review below."
  ],
  "C-301": [
    "Compressor C-301's bearing temperature is trending 8°C above its seasonal baseline, with a moderate anomaly score of 0.42.",
    "This pattern is consistent with early-stage lubrication degradation rather than an imminent failure — confidence is moderate at 63%.",
    "No immediate action required. We recommend a lubrication inspection during the next routine check, with continued monitoring over the next 48 hours."
  ],
};

// ============================================================
// CMMS integration log template (used after anomaly trigger)
// ============================================================
const WORKORDER_STEPS = [
  { icon: "🔔", title: "Anomaly detected by SiteWise ML alarm", sub: "Threshold + ML-based alarm fired on Motor_M114 / vibration" },
  { icon: "🧠", title: "SageMaker failure prediction generated", sub: "Failure mode: Bearing wear — inner race spalling (87% confidence)" },
  { icon: "💬", title: "Bedrock explanation composed for operator", sub: "Plain-English summary delivered to shift supervisor dashboard" },
  { icon: "🗂️", title: "Work order auto-created in CMMS", sub: "WO-2026-04471 — Priority: High — Assigned: Maintenance Team B" },
  { icon: "📦", title: "Parts request sent to ERP", sub: "Material SKF-6208-2RS — Reservation created" },
  { icon: "🏭", title: "MES notified (read-only sync)", sub: "Production schedule flagged for M-114 maintenance window" },
];
