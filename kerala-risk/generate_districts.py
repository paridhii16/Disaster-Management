"""
generate_districts.py
=====================
Generates districts.csv — the single merged dataset used by the Kerala RiskWatch
React dashboard — from the raw source CSV files.

INPUT FILES (place all in the same folder as this script, or set RAW_DATA_DIR):
  - kerala_districts_only.csv          (Census  district population / area)
  - literate.csv                       (Census  literacy by district & age)
  - kerala_bed_capacity.csv            (NHM hospital/bed/ICU/ventilator data)
  - income.csv                         (District GSDP in Lakhs + % of state)
  - GoK_Dashboard__Official_Kerala_COVID-19_Statistics.csv  (Vaccination counts)
  - kerala_processed_population.csv    (Population denominators for vax rate)
  - works_pop_edu.csv                  (Census  workers / non-workers)

OUTPUT:
  - districts.csv   (one row per district, 20 columns, ready for /public/data/)

DESIGN NOTES:
  - All processing is explicit and documented step-by-step.
  - The vulnerability score is computed here using min-max scaling.
  - To swap indicators, edit VULNERABILITY_CONFIG at the bottom of this file.
  - To add a new data source, add a load_*() function and merge it in main().
"""

import os
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG — point this at the folder containing all raw CSVs
# ─────────────────────────────────────────────────────────────────────────────

RAW_DATA_DIR = "."  # change if your CSVs are elsewhere
OUTPUT_FILE = "districts.csv"

# Vulnerability scoring config:
#   column       — must match a column in the merged DataFrame
#   invert       — True  = higher value means LESS vulnerable (e.g. literacy)
#                  False = higher value means MORE vulnerable  (e.g. density)
#   weight       — relative weight in the composite (all weights are normalised)
VULNERABILITY_CONFIG = [
    {"column": "literacy_rate", "invert": True, "weight": 1},
    {"column": "beds_per_1000", "invert": True, "weight": 1},
    {"column": "icu_beds_per_1000", "invert": True, "weight": 1},
    {"column": "density", "invert": False, "weight": 1},
    {"column": "urban_pct", "invert": False, "weight": 1},
    {"column": "gddp_per_capita", "invert": True, "weight": 1},
    {"column": "unemployment_proxy", "invert": False, "weight": 1},
]

# Districts we expect — used only for a final validation print
EXPECTED_DISTRICTS = [
    "Kasaragod",
    "Kannur",
    "Wayanad",
    "Kozhikode",
    "Malappuram",
    "Palakkad",
    "Thrissur",
    "Ernakulam",
    "Idukki",
    "Kottayam",
    "Alappuzha",
    "Pathanamthitta",
    "Kollam",
    "Thiruvananthapuram",
]


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────


def p(path):
    """Resolve a filename relative to RAW_DATA_DIR."""
    return os.path.join(RAW_DATA_DIR, path)


def clean_numeric(series):
    """Strip commas and coerce to float (Census CSVs use Indian number formatting)."""
    return pd.to_numeric(
        series.astype(str).str.replace(",", "", regex=False), errors="coerce"
    )


def strip_district_names(df, col="District"):
    df[col] = df[col].astype(str).str.strip()
    return df


# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — Population, area, density, rural/urban split
#           Source: kerala_districts_only.csv  (Census )
# ─────────────────────────────────────────────────────────────────────────────


