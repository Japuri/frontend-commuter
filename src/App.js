import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Homescreen from './Screens/Homescreen';
import LoginScreen from './Screens/LoginScreen';
import SignIn from './Screens/SignIn';
import SignUp from './Screens/SignUp';
import ProfileScreen from './Screens/ProfileScreen';
import PaymentScreen from './Screens/PaymentScreen';
import PaymentSuccessScreen from './Screens/PaymentSuccessScreen';
import DetailScreen from './Screens/DetailScreen';
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

// Normalize user utility
const normalizeUser = (user) => {
  if (!user) return null;
  return {
    ...user,
    is_premium: user.subscription_status === 'plus' || user.subscription_status === 'premium'
  };
};
function AnimatedRoutes({ currentUser, setCurrentUser }) {
  const location = useLocation();
>>>>>>> frontend-dev
  return (
    <div className="page-transition-wrapper" key={location.key}>
      <Routes>
        <Route
          path="/" element={<Homescreen currentUser={currentUser} setCurrentUser={setCurrentUser} />} />
        <Route
          path="/details" element={<DetailScreen currentUser={currentUser} setCurrentUser={setCurrentUser} />} />
        <Route
          path="/login" element={<LoginScreen setCurrentUser={setCurrentUser}/>} />
        <Route
          path="/signin" element={<SignIn onAuth={(user) => {
            const withPremium = normalizeUser(user);
            setCurrentUser(withPremium);
            localStorage.setItem('currentUser', JSON.stringify(withPremium));
          }} />} />
        <Route
          path="/signup" element={<SignUp onAuth={(user) => {
            const withPremium = normalizeUser(user);
            setCurrentUser(withPremium);
            localStorage.setItem('currentUser', JSON.stringify(withPremium));
          }} />} />
        <Route path="/payment" element={<PaymentScreen currentUser={currentUser} token={currentUser?.token} />} />
        <Route path="/payment/success" element={<PaymentSuccessScreen currentUser={currentUser} token={currentUser?.token} />} />
        <Route path="/payment/cancel" element={<PaymentCancelScreen />} />
        <Route path="/profile" element={<ProfileScreen currentUser={currentUser} token={currentUser?.token} />} />
      </Routes>
    </div>
  );
}

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
      <SetGlobalNavigate />
      <AnimatedRoutes currentUser={currentUser} setCurrentUser={setCurrentUser} />
    </Router>
  );
}

export default App;
