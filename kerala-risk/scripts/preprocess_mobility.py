#!/usr/bin/env python3
"""
Preprocess Google Community Mobility Reports (India files) into Kerala district-level
features suitable for Kerala RiskWatch.

Inputs:
  - data/2021_IN_Region_Mobility_Report.csv
  - data/2022_IN_Region_Mobility_Report.csv

Outputs:
  - kerala-risk/public/data/kerala_mobility_monthly.csv
  - kerala-risk/public/data/kerala_mobility_summary.csv

Usage:
  /usr/bin/python3 kerala-risk/scripts/preprocess_mobility.py
"""

from __future__ import annotations

from pathlib import Path
import pandas as pd


ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
OUT_DIR = ROOT / "kerala-risk" / "public" / "data"

INPUT_FILES = [
    DATA_DIR / "2021_IN_Region_Mobility_Report.csv",
    DATA_DIR / "2022_IN_Region_Mobility_Report.csv",
]

KERALA_DISTRICTS = {
    "Alappuzha",
    "Ernakulam",
    "Idukki",
    "Kannur",
    "Kasaragod",
    "Kollam",
    "Kottayam",
    "Kozhikode",
    "Malappuram",
    "Palakkad",
    "Pathanamthitta",
    "Thiruvananthapuram",
    "Thrissur",
    "Wayanad",
}

METRIC_COLS = [
    "retail_and_recreation_percent_change_from_baseline",
    "grocery_and_pharmacy_percent_change_from_baseline",
    "parks_percent_change_from_baseline",
    "transit_stations_percent_change_from_baseline",
    "workplaces_percent_change_from_baseline",
    "residential_percent_change_from_baseline",
]


def load_rows() -> pd.DataFrame:
    frames = []
    usecols = [
        "country_region_code",
        "country_region",
        "sub_region_1",
        "sub_region_2",
        "date",
        *METRIC_COLS,
    ]

    for file_path in INPUT_FILES:
        if not file_path.exists():
            raise FileNotFoundError(f"Missing input file: {file_path}")
        frames.append(pd.read_csv(file_path, usecols=usecols, low_memory=False))

    df = pd.concat(frames, ignore_index=True)
    df = df[(df["country_region_code"] == "IN") & (df["sub_region_1"] == "Kerala")]
    df = df[df["sub_region_2"].notna() & (df["sub_region_2"].str.strip() != "")]
    df = df[df["sub_region_2"].isin(KERALA_DISTRICTS)]

    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df[df["date"].notna()]

    for col in METRIC_COLS:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    return df


def build_monthly(df: pd.DataFrame) -> pd.DataFrame:
    temp = df.copy()
    temp["month"] = temp["date"].dt.to_period("M").astype(str)

    monthly = (
        temp.groupby(["sub_region_2", "month"], as_index=False)[METRIC_COLS]
        .mean(numeric_only=True)
        .rename(columns={"sub_region_2": "district"})
        .round(2)
    )

    # Composite mobility activity index:
    # Higher means more out-of-home mobility relative to baseline.
    monthly["mobility_activity_index"] = (
        monthly[
            [
                "retail_and_recreation_percent_change_from_baseline",
                "grocery_and_pharmacy_percent_change_from_baseline",
                "parks_percent_change_from_baseline",
                "transit_stations_percent_change_from_baseline",
                "workplaces_percent_change_from_baseline",
            ]
        ]
        .mean(axis=1)
        .round(2)
    )

    # Residential typically moves opposite to outside movement; useful for checking behavior shifts.
    monthly["stay_home_index"] = monthly[
        "residential_percent_change_from_baseline"
    ].round(2)

    monthly = monthly.sort_values(["district", "month"]).reset_index(drop=True)
    return monthly


def build_summary(monthly: pd.DataFrame) -> pd.DataFrame:
    summary = (
        monthly.groupby("district", as_index=False)[
            [
                "mobility_activity_index",
                "stay_home_index",
                "retail_and_recreation_percent_change_from_baseline",
                "workplaces_percent_change_from_baseline",
                "transit_stations_percent_change_from_baseline",
            ]
        ]
        .mean(numeric_only=True)
        .round(2)
    )

    summary = summary.rename(
        columns={
            "retail_and_recreation_percent_change_from_baseline": "avg_retail_change",
            "workplaces_percent_change_from_baseline": "avg_workplace_change",
            "transit_stations_percent_change_from_baseline": "avg_transit_change",
        }
    )

    # Risk-oriented feature (higher -> potentially higher contact opportunity)
    # Shift and scale to 0-100 for easier consumption by UI/modeling.
    min_val = summary["mobility_activity_index"].min()
    max_val = summary["mobility_activity_index"].max()
    rng = max_val - min_val if max_val != min_val else 1.0
    summary["mobility_exposure_score"] = (
        ((summary["mobility_activity_index"] - min_val) / rng) * 100
    ).round(1)

    summary = summary.sort_values("mobility_exposure_score", ascending=False).reset_index(
        drop=True
    )
    return summary


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    raw = load_rows()
    monthly = build_monthly(raw)
    summary = build_summary(monthly)

    monthly_out = OUT_DIR / "kerala_mobility_monthly.csv"
    summary_out = OUT_DIR / "kerala_mobility_summary.csv"

    monthly.to_csv(monthly_out, index=False)
    summary.to_csv(summary_out, index=False)

    print(f"Rows loaded (Kerala district-day): {len(raw)}")
    print(f"Districts covered: {raw['sub_region_2'].nunique()}")
    print(f"Date range: {raw['date'].min().date()} to {raw['date'].max().date()}")
    print(f"Wrote: {monthly_out}")
    print(f"Wrote: {summary_out}")


if __name__ == "__main__":
    main()
