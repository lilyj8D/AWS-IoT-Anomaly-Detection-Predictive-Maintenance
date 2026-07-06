// ============================================================
// Predictive Maintenance Demo — App Logic
// ============================================================

let selectedAssetId = "M-114";
let chart = null;
let anomalyTriggered = false;
let woTimer = null;

// Cache of the currently-rendered series per asset so ambient refreshes advance
// the existing chart by one point instead of generating a new random pattern.
let seriesCache = {};

// ---------- Clock ----------
function tickClock() {
  const el = document.getElementById("clock");
  const now = new Date();
  el.textContent = now.toLocaleString("en-US", {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
}
setInterval(tickClock, 1000);
tickClock();

// ---------- Fleet list ----------
function statusClass(status) {
  return status === "critical" ? "critical" : status === "warn" ? "warn" : "normal";
}

function renderFleetList() {
  const container = document.getElementById("assetList");
  container.innerHTML = "";
  ASSETS.forEach(asset => {
    const item = document.createElement("div");
    item.className = "asset-item" + (asset.id === selectedAssetId ? " selected" : "");
    item.dataset.id = asset.id;
    const sc = statusClass(asset.status);
    item.innerHTML = `
      <span class="asset-status-dot status-${sc}"></span>
      <div class="asset-info">
        <div class="asset-name">${asset.name}</div>
        <div class="asset-meta">${asset.line}</div>
      </div>
      <span class="asset-score score-${sc}">${asset.mlScore.toFixed(2)}</span>
    `;
    item.addEventListener("click", () => selectAsset(asset.id));
    container.appendChild(item);
  });
}

function selectAsset(id) {
  selectedAssetId = id;
  renderFleetList();
  renderChart();
  renderPrediction();
  renderBedrock();
  highlightArchNode(null);
}

// ---------- Chart ----------
function renderChart(mode = "fresh") {
  const asset = ASSETS.find(a => a.id === selectedAssetId);
  const isAnomalyAsset = (asset.id === "M-114" && anomalyTriggered) || asset.status === "warn";

  let labels, sensorSeries, mlSeries;
  const cached = seriesCache[selectedAssetId];

  if (mode === "advance" && cached && cached.isAnomalyAsset === isAnomalyAsset) {
    labels = advanceTimeLabels(cached.labels);
    sensorSeries = advanceSeries(cached.sensorSeries, asset.baseline);
    mlSeries = advanceMlScoreSeries(cached.mlSeries);
  } else {
    labels = generateTimeLabels(HISTORY_POINTS);
    sensorSeries = generateSeries(asset.baseline, HISTORY_POINTS, isAnomalyAsset);
    mlSeries = generateMlScoreSeries(HISTORY_POINTS, isAnomalyAsset);
  }

  seriesCache[selectedAssetId] = { labels, sensorSeries, mlSeries, isAnomalyAsset };

  document.getElementById("chartTitle").textContent = `${asset.name} — ${asset.metric}`;
  document.getElementById("swAsset").textContent = asset.siteWiseAssetId;
  document.getElementById("swAlias").textContent = asset.alias;

  const currentMl = mlSeries[mlSeries.length - 1];
  document.getElementById("swMl").textContent = currentMl.toFixed(2);
  const thresholdEl = document.getElementById("swThreshold");
  if (currentMl > 0.7) {
    thresholdEl.textContent = "ALARM — Critical";
    thresholdEl.style.color = "var(--red)";
  } else if (currentMl > 0.3) {
    thresholdEl.textContent = "ALARM — Warning";
    thresholdEl.style.color = "var(--amber)";
  } else {
    thresholdEl.textContent = "Normal";
    thresholdEl.style.color = "var(--green)";
  }

  const maxSensor = Math.max(...sensorSeries) * 1.15;
  const mlScaled = mlSeries.map(v => v * maxSensor);

  if (chart) chart.destroy();
  const ctx = document.getElementById("sensorChart").getContext("2d");
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: asset.metric,
          data: sensorSeries,
          borderColor: "#4da3ff",
          backgroundColor: "rgba(77,163,255,0.08)",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: true,
          yAxisID: "y",
        },
        {
          label: "ML Anomaly Score (scaled)",
          data: mlScaled,
          borderColor: "#b57bff",
          borderWidth: 2,
          borderDash: [5, 4],
          pointRadius: 0,
          tension: 0.3,
          fill: false,
          yAxisID: "y",
        },
      ],
    },
    options: {
      responsive: true,
      animation: { duration: 400 },
      plugins: {
        legend: { display: false },
        tooltip: { mode: "index", intersect: false },
      },
      scales: {
        x: {
          ticks: { color: "#8ea0bd", maxTicksLimit: 8, font: { size: 10 } },
          grid: { color: "rgba(255,255,255,0.04)" },
        },
        y: {
          ticks: { color: "#8ea0bd", font: { size: 10 } },
          grid: { color: "rgba(255,255,255,0.06)" },
        },
      },
    },
  });
}

