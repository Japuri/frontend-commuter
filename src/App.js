import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Homescreen from './Screens/Homescreen';
import DetailScreen from './Screens/DetailScreen';
import LoginScreen from './Screens/LoginScreen';
import SignIn from './Screens/SignIn';
import SignUp from './Screens/SignUp';
import ProfileScreen from './Screens/ProfileScreen';
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
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('currentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser && currentUser) {
      setCurrentUser(null);
    } else if (savedUser && (!currentUser || savedUser !== JSON.stringify(currentUser))) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, [currentUser]);

  return (
    <Router>
      <Routes>
        <Route
          path="/" element={<Homescreen currentUser={currentUser} setCurrentUser={setCurrentUser} />} />
        <Route
          path="/details" element={<DetailScreen currentUser={currentUser} setCurrentUser={setCurrentUser} />} />
        <Route
          path="/login" element={<LoginScreen setCurrentUser={setCurrentUser}/>} />
        <Route
          path="/signin" element={<SignIn onAuth={(user) => {
            const normalized = user?.user ? { ...user.user, token: user.token } : user;
            setCurrentUser(normalized);
            localStorage.setItem('currentUser', JSON.stringify(normalized));
          }} />} />
        <Route
          path="/signup" element={<SignUp onAuth={(user) => {
            const normalized = user?.user ? { ...user.user, token: user.token } : user;
            setCurrentUser(normalized);
            localStorage.setItem('currentUser', JSON.stringify(normalized));
          }} />} />
        <Route path="/payment" element={<PaymentScreen currentUser={currentUser} />} />
        <Route path="/profile" element={<ProfileScreen currentUser={currentUser} token={currentUser?.token} />} />
      </Routes>
    </Router>
  );
}

export default App;
