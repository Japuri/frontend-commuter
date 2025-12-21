const baseSpeeds = {
  clear: 28,
  lightRain: 22,
  heavyTraffic: 18,
};

export function estimateTravel({
  distanceKm,
  weatherCondition,
  congestionLevel,
  avgSpeedKph,
}) {
  let speed = baseSpeeds.clear;

  if (weatherCondition?.toLowerCase().includes("rain"))
    speed = baseSpeeds.lightRain;
  // Prefer provided average speed from traffic data when available
  if (typeof avgSpeedKph === "number" && avgSpeedKph > 0) {
    speed = Math.min(speed, avgSpeedKph);
  } else if (congestionLevel === "heavy") {
    speed = Math.min(speed, baseSpeeds.heavyTraffic);
  }

  const hours = distanceKm / speed;
  const minutes = Math.round(hours * 60);

  return {
    minutes,
    rationale: `${weatherCondition || "Clear"} + ${
      congestionLevel || "moderate"
    } → ~${speed} kph`,
  };
}
