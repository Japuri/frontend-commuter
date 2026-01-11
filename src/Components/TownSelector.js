
import { Form } from 'react-bootstrap';
import { useMemo } from 'react';
import { getJeepneyRouteColor } from '../data/jeepney_route_utils';

function TownSelector({ towns = [], startTown, endTown, setStartTown, setEndTown, layout }) {
  const isStart = layout === 'start';
  // Find selected town names
  const startTownObj = towns.find(t => String(t.id) === String(startTown));
  const endTownObj = towns.find(t => String(t.id) === String(endTown));
  // Memoize color lookup
  const jeepneyRoute = useMemo(() => {
    if (startTownObj && endTownObj) {
      return getJeepneyRouteColor(startTownObj.name, endTownObj.name);
    }
    return null;
  }, [startTownObj, endTownObj]);

  return (
    <>
      <Form className="mb-2">
        <Form.Group controlId={isStart ? 'startTown' : 'endTown'}>
          <Form.Label className="form-label">
            {isStart ? 'Starting Town' : 'Destination Town'}
          </Form.Label>
          <Form.Select
            value={isStart ? startTown : endTown}
            onChange={(e) =>
              isStart ? setStartTown(e.target.value) : setEndTown(e.target.value)
            }
          >
            <option value="">Select town</option>
            {towns.map((town) => (
              <option key={town.id} value={town.id}>
                {town.name}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      </Form>
      {/* Show jeepney route color info if available */}
      {jeepneyRoute && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 12px 0',
          background: '#f8f9fa', borderRadius: 8, padding: '6px 12px', boxShadow: '0 1px 4px #0001',
        }}>
          <span style={{
            display: 'inline-block', width: 18, height: 18, borderRadius: 5,
            background: jeepneyRoute.hex, border: '1px solid #ccc', marginRight: 6
          }} />
          <span style={{ fontWeight: 500 }}>{jeepneyRoute.color} Route</span>
          <span style={{ color: '#555', fontSize: 13, marginLeft: 6 }}>{jeepneyRoute.route}</span>
        </div>
      )}
    </>
  );
}

export default TownSelector;
