import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Homescreen from './Screens/Homescreen';
import DetailScreen from './Screens/DetailScreen';
import LoginScreen from './Screens/LoginScreen';
import { useState, useEffect } from 'react';
import PaymentScreen from './Screens/PaymentScreen';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';


L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function App() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route
          path="/" element={<Homescreen currentUser={currentUser} />} />
        <Route
          path="/details" element={<DetailScreen currentUser={currentUser} />} />
        <Route
          path="/login" element={<LoginScreen setCurrentUser={setCurrentUser}/>} />
        <Route path="/payment" element={<PaymentScreen currentUser={currentUser} />} />
      </Routes>
    </Router>
  );
}

export default App;
