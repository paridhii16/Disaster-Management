/**
 * Key Flags Configuration
 *
 * Thresholds used in the Details Panel to display risk flags for each district.
 * Each flag is shown as a tag when the district's metric crosses the corresponding threshold.
 *
 * Severity levels:
 *   - "high": Critical warning (red background)
 *   - "medium": Moderate concern (orange background)
 *   - "low": Positive indicator (green background)
 */

export const FLAG_THRESHOLDS = {
  // Vulnerability-based flags
  vulnerability_high: {
    threshold: 65,
    operator: ">=",
    label: "High Vulnerability",
    severity: "high",
    metric: "vulnerability",
    description: "Composite vulnerability score ≥ 65",
  },
  vulnerability_low: {
    threshold: 40,
    operator: "<",
    label: "Low Vulnerability",
    severity: "low",
    metric: "vulnerability",
    description: "Composite vulnerability score < 40",
  },

  // Healthcare capacity flags
  beds_shortage: {
    threshold: 0.9,
    operator: "<",
    label: "Bed Shortage",
    severity: "high",
    metric: "beds_per_1000",
    description: "Hospital beds per 1,000 population < 0.9",
  },
  beds_good: {
    threshold: 1.4,
    operator: ">=",
    label: "Good Bed Coverage",
    severity: "low",
    metric: "beds_per_1000",
    description: "Hospital beds per 1,000 population ≥ 1.4",
  },

  // Socioeconomic flags
  literacy_low: {
    threshold: 82,
    operator: "<",
    label: "Low Literacy",
    severity: "high",
    metric: "literacy_rate",
    description: "Literacy rate < 82%",
  },
  gdp_low: {
    threshold: 270000,
    operator: "<",
    label: "Low GDP",
    severity: "medium",
    metric: "gddp_per_capita",
    description: "GDDP per Capita < ₹270,000",
  },

  // Demographic flags
  density_high: {
    threshold: 1200,
    operator: ">",
    label: "High Density",
    severity: "medium",
    metric: "density",
    description: "Population density > 1,200 /km²",
  },
  mobility_high: {
    threshold: 70,
    operator: ">=",
    label: "High Mobility",
    severity: "medium",
    metric: "mobility_exposure_score",
    description: "Mobility exposure score ≥ 70",
  },
  mobility_low: {
    threshold: 25,
    operator: "<",
    label: "Low Mobility",
    severity: "medium",
    metric: "mobility_exposure_score",
    description: "Mobility exposure score < 25",
  },
};

/**
 * Evaluate which flags apply to a district
 * @param {Object} district - District data object
 * @returns {Array<[label, severityClass]>} Array of applicable flags
 */
export function evaluateFlags(district) {
  const flags = [];

  Object.entries(FLAG_THRESHOLDS).forEach(([key, flag]) => {
    const value = district[flag.metric];
    if (value == null) return;

    let isMet = false;
    switch (flag.operator) {
      case ">=":
        isMet = value >= flag.threshold;
        break;
      case ">":
        isMet = value > flag.threshold;
        break;
      case "<":
        isMet = value < flag.threshold;
        break;
      case "<=":
        isMet = value <= flag.threshold;
        break;
      default:
        isMet = false;
    }

    if (isMet) {
      const severityClass =
        flag.severity === "high"
          ? "tag-h"
          : flag.severity === "medium"
            ? "tag-m"
            : "tag-l";
      flags.push([flag.label, severityClass]);
    }
  });

  return flags;
}
