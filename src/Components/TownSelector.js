import { Form } from 'react-bootstrap';

function TownSelector({ towns = [], startTown, endTown, setStartTown, setEndTown, layout }) {
  const isStart = layout === 'start';

  return (
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
  );
}

export default TownSelector;