def load_population():
    """
    kerala_districts_only.csv contains one row per district × rural/urban/total.
    We extract Total, Rural and Urban rows separately, then merge.

    Key columns used:
      'India/ State/ Union Territory/ District/ Sub-district 4'  → row type (DISTRICT / STATE)
      'Total/\\nRural/\\nUrban 6'                                → Total / Rural / Urban
      'Name 5'                                                   → district name
      'Population 11'                                            → population
      'Area\\n (In sq. km) 13.00'                               → area in sq km
      'Population per sq. km. 14'                               → density
    """
    df = pd.read_csv(p("kerala_districts_only.csv"))

    # Keep only district-level rows (not state or sub-district)
    df = df[df["India/ State/ Union Territory/ District/ Sub-district 4"] == "DISTRICT"]

    def extract(kind):
        sub = df[df["Total/\nRural/\nUrban 6"] == kind][
            [
                "Name 5",
                "Population 11",
                "Area\n (In sq. km) 13.00",
                "Population per sq. km. 14",
            ]
        ].copy()
        sub.columns = ["District", "Population", "Area_sqkm", "Density"]
        for col in ["Population", "Area_sqkm", "Density"]:
            sub[col] = clean_numeric(sub[col])
        return strip_district_names(sub)

    total = extract("Total")
    rural = extract("Rural")[["District", "Population"]].rename(
        columns={"Population": "rural_pop"}
    )
    urban = extract("Urban")[["District", "Population"]].rename(
        columns={"Population": "urban_pop"}
    )

    pop = total.merge(rural, on="District").merge(urban, on="District")

    # Derived percentages
    pop["rural_pct"] = (pop["rural_pop"] / pop["Population"] * 100).round(1)
    pop["urban_pct"] = (pop["urban_pop"] / pop["Population"] * 100).round(1)

    print(f"[population]  {len(pop)} districts loaded.")
    return pop


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — Literacy rate
#           Source: literate.csv  (Census , Table C-08)
# ─────────────────────────────────────────────────────────────────────────────


def load_literacy():
    """
    literate.csv has a multi-row header (3 header rows) and many columns.
    We skip 2 rows so the first data row becomes the header row, then
    use positional column indices:
      col[3]  → area name  (e.g. "District - Kasaragod")
      col[4]  → Total / Rural / Urban
      col[5]  → Age group  (we want "All ages")
      col[6]  → Total persons
      col[12] → Literate persons

    We filter for:
      - district name matching any of the 14 Kerala districts
      - Total (not Rural/Urban breakdown)
      - All ages (not individual age bands)
    """
    lit = pd.read_csv(p("literate.csv"), header=None, skiprows=2)

    # Build a regex to match any Kerala district name in col[3]
    district_pattern = "|".join(EXPECTED_DISTRICTS)

    mask = (
        lit[3].astype(str).str.contains(district_pattern, case=False, na=False)
        & (lit[4].astype(str).str.strip() == "Total")
        & (lit[5].astype(str).str.strip() == "All ages")
    )
    lit_d = lit[mask][[3, 6, 12]].copy()
    lit_d.columns = ["District", "Population", "Literate"]

    # Strip "District - " prefix that Census uses
    lit_d["District"] = (
        lit_d["District"].str.replace("District - ", "", regex=False).str.strip()
    )

    for col in ["Population", "Literate"]:
        lit_d[col] = clean_numeric(lit_d[col])

    lit_d["literacy_rate"] = (lit_d["Literate"] / lit_d["Population"] * 100).round(2)

    result = strip_district_names(lit_d)[["District", "literacy_rate"]]
    print(f"[literacy]    {len(result)} districts loaded.")
    return result


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — Healthcare capacity
#           Source: kerala_bed_capacity.csv  (NHM Kerala)
# ─────────────────────────────────────────────────────────────────────────────


def load_healthcare():
    """
    Simple flat CSV with one row per district.
    Columns: district, hospitals, hospital_beds, icu_beds, ventilators
    """
    hc = pd.read_csv(p("kerala_bed_capacity.csv"))
    hc = hc.rename(columns={"district": "District"})
    hc = strip_district_names(hc)
    print(f"[healthcare]  {len(hc)} districts loaded.")
    return hc


# ─────────────────────────────────────────────────────────────────────────────
# STEP 4 — District GSDP
#           Source: income.csv
# ─────────────────────────────────────────────────────────────────────────────


def load_income():
    """
    Columns: District, GDDP_Lakhs, Percent_of_Total
    (GDDP = Gross District Domestic Product)
    """
    inc = pd.read_csv(p("income.csv"))
    inc = strip_district_names(inc)
    print(f"[income]      {len(inc)} districts loaded.")
    return inc


# ─────────────────────────────────────────────────────────────────────────────
# STEP 5 — Vaccination coverage
#           Source: GoK_Dashboard__Official_Kerala_COVID-19_Statistics.csv
#           Denominator: kerala_processed_population.csv
# ─────────────────────────────────────────────────────────────────────────────


