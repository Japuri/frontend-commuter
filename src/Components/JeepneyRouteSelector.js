import React, { useMemo, useState } from 'react';
import { JEEPNEY_ROUTE_COLORS } from '../data/jeepney_routes';

export default function JeepneyRouteSelector({ onRouteSelect, selectedRoute }) {
  const [previewRoute, setPreviewRoute] = useState(null);

  const getReadableRouteColor = (hex) => {
    const normalized = String(hex || '').replace('#', '');
    if (![3, 6].includes(normalized.length)) return '#1b253a';
    const full = normalized.length === 3
      ? normalized.split('').map((c) => c + c).join('')
      : normalized;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.78 ? '#1b253a' : `#${full}`;
  };

  const activeRoute = useMemo(() => {
    if (selectedRoute) return selectedRoute;
    if (previewRoute) return previewRoute;
    return JEEPNEY_ROUTE_COLORS[0] || null;
  }, [selectedRoute, previewRoute]);

  const handleSelectRoute = (route) => {
    onRouteSelect(route);
    setPreviewRoute(route);
  };

  return (
    <div className="wallet-route-selector">
      <div className="wallet-route-selector-head">
        <span className="wallet-route-selector-kicker">Route Palette</span>
        <h4>Select a color-coded jeepney leg</h4>
      </div>
      <div className="wallet-route-palette" role="listbox" aria-label="Jeepney route palette">
        {JEEPNEY_ROUTE_COLORS.map((route) => {
          const isSelected = selectedRoute?.color === route.color;
          const isActive = activeRoute?.color === route.color;

          return (
            <button
              key={route.color}
              type="button"
              className={`wallet-route-pill${isSelected ? " selected" : ""}${isActive ? " active" : ""}`}
              onMouseEnter={() => setPreviewRoute(route)}
              onFocus={() => setPreviewRoute(route)}
              onClick={() => handleSelectRoute(route)}
              aria-pressed={isSelected}
            >
              <span
                className="wallet-route-pill-chip"
                style={{
                  background: route.hex,
                  borderColor: route.color === "White" ? "#cdd5e5" : "transparent",
                }}
              />
              <span className="wallet-route-pill-copy">
                <strong>{route.color}</strong>
                <small>{route.route}</small>
              </span>
            </button>
          );
        })}
      </div>

      {activeRoute && (
        <div className="wallet-route-focus-card">
          <div className="wallet-route-focus-head">
            <div>
              <p className="wallet-route-focus-title" style={{ color: getReadableRouteColor(activeRoute.hex) }}>
                {activeRoute.color} Route
              </p>
              <p className="wallet-route-focus-subtitle">{activeRoute.route}</p>
            </div>
            <button
              type="button"
              className="btn-neon-fill wallet-route-select-btn"
              onClick={() => handleSelectRoute(activeRoute)}
            >
              {selectedRoute?.color === activeRoute.color ? "Selected" : "Use This Route"}
            </button>
          </div>
          <div className="wallet-route-focus-places">
            {activeRoute.keyPlaces.map((place, idx) => (
              <span className="route-chip-tag" key={idx}>{place}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
