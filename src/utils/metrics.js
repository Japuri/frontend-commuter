export const PremiumConfig = {
  baselineSpeedKph: 32,
  weatherSeverityMap: {
    ok: [/sunny/i, /clear/i],
    warn: [/cloud/i, /partly\s*cloud/i, /light\s*rain/i],
    high: [/thunderstorm/i, /storm/i, /heavy\s*rain/i],
  },
  trafficLevelSeverity: {
    light: 15,
    moderate: 40,
    heavy: 70,
    severe: 90,
  },
};

export function applyPremiumOverrides(overrides = {}) {
  Object.assign(PremiumConfig, overrides);
  if (overrides.weatherSeverityMap) {
    PremiumConfig.weatherSeverityMap = {
      ...PremiumConfig.weatherSeverityMap,
      ...overrides.weatherSeverityMap,
    };
  }
  if (overrides.trafficLevelSeverity) {
    PremiumConfig.trafficLevelSeverity = {
      ...PremiumConfig.trafficLevelSeverity,
      ...overrides.trafficLevelSeverity,
    };
  }
}

export function weatherBadgeFor(condition = "", config = PremiumConfig) {
  const c = String(condition);
  const { weatherSeverityMap } = config;
  if (weatherSeverityMap.high.some((r) => r.test(c))) return "badge-high";
  if (weatherSeverityMap.warn.some((r) => r.test(c))) return "badge-warn";
  if (weatherSeverityMap.ok.some((r) => r.test(c))) return "badge-ok";
  return "badge-warn";
}

export function trafficSeverityFromData(
  trafficData = {},
  baseline = PremiumConfig.baselineSpeedKph
) {
  const level = String(trafficData.congestion_level || "").toLowerCase();
  const speed = Number(trafficData.avg_speed_kph);
  const fallback = PremiumConfig.trafficLevelSeverity[level];
  if (!Number.isNaN(speed) && speed > 0 && baseline > 0) {
    const ratio = Math.min(speed / baseline, 1);
    const severity = Math.round((1 - ratio) * 100);
    const withFloor = Math.max(
      typeof fallback === "number" ? fallback : 0,
      severity
    );
    return Math.max(0, Math.min(withFloor, 100));
  }
  return typeof fallback === "number" ? fallback : 40;
}

export function trafficBadgeFor(congestionLevel = "") {
  const lvl = String(congestionLevel).toLowerCase();
  if (lvl === "light") return "badge-ok";
  if (lvl === "moderate") return "badge-warn";
  if (lvl === "heavy" || lvl === "severe") return "badge-high";
  return "badge-warn";
}

export function confidenceFromIndicators(trafficSeverity, weatherBadge) {
  if (trafficSeverity < 30 && weatherBadge === "badge-ok") return "High";
  if (trafficSeverity < 60 && weatherBadge !== "badge-high") return "Medium";
  return "Low";
}
