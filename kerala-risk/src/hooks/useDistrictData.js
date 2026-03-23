import { useState, useEffect } from "react";
import { loadCSV } from "../utils/csvLoader";
import { computeVulnerability } from "../utils/vulnerability";
import { computeExposureMetrics } from "../utils/exposure";

const ENTERPRISE_DISTRICT_ALIASES = {
  tvm: "Thiruvananthapuram",
};

function normalizeDistrictName(name) {
  const normalized = String(name || "").trim();
  const key = normalized.toLowerCase();
  return ENTERPRISE_DISTRICT_ALIASES[key] || normalized;
}

/**
 * Central data hook.
 *
 * Loads districts.csv (pre-processed, see /public/data/README.md).
 * The CSV contains one row per district with all merged indicators.
 *
 * Returns: { districts, loading, error }
 *
 * districts[] — array of plain objects, one per district.
 * Each object has all columns from districts.csv as camelCase keys.
 *
 * To swap in a different state / dataset:
 *  1. Replace public/data/districts.csv with your processed CSV
 *  2. Update VULNERABILITY_CONFIG in utils/vulnerability.js
 *  3. Update DISTRICT_PATHS in utils/districtPaths.js with new geometries
 */
export function useDistrictData() {
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [rows, mobilityRows, enterpriseRows] = await Promise.all([
          loadCSV("districts.csv"),
          loadCSV("kerala_mobility_summary_v2.csv")
            .catch(() => loadCSV("kerala_mobility_summary.csv"))
            .catch(() => []),
          loadCSV("district-wise-enterprises-data.csv").catch(() => []),
        ]);

        const mobilityByDistrict = new Map(
          mobilityRows.map((row) => [
            row.district,
            {
              mobility_exposure_score: Number(row.mobility_exposure_score),
              air_traffic_total: Number(
                row.air_traffic_total ?? row.air_total ?? 0,
              ),
              total_vehicles: Number(
                row.total_vehicles ?? row.vehicles_total ?? 0,
              ),
              total_tourism: Number(
                row.total_tourism ?? row.tourism_total ?? 0,
              ),
            },
          ]),
        );

        const investmentByDistrict = new Map(
          enterpriseRows.map((row) => {
            const district = normalizeDistrictName(
              row.District || row.district,
            );
            return [district, Number(row["Investment Rs in Crore"] || 0)];
          }),
        );

        // Numeric coercion safety pass
        const clean = rows.map((r) => ({
          ...r,
          population: Number(r.population),
          area_sqkm: Number(r.area_sqkm),
          density: Number(r.density),
          rural_pop: Number(r.rural_pop),
          urban_pop: Number(r.urban_pop),
          rural_pct: Number(r.rural_pct),
          urban_pct: Number(r.urban_pct),
          literacy_rate: Number(r.literacy_rate),
          hospitals: Number(r.hospitals),
          hospital_beds: Number(r.hospital_beds),
          icu_beds: Number(r.icu_beds),
          icu_beds_per_1000: Number(r.icu_beds_per_1000),
          ventilators: Number(r.ventilators),
          beds_per_1000: Number(r.beds_per_1000),
          gddp_lakhs: Number(r.gddp_lakhs),
          gddp_pct: Number(r.gddp_pct),
          gddp_per_capita: Number(r.gddp_per_capita),
          vax_rate: Number(r.vax_rate),
          unemployment_proxy: Number(r.unemployment_proxy),
          vulnerability: Number(r.vulnerability),
          ...(mobilityByDistrict.get(r.district) || {
            mobility_exposure_score: 0,
            air_traffic_total: 0,
            total_vehicles: 0,
            total_tourism: 0,
            avg_retail_change: 0,
            avg_workplace_change: 0,
            avg_transit_change: 0,
          }),
          investment_core_crore: Number(
            investmentByDistrict.get(r.district) || 0,
          ),
        }));
        const withDerivedIcu = clean.map((district) => ({
          ...district,
          icu_beds_per_1000:
            Number.isFinite(district.icu_beds_per_1000) &&
            district.icu_beds_per_1000 > 0
              ? district.icu_beds_per_1000
              : (district.icu_beds / (district.population || 1)) * 1000,
        }));
        const withExposure = computeExposureMetrics(withDerivedIcu);
        setDistricts(computeVulnerability(withExposure));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { districts, loading, error };
}
