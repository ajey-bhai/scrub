# Bureau Scrub Lending Dashboard

Bureau scrub (tradeline-level) analysis and visualisation per **scrub_skill.md**: population mapping, behaviour, risk, timing, and monetisation (RUN 1–5).

## Prerequisites

- **Node.js** 18+ (for the frontend)
- **Python 3** (for generating dashboard data from the CSV)

## 1. Generate dashboard data (from CSV)

From the **project root** (the folder containing `AR_sample.csv` and `scripts/`):

```bash
python3 scripts/compute_dashboard_data.py
```

This reads `AR_sample.csv`, computes all aggregates, and writes JSON files to `dashboard/public/data/`:

- `overview.json`
- `population.json`
- `behaviour.json`
- `risk.json`
- `timing.json`
- `monetisation.json`
- `outreach.json`

**Note:** The script streams the CSV (no pandas). On ~650k rows it typically takes 2–4 minutes.

## 2. Run the frontend locally

```bash
cd dashboard
npm install
npm run dev
```

Then open the URL shown (e.g. **http://localhost:5173**) in your browser.

## Project layout

```
├── AR_sample.csv              # Bureau scrub (tradeline-level)
├── scrub_skill.md             # Analysis spec (RUN 1–5)
├── scripts/
│   └── compute_dashboard_data.py   # Streams CSV → JSON
├── dashboard/                 # Vite + React + Recharts
│   ├── public/
│   │   └── data/              # Generated JSON (after step 1)
│   └── src/
│       ├── App.tsx            # Tabs + data loading
│       ├── types.ts           # Types for JSON
│       └── views/              # Overview, Population, Behaviour, Risk, Timing, Monetisation, Outreach
└── README.md
```

## Dashboard views

| Tab | Content |
|-----|--------|
| **Overview** | KPIs: total customers, SAM, PL penetration, golden window, bureau date |
| **Population** | Bucket A/B/C/D, lender type (NBF/PVT/PUB/Mixed), product mix, account type |
| **Behaviour** | Time-to-next-PL Curve A vs B, repayment quality, credit velocity |
| **Risk** | Risk tier (PL / LAC / Exclude), affordability tier |
| **Timing** | Timing flags, months since car loan, seasonal demand index |
| **Monetisation** | TAM waterfall (N0 → SAM) |
| **Outreach** | Outreach cohort distribution (immediate / 30d / 90d / hold) |

All charts are labelled and scaled; axis labels and short notes are included per view.
