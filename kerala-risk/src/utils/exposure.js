export function getMinMaxBounds(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { min, max, range: max - min || 1 };
}

export function normalizeWithBounds(value, bounds) {
  return Math.min(1, Math.max(0, (value - bounds.min) / bounds.range));
}

/**
 * Build normalized exposure metrics for districts.
 *
 * Exposure dimensions (equal weight):
 *  1) Population density
 *  2) Core investment (₹ crore)
 *  3) Mobility exposure score
 *
 * Normalization flow:
 *  - Min-max normalize each dimension
 *  - Average the 3 normalized dimensions
 *  - Min-max normalize the resulting combined exposure index
 */
export function computeExposureMetrics(
  districts,
  {
    densityAccessor = (d) => Number(d.density) || 0,
    investmentAccessor = (d) => Number(d.investment_core_crore) || 0,
    mobilityAccessor = (d) => Number(d.mobility_exposure_score) || 0,
  } = {},
) {
  if (!districts?.length) return [];

  const densityValues = districts.map((district) => densityAccessor(district));
  const investmentValues = districts.map((district) =>
    investmentAccessor(district),
  );
  const mobilityValues = districts.map((district) =>
    mobilityAccessor(district),
  );

  const densityBounds = getMinMaxBounds(densityValues);
  const investmentBounds = getMinMaxBounds(investmentValues);
  const mobilityBounds = getMinMaxBounds(mobilityValues);

  const densityNorm = densityValues.map((value) =>
    normalizeWithBounds(value, densityBounds),
  );
  const investmentNorm = investmentValues.map((value) =>
    normalizeWithBounds(value, investmentBounds),
  );
  const mobilityNorm = mobilityValues.map((value) =>
    normalizeWithBounds(value, mobilityBounds),
  );

  const rawExposure = districts.map(
    (_, index) =>
      (densityNorm[index] + investmentNorm[index] + mobilityNorm[index]) / 3,
  );
  const rawBounds = getMinMaxBounds(rawExposure);

  return districts.map((district, index) => {
    const exposureScore = normalizeWithBounds(rawExposure[index], rawBounds);
    return {
      ...district,
      exposure_density_norm: densityNorm[index],
      exposure_investment_norm: investmentNorm[index],
      exposure_mobility_norm: mobilityNorm[index],
      exposure_raw_index: rawExposure[index],
      exposure_score: exposureScore,
      exposure_index: parseFloat((exposureScore * 100).toFixed(1)),
    };
  });
}
