import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Homescreen from './Screens/Homescreen';
import DetailScreen from './Screens/DetailScreen';
import LoginScreen from './Screens/LoginScreen';
import SignIn from './Screens/SignIn';
import SignUp from './Screens/SignUp';
import ProfileScreen from './Screens/ProfileScreen';
import PaymentScreen from './Screens/PaymentScreen';
import PaymentSuccessScreen from './Screens/PaymentSuccessScreen';
import PaymentCancelScreen from './Screens/PaymentCancelScreen';
import { useState, useEffect } from 'react';
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


function SetGlobalNavigate() {
  const navigate = useNavigate();
  useEffect(() => {
    window.navigateForAuthFetch = navigate;
    return () => {
      window.navigateForAuthFetch = undefined;
    };
  }, [navigate]);
  return null;
}

// Helper function to normalize user object and add is_premium flag
const normalizeUser = (user) => {
  if (!user) return null;
  return {
    ...user,
    is_premium: user.subscription_status === 'plus' || user.subscription_status === 'premium'
  };
};

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('currentUser');
    return savedUser ? normalizeUser(JSON.parse(savedUser)) : null;
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser && currentUser) {
      setCurrentUser(null);
    } else if (savedUser && (!currentUser || savedUser !== JSON.stringify(currentUser))) {
      setCurrentUser(normalizeUser(JSON.parse(savedUser)));
    }
  }, [currentUser]);

  return (
    <Router>
      <SetGlobalNavigate />
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
            const withPremium = normalizeUser(normalized);
            setCurrentUser(withPremium);
            localStorage.setItem('currentUser', JSON.stringify(withPremium));
          }} />} />
        <Route
          path="/signup" element={<SignUp onAuth={(user) => {
            const normalized = user?.user ? { ...user.user, token: user.token } : user;
            const withPremium = normalizeUser(normalized);
            setCurrentUser(withPremium);
            localStorage.setItem('currentUser', JSON.stringify(withPremium));
          }} />} />
        <Route path="/payment" element={<PaymentScreen currentUser={currentUser} token={currentUser?.token} />} />
        <Route path="/payment/success" element={<PaymentSuccessScreen currentUser={currentUser} token={currentUser?.token} />} />
        <Route path="/payment/cancel" element={<PaymentCancelScreen />} />
        <Route path="/profile" element={<ProfileScreen currentUser={currentUser} token={currentUser?.token} />} />
      </Routes>
    </Router>
  );
}

export default App;
