import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import usersData from '../data/users.json';

function SignIn({ onAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.redirectTo || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    /* MOCK MODE: enable for offline testing */
    const user = usersData.find(u => u.email === email && u.password === password);
    if (user) {
      onAuth({ user, token: 'mock-token-' + user.id });
      navigate(redirectTo);
      return;
    }
    setError('Invalid email or password');
    return;

    /* LIVE MODE: re-enable when backend is stable
    try {
      const res = await fetch('http://localhost:8000/api/signin/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        onAuth(data);
        navigate('/');
      } else {
        setError(data.message || 'Sign in failed');
      }
    } catch (err) {
      setError('Network error');
    }
    */
  };

  return (
    <div className="login-wrapper">
      <button className="floating-back-btn" onClick={() => navigate('/')}>← Home</button>
      <div className="login-card">
        <div className="login-title">Sign In to <span className="brand">JeepRoute</span></div>
        <form className="login-form" onSubmit={handleSubmit}>
          <input
            className="login-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            className="login-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button className="login-btn" type="submit">Sign In</button>
        </form>
        {error && <div className="error" style={{ color: '#f55', marginTop: 10 }}>{error}</div>}
        <div className="login-footer">
          Don't have an account?{' '}
          <span className="signup-link" onClick={() => navigate('/signup', { state: { redirectTo } })}>Sign Up</span>
        </div>
      </div>
    </div>
  );
}

export default SignIn;
