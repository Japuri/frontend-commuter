import { Card } from 'react-bootstrap';

function AppCard({ title, text }) {
  return (
    <Card className="mb-3 shadow-sm">
      <Card.Body>
        <Card.Title>{title}</Card.Title>
        <Card.Text>{text}</Card.Text>
      </Card.Body>
    </Card>
  );
}

export default AppCard;
