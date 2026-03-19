# Kerala RiskWatch — Vulnerability Index Dashboard

A React dashboard for district-level disease vulnerability assessment in Kerala, built on real Census , NHM, and GSDP data. Designed to be fully configurable and generalisable to any Indian state.

---

## Screenshots

| Stat Bar & Map                                       | Rankings & Beds Chart                                 |
| ---------------------------------------------------- | ----------------------------------------------------- |
| Top-level summary cards + interactive choropleth map | Sortable district table + hospital bed capacity chart |

---

## Features

- **Interactive choropleth map** — real Kerala district boundaries from GeoJSON (loaded live from GitHub), switchable across 6 metrics
- **Composite vulnerability score** — configurable min-max weighted index (literacy, beds/1k, density, GDP, vaccination)
- **Exposure panel** — population density, GDDP per capita, literacy, beds, vaccination rate bars
- **Rural / Urban split chart** — Census breakdown per district or all districts stacked
- **GDDP contribution chart** — each district's share of state GSDP
- **District detail panel** — slides in on click, shows ring score, radar chart, all metrics, key flags
- **CSV-driven** — no hardcoded data; all CSVs live in `public/data/` and are loaded at runtime

---

## Project Structure

```
kerala-risk/
├── .gitignore
├── requirements.txt            ← Python deps for data preprocessing
├── generate_districts.py       ← Merges raw CSVs → districts.csv
├── package.json
├── tailwind.config.js
├── public/
│   ├── index.html
│   └── data/
│       ├── districts.csv           ← Main dataset (20 cols × 14 rows)
│       ├── covid_timeseries.csv    ← For Page 2 SEIR simulator
│       ├── vaccination.csv         ← GoK dashboard raw data
│       └── README.md               ← Column dictionary
└── src/
    ├── index.js
    ├── index.css                   ← CSS design tokens + global styles
    ├── App.jsx                     ← Root layout and state
    ├── hooks/
    │   └── useDistrictData.js      ← Loads districts.csv via fetch + PapaParse
    ├── utils/
    │   ├── csvLoader.js            ← Generic loadCSV(filename) utility
    │   ├── vulnerability.js        ← Scoring engine + riskColor/riskTier
    │   └── districtPaths.js        ← (legacy, replaced by live GeoJSON)
    └── components/
        ├── Navbar.jsx
        ├── StatBar.jsx             ← 4 summary KPI cards
        ├── KeralaMap.jsx           ← SVG choropleth map (d3-geo projection)
        ├── ExposurePanel.jsx       ← Exposure bars + R/U chart + GDDP chart
        ├── RadarChart.jsx          ← Pure SVG radar (no extra dependency)
        ├── DetailPanel.jsx         ← Slide-in district detail panel
        ├── RankingTable.jsx        ← Sortable vulnerability table
        └── BedsChart.jsx           ← Beds/1k bar chart with WHO reference
```

---

## Quick Start

### 1. Install and run the React app

```bash
npm install
npm start
# Opens at http://localhost:3000
```

### 2. Regenerate districts.csv from raw CSVs (optional)

Place these raw files in the same folder as `generate_districts.py`:

| File                                                     | Source                                           |
| -------------------------------------------------------- | ------------------------------------------------ |
| `kerala_districts_only.csv`                              | Census — district population, area, density      |
| `literate.csv`                                           | Census Table C-08 — literacy by district and age |
| `kerala_bed_capacity.csv`                                | NHM Kerala — hospitals, beds, ICU, ventilators   |
| `income.csv`                                             | GSDP data — district GSDP in Lakhs + % of state  |
| `GoK_Dashboard__Official_Kerala_COVID-19_Statistics.csv` | GoK COVID dashboard — vaccination counts         |
| `kerala_processed_population.csv`                        | Population denominators for vaccination rate     |
| `works_pop_edu.csv`                                      | Census Table B-03 — workers / non-workers        |

Then run:

```bash
pip install -r requirements.txt
python generate_districts.py
# Writes districts.csv in the current folder
# Copy it to public/data/districts.csv
```

---

## Data Sources

| Indicator                       | Source                                                            | Year            |
| ------------------------------- | ----------------------------------------------------------------- | --------------- |
| Population, area, density       | Census of India                                                   |
| Rural / urban split             | Census of India                                                   |
| Literacy rate                   | Census of India (Table C-08)                                      |
| Hospital beds, ICU, ventilators | National Health Mission Kerala                                    |
| GSDP per capita                 | Kerala State Planning Board                                       |
| Vaccination rate                | Government of Kerala COVID-19 Dashboard                           |
| District boundaries (GeoJSON)   | [geohacker/kerala](https://github.com/geohacker/kerala) on GitHub | Survey of India |

---

## Vulnerability Score

The composite score (0–100, higher = more vulnerable) is computed in `src/utils/vulnerability.js`:

```js
export const VULNERABILITY_CONFIG = [
  { column: "literacy_rate", invert: true, weight: 1 }, // higher = safer
  { column: "beds_per_1000", invert: true, weight: 1 }, // higher = safer
  { column: "density", invert: false, weight: 1 }, // higher = more risk
  { column: "gddp_per_capita", invert: true, weight: 1 }, // higher = safer
  { column: "vax_rate", invert: true, weight: 1 }, // higher = safer
];
```

**Algorithm:** min-max scale each indicator → invert "good" indicators → weighted mean × 100.

To add or remove an indicator, edit only this config array — no component changes needed.

---

## Generalising to Another State

1. Prepare `public/data/districts.csv` with the same column schema (see `public/data/README.md`)
2. Update `VULNERABILITY_CONFIG` in `src/utils/vulnerability.js` to match your columns
3. Update the GeoJSON URL in `src/components/KeralaMap.jsx`:
   ```js
   const GEOJSON_URL =
     "https://raw.githubusercontent.com/your-repo/state.geojson";
   ```
   The GeoJSON must have `feature.properties.DISTRICT` (or update `GEOJSON_TO_CSV` to match your property key)
4. Update `GEOJSON_TO_CSV` in `KeralaMap.jsx` to map GeoJSON names → CSV district names
5. Update branding in `src/components/Navbar.jsx`
6. Run `npm start`

---

## Tech Stack

| Layer              | Library                                            |
| ------------------ | -------------------------------------------------- |
| UI framework       | React 18                                           |
| Charts             | Recharts                                           |
| Map projection     | d3-geo                                             |
| CSV parsing        | PapaParse                                          |
| Styling            | CSS custom properties (no Tailwind runtime needed) |
| Data preprocessing | Python — pandas, numpy, scikit-learn               |

---