// ---------- Prediction panel ----------
function renderPrediction() {
  const body = document.getElementById("predictBody");
  const pred = PREDICTIONS[selectedAssetId];
  const asset = ASSETS.find(a => a.id === selectedAssetId);

  const showPrediction = pred && (selectedAssetId !== "M-114" || anomalyTriggered);

  if (!showPrediction) {
    body.innerHTML = `<div class="predict-empty">No active anomaly for ${asset.name}. SageMaker model is monitoring in the background.</div>`;
    return;
  }

  const sevClass = pred.severity === "critical" ? "crit" : "warn";
  body.innerHTML = `
    <div class="predict-alert ${pred.severity}">
      <div class="predict-headline ${sevClass}">${pred.severity === "critical" ? "⚠ Predicted Failure" : "⚠ Early Warning"}</div>
      <div class="predict-row"><span>Asset</span><span>${asset.name}</span></div>
      <div class="predict-row"><span>Failure Mode</span><span>${pred.failureMode}</span></div>
      <div class="predict-row"><span>Prediction Window</span><span>${pred.windowDays[0]}–${pred.windowDays[1]} days</span></div>
      <div class="predict-row"><span>Model Confidence</span><span>${Math.round(pred.confidence * 100)}%</span></div>
      <div class="predict-row"><span>Recommended Action</span><span>${pred.recommendedAction}</span></div>
      <div class="predict-conf-bar"><div class="predict-conf-fill" style="width:${pred.confidence * 100}%"></div></div>
    </div>
  `;
}

// ---------- Bedrock explanation panel ----------
function renderBedrock() {
  const body = document.getElementById("bedrockBody");
  const lines = BEDROCK_EXPLANATIONS[selectedAssetId];
  const showBedrock = lines && (selectedAssetId !== "M-114" || anomalyTriggered);

  if (!showBedrock) {
    body.innerHTML = `<div class="predict-empty">No active alert for this asset. Once an anomaly fires, Bedrock composes a plain-English summary here.</div>`;
    return;
  }

  body.innerHTML = "";
  lines.forEach((line, idx) => {
    const msg = document.createElement("div");
    msg.className = "bedrock-msg";
    msg.style.marginBottom = "10px";
    msg.style.opacity = "0";
    msg.innerHTML = `<span class="bedrock-avatar">💬</span><span>${line}</span>`;
    body.appendChild(msg);
    setTimeout(() => { msg.style.transition = "opacity .4s"; msg.style.opacity = "1"; }, idx * 350);
  });
}

// ---------- Work order timeline ----------
function renderWorkOrderSteps(reset) {
  const body = document.getElementById("woBody");
  if (woTimer) { clearInterval(woTimer); woTimer = null; }

  if (reset) {
    body.innerHTML = `<div class="predict-empty">No work orders generated yet.</div>`;
    return;
  }

  const timeline = document.createElement("div");
  timeline.className = "wo-timeline";
  WORKORDER_STEPS.forEach(step => {
    const el = document.createElement("div");
    el.className = "wo-step";
    el.innerHTML = `
      <div class="wo-step-icon">${step.icon}</div>
      <div class="wo-step-body">
        <div class="wo-step-title">${step.title}</div>
        <div class="wo-step-sub">${step.sub}</div>
      </div>
      <div class="wo-step-time">--:--:--</div>
    `;
    timeline.appendChild(el);
  });
  body.innerHTML = "";
  body.appendChild(timeline);

  const stepEls = timeline.querySelectorAll(".wo-step");
  const archSequence = ["sensors", "sitewise", "sagemaker", "bedrock", "action", "action"];
  let i = 0;
  woTimer = setInterval(() => {
    if (i >= stepEls.length) {
      clearInterval(woTimer);
      woTimer = null;
      highlightArchNode(null);
      return;
    }
    stepEls[i].classList.add("done");
    stepEls[i].querySelector(".wo-step-time").textContent = new Date().toLocaleTimeString("en-US");
    highlightArchNode(archSequence[i]);
    i++;
  }, 700);
}

// ---------- Architecture strip highlight ----------
function highlightArchNode(nodeKey) {
  document.querySelectorAll(".arch-node").forEach(n => n.classList.remove("active"));
  if (nodeKey) {
    const el = document.querySelector(`.arch-node[data-node="${nodeKey}"]`);
    if (el) el.classList.add("active");
  }
}

// ---------- Demo controls ----------
function triggerAnomaly() {
  anomalyTriggered = true;
  const m114 = ASSETS.find(a => a.id === "M-114");
  m114.status = "critical";
  m114.mlScore = 0.91;
  selectedAssetId = "M-114";

  renderFleetList();
  renderChart();
  renderPrediction();
  renderBedrock();
  renderWorkOrderSteps(false);
  highlightArchNode("sensors");

  document.getElementById("btnTrigger").disabled = true;
  document.getElementById("btnTrigger").textContent = "✓ Anomaly Triggered — see flow below";
}

function resetDemo() {
  anomalyTriggered = false;
  const m114 = ASSETS.find(a => a.id === "M-114");
  m114.status = "normal";
  m114.mlScore = 0.06;
  selectedAssetId = "M-114";

  renderFleetList();
  renderChart();
  renderPrediction();
  renderBedrock();
  renderWorkOrderSteps(true);
  highlightArchNode(null);

  const btn = document.getElementById("btnTrigger");
  btn.disabled = false;
  btn.textContent = "▶ Trigger Anomaly on Motor M-114";
}

document.getElementById("btnTrigger").addEventListener("click", triggerAnomaly);
document.getElementById("btnReset").addEventListener("click", resetDemo);

// ---------- Init ----------
renderFleetList();
renderChart();
renderPrediction();
renderBedrock();
renderWorkOrderSteps(true);

// Ambient refresh — advances the existing chart by one point every 4s.
// Anomaly/warn views are frozen so the failure signature stays stable.
setInterval(() => {
  const asset = ASSETS.find(a => a.id === selectedAssetId);
  const isAnomalyAsset = (asset.id === "M-114" && anomalyTriggered) || asset.status === "warn";
  if (!isAnomalyAsset) {
    renderChart("advance");
  }
}, 4000);
