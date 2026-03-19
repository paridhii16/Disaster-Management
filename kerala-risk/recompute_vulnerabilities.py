#!/usr/bin/env python3
"""
Recompute vulnerability scores in districts.csv using the same indicator logic
as the frontend vulnerability engine.

Indicators used (equal weight):
- literacy_rate            (invert=True)
- beds_per_1000            (invert=True)
- icu_beds_per_1000        (invert=True)
- density                  (invert=False)
- urban_pct                (invert=False)
- gddp_per_capita          (invert=True)
- unemployment_proxy       (invert=False)

Usage:
  python3 recompute_vulnerabilities.py \
      --input public/data/districts.csv \
      --in-place

  python3 recompute_vulnerabilities.py \
      --input public/data/districts.csv \
      --output public/data/districts.recomputed.csv
"""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Dict, List

import pandas as pd


VULNERABILITY_CONFIG: List[Dict[str, object]] = [
    {"column": "literacy_rate", "invert": True, "weight": 1.0},
    {"column": "beds_per_1000", "invert": True, "weight": 1.0},
    {"column": "icu_beds_per_1000", "invert": True, "weight": 1.0},
    {"column": "density", "invert": False, "weight": 1.0},
    {"column": "urban_pct", "invert": False, "weight": 1.0},
    {"column": "gddp_per_capita", "invert": True, "weight": 1.0},
    {"column": "unemployment_proxy", "invert": False, "weight": 1.0},
]


def min_max_scale(series: pd.Series) -> pd.Series:
    minimum = series.min()
    maximum = series.max()
    span = maximum - minimum
    if pd.isna(span) or span == 0:
        return pd.Series([0.0] * len(series), index=series.index, dtype=float)
    return (series - minimum) / span


def ensure_icu_per_1000(df: pd.DataFrame) -> pd.DataFrame:
    if "icu_beds_per_1000" in df.columns:
        df["icu_beds_per_1000"] = pd.to_numeric(
            df["icu_beds_per_1000"], errors="coerce"
        )

    if "icu_beds_per_1000" not in df.columns or df["icu_beds_per_1000"].isna().any():
        if "icu_beds" not in df.columns or "population" not in df.columns:
            raise ValueError(
                "Missing columns required to derive icu_beds_per_1000: "
                "need icu_beds and population"
            )
        icu_beds = pd.to_numeric(df["icu_beds"], errors="coerce")
        population = pd.to_numeric(df["population"], errors="coerce")
        derived = (icu_beds / population) * 1000
        if "icu_beds_per_1000" in df.columns:
            df["icu_beds_per_1000"] = df["icu_beds_per_1000"].fillna(derived)
        else:
            df["icu_beds_per_1000"] = derived

    df["icu_beds_per_1000"] = df["icu_beds_per_1000"].round(3)
    return df


def recompute_vulnerability(df: pd.DataFrame) -> pd.DataFrame:
    df = ensure_icu_per_1000(df.copy())

    feature_columns = [cfg["column"] for cfg in VULNERABILITY_CONFIG]

    missing = [c for c in feature_columns if c not in df.columns]
    if missing:
        raise ValueError(
            f"Missing required columns for vulnerability recompute: {missing}"
        )

    scaled = pd.DataFrame(index=df.index)
    for cfg in VULNERABILITY_CONFIG:
        col = str(cfg["column"])
        invert = bool(cfg["invert"])
        values = pd.to_numeric(df[col], errors="coerce")
        if values.isna().any():
            raise ValueError(
                f"Column '{col}' has non-numeric or missing values; clean input first."
            )
        s = min_max_scale(values)
        scaled[col] = (1 - s) if invert else s

    weights = pd.Series(
        [float(cfg["weight"]) for cfg in VULNERABILITY_CONFIG],
        index=feature_columns,
        dtype=float,
    )
    weights = weights / weights.sum()

    vuln_raw = scaled[feature_columns].mul(weights, axis=1).sum(axis=1)
    df["vulnerability"] = (vuln_raw * 100).round(1)

    return df


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Recompute vulnerability in districts CSV"
    )
    parser.add_argument(
        "--input",
        required=True,
        help="Input CSV path (e.g., public/data/districts.csv)",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Output CSV path. If omitted, use --in-place",
    )
    parser.add_argument(
        "--in-place",
        action="store_true",
        help="Overwrite input file with recomputed vulnerability",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    if not args.in_place and not args.output:
        raise ValueError("Provide --output or use --in-place")

    output_path = input_path if args.in_place else Path(args.output)

    df = pd.read_csv(input_path)
    result = recompute_vulnerability(df)
    result.to_csv(output_path, index=False)

    print(f"Recomputed vulnerability for {len(result)} rows")
    print(
        f"Score range: {result['vulnerability'].min():.1f} – "
        f"{result['vulnerability'].max():.1f}"
    )
    print(f"Written: {output_path}")


if __name__ == "__main__":
    main()
