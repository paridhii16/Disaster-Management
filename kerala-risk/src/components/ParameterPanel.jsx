import React, { useState } from "react";
import { DISEASE_PRESETS } from "../utils/seir";

// ── Primitive slider row ──────────────────────────────────────────────────────
function SliderRow({
  label,
  desc,
  value,
  min,
  max,
  step = 0.01,
  format,
  secondary,
  onChange,
  color = "var(--accent)",
  disabled = false,
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          marginBottom: 5,
          alignItems: "baseline",
        }}
      >
        <div>
          <span style={{ color: "var(--text)", fontWeight: 500 }}>{label}</span>
          {desc && (
            <span
              style={{ fontSize: 11, color: "var(--muted)", marginLeft: 7 }}
            >
              {desc}
            </span>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <strong
            style={{
              color,
              fontFamily: "var(--head)",
              fontSize: 14,
              fontWeight: 700,
              display: "block",
              lineHeight: 1.1,
            }}
          >
            {format ? format(value) : value}
          </strong>
          {secondary && (
            <span style={{ fontSize: 10.5, color: "var(--muted)" }}>
              {secondary}
            </span>
          )}
        </div>
      </div>
      {/* Visual bar */}
      <div
        style={{
          position: "relative",
          height: 5,
          background: "rgba(255,255,255,.07)",
          borderRadius: 3,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: 3,
            transition: "width .12s",
          }}
        />
      </div>
      {/* Invisible range input layered on top */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        style={{
          display: "block",
          width: "100%",
          marginTop: -5,
          opacity: disabled ? 0.12 : 0,
          cursor: disabled ? "not-allowed" : "pointer",
          height: 16,
        }}
      />
    </div>
  );
}

// ── Collapsible section wrapper ───────────────────────────────────────────────
function Section({
  title,
  badge,
  badgeColor = "var(--muted)",
  defaultOpen = true,
  open,
  onToggle,
  children,
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = typeof open === "boolean";
  const isOpen = isControlled ? open : internalOpen;

  function handleToggle() {
    if (onToggle) {
      onToggle();
      return;
    }
    setInternalOpen((o) => !o);
  }

  return (
    <div style={{ marginBottom: 4 }}>
      <button
        onClick={handleToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(255,255,255,.035)",
          border: "1px solid var(--border)",
          borderRadius: isOpen ? "8px 8px 0 0" : 8,
          padding: "8px 12px",
          cursor: "pointer",
          color: "var(--text)",
          fontFamily: "var(--font)",
          marginBottom: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: ".8px",
              color: "var(--muted)",
              fontWeight: 600,
            }}
          >
            {title}
          </span>
          {badge && (
            <span
              style={{
                fontSize: 10,
                padding: "1px 7px",
                borderRadius: 10,
                background: `${badgeColor}22`,
                color: badgeColor,
                border: `1px solid ${badgeColor}44`,
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: 12,
            color: "var(--muted)",
            transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform .18s",
          }}
        >
          ▼
        </span>
      </button>
      {isOpen && (
        <div
          style={{
            border: "1px solid var(--border)",
            borderTop: "none",
            borderRadius: "0 0 8px 8px",
            padding: "14px 14px 6px",
            background: "rgba(255,255,255,.015)",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ParameterPanel({
  params,
  onChange,
  diseaseKey,
  onDiseaseChange,
  onResetDistrict,
  hasDistrictOverride,
  canEditVulnerability,
  context,
  currentR0,
  sectionMode = "all",
}) {
  const preset = DISEASE_PRESETS[diseaseKey] || DISEASE_PRESETS.original;

  function set(key) {
    return (val) => onChange({ ...params, [key]: val });
  }

  const density = context?.density || 800;
  const densityFactor = Math.sqrt(Math.max(50, density) / 800);
  const effectiveBeta =
    params.beta * (1 - params.interventionRate) * densityFactor;
  const R0 = Number.isFinite(currentR0)
    ? currentR0
    : effectiveBeta / params.gamma;
  const exposureScore = Number(context?.baseline?.exposure_score) || 0;

  const hospitalBedsDefault = context?.baseline?.beds_per_1000 || 1;
  const icuBedsDefault =
    context?.baseline?.icu_beds_per_1000 ||
    (context?.baseline?.icu_beds && context?.baseline?.population
      ? (context.baseline.icu_beds * 1000) / context.baseline.population
      : 0.03);
  const gdpDefault = context?.baseline?.gddp_per_capita || 1;
  const literacyDefault = context?.baseline?.literacy_rate || 1;
  const urbanPctDefault = context?.baseline?.urban_pct || 0;
  const employmentDefault = context?.baseline?.unemployment_proxy || 0;

  const hospitalBedsValue =
    params.vulnHospitalBedsAbsolute ??
    params.vulnBedsAbsolute ??
    hospitalBedsDefault;
  const icuBedsValue = params.vulnIcuBedsAbsolute ?? icuBedsDefault;
  const gdpValue = params.vulnGdpAbsolute ?? gdpDefault;
  const literacyValue = params.vulnLiteracyAbsolute ?? literacyDefault;
  const urbanPctValue = params.vulnUrbanPctAbsolute ?? urbanPctDefault;
  const employmentValue = params.vulnEmploymentAbsolute ?? employmentDefault;

  const hospitalBedsFactor = hospitalBedsValue / hospitalBedsDefault;
  const icuBedsFactor = icuBedsValue / icuBedsDefault;
  const gdpFactor = gdpValue / gdpDefault;
  const literacyFactor = literacyValue / literacyDefault;
  const urbanPctFactor = urbanPctValue / (urbanPctDefault || 1);
  const employmentFactor = employmentValue / (employmentDefault || 1);
  const densityDefault = context?.baseline?.density || density;
  const densityValue = params.densityAbsolute ?? densityDefault;
  const densityFactorDisplay = densityValue / densityDefault;

  const hospitalBedsMax = 1000;
  const hospitalBedsStep = 0.01;
  const icuBedsMax = 1000;
  const icuBedsStep = 0.001;
  const gdpMax = Math.max(900000, gdpDefault * 3);
  const literacyMax = 100;
  const densityMax = Math.max(3000, densityDefault * 5);

  const r0Value = params.r0 ?? params.beta / (params.gamma || 0.071);

  const resetVulnerabilityDefaults = () => {
    if (onResetDistrict) {
      onResetDistrict();
    } else {
      onChange({
        ...params,
        vulnHospitalBedsAbsolute: hospitalBedsDefault,
        vulnIcuBedsAbsolute: icuBedsDefault,
        vulnGdpAbsolute: gdpDefault,
        vulnLiteracyAbsolute: literacyDefault,
        vulnUrbanPctAbsolute: urbanPctDefault,
        vulnEmploymentAbsolute: employmentDefault,
        densityAbsolute: densityDefault,
      });
    }
  };

  const showSimulationSections =
    sectionMode === "all" || sectionMode === "simulation";
  const showVulnerabilitySection =
    sectionMode === "all" || sectionMode === "vulnerability";
  const showResetAll = sectionMode !== "vulnerability";
  const headerTitle =
    sectionMode === "vulnerability"
      ? "Other Parameters"
      : "Simulation Parameters";
  const [activeSimulationSection, setActiveSimulationSection] =
    useState("intervention");

  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      {/* Header */}
      <div className="card-hd" style={{ marginBottom: 14 }}>
        {headerTitle}
        <span
          style={{
            fontSize: 11,
            color: "var(--teal)",
            fontWeight: 400,
            textTransform: "none",
            letterSpacing: 0,
          }}
        ></span>
        {hasDistrictOverride && (
          <span
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 10,
              background: "rgba(245,166,35,.15)",
              color: "var(--amber)",
              border: "1px solid rgba(245,166,35,.35)",
              marginLeft: 8,
            }}
          >
            overrides active
          </span>
        )}
      </div>

      {showSimulationSections && (
        <>
          {/* ── HAZARD: Disease-specific (collapsible) ── */}
          <Section
            title="Pathogen Model Parameters"
            badge="β₀"
            badgeColor={preset.color}
            defaultOpen={false}
            open={activeSimulationSection === "pathogen"}
            onToggle={() =>
              setActiveSimulationSection((current) =>
                current === "pathogen" ? null : "pathogen",
              )
            }
          >
            {/* R0 and beta display */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginBottom: 12,
                background: "rgba(255,255,255,.03)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "8px 10px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: ".6px",
                  }}
                >
                  Current R₀ (effective)
                </div>
                <div
                  style={{
                    fontFamily: "var(--head)",
                    fontSize: 18,
                    fontWeight: 700,
                    color: R0 > 1 ? "var(--red)" : "var(--teal)",
                  }}
                >
                  {R0.toFixed(2)}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: ".6px",
                  }}
                >
                  Effective β (derived)
                </div>
                <div
                  style={{
                    fontFamily: "var(--head)",
                    fontSize: 18,
                    fontWeight: 700,
                    color: preset.color,
                  }}
                >
                  {(params.beta || 0).toFixed(3)}
                </div>
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--muted)",
                marginBottom: 12,
                lineHeight: 1.5,
              }}
            >
              Tune intrinsic base transmission (β₀) directly. Effective spread
              is then modulated by intervention rate and population density.
            </div>
            <SliderRow
              label="Base Transmission Rate (β₀)"
              desc={`intrinsic R₀ ≈ ${r0Value.toFixed(2)} with current γ`}
              value={params.beta}
              min={0.02}
              max={1.2}
              step={0.005}
              format={(v) => v.toFixed(3)}
              onChange={(v) =>
                onChange({
                  ...params,
                  beta: parseFloat(v.toFixed(4)),
                  r0: parseFloat((v / (params.gamma || 0.071)).toFixed(2)),
                })
              }
              color="var(--red)"
            />
            <SliderRow
              label="Incubation Rate (σ)"
              desc={`1 / latency ≈ ${(1 / params.sigma).toFixed(1)} d`}
              value={params.sigma}
              min={0.02}
              max={0.5}
              step={0.005}
              format={(v) => v.toFixed(3)}
              onChange={set("sigma")}
              color="var(--amber)"
            />
            <SliderRow
              label="Infection-Fatality Ratio (IFR)"
              desc="modulates vulnerability"
              value={params.ifr}
              min={0.001}
              max={0.8}
              step={0.001}
              format={(v) => `${(v * 100).toFixed(1)}%`}
              onChange={set("ifr")}
              color="var(--red)"
            />
          </Section>

          <div style={{ height: 10 }} />

          {/* ── Intervention & Exposure ── */}
          <Section
            title="Intervention Rate &amp; Exposure"
            badgeColor="var(--teal)"
            defaultOpen={true}
            open={activeSimulationSection === "intervention"}
            onToggle={() =>
              setActiveSimulationSection((current) =>
                current === "intervention" ? null : "intervention",
              )
            }
          >
            <SliderRow
              label="Intervention Rate"
              desc="vaccination, distancing, isolation"
              value={params.interventionRate}
              min={0}
              max={0.95}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={set("interventionRate")}
              color="var(--teal)"
            />
            <SliderRow
              label="Population Density"
              desc={`default ${Math.round(densityDefault)} / km²`}
              value={densityValue}
              min={0}
              max={densityMax}
              step={1}
              format={(v) => `${Math.round(v)} / km²`}
              secondary={`factor ×${densityFactorDisplay.toFixed(2)}`}
              onChange={set("densityAbsolute")}
              color="var(--accent)"
              disabled={!canEditVulnerability}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginTop: -4,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "8px 10px",
                  background: "rgba(255,255,255,.02)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: ".6px",
                  }}
                >
                  Population Density
                </div>
                <div
                  style={{
                    fontFamily: "var(--head)",
                    fontSize: 16,
                    color: "var(--accent)",
                    fontWeight: 700,
                  }}
                >
                  {Math.round(density)} / km²
                </div>
                <div style={{ fontSize: 10.5, color: "var(--muted)" }}>
                  {context?.district || "Kerala (State)"}
                </div>
              </div>
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "8px 10px",
                  background: "rgba(255,255,255,.02)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: ".6px",
                  }}
                >
                  Exposure Score
                </div>
                <div
                  style={{
                    fontFamily: "var(--head)",
                    fontSize: 16,
                    color: "var(--amber)",
                    fontWeight: 700,
                  }}
                >
                  {(exposureScore * 100).toFixed(1)}%
                </div>
                <div style={{ fontSize: 10.5, color: "var(--muted)" }}>
                  density + core investment + mobility (min-max normalized)
                </div>
              </div>
            </div>
            {/* <div
              style={{
                fontSize: 11,
                color: "var(--muted)",
                marginTop: -2,
                marginBottom: 14,
                lineHeight: 1.5,
              }}
            >
              Effective β is scaled by intervention and density contact factor
              for the current selection.
            </div> */}
          </Section>

          <div style={{ height: 10 }} />
        </>
      )}

      {/* ── Vulnerability modifiers ── */}
      {showVulnerabilitySection && (
        <Section
          title="Select a district on the map to modify vulnerability and density parameters."
          badgeColor="var(--amber)"
          defaultOpen={true}
        >
          <SliderRow
            label="Hospital Beds per 1,000"
            desc={`Original Value: ${hospitalBedsDefault.toFixed(2)}`}
            value={hospitalBedsValue}
            min={0.1}
            max={hospitalBedsMax}
            step={hospitalBedsStep}
            format={(v) => v.toFixed(2)}
            secondary={`factor ×${hospitalBedsFactor.toFixed(2)}`}
            onChange={set("vulnHospitalBedsAbsolute")}
            color="var(--amber)"
            disabled={!canEditVulnerability}
          />
          {/* <SliderRow
          label="ICU Beds per 1,000"
          desc={`Original Value: ${icuBedsDefault.toFixed(3)}`}
          value={icuBedsValue}
          min={0.001}
          max={icuBedsMax}
          step={icuBedsStep}
          format={(v) => v.toFixed(3)}
          secondary={`factor ×${icuBedsFactor.toFixed(2)}`}
          onChange={set("vulnIcuBedsAbsolute")}
          color="var(--red)"
          disabled={!canEditVulnerability}
        /> */}
          <SliderRow
            label="Economic Resilience (GDP / Capita ₹)"
            desc={`Original Value: ${Math.round(gdpDefault).toLocaleString()}`}
            value={gdpValue}
            min={50000}
            max={gdpMax}
            step={1000}
            format={(v) => `₹${Math.round(v).toLocaleString()}`}
            secondary={`factor ×${gdpFactor.toFixed(2)}`}
            onChange={set("vulnGdpAbsolute")}
            color="var(--amber)"
            disabled={!canEditVulnerability}
          />
          <SliderRow
            label="Literacy Rate"
            desc={`Original Value: ${literacyDefault.toFixed(1)}%`}
            value={literacyValue}
            min={0}
            max={literacyMax}
            step={0.1}
            format={(v) => `${v.toFixed(1)}%`}
            secondary={`factor ×${literacyFactor.toFixed(2)}`}
            onChange={set("vulnLiteracyAbsolute")}
            color="var(--amber)"
            disabled={!canEditVulnerability}
          />
          {/* <SliderRow
            label="Urban Population Share"
            desc={`Original Value: ${urbanPctDefault.toFixed(1)}%`}
            value={urbanPctValue}
            min={0}
            max={100}
            step={0.1}
            format={(v) => `${v.toFixed(1)}%`}
            secondary={`factor ×${urbanPctFactor.toFixed(2)}`}
            onChange={set("vulnUrbanPctAbsolute")}
            color="var(--teal)"
            disabled={!canEditVulnerability}
          /> */}
          <SliderRow
            label="Employment Stress (Non-workers Seeking Work)"
            desc={`Original Value: ${employmentDefault.toFixed(2)}%`}
            value={employmentValue}
            min={0}
            max={100}
            step={0.01}
            format={(v) => `${v.toFixed(2)}%`}
            secondary={`factor ×${employmentFactor.toFixed(2)}`}
            onChange={set("vulnEmploymentAbsolute")}
            color="var(--amber)"
            disabled={!canEditVulnerability}
          />
          <SliderRow
            label="Mobility Exposure Score"
            desc={`Original Value: ${(context?.baseline?.mobility_exposure_score || 0).toFixed(1)} / 100`}
            value={
              params.mobilityAbsolute ??
              context?.baseline?.mobility_exposure_score ??
              0
            }
            min={0}
            max={100}
            step={0.1}
            format={(v) => `${v.toFixed(1)} / 100`}
            secondary={`factor ×${(
              (params.mobilityAbsolute ??
                context?.baseline?.mobility_exposure_score ??
                1) /
              Math.max(0.01, context?.baseline?.mobility_exposure_score ?? 1)
            ).toFixed(2)}`}
            onChange={set("mobilityAbsolute")}
            color="var(--red)"
            disabled={!canEditVulnerability}
          />
          <SliderRow
            label="Core Investment (₹ crore)"
            desc={`Original Value: ₹${(context?.baseline?.investment_core_crore || 0).toFixed(0)} cr`}
            value={
              params.investmentAbsolute ??
              context?.baseline?.investment_core_crore ??
              0
            }
            min={0}
            max={8000}
            step={10}
            format={(v) => `₹${Math.round(v).toLocaleString()} cr`}
            secondary={`factor ×${(
              (params.investmentAbsolute ??
                context?.baseline?.investment_core_crore ??
                1) /
              Math.max(1, context?.baseline?.investment_core_crore ?? 1)
            ).toFixed(2)}`}
            onChange={set("investmentAbsolute")}
            color="var(--accent)"
            disabled={!canEditVulnerability}
          />
          <button
            onClick={resetVulnerabilityDefaults}
            disabled={!canEditVulnerability}
            style={{
              width: "100%",
              marginBottom: 10,
              padding: "7px 9px",
              background: hasDistrictOverride
                ? "rgba(245,166,35,.15)"
                : "rgba(245,166,35,.09)",
              color: "var(--amber)",
              border: hasDistrictOverride
                ? "1px solid rgba(245,166,35,.50)"
                : "1px solid rgba(245,166,35,.30)",
              borderRadius: 8,
              cursor: canEditVulnerability ? "pointer" : "not-allowed",
              opacity: canEditVulnerability ? 1 : 0.55,
              fontSize: 12,
            }}
          >
            {!canEditVulnerability
              ? "Select a district to reset vulnerability defaults"
              : hasDistrictOverride
                ? `↺ Reset ${context?.district || "district"} to defaults`
                : `Use defaults from ${context?.district || "Kerala (State)"}`}
          </button>
        </Section>
      )}

      {/* Reset */}
      {showResetAll && (
        <button
          onClick={() => onDiseaseChange(diseaseKey)}
          style={{
            width: "100%",
            marginTop: 14,
            padding: "9px",
            background: "rgba(80,130,255,.1)",
            color: "var(--accent)",
            border: "1px solid rgba(80,130,255,.25)",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 12.5,
            fontFamily: "var(--font)",
            transition: "all .15s",
          }}
        >
          ↺ Reset all to {preset.label} defaults
        </button>
      )}
    </div>
  );
}
