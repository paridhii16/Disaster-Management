import React, { useState, useMemo, useCallback } from "react";
import DiseaseMap from "../components/DiseaseMap";
import SEIRChart from "../components/SEIRChart";
import ParameterPanel from "../components/ParameterPanel";
import {
  runSEIR,
  computeDiseaseRisk,
  DISEASE_PRESETS,
  DEFAULT_PARAMS,
} from "../utils/seir";
import { computeVulnerability } from "../utils/vulnerability";

export default function DiseasePage({ districts }) {
  const [diseaseKey, setDiseaseKey] = useState("covid");
  // Global params: used when no district is selected; base defaults for districts
  const [globalParams, setGlobalParams] = useState(DEFAULT_PARAMS.covid);
  // Per-district overrides: Map<districtName, fullPanelParams>
  const [districtOverrides, setDistrictOverrides] = useState(() => new Map());
  const [selectedDistrict, setSelectedDistrict] = useState(null);

  function handleDiseaseChange(key) {
    setDiseaseKey(key);
    setGlobalParams(DEFAULT_PARAMS[key] || DEFAULT_PARAMS.covid);
    setDistrictOverrides(new Map());
    setSelectedDistrict(null);
  }

  const handleSelect = useCallback(
    (d) =>
      setSelectedDistrict((prev) =>
        prev?.district === d?.district ? null : d,
      ),
    [],
  );

  const preset = DISEASE_PRESETS[diseaseKey];
  const maxDensity = useMemo(
    () => districts.reduce((m, d) => Math.max(m, d.density || 0), 1),
    [districts],
  );

  const getIcuBedsPer1000 = useCallback(
    (d) =>
      d?.population && d?.icu_beds != null
        ? (Number(d.icu_beds) * 1000) / Number(d.population)
        : 0,
    [],
  );

  // State-level aggregate from CSV as arithmetic mean across districts
  const stateBaseline = useMemo(() => {
    const districtCount = districts.length || 1;
    const totalPop =
      districts.reduce((s, d) => s + (d.population || 0), 0) || 1;
    const mean = (k) =>
      districts.reduce((s, d) => s + (d[k] || 0), 0) / districtCount;
    const meanIcuPer1000 =
      districts.reduce((s, d) => s + getIcuBedsPer1000(d), 0) / districtCount;
    return {
      district: "Kerala (State)",
      population: totalPop,
      density: mean("density"),
      beds_per_1000: mean("beds_per_1000"),
      icu_beds_per_1000: meanIcuPer1000,
      gddp_per_capita: mean("gddp_per_capita"),
      literacy_rate: mean("literacy_rate"),
      rural_pct: mean("rural_pct"),
      urban_pct: mean("urban_pct"),
      unemployment_proxy: mean("unemployment_proxy"),
      vulnerability: mean("vulnerability"),
    };
  }, [districts, getIcuBedsPer1000]);

  const selectedRawDistrict = useMemo(
    () =>
      selectedDistrict
        ? districts.find((d) => d.district === selectedDistrict.district)
        : null,
    [selectedDistrict, districts],
  );

  // The reference district record (CSV values) for the active view
  const activeBaseline = selectedRawDistrict || stateBaseline;

  // ── Panel params: what the panel reads & edits ──────────────────────────
  // Vuln absolute defaults come from the active district's CSV values.
  // If district has stored overrides, they win. At state level, globalParams
  // may also store user-modified vuln abs values.
  const panelParams = useMemo(() => {
    if (selectedDistrict) {
      const stored = districtOverrides.get(selectedDistrict.district);
      if (stored) return stored;
      // First visit to this district: inherit global pathogen settings + district CSV vuln defaults
      return {
        ...globalParams,
        vulnHospitalBedsAbsolute:
          selectedRawDistrict?.beds_per_1000 ?? stateBaseline.beds_per_1000,
        vulnIcuBedsAbsolute:
          getIcuBedsPer1000(selectedRawDistrict) ||
          stateBaseline.icu_beds_per_1000,
        vulnGdpAbsolute:
          selectedRawDistrict?.gddp_per_capita ?? stateBaseline.gddp_per_capita,
        vulnLiteracyAbsolute:
          selectedRawDistrict?.literacy_rate ?? stateBaseline.literacy_rate,
        vulnUrbanPctAbsolute:
          selectedRawDistrict?.urban_pct ?? stateBaseline.urban_pct,
        vulnEmploymentAbsolute:
          selectedRawDistrict?.unemployment_proxy ??
          stateBaseline.unemployment_proxy,
        densityAbsolute: selectedRawDistrict?.density ?? stateBaseline.density,
      };
    }
    // State level: use globalParams, falling back to stateBaseline for vuln abs
    return {
      ...globalParams,
      vulnHospitalBedsAbsolute:
        globalParams.vulnHospitalBedsAbsolute ?? stateBaseline.beds_per_1000,
      vulnIcuBedsAbsolute:
        globalParams.vulnIcuBedsAbsolute ?? stateBaseline.icu_beds_per_1000,
      vulnGdpAbsolute:
        globalParams.vulnGdpAbsolute ?? stateBaseline.gddp_per_capita,
      vulnLiteracyAbsolute:
        globalParams.vulnLiteracyAbsolute ?? stateBaseline.literacy_rate,
      vulnUrbanPctAbsolute:
        globalParams.vulnUrbanPctAbsolute ?? stateBaseline.urban_pct,
      vulnEmploymentAbsolute:
        globalParams.vulnEmploymentAbsolute ?? stateBaseline.unemployment_proxy,
      densityAbsolute: globalParams.densityAbsolute ?? stateBaseline.density,
    };
  }, [
    selectedDistrict,
    districtOverrides,
    globalParams,
    selectedRawDistrict,
    stateBaseline,
    getIcuBedsPer1000,
  ]);

  // ── Handle param changes ──────────────────────────────────────────────────
  // FIX: ALL changes go to districtOverrides when district selected, or to
  // globalParams when at state level — no stripping of vuln abs fields.
  const handleParamChange = useCallback(
    (newParams) => {
      if (selectedDistrict) {
        setDistrictOverrides((prev) => {
          const next = new Map(prev);
          next.set(selectedDistrict.district, newParams);
          return next;
        });
      } else {
        // Store full params including vuln abs in globalParams (state level)
        setGlobalParams(newParams);
      }
    },
    [selectedDistrict],
  );

  const handleResetDistrict = useCallback(() => {
    if (!selectedDistrict) return;
    setDistrictOverrides((prev) => {
      const next = new Map(prev);
      next.delete(selectedDistrict.district);
      return next;
    });
  }, [selectedDistrict]);

  // ── BASELINE risk (global defaults, original CSV data, all districts) ──────
  const vulnerabilityAlignedDistricts = useMemo(
    () => computeVulnerability(districts),
    [districts],
  );

  const baselineResults = useMemo(
    () =>
      computeDiseaseRisk(vulnerabilityAlignedDistricts, {
        ...globalParams,
        bedsWeight: 1,
        gdpWeight: 1,
        literacyWeight: 1,
        densityScale: 1,
      }),
    [vulnerabilityAlignedDistricts, globalParams],
  );

  // ── ACTIVE risk ────────────────────────────────────────────────────────────
  // Apply and persist recalculated scores for every district that has overrides.
  const enrichedDistricts = useMemo(() => {
    if (!districtOverrides.size) return baselineResults;

    const resultByDistrict = new Map(
      baselineResults.map((districtRisk) => [
        districtRisk.district,
        districtRisk,
      ]),
    );

    districtOverrides.forEach((override, districtName) => {
      const targetDistrict = districts.find((d) => d.district === districtName);
      if (!targetDistrict) return;

      const modifiedDistricts = districts.map((d) => {
        if (d.district !== districtName) return d;

        const hospitalBedsPer1000 =
          override.vulnHospitalBedsAbsolute ??
          override.vulnBedsAbsolute ??
          d.beds_per_1000;
        const icuBedsPer1000 =
          override.vulnIcuBedsAbsolute ?? getIcuBedsPer1000(d);

        return {
          ...d,
          beds_per_1000: hospitalBedsPer1000,
          hospital_beds: Math.round(
            (hospitalBedsPer1000 * d.population) / 1000,
          ),
          icu_beds: Math.round((icuBedsPer1000 * d.population) / 1000),
          gddp_per_capita: override.vulnGdpAbsolute ?? d.gddp_per_capita,
          literacy_rate: override.vulnLiteracyAbsolute ?? d.literacy_rate,
          urban_pct: override.vulnUrbanPctAbsolute ?? d.urban_pct,
          unemployment_proxy:
            override.vulnEmploymentAbsolute ?? d.unemployment_proxy,
          density: override.densityAbsolute ?? d.density,
        };
      });

      const overrideRiskParams = {
        beta: override.beta ?? globalParams.beta,
        interventionRate:
          override.interventionRate ?? globalParams.interventionRate,
        ifr: override.ifr ?? globalParams.ifr,
        bedsWeight: 1,
        gdpWeight: 1,
        literacyWeight: 1,
        densityScale: 1,
      };

      const overrideResults = computeDiseaseRisk(
        computeVulnerability(modifiedDistricts),
        overrideRiskParams,
      );
      const overriddenDistrict = overrideResults.find(
        (districtRisk) => districtRisk.district === districtName,
      );
      if (overriddenDistrict) {
        resultByDistrict.set(districtName, overriddenDistrict);
      }
    });

    return baselineResults.map(
      (districtRisk) =>
        resultByDistrict.get(districtRisk.district) || districtRisk,
    );
  }, [
    baselineResults,
    districtOverrides,
    districts,
    globalParams,
    getIcuBedsPer1000,
  ]);

  // ── SEIR target ─────────────────────────────────────────────────────────────
  const target = useMemo(() => {
    if (selectedDistrict) {
      return (
        enrichedDistricts.find(
          (d) => d.district === selectedDistrict.district,
        ) || enrichedDistricts[0]
      );
    }
    return {
      district: "Kerala (State)",
      population: stateBaseline.population,
      density: Math.round(stateBaseline.density),
    };
  }, [selectedDistrict, enrichedDistricts, stateBaseline]);

  // ── Run SEIR ────────────────────────────────────────────────────────────────
  const { series, R0 } = useMemo(
    () =>
      runSEIR({
        population: target.population,
        initialI: 10,
        days: panelParams.days,
        beta: panelParams.beta,
        sigma: panelParams.sigma,
        gamma: panelParams.gamma,
        interventionRate: panelParams.interventionRate,
        // FIX #2: densityAbsolute is fully stored in panelParams (per-district or global)
        density: Math.round(
          panelParams.densityAbsolute || target.density || 800,
        ),
      }),
    [target, panelParams],
  );

  const hasDistrictOverride = selectedDistrict
    ? districtOverrides.has(selectedDistrict.district)
    : false;

  const canEditVulnerability = Boolean(selectedDistrict);

  return (
    <div
      style={{ padding: "24px 32px 60px", maxWidth: 1800, margin: "0 auto" }}
    >
      {/* Title */}
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontFamily: "var(--head)",
            fontSize: 22,
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: 5,
          }}
        >
          Disease Spread Simulation
          <span
            style={{
              marginLeft: 14,
              fontSize: 13,
              fontWeight: 400,
              color: "var(--muted)",
              fontFamily: "var(--font)",
            }}
          >
            SEIR Model · Kerala Districts
          </span>
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--muted)",
            maxWidth: 1080,
            lineHeight: 1.65,
          }}
        >
          Tune the active pathogen model, intervention, and district
          vulnerability defaults to compare spread trajectories and
          district-level risk outcomes.
        </div>
      </div>

      {/* Primary controls */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "14px 16px",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 14,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 240, flex: 1 }}>
            <div
              style={{
                fontSize: 10,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: ".7px",
                marginBottom: 6,
              }}
            >
              Active Pathogen
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <select
                value={diseaseKey}
                onChange={(e) => handleDiseaseChange(e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: 240,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "rgba(255,255,255,.03)",
                  color: "var(--text)",
                  fontSize: 13,
                }}
              >
                {Object.entries(DISEASE_PRESETS).map(([key, p]) => (
                  <option key={key} value={key}>
                    {p.label}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: 12, color: "var(--muted)", flex: 1 }}>
                {preset.description}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 260, maxWidth: 460 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: ".7px",
                }}
              >
                Simulated Days
              </div>
              <div
                style={{
                  fontFamily: "var(--head)",
                  fontSize: 14,
                  color: "var(--accent)",
                  fontWeight: 600,
                }}
              >
                {panelParams.days} d
              </div>
            </div>
            <input
              type="range"
              min={30}
              max={365}
              step={1}
              value={panelParams.days}
              onChange={(e) =>
                handleParamChange({
                  ...panelParams,
                  days: parseInt(e.target.value, 10),
                })
              }
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </div>

      {/* Context strip */}
      <div
        style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}
      >
        {[
          { label: "Simulating", value: target.district, color: preset.color },
          { label: "Pathogen", value: preset.label, color: preset.color },
          {
            label: "Effective R₀",
            value: R0.toFixed(2),
            color: parseFloat(R0) > 1 ? "var(--red)" : "var(--teal)",
          },
          {
            label: "Intervention",
            value: `${Math.round(panelParams.interventionRate * 100)}%`,
            color: "var(--teal)",
          },
          hasDistrictOverride
            ? {
                label: "Overrides Active",
                value: selectedDistrict.district,
                color: "var(--amber)",
              }
            : null,
        ]
          .filter(Boolean)
          .map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "7px 15px",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: ".7px",
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontFamily: "var(--head)",
                  fontSize: 14,
                  fontWeight: 600,
                  color,
                }}
              >
                {value}
              </div>
            </div>
          ))}
      </div>

      {/* Main layout */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <DiseaseMap
          districts={enrichedDistricts}
          baselineDistricts={baselineResults}
          selectedDistrict={selectedDistrict}
          onSelect={handleSelect}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 420px",
              alignItems: "start",
              gap: 18,
              minWidth: 0,
            }}
          >
            <SEIRChart
              series={series}
              population={target.population}
              diseaseLabel={preset.label}
              diseaseColor={preset.color}
            />
            <ParameterPanel
              sectionMode="simulation"
              params={panelParams}
              onChange={handleParamChange}
              diseaseKey={diseaseKey}
              onDiseaseChange={handleDiseaseChange}
              onResetDistrict={handleResetDistrict}
              hasDistrictOverride={hasDistrictOverride}
              canEditVulnerability={canEditVulnerability}
              context={{
                district: target.district,
                density: panelParams.densityAbsolute || target.density,
                maxDensity,
                baseline: activeBaseline,
              }}
              currentR0={R0}
            />
          </div>
          <div style={{ marginTop: 18 }}>
            <ParameterPanel
              sectionMode="vulnerability"
              params={panelParams}
              onChange={handleParamChange}
              diseaseKey={diseaseKey}
              onDiseaseChange={handleDiseaseChange}
              onResetDistrict={handleResetDistrict}
              hasDistrictOverride={hasDistrictOverride}
              canEditVulnerability={canEditVulnerability}
              context={{
                district: target.district,
                density: panelParams.densityAbsolute || target.density,
                maxDensity,
                baseline: activeBaseline,
              }}
              currentR0={R0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
