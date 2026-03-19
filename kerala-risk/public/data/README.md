# /public/data — Data Folder

All CSVs in this folder are loaded at runtime by the React app using
`fetch()` + PapaParse. **No data is hardcoded in any component.**

To adapt this dashboard for a different state or dataset:

1. Replace the CSV files below with your own processed data.
2. Update `src/utils/vulnerability.js → VULNERABILITY_CONFIG` to match your column names.
3. Update `src/utils/districtPaths.js → DISTRICT_PATHS` with new SVG geometries.
4. Update `src/components/Navbar.jsx` for branding.

---

## districts.csv

One row per district. All columns are required unless marked optional.

| Column             | Type    | Source                         | Description                                      |
| ------------------ | ------- | ------------------------------ | ------------------------------------------------ |
| district           | string  | Census                         | District name (must match keys in districtPaths) |
| population         | integer | Census                         | Total population                                 |
| area_sqkm          | float   | Census                         | Area in square kilometres                        |
| density            | integer | Census                         | Population per sq km                             |
| rural_pop          | integer | Census                         | Rural population                                 |
| urban_pop          | integer | Census                         | Urban population                                 |
| rural_pct          | float   | Derived                        | Rural population %                               |
| urban_pct          | float   | Derived                        | Urban population %                               |
| literacy_rate      | float   | Census (literate.csv)          | % of population that is literate                 |
| hospitals          | integer | NHM Kerala Bed Capacity        | Number of hospitals                              |
| hospital_beds      | integer | NHM Kerala Bed Capacity        | Total hospital beds                              |
| icu_beds           | integer | NHM Kerala Bed Capacity        | ICU beds                                         |
| ventilators        | integer | NHM Kerala Bed Capacity        | Ventilators                                      |
| beds_per_1000      | float   | Derived                        | hospital_beds / population × 1000                |
| gddp_lakhs         | integer | GSDP 2022-23 (income.csv)      | Gross District Domestic Product in Lakhs         |
| gddp_pct           | float   | income.csv                     | District share of state GSDP (%)                 |
| gddp_per_capita    | float   | Derived                        | GDDP_Lakhs × 100000 / population                 |
| vax_rate           | float   | GoK COVID-19 Dashboard         | % of population vaccinated (capped at 100)       |
| unemployment_proxy | float   | Census (works_pop_edu.csv)     | Non-workers seeking work / total population (%)  |
| vulnerability      | float   | Derived (see vulnerability.js) | Composite score 0–100, higher = more vulnerable  |

**Vulnerability formula** (configurable via `VULNERABILITY_CONFIG`):

- Min-max scale each indicator to [0, 1]
- Invert indicators where higher value = safer (literacy, beds, GDP, vax)
- Take weighted mean → multiply by 100

---

## covid_timeseries.csv

State-level COVID-19 time series (used by Page 2 - Simulator).

| Column       | Type    | Description               |
| ------------ | ------- | ------------------------- |
| Date         | string  | YYYY-MM-DD                |
| Active_cases | integer | Active cases on that date |
| Recovered    | integer | Cumulative recovered      |
| Deceased     | integer | Cumulative deceased       |

---

## vaccination.csv

District-level vaccination summary from GoK Dashboard.

| Column                     | Description                                |
| -------------------------- | ------------------------------------------ |
| Districts                  | District name                              |
| tot-doses                  | Total doses administered                   |
| tot-person-vaccinations    | Total persons vaccinated (at least 1 dose) |
| (+ many age-group columns) | See original GoK dashboard CSV             |

---

## Adding a new state

1. Prepare `districts.csv` with the columns above.
2. Get district boundary GeoJSON → convert to SVG paths:

```python
# Quick projection helper (Kerala bounding box example)
LON_MIN, LON_MAX = 74.8, 77.6
LAT_MIN, LAT_MAX = 8.1, 12.95
W, H = 380, 720

def project(lon, lat):
    x = (lon - LON_MIN) / (LON_MAX - LON_MIN) * (W - 60) + 30
    y = H - 30 - (lat - LAT_MIN) / (LAT_MAX - LAT_MIN) * (H - 60)
    return round(x, 1), round(y, 1)
```

3. Paste generated paths into `src/utils/districtPaths.js`.
4. `npm start` — everything else adapts automatically.