def load_vaccination():
    """
    GoK dashboard CSV has district-level vaccination counts.
    We use 'tot-person-vaccinations' as the numerator and divide by the
    district population from kerala_processed_population.csv.

    Vaccination rate is capped at 100% to handle data artefacts
    (Ernakulam shows >100 due to migrant workers counted at workplaces).
    """
    vax = pd.read_csv(p("GoK_Dashboard__Official_Kerala_COVID-19_Statistics.csv"))
    vax.columns = vax.columns.str.strip()
    vax = vax[["Districts", "tot-doses", "tot-person-vaccinations"]].copy()
    vax.columns = ["District", "total_doses", "vaccinated_persons"]
    for col in ["total_doses", "vaccinated_persons"]:
        vax[col] = clean_numeric(vax[col])
    vax = strip_district_names(vax)

    # Population denominators (pre-processed from Census, slightly different
    # totals due to rounding in the original GoK dataset)
    pop2 = pd.read_csv(p("kerala_processed_population.csv"))
    pop2 = pop2.rename(columns={"district": "District", "Population": "Pop2"})
    pop2 = strip_district_names(pop2)
    pop2["Pop2"] = pd.to_numeric(pop2["Pop2"], errors="coerce")

    vax = vax.merge(pop2, on="District", how="left")
    vax["vax_rate"] = (
        (vax["vaccinated_persons"] / vax["Pop2"] * 100).clip(upper=100).round(1)
    )

    result = vax[["District", "total_doses", "vaccinated_persons", "vax_rate"]]
    print(f"[vaccination] {len(result)} districts loaded.")
    return result


# ─────────────────────────────────────────────────────────────────────────────
# STEP 6 — Unemployment proxy
#           Source: works_pop_edu.csv  (Census  Table B-03)
# ─────────────────────────────────────────────────────────────────────────────


def load_unemployment():
    """
    works_pop_edu.csv is a wide Census table with 7 header rows.
    We skip to row 7 and use positional columns:
      col[3]  → area name
      col[4]  → Total / Rural / Urban
      col[5]  → Educational level (we want "Total" = all education levels)
      col[6]  → Total population
      col[15] → Non-workers (total)
      col[18] → Non-workers seeking / available for work  ← our proxy

    Unemployment proxy = non-workers seeking work / total population × 100
    This is not formal unemployment; it captures latent labour underutilisation.
    """
    edu = pd.read_csv(p("works_pop_edu.csv"), header=None, skiprows=7)

    district_pattern = "|".join(EXPECTED_DISTRICTS)

    mask = (
        edu[3].astype(str).str.contains(district_pattern, case=False, na=False)
        & (edu[4].astype(str).str.strip() == "Total")
        & (edu[5].astype(str).str.strip() == "Total")
    )
    edu_d = edu[mask][[3, 6, 15, 18]].copy()
    edu_d.columns = ["District", "Total_Pop", "NonWorkers", "NonWorkers_Seeking"]

    # Strip "District -" prefix
    edu_d["District"] = (
        edu_d["District"].str.replace("District -", "", regex=False).str.strip()
    )

    for col in ["Total_Pop", "NonWorkers", "NonWorkers_Seeking"]:
        edu_d[col] = clean_numeric(edu_d[col])

    edu_d["unemployment_proxy"] = (
        edu_d["NonWorkers_Seeking"] / edu_d["Total_Pop"] * 100
    ).round(2)

    result = strip_district_names(edu_d)[["District", "unemployment_proxy"]]
    print(f"[unemployment] {len(result)} districts loaded.")
    return result


# ─────────────────────────────────────────────────────────────────────────────
# STEP 7 — Compute vulnerability score
# ─────────────────────────────────────────────────────────────────────────────


