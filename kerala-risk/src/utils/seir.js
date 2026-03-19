/**
 * SEIR Epidemic Model Engine — Clean Architecture
 *
 * Risk = Hazard × Vulnerability × Exposure
 *
 * ┌──────────────┬────────────────────────────────────────────────────────┐
 * │ Component    │ What it captures                                       │
 * ├──────────────┼────────────────────────────────────────────────────────┤
 * │ Hazard       │ Intrinsic pathogen danger: β, σ, γ, IFR               │
 * │              │ Modulated by interventionRate (reduces effective β)    │
 * │ Exposure     │ Population density — scales β via contact rate         │
 * │ Vulnerability│ beds, GDP, literacy → district's ability to cope       │
 * │              │ vulnerability = baseVulnerability * ifrFactor          │
 * └──────────────┴────────────────────────────────────────────────────────┘
 *
 * Effective β = β_base × (1 − interventionRate) × densityContactFactor
 *
 * SEIR ODEs (Euler, dt = 1 day):
 *   dS/dt = −βeff · S · I / N
 *   dE/dt =  βeff · S · I / N − σ · E
 *   dI/dt =  σ · E − γ · I
 *   dR/dt =  γ · I
 */

// ── Disease presets ───────────────────────────────────────────────────────────
export const DISEASE_PRESETS = {
  covid: {
    label: "COVID-19",
    beta: 0.35,
    sigma: 0.196,
    gamma: 0.071,
    ifr: 0.012,
    color: "#4f7eff",
    description:
      "SARS-CoV-2 : airborne, moderate lethality, high transmissibility",
  },
  nipah: {
    label: "Nipah Virus",
    beta: 0.1, // adjusted from R0 ≈ 0.7–1.0
    sigma: 0.1, // ~10 day incubation
    gamma: 0.14, // ~7 day infectious period
    ifr: 0.6, // conservative average
    color: "#f05252",
    description:
      "Nipah (Kerala/Bangladesh) : zoonotic, low transmissibility, very high fatality",
  },
};

export const DEFAULT_PARAMS = {
  covid: {
    r0: 4.93, // intrinsic R0 = beta / gamma
    beta: 0.35, // derived: r0 * gamma
    sigma: 0.196,
    gamma: 0.071,
    ifr: 0.012,
    days: 300,
    interventionRate: 0.2,
  },
  nipah: {
    r0: 0.72,
    beta: 0.09,
    sigma: 0.071,
    gamma: 0.125,
    ifr: 0.65,
    days: 120,
    interventionRate: 0.5,
  },
};

// ── SEIR simulation ───────────────────────────────────────────────────────────
/**
 * Run SEIR for a single population.
 * Only interventionRate and density modulate effective β.
 */
export function runSEIR({
  population = 1e6,
  initialI = 10,
  days = 300,
  beta = 0.35,
  sigma = 0.196,
  gamma = 0.071,
  interventionRate = 0.2,
  density = 800,
}) {
  const N = population;
  const REF_DENSITY = 800;
  const densityFactor = Math.sqrt(Math.max(50, density) / REF_DENSITY);
  const effectiveBeta = beta * (1 - interventionRate) * densityFactor;
  const R0 = effectiveBeta / gamma;

  let S = N - initialI;
  let E = 0;
  let I = initialI;
  let R = 0;
  const series = [];

  for (let day = 0; day <= days; day++) {
    const newExposed = (effectiveBeta * S * I) / N;
    const newInfected = sigma * E;
    const newRemoved = gamma * I;

    series.push({
      day,
      S: Math.round(S),
      E: Math.round(E),
      I: Math.round(I),
      R: Math.round(R),
    });

    S = Math.max(0, S - newExposed);
    E = Math.max(0, E + newExposed - newInfected);
    I = Math.max(0, I + newInfected - newRemoved);
    R = Math.min(N, R + newRemoved);
  }

  return { series, effectiveBeta, R0 };
}

// ── Risk scoring ──────────────────────────────────────────────────────────────
/**
 * Risk = Hazard × Vulnerability × Exposure  for every district.
 *
 * This produces the final disease risk score, which is CAPPED at 100.
 * Each component also has local saturation caps; increasing sliders beyond certain
 * threshold points produces diminishing returns (the "plateau effect").
 *
 * WHY THE PLATEAU?
 * ─────────────────
 * The model uses several explicit Math.min() saturation points:
 *
 *   1. **Vulnerability saturation** (line ~150)
 *      compVuln = Math.min(1, baseVuln * (1 + frailty × ifrAmp))
 *      → Once compVuln reaches 1.0 (100%), further frailty increases have no effect.
 *      → This prevents over-weighting of individual deficits.
 *
 *   2. **Exposure saturation** (line ~160)
 *      exposure = Math.min(1, adjustedDensity / MAX_DENSITY)
 *      → Once density reaches MAX_DENSITY, normalized exposure stays at 1.0.
 *      → Increasing density slider beyond 1600 /km² (approx) won't boost risk further.
 *
 *   3. **Final risk saturation** (line ~178)
 *      diseaseRisk = Math.min(100, d._rawRisk * RISK_CALIBRATION)
 *      → The score cannot exceed 100 points.
 *      → Some districts may hit this cap during extreme scenarios.
 *
 * IMPLICATIONS:
 * ─────────────
 *   - Disease severity (IFR) affects how much frailty amplifies vulnerability.
 *     Higher IFR → larger ifrAmp factor → faster plateau for vulnerability.
 *   - The plateaus ensure scores remain interpretable in [0, 100] range.
 *   - They also prevent gaming: you can't trivially maximize risk by pushing one slider.
 *
 * To adjust these caps, modify:
 *   - HOSP_BED_MIN/MAX, GDP_MIN/MAX, LIT_MIN/MAX (lines ~100–110)
 *   - REF_DENSITY, MAX_DENSITY calculation (lines ~95–98)
 *   - RISK_CALIBRATION constant (line ~177)
 *   - ifrAmp formula (line ~152): currently "0.5 + ifr * 3"
 */
