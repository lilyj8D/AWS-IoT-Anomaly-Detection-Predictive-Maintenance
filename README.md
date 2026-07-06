# AWS IoT Predictive Maintenance & Anomaly Detection Demo

An interactive browser-based demo showing how **AWS IoT SiteWise**, **Amazon SageMaker**, and **Amazon Bedrock** work together to deliver predictive maintenance for industrial equipment — from sensor ingestion through ML-based failure prediction to automated work order generation.

## Live Demo

Open `index.html` in any modern browser — no build step, no server, no dependencies to install.

## What it shows

| Step | AWS Service | What happens |
|------|-------------|--------------|
| 1 | IoT Sensors → SiteWise | Ingests vibration, temperature, pressure data |
| 2 | SiteWise ML Alarms | Native anomaly detection flags abnormal readings |
| 3 | SageMaker | Predicts specific failure mode + time-to-failure window |
| 4 | Bedrock | Generates plain-English explanation for operators |
| 5 | CMMS / ERP / MES | Auto-creates work orders and parts reservations |

## How to use

1. **Normal state** — observe the live sensor feed scrolling across the chart.
2. **Trigger anomaly** — click the orange button to simulate a developing bearing fault on Motor M-114.
3. **Watch the flow** — the architecture strip lights up as each service processes the event.
4. **Explore** — click different assets in the left panel to see their sensor streams and status.
5. **Reset** — click Reset Demo to run it again.

## Hosting

This is 100% static HTML/JS/CSS. Host it anywhere:

- **GitHub Pages** — push this folder to a repo, enable Pages on `main` branch.
- **Amazon S3 + CloudFront** — upload the folder to an S3 bucket with static website hosting enabled, front it with CloudFront for HTTPS.
- **Any static file server** — `npx serve .` or `python -m http.server 8000`.

## Cost comparison methodology

The cost card estimates are based on:
- **AWS side**: Published AWS list pricing (2026) for SiteWise messaging/processing/storage, SageMaker real-time inference (ml.m5.xlarge), and Bedrock token costs, sized for ~5 sensors/asset at 1 reading every 5 seconds.
- **APM benchmark**: Publicly available per-asset SaaS APM pricing from vendors like Plex ($50–150/asset/month).

These are directional estimates. Use the [AWS Pricing Calculator](https://calculator.aws/#/createCalculator/iot-sitewise) for a firm quote against your actual workload.

## Files

```
├── index.html        — Main page
├── app.js            — UI logic, chart rendering, demo controls
├── data.js           — Synthetic sensor data, predictions, explanations
├── styles.css        — Dark-theme styling
├── vendor/
│   └── chart.umd.js  — Chart.js (bundled, no CDN dependency)
└── README.md         — This file
```

## License

Demo code is provided as-is for illustrative purposes. Chart.js is used under its MIT license.