def compute_vulnerability(df, config=VULNERABILITY_CONFIG):
    """
    Composite vulnerability index using min-max scaling.

    Algorithm:
      1. For each indicator column, scale values to [0, 1] using min-max.
      2. If invert=True (higher = safer), flip:  scaled = 1 - scaled
      3. Multiply each scaled column by its weight.
      4. Take the weighted mean across all indicators.
      5. Multiply by 100 → final score in [0, 100].

    Higher score = more vulnerable.

    This function is intentionally kept separate so you can call it with a
    custom config without touching the data loading steps.
    """
    feature_cols = [c["column"] for c in config]

    # Validate all columns exist
    missing = [c for c in feature_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns for vulnerability: {missing}")

    features = df[feature_cols].copy().astype(float)

    # Min-max scale each column
    scaler = MinMaxScaler()
    scaled = pd.DataFrame(
        scaler.fit_transform(features),
        columns=feature_cols,
        index=df.index,
    )

    # Invert where higher = safer
    for cfg in config:
        if cfg["invert"]:
            scaled[cfg["column"]] = 1 - scaled[cfg["column"]]

    # Weighted mean
    weights = np.array([c["weight"] for c in config], dtype=float)
    weights = weights / weights.sum()  # normalise
    vuln_raw = scaled[feature_cols].values @ weights  # dot product
    df = df.copy()
    df["vulnerability"] = (vuln_raw * 100).round(1)

    print(
        f"\n[vulnerability] Score range: "
        f"{df['vulnerability'].min()} – {df['vulnerability'].max()}"
    )
    print(
        df[["district", "vulnerability"]]
        .sort_values("vulnerability", ascending=False)
        .to_string(index=False)
    )
    return df


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────


def main():
    print("=" * 60)
    print("Kerala RiskWatch — districts.csv generator")
    print("=" * 60)

    # ── Load all sources ──────────────────────────────────────────
    pop = (
        load_population()
    )  # District, Population, Area_sqkm, Density, rural_pop, urban_pop, rural_pct, urban_pct
    lit = load_literacy()  # District, literacy_rate
    hc = load_healthcare()  # District, hospitals, hospital_beds, icu_beds, ventilators
    inc = load_income()  # District, GDDP_Lakhs, Percent_of_Total
    vax = load_vaccination()  # District, total_doses, vaccinated_persons, vax_rate
    unemp = load_unemployment()  # District, unemployment_proxy

    # ── Merge on 'District' ───────────────────────────────────────
    print("\n[merge] Joining all sources...")
    df = pop.copy()
    df = df.merge(lit, on="District", how="left")
    df = df.merge(hc, on="District", how="left")
    df = df.merge(inc, on="District", how="left")
    df = df.merge(vax, on="District", how="left")
    df = df.merge(unemp, on="District", how="left")

    # ── Derived columns ───────────────────────────────────────────
    df["beds_per_1000"] = (df["hospital_beds"] / df["Population"] * 1000).round(3)
    df["icu_beds_per_1000"] = (df["icu_beds"] / df["Population"] * 1000).round(3)
    df["gddp_per_capita"] = (df["GDDP_Lakhs"] * 100_000 / df["Population"]).round(0)

    # ── Rename to clean snake_case ────────────────────────────────
    df = df.rename(
        columns={
            "District": "district",
            "Population": "population",
            "Area_sqkm": "area_sqkm",
            "Density": "density",
            "GDDP_Lakhs": "gddp_lakhs",
            "Percent_of_Total": "gddp_pct",
        }
    )

    # ── Select and order final columns ────────────────────────────
    final_cols = [
        "district",
        "population",
        "area_sqkm",
        "density",
        "rural_pop",
        "urban_pop",
        "rural_pct",
        "urban_pct",
        "literacy_rate",
        "hospitals",
        "hospital_beds",
        "icu_beds",
        "icu_beds_per_1000",
        "ventilators",
        "beds_per_1000",
        "gddp_lakhs",
        "gddp_pct",
        "gddp_per_capita",
        "vax_rate",
        "unemployment_proxy",
    ]
    df = df[final_cols]

    # ── Compute vulnerability score ───────────────────────────────
    df = compute_vulnerability(df)

    # ── Validation ────────────────────────────────────────────────
    print("\n[validation] Checking for missing values...")
    nulls = df.isnull().sum()
    nulls = nulls[nulls > 0]
    if len(nulls):
        print("  WARNING — null values found:")
        print(nulls.to_string())
    else:
        print("  OK — no null values.")

    missing_districts = set(EXPECTED_DISTRICTS) - set(df["district"])
    if missing_districts:
        print(f"  WARNING — missing districts: {missing_districts}")
    else:
        print(f"  OK — all {len(df)} expected districts present.")

    # ── Write output ──────────────────────────────────────────────
    df.to_csv(OUTPUT_FILE, index=False)
    print(
        f"\n[output] Written to: {OUTPUT_FILE}  ({len(df)} rows × {len(df.columns)} columns)"
    )
    print("\nColumn list:")
    for col in df.columns:
        print(f"  {col}")


if __name__ == "__main__":
    main()