export function computeDiseaseRisk(districts, params) {
  const {
    beta = 0.35,
    interventionRate = 0.2,
    ifr = 0.012,
    densityScale = 1.0,
  } = params;

  const REF_DENSITY = 800;
  const MAX_DENSITY = districts.reduce(
    (m, d) => Math.max(m, (d.density || 0) * densityScale),
    1,
  );

  // Kerala reference bounds for deficit normalisation
  // (covers the full realistic range + some headroom for slider overrides)
  const HOSP_BED_MIN = 1,
    HOSP_BED_MAX = 1000;
  const GDP_MIN = 150000,
    GDP_MAX = 600000;
  const LIT_MIN = 10,
    LIT_MAX = 100;

  const urbanValues = districts.map((d) => Number(d.urban_pct) || 0);
  const employmentValues = districts.map(
    (d) => Number(d.unemployment_proxy) || 0,
  );

  const urbanMin = Math.min(...urbanValues);
  const urbanRange = Math.max(1, Math.max(...urbanValues) - urbanMin);
  const employmentMin = Math.min(...employmentValues);
  const employmentRange = Math.max(
    1,
    Math.max(...employmentValues) - employmentMin,
  );

  const raw = districts.map((d) => {
    const adjustedDensity = (d.density || 0) * densityScale;
    // ── Hazard ────────────────────────────────────────────────────────────────
    const densityFactor = Math.sqrt(
      Math.max(50, adjustedDensity) / REF_DENSITY,
    );
    const hazard = beta * (1 - interventionRate) * densityFactor;

    // ── Vulnerability ─────────────────────────────────────────────────────────
    // baseVuln: raw district socio-economic vulnerability score from CSV (0–1)
    const baseVuln = (d.vulnerability || 50) / 100;

    const hospitalBedsPer1000 =
      Number(d.beds_per_1000) ||
      (Number(d.hospital_beds) && Number(d.population)
        ? (Number(d.hospital_beds) * 1000) / Number(d.population)
        : 0);

    // Deficit: 0 = best (no deficit), 1 = worst
    const hospBedDeficit =
      1 -
      Math.min(
        1,
        Math.max(
          0,
          (hospitalBedsPer1000 - HOSP_BED_MIN) / (HOSP_BED_MAX - HOSP_BED_MIN),
        ),
      );
    const gdpDeficit =
      1 -
      Math.min(
        1,
        Math.max(
          0,
          (Number(d.gddp_per_capita) - GDP_MIN) / (GDP_MAX - GDP_MIN),
        ),
      );
    const litDeficit =
      1 -
      Math.min(
        1,
        Math.max(0, (Number(d.literacy_rate) - LIT_MIN) / (LIT_MAX - LIT_MIN)),
      );

    const urbanDeficit =
      1 -
      Math.min(
        1,
        Math.max(0, ((Number(d.urban_pct) || 0) - urbanMin) / urbanRange),
      );
    const employmentDeficit = Math.min(
      1,
      Math.max(
        0,
        ((Number(d.unemployment_proxy) || 0) - employmentMin) / employmentRange,
      ),
    );

    // frailty: weighted average deficit (equal weights, 0–1)
    const frailtyDimensions = [
      hospBedDeficit,
      gdpDeficit,
      litDeficit,
      urbanDeficit,
      employmentDeficit,
    ];
    const frailty =
      frailtyDimensions.reduce((sum, value) => sum + value, 0) /
      Math.max(1, frailtyDimensions.length);

    // IFR shifts how much frailty amplifies vulnerability:
    //   low IFR  (COVID 0.012): ifrAmp ≈ 0.6  → compVuln ∈ [baseVuln, baseVuln×1.6]
    //   high IFR (Nipah 0.65): ifrAmp ≈ 2.5  → compVuln ∈ [baseVuln, min(1, baseVuln×3.5)]
    // This makes the sliders visibly change risk for BOTH diseases.
    const ifrAmp = 0.5 + ifr * 3;
    const compVuln = Math.min(1, baseVuln * (1 + frailty * ifrAmp));

    // ── Exposure ──────────────────────────────────────────────────────────────
    const exposure = Math.min(1, adjustedDensity / MAX_DENSITY);

    return {
      ...d,
      compVulnerability: parseFloat((compVuln * 100).toFixed(1)),
      _frailty: parseFloat((frailty * 100).toFixed(1)),
      _rawRisk: hazard * compVuln * exposure,
    };
  });

  const RISK_CALIBRATION = 280;

  return raw.map((d) => ({
    ...d,
    diseaseRisk: parseFloat(
      Math.min(100, d._rawRisk * RISK_CALIBRATION).toFixed(1),
    ),
  }));
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function diseaseRiskTier(score) {
  if (score >= 65)
    return { label: "Critical Risk", cls: "tag-h", color: "#f05252" };
  if (score >= 40)
    return { label: "Elevated Risk", cls: "tag-m", color: "#f5a623" };
  return { label: "Contained", cls: "tag-l", color: "#00c9a7" };
}

export function diseaseRiskColor(score, alpha = 1) {
  const { color } = diseaseRiskTier(score);
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function fmtN(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(Math.round(n));
}
