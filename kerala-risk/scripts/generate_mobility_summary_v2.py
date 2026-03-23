#!/usr/bin/env python3
"""
Generate a district-level mobility exposure summary from Kerala mobility proxies.

Inputs (from public/data):
  - districts.csv                         (population + district list)
  - kerala_air_mobility.csv              (District, Total)
  - kerala_tourism.csv                   (District, FTV, DTV)
  - kerala_vehicles_total.csv            (District, Total)

Output:
  - kerala_mobility_summary_v2.csv

Scoring (bias-aware + min-max):
  1) For each source, compute:
       - min-max(total)
       - min-max(per-capita rate)
       source_index = 0.5 * total_norm + 0.5 * per_capita_norm
  2) Final mobility exposure score = average of 3 source indices * 100
"""

from __future__ import annotations

from pathlib import Path
import re
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "public" / "data"

DISTRICTS_FILE = DATA_DIR / "districts.csv"
AIR_FILE = DATA_DIR / "kerala_air_mobility.csv"
TOURISM_FILE = DATA_DIR / "kerala_tourism.csv"
VEHICLES_TOTAL_FILE = DATA_DIR / "kerala_vehicles_total.csv"

OUT_FILE = DATA_DIR / "kerala_mobility_summary_v2.csv"


def norm_name(value: str) -> str:
    text = str(value).strip().upper()
    return re.sub(r"[^A-Z]", "", text)


def min_max(series: pd.Series) -> pd.Series:
    values = pd.to_numeric(series, errors="coerce")
    low = values.min()
    high = values.max()
    span = high - low
    if pd.isna(span) or span == 0:
        return pd.Series([0.0] * len(values), index=values.index, dtype=float)
    return (values - low) / span


def fill_median(series: pd.Series) -> tuple[pd.Series, pd.Series]:
    values = pd.to_numeric(series, errors="coerce")
    missing = values.isna()
    median_value = values.median()
    if pd.isna(median_value):
        median_value = 0.0
    return values.fillna(median_value), missing


def load_district_population() -> pd.DataFrame:
    districts = pd.read_csv(DISTRICTS_FILE)
    districts["district"] = districts["district"].astype(str).str.strip()
    districts["district_key"] = districts["district"].map(norm_name)
    districts["population"] = pd.to_numeric(districts["population"], errors="coerce")
    districts = districts[
        (districts["district_key"] != "") & (districts["population"] > 0)
    ]
    return districts[["district", "district_key", "population"]].drop_duplicates(
        "district_key"
    )


def load_air() -> pd.DataFrame:
    air = pd.read_csv(AIR_FILE)
    air["district"] = air["District"].astype(str).str.strip()
    air = air[air["district"].str.upper() != "TOTAL"]
    air["district_key"] = air["district"].map(norm_name)
    air["air_total"] = pd.to_numeric(air["Total"], errors="coerce")
    return air[["district_key", "air_total"]]


def load_tourism() -> pd.DataFrame:
    tourism = pd.read_csv(TOURISM_FILE)
    tourism["district"] = tourism["District"].astype(str).str.strip()
    tourism = tourism[tourism["district"].str.upper() != "TOTAL"]
    tourism["district_key"] = tourism["district"].map(norm_name)
    tourism["tourism_total"] = pd.to_numeric(
        tourism["Foreign Tourist Visits (FTV)"], errors="coerce"
    ).fillna(0) + pd.to_numeric(
        tourism["Domestic Tourist Visits (DTV)"], errors="coerce"
    ).fillna(
        0
    )
    return tourism[["district_key", "tourism_total"]]


def load_vehicles_total() -> pd.DataFrame:
    vehicles = pd.read_csv(VEHICLES_TOTAL_FILE)
    vehicles["district"] = vehicles["District"].astype(str).str.strip()
    vehicles = vehicles[vehicles["district"].str.upper() != "TOTAL"]
    vehicles["district_key"] = vehicles["district"].map(norm_name)
    vehicles["vehicles_total"] = pd.to_numeric(vehicles["Total"], errors="coerce")
    return vehicles[["district_key", "vehicles_total"]]


def main() -> None:
    districts = load_district_population()
    merged = (
        districts.merge(load_air(), on="district_key", how="left")
        .merge(load_tourism(), on="district_key", how="left")
        .merge(load_vehicles_total(), on="district_key", how="left")
    )

    merged["air_total"], air_imputed = fill_median(merged["air_total"])
    merged["tourism_total"], tourism_imputed = fill_median(merged["tourism_total"])
    merged["vehicles_total"], vehicles_imputed = fill_median(merged["vehicles_total"])

    merged["air_per_100k"] = (merged["air_total"] / merged["population"]) * 100000
    merged["tourism_per_100k"] = (
        merged["tourism_total"] / merged["population"]
    ) * 100000
    merged["vehicles_per_1000"] = (
        merged["vehicles_total"] / merged["population"]
    ) * 1000

    merged["air_index"] = 0.5 * min_max(merged["air_total"]) + 0.5 * min_max(
        merged["air_per_100k"]
    )
    merged["tourism_index"] = 0.5 * min_max(merged["tourism_total"]) + 0.5 * min_max(
        merged["tourism_per_100k"]
    )
    merged["vehicles_index"] = 0.5 * min_max(merged["vehicles_total"]) + 0.5 * min_max(
        merged["vehicles_per_1000"]
    )

    merged["mobility_exposure_score"] = (
        (merged["air_index"] + merged["tourism_index"] + merged["vehicles_index"])
        / 3.0
        * 100
    ).round(2)

    merged["avg_retail_change"] = 0.0
    merged["avg_workplace_change"] = 0.0
    merged["avg_transit_change"] = 0.0

    merged["air_total_imputed"] = air_imputed.astype(str).str.lower()
    merged["tourism_total_imputed"] = tourism_imputed.astype(str).str.lower()
    merged["vehicles_total_imputed"] = vehicles_imputed.astype(str).str.lower()

    output = merged[
        [
            "district",
            "mobility_exposure_score",
            "air_total",
            "vehicles_total",
            "tourism_total",
        ]
    ].copy()

    output = output.rename(
        columns={
            "air_total": "air_traffic_total",
            "vehicles_total": "total_vehicles",
            "tourism_total": "total_tourism",
        }
    )

    output = output.sort_values("mobility_exposure_score", ascending=False)

    output.to_csv(OUT_FILE, index=False)

    print(f"Wrote: {OUT_FILE}")
    print(f"Districts: {len(output)}")
    print(
        "Mobility score range: "
        f"{output['mobility_exposure_score'].min():.1f} – "
        f"{output['mobility_exposure_score'].max():.1f}"
    )


if __name__ == "__main__":
    main()
