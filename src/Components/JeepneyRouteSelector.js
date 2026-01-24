import React, { useState } from 'react';
import { JEEPNEY_ROUTE_COLORS } from '../data/jeepney_routes';

export default function JeepneyRouteSelector({ onRouteSelect, selectedRoute }) {
  const [expandedRoute, setExpandedRoute] = useState(null);

  const handleRouteClick = (route) => {
    if (expandedRoute === route.color) {
      setExpandedRoute(null);
    } else {
      setExpandedRoute(route.color);
    }
  };

  const handleSelectRoute = (route) => {
    onRouteSelect(route);
    setExpandedRoute(null);
  };

  return (
    <div
      style={{
        marginBottom: 16,
        paddingRight: 4,
      }}
    >
      <div className="plan-header" style={{ marginBottom: 12 }}>
        Select Jeepney Route
      </div>
      <div
        className="route-card-stack"
        style={{
          maxHeight: "calc(70vh - 300px)",
          overflowY: "auto",
          paddingRight: 2,
        }}
      >
        {JEEPNEY_ROUTE_COLORS.map((route) => {
          const isExpanded = expandedRoute === route.color;
          const isSelected = selectedRoute?.color === route.color;
          return (
            <div
              key={route.color}
              className={`route-card${isSelected ? " selected" : ""}`}
              onClick={() => handleRouteClick(route)}
            >
              <div className="route-card-header">
                <span
                  className="route-chip"
                  style={{
                    background: route.hex,
                    borderColor:
                      route.color === "White" ? "#d0d6e4" : "transparent",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <p className="route-card-title">{route.color} Route</p>
                  <p className="route-card-subtext">{route.route}</p>
                </div>
                <span className="route-card-arrow" aria-hidden="true">
                  {isExpanded ? "▼" : "▶"}
                </span>
              </div>

              {isExpanded && (
                <div className="route-card-details">
                  <p className="route-card-subtext" style={{ marginBottom: 6 }}>
                    <strong>Key Places:</strong>
                  </p>
                  <div className="route-chip-list">
                    {route.keyPlaces.map((place, idx) => (
                      <span className="route-chip-tag" key={idx}>
                        {place}
                      </span>
                    ))}
                  </div>
                  <button
                    className="btn-neon-fill"
                    style={{ width: "100%", padding: "10px 16px", fontSize: 14 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRoute(route);
                    }}
                  >
                    {isSelected ? "✓ Selected" : "Select This Route"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
