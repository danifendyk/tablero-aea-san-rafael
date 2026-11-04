export function electricalVerification(profile: {
  groundResistanceOhm: number;
  prospectiveShortCircuitKa: number;
  breakingCapacityKa: number;
}) {
  const positive = (value: number) => Number.isFinite(value) && value > 0;
  const groundPresent = positive(profile.groundResistanceOhm);
  const faultPresent =
    positive(profile.prospectiveShortCircuitKa) &&
    positive(profile.breakingCapacityKa);
  return {
    groundPresent,
    faultPresent,
    groundReady: groundPresent && profile.groundResistanceOhm <= 10,
    faultReady:
      faultPresent &&
      profile.breakingCapacityKa >= profile.prospectiveShortCircuitKa,
  };
}
