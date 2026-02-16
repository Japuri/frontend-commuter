
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../utils/api';

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
    
    /* MOCK MODE: enable for offline testing
    const user = usersData.find(u => u.email === email && u.password === password);
    if (user) {
      onAuth({ user, token: 'mock-token-' + user.id });
      navigate(redirectTo);
      return;
    }
    setError('Invalid email or password');
    return;
    */

    try {
      const res = await fetch(`${API_BASE_URL}/api/signin/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      console.log('Sign-in response:', data);
      if (res.ok) {
        // Store JWT tokens in localStorage
        if (data.token) localStorage.setItem('accessToken', data.token);
        if (data.refresh) localStorage.setItem('refreshToken', data.refresh);
        // Persist currentUser in localStorage for authFetch
        const userObj = { ...data.user, token: data.token, refresh: data.refresh };
        console.log('User object before onAuth:', userObj);
        console.log('User subscription_status:', userObj.subscription_status);
        localStorage.setItem('currentUser', JSON.stringify(userObj));
        // Pass the user object directly (not wrapped)
        onAuth(userObj);
        navigate(redirectTo);
      } else {
        setError(data.message || 'Sign in failed');
      }
    } catch (err) {
      console.error('Sign-in error:', err);
      setError(err.message || 'Network error');
    }
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
