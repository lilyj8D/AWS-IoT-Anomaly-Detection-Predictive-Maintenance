# AWS IoT Predictive Maintenance & Anomaly Detection Demo

A fully interactive browser demo showing how AWS IoT SiteWise, Amazon SageMaker, and Amazon Bedrock work together to catch equipment failures before they happen — and automatically generate work orders when they do.

## 👉 [Launch the Live Demo](https://lilyj8d.github.io/AWS-IoT-Anomaly-Detection-Predictive-Maintenance/)

*(No install, no sign-up — just click and explore.)*

---

## What you're looking at

This simulates a production line with four industrial assets (motors, pumps, compressors, gearboxes) streaming sensor data into AWS IoT SiteWise in real time. The architecture flow runs left-to-right across the top:

```
IoT Sensors → AWS IoT SiteWise → Amazon SageMaker → Amazon Bedrock → CMMS / ERP
```

Each service does one job:

| Service | Role |
|---------|------|
| **IoT Sensors** | Stream vibration, temperature, and pressure readings 24/7 |
| **AWS IoT SiteWise** | Ingests data, runs threshold alarms + native ML anomaly detection |
| **Amazon SageMaker** | Predicts the *specific* failure mode and time-to-failure window |
| **Amazon Bedrock** | Translates the prediction into plain English for shop floor operators |
| **CMMS / ERP** | Auto-creates a work order, reserves parts, notifies production scheduling |

---

## Walking through the demo

### 1. Observe normal operation

When you first load the page, Motor M-114 is selected and running normally. The chart shows its live vibration signal (blue line) with the ML anomaly score overlaid (purple dashed line). Both are flat and low — this is what "healthy" looks like.

Notice Compressor C-301 in the left panel has an amber score (0.42) — that's a real early-warning state, being monitored but not yet actionable. Click it to see its chart and the moderate-confidence Bedrock explanation.

### 2. Trigger an anomaly

Click the orange **▶ Trigger Anomaly on Motor M-114** button.

What happens:
- The vibration signature starts climbing — a gradual drift that's easy for a human to miss shift-by-shift, but exactly what a model catches.
- The architecture strip lights up sequentially as each service processes the event.
- The ML anomaly score spikes past the alarm threshold.

### 3. Read the SageMaker prediction

The **SageMaker Failure Prediction** panel now shows:
- **Failure mode**: Bearing wear — inner race spalling
- **Confidence**: 87%
- **Window**: 16–24 days before functional failure
- **Recommended action**: Schedule bearing replacement

This is the difference between an emergency shutdown and a planned maintenance slot.

### 4. Read the Bedrock explanation

The **Amazon Bedrock** panel streams a plain-English explanation — the same message an operator would see on the shop floor. It explains *what* is happening, *why* the model thinks so, and *what to do about it*. No cryptic alarm codes.

### 5. Watch the work order flow

The **Automated Work Order** timeline plays out in real time:
1. SiteWise ML alarm fires
2. SageMaker generates the failure prediction
3. Bedrock composes the operator explanation
4. Work order auto-created in CMMS
5. Parts reservation sent to ERP
6. MES notified (read-only) for production scheduling awareness

### 6. Reset and explore

Click **⟲ Reset Demo** to return everything to normal and run it again. Click different assets in the left panel to inspect their individual sensor feeds and status.

---

## Cost context

The bottom card shows an estimated cost comparison between traditional SaaS APM platforms and the AWS-native stack used in this demo. Based on AWS published list pricing for a representative industrial sensor load (~5 sensors/asset, 1 reading every 5 seconds):

| Approach | Estimated annual cost per asset |
|----------|-------------------------------|
| Traditional SaaS APM | $600–1,800 |
| AWS SiteWise + SageMaker + Bedrock | $250–350 |

These are directional estimates — use the [AWS Pricing Calculator](https://calculator.aws/#/createCalculator/iot-sitewise) to size against your actual workload.

---

## Tech details

- Pure static HTML/JS/CSS — no server, no build step, no dependencies to install
- Chart.js for real-time sensor visualization (bundled locally, no CDN)
- All sensor data is synthetic; the architecture and service behavior are real
- Chart uses rolling-advance updates (not full regeneration) so the pattern stays continuous and credible

---

## License

Demo code provided as-is for illustrative purposes. Chart.js is used under its MIT license.
