import React from 'react';
import { JEEPNEY_ROUTE_COLORS } from '../data/jeepney_routes';

export default function JeepneyLegend() {
  return (
    <div style={{ margin: '16px 0', padding: 12, background: '#f8f9fa', borderRadius: 10, boxShadow: '0 1px 6px #0001' }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Jeepney Route Color Coding</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {JEEPNEY_ROUTE_COLORS.map((route) => (
          <div key={route.color} style={{ display: 'flex', alignItems: 'center', minWidth: 180 }}>
            <span style={{
              display: 'inline-block',
              width: 18,
              height: 18,
              borderRadius: 5,
              background: route.hex,
              border: '1px solid #ccc',
              marginRight: 8
            }} />
            <span style={{ fontWeight: 500 }}>{route.color}</span>
            <span style={{ marginLeft: 8, color: '#555', fontSize: 13 }}>{route.route}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
