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
    <div style={{ marginBottom: 16, maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
      <div className="plan-header" style={{ marginBottom: 12 }}>Select Jeepney Route</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {JEEPNEY_ROUTE_COLORS.map((route) => {
          const isExpanded = expandedRoute === route.color;
          const isSelected = selectedRoute?.color === route.color;
          return (
            <div
              key={route.color}
              style={{
                border: `2px solid ${isSelected ? route.hex : '#2a3441'}`,
                borderRadius: 10,
                padding: 10,
                background: isSelected 
                  ? `linear-gradient(135deg, ${route.hex}15, ${route.hex}08)`
                  : 'rgba(30, 38, 49, 0.5)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? `0 0 8px ${route.hex}40` : '0 1px 2px #0001',
                marginBottom: 2,
              }}
              onClick={() => handleRouteClick(route)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 18,
                    height: 18,
                    borderRadius: 5,
                    background: route.hex,
                    border: route.color === 'White' ? '1px solid #ccc' : 'none',
                    boxShadow: '0 2px 4px #0003',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#e8f5ff', marginBottom: 1 }}>
                    {route.color} Route
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca9b8' }}>
                    {route.route}
                  </div>
                </div>
                <span style={{ color: '#7f94a8', fontSize: 16 }}>
                  {isExpanded ? '▼' : '▶'}
                </span>
              </div>

              {isExpanded && (
                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div style={{ fontSize: 12, color: '#b4c1ce', marginBottom: 6 }}>
                    <strong>Key Places:</strong>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                    {route.keyPlaces.map((place, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: 'rgba(0, 212, 255, 0.1)',
                          padding: '3px 8px',
                          borderRadius: 5,
                          fontSize: 11,
                          color: '#c8e0f0',
                          border: '1px solid rgba(0, 212, 255, 0.15)',
                        }}
                      >
                        {place}
                      </span>
                    ))}
                  </div>
                  <button
                    className="btn-neon-fill"
                    style={{ width: '100%', padding: '6px 10px', fontSize: 13 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRoute(route);
                    }}
                  >
                    {isSelected ? '✓ Selected' : 'Select This Route'}
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
