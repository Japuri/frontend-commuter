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
    <div style={{ marginBottom: 16 }}>
      <div className="plan-header" style={{ marginBottom: 12 }}>Select Jeepney Route</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {JEEPNEY_ROUTE_COLORS.map((route) => {
          const isExpanded = expandedRoute === route.color;
          const isSelected = selectedRoute?.color === route.color;
          
          return (
            <div
              key={route.color}
              style={{
                border: `2px solid ${isSelected ? route.hex : '#2a3441'}`,
                borderRadius: 10,
                padding: 12,
                background: isSelected 
                  ? `linear-gradient(135deg, ${route.hex}15, ${route.hex}08)`
                  : 'rgba(30, 38, 49, 0.5)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? `0 0 12px ${route.hex}50` : '0 1px 4px #0001',
              }}
              onClick={() => handleRouteClick(route)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: route.hex,
                    border: route.color === 'White' ? '1px solid #ccc' : 'none',
                    boxShadow: '0 2px 4px #0003',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#e8f5ff', marginBottom: 2 }}>
                    {route.color} Route
                  </div>
                  <div style={{ fontSize: 13, color: '#9ca9b8' }}>
                    {route.route}
                  </div>
                </div>
                <span style={{ color: '#7f94a8', fontSize: 18 }}>
                  {isExpanded ? '▼' : '▶'}
                </span>
              </div>

              {isExpanded && (
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <div style={{ fontSize: 13, color: '#b4c1ce', marginBottom: 8 }}>
                    <strong>Key Places:</strong>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {route.keyPlaces.map((place, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: 'rgba(0, 212, 255, 0.1)',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 12,
                          color: '#c8e0f0',
                          border: '1px solid rgba(0, 212, 255, 0.2)',
                        }}
                      >
                        {place}
                      </span>
                    ))}
                  </div>
                  <button
                    className="btn-neon-fill"
                    style={{ width: '100%', padding: '8px 16px', fontSize: 14 }}
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

      {selectedRoute && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: `linear-gradient(135deg, ${selectedRoute.hex}20, ${selectedRoute.hex}10)`,
            borderRadius: 10,
            border: `2px solid ${selectedRoute.hex}`,
            boxShadow: `0 0 16px ${selectedRoute.hex}40`,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e8f5ff', marginBottom: 6 }}>
            ✓ Selected: {selectedRoute.color} Route
          </div>
          <div style={{ fontSize: 13, color: '#b4c1ce' }}>
            {selectedRoute.route}
          </div>
        </div>
      )}
    </div>
  );
}
