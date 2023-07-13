export const calculateHealth = (troveHealth: number): number => {
  let normalizedHealth = (troveHealth - 110) * 2;
  normalizedHealth = Math.max(0, normalizedHealth);
  return Math.min(normalizedHealth, 100);
};

export const calculateHealthStableTrove = (icr: number): number => {
  const health = 200 - (200 - 110) * Math.exp((-1 / 9) * (icr - 110));
  let normalizedHealth = (health - 110) * 2;
  normalizedHealth = Math.max(0, normalizedHealth);
  return Math.min(normalizedHealth, 100);
};

export const calculateHealthColor = (troveHealth: number): string => {
  // const health = calculateHealth(troveHealth);
  if (troveHealth < 30) {
    return "red";
  } else if (troveHealth < 60) {
    return "yellow";
  } else {
    return "green";
  }
};
