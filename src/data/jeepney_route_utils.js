// ...existing code...
import { JEEPNEY_ROUTE_COLORS } from "./jeepney_routes";

export function getJeepneyRouteColor(townName = "", destName = "") {
  // ...existing code...
  const lowerTown = townName.toLowerCase();
  const lowerDest = destName.toLowerCase();
  for (const route of JEEPNEY_ROUTE_COLORS) {
    const routeStr = route.route.toLowerCase();
    if (routeStr.includes(lowerTown) && routeStr.includes(lowerDest)) {
      return route;
    }
    // ...existing code...
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
