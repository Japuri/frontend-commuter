// Helper to match a town or route name to a jeepney route color
import { JEEPNEY_ROUTE_COLORS } from "./jeepney_routes";

export function getJeepneyRouteColor(townName = "", destName = "") {
  // Try to match by route string or key places
  const lowerTown = townName.toLowerCase();
  const lowerDest = destName.toLowerCase();
  for (const route of JEEPNEY_ROUTE_COLORS) {
    const routeStr = route.route.toLowerCase();
    if (routeStr.includes(lowerTown) && routeStr.includes(lowerDest)) {
      return route;
    }
    // Also check key places
    if (
      route.keyPlaces.some(
        (place) =>
          place.toLowerCase().includes(lowerTown) ||
          place.toLowerCase().includes(lowerDest)
      )
    ) {
      return route;
    }
  }
  return null;
}
